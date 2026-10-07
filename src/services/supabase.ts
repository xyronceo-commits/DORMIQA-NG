import { createClient } from '@supabase/supabase-js';

// Browser (Vite) exposes VITE_* via import.meta.env. The Node server has no import.meta.env,
// so it reads process.env (VITE_* first, then the server-side SUPABASE_* names).
const viteEnv: Record<string, string | undefined> | undefined =
  typeof import.meta !== 'undefined' ? (import.meta as any).env : undefined;
const nodeEnv: Record<string, string | undefined> =
  typeof process !== 'undefined' && process.env ? process.env : {};

const supabaseUrl =
  viteEnv?.VITE_SUPABASE_URL || nodeEnv.VITE_SUPABASE_URL || nodeEnv.SUPABASE_URL;
const supabaseAnonKey =
  viteEnv?.VITE_SUPABASE_ANON_KEY || nodeEnv.VITE_SUPABASE_ANON_KEY || nodeEnv.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Supabase configuration is missing. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.'
  );
}

export const SUPABASE_URL = supabaseUrl;
export const SUPABASE_ANON_KEY = supabaseAnonKey;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

export default supabase;
