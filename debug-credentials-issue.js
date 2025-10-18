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

async function debugCredentialsIssue() {
  console.log('🔍 Debugging Credentials Issue...\n');
  
  try {
    // Check different API endpoints
    console.log('1. Checking /api/v1/credentials:');
    const creds1 = await makeN8nRequest('/api/v1/credentials');
    console.log(`   Status: ${creds1.status}`);
    console.log(`   Data: ${JSON.stringify(creds1.data, null, 2)}`);
    
    console.log('\n2. Checking /api/v1/credentials/types:');
    const creds2 = await makeN8nRequest('/api/v1/credentials/types');
    console.log(`   Status: ${creds2.status}`);
    console.log(`   Data: ${JSON.stringify(creds2.data, null, 2)}`);
    
    console.log('\n3. Checking /api/v1/credentials/schema:');
    const creds3 = await makeN8nRequest('/api/v1/credentials/schema');
    console.log(`   Status: ${creds3.status}`);
    console.log(`   Data: ${JSON.stringify(creds3.data, null, 2)}`);
    
    console.log('\n4. Checking /api/v1/credentials/schema/httpHeaderAuth:');
    const creds4 = await makeN8nRequest('/api/v1/credentials/schema/httpHeaderAuth');
    console.log(`   Status: ${creds4.status}`);
    console.log(`   Data: ${JSON.stringify(creds4.data, null, 2)}`);
    
    console.log('\n5. Checking user info:');
    const user = await makeN8nRequest('/api/v1/me');
    console.log(`   Status: ${user.status}`);
    console.log(`   Data: ${JSON.stringify(user.data, null, 2)}`);
    
    console.log('\n6. Checking workflows to see if they reference credentials:');
    const workflows = await makeN8nRequest('/api/v1/workflows');
    if (workflows.data.data && workflows.data.data.length > 0) {
      workflows.data.data.forEach((workflow, index) => {
        console.log(`   Workflow ${index + 1}: ${workflow.name}`);
        if (workflow.nodes) {
          workflow.nodes.forEach(node => {
            if (node.parameters && node.parameters.authentication) {
              console.log(`     Node "${node.name}" uses auth: ${node.parameters.authentication}`);
            }
          });
        }
      });
    }
    
  } catch (error) {
    console.error('❌ Error debugging credentials:', error.message);
  }
}

debugCredentialsIssue();



