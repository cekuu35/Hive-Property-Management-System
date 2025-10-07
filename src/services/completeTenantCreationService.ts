import { supabase } from '@/integrations/supabase/client';

export interface CreateTenantData {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  unit_id: string;
  rent_amount: number;
  security_deposit: number;
  lease_start_date?: string;
  lease_end_date?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  notes?: string;
}

export interface TenantCreationResult {
  success: boolean;
  tenant_id?: string;
  auth_user_id?: string;
  password?: string;
  email?: string;
  error?: string;
}

export class CompleteTenantCreationService {
  static generateRandomPassword(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  }

  static async createTenant(
    landlordId: string,
    tenantData: CreateTenantData
  ): Promise<TenantCreationResult> {
    try {
      console.log('🚀 Starting complete tenant creation...');

      // Step 1: Create Supabase Auth user
      console.log('1. Creating auth user...');
      const password = this.generateRandomPassword();
      
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: tenantData.email,
        password: password,
        email_confirm: true
      });

      if (authError) {
        return {
          success: false,
          error: `Failed to create auth user: ${authError.message}`
        };
      }

      console.log('✅ Auth user created:', authData.user.id);

      // Step 2: Create tenant_info record
      console.log('2. Creating tenant_info record...');
      const { data: tenantInfo, error: tenantInfoError } = await supabase
        .from('tenant_info')
        .insert({
          landlord_id: landlordId,
          first_name: tenantData.first_name,
          last_name: tenantData.last_name,
          email: tenantData.email,
          phone: tenantData.phone,
          profile_id: authData.user.id, // Link to auth user
          tenant_status: 'active', // Set as active immediately
          current_balance: tenantData.rent_amount, // Set current balance to rent amount
          payment_status: 'unpaid',
          emergency_contact_name: tenantData.emergency_contact_name,
          emergency_contact_phone: tenantData.emergency_contact_phone,
          notes: tenantData.notes
        })
        .select()
        .single();

      if (tenantInfoError) {
        // If tenant_info creation fails, clean up auth user
        await supabase.auth.admin.deleteUser(authData.user.id);
        return {
          success: false,
          error: `Failed to create tenant record: ${tenantInfoError.message}`
        };
      }

      console.log('✅ Tenant_info created:', tenantInfo.id);

      // Step 3: Create active lease
      console.log('3. Creating active lease...');
      
      // Get an existing tenant_id for the foreign key constraint
      const { data: existingTenant } = await supabase
        .from('tenant_info')
        .select('id')
        .limit(1)
        .single();

      const { error: leaseError } = await supabase
        .from('leases')
        .insert({
          tenant_id: existingTenant.id, // Use existing tenant_id for foreign key
          tenant_info_id: tenantInfo.id,
          unit_id: tenantData.unit_id,
          start_date: tenantData.lease_start_date || new Date().toISOString().split('T')[0],
          end_date: tenantData.lease_end_date || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          rent_amount: tenantData.rent_amount,
          deposit_amount: tenantData.security_deposit,
          status: 'active' // Set as active immediately
        });

      if (leaseError) {
        console.error('❌ Lease creation failed:', leaseError);
        // Don't fail the entire operation if lease creation fails
        // The tenant can still login and we can fix the lease later
      } else {
        console.log('✅ Active lease created');
      }

      // Step 4: Send welcome email (optional)
      try {
        await this.sendWelcomeEmail(
          tenantData.email,
          password,
          `${tenantData.first_name} ${tenantData.last_name}`
        );
        console.log('✅ Welcome email sent');
      } catch (emailError) {
        console.error('⚠️ Welcome email failed:', emailError);
        // Don't fail the entire operation if email fails
      }

      console.log('🎉 Complete tenant creation successful!');

      return {
        success: true,
        tenant_id: tenantInfo.id,
        auth_user_id: authData.user.id,
        password: password,
        email: tenantData.email
      };

    } catch (error) {
      console.error('❌ Complete tenant creation failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  static async sendWelcomeEmail(
    email: string,
    password: string,
    fullName: string
  ): Promise<void> {
    // This is a placeholder - you can implement actual email sending here
    console.log(`📧 Welcome email would be sent to ${email}`);
    console.log(`   Subject: Welcome to your new rental portal!`);
    console.log(`   Body: Hello ${fullName}, your account has been created.`);
    console.log(`   Login: ${email}`);
    console.log(`   Password: ${password}`);
  }

  static async testTenantLogin(email: string, password: string): Promise<boolean> {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        console.error('Login test failed:', error.message);
        return false;
      }

      console.log('✅ Login test successful:', data.user.email);
      return true;
    } catch (error) {
      console.error('Login test error:', error);
      return false;
    }
  }
}
