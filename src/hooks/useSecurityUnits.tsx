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

      // Get all tenant profiles with active leases
      const { data: tenantsData, error: tenantsError } = await supabase
        .from('profiles')
        .select(`
          id,
          first_name,
          last_name,
          phone
        `)
        .eq('role', 'tenant');

      if (tenantsError) throw tenantsError;

      if (!tenantsData || tenantsData.length === 0) {
        setAvailableTenants([]);
        return;
      }

      // Get active leases for these tenants
      const tenantIds = tenantsData.map(t => t.id);
      const { data: leasesData, error: leasesError } = await supabase
        .from('leases')
        .select(`
          id,
          start_date,
          end_date,
          tenant_id,
          unit_id
        `)
        .eq('status', 'active')
        .in('tenant_id', tenantIds);

      if (leasesError) throw leasesError;

      if (!leasesData || leasesData.length === 0) {
        setAvailableTenants([]);
        return;
      }

      // Get unique unit IDs
      const unitIds = [...new Set(leasesData.map(lease => lease.unit_id))];

      // Fetch units and properties
      const { data: unitsData, error: unitsError } = await supabase
        .from('units')
        .select(`
          id,
          unit_number,
          property_id,
          properties (
            id,
            name,
            address
          )
        `)
        .in('id', unitIds);

      if (unitsError) throw unitsError;

      // Combine the data - tenant-centric
      const availableTenantsData: AvailableTenant[] = leasesData.map((lease: any) => {
        const tenant = tenantsData.find(t => t.id === lease.tenant_id);
        const unit = unitsData?.find(u => u.id === lease.unit_id);
        const property = unit?.properties;

        return {
          tenant_id: tenant?.id || '',
          tenant_name: tenant ? `${tenant.first_name} ${tenant.last_name}`.trim() : '',
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
      }).filter(tenant => tenant.tenant_id && tenant.unit_id); // Filter out incomplete data

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