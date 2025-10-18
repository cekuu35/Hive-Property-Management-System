import fs from 'fs';

// Create a payment provider switching system
const createPaymentSwitcher = () => {
  console.log('🔄 Creating Payment Provider Switching System...\n');
  
  try {
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

    // Create a simple provider switching script
    const switcherScript = `import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config();

class PaymentProviderSwitcher {
  constructor() {
    this.baseURL = 'http://localhost:3001';
  }

  async getCurrentProvider() {
    try {
      const response = await fetch(\`\${this.baseURL}/api/mpesa/provider\`);
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('❌ Error getting current provider:', error.message);
      return null;
    }
  }

  async switchProvider(provider) {
    try {
      const response = await fetch(\`\${this.baseURL}/api/mpesa/switch-provider\`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider })
      });
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('❌ Error switching provider:', error.message);
      return null;
    }
  }

  async testProvider(provider) {
    try {
      const response = await fetch(\`\${this.baseURL}/api/mpesa/test-provider?provider=\${provider}\`);
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('❌ Error testing provider:', error.message);
      return null;
    }
  }

  async testPayment(provider = null) {
    try {
      if (provider) {
        await this.switchProvider(provider);
      }
      
      const response = await fetch(\`\${this.baseURL}/api/mpesa/rent-payment\`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leaseId: '7bfd4299-e952-4d03-ac60-44b465626895',
          amount: 100,
          phoneNumber: '254708374149'
        })
      });
      
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('❌ Error testing payment:', error.message);
      return null;
    }
  }

  async runTests() {
    console.log('🧪 Testing Payment Provider Switching\\n');
    console.log('=' .repeat(50));
    
    // Test current provider
    console.log('1️⃣ Getting current provider...');
    const current = await this.getCurrentProvider();
    if (current) {
      console.log(\`✅ Current provider: \${current.provider.toUpperCase()}\`);
    }
    
    // Test KCB Buni
    console.log('\\n2️⃣ Testing KCB Buni provider...');
    const kcbTest = await this.testProvider('kcb');
    if (kcbTest) {
      console.log(\`✅ KCB Buni: \${kcbTest.message}\`);
    }
    
    // Test Safaricom Daraja
    console.log('\\n3️⃣ Testing Safaricom Daraja provider...');
    const darajaTest = await this.testProvider('daraja');
    if (darajaTest) {
      console.log(\`✅ Safaricom Daraja: \${darajaTest.message}\`);
    }
    
    // Test payment with KCB
    console.log('\\n4️⃣ Testing payment with KCB Buni...');
    const kcbPayment = await this.testPayment('kcb');
    if (kcbPayment) {
      console.log(\`✅ KCB Payment: \${kcbPayment.success ? 'Success' : 'Failed'}\`);
    }
    
    // Test payment with Daraja
    console.log('\\n5️⃣ Testing payment with Safaricom Daraja...');
    const darajaPayment = await this.testPayment('daraja');
    if (darajaPayment) {
      console.log(\`✅ Daraja Payment: \${darajaPayment.success ? 'Success' : 'Failed'}\`);
    }
    
    console.log('\\n' + '=' .repeat(50));
    console.log('🎉 Payment Provider Switching Tests Complete!');
  }
}

// Run tests if called directly
if (import.meta.url === \`file://\${process.argv[1]}\`) {
  const switcher = new PaymentProviderSwitcher();
  switcher.runTests();
}

export { PaymentProviderSwitcher };`;

    fs.writeFileSync('payment-provider-switcher.js', switcherScript);
    console.log('✅ Payment provider switcher script created');

    // Create a simple HTML interface for switching providers
    const htmlInterface = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>M-Pesa Provider Switcher</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
        }
        .container {
            max-width: 800px;
            margin: 0 auto;
            background: white;
            padding: 30px;
            border-radius: 10px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.3);
        }
        .status {
            padding: 15px;
            margin: 10px 0;
            border-radius: 5px;
            font-weight: bold;
        }
        .success { background: #d4edda; color: #155724; border: 1px solid #c3e6cb; }
        .error { background: #f8d7da; color: #721c24; border: 1px solid #f5c6cb; }
        .info { background: #d1ecf1; color: #0c5460; border: 1px solid #bee5eb; }
        .warning { background: #fff3cd; color: #856404; border: 1px solid #ffeaa7; }
        button {
            background: #007bff;
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 5px;
            cursor: pointer;
            margin: 5px;
            font-size: 16px;
        }
        button:hover { background: #0056b3; }
        button:disabled { background: #6c757d; cursor: not-allowed; }
        .provider-section {
            border: 1px solid #dee2e6;
            border-radius: 5px;
            padding: 20px;
            margin: 20px 0;
        }
        .current-provider {
            background: #e7f3ff;
            border-color: #007bff;
        }
        h1 { color: #333; text-align: center; }
        h2 { color: #666; border-bottom: 2px solid #007bff; padding-bottom: 10px; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🏦 M-Pesa Provider Switcher</h1>
        <p style="text-align: center; color: #666;">Switch between KCB Buni and Safaricom Daraja M-Pesa providers</p>
        
        <div id="status" class="status info">
            Loading current provider...
        </div>
        
        <div class="provider-section current-provider">
            <h2>Current Provider</h2>
            <div id="currentProvider">Loading...</div>
            <button onclick="refreshStatus()">Refresh Status</button>
        </div>
        
        <div class="provider-section">
            <h2>Switch Provider</h2>
            <button onclick="switchProvider('kcb')" id="switchKcb">Switch to KCB Buni</button>
            <button onclick="switchProvider('daraja')" id="switchDaraja">Switch to Safaricom Daraja</button>
        </div>
        
        <div class="provider-section">
            <h2>Test Providers</h2>
            <button onclick="testProvider('kcb')">Test KCB Buni</button>
            <button onclick="testProvider('daraja')">Test Safaricom Daraja</button>
            <button onclick="testBothProviders()">Test Both Providers</button>
        </div>
        
        <div class="provider-section">
            <h2>Test Payments</h2>
            <button onclick="testPayment('kcb')">Test Payment with KCB Buni</button>
            <button onclick="testPayment('daraja')">Test Payment with Safaricom Daraja</button>
        </div>
        
        <div id="results"></div>
    </div>

    <script>
        const API_BASE = 'http://localhost:3001';
        
        async function updateStatus() {
            try {
                const response = await fetch(\`\${API_BASE}/api/mpesa/provider\`);
                const data = await response.json();
                
                if (data.success) {
                    document.getElementById('currentProvider').innerHTML = \`
                        <strong>Provider:</strong> \${data.provider.toUpperCase()}<br>
                        <strong>Available:</strong> \${data.availableProviders.join(', ').toUpperCase()}
                    \`;
                    document.getElementById('status').textContent = \`✅ Current provider: \${data.provider.toUpperCase()}\`;
                    document.getElementById('status').className = 'status success';
                } else {
                    throw new Error(data.error);
                }
            } catch (error) {
                document.getElementById('status').textContent = \`❌ Error: \${error.message}\`;
                document.getElementById('status').className = 'status error';
            }
        }
        
        async function refreshStatus() {
            document.getElementById('status').textContent = 'Refreshing...';
            document.getElementById('status').className = 'status info';
            await updateStatus();
        }
        
        async function switchProvider(provider) {
            try {
                document.getElementById('status').textContent = \`Switching to \${provider.toUpperCase()}...\`;
                document.getElementById('status').className = 'status info';
                
                const response = await fetch(\`\${API_BASE}/api/mpesa/switch-provider\`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ provider })
                });
                
                const data = await response.json();
                
                if (data.success) {
                    document.getElementById('status').textContent = \`✅ \${data.message}\`;
                    document.getElementById('status').className = 'status success';
                    await updateStatus();
                } else {
                    throw new Error(data.error);
                }
            } catch (error) {
                document.getElementById('status').textContent = \`❌ Error: \${error.message}\`;
                document.getElementById('status').className = 'status error';
            }
        }
        
        async function testProvider(provider) {
            try {
                const response = await fetch(\`\${API_BASE}/api/mpesa/test-provider?provider=\${provider}\`);
                const data = await response.json();
                
                const resultsDiv = document.getElementById('results');
                if (data.success) {
                    resultsDiv.innerHTML += \`
                        <div class="status success">
                            ✅ \${provider.toUpperCase()}: \${data.message}
                        </div>
                    \`;
                } else {
                    resultsDiv.innerHTML += \`
                        <div class="status error">
                            ❌ \${provider.toUpperCase()}: \${data.error}
                        </div>
                    \`;
                }
            } catch (error) {
                const resultsDiv = document.getElementById('results');
                resultsDiv.innerHTML += \`
                    <div class="status error">
                        ❌ \${provider.toUpperCase()}: \${error.message}
                    </div>
                \`;
            }
        }
        
        async function testBothProviders() {
            document.getElementById('results').innerHTML = '';
            await testProvider('kcb');
            await testProvider('daraja');
        }
        
        async function testPayment(provider) {
            try {
                if (provider) {
                    await switchProvider(provider);
                }
                
                const response = await fetch(\`\${API_BASE}/api/mpesa/rent-payment\`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        leaseId: '7bfd4299-e952-4d03-ac60-44b465626895',
                        amount: 100,
                        phoneNumber: '254708374149'
                    })
                });
                
                const data = await response.json();
                
                const resultsDiv = document.getElementById('results');
                if (data.success) {
                    resultsDiv.innerHTML += \`
                        <div class="status success">
                            ✅ Payment with \${provider.toUpperCase()}: Success
                        </div>
                    \`;
                } else {
                    resultsDiv.innerHTML += \`
                        <div class="status error">
                            ❌ Payment with \${provider.toUpperCase()}: \${data.error || 'Failed'}
                        </div>
                    \`;
                }
            } catch (error) {
                const resultsDiv = document.getElementById('results');
                resultsDiv.innerHTML += \`
                    <div class="status error">
                        ❌ Payment with \${provider.toUpperCase()}: \${error.message}
                    </div>
                \`;
            }
        }
        
        // Initialize on page load
        window.onload = function() {
            updateStatus();
        };
    </script>
</body>
</html>`;

    fs.writeFileSync('payment-provider-switcher.html', htmlInterface);
    console.log('✅ HTML interface created');

    console.log('\n' + '=' .repeat(60));
    console.log('✅ Payment Provider Switching System Created!');
    console.log('\n💡 How to use:');
    console.log('1. Open payment-provider-switcher.html in your browser');
    console.log('2. Use the interface to switch between providers');
    console.log('3. Test both KCB Buni and Safaricom Daraja');
    console.log('4. Set MPESA_PROVIDER in .env for default provider');
    console.log('\n🚀 Your app now supports both payment providers!');
    
  } catch (error) {
    console.error('❌ Error creating payment switcher:', error.message);
  }
};

createPaymentSwitcher();

