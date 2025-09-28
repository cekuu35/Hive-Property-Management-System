import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Loader2, CreditCard, Check, Zap } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { usePaystackPayment } from '@/hooks/usePaystackPayment';
import { useAuth } from '@/hooks/useAuth';

interface TenantPaymentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rentAmount: number;
  dueDate: string;
  onPaymentSuccess: () => void;
}

export const TenantPaymentModal = ({ open, onOpenChange, rentAmount, dueDate, onPaymentSuccess }: TenantPaymentModalProps) => {
  const { profile } = useAuth();
  const { processRentPayment, loading: paystackLoading, paymentInProgress } = usePaystackPayment();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'processing' | 'success'>('processing');

  useEffect(() => {
    if (open) {
      setStep('processing');
      // Automatically start Paystack payment when modal opens
      handlePaystackPayment();
    }
  }, [open, rentAmount]);

  const handlePaystackPayment = async () => {
    if (!profile?.email) {
      toast({
        title: "Email Required",
        description: "Please ensure your email is set in your profile to process payments.",
        variant: "destructive",
      });
      onOpenChange(false);
      return;
    }

    try {
      setLoading(true);

      await processRentPayment({
        amount: rentAmount,
        email: profile.email,
        tenantName: profile.full_name || 'Tenant',
        unitInfo: 'Rent Payment',
        dueDate: dueDate,
      });

      setStep('success');
      
      // Simulate real-time balance update
      setTimeout(() => {
        onPaymentSuccess();
        onOpenChange(false);
        setStep('processing');
      }, 2000);

    } catch (error) {
      console.error('Paystack payment error:', error);
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  };




  const renderProcessing = () => (
    <div className="flex flex-col items-center justify-center py-8 space-y-4">
      <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
        <Zap className="h-8 w-8 text-blue-600" />
      </div>
      <h3 className="text-lg font-semibold">Opening Payment Gateway...</h3>
      <p className="text-sm text-muted-foreground text-center">
        Please wait while we open the secure payment gateway for you.
      </p>
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4 max-w-sm">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
            <CreditCard className="h-4 w-4 text-blue-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-blue-900">Paystack Payment Gateway</p>
            <p className="text-xs text-blue-700 mt-1">
              You'll be able to choose from multiple payment options including cards, bank transfers, and mobile money.
            </p>
          </div>
        </div>
      </div>
      <div className="text-xs text-muted-foreground text-center">
        Amount: KES {rentAmount.toLocaleString()} • Due: {dueDate}
      </div>
    </div>
  );

  const renderSuccess = () => (
    <div className="flex flex-col items-center justify-center py-8 space-y-4">
      <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
        <Check className="h-8 w-8 text-green-600" />
      </div>
      <h3 className="text-lg font-semibold text-green-800">Payment Successful!</h3>
      <p className="text-sm text-muted-foreground text-center">
        Your rent payment of KES {parseFloat(formData.amount).toLocaleString()} has been processed successfully.
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
          {step === 'processing' && renderProcessing()}
          {step === 'success' && renderSuccess()}
        </div>
      </DialogContent>
    </Dialog>
  );
};