/**
 * Quick verification script to check if the app loads without errors
 */

const http = require('http');

const options = {
  hostname: 'localhost',
  port: 5173,
  path: '/',
  method: 'GET',
  timeout: 5000
};

console.log('\n🔍 Verifying app loads at http://localhost:5173...\n');

const req = http.request(options, (res) => {
  console.log(`✅ Server responded with status: ${res.statusCode}`);
  
  if (res.statusCode === 200) {
    console.log('✅ App is loading successfully!');
    console.log('\n📋 NEXT STEPS:');
    console.log('   1. Open http://localhost:5173 in your browser');
    console.log('   2. Login as a caretaker');
    console.log('   3. Test the features:\n');
    console.log('      🏢 Properties Tab:');
    console.log('         - Should show ONLY assigned properties');
    console.log('         - Property selector should work');
    console.log('         - Stats should be accurate\n');
    console.log('      📦 Inventory Tab:');
    console.log('         - Add new items (tests INSERT policy)');
    console.log('         - Update stock levels (tests UPDATE policy)');
    console.log('         - Delete items (tests DELETE policy)');
    console.log('         - Check low stock alerts\n');
    console.log('      🔧 Maintenance Tab:');
    console.log('         - Should show only requests for assigned properties');
    console.log('         - Tenant contact cards should display');
    console.log('         - Call/Email/SMS buttons should work\n');
    console.log('🔐 SECURITY TEST:');
    console.log('   - Create/login as a DIFFERENT caretaker');
    console.log('   - Verify they see DIFFERENT properties (data isolation)\n');
  } else {
    console.log(`⚠️  Unexpected status code: ${res.statusCode}`);
  }
});

req.on('error', (error) => {
  if (error.code === 'ECONNREFUSED') {
    console.log('❌ Server is not responding yet. Wait a few more seconds and try again.');
    console.log('   Run: node verify-app-loads.js');
  } else {
    console.log(`❌ Error: ${error.message}`);
  }
});

req.on('timeout', () => {
  console.log('⏱️  Request timed out. Server might still be starting...');
  req.destroy();
});

req.end();




