import fetch from 'node-fetch';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// The API key you provided
const API_KEY = "eyJ4NXQiOiJaREEzWldJeU1UTTVabUptTnpNeU5UTXlabU13TVRZMU4ySTJORGhsT1dSaFpEWmpNakUwTkE9PSIsImtpZCI6ImdhdGV3YXlfY2VydGlmaWNhdGVfYWxpYXMiLCJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJzdWIiOiJBcG9sbG8uc2Fua2lpQGNhcmJvbi5zdXBlciIsImFwcGxpY2F0aW9uIjp7Im93bmVyIjoiQXBvbGxvLnNhbmtpaSIsInRpZXJRdW90YVR5cGUiOm51bGwsInRpZXIiOiJVbmxpbWl0ZWQiLCJuYW1lIjoiRGVmYXVsdEFwcGxpY2F0aW9uIiwiaWQiOjMwMjgyLCJ1dWlkIjoiNGY2YTJiODEtZjk5Ni00MzY1LThhNWQtYTg4ZmQ2YTBkM2U4In0sImlzcyI6Imh0dHBzOlwvXC9zYW5kYm94LmJ1bmkua2NiZ3JvdXAuY29tXC9vYXV0aDJcL3Rva2VuIiwidGllckluZm8iOnsiVW5saW1pdGVkIjp7InRpZXJRdW90YVR5cGUiOiJyZXF1ZXN0Q291bnQiLCJncmFwaFFMTWF4Q29tcGxleGl0eSI6MCwiZ3JhcGhRTE1heERlcHRoIjowLCJzdG9wT25RdW90YVJlYWNoIjp0cnVlLCJzcGlrZUFycmVzdExpbWl0IjowLCJzcGlrZUFycmVzdFVuaXQiOm51bGx9fSwia2V5dHlwZSI6IlNBTkRCT1giLCJzdWJzY3JpYmVkQVBJcyI6W3sic3Vic2NyaWJlclRlbmFudERvbWFpbiI6ImNhcmJvbi5zdXBlciIsIm5hbWUiOiJNcGVzYUV4cHJlc3NBUElTZXJ2aWNlIiwiY29udGV4dCI6IlwvbW1cL2FwaVwvcmVxdWVzdFwvMS4wLjAiLCJwdWJsaXNoZXIiOiJzdXBlcl9hZG1pbiIsInZlcnNpb24iOiIxLjAuMCIsInN1YnNjcmlwdGlvblRpZXIiOiJVbmxpbWl0ZWQifV0sInRva2VuX3R5cGUiOiJhcGlLZXkiLCJpYXQiOjE3NjA3MDM4MzMsImp0aSI6IjVlYjJjYzY2LTRiN2ItNGIxMi04ODFmLTliOWI1ZDdkZDFiMiJ9.dfxnOskeHO5C3pHQHIgfH42oATV4gdTIFirbud8ZArhoQ8ArCyW9R7xH2B8E8uE7kXIr8uHv1g5cSYunkATsEXHXM6Tx3w7bOxLgfKhvHtJeYTGchilDxnWCsmPTif3r3A1OX_m6r4ivPIl5PUjFTwpgf-OURnIElgLW39KtHec_YD4Ci1elu_NE7fmK4S8obRR6Obk6cOat85AwtihA7WZ54GBGI4Dfmevgp4NfY0DGPg7BAnoqHrMgbIWSKNrBWRjfeNRusPjw03ER7QoUneTZExP8UPkWeI7BmZfxnT_EAFMk6TlYH-yNx-OGeHiMHuX3SsJwc53iffRA4NhwjQ==";

// M-Pesa API Configuration for Buni/KCB
const MPESA_CONFIG = {
  baseURL: 'https://sandbox.buni.kcbgroup.com',
  consumerKey: 'your_consumer_key', // This will be extracted from the API key
  consumerSecret: 'your_consumer_secret', // This will be extracted from the API key
  businessShortCode: '174379', // Test business short code
  passkey: 'bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919', // Test passkey
  callbackURL: 'https://your-callback-url.com/callback'
};

class MpesaAPITester {
  constructor() {
    this.accessToken = null;
    this.tokenExpiry = 0;
  }

