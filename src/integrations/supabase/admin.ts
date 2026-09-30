import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "https://kozhlejudselgtmohdfm.supabase.co";
const supabaseServiceKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY || "";

// Create admin client with service role key for elevated permissions
export const supabaseAdmin = createClient<Database>(
  supabaseUrl, 
  supabaseServiceKey, 
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    },
    global: {
      headers: {
        'X-Client-Info': 'lovly-prop-ai',
      },
    },
  }
);
