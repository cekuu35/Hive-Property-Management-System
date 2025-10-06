import { useState, useEffect } from 'react';
import { useAuth } from './useAuth';
import { supabase } from '@/integrations/supabase/client';
import { SimpleTenantCreationService } from '@/services/simpleTenantCreationService';

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

      // First, check if this user has a tenant record
      const tenantData = await SimpleTenantCreationService.getTenantByAuthUser(user.id);
      
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

      // If no role found, default to tenant if they have tenant data
      setUserRole({
        role: 'tenant',
        isTenant: true,
        tenantData: null,
        profileData: profile
      });

    } catch (err) {
      console.error('Error determining user role:', err);
      setError('Failed to determine user role');
      setUserRole(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    determineUserRole();
  }, [user?.id, profile?.role]);

  const switchToTenantRole = async () => {
    if (!user?.id) return false;

    try {
      // Check if user has tenant data
      const tenantData = await SimpleTenantCreationService.getTenantByAuthUser(user.id);
      
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
