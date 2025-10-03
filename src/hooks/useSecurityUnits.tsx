import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';

export interface AvailableTenant {
  tenant_id: string;
  tenant_name: string;
  tenant_phone?: string;
  unit_id: string;
  unit_number: string;
  property_id: string;
  property_name: string;
  property_address: string;
  lease_id: string;
  lease_start: string;
  lease_end: string;
}

export const useSecurityUnits = () => {
  const [availableTenants, setAvailableTenants] = useState<AvailableTenant[]>([]);
  const [loading, setLoading] = useState(true);
  const { profile } = useAuth();
  const { toast } = useToast();

  const fetchAvailableTenants = async () => {
    if (!profile?.id || profile.role !== 'security') {
      console.log('Security tenants fetch skipped - profile:', profile?.role, 'id:', profile?.id);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      console.log('Fetching available tenants for security role...');

      // Get active leases with tenant info and units
      const { data: leasesData, error: leasesError } = await supabase
        .from('leases')
        .select(`
          id,
          start_date,
          end_date,
          tenant_id,
          tenant_info_id,
          unit_id,
          units (
            id,
            unit_number,
            property_id,
            properties (
              id,
              name,
              address
            )
          )
        `)
        .eq('status', 'active');

      if (leasesError) throw leasesError;

      if (!leasesData || leasesData.length === 0) {
        console.log('No active leases found');
        setAvailableTenants([]);
        return;
      }

      console.log('Found active leases:', leasesData.length);

      // Get tenant profile IDs from leases (need to check both tenant_id and tenant_info)
      const profileIds = new Set<string>();
      const tenantInfoIds = new Set<string>();

      leasesData.forEach((lease: any) => {
        if (lease.tenant_id) {
          profileIds.add(lease.tenant_id);
        }
        if (lease.tenant_info_id) {
          tenantInfoIds.add(lease.tenant_info_id);
        }
      });

      // Fetch profiles directly referenced
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, phone, role')
        .in('id', Array.from(profileIds));

      if (profilesError) throw profilesError;

      // Fetch tenant_info records and their associated profiles
      const { data: tenantInfoData, error: tenantInfoError } = await supabase
        .from('tenant_info')
        .select('id, first_name, last_name, phone, profile_id')
        .in('id', Array.from(tenantInfoIds));

      if (tenantInfoError) throw tenantInfoError;

      // Get profile IDs from tenant_info
      const tenantInfoProfileIds = tenantInfoData?.map(ti => ti.profile_id).filter(Boolean) || [];
      
      // Fetch profiles for tenant_info records
      const { data: tenantInfoProfilesData, error: tenantInfoProfilesError } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, phone, role')
        .in('id', tenantInfoProfileIds);

      if (tenantInfoProfilesError) throw tenantInfoProfilesError;

      console.log('Profiles from direct reference:', profilesData?.length || 0);
      console.log('Tenant info records:', tenantInfoData?.length || 0);
      console.log('Profiles from tenant_info:', tenantInfoProfilesData?.length || 0);

      // Combine the data - tenant-centric
      const availableTenantsData: AvailableTenant[] = leasesData.map((lease: any) => {
        // Try to find tenant profile directly first
        let tenant = profilesData?.find(p => p.id === lease.tenant_id && p.role === 'tenant');
        
        // If not found, try through tenant_info
        if (!tenant && lease.tenant_info_id) {
          const tenantInfo = tenantInfoData?.find(ti => ti.id === lease.tenant_info_id);
          if (tenantInfo) {
            // Use tenant_info data if available
            tenant = {
              id: tenantInfo.profile_id || lease.tenant_id,
              first_name: tenantInfo.first_name,
              last_name: tenantInfo.last_name,
              phone: tenantInfo.phone,
              role: 'tenant'
            };
            
            // Enhance with profile data if available
            const profile = tenantInfoProfilesData?.find(p => p.id === tenantInfo.profile_id);
            if (profile) {
              tenant = {
                ...tenant,
                first_name: profile.first_name || tenant.first_name,
                last_name: profile.last_name || tenant.last_name,
                phone: profile.phone || tenant.phone
              };
            }
          }
        }

        const unit = lease.units;
        const property = unit?.properties;

        if (!tenant || !unit) {
          console.log('Missing data for lease:', lease.id, 'tenant:', !!tenant, 'unit:', !!unit);
        }

        return {
          tenant_id: tenant?.id || lease.tenant_id,
          tenant_name: tenant ? `${tenant.first_name || ''} ${tenant.last_name || ''}`.trim() : 'Unknown Tenant',
          tenant_phone: tenant?.phone,
          unit_id: unit?.id || '',
          unit_number: unit?.unit_number || '',
          property_id: property?.id || '',
          property_name: property?.name || '',
          property_address: property?.address || '',
          lease_id: lease.id,
          lease_start: lease.start_date,
          lease_end: lease.end_date
        };
      }).filter(tenant => tenant.unit_id && tenant.tenant_name !== 'Unknown Tenant'); // Filter out incomplete data

      // Sort by tenant name
      availableTenantsData.sort((a, b) => 
        a.tenant_name.localeCompare(b.tenant_name)
      );

      console.log('Processed available tenants:', availableTenantsData.length, 'tenants');
      setAvailableTenants(availableTenantsData);
    } catch (error) {
      console.error('Error fetching available tenants:', error);
      toast({
        title: "Error",
        description: `Failed to load available tenants: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAvailableTenants();

    // Set up real-time subscription for lease changes
    const channel = supabase
      .channel('available_tenants_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'leases'
        },
        () => {
          console.log('Lease changed, refetching available tenants...');
          fetchAvailableTenants();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.id, profile?.role]);

  // Group tenants by property for better organization
  const getGroupedUnits = () => {
    const grouped = availableTenants.reduce((acc, tenant) => {
      if (!acc[tenant.property_name]) {
        acc[tenant.property_name] = [];
      }
      acc[tenant.property_name].push(tenant);
      return acc;
    }, {} as Record<string, AvailableTenant[]>);

    return grouped;
  };

  // Search function for filtering tenants
  const searchUnits = (searchTerm: string) => {
    if (!searchTerm) return availableTenants;

    const term = searchTerm.toLowerCase();
    return availableTenants.filter(tenant =>
      tenant.tenant_name.toLowerCase().includes(term) ||
      tenant.unit_number.toLowerCase().includes(term) ||
      tenant.property_name.toLowerCase().includes(term) ||
      tenant.property_address.toLowerCase().includes(term) ||
      tenant.tenant_phone?.toLowerCase().includes(term)
    );
  };

  return {
    occupiedUnits: availableTenants, // Keep same property name for backward compatibility
    loading,
    getGroupedUnits,
    searchUnits,
    refetch: fetchAvailableTenants
  };
};