import { supabaseAdmin } from '@/integrations/supabase/admin';
import { generateMemorablePassword } from '@/utils/passwordGenerator';

export interface CreateStaffData {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  role: 'security' | 'caretaker';
  property_ids: string[];
  notes?: string;
}

export interface StaffCreationResult {
  success: boolean;
  profile_id?: string;
  auth_user_id?: string;
  email?: string;
  password?: string;
  role?: string;
  assigned_properties?: string[];
  error?: string;
  warning?: string;
}

export class StaffCreationService {
  /**
   * Generate a memorable password for staff accounts
   */
  static generateRandomPassword(firstName?: string, lastName?: string): string {
    // Use the new memorable password generator
    if (firstName) {
      return generateMemorablePassword(firstName, lastName);
    }
    // Fallback to random if no name provided
    return Math.random().toString(36).slice(-8) + 'A1!'; // 8 chars + special chars
  }

  /**
   * Check if email is available for staff creation
   */
  static async checkEmailAvailability(email: string): Promise<{ available: boolean; existingUser?: any; existingProfile?: any }> {
    try {
      // Check if email exists in auth.users
      const { data: existingAuthUser } = await supabaseAdmin.auth.admin.listUsers();
      const existingUser = existingAuthUser.users.find((user: any) => user.email === email);
      
      // Also check if profile already exists
      let existingProfile = null;
      if (existingUser) {
        const { data: profile } = await supabaseAdmin
          .from('profiles')
          .select('*')
          .eq('user_id', existingUser.id)
          .maybeSingle();
        existingProfile = profile;
      }
      
      return {
        available: !existingUser,
        existingUser: existingUser || null,
        existingProfile: existingProfile
      };
    } catch (error) {
      console.error('Error checking email availability:', error);
      return { available: false };
    }
  }

  /**
   * Create a new staff member (security or caretaker) with property assignments
   */
  static async createStaffMember(
    landlordId: string,
    staffData: CreateStaffData
  ): Promise<StaffCreationResult> {
    try {
      console.log('🚀 Starting staff creation...', staffData);

      // Check email availability
      const emailCheck = await this.checkEmailAvailability(staffData.email);
      if (!emailCheck.available) {
        // If user exists but no profile, we can still create a profile
        if (emailCheck.existingUser && !emailCheck.existingProfile) {
          // Use existing auth user but create new profile
          const { data: profile, error: profileError } = await supabaseAdmin
            .from('profiles')
            .insert({
              user_id: emailCheck.existingUser.id,
              role: staffData.role,
              first_name: staffData.first_name,
              last_name: staffData.last_name,
              phone: staffData.phone
            })
            .select()
            .single();

          if (profileError) {
            return {
              success: false,
              error: `Failed to create profile: ${profileError.message}`
            };
          }

          // Create property assignments (if table exists)
          try {
            const assignments = staffData.property_ids.map(propertyId => ({
              staff_id: profile.id,
              property_id: propertyId,
              role: staffData.role,
              assigned_by: landlordId,
              notes: staffData.notes
            }));

            const { error: assignmentError } = await supabaseAdmin
              .from('staff_assignments')
              .insert(assignments);

            if (assignmentError) {
              // If table doesn't exist, still return success but with a warning
              if (assignmentError.message.includes('relation "public.staff_assignments" does not exist')) {
                console.warn('staff_assignments table does not exist. Property assignments not created.');
                return {
                  success: true,
                  profile_id: profile.id,
                  auth_user_id: emailCheck.existingUser.id,
                  email: staffData.email,
                  password: 'Use existing account - password reset required',
                  role: staffData.role,
                  assigned_properties: staffData.property_ids,
                  warning: 'Property assignments not created - database migration needed'
                };
              }
              return {
                success: false,
                error: `Failed to create property assignments: ${assignmentError.message}`
              };
            }
          } catch (err) {
            console.warn('Could not create property assignments:', err);
            return {
              success: true,
              profile_id: profile.id,
              auth_user_id: emailCheck.existingUser.id,
              email: staffData.email,
              password: 'Use existing account - password reset required',
              role: staffData.role,
              assigned_properties: staffData.property_ids,
              warning: 'Property assignments not created - database migration needed'
            };
          }

          return {
            success: true,
            profile_id: profile.id,
            auth_user_id: emailCheck.existingUser.id,
            email: staffData.email,
            password: 'Use existing account - password reset required',
            role: staffData.role,
            assigned_properties: staffData.property_ids
          };
        } else {
          return {
            success: false,
            error: 'An account with this email already exists and has a profile'
          };
        }
      }

      // Generate memorable password based on staff member's name
      const password = this.generateRandomPassword(staffData.first_name, staffData.last_name);

      // Create auth user
      console.log('1. Creating auth user...');
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: staffData.email,
        password: password,
        email_confirm: true,
        user_metadata: {
          first_name: staffData.first_name,
          last_name: staffData.last_name,
          role: staffData.role
        }
      });

