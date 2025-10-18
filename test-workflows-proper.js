import http from 'http';

const N8N_API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI4NjAxNzUxYS0zM2M3LTRhYjctYTQxOS02NzNiYTZlMzY5MzYiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzYwNjIwMDk5fQ.VVzeXNb5wV7YXktvMPVSXqrq1CjArW917h_PrGQdzAc';

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

async function testWorkflows() {
  console.log('🔍 Testing workflows with new API key...\n');
  
  try {
    const { status, data } = await makeN8nRequest('/workflows');
    console.log(`📋 Workflows Status: ${status}`);
    
    if (status === 200) {
      console.log(`📊 Found ${Array.isArray(data) ? data.length : 'unknown number of'} workflows`);
      
      if (Array.isArray(data)) {
        data.forEach((wf, index) => {
          console.log(`   ${index + 1}. ${wf.name || 'Unnamed'} (ID: ${wf.id}) - Active: ${wf.active}`);
        });
      } else {
        console.log('   Data structure:', JSON.stringify(data, null, 2));
      }
    } else {
      console.log('   Response:', JSON.stringify(data, null, 2));
    }
  } catch (error) {
    console.log(`   Error: ${error.message}`);
  }
}

testWorkflows();



