import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface TenantNotice {
  id: string;
  title: string;
  message: string;
  type: 'rent_due' | 'rent_overdue' | 'utility_due' | 'utility_overdue' | 'maintenance' | 'general';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  due_date?: string;
  amount?: number;
  created_at: string;
  is_read: boolean;
}

export const useTenantNotices = () => {
  const { profile } = useAuth();
  const [notices, setNotices] = useState<TenantNotice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchNotices = async () => {
    if (!profile?.id) return;

    try {
      setLoading(true);
      setError(null);

      // Get tenant_info for this profile
      const { data: tenantInfo, error: tenantInfoError } = await supabase
        .from('tenant_info')
        .select('id, current_balance, payment_status')
        .eq('profile_id', profile.id)
        .single();

      if (tenantInfoError) {
        console.error('Error fetching tenant info:', tenantInfoError);
        setLoading(false);
        return;
      }

      if (!tenantInfo) {
        setNotices([]);
        setLoading(false);
        return;
      }

      const generatedNotices: TenantNotice[] = [];

      // 1. Rent due notices
      const rentNotices = await generateRentNotices(tenantInfo);
      generatedNotices.push(...rentNotices);

      // 2. Utility bills notices
      const utilityNotices = await generateUtilityNotices(tenantInfo.id);
      generatedNotices.push(...utilityNotices);

      // 3. Maintenance notices
      const maintenanceNotices = await generateMaintenanceNotices(profile.id);
      generatedNotices.push(...maintenanceNotices);

      // 4. General notices from database
      const generalNotices = await fetchGeneralNotices(profile.id);
      generatedNotices.push(...generalNotices);

      // Sort by priority and date
      generatedNotices.sort((a, b) => {
        const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 };
        const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
        if (priorityDiff !== 0) return priorityDiff;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });

      setNotices(generatedNotices);
    } catch (err) {
      console.error('Error fetching notices:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch notices');
    } finally {
      setLoading(false);
    }
  };

  const generateRentNotices = async (tenantInfo: any): Promise<TenantNotice[]> => {
    const notices: TenantNotice[] = [];
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();

    // Get active lease
    const { data: lease } = await supabase
      .from('leases')
      .select('id, rent_amount, start_date')
      .eq('tenant_info_id', tenantInfo.id)
      .eq('status', 'active')
      .single();

    if (!lease) return notices;

    // Get current month's payment
    const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
    const { data: currentPayment } = await supabase
      .from('rent_payments')
      .select('id, amount, due_date, status, paid_date')
      .eq('lease_id', lease.id)
      .gte('due_date', firstDayOfMonth.toISOString().split('T')[0])
      .lt('due_date', new Date(currentYear, currentMonth + 1, 1).toISOString().split('T')[0])
      .single();

    if (currentPayment) {
      const dueDate = new Date(currentPayment.due_date);
      const daysUntilDue = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      const isOverdue = daysUntilDue < 0;
      const isPaid = currentPayment.status === 'paid';

      if (!isPaid) {
        const monthName = firstDayOfMonth.toLocaleString('default', { month: 'long' });
        
        if (isOverdue) {
          notices.push({
            id: `rent_overdue_${currentPayment.id}`,
            title: 'Rent Overdue',
            message: `Your rent payment for ${monthName} is overdue by ${Math.abs(daysUntilDue)} days. Please pay immediately to avoid additional late fees.`,
            type: 'rent_overdue',
            priority: 'urgent',
            due_date: currentPayment.due_date,
            amount: currentPayment.amount,
            created_at: new Date().toISOString(),
            is_read: false
          });
        } else if (daysUntilDue <= 3) {
          notices.push({
            id: `rent_due_${currentPayment.id}`,
            title: 'Rent Due Soon',
            message: `Your rent payment for ${monthName} is due in ${daysUntilDue} day${daysUntilDue === 1 ? '' : 's'}. Please ensure payment is made on time.`,
            type: 'rent_due',
            priority: 'high',
            due_date: currentPayment.due_date,
            amount: currentPayment.amount,
            created_at: new Date().toISOString(),
            is_read: false
          });
        } else if (daysUntilDue <= 7) {
          notices.push({
            id: `rent_due_${currentPayment.id}`,
            title: 'Rent Due This Week',
            message: `Your rent payment for ${monthName} is due in ${daysUntilDue} days. Please prepare for payment.`,
            type: 'rent_due',
            priority: 'medium',
            due_date: currentPayment.due_date,
            amount: currentPayment.amount,
            created_at: new Date().toISOString(),
            is_read: false
          });
        }
      }
    }

    return notices;
  };

  const generateUtilityNotices = async (tenantInfoId: string): Promise<TenantNotice[]> => {
    const notices: TenantNotice[] = [];
    const today = new Date();

    try {
      // Get unpaid utility bills with simplified query and explicit type casting
      const { data: unpaidBills, error } = await (supabase as any)
        .from('unit_bills')
        .select('id, amount, due_date, status, utility_id, unit_id')
        .eq('tenant_id', tenantInfoId)
        .eq('status', 'unpaid');

      if (error) {
        console.error('Error fetching utility bills:', error);
        return notices;
      }

      if (unpaidBills && Array.isArray(unpaidBills)) {
        for (const bill of unpaidBills) {
          // Fetch utility name separately
          const { data: utility } = await (supabase as any)
            .from('utilities')
            .select('name')
            .eq('id', bill.utility_id)
            .single();

          const dueDate = new Date(bill.due_date);
          const daysUntilDue = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
          const isOverdue = daysUntilDue < 0;

          const utilityName = utility?.name || 'Utility';

          if (isOverdue) {
            notices.push({
              id: `utility_overdue_${bill.id}`,
              title: 'Utility Bill Overdue',
              message: `Your ${utilityName} bill is overdue by ${Math.abs(daysUntilDue)} days.`,
              type: 'utility_overdue',
              priority: 'high',
              due_date: bill.due_date,
              amount: bill.amount,
              created_at: new Date().toISOString(),
              is_read: false
            });
          } else if (daysUntilDue <= 3) {
            notices.push({
              id: `utility_due_${bill.id}`,
              title: 'Utility Bill Due Soon',
              message: `Your ${utilityName} bill is due in ${daysUntilDue} day${daysUntilDue === 1 ? '' : 's'}.`,
              type: 'utility_due',
              priority: 'medium',
              due_date: bill.due_date,
              amount: bill.amount,
              created_at: new Date().toISOString(),
              is_read: false
            });
          }
        }
      }
    } catch (err) {
      console.error('Error generating utility notices:', err);
    }

    return notices;
  };

  const generateMaintenanceNotices = async (profileId: string): Promise<TenantNotice[]> => {
    const notices: TenantNotice[] = [];

    try {
      // Get pending maintenance requests with explicit type casting
      const { data: pendingRequests } = await (supabase as any)
        .from('maintenance_requests')
        .select('id, title, description, status, created_at')
        .eq('tenant_id', profileId)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(3);

      if (pendingRequests) {
        for (const request of pendingRequests) {
          notices.push({
            id: `maintenance_${request.id}`,
            title: 'Maintenance Request Pending',
            message: `Your maintenance request "${request.title}" is still pending review.`,
            type: 'maintenance',
            priority: 'low',
            created_at: request.created_at,
            is_read: false
          });
        }
      }
    } catch (err) {
      console.error('Error generating maintenance notices:', err);
    }

    return notices;
  };

  const fetchGeneralNotices = async (profileId: string): Promise<TenantNotice[]> => {
    // This would fetch general notices from a notices table
    // For now, return empty array
    return [];
  };

  const markAsRead = async (noticeId: string) => {
    setNotices(prev => 
      prev.map(notice => 
        notice.id === noticeId 
          ? { ...notice, is_read: true }
          : notice
      )
    );
  };

  const markAllAsRead = async () => {
    setNotices(prev => 
      prev.map(notice => ({ ...notice, is_read: true }))
    );
  };

  useEffect(() => {
    fetchNotices();
  }, [profile?.id]);

  return {
    notices,
    loading,
    error,
    refetch: fetchNotices,
    markAsRead,
    markAllAsRead
  };
};