      if (authError) {
        console.error('Error creating auth user:', authError);
        return {
          success: false,
          error: `Failed to create user account: ${authError.message}`
        };
      }

      if (!authData.user) {
        return {
          success: false,
          error: 'Failed to create user account'
        };
      }

      console.log('✅ Auth user created:', authData.user.id);

      // Create or update profile
      console.log('2. Creating/updating profile...');
      
      // First, try to get existing profile (in case trigger created one)
      const { data: existingProfile } = await supabaseAdmin
        .from('profiles')
        .select('*')
        .eq('user_id', authData.user.id)
        .maybeSingle();

      let profile;
      if (existingProfile) {
        // Update existing profile
        const { data: updatedProfile, error: updateError } = await supabaseAdmin
          .from('profiles')
          .update({
            role: staffData.role,
            first_name: staffData.first_name,
            last_name: staffData.last_name,
            phone: staffData.phone
          })
          .eq('user_id', authData.user.id)
          .select()
          .single();

        if (updateError) {
          await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
          return {
            success: false,
            error: `Failed to update profile: ${updateError.message}`
          };
        }
        profile = updatedProfile;
      } else {
        // Create new profile
        const { data: newProfile, error: profileError } = await supabaseAdmin
          .from('profiles')
          .insert({
            user_id: authData.user.id,
            role: staffData.role,
            first_name: staffData.first_name,
            last_name: staffData.last_name,
            phone: staffData.phone
          })
          .select()
          .single();

        if (profileError) {
          // Clean up auth user if profile creation fails
          await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
          return {
            success: false,
            error: `Failed to create profile: ${profileError.message}`
          };
        }
        profile = newProfile;
      }

      console.log('✅ Profile created:', profile.id);

      // Create property assignments (if table exists)
      console.log('3. Creating property assignments...');
      try {
        const assignments = staffData.property_ids.map(propertyId => ({
          staff_id: profile.id,
          property_id: propertyId,
          role: staffData.role,
          assigned_by: landlordId,
          notes: staffData.notes
        }));

        const { error: assignmentError } = await supabaseAdmin
          .from('staff_assignments')
          .insert(assignments);

        if (assignmentError) {
          // If table doesn't exist, still return success but with a warning
          if (assignmentError.message.includes('relation "public.staff_assignments" does not exist')) {
            console.warn('staff_assignments table does not exist. Property assignments not created.');
            return {
              success: true,
              profile_id: profile.id,
              auth_user_id: authData.user.id,
              email: staffData.email,
              password: password,
              role: staffData.role,
              assigned_properties: staffData.property_ids,
              warning: 'Property assignments not created - database migration needed'
            };
          }
          console.error('Error creating assignments:', assignmentError);
          // Clean up auth user and profile
          await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
          await supabaseAdmin.from('profiles').delete().eq('id', profile.id);
          return {
            success: false,
            error: `Failed to create property assignments: ${assignmentError.message}`
          };
        }

        console.log('✅ Property assignments created');
      } catch (err) {
        console.warn('Could not create property assignments:', err);
        return {
          success: true,
          profile_id: profile.id,
          auth_user_id: authData.user.id,
          email: staffData.email,
          password: password,
          role: staffData.role,
          assigned_properties: staffData.property_ids,
          warning: 'Property assignments not created - database migration needed'
        };
      }

