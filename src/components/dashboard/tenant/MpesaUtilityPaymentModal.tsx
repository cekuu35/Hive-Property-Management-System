import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Smartphone, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

interface MpesaUtilityPaymentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  paymentData: {
    billId: string;
    amount: number;
    utilityName: string;
    dueDate: string;
  };
  onPaymentSuccess: () => void;
}

export const MpesaUtilityPaymentModal = ({ 
  open, 
  onOpenChange, 
  paymentData,
  onPaymentSuccess
}: MpesaUtilityPaymentModalProps) => {
  const { profile, user } = useAuth();
  const [phoneNumber, setPhoneNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'processing' | 'success' | 'failed'>('idle');

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // No cleanup needed with new approach
    };
  }, []);

  // Format phone number for M-Pesa (254XXXXXXXXX)
  const formatPhoneNumber = (phone: string): string => {
    // Remove all non-digits
    const digits = phone.replace(/\D/g, '');
    
    // Handle different formats
    if (digits.startsWith('254')) {
      return digits;
    } else if (digits.startsWith('0')) {
      return '254' + digits.substring(1);
    } else if (digits.startsWith('7') || digits.startsWith('1')) {
      return '254' + digits;
    }
    
    return digits;
  };

  const handlePayment = async () => {
    if (!paymentData.billId) {
      toast.error('Bill information is missing. Please try again.');
      return;
    }

    if (!phoneNumber.trim()) {
      toast.error('Please enter your phone number');
      return;
    }

    const formattedPhone = formatPhoneNumber(phoneNumber);
    
    // Basic validation for Kenyan phone numbers
    if (!formattedPhone.startsWith('254') || formattedPhone.length !== 12) {
      toast.error('Please enter a valid Kenyan phone number (e.g., 0712345678)');
      return;
    }

    setLoading(true);
    setError(null);
    setPaymentStatus('processing');

    try {
      console.log('🚀 [M-Pesa] Initiating utility payment...', {
        billId: paymentData.billId,
        amount: paymentData.amount,
        phoneNumber: formattedPhone
      });

      const { data: result, error: invokeError } = await supabase.functions.invoke('mpesa-stk-push', {
        body: {
          type: 'utility',
          billId: paymentData.billId,
          amount: paymentData.amount,
          phoneNumber: formattedPhone
        }
      });

      if (invokeError) {
        throw new Error(invokeError.message || 'Failed to initiate payment');
      }

      if (!result || !result.success) {
        throw new Error(result?.error || 'Failed to initiate payment');
      }
      
      console.log('✅ [M-Pesa] STK Push initiated:', result);

      setPaymentStatus('processing');
      toast.success('Payment request sent! Please check your phone and enter your M-Pesa PIN to complete the payment.');
      
      // Start polling for payment status
      pollPaymentStatus(result.checkoutRequestID);

    } catch (error) {
      console.error('❌ [M-Pesa] Payment error:', error);
      const errorMsg = `Payment failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
      setError(errorMsg);
      setPaymentStatus('failed');
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const pollPaymentStatus = async (checkoutRequestID: string) => {
    // Poll for payment status every 2 seconds
    const pollInterval = setInterval(async () => {
      try {
        const { data: statusData, error } = await supabase.functions.invoke(`mpesa-stk-push/payment-status/${checkoutRequestID}`);

        if (error) {
          console.error('Error polling payment status:', error);
          return;
        }

        if (statusData && statusData.status !== 'pending') {
          clearInterval(pollInterval);

          if (statusData.status === 'completed') {
            setPaymentStatus('success');
            onPaymentSuccess();
            onOpenChange(false);
            toast.success('Payment successful! Your utility bill has been paid.');
          } else if (statusData.status === 'failed') {
            setPaymentStatus('failed');
            setError(`Payment failed: ${statusData.result_description || 'Unknown error'}`);
            toast.error(`Payment failed: ${statusData.result_description || 'Unknown error'}`);
          }
        }
      } catch (error) {
        console.error('Error polling payment status:', error);
      }
    }, 3000);

    // Clean up polling after 60 seconds
    setTimeout(() => {
      clearInterval(pollInterval);
      if (paymentStatus === 'processing') {
        setPaymentStatus('idle');
        toast.info('Payment is still being processed. You will be notified when it completes.');
      }
    }, 60000);
  };

  const handleSuccess = () => {
    setPaymentStatus('success');
    onPaymentSuccess();
    onOpenChange(false);
    toast.success('Payment successful! Your utility bill has been paid.');
  };

  const handleClose = () => {
    if (paymentStatus === 'processing') {
      toast.info('Payment is being processed. You will be notified of the result.');
    }
    onOpenChange(false);
  };

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5" />
            M-Pesa Utility Payment
          </DialogTitle>
          <DialogDescription>
            Pay your utility bill securely via M-Pesa STK Push
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-muted p-4 rounded-lg">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Amount Due:</span>
              <span className="text-lg font-bold">KES {paymentData.amount.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center mt-2">
              <span className="text-sm text-muted-foreground">Utility:</span>
              <span className="text-sm">{paymentData.utilityName}</span>
            </div>
            <div className="flex justify-between items-center mt-2">
              <span className="text-sm text-muted-foreground">Due Date:</span>
              <span className="text-sm">{new Date(paymentData.dueDate).toLocaleDateString()}</span>
            </div>
          </div>

          {error && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-destructive" />
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          {paymentStatus === 'processing' && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
              <p className="text-sm text-blue-800">
                Processing payment... Please check your phone and enter your M-Pesa PIN to complete the payment.
              </p>
            </div>
          )}

          {paymentStatus === 'success' && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center gap-2">
              <div className="h-4 w-4 rounded-full bg-green-600 flex items-center justify-center">
                <div className="h-2 w-2 rounded-full bg-white"></div>
              </div>
              <p className="text-sm text-green-800">Payment successful!</p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="phone">Phone Number</Label>
            <Input
              id="phone"
              type="tel"
              placeholder="0712345678 or 254712345678"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              disabled={loading || paymentStatus === 'processing'}
            />
            <p className="text-xs text-muted-foreground">
              Enter your M-Pesa registered phone number
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <Button
              onClick={handlePayment}
              disabled={loading || paymentStatus === 'processing' || !phoneNumber.trim()}
              className="w-full"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Initiating Payment...
                </>
              ) : paymentStatus === 'processing' ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Smartphone className="mr-2 h-4 w-4" />
                  Pay KES {paymentData.amount.toLocaleString()} via M-Pesa
                </>
              )}
            </Button>
          </div>

          <div className="text-xs text-muted-foreground text-center">
            <p>Powered by KCB Buni M-Pesa Express • Secure payment processing</p>
            <p>You will receive an STK Push notification on your phone</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
