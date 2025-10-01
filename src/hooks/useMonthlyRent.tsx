import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
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

      // Find active lease
      const { data: lease, error: leaseError } = await supabase
        .from('leases')
        .select('id, rent_amount, start_date')
        .eq('tenant_id', profile.id)
        .eq('status', 'active')
        .maybeSingle();

      if (leaseError) throw leaseError;

      if (!lease) {
        setMonthlyRentData({
          currentRentDue: 0,
          nextDueDate: '',
          isOverdue: false,
          daysUntilDue: 0,
          lateFee: 0
        });
        return;
      }

      const today = new Date();
      const currentMonth = today.getMonth();
      const currentYear = today.getFullYear();
      
      // Calculate the first day of current month
      const firstDayOfCurrentMonth = new Date(currentYear, currentMonth, 1);
      const dueDate = firstDayOfCurrentMonth.toISOString().split('T')[0];

      // Check if there's already a payment for this month
      const { data: existingPayment, error: paymentError } = await supabase
        .from('rent_payments')
        .select('id, amount, due_date, status, paid_date')
        .eq('lease_id', lease.id)
        .eq('due_date', dueDate)
        .maybeSingle();

      if (paymentError) throw paymentError;

      let currentRentDue = 0;
      let isOverdue = false;
      let daysUntilDue = 0;
      let lateFee = 0;

      if (existingPayment) {
        // Payment exists for this month
        if (existingPayment.status === 'paid') {
          // Check if we need to generate next month's payment
          const nextMonth = new Date(currentYear, currentMonth + 1, 1);
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
              .select('status, due_date')
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
            }
          }
        } else {
          // Current month's payment is not paid
          currentRentDue = existingPayment.amount;
          nextDueDate = existingPayment.due_date;
          const due = new Date(existingPayment.due_date);
          daysUntilDue = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
          isOverdue = daysUntilDue < 0;
        }
      } else {
        // No payment exists for this month, create one
        await generateNextMonthPayment(lease.id, lease.rent_amount, dueDate);
        currentRentDue = lease.rent_amount;
        nextDueDate = dueDate;
        const due = new Date(dueDate);
        daysUntilDue = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        isOverdue = daysUntilDue < 0;
      }

      // Calculate late fee (KES 2,500 after due date)
      if (isOverdue) {
        lateFee = 2500;
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
      const { error } = await supabase
        .from('rent_payments')
        .insert({
          lease_id: leaseId,
          amount: rentAmount,
          due_date: dueDate,
          status: 'pending'
        });

      if (error) throw error;
    } catch (error) {
      console.error('Error generating next month payment:', error);
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

  return {
    ...monthlyRentData,
    loading,
    refetch: calculateMonthlyRent,
    generateMonthlyRentForAllTenants
  };
};
