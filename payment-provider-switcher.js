import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config();

class PaymentProviderSwitcher {
  constructor() {
    this.baseURL = 'http://localhost:3001';
  }

  async getCurrentProvider() {
    try {
      const response = await fetch(`${this.baseURL}/api/mpesa/provider`);
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('❌ Error getting current provider:', error.message);
      return null;
    }
  }

  async switchProvider(provider) {
    try {
      const response = await fetch(`${this.baseURL}/api/mpesa/switch-provider`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider })
      });
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('❌ Error switching provider:', error.message);
      return null;
    }
  }

  async testProvider(provider) {
    try {
      const response = await fetch(`${this.baseURL}/api/mpesa/test-provider?provider=${provider}`);
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('❌ Error testing provider:', error.message);
      return null;
    }
  }

  async testPayment(provider = null) {
    try {
      if (provider) {
        await this.switchProvider(provider);
      }
      
      const response = await fetch(`${this.baseURL}/api/mpesa/rent-payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leaseId: '7bfd4299-e952-4d03-ac60-44b465626895',
          amount: 100,
          phoneNumber: '254708374149'
        })
      });
      
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('❌ Error testing payment:', error.message);
      return null;
    }
  }

  async runTests() {
    console.log('🧪 Testing Payment Provider Switching\n');
    console.log('=' .repeat(50));
    
    // Test current provider
    console.log('1️⃣ Getting current provider...');
    const current = await this.getCurrentProvider();
    if (current) {
      console.log(`✅ Current provider: ${current.provider.toUpperCase()}`);
    }
    
    // Test KCB Buni
    console.log('\n2️⃣ Testing KCB Buni provider...');
    const kcbTest = await this.testProvider('kcb');
    if (kcbTest) {
      console.log(`✅ KCB Buni: ${kcbTest.message}`);
    }
    
    // Test Safaricom Daraja
    console.log('\n3️⃣ Testing Safaricom Daraja provider...');
    const darajaTest = await this.testProvider('daraja');
    if (darajaTest) {
      console.log(`✅ Safaricom Daraja: ${darajaTest.message}`);
    }
    
    // Test payment with KCB
    console.log('\n4️⃣ Testing payment with KCB Buni...');
    const kcbPayment = await this.testPayment('kcb');
    if (kcbPayment) {
      console.log(`✅ KCB Payment: ${kcbPayment.success ? 'Success' : 'Failed'}`);
    }
    
    // Test payment with Daraja
    console.log('\n5️⃣ Testing payment with Safaricom Daraja...');
    const darajaPayment = await this.testPayment('daraja');
    if (darajaPayment) {
      console.log(`✅ Daraja Payment: ${darajaPayment.success ? 'Success' : 'Failed'}`);
    }
    
    console.log('\n' + '=' .repeat(50));
    console.log('🎉 Payment Provider Switching Tests Complete!');
  }
}

// Run tests if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const switcher = new PaymentProviderSwitcher();
  switcher.runTests();
}

export { PaymentProviderSwitcher };