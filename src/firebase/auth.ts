import { supabase } from '../services/supabase.js';

export const auth: any = {
  currentUser: null,
};

const normalizeUser = (user: any | null, accessToken?: string | null) => {
  if (!user) return null;
  const metadata = user.user_metadata || {};
  const provider = user.app_metadata?.provider || 'email';
  return {
    ...user,
    uid: user.id,
    displayName: metadata.full_name || metadata.name || metadata.display_name || '',
    photoURL: metadata.avatar_url || metadata.picture || '',
    emailVerified: Boolean(user.email_confirmed_at || user.confirmed_at),
    providerData: [{ providerId: provider === 'google' ? 'google.com' : provider }],
    getIdToken: async () => {
      const { data } = await supabase.auth.getSession();
      return data.session?.access_token || '';
    },
    reload: async () => {
      const { data, error } = await supabase.auth.getUser();
      if (!error && data.user) syncAuthState(data.user, accessToken);
    },
  };
};

const syncAuthState = (user: any | null, accessToken?: string | null) => {
  auth.currentUser = normalizeUser(user, accessToken);
};

supabase.auth.onAuthStateChange((_event, session) => {
  syncAuthState(session?.user ?? null, session?.access_token);
});

export const getAuth = (_app?: any) => auth;

export const signInWithEmailAndPassword = async (_auth: any, email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    throw error;
  }

  syncAuthState(data.user ?? null);
  return { user: normalizeUser(data.user ?? null) };
};

export const createUserWithEmailAndPassword = async (_auth: any, email: string, password: string) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: typeof window !== 'undefined' ? window.location.origin : undefined,
    },
  });

  if (error) {
    throw error;
  }

  syncAuthState(data?.user ?? null, data?.session?.access_token);
  return { user: normalizeUser(data?.user ?? null, data?.session?.access_token) };
};

export const sendEmailVerification = async (user: any, actionCodeSettings?: any) => {
  if (!user?.email) {
    return;
  }

  const { error } = await supabase.auth.resend({
    type: 'signup',
    email: user.email,
    options: {
      emailRedirectTo: actionCodeSettings?.url || (typeof window !== 'undefined' ? window.location.origin : undefined),
    },
  });

  if (error) {
    throw error;
  }
};

export const sendPasswordResetEmail = async (_auth: any, email: string) => {
  const { error } = await supabase.auth.resetPasswordForEmail(email);
  if (error) {
    throw error;
  }
};

export const sendSignInLinkToEmail = async (_auth: any, email: string, _actionCodeSettings?: any) => {
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: typeof window !== 'undefined' ? window.location.origin : undefined,
    },
  });

  if (error) {
    throw error;
  }
};

export const applyActionCode = async (_auth: any, tokenHash: string, type = 'signup') => {
  const { data, error } = await supabase.auth.verifyOtp({
    token_hash: tokenHash,
    type: type as any,
  });

  if (error) throw error;
  syncAuthState(data.user ?? null, data.session?.access_token);
  return { data };
};

export const isSignInWithEmailLink = () => false;

export const signInWithEmailLink = async (_auth: any, email: string, _link: string) => {
  const { data, error } = await supabase.auth.signInWithOtp({
    email,
  });

  if (error) {
    throw error;
  }

  syncAuthState(data.user ?? null);
  return { user: normalizeUser(data.user ?? null) };
};

export const signOut = async (_auth?: any) => {
  const { error } = await supabase.auth.signOut();
  syncAuthState(null);

  if (error) {
    throw error;
  }
};

export const deleteUser = async (user: any) => {
  if (!user) {
    return;
  }

  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error('You must be signed in to delete this account.');
  const response = await fetch('/api/account/delete', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ uid: user.id ?? user.uid }),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.message || 'Account deletion failed.');
  await supabase.auth.signOut({ scope: 'local' });
  syncAuthState(null);
};

export const onAuthStateChanged = (_auth: any, callback: (user: any) => void) => {
  const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
    const user = normalizeUser(session?.user ?? null, session?.access_token);
    syncAuthState(session?.user ?? null, session?.access_token);
    callback(user);
  });

  return () => subscription.unsubscribe();
};

export type User = any;
