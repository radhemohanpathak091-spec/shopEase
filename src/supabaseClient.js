import { createClient } from '@supabase/supabase-js';

// Replace these values with your Supabase Project URL (root URL, without /rest/v1/)
// and your Supabase Publishable (public) key.
const DEFAULT_SUPABASE_URL = 'https://bxvwuahntworknjqcmam.supabase.co';
const DEFAULT_SUPABASE_PUBLIC_KEY = 'sb_publishable_8CHxOlXXoQbNSJeWOOEJjg_F4x5_ZUE';

const envUrl = import.meta.env.VITE_SUPABASE_URL;
const envKey = import.meta.env.VITE_SUPABASE_PUBLIC_KEY;

const SUPABASE_URL =
  typeof envUrl === 'string' && /^https?:\/\//i.test(envUrl.trim())
    ? envUrl.trim().replace(/\/rest\/v1\/?$/i, '')
    : DEFAULT_SUPABASE_URL;

const SUPABASE_PUBLIC_KEY =
  typeof envKey === 'string' && /^(sb_publishable_|eyJ)/i.test(envKey.trim())
    ? envKey.trim().replace(/^:/, '')
    : DEFAULT_SUPABASE_PUBLIC_KEY;

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLIC_KEY);
