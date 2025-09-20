import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

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

  const fetchPayments = async () => {
    if (!profile?.id) return;
    try {
      setLoading(true);

      // Try to find an active lease by direct profile mapping
      const { data: leaseByProfile, error: leaseError1 } = await supabase
        .from('leases')
        .select('id')
        .eq('tenant_id', profile.id)
        .eq('status', 'active')
        .maybeSingle();

      if (leaseError1) throw leaseError1;

      let leaseId: string | null = leaseByProfile?.id ?? null;

      // Fallback: resolve via tenant_info.profile_id if lease not found
      if (!leaseId) {
        const { data: tinfo, error: tinfoError } = await supabase
          .from('tenant_info')
          .select('id')
          .eq('profile_id', profile.id)
          .maybeSingle();
        if (tinfoError) throw tinfoError;

        if (tinfo?.id) {
          const { data: leaseByTenantInfo, error: leaseError2 } = await supabase
            .from('leases')
            .select('id')
            .eq('tenant_info_id', tinfo.id)
            .eq('status', 'active')
            .maybeSingle();
          if (leaseError2) throw leaseError2;
          leaseId = leaseByTenantInfo?.id ?? null;
        }
      }

      if (!leaseId) {
        setRecentPayments([]);
        setRentBalance(0);
        setNextPaymentDue('');
        return;
      }

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

      const outstanding = (payments || [])
        .filter((p: any) => p.status !== 'paid')
        .reduce((sum: number, p: any) => sum + Number(p.amount || 0), 0);
      setRentBalance(outstanding);

      const today = new Date();
      const upcoming = (payments || [])
        .filter((p: any) => p.status !== 'paid')
        .map((p: any) => ({ due: new Date(p.due_date), str: p.due_date as string }))
        .filter((x: any) => !isNaN(x.due.getTime()) && x.due >= new Date(today.toDateString()))
        .sort((a: any, b: any) => a.due.getTime() - b.due.getTime());

      setNextPaymentDue(upcoming[0]?.str || '');
    } catch (error) {
      console.error('Error fetching tenant payments:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, [profile?.id]);

  return { recentPayments, rentBalance, nextPaymentDue, loading, refetch: fetchPayments };
}
