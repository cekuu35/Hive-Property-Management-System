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
  security_deposit?: number;
  payment_due_date?: number;
  late_fee_amount?: number;
  terms?: string;
  status: string;
  tenant_id: string;
  tenant_info_id: string | null;
  lease_document_url: string | null;
  created_at: string;
  updated_at: string;
  units: {
    id: string;
    unit_number: string;
    type: string;
    property_id: string;
    properties: {
      id: string;
      name: string;
      address: string;
      landlord_id: string;
      profiles?: {
        id: string;
        user_id: string;
        first_name: string | null;
        last_name: string | null;
        email: string | null;
        phone: string | null;
      };
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
      console.log('🔍 [useApprovedLease] Full tenant_info object:', JSON.stringify(tenantInfo, null, 2));

      // Now fetch the lease - try multiple approaches
      console.log('🔍 [useApprovedLease] Step 1: Querying ALL leases for tenant_info_id:', tenantInfo.id);
      
      // First, check if there are ANY leases for this tenant_info_id
      const { data: allLeases, error: allLeasesError } = await supabaseAdmin
        .from('leases')
        .select('id, status, tenant_info_id, tenant_id')
        .eq('tenant_info_id', tenantInfo.id);
      
      console.log('🔍 [useApprovedLease] ALL leases for tenant_info_id:', allLeases);
      console.log('🔍 [useApprovedLease] Errors (if any):', allLeasesError);
      
      // Now try with tenant_info_id and active/approved status
      console.log('🔍 [useApprovedLease] Step 2: Querying ACTIVE leases for tenant_info_id:', tenantInfo.id);
      let { data: leaseData, error } = await supabaseAdmin
        .from('leases')
        .select(`
          *,
          units (
            id,
            unit_number,
            type,
            property_id,
            properties (
              id,
              name,
              address,
              landlord_id,
              profiles:landlord_id (
                id,
                user_id,
                first_name,
                last_name,
                email,
                phone
              )
            )
          )
        `)
        .eq('tenant_info_id', tenantInfo.id)
        .in('status', ['active', 'approved'])
        .order('created_at', { ascending: false })
        .limit(1);
      
      console.log('🔍 [useApprovedLease] Lease query by tenant_info_id result:', { leaseData, error });
      let data = leaseData?.[0] || null;

      // If no active/approved lease found, check if there are ANY leases and log them
      if (!data && allLeases && allLeases.length > 0) {
        console.warn('⚠️ [useApprovedLease] No ACTIVE/APPROVED lease found, but these leases exist:', allLeases);
        console.warn('⚠️ [useApprovedLease] You may need to change lease status to "active" or "approved" in database');
      }

      // If no lease found by tenant_info_id, try by tenant_id (profile.id) - for backwards compatibility
      if (!data && profile.id) {
        console.log('🔄 [useApprovedLease] No active lease found by tenant_info_id');
        console.log('🔄 [useApprovedLease] Trying fallback: tenant_id (profile.id):', profile.id);
        const { data: profileLeaseData, error: profileLeaseError } = await supabaseAdmin
          .from('leases')
          .select(`
            *,
            units (
              id,
              unit_number,
              type,
              property_id,
              properties (
                id,
                name,
                address,
                landlord_id,
                profiles:landlord_id (
                  id,
                  user_id,
                  first_name,
                  last_name,
                  email,
                  phone
                )
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
          console.error('❌ [useApprovedLease] No active lease found by tenant_id either');
          
          // Check if there are ANY leases for this profile.id
          const { data: allProfileLeases } = await supabaseAdmin
            .from('leases')
            .select('id, status, tenant_info_id, tenant_id')
            .eq('tenant_id', profile.id);
          
          if (allProfileLeases && allProfileLeases.length > 0) {
            console.warn('⚠️ [useApprovedLease] Found leases for profile.id but none are active/approved:', allProfileLeases);
          } else {
            console.error('❌ [useApprovedLease] No leases found for profile.id at all');
          }
        }
      }

      // Final check - if still no data, provide helpful error message
      if (!data) {
        console.error('❌ [useApprovedLease] SUMMARY: No lease found');
        console.error('❌ [useApprovedLease] Searched for:');
        console.error('   - tenant_info_id:', tenantInfo.id);
        console.error('   - tenant_id (profile.id):', profile.id);
        console.error('   - status: active or approved');
        console.error('❌ [useApprovedLease] Please check:');
        console.error('   1. Does a lease exist in the leases table?');
        console.error('   2. Is the lease status set to "active" or "approved"?');
        console.error('   3. Does the lease have the correct tenant_info_id or tenant_id?');
        console.error('   4. Run this SQL to check: SELECT * FROM leases WHERE tenant_info_id = \'', tenantInfo.id, '\' OR tenant_id = \'', profile.id, '\'');
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