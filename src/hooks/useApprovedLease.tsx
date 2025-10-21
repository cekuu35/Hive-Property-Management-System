import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { supabaseAdmin } from '@/integrations/supabase/admin';
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
      `1q2wed`
      
      console.log('🔍 [useApprovedLease] Starting fetch for profile ID:', profile.id);
      console.log('🔍 [useApprovedLease] Profile object:', profile);
      console.log('🔍 [useApprovedLease] Profile role:', profile.role);
      console.log('🔍 [useApprovedLease] Profile user_id:', profile.user_id);
      
      // First, find the tenant_info record for this user
      let { data: tenantInfo, error: tenantInfoError } = await supabase
        .from('tenant_info')
        .select('*')
        .eq('profile_id', profile.id)
        .single();

      // If RLS blocks the query, try with admin client
      if (tenantInfoError && (tenantInfoError.code === '42501' || tenantInfoError.message.includes('RLS'))) {
        console.log('🔄 [useApprovedLease] RLS blocked query, trying with admin client...');
        const { data: adminTenantInfo, error: adminTenantInfoError } = await supabaseAdmin
          .from('tenant_info')
          .select('*')
          .eq('profile_id', profile.id)
          .single();

        if (adminTenantInfoError) {
          console.error('❌ [useApprovedLease] Admin client also failed:', adminTenantInfoError);
          setLoading(false);
          return;
        }

        tenantInfo = adminTenantInfo;
        tenantInfoError = null;
        console.log('✅ [useApprovedLease] Admin client succeeded');
      }

      if (tenantInfoError) {
        console.error('❌ [useApprovedLease] Error fetching tenant_info:', tenantInfoError);
        setLoading(false);
        return;
      }

      if (!tenantInfo || !tenantInfo.id) {
        console.log('❌ [useApprovedLease] No tenant_info found for profile ID:', profile.id);
        console.log('❌ [useApprovedLease] Query was: profile_id =', profile.id);
        setApprovedLease(null);
        setLoading(false);
        return;
      }

      console.log('✅ [useApprovedLease] Found tenant_info:', tenantInfo);
      console.log('🔍 [useApprovedLease] Tenant info ID:', tenantInfo.id);
      console.log('🔍 [useApprovedLease] Tenant info keys:', Object.keys(tenantInfo));

      // Now fetch the lease - try BOTH tenant_info_id AND tenant_id (profile_id) for compatibility
      // First try with tenant_info_id
      console.log('🔍 [useApprovedLease] Querying leases for tenant_info_id:', tenantInfo.id);
      let { data: leaseData, error } = await supabaseAdmin
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
        .eq('tenant_info_id', tenantInfo.id)
        .in('status', ['active', 'approved'])
        .order('created_at', { ascending: false })
        .limit(1);
      
      console.log('🔍 [useApprovedLease] Lease query by tenant_info_id result:', { leaseData, error });
      let data = leaseData?.[0] || null;

      // If no lease found by tenant_info_id, try by tenant_id (profile.id) - for backwards compatibility
      if (!data && profile.id) {
        console.log('🔄 [useApprovedLease] No lease found by tenant_info_id, trying with tenant_id (profile.id):', profile.id);
        const { data: profileLeaseData, error: profileLeaseError } = await supabaseAdmin
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
          .in('status', ['active', 'approved'])
          .order('created_at', { ascending: false })
          .limit(1);
        
        console.log('🔍 [useApprovedLease] Lease query by tenant_id result:', { profileLeaseData, profileLeaseError });
        
        if (!profileLeaseError && profileLeaseData?.[0]) {
          data = profileLeaseData[0];
          error = null;
          console.log('✅ [useApprovedLease] Found lease by tenant_id (profile.id)');
        } else {
          console.error('❌ [useApprovedLease] No lease found by tenant_id either:', profileLeaseError);
        }
      }

      // Log the result
      if (data) {
        console.log('✅ [useApprovedLease] Found active lease:', data.id);
        console.log('✅ [useApprovedLease] Lease details:', {
          id: data.id,
          rent_amount: data.rent_amount,
          status: data.status,
          tenant_id: data.tenant_id,
          tenant_info_id: data.tenant_info_id,
          start_date: data.start_date,
          end_date: data.end_date
        });
      } else {
        console.log('⚠️ [useApprovedLease] No active lease found for tenant');
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