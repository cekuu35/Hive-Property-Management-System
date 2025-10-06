import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, CreditCard, Zap } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
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
  const [loading, setLoading] = useState(false);
  const [scriptLoaded, setScriptLoaded] = useState(false);

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
      toast({
        title: "Error",
        description: "Payment system is still loading. Please try again.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      // Comprehensive lease lookup - try multiple approaches
      let { data: lease } = await supabase
        .from('leases')
        .select('id')
        .eq('tenant_id', profile?.id)
        .eq('status', 'active')
        .maybeSingle();

      // If no lease found by tenant_id, try via tenant_info
      if (!lease) {
        const { data: tenantInfo } = await supabase
          .from('tenant_info')
          .select('id')
          .eq('profile_id', profile?.id)
          .order('updated_at', { ascending: false })
          .limit(1);

        if (tenantInfo && tenantInfo.length > 0) {
          const { data: leaseData } = await supabase
            .from('leases')
            .select('id')
            .eq('tenant_info_id', tenantInfo[0].id)
            .eq('status', 'active')
            .maybeSingle();
          
          lease = leaseData;
        }
      }

      // If still no lease found, try reverse lookup - find tenant_info by email
      if (!lease) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('email')
          .eq('id', profile?.id)
          .single();

        if (profileData?.email) {
          const { data: tenantInfoByEmail } = await supabase
            .from('tenant_info')
            .select('id')
            .eq('email', profileData.email)
            .order('updated_at', { ascending: false })
            .limit(1);

          if (tenantInfoByEmail && tenantInfoByEmail.length > 0) {
            const { data: leaseData } = await supabase
              .from('leases')
              .select('id')
              .eq('tenant_info_id', tenantInfoByEmail[0].id)
              .eq('status', 'active')
              .maybeSingle();
            
            lease = leaseData;
          }
        }
      }

      const reference = `rent_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
      const publicKey = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY || 'pk_test_9f2c94cce8c01d4403373ce6f4bf8f1a7d142668';
      
      const handler = window.PaystackPop.setup({
        key: publicKey,
        email: user?.email || 'tenant@example.com',
        amount: Math.round(rentAmount * 100), // Convert to kobo
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
              display_name: "Lease ID",
              variable_name: "lease_id",
              value: lease?.id || ''
            },
            {
              display_name: "Due Date",
              variable_name: "due_date",
              value: dueDate
            }
          ]
        },
        callback: function(response: any) {
          // Redirect to callback URL with reference
          window.location.href = `https://lovly-prop-ai-33-ten.vercel.app/payment/callback?reference=${response.reference}`;
        },
        onClose: function() {
          setLoading(false);
          toast({
            title: "Payment Cancelled",
            description: "You closed the payment window. Your payment was not completed.",
            variant: "destructive",
          });
        }
      });

      handler.openIframe();
    } catch (error) {
      console.error('Payment error:', error);
      toast({
        title: "Error",
        description: "Failed to initialize payment. Please try again.",
        variant: "destructive",
      });
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


  const renderPayment = () => (
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
              Pay KES {rentAmount.toLocaleString()}
            </>
          )}
        </Button>
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
          {renderPayment()}
        </div>
      </DialogContent>
    </Dialog>
  );
};