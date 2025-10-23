import { useState, useEffect } from 'react';
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

  const fetchVisitors = async () => {
    if (!profile?.id) return;

    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('visitors')
        .select('*')
        .order('time_in', { ascending: false });

      if (error) throw error;

      setVisitors(data || []);
    } catch (error) {
      console.error('Error fetching visitors:', error);
    } finally {
      setLoading(false);
    }
  };

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
  }, [profile?.id]);

  return {
    visitors,
    loading,
    registerVisitor,
    checkOutVisitor,
    getStats,
    refetch: fetchVisitors
  };
};



