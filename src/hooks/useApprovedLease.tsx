import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface ApprovedLease {
  id: string;
  unit_id: string;
  start_date: string;
  end_date: string;
  rent_amount: number;
  deposit_amount: number;
  status: string;
  tenant_id: string;
  tenant_info_id: string | null;
  lease_document_url: string | null;
  created_at: string;
  updated_at: string;
  units: {
    unit_number: string;
    type: string;
    properties: {
      id: string;
      name: string;
      address: string;
      landlord_id: string;
    };
  } | null;
}

export const useApprovedLease = () => {
  const [approvedLease, setApprovedLease] = useState<ApprovedLease | null>(null);
  const [loading, setLoading] = useState(true);
  const { profile } = useAuth();

  const fetchApprovedLease = async () => {
    if (!profile?.id) return;

    try {
      setLoading(true);
      
      console.log('🔍 [useApprovedLease] Fetching lease for profile ID:', profile.id);
      
      // First try to find lease by tenant_id
      let { data, error } = await supabase
        .from('leases')
        .select(`
          *,
          units (
            unit_number,
            type,
            properties (
              id,
              name,
              address,
              landlord_id
            )
          )
        `)
        .eq('tenant_id', profile.id)
        .eq('status', 'active')
        .maybeSingle();

      // If no lease found by tenant_id, try to find via tenant_info
      if (!data && !error) {
        const { data: tenantInfo } = await supabase
          .from('tenant_info')
          .select('id')
          .eq('profile_id', profile.id)
          .order('updated_at', { ascending: false })
          .limit(1);

        if (tenantInfo && tenantInfo.length > 0) {
          const { data: leaseData, error: leaseError } = await supabase
            .from('leases')
            .select(`
              *,
              units (
                unit_number,
                type,
                properties (
                  id,
                  name,
                  address,
                  landlord_id
                )
              )
            `)
            .eq('tenant_info_id', tenantInfo[0].id)
            .eq('status', 'active')
            .maybeSingle();
          
          data = leaseData;
          error = leaseError;
        }
      }

      if (error && error.code !== 'PGRST116') { // PGRST116 is "not found"
        console.error('❌ [useApprovedLease] Supabase query error:', error);
        throw error;
      }

      console.log('🔍 [useApprovedLease] Lease data:', data);
      
      if (data) {
        console.log('✅ [useApprovedLease] Active lease found:', {
          id: data.id,
          rent_amount: data.rent_amount,
          status: data.status,
          unit: data.units?.unit_number
        });
      } else {
        console.log('⚠️ [useApprovedLease] No active lease found');
      }

      setApprovedLease(data as ApprovedLease);
    } catch (error) {
      if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
        console.error('Network connectivity error - unable to reach Supabase:', error);
      } else {
        console.error('Error fetching approved lease:', error);
      }
      setApprovedLease(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApprovedLease();
  }, [profile?.id]);

  return {
    approvedLease,
    loading,
    refetch: fetchApprovedLease,
    hasApprovedLease: !!approvedLease,
  };
};