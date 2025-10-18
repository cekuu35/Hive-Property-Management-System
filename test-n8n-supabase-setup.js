import https from 'https';

const SUPABASE_URL = 'https://kozhlejudselgtmohdfm.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtvemhsZWp1ZHNlbGd0bW9oZGZtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzQwNDI5OCwiZXhwIjoyMDcyOTgwMjk4fQ.LWosNpPJO_clOXXYa5pqGM36S-FLANk71F8BvcsJf2g';

function testN8nSupabaseSetup() {
  console.log('🧪 Testing n8n Supabase Setup...\n');
  
  // Test the exact query that's failing in n8n
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
        
        console.log('✅ Supabase Connection: SUCCESS');
        console.log(`📊 Found ${tenants.length} active tenants`);
        
        if (tenants.length > 0) {
          const tenant = tenants[0];
          console.log('\n🔍 Sample tenant data structure:');
          console.log(`  - ID: ${tenant.id}`);
          console.log(`  - Status: ${tenant.status}`);
          console.log(`  - Tenant Name: ${tenant.tenant_info?.full_name || 'N/A'}`);
          console.log(`  - Phone: ${tenant.tenant_info?.phone || 'N/A'}`);
          console.log(`  - Property Address: ${tenant.units?.properties?.address || 'N/A'}`);
          console.log(`  - Rent Amount: ${tenant.rent_amount}`);
          
          // Check for potential issues
          const issues = [];
          if (!tenant.tenant_info) issues.push('Missing tenant_info');
          if (!tenant.units) issues.push('Missing units');
          if (!tenant.status) issues.push('Missing status');
          
          if (issues.length > 0) {
            console.log('\n⚠️  Potential issues found:');
            issues.forEach(issue => console.log(`  - ${issue}`));
          } else {
            console.log('\n✅ Data structure looks good for n8n workflows');
          }
        } else {
          console.log('\n⚠️  No active tenants found - this might cause the workflow error');
        }
        
        console.log('\n🎯 Next Steps:');
        console.log('1. Your Supabase connection is working correctly');
        console.log('2. The "Cannot read properties of undefined" error is likely in the n8n workflow logic');
        console.log('3. Check that your workflows are using the correct credential');
        console.log('4. Make sure workflows are activated in n8n');
        
      } catch (error) {
        console.error('❌ Error parsing response:', error.message);
        console.log('Raw response:', data);
      }
    });
  });
  
  req.on('error', (error) => {
    console.error('❌ Connection error:', error.message);
  });
  
  req.end();
}

testN8nSupabaseSetup();



