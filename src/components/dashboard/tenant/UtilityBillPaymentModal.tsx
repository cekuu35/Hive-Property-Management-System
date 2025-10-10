import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, CreditCard, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { PaystackButton } from 'react-paystack';
import { convertToKobo } from '@/lib/paystack';

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

  // Get Paystack public key
  const publicKey = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY || 'pk_test_9f2c94cce8c01d4403373ce6f4bf8f1a7d142668';

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

  const paystackConfig = {
    email: paymentData.email,
    amount: convertToKobo(paymentData.amount),
    publicKey: publicKey,
    text: `Pay KES ${paymentData.amount.toLocaleString()}`,
    reference: paymentData.reference,
    onSuccess: handlePaymentSuccess,
    onClose: handlePaymentClose,
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

          {/* Payment Button */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={processing}
              className="flex-1"
            >
              Cancel
            </Button>
            
            <PaystackButton
              {...paystackConfig}
              className="flex-1 inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2"
              disabled={processing}
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
            </PaystackButton>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
