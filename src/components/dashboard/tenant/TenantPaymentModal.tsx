import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, CreditCard, Zap } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

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
}

export const TenantPaymentModal = ({ open, onOpenChange, rentAmount, dueDate, onPaymentSuccess }: TenantPaymentModalProps) => {
  const { profile, user } = useAuth();
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [loading, setLoading] = useState(false);

  // Load Paystack inline script
  useEffect(() => {
    if (open && !scriptLoaded) {
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
  }, [open, scriptLoaded]);

  const handlePayment = async () => {
    if (!scriptLoaded || !window.PaystackPop) {
      toast.error("Payment system is still loading. Please try again.");
      return;
    }

    try {
      setLoading(true);
      
      // Comprehensive lease lookup - try multiple approaches
      let { data: lease } = await supabase
        .from('leases')
        .select('id, landlord_id')
        .eq('tenant_id', profile?.id)
        .eq('status', 'active')
        .maybeSingle();

      if (!lease && profile?.id) {
        // Fallback: Try by tenant_info.profile_id -> tenant_info.id -> leases.tenant_info_id
        const { data: tenantInfo } = await supabase
          .from('tenant_info')
          .select('id')
          .eq('profile_id', profile.id)
          .maybeSingle();

        if (tenantInfo) {
          const { data: leaseByTenantInfo } = await supabase
            .from('leases')
            .select('id, landlord_id')
            .eq('tenant_info_id', tenantInfo.id)
            .eq('status', 'active')
            .maybeSingle();
          
          lease = leaseByTenantInfo;
        }
      }

      if (!lease) {
        console.error('No active lease found for tenant');
        toast.error("Could not find an active lease. Please contact your landlord.");
        setLoading(false);
        return;
      }

      const publicKey = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY || 'pk_test_9f2c94cce8c01d4403373ce6f4bf8f1a7d142668';
      const amountInKobo = Math.round(rentAmount * 100);
      const reference = `rent_${Date.now()}_${profile?.id}`;
      const userEmail = user?.email || 'tenant@example.com';

      const handler = window.PaystackPop.setup({
        key: publicKey,
        email: userEmail,
        amount: amountInKobo,
        ref: reference,
        metadata: {
          custom_fields: [
            {
              display_name: "Tenant Name",
              variable_name: "tenant_name",
              value: `${profile?.first_name} ${profile?.last_name}`
            },
            {
              display_name: "Payment Type",
              variable_name: "payment_type",
              value: "Rent Payment"
            }
          ],
          type: 'rent',
          lease_id: lease.id,
          tenant_id: profile?.id,
          landlord_id: lease.landlord_id
        },
        onSuccess: function() {
          // Background processing
          setTimeout(async () => {
            try {
              await onPaymentSuccess();
            } catch (bgError) {
              console.error('Background payment success error:', bgError);
            }
          }, 1000);

          toast.success("Payment successful! Your rent payment has been processed.");
          onOpenChange(false);
        },
        onClose: function() {
          toast.error("You closed the payment window. Your payment was not completed.");
        }
      });

      handler.openIframe();
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
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              className="flex-1"
              disabled={loading}
            >
              Cancel
            </Button>
            <Button 
              onClick={handlePayment}
              className="flex-1"
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
                  Pay Now
                </>
              )}
            </Button>
          </div>

          <p className="text-xs text-muted-foreground text-center">
            By proceeding, you agree to complete the payment for the amount shown above
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};
