import { useState, useEffect } from 'react';
import { useAuth } from './useAuth';
import { StaffCreationService, CreateStaffData, StaffCreationResult } from '@/services/staffCreationService';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

// Re-export CreateStaffData for use in other components
export type { CreateStaffData };

export interface StaffMember {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  role: 'security' | 'caretaker';
  created_at: string;
  assignments: {
    property_id: string;
    property_name: string;
    property_address: string;
    assigned_at: string;
    notes?: string;
  }[];
}

export const useStaffMembers = () => {
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const { profile } = useAuth();
  const { toast } = useToast();

  const fetchStaffMembers = async () => {
    if (!profile?.id) return;

    try {
      setLoading(true);
      const staff = await StaffCreationService.getStaffMembers(profile.id);
      setStaffMembers(staff);
    } catch (error) {
      console.error('Error fetching staff members:', error);
      toast({
        title: 'Error',
        description: 'Failed to load staff members',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const createStaffMember = async (staffData: CreateStaffData): Promise<StaffCreationResult> => {
    if (!profile?.id) {
      return {
        success: false,
        error: 'Not authenticated'
      };
    }

    try {
      const result = await StaffCreationService.createStaffMember(profile.id, staffData);
      
      if (result.success) {
        // Refresh the staff list
        await fetchStaffMembers();
      }

      return result;
    } catch (error) {
      console.error('Error creating staff member:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive'
      });

      return {
        success: false,
        error: errorMessage
      };
    }
  };

  const deactivateStaffMember = async (staffId: string): Promise<boolean> => {
    if (!profile?.id) return false;

    try {
      const success = await StaffCreationService.deactivateStaffMember(staffId, profile.id);
      
      if (success) {
        await fetchStaffMembers();
        toast({
          title: 'Success',
          description: 'Staff member deactivated successfully',
        });
      } else {
        toast({
          title: 'Error',
          description: 'Failed to deactivate staff member',
          variant: 'destructive'
        });
      }

      return success;
    } catch (error) {
      console.error('Error deactivating staff member:', error);
      toast({
        title: 'Error',
        description: 'Failed to deactivate staff member',
        variant: 'destructive'
      });
      return false;
    }
  };

  const resetStaffPassword = async (staffId: string): Promise<{ success: boolean; password?: string; error?: string }> => {
    if (!profile?.id) return { success: false, error: 'Not authenticated' };

    try {
      // Get staff member details
      const staffMember = await StaffCreationService.getStaffMemberById(staffId, profile.id);
      if (!staffMember) {
        return { success: false, error: 'Staff member not found' };
      }

      // Generate new password
      const newPassword = StaffCreationService.generateRandomPassword();
      
      // Reset password
      const result = await StaffCreationService.resetPassword(staffMember.user_id, newPassword);
      
      if (result.success) {
        toast({
          title: 'Success',
          description: 'Password reset successfully',
        });
        return { success: true, password: newPassword };
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to reset password',
          variant: 'destructive'
        });
        return { success: false, error: result.error };
      }
    } catch (error) {
      console.error('Error resetting staff password:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive'
      });

      return { success: false, error: errorMessage };
    }
  };

  useEffect(() => {
    if (profile?.id) {
      fetchStaffMembers();

      // Set up real-time subscription for staff members
      const channel = supabase
        .channel('staff_members_changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'profiles',
            filter: `role=in.(security,caretaker)`
          },
          (payload) => {
            console.log('🔄 [useStaffMembers] Staff member change detected:', payload);
            // Refresh staff list when any staff member is added, updated, or deleted
            fetchStaffMembers();
          }
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'staff_assignments'
          },
          (payload) => {
            console.log('🔄 [useStaffMembers] Staff assignment change detected:', payload);
            // Refresh when staff assignments change
            fetchStaffMembers();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [profile?.id]);

  return {
    staffMembers,
    loading,
    createStaffMember,
    deactivateStaffMember,
    resetStaffPassword,
    refreshStaffMembers: fetchStaffMembers
  };
};
