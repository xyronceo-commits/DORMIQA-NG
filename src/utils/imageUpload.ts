import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
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
  const mime = mimeMatch ? mimeMatch[1] : 'image/jpeg';
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
