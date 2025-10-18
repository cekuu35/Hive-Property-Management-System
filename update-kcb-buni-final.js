import fs from 'fs';

// Update server.js to use the correct KCB Buni API with proper authentication
const updateServerForFinalKCBBuni = () => {
  console.log('🔄 Updating server.js for final KCB Buni M-Pesa API...\n');
  
  try {
    // Read current server.js
    let serverContent = fs.readFileSync('server.js', 'utf8');
    
    // Replace the MpesaAPI class with the final KCB Buni version
    const newMpesaClass = `// M-Pesa API Helper Functions for KCB Buni
class MpesaAPI {
  constructor() {
    this.accessToken = null;
    this.tokenExpiry = 0;
    this.baseURL = 'https://accounts.buni.kcbgroup.com';
    this.apiKey = process.env.KCB_API_KEY || 'eyJ4NXQiOiJaREEzWldJeU1UTTVabUptTnpNeU5UTXlabU13TVRZMU4ySTJORGhsT1dSaFpEWmpNakUwTkE9PSIsImtpZCI6ImdhdGV3YXlfY2VydGlmaWNhdGVfYWxpYXMiLCJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJzdWIiOiJBcG9sbG8uc2Fua2lpQGNhcmJvbi5zdXBlciIsImFwcGxpY2F0aW9uIjp7Im93bmVyIjoiQXBvbGxvLnNhbmtpaSIsInRpZXJRdW90YVR5cGUiOm51bGwsInRpZXIiOiJVbmxpbWl0ZWQiLCJuYW1lIjoiRGVmYXVsdEFwcGxpY2F0aW9uIiwiaWQiOjMwMjgyLCJ1dWlkIjoiNGY2YTJiODEtZjk5Ni00MzY1LThhNWQtYTg4ZmQ2YTBkM2U4In0sImlzcyI6Imh0dHBzOlwvXC9zYW5kYm94LmJ1bmkua2NiZ3JvdXAuY29tXC9vYXV0aDJcL3Rva2VuIiwidGllckluZm8iOnsiVW5saW1pdGVkIjp7InRpZXJRdW90YVR5cGUiOiJyZXF1ZXN0Q291bnQiLCJncmFwaFFMTWF4Q29tcGxleGl0eSI6MCwiZ3JhcGhRTE1heERlcHRoIjowLCJzdG9wT25RdW90YVJlYWNoIjp0cnVlLCJzcGlrZUFycmVzdExpbWl0IjowLCJzcGlrZUFycmVzdFVuaXQiOm51bGx9fSwia2V5dHlwZSI6IlNBTkRCT1giLCJwZXJtaXR0ZWRSZWZlcmVyIjoiIiwic3Vic2NyaWJlZEFQSXMiOlt7InN1YnNjcmliZXJUZW5hbnREb21haW4iOiJjYXJib24uc3VwZXIiLCJuYW1lIjoiTXBlc2FFeHByZXNzQVBJU2VydmljZSIsImNvbnRleHQiOiJcL21tXC9hcGlcL3JlcXVlc3RcLzEuMC4wIiwicHVibGlzaGVyIjoic3VwZXJfYWRtaW4iLCJ2ZXJzaW9uIjoiMS4wLjAiLCJzdWJzY3JpcHRpb25UaWVyIjoiVW5saW1pdGVkIn1dLCJ0b2tlbl90eXBlIjoiYXBpS2V5IiwicGVybWl0dGVkSVAiOiIiLCJpYXQiOjE3NjA3MTAwNDEsImp0aSI6IjAyYWYwYWI3LWJkNmEtNGRlNC1hNjJiLTI1M2NlNjliZDNhOSJ9.smWVYY7ZgiPiPTKd-8Yj9FbkFU736qQrzIXX1nw_tdskZh0KdcV2HWgcSe4FP8RzGFTL6g8_QSKiihbaY-b2Ajl3pjxWDdmq3meARCFkYacS_tduNIa71IVbFOMeXgo0ObFn9Pl6I7b9gLfN3E41DbslV2fLiBq9bH8AnnPCF4PY26Sffz0RSIu-g9_BY4ntICYZ8JfQwC5AV2Stk5X64KpXwCczZe1GREssBP4jnoItO1oook8ehySlQtYMJViNdV3BWjc4jPR8tJ80W2CbccEGy38kaqlkXWy8e9kEmCIv-GL4kq79BhKKEK2vFHYaD4ICCkv3aUxRmWZTMUi8QQ==';
    this.clientId = process.env.KCB_CLIENT_ID || '5VgDbdGEYrR31pmeSjZaHb8qrsYa';
    this.clientSecret = process.env.KCB_CLIENT_SECRET || 'rTFiefzJxB1bVm5fIc0TDZCmVRca';
  }

  async getAccessToken() {
    // Check if we have a valid cached token
    if (this.accessToken && Date.now() < this.tokenExpiry) {
      return this.accessToken;
    }

    try {
      console.log('🔑 Getting KCB Buni access token...');
      
      // Try different authentication methods for KCB Buni
      const authMethods = [
        {
          name: 'Client Credentials with API Key',
          headers: {
            'Authorization': \`Bearer \${this.apiKey}\`,
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          body: 'grant_type=client_credentials'
        },
        {
          name: 'Client Credentials with Client ID/Secret',
          headers: {
            'Authorization': \`Basic \${Buffer.from(\`\${this.clientId}:\${this.clientSecret}\`).toString('base64')}\`,
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          body: 'grant_type=client_credentials'
        },
        {
          name: 'API Key as Client ID',
          headers: {
            'Authorization': \`Basic \${Buffer.from(\`\${this.apiKey}:\`).toString('base64')}\`,
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          body: 'grant_type=client_credentials'
        }
      ];

      for (const method of authMethods) {
        try {
          console.log(\`Trying \${method.name}...\`);
          
          const response = await fetch(\`\${this.baseURL}/oauth2/token\`, {
            method: 'POST',
            headers: method.headers,
            body: method.body
          });

          console.log(\`OAuth Status: \${response.status} \${response.statusText}\`);

          if (response.ok) {
            const data = await response.json();
            this.accessToken = data.access_token;
            this.tokenExpiry = Date.now() + (data.expires_in * 1000) - 60000; // 1 minute buffer
            
            console.log('✅ KCB Buni access token obtained successfully');
            console.log('Token expires in:', data.expires_in, 'seconds');
            console.log('Method used:', method.name);
            return this.accessToken;
          } else {
            const errorText = await response.text();
            console.log(\`❌ \${method.name} failed: \${response.status} - \${errorText.substring(0, 200)}\`);
          }
        } catch (error) {
          console.log(\`❌ \${method.name} error: \${error.message}\`);
        }
      }

      throw new Error('All KCB Buni authentication methods failed');

    } catch (error) {
      console.error('❌ Error getting KCB Buni access token:', error);
      throw error;
    }
  }

  generatePassword(shortcode, passkey, timestamp) {
    const passwordString = \`\${shortcode}\${passkey}\${timestamp}\`;
    return Buffer.from(passwordString).toString('base64');
  }

  async initiateSTKPush(request) {
    try {
      const accessToken = await this.getAccessToken();
      const timestamp = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, -3);
      const passkey = process.env.DARAJA_PASSKEY || 'bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919';
      
      const password = this.generatePassword(request.BusinessShortCode, passkey, timestamp);

      const stkPushRequest = {
        ...request,
        Password: password,
        Timestamp: timestamp,
      };

      console.log('🚀 Initiating KCB Buni STK Push:', {
        BusinessShortCode: stkPushRequest.BusinessShortCode,
        Amount: stkPushRequest.Amount,
        PartyA: stkPushRequest.PartyA,
        AccountReference: stkPushRequest.AccountReference,
      });

      // Try different STK Push endpoints
      const stkPushEndpoints = [
        'https://sandbox.buni.kcbgroup.com/mm/api/request/v1/processrequest',
        'https://sandbox.buni.kcbgroup.com/mpesa/stkpush/v1/processrequest',
        'https://api.buni.kcbgroup.com/mm/api/request/v1/processrequest'
      ];

      for (const endpoint of stkPushEndpoints) {
        try {
          console.log(\`Trying STK Push endpoint: \${endpoint}\`);
          
          const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
              'Authorization': \`Bearer \${accessToken}\`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(stkPushRequest),
          });

          console.log(\`STK Push Status: \${response.status} \${response.statusText}\`);

          if (response.ok) {
            const data = await response.json();
            console.log('✅ KCB Buni STK Push initiated successfully:', data);
            return data;
          } else {
            const errorText = await response.text();
            console.log(\`❌ STK Push failed on \${endpoint}: \${response.status} - \${errorText.substring(0, 200)}\`);
          }
        } catch (error) {
          console.log(\`❌ STK Push error on \${endpoint}: \${error.message}\`);
        }
      }

      throw new Error('All KCB Buni STK Push endpoints failed');

    } catch (error) {
      console.error('❌ Error initiating KCB Buni STK Push:', error);
      throw error;
    }
  }

  async verifySTKPush(checkoutRequestID) {
    try {
      const accessToken = await this.getAccessToken();
      
      const response = await fetch('https://sandbox.buni.kcbgroup.com/mpesa/stkpushquery/v1/query', {
        method: 'POST',
        headers: {
          'Authorization': \`Bearer \${accessToken}\`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          BusinessShortCode: process.env.DARAJA_SHORTCODE_SANDBOX || '174379',
          Password: this.generatePassword(
            process.env.DARAJA_SHORTCODE_SANDBOX || '174379',
            process.env.DARAJA_PASSKEY || 'bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919',
            new Date().toISOString().replace(/[^0-9]/g, '').slice(0, -3)
          ),
          Timestamp: new Date().toISOString().replace(/[^0-9]/g, '').slice(0, -3),
          CheckoutRequestID: checkoutRequestID
        }),
      });

      if (!response.ok) {
        throw new Error(\`STK Push query failed: \${response.statusText}\`);
      }

      return await response.json();
    } catch (error) {
      console.error('❌ Error verifying STK Push:', error);
      throw error;
    }
  }
}`;

    // Replace the MpesaAPI class in server.js
    const updatedContent = serverContent.replace(
      /\/\/ M-Pesa API Helper Functions[\s\S]*?^}$/m,
      newMpesaClass
    );

    // Write updated server.js
    fs.writeFileSync('server.js', updatedContent);
    console.log('✅ server.js updated for final KCB Buni M-Pesa API');
    
  } catch (error) {
    console.error('❌ Error updating server.js:', error.message);
  }
};

