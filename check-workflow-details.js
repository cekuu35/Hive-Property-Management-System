import http from 'http';

const N8N_API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI4NjAxNzUxYS0zM2M3LTRhYjctYTQxOS02NzNiYTZlMzY5MzYiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzYwNjA3MzYzfQ.RElb8K3NIeuppRGBgtF0nWAaG5_BRak8aIId5cpapG0';

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

async function checkWorkflowDetails() {
  console.log('🔍 Checking Detailed Workflow Information...\n');
  
  try {
    // Get all workflows
    const workflows = await makeN8nRequest('/api/v1/workflows');
    console.log('📋 All Workflows:');
    
    if (workflows.data.data && workflows.data.data.length > 0) {
      for (const workflow of workflows.data.data) {
        console.log(`\n🔧 Workflow: ${workflow.name}`);
        console.log(`   ID: ${workflow.id}`);
        console.log(`   Active: ${workflow.active}`);
        console.log(`   Created: ${workflow.createdAt}`);
        console.log(`   Updated: ${workflow.updatedAt}`);
        
        // Get workflow executions
        const executions = await makeN8nRequest(`/api/v1/executions?workflowId=${workflow.id}&limit=3`);
        console.log(`   Recent Executions: ${executions.data.data?.length || 0}`);
        
        if (executions.data.data && executions.data.data.length > 0) {
          executions.data.data.forEach((exec, index) => {
            console.log(`     ${index + 1}. Status: ${exec.finished ? 'Finished' : 'Running'} - Mode: ${exec.mode}`);
            if (exec.data?.resultData?.error) {
              console.log(`        Error: ${exec.data.resultData.error.message}`);
            }
            if (exec.data?.resultData?.runData) {
              const nodes = Object.keys(exec.data.resultData.runData);
              console.log(`        Nodes executed: ${nodes.join(', ')}`);
            }
          });
        }
      }
    }
    
    // Check credentials
    console.log('\n🔑 Credentials Status:');
    const credentials = await makeN8nRequest('/api/v1/credentials');
    if (credentials.data.data && credentials.data.data.length > 0) {
      credentials.data.data.forEach((cred, index) => {
        console.log(`  ${index + 1}. ${cred.name} (Type: ${cred.type})`);
      });
    } else {
      console.log('  ❌ No credentials found - this explains the authentication issues!');
    }
    
    // Check recent executions with errors
    console.log('\n❌ Recent Executions with Errors:');
    const allExecutions = await makeN8nRequest('/api/v1/executions?limit=10');
    if (allExecutions.data.data && allExecutions.data.data.length > 0) {
      allExecutions.data.data.forEach((exec, index) => {
        if (exec.data?.resultData?.error) {
          console.log(`  ${index + 1}. Workflow: ${exec.workflowData?.name || 'Unknown'}`);
          console.log(`     Error: ${exec.data.resultData.error.message}`);
          console.log(`     Node: ${exec.data.resultData.error.node?.name || 'Unknown'}`);
        }
      });
    }
    
    console.log('\n✅ Detailed Check Complete');
    
  } catch (error) {
    console.error('❌ Error checking workflow details:', error.message);
  }
}

checkWorkflowDetails();



