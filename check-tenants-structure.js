import https from 'https';

const SUPABASE_URL = 'https://kozhlejudselgtmohdfm.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtvemhsZWp1ZHNlbGd0bW9oZGZtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzQwNDI5OCwiZXhwIjoyMDcyOTgwMjk4fQ.LWosNpPJO_clOXXYa5pqGM36S-FLANk71F8BvcsJf2g';

function checkTenantsTable() {
  console.log('🔍 Checking tenants table structure...');
  
  const options = {
    hostname: 'kozhlejudselgtmohdfm.supabase.co',
    path: '/rest/v1/tenants?limit=1',
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
        console.log('📊 Tenants table structure:');
        console.log(JSON.stringify(tenants, null, 2));
        
        if (tenants.length > 0) {
          const tenant = tenants[0];
          console.log('\n🔍 Available fields in tenants table:');
          Object.keys(tenant).forEach(key => {
            console.log(`  - ${key}: ${typeof tenant[key]}`);
          });
          
          // Check for status-related fields
          const statusFields = Object.keys(tenant).filter(key => 
            key.toLowerCase().includes('status') || 
            key.toLowerCase().includes('active') ||
            key.toLowerCase().includes('state')
          );
          
          if (statusFields.length > 0) {
            console.log('\n✅ Status-related fields found:');
            statusFields.forEach(field => {
              console.log(`  - ${field}: ${tenant[field]}`);
            });
          } else {
            console.log('\n❌ No status-related fields found');
          }
        }
      } catch (error) {
        console.error('❌ Error parsing response:', error.message);
        console.log('Raw response:', data);
      }
    });
  });
  
  req.on('error', (error) => {
    console.error('❌ Error checking tenants table:', error.message);
  });
  
  req.end();
}

checkTenantsTable();
