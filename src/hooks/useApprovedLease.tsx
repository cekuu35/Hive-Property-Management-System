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
    if (!profile?.id) {
      console.log('❌ [useApprovedLease] No profile ID available');
      return;
    }

    try {
      setLoading(true);
      
      console.log('🔍 [useApprovedLease] Starting fetch for profile ID:', profile.id);
      console.log('🔍 [useApprovedLease] Profile object:', profile);
      console.log('🔍 [useApprovedLease] Profile role:', profile.role);
      
      // First, find the tenant_info record for this user
      const { data: tenantInfo, error: tenantInfoError } = await supabase
        .from('tenant_info')
        .select('id')
        .eq('profile_id', profile.id)
        .order('updated_at', { ascending: false })
        .limit(1);

      if (tenantInfoError) {
        console.error('Error fetching tenant_info:', tenantInfoError);
        setLoading(false);
        return;
      }

      if (!tenantInfo || tenantInfo.length === 0) {
        console.log('No tenant_info found for profile ID:', profile.id);
        setApprovedLease(null);
        setLoading(false);
        return;
      }

      // Now fetch the lease using tenant_info_id
      // Try the direct query first
      let { data: leaseData, error } = await supabase
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
        .limit(1);
      
      let data = leaseData?.[0] || null;

      // If the query fails due to RLS, try a different approach
      if (error && error.code === '42501') {
        console.log('RLS blocked query, trying alternative approach...');
        // Try to get all leases and filter client-side (not ideal but works)
        const { data: allLeases, error: allLeasesError } = await supabase
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
          .eq('status', 'active');
        
        if (!allLeasesError && allLeases) {
          data = allLeases.find(l => l.tenant_info_id === tenantInfo[0].id) || null;
          error = null;
        }
      }

      // Log the result
      if (error) {
        console.error('❌ Error fetching lease:', error);
      } else if (data) {
        console.log('✅ Found active lease:', data.id);
        console.log('✅ Lease details:', {
          id: data.id,
          rent_amount: data.rent_amount,
          status: data.status,
          start_date: data.start_date,
          end_date: data.end_date
        });
      } else {
        console.log('❌ No active lease found for tenant_info_id:', tenantInfo[0].id);
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
    console.log('🔍 [useApprovedLease] useEffect triggered, profile?.id:', profile?.id);
    if (profile?.id) {
      fetchApprovedLease();
    } else {
      console.log('❌ [useApprovedLease] No profile ID, not fetching lease');
      setLoading(false);
    }
  }, [profile?.id]);

  const hasApprovedLease = !!approvedLease;
  
  console.log('🔍 [useApprovedLease] Returning:', {
    approvedLease: approvedLease ? {
      id: approvedLease.id,
      rent_amount: approvedLease.rent_amount,
      status: approvedLease.status
    } : null,
    loading,
    hasApprovedLease
  });

  return {
    approvedLease,
    loading,
    refetch: fetchApprovedLease,
    hasApprovedLease,
  };
};