#!/usr/bin/env node

/**
 * Paystack Setup Script
 * This script helps you set up Paystack integration for your property management app
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (query) => new Promise((resolve) => rl.question(query, resolve));

async function setupPaystack() {
  console.log('🚀 Paystack Integration Setup\n');
  console.log('This script will help you configure Paystack for your property management app.\n');

  // Check if .env file exists
  const envPath = path.join(process.cwd(), '.env');
  const envExists = fs.existsSync(envPath);

  if (!envExists) {
    console.log('📝 Creating .env file...');
    fs.writeFileSync(envPath, '');
  }

  // Read existing .env content
  let envContent = envExists ? fs.readFileSync(envPath, 'utf8') : '';

  console.log('Please provide your Paystack API keys:\n');
  console.log('You can find these in your Paystack dashboard under Settings > API Keys\n');

  const publicKey = await question('Enter your Paystack Public Key (pk_test_...): ');
  const secretKey = await question('Enter your Paystack Secret Key (sk_test_...): ');

  if (!publicKey || !secretKey) {
    console.log('❌ Both keys are required. Exiting...');
    rl.close();
    return;
  }

  if (!publicKey.startsWith('pk_') || !secretKey.startsWith('sk_')) {
    console.log('⚠️  Warning: Keys should start with "pk_" and "sk_" respectively.');
  }

  // Update .env content
  const envLines = envContent.split('\n');
  const newLines = [];

  // Add or update Paystack keys
  let publicKeyFound = false;
  let secretKeyFound = false;

  for (const line of envLines) {
    if (line.startsWith('VITE_PAYSTACK_PUBLIC_KEY=')) {
      newLines.push(`VITE_PAYSTACK_PUBLIC_KEY=${publicKey}`);
      publicKeyFound = true;
    } else if (line.startsWith('VITE_PAYSTACK_SECRET_KEY=')) {
      newLines.push(`VITE_PAYSTACK_SECRET_KEY=${secretKey}`);
      secretKeyFound = true;
    } else if (line.trim() !== '') {
      newLines.push(line);
    }
  }

  if (!publicKeyFound) {
    newLines.push(`VITE_PAYSTACK_PUBLIC_KEY=${publicKey}`);
  }
  if (!secretKeyFound) {
    newLines.push(`VITE_PAYSTACK_SECRET_KEY=${secretKey}`);
  }

  // Write updated .env file
  fs.writeFileSync(envPath, newLines.join('\n'));

  console.log('\n✅ Paystack configuration saved to .env file!');
  console.log('\n📋 Next steps:');
  console.log('1. Restart your development server');
  console.log('2. Test the integration using the test button in your app');
  console.log('3. Use test card: 4084084084084081 for testing');
  console.log('4. Check the PAYSTACK_INTEGRATION.md file for detailed instructions');
  console.log('\n🎉 Happy coding!');

  rl.close();
}

setupPaystack().catch(console.error);
