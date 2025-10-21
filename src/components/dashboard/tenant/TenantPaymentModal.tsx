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
  const [error, setError] = useState<string | null>(null);

  // Get Paystack public key from environment
  const publicKey = 'pk_test_9f2c94cce8c01d4403373ce6f4bf8f1a7d142668';

  // Load Paystack script
  useEffect(() => {
    if (window.PaystackPop) {
      console.log('✅ Paystack already loaded');
      setScriptLoaded(true);
      return;
    }
    if (open && !scriptLoaded) {
      if (document.querySelector('script[src="https://js.paystack.co/v1/inline.js"]')) {
        console.log('✅ Paystack script already in DOM, waiting for load...');
        const checkInterval = setInterval(() => {
          if (window.PaystackPop) {
            console.log('✅ Paystack loaded after waiting');
            setScriptLoaded(true);
            clearInterval(checkInterval);
          }
        }, 100);
        setTimeout(() => clearInterval(checkInterval), 5000);
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://js.paystack.co/v1/inline.js';
      script.async = true;
      script.onload = () => {
        console.log('✅ Paystack script loaded successfully');
        setScriptLoaded(true);
      };
      script.onerror = () => {
        console.error('❌ Failed to load Paystack script');
        setError('Failed to load payment system. Please refresh and try again.');
      };
      document.head.appendChild(script);
      return () => {
        if (script.parentNode) {
          script.parentNode.removeChild(script);
        }
      };
    }
  }, [open, scriptLoaded]);

  const processRentPayment = async (reference: string) => {
    try {
      console.log('🔍 [TenantPaymentModal] Processing rent payment via verification API...');
      
      // Import the verification function
      // NOTE: Actual payment recording is handled by Paystack webhook (supabase/functions/paystack-webhook/index.ts)
      // which correctly updates rent_payments using .update() not .insert()
      const { verifyPaystackPayment, updateRentPayment } = await import('@/lib/paymentVerification');
      
      // Verify the payment with Paystack
      const verificationResult = await verifyPaystackPayment(reference);
      
      if (!verificationResult.success) {
        throw new Error(verificationResult.error || 'Payment verification failed');
      }

      // Update the rent payment in the database
      const updateSuccess = await updateRentPayment(
        leaseData?.id || '',
        reference,
        rentAmount
      );

      if (!updateSuccess) {
        throw new Error('Failed to update rent payment in database');
      }

      console.log('✅ [TenantPaymentModal] Rent payment processed successfully');
      toast.success(`Payment successful! Your rent payment of KES ${rentAmount.toLocaleString()} has been processed and updated.`);
      
    } catch (error) {
      console.error('❌ [TenantPaymentModal] Rent payment processing failed:', error);
      throw error;
    }
  };

  const handlePaymentSuccess = (reference: string) => {
    setTransactionStatus('success');
    setTransactionDetails({ reference, amount: rentAmount });
    onPaymentSuccess();
    onOpenChange(false);
  };

  const handlePayment = async () => {
    if (!leaseData?.id) {
      toast.error('Lease information is missing. Please try again.');
      return;
    }

    if (!user?.email) {
      toast.error('User email is required for payment processing.');
      return;
    }

    setLoading(true);
    setError(null);
    setTransactionStatus('processing');

    const userEmail = user.email;
    const amountInKobo = convertToKobo(rentAmount);

    console.log('🔍 [TenantPaymentModal] Payment details:', {
      userEmail,
      originalAmountKES: rentAmount,
      amountInKobo,
      leaseId: leaseData.id,
      unitId: leaseData.unit_id
    });

    try {
      console.log('🚀 [TenantPaymentModal] Initializing rent payment with backend API for split payments...');
      
      // Use the backend API to initialize the transaction with subaccount
      console.log('📞 Calling backend API to initialize rent payment with subaccount...');
      
      const response = await fetch('http://localhost:3001/api/initializeRentPayment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          leaseId: leaseData.id,
          amount: rentAmount,
          email: userEmail,
          callbackUrl: `${window.location.origin}/payment/callback?type=rent&leaseId=${leaseData.id}`
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to initialize payment');
      }

      const { data: paystackData } = await response.json();
      
      console.log('✅ Backend API response:', paystackData);
      console.log('🔍 Authorization URL:', paystackData.authorization_url);
      console.log('🔍 Reference:', paystackData.reference);
      console.log('🔍 Access Code:', paystackData.access_code);

      // Check if Paystack is loaded
      if (!window.PaystackPop) {
        throw new Error('Paystack is not loaded. Please refresh the page and try again.');
      }

      // Use the authorization URL from the backend
      const paystackConfig = {
        key: publicKey,
        email: userEmail,
        amount: paystackData.amount,
        currency: 'KES',
        ref: paystackData.reference,
        authorization: paystackData.authorization_code, // Use the authorization code from backend
        metadata: {
          lease_id: leaseData.id,
          tenant_id: leaseData.tenant_id,
          unit_id: leaseData.unit_id,
          payment_type: 'Rent Payment'
        },
        callback: function(response: any) {
          console.log('🎉 RENT PAYMENT SUCCESS CALLBACK TRIGGERED!');
          console.log('✅ Payment successful:', response);
          
          // Process payment and then redirect
          processRentPayment(response.reference).then(() => {
            console.log('✅ Rent payment processed successfully');
            handlePaymentSuccess(response.reference);
            // Redirect to callback page
            window.location.href = `${window.location.origin}/payment/callback?reference=${response.reference}&type=rent&amount=${rentAmount}&leaseId=${leaseData.id}`;
          }).catch((error) => {
            console.error('❌ Rent payment processing failed:', error);
            setError('Payment completed but failed to update records. Please contact support.');
            setLoading(false);
          });
        },
        onClose: function() {
          console.log('Payment modal closed by user');
          setLoading(false);
          toast.error('Payment cancelled. You can try again anytime.');
        }
      };

      console.log('🚀 Opening Paystack iframe with backend configuration...');
      console.log('🔍 Paystack config:', paystackConfig);
      
      const handler = window.PaystackPop.setup(paystackConfig);
      handler.openIframe();
      
    } catch (error) {
      console.error('❌ Payment initialization error:', error);
      const errorMsg = `Failed to initialize payment: ${error instanceof Error ? error.message : 'Unknown error'}`;
      setError(errorMsg);
      toast.error(errorMsg);
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Rent Payment
          </DialogTitle>
          <DialogDescription>
            Complete your rent payment securely via Paystack
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-muted p-4 rounded-lg">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Amount Due:</span>
              <span className="text-lg font-bold">KES {rentAmount.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center mt-2">
              <span className="text-sm text-muted-foreground">Due Date:</span>
              <span className="text-sm">{new Date(dueDate).toLocaleDateString()}</span>
            </div>
          </div>

          {error && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          <div className="flex flex-col gap-2">
            <Button
              onClick={handlePayment}
              disabled={loading || !scriptLoaded}
              className="w-full"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Zap className="mr-2 h-4 w-4" />
                  Pay KES {rentAmount.toLocaleString()}
                </>
              )}
            </Button>
            
            {!scriptLoaded && (
              <p className="text-xs text-muted-foreground text-center">
                Loading payment system...
              </p>
            )}
          </div>

          <div className="text-xs text-muted-foreground text-center">
            <p>Powered by Paystack • Secure payment processing</p>
            <p>Split payment: 95% to platform, 5% to landlord</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
