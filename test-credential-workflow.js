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

async function createTestWorkflow() {
  console.log('🔧 Creating Test Workflow with Supabase Credential...\n');
  
  try {
    const workflowData = {
      name: 'Test Supabase Credential',
      nodes: [
        {
          parameters: {},
          id: 'manual-trigger',
          name: 'Manual Trigger',
          type: 'n8n-nodes-base.manualTrigger',
          typeVersion: 1,
          position: [240, 300]
        },
        {
          parameters: {
            method: 'GET',
            url: 'https://kozhlejudselgtmohdfm.supabase.co/rest/v1/tenants?limit=1',
            authentication: 'headerAuth',
            headerAuth: 'tfCmnTzCEF7mOVBO',
            additionalHeaders: {
              'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtvemhsZWp1ZHNlbGd0bW9oZGZtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzQwNDI5OCwiZXhwIjoyMDcyOTgwMjk4fQ.LWosNpPJO_clOXXYa5pqGM36S-FLANk71F8BvcsJf2g',
              'Content-Type': 'application/json'
            }
          },
          id: 'test-supabase',
          name: 'Test Supabase',
          type: 'n8n-nodes-base.httpRequest',
          typeVersion: 4.1,
          position: [460, 300]
        },
        {
          parameters: {
            values: {
              string: [
                {
                  name: 'test_result',
                  value: 'SUCCESS - Credential working!'
                },
                {
                  name: 'tenant_count',
                  value: '={{$json.length}}'
                }
              ]
            },
            options: {}
          },
          id: 'show-result',
          name: 'Show Result',
          type: 'n8n-nodes-base.set',
          typeVersion: 3.2,
          position: [680, 300]
        }
      ],
      connections: {
        'Manual Trigger': {
          main: [
            [
              {
                node: 'Test Supabase',
                type: 'main',
                index: 0
              }
            ]
          ]
        },
        'Test Supabase': {
          main: [
            [
              {
                node: 'Show Result',
                type: 'main',
                index: 0
              }
            ]
          ]
        }
      },
      active: false,
      settings: {},
      versionId: '1'
    };
    
    const result = await makeN8nRequest('/api/v1/workflows', 'POST', workflowData);
    
    if (result.status === 201 || result.status === 200) {
      console.log('✅ Test workflow created successfully!');
      console.log('Workflow ID:', result.data.id);
      console.log('Workflow Name:', result.data.name);
      
      // Execute the workflow
      console.log('\n🚀 Executing test workflow...');
      const execution = await makeN8nRequest(`/api/v1/workflows/${result.data.id}/execute`, 'POST');
      
      if (execution.status === 200 || execution.status === 201) {
        console.log('✅ Workflow execution started!');
        console.log('Execution ID:', execution.data.executionId);
        
        // Wait a moment and check the execution
        setTimeout(async () => {
          const execResult = await makeN8nRequest(`/api/v1/executions/${execution.data.executionId}`);
          console.log('\n📊 Execution Result:');
          console.log('Status:', execResult.data.finished ? 'Finished' : 'Running');
          
          if (execResult.data.data?.resultData?.error) {
            console.log('❌ Error:', execResult.data.data.resultData.error.message);
          } else if (execResult.data.data?.resultData?.runData) {
            console.log('✅ Execution completed successfully!');
            const nodes = Object.keys(execResult.data.data.resultData.runData);
            console.log('Nodes executed:', nodes.join(', '));
          }
        }, 3000);
        
      } else {
        console.log('❌ Failed to execute workflow');
        console.log('Status:', execution.status);
        console.log('Response:', execution.data);
      }
      
    } else {
      console.log('❌ Failed to create workflow');
      console.log('Status:', result.status);
      console.log('Response:', result.data);
    }
    
  } catch (error) {
    console.error('❌ Error creating test workflow:', error.message);
  }
}

createTestWorkflow();



