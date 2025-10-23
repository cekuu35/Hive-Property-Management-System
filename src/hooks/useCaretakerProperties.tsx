import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from '@/hooks/use-toast';

export interface CaretakerProperty {
  id: string;
  name: string;
  address: string;
  total_units: number;
  occupied_units: number;
  pending_maintenance: number;
  urgent_maintenance: number;
  assigned_at: string;
  notes?: string;
}

export const useCaretakerProperties = () => {
  const [properties, setProperties] = useState<CaretakerProperty[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);
  const { profile } = useAuth();
  const { toast } = useToast();

  const fetchProperties = async () => {
    if (!profile?.id || (profile.role !== 'caretaker' && profile.role !== 'security')) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      // Fetch assigned properties
      const { data: assignments, error: assignmentError } = await supabase
        .from('staff_assignments')
        .select(`
          property_id,
          assigned_at,
          notes,
          property:properties!staff_assignments_property_id_fkey (
            id,
            name,
            address,
            total_units
          )
        `)
        .eq('staff_id', profile.id)
        .eq('role', profile.role)
        .eq('is_active', true)
        .order('assigned_at', { ascending: false });

      if (assignmentError) {
        console.error('Error fetching assignments:', assignmentError);
        
        // If table doesn't exist, show friendly message
        if (assignmentError.message.includes('relation "public.staff_assignments" does not exist')) {
          toast({
            title: "Database Setup Required",
            description: "The staff assignments table needs to be created. Please contact your administrator.",
            variant: "destructive"
          });
        }
        
        setProperties([]);
        return;
      }

      if (!assignments || assignments.length === 0) {
        setProperties([]);
        return;
      }

      // Get detailed stats for each property
      const propertiesWithStats = await Promise.all(
        assignments.map(async (assignment: any) => {
          const property = assignment.property;
          
          // Get occupied units count
          const { count: occupiedCount } = await supabase
            .from('units')
            .select('*', { count: 'exact', head: true })
            .eq('property_id', property.id)
            .eq('status', 'occupied');

          // Get units for this property
          const { data: units } = await supabase
            .from('units')
            .select('id')
            .eq('property_id', property.id);

          const unitIds = units?.map(u => u.id) || [];

          // Get pending maintenance count
          const { count: pendingCount } = await supabase
            .from('maintenance_requests')
            .select('*', { count: 'exact', head: true })
            .in('unit_id', unitIds)
            .neq('status', 'completed');

          // Get urgent maintenance count
          const { count: urgentCount } = await supabase
            .from('maintenance_requests')
            .select('*', { count: 'exact', head: true })
            .in('unit_id', unitIds)
            .in('priority', ['high', 'emergency'])
            .neq('status', 'completed');

          return {
            id: property.id,
            name: property.name,
            address: property.address,
            total_units: property.total_units,
            occupied_units: occupiedCount || 0,
            pending_maintenance: pendingCount || 0,
            urgent_maintenance: urgentCount || 0,
            assigned_at: assignment.assigned_at,
            notes: assignment.notes
          };
        })
      );

      setProperties(propertiesWithStats);

      // Auto-select first property if none selected
      if (!selectedPropertyId && propertiesWithStats.length > 0) {
        setSelectedPropertyId(propertiesWithStats[0].id);
      }

    } catch (error) {
      console.error('Error fetching caretaker properties:', error);
      toast({
        title: "Error",
        description: "Failed to load assigned properties",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (profile?.id) {
      fetchProperties();
    }
  }, [profile?.id]);

  const getSelectedProperty = () => {
    return properties.find(p => p.id === selectedPropertyId);
  };

  const getTotalStats = () => {
    return {
      total_properties: properties.length,
      total_units: properties.reduce((sum, p) => sum + p.total_units, 0),
      total_occupied: properties.reduce((sum, p) => sum + p.occupied_units, 0),
      total_pending: properties.reduce((sum, p) => sum + p.pending_maintenance, 0),
      total_urgent: properties.reduce((sum, p) => sum + p.urgent_maintenance, 0),
    };
  };

  return {
    properties,
    loading,
    selectedPropertyId,
    setSelectedPropertyId,
    getSelectedProperty,
    getTotalStats,
    refreshProperties: fetchProperties
  };
};

