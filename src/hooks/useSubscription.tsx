import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface SubscriptionStatus {
  hasActiveSubscription: boolean;
  subscriptionStatus: 'trial' | 'active' | 'cancelled' | 'expired' | null;
  planName: string | null;
  planDisplayName: string | null;
  isTrial: boolean;
  daysRemaining: number;
  currentPeriodEnd: string | null;
  trialEndDate: string | null;
}

interface SubscriptionLimits {
  max_properties: number;
  max_units: number;
  max_tenants: number;
  max_maintenance_requests: number;
}

interface SubscriptionUsage {
  properties: number;
  units: number;
  tenants: number;
  maintenanceRequests: number;
}

export const useSubscription = () => {
  const { user, profile } = useAuth();
  const [status, setStatus] = useState<SubscriptionStatus>({
    hasActiveSubscription: false,
    subscriptionStatus: null,
    planName: null,
    planDisplayName: null,
    isTrial: false,
    daysRemaining: 0,
    currentPeriodEnd: null,
    trialEndDate: null
  });
  const [limits, setLimits] = useState<SubscriptionLimits>({
    max_properties: 0,
    max_units: 0,
    max_tenants: 0,
    max_maintenance_requests: 0
  });
  const [usage, setUsage] = useState<SubscriptionUsage>({
    properties: 0,
    units: 0,
    tenants: 0,
    maintenanceRequests: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user && profile?.role === 'landlord') {
      fetchSubscriptionStatus();
      fetchUsage();
    } else {
      setLoading(false);
    }
  }, [user, profile]);

  const fetchSubscriptionStatus = async () => {
    try {
      if (!user || !profile?.id) return;

      // Fetch active subscription
      const { data: subscription, error } = await supabase
        .from('landlord_subscriptions')
        .select(`
          *,
          plan:subscription_plans(*)
        `)
        .eq('landlord_id', profile.id)
        .in('status', ['trial', 'active'])
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error || !subscription) {
        console.log('No active subscription found');
        setStatus({
          hasActiveSubscription: false,
          subscriptionStatus: null,
          planName: null,
          planDisplayName: null,
          isTrial: false,
          daysRemaining: 0,
          currentPeriodEnd: null,
          trialEndDate: null
        });
        setLoading(false);
        return;
      }

      // Calculate days remaining
      const endDate = subscription.status === 'trial' && subscription.trial_end_date
        ? new Date(subscription.trial_end_date)
        : new Date(subscription.current_period_end);
      const now = new Date();
      const daysRemaining = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      setStatus({
        hasActiveSubscription: subscription.status === 'trial' || subscription.status === 'active',
        subscriptionStatus: subscription.status,
        planName: subscription.plan.name,
        planDisplayName: subscription.plan.display_name,
        isTrial: subscription.status === 'trial',
        daysRemaining: Math.max(0, daysRemaining),
        currentPeriodEnd: subscription.current_period_end,
        trialEndDate: subscription.trial_end_date
      });

      setLimits(subscription.plan.limits);

    } catch (error) {
      console.error('Error fetching subscription status:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsage = async () => {
    try {
      if (!user || !profile?.id) return;

      // Fetch properties count
      const { data: properties } = await supabase
        .from('properties')
        .select('id')
        .eq('landlord_id', profile.id);

      // Fetch units count
      const propertyIds = properties?.map(p => p.id) || [];
      const { data: units } = await supabase
        .from('units')
        .select('id')
        .in('property_id', propertyIds);

      // Fetch active leases count
      const unitIds = units?.map(u => u.id) || [];
      const { data: leases } = await supabase
        .from('leases')
        .select('id')
        .in('unit_id', unitIds)
        .eq('status', 'active');

      // Fetch maintenance requests count (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const { data: maintenanceRequests } = await supabase
        .from('maintenance_requests')
        .select('id')
        .in('unit_id', unitIds)
        .gte('created_at', thirtyDaysAgo.toISOString());

      setUsage({
        properties: properties?.length || 0,
        units: units?.length || 0,
        tenants: leases?.length || 0,
        maintenanceRequests: maintenanceRequests?.length || 0
      });

    } catch (error) {
      console.error('Error fetching usage:', error);
    }
  };

  const checkLimit = (metric: keyof SubscriptionLimits): { 
    canAdd: boolean; 
    current: number; 
    limit: number; 
    remaining: number;
    isUnlimited: boolean;
  } => {
    const limit = limits[metric];
    const usageKey = metric.replace('max_', '') as keyof SubscriptionUsage;
    const current = usage[usageKey] || 0;

    // -1 means unlimited
    if (limit === -1) {
      return {
        canAdd: true,
        current,
        limit: -1,
        remaining: -1,
        isUnlimited: true
      };
    }

    const canAdd = current < limit;
    const remaining = Math.max(0, limit - current);

    return {
      canAdd,
      current,
      limit,
      remaining,
      isUnlimited: false
    };
  };

  const refreshUsage = () => {
    fetchUsage();
  };

  const refreshSubscription = () => {
    fetchSubscriptionStatus();
    fetchUsage();
  };

  return {
    status,
    limits,
    usage,
    loading,
    checkLimit,
    refreshUsage,
    refreshSubscription
  };
};

