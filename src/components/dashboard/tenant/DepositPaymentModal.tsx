import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CreditCard, Loader2, Zap } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';

// Declare Paystack type for TypeScript
declare global {
  interface Window {
    PaystackPop: any;
  }
}

interface DepositPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  application: any;
  onPaymentComplete: (applicationId: string, paymentReference: string) => Promise<void>;
}

export const DepositPaymentModal = ({ 
  isOpen, 
  onClose, 
  application, 
  onPaymentComplete 
}: DepositPaymentModalProps) => {
  const { profile, user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [scriptLoaded, setScriptLoaded] = useState(false);

  // Get the correct deposit amount from the unit (fallback to unit rent if missing)
  const depositAmount = (application?.units?.deposit_amount ?? application?.deposit_amount ?? application?.units?.rent_amount ?? 0);

  // Load Paystack inline script
  useEffect(() => {
    if (isOpen && !scriptLoaded) {
      const script = document.createElement('script');
      script.src = 'https://js.paystack.co/v1/inline.js';
      script.async = true;
      script.onload = () => setScriptLoaded(true);
      document.body.appendChild(script);
      
      return () => {
        if (script.parentNode) {
          script.parentNode.removeChild(script);
        }
      };
    }
  }, [isOpen, scriptLoaded]);

  const handlePayment = async () => {
    if (!scriptLoaded || !window.PaystackPop) {
      toast.error('Payment system is still loading. Please try again.');
      return;
    }

    setLoading(true);

    try {
      const reference = `deposit_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
      const publicKey = 'pk_test_9f2c94cce8c01d4403373ce6f4bf8f1a7d142668';
      
      const handler = window.PaystackPop.setup({
        key: publicKey,
        email: user?.email || 'tenant@example.com',
        amount: Math.round(depositAmount * 100), // Convert to kobo
        currency: 'KES',
        ref: reference,
        metadata: {
          custom_fields: [
            {
              display_name: "Tenant Name",
              variable_name: "tenant_name",
              value: `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim() || 'Tenant'
            },
            {
              display_name: "Application ID",
              variable_name: "application_id",
              value: application?.id || ''
            },
            {
              display_name: "Property",
              variable_name: "property",
              value: application?.properties?.name || ''
            },
            {
              display_name: "Unit",
              variable_name: "unit",
              value: application?.units?.unit_number || ''
            },
            {
              display_name: "Payment Type",
              variable_name: "payment_type",
              value: "Security Deposit"
            }
          ]
        },
        callback: function(response: any) {
          // Call the completion handler and then redirect
          onPaymentComplete(application.id, response.reference).then(() => {
            window.location.href = `https://lovly-prop-ai-33-ten.vercel.app/payment/callback?reference=${response.reference}`;
          });
        },
        onClose: function() {
          setLoading(false);
          toast.error('Payment Cancelled', {
            description: 'You closed the payment window. Your payment was not completed.'
          });
        }
      });

      handler.openIframe();
    } catch (error) {
      console.error('Payment error:', error);
      toast.error('Failed to initialize payment. Please try again.');
      setLoading(false);
    }
  };

  const userEmail = user?.email || 'tenant@example.com';
  
  if (!userEmail) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
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
            <Button onClick={onClose} className="w-full">
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Pay Security Deposit
          </DialogTitle>
          <DialogDescription>Secure payment processing powered by Paystack.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Application Details */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Payment Summary</CardTitle>
              <CardDescription>
                {application?.properties?.name} - Unit {application?.units?.unit_number}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex justify-between items-center text-lg">
                <span className="font-medium">Security Deposit:</span>
                <span className="text-xl font-bold text-primary">KES {depositAmount?.toLocaleString()}</span>
              </div>
            </CardContent>
          </Card>

          {/* Payment Section */}
          <div className="flex flex-col items-center justify-center py-6 space-y-6">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
              <Zap className="h-8 w-8 text-blue-600" />
            </div>
            
            <div className="text-center">
              <h3 className="text-lg font-semibold mb-2">Pay Security Deposit</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Amount: KES {depositAmount?.toLocaleString()}
              </p>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 max-w-sm w-full">
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

            <div className="w-full max-w-xs space-y-3">
              <Button 
                onClick={handlePayment} 
                className="w-full"
                disabled={loading || !scriptLoaded}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <CreditCard className="mr-2 h-4 w-4" />
                    Pay KES {depositAmount?.toLocaleString()}
                  </>
                )}
              </Button>
              
              <Button 
                variant="outline" 
                onClick={onClose} 
                className="w-full"
                disabled={loading}
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};