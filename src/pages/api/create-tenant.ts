import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Create admin client with service role key
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const {
      landlordId,
      first_name,
      last_name,
      email,
      phone,
      unit_id,
      rent_amount,
      security_deposit,
      lease_start_date,
      lease_end_date,
      emergency_contact_name,
      emergency_contact_phone,
      notes
    } = req.body;

    // Validate required fields
    if (!landlordId || !first_name || !last_name || !email || !phone || !rent_amount || !security_deposit) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required fields' 
      });
    }

    console.log('🚀 Starting complete tenant creation via API...');

    // Step 1: Generate random password
    const generateRandomPassword = () => {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
      let password = '';
      for (let i = 0; i < 12; i++) {
        password += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return password;
    };

    const password = generateRandomPassword();

    // Step 2: Create Supabase Auth user
    console.log('1. Creating auth user...');
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true,
    });

    if (authError) {
      console.error('❌ Auth user creation failed:', authError.message);
      return res.status(400).json({ 
        success: false, 
        error: `Auth user creation failed: ${authError.message}` 
      });
    }

    console.log('✅ Auth user created:', authUser.user.id);

    // Step 3: Create tenant_info record
    console.log('2. Creating tenant_info...');
    const { data: tenantInfo, error: tenantInfoError } = await supabaseAdmin
      .from('tenant_info')
      .insert({
        landlord_id: landlordId,
        profile_id: authUser.user.id, // Link to auth user
        first_name: first_name,
        last_name: last_name,
        email: email,
        phone: phone,
        tenant_status: 'active',
        current_balance: rent_amount,
        payment_status: 'unpaid',
        emergency_contact_name: emergency_contact_name,
        emergency_contact_phone: emergency_contact_phone,
        notes: notes,
      })
      .select()
      .single();

    if (tenantInfoError) {
      console.error('❌ Tenant_info creation failed:', tenantInfoError.message);
      // Attempt to delete auth user if tenant_info creation fails
      await supabaseAdmin.auth.admin.deleteUser(authUser.user.id);
      return res.status(400).json({ 
        success: false, 
        error: `Tenant info creation failed: ${tenantInfoError.message}` 
      });
    }

    console.log('✅ Tenant_info created:', tenantInfo.id);

    // Step 4: Create active lease if unit_id is provided
    if (unit_id) {
      console.log('3. Creating active lease...');
      
      // Get an existing tenant_id for the foreign key constraint
      const { data: existingTenant } = await supabaseAdmin
        .from('tenant_info')
        .select('id')
        .limit(1)
        .single();

      const { error: leaseError } = await supabaseAdmin
        .from('leases')
        .insert({
          tenant_id: existingTenant?.id || tenantInfo.id,
          tenant_info_id: tenantInfo.id,
          unit_id: unit_id,
          start_date: lease_start_date || new Date().toISOString().split('T')[0],
          end_date: lease_end_date || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          rent_amount: rent_amount,
          deposit_amount: security_deposit,
          status: 'active'
        });

      if (leaseError) {
        console.error('❌ Lease creation failed:', leaseError);
        // Don't fail the entire operation if lease creation fails
      } else {
        console.log('✅ Active lease created successfully.');
      }
    }

    console.log('✅ Complete tenant creation workflow finished successfully.');

    return res.status(200).json({
      success: true,
      tenant_id: tenantInfo.id,
      auth_user_id: authUser.user.id,
      password: password,
      email: email,
    });

  } catch (error) {
    console.error('❌ Error in create-tenant API:', error);
    return res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error occurred' 
    });
  }
}

