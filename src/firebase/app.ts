type FirebaseApp = {
  name?: string;
  options?: Record<string, unknown>;
};

export const getApps = (): FirebaseApp[] => [];
export const getApp = (): FirebaseApp => ({ name: '[supabase-migration]' });
export const initializeApp = (options?: Record<string, unknown>): FirebaseApp => ({
  name: '[supabase-migration]',
  options,
});

export default initializeApp;
