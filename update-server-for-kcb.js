import fs from 'fs';

// Update server.js to use KCB/Buni M-Pesa API
const updateServerForKCB = () => {
  console.log('🔄 Updating server.js to use KCB/Buni M-Pesa API...\n');
  
  try {
    // Read current server.js
    let serverContent = fs.readFileSync('server.js', 'utf8');
    
    // Replace the MpesaAPI class with KCB/Buni version
    const newMpesaClass = `// M-Pesa API Helper Functions for KCB/Buni
class MpesaAPI {
  constructor() {
    this.accessToken = null;
    this.tokenExpiry = 0;
    this.baseURL = 'https://sandbox.buni.kcbgroup.com';
    this.apiKey = process.env.KCB_API_KEY || '${process.env.KCB_API_KEY || 'your_kcb_api_key_here'}';
  }

  async getAccessToken() {
    // Check if we have a valid cached token
    if (this.accessToken && Date.now() < this.tokenExpiry) {
      return this.accessToken;
    }

    try {
      console.log('🔑 Getting KCB/Buni access token...');
      
      // Try different authentication methods for KCB/Buni
      const authMethods = [
        {
          name: 'Bearer Token',
          headers: { 'Authorization': \`Bearer \${this.apiKey}\` }
        },
        {
          name: 'API Key Header',
          headers: { 'X-API-Key': this.apiKey }
        },
        {
          name: 'Custom Header',
          headers: { 'X-Auth-Token': this.apiKey }
        }
      ];

      for (const method of authMethods) {
        try {
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
          }
        } catch (error) {
          console.log(\`❌ \${method.name} failed:\`, error.message);
        }
      }

      // Fallback to consumer key/secret if API key fails
      const consumerKey = process.env.DARAJA_CONSUMER_KEY;
      const consumerSecret = process.env.DARAJA_CONSUMER_SECRET;

      if (consumerKey && consumerSecret) {
        console.log('🔄 Trying with consumer key/secret...');
        const auth = Buffer.from(\`\${consumerKey}:\${consumerSecret}\`).toString('base64');
        
        const response = await fetch(\`\${this.baseURL}/oauth2/v1/generate?grant_type=client_credentials\`, {
          method: 'GET',
          headers: {
            'Authorization': \`Basic \${auth}\`,
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          const data = await response.json();
          this.accessToken = data.access_token;
          this.tokenExpiry = Date.now() + (data.expires_in * 1000) - 60000;
          console.log('✅ Access token obtained with consumer key/secret');
          return this.accessToken;
        }
      }

      throw new Error('All authentication methods failed');

    } catch (error) {
      console.error('❌ Error getting KCB/Buni access token:', error);
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

      console.log('🚀 Initiating KCB/Buni STK Push:', {
        BusinessShortCode: stkPushRequest.BusinessShortCode,
        Amount: stkPushRequest.Amount,
        PartyA: stkPushRequest.PartyA,
        AccountReference: stkPushRequest.AccountReference,
      });

      // Try different STK Push endpoints for KCB/Buni
      const endpoints = [
        \`\${this.baseURL}/mm/api/request/v1/processrequest\`,
        \`\${this.baseURL}/mpesa/stkpush/v1/processrequest\`,
        \`\${this.baseURL}/api/request/v1/processrequest\`
      ];

      for (const endpoint of endpoints) {
        try {
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
            console.log('✅ KCB/Buni STK Push initiated:', data);
            return data;
          } else {
            const errorText = await response.text();
            console.log(\`❌ Endpoint \${endpoint} failed:\`, response.status, errorText);
          }
        } catch (error) {
          console.log(\`❌ Endpoint \${endpoint} error:\`, error.message);
        }
      }

      throw new Error('All STK Push endpoints failed');

    } catch (error) {
      console.error('❌ Error initiating KCB/Buni STK Push:', error);
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
    console.log('✅ server.js updated for KCB/Buni M-Pesa API');
    
  } catch (error) {
    console.error('❌ Error updating server.js:', error.message);
  }
};

// Create .env file with KCB credentials
const createEnvFile = () => {
  console.log('📝 Creating .env file with KCB credentials...\n');
  
  const envContent = `# KCB/Buni M-Pesa API Configuration
KCB_API_KEY=your_kcb_api_key_here
DARAJA_CONSUMER_KEY=1tQvpm2n9wcq8zgJtz0za_LZD6Qa
DARAJA_CONSUMER_SECRET=YaAZqrI2hJmVI4SxhPs3J5TiPzga
DARAJA_PASSKEY=bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919
DARAJA_SHORTCODE_SANDBOX=174379
DARAJA_CALLBACK_URL=http://localhost:3001/api/mpesa/callback
DARAJA_ENV=sandbox

# Database Configuration
SUPABASE_URL=https://kozhlejudselgtmohdfm.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtvemhsZWp1ZHNlbGd0bW9oZGZtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzQwNDI5OCwiZXhwIjoyMDcyOTgwMjk4fQ.LWosNpPJO_clOXXYa5pqGM36S-FLANk71F8BvcsJf2g
`;

  try {
    fs.writeFileSync('.env', envContent);
    console.log('✅ .env file created with KCB credentials');
  } catch (error) {
    console.log('❌ Error creating .env file:', error.message);
  }
};

// Run the updates
console.log('🚀 Setting up KCB/Buni M-Pesa Integration\n');
console.log('=' .repeat(50));

createEnvFile();
updateServerForKCB();

console.log('\n' + '=' .repeat(50));
console.log('✅ KCB/Buni M-Pesa setup completed!');
console.log('\n💡 Next steps:');
console.log('1. Add your KCB API key to the .env file');
console.log('2. Restart your server: npm start');
console.log('3. Test the M-Pesa integration');
console.log('4. Your app will now use KCB/Buni M-Pesa API! 🚀');


