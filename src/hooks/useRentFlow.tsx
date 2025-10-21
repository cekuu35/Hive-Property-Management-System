import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { supabaseAdmin } from '@/integrations/supabase/admin';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

/**
 * Hook to manage the complete rent flow from security deposit to monthly rent
 */
export const useRentFlow = () => {
  const { profile } = useAuth();
  const [rentFlowStatus, setRentFlowStatus] = useState<{
    hasActiveLease: boolean;
    securityDepositPaid: boolean;
    monthlyRentDue: number;
    nextDueDate: string;
    isOverdue: boolean;
  }>({
    hasActiveLease: false,
    securityDepositPaid: false,
    monthlyRentDue: 0,
    nextDueDate: '',
    isOverdue: false
  });
  const [loading, setLoading] = useState(true);

  const checkRentFlow = async () => {
    if (!profile?.id) return;

    try {
      setLoading(true);

      console.log('🔍 [useRentFlow] Checking rent flow for profile ID:', profile.id);

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
        setRentFlowStatus({
          hasActiveLease: false,
          securityDepositPaid: false,
          monthlyRentDue: 0,
          nextDueDate: '',
          isOverdue: false
        });
        setLoading(false);
        return;
      }

      // Now fetch the lease - try BOTH tenant_info_id AND tenant_id for compatibility
      let { data: leaseData, error: leaseError } = await supabaseAdmin
        .from('leases')
        .select('id, rent_amount, start_date, status, tenant_info_id, tenant_id')
        .eq('tenant_info_id', tenantInfo[0].id)
        .eq('status', 'active')
        .limit(1);
      
      let lease = leaseData?.[0] || null;
      console.log('🔍 [useRentFlow] Lease query by tenant_info_id:', { lease, leaseError });

      // If no lease found by tenant_info_id, try by tenant_id (profile.id)
      if (!lease && profile.id) {
        console.log('🔄 [useRentFlow] No lease found by tenant_info_id, trying with tenant_id (profile.id):', profile.id);
        const { data: profileLeaseData, error: profileLeaseError } = await supabaseAdmin
          .from('leases')
          .select('id, rent_amount, start_date, status, tenant_info_id, tenant_id')
          .eq('tenant_id', profile.id)
          .eq('status', 'active')
          .maybeSingle();

        if (!profileLeaseError && profileLeaseData) {
          lease = profileLeaseData;
          leaseError = null;
          console.log('✅ [useRentFlow] Found lease by tenant_id (profile.id)');
        } else {
          console.error('❌ [useRentFlow] No lease found by tenant_id either:', profileLeaseError);
        }
      }

      // Log the result
      if (lease) {
        console.log('✅ [useRentFlow] Found active lease:', lease.id);
      } else {
        console.log('⚠️ [useRentFlow] No active lease found');
      }

      if (leaseError) throw leaseError;

      console.log('🔍 [useRentFlow] Lease found:', lease);

      if (!lease) {
        console.log('⚠️ [useRentFlow] No active lease found - setting hasActiveLease to false');
        setRentFlowStatus({
          hasActiveLease: false,
          securityDepositPaid: false,
          monthlyRentDue: 0,
          nextDueDate: '',
          isOverdue: false
        });
        return;
      }

      console.log('✅ [useRentFlow] Active lease found:', {
        id: lease.id,
        rent_amount: lease.rent_amount,
        status: lease.status
      });

      // Check if security deposit was paid (look for approved application with deposit_paid = true)
      const { data: application, error: appError } = await supabase
        .from('unit_applications')
        .select('deposit_paid, status')
        .eq('tenant_id', profile.id)
        .eq('status', 'approved')
        .maybeSingle();

      if (appError) throw appError;

      const securityDepositPaid = application?.deposit_paid || false;

      // Calculate monthly rent due
      const today = new Date();
      const currentMonth = today.getMonth();
      const currentYear = today.getFullYear();
      const firstDayOfCurrentMonth = new Date(currentYear, currentMonth, 1);
      const dueDate = firstDayOfCurrentMonth.toISOString().split('T')[0];

      // Check if there's a rent payment for this month
      const { data: rentPayment, error: paymentError } = await supabase
        .from('rent_payments')
        .select('id, amount, due_date, status')
        .eq('lease_id', lease.id)
        .eq('due_date', dueDate)
        .maybeSingle();

      if (paymentError) throw paymentError;

      let monthlyRentDue = 0;
      let isOverdue = false;

      if (rentPayment) {
        if (rentPayment.status !== 'paid') {
          monthlyRentDue = rentPayment.amount;
          const daysUntilDue = Math.ceil((firstDayOfCurrentMonth.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
          isOverdue = daysUntilDue < 0;
        }
      } else if (securityDepositPaid) {
        // Generate monthly rent payment if security deposit is paid but no rent payment exists
        const { error: createError } = await supabase
          .from('rent_payments')
          .insert({
            lease_id: lease.id,
            amount: lease.rent_amount,
            due_date: dueDate,
            status: 'pending'
          });

        if (createError) throw createError;

        monthlyRentDue = lease.rent_amount;
        const daysUntilDue = Math.ceil((firstDayOfCurrentMonth.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        isOverdue = daysUntilDue < 0;
      }

      setRentFlowStatus({
        hasActiveLease: true,
        securityDepositPaid,
        monthlyRentDue,
        nextDueDate: dueDate,
        isOverdue
      });

    } catch (error) {
      console.error('Error checking rent flow:', error);
      toast.error('Failed to check rent status');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkRentFlow();
  }, [profile?.id]);

  return {
    ...rentFlowStatus,
    loading,
    refetch: checkRentFlow
  };
};
