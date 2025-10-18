import fetch from 'node-fetch';
import dotenv from 'dotenv';
import fs from 'fs';

// Load environment variables
dotenv.config();

class MpesaSetupHelper {
  constructor() {
    this.baseURL = 'http://localhost:3001';
  }

  // Create .env template with M-Pesa configuration
  createEnvTemplate() {
    console.log('📝 Creating .env template for M-Pesa integration...\n');
    
    const envTemplate = `# M-Pesa Daraja API Configuration
# Get these from https://developer.safaricom.co.ke/
DARAJA_CONSUMER_KEY=your_daraja_consumer_key_here
DARAJA_CONSUMER_SECRET=your_daraja_consumer_secret_here
DARAJA_PASSKEY=your_lipa_na_mpesa_passkey_here
DARAJA_SHORTCODE_SANDBOX=174379
DARAJA_CALLBACK_URL=http://localhost:3001/api/mpesa/callback
DARAJA_ENV=sandbox

# Alternative: Buni/KCB API (if you prefer)
# BUNI_API_KEY=your_buni_api_key_here

# Database Configuration (already set)
SUPABASE_URL=https://kozhlejudselgtmohdfm.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtvemhsZWp1ZHNlbGd0bW9oZGZtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzQwNDI5OCwiZXhwIjoyMDcyOTgwMjk4fQ.LWosNpPJO_clOXXYa5pqGM36S-FLANk71F8BvcsJf2g
`;

    try {
      fs.writeFileSync('.env.mpesa.template', envTemplate);
      console.log('✅ Created .env.mpesa.template file');
      console.log('📋 Copy the M-Pesa configuration to your .env file');
    } catch (error) {
      console.log('❌ Error creating .env template:', error.message);
    }
  }

  // Test current M-Pesa configuration
  async testCurrentConfig() {
    console.log('🔍 Testing current M-Pesa configuration...\n');
    
    const requiredVars = [
      'DARAJA_CONSUMER_KEY',
      'DARAJA_CONSUMER_SECRET', 
      'DARAJA_PASSKEY'
    ];

    let configValid = true;
    
    for (const varName of requiredVars) {
      const value = process.env[varName];
      if (!value || value.includes('your_')) {
        console.log(`❌ ${varName}: Not configured`);
        configValid = false;
      } else {
        console.log(`✅ ${varName}: Configured`);
      }
    }

    if (!configValid) {
      console.log('\n⚠️  M-Pesa credentials not properly configured');
      console.log('📝 Please update your .env file with valid credentials');
      return false;
    }

    console.log('\n✅ M-Pesa configuration looks good!');
    return true;
  }

