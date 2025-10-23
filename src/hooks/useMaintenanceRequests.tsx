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
  images?: string[];
  unitId?: string;
}

export const useMaintenanceRequests = () => {
  const [requests, setRequests] = useState<MaintenanceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const { profile } = useAuth();
  const { toast } = useToast();

  const fetchMaintenanceRequests = async () => {
    if (!profile?.id) return;

    console.log('Fetching maintenance requests for profile:', profile);

    try {
      setLoading(true);

      let query = supabase
        .from('maintenance_requests')
        .select(`
          *,
          unit:units(unit_number, property:properties(name)),
          tenant:profiles!tenant_id(first_name, last_name),
          assigned:profiles!assigned_to(first_name, last_name)
        `);

      // Filter based on user role
      if (profile.role === 'caretaker' || profile.role === 'security') {
        // Filter by assigned properties
        console.log(`🔍 [${profile.role}] Fetching assigned properties for staff...`);
        
        try {
          // Get assigned properties for this staff member
          const { data: assignments, error: assignmentError } = await supabase
            .from('staff_assignments')
            .select('property_id')
            .eq('staff_id', profile.id)
            .eq('role', profile.role)
            .eq('is_active', true);
          
          if (assignmentError) {
            console.error('Error fetching staff assignments:', assignmentError);
            // Fallback: if staff_assignments doesn't exist, show all (soft landing)
            console.warn('⚠️ staff_assignments table may not exist, showing all requests');
          } else if (assignments && assignments.length > 0) {
            const propertyIds = assignments.map(a => a.property_id);
            console.log(`✅ [${profile.role}] Found ${propertyIds.length} assigned properties`);
            
            // Get units in assigned properties
            const { data: units, error: unitsError } = await supabase
              .from('units')
              .select('id')
              .in('property_id', propertyIds);
            
            if (unitsError) {
              console.error('Error fetching units:', unitsError);
            } else if (units && units.length > 0) {
              const unitIds = units.map(u => u.id);
              console.log(`✅ [${profile.role}] Filtering by ${unitIds.length} units`);
              query = query.in('unit_id', unitIds);
            } else {
              // No units found in assigned properties, return empty
              console.log(`ℹ️ [${profile.role}] No units in assigned properties`);
              query = query.eq('unit_id', '00000000-0000-0000-0000-000000000000');
            }
          } else {
            // No assignments found, return empty
            console.log(`ℹ️ [${profile.role}] No property assignments found`);
            query = query.eq('unit_id', '00000000-0000-0000-0000-000000000000');
          }
        } catch (error) {
          console.error('Error in staff assignment filtering:', error);
          // Fallback to showing all if error occurs
          console.warn('⚠️ Using fallback - showing all requests due to error');
        }
      } else if (profile.role === 'tenant') {
        // Tenants see only their own requests using profile ID
        console.log('🔍 [useMaintenanceRequests] Filtering by tenant_id (profile ID):', profile.id);
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
          } else {
            // If no units found, return empty results
            query = query.eq('unit_id', '00000000-0000-0000-0000-000000000000');
          }
        } else {
          // If no properties found, return empty results
          query = query.eq('unit_id', '00000000-0000-0000-0000-000000000000');
        }
      }

      let { data: maintenanceData, error } = await query.order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching maintenance requests:', error);
        throw error;
      }

      console.log('Raw maintenance data for role:', profile.role, maintenanceData);

      // Format the data to match our interface
      const formattedRequests: MaintenanceRequest[] = (maintenanceData || []).map((request: any) => ({
        id: request.id,
        title: request.title,
        description: request.description,
        tenant: request.tenant ? `${request.tenant.first_name || ''} ${request.tenant.last_name || ''}`.trim() : 'Unknown Tenant',
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

      console.log('Formatted requests for role:', profile.role, formattedRequests);
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
    if (!profile?.id) {
      console.error('No profile ID available');
      toast({
        title: "Authentication Error",
        description: "Please log in to create maintenance requests.",
        variant: "destructive"
      });
      return false;
    }

    // Validate required fields
    if (!requestData.title || !requestData.description || !requestData.category || !requestData.priority) {
      console.error('Missing required fields:', requestData);
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields (title, description, category, priority).",
        variant: "destructive"
      });
      return false;
    }

    try {
      // Get the user's units (if tenant) or first unit from their properties (if landlord)
      let unitId = requestData.unitId;
      
      if (!unitId) {
        // Get user's available units based on their role
        let units = null;
        
        if (profile.role === 'tenant') {
          // For tenants, get units from their active leases first
          const { data: leaseData } = await supabase
            .from('leases')
            .select('unit_id')
            .eq('tenant_id', profile.id)
            .eq('status', 'active')
            .limit(1);
          
          if (leaseData && leaseData.length > 0) {
            unitId = leaseData[0].unit_id;
          } else {
            // If no active lease, try to get unit from approved applications
            const { data: applicationData } = await supabase
              .from('unit_applications')
              .select('unit_id')
              .eq('tenant_id', profile.id)
              .eq('status', 'approved')
              .limit(1);
            
            if (applicationData && applicationData.length > 0) {
              unitId = applicationData[0].unit_id;
            }
          }
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
          console.log('No unit found through normal process, trying fallback...');
          const { data: fallbackUnits, error: fallbackError } = await supabase
            .from('units')
            .select('id')
            .limit(1);
          
          if (fallbackError) {
            console.error('Error fetching fallback units:', fallbackError);
          }
          
          unitId = fallbackUnits?.[0]?.id;
          
          if (!unitId) {
            console.error('No units available in database');
            toast({
              title: "Setup Required",
              description: "No units are available. Please contact your landlord to set up your unit assignment.",
              variant: "destructive"
            });
            return false;
          } else {
            console.log('Using fallback unit:', unitId);
          }
        }
      }

      console.log('Creating maintenance request with data:', {
        title: requestData.title,
        description: requestData.description,
        category: requestData.category,
        priority: requestData.priority,
        unit_id: unitId,
        tenant_id: profile.id,
        scheduled_date: requestData.preferredDate || null,
      });

      // Create the maintenance request in the database
      const insertData = {
        title: requestData.title,
        description: requestData.description,
        category: requestData.category,
        priority: requestData.priority,
        status: 'pending', // Explicitly set status
        unit_id: unitId,
        tenant_id: profile.id,
        scheduled_date: requestData.preferredDate || null,
        images: requestData.images || [], // Use provided images or empty array
      };

      console.log('Creating maintenance request with data:', insertData);
      console.log('Profile ID:', profile.id);
      console.log('Unit ID:', unitId);

      // Validate required fields
      if (!unitId) {
        console.error('No unit ID found for tenant');
        toast({
          title: "Setup Required",
          description: "No unit assignment found. Please contact your landlord to set up your unit assignment.",
          variant: "destructive"
        });
        return false;
      }

      if (!profile.id) {
        console.error('No profile ID found');
        toast({
          title: "Authentication Error",
          description: "Please log in again to submit maintenance requests.",
          variant: "destructive"
        });
        return false;
      }

      const { data, error } = await supabase
        .from('maintenance_requests')
        .insert(insertData)
        .select()
        .single();

      if (error) {
        console.error('Maintenance request creation error:', error);
        console.error('Error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
        
        // Provide more specific error messages
        let errorMessage = "Failed to create maintenance request";
        if (error.code === '42501') {
          errorMessage = "Permission denied. Please ensure you have proper access to create maintenance requests.";
        } else if (error.code === '23503') {
          errorMessage = "Invalid unit or tenant reference. Please contact support.";
        } else if (error.message.includes('RLS')) {
          errorMessage = "Access denied. Please ensure you're properly assigned to a unit.";
        }
        
        toast({
          title: "Request Failed",
          description: errorMessage,
          variant: "destructive"
        });
        return false;
      }

      console.log('Maintenance request created successfully:', data);
      
      // Create notification for caretakers - get actual caretaker user IDs
      try {
        const { data: caretakers, error: caretakerError } = await supabase
          .from('profiles')
          .select('user_id')
          .eq('role', 'caretaker');
        
        if (caretakerError) {
          console.error('Error fetching caretakers:', caretakerError);
        } else if (caretakers && caretakers.length > 0) {
          const notifications = caretakers.map(caretaker => ({
            user_id: caretaker.user_id,
            title: 'New Maintenance Request',
            message: `New ${requestData.priority} priority request: ${requestData.title}`,
            type: 'maintenance_request',
            action_url: '/dashboard?section=workorders'
          }));

          const { error: notificationError } = await supabase
            .from('notifications')
            .insert(notifications);
          
          if (notificationError) {
            console.error('Error creating notifications:', notificationError);
          } else {
            console.log('Notifications created for caretakers');
          }
        } else {
          console.log('No caretakers found to notify');
        }
      } catch (error) {
        console.error('Error creating notifications:', error);
      }
      
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
        description: `Failed to create maintenance request: ${error.message || 'Unknown error'}`,
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

  const updateMaintenanceRequest = async (requestId: string, updates: any) => {
    try {
      const { error } = await supabase
        .from('maintenance_requests')
        .update(updates)
        .eq('id', requestId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Maintenance request updated successfully",
      });

      await fetchMaintenanceRequests();
    } catch (error) {
      console.error('Error updating maintenance request:', error);
      toast({
        title: "Error",
        description: "Failed to update maintenance request",
        variant: "destructive"
      });
    }
  };

  const assignContractor = async (requestId: string, contractorId: string, notes?: string, estimatedCost?: number, scheduledDate?: string) => {
    try {
      const updates: any = {
        status: 'in-progress',
        assigned_to: contractorId,
        notes: notes || null,
        estimated_cost: estimatedCost || null,
        scheduled_date: scheduledDate || null
      };

      await updateMaintenanceRequest(requestId, updates);
    } catch (error) {
      console.error('Error assigning contractor:', error);
      toast({
        title: "Error",
        description: "Failed to assign contractor",
        variant: "destructive"
      });
    }
  };

  const updateCost = async (requestId: string, actualCost: number, notes?: string) => {
    try {
      const updates: any = {
        actual_cost: actualCost,
        notes: notes || null
      };

      await updateMaintenanceRequest(requestId, updates);
    } catch (error) {
      console.error('Error updating cost:', error);
      toast({
        title: "Error",
        description: "Failed to update cost",
        variant: "destructive"
      });
    }
  };

  const scheduleMaintenance = async (requestId: string, scheduledDate: string, estimatedCost?: number, notes?: string) => {
    try {
      const updates: any = {
        scheduled_date: scheduledDate,
        estimated_cost: estimatedCost || null,
        notes: notes || null
      };

      await updateMaintenanceRequest(requestId, updates);
    } catch (error) {
      console.error('Error scheduling maintenance:', error);
      toast({
        title: "Error",
        description: "Failed to schedule maintenance",
        variant: "destructive"
      });
    }
  };

  const updatePriority = async (requestId: string, priority: string) => {
    try {
      const updates: any = { priority };
      await updateMaintenanceRequest(requestId, updates);
    } catch (error) {
      console.error('Error updating priority:', error);
      toast({
        title: "Error",
        description: "Failed to update priority",
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

  const debugTenantUnitAssignment = async () => {
    if (!profile?.id || profile.role !== 'tenant') return null;

    try {
      console.log('=== DEBUGGING TENANT UNIT ASSIGNMENT ===');
      console.log('Profile ID:', profile.id);
      console.log('Profile Role:', profile.role);

      // Check active leases
      const { data: leaseData, error: leaseError } = await supabase
        .from('leases')
        .select(`
          id,
          unit_id,
          status,
          units!inner(
            unit_number,
            properties!inner(
              name,
              landlord_id
            )
          )
        `)
        .eq('tenant_id', profile.id)
        .eq('status', 'active');

      console.log('Active leases:', leaseData);
      console.log('Lease error:', leaseError);

      // Check approved applications
      const { data: applicationData, error: applicationError } = await supabase
        .from('unit_applications')
        .select(`
          id,
          unit_id,
          status,
          units!inner(
            unit_number,
            properties!inner(
              name,
              landlord_id
            )
          )
        `)
        .eq('tenant_id', profile.id)
        .eq('status', 'approved');

      console.log('Approved applications:', applicationData);
      console.log('Application error:', applicationError);

      // Check if tenant has any unit assignments
      const { data: allAssignments, error: allError } = await supabase
        .from('unit_applications')
        .select(`
          id,
          unit_id,
          status,
          units!inner(
            unit_number,
            properties!inner(
              name,
              landlord_id
            )
          )
        `)
        .eq('tenant_id', profile.id);

      console.log('All applications:', allAssignments);
      console.log('All applications error:', allError);

      return {
        activeLeases: leaseData,
        approvedApplications: applicationData,
        allApplications: allAssignments
      };
    } catch (error) {
      console.error('Error debugging tenant unit assignment:', error);
      return null;
    }
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
    updateMaintenanceRequest,
    assignContractor,
    updateCost,
    scheduleMaintenance,
    updatePriority,
    getStats,
    refetch: fetchMaintenanceRequests,
    debugTenantUnitAssignment
  };
};
