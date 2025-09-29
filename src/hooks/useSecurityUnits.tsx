import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';

export interface OccupiedUnit {
  unit_id: string;
  unit_number: string;
  property_id: string;
  property_name: string;
  property_address: string;
  tenant_id: string;
  tenant_name: string;
  tenant_phone?: string;
  lease_id: string;
  lease_start: string;
  lease_end: string;
}

export const useSecurityUnits = () => {
  const [occupiedUnits, setOccupiedUnits] = useState<OccupiedUnit[]>([]);
  const [loading, setLoading] = useState(true);
  const { profile } = useAuth();
  const { toast } = useToast();

  const fetchOccupiedUnits = async () => {
    if (!profile?.id || profile.role !== 'security') {
      console.log('Security units fetch skipped - profile:', profile?.role, 'id:', profile?.id);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      console.log('Fetching occupied units for security role...');

      // Get all active leases and then fetch related data separately to avoid foreign key issues
      const { data: leasesData, error: leasesError } = await supabase
        .from('leases')
        .select(`
          id,
          start_date,
          end_date,
          tenant_id,
          unit_id
        `)
        .eq('status', 'active');

<<<<<<< HEAD
      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }

      console.log('Fetched leases data:', data?.length || 0, 'records');
=======
      if (leasesError) throw leasesError;
>>>>>>> 4453c64c2507ef7905cb781f221364059762c8f8

      if (!leasesData || leasesData.length === 0) {
        setOccupiedUnits([]);
        return;
      }

      // Get unique unit IDs and tenant IDs
      const unitIds = [...new Set(leasesData.map(lease => lease.unit_id))];
      const tenantIds = [...new Set(leasesData.map(lease => lease.tenant_id))];

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

      // Fetch tenant profiles
      const { data: tenantsData, error: tenantsError } = await supabase
        .from('profiles')
        .select(`
          id,
          first_name,
          last_name,
          phone
        `)
        .in('id', tenantIds);

      if (tenantsError) throw tenantsError;

      // Combine the data
      const occupiedUnitsData: OccupiedUnit[] = leasesData.map((lease: any) => {
        const unit = unitsData?.find(u => u.id === lease.unit_id);
        const tenant = tenantsData?.find(t => t.id === lease.tenant_id);
        const property = unit?.properties;

        return {
          unit_id: unit?.id || '',
          unit_number: unit?.unit_number || '',
          property_id: property?.id || '',
          property_name: property?.name || '',
          property_address: property?.address || '',
          tenant_id: tenant?.id || '',
          tenant_name: tenant ? `${tenant.first_name} ${tenant.last_name}`.trim() : '',
          tenant_phone: tenant?.phone,
          lease_id: lease.id,
          lease_start: lease.start_date,
          lease_end: lease.end_date
        };
      }).filter(unit => unit.unit_id && unit.tenant_id); // Filter out incomplete data

      // Sort by property name then unit number
      occupiedUnitsData.sort((a, b) => {
        if (a.property_name !== b.property_name) {
          return a.property_name.localeCompare(b.property_name);
        }
        return a.unit_number.localeCompare(b.unit_number, undefined, { numeric: true });
      });

      console.log('Processed occupied units:', occupiedUnitsData.length, 'units');
      setOccupiedUnits(occupiedUnitsData);
    } catch (error) {
      console.error('Error fetching occupied units:', error);
      toast({
        title: "Error",
        description: `Failed to load occupied units: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOccupiedUnits();

    // Set up real-time subscription for lease changes
    const channel = supabase
      .channel('occupied_units_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'leases'
        },
        () => {
          console.log('Lease changed, refetching occupied units...');
          fetchOccupiedUnits();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.id, profile?.role]);

  // Group units by property for better organization
  const getGroupedUnits = () => {
    const grouped = occupiedUnits.reduce((acc, unit) => {
      if (!acc[unit.property_name]) {
        acc[unit.property_name] = [];
      }
      acc[unit.property_name].push(unit);
      return acc;
    }, {} as Record<string, OccupiedUnit[]>);

    return grouped;
  };

  // Search function for filtering units
  const searchUnits = (searchTerm: string) => {
    if (!searchTerm) return occupiedUnits;

    const term = searchTerm.toLowerCase();
    return occupiedUnits.filter(unit =>
      unit.tenant_name.toLowerCase().includes(term) ||
      unit.unit_number.toLowerCase().includes(term) ||
      unit.property_name.toLowerCase().includes(term) ||
      unit.property_address.toLowerCase().includes(term)
    );
  };

  return {
    occupiedUnits,
    loading,
    getGroupedUnits,
    searchUnits,
    refetch: fetchOccupiedUnits
  };
};