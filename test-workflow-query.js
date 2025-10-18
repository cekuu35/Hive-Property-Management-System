import https from 'https';

const SUPABASE_URL = 'https://kozhlejudselgtmohdfm.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtvemhsZWp1ZHNlbGd0bW9oZGZtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzQwNDI5OCwiZXhwIjoyMDcyOTgwMjk4fQ.LWosNpPJO_clOXXYa5pqGM36S-FLANk71F8BvcsJf2g';

function testWorkflowQuery() {
  console.log('🔍 Testing the exact workflow query...');
  
  const options = {
    hostname: 'kozhlejudselgtmohdfm.supabase.co',
    path: '/rest/v1/tenants?select=*,units(*,properties(*)),tenant_info(*)&status=eq.active',
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'apikey': SUPABASE_KEY,
      'Content-Type': 'application/json'
    }
  };
  
  const req = https.request(options, (res) => {
    let data = '';
    
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      try {
        const tenants = JSON.parse(data);
        console.log('📊 Query result:');
        console.log(JSON.stringify(tenants, null, 2));
        
        if (tenants.length > 0) {
          const tenant = tenants[0];
          console.log('\n🔍 Checking data structure for workflow:');
          console.log(`  - tenant_info: ${JSON.stringify(tenant.tenant_info, null, 2)}`);
          console.log(`  - units: ${JSON.stringify(tenant.units, null, 2)}`);
          console.log(`  - status: ${tenant.status}`);
          
          // Check if the data structure matches what the workflow expects
          if (tenant.tenant_info && tenant.units) {
            console.log('\n✅ Data structure looks correct for workflow');
          } else {
            console.log('\n❌ Data structure missing required fields');
          }
        } else {
          console.log('\n❌ No tenants returned from query');
        }
      } catch (error) {
        console.error('❌ Error parsing response:', error.message);
        console.log('Raw response:', data);
      }
    });
  });
  
  req.on('error', (error) => {
    console.error('❌ Error testing query:', error.message);
  });
  
  req.end();
}

testWorkflowQuery();



