import http from 'http';

const N8N_API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI4NjAxNzUxYS0zM2M3LTRhYjctYTQxOS02NzNiYTZlMzY5MzYiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzYwNjA3MzYzfQ.RElb8K3NIeuppRGBgtF0nWAaG5_BRak8aIId5cpapG0';
const N8N_BASE_URL = 'http://localhost:5678';

function makeN8nRequest(path, method = 'GET') {
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
    
    req.end();
  });
}

async function checkN8nStatus() {
  console.log('🔍 Checking n8n Status with API Key...\n');
  
  try {
    // Check workflows
    console.log('📋 Checking Workflows:');
    const workflows = await makeN8nRequest('/api/v1/workflows');
    console.log(`Found ${workflows.data.data?.length || 0} workflows`);
    
    if (workflows.data.data && workflows.data.data.length > 0) {
      workflows.data.data.forEach((workflow, index) => {
        console.log(`  ${index + 1}. ${workflow.name} (ID: ${workflow.id}) - Active: ${workflow.active}`);
      });
    }
    
    console.log('\n🔑 Checking Credentials:');
    const credentials = await makeN8nRequest('/api/v1/credentials');
    console.log(`Found ${credentials.data.data?.length || 0} credentials`);
    
    if (credentials.data.data && credentials.data.data.length > 0) {
      credentials.data.data.forEach((cred, index) => {
        console.log(`  ${index + 1}. ${cred.name} (Type: ${cred.type}) - ID: ${cred.id}`);
      });
    }
    
    console.log('\n⚡ Checking Executions:');
    const executions = await makeN8nRequest('/api/v1/executions?limit=5');
    console.log(`Found ${executions.data.data?.length || 0} recent executions`);
    
    if (executions.data.data && executions.data.data.length > 0) {
      executions.data.data.forEach((exec, index) => {
        console.log(`  ${index + 1}. Workflow: ${exec.workflowData?.name} - Status: ${exec.finished ? 'Finished' : 'Running'} - Mode: ${exec.mode}`);
        if (exec.data?.resultData?.error) {
          console.log(`     Error: ${exec.data.resultData.error.message}`);
        }
      });
    }
    
    console.log('\n🎯 Checking Webhooks:');
    const webhooks = await makeN8nRequest('/api/v1/webhook-test');
    console.log('Webhook test response:', webhooks.status);
    
    console.log('\n✅ n8n API Status Check Complete');
    
  } catch (error) {
    console.error('❌ Error checking n8n status:', error.message);
  }
}

checkN8nStatus();
