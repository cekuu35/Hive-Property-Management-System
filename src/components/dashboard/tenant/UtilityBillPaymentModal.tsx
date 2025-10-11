import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, CreditCard, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { PaystackButton } from 'react-paystack';
import { convertToKobo } from '@/lib/paystack';
import { toast } from 'sonner';

// Declare Paystack type for TypeScript
declare global {
  interface Window {
    PaystackPop: any;
  }
}

interface BillPaymentData {
  billId: string;
  amount: number;
  email: string;
  reference: string;
  utilityName: string;
  dueDate: string;
}

interface UtilityBillPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  paymentData: BillPaymentData | null;
  onSuccess: (reference: string, billId: string) => Promise<boolean>;
}

export const UtilityBillPaymentModal = ({ 
  isOpen, 
  onClose, 
  paymentData,
  onSuccess 
}: UtilityBillPaymentModalProps) => {
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scriptLoaded, setScriptLoaded] = useState(false);

  // Get Paystack public key
  const publicKey = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY || 'pk_test_9f2c94cce8c01d4403373ce6f4bf8f1a7d142668';

  // Load Paystack inline script for better reliability
  useEffect(() => {
    if (isOpen && !scriptLoaded) {
      const script = document.createElement('script');
      script.src = 'https://js.paystack.co/v1/inline.js';
      script.async = true;
      script.onload = () => {
        console.log('Paystack script loaded successfully');
        setScriptLoaded(true);
      };
      script.onerror = () => {
        console.error('Failed to load Paystack script');
        setError('Failed to load payment system. Please refresh and try again.');
      };
      document.body.appendChild(script);
      
      return () => {
        if (script.parentNode) {
          script.parentNode.removeChild(script);
        }
      };
    }
  }, [isOpen, scriptLoaded]);

  if (!paymentData) return null;

  const handlePaymentSuccess = async (reference: any) => {
    try {
      setProcessing(true);
      setError(null);
      
      const referenceString = typeof reference === 'object' ? reference.reference : reference;
      console.log('Payment successful, reference:', referenceString);
      
      await onSuccess(referenceString, paymentData.billId);
      
      // Close modal on success
      setTimeout(() => {
        onClose();
        setProcessing(false);
      }, 1500);
    } catch (err) {
      console.error('Error handling payment success:', err);
      setError(err instanceof Error ? err.message : 'Failed to process payment');
      setProcessing(false);
    }
  };

  const handlePaymentClose = () => {
    console.log('Payment modal closed');
    if (!processing) {
      onClose();
    }
  };

  // Fallback payment method using inline script
  const handleInlinePayment = async () => {
    console.log('Attempting inline payment...');
    console.log('Script loaded:', scriptLoaded);
    console.log('PaystackPop available:', !!window.PaystackPop);
    console.log('Public key:', publicKey);
    console.log('Payment data:', paymentData);

    if (!scriptLoaded) {
      const errorMsg = 'Payment system is still loading. Please wait a moment and try again.';
      console.error(errorMsg);
      toast.error(errorMsg);
      setError(errorMsg);
      return;
    }

    if (!window.PaystackPop) {
      const errorMsg = 'Payment system failed to load. Please refresh the page and try again.';
      console.error(errorMsg);
      toast.error(errorMsg);
      setError(errorMsg);
      return;
    }

    if (!publicKey || publicKey.includes('placeholder')) {
      const errorMsg = 'Payment system not properly configured. Please contact support.';
      console.error('Invalid public key:', publicKey);
      toast.error(errorMsg);
      setError(errorMsg);
      return;
    }

    setProcessing(true);
    setError(null);

    try {
      const reference = `utility_${paymentData.billId}_${Date.now()}`;
      const amountInKobo = convertToKobo(paymentData.amount);
      
      console.log('Payment details:', {
        reference,
        amount: paymentData.amount,
        amountInKobo,
        email: paymentData.email,
        publicKey: publicKey.substring(0, 20) + '...'
      });
      
      // Define callback functions separately to ensure they're proper functions
      const paymentCallback = function(response: any) {
        console.log('Payment successful, reference:', response.reference);
        handlePaymentSuccess(response.reference).catch((err) => {
          console.error('Error in payment callback:', err);
          setError('Payment completed but failed to update records. Please contact support.');
          setProcessing(false);
        });
      };

      const closeCallback = function() {
        console.log('Payment modal closed by user');
        setProcessing(false);
        toast.error('Payment cancelled. You can try again anytime.');
      };

      const handler = window.PaystackPop.setup({
        key: publicKey,
        email: paymentData.email,
        amount: amountInKobo,
        currency: 'KES',
        ref: reference,
        metadata: {
          custom_fields: [
            {
              display_name: "Utility Type",
              variable_name: "utility_name",
              value: paymentData.utilityName
            },
            {
              display_name: "Due Date",
              variable_name: "due_date",
              value: paymentData.dueDate
            },
            {
              display_name: "Bill ID",
              variable_name: "bill_id",
              value: paymentData.billId
            },
            {
              display_name: "Payment Type",
              variable_name: "payment_type",
              value: "utility"
            }
          ]
        },
        callback: paymentCallback,
        onClose: closeCallback
      });

      console.log('Opening Paystack iframe...');
      handler.openIframe();
    } catch (error) {
      console.error('Payment initialization error:', error);
      const errorMsg = `Failed to initialize payment: ${error instanceof Error ? error.message : 'Unknown error'}`;
      setError(errorMsg);
      toast.error(errorMsg);
      setProcessing(false);
    }
  };

  // Define callback functions for PaystackButton
  const paystackSuccessCallback = function(reference: any) {
    handlePaymentSuccess(reference);
  };

  const paystackCloseCallback = function() {
    handlePaymentClose();
  };

  const paystackConfig = {
    email: paymentData.email,
    amount: convertToKobo(paymentData.amount),
    publicKey: publicKey,
    text: `Pay KES ${paymentData.amount.toLocaleString()}`,
    reference: paymentData.reference,
    onSuccess: paystackSuccessCallback,
    onClose: paystackCloseCallback,
    metadata: {
      custom_fields: [
        {
          display_name: "Utility Type",
          variable_name: "utility_name",
          value: paymentData.utilityName
        },
        {
          display_name: "Due Date",
          variable_name: "due_date",
          value: paymentData.dueDate
        },
        {
          display_name: "Bill ID",
          variable_name: "bill_id",
          value: paymentData.billId
        },
        {
          display_name: "Payment Type",
          variable_name: "payment_type",
          value: "utility"
        }
      ]
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !processing && !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Pay Utility Bill
          </DialogTitle>
          <DialogDescription>
            Complete your payment securely with Paystack
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Payment Details */}
          <div className="space-y-2 rounded-lg border p-4">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Utility</span>
              <span className="text-sm font-medium">{paymentData.utilityName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Amount</span>
              <span className="text-lg font-bold">KES {paymentData.amount.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Due Date</span>
              <span className="text-sm">{new Date(paymentData.dueDate).toLocaleDateString()}</span>
            </div>
          </div>

          {/* Error Alert */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Payment Info */}
          <Alert>
            <AlertDescription className="text-xs">
              You will be redirected to Paystack's secure payment page to complete your transaction.
            </AlertDescription>
          </Alert>

          {/* Payment Buttons */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={processing}
              className="flex-1"
            >
              Cancel
            </Button>
            
            <Button
              onClick={handleInlinePayment}
              disabled={processing || !scriptLoaded}
              className="flex-1"
            >
              {processing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <CreditCard className="mr-2 h-4 w-4" />
                  Pay Now
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
