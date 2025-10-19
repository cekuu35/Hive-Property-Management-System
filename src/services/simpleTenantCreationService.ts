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

export class SimpleTenantCreationService {
  /**
   * Check if email is available for tenant creation
   */
  static async checkEmailAvailability(email: string) {
    try {
      // Check if email exists in auth.users
      const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
      const userExists = existingUsers?.users?.find((user: any) => user.email === email);
      
      if (userExists) {
        // Check if this user is already linked to a tenant
        const { data: existingTenant } = await supabaseAdmin
          .from('tenant_info')
          .select('id, profile_id')
          .eq('profile_id', userExists.id)
          .single();

        if (existingTenant) {
          return {
            available: false,
            reason: 'This email is already registered as a tenant',
            existingUser: userExists
          };
        }

        // Check if this user has a profile with a different role
        const { data: existingProfile } = await supabaseAdmin
          .from('profiles')
          .select('id, role')
          .eq('id', userExists.id)
          .single();

        if (existingProfile && existingProfile.role !== 'tenant') {
          return {
            available: false,
            reason: `This email is already registered as ${existingProfile.role}. You can create a tenant account but will need to use role switching to access both accounts.`,
            existingUser: userExists,
            canCreateWithRoleSwitch: true
          };
        }

        return {
          available: true,
          reason: 'Email available for tenant creation',
          existingUser: userExists
        };
      }

      return {
        available: true,
        reason: 'Email available for tenant creation'
      };
    } catch (error) {
      console.error('Error checking email availability:', error);
      return {
        available: false,
        reason: 'Error checking email availability'
      };
    }
  }

  /**
   * Create a new tenant with automatic auth user creation
   * This version works with the existing schema
   */
  static async createTenant(
    landlordId: string,
    tenantData: CreateTenantData
  ): Promise<TenantCreationResult> {
    try {
      // Check email availability
      const emailCheck = await this.checkEmailAvailability(tenantData.email);
      
      if (!emailCheck.available && !emailCheck.canCreateWithRoleSwitch) {
        return {
          success: false,
          error: emailCheck.reason
        };
      }

      // Validate email uniqueness for this landlord
      const emailExists = await this.checkEmailUniqueness(landlordId, tenantData.email);
      if (emailExists) {
        return {
          success: false,
          error: 'A tenant with this email already exists under this landlord'
        };
      }

      let authUser;
      let password;

      if (emailCheck.existingUser) {
        // Use existing user
        authUser = { user: emailCheck.existingUser };
        password = 'Use existing account - password reset required';
      } else {
        // Generate a random password
        password = this.generateRandomPassword();

        // Create auth user first
        const { data: newAuthUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
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

        if (!newAuthUser.user) {
          return {
            success: false,
            error: 'Failed to create user account'
          };
        }

        authUser = newAuthUser;
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
   * Reset tenant password
   */
  static async resetPassword(authUserId: string, newPassword: string) {
    try {
      const { error } = await supabaseAdmin.auth.admin.updateUserById(authUserId, {
        password: newPassword
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      console.error('Error in resetPassword:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Update tenant information
   */
  static async updateTenant(tenantId: string, updates: Partial<CreateTenantData & {
    tenant_status?: string;
    payment_status?: string;
    current_balance?: number;
    emergency_contact_name?: string;
    emergency_contact_phone?: string;
    notes?: string;
  }>) {
    try {
      // Update tenant_info record
      const tenantInfoUpdates: any = {};
      if (updates.first_name) tenantInfoUpdates.first_name = updates.first_name;
      if (updates.last_name) tenantInfoUpdates.last_name = updates.last_name;
      if (updates.email) tenantInfoUpdates.email = updates.email;
      if (updates.phone) tenantInfoUpdates.phone = updates.phone;
      if (updates.emergency_contact_name) tenantInfoUpdates.emergency_contact_name = updates.emergency_contact_name;
      if (updates.emergency_contact_phone) tenantInfoUpdates.emergency_contact_phone = updates.emergency_contact_phone;
      if (updates.notes) tenantInfoUpdates.notes = updates.notes;
      if (updates.tenant_status) tenantInfoUpdates.tenant_status = updates.tenant_status;
      if (updates.payment_status) tenantInfoUpdates.payment_status = updates.payment_status;
      if (updates.current_balance !== undefined) tenantInfoUpdates.current_balance = updates.current_balance;

      if (Object.keys(tenantInfoUpdates).length > 0) {
        const { error: tenantInfoError } = await supabaseAdmin
          .from('tenant_info')
          .update(tenantInfoUpdates)
          .eq('id', tenantId);

        if (tenantInfoError) {
          return { success: false, error: tenantInfoError.message };
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
   * Send welcome email to tenant
   */
  static async sendWelcomeEmail(email: string, password: string, tenantName: string, landlordName?: string) {
    try {
      // Option 1: Use Supabase Edge Function (recommended)
      const { data: result, error } = await supabase.functions.invoke('send-welcome-email', {
        body: {
          email,
          password,
          tenantName,
          landlordName: landlordName || 'Your Landlord'
        }
      });

      if (error) {
        console.error('Error calling email function:', error);
        // Fallback: just log the credentials
        console.log(`Welcome email failed for ${email}. Credentials: ${password}`);
        return { success: false, error: error.message };
      }

      return { success: true, data: result };
    } catch (error) {
      console.error('Error in sendWelcomeEmail:', error);
      // Fallback: just log the credentials
      console.log(`Welcome email error for ${email}. Credentials: ${password}`);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }
}
