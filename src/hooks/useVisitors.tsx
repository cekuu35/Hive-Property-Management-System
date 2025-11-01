import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';

export interface Visitor {
  id: string;
  visitor_request_id?: string;
  security_id: string;
  visitor_name: string;
  visitor_phone?: string;
  visiting_unit_id?: string;
  visiting_tenant_id?: string;
  purpose: string;
  time_in: string;
  time_out?: string;
  status: 'active' | 'checked_out';
  security_notes?: string;
  emergency_contact?: string;
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

export interface CreateVisitor {
  visitor_request_id?: string;
  visitor_name: string;
  visitor_phone?: string;
  visiting_unit_id?: string;
  visiting_tenant_id?: string;
  purpose: string;
  security_notes?: string;
  emergency_contact?: string;
}

export const useVisitors = () => {
  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const [loading, setLoading] = useState(true);
  const { profile } = useAuth();
  const { toast } = useToast();

  const fetchVisitors = useCallback(async () => {
    if (!profile?.id) return;

    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('visitors')
        .select(`
          *,
          unit:units!visitors_visiting_unit_id_fkey(
            unit_number,
            property:properties(name)
          ),
          tenant:profiles!visitors_visiting_tenant_id_fkey(first_name, last_name)
        `)
        .order('time_in', { ascending: false });

      if (error) throw error;

      setVisitors(data || []);
    } catch (error) {
      console.error('Error fetching visitors:', error);
    } finally {
      setLoading(false);
    }
  }, [profile?.id]);

  const registerVisitor = async (visitorData: CreateVisitor) => {
    if (!profile?.id || profile.role !== 'security') {
      toast({ title: "Error", description: "Not authorized", variant: "destructive" });
      return false;
    }

    try {
      const { data, error } = await supabase
        .from('visitors')
        .insert({
          security_id: profile.id,
          visitor_name: visitorData.visitor_name,
          visitor_phone: visitorData.visitor_phone || null,
          visiting_unit_id: visitorData.visiting_unit_id || null,
          visiting_tenant_id: visitorData.visiting_tenant_id || null,
          purpose: visitorData.purpose,
          security_notes: visitorData.security_notes || null,
          emergency_contact: visitorData.emergency_contact || null,
          visitor_request_id: visitorData.visitor_request_id || null,
          status: 'active',
          time_in: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      toast({ title: "Success", description: "Visitor registered" });
      await fetchVisitors(); // Refetch after registration
      return true;
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return false;
    }
  };

  const registerVisitorFromApprovedRequest = async (visitorRequestId: string) => {
    if (!profile?.id || profile.role !== 'security') return false;

    try {
      // Get the approved visitor request
      const { data: request, error: requestError } = await supabase
        .from('visitor_requests')
        .select('*')
        .eq('id', visitorRequestId)
        .eq('status', 'approved')
        .single();

      if (requestError) throw requestError;
      if (!request) throw new Error('Approved visitor request not found');

      // Get tenant's active unit
      const { data: lease } = await supabase
        .from('leases')
        .select('unit_id')
        .eq('tenant_id', request.tenant_id)
        .eq('status', 'active')
        .single();

      // Register the visitor
      const { error } = await supabase
        .from('visitors')
        .insert({
          security_id: profile.id,
          visitor_request_id: visitorRequestId,
          visitor_name: request.visitor_name,
          visitor_phone: request.visitor_phone || null,
          visiting_unit_id: lease?.unit_id || null,
          visiting_tenant_id: request.tenant_id,
          purpose: request.purpose,
          status: 'active',
          time_in: new Date().toISOString(),
        });

      if (error) throw error;

      toast({ title: "Success", description: "Visitor registered from approved request" });
      await fetchVisitors(); // Refetch after registration
      return true;
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return false;
    }
  };

  const checkOutVisitor = async (visitorId: string) => {
    if (!profile?.id || profile.role !== 'security') return false;

    try {
      const { error } = await supabase
        .from('visitors')
        .update({
          status: 'checked_out',
          time_out: new Date().toISOString(),
        })
        .eq('id', visitorId);

      if (error) throw error;

      toast({ title: "Success", description: "Visitor checked out" });
      await fetchVisitors(); // Refetch after checkout
      return true;
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return false;
    }
  };

  const getStats = () => {
    const active = visitors.filter(v => v.status === 'active').length;
    const today = new Date().toDateString();
    const todaysVisitors = visitors.filter(v => 
      new Date(v.time_in).toDateString() === today
    ).length;
    const checkedOut = visitors.filter(v => 
      v.status === 'checked_out' && 
      new Date(v.time_in).toDateString() === today
    ).length;

    return { active, todaysVisitors, checkedOut };
  };

  useEffect(() => {
    fetchVisitors();
  }, [fetchVisitors]);

  return {
    visitors,
    loading,
    registerVisitor,
    registerVisitorFromApprovedRequest,
    checkOutVisitor,
    getStats,
    refetch: fetchVisitors
  };
};

