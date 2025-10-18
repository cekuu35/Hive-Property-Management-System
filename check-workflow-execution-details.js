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

async function checkWorkflowExecutionDetails() {
  console.log('🔍 Checking Workflow Execution Details...\n');
  
  try {
    // Get recent executions
    const executions = await makeN8nRequest('/api/v1/executions?limit=10');
    
    if (executions.data.data && executions.data.data.length > 0) {
      console.log(`Found ${executions.data.data.length} executions\n`);
      
      for (const exec of executions.data.data) {
        console.log(`📊 Execution ID: ${exec.id}`);
        console.log(`   Workflow: ${exec.workflowData?.name || 'Unknown'}`);
        console.log(`   Status: ${exec.finished ? 'Finished' : 'Running'}`);
        console.log(`   Mode: ${exec.mode}`);
        console.log(`   Started: ${exec.startedAt}`);
        
        if (exec.data?.resultData?.error) {
          console.log(`   ❌ ERROR:`);
          console.log(`      Message: ${exec.data.resultData.error.message}`);
          console.log(`      Node: ${exec.data.resultData.error.node?.name || 'Unknown'}`);
          console.log(`      Node Type: ${exec.data.resultData.error.node?.type || 'Unknown'}`);
          console.log(`      Stack: ${exec.data.resultData.error.stack || 'No stack trace'}`);
        }
        
        if (exec.data?.resultData?.runData) {
          const nodes = Object.keys(exec.data.resultData.runData);
          console.log(`   Nodes executed: ${nodes.join(', ')}`);
          
          // Check each node for detailed error info
          nodes.forEach(nodeName => {
            const nodeData = exec.data.resultData.runData[nodeName];
            if (nodeData && nodeData.length > 0) {
              const lastExecution = nodeData[nodeData.length - 1];
              if (lastExecution.error) {
                console.log(`   ❌ Node "${nodeName}" error:`);
                console.log(`      Message: ${lastExecution.error.message}`);
                console.log(`      Type: ${lastExecution.error.name}`);
                if (lastExecution.error.stack) {
                  console.log(`      Stack: ${lastExecution.error.stack.split('\n')[0]}`);
                }
              } else if (lastExecution.data) {
                console.log(`   ✅ Node "${nodeName}" completed successfully`);
                if (lastExecution.data.length > 0) {
                  console.log(`      Output items: ${lastExecution.data.length}`);
                }
              }
            }
          });
        }
        
        console.log('   ---\n');
      }
    }
    
    // Try to get a specific workflow to see its node configuration
    const workflows = await makeN8nRequest('/api/v1/workflows');
    if (workflows.data.data && workflows.data.data.length > 0) {
      const debugWorkflow = workflows.data.data.find(w => w.name === 'Debug Supabase Response');
      if (debugWorkflow) {
        console.log('🔧 Debug Workflow Node Configuration:');
        if (debugWorkflow.nodes) {
          debugWorkflow.nodes.forEach(node => {
            if (node.type === 'n8n-nodes-base.httpRequest') {
              console.log(`   Node: ${node.name}`);
              console.log(`   URL: ${node.parameters?.url}`);
              console.log(`   Auth: ${node.parameters?.authentication}`);
              console.log(`   Header Auth: ${node.parameters?.headerAuth}`);
              console.log(`   Additional Headers: ${JSON.stringify(node.parameters?.additionalHeaders, null, 2)}`);
              console.log('   ---');
            }
          });
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Error checking execution details:', error.message);
  }
}

checkWorkflowExecutionDetails();



