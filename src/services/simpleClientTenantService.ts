import { supabase } from '@/integrations/supabase/client';
import { supabaseAdmin } from '@/integrations/supabase/admin';

export interface CreateTenantData {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  unit_id?: string;
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

export class SimpleClientTenantService {
  /**
   * Generate a random password
   */
  private static generateRandomPassword(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  }

  /**
   * Create a tenant using direct Supabase calls
   */
  static async createTenant(
    landlordId: string,
    tenantData: CreateTenantData
  ): Promise<TenantCreationResult> {
    try {
      console.log('🚀 Starting direct tenant creation...');

      // Create tenant_info record directly
      const { data: tenantInfo, error: tenantInfoError } = await supabase
        .from('tenant_info')
        .insert({
          landlord_id: landlordId,
          first_name: tenantData.first_name,
          last_name: tenantData.last_name,
          email: tenantData.email,
          phone: tenantData.phone,
          tenant_status: 'active',
          current_balance: tenantData.rent_amount,
          payment_status: 'unpaid',
          emergency_contact_name: tenantData.emergency_contact_name,
          emergency_contact_phone: tenantData.emergency_contact_phone,
          notes: tenantData.notes,
        })
        .select()
        .single();

      if (tenantInfoError) {
        console.error('❌ Tenant_info creation failed:', tenantInfoError.message);
        return {
          success: false,
          error: `Tenant info creation failed: ${tenantInfoError.message}`
        };
      }

      console.log('✅ Tenant_info created:', tenantInfo.id);

      // Create tenants record
      const { data: tenantRecord, error: tenantRecordError } = await supabase
        .from('tenants')
        .insert({
          landlord_id: landlordId,
          tenant_info_id: tenantInfo.id,
          auth_user_id: null, // Will be updated after auth user creation
          unit_id: tenantData.unit_id || null,
          rent_amount: tenantData.rent_amount || 0,
          security_deposit: tenantData.security_deposit || 0,
          lease_start_date: tenantData.lease_start_date || null,
          lease_end_date: tenantData.lease_end_date || null,
          status: 'active'
        })
        .select()
        .single();

      if (tenantRecordError) {
        console.error('❌ Tenants record creation failed:', tenantRecordError);
        return {
          success: false,
          error: `Tenants record creation failed: ${tenantRecordError.message}`
        };
      }

      console.log('✅ Tenants record created:', tenantRecord.id);

      // Generate password for auth user
      const password = this.generateRandomPassword();
      console.log('🔑 Generated password for auth user');

      // Try to create auth user using admin client
      let authData: any = null;
      let authError: any = null;

      try {
        const result = await supabaseAdmin.auth.admin.createUser({
          email: tenantData.email,
          password: password,
          email_confirm: true,
          user_metadata: {
            first_name: tenantData.first_name,
            last_name: tenantData.last_name,
            phone: tenantData.phone,
            role: 'tenant'
          }
        });
        authData = result.data;
        authError = result.error;
      } catch (error) {
        console.warn('⚠️ Admin client not available, skipping auth user creation:', error);
        authError = { message: 'Admin client not configured' };
      }

      if (authError) {
        console.warn('⚠️ Auth user creation failed:', authError.message);
        console.log('📝 Tenant created without auth user. Password will be displayed for manual account creation.');
        
        // Don't fail the entire operation, just log the warning
        // The tenant can still be created and the password can be used to create the account manually
      } else {
        console.log('✅ Auth user created:', authData.user?.id);

        // Update tenant_info with auth_user_id
        const { error: updateError } = await supabase
          .from('tenant_info')
          .update({ auth_user_id: authData.user?.id })
          .eq('id', tenantInfo.id);

        if (updateError) {
          console.error('❌ Failed to link auth user to tenant:', updateError);
          // Don't fail the entire operation, just log the error
        } else {
          console.log('✅ Auth user linked to tenant');
        }

        // Update tenants record with auth_user_id
        const { error: updateTenantError } = await supabase
          .from('tenants')
          .update({ auth_user_id: authData.user?.id })
          .eq('id', tenantRecord.id);

        if (updateTenantError) {
          console.error('❌ Failed to update tenants record with auth_user_id:', updateTenantError);
        } else {
          console.log('✅ Tenants record updated with auth_user_id');
        }
      }

      // Create active lease if unit_id is provided
      if (tenantData.unit_id) {
        console.log('Creating active lease...');
        
        const { error: leaseError } = await supabase
          .from('leases')
          .insert({
            tenant_id: tenantInfo.id, // tenant_id should reference tenant_info.id
            tenant_info_id: tenantInfo.id,
            unit_id: tenantData.unit_id,
            start_date: tenantData.lease_start_date || new Date().toISOString().split('T')[0],
            end_date: tenantData.lease_end_date || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            rent_amount: tenantData.rent_amount,
            deposit_amount: tenantData.security_deposit,
            status: 'active'
          });

        if (leaseError) {
          console.error('❌ Lease creation failed:', leaseError);
          // Don't fail the entire operation if lease creation fails
        } else {
          console.log('✅ Active lease created successfully.');
        }
      }

      console.log('✅ Direct tenant creation workflow finished successfully.');
      console.log('📊 Created tenant info:', {
        id: tenantInfo.id,
        name: `${tenantData.first_name} ${tenantData.last_name}`,
        email: tenantData.email,
        landlord_id: landlordId
      });

      const result = {
        success: true,
        tenant_id: tenantRecord.id, // Use tenantRecord.id for updates
        tenant_info_id: tenantInfo.id, // Keep tenant_info_id for reference
        auth_user_id: authData?.user?.id || null,
        password: password, // Use the actual generated password
        email: tenantData.email,
        auth_created: !authError, // Flag to indicate if auth user was created
      };

      console.log('🔍 Service returning result:', {
        success: result.success,
        password: result.password,
        email: result.email,
        auth_created: result.auth_created
      });
        
        // Send welcome email
        try {
          await this.sendWelcomeEmail(
          result.email!,
          result.password!,
            `${tenantData.first_name} ${tenantData.last_name}`
          );
          console.log('✅ Welcome email sent (or attempted)');
        } catch (emailError) {
          console.error('❌ Welcome email failed:', emailError);
        }

      return result;

    } catch (error) {
      console.error('❌ Error in tenant creation:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Send welcome email (placeholder implementation)
   */
  static async sendWelcomeEmail(email: string, password: string, tenantName: string) {
    console.log(`📧 Simulating welcome email to ${email}`);
    console.log(`   Tenant: ${tenantName}`);
    console.log(`   Password: ${password}`);
    console.log('   Note: In production, integrate with email service');
    
    // In a real application, you would integrate with an email service here
    // e.g., via a Supabase Edge Function or a direct API call to SendGrid/Resend etc.
  }

  /**
   * Check if email is available (simplified version)
   */
  static async checkEmailAvailability(email: string) {
    try {
      // Check if email exists in tenant_info table
      const { data: existingTenant, error } = await supabase
        .from('tenant_info')
        .select('id, email')
        .eq('email', email)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        console.error('Error checking email availability:', error);
        return { available: false, reason: 'Error checking email availability' };
      }

      if (existingTenant) {
        return {
          available: false,
          reason: 'This email is already registered as a tenant'
        };
      }

      return { available: true };
    } catch (error) {
      console.error('Error checking email availability:', error);
      return { available: false, reason: 'Error checking email availability' };
    }
  }
}
