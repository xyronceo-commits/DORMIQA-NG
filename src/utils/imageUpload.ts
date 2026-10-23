import { supabase, SUPABASE_URL, SUPABASE_ANON_KEY } from '../services/supabase';

/**
 * Property-media helpers for the `listing-media` Supabase Storage bucket.
 *
 * - Files are validated (type + size) BEFORE any network call.
 * - Uploads use XMLHttpRequest so progress is real, with a timeout and a small number of
 *   controlled retries (network errors / timeouts / 5xx only - never 4xx such as RLS denials).
 * - Photos are always real uploaded bytes; a failed image decode rejects instead of
 *   silently uploading an empty file.
 */

export const LISTING_MEDIA_BUCKET = 'listing-media';
export const MAX_PHOTO_BYTES = 15 * 1024 * 1024; // raw picker file; compressed before upload
export const MAX_VIDEO_BYTES = 50 * 1024 * 1024;
export const ALLOWED_PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const ALLOWED_VIDEO_TYPES: Record<string, string> = {
  'video/mp4': 'mp4',
  'video/webm': 'webm',
  'video/quicktime': 'mov',
};

export class MediaUploadError extends Error {
  status?: number;
  retryable: boolean;
  constructor(message: string, opts: { status?: number; retryable?: boolean } = {}) {
    super(message);
    this.name = 'MediaUploadError';
    this.status = opts.status;
    this.retryable = Boolean(opts.retryable);
  }
}

export function validatePropertyPhoto(file: File): void {
  if (!ALLOWED_PHOTO_TYPES.includes(file.type)) {
    throw new MediaUploadError(`"${file.name}" is not a supported photo. Use a JPG, PNG or WebP image.`);
  }
  if (file.size <= 0) throw new MediaUploadError(`"${file.name}" is empty.`);
  if (file.size > MAX_PHOTO_BYTES) {
    throw new MediaUploadError(`"${file.name}" is larger than 15 MB. Choose a smaller photo.`);
  }
}

export function validatePropertyVideo(file: File | Blob, name = 'video'): void {
  if (!ALLOWED_VIDEO_TYPES[file.type]) {
    throw new MediaUploadError(`The ${name} must be an MP4, WebM or MOV file.`);
  }
  if (file.size <= 0) throw new MediaUploadError(`The ${name} file is empty.`);
  if (file.size > MAX_VIDEO_BYTES) throw new MediaUploadError('Video must be 50 MB or less.');
}

function dataUriToBlob(dataUri: string): Blob {
  const comma = dataUri.indexOf(',');
  if (comma < 0) throw new MediaUploadError('Invalid image data.');
  const mime = dataUri.slice(0, comma).match(/:(.*?);/)?.[1] || 'application/octet-stream';
  const bytes = atob(dataUri.slice(comma + 1));
  const arr = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
  return new Blob([arr], { type: mime });
}

/** Resize (max 1000px) and re-encode as JPEG. Rejects if the image cannot be decoded. */
export async function compressImageToBlob(source: File | string, maxDimension = 1000, quality = 0.75): Promise<Blob> {
  const blobSource: Blob = typeof source === 'string' ? dataUriToBlob(source) : source;
  const objectUrl = URL.createObjectURL(blobSource);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new MediaUploadError('This photo could not be read. Try a different image.'));
      el.src = objectUrl;
    });
    let { width, height } = img;
    if (width > maxDimension || height > maxDimension) {
      if (width > height) { height = Math.round((height * maxDimension) / width); width = maxDimension; }
      else { width = Math.round((width * maxDimension) / height); height = maxDimension; }
    }
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new MediaUploadError('Your browser could not process this photo.');
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(img, 0, 0, width, height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));
    if (!blob || blob.size === 0) throw new MediaUploadError('This photo could not be compressed. Try a different image.');
    return blob;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export interface UploadObjectOptions {
  path: string;
  body: Blob;
  contentType: string;
  upsert?: boolean;
  timeoutMs?: number;
  retries?: number;
  onProgress?: (loaded: number, total: number) => void;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function uploadOnce(opts: UploadObjectOptions, accessToken: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const encodedPath = opts.path.split('/').map(encodeURIComponent).join('/');
    xhr.open('POST', `${SUPABASE_URL}/storage/v1/object/${encodeURIComponent(LISTING_MEDIA_BUCKET)}/${encodedPath}`);
    xhr.setRequestHeader('Authorization', `Bearer ${accessToken}`);
    xhr.setRequestHeader('apikey', SUPABASE_ANON_KEY || '');
    xhr.setRequestHeader('Content-Type', opts.contentType);
    if (opts.upsert) xhr.setRequestHeader('x-upsert', 'true');
    xhr.timeout = opts.timeoutMs ?? 120_000;
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) opts.onProgress?.(e.loaded, e.total);
    };
    xhr.onerror = () => reject(new MediaUploadError('Network error while uploading media.', { retryable: true }));
    xhr.ontimeout = () => reject(new MediaUploadError('The upload timed out.', { retryable: true }));
    xhr.onabort = () => reject(new MediaUploadError('The upload was interrupted.', { retryable: true }));
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        opts.onProgress?.(opts.body.size, opts.body.size);
        return resolve();
      }
      let detail = '';
      try { detail = JSON.parse(xhr.responseText || '{}').message || ''; } catch { /* ignore */ }
      const denied = xhr.status === 401 || xhr.status === 403 || /row-level security|policy/i.test(detail);
      const message = denied
        ? 'Storage rejected the upload (permission denied). Sign in again and retry.'
        : `Storage upload failed (${xhr.status})${detail ? `: ${detail}` : ''}.`;
      reject(new MediaUploadError(message, { status: xhr.status, retryable: xhr.status >= 500 }));
    };
    xhr.send(opts.body);
  });
}

