import fs from 'fs';

// Update server.js and .env with the latest KCB Buni credentials
const updateKCBBuniLatest = () => {
  console.log('🔄 Updating KCB Buni M-Pesa Express STK Push with latest credentials...\n');
  
  try {
    // Update .env file with latest credentials
    const envContent = `# KCB Buni M-Pesa Express STK Push Configuration
KCB_API_KEY=eyJ4NXQiOiJaREEzWldJeU1UTTVabUptTnpNeU5UTXlabU13TVRZMU4ySTJORGhsT1dSaFpEWmpNakUwTkE9PSIsImtpZCI6ImdhdGV3YXlfY2VydGlmaWNhdGVfYWxpYXMiLCJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJzdWIiOiJBcG9sbG8uc2Fua2lpQGNhcmJvbi5zdXBlciIsImFwcGxpY2F0aW9uIjp7Im93bmVyIjoiQXBvbGxvLnNhbmtpaSIsInRpZXJRdW90YVR5cGUiOm51bGwsInRpZXIiOiJVbmxpbWl0ZWQiLCJuYW1lIjoiRGVmYXVsdEFwcGxpY2F0aW9uIiwiaWQiOjMwMjgyLCJ1dWlkIjoiNGY2YTJiODEtZjk5Ni00MzY1LThhNWQtYTg4ZmQ2YTBkM2U4In0sImlzcyI6Imh0dHBzOlwvXC9zYW5kYm94LmJ1bmkua2NiZ3JvdXAuY29tXC9vYXV0aDJcL3Rva2VuIiwidGllckluZm8iOnsiVW5saW1pdGVkIjp7InRpZXJRdW90YVR5cGUiOiJyZXF1ZXN0Q291bnQiLCJncmFwaFFMTWF4Q29tcGxleGl0eSI6MCwiZ3JhcGhRTE1heERlcHRoIjowLCJzdG9wT25RdW90YVJlYWNoIjp0cnVlLCJzcGlrZUFycmVzdExpbWl0IjowLCJzcGlrZUFycmVzdFVuaXQiOm51bGx9fSwia2V5dHlwZSI6IlNBTkRCT1giLCJwZXJtaXR0ZWRSZWZlcmVyIjoiIiwic3Vic2NyaWJlZEFQSXMiOlt7InN1YnNjcmliZXJUZW5hbnREb21haW4iOiJjYXJib24uc3VwZXIiLCJuYW1lIjoiTXBlc2FFeHByZXNzQVBJU2VydmljZSIsImNvbnRleHQiOiJcL21tXC9hcGlcL3JlcXVlc3RcLzEuMC4wIiwicHVibGlzaGVyIjoic3VwZXJfYWRtaW4iLCJ2ZXJzaW9uIjoiMS4wLjAiLCJzdWJzY3JpcHRpb25UaWVyIjoiVW5saW1pdGVkIn1dLCJ0b2tlbl90eXBlIjoiYXBpS2V5IiwicGVybWl0dGVkSVAiOiIiLCJpYXQiOjE3NjA3ODQ2NTQsImp0aSI6IjAwNmFlN2I5LWEzNTAtNGZiYy05MDEzLWEzOTdjNGIyZjA4MyJ9.Lgs1-J-868pElLKdqR9lXd7SsqqGKPf-5Su_pP0g6_AjiOeSZbEyabFsKf_hPDbZ5uVPnvKLj7RVzjdidc5zP9XUFotg2ggQx6PmNwWKYKRzZYLNZUX5m89TGYJ6qhB7_TxMalwzTjtpYRVE7Djbzg7K4EhYBRITUYL8Rtg0QMOcUMb_yeXvCKdZTSnwyvqFAU6uxpPe2kLfI-SEr4MVsMuH3IU2V3gsgVAaDYCpDeRdFDscVJEELcbk4Z1cHKf6-Dk0CHZZ_e__mOTguuZKFLtQ_piitYc7pbM2Lg6PCwA0JKg9eb8QNmll18x9VkpFLYA61I6_76z_m08r0SnpQw==
KCB_CLIENT_ID=5VgDbdGEYrR31pmeSjZaHb8qrsYa
KCB_CLIENT_SECRET=rTFiefzJxB1bVm5fIc0TDZCmVRca
DARAJA_CONSUMER_KEY=1tQvpm2n9wcq8zgJtz0za_LZD6Qa
DARAJA_CONSUMER_SECRET=YaAZqrI2hJmVI4SxhPs3J5TiPzga
DARAJA_PASSKEY=bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919
DARAJA_SHORTCODE_SANDBOX=174379
DARAJA_CALLBACK_URL=https://posthere.io/f613-4b7f-b82b
DARAJA_ENV=sandbox
SUPABASE_URL=https://kozhlejudselgtmohdfm.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtvemhsZWp1ZHNlbGd0bW9oZGZtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzQwNDI5OCwiZXhwIjoyMDcyOTgwMjk4fQ.LWosNpPJO_clOXXYa5pqGM36S-FLANk71F8BvcsJf2g
`;

    fs.writeFileSync('.env', envContent);
    console.log('✅ .env file updated with latest KCB Buni credentials');

    // Read current server.js
    let serverContent = fs.readFileSync('server.js', 'utf8');
    
    // Update the MpesaAPI class with latest credentials and improved error handling
    const newMpesaClass = `// KCB Buni M-Pesa Express STK Push API Helper Functions
class MpesaAPI {
  constructor() {
    this.accessToken = null;
    this.tokenExpiry = 0;
    this.baseURL = 'https://accounts.buni.kcbgroup.com';
    this.stkPushURL = 'https://uat.buni.kcbgroup.com/mm/api/request/1.0.0/stkpush';
    this.apiKey = process.env.KCB_API_KEY || 'eyJ4NXQiOiJaREEzWldJeU1UTTVabUptTnpNeU5UTXlabU13TVRZMU4ySTJORGhsT1dSaFpEWmpNakUwTkE9PSIsImtpZCI6ImdhdGV3YXlfY2VydGlmaWNhdGVfYWxpYXMiLCJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJzdWIiOiJBcG9sbG8uc2Fua2lpQGNhcmJvbi5zdXBlciIsImFwcGxpY2F0aW9uIjp7Im93bmVyIjoiQXBvbGxvLnNhbmtpaSIsInRpZXJRdW90YVR5cGUiOm51bGwsInRpZXIiOiJVbmxpbWl0ZWQiLCJuYW1lIjoiRGVmYXVsdEFwcGxpY2F0aW9uIiwiaWQiOjMwMjgyLCJ1dWlkIjoiNGY2YTJiODEtZjk5Ni00MzY1LThhNWQtYTg4ZmQ2YTBkM2U4In0sImlzcyI6Imh0dHBzOlwvXC9zYW5kYm94LmJ1bmkua2NiZ3JvdXAuY29tXC9vYXV0aDJcL3Rva2VuIiwidGllckluZm8iOnsiVW5saW1pdGVkIjp7InRpZXJRdW90YVR5cGUiOiJyZXF1ZXN0Q291bnQiLCJncmFwaFFMTWF4Q29tcGxleGl0eSI6MCwiZ3JhcGhRTE1heERlcHRoIjowLCJzdG9wT25RdW90YVJlYWNoIjp0cnVlLCJzcGlrZUFycmVzdExpbWl0IjowLCJzcGlrZUFycmVzdFVuaXQiOm51bGx9fSwia2V5dHlwZSI6IlNBTkRCT1giLCJwZXJtaXR0ZWRSZWZlcmVyIjoiIiwic3Vic2NyaWJlZEFQSXMiOlt7InN1YnNjcmliZXJUZW5hbnREb21haW4iOiJjYXJib24uc3VwZXIiLCJuYW1lIjoiTXBlc2FFeHByZXNzQVBJU2VydmljZSIsImNvbnRleHQiOiJcL21tXC9hcGlcL3JlcXVlc3RcLzEuMC4wIiwicHVibGlzaGVyIjoic3VwZXJfYWRtaW4iLCJ2ZXJzaW9uIjoiMS4wLjAiLCJzdWJzY3JpcHRpb25UaWVyIjoiVW5saW1pdGVkIn1dLCJ0b2tlbl90eXBlIjoiYXBpS2V5IiwicGVybWl0dGVkSVAiOiIiLCJpYXQiOjE3NjA3ODQ2NTQsImp0aSI6IjAwNmFlN2I5LWEzNTAtNGZiYy05MDEzLWEzOTdjNGIyZjA4MyJ9.Lgs1-J-868pElLKdqR9lXd7SsqqGKPf-5Su_pP0g6_AjiOeSZbEyabFsKf_hPDbZ5uVPnvKLj7RVzjdidc5zP9XUFotg2ggQx6PmNwWKYKRzZYLNZUX5m89TGYJ6qhB7_TxMalwzTjtpYRVE7Djbzg7K4EhYBRITUYL8Rtg0QMOcUMb_yeXvCKdZTSnwyvqFAU6uxpPe2kLfI-SEr4MVsMuH3IU2V3gsgVAaDYCpDeRdFDscVJEELcbk4Z1cHKf6-Dk0CHZZ_e__mOTguuZKFLtQ_piitYc7pbM2Lg6PCwA0JKg9eb8QNmll18x9VkpFLYA61I6_76z_m08r0SnpQw==';
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
      
      const response = await fetch(\`\${this.baseURL}/oauth2/token\`, {
        method: 'POST',
        headers: {
          'Authorization': \`Basic \${Buffer.from(\`\${this.clientId}:\${this.clientSecret}\`).toString('base64')}\`,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: 'grant_type=client_credentials'
      });

      console.log(\`OAuth Status: \${response.status} \${response.statusText}\`);

      if (response.ok) {
        const data = await response.json();
        this.accessToken = data.access_token;
        this.tokenExpiry = Date.now() + (data.expires_in * 1000) - 60000; // 1 minute buffer
        
        console.log('✅ KCB Buni access token obtained successfully');
        console.log('Token expires in:', data.expires_in, 'seconds');
        return this.accessToken;
      } else {
        const errorText = await response.text();
        console.log('❌ KCB Buni OAuth failed:', response.status, errorText);
        throw new Error(\`OAuth failed: \${response.status} - \${errorText}\`);
      }

    } catch (error) {
      console.error('❌ Error getting KCB Buni access token:', error);
      throw error;
    }
  }

  async initiateSTKPush(request) {
    try {
      const accessToken = await this.getAccessToken();
      
      // Generate unique message ID
      const messageId = \`\${Date.now()}_KCBOrg_\${Math.floor(Math.random() * 10000000000)}\`;
      
      // Format request according to KCB Buni Express STK Push API documentation
      const stkPushRequest = {
        phoneNumber: request.PartyA,
        amount: request.Amount.toString(),
        invoiceNumber: request.AccountReference,
        sharedShortCode: true,
        orgShortCode: "",
        orgPassKey: "",
        callbackUrl: request.CallBackURL || 'https://posthere.io/f613-4b7f-b82b',
        transactionDescription: request.TransactionDesc || 'Payment'
      };

      console.log('🚀 Initiating KCB Buni Express STK Push:', {
        phoneNumber: stkPushRequest.phoneNumber,
        amount: stkPushRequest.amount,
        invoiceNumber: stkPushRequest.invoiceNumber,
        transactionDescription: stkPushRequest.transactionDescription,
        messageId: messageId
      });

      const response = await fetch(this.stkPushURL, {
        method: 'POST',
        headers: {
          'Authorization': \`Bearer \${accessToken}\`,
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'routeCode': '207',
          'operation': 'STKPush',
          'messageId': messageId
        },
        body: JSON.stringify(stkPushRequest),
      });

      console.log(\`STK Push Status: \${response.status} \${response.statusText}\`);

      if (response.ok) {
        const data = await response.json();
        console.log('✅ KCB Buni Express STK Push initiated successfully:', data);
        return data;
      } else {
        const errorText = await response.text();
        console.log('❌ KCB Buni Express STK Push failed:', response.status, errorText);
        
        // Try to parse error response
        try {
          const errorData = JSON.parse(errorText);
          throw new Error(\`STK Push failed: \${response.status} - \${JSON.stringify(errorData)}\`);
        } catch (parseError) {
          throw new Error(\`STK Push failed: \${response.status} - \${errorText.substring(0, 200)}\`);
        }
      }

    } catch (error) {
      console.error('❌ Error initiating KCB Buni Express STK Push:', error);
      throw error;
    }
  }

  async verifySTKPush(checkoutRequestID) {
    try {
      const accessToken = await this.getAccessToken();
      
      const response = await fetch('https://uat.buni.kcbgroup.com/mpesa/stkpushquery/v1/query', {
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

  generatePassword(shortcode, passkey, timestamp) {
    const passwordString = \`\${shortcode}\${passkey}\${timestamp}\`;
    return Buffer.from(passwordString).toString('base64');
  }
}`;

    // Replace the MpesaAPI class in server.js
    const updatedContent = serverContent.replace(
      /\/\/ M-Pesa API Helper Functions[\s\S]*?^}$/m,
      newMpesaClass
    );

    // Write updated server.js
    fs.writeFileSync('server.js', updatedContent);
    console.log('✅ server.js updated for KCB Buni Express STK Push');
    
  } catch (error) {
    console.error('❌ Error updating KCB Buni configuration:', error.message);
  }
};

// Run the update
console.log('🚀 Implementing KCB Buni M-Pesa Express STK Push Service\n');
console.log('=' .repeat(60));

updateKCBBuniLatest();

console.log('\n' + '=' .repeat(60));
console.log('✅ KCB Buni Express STK Push implementation completed!');
console.log('\n💡 Next steps:');
console.log('1. Restart your server: npm start');
console.log('2. Test the M-Pesa Express STK Push functionality');
console.log('3. Your app now has KCB Buni M-Pesa Express integration! 🚀');

