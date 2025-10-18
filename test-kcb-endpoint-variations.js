import fetch from 'node-fetch';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

class KCBEndpointVariationsTester {
  constructor() {
    this.clientId = process.env.KCB_CLIENT_ID;
    this.clientSecret = process.env.KCB_CLIENT_SECRET;
  }

  // Get access token
  async getAccessToken() {
    try {
      const response = await fetch('https://accounts.buni.kcbgroup.com/oauth2/token', {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64')}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: 'grant_type=client_credentials'
      });

      if (response.ok) {
        const data = await response.json();
        return data.access_token;
      } else {
        return null;
      }
    } catch (error) {
      return null;
    }
  }

  // Test different endpoint variations
  async testEndpointVariations(accessToken) {
    console.log('🔍 Testing different KCB Buni endpoint variations...\n');

    const timestamp = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, -3);
    const businessShortCode = '174379';
    const passkey = 'bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919';
    const passwordString = `${businessShortCode}${passkey}${timestamp}`;
    const password = Buffer.from(passwordString).toString('base64');

    const stkPushRequest = {
      BusinessShortCode: businessShortCode,
      TransactionType: 'CustomerPayBillOnline',
      Amount: 1,
      PartyA: '254708374149',
      PartyB: businessShortCode,
      PhoneNumber: '254708374149',
      CallBackURL: 'https://your-callback-url.com/callback',
      AccountReference: 'TestPayment',
      TransactionDesc: 'Test STK Push Payment',
      Password: password,
      Timestamp: timestamp
    };

    // Different endpoint variations to try
    const endpoints = [
      'https://uat.buni.kcbgroup.com/mm/api/request/1.0.0',
      'https://uat.buni.kcbgroup.com/mm/api/request/v1/processrequest',
      'https://uat.buni.kcbgroup.com/mm/api/request/processrequest',
      'https://uat.buni.kcbgroup.com/api/request/1.0.0',
      'https://uat.buni.kcbgroup.com/api/request/v1/processrequest',
      'https://uat.buni.kcbgroup.com/api/request/processrequest',
      'https://uat.buni.kcbgroup.com/mpesa/stkpush/v1/processrequest',
      'https://uat.buni.kcbgroup.com/mpesa/stkpush/processrequest',
      'https://uat.buni.kcbgroup.com/stkpush/v1/processrequest',
      'https://uat.buni.kcbgroup.com/stkpush/processrequest',
      'https://uat.buni.kcbgroup.com/v1/processrequest',
      'https://uat.buni.kcbgroup.com/processrequest'
    ];

    for (const endpoint of endpoints) {
      try {
        console.log(`Testing: ${endpoint}`);
        
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(stkPushRequest)
        });

        console.log(`  Status: ${response.status} ${response.statusText}`);

