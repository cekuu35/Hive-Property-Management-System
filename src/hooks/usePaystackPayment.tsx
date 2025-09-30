import { useState, useCallback } from 'react';
import { getPaystackConfig, generatePaymentReference, convertToKobo } from '@/lib/paystack';
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

  const handlePaymentSuccess = useCallback(async (reference: any, paymentData: RentPaymentData) => {
    try {
      setLoading(true);
      
      // Extract reference string from Paystack response
      const referenceString = typeof reference === 'object' ? reference.reference : reference;
      
      console.log('Verifying payment with reference:', referenceString);

      // Verify payment with edge function
      const { data: verifyResult, error: verifyError } = await supabase.functions.invoke('verify-payment', {
        body: {
          reference: referenceString,
          leaseId: paymentData.leaseId,
          amount: paymentData.amount,
          dueDate: paymentData.dueDate
        }
      });

      if (verifyError) {
        console.error('Payment verification error:', verifyError);
        throw new Error(verifyError.message || 'Payment verification failed');
      }

      if (!verifyResult.success) {
        throw new Error(verifyResult.error || 'Payment verification failed');
      }

      console.log('Payment verified successfully:', verifyResult);

      toast({
        title: "Payment Successful!",
        description: `Your rent payment of KES ${paymentData.amount.toLocaleString()} has been processed and verified.`,
      });
    } catch (error) {
      console.error('Payment success handler error:', error);
      toast({
        title: "Payment Verification Failed",
        description: error instanceof Error ? error.message : "There was an issue verifying your payment. Please contact support.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [profile]);

  const handlePaymentClose = useCallback(() => {
    setPaymentInProgress(false);
    setLoading(false);
    toast({
      title: "Payment Cancelled",
      description: "Payment was cancelled. You can try again anytime.",
      variant: "destructive",
    });
  }, []);

  const getPaystackProps = useCallback((paymentData: RentPaymentData) => {
    try {
      const reference = generatePaymentReference();
      const amountInKobo = convertToKobo(paymentData.amount);

      return {
        email: paymentData.email,
        amount: amountInKobo,
        publicKey: config.publicKey,
        text: "Pay Rent",
        reference: reference,
        onSuccess: (reference: any) => handlePaymentSuccess(reference, paymentData),
        onClose: handlePaymentClose,
        metadata: {
          custom_fields: [
            {
              display_name: "Tenant Name",
              variable_name: "tenant_name",
              value: paymentData.tenantName
            },
            {
              display_name: "Unit Info",
              variable_name: "unit_info", 
              value: paymentData.unitInfo
            },
            {
              display_name: "Due Date",
              variable_name: "due_date",
              value: paymentData.dueDate
            },
            {
              display_name: "Lease ID",
              variable_name: "lease_id",
              value: paymentData.leaseId || ''
            },
            {
              display_name: "Payment Type",
              variable_name: "payment_type",
              value: "rent"
            }
          ]
        }
      };
    } catch (error) {
      console.error('Error creating Paystack props:', error);
      // Return a minimal config that won't crash
      return {
        email: paymentData.email,
        amount: convertToKobo(paymentData.amount),
        publicKey: 'pk_test_placeholder_key',
        text: "Pay Rent (Demo Mode)",
        onSuccess: () => console.log('Demo payment success'),
        onClose: () => console.log('Demo payment closed'),
        metadata: {
          custom_fields: [
            {
              display_name: "Payment Type",
              variable_name: "payment_type",
              value: "rent_demo"
            }
          ]
        }
      };
    }
  }, [config.publicKey, handlePaymentSuccess, handlePaymentClose]);

  return {
    getPaystackProps,
    loading,
    paymentInProgress,
    setPaymentInProgress
  };
};