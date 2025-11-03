import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';

export interface VisitorRequest {
  id: string;
  tenant_id: string;
  security_id?: string;
  visitor_name: string;
  visitor_phone?: string;
  purpose: string;
  expected_arrival: string;
  expected_duration?: number;
  special_instructions?: string;
  id_document_url?: string;
  status: 'pending' | 'approved' | 'rejected' | 'expired';
  approved_by?: string;
  approved_at?: string;
  security_notes?: string;
  created_at: string;
  updated_at: string;
  tenant?: {
    first_name: string;
    last_name: string;
  };
  security?: {
    first_name: string;
    last_name: string;
  };
  unit?: {
    unit_number: string;
    property: {
      name: string;
    };
  };
}

export interface CreateVisitorRequest {
  visitor_name: string;
  visitor_phone?: string;
  purpose: string;
  expected_arrival: string;
  expected_duration?: number;
  special_instructions?: string;
  tenant_id?: string; // For security creating requests
  unit_id?: string; // Unit being visited
  id_document_url?: string; // URL of uploaded ID document photo
}

export interface CreateSecurityVisitorRequest extends CreateVisitorRequest {
  tenant_id: string; // Required for security requests
}

export const useVisitorRequests = () => {
  const [requests, setRequests] = useState<VisitorRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const { profile } = useAuth();
  const { toast } = useToast();

  const fetchVisitorRequests = async () => {
    if (!profile?.id) return;

    try {
      setLoading(true);

      let query = supabase
        .from('visitor_requests')
        .select(`
          *
        `)
        .order('created_at', { ascending: false });

      // Filter based on user role
      if (profile.role === 'tenant') {
        query = query.eq('tenant_id', profile.id);
      } else if (profile.role === 'security') {
        // Security sees requests they created or all requests for approval
        query = query.or(`security_id.eq.${profile.id},security_id.is.null`);
      }
      // Landlords can see all requests

      const { data, error } = await query;

      if (error) throw error;

      // Fetch related data separately
      const requestsData = data || [];
      const requestsWithRelations = await Promise.all(
        requestsData.map(async (request: any) => {
          const result = { ...request };

          // Fetch tenant info
          if (request.tenant_id) {
            const { data: tenant } = await supabase
              .from('profiles')
              .select('first_name, last_name')
              .eq('id', request.tenant_id)
              .single();
            result.tenant = tenant;
          }

          // Fetch security info
          if (request.security_id) {
            const { data: security } = await supabase
              .from('profiles')
              .select('first_name, last_name')
              .eq('id', request.security_id)
              .single();
            result.security = security;
          }

          return result;
        })
      );

      setRequests(requestsWithRelations as VisitorRequest[]);
    } catch (error) {
      console.error('Error fetching visitor requests:', error);
      toast({
        title: "Error",
        description: "Failed to load visitor requests",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const createVisitorRequest = async (requestData: CreateVisitorRequest) => {
    if (!profile?.id) return false;

    try {
      const insertData: any = {
        ...requestData,
        expected_arrival: new Date(requestData.expected_arrival).toISOString(),
      };

      // For tenants, set tenant_id; for security, set security_id and tenant_id
      if (profile.role === 'tenant') {
        insertData.tenant_id = profile.id;
      } else if (profile.role === 'security') {
        if (!requestData.tenant_id) {
          throw new Error('Tenant ID is required for security requests');
        }
        insertData.security_id = profile.id;
        insertData.tenant_id = requestData.tenant_id;
      }

      // Auto-fetch unit_id from tenant's active lease if not provided
      if (!insertData.unit_id && insertData.tenant_id) {
        const { data: lease } = await supabase
          .from('leases')
          .select('unit_id')
          .eq('tenant_id', insertData.tenant_id)
          .eq('status', 'active')
          .single();
        
        if (lease) {
          insertData.unit_id = lease.unit_id;
        }
      }

      const { data, error } = await supabase
        .from('visitor_requests')
        .insert(insertData)
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Request Submitted",
        description: profile.role === 'security' 
          ? "Visitor approval request has been sent to the tenant."
          : "Your visitor request has been submitted for approval.",
      });

      await fetchVisitorRequests();
      return true;
    } catch (error) {
      console.error('Error creating visitor request:', error);
      toast({
        title: "Error",
        description: "Failed to create visitor request",
        variant: "destructive"
      });
      return false;
    }
  };

  const createSecurityVisitorRequest = async (requestData: CreateSecurityVisitorRequest) => {
    if (!profile?.id || profile.role !== 'security') return false;
    return await createVisitorRequest(requestData);
  };

  const updateVisitorRequestStatus = async (
    requestId: string, 
    status: 'approved' | 'rejected',
    security_notes?: string
  ) => {
    if (!profile?.id) return false;

    try {
      const updates: any = {
        status,
        approved_by: profile.id,
        approved_at: new Date().toISOString(),
      };

      if (security_notes) {
        updates.security_notes = security_notes;
      }

      const { error } = await supabase
        .from('visitor_requests')
        .update(updates)
        .eq('id', requestId);

      if (error) throw error;

      toast({
        title: "Request Updated",
        description: `Visitor request has been ${status}.`,
      });

      await fetchVisitorRequests();
      return true;
    } catch (error) {
      console.error('Error updating visitor request:', error);
      toast({
        title: "Error",
        description: "Failed to update visitor request",
        variant: "destructive"
      });
      return false;
    }
  };

  const cancelVisitorRequest = async (requestId: string) => {
    if (!profile?.id) return false;

    try {
      const { error } = await supabase
        .from('visitor_requests')
        .update({ status: 'rejected' })
        .eq('id', requestId)
        .eq('tenant_id', profile.id); // Ensure only the tenant can cancel their own request

      if (error) throw error;

      toast({
        title: "Request Cancelled",
        description: "Your visitor request has been cancelled.",
      });

      await fetchVisitorRequests();
      return true;
    } catch (error) {
      console.error('Error cancelling visitor request:', error);
      toast({
        title: "Error",
        description: "Failed to cancel visitor request",
        variant: "destructive"
      });
      return false;
    }
  };

  useEffect(() => {
    fetchVisitorRequests();

    // Set up real-time subscription
    const channel = supabase
      .channel('visitor_requests_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'visitor_requests'
        },
        () => {
          console.log('Visitor request changed, refetching...');
          fetchVisitorRequests();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.id]);

  return {
    requests,
    loading,
    createVisitorRequest,
    createSecurityVisitorRequest,
    updateVisitorRequestStatus,
    cancelVisitorRequest,
    refetch: fetchVisitorRequests
  };
};