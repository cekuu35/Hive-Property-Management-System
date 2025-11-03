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

      // Use the RPC function to get units and tenants for assigned properties
      console.log('Calling RPC function get_security_assigned_units_and_tenants with profile:', profile?.id);
      const { data: unitsData, error: rpcError } = await supabase
        .rpc('get_security_assigned_units_and_tenants');

      if (rpcError) {
        console.error('RPC function error:', rpcError);
        console.error('Error details:', {
          message: rpcError.message,
          details: rpcError.details,
          hint: rpcError.hint,
          code: rpcError.code
        });
        toast({
          title: "Error Loading Units",
          description: `Failed to load units: ${rpcError.message}`,
          variant: "destructive"
        });
        throw rpcError;
      }

      console.log('RPC function returned:', unitsData?.length || 0, 'units');
      console.log('Sample unit data:', unitsData?.slice(0, 2));

      if (!unitsData || unitsData.length === 0) {
        console.log('No units found via RPC function - checking staff assignments...');
        // Debug: Check if security user has assignments
        const { data: assignments } = await supabase
          .from('staff_assignments')
          .select('property_id, role, is_active')
          .eq('staff_id', profile.id)
          .eq('role', 'security')
          .eq('is_active', true);
        console.log('Staff assignments for current user:', assignments);
        
        if (!assignments || assignments.length === 0) {
          toast({
            title: "No Property Assignments",
            description: "You need to be assigned to properties to view units. Contact your administrator.",
            variant: "default"
          });
        }
        setAvailableTenants([]);
        return;
      }

      // Get all unit IDs
      const unitIds = unitsData.map(u => u.unit_id).filter(Boolean);
      
      if (unitIds.length === 0) {
        setAvailableTenants([]);
        return;
      }

      // Batch fetch leases for all units
      const { data: leasesData, error: leasesError } = await supabase
        .from('leases')
        .select('id, start_date, end_date, tenant_id, tenant_info_id, unit_id')
        .eq('status', 'active')
        .in('unit_id', unitIds);

      if (leasesError) {
        console.error('Error fetching leases:', leasesError);
        console.error('Lease query details:', {
          unitIds: unitIds.length,
          error: leasesError.message
        });
        toast({
          title: "Error Loading Leases",
          description: `Failed to load lease information: ${leasesError.message}`,
          variant: "destructive"
        });
        throw leasesError;
      }

      console.log('Found leases:', leasesData?.length || 0);

      // Batch fetch property information
      const propertyIds = [...new Set(unitsData.map(u => u.property_id).filter(Boolean))];
      const { data: propertiesData } = await supabase
        .from('properties')
        .select('id, name, address')
        .in('id', propertyIds);

      // Create a map for quick lookup
      const leasesByUnitId = new Map(
        (leasesData || []).map(l => [l.unit_id, l])
      );
      const propertiesById = new Map(
        (propertiesData || []).map(p => [p.id, p])
      );

      // Transform RPC data to match AvailableTenant interface
      const availableTenantsData: AvailableTenant[] = [];

      for (const unit of unitsData) {
        const lease = leasesByUnitId.get(unit.unit_id);
        if (!lease) {
          console.log('No active lease found for unit:', unit.unit_id);
          continue;
        }

        const property = propertiesById.get(unit.property_id);

        // Process tenants from the JSONB array
        const tenants = (unit.tenants as any[]) || [];
        
        if (tenants.length === 0) {
          // If no tenants in array, still include the unit if it has tenant_id in lease
          if (lease.tenant_id) {
            availableTenantsData.push({
              tenant_id: lease.tenant_id,
              tenant_name: 'Unknown Tenant',
              tenant_phone: undefined,
              unit_id: unit.unit_id,
              unit_number: unit.unit_number || '',
              property_id: unit.property_id,
              property_name: property?.name || 'Unknown Property',
              property_address: property?.address || '',
              lease_id: lease.id,
              lease_start: lease.start_date,
              lease_end: lease.end_date
            });
          }
          continue;
        }

        // Create entry for each tenant
        for (const tenant of tenants) {
          if (tenant.tenant_id || tenant.tenant_info_id) {
            availableTenantsData.push({
              tenant_id: tenant.tenant_id || lease.tenant_id,
              tenant_name: tenant.tenant_name || 'Unknown Tenant',
              tenant_phone: tenant.tenant_phone,
              unit_id: unit.unit_id,
              unit_number: unit.unit_number || '',
              property_id: unit.property_id,
              property_name: property?.name || 'Unknown Property',
              property_address: property?.address || '',
              lease_id: lease.id,
              lease_start: lease.start_date,
              lease_end: lease.end_date
            });
          }
        }
      }

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