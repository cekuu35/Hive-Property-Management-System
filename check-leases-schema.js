import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://kozhlejudselgtmohdfm.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtvemhsZWp1ZHNlbGd0bW9oZGZtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzQwNDI5OCwiZXhwIjoyMDcyOTgwMjk4fQ.LWosNpPJO_clOXXYa5pqGM36S-FLANk71F8BvcsJf2g';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkLeasesSchema() {
  console.log('🔍 Checking leases table schema...\n');

  try {
    // Get a sample lease record to see the actual schema
    const { data: sampleLease, error: sampleError } = await supabase
      .from('leases')
      .select('*')
      .limit(1)
      .single();

    if (sampleError) {
      console.error('❌ Error fetching sample lease:', sampleError);
    } else {
      console.log('📋 Sample lease record:');
      console.log(JSON.stringify(sampleLease, null, 2));
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

checkLeasesSchema();




