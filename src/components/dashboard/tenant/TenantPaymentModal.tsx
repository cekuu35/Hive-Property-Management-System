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

  // Debug logging when modal opens
  useEffect(() => {
    if (open) {
      console.log('🔍 [TenantPaymentModal] Modal opened');
      console.log('🔍 [TenantPaymentModal] Props:', {
        rentAmount,
        dueDate,
        leaseData: leaseData ? {
          id: leaseData.id,
          tenant_info_id: leaseData.tenant_info_id,
          rent_amount: leaseData.rent_amount
        } : null
      });
    }
  }, [open, rentAmount, dueDate, leaseData]);

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
      console.log('🔍 [TenantPaymentModal] Processing rent payment via verification API...');
      console.log('🔍 [TenantPaymentModal] Reference:', reference);
      console.log('🔍 [TenantPaymentModal] Lease data:', leaseData);
      console.log('🔍 [TenantPaymentModal] Profile:', profile);
      
      if (!leaseData?.id) {
        console.error('❌ [TenantPaymentModal] No lease data available');
        throw new Error('No lease data available');
      }

      // Call the verification API
      console.log('🔍 [TenantPaymentModal] Calling verifyPayment API...');
      const response = await fetch('/api/verifyPayment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reference: reference
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('❌ [TenantPaymentModal] Verification API error:', errorData);
        throw new Error(errorData.error || 'Payment verification failed');
      }

      const data = await response.json();
      console.log('✅ [TenantPaymentModal] Payment verification successful:', data);

      // Show success message
      if (data.success && data.status === 'success') {
        toast.success(`Payment successful! Your rent payment of KES ${rentAmount.toLocaleString()} has been processed.`);
      } else {
        toast.error('Payment verification completed but status is not successful');
      }

      return { success: data.success, payment: data };
      
    } catch (error) {
      console.error('❌ [TenantPaymentModal] Payment processing failed:', error);
      throw error;
    }
  };

  const handlePayment = async () => {
    console.log('🔍 [TenantPaymentModal] handlePayment called');
    console.log('🔍 [TenantPaymentModal] Script loaded:', scriptLoaded);
    console.log('🔍 [TenantPaymentModal] PaystackPop available:', !!window.PaystackPop);
    
    if (!scriptLoaded || !window.PaystackPop) {
      console.log('❌ [TenantPaymentModal] Payment system not ready');
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
      
      console.log('🔍 [TenantPaymentModal] Using Paystack public key:', publicKey);
      console.log('🔍 [TenantPaymentModal] Key length:', publicKey.length);
      console.log('🔍 [TenantPaymentModal] Key starts with pk_test:', publicKey.startsWith('pk_test'));
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
        console.log('🔍 [TenantPaymentModal] Initializing payment via API...');
        
        // Call the initialization API
        const initResponse = await fetch('/api/initializeTransaction', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            tenantId: leaseData.tenant_info_id,
            propertyId: leaseData.units?.property_id,
            amount: rentAmount,
            email: userEmail,
            callbackUrl: `${window.location.origin}/payment/callback`
          })
        });

        if (!initResponse.ok) {
          const errorData = await initResponse.json();
          console.error('❌ [TenantPaymentModal] Initialization API error:', errorData);
          throw new Error(errorData.error || 'Payment initialization failed');
        }

        const initData = await initResponse.json();
        console.log('✅ [TenantPaymentModal] Payment initialized successfully:', initData);

        // Create Paystack configuration with API response
        const paystackConfig = {
          key: publicKey,
          email: userEmail,
          amount: amountInKobo,
          currency: 'KES',
          ref: initData.reference,
          authorization_code: initData.accessCode,
          metadata: {
            type: 'rent',
            lease_id: leaseData.id,
            tenant_id: profile?.id,
            property_id: leaseData.units?.property_id,
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
          callback: function(response: any) {
            console.log('🎉 [TenantPaymentModal] PAYSTACK SUCCESS CALLBACK TRIGGERED!');
            console.log('✅ [TenantPaymentModal] Payment successful:', response);
            
            // Process payment and then redirect like security deposit does
            processRentPayment(response.reference).then(() => {
              console.log('✅ [TenantPaymentModal] Payment processed successfully');
              onPaymentSuccess();
              // Redirect to callback page like security deposit does
              window.location.href = `${window.location.origin}/payment/callback?reference=${response.reference}&type=rent&amount=${rentAmount}&leaseId=${leaseData.id}`;
            }).catch((error) => {
              console.error('❌ [TenantPaymentModal] Payment processing failed:', error);
              toast.error('Payment completed but failed to update records. Please contact support.');
            });
          },
          onClose: function() {
            setLoading(false);
            toast.error('Payment Cancelled', {
              description: 'You closed the payment window. Your payment was not completed.'
            });
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
