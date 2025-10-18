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

async function fixWorkflowCredentials() {
  console.log('🔧 Fixing Workflow Credentials...\n');
  
  try {
    // First, get all workflows
    const workflows = await makeN8nRequest('/api/v1/workflows');
    
    if (workflows.data.data && workflows.data.data.length > 0) {
      console.log(`Found ${workflows.data.data.length} workflows to fix\n`);
      
      for (const workflow of workflows.data.data) {
        console.log(`🔧 Fixing workflow: ${workflow.name}`);
        
        let updated = false;
        const updatedNodes = [];
        
        if (workflow.nodes) {
          workflow.nodes.forEach(node => {
            // Check if it's an HTTP Request node that calls Supabase
            if (node.type === 'n8n-nodes-base.httpRequest' && 
                node.parameters?.url?.includes('kozhlejudselgtmohdfm.supabase.co')) {
              
              console.log(`   📝 Updating node: ${node.name}`);
              
              // Update the node parameters
              const updatedNode = {
                ...node,
                parameters: {
                  ...node.parameters,
                  authentication: 'headerAuth',
                  headerAuth: 'Supabase API', // This should match your credential name
                  additionalHeaders: {
                    'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtvemhsZWp1ZHNlbGd0bW9oZGZtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzQwNDI5OCwiZXhwIjoyMDcyOTgwMjk4fQ.LWosNpPJO_clOXXYa5pqGM36S-FLANk71F8BvcsJf2g',
                    'Content-Type': 'application/json'
                  }
                }
              };
              
              updatedNodes.push(updatedNode);
              updated = true;
            } else {
              updatedNodes.push(node);
            }
          });
        }
        
        if (updated) {
          console.log(`   ✅ Found ${updatedNodes.filter(n => n.parameters?.authentication === 'headerAuth').length} Supabase nodes to fix`);
          
          // Update the workflow
          const updatedWorkflow = {
            ...workflow,
            nodes: updatedNodes
          };
          
          const updateResult = await makeN8nRequest(`/api/v1/workflows/${workflow.id}`, 'PUT', updatedWorkflow);
          
          if (updateResult.status === 200 || updateResult.status === 201) {
            console.log(`   ✅ Successfully updated workflow: ${workflow.name}`);
          } else {
            console.log(`   ❌ Failed to update workflow: ${workflow.name}`);
            console.log(`   Status: ${updateResult.status}`);
            console.log(`   Response: ${JSON.stringify(updateResult.data, null, 2)}`);
          }
        } else {
          console.log(`   ⏭️  No Supabase nodes found in: ${workflow.name}`);
        }
        
        console.log('   ---\n');
      }
    }
    
    console.log('🎯 Credential Fix Complete!');
    console.log('\nNext steps:');
    console.log('1. Check your workflows in n8n UI');
    console.log('2. Verify that HTTP Request nodes now show "Supabase API" credential');
    console.log('3. Test the workflows to ensure the errors are gone');
    
  } catch (error) {
    console.error('❌ Error fixing workflow credentials:', error.message);
  }
}

fixWorkflowCredentials();



