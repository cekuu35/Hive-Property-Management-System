import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';

export interface VisitorRequest {
  id: string;
  tenant_id: string;
  visitor_name: string;
  visitor_phone?: string;
  purpose: string;
  expected_arrival: string;
  expected_duration?: number;
  special_instructions?: string;
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
          *,
          tenant:profiles!visitor_requests_tenant_id_fkey(first_name, last_name),
          unit:units(unit_number, property:properties(name))
        `)
        .order('created_at', { ascending: false });

      // Filter based on user role
      if (profile.role === 'tenant') {
        query = query.eq('tenant_id', profile.id);
      }
      // Security and landlords can see all requests

      const { data, error } = await query;

      if (error) throw error;

      setRequests((data || []) as unknown as VisitorRequest[]);
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
      const { data, error } = await supabase
        .from('visitor_requests')
        .insert({
          tenant_id: profile.id,
          ...requestData,
          expected_arrival: new Date(requestData.expected_arrival).toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Request Submitted",
        description: "Your visitor request has been submitted for approval.",
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
  }, [profile?.id]);

  return {
    requests,
    loading,
    createVisitorRequest,
    updateVisitorRequestStatus,
    cancelVisitorRequest,
    refetch: fetchVisitorRequests
  };
};