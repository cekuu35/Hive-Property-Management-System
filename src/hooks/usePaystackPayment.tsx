import { useState, useCallback } from 'react';
import { generatePaymentReference, convertToKobo } from '@/lib/paystack';
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

  // Get Paystack public key with fallback
  const publicKey = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY || 'pk_test_9f2c94cce8c01d4403373ce6f4bf8f1a7d142668';

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
        // Try to find active lease via tenant_info first (correct approach)
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

        // Fallback: Try to find active lease by profile ID (legacy approach)
        if (!leaseId) {
          const { data: leaseByProfile, error: leaseError1 } = await supabase
            .from('leases')
            .select('id')
            .eq('tenant_id', profile.id)
            .eq('status', 'active')
            .maybeSingle();

          if (leaseError1) throw leaseError1;
          leaseId = leaseByProfile?.id;
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
      
      console.log('Processing payment with reference:', referenceString);
      console.log('Payment data received:', paymentData);

      // Find the tenant's lease and tenant_info
      let leaseId = paymentData.leaseId;
      let tenantInfoId = null;

      if (!leaseId && profile?.id) {
        console.log('🔍 [usePaystackPayment] No leaseId provided, searching for lease...');
        console.log('🔍 [usePaystackPayment] Profile ID:', profile.id);
        
        // Try to find active lease by profile ID
        const { data: leaseByProfile, error: leaseByProfileError } = await supabase
          .from('leases')
          .select('id, tenant_info_id')
          .eq('tenant_id', profile.id)
          .eq('status', 'active')
          .maybeSingle();

        console.log('🔍 [usePaystackPayment] Lease by profile query result:', leaseByProfile);
        console.log('🔍 [usePaystackPayment] Lease by profile query error:', leaseByProfileError);

        if (leaseByProfile) {
          leaseId = leaseByProfile.id;
          tenantInfoId = leaseByProfile.tenant_info_id;
          console.log('✅ [usePaystackPayment] Found lease by profile ID:', leaseId);
        } else {
          console.log('⚠️ [usePaystackPayment] No lease found by profile ID, trying tenant_info lookup...');
          // Fallback: resolve via tenant_info.profile_id
          const { data: tinfo, error: tinfoError } = await supabase
            .from('tenant_info')
            .select('id')
            .eq('profile_id', profile.id)
            .maybeSingle();
          
          console.log('🔍 [usePaystackPayment] Tenant info query result:', tinfo);
          console.log('🔍 [usePaystackPayment] Tenant info query error:', tinfoError);
          
          if (tinfo?.id) {
            const { data: leaseByTenantInfo, error: leaseByTenantInfoError } = await supabase
              .from('leases')
              .select('id, tenant_info_id')
              .eq('tenant_info_id', tinfo.id)
              .eq('status', 'active')
              .maybeSingle();
            
            console.log('🔍 [usePaystackPayment] Lease by tenant_info query result:', leaseByTenantInfo);
            console.log('🔍 [usePaystackPayment] Lease by tenant_info query error:', leaseByTenantInfoError);
            
            if (leaseByTenantInfo) {
              leaseId = leaseByTenantInfo.id;
              tenantInfoId = leaseByTenantInfo.tenant_info_id;
              console.log('✅ [usePaystackPayment] Found lease by tenant_info ID:', leaseId);
            } else {
              console.log('❌ [usePaystackPayment] No lease found by tenant_info ID either');
            }
          } else {
            console.log('❌ [usePaystackPayment] No tenant_info found for profile');
          }
        }
      }

      // Update tenant_info balance by deducting paid amount
      if (tenantInfoId) {
        // First, get the current balance to deduct the paid amount
        const { data: currentTenant, error: fetchError } = await supabase
          .from('tenant_info')
          .select('current_balance')
          .eq('id', tenantInfoId)
          .single();

        if (fetchError) {
          console.error('Error fetching current balance:', fetchError);
        } else {
          const currentBalance = currentTenant?.current_balance || 0;
          const newBalance = Math.max(0, currentBalance - paymentData.amount);
          
          console.log('💰 [usePaystackPayment] Balance calculation:', {
            currentBalance,
            amountPaid: paymentData.amount,
            newBalance
          });

          const { error: balanceError } = await supabase
            .from('tenant_info')
            .update({
              current_balance: newBalance,
              payment_status: newBalance > 0 ? 'unpaid' : 'paid'
            })
            .eq('id', tenantInfoId);

          if (balanceError) {
            console.error('Error updating balance:', balanceError);
            throw new Error('Failed to update tenant balance');
          }
        }
      } else {
        // If no tenantInfoId found, try to find it by profile_id
        const { data: tinfo, error: fetchTinfoError } = await supabase
          .from('tenant_info')
          .select('id, current_balance')
          .eq('profile_id', profile?.id)
          .maybeSingle();
        
        if (fetchTinfoError) {
          console.error('Error fetching tenant_info:', fetchTinfoError);
        } else if (tinfo?.id) {
          const currentBalance = tinfo?.current_balance || 0;
          const newBalance = Math.max(0, currentBalance - paymentData.amount);
          
          console.log('💰 [usePaystackPayment] Balance calculation:', {
            currentBalance,
            amountPaid: paymentData.amount,
            newBalance
          });

          const { error: balanceError } = await supabase
            .from('tenant_info')
            .update({
              current_balance: newBalance,
              payment_status: newBalance > 0 ? 'unpaid' : 'paid'
            })
            .eq('id', tinfo.id);

          if (balanceError) {
            console.error('Error updating balance:', balanceError);
            throw new Error('Failed to update tenant balance');
          }
        } else {
          console.warn('No tenant_info found for profile:', profile?.id);
        }
      }

      // Update the payment record in the database if we have a lease
      if (leaseId) {
        // Find the most recent pending payment for this lease
        const { data: pendingPayment, error: findError } = await supabase
          .from('rent_payments')
          .select('id')
          .eq('lease_id', leaseId)
          .eq('status', 'pending')
          .order('due_date', { ascending: true })
          .limit(1)
          .maybeSingle();

        if (findError) {
          console.error('❌ Error finding pending payment:', findError);
        } else if (pendingPayment) {
          console.log('✅ Found pending payment to update:', pendingPayment.id);
          // Update the existing payment record
          const { error: paymentError } = await supabase
            .from('rent_payments')
            .update({
              payment_method: 'card',
              transaction_reference: referenceString,
              status: 'paid',
              paid_date: new Date().toISOString(),
              notes: `Paystack payment - Reference: ${referenceString}`
            })
            .eq('id', pendingPayment.id);

          if (paymentError) {
            console.error('❌ Error updating payment:', paymentError);
            // Don't throw here, balance was updated successfully
          } else {
            console.log('✅ Payment record updated successfully');
          }
        } else {
          console.log('⚠️ No pending payment found, creating new one...');
          // If no pending payment found, create a new one
          const { error: paymentError } = await supabase
            .from('rent_payments')
            .insert({
              lease_id: leaseId,
              amount: paymentData.amount,
              payment_method: 'card',
              transaction_reference: referenceString,
              status: 'paid',
              paid_date: new Date().toISOString(),
              due_date: paymentData.dueDate,
              notes: `Paystack payment - Reference: ${referenceString}`
            });

          if (paymentError) {
            console.error('❌ Error creating payment record:', paymentError);
          } else {
            console.log('✅ New payment record created successfully');
          }
        }
      } else {
        console.warn('No active lease found - payment recorded but not linked to lease');
      }

      console.log('Payment processed successfully:', {
        reference: referenceString,
        amount: paymentData.amount,
        leaseId: leaseId
      });

      toast({
        title: "Payment Successful!",
        description: `Your rent payment of KES ${paymentData.amount.toLocaleString()} has been processed.`,
      });
    } catch (error) {
      console.error('❌ Payment success handler error:', error);
      console.error('❌ Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        error: error
      });
      toast({
        title: "Payment Processing Failed",
        description: error instanceof Error ? error.message : "There was an issue processing your payment. Please contact support.",
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
        publicKey: publicKey,
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
  }, [publicKey, handlePaymentSuccess, handlePaymentClose]);

  return {
    getPaystackProps,
    loading,
    paymentInProgress,
    setPaymentInProgress
  };
};