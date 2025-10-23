import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';

export interface SecurityPatrol {
  id: string;
  security_id: string;
  property_id: string;
  location: string;
  scheduled_time: string;
  duration_minutes: number;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  start_time?: string;
  end_time?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  // Joined data
  property?: {
    name: string;
    address: string;
  };
  security?: {
    first_name: string;
    last_name: string;
  };
}

export interface PatrolStats {
  total_patrols: number;
  completed_patrols: number;
  in_progress_patrols: number;
  scheduled_patrols: number;
  completion_rate: number;
  avg_duration_minutes: number;
}

export const useSecurityPatrols = (propertyId?: string) => {
  const [patrols, setPatrols] = useState<SecurityPatrol[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<PatrolStats>({
    total_patrols: 0,
    completed_patrols: 0,
    in_progress_patrols: 0,
    scheduled_patrols: 0,
    completion_rate: 0,
    avg_duration_minutes: 0
  });
  const { profile } = useAuth();
  const { toast } = useToast();

  const fetchPatrols = async () => {
    if (!profile?.id) return;

    try {
      setLoading(true);

      let query = supabase
        .from('security_patrols')
        .select(`
          *,
          property:properties(name, address),
          security:profiles!security_patrols_security_id_fkey(first_name, last_name)
        `)
        .order('scheduled_time', { ascending: false });

      // Filter by property if specified
      if (propertyId) {
        query = query.eq('property_id', propertyId);
      } else if (profile.role === 'security') {
        // Fetch assigned properties for security guards
        const { data: assignments } = await supabase
          .from('staff_assignments')
          .select('property_id')
          .eq('staff_id', profile.id)
          .eq('role', 'security')
          .eq('is_active', true);

        if (assignments && assignments.length > 0) {
          const propertyIds = assignments.map(a => a.property_id);
          query = query.in('property_id', propertyIds);
        } else {
          // No assignments - show all patrols (fallback for development)
          // In production, you might want to show empty
        }
      } else if (profile.role === 'landlord') {
        // Landlords see patrols for their properties
        const { data: properties } = await supabase
          .from('properties')
          .select('id')
          .eq('landlord_id', profile.id);

        if (properties && properties.length > 0) {
          const propertyIds = properties.map(p => p.id);
          query = query.in('property_id', propertyIds);
        } else {
          setPatrols([]);
          return;
        }
      }

      const { data, error } = await query;

      if (error) {
        if (error.message.includes('relation "public.security_patrols" does not exist')) {
          toast({
            title: "Feature Not Available",
            description: "Patrol system requires database setup. Contact your administrator.",
            variant: "default"
          });
          setPatrols([]);
          return;
        }
        throw error;
      }

      setPatrols(data || []);

      // Calculate stats from fetched data
      const completed = data?.filter(p => p.status === 'completed').length || 0;
      const inProgress = data?.filter(p => p.status === 'in_progress').length || 0;
      const scheduled = data?.filter(p => p.status === 'scheduled').length || 0;
      const total = data?.length || 0;

      // Calculate average duration from completed patrols
      const completedPatrols = data?.filter(p => p.status === 'completed' && p.start_time && p.end_time) || [];
      const avgDuration = completedPatrols.length > 0
        ? completedPatrols.reduce((sum, patrol) => {
            const start = new Date(patrol.start_time!).getTime();
            const end = new Date(patrol.end_time!).getTime();
            return sum + (end - start) / (1000 * 60); // Convert to minutes
          }, 0) / completedPatrols.length
        : 0;

      setStats({
        total_patrols: total,
        completed_patrols: completed,
        in_progress_patrols: inProgress,
        scheduled_patrols: scheduled,
        completion_rate: total > 0 ? Math.round((completed / total) * 100) : 0,
        avg_duration_minutes: Math.round(avgDuration * 10) / 10
      });

    } catch (error) {
      console.error('Error fetching patrols:', error);
      toast({
        title: "Error",
        description: "Failed to load patrols",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPatrols();

    // Set up real-time subscription
    const channel = supabase
      .channel('security_patrols_changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'security_patrols'
      }, () => {
        fetchPatrols();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.id, propertyId]);

  const createPatrol = async (patrol: {
    property_id: string;
    location: string;
    scheduled_time: string;
    duration_minutes: number;
  }) => {
    try {
      const { error } = await supabase
        .from('security_patrols')
        .insert({
          ...patrol,
          security_id: profile?.id,
          status: 'scheduled'
        });

      if (error) throw error;

      toast({ title: "Patrol scheduled successfully" });
      return true;
    } catch (error) {
      console.error('Error creating patrol:', error);
      toast({ title: "Error scheduling patrol", variant: "destructive" });
      return false;
    }
  };

  const startPatrol = async (patrolId: string) => {
    try {
      const { error } = await supabase
        .from('security_patrols')
        .update({
          status: 'in_progress',
          start_time: new Date().toISOString()
        })
        .eq('id', patrolId);

      if (error) throw error;

      toast({ title: "Patrol started" });
      return true;
    } catch (error) {
      console.error('Error starting patrol:', error);
      toast({ title: "Error starting patrol", variant: "destructive" });
      return false;
    }
  };

  const completePatrol = async (patrolId: string, notes?: string) => {
    try {
      const { error } = await supabase
        .from('security_patrols')
        .update({
          status: 'completed',
          end_time: new Date().toISOString(),
          notes: notes || null
        })
        .eq('id', patrolId);

      if (error) throw error;

      toast({ title: "Patrol completed" });
      return true;
    } catch (error) {
      console.error('Error completing patrol:', error);
      toast({ title: "Error completing patrol", variant: "destructive" });
      return false;
    }
  };

  const cancelPatrol = async (patrolId: string) => {
    try {
      const { error } = await supabase
        .from('security_patrols')
        .update({ status: 'cancelled' })
        .eq('id', patrolId);

      if (error) throw error;

      toast({ title: "Patrol cancelled" });
      return true;
    } catch (error) {
      console.error('Error cancelling patrol:', error);
      toast({ title: "Error cancelling patrol", variant: "destructive" });
      return false;
    }
  };

  const deletePatrol = async (patrolId: string) => {
    try {
      const { error } = await supabase
        .from('security_patrols')
        .delete()
        .eq('id', patrolId)
        .eq('status', 'scheduled'); // Can only delete scheduled patrols

      if (error) throw error;

      toast({ title: "Patrol deleted" });
      return true;
    } catch (error) {
      console.error('Error deleting patrol:', error);
      toast({ title: "Error deleting patrol", variant: "destructive" });
      return false;
    }
  };

  // Get today's patrols
  const getTodaysPatrols = () => {
    const today = new Date().toDateString();
    return patrols.filter(patrol => {
      const patrolDate = new Date(patrol.scheduled_time).toDateString();
      return patrolDate === today;
    });
  };

  // Get patrols by status
  const getPatrolsByStatus = (status: SecurityPatrol['status']) => {
    return patrols.filter(patrol => patrol.status === status);
  };

  return {
    patrols,
    loading,
    stats,
    createPatrol,
    startPatrol,
    completePatrol,
    cancelPatrol,
    deletePatrol,
    getTodaysPatrols,
    getPatrolsByStatus,
    refresh: fetchPatrols
  };
};




