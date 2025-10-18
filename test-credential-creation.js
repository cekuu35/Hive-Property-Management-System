import http from 'http';

const N8N_API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI4NjAxNzUxYS0zM2M3LTRhYjctYTQxOS02NzNiYTZlMzY5MzYiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzYwNjA3MzYzfQ.RElb8K3NIeuppRGBgtF0nWAaG5_BRak8aIId5cpapG0';

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

async function testCredentialCreation() {
  console.log('🔍 Testing different credential creation approaches...\n');
  
  // Test 1: Simple Header Auth
  console.log('📋 Test 1: Simple Header Auth');
  try {
    const { status, data } = await makeN8nRequest('/credentials', 'POST', {
      name: 'Test Header Auth',
      type: 'n8n-nodes-base.headerAuth',
      data: {
        name: 'Authorization',
        value: 'Bearer test-token'
      }
    });
    console.log(`   Status: ${status}`);
    console.log(`   Response: ${JSON.stringify(data, null, 2)}\n`);
  } catch (error) {
    console.log(`   Error: ${error.message}\n`);
  }

  // Test 2: Check what credential types exist
  console.log('📋 Test 2: Check available credential types');
  try {
    const { status, data } = await makeN8nRequest('/credentials/types');
    console.log(`   Status: ${status}`);
    console.log(`   Response: ${JSON.stringify(data, null, 2)}\n`);
  } catch (error) {
    console.log(`   Error: ${error.message}\n`);
  }

  // Test 3: Check node types
  console.log('📋 Test 3: Check node types');
  try {
    const { status, data } = await makeN8nRequest('/node-types');
    console.log(`   Status: ${status}`);
    console.log(`   Response: ${JSON.stringify(data, null, 2)}\n`);
  } catch (error) {
    console.log(`   Error: ${error.message}\n`);
  }
}

testCredentialCreation();



