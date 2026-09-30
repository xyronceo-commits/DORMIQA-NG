import { supabase, SUPABASE_ANON_KEY, SUPABASE_URL } from '../services/supabase';

export const getStorage = (_app?: any) => ({
  name: 'supabase-storage',
  bucket: 'listing-media',
});

export const ref = (storageRef: any, path: string) => ({
  bucket: storageRef?.bucket || 'listing-media',
  path,
});

export const uploadBytes = async (storageRef: any, file: Blob | File, _options?: Record<string, any>): Promise<{ path: string }> => {
  const fileName = file instanceof File ? file.name : 'file';
  const targetPath = storageRef?.path || `uploads/${Date.now()}_${fileName}`;
  const { error } = await supabase.storage.from(storageRef?.bucket || 'listing-media').upload(targetPath, file, {
    upsert: true,
    contentType: _options?.contentType,
  });

  if (error) {
    throw error;
  }

  return { path: targetPath };
};

export const getDownloadURL = async (storageRef: any): Promise<string> => {
  const { data } = supabase.storage.from(storageRef?.bucket || 'listing-media').getPublicUrl(storageRef?.path || '');
  if (!data?.publicUrl) throw new Error('Failed to create public URL for Supabase storage object.');
  return data.publicUrl;
};

export const uploadBytesResumable = (storageRef: any, file: Blob | File, options?: Record<string, any>) => {
  const snapshot: any = {
    path: storageRef?.path || `uploads/${Date.now()}_${file instanceof File ? file.name : 'file'}`,
    ref: storageRef,
    bytesTransferred: 0,
    totalBytes: file.size || 0,
    metadata: { contentType: options?.contentType },
  };

  let xhr: XMLHttpRequest | null = null;
  let cancelled = false;
  const task: any = {
    cancel: () => {
      cancelled = true;
      xhr?.abort();
    },
    paused: false,
    running: false,
    snapshot,
    on: (event: string, next?: any, error?: any, complete?: any) => {
      if (event !== 'state_changed') return task;
      task.running = true;
      const runUpload = async () => {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (!session?.access_token) throw new Error('Sign in before uploading listing media.');
          if (cancelled) return;

          const bucket = storageRef?.bucket || 'listing-media';
          const path = String(storageRef?.path || snapshot.path).split('/').map(encodeURIComponent).join('/');
          xhr = new XMLHttpRequest();
          xhr.open('POST', `${SUPABASE_URL}/storage/v1/object/${encodeURIComponent(bucket)}/${path}`);
          xhr.setRequestHeader('Authorization', `Bearer ${session.access_token}`);
          xhr.setRequestHeader('apikey', SUPABASE_ANON_KEY || '');
          xhr.setRequestHeader('Content-Type', options?.contentType || file.type || 'application/octet-stream');
          xhr.setRequestHeader('x-upsert', 'true');

          xhr.upload.onprogress = (event) => {
            snapshot.bytesTransferred = event.loaded;
            snapshot.totalBytes = event.lengthComputable ? event.total : file.size;
            next?.(snapshot);
          };
          xhr.onerror = () => {
            task.running = false;
            error?.(new Error('Network error while uploading to Supabase Storage.'));
          };
          xhr.onabort = () => {
            task.running = false;
            if (!cancelled) error?.(new Error('Supabase Storage upload was interrupted.'));
          };
          xhr.onload = () => {
            task.running = false;
            if (xhr && xhr.status >= 200 && xhr.status < 300) {
              snapshot.bytesTransferred = snapshot.totalBytes;
              next?.(snapshot);
              complete?.();
              return;
            }
            let message = `Supabase Storage upload failed (${xhr?.status || 0}).`;
            try {
              message = JSON.parse(xhr?.responseText || '{}').message || message;
            } catch {}
            error?.(new Error(message));
          };
          xhr.send(file);
        } catch (uploadError) {
          task.running = false;
          error?.(uploadError);
        }
      };
      void runUpload();
      return task;
    },
  };

  return {
    get snapshot() { return snapshot; },
    task,
    on: task.on,
  };
};
