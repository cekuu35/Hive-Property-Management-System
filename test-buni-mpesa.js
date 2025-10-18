import { BuniMpesaAPI } from './buni-mpesa.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// The API key you provided
const API_KEY = "eyJ4NXQiOiJaREEzWldJeU1UTTVabUptTnpNeU5UTXlabU13TVRZMU4ySTJORGhsT1dSaFpEWmpNakUwTkE9PSIsImtpZCI6ImdhdGV3YXlfY2VydGlmaWNhdGVfYWxpYXMiLCJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJzdWIiOiJBcG9sbG8uc2Fua2lpQGNhcmJvbi5zdXBlciIsImFwcGxpY2F0aW9uIjp7Im93bmVyIjoiQXBvbGxvLnNhbmtpaSIsInRpZXJRdW90YVR5cGUiOm51bGwsInRpZXIiOiJVbmxpbWl0ZWQiLCJuYW1lIjoiRGVmYXVsdEFwcGxpY2F0aW9uIiwiaWQiOjMwMjgyLCJ1dWlkIjoiNGY2YTJiODEtZjk5Ni00MzY1LThhNWQtYTg4ZmQ2YTBkM2U4In0sImlzcyI6Imh0dHBzOlwvXC9zYW5kYm94LmJ1bmkua2NiZ3JvdXAuY29tXC9vYXV0aDJcL3Rva2VuIiwidGllckluZm8iOnsiVW5saW1pdGVkIjp7InRpZXJRdW90YVR5cGUiOiJyZXF1ZXN0Q291bnQiLCJncmFwaFFMTWF4Q29tcGxleGl0eSI6MCwiZ3JhcGhRTE1heERlcHRoIjowLCJzdG9wT25RdW90YVJlYWNoIjp0cnVlLCJzcGlrZUFycmVzdExpbWl0IjowLCJzcGlrZUFycmVzdFVuaXQiOm51bGx9fSwia2V5dHlwZSI6IlNBTkRCT1giLCJzdWJzY3JpYmVkQVBJcyI6W3sic3Vic2NyaWJlclRlbmFudERvbWFpbiI6ImNhcmJvbi5zdXBlciIsIm5hbWUiOiJNcGVzYUV4cHJlc3NBUElTZXJ2aWNlIiwiY29udGV4dCI6IlwvbW1cL2FwaVwvcmVxdWVzdFwvMS4wLjAiLCJwdWJsaXNoZXIiOiJzdXBlcl9hZG1pbiIsInZlcnNpb24iOiIxLjAuMCIsInN1YnNjcmlwdGlvblRpZXIiOiJVbmxpbWl0ZWQifV0sInRva2VuX3R5cGUiOiJhcGlLZXkiLCJpYXQiOjE3NjA3MDM4MzMsImp0aSI6IjVlYjJjYzY2LTRiN2ItNGIxMi04ODFmLTliOWI1ZDdkZDFiMiJ9.dfxnOskeHO5C3pHQHIgfH42oATV4gdTIFirbud8ZArhoQ8ArCyW9R7xH2B8E8uE7kXIr8uHv1g5cSYunkATsEXHXM6Tx3w7bOxLgfKhvHtJeYTGchilDxnWCsmPTif3r3A1OX_m6r4ivPIl5PUjFTwpgf-OURnIElgLW39KtHec_YD4Ci1elu_NE7fmK4S8obRR6Obk6cOat85AwtihA7WZ54GBGI4Dfmevgp4NfY0DGPg7BAnoqHrMgbIWSKNrBWRjfeNRusPjw03ER7QoUneTZExP8UPkWeI7BmZfxnT_EAFMk6TlYH-yNx-OGeHiMHuX3SsJwc53iffRA4NhwjQ==";

async function testBuniMpesa() {
  console.log('🧪 Testing Buni/KCB M-Pesa Integration...\n');

  try {
    // Create API instance
    const mpesaAPI = new BuniMpesaAPI(API_KEY, 'sandbox');

    // Test 1: API Key validation
    console.log('1️⃣ Testing API Key...');
    const isValid = await mpesaAPI.testAPIKey();
    
    if (!isValid) {
      console.log('❌ API Key validation failed');
      return;
    }

    // Test 2: STK Push (commented out to avoid charges)
    console.log('\n2️⃣ STK Push Test (commented out to avoid charges)');
    console.log('   Uncomment the code below to test STK Push with a real phone number');
    
    /*
    const stkPushRequest = {
      BusinessShortCode: '174379',
      TransactionType: 'CustomerPayBillOnline',
      Amount: 1, // 1 KES for testing
      PartyA: '254708374149',
      PartyB: '174379',
      PhoneNumber: '254708374149',
      CallBackURL: 'https://your-callback-url.com/callback',
      AccountReference: 'TestPayment',
      TransactionDesc: 'Test STK Push Payment'
    };

    const stkResponse = await mpesaAPI.initiateSTKPush(stkPushRequest);
    console.log('✅ STK Push initiated:', stkResponse);
    */

    console.log('\n✅ Buni/KCB M-Pesa integration test completed successfully!');
    console.log('\n📋 Summary:');
    console.log('- API Key is valid and working');
    console.log('- Access token can be obtained');
    console.log('- Ready for STK Push integration');
    
    console.log('\n💡 Next Steps:');
    console.log('1. Update your server.js to use BuniMpesaAPI instead of MpesaAPI');
    console.log('2. Add BUNI_API_KEY to your .env file');
    console.log('3. Test with real phone numbers in sandbox mode');
    console.log('4. Configure callback URLs for production');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testBuniMpesa();
