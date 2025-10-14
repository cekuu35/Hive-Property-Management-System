import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface LandlordInfo {
  id: string;
  first_name: string;
  last_name: string;
  avatar_url: string | null;
  email: string | null;
  phone: string | null;
  company_name: string | null;
}

export const useLandlordInfo = () => {
  const [landlordInfo, setLandlordInfo] = useState<LandlordInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { profile } = useAuth();

  useEffect(() => {
    if (!profile?.id) {
      setLoading(false);
      return;
    }

    fetchLandlordInfo();
  }, [profile?.id]);

  const fetchLandlordInfo = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get tenant's landlord through their lease or tenant_info
      let landlordId: string | null = null;

      if (profile?.role === 'tenant') {
        // First try to get landlord from tenant_info
        const { data: tenantInfo, error: tenantError } = await supabase
          .from('tenant_info')
          .select('landlord_id')
          .eq('profile_id', profile.id)
          .single();

        if (tenantError) {
          console.error('Error fetching tenant info:', tenantError);
        } else if (tenantInfo?.landlord_id) {
          landlordId = tenantInfo.landlord_id;
        } else {
          // Try to get landlord through lease
          const { data: leaseData, error: leaseError } = await supabase
            .from('leases')
            .select(`
              units!inner(
                properties!inner(
                  landlord_id
                )
              )
            `)
            .eq('tenant_id', profile.id)
            .eq('status', 'active')
            .single();

          if (leaseError) {
            console.error('Error fetching lease:', leaseError);
          } else if (leaseData?.units?.properties?.landlord_id) {
            landlordId = leaseData.units.properties.landlord_id;
          }
        }
      }

      if (!landlordId) {
        setError('No landlord found for this tenant');
        setLoading(false);
        return;
      }

      // Fetch landlord profile information
      const { data: landlordData, error: landlordError } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, avatar_url, email, phone, company_name')
        .eq('id', landlordId)
        .single();

      if (landlordError) {
        console.error('Error fetching landlord info:', landlordError);
        setError('Failed to fetch landlord information');
      } else if (landlordData) {
        setLandlordInfo(landlordData);
      }
    } catch (err) {
      console.error('Error in fetchLandlordInfo:', err);
      setError('An error occurred while fetching landlord information');
    } finally {
      setLoading(false);
    }
  };

  const refetch = () => {
    fetchLandlordInfo();
  };

  return {
    landlordInfo,
    loading,
    error,
    refetch
  };
};
