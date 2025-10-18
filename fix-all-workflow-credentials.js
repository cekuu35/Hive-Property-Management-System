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

function fixHttpRequestNode(node) {
  if (node.type === 'n8n-nodes-base.httpRequest' && node.parameters.authentication === 'headerAuth') {
    console.log(`  🔧 Fixing node: ${node.name}`);
    
    // Add the credential reference
    node.parameters.headerAuth = {
      credential: 'Supabase API'
    };
    
    // Add additional headers if not present
    if (!node.parameters.additionalHeaders) {
      node.parameters.additionalHeaders = {
        entries: [
          {
            name: 'apikey',
            value: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtvemhsZWp1ZHNlbGd0bW9oZGZtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzQwNDI5OCwiZXhwIjoyMDcyOTgwMjk4fQ.LWosNpPJO_clOXXYa5pqGM36S-FLANk71F8BvcsJf2g'
          },
          {
            name: 'Content-Type',
            value: 'application/json'
          }
        ]
      };
    }
    
    return true; // Node was fixed
  }
  return false; // Node was not fixed
}

async function fixWorkflowCredentials(workflowId, workflowName) {
  console.log(`\n🔧 Fixing workflow: ${workflowName} (${workflowId})`);
  
  try {
    // Get the workflow
    const { status: getStatus, data: workflow } = await makeN8nRequest(`/workflows/${workflowId}`);
    
    if (getStatus !== 200) {
      console.log(`  ❌ Failed to get workflow: ${getStatus}`);
      return false;
    }
    
    let fixedNodes = 0;
    
    // Fix all HTTP Request nodes
    if (workflow.nodes) {
      workflow.nodes.forEach(node => {
        if (fixHttpRequestNode(node)) {
          fixedNodes++;
        }
      });
    }
    
    if (fixedNodes === 0) {
      console.log(`  ✅ No HTTP Request nodes to fix`);
      return true;
    }
    
    console.log(`  🔧 Fixed ${fixedNodes} HTTP Request nodes`);
    
    // Update the workflow
    const { status: updateStatus, data: updateData } = await makeN8nRequest(`/workflows/${workflowId}`, 'PUT', workflow);
    
    if (updateStatus === 200) {
      console.log(`  ✅ Successfully updated workflow`);
      return true;
    } else {
      console.log(`  ❌ Failed to update workflow: ${updateStatus}`);
      console.log(`  Response: ${JSON.stringify(updateData, null, 2)}`);
      return false;
    }
    
  } catch (error) {
    console.log(`  ❌ Error fixing workflow: ${error.message}`);
    return false;
  }
}

async function fixAllWorkflows() {
  console.log('🚀 Fixing credentials in all workflows...\n');
  
  try {
    // Get all workflows
    const { status, data } = await makeN8nRequest('/workflows');
    
    if (status !== 200) {
      console.log(`❌ Failed to get workflows: ${status}`);
      return;
    }
    
    const workflows = data.data || data;
    console.log(`📋 Found ${workflows.length} workflows to check\n`);
    
    let successCount = 0;
    let totalCount = 0;
    
    for (const workflow of workflows) {
      totalCount++;
      const success = await fixWorkflowCredentials(workflow.id, workflow.name);
      if (success) {
        successCount++;
      }
    }
    
    console.log(`\n📊 Summary:`);
    console.log(`  ✅ Successfully fixed: ${successCount}/${totalCount} workflows`);
    
    if (successCount === totalCount) {
      console.log(`\n🎉 All workflows have been fixed!`);
      console.log(`\n📝 Next steps:`);
      console.log(`1. Create the "Supabase API" Header Auth credential manually in n8n`);
      console.log(`2. Test your workflows`);
      console.log(`3. The "Cannot read properties of undefined (reading 'status')" error should be resolved`);
    } else {
      console.log(`\n⚠️  Some workflows could not be fixed. Please check the errors above.`);
    }
    
  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
  }
}

fixAllWorkflows();