      return {
        success: true,
        profile_id: profile.id,
        auth_user_id: authData.user.id,
        email: staffData.email,
        password: password,
        role: staffData.role,
        assigned_properties: staffData.property_ids
      };

    } catch (error) {
      console.error('Error in staff creation:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Get staff members for a landlord
   */
  static async getStaffMembers(landlordId: string): Promise<any[]> {
    try {
      // Check if staff_assignments table exists
      const { data, error } = await supabaseAdmin
        .from('staff_assignments')
        .select(`
          *,
          staff:profiles!staff_assignments_staff_id_fkey (
            id,
            first_name,
            last_name,
            phone,
            role,
            created_at,
            user_id
          ),
          property:properties!staff_assignments_property_id_fkey (
            id,
            name,
            address
          )
        `)
        .eq('assigned_by', landlordId)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) {
        // If table doesn't exist, return empty array for now
        if (error.message.includes('relation "public.staff_assignments" does not exist')) {
          console.log('staff_assignments table does not exist yet. Please run the database migration.');
          return [];
        }
        throw error;
      }

      // Group by staff member to avoid duplicates
      const staffMap = new Map();
      for (const assignment of data || []) {
        const staffId = assignment.staff_id;
        if (!staffMap.has(staffId)) {
          // Get email from auth user
          const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(assignment.staff.user_id);
          staffMap.set(staffId, {
            ...assignment.staff,
            email: authUser?.user?.email || 'No email',
            assignments: []
          });
        }
        staffMap.get(staffId).assignments.push({
          property_id: assignment.property_id,
          property_name: assignment.property.name,
          property_address: assignment.property.address,
          assigned_at: assignment.assigned_at,
          notes: assignment.notes
        });
      }

      return Array.from(staffMap.values());
    } catch (error) {
      console.error('Error fetching staff members:', error);
      return [];
    }
  }

  /**
   * Deactivate staff member (soft delete)
   */
  static async deactivateStaffMember(staffId: string, landlordId: string): Promise<boolean> {
    try {
      const { error } = await supabaseAdmin
        .from('staff_assignments')
        .update({ is_active: false })
        .eq('staff_id', staffId)
        .eq('assigned_by', landlordId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error deactivating staff member:', error);
      return false;
    }
  }

  /**
   * Reset staff member password (same as tenant system)
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
   * Update staff member information and assignments
   */
  static async updateStaffMember(
    staffId: string,
    landlordId: string,
    updateData: {
      first_name?: string;
      last_name?: string;
      phone?: string;
      role?: 'security' | 'caretaker';
      email?: string;
      property_ids?: string[];
      notes?: string;
    }
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Get current staff member data
      const staffMember = await this.getStaffMemberById(staffId, landlordId);
      if (!staffMember) {
        return { success: false, error: 'Staff member not found' };
      }

      // Update profile information if provided
      const profileUpdates: any = {};
      if (updateData.first_name !== undefined) profileUpdates.first_name = updateData.first_name;
      if (updateData.last_name !== undefined) profileUpdates.last_name = updateData.last_name;
      if (updateData.phone !== undefined) profileUpdates.phone = updateData.phone;
      if (updateData.role !== undefined) profileUpdates.role = updateData.role;

      if (Object.keys(profileUpdates).length > 0) {
        const { error: profileError } = await supabaseAdmin
          .from('profiles')
          .update(profileUpdates)
          .eq('id', staffId);

        if (profileError) {
          return { success: false, error: `Failed to update profile: ${profileError.message}` };
        }

        // Update user metadata in auth if role or name changed
        if (updateData.role !== undefined || updateData.first_name !== undefined || updateData.last_name !== undefined) {
          const userMetadata: any = {};
          if (updateData.first_name !== undefined) userMetadata.first_name = updateData.first_name;
          if (updateData.last_name !== undefined) userMetadata.last_name = updateData.last_name;
          if (updateData.role !== undefined) userMetadata.role = updateData.role;

          await supabaseAdmin.auth.admin.updateUserById(staffMember.user_id, {
            user_metadata: userMetadata
          });
        }
      }

      // Update email if provided
      if (updateData.email && updateData.email !== staffMember.email) {
        const { error: emailError } = await supabaseAdmin.auth.admin.updateUserById(staffMember.user_id, {
          email: updateData.email
        });

        if (emailError) {
          return { success: false, error: `Failed to update email: ${emailError.message}` };
        }
      }

      // Update property assignments if provided
      if (updateData.property_ids !== undefined) {
        // Deactivate old assignments
        const { error: deactivateError } = await supabaseAdmin
          .from('staff_assignments')
          .update({ is_active: false })
          .eq('staff_id', staffId)
          .eq('assigned_by', landlordId);

        if (deactivateError) {
          console.error('Error deactivating old assignments:', deactivateError);
          // Continue anyway, we'll try to create new ones
        }

        // Create new assignments
        if (updateData.property_ids.length > 0) {
          const newAssignments = updateData.property_ids.map(propertyId => ({
            staff_id: staffId,
            property_id: propertyId,
            role: updateData.role || staffMember.role,
            assigned_by: landlordId,
            notes: updateData.notes || null,
            is_active: true
          }));

          const { error: assignmentError } = await supabaseAdmin
            .from('staff_assignments')
            .insert(newAssignments);

          if (assignmentError) {
            // If assignments table doesn't exist, that's okay
            if (!assignmentError.message.includes('relation "public.staff_assignments" does not exist')) {
              return { success: false, error: `Failed to update assignments: ${assignmentError.message}` };
            }
          }
        }
      } else if (updateData.notes !== undefined) {
        // If only notes are updated, update all active assignments
        const { error: notesError } = await supabaseAdmin
          .from('staff_assignments')
          .update({ notes: updateData.notes })
          .eq('staff_id', staffId)
          .eq('assigned_by', landlordId)
          .eq('is_active', true);

        if (notesError && !notesError.message.includes('relation "public.staff_assignments" does not exist')) {
          console.error('Error updating notes:', notesError);
        }
      }

      return { success: true };
    } catch (error) {
      console.error('Error updating staff member:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Get staff member by ID for editing
   */
  static async getStaffMemberById(staffId: string, landlordId: string) {
    try {
      // Get staff member through assignments (handles multiple property assignments)
      const { data: assignmentData, error: assignmentError } = await supabaseAdmin
        .from('staff_assignments')
        .select(`
          *,
          staff:profiles!staff_assignments_staff_id_fkey (
            id,
            first_name,
            last_name,
            phone,
            role,
            created_at,
            user_id
          )
        `)
        .eq('staff_id', staffId)
        .eq('assigned_by', landlordId)
        .eq('is_active', true)
        .limit(1);

      if (assignmentError || !assignmentData || assignmentData.length === 0) {
        // If no active assignments, try to get the staff profile directly
        const { data: profileData, error: profileError } = await supabaseAdmin
          .from('profiles')
          .select('id, first_name, last_name, phone, role, created_at, user_id')
          .eq('id', staffId)
          .in('role', ['security', 'caretaker'])
          .single();

        if (profileError || !profileData) {
          console.error('Error fetching staff member:', assignmentError || profileError || 'Staff member not found');
          return null;
        }

        // Get email from auth user
        const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(profileData.user_id);
        
        return {
          ...profileData,
          email: authUser?.user?.email || 'No email',
          assignments: []
        };
      }

      // Get email from auth user
      const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(assignmentData[0].staff.user_id);
      
      // Get all assignments for this staff member (not just one)
      const { data: allAssignments } = await supabaseAdmin
        .from('staff_assignments')
        .select(`
          *,
          property:properties!staff_assignments_property_id_fkey (
            id,
            name,
            address
          )
        `)
        .eq('staff_id', staffId)
        .eq('assigned_by', landlordId)
        .eq('is_active', true);

      return {
        ...assignmentData[0].staff,
        email: authUser?.user?.email || 'No email',
        assignments: (allAssignments || []).map((assignment: any) => ({
          property_id: assignment.property_id,
          property_name: assignment.property?.name || 'Unknown',
          property_address: assignment.property?.address || 'Unknown',
          assigned_at: assignment.assigned_at,
          notes: assignment.notes
        }))
      };
    } catch (error) {
      console.error('Error fetching staff member:', error);
      return null;
    }
  }
}
