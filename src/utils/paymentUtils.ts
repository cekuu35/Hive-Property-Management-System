import { supabase } from '@/integrations/supabase/client';
import { supabaseAdmin } from '@/integrations/supabase/admin';

export interface PaymentRecord {
  id: string;
  amount: number;
  date: string;
  status: 'paid' | 'overdue' | 'pending';
  method?: string;
  reference?: string;
}

/**
 * Fetches payment history for a specific tenant
 * @param profileId - The profile ID of the tenant
 * @returns Promise<PaymentRecord[]> - Array of payment records
 */
export async function fetchTenantPaymentHistory(profileId: string): Promise<PaymentRecord[]> {
  try {
    console.log('🔄 Fetching payment history for profile:', profileId);

    // First, get tenant_info record for this profile
    const { data: tenantInfo, error: tenantInfoError } = await supabase
      .from('tenant_info')
      .select('id, first_name, last_name, profile_id')
      .eq('profile_id', profileId)
      .single();

    if (tenantInfoError) {
      console.error('❌ Error fetching tenant_info:', tenantInfoError);
      throw tenantInfoError;
    }

    if (!tenantInfo) {
      console.log('⚠️ No tenant_info found for profile:', profileId);
      return [];
    }

    console.log('✅ Found tenant_info:', tenantInfo.first_name, tenantInfo.last_name);

    // Find active lease using tenant_info_id
    const { data: lease, error: leaseError } = await supabase
      .from('leases')
      .select('id, rent_amount, status, tenant_info_id')
      .eq('tenant_info_id', tenantInfo.id)
      .eq('status', 'active')
      .maybeSingle();

    if (leaseError) {
      console.error('❌ Error fetching lease:', leaseError);
      throw leaseError;
    }

    if (!lease) {
      console.log('⚠️ No active lease found for tenant');
      return [];
    }

    console.log('✅ Found active lease:', lease.id);

    // Try to fetch payments with regular client first
    let { data: payments, error: paymentsError } = await supabase
      .from('rent_payments')
      .select('*')
      .eq('lease_id', lease.id)
      .order('created_at', { ascending: false });

    // If RLS blocks the query or no payments found, try with admin client
    if ((paymentsError && (paymentsError.code === '42501' || paymentsError.message.includes('RLS'))) || 
        !payments || payments.length === 0) {
      console.log('🔄 RLS blocked or no results - trying admin client...');
      
      const { data: adminPayments, error: adminPaymentsError } = await supabaseAdmin
        .from('rent_payments')
        .select('*')
        .eq('lease_id', lease.id)
        .order('created_at', { ascending: false });

      if (adminPaymentsError) {
        console.error('❌ Admin client also failed:', adminPaymentsError);
        throw adminPaymentsError;
      }

      payments = adminPayments;
      paymentsError = null;
      console.log('✅ Admin client succeeded, found', adminPayments?.length || 0, 'payments');
    }

    if (paymentsError) {
      console.error('❌ Final payment error:', paymentsError);
      throw paymentsError;
    }

    // Map payments to the expected format
    const mappedPayments: PaymentRecord[] = (payments || []).map((p: any) => ({
      id: p.id,
      amount: Number(p.amount || 0),
      date: (p.paid_date || p.due_date) as string,
      status: p.status as 'paid' | 'overdue' | 'pending',
      method: p.payment_method,
      reference: p.transaction_reference,
    }));

    // Prioritize paid payments and recent payments
    const paidPayments = mappedPayments.filter(p => p.status === 'paid');
    const pendingPayments = mappedPayments.filter(p => p.status === 'pending');
    
    // Show paid payments first, then recent pending payments
    const prioritizedPayments = [
      ...paidPayments,
      ...pendingPayments.slice(0, 10 - paidPayments.length)
    ];

    console.log('✅ Successfully fetched', prioritizedPayments.length, 'payments (prioritized)');
    return prioritizedPayments;

  } catch (error) {
    console.error('❌ Error in fetchTenantPaymentHistory:', error);
    throw error;
  }
}

/**
 * Refreshes payment history for all tenants (admin function)
 * @returns Promise<void>
 */
export async function refreshAllTenantPaymentHistory(): Promise<void> {
  try {
    console.log('🔄 Refreshing payment history for all tenants...');

    // Get all tenant profiles
    const { data: profiles, error: profilesError } = await supabaseAdmin
      .from('profiles')
      .select('id, user_id')
      .eq('role', 'tenant');

    if (profilesError) {
      throw profilesError;
    }

    console.log(`📊 Found ${profiles?.length || 0} tenant profiles`);

    // Refresh payment history for each tenant
    const refreshPromises = (profiles || []).map(async (profile) => {
      try {
        const payments = await fetchTenantPaymentHistory(profile.id);
        console.log(`✅ Refreshed ${payments.length} payments for profile ${profile.id}`);
        return { profileId: profile.id, paymentCount: payments.length };
      } catch (error) {
        console.error(`❌ Failed to refresh payments for profile ${profile.id}:`, error);
        return { profileId: profile.id, paymentCount: 0, error: error.message };
      }
    });

    const results = await Promise.all(refreshPromises);
    
    const successful = results.filter(r => !r.error).length;
    const failed = results.filter(r => r.error).length;
    
    console.log(`✅ Refresh completed: ${successful} successful, ${failed} failed`);
    
    return;

  } catch (error) {
    console.error('❌ Error in refreshAllTenantPaymentHistory:', error);
    throw error;
  }
}

/**
 * Gets payment statistics for a tenant
 * @param profileId - The profile ID of the tenant
 * @returns Promise<{totalPaid: number, totalPending: number, totalOverdue: number}>
 */
export async function getTenantPaymentStats(profileId: string): Promise<{
  totalPaid: number;
  totalPending: number;
  totalOverdue: number;
  totalAmount: number;
}> {
  try {
    const payments = await fetchTenantPaymentHistory(profileId);
    
    const stats = payments.reduce((acc, payment) => {
      acc.totalAmount += payment.amount;
      
      switch (payment.status) {
        case 'paid':
          acc.totalPaid += payment.amount;
          break;
        case 'pending':
          acc.totalPending += payment.amount;
          break;
        case 'overdue':
          acc.totalOverdue += payment.amount;
          break;
      }
      
      return acc;
    }, {
      totalPaid: 0,
      totalPending: 0,
      totalOverdue: 0,
      totalAmount: 0
    });

    return stats;
  } catch (error) {
    console.error('❌ Error in getTenantPaymentStats:', error);
    throw error;
  }
}
