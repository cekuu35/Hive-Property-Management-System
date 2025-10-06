import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
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
    loading: monthlyRentLoading 
  } = useMonthlyRent();

  const fetchPayments = async () => {
    if (!profile?.id) return;
    try {
      setLoading(true);

      // Try to find an active lease by direct profile mapping
      const { data: leaseByProfile, error: leaseError1 } = await supabase
        .from('leases')
        .select('id, rent_amount')
        .eq('tenant_id', profile.id)
        .eq('status', 'active')
        .maybeSingle();

      if (leaseError1) throw leaseError1;

      console.log('🔍 [useTenantPayments] Profile ID:', profile.id);
      console.log('🔍 [useTenantPayments] Lease by profile:', leaseByProfile);

      let leaseId: string | null = leaseByProfile?.id ?? null;
      let leaseRentAmount: number = leaseByProfile?.rent_amount ?? 0;

      // Fallback: resolve via tenant_info.profile_id if lease not found
      if (!leaseId) {
        const { data: tinfo, error: tinfoError } = await supabase
          .from('tenant_info')
          .select('id')
          .eq('profile_id', profile.id)
          .order('updated_at', { ascending: false })
          .limit(1);
        
        if (tinfoError) throw tinfoError;

        console.log('🔍 [useTenantPayments] Tenant info:', tinfo);

        if (tinfo && tinfo.length > 0) {
          const { data: leaseByTenantInfo, error: leaseError2 } = await supabase
            .from('leases')
            .select('id, rent_amount')
            .eq('tenant_info_id', tinfo[0].id)
            .eq('status', 'active')
            .maybeSingle();
          
          if (leaseError2) throw leaseError2;
          
          console.log('🔍 [useTenantPayments] Lease by tenant_info:', leaseByTenantInfo);
          
          leaseId = leaseByTenantInfo?.id ?? null;
          leaseRentAmount = leaseByTenantInfo?.rent_amount ?? 0;
        }
      }

      if (!leaseId) {
        console.log('⚠️ [useTenantPayments] No active lease found');
        setRecentPayments([]);
        setRentBalance(0);
        setNextPaymentDue('');
        return;
      }

      console.log('✅ [useTenantPayments] Active lease found:', leaseId, 'Rent amount:', leaseRentAmount);

      const { data: payments, error: paymentsError } = await supabase
        .from('rent_payments')
        .select('*')
        .eq('lease_id', leaseId)
        .order('due_date', { ascending: false });

      if (paymentsError) throw paymentsError;

      const mapped = (payments || []).map((p: any) => ({
        id: p.id,
        amount: Number(p.amount || 0),
        date: (p.paid_date || p.due_date) as string,
        status: p.status as 'paid' | 'overdue' | 'pending',
        method: p.payment_method,
        reference: p.transaction_reference,
      })) as TenantPayment[];

      setRecentPayments(mapped.slice(0, 10));

      // Use monthly rent calculation for current balance
      const totalOutstanding = currentRentDue + lateFee;
      setRentBalance(totalOutstanding);
      setNextPaymentDue(nextDueDate);
    } catch (error) {
      console.error('Error fetching tenant payments:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, [profile?.id]);

  return { 
    recentPayments, 
    rentBalance, 
    nextPaymentDue, 
    loading: loading || monthlyRentLoading, 
    refetch: fetchPayments,
    // Additional monthly rent data
    currentRentDue,
    isOverdue,
    daysUntilDue,
    lateFee
  };
}
