import https from 'https';

const SUPABASE_URL = 'https://kozhlejudselgtmohdfm.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtvemhsZWp1ZHNlbGd0bW9oZGZtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzQwNDI5OCwiZXhwIjoyMDcyOTgwMjk4fQ.LWosNpPJO_clOXXYa5pqGM36S-FLANk71F8BvcsJf2g';

function testSupabaseConnection() {
  console.log('🔗 Testing Supabase Connection for n8n...\n');
  
  const testQueries = [
    {
      name: 'Basic Tenants Query',
      path: '/rest/v1/tenants?limit=1'
    },
    {
      name: 'Tenants with Relations (Workflow Query)',
      path: '/rest/v1/tenants?select=*,units(*,properties(*)),tenant_info(*)&status=eq.active'
    },
    {
      name: 'Properties Query',
      path: '/rest/v1/properties?limit=1'
    },
    {
      name: 'Units Query',
      path: '/rest/v1/units?limit=1'
    }
  ];
  
  let completedTests = 0;
  
  testQueries.forEach((test, index) => {
    console.log(`🧪 Test ${index + 1}: ${test.name}`);
    
    const options = {
      hostname: 'kozhlejudselgtmohdfm.supabase.co',
      path: test.path,
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
          const result = JSON.parse(data);
          
          if (res.statusCode === 200) {
            console.log(`✅ Success: ${result.length || 1} record(s) returned`);
            
            if (result.length > 0) {
              console.log(`   Sample data keys: ${Object.keys(result[0]).join(', ')}`);
            }
          } else {
            console.log(`❌ Error: Status ${res.statusCode}`);
            console.log(`   Response: ${data}`);
          }
        } catch (error) {
          console.log(`❌ Parse Error: ${error.message}`);
          console.log(`   Raw response: ${data.substring(0, 200)}...`);
        }
        
        completedTests++;
        if (completedTests === testQueries.length) {
          console.log('\n🎯 Connection Test Summary:');
          console.log('If all tests passed, your Supabase connection is working correctly.');
          console.log('You can now use these queries in your n8n workflows.');
        }
      });
    });
    
    req.on('error', (error) => {
      console.log(`❌ Network Error: ${error.message}`);
      completedTests++;
    });
    
    req.end();
  });
}

testSupabaseConnection();



