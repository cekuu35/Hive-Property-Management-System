import { useState, useEffect } from 'react';
import { useAuth } from './useAuth';
import { TenantCreationService, CreateTenantData } from '@/services/tenantCreationService';
import { toast } from '@/hooks/use-toast';

export interface LandlordTenant {
  id: string;
  rent_amount: number;
  security_deposit: number;
  status: string;
  lease_start_date: string;
  lease_end_date: string;
  created_at: string;
  tenant_info: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
    tenant_status: string;
    current_balance: number;
    payment_status: string;
  };
  units?: {
    id: string;
    unit_number: string;
    properties?: {
      id: string;
      name: string;
      address: string;
    };
  };
}

export const useLandlordTenants = () => {
  const { profile } = useAuth();
  const [tenants, setTenants] = useState<LandlordTenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTenants = async () => {
    if (!profile?.id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const tenantsData = await TenantCreationService.getTenantsForLandlord(profile.id);
      setTenants(tenantsData);
    } catch (err) {
      console.error('Error fetching tenants:', err);
      setError('Failed to load tenants');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTenants();
  }, [profile?.id]);

  const createTenant = async (tenantData: CreateTenantData) => {
    if (!profile?.id) {
      toast({
        title: "Error",
        description: "Landlord profile not found",
        variant: "destructive",
      });
      return { success: false };
    }

    try {
      const result = await TenantCreationService.createTenant(profile.id, tenantData);
      
      if (result.success) {
        // Refresh tenants list
        await fetchTenants();
        
        toast({
          title: "Success",
          description: "Tenant created successfully!",
        });
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to create tenant",
          variant: "destructive",
        });
      }

      return result;
    } catch (err) {
      console.error('Error creating tenant:', err);
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
      return { success: false, error: 'Unknown error occurred' };
    }
  };

  const updateTenant = async (tenantId: string, updates: Partial<CreateTenantData>) => {
    try {
      const result = await TenantCreationService.updateTenant(tenantId, updates);
      
      if (result.success) {
        // Refresh tenants list
        await fetchTenants();
        
        toast({
          title: "Success",
          description: "Tenant updated successfully!",
        });
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to update tenant",
          variant: "destructive",
        });
      }

      return result;
    } catch (err) {
      console.error('Error updating tenant:', err);
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
      return { success: false, error: 'Unknown error occurred' };
    }
  };

  const deleteTenant = async (tenantId: string) => {
    try {
      const result = await TenantCreationService.deleteTenant(tenantId);
      
      if (result.success) {
        // Refresh tenants list
        await fetchTenants();
        
        toast({
          title: "Success",
          description: "Tenant deleted successfully!",
        });
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to delete tenant",
          variant: "destructive",
        });
      }

      return result;
    } catch (err) {
      console.error('Error deleting tenant:', err);
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
      return { success: false, error: 'Unknown error occurred' };
    }
  };

  // Filter tenants by status
  const getTenantsByStatus = (status: string) => {
    return tenants.filter(tenant => tenant.status === status);
  };

  // Get active tenants
  const activeTenants = getTenantsByStatus('active');
  const pendingTenants = getTenantsByStatus('pending');
  const terminatedTenants = getTenantsByStatus('terminated');

  // Calculate total monthly rent
  const totalMonthlyRent = activeTenants.reduce((sum, tenant) => sum + tenant.rent_amount, 0);

  // Calculate total security deposits
  const totalSecurityDeposits = activeTenants.reduce((sum, tenant) => sum + tenant.security_deposit, 0);

  return {
    tenants,
    loading,
    error,
    activeTenants,
    pendingTenants,
    terminatedTenants,
    totalMonthlyRent,
    totalSecurityDeposits,
    createTenant,
    updateTenant,
    deleteTenant,
    refetch: fetchTenants
  };
};