  // Decode the JWT token to extract information
  decodeToken(token) {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));
      
      return JSON.parse(jsonPayload);
    } catch (error) {
      console.error('Error decoding token:', error);
      return null;
    }
  }

  // Get access token using the API key
  async getAccessToken() {
    try {
      console.log('🔑 Getting access token...');
      
      // For Buni/KCB, we need to use the correct endpoint
      const response = await fetch(`${MPESA_CONFIG.baseURL}/oauth2/v1/generate?grant_type=client_credentials`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${API_KEY}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.log('❌ Access token request failed:', response.status, errorText);
        
        // Try alternative endpoint
        console.log('🔄 Trying alternative endpoint...');
        const altResponse = await fetch(`${MPESA_CONFIG.baseURL}/oauth2/token`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${API_KEY}`,
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          body: 'grant_type=client_credentials'
        });
        
        if (altResponse.ok) {
          const data = await altResponse.json();
          this.accessToken = data.access_token;
          this.tokenExpiry = Date.now() + (data.expires_in * 1000) - 60000;
          console.log('✅ Access token obtained successfully via alternative endpoint');
          return this.accessToken;
        } else {
          throw new Error(`Both endpoints failed: ${response.status} and ${altResponse.status}`);
        }
      }

      const data = await response.json();
      this.accessToken = data.access_token;
      this.tokenExpiry = Date.now() + (data.expires_in * 1000) - 60000; // 1 minute buffer
      
      console.log('✅ Access token obtained successfully');
      console.log('Token expires in:', data.expires_in, 'seconds');
      
      return this.accessToken;
    } catch (error) {
      console.error('❌ Error getting access token:', error);
      throw error;
    }
  }

  // Generate password for STK Push
  generatePassword(shortcode, passkey, timestamp) {
    const passwordString = `${shortcode}${passkey}${timestamp}`;
    return Buffer.from(passwordString).toString('base64');
  }

  // Test STK Push initiation
  async testSTKPush(phoneNumber = '254708374149') {
    try {
      console.log('\n🚀 Testing STK Push...');
      
      const accessToken = await this.getAccessToken();
      const timestamp = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, -3);
      const password = this.generatePassword(MPESA_CONFIG.businessShortCode, MPESA_CONFIG.passkey, timestamp);

      const stkPushRequest = {
        BusinessShortCode: MPESA_CONFIG.businessShortCode,
        TransactionType: 'CustomerPayBillOnline',
        Amount: 1, // Test with 1 KES
        PartyA: phoneNumber,
        PartyB: MPESA_CONFIG.businessShortCode,
        PhoneNumber: phoneNumber,
        CallBackURL: MPESA_CONFIG.callbackURL,
        AccountReference: 'TestPayment',
        TransactionDesc: 'Test STK Push Payment',
        Password: password,
        Timestamp: timestamp
      };

      console.log('📱 STK Push Request:', {
        BusinessShortCode: stkPushRequest.BusinessShortCode,
        Amount: stkPushRequest.Amount,
        PartyA: stkPushRequest.PartyA,
        AccountReference: stkPushRequest.AccountReference
      });

      const response = await fetch(`${MPESA_CONFIG.baseURL}/mm/api/request/v1/processrequest`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(stkPushRequest)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`STK Push failed: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log('✅ STK Push initiated successfully:', data);
      
      return data;
    } catch (error) {
      console.error('❌ Error testing STK Push:', error);
      throw error;
    }
  }

  // Test API key validation
  async testAPIKey() {
    try {
      console.log('🔍 Testing API Key...');
      
      // Decode the token to see its contents
      const tokenData = this.decodeToken(API_KEY);
      if (tokenData) {
        console.log('📋 Token Information:');
        console.log('- Subject:', tokenData.sub);
        console.log('- Application:', tokenData.application?.name);
        console.log('- Tier:', tokenData.application?.tier);
        console.log('- Key Type:', tokenData.keytype);
        console.log('- Issued At:', new Date(tokenData.iat * 1000).toISOString());
        if (tokenData.exp) {
          console.log('- Expires At:', new Date(tokenData.exp * 1000).toISOString());
        } else {
          console.log('- Expires At: Not specified in token');
        }
        console.log('- Subscribed APIs:', tokenData.subscribedAPIs?.map(api => api.name));
      }

      // Test basic API access - try multiple endpoints
      let response = await fetch(`${MPESA_CONFIG.baseURL}/oauth2/v1/generate?grant_type=client_credentials`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${API_KEY}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        console.log('🔄 Trying alternative OAuth endpoint...');
        response = await fetch(`${MPESA_CONFIG.baseURL}/oauth2/token`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${API_KEY}`,
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          body: 'grant_type=client_credentials'
        });
      }

      if (response.ok) {
        console.log('✅ API Key is valid and working');
        return true;
      } else {
        console.log('❌ API Key validation failed:', response.status, response.statusText);
        return false;
      }
    } catch (error) {
      console.error('❌ Error testing API key:', error);
      return false;
    }
  }

  // Run all tests
  async runTests() {
    console.log('🧪 Starting M-Pesa API Key Tests...\n');
    
    try {
      // Test 1: API Key validation
      const isValid = await this.testAPIKey();
      if (!isValid) {
        console.log('❌ API Key validation failed. Stopping tests.');
        return;
      }

      // Test 2: STK Push (commented out to avoid actual charges)
      console.log('\n⚠️  STK Push test is commented out to avoid charges.');
      console.log('   Uncomment the line below to test STK Push with a real phone number.');
      // await this.testSTKPush('254708374149'); // Replace with your test phone number

      console.log('\n✅ All tests completed successfully!');
      console.log('\n📝 Next Steps:');
      console.log('1. Update your .env file with the correct M-Pesa credentials');
      console.log('2. Test with a real phone number in sandbox mode');
      console.log('3. Configure your callback URL for production');
      
    } catch (error) {
      console.error('❌ Test suite failed:', error);
    }
  }
}

// Run the tests
const tester = new MpesaAPITester();
tester.runTests();
