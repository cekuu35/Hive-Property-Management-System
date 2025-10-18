import fs from 'fs';

// Update server.js to use the correct KCB Buni STK Push API
const updateServerForCorrectKCBBuniAPI = () => {
  console.log('🔄 Updating server.js for correct KCB Buni STK Push API...\n');
  
  try {
    // Read current server.js
    let serverContent = fs.readFileSync('server.js', 'utf8');
    
    // Replace the MpesaAPI class with the correct KCB Buni version
    const newMpesaClass = `// M-Pesa API Helper Functions for KCB Buni
class MpesaAPI {
  constructor() {
    this.accessToken = null;
    this.tokenExpiry = 0;
    this.baseURL = 'https://accounts.buni.kcbgroup.com';
    this.stkPushURL = 'https://uat.buni.kcbgroup.com/mm/api/request/1.0.0/stkpush';
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
      
      // Format request according to KCB Buni API documentation
      const stkPushRequest = {
        phoneNumber: request.PartyA,
        amount: request.Amount.toString(),
        invoiceNumber: request.AccountReference,
        sharedShortCode: true,
        orgShortCode: "",
        orgPassKey: "",
        callbackUrl: request.CallBackURL || 'https://your-callback-url.com/callback',
        transactionDescription: request.TransactionDesc || 'Payment'
      };

      console.log('🚀 Initiating KCB Buni STK Push:', {
        phoneNumber: stkPushRequest.phoneNumber,
        amount: stkPushRequest.amount,
        invoiceNumber: stkPushRequest.invoiceNumber,
        transactionDescription: stkPushRequest.transactionDescription
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
        console.log('✅ KCB Buni STK Push initiated successfully:', data);
        return data;
      } else {
        const errorText = await response.text();
        console.log('❌ KCB Buni STK Push failed:', response.status, errorText);
        throw new Error(\`STK Push failed: \${response.status} - \${errorText}\`);
      }

    } catch (error) {
      console.error('❌ Error initiating KCB Buni STK Push:', error);
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
    console.log('✅ server.js updated for correct KCB Buni STK Push API');
    
  } catch (error) {
    console.error('❌ Error updating server.js:', error.message);
  }
};

// Run the update
console.log('🚀 Updating KCB Buni STK Push to Correct API\n');
console.log('=' .repeat(50));

updateServerForCorrectKCBBuniAPI();

console.log('\n' + '=' .repeat(50));
console.log('✅ KCB Buni correct API update completed!');
console.log('\n💡 Next steps:');
console.log('1. Restart your server: npm start');
console.log('2. Test the M-Pesa integration');
console.log('3. Your app will now use the correct KCB Buni API! 🚀');

