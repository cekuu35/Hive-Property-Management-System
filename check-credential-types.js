import http from 'http';

const N8N_API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI4NjAxNzUxYS0zM2M3LTRhYjctYTQxOS02NzNiYTZlMzY5MzYiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzYwNjA3MzYzfQ.RElb8K3NIeuppRGBgtF0nWAaG5_BRak8aIId5cpapG0';

function makeN8nRequest(path, method = 'GET') {
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
    req.end();
  });
}

async function checkCredentialTypes() {
  console.log('🔍 Checking available credential types...\n');
  
  const endpoints = [
    '/credentials/types',
    '/credentials/schema',
    '/node-types',
    '/credentials'
  ];
  
  for (const endpoint of endpoints) {
    try {
      console.log(`📋 Checking ${endpoint}:`);
      const { status, data } = await makeN8nRequest(endpoint);
      console.log(`   Status: ${status}`);
      if (data) {
        if (typeof data === 'object') {
          console.log(`   Response: ${JSON.stringify(data, null, 2)}`);
        } else {
          console.log(`   Response: ${data}`);
        }
      }
      console.log('');
    } catch (error) {
      console.log(`   Error: ${error.message}\n`);
    }
  }
}

checkCredentialTypes();



