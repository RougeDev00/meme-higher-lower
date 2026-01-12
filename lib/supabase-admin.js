import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    if (process.env.NODE_ENV === 'production') {
        throw new Error('Missing Supabase Service Key in production');
    } else {
        console.warn('Missing Supabase Service Key - Admin operations will fail');
    }
}

// Create client with Service Role Key (Bypasses RLS)
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey || 'mock-key', {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});
