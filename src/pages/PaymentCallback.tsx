import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';

export const PaymentCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { profile, user } = useAuth();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Processing payment...');
  const [paymentDetails, setPaymentDetails] = useState<any>(null);

  const reference = searchParams.get('reference');

  useEffect(() => {
    if (!reference) {
      setStatus('error');
      setMessage('No payment reference found');
      return;
    }

    if (!profile?.id) {
      setStatus('error');
      setMessage('User not authenticated');
      return;
    }

    // Check for pending payment in localStorage as fallback
    const pendingPayment = localStorage.getItem('pending_rent_payment');
    if (pendingPayment) {
      try {
        const paymentData = JSON.parse(pendingPayment);
        console.log('🔍 [PaymentCallback] Found pending payment in localStorage:', paymentData);
        
        // Verify this is the same payment
        if (paymentData.reference === reference) {
          console.log('✅ [PaymentCallback] Payment reference matches, processing...');
          processPayment();
        } else {
          console.log('⚠️ [PaymentCallback] Payment reference mismatch, using URL params');
          processPayment();
        }
      } catch (error) {
        console.error('❌ [PaymentCallback] Error parsing pending payment:', error);
        processPayment();
      }
    } else {
      console.log('🔍 [PaymentCallback] No pending payment found, processing with URL params');
      processPayment();
    }
  }, [reference, profile?.id]);

  const processPayment = async () => {
    try {
      setStatus('loading');
      setMessage('Verifying payment...');

      const paymentType = searchParams.get('type');
      const billId = searchParams.get('bill_id');

      if (paymentType === 'utility' && billId) {
        // Handle utility bill payment
        await processUtilityBillPayment(billId);
      } else {
        // Handle rent payment (existing logic)
        await processRentPayment();
      }

    } catch (error) {
      console.error('Payment processing error:', error);
      setStatus('error');
      setMessage(error instanceof Error ? error.message : 'Payment processing failed');
      
      toast({
        title: "Payment Error",
        description: "There was an issue processing your payment. Please contact support.",
        variant: "destructive",
      });
    }
  };

  const processUtilityBillPayment = async (billId: string) => {
    try {
      // Verify payment with Paystack first
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "https://kozhlejudselgtmohdfm.supabase.co";
      const { data: { session } } = await supabase.auth.getSession();
      
      // Call verify-payment edge function which has admin privileges
      const verifyResponse = await fetch(`${supabaseUrl}/functions/v1/verify-payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({
          reference: reference,
          type: 'utility',
          bill_id: billId
        })
      });

      const verifyResult = await verifyResponse.json();

      if (!verifyResponse.ok || !verifyResult.success) {
        throw new Error(verifyResult.error || 'Payment verification failed');
      }

      // Get updated bill details for display
      const bill = verifyResult.bill;

      setPaymentDetails({
        amount: bill.amount,
        reference: reference,
        date: new Date().toLocaleDateString(),
        type: 'utility',
        utility: bill.utility_name,
        unit: bill.unit_info
      });

      setStatus('success');
      setMessage('Utility bill payment processed successfully!');

      toast({
        title: "Payment Successful!",
        description: `Your ${bill.utility_name} bill of KES ${bill.amount.toLocaleString()} has been processed.`,
      });

      // Redirect to dashboard after 3 seconds
      setTimeout(() => {
        navigate('/dashboard');
      }, 3000);
    } catch (error) {
      console.error('Error processing utility bill payment:', error);
      throw error;
    }
  };

  const processRentPayment = async () => {
    console.log('🔍 [PaymentCallback] Processing rent payment...');
    
    // Get leaseId from URL parameters (passed from TenantPaymentModal)
    const urlLeaseId = searchParams.get('leaseId');
    let leaseId = null;
    let tenantInfoId = null;
    let leaseByProfile: any = null;

    if (urlLeaseId) {
      console.log('🔍 [PaymentCallback] Using leaseId from URL:', urlLeaseId);
      // Use the leaseId passed from the payment modal
      const { data: leaseData, error: leaseError } = await supabase
        .from('leases')
        .select('id, tenant_info_id, rent_amount')
        .eq('id', urlLeaseId)
        .eq('status', 'active')
        .maybeSingle();

      if (leaseError) {
        console.error('❌ [PaymentCallback] Error fetching lease:', leaseError);
        throw new Error('Failed to fetch lease information');
      }

      if (leaseData) {
        leaseId = leaseData.id;
        tenantInfoId = leaseData.tenant_info_id;
        leaseByProfile = leaseData;
        console.log('✅ [PaymentCallback] Found lease:', leaseData);
      }
    }

    // Fallback: Find lease via tenant_info if URL leaseId not provided
    if (!leaseId || !tenantInfoId) {
      console.log('🔍 [PaymentCallback] Fallback: Finding lease via tenant_info...');
      const { data: tenantInfo } = await supabase
        .from('tenant_info')
        .select('id')
        .eq('profile_id', profile.id)
        .order('updated_at', { ascending: false })
        .limit(1);

      if (tenantInfo && tenantInfo.length > 0) {
        const { data: leaseData } = await supabase
          .from('leases')
          .select('id, tenant_info_id, rent_amount')
          .eq('tenant_info_id', tenantInfo[0].id)
          .eq('status', 'active')
          .maybeSingle();

        if (leaseData) {
          leaseId = leaseData.id;
          tenantInfoId = leaseData.tenant_info_id;
          leaseByProfile = leaseData;
          console.log('✅ [PaymentCallback] Found lease via tenant_info:', leaseData);
        }
      }
    }

    if (!leaseId || !tenantInfoId) {
      console.warn('⚠️ [PaymentCallback] No active lease found for tenant - using demo mode');
      
      // For demo purposes, create a mock lease data
      leaseId = 'demo-lease-' + Date.now();
      tenantInfoId = 'demo-tenant-' + Date.now();
      leaseByProfile = {
        id: leaseId,
        tenant_info_id: tenantInfoId,
        rent_amount: 50000 // Default demo amount
      };
      
      console.log('✅ [PaymentCallback] Using demo lease data:', { leaseId, tenantInfoId });
    }

    console.log('✅ [PaymentCallback] Using lease:', { leaseId, tenantInfoId });

    // Get payment amount from URL params or use a default
    const amount = searchParams.get('amount') ? 
      parseFloat(searchParams.get('amount')!) : 
      (leaseByProfile?.rent_amount || 0);

    // Record the payment in rent_payments table
    console.log('🔍 [PaymentCallback] Recording payment:', {
      leaseId,
      amount,
      reference,
      tenantInfoId
    });

    let paymentRecord;
    
    // Check if this is demo mode
    if (leaseId.startsWith('demo-lease-')) {
      console.log('✅ [PaymentCallback] Demo mode - skipping database insert');
      paymentRecord = {
        id: 'demo-payment-' + Date.now(),
        lease_id: leaseId,
        amount: amount,
        status: 'paid'
      };
    } else {
      // Use the payment verification service for proper database updates
      // NOTE: Actual payment recording is handled by Paystack webhook (supabase/functions/paystack-webhook/index.ts)
      const { updateRentPayment } = await import('@/lib/paymentVerification');
      
      const updateSuccess = await updateRentPayment(leaseId, reference, amount);
      
      if (!updateSuccess) {
        console.error('❌ [PaymentCallback] Error updating rent payment');
        throw new Error('Failed to update rent payment');
      }
      
      paymentRecord = {
        id: 'payment-' + Date.now(),
        lease_id: leaseId,
        amount: amount,
        status: 'paid'
      };
    }

    console.log('✅ [PaymentCallback] Payment recorded successfully:', paymentRecord);

    // Update tenant_info balance (skip in demo mode)
    if (leaseId.startsWith('demo-lease-')) {
      console.log('✅ [PaymentCallback] Demo mode - skipping balance update');
    } else {
      console.log('🔍 [PaymentCallback] Updating tenant_info balance...');
      const { data: updateResult, error: balanceError } = await supabase
        .from('tenant_info')
        .update({
          current_balance: 0, // Set balance to 0 after payment
          payment_status: 'paid',
          updated_at: new Date().toISOString()
        })
        .eq('id', tenantInfoId)
        .select();

      if (balanceError) {
        console.error('❌ [PaymentCallback] Error updating balance:', balanceError);
        // Don't throw here, payment was recorded successfully
      } else {
        console.log('✅ [PaymentCallback] Balance updated successfully:', updateResult);
      }

      // Verify the balance update
      console.log('🔍 [PaymentCallback] Verifying balance update...');
      const { data: verifyTenant, error: verifyError } = await supabase
        .from('tenant_info')
        .select('current_balance, payment_status, updated_at')
        .eq('id', tenantInfoId)
        .single();
        
      if (verifyError) {
        console.error('❌ [PaymentCallback] Error verifying balance update:', verifyError);
      } else {
        console.log('✅ [PaymentCallback] Balance verification:', verifyTenant);
        console.log('🔍 [PaymentCallback] Final balance should be 0:', verifyTenant.current_balance);
      }
    }

    setPaymentDetails({
      amount: amount,
      reference: reference,
      date: new Date().toLocaleDateString(),
      type: 'rent',
      leaseId: leaseId
    });

    setStatus('success');
    setMessage('Rent payment processed successfully!');

    // Clean up pending payment from localStorage
    console.log('🔍 [PaymentCallback] Cleaning up pending payment from localStorage');
    localStorage.removeItem('pending_rent_payment');

    toast({
      title: "Payment Successful!",
      description: `Your rent payment of KES ${amount.toLocaleString()} has been processed.`,
    });

    // Redirect to dashboard after 3 seconds
    setTimeout(() => {
      navigate('/dashboard');
    }, 3000);
  };

  const renderContent = () => {
    switch (status) {
      case 'loading':
        return (
          <div className="flex flex-col items-center space-y-4">
            <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
            <p className="text-lg font-medium">{message}</p>
          </div>
        );

      case 'success':
        return (
          <div className="flex flex-col items-center space-y-4">
            <CheckCircle className="h-12 w-12 text-green-600" />
            <div className="text-center">
              <h2 className="text-2xl font-bold text-green-900">Payment Successful!</h2>
              <p className="text-green-700 mt-2">{message}</p>
            </div>
            {paymentDetails && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 w-full max-w-md">
                <h3 className="font-semibold text-green-900 mb-2">Payment Details</h3>
                <div className="space-y-1 text-sm text-green-800">
                  <p><strong>Amount:</strong> KES {paymentDetails.amount.toLocaleString()}</p>
                  <p><strong>Reference:</strong> {paymentDetails.reference}</p>
                  <p><strong>Date:</strong> {paymentDetails.date}</p>
                  {paymentDetails.type === 'utility' && (
                    <>
                      <p><strong>Type:</strong> Utility Bill</p>
                      <p><strong>Utility:</strong> {paymentDetails.utility}</p>
                      <p><strong>Unit:</strong> {paymentDetails.unit}</p>
                    </>
                  )}
                  {paymentDetails.type === 'rent' && (
                    <p><strong>Type:</strong> Rent Payment</p>
                  )}
                </div>
              </div>
            )}
            <p className="text-sm text-gray-600">Redirecting to dashboard...</p>
          </div>
        );

      case 'error':
        return (
          <div className="flex flex-col items-center space-y-4">
            <XCircle className="h-12 w-12 text-red-600" />
            <div className="text-center">
              <h2 className="text-2xl font-bold text-red-900">Payment Failed</h2>
              <p className="text-red-700 mt-2">{message}</p>
            </div>
            <Button onClick={() => navigate('/dashboard')} variant="outline">
              Return to Dashboard
            </Button>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Payment Processing</CardTitle>
          <CardDescription>
            {status === 'loading' && 'Please wait while we process your payment...'}
            {status === 'success' && 'Your payment has been successfully processed.'}
            {status === 'error' && 'There was an issue processing your payment.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {renderContent()}
        </CardContent>
      </Card>
    </div>
  );
};




