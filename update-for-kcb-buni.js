import fs from 'fs';

// Update server.js to use KCB Buni API
const updateServerForKCBBuni = () => {
  console.log('🔄 Updating server.js for KCB Buni M-Pesa API...\n');
  
  try {
    // Read current server.js
    let serverContent = fs.readFileSync('server.js', 'utf8');
    
    // Replace the MpesaAPI class with KCB Buni version
    const newMpesaClass = `// M-Pesa API Helper Functions for KCB Buni
class MpesaAPI {
  constructor() {
    this.accessToken = null;
    this.tokenExpiry = 0;
    this.baseURL = 'https://sandbox.buni.kcbgroup.com';
  }

  async getAccessToken() {
    // Check if we have a valid cached token
    if (this.accessToken && Date.now() < this.tokenExpiry) {
      return this.accessToken;
    }

    try {
      console.log('🔑 Getting KCB Buni access token...');
      
      const consumerKey = process.env.DARAJA_CONSUMER_KEY;
      const consumerSecret = process.env.DARAJA_CONSUMER_SECRET;

      if (!consumerKey || !consumerSecret) {
        throw new Error('KCB Buni credentials not configured');
      }

      // Try different authentication methods for KCB Buni
      const authMethods = [
        {
          name: 'Basic Auth',
          auth: Buffer.from(\`\${consumerKey}:\${consumerSecret}\`).toString('base64'),
          headers: { 'Authorization': \`Basic \${Buffer.from(\`\${consumerKey}:\${consumerSecret}\`).toString('base64')}\` }
        },
        {
          name: 'Bearer Token',
          auth: consumerKey,
          headers: { 'Authorization': \`Bearer \${consumerKey}\` }
        }
      ];

      for (const method of authMethods) {
        try {
          console.log(\`Trying \${method.name}...\`);
          
          const response = await fetch(\`\${this.baseURL}/oauth2/v1/generate?grant_type=client_credentials\`, {
            method: 'GET',
            headers: {
              ...method.headers,
              'Content-Type': 'application/json'
            }
          });

          if (response.ok) {
            const data = await response.json();
            this.accessToken = data.access_token;
            this.tokenExpiry = Date.now() + (data.expires_in * 1000) - 60000; // 1 minute buffer
            
            console.log(\`✅ Access token obtained using \${method.name}\`);
            return this.accessToken;
          } else {
            const errorText = await response.text();
            console.log(\`❌ \${method.name} failed: \${response.status} - \${errorText.substring(0, 100)}\`);
          }
        } catch (error) {
          console.log(\`❌ \${method.name} error: \${error.message}\`);
        }
      }

      // Try alternative endpoints
      const altEndpoints = [
        \`\${this.baseURL}/oauth2/token\`,
        \`\${this.baseURL}/oauth/v1/generate?grant_type=client_credentials\`,
        \`\${this.baseURL}/api/oauth/token\`
      ];

      for (const endpoint of altEndpoints) {
        try {
          console.log(\`Trying alternative endpoint: \${endpoint}\`);
          
          const response = await fetch(endpoint, {
            method: endpoint.includes('token') ? 'POST' : 'GET',
            headers: {
              'Authorization': \`Basic \${Buffer.from(\`\${consumerKey}:\${consumerSecret}\`).toString('base64')}\`,
              'Content-Type': 'application/json'
            },
            body: endpoint.includes('token') ? 'grant_type=client_credentials' : undefined
          });

          if (response.ok) {
            const data = await response.json();
            this.accessToken = data.access_token;
            this.tokenExpiry = Date.now() + (data.expires_in * 1000) - 60000;
            
            console.log(\`✅ Access token obtained from \${endpoint}\`);
            return this.accessToken;
          } else {
            const errorText = await response.text();
            console.log(\`❌ \${endpoint} failed: \${response.status} - \${errorText.substring(0, 100)}\`);
          }
        } catch (error) {
          console.log(\`❌ \${endpoint} error: \${error.message}\`);
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

      // Try different STK Push endpoints for KCB Buni
      const endpoints = [
        \`\${this.baseURL}/mm/api/request/v1/processrequest\`,
        \`\${this.baseURL}/mpesa/stkpush/v1/processrequest\`,
        \`\${this.baseURL}/api/request/v1/processrequest\`,
        \`\${this.baseURL}/api/mpesa/stkpush/v1/processrequest\`
      ];

      for (const endpoint of endpoints) {
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

          if (response.ok) {
            const data = await response.json();
            console.log('✅ KCB Buni STK Push initiated:', data);
            return data;
          } else {
            const errorText = await response.text();
            console.log(\`❌ Endpoint \${endpoint} failed: \${response.status} - \${errorText.substring(0, 200)}\`);
          }
        } catch (error) {
          console.log(\`❌ Endpoint \${endpoint} error: \${error.message}\`);
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
      
      const response = await fetch(\`\${this.baseURL}/mpesa/stkpushquery/v1/query\`, {
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
    console.log('✅ server.js updated for KCB Buni M-Pesa API');
    
  } catch (error) {
    console.error('❌ Error updating server.js:', error.message);
  }
};

// Run the update
console.log('🚀 Updating Server for KCB Buni M-Pesa Integration\n');
console.log('=' .repeat(50));

updateServerForKCBBuni();

console.log('\n' + '=' .repeat(50));
console.log('✅ KCB Buni M-Pesa setup completed!');
console.log('\n💡 Next steps:');
console.log('1. Restart your server: npm start');
console.log('2. Test the M-Pesa integration');
console.log('3. Your app will now use KCB Buni M-Pesa API! 🚀');


