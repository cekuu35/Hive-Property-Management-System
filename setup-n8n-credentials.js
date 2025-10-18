#!/usr/bin/env node

/**
 * n8n Credentials Setup Script
 * This script helps you set up the necessary credentials for n8n workflows
 */

import fs from 'fs';
import path from 'path';

console.log('🚀 n8n Credentials Setup for Lovly Property Management');
console.log('=====================================================\n');

// Check if n8n is running
const checkN8nStatus = async () => {
  try {
    const response = await fetch('http://localhost:5678');
    if (response.ok) {
      console.log('✅ n8n is running on http://localhost:5678');
      return true;
    }
  } catch (error) {
    console.log('❌ n8n is not running. Please start it with: npm run n8n');
    return false;
  }
};

// Display setup instructions
const displayInstructions = () => {
  console.log('\n📋 Setup Instructions:');
  console.log('======================\n');
  
  console.log('1. Open n8n in your browser: http://localhost:5678');
  console.log('2. Create your first user account');
  console.log('3. Go to Settings > Credentials');
  console.log('4. Add the following credentials:\n');
  
  console.log('🔐 Supabase Credentials:');
  console.log('------------------------');
  console.log('Name: Supabase API');
  console.log('Type: Header Auth');
  console.log('Header Name: Authorization');
  console.log('Header Value: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtvemhsZWp1ZHNlbGd0bW9oZGZtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzQwNDI5OCwiZXhwIjoyMDcyOTgwMjk4fQ.LWosNpPJO_clOXXYa5pqGM36S-FLANk71F8BvcsJf2g');
  console.log('Additional Headers:');
  console.log('  - apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtvemhsZWp1ZHNlbGd0bW9oZGZtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzQwNDI5OCwiZXhwIjoyMDcyOTgwMjk4fQ.LWosNpPJO_clOXXYa5pqGM36S-FLANk71F8BvcsJf2g');
  console.log('  - Content-Type: application/json');
  console.log('  - Prefer: return=minimal (for updates/inserts)\n');
  
  console.log('🔐 Daraja API Credentials:');
  console.log('-------------------------');
  console.log('Name: Daraja API');
  console.log('Type: Header Auth');
  console.log('Header Name: Authorization');
  console.log('Header Value: Basic {base64_encoded_credentials}');
  console.log('Note: Replace {base64_encoded_credentials} with base64 encoded consumer_key:consumer_secret\n');
  
  console.log('📝 Environment Variables to Set:');
  console.log('--------------------------------');
  console.log('DARAJA_CONSUMER_KEY=your_consumer_key_here');
  console.log('DARAJA_CONSUMER_SECRET=your_consumer_secret_here');
  console.log('DARAJA_PASSKEY=your_passkey_here');
  console.log('DARAJA_SHORTCODE_SANDBOX=174379');
  console.log('DARAJA_SHORTCODE_PRODUCTION=your_production_shortcode\n');
  
  console.log('📚 Next Steps:');
  console.log('==============');
  console.log('1. Import the sample workflows from sample-workflows.json');
  console.log('2. Test the Supabase connection');
  console.log('3. Test the Daraja API connection');
  console.log('4. Create your custom workflows');
  console.log('5. Set up webhooks for payment callbacks\n');
  
  console.log('📖 Documentation:');
  console.log('=================');
  console.log('- n8n-connections-guide.md - Detailed connection guide');
  console.log('- sample-workflows.json - Example workflows to import');
  console.log('- https://docs.n8n.io/ - Official n8n documentation\n');
};

// Main execution
const main = async () => {
  const isRunning = await checkN8nStatus();
  
  if (isRunning) {
    displayInstructions();
  } else {
    console.log('\nPlease start n8n first and then run this script again.');
  }
};

main().catch(console.error);
