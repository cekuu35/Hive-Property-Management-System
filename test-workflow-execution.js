import https from 'https';

const SUPABASE_URL = 'https://kozhlejudselgtmohdfm.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtvemhsZWp1ZHNlbGd0bW9oZGZtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzQwNDI5OCwiZXhwIjoyMDcyOTgwMjk4fQ.LWosNpPJO_clOXXYa5pqGM36S-FLANk71F8BvcsJf2g';

function testWorkflowExecution() {
  console.log('🔍 Testing workflow execution simulation...');
  
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
        console.log('📊 Testing workflow data processing...');
        
        if (tenants.length > 0) {
          tenants.forEach((tenant, index) => {
            console.log(`\n🔍 Processing tenant ${index + 1}:`);
            
            try {
              // Simulate the workflow data extraction
              const tenantData = {
                tenant_name: tenant.tenant_info?.full_name,
                property_address: tenant.units?.properties?.address,
                rent_amount: tenant.rent_amount,
                due_date: tenant.lease_start_date,
                phone_number: tenant.tenant_info?.phone,
                email: tenant.tenant_info?.email,
                status: tenant.status
              };
              
              console.log('✅ Extracted data:', JSON.stringify(tenantData, null, 2));
              
              // Check for any undefined values that might cause issues
              const undefinedFields = Object.entries(tenantData)
                .filter(([key, value]) => value === undefined)
                .map(([key]) => key);
              
              if (undefinedFields.length > 0) {
                console.log('⚠️  Undefined fields:', undefinedFields);
              } else {
                console.log('✅ All fields extracted successfully');
              }
              
            } catch (error) {
              console.error('❌ Error processing tenant data:', error.message);
            }
          });
        } else {
          console.log('❌ No tenants returned from query');
        }
      } catch (error) {
        console.error('❌ Error parsing response:', error.message);
        console.log('Raw response:', data);
      }
    });
  });
  
  req.on('error', (error) => {
    console.error('❌ Error testing workflow:', error.message);
  });
  
  req.end();
}

testWorkflowExecution();



