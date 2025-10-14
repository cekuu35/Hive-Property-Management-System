import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface TenantInfo {
  id: string;
  first_name: string;
  last_name: string;
  avatar_url: string | null;
  email: string;
  phone: string | null;
  property_name: string | null;
  unit_number: string | null;
}

export const useTenantInfoForLandlord = () => {
  const [tenants, setTenants] = useState<TenantInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { profile } = useAuth();

  useEffect(() => {
    if (!profile?.id || profile.role !== 'landlord') {
      setLoading(false);
      return;
    }

    fetchTenants();
  }, [profile?.id, profile?.role]);

  const fetchTenants = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get all tenants for this landlord through their properties
      const { data: tenantsData, error: tenantsError } = await supabase
        .from('tenant_info')
        .select(`
          id,
          first_name,
          last_name,
          avatar_url,
          email,
          phone,
          tenants!inner(
            units!inner(
              unit_number,
              properties!inner(
                name,
                landlord_id
              )
            )
          )
        `)
        .eq('landlord_id', profile.id);

      if (tenantsError) {
        console.error('Error fetching tenants:', tenantsError);
        setError('Failed to fetch tenant information');
        return;
      }

      if (tenantsData) {
        const formattedTenants = tenantsData.map(tenant => ({
          id: tenant.id,
          first_name: tenant.first_name,
          last_name: tenant.last_name,
          avatar_url: tenant.avatar_url,
          email: tenant.email,
          phone: tenant.phone,
          property_name: tenant.tenants?.[0]?.units?.properties?.name || null,
          unit_number: tenant.tenants?.[0]?.units?.unit_number || null
        }));

        setTenants(formattedTenants);
      }
    } catch (err) {
      console.error('Error in fetchTenants:', err);
      setError('An error occurred while fetching tenant information');
    } finally {
      setLoading(false);
    }
  };

  const refetch = () => {
    fetchTenants();
  };

  return {
    tenants,
    loading,
    error,
    refetch
  };
};
