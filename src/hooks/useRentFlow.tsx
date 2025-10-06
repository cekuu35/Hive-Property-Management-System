import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
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

      // Comprehensive lease lookup - try multiple approaches
      let { data: lease, error: leaseError } = await supabase
        .from('leases')
        .select('id, rent_amount, start_date, status')
        .eq('tenant_id', profile.id)
        .eq('status', 'active')
        .maybeSingle();

      // If no lease found by tenant_id, try via tenant_info
      if (!lease && !leaseError) {
        const { data: tenantInfo } = await supabase
          .from('tenant_info')
          .select('id')
          .eq('profile_id', profile.id)
          .order('updated_at', { ascending: false })
          .limit(1);

        if (tenantInfo && tenantInfo.length > 0) {
          const { data: leaseData, error: leaseError2 } = await supabase
            .from('leases')
            .select('id, rent_amount, start_date, status')
            .eq('tenant_info_id', tenantInfo[0].id)
            .eq('status', 'active')
            .maybeSingle();
          
          lease = leaseData;
          leaseError = leaseError2;
        }
      }

      // If still no lease found, try reverse lookup - find tenant_info by email
      if (!lease && !leaseError) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('email')
          .eq('id', profile.id)
          .single();

        if (profileData?.email) {
          const { data: tenantInfoByEmail } = await supabase
            .from('tenant_info')
            .select('id')
            .eq('email', profileData.email)
            .order('updated_at', { ascending: false })
            .limit(1);

          if (tenantInfoByEmail && tenantInfoByEmail.length > 0) {
            const { data: leaseData, error: leaseError2 } = await supabase
              .from('leases')
              .select('id, rent_amount, start_date, status')
              .eq('tenant_info_id', tenantInfoByEmail[0].id)
              .eq('status', 'active')
              .maybeSingle();
            
            lease = leaseData;
            leaseError = leaseError2;
          }
        }
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
