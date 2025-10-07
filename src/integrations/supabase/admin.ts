import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://kozhlejudselgtmohdfm.supabase.co";
const supabaseServiceKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

// Create admin client with service role key for elevated permissions
// If service role key is not available, create a client with anon key (will have limited permissions)
export const supabaseAdmin = createClient(
  supabaseUrl, 
  supabaseServiceKey || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtvemhsZWp1ZHNlbGd0bW9oZGZtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc0MDQyOTgsImV4cCI6MjA3Mjk4MDI5OH0.10h-c8_GLM3aQd_AbNVXNDt2Pvr4DbQm7VjgvmyiG-M", 
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);
