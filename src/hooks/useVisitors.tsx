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

      let query = supabase
        .from('visitors')
        .select('*')
        .order('time_in', { ascending: false });

      // Filter based on user role
      if (profile.role === 'tenant') {
        query = query.eq('visiting_tenant_id', profile.id);
      } else if (profile.role === 'landlord') {
        // Landlords can see visitors to their properties
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
            query = query.in('visiting_unit_id', unitIds);
          }
        }
      } else if (profile.role === 'security') {
        // Security can only see visitors to their assigned properties
        let assignedPropertyIds: string[] = [];
        
        try {
          const { data: assignments } = await (supabase as any)
            .from('staff_assignments')
            .select('property_id')
            .eq('staff_id', profile.id)
            .eq('role', 'security')
            .eq('is_active', true);

          assignedPropertyIds = assignments?.map((a: any) => a.property_id) || [];
        } catch (error) {
          console.warn('staff_assignments table not found, using all properties for soft landing');
          // For soft landing, get all properties
          const { data: allProperties } = await supabase
            .from('properties')
            .select('id');
          assignedPropertyIds = allProperties?.map(p => p.id) || [];
        }

        if (assignedPropertyIds.length > 0) {
          // Get units from assigned properties
          const { data: units } = await supabase
            .from('units')
            .select('id')
            .in('property_id', assignedPropertyIds);

          if (units && units.length > 0) {
            const unitIds = units.map(u => u.id);
            query = query.in('visiting_unit_id', unitIds);
          }
        }
      }

      const { data, error } = await query;

      if (error) throw error;

      // Fetch related data separately
      const visitorsData = data || [];
      const visitorsWithRelations = await Promise.all(
        visitorsData.map(async (visitor: any) => {
          const result = { ...visitor };

          // Fetch tenant info
          if (visitor.visiting_tenant_id) {
            const { data: tenant } = await supabase
              .from('profiles')
              .select('first_name, last_name')
              .eq('id', visitor.visiting_tenant_id)
              .single();
            result.tenant = tenant;
          }

          // Fetch unit info
          if (visitor.visiting_unit_id) {
            const { data: unit } = await supabase
              .from('units')
              .select(`
                unit_number,
                property:properties(name)
              `)
              .eq('id', visitor.visiting_unit_id)
              .single();
            result.unit = unit;
          }

          return result;
        })
      );

      setVisitors(visitorsWithRelations as Visitor[]);
    } catch (error) {
      console.error('Error fetching visitors:', error);
      toast({
        title: "Error",
        description: "Failed to load visitors",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const registerVisitor = async (visitorData: CreateVisitor) => {
    console.log('Profile data:', profile);
    
    if (!profile?.id || profile.role !== 'security') {
      console.error('User not authorized to register visitors:', { 
        profileId: profile?.id, 
        role: profile?.role,
        hasProfile: !!profile,
        profileKeys: profile ? Object.keys(profile) : []
      });
      return false;
    }

    console.log('Registering visitor with data:', {
      security_id: profile.id,
      visitorData,
      timestamp: new Date().toISOString()
    });

    try {
      const insertData = {
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
      };

      console.log('Insert data:', insertData);

      const { data, error } = await supabase
        .from('visitors')
        .insert(insertData)
        .select()
        .single();

      if (error) {
        console.error('Supabase error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
        throw error;
      }

      console.log('Visitor registered successfully:', data);

      toast({
        title: "Visitor Registered",
        description: "Visitor has been successfully registered and checked in.",
      });

      await fetchVisitors();
      return true;
    } catch (error) {
      console.error('Error registering visitor:', error);
      toast({
        title: "Error",
        description: `Failed to register visitor: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive"
      });
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

      if (!request) {
        throw new Error('Approved visitor request not found');
      }

      // Get tenant's active unit
      const { data: lease } = await supabase
        .from('leases')
        .select('unit_id')
        .eq('tenant_id', request.tenant_id)
        .eq('status', 'active')
        .single();

      // Register the visitor
      const { data, error } = await supabase
        .from('visitors')
        .insert({
          security_id: profile.id,
          visitor_request_id: visitorRequestId,
          visitor_name: request.visitor_name,
          visitor_phone: request.visitor_phone || null,
          visiting_unit_id: lease?.unit_id || null,
          visiting_tenant_id: request.tenant_id,
          purpose: request.purpose,
          security_notes: request.security_notes || null,
          emergency_contact: null,
          status: 'active',
          time_in: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) {
        console.error('Supabase error in registerVisitorFromApprovedRequest:', error);
        throw error;
      }

      toast({
        title: "Visitor Registered",
        description: "Visitor has been successfully registered and checked in.",
      });

      await fetchVisitors();
      return true;
    } catch (error) {
      console.error('Error registering visitor from approved request:', error);
      toast({
        title: "Error",
        description: `Failed to register visitor: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive"
      });
      return false;
    }
  };

  const checkOutVisitor = async (visitorId: string, security_notes?: string) => {
    if (!profile?.id || profile.role !== 'security') return false;

    try {
      const updates: any = {
        status: 'checked_out',
        time_out: new Date().toISOString(),
      };

      if (security_notes) {
        updates.security_notes = security_notes;
      }

      const { error } = await supabase
        .from('visitors')
        .update(updates)
        .eq('id', visitorId);

      if (error) throw error;

      toast({
        title: "Visitor Checked Out",
        description: "Visitor has been checked out successfully.",
      });

      await fetchVisitors();
      return true;
    } catch (error) {
      console.error('Error checking out visitor:', error);
      toast({
        title: "Error",
        description: "Failed to check out visitor",
        variant: "destructive"
      });
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

  const testVisitorInsert = async () => {
    if (!profile?.id || profile.role !== 'security') {
      console.error('User not authorized for test');
      return false;
    }

    try {
      console.log('Testing visitor insert with minimal data...');
      const { data, error } = await supabase
        .from('visitors')
        .insert({
          security_id: profile.id,
          visitor_name: 'Test Visitor',
          purpose: 'Test Purpose',
          status: 'active',
          time_in: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) {
        console.error('Test insert failed:', error);
        return false;
      }

      console.log('Test insert successful:', data);
      
      // Clean up test data
      await supabase
        .from('visitors')
        .delete()
        .eq('id', data.id);
      
      return true;
    } catch (error) {
      console.error('Test insert error:', error);
      return false;
    }
  };

  useEffect(() => {
    fetchVisitors();
  }, [profile?.id]);

  return {
    visitors,
    loading,
    registerVisitor,
    registerVisitorFromApprovedRequest,
    checkOutVisitor,
    getStats,
    testVisitorInsert,
    refetch: fetchVisitors
  };
};