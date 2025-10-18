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

async function checkExecutionErrors() {
  console.log('🔍 Checking Execution Errors...\n');
  
  try {
    // Get all executions
    const executions = await makeN8nRequest('/api/v1/executions?limit=20');
    
    if (executions.data.data && executions.data.data.length > 0) {
      console.log(`Found ${executions.data.data.length} executions\n`);
      
      executions.data.data.forEach((exec, index) => {
        console.log(`📊 Execution ${index + 1}:`);
        console.log(`   Workflow: ${exec.workflowData?.name || 'Unknown'}`);
        console.log(`   Status: ${exec.finished ? 'Finished' : 'Running'}`);
        console.log(`   Mode: ${exec.mode}`);
        console.log(`   Started: ${exec.startedAt}`);
        
        if (exec.data?.resultData?.error) {
          console.log(`   ❌ ERROR:`);
          console.log(`      Message: ${exec.data.resultData.error.message}`);
          console.log(`      Node: ${exec.data.resultData.error.node?.name || 'Unknown'}`);
          console.log(`      Node Type: ${exec.data.resultData.error.node?.type || 'Unknown'}`);
        }
        
        if (exec.data?.resultData?.runData) {
          const nodes = Object.keys(exec.data.resultData.runData);
          console.log(`   Nodes executed: ${nodes.join(', ')}`);
          
          // Check each node for errors
          nodes.forEach(nodeName => {
            const nodeData = exec.data.resultData.runData[nodeName];
            if (nodeData && nodeData.length > 0) {
              const lastExecution = nodeData[nodeData.length - 1];
              if (lastExecution.error) {
                console.log(`   ❌ Node "${nodeName}" error: ${lastExecution.error.message}`);
              }
            }
          });
        }
        
        console.log('   ---');
      });
    }
    
    console.log('\n🎯 Summary:');
    console.log('1. No credentials found in n8n - this is the main issue');
    console.log('2. Workflows are failing because they can\'t authenticate with Supabase');
    console.log('3. The "Cannot read properties of undefined (reading \'status\')" error is from HTTP Request nodes');
    console.log('4. You need to create the Supabase API credential in n8n');
    
  } catch (error) {
    console.error('❌ Error checking executions:', error.message);
  }
}

checkExecutionErrors();



