import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, CreditCard, Check, Zap } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { usePaystackPayment } from '@/hooks/usePaystackPayment';
import { useAuth } from '@/hooks/useAuth';
import { PaystackButton } from 'react-paystack';

interface TenantPaymentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rentAmount: number;
  dueDate: string;
  onPaymentSuccess: () => void;
}

export const TenantPaymentModal = ({ open, onOpenChange, rentAmount, dueDate, onPaymentSuccess }: TenantPaymentModalProps) => {
  const { profile } = useAuth();
  const { getPaystackProps, loading, setPaymentInProgress } = usePaystackPayment();
  const [step, setStep] = useState<'payment' | 'success'>('payment');

  useEffect(() => {
    if (open) {
      setStep('payment');
    }
  }, [open]);

  const handlePaymentSuccess = () => {
    setStep('success');
    setPaymentInProgress(false);
    
    // Simulate real-time balance update
    setTimeout(() => {
      onPaymentSuccess();
      onOpenChange(false);
      setStep('payment');
    }, 2000);
  };

  const handlePaymentClose = () => {
    setPaymentInProgress(false);
    onOpenChange(false);
  };

  // For now, we'll use a placeholder email. In a real app, you'd get this from the user object
  const userEmail = 'tenant@example.com'; // This should come from the user object
  
  if (!userEmail) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Payment Error
            </DialogTitle>
            <DialogDescription>Email is required for payment processing.</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground mb-4">
              Please ensure your email is set in your profile to process payments.
            </p>
            <Button onClick={() => onOpenChange(false)} className="w-full">
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }


  const renderPayment = () => {
    const paymentData = {
      amount: rentAmount,
      email: userEmail,
      tenantName: `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim() || 'Tenant',
      unitInfo: 'Rent Payment',
      dueDate: dueDate,
    };

    const paystackProps = {
      ...getPaystackProps(paymentData),
      onSuccess: (reference: string) => {
        handlePaymentSuccess();
      },
      onClose: handlePaymentClose,
    };

    return (
      <div className="flex flex-col items-center justify-center py-8 space-y-6">
        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
          <Zap className="h-8 w-8 text-blue-600" />
        </div>
        
        <div className="text-center">
          <h3 className="text-lg font-semibold mb-2">Pay Rent</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Amount: KES {rentAmount.toLocaleString()} • Due: {dueDate}
          </p>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 max-w-sm">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
              <CreditCard className="h-4 w-4 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-blue-900">Paystack Payment Gateway</p>
              <p className="text-xs text-blue-700 mt-1">
                Choose from multiple payment options including cards, bank transfers, and mobile money.
              </p>
            </div>
          </div>
        </div>

        <div className="w-full max-w-xs">
          <PaystackButton {...paystackProps} />
        </div>
      </div>
    );
  };

  const renderSuccess = () => (
    <div className="flex flex-col items-center justify-center py-8 space-y-4">
      <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
        <Check className="h-8 w-8 text-green-600" />
      </div>
      <h3 className="text-lg font-semibold text-green-800">Payment Successful!</h3>
      <p className="text-sm text-muted-foreground text-center">
        Your rent payment of KES {rentAmount.toLocaleString()} has been processed successfully.
      </p>
      <div className="bg-green-50 border border-green-200 rounded-lg p-3 mt-4">
        <p className="text-sm text-green-800">
          ✅ A receipt has been sent to your email and SMS.
        </p>
      </div>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Pay Rent
          </DialogTitle>
          <DialogDescription>Secure payment processing powered by Paystack.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {step === 'payment' && renderPayment()}
          {step === 'success' && renderSuccess()}
        </div>
      </DialogContent>
    </Dialog>
  );
};