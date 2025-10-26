import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { supabaseAdmin } from '@/integrations/supabase/admin';
import { useAuth } from './useAuth';
import { useMonthlyRent } from './useMonthlyRent';

export interface TenantPayment {
  id: string;
  amount: number;
  date: string;
  status: 'paid' | 'overdue' | 'pending';
  method?: string | null;
  reference?: string | null;
  late_fee?: number;
}

export const useTenantPayments = () => {
  const { profile } = useAuth();
  const [recentPayments, setRecentPayments] = useState<TenantPayment[]>([]);
  const [rentBalance, setRentBalance] = useState<number>(0);
  const [nextPaymentDue, setNextPaymentDue] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  
  // Use monthly rent calculation
  const { 
    currentRentDue, 
    nextDueDate, 
    isOverdue, 
    daysUntilDue, 
    lateFee,
    loading: monthlyRentLoading,
    refetch: refetchMonthlyRent
  } = useMonthlyRent();

  const fetchPayments = async () => {
    if (!profile?.id) {
      console.log('❌ [useTenantPayments] No profile ID available');
      return;
    }
    
    try {
      console.log('🚀 [useTenantPayments] Starting payment fetch process...');
      console.log('🔍 [useTenantPayments] Profile ID:', profile.id);
      setLoading(true);

      // First, get tenant_info record for this profile
      console.log('📋 [useTenantPayments] Step 1: Fetching tenant_info...');
      const { data: tinfo, error: tinfoError } = await supabase
        .from('tenant_info')
        .select('id, first_name, last_name, profile_id')
        .eq('profile_id', profile.id)
        .order('updated_at', { ascending: false })
        .limit(1);
      
      if (tinfoError) {
        console.error('❌ [useTenantPayments] Error fetching tenant_info:', tinfoError);
        throw tinfoError;
      }

      console.log('✅ [useTenantPayments] Tenant info result:', {
        found: !!tinfo && tinfo.length > 0,
        count: tinfo?.length || 0,
        data: tinfo
      });

      let leaseId: string | null = null;
      let leaseRentAmount: number = 0;

      if (tinfo && tinfo.length > 0) {
        console.log('📋 [useTenantPayments] Step 2: Fetching active lease...');
        // Find active lease - try BOTH tenant_info_id AND tenant_id for compatibility
        let { data: leaseByTenantInfo, error: leaseError } = await supabaseAdmin
          .from('leases')
          .select('id, rent_amount, status, tenant_info_id, tenant_id')
          .eq('tenant_info_id', tinfo[0].id)
          .eq('status', 'active')
          .maybeSingle();
        
        console.log('🔍 [useTenantPayments] Lease query by tenant_info_id:', { leaseByTenantInfo, leaseError });
        
        // If no lease found by tenant_info_id, try by tenant_id (profile.id)
        if (!leaseByTenantInfo && profile.id) {
          console.log('🔄 [useTenantPayments] No lease found by tenant_info_id, trying with tenant_id (profile.id):', profile.id);
          const { data: profileLease, error: profileLeaseError } = await supabaseAdmin
            .from('leases')
            .select('id, rent_amount, status, tenant_info_id, tenant_id')
            .eq('tenant_id', profile.id)
            .eq('status', 'active')
            .maybeSingle();

          if (!profileLeaseError && profileLease) {
            leaseByTenantInfo = profileLease;
            leaseError = null;
            console.log('✅ [useTenantPayments] Found lease by tenant_id (profile.id)');
          } else {
            console.error('❌ [useTenantPayments] No lease found by tenant_id either:', profileLeaseError);
          }
        }
        
        if (leaseError) {
          console.error('❌ [useTenantPayments] Error fetching lease:', leaseError);
          throw leaseError;
        }
        
        console.log('✅ [useTenantPayments] Lease query result:', {
          found: !!leaseByTenantInfo,
          data: leaseByTenantInfo,
          error: leaseError
        });
        
        leaseId = leaseByTenantInfo?.id ?? null;
        leaseRentAmount = leaseByTenantInfo?.rent_amount ?? 0;
      } else {
        console.log('⚠️ [useTenantPayments] No tenant_info found for profile');
      }

      if (!leaseId) {
        console.log('⚠️ [useTenantPayments] No active lease found - setting empty state');
        setRecentPayments([]);
        setRentBalance(0);
        setNextPaymentDue('');
        return;
      }

      console.log('✅ [useTenantPayments] Active lease found:', {
        leaseId,
        rentAmount: leaseRentAmount
      });

      // Try to fetch payments with regular client first
      console.log('📋 [useTenantPayments] Step 3: Fetching payments with regular client...');
      let { data: payments, error: paymentsError } = await supabase
        .from('rent_payments')
        .select('*')
        .eq('lease_id', leaseId)
        .order('created_at', { ascending: false });

      console.log('🔍 [useTenantPayments] Regular client result:', {
        paymentsCount: payments?.length || 0,
        error: paymentsError?.message,
        errorCode: paymentsError?.code,
        errorDetails: paymentsError
      });

      // If RLS blocks the query or no payments found, try with admin client
      if ((paymentsError && (paymentsError.code === '42501' || paymentsError.message.includes('RLS') || paymentsError.message.includes('Invalid API key'))) || !payments || payments.length === 0) {
        console.log('🔄 [useTenantPayments] RLS blocked or no results - trying admin client...');
        console.log('🔍 [useTenantPayments] Admin client attempt for lease:', leaseId);
        
        const { data: adminPayments, error: adminPaymentsError } = await supabaseAdmin
          .from('rent_payments')
          .select('*')
          .eq('lease_id', leaseId)
          .order('created_at', { ascending: false });

        console.log('🔍 [useTenantPayments] Admin client result:', {
          paymentsCount: adminPayments?.length || 0,
          error: adminPaymentsError?.message,
          errorCode: adminPaymentsError?.code,
          errorDetails: adminPaymentsError
        });

        if (adminPaymentsError) {
          console.error('❌ [useTenantPayments] Admin client also failed:', adminPaymentsError);
          throw adminPaymentsError;
        }

        payments = adminPayments;
        paymentsError = null;
        console.log('✅ [useTenantPayments] Admin client succeeded, found', adminPayments?.length || 0, 'payments');
      }

      if (paymentsError) {
        console.error('❌ [useTenantPayments] Final payment error:', paymentsError);
        throw paymentsError;
      }

      console.log('📋 [useTenantPayments] Step 4: Processing payments data...');
      console.log('🔍 [useTenantPayments] Raw payments data:', payments);
      
      // Get lease start date to generate all months
      const { data: leaseDetails, error: leaseDetailsError } = await supabaseAdmin
        .from('leases')
        .select('start_date')
        .eq('id', leaseId)
        .single();

      const leaseStartDate = leaseDetails?.start_date ? new Date(leaseDetails.start_date) : new Date();
      console.log('📅 [useTenantPayments] Lease start date:', leaseStartDate);

      // Generate all months from lease start to now
      const now = new Date();
      const allMonths: { month: string; year: number; monthIndex: number }[] = [];
      const startDate = new Date(leaseStartDate.getFullYear(), leaseStartDate.getMonth(), 1);
      const currentDate = new Date(now.getFullYear(), now.getMonth(), 1);

      let iterDate = new Date(startDate);
      while (iterDate <= currentDate) {
        allMonths.push({
          month: iterDate.toISOString().slice(0, 7), // YYYY-MM format
          year: iterDate.getFullYear(),
          monthIndex: iterDate.getMonth()
        });
        iterDate.setMonth(iterDate.getMonth() + 1);
      }

      console.log('📅 [useTenantPayments] Generated months:', allMonths.length, allMonths.map(m => m.month));

      // Group payments by month (YYYY-MM)
      const paymentsByMonth = new Map<string, any[]>();
      
      (payments || []).forEach((p: any) => {
        const paymentDate = new Date(p.due_date || p.created_at);
        const monthKey = paymentDate.toISOString().slice(0, 7); // YYYY-MM format
        
        if (!paymentsByMonth.has(monthKey)) {
          paymentsByMonth.set(monthKey, []);
        }
        paymentsByMonth.get(monthKey)!.push(p);
      });

      console.log('📊 [useTenantPayments] Payments grouped by month:', {
        monthCount: paymentsByMonth.size,
        months: Array.from(paymentsByMonth.keys())
      });

      // Create one payment entry per month
      const monthlyPayments: TenantPayment[] = allMonths.map(({ month, year, monthIndex }) => {
        const monthPayments = paymentsByMonth.get(month) || [];
        
        // Aggregate data for this month
        const totalAmount = monthPayments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
        const totalLateFee = monthPayments.reduce((sum, p) => sum + Number(p.late_fee || 0), 0);
        
        // Determine status: paid if any payment is paid, overdue if any is overdue, otherwise pending
        let status: 'paid' | 'overdue' | 'pending' = 'pending';
        const hasPaid = monthPayments.some((p: any) => p.status === 'paid');
        const hasOverdue = monthPayments.some((p: any) => p.status === 'overdue');
        
        if (hasPaid) {
          status = 'paid';
        } else if (hasOverdue) {
          status = 'overdue';
        } else if (monthPayments.length === 0) {
          // No payment record for this month - check if it's overdue
          const monthDate = new Date(year, monthIndex, 1);
          const isCurrentOrFutureMonth = monthDate >= new Date(now.getFullYear(), now.getMonth(), 1);
          status = isCurrentOrFutureMonth ? 'pending' : 'overdue';
        }
        
        // Get payment method and reference from the most recent payment
        const sortedPayments = monthPayments.sort((a: any, b: any) => 
          new Date(b.paid_date || b.created_at).getTime() - new Date(a.paid_date || a.created_at).getTime()
        );
        const latestPayment = sortedPayments[0];
        
        // Use paid amount if paid, otherwise use lease rent amount
        const displayAmount = status === 'paid' && totalAmount > 0 ? totalAmount : leaseRentAmount;
        
        // Create a unique ID for this month
        const monthId = latestPayment?.id || `${month}-${status}`;
        
        // Use paid_date if paid, otherwise use the first of the month as due date
        const displayDate = latestPayment?.paid_date || `${month}-01`;

        return {
          id: monthId,
          amount: displayAmount,
          date: displayDate,
          status: status,
          method: latestPayment?.payment_method || null,
          reference: latestPayment?.transaction_reference || null,
          late_fee: totalLateFee,
        };
      }).reverse(); // Most recent first

      console.log('✅ [useTenantPayments] Final monthly payments:', {
        count: monthlyPayments.length,
        payments: monthlyPayments
      });
      
      setRecentPayments(monthlyPayments);

      // Get the actual current_balance from tenant_info table
      console.log('📋 [useTenantPayments] Step 5: Fetching current balance from tenant_info...');
      const { data: tenantInfoBalance, error: balanceError } = await supabase
        .from('tenant_info')
        .select('current_balance, payment_status')
        .eq('profile_id', profile.id)
        .order('updated_at', { ascending: false })
        .limit(1);

      if (balanceError) {
        console.error('❌ [useTenantPayments] Error fetching tenant balance:', balanceError);
        // Fallback to monthly rent calculation
        const totalOutstanding = currentRentDue + lateFee;
        setRentBalance(totalOutstanding);
      } else if (tenantInfoBalance && tenantInfoBalance.length > 0) {
        console.log('✅ [useTenantPayments] Using tenant_info balance:', tenantInfoBalance[0].current_balance);
        setRentBalance(tenantInfoBalance[0].current_balance || 0);
      } else {
        console.log('⚠️ [useTenantPayments] No tenant_info balance found, using monthly rent calculation');
        const totalOutstanding = currentRentDue + lateFee;
        setRentBalance(totalOutstanding);
      }
      
      setNextPaymentDue(nextDueDate);
      
      console.log('✅ [useTenantPayments] Payment fetch completed successfully');
    } catch (error) {
      console.error('❌ [useTenantPayments] Error in fetchPayments:', error);
      console.error('❌ [useTenantPayments] Error details:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint
      });
    } finally {
      setLoading(false);
    }
  };

  const refetch = async () => {
    console.log('🔄 [useTenantPayments] Refetching payments and monthly rent...');
    await Promise.all([
      fetchPayments(),
      refetchMonthlyRent()
    ]);
  };

  useEffect(() => {
    fetchPayments();
  }, [profile?.id]);

  // Set up real-time subscription for payment changes
  useEffect(() => {
    if (!profile?.id) return;

    console.log('🔔 [useTenantPayments] Setting up real-time subscription...');
    
    const channel = supabase
      .channel('tenant_payments_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'rent_payments'
        },
        (payload) => {
          console.log('🔄 [useTenantPayments] Payment change detected:', payload);
          console.log('🔄 [useTenantPayments] Refetching payments...');
          fetchPayments();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'tenant_info'
        },
        (payload) => {
          console.log('🔄 [useTenantPayments] Tenant info change detected:', payload);
          console.log('🔄 [useTenantPayments] Refetching payments and balance...');
          fetchPayments();
        }
      )
      .subscribe();

    return () => {
      console.log('🔕 [useTenantPayments] Cleaning up real-time subscription');
      supabase.removeChannel(channel);
    };
  }, [profile?.id]);

  return { 
    recentPayments, 
    rentBalance, 
    nextPaymentDue, 
    loading: loading || monthlyRentLoading, 
    refetch,
    // Additional monthly rent data
    currentRentDue,
    isOverdue,
    daysUntilDue,
    lateFee
  };
}