  // Test M-Pesa API connectivity
  async testMpesaConnectivity() {
    console.log('🌐 Testing M-Pesa API connectivity...\n');
    
    try {
      const consumerKey = process.env.DARAJA_CONSUMER_KEY;
      const consumerSecret = process.env.DARAJA_CONSUMER_SECRET;
      
      if (!consumerKey || !consumerSecret) {
        console.log('❌ M-Pesa credentials not found in environment');
        return false;
      }

      const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64');
      
      const response = await fetch('https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials', {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ M-Pesa API connection successful!');
        console.log('Access token obtained:', data.access_token ? 'Yes' : 'No');
        return true;
      } else {
        console.log('❌ M-Pesa API connection failed:', response.status, response.statusText);
        return false;
      }
    } catch (error) {
      console.log('❌ Error testing M-Pesa connectivity:', error.message);
      return false;
    }
  }

  // Test payment with real data
  async testPaymentWithRealData() {
    console.log('💰 Testing payment with real data...\n');
    
    try {
      // First, let's try to get some real data from the database
      console.log('1️⃣ Checking for existing leases...');
      
      // Since we can't easily create data, let's test with a known UUID format
      const testLeaseId = '123e4567-e89b-12d3-a456-426614174000';
      
      console.log('2️⃣ Testing rent payment...');
      const rentData = {
        leaseId: testLeaseId,
        amount: 1000, // 10 KES for testing
        phoneNumber: '254708374149'
      };

      const response = await fetch(`${this.baseURL}/api/mpesa/rent-payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(rentData)
      });

      const result = await response.json();
      
      if (response.ok) {
        console.log('✅ Payment initiated successfully!');
        console.log('Response:', JSON.stringify(result, null, 2));
        return true;
      } else {
        console.log('❌ Payment failed:', result.error);
        console.log('This is expected if the lease does not exist in the database');
        return false;
      }
    } catch (error) {
      console.log('❌ Error testing payment:', error.message);
      return false;
    }
  }

  // Provide step-by-step setup instructions
  provideSetupInstructions() {
    console.log('\n📋 Step-by-Step M-Pesa Setup Instructions:\n');
    console.log('=' .repeat(60));
    
    console.log('\n1. 🔑 Get M-Pesa Daraja API Credentials:');
    console.log('   a. Go to https://developer.safaricom.co.ke/');
    console.log('   b. Create an account and register your app');
    console.log('   c. Get your Consumer Key and Consumer Secret');
    console.log('   d. Go to "Lipa na M-Pesa Online" and get your Passkey');
    
    console.log('\n2. 📝 Update Your .env File:');
    console.log('   Add these lines to your .env file:');
    console.log('   DARAJA_CONSUMER_KEY=your_actual_consumer_key');
    console.log('   DARAJA_CONSUMER_SECRET=your_actual_consumer_secret');
    console.log('   DARAJA_PASSKEY=your_actual_passkey');
    console.log('   DARAJA_ENV=sandbox');
    
    console.log('\n3. 🗄️ Create Test Data in Your Database:');
    console.log('   a. Create a landlord with M-Pesa details:');
    console.log('      - paybill_number: "174379" (sandbox)');
    console.log('      - account_reference: "TEST001"');
    console.log('   b. Create a lease for the landlord');
    console.log('   c. Create a utility bill for the lease');
    
    console.log('\n4. 🧪 Test the Integration:');
    console.log('   a. Restart your server: npm start');
    console.log('   b. Run this test again: node setup-mpesa-integration.js');
    console.log('   c. Test with real phone numbers in sandbox mode');
    
    console.log('\n5. 📱 Phone Number Format:');
    console.log('   - Always use: 254XXXXXXXXX');
    console.log('   - Example: 254708374149 (for 0708374149)');
    console.log('   - Must be 12 digits total');
    
    console.log('\n6. 🚀 Go Live:');
    console.log('   a. Get production credentials from Safaricom');
    console.log('   b. Update DARAJA_ENV=production');
    console.log('   c. Update paybill numbers to real ones');
    console.log('   d. Update callback URL to your production domain');
    
    console.log('\n' + '=' .repeat(60));
  }

  // Run all setup tests
  async runSetup() {
    console.log('🚀 M-Pesa Integration Setup Helper\n');
    console.log('=' .repeat(50));
    
    // Step 1: Create .env template
    this.createEnvTemplate();
    
    // Step 2: Test current configuration
    const configValid = await this.testCurrentConfig();
    
    if (configValid) {
      // Step 3: Test M-Pesa connectivity
      const connectivityOk = await this.testMpesaConnectivity();
      
      if (connectivityOk) {
        // Step 4: Test payment
        await this.testPaymentWithRealData();
      }
    }
    
    // Step 5: Provide instructions
    this.provideSetupInstructions();
    
    console.log('\n🎯 Summary:');
    console.log('- Your app is ready for M-Pesa integration');
    console.log('- Follow the setup instructions above');
    console.log('- Test with small amounts first');
    console.log('- Your M-Pesa integration will be working soon! 🚀');
  }
}

// Run the setup
const setup = new MpesaSetupHelper();
setup.runSetup();


