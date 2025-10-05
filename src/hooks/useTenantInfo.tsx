import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface TenantInfo {
  id: string;
  tenant_status: string;
  current_balance: number;
  payment_status: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
}

export const useTenantInfo = () => {
  const { profile } = useAuth();
  const [tenantInfo, setTenantInfo] = useState<TenantInfo | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchTenantInfo = async () => {
    if (!profile?.id) return;
    
    try {
      setLoading(true);
      
      // Fetch tenant_info by profile_id
      const { data, error } = await supabase
        .from('tenant_info')
        .select('*')
        .eq('profile_id', profile.id)
        .maybeSingle();

      if (error) throw error;
      
      setTenantInfo(data);
    } catch (error) {
      console.error('Error fetching tenant info:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTenantInfo();
  }, [profile?.id]);

  // Set up real-time subscription for tenant_info changes
  useEffect(() => {
    if (!profile?.id) return;

    const channel = supabase
      .channel('tenant_info_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tenant_info',
          filter: `profile_id=eq.${profile.id}`
        },
        (payload) => {
          console.log('Tenant info updated:', payload);
          fetchTenantInfo();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.id]);

  return {
    tenantInfo,
    loading,
    refetch: fetchTenantInfo
  };
};
