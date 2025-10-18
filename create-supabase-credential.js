import http from 'http';

const N8N_API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI4NjAxNzUxYS0zM2M3LTRhYjctYTQxOS02NzNiYTZlMzY5MzYiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzYwNjA3MzYzfQ.RElb8K3NIeuppRGBgtF0nWAaG5_BRak8aIId5cpapG0';

function makeN8nRequest(path, method = 'GET', body = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 5678,
      path: path,
      method: method,
      headers: {
        'X-N8N-API-KEY': N8N_API_KEY,
        'Content-Type': 'application/json'
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          resolve({ status: res.statusCode, data: result });
        } catch (error) {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    if (body) {
      req.write(JSON.stringify(body));
    }
    
    req.end();
  });
}

async function createSupabaseCredential() {
  console.log('🔧 Creating Supabase API Credential...\n');
  
  try {
    // First, check if credential already exists
    const existingCreds = await makeN8nRequest('/api/v1/credentials');
    console.log(`Found ${existingCreds.data.data?.length || 0} existing credentials`);
    
    // Create the Supabase credential
    const credentialData = {
      name: 'Supabase API',
      type: 'httpHeaderAuth',
      data: {
        name: 'Authorization',
        value: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtvemhsZWp1ZHNlbGd0bW9oZGZtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzQwNDI5OCwiZXhwIjoyMDcyOTgwMjk4fQ.LWosNpPJO_clOXXYa5pqGM36S-FLANk71F8BvcsJf2g'
      }
    };
    
    console.log('Creating credential with data:', JSON.stringify(credentialData, null, 2));
    
    const result = await makeN8nRequest('/api/v1/credentials', 'POST', credentialData);
    
    if (result.status === 201 || result.status === 200) {
      console.log('✅ Supabase API Credential created successfully!');
      console.log('Credential ID:', result.data.id);
    } else {
      console.log('❌ Failed to create credential');
      console.log('Status:', result.status);
      console.log('Response:', result.data);
    }
    
    // Verify the credential was created
    const verifyCreds = await makeN8nRequest('/api/v1/credentials');
    console.log('\n📋 Updated credentials list:');
    if (verifyCreds.data.data && verifyCreds.data.data.length > 0) {
      verifyCreds.data.data.forEach((cred, index) => {
        console.log(`  ${index + 1}. ${cred.name} (Type: ${cred.type}) - ID: ${cred.id}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error creating credential:', error.message);
  }
}

createSupabaseCredential();



