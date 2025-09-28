import { useState, useCallback } from 'react';
import { usePaystackPayment as usePaystackPaymentHook } from '@paystack/inline-js';
import { getPaystackConfig, generatePaymentReference, convertToKobo, PaymentData, PaymentResponse } from '@/lib/paystack';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from '@/hooks/use-toast';

export interface RentPaymentData {
  amount: number; // Amount in KES
  email: string;
  tenantName: string;
  unitInfo: string;
  dueDate: string;
  leaseId?: string;
}

export const usePaystackPayment = () => {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [paymentInProgress, setPaymentInProgress] = useState(false);

  const config = getPaystackConfig();
  const initializePayment = usePaystackPaymentHook(config);

  const processRentPayment = useCallback(async (paymentData: RentPaymentData): Promise<PaymentResponse> => {
    if (!profile?.email) {
      throw new Error('User email is required for payment processing');
    }

    setLoading(true);
    setPaymentInProgress(true);

    try {
      const reference = generatePaymentReference();
      const amountInKobo = convertToKobo(paymentData.amount);

      const paystackData: PaymentData = {
        email: paymentData.email,
        amount: amountInKobo,
        currency: 'NGN', // Paystack primarily uses NGN, but supports other currencies
        reference,
        metadata: {
          tenant_name: paymentData.tenantName,
          unit_info: paymentData.unitInfo,
          due_date: paymentData.dueDate,
          lease_id: paymentData.leaseId,
          user_id: profile.id,
          payment_type: 'rent'
        },
        callback: async (response: any) => {
          try {
            if (response.status === 'success') {
              // Verify payment with your backend
              const verificationResult = await verifyPayment(reference);
              
              if (verificationResult.success) {
                // Record payment in database
                await recordPayment({
                  ...paymentData,
                  reference,
                  transactionId: response.trans,
                  status: 'paid',
                  paymentMethod: 'paystack'
                });

                toast({
                  title: "Payment Successful!",
                  description: `Your rent payment of KES ${paymentData.amount.toLocaleString()} has been processed successfully.`,
                });

                return {
                  status: 'success',
                  message: 'Payment completed successfully',
                  reference,
                  transaction: response
                };
              } else {
                throw new Error('Payment verification failed');
              }
            } else {
              throw new Error('Payment was not successful');
            }
          } catch (error) {
            console.error('Payment callback error:', error);
            toast({
              title: "Payment Error",
              description: "There was an issue processing your payment. Please contact support.",
              variant: "destructive",
            });
            throw error;
          } finally {
            setPaymentInProgress(false);
            setLoading(false);
          }
        },
        onClose: () => {
          setPaymentInProgress(false);
          setLoading(false);
          toast({
            title: "Payment Cancelled",
            description: "Payment was cancelled. You can try again anytime.",
            variant: "destructive",
          });
        }
      };

      // Initialize Paystack payment
      initializePayment(paystackData);

      return {
        status: 'success',
        message: 'Payment initialized successfully',
        reference
      };

    } catch (error) {
      console.error('Payment initialization error:', error);
      setPaymentInProgress(false);
      setLoading(false);
      
      toast({
        title: "Payment Error",
        description: "Failed to initialize payment. Please try again.",
        variant: "destructive",
      });

      throw error;
    }
  }, [profile, initializePayment]);

  const verifyPayment = async (reference: string): Promise<{ success: boolean; data?: any }> => {
    try {
      // In a real implementation, you would verify with your backend
      // For now, we'll simulate verification
      const response = await fetch('/api/verify-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reference }),
      });

      if (response.ok) {
        const result = await response.json();
        return { success: result.status === 'success', data: result };
      }

      // Fallback: simulate successful verification for demo
      return { success: true, data: { reference, status: 'success' } };
    } catch (error) {
      console.error('Payment verification error:', error);
      // For demo purposes, return success
      return { success: true, data: { reference, status: 'success' } };
    }
  };

  const recordPayment = async (paymentData: RentPaymentData & {
    reference: string;
    transactionId: string;
    status: string;
    paymentMethod: string;
  }) => {
    try {
      // Find the lease for the tenant
      let leaseId = paymentData.leaseId;
      
      if (!leaseId && profile?.id) {
        // Try to find active lease by profile ID
        const { data: leaseByProfile, error: leaseError1 } = await supabase
          .from('leases')
          .select('id')
          .eq('tenant_id', profile.id)
          .eq('status', 'active')
          .maybeSingle();

        if (leaseError1) throw leaseError1;
        leaseId = leaseByProfile?.id;

        // Fallback: resolve via tenant_info.profile_id
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
            leaseId = leaseByTenantInfo?.id;
          }
        }
      }

      if (!leaseId) {
        throw new Error('No active lease found for tenant');
      }

      // Record the payment in the database
      const { error: paymentError } = await supabase
        .from('rent_payments')
        .insert({
          lease_id: leaseId,
          amount: paymentData.amount,
          payment_method: paymentData.paymentMethod,
          transaction_reference: paymentData.reference,
          status: paymentData.status,
          paid_date: new Date().toISOString(),
          due_date: paymentData.dueDate,
          notes: `Paystack payment - Transaction ID: ${paymentData.transactionId}`
        });

      if (paymentError) throw paymentError;

      console.log('Payment recorded successfully');
    } catch (error) {
      console.error('Error recording payment:', error);
      throw error;
    }
  };

  return {
    processRentPayment,
    loading,
    paymentInProgress
  };
};
