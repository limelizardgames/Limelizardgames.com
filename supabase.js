import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

export const SUPABASE_URL = 'https://htmqmjppljniwqwyjnwc.supabase.co';
export const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_PdDOTFKyqrttzaJtpU2VKw_XppvMwrp';

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
