import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';

export interface MaintenanceRequest {
  id: string;
  title: string;
  description: string;
  tenant: string;
  tenant_id: string;
  unit: string;
  category: string;
  priority: 'low' | 'medium' | 'high' | 'emergency';
  status: 'pending' | 'in-progress' | 'completed';
  assignedTo?: string;
  estimatedCost?: number;
  actualCost?: number;
  createdDate: string;
  scheduledDate?: string;
  completedDate?: string;
  images: string[];
}

export interface CreateMaintenanceRequest {
  title: string;
  description: string;
  category: string;
  priority: 'low' | 'medium' | 'high' | 'emergency';
  preferredDate?: string;
  images?: File[];
  unitId?: string;
}

export const useMaintenanceRequests = () => {
  const [requests, setRequests] = useState<MaintenanceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const { profile } = useAuth();
  const { toast } = useToast();

  const fetchMaintenanceRequests = async () => {
    if (!profile?.id) return;

    try {
      setLoading(true);

      let query = supabase
        .from('maintenance_requests')
        .select(`
          *,
          unit:units(unit_number, property:properties(name)),
          tenant:profiles!maintenance_requests_tenant_id_fkey(first_name, last_name),
          assigned:profiles!maintenance_requests_assigned_to_fkey(first_name, last_name)
        `);

      // Filter based on user role
      if (profile.role === 'caretaker') {
        // Caretakers see requests assigned to them or unassigned requests
        query = query.or(`assigned_to.eq.${profile.id},assigned_to.is.null`);
      } else if (profile.role === 'tenant') {
        // Tenants see only their own requests
        query = query.eq('tenant_id', profile.id);
      } else if (profile.role === 'landlord') {
        // Landlords see requests for their properties
        const { data: properties } = await supabase
          .from('properties')
          .select('id')
          .eq('landlord_id', profile.id);
        
        if (properties && properties.length > 0) {
          const propertyIds = properties.map(p => p.id);
          const { data: units } = await supabase
            .from('units')
            .select('id')
            .in('property_id', propertyIds);
          
          if (units && units.length > 0) {
            const unitIds = units.map(u => u.id);
            query = query.in('unit_id', unitIds);
          }
        }
      }

      const { data: maintenanceData, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;

      // Format the data to match our interface
      const formattedRequests: MaintenanceRequest[] = (maintenanceData || []).map((request: any) => ({
        id: request.id,
        title: request.title,
        description: request.description,
        tenant: request.tenant ? `${request.tenant.first_name} ${request.tenant.last_name}` : 'Unknown',
        tenant_id: request.tenant_id,
        unit: request.unit ? `${request.unit.property?.name || 'Property'} ${request.unit.unit_number}` : 'Unknown Unit',
        category: request.category,
        priority: request.priority,
        status: request.status,
        assignedTo: request.assigned ? `${request.assigned.first_name} ${request.assigned.last_name}` : undefined,
        estimatedCost: request.estimated_cost,
        actualCost: request.actual_cost,
        createdDate: new Date(request.created_at).toISOString().split('T')[0],
        scheduledDate: request.scheduled_date,
        completedDate: request.completed_date,
        images: request.images || []
      }));

      setRequests(formattedRequests);

    } catch (error) {
      console.error('Error fetching maintenance requests:', error);
      toast({
        title: "Error",
        description: "Failed to load maintenance requests",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const createMaintenanceRequest = async (requestData: CreateMaintenanceRequest) => {
    if (!profile?.id) return false;

    try {
      // Get the user's units (if tenant) or first unit from their properties (if landlord)
      let unitId = requestData.unitId;
      
      if (!unitId) {
        // Get user's available units based on their role
        let units = null;
        
        if (profile.role === 'tenant') {
          // For tenants, get units from their active leases
          const { data } = await supabase
            .from('leases')
            .select('unit_id')
            .eq('tenant_id', profile.id)
            .eq('status', 'active')
            .limit(1);
          
          units = data;
          unitId = units?.[0]?.unit_id;
        } else if (profile.role === 'landlord') {
          // For landlords, get units from their properties
          const { data: properties } = await supabase
            .from('properties')
            .select('id')
            .eq('landlord_id', profile.id);
          
          if (properties && properties.length > 0) {
            const propertyIds = properties.map(p => p.id);
            const { data } = await supabase
              .from('units')
              .select('id')
              .in('property_id', propertyIds)
              .limit(1);
            
            units = data;
            unitId = units?.[0]?.id;
          }
        }
        
        // If still no unit found, use any available unit as fallback for demo purposes
        if (!unitId) {
          const { data: fallbackUnits } = await supabase
            .from('units')
            .select('id')
            .limit(1);
          
          unitId = fallbackUnits?.[0]?.id;
          
          if (!unitId) {
            toast({
              title: "Setup Required",
              description: "No units are available. Please contact your landlord to set up your unit assignment.",
              variant: "destructive"
            });
            return false;
          }
        }
      }

      // Create the maintenance request in the database
      const { data, error } = await supabase
        .from('maintenance_requests')
        .insert({
          title: requestData.title,
          description: requestData.description,
          category: requestData.category,
          priority: requestData.priority,
          unit_id: unitId,
          tenant_id: profile.id,
          scheduled_date: requestData.preferredDate || null,
          images: [], // Initialize as empty array for now
        })
        .select()
        .single();

      if (error) throw error;
      
      // The trigger will automatically create notifications for caretakers
      
      toast({
        title: "Request Created",
        description: "Your maintenance request has been submitted successfully.",
      });
      
      // Refresh the requests list
      await fetchMaintenanceRequests();
      return true;
      
    } catch (error) {
      console.error('Error creating maintenance request:', error);
      toast({
        title: "Error",
        description: "Failed to create maintenance request",
        variant: "destructive"
      });
      return false;
    }
  };

  const updateRequestStatus = async (requestId: string, status: string, assignedTo?: string) => {
    try {
      // Update request status in database
      const updates: any = { status };
      if (assignedTo) updates.assigned_to = assignedTo;
      if (status === 'completed') updates.completed_date = new Date().toISOString().split('T')[0];
      if (status === 'in-progress' && !assignedTo && profile?.role === 'caretaker') {
        updates.assigned_to = profile.id;
      }

      const { error } = await supabase
        .from('maintenance_requests')
        .update(updates)
        .eq('id', requestId);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Request ${status === 'in-progress' ? 'accepted' : status === 'completed' ? 'completed' : 'updated'} successfully`,
      });

      await fetchMaintenanceRequests();
    } catch (error) {
      console.error('Error updating request:', error);
      toast({
        title: "Error",
        description: "Failed to update request",
        variant: "destructive"
      });
    }
  };

  const getStats = () => {
    const pending = requests.filter(r => r.status === 'pending').length;
    const inProgress = requests.filter(r => r.status === 'in-progress').length;
    const completed = requests.filter(r => r.status === 'completed').length;
    const totalCost = requests.reduce((sum, r) => sum + (r.actualCost || r.estimatedCost || 0), 0);

    return { pending, inProgress, completed, totalCost };
  };

  useEffect(() => {
    fetchMaintenanceRequests();

    // Set up real-time subscription for maintenance requests
    // NOTE: RLS Policy Required - Caretakers need read access to maintenance_requests table:
    // CREATE POLICY "Caretakers can read maintenance requests" 
    // ON public.maintenance_requests FOR SELECT TO authenticated USING (true);
    if (profile?.id) {
      const channel = supabase
        .channel('maintenance_requests')
        .on('postgres_changes', { 
          event: '*', 
          schema: 'public', 
          table: 'maintenance_requests' 
        }, (payload) => {
          console.log('Maintenance request updated:', payload);
          // Update local state with the new/updated row
          fetchMaintenanceRequests();
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [profile?.id]);

  return {
    requests,
    loading,
    createMaintenanceRequest,
    updateRequestStatus,
    getStats,
    refetch: fetchMaintenanceRequests
  };
};