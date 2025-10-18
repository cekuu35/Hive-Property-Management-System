import fetch from 'node-fetch';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

class LandlordMpesaChecker {
  constructor() {
    this.supabaseUrl = process.env.SUPABASE_URL;
    this.supabaseKey = process.env.SUPABASE_SERVICE_KEY;
  }

  // Check landlord M-Pesa details
  async checkLandlordMpesaDetails(landlordId) {
    console.log(`🔍 Checking landlord M-Pesa details for ID: ${landlordId}\n`);
    
    try {
      const response = await fetch(`${this.supabaseUrl}/rest/v1/landlords?select=*&id=eq.${landlordId}`, {
        method: 'GET',
        headers: {
          'apikey': this.supabaseKey,
          'Authorization': `Bearer ${this.supabaseKey}`,
          'Content-Type': 'application/json'
        }
      });

      console.log(`Status: ${response.status}`);
      if (response.ok) {
        const data = await response.json();
        if (data.length > 0) {
          const landlord = data[0];
          console.log('✅ Landlord found:');
          console.log(`   ID: ${landlord.id}`);
          console.log(`   Name: ${landlord.name}`);
          console.log(`   Email: ${landlord.email}`);
          console.log(`   Phone: ${landlord.phone}`);
          console.log(`   Paybill Number: ${landlord.paybill_number || 'NOT SET'}`);
          console.log(`   Account Reference: ${landlord.account_reference || 'NOT SET'}`);
          
          if (!landlord.paybill_number || !landlord.account_reference) {
            console.log('\n⚠️  WARNING: Landlord is missing M-Pesa details!');
            console.log('   This is why the M-Pesa payment is failing.');
            console.log('   The landlord needs paybill_number and account_reference set.');
          } else {
            console.log('\n✅ Landlord has M-Pesa details set!');
          }
        } else {
          console.log('❌ No landlord found with that ID');
        }
      } else {
        const error = await response.text();
        console.log('❌ Error fetching landlord:', error);
      }
    } catch (error) {
      console.log('❌ Error checking landlord:', error.message);
    }
  }

  // Update landlord with M-Pesa details
  async updateLandlordMpesaDetails(landlordId) {
    console.log(`\n🔧 Updating landlord with M-Pesa details...\n`);
    
    try {
      const updateData = {
        paybill_number: '174379',
        account_reference: 'TEST001'
      };

      const response = await fetch(`${this.supabaseUrl}/rest/v1/landlords?id=eq.${landlordId}`, {
        method: 'PATCH',
        headers: {
          'apikey': this.supabaseKey,
          'Authorization': `Bearer ${this.supabaseKey}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify(updateData)
      });

      console.log(`Status: ${response.status}`);
      if (response.ok) {
        const data = await response.json();
        console.log('✅ Landlord updated successfully!');
        console.log('Updated data:', JSON.stringify(data, null, 2));
        return true;
      } else {
        const error = await response.text();
        console.log('❌ Error updating landlord:', error);
        return false;
      }
    } catch (error) {
      console.log('❌ Error updating landlord:', error.message);
      return false;
    }
  }

  // Run the check and update
  async runCheckAndUpdate() {
    console.log('🚀 Checking and Updating Landlord M-Pesa Details\n');
    console.log('=' .repeat(60));
    
    const landlordId = '85b546e7-6280-43c2-b281-d500f92da516';
    
    // Check current details
    await this.checkLandlordMpesaDetails(landlordId);
    
    // Update with M-Pesa details
    const updated = await this.updateLandlordMpesaDetails(landlordId);
    
    if (updated) {
      console.log('\n' + '=' .repeat(60));
      console.log('🎉 Landlord updated with M-Pesa details!');
      console.log('📱 You can now test M-Pesa payments!');
    } else {
      console.log('\n❌ Failed to update landlord');
    }
  }
}

// Run the check and update
const checker = new LandlordMpesaChecker();
checker.runCheckAndUpdate();

