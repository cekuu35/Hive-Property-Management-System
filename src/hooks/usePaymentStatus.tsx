import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface PaymentStatus {
  isChecking: boolean;
  isPaid: boolean;
  error: string | null;
}

export const usePaymentStatus = (reference: string | null) => {
  const [status, setStatus] = useState<PaymentStatus>({
    isChecking: false,
    isPaid: false,
    error: null
  });

  const checkPaymentStatus = async () => {
    if (!reference) return;

    setStatus(prev => ({ ...prev, isChecking: true, error: null }));

    try {
      // Check if payment exists in rent_payments table
      const { data: payment, error } = await supabase
        .from('rent_payments')
        .select('id, status, amount, paid_date')
        .eq('transaction_reference', reference)
        .maybeSingle();

      if (error) {
        console.error('Error checking payment status:', error);
        setStatus(prev => ({ 
          ...prev, 
          isChecking: false, 
          error: 'Failed to check payment status' 
        }));
        return;
      }

      if (payment && payment.status === 'paid') {
        console.log('✅ Payment found and confirmed:', payment);
        setStatus(prev => ({ 
          ...prev, 
          isChecking: false, 
          isPaid: true 
        }));
      } else {
        console.log('⏳ Payment not found or not paid yet');
        setStatus(prev => ({ 
          ...prev, 
          isChecking: false, 
          isPaid: false 
        }));
      }
    } catch (error) {
      console.error('Error checking payment status:', error);
      setStatus(prev => ({ 
        ...prev, 
        isChecking: false, 
        error: 'Failed to check payment status' 
      }));
    }
  };

  useEffect(() => {
    if (!reference) return;

    // Check immediately
    checkPaymentStatus();

    // Set up polling every 2 seconds for up to 30 seconds
    const interval = setInterval(checkPaymentStatus, 2000);
    const timeout = setTimeout(() => {
      clearInterval(interval);
      setStatus(prev => ({ 
        ...prev, 
        isChecking: false,
        error: prev.isPaid ? null : 'Payment verification timeout'
      }));
    }, 30000);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [reference]);

  return {
    ...status,
    checkPaymentStatus
  };
};