        if (response.ok) {
          const data = await response.json();
          console.log('  ✅ SUCCESS! STK Push working:');
          console.log('  Response:', JSON.stringify(data, null, 2));
          console.log('  Working endpoint:', endpoint);
          return { success: true, endpoint, data };
        } else {
          const errorText = await response.text();
          if (errorText.includes('<!DOCTYPE') || errorText.includes('<html>')) {
            console.log(`  ❌ HTML response: ${response.status}`);
          } else {
            console.log(`  ❌ Error: ${response.status} - ${errorText.substring(0, 100)}`);
          }
        }
      } catch (error) {
        console.log(`  ❌ Error: ${error.message}`);
      }
    }

    console.log('\n❌ All endpoint variations failed');
    return null;
  }

  // Test with different request formats
  async testRequestFormats(accessToken) {
    console.log('\n🔧 Testing different request formats...\n');

    const timestamp = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, -3);
    const businessShortCode = '174379';
    const passkey = 'bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919';
    const passwordString = `${businessShortCode}${passkey}${timestamp}`;
    const password = Buffer.from(passwordString).toString('base64');

    const requestFormats = [
      {
        name: 'Standard M-Pesa Format',
        request: {
          BusinessShortCode: businessShortCode,
          TransactionType: 'CustomerPayBillOnline',
          Amount: 1,
          PartyA: '254708374149',
          PartyB: businessShortCode,
          PhoneNumber: '254708374149',
          CallBackURL: 'https://your-callback-url.com/callback',
          AccountReference: 'TestPayment',
          TransactionDesc: 'Test STK Push Payment',
          Password: password,
          Timestamp: timestamp
        }
      },
      {
        name: 'Simplified Format',
        request: {
          BusinessShortCode: businessShortCode,
          Amount: 1,
          PartyA: '254708374149',
          PhoneNumber: '254708374149',
          AccountReference: 'TestPayment',
          Password: password,
          Timestamp: timestamp
        }
      },
      {
        name: 'KCB Specific Format',
        request: {
          shortCode: businessShortCode,
          amount: 1,
          phoneNumber: '254708374149',
          accountReference: 'TestPayment',
          password: password,
          timestamp: timestamp
        }
      },
      {
        name: 'Form Data Format',
        request: new URLSearchParams({
          BusinessShortCode: businessShortCode,
          TransactionType: 'CustomerPayBillOnline',
          Amount: '1',
          PartyA: '254708374149',
          PartyB: businessShortCode,
          PhoneNumber: '254708374149',
          CallBackURL: 'https://your-callback-url.com/callback',
          AccountReference: 'TestPayment',
          TransactionDesc: 'Test STK Push Payment',
          Password: password,
          Timestamp: timestamp
        }).toString()
      }
    ];

    const endpoint = 'https://uat.buni.kcbgroup.com/mm/api/request/1.0.0';

    for (const format of requestFormats) {
      try {
        console.log(`Trying ${format.name}...`);
        
        const headers = {
          'Authorization': `Bearer ${accessToken}`
        };

        if (format.name === 'Form Data Format') {
          headers['Content-Type'] = 'application/x-www-form-urlencoded';
        } else {
          headers['Content-Type'] = 'application/json';
        }

        const response = await fetch(endpoint, {
          method: 'POST',
          headers: headers,
          body: format.name === 'Form Data Format' ? format.request : JSON.stringify(format.request)
        });

        console.log(`  Status: ${response.status} ${response.statusText}`);

        if (response.ok) {
          const data = await response.json();
          console.log('  ✅ SUCCESS! STK Push working:');
          console.log('  Response:', JSON.stringify(data, null, 2));
          console.log('  Format used:', format.name);
          return { success: true, format: format.name, data };
        } else {
          const errorText = await response.text();
          if (errorText.includes('<!DOCTYPE') || errorText.includes('<html>')) {
            console.log(`  ❌ HTML response: ${response.status}`);
          } else {
            console.log(`  ❌ Error: ${response.status} - ${errorText.substring(0, 100)}`);
          }
        }
      } catch (error) {
        console.log(`  ❌ Error: ${error.message}`);
      }
    }

    console.log('\n❌ All request formats failed');
    return null;
  }

  // Run all tests
  async runAllTests() {
    console.log('🚀 Testing KCB Buni Endpoint Variations\n');
    console.log('=' .repeat(50));
    
    // Get access token
    const accessToken = await this.getAccessToken();
    if (!accessToken) {
      console.log('❌ Failed to get access token');
      return;
    }
    
    console.log('✅ Access token obtained successfully!');
    
    // Test different endpoints
    const endpointResult = await this.testEndpointVariations(accessToken);
    
    // Test different request formats
    const formatResult = await this.testRequestFormats(accessToken);
    
    console.log('\n' + '=' .repeat(50));
    
    if (endpointResult || formatResult) {
      console.log('🎉 SUCCESS! Found working KCB Buni configuration!');
      if (endpointResult) {
        console.log('Working endpoint:', endpointResult.endpoint);
      }
      if (formatResult) {
        console.log('Working format:', formatResult.format);
      }
    } else {
      console.log('⚠️  No working KCB Buni configuration found');
      console.log('Please contact KCB support for the correct endpoints');
    }
  }
}

// Run the tests
const tester = new KCBEndpointVariationsTester();
tester.runAllTests();

