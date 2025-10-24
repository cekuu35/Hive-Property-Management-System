import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { supabaseAdmin } from '@/integrations/supabase/admin';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface MonthlyRentData {
  currentRentDue: number;
  nextDueDate: string;
  isOverdue: boolean;
  daysUntilDue: number;
  lateFee: number;
}

export const useMonthlyRent = () => {
  const [monthlyRentData, setMonthlyRentData] = useState<MonthlyRentData>({
    currentRentDue: 0,
    nextDueDate: '',
    isOverdue: false,
    daysUntilDue: 0,
    lateFee: 0
  });
  const [loading, setLoading] = useState(true);
  const { profile } = useAuth();

  const calculateMonthlyRent = async () => {
    if (!profile?.id) return;

    try {
      setLoading(true);

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
        setMonthlyRentData({
          currentRentDue: 0,
          nextDueDate: '',
          isOverdue: false,
          daysUntilDue: 0,
          lateFee: 0
        });
        setLoading(false);
        return;
      }

      // Now fetch the lease - try BOTH tenant_info_id AND tenant_id for compatibility
      let { data: lease, error: leaseError } = await supabaseAdmin
        .from('leases')
        .select('id, rent_amount, start_date')
        .eq('tenant_info_id', tenantInfo[0].id)
        .eq('status', 'active')
        .maybeSingle();

      console.log('🔍 [useMonthlyRent] Lease query by tenant_info_id:', { lease, leaseError });

      // If no lease found by tenant_info_id, try by tenant_id (profile.id)
      if (!lease && profile.id) {
        console.log('🔄 [useMonthlyRent] No lease found by tenant_info_id, trying with tenant_id (profile.id):', profile.id);
        const { data: profileLease, error: profileLeaseError } = await supabaseAdmin
          .from('leases')
          .select('id, rent_amount, start_date')
          .eq('tenant_id', profile.id)
          .eq('status', 'active')
          .maybeSingle();

        if (!profileLeaseError && profileLease) {
          lease = profileLease;
          leaseError = null;
          console.log('✅ [useMonthlyRent] Found lease by tenant_id (profile.id)');
        } else {
          console.error('❌ [useMonthlyRent] No lease found by tenant_id either:', profileLeaseError);
        }
      }

      // Log the result
      if (lease) {
        console.log('✅ [useMonthlyRent] Found active lease:', lease.id);
      } else {
        console.log('⚠️ [useMonthlyRent] No active lease found');
      }

      if (leaseError) throw leaseError;

      console.log('🔍 [useMonthlyRent] Profile ID:', profile.id);
      console.log('🔍 [useMonthlyRent] Active lease found:', lease);

      if (!lease || !lease.id) {
        console.log('⚠️ [useMonthlyRent] No active lease found for tenant');
        setMonthlyRentData({
          currentRentDue: 0,
          nextDueDate: '',
          isOverdue: false,
          daysUntilDue: 0,
          lateFee: 0
        });
        setLoading(false);
        return;
      }

      console.log('💰 [useMonthlyRent] Lease rent amount:', lease.rent_amount);
      console.log('💰 [useMonthlyRent] Lease ID:', lease.id);

      const today = new Date();
      const currentMonth = today.getMonth();
      const currentYear = today.getFullYear();
      
      // Calculate the first day of current month (using UTC to avoid timezone issues)
      const firstDayOfCurrentMonth = new Date(Date.UTC(currentYear, currentMonth, 1));
      const dueDate = firstDayOfCurrentMonth.toISOString().split('T')[0];

      // Check if there's already a payment for this month
      const { data: existingPayment, error: paymentError } = await supabase
        .from('rent_payments')
        .select('id, amount, due_date, status, paid_date, late_fee')
        .eq('lease_id', lease.id)
        .eq('due_date', dueDate)
        .maybeSingle();

      if (paymentError) throw paymentError;

      let currentRentDue = 0;
      let isOverdue = false;
      let daysUntilDue = 0;
      let lateFee = 0;
      let nextDueDate = dueDate;

      if (existingPayment) {
        // Payment exists for this month
        if (existingPayment.status === 'paid') {
          // Check if we need to generate next month's payment
          const nextMonth = new Date(Date.UTC(currentYear, currentMonth + 1, 1));
          const nextMonthDue = nextMonth.toISOString().split('T')[0];
          
          // Check if next month's payment exists
          const { data: nextMonthPayment, error: nextMonthError } = await supabase
            .from('rent_payments')
            .select('id')
            .eq('lease_id', lease.id)
            .eq('due_date', nextMonthDue)
            .maybeSingle();

          if (nextMonthError) throw nextMonthError;

          if (!nextMonthPayment) {
            // Generate next month's payment
            await generateNextMonthPayment(lease.id, lease.rent_amount, nextMonthDue);
            currentRentDue = lease.rent_amount;
            nextDueDate = nextMonthDue;
            daysUntilDue = Math.ceil((nextMonth.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
          } else {
            // Next month's payment exists, check if it's paid
            const { data: nextPayment, error: nextError } = await supabase
              .from('rent_payments')
              .select('status, due_date, late_fee')
              .eq('lease_id', lease.id)
              .eq('due_date', nextMonthDue)
              .single();

            if (nextError) throw nextError;

            if (nextPayment.status !== 'paid') {
              currentRentDue = lease.rent_amount;
              nextDueDate = nextPayment.due_date;
              const nextDue = new Date(nextPayment.due_date);
              daysUntilDue = Math.ceil((nextDue.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
              isOverdue = daysUntilDue < 0;
              // Use the actual late fee from the database
              lateFee = nextPayment.late_fee || 0;
            }
          }
        } else {
          // Current month's payment is not paid
          currentRentDue = existingPayment.amount;
          nextDueDate = existingPayment.due_date;
          const due = new Date(existingPayment.due_date);
          daysUntilDue = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
          isOverdue = daysUntilDue < 0;
          // Use the actual late fee from the database
          lateFee = existingPayment.late_fee || 0;
          
          console.log('💰 [useMonthlyRent] Payment details:', {
            paymentId: existingPayment.id,
            amount: existingPayment.amount,
            dueDate: existingPayment.due_date,
            status: existingPayment.status,
            lateFee: lateFee,
            isOverdue: isOverdue,
            daysOverdue: Math.abs(daysUntilDue)
          });
        }
      } else {
        // No payment exists for this month, create one
        console.log('🔄 [useMonthlyRent] No payment exists for current month, creating one...');
        console.log('📋 [useMonthlyRent] Creating payment:', {
          leaseId: lease.id,
          rentAmount: lease.rent_amount,
          dueDate: dueDate
        });
        
        try {
          await generateNextMonthPayment(lease.id, lease.rent_amount, dueDate);
          console.log('✅ [useMonthlyRent] Payment created successfully');
        } catch (error) {
          console.error('❌ [useMonthlyRent] Failed to create payment:', error);
          // Continue with the calculation even if creation fails
        }
        
        currentRentDue = lease.rent_amount;
        nextDueDate = dueDate;
        const due = new Date(dueDate);
        daysUntilDue = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        isOverdue = daysUntilDue < 0;
        // Late fee will be 0 for newly created payments (calculated by cron job when overdue)
        lateFee = 0;
      }

      setMonthlyRentData({
        currentRentDue,
        nextDueDate,
        isOverdue,
        daysUntilDue,
        lateFee
      });

    } catch (error) {
      console.error('Error calculating monthly rent:', error);
      toast.error('Failed to calculate rent due');
    } finally {
      setLoading(false);
    }
  };

  const generateNextMonthPayment = async (leaseId: string, rentAmount: number, dueDate: string) => {
    try {
      console.log('🔄 [generateNextMonthPayment] Creating payment record...');
      console.log('📋 [generateNextMonthPayment] Payment data:', {
        lease_id: leaseId,
        amount: rentAmount,
        due_date: dueDate,
        status: 'pending'
      });
      
      const { data, error } = await supabase
        .from('rent_payments')
        .insert({
          lease_id: leaseId,
          amount: rentAmount,
          due_date: dueDate,
          status: 'pending'
        })
        .select();

      if (error) {
        console.error('❌ [generateNextMonthPayment] Insert failed:', error);
        throw error;
      }
      
      console.log('✅ [generateNextMonthPayment] Payment created:', data);
    } catch (error) {
      console.error('❌ [generateNextMonthPayment] Error generating next month payment:', error);
      throw error;
    }
  };

  const generateMonthlyRentForAllTenants = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('generate-monthly-rent');
      
      if (error) throw error;
      
      toast.success('Monthly rent payments generated successfully');
      return data;
    } catch (error) {
      console.error('Error generating monthly rent:', error);
      toast.error('Failed to generate monthly rent payments');
      throw error;
    }
  };

  useEffect(() => {
    calculateMonthlyRent();
  }, [profile?.id]);

  // Set up real-time subscription for rent_payments changes
  useEffect(() => {
    if (!profile?.id) return;

    const channel = supabase
      .channel('rent_payments_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'rent_payments'
        },
        (payload) => {
          console.log('🔄 [useMonthlyRent] Rent payment change detected:', payload);
          calculateMonthlyRent();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.id]);

  return {
    ...monthlyRentData,
    loading,
    refetch: calculateMonthlyRent,
    generateMonthlyRentForAllTenants
  };
};
