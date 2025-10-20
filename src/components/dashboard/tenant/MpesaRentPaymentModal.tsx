import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Smartphone, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

interface MpesaRentPaymentModalProps {
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

export const MpesaRentPaymentModal = ({ 
  open, 
  onOpenChange, 
  rentAmount, 
  dueDate, 
  onPaymentSuccess, 
  leaseData 
}: MpesaRentPaymentModalProps) => {
  const { profile, user } = useAuth();
  const [phoneNumber, setPhoneNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'processing' | 'success' | 'failed'>('idle');

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if ((window as any).mpesaTimeoutId) {
        clearTimeout((window as any).mpesaTimeoutId);
        (window as any).mpesaTimeoutId = null;
      }
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
    if (!leaseData?.id) {
      toast.error('Lease information is missing. Please try again.');
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
      console.log('🚀 [KCB Buni M-Pesa] Initiating rent payment...', {
        leaseId: leaseData.id,
        amount: rentAmount,
        phoneNumber: formattedPhone
      });
      const { data, error } = await supabase.functions.invoke('mpesa-stk-push', {
        body: {
          phoneNumber: formattedPhone,
          amount: rentAmount,
          accountReference: leaseData.id
        }
      });

      console.log('📥 [KCB Buni M-Pesa] Response:', { data, error });

      if (error) {
        throw new Error(error.message || 'Failed to initiate payment');
      }

      if (!data.success) {
        throw new Error(data.error || 'Failed to initiate payment');
      }
      
      console.log('✅ [KCB Buni M-Pesa] STK Push initiated:', data);

      setPaymentStatus('processing');
      toast.success('Payment request sent! Please check your phone and enter your M-Pesa PIN to complete the payment.');
      
      // For KCB Buni, we'll monitor via callbacks rather than polling
      // The payment will be updated in the database when the callback is received
      setTimeout(() => {
        setPaymentStatus('idle');
        onOpenChange(false);
        toast.info('Payment is being processed. You will be notified when it completes.');
      }, 5000);

    } catch (error) {
      console.error('❌ [KCB Buni M-Pesa] Payment error:', error);
      const errorMsg = `Payment failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
      setError(errorMsg);
      setPaymentStatus('failed');
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const pollPaymentStatus = async (checkoutRequestID: string) => {
    // Set up 10-second timeout to cancel payment if not completed
    const timeoutId = setTimeout(() => {
      if (paymentStatus === 'processing') {
        setPaymentStatus('failed');
        setError('Payment timeout - please try again. You have 10 seconds to complete the payment.');
        toast.error('Payment timeout! Please try again. You have 10 seconds to complete the payment.');
      }
    }, 10000); // 10 seconds timeout

    // Store timeout ID for cleanup
    (window as any).mpesaTimeoutId = timeoutId;

    // Poll for payment status every 2 seconds
    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/mpesa-stk-push/payment-status/${checkoutRequestID}`, {
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
        });
        const data = await response.json();

        if (data.success && data.data.status !== 'pending') {
          clearInterval(pollInterval);
          clearTimeout(timeoutId);
          (window as any).mpesaTimeoutId = null;

          if (data.data.status === 'success') {
            setPaymentStatus('success');
            onPaymentSuccess();
            onOpenChange(false);
            toast.success('Payment successful! Your rent has been paid.');
          } else if (data.data.status === 'cancelled') {
            setPaymentStatus('failed');
            setError('Payment was cancelled. Please try again.');
            toast.error('Payment was cancelled. Please try again.');
          } else if (data.data.status === 'failed') {
            setPaymentStatus('failed');
            setError(`Payment failed: ${data.data.resultDesc || 'Unknown error'}`);
            toast.error(`Payment failed: ${data.data.resultDesc || 'Unknown error'}`);
          }
        }
      } catch (error) {
        console.error('Error polling payment status:', error);
      }
    }, 2000);

    // Clean up polling after 30 seconds
    setTimeout(() => {
      clearInterval(pollInterval);
      if (paymentStatus === 'processing') {
        setPaymentStatus('idle');
        toast.info('Payment is still being processed. You will be notified when it completes.');
      }
    }, 30000);
  };

  const handleSuccess = () => {
    // Clear any pending timeout
    if ((window as any).mpesaTimeoutId) {
      clearTimeout((window as any).mpesaTimeoutId);
      (window as any).mpesaTimeoutId = null;
    }
    
    setPaymentStatus('success');
    onPaymentSuccess();
    onOpenChange(false);
    toast.success('Payment successful! Your rent has been paid.');
  };

  const handleClose = () => {
    // Clear any pending timeout
    if ((window as any).mpesaTimeoutId) {
      clearTimeout((window as any).mpesaTimeoutId);
      (window as any).mpesaTimeoutId = null;
    }
    
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
            M-Pesa Rent Payment
          </DialogTitle>
          <DialogDescription>
            Pay your rent securely via M-Pesa STK Push
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
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-destructive" />
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          {paymentStatus === 'processing' && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
              <p className="text-sm text-blue-800">
                Processing payment... Please check your phone and enter your M-Pesa PIN. You have 10 seconds to complete the payment. If you cancel on your phone, the payment will be cancelled here too.
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
                  Pay KES {rentAmount.toLocaleString()} via M-Pesa
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
