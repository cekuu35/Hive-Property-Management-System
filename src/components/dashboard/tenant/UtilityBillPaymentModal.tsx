import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, CreditCard, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { PaystackButton } from 'react-paystack';
import { convertToKobo } from '@/lib/paystack';
import { toast } from 'sonner';
import { createClient } from '@supabase/supabase-js';

// Admin client for accessing all tables
const supabaseAdmin = createClient(
  'https://kozhlejudselgtmohdfm.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtvemhsZWp1ZHNlbGd0bW9oZGZtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzQwNDI5OCwiZXhwIjoyMDcyOTgwMjk4fQ.LWosNpPJO_clOXXYa5pqGM36S-FLANk71F8BvcsJf2g'
);

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
  
  // Environment variables are loaded

  // Load Paystack inline script for better reliability
  useEffect(() => {
    // Check if Paystack is already available
    if (window.PaystackPop) {
      console.log('✅ Paystack already loaded');
      setScriptLoaded(true);
      return;
    }

    if (isOpen && !scriptLoaded) {
      // Check if script is already in the DOM
      if (document.querySelector('script[src="https://js.paystack.co/v1/inline.js"]')) {
        console.log('✅ Paystack script already in DOM, waiting for load...');
        // Wait a bit for the script to load
        const checkInterval = setInterval(() => {
          if (window.PaystackPop) {
            console.log('✅ Paystack loaded after waiting');
            setScriptLoaded(true);
            clearInterval(checkInterval);
          }
        }, 100);
        
        // Clear interval after 5 seconds
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

  // Process utility payment with database updates
  const processUtilityPayment = async (reference: string) => {
    try {
      console.log('🔍 Processing utility bill payment...');
      console.log('Reference:', reference);
      
      // Import the verification service dynamically to avoid circular imports
      const { verifyPaystackPayment, updateUtilityBillPayment } = await import('@/lib/paymentVerification');
      
      // Verify the payment with Paystack
      const verification = await verifyPaystackPayment(reference);
      
      if (!verification.success) {
        throw new Error('Payment verification failed');
      }

      // Update the utility bill in the database
      const updateSuccess = await updateUtilityBillPayment(
        paymentData.billId,
        reference,
        paymentData.amount
      );

      if (!updateSuccess) {
        console.warn('⚠️ Payment verified but database update failed');
      }

      console.log('✅ Payment verified and database updated:', verification);

      // Show success message
      toast.success(`Payment successful! Your utility bill payment of KES ${paymentData.amount.toLocaleString()} has been processed and updated.`);

      return { success: true, payment: { reference, verification } };
      
    } catch (error) {
      console.error('❌ Utility payment processing failed:', error);
      throw error;
    }
  };

  // Payment method using backend API for proper split payment support
  const handleInlinePayment = async () => {
    console.log('🚀 Initializing utility bill payment with backend API for split payments...');
    
    setProcessing(true);
    setError(null);

    try {
      // Use the backend API to initialize the transaction with subaccount
      console.log('📞 Calling backend API to initialize transaction with subaccount...');
      console.log('🔍 API URL: http://localhost:3001/api/initializeUtilityPayment');
      
      const response = await fetch('http://localhost:3001/api/initializeUtilityPayment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          billId: paymentData.billId,
          amount: paymentData.amount,
          email: paymentData.email,
          callbackUrl: `${window.location.origin}/payment/callback?type=utility&billId=${paymentData.billId}`
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
        email: paymentData.email,
        amount: paystackData.amount,
        currency: 'KES',
        ref: paystackData.reference,
        authorization: paystackData.authorization_code, // Use the authorization code from backend
        metadata: {
          utility_name: paymentData.utilityName,
          due_date: paymentData.dueDate,
          bill_id: paymentData.billId,
          payment_type: "utility"
        },
        callback: function(response: any) {
          console.log('🎉 UTILITY BILL PAYMENT SUCCESS CALLBACK TRIGGERED!');
          console.log('✅ Payment successful:', response);
          
          // Process payment and then redirect
          processUtilityPayment(response.reference).then(() => {
            console.log('✅ Utility payment processed successfully');
            handlePaymentSuccess(response.reference);
            // Redirect to callback page
            window.location.href = `${window.location.origin}/payment/callback?reference=${response.reference}&type=utility&amount=${paymentData.amount}&billId=${paymentData.billId}`;
          }).catch((error) => {
            console.error('❌ Utility payment processing failed:', error);
            setError('Payment completed but failed to update records. Please contact support.');
            setProcessing(false);
          });
        },
        onClose: function() {
          console.log('Payment modal closed by user');
          setProcessing(false);
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
      setProcessing(false);
    }
  };

  // Legacy payment method (keeping for fallback)
  const handleLegacyPayment = async () => {
    console.log('Attempting utility bill payment with legacy method...');
    console.log('Script loaded:', scriptLoaded);
    console.log('PaystackPop available:', !!window.PaystackPop);
    console.log('Public key:', publicKey);
    console.log('Payment data:', paymentData);

    if (!scriptLoaded) {
      console.log('🔄 [UtilityBillPaymentModal] Script not loaded, attempting to reload...');
      // Try to reload the script
      setScriptLoaded(false);
      const errorMsg = 'Payment system is still loading. Please wait a moment and try again.';
      console.error(errorMsg);
      toast.error(errorMsg);
      setError(errorMsg);
      return;
    }

    if (!window.PaystackPop) {
      console.log('🔄 [UtilityBillPaymentModal] PaystackPop not available, attempting to reload script...');
      // Try to reload the script
      setScriptLoaded(false);
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
      console.log('Initializing utility bill payment with subaccount...');
      
      // Generate a unique reference for this payment
      const reference = `utility_${Date.now()}_${paymentData.billId}`;
      const amountInKobo = convertToKobo(paymentData.amount);
      
      // Fetch the landlord's subaccount code for transaction splitting
      let subaccountCode = null;
      try {
        // First get the bill to find the landlord_id
        const { data: bill, error: billError } = await supabaseAdmin
          .from('unit_bills')
          .select('landlord_id')
          .eq('id', paymentData.billId)
          .single();
        
        if (!billError && bill?.landlord_id) {
          // Then get the landlord's subaccount code
          const { data: landlord, error: landlordError } = await supabaseAdmin
            .from('landlords')
            .select('subaccount_code')
            .eq('id', bill.landlord_id)
            .single();
          
          if (!landlordError && landlord?.subaccount_code) {
            subaccountCode = landlord.subaccount_code;
            console.log('✅ Found subaccount code:', subaccountCode);
          } else {
            console.warn('⚠️ No subaccount code found, using main account');
          }
        } else {
          console.warn('⚠️ No landlord found for this bill, using main account');
        }
      } catch (error) {
        console.warn('⚠️ Error fetching subaccount code:', error);
      }
      
      console.log('Payment details:', {
        reference,
        amount: paymentData.amount,
        amountInKobo,
        email: paymentData.email,
        subaccount: subaccountCode,
        publicKey: publicKey.substring(0, 20) + '...'
      });
      
      // Define callback functions separately to ensure they're proper functions
      const paymentCallback = function(response: any) {
        console.log('🎉 UTILITY BILL PAYMENT SUCCESS CALLBACK TRIGGERED!');
        console.log('✅ Payment successful:', response);
        
        // Process payment and then redirect
        processUtilityPayment(response.reference).then(() => {
          console.log('✅ Utility payment processed successfully');
          handlePaymentSuccess(response.reference);
          // Redirect to callback page
          window.location.href = `${window.location.origin}/payment/callback?reference=${response.reference}&type=utility&amount=${paymentData.amount}&billId=${paymentData.billId}`;
        }).catch((error) => {
          console.error('❌ Utility payment processing failed:', error);
          setError('Payment completed but failed to update records. Please contact support.');
          setProcessing(false);
        });
      };

      const closeCallback = function() {
        console.log('Payment modal closed by user');
        setProcessing(false);
        toast.error('Payment cancelled. You can try again anytime.');
      };

      // Debug Paystack configuration
      console.log('🔍 Paystack configuration:', {
        key: publicKey.substring(0, 20) + '...',
        email: paymentData.email,
        amount: amountInKobo,
        currency: 'KES',
        ref: reference,
        subaccount: subaccountCode,
        amountInKes: paymentData.amount,
        isValidEmail: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(paymentData.email),
        amountValid: amountInKobo > 0,
        subaccountValid: subaccountCode ? subaccountCode.startsWith('ACCT_') : false
      });

      // Create Paystack configuration object with proper validation
      const paystackConfig: any = {
        key: publicKey,
        email: paymentData.email,
        amount: amountInKobo,
        currency: 'KES',
        ref: reference,
        metadata: {
          utility_name: paymentData.utilityName,
          due_date: paymentData.dueDate,
          bill_id: paymentData.billId,
          payment_type: "utility"
        },
        callback: paymentCallback,
        onClose: closeCallback
      };

      // Ensure all required fields are present and valid
      if (!paystackConfig.key || typeof paystackConfig.key !== 'string') {
        throw new Error('Invalid Paystack public key');
      }
      if (!paystackConfig.email || typeof paystackConfig.email !== 'string') {
        throw new Error('Invalid email address');
      }
      if (!paystackConfig.amount || typeof paystackConfig.amount !== 'number' || paystackConfig.amount <= 0) {
        throw new Error('Invalid amount');
      }
      if (!paystackConfig.ref || typeof paystackConfig.ref !== 'string') {
        throw new Error('Invalid payment reference');
      }
      if (!paystackConfig.callback || typeof paystackConfig.callback !== 'function') {
        throw new Error('Invalid callback function');
      }
      if (!paystackConfig.onClose || typeof paystackConfig.onClose !== 'function') {
        throw new Error('Invalid close callback function');
      }

      // Only add subaccount if it's valid
      if (subaccountCode && subaccountCode.startsWith('ACCT_')) {
        paystackConfig.subaccount = subaccountCode;
        console.log('✅ [UtilityBillPaymentModal] Adding subaccount to Paystack config:', subaccountCode);
        console.log('🔍 [UtilityBillPaymentModal] Subaccount validation: starts with ACCT_ =', subaccountCode.startsWith('ACCT_'));
      } else {
        console.log('⚠️ [UtilityBillPaymentModal] No valid subaccount code, using main account');
        console.log('🔍 [UtilityBillPaymentModal] Subaccount code was:', subaccountCode);
        console.log('🔍 [UtilityBillPaymentModal] Subaccount type:', typeof subaccountCode);
      }

      // Validate Paystack configuration before sending
      console.log('🔍 [UtilityBillPaymentModal] Validating Paystack config...');
      
      // Check required fields
      if (!paystackConfig.key) {
        throw new Error('Missing Paystack public key');
      }
      if (!paystackConfig.email) {
        throw new Error('Missing customer email');
      }
      if (!paystackConfig.amount || paystackConfig.amount <= 0) {
        throw new Error('Invalid amount: ' + paystackConfig.amount);
      }
      if (!paystackConfig.ref) {
        throw new Error('Missing payment reference');
      }
      
      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(paystackConfig.email)) {
        throw new Error('Invalid email format: ' + paystackConfig.email);
      }
      
      // Validate amount is in kobo (should be integer)
      if (!Number.isInteger(paystackConfig.amount)) {
        throw new Error('Amount must be in kobo (integer): ' + paystackConfig.amount);
      }
      
      console.log('✅ [UtilityBillPaymentModal] Paystack config validation passed');
      console.log('🚀 Final Paystack config:', paystackConfig);
      console.log('🔍 [UtilityBillPaymentModal] Subaccount in final config:', paystackConfig.subaccount);
      console.log('🔍 [UtilityBillPaymentModal] Has subaccount property:', 'subaccount' in paystackConfig);

      // Validate PaystackPop is available
      if (!window.PaystackPop) {
        throw new Error('Paystack is not loaded. Please refresh the page and try again.');
      }

      // Additional validation of the configuration object
      if (!paystackConfig || typeof paystackConfig !== 'object') {
        throw new Error('Invalid Paystack configuration object');
      }

      console.log('🔍 [UtilityBillPaymentModal] PaystackPop setup method available:', typeof window.PaystackPop.setup);
      console.log('🔍 [UtilityBillPaymentModal] PaystackPop object keys:', Object.keys(window.PaystackPop));
      
      // Test if PaystackPop.setup is a function
      if (typeof window.PaystackPop.setup !== 'function') {
        throw new Error('PaystackPop.setup is not a function. Paystack may not be properly loaded.');
      }
      
      const handler = window.PaystackPop.setup(paystackConfig);

      if (!handler) {
        throw new Error('Failed to create Paystack handler');
      }

      console.log('✅ [UtilityBillPaymentModal] Paystack handler created successfully:', typeof handler);

      console.log('🚀 Opening Paystack iframe...');
      
      // Add error handling for Paystack
      try {
        handler.openIframe();
      } catch (paystackError) {
        console.error('Paystack iframe error:', paystackError);
        console.error('Paystack error details:', {
          message: paystackError.message,
          name: paystackError.name,
          stack: paystackError.stack
        });
        throw new Error(`Paystack error: ${paystackError.message || 'Failed to open payment form'}`);
      }
    } catch (error) {
      console.error('Payment initialization error:', error);
      const errorMsg = `Failed to initialize payment: ${error instanceof Error ? error.message : 'Unknown error'}`;
      setError(errorMsg);
      toast.error(errorMsg);
      setProcessing(false);
      
      // Show additional help
      console.log('💡 Troubleshooting tips:');
      console.log('1. Check if the API server is running');
      console.log('2. Verify Paystack keys are configured');
      console.log('3. Check browser console for network errors');
      console.log('4. Ensure the utility bill exists in the database');
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
      utility_name: paymentData.utilityName,
      due_date: paymentData.dueDate,
      bill_id: paymentData.billId,
      payment_type: "utility"
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
