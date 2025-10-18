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

async function checkAllCredentials() {
  console.log('🔍 Checking All Credentials in n8n...\n');
  
  try {
    // Get all credentials with detailed information
    const credentials = await makeN8nRequest('/api/v1/credentials');
    
    console.log(`📋 Found ${credentials.data.data?.length || 0} credentials:\n`);
    
    if (credentials.data.data && credentials.data.data.length > 0) {
      credentials.data.data.forEach((cred, index) => {
        console.log(`🔑 Credential ${index + 1}:`);
        console.log(`   Name: ${cred.name}`);
        console.log(`   Type: ${cred.type}`);
        console.log(`   ID: ${cred.id}`);
        console.log(`   Created: ${cred.createdAt}`);
        console.log(`   Updated: ${cred.updatedAt}`);
        
        // Try to get more details about each credential
        makeN8nRequest(`/api/v1/credentials/${cred.id}`)
          .then(detail => {
            console.log(`   Details: ${JSON.stringify(detail.data, null, 2)}`);
          })
          .catch(err => {
            console.log(`   Details: Could not fetch details (${err.message})`);
          });
        
        console.log('   ---');
      });
    } else {
      console.log('❌ No credentials found via API');
    }
    
    // Also check if there are any credentials in a different endpoint
    console.log('\n🔍 Checking alternative credential endpoints...');
    
    const credTypes = await makeN8nRequest('/api/v1/credentials/types');
    console.log('Available credential types:', credTypes.data);
    
  } catch (error) {
    console.error('❌ Error checking credentials:', error.message);
  }
}

checkAllCredentials();



