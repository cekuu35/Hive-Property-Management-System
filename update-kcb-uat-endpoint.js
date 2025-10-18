import fs from 'fs';

// Update server.js to use the correct KCB Buni UAT STK Push endpoint
const updateServerForKCBUAT = () => {
  console.log('🔄 Updating server.js for KCB Buni UAT STK Push endpoint...\n');
  
  try {
    // Read current server.js
    let serverContent = fs.readFileSync('server.js', 'utf8');
    
    // Replace the STK Push endpoint in the initiateSTKPush method
    const updatedContent = serverContent.replace(
      /https:\/\/sandbox\.buni\.kcbgroup\.com\/mm\/api\/request\/v1\/processrequest/g,
      'https://uat.buni.kcbgroup.com/mm/api/request/1.0.0'
    ).replace(
      /https:\/\/sandbox\.buni\.kcbgroup\.com\/mpesa\/stkpush\/v1\/processrequest/g,
      'https://uat.buni.kcbgroup.com/mm/api/request/1.0.0'
    ).replace(
      /https:\/\/api\.buni\.kcbgroup\.com\/mm\/api\/request\/v1\/processrequest/g,
      'https://uat.buni.kcbgroup.com/mm/api/request/1.0.0'
    );

    // Write updated server.js
    fs.writeFileSync('server.js', updatedContent);
    console.log('✅ server.js updated for KCB Buni UAT STK Push endpoint');
    
  } catch (error) {
    console.error('❌ Error updating server.js:', error.message);
  }
};

// Run the update
console.log('🚀 Updating KCB Buni STK Push to UAT Endpoint\n');
console.log('=' .repeat(50));

updateServerForKCBUAT();

console.log('\n' + '=' .repeat(50));
console.log('✅ KCB Buni UAT endpoint update completed!');
console.log('\n💡 Next steps:');
console.log('1. Restart your server: npm start');
console.log('2. Test the M-Pesa integration');
console.log('3. Your app will now use the correct UAT endpoint! 🚀');

