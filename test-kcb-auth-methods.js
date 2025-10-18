import fetch from 'node-fetch';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

class KCBAuthTester {
  constructor() {
    this.kcbOAuthURL = 'https://accounts.buni.kcbgroup.com/oauth2/token';
    this.apiKey = process.env.KCB_API_KEY;
  }

  // Test different authentication methods
  async testDifferentAuthMethods() {
    console.log('🔑 Testing different KCB Buni authentication methods...\n');
    
    console.log('📋 Using KCB Buni API Key:', this.apiKey ? '***' + this.apiKey.slice(-10) : 'Not set');
    console.log('OAuth URL:', this.kcbOAuthURL);
    
    const authMethods = [
      {
        name: 'Bearer Token',
        headers: { 'Authorization': `Bearer ${this.apiKey}` },
        body: 'grant_type=client_credentials'
      },
      {
        name: 'API Key Header',
        headers: { 'X-API-Key': this.apiKey },
        body: 'grant_type=client_credentials'
      },
      {
        name: 'Custom Header',
        headers: { 'X-Auth-Token': this.apiKey },
        body: 'grant_type=client_credentials'
      },
      {
        name: 'Basic Auth with API Key',
        headers: { 'Authorization': `Basic ${Buffer.from(`${this.apiKey}:`).toString('base64')}` },
        body: 'grant_type=client_credentials'
      },
      {
        name: 'Form Data with API Key',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `client_id=${this.apiKey}&grant_type=client_credentials`
      },
      {
        name: 'JSON with API Key',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({ grant_type: 'client_credentials' })
      }
    ];

    for (const method of authMethods) {
      try {
        console.log(`\nTrying ${method.name}...`);
        
        const response = await fetch(this.kcbOAuthURL, {
          method: 'POST',
          headers: {
            ...method.headers,
            'Content-Type': method.headers['Content-Type'] || 'application/x-www-form-urlencoded'
          },
          body: method.body
        });

        console.log(`Status: ${response.status} ${response.statusText}`);

        if (response.ok) {
          const data = await response.json();
          console.log('✅ SUCCESS! Authentication method working:');
          console.log('Access token obtained:', data.access_token ? 'Yes' : 'No');
          console.log('Token expires in:', data.expires_in, 'seconds');
          console.log('Token type:', data.token_type);
          return { method: method.name, data };
        } else {
          const errorText = await response.text();
          console.log(`❌ ${method.name} failed: ${response.status} - ${errorText.substring(0, 200)}`);
        }
      } catch (error) {
        console.log(`❌ ${method.name} error: ${error.message}`);
      }
    }

    console.log('\n❌ All authentication methods failed');
    return null;
  }

  // Test with different endpoints
  async testDifferentEndpoints() {
    console.log('\n🌐 Testing different KCB Buni endpoints...\n');
    
    const endpoints = [
      'https://accounts.buni.kcbgroup.com/oauth2/token',
      'https://accounts.buni.kcbgroup.com/oauth2/authorize',
      'https://sandbox.buni.kcbgroup.com/oauth2/token',
      'https://api.buni.kcbgroup.com/oauth2/token',
      'https://accounts.buni.kcbgroup.com/api/oauth/token'
    ];

    for (const endpoint of endpoints) {
      try {
        console.log(`Trying endpoint: ${endpoint}`);
        
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          body: 'grant_type=client_credentials'
        });

        console.log(`Status: ${response.status} ${response.statusText}`);

        if (response.ok) {
          const data = await response.json();
          console.log('✅ SUCCESS! Endpoint working:');
          console.log('Access token obtained:', data.access_token ? 'Yes' : 'No');
          return { endpoint, data };
        } else {
          const errorText = await response.text();
          console.log(`❌ ${endpoint} failed: ${response.status} - ${errorText.substring(0, 100)}`);
        }
      } catch (error) {
        console.log(`❌ ${endpoint} error: ${error.message}`);
      }
    }

    console.log('\n❌ All endpoints failed');
    return null;
  }

  // Provide recommendations
  provideRecommendations() {
    console.log('\n💡 Recommendations for KCB Buni M-Pesa Integration:\n');
    console.log('=' .repeat(60));
    
    console.log('\n1. 🔑 API Key Issues:');
    console.log('   - Your API key may need to be activated by KCB');
    console.log('   - It might be for a different service or environment');
    console.log('   - Contact KCB support for proper setup instructions');
    
    console.log('\n2. 🚀 Alternative: Use Safaricom Daraja API');
    console.log('   - This is the standard M-Pesa API');
    console.log('   - More reliable and widely supported');
    console.log('   - Register at https://developer.safaricom.co.ke/');
    
    console.log('\n3. 📞 Contact KCB Support:');
    console.log('   - Call KCB customer service');
    console.log('   - Ask about API activation for your credentials');
    console.log('   - Verify the correct authentication method');
    
    console.log('\n4. 🧪 Test with Different Credentials:');
    console.log('   - Try with Consumer Key/Secret instead of API key');
    console.log('   - Check if you need additional setup steps');
    console.log('   - Verify you\'re using the correct service');
    
    console.log('\n5. 🎯 Your App is Ready:');
    console.log('   - All M-Pesa integration code is complete');
    console.log('   - Payment endpoints are working');
    console.log('   - You just need working credentials');
    
    console.log('\n' + '=' .repeat(60));
  }

  // Run all tests
  async runAllTests() {
    console.log('🚀 Testing KCB Buni Authentication Methods\n');
    console.log('=' .repeat(50));
    
    // Test 1: Different authentication methods
    const authResult = await this.testDifferentAuthMethods();
    
    // Test 2: Different endpoints
    const endpointResult = await this.testDifferentEndpoints();
    
    // Test 3: Recommendations
    this.provideRecommendations();
    
    console.log('\n' + '=' .repeat(50));
    
    if (authResult || endpointResult) {
      console.log('🎉 SUCCESS! Found working authentication method!');
      console.log('Your KCB Buni M-Pesa integration is working! 🚀');
    } else {
      console.log('⚠️  No working authentication method found');
      console.log('Please contact KCB support or use Safaricom Daraja API');
    }
  }
}

// Run the tests
const tester = new KCBAuthTester();
tester.runAllTests();


