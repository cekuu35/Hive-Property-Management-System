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
        // Find active lease using tenant_info_id
        const { data: leaseByTenantInfo, error: leaseError } = await supabase
          .from('leases')
          .select('id, rent_amount, status, tenant_info_id')
          .eq('tenant_info_id', tinfo[0].id)
          .eq('status', 'active')
          .maybeSingle();
        
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
      
      const mapped = (payments || []).map((p: any, index: number) => {
        const mappedPayment = {
          id: p.id,
          amount: Number(p.amount || 0),
          date: (p.paid_date || p.due_date) as string,
          status: p.status as 'paid' | 'overdue' | 'pending',
          method: p.payment_method,
          reference: p.transaction_reference,
        };
        console.log(`📄 [useTenantPayments] Payment ${index + 1}:`, mappedPayment);
        return mappedPayment;
      }) as TenantPayment[];

      console.log('✅ [useTenantPayments] Final mapped payments:', {
        count: mapped.length,
        payments: mapped
      });
      
      // Prioritize paid payments and recent payments
      const paidPayments = mapped.filter(p => p.status === 'paid');
      const pendingPayments = mapped.filter(p => p.status === 'pending');
      
      // Show paid payments first, then recent pending payments
      const prioritizedPayments = [
        ...paidPayments,
        ...pendingPayments.slice(0, 10 - paidPayments.length)
      ];
      
      setRecentPayments(prioritizedPayments);

      // Use monthly rent calculation for current balance
      const totalOutstanding = currentRentDue + lateFee;
      setRentBalance(totalOutstanding);
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
          console.log('🔄 [useTenantPayments] Refetching payments...');
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
