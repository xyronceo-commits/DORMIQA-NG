import { ref, uploadBytes, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { storage } from '../services/firebase';

/**
 * Compresses an image File or Base64 string to a lightweight Data URL (JPEG, ~30-60KB).
 * Resizes max dimension to 1000px and applies 0.75 JPEG compression.
 */
export async function compressImageToDataUrl(source: File | string, maxDimension = 1000, quality = 0.75): Promise<string> {
  return new Promise((resolve) => {
    if (typeof source === 'string' && source.startsWith('http')) {
      // Already a remote HTTP URL
      return resolve(source);
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      let width = img.width;
      let height = img.height;

      if (width > maxDimension || height > maxDimension) {
        if (width > height) {
          height = Math.round((height * maxDimension) / width);
          width = maxDimension;
        } else {
          width = Math.round((width * maxDimension) / height);
          height = maxDimension;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);
        const compressed = canvas.toDataURL('image/jpeg', quality);
        resolve(compressed);
      } else {
        resolve(typeof source === 'string' ? source : '');
      }
    };

    img.onerror = () => {
      resolve(typeof source === 'string' ? source : '');
    };

    if (source instanceof File) {
      const reader = new FileReader();
      reader.onload = (e) => {
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(source);
    } else {
      img.src = source;
    }
  });
}

function dataUriToBlob(dataUri: string): Blob {
  const parts = dataUri.split(',');
  const mimeMatch = parts[0].match(/:(.*?);/);
  const mime = mimeMatch ? mimeMatch[1] : 'application/octet-stream';
  const bstr = atob(parts[1] || parts[0]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new Blob([u8arr], { type: mime });
}

/**
 * Uploads a property photo file or data URL to Firebase Storage if available,
 * with a guaranteed Canvas compression fallback (lightweight Data URI) if Storage is unavailable/fails.
 */
export async function uploadOrCompressPropertyPhoto(
  fileOrDataUrl: File | string,
  listingId: string,
  index: number
): Promise<string> {
  if (typeof fileOrDataUrl === 'string' && fileOrDataUrl.startsWith('http')) {
    return fileOrDataUrl;
  }

  // 1. Compress image to clean, lightweight JPEG
  const compressedDataUrl = await compressImageToDataUrl(fileOrDataUrl);

  // 2. Try Firebase Storage if storage is initialized
  try {
    if (storage) {
      const blob = dataUriToBlob(compressedDataUrl);
      const filename = `photo_${index}_${Date.now()}.jpg`;
      const storageRef = ref(storage, `listings/${listingId}/${filename}`);
      
      await uploadBytes(storageRef, blob, {
        contentType: 'image/jpeg',
      });
      const downloadUrl = await getDownloadURL(storageRef);
      if (downloadUrl && downloadUrl.startsWith('http')) {
        return downloadUrl;
      }
    }
  } catch (err) {
    console.warn(`Firebase Storage upload failed for photo ${index}, using compressed persistent URI:`, err);
  }

  // 3. Fallback to lightweight compressed data URI (~30-50KB) which comfortably fits in Firestore (1MB limit)
  return compressedDataUrl;
}

/**
 * Direct Storage Resumable Upload for compulsory Property Video.
 * Uploads raw binary File directly to Firebase Storage with real-time percentage progress.
 * Returns an HTTP URL (never Base64 string).
 */
export async function uploadPropertyVideo(
  videoSource: File | string,
  listingId: string,
  onProgress?: (progressPercent: number) => void
): Promise<string> {
  if (typeof videoSource === 'string') {
    const clean = videoSource.trim();
    if (clean.startsWith('http://') || clean.startsWith('https://')) {
      if (onProgress) onProgress(100);
      return clean;
    }
  }

  if (!storage) {
    throw new Error("Firebase Storage is not initialized on client.");
  }

  let fileBlob: Blob;
  let contentType = 'video/mp4';

  if (typeof videoSource !== 'string') {
    fileBlob = videoSource;
    if (videoSource.type) {
      contentType = videoSource.type;
    }
  } else if (typeof videoSource === 'string' && videoSource.startsWith('data:')) {
    fileBlob = dataUriToBlob(videoSource);
    const match = videoSource.match(/^data:(.*?);/);
    if (match) contentType = match[1];
  } else {
    throw new Error("Invalid video source file provided.");
  }

  const filename = `video_${Date.now()}.mp4`;
  const storageRef = ref(storage, `listings/${listingId}/${filename}`);

  return new Promise((resolve, reject) => {
    const uploadTask = uploadBytesResumable(storageRef, fileBlob, { contentType });

    uploadTask.on(
      'state_changed',
      (snapshot) => {
        if (snapshot.totalBytes > 0) {
          const percent = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
          if (onProgress) onProgress(percent);
        }
      },
      (error) => {
        console.error("Firebase Storage video upload error:", error);
        reject(new Error(`Video upload failed: ${error.message}`));
      },
      async () => {
        try {
          const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
          if (downloadUrl && downloadUrl.startsWith('http')) {
            if (onProgress) onProgress(100);
            resolve(downloadUrl);
          } else {
            reject(new Error("Failed to retrieve download URL for uploaded video."));
          }
        } catch (err: any) {
          reject(new Error(`Failed to retrieve download URL: ${err.message}`));
        }
      }
    );
  });
}
