import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, CreditCard, Zap } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { convertToKobo } from '@/lib/paystack';
import { supabase } from '@/integrations/supabase/client';
import { supabaseAdmin } from '@/integrations/supabase/admin';

// Declare Paystack type for TypeScript
declare global {
  interface Window {
    PaystackPop: any;
  }
}

interface TenantPaymentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rentAmount: number;
  dueDate: string;
  onPaymentSuccess: () => void;
  leaseData?: {
    id: string;
    unit_id: string;
    tenant_id?: string;
    tenant_info_id?: string;
    units?: {
      property_id: string;
      properties?: {
        landlord_id: string;
      };
    };
  };
}

export const TenantPaymentModal = ({ open, onOpenChange, rentAmount, dueDate, onPaymentSuccess, leaseData }: TenantPaymentModalProps) => {
  const { profile, user } = useAuth();
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [transactionStatus, setTransactionStatus] = useState<'idle' | 'processing' | 'verifying' | 'success' | 'error'>('idle');
  const [transactionDetails, setTransactionDetails] = useState<any>(null);

  // Load Paystack inline script
  useEffect(() => {
    if (open && !scriptLoaded) {
      // Check if script already exists
      if (document.querySelector('script[src="https://js.paystack.co/v1/inline.js"]')) {
        setScriptLoaded(true);
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://js.paystack.co/v1/inline.js';
      script.async = true;
      script.onload = () => {
        console.log('✅ Paystack script loaded');
        setScriptLoaded(true);
      };
      script.onerror = () => {
        console.error('❌ Failed to load Paystack script');
        setScriptLoaded(false);
      };
      document.head.appendChild(script);
      
      return () => {
        // Don't remove the script as it might be used by other components
      };
    }
  }, [open, scriptLoaded]);

  const processRentPayment = async (reference: string) => {
    try {
      console.log('🔍 [TenantPaymentModal] Processing rent payment directly...');
      console.log('📋 [TenantPaymentModal] Transaction details:', {
        reference,
        leaseId: leaseData?.id,
        amount: rentAmount,
        dueDate: new Date(Date.UTC(new Date().getFullYear(), new Date().getMonth(), 1)).toISOString().split('T')[0]
      });
      
      if (!leaseData?.id) {
        throw new Error('No lease data available');
      }

      // First, check if there's already a payment for this month
      const dueDate = new Date(Date.UTC(new Date().getFullYear(), new Date().getMonth(), 1)).toISOString().split('T')[0];
      
      const { data: existingPayments, error: existingError } = await supabase
        .from('rent_payments')
        .select('id, status, amount')
        .eq('lease_id', leaseData.id)
        .eq('due_date', dueDate);

      if (existingError) {
        console.error('Error checking existing payments:', existingError);
        throw new Error('Failed to check existing payments');
      }

      let paymentId = null;

      if (existingPayments && existingPayments.length > 0) {
        // Update existing payment
        const existingPayment = existingPayments[0];
        if (existingPayment.status === 'paid') {
          console.log('Payment already marked as paid');
          return { success: true, payment: existingPayment };
        }

        const { data: updatedPayment, error: updateError } = await supabase
          .from('rent_payments')
          .update({
            status: 'paid',
            paid_date: new Date().toISOString(),
            payment_method: 'card',
            transaction_reference: reference,
            notes: 'Payment processed via Paystack'
          })
          .eq('id', existingPayment.id)
          .select()
          .single();

        if (updateError) {
          console.error('Failed to update existing payment:', updateError);
          throw new Error('Failed to update payment record');
        }

        paymentId = updatedPayment.id;
        console.log('✅ Updated existing payment:', updatedPayment);
      } else {
        // Create new payment record
        const { data: newPayment, error: createError } = await supabase
          .from('rent_payments')
          .insert({
            lease_id: leaseData.id,
            amount: rentAmount,
            due_date: dueDate,
            paid_date: new Date().toISOString(),
            status: 'paid',
            payment_method: 'card',
            transaction_reference: reference,
            notes: 'Payment processed via Paystack'
          })
          .select()
          .single();

        if (createError) {
          console.error('Failed to create payment record:', createError);
          throw new Error('Failed to create payment record');
        }

        paymentId = newPayment.id;
        console.log('✅ Created new payment:', newPayment);
      }

      // Update tenant_info balance to 0 and payment status to paid
      console.log('🔍 [TenantPaymentModal] Updating tenant balance...');
      
      // First find the tenant_info record using the tenant_info_id from the lease
      const tenantInfoId = leaseData.tenant_info_id || leaseData.tenant_id;
      
      console.log('📋 [TenantPaymentModal] Balance update details:', {
        tenantInfoId: tenantInfoId,
        leaseId: leaseData.id,
        currentBalance: 0,
        paymentStatus: 'paid'
      });
      
      const { error: balanceError } = await supabase
        .from('tenant_info')
        .update({
          current_balance: 0,
          payment_status: 'paid',
          updated_at: new Date().toISOString()
        })
        .eq('id', tenantInfoId);

      if (balanceError) {
        console.error('❌ [TenantPaymentModal] Error updating tenant balance:', balanceError);
        console.error('❌ [TenantPaymentModal] Balance update failed - this is the problem!');
        // Don't throw here, payment was recorded successfully
      } else {
        console.log('✅ [TenantPaymentModal] Tenant balance updated successfully');
        
        // Verify the update worked
        const { data: verifyTenant, error: verifyError } = await supabase
          .from('tenant_info')
          .select('current_balance, payment_status, updated_at')
          .eq('id', tenantInfoId)
          .single();
          
        if (verifyError) {
          console.error('❌ [TenantPaymentModal] Error verifying balance update:', verifyError);
        } else {
          console.log('✅ [TenantPaymentModal] Balance update verified:', verifyTenant);
        }
      }

      console.log('✅ [TenantPaymentModal] Rent payment processed successfully');
      return { 
        success: true, 
        payment: { id: paymentId, amount: rentAmount, status: 'paid' }
      };
      
    } catch (error) {
      console.error('❌ [TenantPaymentModal] Payment processing failed:', error);
      throw error;
    }
  };

  const handlePayment = async () => {
    if (!scriptLoaded || !window.PaystackPop) {
      toast.error("Payment system is still loading. Please try again.");
      return;
    }

    try {
      setLoading(true);
      
      // Use the lease data passed as prop instead of doing our own lookup
      if (!leaseData) {
        console.error('No lease data provided to payment modal');
        toast.error("Could not find an active lease. Please contact your landlord.");
        setLoading(false);
        return;
      }

      console.log('✅ [TenantPaymentModal] Using provided lease data:', leaseData);

      const publicKey = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY || 'pk_test_9f2c94cce8c01d4403373ce6f4bf8f1a7d142668';
      const amountInKobo = convertToKobo(rentAmount); // Convert KES to kobo using the same function as utility bills
      const reference = `rent_${Date.now()}_${profile?.id}`;
      const userEmail = user?.email || 'test@example.com';

      // Validate amount (minimum 100 kobo)
      if (amountInKobo < 100) {
        toast.error('Amount too small. Minimum payment is 1 KES (100 kobo).');
        setLoading(false);
        return;
      }

      console.log('🔍 [TenantPaymentModal] Paystack config:', {
        key: publicKey.substring(0, 20) + '...',
        email: userEmail,
        originalAmountKES: rentAmount,
        amountInKobo: amountInKobo,
        currency: 'KES',
        ref: reference
      });

      try {
        // Create Paystack configuration matching utility bill modal approach
        const paystackConfig = {
          key: publicKey,
          email: userEmail,
          amount: amountInKobo,
          currency: 'KES',
          ref: reference,
          metadata: {
            custom_fields: [
              {
                display_name: "Tenant Name",
                variable_name: "tenant_name",
                value: `${profile?.first_name || 'Test'} ${profile?.last_name || 'User'}`
              },
              {
                display_name: "Payment Type",
                variable_name: "payment_type",
                value: "Rent Payment"
              },
              {
                display_name: "Lease ID",
                variable_name: "lease_id",
                value: leaseData.id
              }
            ]
          },
          onSuccess: async function(response: any) {
            console.log('🎉 [TenantPaymentModal] PAYSTACK SUCCESS CALLBACK TRIGGERED!');
            console.log('✅ [TenantPaymentModal] Payment successful:', response);
            console.log('🔍 [TenantPaymentModal] Response details:', {
              reference: response.reference,
              status: response.status,
              message: response.message,
              amount: rentAmount
            });
            
            // Update transaction status
            setTransactionStatus('verifying');
            setTransactionDetails({
              reference: response.reference,
              amount: rentAmount,
              timestamp: new Date().toISOString()
            });
            
            // Show processing message
            toast.loading("Verifying payment...", { id: 'payment-processing' });
            
            try {
              // Process payment directly with service role key
              console.log('🔍 [TenantPaymentModal] Processing payment with service role...');
              console.log('🔍 [TenantPaymentModal] Processing payment with reference:', response.reference);
              console.log('🔍 [TenantPaymentModal] Lease data available:', !!leaseData);
              console.log('🔍 [TenantPaymentModal] Rent amount:', rentAmount);
              
              // Call the track-payment edge function
              const trackPaymentResponse = await fetch('https://kozhlejudselgtmohdfm.supabase.co/functions/v1/track-payment', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtvemhsZWp1ZHNlbGd0bW9oZGZtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzQwNDI5OCwiZXhwIjoyMDcyOTgwMjk4fQ.LWosNpPJO_clOXXYa5pqGM36S-FLANk71F8BvcsJf2g`,
                  'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtvemhsZWp1ZHNlbGd0bW9oZGZtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzQwNDI5OCwiZXhwIjoyMDcyOTgwMjk4fQ.LWosNpPJO_clOXXYa5pqGM36S-FLANk71F8BvcsJf2g'
                },
                body: JSON.stringify({
                  reference: response.reference,
                  leaseId: leaseData.id,
                  tenantId: leaseData.tenant_id,
                  amount: rentAmount,
                  paymentType: 'rent'
                })
              });

              if (!trackPaymentResponse.ok) {
                const errorText = await trackPaymentResponse.text();
                console.error('❌ [TenantPaymentModal] Track payment failed:', trackPaymentResponse.status, errorText);
                // Fallback to direct processing
                console.log('🔄 [TenantPaymentModal] Falling back to direct processing...');
                await processRentPayment(response.reference);
              } else {
                const trackResult = await trackPaymentResponse.json();
                console.log('✅ [TenantPaymentModal] Track payment result:', trackResult);
                
                if (!trackResult.success) {
                  throw new Error(trackResult.error || 'Track payment failed');
                }
                
                // Update transaction status
                setTransactionStatus('success');
                setTransactionDetails(prev => ({
                  ...prev,
                  paymentId: trackResult.payment?.id,
                  status: 'processed',
                  processedAt: new Date().toISOString()
                }));
              }
              
              // Show success message
              toast.dismiss('payment-processing');
              toast.success(`Payment successful! KES ${rentAmount.toLocaleString()} has been processed.`);
              
              // Update transaction status
              setTransactionStatus('success');
              
              // Close modal immediately and trigger refetch
              console.log('🔄 [TenantPaymentModal] Closing modal and refreshing data...');
              onOpenChange(false);
              
              // Reset transaction status
              setTransactionStatus('idle');
              setTransactionDetails(null);
              
              // Call the success callback to trigger refetch
              console.log('🔄 [TenantPaymentModal] Triggering onPaymentSuccess callback...');
              await onPaymentSuccess();
              
            } catch (error) {
              console.error('❌ [TenantPaymentModal] PAYMENT PROCESSING FAILED!');
              console.error('❌ [TenantPaymentModal] Error details:', error);
              console.error('❌ [TenantPaymentModal] Error message:', error.message);
              console.error('❌ [TenantPaymentModal] Error stack:', error.stack);
              
              // Update transaction status
              setTransactionStatus('error');
              setTransactionDetails(prev => ({
                ...prev,
                error: error.message,
                failedAt: new Date().toISOString()
              }));
              
              toast.dismiss('payment-processing');
              toast.error(`Payment processing failed: ${error.message || 'Unknown error'}`);
              
              // Don't close modal on error so user can retry
            }
          },
          onClose: function() {
            console.log('❌ [TenantPaymentModal] Payment cancelled by user');
            toast.error("You closed the payment window. Your payment was not completed.");
          }
        };

        console.log('🔧 [TenantPaymentModal] Paystack config object:', paystackConfig);

        const handler = window.PaystackPop.setup(paystackConfig);

        console.log('🚀 [TenantPaymentModal] Opening Paystack iframe...');
        handler.openIframe();
      } catch (paystackError) {
        console.error('❌ [TenantPaymentModal] Paystack setup error:', paystackError);
        console.error('❌ [TenantPaymentModal] Error details:', {
          message: paystackError.message,
          stack: paystackError.stack,
          name: paystackError.name
        });
        toast.error('Failed to initialize payment. Please check your connection and try again.');
        setLoading(false);
        return;
      }
    } catch (error) {
      console.error('Payment error:', error);
      toast.error("Failed to initialize payment. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const userEmail = user?.email || 'tenant@example.com';
  
  if (!userEmail) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Payment Not Available
            </DialogTitle>
            <DialogDescription>
              No email address found. Please update your profile.
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Pay Rent
          </DialogTitle>
          <DialogDescription>
            Complete your rent payment securely via Paystack
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Payment Details */}
          <div className="bg-muted p-4 rounded-lg space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Amount Due:</span>
              <span className="font-semibold">KES {rentAmount.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Due Date:</span>
              <span className="font-semibold">{new Date(dueDate).toLocaleDateString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Payment Method:</span>
              <span className="font-semibold">Card/Mobile Money</span>
            </div>
          </div>

          {/* Transaction Status */}
          {transactionStatus !== 'idle' && (
            <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <div className={`w-2 h-2 rounded-full ${
                  transactionStatus === 'verifying' ? 'bg-yellow-500 animate-pulse' :
                  transactionStatus === 'success' ? 'bg-green-500' :
                  transactionStatus === 'error' ? 'bg-red-500' : 'bg-gray-500'
                }`} />
                <span className="font-medium text-sm">
                  {transactionStatus === 'verifying' && 'Verifying Payment...'}
                  {transactionStatus === 'success' && 'Payment Verified'}
                  {transactionStatus === 'error' && 'Verification Failed'}
                </span>
              </div>
              
              {transactionDetails && (
                <div className="text-xs text-muted-foreground space-y-1">
                  <div>Reference: {transactionDetails.reference}</div>
                  {transactionDetails.paymentId && (
                    <div>Payment ID: {transactionDetails.paymentId}</div>
                  )}
                  {transactionDetails.error && (
                    <div className="text-red-600">Error: {transactionDetails.error}</div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Payment Info */}
          <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
            <div className="flex gap-2">
              <Zap className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-blue-900">Secure Payment</p>
                <p className="text-sm text-blue-700">
                  Your payment is processed securely by Paystack. We never store your card details.
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <form onSubmit={(e) => { e.preventDefault(); handlePayment(); }}>
            <div className="flex gap-2">
              <Button 
                type="button"
                variant="outline" 
                onClick={() => onOpenChange(false)}
                className="flex-1"
                disabled={loading}
              >
                Cancel
              </Button>
              <Button 
                type="submit"
                className="flex-1"
                disabled={loading || !scriptLoaded || transactionStatus === 'verifying' || transactionStatus === 'success'}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : transactionStatus === 'verifying' ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Verifying...
                  </>
                ) : transactionStatus === 'success' ? (
                  <>
                    <CreditCard className="mr-2 h-4 w-4" />
                    Payment Complete
                  </>
                ) : (
                  <>
                    <CreditCard className="mr-2 h-4 w-4" />
                    Pay Now
                  </>
                )}
              </Button>
            </div>
          </form>

          <p className="text-xs text-muted-foreground text-center">
            By proceeding, you agree to complete the payment for the amount shown above
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};
