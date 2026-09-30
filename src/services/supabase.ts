import { createClient } from '@supabase/supabase-js';

const supabaseUrl = typeof process !== 'undefined' ? process.env.VITE_SUPABASE_URL : undefined;
const supabaseAnonKey = typeof process !== 'undefined' ? process.env.VITE_SUPABASE_ANON_KEY : undefined;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Supabase configuration is missing. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
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
