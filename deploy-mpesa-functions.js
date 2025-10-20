#!/usr/bin/env node

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

console.log('🚀 Deploying M-Pesa Edge Functions to Supabase...\n');

try {
  // Check if Supabase CLI is installed
  try {
    execSync('supabase --version', { stdio: 'pipe' });
  } catch (error) {
    console.error('❌ Supabase CLI is not installed. Please install it first:');
    console.error('   npm install -g supabase');
    process.exit(1);
  }

  // Check if we're in a Supabase project
  if (!fs.existsSync('supabase/config.toml')) {
    console.error('❌ Not in a Supabase project directory. Please run this from your project root.');
    process.exit(1);
  }

  // Deploy the edge function
  console.log('📦 Deploying mpesa-stk-push function...');
  execSync('supabase functions deploy mpesa-stk-push', { stdio: 'inherit' });

  // Run the migration
  console.log('\n🗄️  Running database migration...');
  execSync('supabase db push', { stdio: 'inherit' });

  console.log('\n✅ M-Pesa Edge Functions deployed successfully!');
  console.log('\n📋 Next steps:');
  console.log('1. Set up your environment variables in Supabase Dashboard:');
  console.log('   - Go to Project Settings > Edge Functions');
  console.log('   - Add the following secrets:');
  console.log('     • KCB_API_KEY');
  console.log('     • KCB_CLIENT_ID');
  console.log('     • KCB_CLIENT_SECRET');
  console.log('     • DARAJA_CALLBACK_URL');
  console.log('     • SUPABASE_URL');
  console.log('     • SUPABASE_SERVICE_ROLE_KEY');
  console.log('\n2. Test the integration:');
  console.log('   - Use the frontend to make a test payment');
  console.log('   - Check the Supabase logs for any errors');
  console.log('\n3. Update your M-Pesa callback URL:');
  console.log('   - Set DARAJA_CALLBACK_URL to: https://your-project.supabase.co/functions/v1/mpesa-stk-push/callback');

} catch (error) {
  console.error('❌ Deployment failed:', error.message);
  process.exit(1);
}

