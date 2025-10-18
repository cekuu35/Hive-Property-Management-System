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

async function testCredential() {
  console.log('🧪 Testing Supabase Credential...\n');
  
  try {
    // First, verify the credential exists
    const credentials = await makeN8nRequest('/api/v1/credentials');
    console.log('📋 Available Credentials:');
    if (credentials.data.data && credentials.data.data.length > 0) {
      credentials.data.data.forEach((cred, index) => {
        console.log(`  ${index + 1}. ${cred.name} (Type: ${cred.type}) - ID: ${cred.id}`);
      });
    }
    
    // Get existing workflows
    const workflows = await makeN8nRequest('/api/v1/workflows');
    console.log('\n📋 Available Workflows:');
    if (workflows.data.data && workflows.data.data.length > 0) {
      workflows.data.data.forEach((workflow, index) => {
        console.log(`  ${index + 1}. ${workflow.name} (ID: ${workflow.id}) - Active: ${workflow.active}`);
      });
    }
    
    // Try to execute the Debug Supabase Response workflow
    const debugWorkflow = workflows.data.data?.find(w => w.name === 'Debug Supabase Response');
    if (debugWorkflow) {
      console.log('\n🚀 Testing Debug Supabase Response workflow...');
      const execution = await makeN8nRequest(`/api/v1/workflows/${debugWorkflow.id}/execute`, 'POST');
      
      if (execution.status === 200 || execution.status === 201) {
        console.log('✅ Workflow execution started!');
        console.log('Execution ID:', execution.data.executionId);
        
        // Wait and check result
        setTimeout(async () => {
          const execResult = await makeN8nRequest(`/api/v1/executions/${execution.data.executionId}`);
          console.log('\n📊 Execution Result:');
          console.log('Status:', execResult.data.finished ? 'Finished' : 'Running');
          
          if (execResult.data.data?.resultData?.error) {
            console.log('❌ Error:', execResult.data.data.resultData.error.message);
            console.log('Node:', execResult.data.data.resultData.error.node?.name);
          } else if (execResult.data.data?.resultData?.runData) {
            console.log('✅ Execution completed successfully!');
            const nodes = Object.keys(execResult.data.data.resultData.runData);
            console.log('Nodes executed:', nodes.join(', '));
          }
        }, 5000);
        
      } else {
        console.log('❌ Failed to execute workflow');
        console.log('Status:', execution.status);
        console.log('Response:', execution.data);
      }
    }
    
  } catch (error) {
    console.error('❌ Error testing credential:', error.message);
  }
}

testCredential();



