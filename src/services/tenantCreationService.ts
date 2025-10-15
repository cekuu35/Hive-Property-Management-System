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

export class TenantCreationService {
  /**
   * Create a new tenant with automatic auth user creation
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

      // Use the database function to create tenant with auth user
      const { data, error } = await supabaseAdmin
        .rpc('create_tenant_with_auth', {
          p_landlord_id: landlordId,
          p_first_name: tenantData.first_name,
          p_last_name: tenantData.last_name,
          p_email: tenantData.email,
          p_phone: tenantData.phone,
          p_unit_id: tenantData.unit_id || null,
          p_rent_amount: tenantData.rent_amount,
          p_security_deposit: tenantData.security_deposit,
          p_lease_start_date: tenantData.lease_start_date || null,
          p_lease_end_date: tenantData.lease_end_date || null
        });

      if (error) {
        console.error('Error creating tenant:', error);
        return {
          success: false,
          error: error.message
        };
      }

      if (!data.success) {
        return {
          success: false,
          error: data.error || 'Failed to create tenant'
        };
      }

      // Update tenant_info with additional fields if provided
      if (tenantData.emergency_contact_name || tenantData.emergency_contact_phone || tenantData.notes) {
        await supabaseAdmin
          .from('tenant_info')
          .update({
            emergency_contact_name: tenantData.emergency_contact_name,
            emergency_contact_phone: tenantData.emergency_contact_phone,
            notes: tenantData.notes
          })
          .eq('id', data.tenant_info_id);
      }

      return {
        success: true,
        tenant_id: data.tenant_id,
        auth_user_id: data.auth_user_id,
        password: data.password,
        email: data.email
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
   * Get tenant information by auth user ID
   */
  static async getTenantByAuthUser(authUserId: string) {
    try {
      const { data, error } = await supabaseAdmin
        .rpc('get_tenant_by_auth_user', {
          p_auth_user_id: authUserId
        });

      if (error) {
        console.error('Error getting tenant by auth user:', error);
        return null;
      }

      return data?.[0] || null;
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
        .from('tenants')
        .select(`
          id,
          rent_amount,
          security_deposit,
          status,
          lease_start_date,
          lease_end_date,
          created_at,
          tenant_info:tenant_info_id (
            id,
            first_name,
            last_name,
            email,
            phone,
            tenant_status,
            current_balance,
            payment_status
          ),
          units (
            id,
            unit_number,
            properties (
              id,
              name,
              address
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
   * Update tenant information
   */
  static async updateTenant(tenantId: string, updates: Partial<CreateTenantData>) {
    try {
      // Update tenant_info
      const tenantInfoUpdates: any = {};
      if (updates.first_name) tenantInfoUpdates.first_name = updates.first_name;
      if (updates.last_name) tenantInfoUpdates.last_name = updates.last_name;
      if (updates.email) tenantInfoUpdates.email = updates.email;
      if (updates.phone) tenantInfoUpdates.phone = updates.phone;
      if (updates.emergency_contact_name) tenantInfoUpdates.emergency_contact_name = updates.emergency_contact_name;
      if (updates.emergency_contact_phone) tenantInfoUpdates.emergency_contact_phone = updates.emergency_contact_phone;
      if (updates.notes) tenantInfoUpdates.notes = updates.notes;

      if (Object.keys(tenantInfoUpdates).length > 0) {
        const { error: tenantInfoError } = await supabaseAdmin
          .from('tenant_info')
          .update(tenantInfoUpdates)
          .eq('id', (await this.getTenantById(tenantId))?.tenant_info_id);

        if (tenantInfoError) {
          throw tenantInfoError;
        }
      }

      // Update tenants table
      const tenantUpdates: any = {};
      if (updates.unit_id) tenantUpdates.unit_id = updates.unit_id;
      if (updates.rent_amount) tenantUpdates.rent_amount = updates.rent_amount;
      if (updates.security_deposit) tenantUpdates.security_deposit = updates.security_deposit;
      if (updates.lease_start_date) tenantUpdates.lease_start_date = updates.lease_start_date;
      if (updates.lease_end_date) tenantUpdates.lease_end_date = updates.lease_end_date;

      if (Object.keys(tenantUpdates).length > 0) {
        const { error: tenantError } = await supabaseAdmin
          .from('tenants')
          .update(tenantUpdates)
          .eq('id', tenantId);

        if (tenantError) {
          throw tenantError;
        }
      }

      return { success: true };
    } catch (error) {
      console.error('Error updating tenant:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Get tenant by ID
   */
  private static async getTenantById(tenantId: string) {
    try {
      const { data, error } = await supabaseAdmin
        .from('tenants')
        .select('tenant_info_id')
        .eq('id', tenantId)
        .single();

      if (error) {
        console.error('Error getting tenant by ID:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error in getTenantById:', error);
      return null;
    }
  }

  /**
   * Delete tenant (soft delete by setting status to terminated)
   */
  static async deleteTenant(tenantId: string) {
    try {
      const { error } = await supabaseAdmin
        .from('tenants')
        .update({ status: 'terminated' })
        .eq('id', tenantId);

      if (error) {
        throw error;
      }

      return { success: true };
    } catch (error) {
      console.error('Error deleting tenant:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
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
