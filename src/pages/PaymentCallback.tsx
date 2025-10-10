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

    processPayment();
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
    // Find the tenant's lease
    let leaseId = null;
    let tenantInfoId = null;

    // Try to find lease by profile ID
    const { data: leaseByProfile } = await supabase
      .from('leases')
      .select('id, tenant_info_id, rent_amount')
      .eq('tenant_id', profile.id)
      .eq('status', 'active')
      .maybeSingle();

    if (leaseByProfile) {
      leaseId = leaseByProfile.id;
      tenantInfoId = leaseByProfile.tenant_info_id;
    } else {
      // Try to find via tenant_info
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
        }
      }
    }

    if (!leaseId || !tenantInfoId) {
      throw new Error('No active lease found for tenant');
    }

    // Get payment amount from URL params or use a default
    const amount = searchParams.get('amount') ? 
      parseFloat(searchParams.get('amount')!) : 
      (leaseByProfile?.rent_amount || 0);

    // Record the payment in rent_payments table
    const { data: paymentRecord, error: paymentError } = await supabase
      .from('rent_payments')
      .insert({
        lease_id: leaseId,
        amount: amount,
        due_date: new Date().toISOString().split('T')[0], // Current date as due date
        paid_date: new Date().toISOString(),
        status: 'paid',
        payment_method: 'paystack',
        transaction_reference: reference,
        notes: 'Payment processed via Paystack'
      })
      .select()
      .single();

    if (paymentError) {
      console.error('Error recording payment:', paymentError);
      throw new Error('Failed to record payment');
    }

    // Update tenant_info balance
    const { error: balanceError } = await supabase
      .from('tenant_info')
      .update({
        current_balance: 0, // Set balance to 0 after payment
        payment_status: 'paid'
      })
      .eq('id', tenantInfoId);

    if (balanceError) {
      console.error('Error updating balance:', balanceError);
      // Don't throw here, payment was recorded successfully
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




