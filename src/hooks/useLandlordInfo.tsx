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

      console.log('🔍 [useLandlordInfo] Starting fetch for profile:', profile?.id);

      if (profile?.role !== 'tenant') {
        console.log('⚠️ [useLandlordInfo] User is not a tenant');
        setLoading(false);
        return;
      }

      // Use the database function that bypasses RLS
      console.log('🔍 [useLandlordInfo] Calling get_tenant_landlord_v2 RPC...');
      const { data: landlordData, error: landlordError } = await supabase
        .rpc('get_tenant_landlord_v2', { tenant_profile_id: profile.id });

      console.log('📊 [useLandlordInfo] RPC result:', { landlordData, landlordError });

      if (landlordError) {
        console.error('❌ [useLandlordInfo] RPC error:', landlordError);
        setError(`Unable to load landlord information: ${landlordError.message}`);
        setLoading(false);
        return;
      }

      if (!landlordData || landlordData.length === 0) {
        console.warn('⚠️ [useLandlordInfo] No landlord found');
        setError('No landlord assigned yet. Please contact your property administrator.');
        setLoading(false);
        return;
      }

      // Extract landlord data from the first result
      const landlord = landlordData[0];
      console.log('✅ [useLandlordInfo] Successfully fetched landlord:', landlord);

      setLandlordInfo({
        id: landlord.landlord_id,
        first_name: landlord.landlord_first_name,
        last_name: landlord.landlord_last_name,
        avatar_url: landlord.landlord_avatar_url,
        email: landlord.landlord_email || null,
        phone: landlord.landlord_phone || null,
        company_name: landlord.landlord_company_name || null
      });
    } catch (err) {
      console.error('❌ [useLandlordInfo] Unexpected error:', err);
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
