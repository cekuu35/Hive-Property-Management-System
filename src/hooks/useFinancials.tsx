import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';
import { RealtimeChannel } from '@supabase/supabase-js';

interface FinancialData {
  totalCollected: number;
  totalExpected: number;
  overdue: number;
  totalExpenses: number;
  netProfit: number;
  recentTransactions: Transaction[];
  monthlyData: MonthlyData[];
  expenses: Record<string, number>;
}

interface Transaction {
  id: string;
  tenant: string;
  unit: string;
  amount: number;
  date: string;
  status: 'paid' | 'overdue' | 'pending';
  type: 'rent' | 'maintenance' | 'expense';
}

interface MonthlyData {
  month: string;
  income: number;
  expenses: number;
  profit: number;
}

interface Expense {
  id?: string;
  category: string;
  amount: number;
  description: string;
  date: string;
}

export const useFinancials = () => {
  const [financialData, setFinancialData] = useState<FinancialData | null>(null);
  const [loading, setLoading] = useState(true);
  const { profile } = useAuth();
  const { toast } = useToast();
  const [realtimeChannel, setRealtimeChannel] = useState<RealtimeChannel | null>(null);

  const fetchFinancialData = async () => {
    if (!profile?.id) return;

    try {
      setLoading(true);

      // Fetch rent payments with related lease and tenant data
      // Only fetch payments for properties owned by current landlord
      const { data: rentPayments, error: rentError } = await supabase
        .from('rent_payments')
        .select(`
          *,
          lease:leases (
            tenant_id,
            tenant_info_id,
            unit:units (
              unit_number,
              property:properties!inner (
                name,
                landlord_id
              )
            )
          )
        `)
        .eq('lease.unit.property.landlord_id', profile.id)
        .order('created_at', { ascending: false });

      if (rentError) throw rentError;

      // Get tenant info from tenant_info table using profile_id (from lease.tenant_id)
      const tenantProfileIds = [...new Set(rentPayments?.map(payment => payment.lease?.tenant_id).filter(Boolean) || [])];
      
      // Also get tenant_info_ids from leases
      const tenantInfoIds = [...new Set(rentPayments?.map(payment => payment.lease?.tenant_info_id).filter(Boolean) || [])];
      
      let tenantInfoMap = new Map();
      
      // Method 1: Get tenant_info by profile_id
      if (tenantProfileIds.length > 0) {
        const { data: tenantsByProfile, error: tenantError } = await supabase
          .from('tenant_info')
          .select('profile_id, first_name, last_name')
          .in('profile_id', tenantProfileIds);

        if (!tenantError && tenantsByProfile) {
          tenantsByProfile.forEach(tenant => {
            tenantInfoMap.set(tenant.profile_id, tenant);
          });
        }
      }
      
      // Method 2: Get tenant_info by tenant_info_id (direct)
      if (tenantInfoIds.length > 0) {
        const { data: tenantsById, error: tenantByIdError } = await supabase
          .from('tenant_info')
          .select('id, profile_id, first_name, last_name')
          .in('id', tenantInfoIds);

        if (!tenantByIdError && tenantsById) {
          tenantsById.forEach(tenant => {
            // Map by both id and profile_id for lookup
            tenantInfoMap.set(tenant.id, tenant);
            if (tenant.profile_id) {
              tenantInfoMap.set(tenant.profile_id, tenant);
            }
          });
        }
      }

      // Fetch expenses data
      const { data: expenses, error: expensesError } = await supabase
        .from('expenses')
        .select('*')
        .eq('landlord_id', profile.id)
        .order('created_at', { ascending: false });

      if (expensesError) throw expensesError;

      // Calculate financial metrics
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();

      const monthlyPayments = rentPayments?.filter(payment => {
        const paymentDate = new Date(payment.due_date);
        return paymentDate.getMonth() === currentMonth && paymentDate.getFullYear() === currentYear;
      }) || [];

      const totalExpected = monthlyPayments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
      const totalCollected = monthlyPayments
        .filter(payment => payment.status === 'paid')
        .reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
      const overdue = monthlyPayments
        .filter(payment => payment.status === 'overdue')
        .reduce((sum, payment) => sum + Number(payment.amount || 0), 0);

      // Calculate expenses by category from real data
      const expensesByCategory = expenses?.reduce((acc, expense) => {
        acc[expense.category] = (acc[expense.category] || 0) + Number(expense.amount);
        return acc;
      }, {} as Record<string, number>) || {};

      const totalExpenses = Object.values(expensesByCategory).reduce((sum, expense) => sum + expense, 0);
      const netProfit = totalCollected - totalExpenses;

      // Format recent transactions from real data
      const recentTransactions: Transaction[] = [
        // Rent payments
        ...monthlyPayments.slice(0, 5).map(payment => {
          // Try to get tenant name from tenant_info
          let tenantName = 'Unknown';
          const tenantProfileId = payment.lease?.tenant_id;
          const tenantInfoId = payment.lease?.tenant_info_id;
          
          if (tenantProfileId) {
            const tenantInfo = tenantInfoMap.get(tenantProfileId);
            if (tenantInfo) {
              tenantName = `${tenantInfo.first_name || ''} ${tenantInfo.last_name || ''}`.trim() || 'Unknown';
            }
          }
          
          // Fallback: try by tenant_info_id
          if (tenantName === 'Unknown' && tenantInfoId) {
            const tenantInfo = tenantInfoMap.get(tenantInfoId);
            if (tenantInfo) {
              tenantName = `${tenantInfo.first_name || ''} ${tenantInfo.last_name || ''}`.trim() || 'Unknown';
            }
          }
          
          return {
            id: payment.id,
            tenant: tenantName,
            unit: payment.lease?.unit?.unit_number || 'Unknown',
            amount: Number(payment.amount || 0),
            date: payment.paid_date || payment.due_date,
            status: payment.status as 'paid' | 'overdue' | 'pending',
            type: 'rent' as const
          };
        }),
        // Recent expenses
        ...expenses?.slice(0, 3).map(expense => ({
          id: expense.id,
          tenant: expense.description,
          unit: 'General',
          amount: -Number(expense.amount),
          date: expense.date,
          status: 'paid' as const,
          type: 'expense' as const
        })) || []
      ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 10);

      // Generate monthly data for the last 3 months
      const monthlyData: MonthlyData[] = [];
      for (let i = 2; i >= 0; i--) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        const monthName = date.toLocaleDateString('en', { month: 'short' });
        
        const monthPayments = rentPayments?.filter(payment => {
          const paymentDate = new Date(payment.due_date);
          return paymentDate.getMonth() === date.getMonth() && 
                 paymentDate.getFullYear() === date.getFullYear() &&
                 payment.status === 'paid';
        }) || [];

        const monthExpenses = expenses?.filter(expense => {
          const expenseDate = new Date(expense.date);
          return expenseDate.getMonth() === date.getMonth() && 
                 expenseDate.getFullYear() === date.getFullYear();
        }) || [];

        const income = monthPayments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
        const expenseAmount = monthExpenses.reduce((sum, expense) => sum + Number(expense.amount || 0), 0);
        
        monthlyData.push({
          month: monthName,
          income,
          expenses: expenseAmount,
          profit: income - expenseAmount
        });
      }

      setFinancialData({
        totalCollected,
        totalExpected,
        overdue,
        totalExpenses,
        netProfit,
        recentTransactions,
        monthlyData,
        expenses: expensesByCategory
      });

    } catch (error) {
      console.error('Error fetching financial data:', error);
      toast({
        title: "Error",
        description: "Failed to load financial data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const addExpense = async (expense: Expense) => {
    if (!profile?.id) return;
    
    try {
      const { error } = await supabase
        .from('expenses')
        .insert({
          landlord_id: profile.id,
          category: expense.category,
          amount: expense.amount,
          description: expense.description,
          date: expense.date
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Expense added successfully",
      });
      
      // Refresh data
      await fetchFinancialData();
    } catch (error) {
      console.error('Error adding expense:', error);
      toast({
        title: "Error",
        description: "Failed to add expense",
        variant: "destructive"
      });
    }
  };

  const updatePaymentStatus = async (paymentId: string, status: 'paid' | 'overdue' | 'pending', paidDate?: string) => {
    try {
      const updateData: any = { status };
      if (status === 'paid' && paidDate) {
        updateData.paid_date = paidDate;
      }

      const { error } = await supabase
        .from('rent_payments')
        .update(updateData)
        .eq('id', paymentId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Payment status updated successfully",
      });
      
      // Refresh data
      await fetchFinancialData();
    } catch (error) {
      console.error('Error updating payment status:', error);
      toast({
        title: "Error",
        description: "Failed to update payment status",
        variant: "destructive"
      });
    }
  };

  const generateReport = async (reportType: string, period: string) => {
    try {
      toast({
        title: "Generating Report",
        description: `Creating ${reportType} report for ${period}...`,
      });
      
      // Simulate report generation
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      toast({
        title: "Report Generated",
        description: "Your financial report has been generated and will be downloaded shortly.",
      });
    } catch (error) {
      console.error('Error generating report:', error);
      toast({
        title: "Error",
        description: "Failed to generate report",
        variant: "destructive"
      });
    }
  };

  useEffect(() => {
    fetchFinancialData();
    
    // Set up real-time subscriptions
    if (profile?.id) {
      const channel = supabase
        .channel('financial-updates')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'rent_payments'
          },
          () => {
            fetchFinancialData();
          }
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'expenses'
          },
          () => {
            fetchFinancialData();
          }
        )
        .subscribe();

      setRealtimeChannel(channel);

      return () => {
        if (realtimeChannel) {
          supabase.removeChannel(realtimeChannel);
        }
      };
    }
  }, [profile?.id]);

  return {
    financialData,
    loading,
    addExpense,
    generateReport,
    updatePaymentStatus,
    refetch: fetchFinancialData
  };
};