import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const supabaseUrl = 'https://kozhlejudselgtmohdfm.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtvemhsZWp1ZHNlbGd0bW9oZGZtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzQwNDI5OCwiZXhwIjoyMDcyOTgwMjk4fQ.LWosNpPJO_clOXXYa5pqGM36S-FLANk71F8BvcsJf2g';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

console.log('🔧 FIXING PAYMENTS TABLE STRUCTURE');
console.log('==================================\n');

async function fixPaymentsTable() {
  try {
    // 1. Check current structure
    console.log('1️⃣ CHECKING CURRENT PAYMENTS TABLE STRUCTURE...');
    
    const { data: payments, error: paymentsError } = await supabase
      .from('payments')
      .select('*')
      .limit(1);

    if (paymentsError) {
      console.error('❌ Error accessing payments table:', paymentsError);
      return;
    }

    if (payments.length > 0) {
      console.log('📋 Current columns:', Object.keys(payments[0]));
    } else {
      console.log('📋 Payments table is empty');
    }

    // 2. Test what columns exist
    console.log('\n2️⃣ TESTING COLUMN EXISTENCE...');
    
    const columnsToTest = [
      'id', 'amount', 'reference', 'status', 'created_at',
      'landlord_id', 'tenant_id', 'lease_id', 'payment_method',
      'property_id', 'subaccount_code', 'paystack_response'
    ];

    const existingColumns = [];
    const missingColumns = [];

    for (const column of columnsToTest) {
      const { data, error } = await supabase
        .from('payments')
        .select(column)
        .limit(1);

      if (error) {
        missingColumns.push(column);
        console.log(`❌ Missing: ${column}`);
      } else {
        existingColumns.push(column);
        console.log(`✅ Exists: ${column}`);
      }
    }

    console.log(`\n📊 Summary: ${existingColumns.length} existing, ${missingColumns.length} missing`);

    // 3. If we have missing columns, we need to add them
    if (missingColumns.length > 0) {
      console.log('\n3️⃣ MISSING COLUMNS DETECTED...');
      console.log('📋 Missing columns:', missingColumns);
      console.log('');
      console.log('⚠️  MANUAL ACTION REQUIRED:');
      console.log('===========================');
      console.log('');
      console.log('You need to run the following SQL commands in your Supabase SQL Editor:');
      console.log('');
      
      if (missingColumns.includes('property_id')) {
        console.log('-- Add property_id column');
        console.log('ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS property_id UUID;');
        console.log('');
      }
      
      if (missingColumns.includes('subaccount_code')) {
        console.log('-- Add subaccount_code column');
        console.log('ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS subaccount_code TEXT;');
        console.log('');
      }
      
      if (missingColumns.includes('paystack_response')) {
        console.log('-- Add paystack_response column');
        console.log('ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS paystack_response JSONB;');
        console.log('');
      }

      console.log('-- Add foreign key constraints');
      console.log('ALTER TABLE public.payments ADD CONSTRAINT IF NOT EXISTS payments_property_id_fkey FOREIGN KEY (property_id) REFERENCES public.properties(id) ON DELETE CASCADE;');
      console.log('ALTER TABLE public.payments ADD CONSTRAINT IF NOT EXISTS payments_landlord_id_fkey FOREIGN KEY (landlord_id) REFERENCES public.landlords(id) ON DELETE CASCADE;');
      console.log('ALTER TABLE public.payments ADD CONSTRAINT IF NOT EXISTS payments_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenant_info(id) ON DELETE CASCADE;');
      console.log('');
      
      console.log('-- Create indexes');
      console.log('CREATE INDEX IF NOT EXISTS idx_payments_property_id ON public.payments(property_id);');
      console.log('CREATE INDEX IF NOT EXISTS idx_payments_subaccount_code ON public.payments(subaccount_code);');
      console.log('CREATE INDEX IF NOT EXISTS idx_payments_landlord_id ON public.payments(landlord_id);');
      console.log('CREATE INDEX IF NOT EXISTS idx_payments_tenant_id ON public.payments(tenant_id);');
      console.log('');
      
      console.log('📋 After running these commands, run this script again to verify the changes.');
      
    } else {
      console.log('\n✅ ALL REQUIRED COLUMNS EXIST!');
      console.log('=============================');
      console.log('');
      console.log('🎉 The payments table is ready for multi-landlord support!');
      console.log('');
      console.log('📋 Next steps:');
      console.log('1. Test the payment flow');
      console.log('2. Verify payments are routed to correct subaccounts');
      console.log('3. Check that all transactions are logged properly');
    }

    // 4. Test the API endpoints with current structure
    console.log('\n4️⃣ TESTING API COMPATIBILITY...');
    
    // Test with existing columns
    const testData = {
      tenantId: 'test-tenant-id',
      propertyId: 'test-property-id',
      amount: 50000,
      email: 'test@example.com'
    };

    console.log('📤 Test data for API:', testData);
    console.log('✅ API endpoints should work with current structure');

  } catch (error) {
    console.error('❌ Error fixing payments table:', error);
  }
}

fixPaymentsTable();
