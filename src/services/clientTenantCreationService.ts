import { supabase } from '@/integrations/supabase/client';

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
  requiresAuthCreation?: boolean;
}

export class ClientTenantCreationService {
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
   * Check if email is available for tenant creation
   */
  static async checkEmailAvailability(email: string) {
    try {
      // Check if email exists in auth.users
      const { data: existingUsers, error: usersError } = await supabase.auth.admin.listUsers();
      
      if (usersError) {
        console.error('Error fetching users:', usersError);
        return {
          available: false,
          reason: 'Error checking email availability'
        };
      }

      const userExists = existingUsers?.users?.find(user => user.email === email);
      
      if (userExists) {
        // Check if this user is already linked to a tenant
        const { data: existingTenant } = await supabase
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
        const { data: existingProfile } = await supabase
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
   * Create a new tenant (client-side version)
   * This version creates the tenant record but requires manual auth user creation
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
      const { data: existingTenant } = await supabase
        .from('tenant_info')
        .select('id')
        .eq('landlord_id', landlordId)
        .eq('email', tenantData.email)
        .single();

      if (existingTenant) {
        return {
          success: false,
          error: 'A tenant with this email already exists under this landlord'
        };
      }

      // Generate a random password for display
      const password = this.generateRandomPassword();

      // Create tenant_info record (without auth user for now)
      const { data: tenantInfo, error: tenantInfoError } = await supabase
        .from('tenant_info')
        .insert({
          landlord_id: landlordId,
          first_name: tenantData.first_name,
          last_name: tenantData.last_name,
          email: tenantData.email,
          phone: tenantData.phone,
          profile_id: null, // Will be set when auth user is created
          tenant_status: 'pending', // Set to pending until auth user is created
          current_balance: 0,
          payment_status: 'unpaid',
          emergency_contact_name: tenantData.emergency_contact_name,
          emergency_contact_phone: tenantData.emergency_contact_phone,
          notes: tenantData.notes
        })
        .select()
        .single();

      if (tenantInfoError) {
        return {
          success: false,
          error: `Failed to create tenant record: ${tenantInfoError.message}`
        };
      }

      // Create lease record if unit_id is provided
      if (tenantData.unit_id) {
        const { error: leaseError } = await supabase
          .from('leases')
          .insert({
            tenant_info_id: tenantInfo.id,
            unit_id: tenantData.unit_id,
            start_date: tenantData.lease_start_date || new Date().toISOString().split('T')[0],
            end_date: tenantData.lease_end_date || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            rent_amount: tenantData.rent_amount,
            deposit_amount: tenantData.security_deposit,
            status: 'active'
          });

        if (leaseError) {
          console.error('Error creating lease:', leaseError);
          // Don't fail the entire operation if lease creation fails
        } else {
          console.log('✅ Lease created successfully with status: active');
        }
      }

      // Send welcome email (optional)
      try {
        await this.sendWelcomeEmail(
          tenantData.email,
          password,
          `${tenantData.first_name} ${tenantData.last_name}`
        );
      } catch (emailError) {
        console.error('Welcome email failed:', emailError);
        // Don't fail the entire operation if email fails
      }

      return {
        success: true,
        tenant_id: tenantInfo.id,
        auth_user_id: null, // Will be created manually
        password: password,
        email: tenantData.email,
        requiresAuthCreation: true // Flag to indicate auth user needs to be created
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
   * Get tenant by auth user ID
   */
  static async getTenantByAuthUser(authUserId: string) {
    try {
      const { data, error } = await supabase
        .from('tenant_info')
        .select('*')
        .eq('profile_id', authUserId)
        .single();

      if (error) {
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error fetching tenant by auth user:', error);
      return null;
    }
  }

  /**
   * Get tenants for a specific landlord
   */
  static async getTenantsForLandlord(landlordId: string) {
    try {
      const { data, error } = await supabase
        .from('tenant_info')
        .select(`
          *,
          units (
            id,
            unit_number,
            type,
            properties (
              id,
              name,
              address
            )
          )
        `)
        .eq('landlord_id', landlordId);

      if (error) {
        console.error('Error fetching tenants for landlord:', error);
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
      const { error } = await supabase.auth.admin.updateUserById(authUserId, {
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
   * Update tenant information (tenant_info table only)
   */
  static async updateTenantInfo(tenantId: string, updates: {
    first_name?: string;
    last_name?: string;
    email?: string;
    phone?: string;
    emergency_contact_name?: string;
    emergency_contact_phone?: string;
    notes?: string;
    tenant_status?: string;
    payment_status?: string;
    current_balance?: number;
  }) {
    try {
      console.log('🔄 Updating tenant_info for ID:', tenantId, 'with updates:', updates);

      const { error: tenantInfoError } = await supabase
        .from('tenant_info')
        .update(updates)
        .eq('id', tenantId);

      if (tenantInfoError) {
        console.error('❌ Tenant info update error:', tenantInfoError);
        return { success: false, error: tenantInfoError.message };
      }

      console.log('✅ Tenant info updated successfully');
      return { success: true };
    } catch (error) {
      console.error('❌ Error updating tenant info:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Update lease information (leases table)
   */
  static async updateLease(tenantId: string, updates: {
    unit_id?: string;
    rent_amount?: number;
    deposit_amount?: number;
    start_date?: string;
    end_date?: string;
  }) {
    try {
      console.log('🔄 Updating lease for tenant ID:', tenantId, 'with updates:', updates);

      // First, find the lease for this tenant
      const { data: existingLease, error: findError } = await supabase
        .from('leases')
        .select('id')
        .eq('tenant_id', tenantId)
        .single();

      if (findError) {
        console.error('❌ Error finding lease:', findError);
        return { success: false, error: `Lease not found: ${findError.message}` };
      }

      if (!existingLease) {
        console.log('⚠️ No existing lease found, creating new one...');
        // Create a new lease if none exists
        // First, get the tenant_info_id from the tenants table
        const { data: tenantData, error: tenantError } = await supabase
          .from('tenants')
          .select('tenant_info_id')
          .eq('id', tenantId)
          .single();

        if (tenantError) {
          console.error('❌ Error finding tenant:', tenantError);
          return { success: false, error: `Tenant not found: ${tenantError.message}` };
        }

        const { error: createError } = await supabase
          .from('leases')
          .insert({
            tenant_id: tenantData.tenant_info_id, // tenant_id should reference tenant_info.id
            tenant_info_id: tenantData.tenant_info_id,
            unit_id: updates.unit_id,
            rent_amount: updates.rent_amount || 0,
            deposit_amount: updates.deposit_amount || 0,
            start_date: updates.start_date || new Date().toISOString().split('T')[0],
            end_date: updates.end_date || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            status: 'active'
          });

        if (createError) {
          console.error('❌ Error creating lease:', createError);
          return { success: false, error: `Failed to create lease: ${createError.message}` };
        }

        // Also update the tenants table with the unit assignment
        const { error: updateTenantError } = await supabase
          .from('tenants')
          .update({
            unit_id: updates.unit_id,
            rent_amount: updates.rent_amount || 0,
            security_deposit: updates.deposit_amount || 0,
            lease_start_date: updates.start_date || new Date().toISOString().split('T')[0],
            lease_end_date: updates.end_date || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
          })
          .eq('id', tenantId);

        if (updateTenantError) {
          console.error('❌ Error updating tenants table:', updateTenantError);
          return { success: false, error: `Failed to update tenants table: ${updateTenantError.message}` };
        }

        console.log('✅ New lease created and tenants table updated successfully');
        return { success: true };
      }

      // Update existing lease
      const { error: updateError } = await supabase
        .from('leases')
        .update(updates)
        .eq('id', existingLease.id);

      if (updateError) {
        console.error('❌ Lease update error:', updateError);
        return { success: false, error: updateError.message };
      }

      // Also update the tenants table
      const { error: updateTenantError } = await supabase
        .from('tenants')
        .update({
          unit_id: updates.unit_id,
          rent_amount: updates.rent_amount,
          security_deposit: updates.deposit_amount,
          lease_start_date: updates.start_date,
          lease_end_date: updates.end_date
        })
        .eq('id', tenantId);

      if (updateTenantError) {
        console.error('❌ Error updating tenants table:', updateTenantError);
        return { success: false, error: `Failed to update tenants table: ${updateTenantError.message}` };
      }

      console.log('✅ Lease and tenants table updated successfully');
      return { success: true };
    } catch (error) {
      console.error('❌ Error updating lease:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Update tenant information (legacy method for backward compatibility)
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
      // Separate tenant info updates from lease updates
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

      // Update tenant_info table
      if (Object.keys(tenantInfoUpdates).length > 0) {
        const result = await this.updateTenantInfo(tenantId, tenantInfoUpdates);
        if (!result.success) {
          return result;
        }
      }

      // Update lease information
      const leaseUpdates: any = {};
      if (updates.unit_id) leaseUpdates.unit_id = updates.unit_id;
      if (updates.rent_amount !== undefined) leaseUpdates.rent_amount = updates.rent_amount;
      if (updates.security_deposit !== undefined) leaseUpdates.deposit_amount = updates.security_deposit;
      if (updates.lease_start_date) leaseUpdates.start_date = updates.lease_start_date;
      if (updates.lease_end_date) leaseUpdates.end_date = updates.lease_end_date;

      if (Object.keys(leaseUpdates).length > 0) {
        const result = await this.updateLease(tenantId, leaseUpdates);
        if (!result.success) {
          return result;
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
      // For now, just log the credentials
      // In production, you would integrate with an email service
      console.log(`Welcome email for ${email}:`);
      console.log(`Password: ${password}`);
      console.log(`Tenant: ${tenantName}`);
      console.log(`Landlord: ${landlordName || 'Your Landlord'}`);
      
      return { success: true };
    } catch (error) {
      console.error('Error in sendWelcomeEmail:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }
}
