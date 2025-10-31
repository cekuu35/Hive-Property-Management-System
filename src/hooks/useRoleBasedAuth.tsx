import { useState, useEffect } from 'react';
import { useAuth } from './useAuth';
import { supabase } from '@/integrations/supabase/client';

export interface UserRole {
  role: 'landlord' | 'tenant' | 'caretaker' | 'security' | 'admin';
  isTenant: boolean;
  tenantData?: any;
  profileData?: any;
}

export const useRoleBasedAuth = () => {
  const { user, profile, loading: authLoading } = useAuth();
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const determineUserRole = async () => {
    if (!user?.id) {
      setUserRole(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Wait for profile to be loaded if not available yet
      if (!profile?.id && authLoading) {
        setLoading(true);
        return; // Wait for profile to load
      }

      // If we have a profile, check if this user has a tenant record
      // Use profile.id instead of user.id because tenant_info.profile_id references profiles.id
      if (profile?.id) {
        const { data: tenantData, error: tenantError } = await supabase
          .from('tenant_info')
          .select('*')
          .eq('profile_id', profile.id)
          .maybeSingle();

        if (tenantError) {
          console.error('Error fetching tenant data:', tenantError);
          // Don't throw error, continue to check profile role
        }
        
        if (tenantData) {
          // User is a tenant
          setUserRole({
            role: 'tenant',
            isTenant: true,
            tenantData: tenantData,
            profileData: profile
          });
          setLoading(false);
          return;
        }
      }

      // If not a tenant, check the profile role
      if (profile?.role) {
        setUserRole({
          role: profile.role as any,
          isTenant: false,
          profileData: profile
        });
        setLoading(false);
        return;
      }

      // If no role found and no profile, wait a bit more or set error
      if (!profile) {
        setError('Profile not found. Please complete your profile setup.');
        setUserRole(null);
        setLoading(false);
        return;
      }

      // Default fallback (shouldn't reach here normally)
      setUserRole({
        role: 'tenant',
        isTenant: false,
        tenantData: null,
        profileData: profile
      });
      setLoading(false);

    } catch (err) {
      console.error('Error determining user role:', err);
      setError(err instanceof Error ? err.message : 'Failed to determine user role');
      setUserRole(null);
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading) {
      determineUserRole();
    }
  }, [user?.id, profile?.id, profile?.role, authLoading]);

  const switchToTenantRole = async () => {
    if (!user?.id || !profile?.id) return false;

    try {
      // Check if user has tenant data using profile.id
      const { data: tenantData, error } = await supabase
        .from('tenant_info')
        .select('*')
        .eq('profile_id', profile.id)
        .maybeSingle();
      
      if (error) {
        console.error('Error fetching tenant data:', error);
        return false;
      }
      
      if (tenantData) {
        setUserRole({
          role: 'tenant',
          isTenant: true,
          tenantData: tenantData,
          profileData: profile
        });
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Error switching to tenant role:', error);
      return false;
    }
  };

  const switchToProfileRole = () => {
    if (profile?.role) {
      setUserRole({
        role: profile.role as any,
        isTenant: false,
        tenantData: null,
        profileData: profile
      });
      return true;
    }
    return false;
  };

  return {
    userRole,
    loading: loading || authLoading,
    error,
    switchToTenantRole,
    switchToProfileRole,
    refetch: determineUserRole
  };
};