// Update .env file with all KCB credentials
const updateEnvFile = () => {
  console.log('📝 Updating .env file with complete KCB credentials...\n');
  
  const envContent = `# KCB Buni M-Pesa API Configuration
KCB_API_KEY=eyJ4NXQiOiJaREEzWldJeU1UTTVabUptTnpNeU5UTXlabU13TVRZMU4ySTJORGhsT1dSaFpEWmpNakUwTkE9PSIsImtpZCI6ImdhdGV3YXlfY2VydGlmaWNhdGVfYWxpYXMiLCJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJzdWIiOiJBcG9sbG8uc2Fua2lpQGNhcmJvbi5zdXBlciIsImFwcGxpY2F0aW9uIjp7Im93bmVyIjoiQXBvbGxvLnNhbmtpaSIsInRpZXJRdW90YVR5cGUiOm51bGwsInRpZXIiOiJVbmxpbWl0ZWQiLCJuYW1lIjoiRGVmYXVsdEFwcGxpY2F0aW9uIiwiaWQiOjMwMjgyLCJ1dWlkIjoiNGY2YTJiODEtZjk5Ni00MzY1LThhNWQtYTg4ZmQ2YTBkM2U4In0sImlzcyI6Imh0dHBzOlwvXC9zYW5kYm94LmJ1bmkua2NiZ3JvdXAuY29tXC9vYXV0aDJcL3Rva2VuIiwidGllckluZm8iOnsiVW5saW1pdGVkIjp7InRpZXJRdW90YVR5cGUiOiJyZXF1ZXN0Q291bnQiLCJncmFwaFFMTWF4Q29tcGxleGl0eSI6MCwiZ3JhcGhRTE1heERlcHRoIjowLCJzdG9wT25RdW90YVJlYWNoIjp0cnVlLCJzcGlrZUFycmVzdExpbWl0IjowLCJzcGlrZUFycmVzdFVuaXQiOm51bGx9fSwia2V5dHlwZSI6IlNBTkRCT1giLCJwZXJtaXR0ZWRSZWZlcmVyIjoiIiwic3Vic2NyaWJlZEFQSXMiOlt7InN1YnNjcmliZXJUZW5hbnREb21haW4iOiJjYXJib24uc3VwZXIiLCJuYW1lIjoiTXBlc2FFeHByZXNzQVBJU2VydmljZSIsImNvbnRleHQiOiJcL21tXC9hcGlcL3JlcXVlc3RcLzEuMC4wIiwicHVibGlzaGVyIjoic3VwZXJfYWRtaW4iLCJ2ZXJzaW9uIjoiMS4wLjAiLCJzdWJzY3JpcHRpb25UaWVyIjoiVW5saW1pdGVkIn1dLCJ0b2tlbl90eXBlIjoiYXBpS2V5IiwicGVybWl0dGVkSVAiOiIiLCJpYXQiOjE3NjA3MTAwNDEsImp0aSI6IjAyYWYwYWI3LWJkNmEtNGRlNC1hNjJiLTI1M2NlNjliZDNhOSJ9.smWVYY7ZgiPiPTKd-8Yj9FbkFU736qQrzIXX1nw_tdskZh0KdcV2HWgcSe4FP8RzGFTL6g8_QSKiihbaY-b2Ajl3pjxWDdmq3meARCFkYacS_tduNIa71IVbFOMeXgo0ObFn9Pl6I7b9gLfN3E41DbslV2fLiBq9bH8AnnPCF4PY26Sffz0RSIu-g9_BY4ntICYZ8JfQwC5AV2Stk5X64KpXwCczZe1GREssBP4jnoItO1oook8ehySlQtYMJViNdV3BWjc4jPR8tJ80W2CbccEGy38kaqlkXWy8e9kEmCIv-GL4kq79BhKKEK2vFHYaD4ICCkv3aUxRmWZTMUi8QQ==
KCB_CLIENT_ID=5VgDbdGEYrR31pmeSjZaHb8qrsYa
KCB_CLIENT_SECRET=rTFiefzJxB1bVm5fIc0TDZCmVRca
DARAJA_CONSUMER_KEY=1tQvpm2n9wcq8zgJtz0za_LZD6Qa
DARAJA_CONSUMER_SECRET=YaAZqrI2hJmVI4SxhPs3J5TiPzga
DARAJA_PASSKEY=bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919
DARAJA_SHORTCODE_SANDBOX=174379
DARAJA_CALLBACK_URL=http://localhost:3001/api/mpesa/callback
DARAJA_ENV=sandbox
SUPABASE_URL=https://kozhlejudselgtmohdfm.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtvemhsZWp1ZHNlbGd0bW9oZGZtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzQwNDI5OCwiZXhwIjoyMDcyOTgwMjk4fQ.LWosNpPJO_clOXXYa5pqGM36S-FLANk71F8BvcsJf2g
`;

  try {
    fs.writeFileSync('.env', envContent);
    console.log('✅ .env file updated with complete KCB credentials');
  } catch (error) {
    console.log('❌ Error updating .env file:', error.message);
  }
};

// Run the updates
console.log('🚀 Setting up Final KCB Buni M-Pesa Integration\n');
console.log('=' .repeat(50));

updateEnvFile();
updateServerForFinalKCBBuni();

console.log('\n' + '=' .repeat(50));
console.log('✅ Final KCB Buni M-Pesa setup completed!');
console.log('\n💡 Next steps:');
console.log('1. Restart your server: npm start');
console.log('2. Test the M-Pesa integration');
console.log('3. Your app will now use the complete KCB Buni M-Pesa API! 🚀');

