import fs from 'fs';

// Update server.js to support both KCB Buni and Safaricom Daraja with switching
const updatePaymentProviderSwitching = () => {
  console.log('🔄 Adding Payment Provider Switching System...\n');
  
  try {
    // Read current server.js
    let serverContent = fs.readFileSync('server.js', 'utf8');
    
    // Create new MpesaAPI class with provider switching
    const newMpesaClass = `// Multi-Provider M-Pesa API Helper Functions
class MpesaAPI {
  constructor() {
    this.accessToken = null;
    this.tokenExpiry = 0;
    this.provider = process.env.MPESA_PROVIDER || 'kcb'; // 'kcb' or 'daraja'
    
    // KCB Buni Configuration
    this.kcbConfig = {
      baseURL: 'https://accounts.buni.kcbgroup.com',
      stkPushURL: 'https://uat.buni.kcbgroup.com/mm/api/request/1.0.0/stkpush',
      apiKey: process.env.KCB_API_KEY,
      clientId: process.env.KCB_CLIENT_ID,
      clientSecret: process.env.KCB_CLIENT_SECRET
    };
    
    // Safaricom Daraja Configuration
    this.darajaConfig = {
      baseURL: process.env.DARAJA_ENV === 'sandbox' 
        ? 'https://sandbox.safaricom.co.ke' 
        : 'https://api.safaricom.co.ke',
      consumerKey: process.env.DARAJA_CONSUMER_KEY,
      consumerSecret: process.env.DARAJA_CONSUMER_SECRET,
      passkey: process.env.DARAJA_PASSKEY,
      shortcode: process.env.DARAJA_SHORTCODE_SANDBOX,
      callbackUrl: process.env.DARAJA_CALLBACK_URL
    };
  }

  // Switch payment provider
  switchProvider(provider) {
    if (provider === 'kcb' || provider === 'daraja') {
      this.provider = provider;
      this.accessToken = null; // Clear cached token
      this.tokenExpiry = 0;
      console.log(\`🔄 Switched to \${provider.toUpperCase()} M-Pesa provider\`);
      return true;
    }
    return false;
  }

  // Get current provider
  getCurrentProvider() {
    return this.provider;
  }

  async getAccessToken() {
    // Check if we have a valid cached token
    if (this.accessToken && Date.now() < this.tokenExpiry) {
      return this.accessToken;
    }

    try {
      if (this.provider === 'kcb') {
        return await this.getKcbAccessToken();
      } else {
        return await this.getDarajaAccessToken();
      }
    } catch (error) {
      console.error(\`❌ Error getting \${this.provider} access token:\`, error);
      throw error;
    }
  }

  async getKcbAccessToken() {
    console.log('🔑 Getting KCB Buni access token...');
    
    const response = await fetch(\`\${this.kcbConfig.baseURL}/oauth2/token\`, {
      method: 'POST',
      headers: {
        'Authorization': \`Basic \${Buffer.from(\`\${this.kcbConfig.clientId}:\${this.kcbConfig.clientSecret}\`).toString('base64')}\`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: 'grant_type=client_credentials'
    });

    console.log(\`KCB OAuth Status: \${response.status} \${response.statusText}\`);

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
      throw new Error(\`KCB OAuth failed: \${response.status} - \${errorText}\`);
    }
  }

  async getDarajaAccessToken() {
    console.log('🔑 Getting Safaricom Daraja access token...');
    
    const response = await fetch(\`\${this.darajaConfig.baseURL}/oauth/v1/generate?grant_type=client_credentials\`, {
      method: 'GET',
      headers: {
        'Authorization': \`Basic \${Buffer.from(\`\${this.darajaConfig.consumerKey}:\${this.darajaConfig.consumerSecret}\`).toString('base64')}\`,
        'Content-Type': 'application/json'
      }
    });

    console.log(\`Daraja OAuth Status: \${response.status} \${response.statusText}\`);

    if (response.ok) {
      const data = await response.json();
      this.accessToken = data.access_token;
      this.tokenExpiry = Date.now() + (data.expires_in * 1000) - 60000; // 1 minute buffer
      
      console.log('✅ Safaricom Daraja access token obtained successfully');
      console.log('Token expires in:', data.expires_in, 'seconds');
      return this.accessToken;
    } else {
      const errorText = await response.text();
      console.log('❌ Daraja OAuth failed:', response.status, errorText);
      throw new Error(\`Daraja OAuth failed: \${response.status} - \${errorText}\`);
    }
  }

  async initiateSTKPush(request) {
    try {
      const accessToken = await this.getAccessToken();
      
      if (this.provider === 'kcb') {
        return await this.initiateKcbSTKPush(request, accessToken);
      } else {
        return await this.initiateDarajaSTKPush(request, accessToken);
      }
    } catch (error) {
      console.error(\`❌ Error initiating \${this.provider} STK Push:\`, error);
      throw error;
    }
  }

  async initiateKcbSTKPush(request, accessToken) {
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

    const response = await fetch(this.kcbConfig.stkPushURL, {
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

    console.log(\`KCB STK Push Status: \${response.status} \${response.statusText}\`);

    if (response.ok) {
      const data = await response.json();
      console.log('✅ KCB Buni Express STK Push initiated successfully:', data);
      return data;
    } else {
      const errorText = await response.text();
      console.log('❌ KCB Buni Express STK Push failed:', response.status, errorText);
      
      try {
        const errorData = JSON.parse(errorText);
        throw new Error(\`KCB STK Push failed: \${response.status} - \${JSON.stringify(errorData)}\`);
      } catch (parseError) {
        throw new Error(\`KCB STK Push failed: \${response.status} - \${errorText.substring(0, 200)}\`);
      }
    }
  }

  async initiateDarajaSTKPush(request, accessToken) {
    // Generate Daraja password
    const timestamp = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, -3);
    const password = Buffer.from(\`\${this.darajaConfig.shortcode}\${this.darajaConfig.passkey}\${timestamp}\`).toString('base64');
    
    const stkPushRequest = {
      BusinessShortCode: this.darajaConfig.shortcode,
      Password: password,
      Timestamp: timestamp,
      TransactionType: "CustomerPayBillOnline",
      Amount: request.Amount,
      PartyA: request.PartyA,
      PartyB: this.darajaConfig.shortcode,
      PhoneNumber: request.PartyA,
      CallBackURL: request.CallBackURL || this.darajaConfig.callbackUrl,
      AccountReference: request.AccountReference,
      TransactionDesc: request.TransactionDesc || 'Payment'
    };

    console.log('🚀 Initiating Safaricom Daraja STK Push:', {
      phoneNumber: stkPushRequest.PhoneNumber,
      amount: stkPushRequest.Amount,
      accountReference: stkPushRequest.AccountReference,
      transactionDesc: stkPushRequest.TransactionDesc
    });

    const response = await fetch(\`\${this.darajaConfig.baseURL}/mpesa/stkpush/v1/processrequest\`, {
      method: 'POST',
      headers: {
        'Authorization': \`Bearer \${accessToken}\`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(stkPushRequest),
    });

    console.log(\`Daraja STK Push Status: \${response.status} \${response.statusText}\`);

    if (response.ok) {
      const data = await response.json();
      console.log('✅ Safaricom Daraja STK Push initiated successfully:', data);
      return data;
    } else {
      const errorText = await response.text();
      console.log('❌ Safaricom Daraja STK Push failed:', response.status, errorText);
      
      try {
        const errorData = JSON.parse(errorText);
        throw new Error(\`Daraja STK Push failed: \${response.status} - \${JSON.stringify(errorData)}\`);
      } catch (parseError) {
        throw new Error(\`Daraja STK Push failed: \${response.status} - \${errorText.substring(0, 200)}\`);
      }
    }
  }

  generatePassword(shortcode, passkey, timestamp) {
    const passwordString = \`\${shortcode}\${passkey}\${timestamp}\`;
    return Buffer.from(passwordString).toString('base64');
  }
}`;

    // Replace the MpesaAPI class in server.js
    const updatedContent = serverContent.replace(
      /\/\/ KCB Buni M-Pesa Express STK Push API Helper Functions[\s\S]*?^}$/m,
      newMpesaClass
    );

    // Add provider switching endpoints
    const providerEndpoints = `

// Payment Provider Management Endpoints
app.get('/api/mpesa/provider', (req, res) => {
  try {
    res.json({
      success: true,
      provider: mpesaAPI.getCurrentProvider(),
      availableProviders: ['kcb', 'daraja']
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get current provider',
      details: error.message
    });
  }
});

app.post('/api/mpesa/switch-provider', (req, res) => {
  try {
    const { provider } = req.body;
    
    if (!provider || !['kcb', 'daraja'].includes(provider)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid provider. Must be "kcb" or "daraja"'
      });
    }
    
    const switched = mpesaAPI.switchProvider(provider);
    
    if (switched) {
      res.json({
        success: true,
        message: \`Switched to \${provider.toUpperCase()} M-Pesa provider\`,
        provider: mpesaAPI.getCurrentProvider()
      });
    } else {
      res.status(400).json({
        success: false,
        error: 'Failed to switch provider'
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to switch provider',
      details: error.message
    });
  }
});

app.get('/api/mpesa/test-provider', async (req, res) => {
  try {
    const { provider } = req.query;
    
    if (provider && !['kcb', 'daraja'].includes(provider)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid provider. Must be "kcb" or "daraja"'
      });
    }
    
    // Switch to test provider if specified
    if (provider) {
      mpesaAPI.switchProvider(provider);
    }
    
    const currentProvider = mpesaAPI.getCurrentProvider();
    const accessToken = await mpesaAPI.getAccessToken();
    
    res.json({
      success: true,
      provider: currentProvider,
      accessToken: accessToken ? 'Obtained' : 'Failed',
      message: \`\${currentProvider.toUpperCase()} M-Pesa provider is working\`
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: \`\${mpesaAPI.getCurrentProvider().toUpperCase()} M-Pesa provider test failed\`,
      details: error.message
    });
  }
});`;

    // Add the new endpoints before the health check
    const finalContent = updatedContent.replace(
      /\/\/ Health check endpoint/,
      providerEndpoints + '\n// Health check endpoint'
    );

    // Write updated server.js
    fs.writeFileSync('server.js', finalContent);
    console.log('✅ server.js updated with payment provider switching');
    
    // Update .env file to add provider selection
    const envContent = `# M-Pesa Payment Provider Configuration
MPESA_PROVIDER=kcb
# Options: 'kcb' for KCB Buni, 'daraja' for Safaricom Daraja

# KCB Buni M-Pesa Express STK Push Configuration
KCB_API_KEY=eyJ4NXQiOiJaREEzWldJeU1UTTVabUptTnpNeU5UTXlabU13TVRZMU4ySTJORGhsT1dSaFpEWmpNakUwTkE9PSIsImtpZCI6ImdhdGV3YXlfY2VydGlmaWNhdGVfYWxpYXMiLCJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJzdWIiOiJBcG9sbG8uc2Fua2lpQGNhcmJvbi5zdXBlciIsImFwcGxpY2F0aW9uIjp7Im93bmVyIjoiQXBvbGxvLnNhbmtpaSIsInRpZXJRdW90YVR5cGUiOm51bGwsInRpZXIiOiJVbmxpbWl0ZWQiLCJuYW1lIjoiRGVmYXVsdEFwcGxpY2F0aW9uIiwiaWQiOjMwMjgyLCJ1dWlkIjoiNGY2YTJiODEtZjk5Ni00MzY1LThhNWQtYTg4ZmQ2YTBkM2U4In0sImlzcyI6Imh0dHBzOlwvXC9zYW5kYm94LmJ1bmkua2NiZ3JvdXAuY29tXC9vYXV0aDJcL3Rva2VuIiwidGllckluZm8iOnsiVW5saW1pdGVkIjp7InRpZXJRdW90YVR5cGUiOiJyZXF1ZXN0Q291bnQiLCJncmFwaFFMTWF4Q29tcGxleGl0eSI6MCwiZ3JhcGhRTE1heERlcHRoIjowLCJzdG9wT25RdW90YVJlYWNoIjp0cnVlLCJzcGlrZUFycmVzdExpbWl0IjowLCJzcGlrZUFycmVzdFVuaXQiOm51bGx9fSwia2V5dHlwZSI6IlNBTkRCT1giLCJwZXJtaXR0ZWRSZWZlcmVyIjoiIiwic3Vic2NyaWJlZEFQSXMiOlt7InN1YnNjcmliZXJUZW5hbnREb21haW4iOiJjYXJib24uc3VwZXIiLCJuYW1lIjoiTXBlc2FFeHByZXNzQVBJU2VydmljZSIsImNvbnRleHQiOiJcL21tXC9hcGlcL3JlcXVlc3RcLzEuMC4wIiwicHVibGlzaGVyIjoic3VwZXJfYWRtaW4iLCJ2ZXJzaW9uIjoiMS4wLjAiLCJzdWJzY3JpcHRpb25UaWVyIjoiVW5saW1pdGVkIn1dLCJ0b2tlbl90eXBlIjoiYXBpS2V5IiwicGVybWl0dGVkSVAiOiIiLCJpYXQiOjE3NjA3ODQ2NTQsImp0aSI6IjAwNmFlN2I5LWEzNTAtNGZiYy05MDEzLWEzOTdjNGIyZjA4MyJ9.Lgs1-J-868pElLKdqR9lXd7SsqqGKPf-5Su_pP0g6_AjiOeSZbEyabFsKf_hPDbZ5uVPnvKLj7RVzjdidc5zP9XUFotg2ggQx6PmNwWKYKRzZYLNZUX5m89TGYJ6qhB7_TxMalwzTjtpYRVE7Djbzg7K4EhYBRITUYL8Rtg0QMOcUMb_yeXvCKdZTSnwyvqFAU6uxpPe2kLfI-SEr4MVsMuH3IU2V3gsgVAaDYCpDeRdFDscVJEELcbk4Z1cHKf6-Dk0CHZZ_e__mOTguuZKFLtQ_piitYc7pbM2Lg6PCwA0JKg9eb8QNmll18x9VkpFLYA61I6_76z_m08r0SnpQw==
KCB_CLIENT_ID=5VgDbdGEYrR31pmeSjZaHb8qrsYa
KCB_CLIENT_SECRET=rTFiefzJxB1bVm5fIc0TDZCmVRca

# Safaricom Daraja API Configuration
DARAJA_CONSUMER_KEY=1tQvpm2n9wcq8zgJtz0za_LZD6Qa
DARAJA_CONSUMER_SECRET=YaAZqrI2hJmVI4SxhPs3J5TiPzga
DARAJA_PASSKEY=bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919
DARAJA_SHORTCODE_SANDBOX=174379
DARAJA_CALLBACK_URL=https://posthere.io/f613-4b7f-b82b
DARAJA_ENV=sandbox

# Database Configuration
SUPABASE_URL=https://kozhlejudselgtmohdfm.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtvemhsZWp1ZHNlbGd0bW9oZGZtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzQwNDI5OCwiZXhwIjoyMDcyOTgwMjk4fQ.LWosNpPJO_clOXXYa5pqGM36S-FLANk71F8BvcsJf2g
`;

    fs.writeFileSync('.env', envContent);
    console.log('✅ .env file updated with provider selection');
    
  } catch (error) {
    console.error('❌ Error updating payment provider switching:', error.message);
  }
};

// Run the update
console.log('🚀 Adding Payment Provider Switching System\n');
console.log('=' .repeat(60));

updatePaymentProviderSwitching();

console.log('\n' + '=' .repeat(60));
console.log('✅ Payment Provider Switching System Added!');
console.log('\n💡 How to use:');
console.log('1. Set MPESA_PROVIDER=kcb in .env for KCB Buni');
console.log('2. Set MPESA_PROVIDER=daraja in .env for Safaricom Daraja');
console.log('3. Use API endpoints to switch providers dynamically');
console.log('4. Test both providers with the new test endpoints');
console.log('\n🚀 Your app now supports both KCB Buni and Safaricom Daraja!');