/** Uploads one object to listing-media and returns its public URL. */
export async function uploadListingMediaObject(opts: UploadObjectOptions): Promise<string> {
  const retries = opts.retries ?? 2;
  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    // getSession() refreshes an expiring token, so every attempt uses a valid JWT.
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      throw new MediaUploadError('You are signed out. Sign in again before uploading media.');
    }
    try {
      await uploadOnce(opts, session.access_token);
      const { data } = supabase.storage.from(LISTING_MEDIA_BUCKET).getPublicUrl(opts.path);
      if (!data?.publicUrl) throw new MediaUploadError('Upload finished but no public URL was returned.');
      return data.publicUrl;
    } catch (err) {
      lastError = err;
      const retryable = err instanceof MediaUploadError && err.retryable;
      if (!retryable || attempt === retries) break;
      await sleep(600 * (attempt + 1));
    }
  }
  throw lastError instanceof Error ? lastError : new MediaUploadError('Upload failed.');
}

export interface MediaUploadConfig {
  /** Overwrite a stable per-index path so retries never leave duplicate files. */
  deterministic?: boolean;
  onProgress?: (loaded: number, total: number) => void;
}

const isHttpUrl = (v: string) => /^https?:\/\//i.test(v.trim());

/**
 * Uploads a property photo (File, or data: URI) and returns its public URL.
 * A pasted http(s) URL is returned unchanged (existing "add photo by link" feature).
 */
export async function uploadOrCompressPropertyPhoto(
  fileOrDataUrl: File | string,
  listingId: string,
  index: number,
  config: MediaUploadConfig = {}
): Promise<string> {
  if (typeof fileOrDataUrl === 'string' && isHttpUrl(fileOrDataUrl)) return fileOrDataUrl.trim();
  if (typeof fileOrDataUrl !== 'string') validatePropertyPhoto(fileOrDataUrl);

  const blob = await compressImageToBlob(fileOrDataUrl);
  const name = config.deterministic ? `photo_${index}.jpg` : `photo_${index}_${Date.now()}.jpg`;
  const url = await uploadListingMediaObject({
    path: `listings/${listingId}/${name}`,
    body: blob,
    contentType: 'image/jpeg',
    upsert: Boolean(config.deterministic),
    timeoutMs: 60_000,
    onProgress: config.onProgress,
  });
  // The path is reused on retries/replacements, so bust CDN caches with a version query.
  return config.deterministic ? `${url}?v=${Date.now()}` : url;
}

/** Uploads a property video (File, or data: URI) and returns its public URL. http(s) URLs pass through. */
export async function uploadPropertyVideo(
  videoSource: File | string,
  listingId: string,
  onProgress?: (progressPercent: number) => void,
  config: Omit<MediaUploadConfig, 'onProgress'> = {}
): Promise<string> {
  if (typeof videoSource === 'string' && isHttpUrl(videoSource)) {
    onProgress?.(100);
    return videoSource.trim();
  }
  const blob: Blob = typeof videoSource === 'string' ? dataUriToBlob(videoSource) : videoSource;
  validatePropertyVideo(blob);

  const ext = ALLOWED_VIDEO_TYPES[blob.type];
  const name = config.deterministic ? `video.${ext}` : `video_${Date.now()}.${ext}`;
  const url = await uploadListingMediaObject({
    path: `listings/${listingId}/${name}`,
    body: blob,
    contentType: blob.type,
    upsert: Boolean(config.deterministic),
    timeoutMs: 180_000,
    onProgress: (loaded, total) => onProgress?.(total > 0 ? Math.round((loaded / total) * 100) : 0),
  });
  return config.deterministic ? `${url}?v=${Date.now()}` : url;
}

/**
 * Uploads a user profile picture (File, Blob, or data: URI) and returns its permanent URL.
 * Automatically resizes and compresses to a lightweight 500x500 JPEG.
 * Attempts Supabase Storage upload under `avatars/${uid}/avatar_${Date.now()}.jpg`.
 * If network or storage is unavailable, gracefully preserves the compressed base64 data URL.
 */
export async function uploadAvatarImage(
  fileOrDataUrl: File | string,
  uid: string
): Promise<string> {
  if (typeof fileOrDataUrl === 'string' && isHttpUrl(fileOrDataUrl) && !fileOrDataUrl.includes('unsplash.com')) {
    return fileOrDataUrl.trim();
  }
  const blob = await compressImageToBlob(fileOrDataUrl, 500, 0.85);
  const safeUid = (uid || 'user').replace(/[^a-zA-Z0-9_-]/g, '_');
  const path = `avatars/${safeUid}/avatar_${Date.now()}.jpg`;

  try {
    const url = await uploadListingMediaObject({
      path,
      body: blob,
      contentType: 'image/jpeg',
      upsert: true,
      timeoutMs: 30_000,
    });
    return `${url}?v=${Date.now()}`;
  } catch (err) {
    console.warn('[AVATAR UPLOAD] Storage upload fallback to compressed data URL:', err);
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(blob);
    });
  }
}
