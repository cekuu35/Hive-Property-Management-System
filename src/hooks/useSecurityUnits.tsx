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
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      // Get all active leases with unit, property, and tenant information
      const { data, error } = await supabase
        .from('leases')
        .select(`
          id,
          start_date,
          end_date,
          tenant_id,
          unit_id,
          units!inner (
            id,
            unit_number,
            property_id,
            properties!inner (
              id,
              name,
              address
            )
          ),
          profiles!inner (
            id,
            first_name,
            last_name,
            phone
          )
        `)
        .eq('status', 'active');

      if (error) throw error;

      const occupiedUnitsData: OccupiedUnit[] = (data || []).map((lease: any) => ({
        unit_id: lease.units.id,
        unit_number: lease.units.unit_number,
        property_id: lease.units.properties.id,
        property_name: lease.units.properties.name,
        property_address: lease.units.properties.address,
        tenant_id: lease.profiles.id,
        tenant_name: `${lease.profiles.first_name} ${lease.profiles.last_name}`.trim(),
        tenant_phone: lease.profiles.phone,
        lease_id: lease.id,
        lease_start: lease.start_date,
        lease_end: lease.end_date
      }));

      // Sort by property name then unit number
      occupiedUnitsData.sort((a, b) => {
        if (a.property_name !== b.property_name) {
          return a.property_name.localeCompare(b.property_name);
        }
        return a.unit_number.localeCompare(b.unit_number, undefined, { numeric: true });
      });

      setOccupiedUnits(occupiedUnitsData);
    } catch (error) {
      console.error('Error fetching occupied units:', error);
      toast({
        title: "Error",
        description: "Failed to load occupied units",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOccupiedUnits();
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