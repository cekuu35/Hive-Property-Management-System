import http from 'http';

const N8N_API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI4NjAxNzUxYS0zM2M3LTRhYjctYTQxOS02NzNiYTZlMzY5MzYiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzYwNjA3MzYzfQ.RElb8K3NIeuppRGBgtF0nWAaG5_BRak8aIId5cpapG0';
const N8N_BASE_URL = 'http://localhost:5678';

function makeN8nRequest(path, method = 'GET', data = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 5678,
      path: `/api/v1${path}`,
      method: method,
      headers: {
        'X-N8N-API-KEY': N8N_API_KEY,
        'Content-Type': 'application/json'
      }
    };

    const req = http.request(options, (res) => {
      let responseData = '';
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      res.on('end', () => {
        try {
          resolve({ 
            status: res.statusCode, 
            data: responseData ? JSON.parse(responseData) : null 
          });
        } catch (e) {
          resolve({ 
            status: res.statusCode, 
            data: responseData 
          });
        }
      });
    });

    req.on('error', (e) => {
      reject(e);
    });

    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

async function createHeaderAuthCredential() {
  console.log('🔧 Creating Supabase Header Auth Credential...');

  const credentialData = {
    name: 'Supabase API',
    type: 'n8n-nodes-base.headerAuth',
    data: {
      name: 'Supabase API',
      type: 'n8n-nodes-base.headerAuth',
      data: {
        name: 'Authorization',
        value: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtvemhsZWp1ZHNlbGd0bW9oZGZtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzQwNDI5OCwiZXhwIjoyMDcyOTgwMjk4fQ.LWosNpPJO_clOXXYa5pqGM36S-FLANk71F8BvcsJf2g'
      }
    }
  };

  try {
    const { status, data } = await makeN8nRequest('/credentials', 'POST', credentialData);
    
    if (status === 201 || status === 200) {
      console.log('✅ Supabase Header Auth Credential created successfully!');
      console.log('📋 Credential Details:', JSON.stringify(data, null, 2));
      return data;
    } else {
      console.error(`❌ Failed to create credential: ${status}`);
      console.error('Response:', JSON.stringify(data, null, 2));
      return null;
    }
  } catch (error) {
    console.error(`❌ Error creating credential: ${error.message}`);
    return null;
  }
}

async function verifyCredentials() {
  console.log('\n🔍 Verifying credentials after creation...');
  
  try {
    const { status, data } = await makeN8nRequest('/credentials');
    if (status === 200) {
      console.log(`📋 Found ${data.length} credentials:`);
      data.forEach(cred => {
        console.log(`  - ${cred.name} (ID: ${cred.id}) - Type: ${cred.type}`);
      });
    } else {
      console.error(`❌ Error checking credentials: ${status}`);
    }
  } catch (error) {
    console.error(`❌ Error checking credentials: ${error.message}`);
  }
}

async function main() {
  console.log('🚀 Setting up Supabase Header Auth Credential in n8n...\n');
  
  const credential = await createHeaderAuthCredential();
  
  if (credential) {
    await verifyCredentials();
    console.log('\n✅ Credential setup complete!');
    console.log('\n📝 Next steps:');
    console.log('1. Go to your n8n workflows');
    console.log('2. Edit each HTTP Request node');
    console.log('3. Set Authentication to "Header Auth"');
    console.log('4. Select "Supabase API" from the dropdown');
    console.log('5. Add additional headers:');
    console.log('   - apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtvemhsZWp1ZHNlbGd0bW9oZGZtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzQwNDI5OCwiZXhwIjoyMDcyOTgwMjk4fQ.LWosNpPJO_clOXXYa5pqGM36S-FLANk71F8BvcsJf2g');
    console.log('   - Content-Type: application/json');
    console.log('6. Save and test the workflow');
  } else {
    console.log('\n❌ Failed to create credential. Please try creating it manually in n8n.');
  }
}

main();



