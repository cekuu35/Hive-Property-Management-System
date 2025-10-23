// Temporary diagnostic Edge Function
// Copy this ENTIRE file content and paste it in Supabase Dashboard

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  // Check all environment variables
  const envCheck = {
    VITE_VAPID_PUBLIC_KEY: Deno.env.get('VITE_VAPID_PUBLIC_KEY') ? '✅ SET' : '❌ NOT SET',
    VAPID_PRIVATE_KEY: Deno.env.get('VAPID_PRIVATE_KEY') ? '✅ SET' : '❌ NOT SET',
    SUPABASE_URL: Deno.env.get('SUPABASE_URL') ? '✅ SET' : '❌ NOT SET',
    SUPABASE_SERVICE_ROLE_KEY: Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ? '✅ SET' : '❌ NOT SET',
  };

  return new Response(
    JSON.stringify({
      message: 'Environment Variable Check',
      environment: envCheck,
      allEnvKeys: Object.keys(Deno.env.toObject()).filter(k => k.includes('VAPID') || k.includes('SUPABASE'))
    }, null, 2),
    {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    }
  );
});

