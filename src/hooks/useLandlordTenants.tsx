import { useState, useEffect } from 'react';
import { useAuth } from './useAuth';
import { supabase } from '@/integrations/supabase/client';
import { CompleteTenantCreationService, CreateTenantData } from '@/services/completeTenantCreationService';
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
    console.log('🔄 Fetching tenants for landlord:', profile?.id);
    if (!profile?.id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Use the same approach as the existing useTenants hook
      // Query tenant_info table directly for this landlord
      const { data: tenantInfoData, error: tenantInfoError } = await supabase
        .from('tenant_info')
        .select(`
          id,
          first_name,
          last_name,
          email,
          phone,
          avatar_url,
          profile_id,
          tenant_status,
          current_balance,
          payment_status,
          emergency_contact_name,
          emergency_contact_phone,
          notes,
          created_at
        `)
        .eq('landlord_id', profile.id);

      if (tenantInfoError) {
        throw new Error(tenantInfoError.message);
      }

      if (!tenantInfoData || tenantInfoData.length === 0) {
        setTenants([]);
        return;
      }

      // Get tenant_info IDs
      const tenantInfoIds = tenantInfoData.map(t => t.id);

      // Fetch leases for these tenant_info records
      const { data: leasesData, error: leasesError } = await supabase
        .from('leases')
        .select(`
          id,
          tenant_info_id,
          unit_id,
          start_date,
          end_date,
          rent_amount,
          deposit_amount,
          status,
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
        .in('tenant_info_id', tenantInfoIds);

      if (leasesError) {
        console.error('Error fetching leases:', leasesError);
        // Continue without leases data
      }

      // Create a map of tenant_info_id to lease data
      const leaseMap = new Map();
      if (leasesData) {
        leasesData.forEach(lease => {
          leaseMap.set(lease.tenant_info_id, lease);
        });
      }

      // Transform the data to match the expected format
      const transformedTenants = tenantInfoData.map(tenant => {
        const lease = leaseMap.get(tenant.id);
        
        return {
          id: tenant.id,
          rent_amount: lease?.rent_amount || 0,
          security_deposit: lease?.deposit_amount || 0,
          status: lease?.status || tenant.tenant_status || 'pending',
          lease_start_date: lease?.start_date || '',
          lease_end_date: lease?.end_date || '',
          created_at: tenant.created_at,
          tenant_info: {
            id: tenant.id,
            first_name: tenant.first_name,
            last_name: tenant.last_name,
            email: tenant.email,
            phone: tenant.phone,
            tenant_status: tenant.tenant_status,
            current_balance: lease?.rent_amount || tenant.current_balance || 0,
            payment_status: tenant.payment_status || 'unpaid',
            profile_id: tenant.profile_id,
            emergency_contact_name: tenant.emergency_contact_name,
            emergency_contact_phone: tenant.emergency_contact_phone,
            notes: tenant.notes
          },
          units: lease?.units ? {
            id: lease.units.id,
            unit_number: lease.units.unit_number,
            type: lease.units.type,
            properties: lease.units.properties ? {
              id: lease.units.properties.id,
              name: lease.units.properties.name,
              address: lease.units.properties.address
            } : undefined
          } : undefined
        };
      });

      console.log('✅ Successfully fetched tenants:', transformedTenants.length);
      setTenants(transformedTenants);
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

  const createTenant = async (tenantData: any) => {
    if (!profile?.id) {
      toast({
        title: "Error",
        description: "Landlord profile not found",
        variant: "destructive",
      });
      return { success: false };
    }

    try {
      const result = await CompleteTenantCreationService.createTenant(profile.id, tenantData);
      
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
      console.log('🔄 Updating tenant:', tenantId, 'with updates:', updates);
      
      // Direct update to tenant_info table
      const { error: tenantInfoError } = await supabase
        .from('tenant_info')
        .update({
          first_name: updates.first_name,
          last_name: updates.last_name,
          phone: updates.phone,
          email: updates.email,
          emergency_contact_name: updates.emergency_contact_name,
          emergency_contact_phone: updates.emergency_contact_phone,
          notes: updates.notes
        })
        .eq('id', tenantId);

      if (tenantInfoError) throw tenantInfoError;

      // Update lease if relevant fields changed
      if (updates.rent_amount || updates.security_deposit || updates.lease_start_date || updates.lease_end_date) {
        const { error: leaseError } = await supabase
          .from('leases')
          .update({
            rent_amount: updates.rent_amount,
            deposit_amount: updates.security_deposit,
            start_date: updates.lease_start_date,
            end_date: updates.lease_end_date
          })
          .eq('tenant_info_id', tenantId);

        if (leaseError) throw leaseError;
      }
      
      // Refresh tenants list
      await fetchTenants();
      
      toast({
        title: "Success",
        description: "Tenant updated successfully!",
      });

      return { success: true };
    } catch (err: any) {
      console.error('Error updating tenant:', err);
      toast({
        title: "Error",
        description: err.message || "An unexpected error occurred",
        variant: "destructive",
      });
      return { success: false, error: err.message || 'Unknown error occurred' };
    }
  };

  const deleteTenant = async (tenantId: string) => {
    // TODO: Implement tenant deletion functionality
    toast({
      title: "Not Implemented", 
      description: "Tenant deletion functionality is not yet implemented",
      variant: "destructive",
    });
    return { success: false, error: 'Not implemented' };
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
