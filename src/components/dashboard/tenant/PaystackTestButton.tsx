import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TenantPaymentModal } from './TenantPaymentModal';
import { Zap, CheckCircle, AlertCircle } from 'lucide-react';

export const PaystackTestButton = () => {
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [testResult, setTestResult] = useState<string>('');

  const handleTestPayment = () => {
    setTestResult('🔄 Opening Paystack payment modal...');
    setShowPaymentModal(true);
  };

  const handlePaymentSuccess = () => {
    setTestResult('✅ Payment completed successfully!');
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="h-5 w-5" />
          Paystack Integration Test
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Test the Paystack payment integration with a small test amount.
        </p>
        
        <Button 
          onClick={handleTestPayment} 
          className="w-full"
        >
          Test Paystack Payment
        </Button>

        {testResult && (
          <div className={`p-3 rounded-lg text-sm ${
            testResult.includes('✅') 
              ? 'bg-green-50 text-green-800 border border-green-200' 
              : testResult.includes('❌')
              ? 'bg-red-50 text-red-800 border border-red-200'
              : 'bg-blue-50 text-blue-800 border border-blue-200'
          }`}>
            {testResult}
          </div>
        )}

        <div className="text-xs text-muted-foreground space-y-1">
          <p><strong>Requirements:</strong></p>
          <p>• VITE_PAYSTACK_PUBLIC_KEY must be set</p>
          <p>• VITE_PAYSTACK_SECRET_KEY must be set</p>
          <p>• User must have an email address</p>
        </div>

        <TenantPaymentModal
          open={showPaymentModal}
          onOpenChange={setShowPaymentModal}
          rentAmount={1000}
          dueDate={new Date().toISOString().split('T')[0]}
          onPaymentSuccess={handlePaymentSuccess}
        />
      </CardContent>
    </Card>
  );
};
