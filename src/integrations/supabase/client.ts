import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

// Use environment variables with fallback to hardcoded values
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "https://kozhlejudselgtmohdfm.supabase.co";
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtvemhsZWp1ZHNlbGd0bW9oZGZtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc0MDQyOTgsImV4cCI6MjA3Mjk4MDI5OH0.10h-c8_GLM3aQd_AbNVXNDt2Pvr4DbQm7VjgvmyiG-M";

// Singleton pattern to prevent multiple GoTrueClient instances
let supabaseInstance: ReturnType<typeof createClient<Database>> | null = null;

const createSupabaseClient = () => {
  if (supabaseInstance) {
    return supabaseInstance;
  }

  supabaseInstance = createClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
      storage: localStorage,
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
    realtime: {
      params: {
        eventsPerSecond: 10,
      },
    },
    global: {
      headers: {
        'X-Client-Info': 'lovly-prop-ai',
        'apikey': supabaseAnonKey,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Prefer': 'return=representation',
      },
    },
  });

  return supabaseInstance;
};

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

export const supabase = createSupabaseClient();