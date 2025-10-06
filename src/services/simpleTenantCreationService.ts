import { supabase } from '@/integrations/supabase/client';
import { supabaseAdmin } from '../../scripts/supabaseAdmin.js';

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

export class SimpleTenantCreationService {
  /**
   * Create a new tenant with automatic auth user creation
   * This version works with the existing schema
   */
  static async createTenant(
    landlordId: string,
    tenantData: CreateTenantData
  ): Promise<TenantCreationResult> {
    try {
      // Validate email uniqueness for this landlord
      const emailExists = await this.checkEmailUniqueness(landlordId, tenantData.email);
      if (emailExists) {
        return {
          success: false,
          error: 'A tenant with this email already exists under this landlord'
        };
      }

      // Generate a random password
      const password = this.generateRandomPassword();

      // Create auth user first
      const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: tenantData.email,
        password: password,
        email_confirm: true,
        user_metadata: {
          first_name: tenantData.first_name,
          last_name: tenantData.last_name,
          role: 'tenant'
        }
      });

      if (authError) {
        console.error('Error creating auth user:', authError);
        return {
          success: false,
          error: `Failed to create user account: ${authError.message}`
        };
      }

      if (!authUser.user) {
        return {
          success: false,
          error: 'Failed to create user account'
        };
      }

      // Create tenant_info record
      const { data: tenantInfo, error: tenantInfoError } = await supabaseAdmin
        .from('tenant_info')
        .insert({
          landlord_id: landlordId,
          first_name: tenantData.first_name,
          last_name: tenantData.last_name,
          email: tenantData.email,
          phone: tenantData.phone,
          profile_id: authUser.user.id, // Link to auth user
          tenant_status: 'active',
          current_balance: 0,
          payment_status: 'unpaid'
        })
        .select()
        .single();

      if (tenantInfoError) {
        // Clean up auth user if tenant_info creation fails
        await supabaseAdmin.auth.admin.deleteUser(authUser.user.id);
        return {
          success: false,
          error: `Failed to create tenant record: ${tenantInfoError.message}`
        };
      }

      // Create a lease record if unit is provided
      if (tenantData.unit_id) {
        const { error: leaseError } = await supabaseAdmin
          .from('leases')
          .insert({
            tenant_id: authUser.user.id, // Use auth user ID as tenant_id
            tenant_info_id: tenantInfo.id,
            unit_id: tenantData.unit_id,
            rent_amount: tenantData.rent_amount,
            deposit_amount: tenantData.security_deposit,
            start_date: tenantData.lease_start_date || new Date().toISOString().split('T')[0],
            end_date: tenantData.lease_end_date || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            status: 'active'
          });

        if (leaseError) {
          console.error('Error creating lease:', leaseError);
          // Don't fail the entire operation for lease creation error
        }
      }

      return {
        success: true,
        tenant_id: tenantInfo.id,
        auth_user_id: authUser.user.id,
        password: password,
        email: tenantData.email
      };

    } catch (error) {
      console.error('Error in createTenant:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Check if email is unique for a landlord
   */
  private static async checkEmailUniqueness(landlordId: string, email: string): Promise<boolean> {
    try {
      const { data, error } = await supabaseAdmin
        .from('tenant_info')
        .select('id')
        .eq('landlord_id', landlordId)
        .eq('email', email)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      return !!data;
    } catch (error) {
      console.error('Error checking email uniqueness:', error);
      return false;
    }
  }

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
   * Get tenant information by auth user ID
   */
  static async getTenantByAuthUser(authUserId: string) {
    try {
      const { data, error } = await supabaseAdmin
        .from('tenant_info')
        .select(`
          id,
          landlord_id,
          first_name,
          last_name,
          email,
          phone,
          tenant_status,
          current_balance,
          payment_status,
          leases!leases_tenant_id_fkey (
            id,
            unit_id,
            rent_amount,
            deposit_amount,
            start_date,
            end_date,
            status,
            units (
              unit_number,
              properties (
                name,
                address
              )
            )
          )
        `)
        .eq('profile_id', authUserId)
        .single();

      if (error) {
        console.error('Error getting tenant by auth user:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error in getTenantByAuthUser:', error);
      return null;
    }
  }

  /**
   * Get all tenants for a landlord
   */
  static async getTenantsForLandlord(landlordId: string) {
    try {
      const { data, error } = await supabaseAdmin
        .from('tenant_info')
        .select(`
          id,
          first_name,
          last_name,
          email,
          phone,
          tenant_status,
          current_balance,
          payment_status,
          created_at,
          leases!leases_tenant_info_id_fkey (
            id,
            unit_id,
            rent_amount,
            deposit_amount,
            start_date,
            end_date,
            status,
            units (
              unit_number,
              properties (
                name,
                address
              )
            )
          )
        `)
        .eq('landlord_id', landlordId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error getting tenants for landlord:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getTenantsForLandlord:', error);
      return [];
    }
  }

  /**
   * Send welcome email to tenant (placeholder for email service integration)
   */
  static async sendWelcomeEmail(email: string, password: string, tenantName: string) {
    // This would integrate with your email service (SendGrid, AWS SES, etc.)
    console.log(`Welcome email would be sent to ${email} with password: ${password}`);
    console.log(`Tenant: ${tenantName}`);
    
    // For now, just log the credentials
    // In production, you would:
    // 1. Send email with login credentials
    // 2. Include a link to reset password
    // 3. Provide instructions for first login
    
    return { success: true };
  }
}
