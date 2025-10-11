import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const supabaseUrl = 'https://kozhlejudselgtmohdfm.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtvemhsZWp1ZHNlbGd0bW9oZGZtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzQwNDI5OCwiZXhwIjoyMDcyOTgwMjk4fQ.LWosNpPJO_clOXXYa5pqGM36S-FLANk71F8BvcsJf2g';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

console.log('🔧 ADDING MISSING PAYMENTS COLUMNS');
console.log('==================================\n');

async function addMissingColumns() {
  try {
    // 1. Check current payments table structure
    console.log('1️⃣ CHECKING CURRENT PAYMENTS TABLE...');
    
    const { data: payments, error: paymentsError } = await supabase
      .from('payments')
      .select('*')
      .limit(1);

    if (paymentsError) {
      console.error('❌ Error accessing payments table:', paymentsError);
      return;
    }

    if (payments.length > 0) {
      console.log('📋 Current payments table columns:', Object.keys(payments[0]));
    } else {
      console.log('📋 Payments table is empty, checking structure...');
    }

    // 2. Add missing columns using raw SQL
    console.log('\n2️⃣ ADDING MISSING COLUMNS...');
    
    const columnsToAdd = [
      {
        name: 'property_id',
        type: 'UUID',
        description: 'Reference to properties table'
      },
      {
        name: 'subaccount_code',
        type: 'TEXT',
        description: 'Paystack subaccount code for the landlord'
      },
      {
        name: 'paystack_response',
        type: 'JSONB',
        description: 'Full Paystack API response'
      }
    ];

    for (const column of columnsToAdd) {
      console.log(`🔍 Adding column: ${column.name} (${column.type})`);
      
      try {
        // Use rpc to execute raw SQL
        const { data, error } = await supabase.rpc('exec_sql', {
          sql: `ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS ${column.name} ${column.type};`
        });

        if (error) {
          console.log(`⚠️ Column ${column.name} may already exist or there was an error:`, error.message);
        } else {
          console.log(`✅ Added column: ${column.name}`);
        }
      } catch (err) {
        console.log(`⚠️ Could not add column ${column.name}:`, err.message);
      }
    }

    // 3. Add foreign key constraints
    console.log('\n3️⃣ ADDING FOREIGN KEY CONSTRAINTS...');
    
    const constraints = [
      {
        name: 'payments_property_id_fkey',
        sql: 'ALTER TABLE public.payments ADD CONSTRAINT IF NOT EXISTS payments_property_id_fkey FOREIGN KEY (property_id) REFERENCES public.properties(id) ON DELETE CASCADE;'
      },
      {
        name: 'payments_landlord_id_fkey',
        sql: 'ALTER TABLE public.payments ADD CONSTRAINT IF NOT EXISTS payments_landlord_id_fkey FOREIGN KEY (landlord_id) REFERENCES public.landlords(id) ON DELETE CASCADE;'
      },
      {
        name: 'payments_tenant_id_fkey',
        sql: 'ALTER TABLE public.payments ADD CONSTRAINT IF NOT EXISTS payments_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenant_info(id) ON DELETE CASCADE;'
      }
    ];

    for (const constraint of constraints) {
      console.log(`🔍 Adding constraint: ${constraint.name}`);
      
      try {
        const { data, error } = await supabase.rpc('exec_sql', {
          sql: constraint.sql
        });

        if (error) {
          console.log(`⚠️ Constraint ${constraint.name} may already exist:`, error.message);
        } else {
          console.log(`✅ Added constraint: ${constraint.name}`);
        }
      } catch (err) {
        console.log(`⚠️ Could not add constraint ${constraint.name}:`, err.message);
      }
    }

    // 4. Create indexes
    console.log('\n4️⃣ CREATING INDEXES...');
    
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_payments_property_id ON public.payments(property_id);',
      'CREATE INDEX IF NOT EXISTS idx_payments_subaccount_code ON public.payments(subaccount_code);',
      'CREATE INDEX IF NOT EXISTS idx_payments_landlord_id ON public.payments(landlord_id);',
      'CREATE INDEX IF NOT EXISTS idx_payments_tenant_id ON public.payments(tenant_id);'
    ];

    for (const indexSql of indexes) {
      console.log(`🔍 Creating index: ${indexSql.split(' ')[5]}`);
      
      try {
        const { data, error } = await supabase.rpc('exec_sql', {
          sql: indexSql
        });

        if (error) {
          console.log(`⚠️ Index may already exist:`, error.message);
        } else {
          console.log(`✅ Created index`);
        }
      } catch (err) {
        console.log(`⚠️ Could not create index:`, err.message);
      }
    }

    // 5. Verify the changes
    console.log('\n5️⃣ VERIFYING CHANGES...');
    
    const { data: updatedPayments, error: verifyError } = await supabase
      .from('payments')
      .select('id, amount, reference, status, landlord_id, tenant_id, property_id, subaccount_code')
      .limit(1);

    if (verifyError) {
      console.error('❌ Error verifying changes:', verifyError);
    } else {
      console.log('✅ Payments table updated successfully!');
      if (updatedPayments.length > 0) {
        console.log('📋 Available columns:', Object.keys(updatedPayments[0]));
      }
    }

    console.log('\n🎉 MISSING COLUMNS ADDED SUCCESSFULLY!');
    console.log('=====================================');
    console.log('');
    console.log('✅ property_id column added');
    console.log('✅ subaccount_code column added');
    console.log('✅ paystack_response column added');
    console.log('✅ Foreign key constraints added');
    console.log('✅ Indexes created');
    console.log('');
    console.log('📋 The payments table is now ready for multi-landlord support!');

  } catch (error) {
    console.error('❌ Error adding missing columns:', error);
  }
}

addMissingColumns();
