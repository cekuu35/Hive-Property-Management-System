import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, CreditCard, Smartphone, Building2, Check, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';

interface TenantPaymentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rentAmount: number;
  dueDate: string;
  onPaymentSuccess: () => void;
}

type PaymentMethod = 'mpesa' | 'bank' | 'card' | 'paypal';

export const TenantPaymentModal = ({ open, onOpenChange, rentAmount, dueDate, onPaymentSuccess }: TenantPaymentModalProps) => {
  const [loading, setLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('mpesa');
  const [step, setStep] = useState<'method' | 'details' | 'processing' | 'success'>('method');
  const [formData, setFormData] = useState({
    amount: rentAmount.toString(),
    // M-Pesa fields
    phoneNumber: '',
    // Bank fields
    accountNumber: '',
    bankCode: '',
    // Card fields
    cardNumber: '',
    expiryDate: '',
    cvv: '',
    cardholderName: '',
    // PayPal fields
    paypalEmail: ''
  });

  useEffect(() => {
    if (open) {
      setStep('method');
      setFormData(prev => ({ ...prev, amount: rentAmount.toString() }));
    }
  }, [open, rentAmount]);

  const handlePaymentMethodSelect = (method: PaymentMethod) => {
    setPaymentMethod(method);
    setStep('details');
  };

  const simulatePayment = async () => {
    setStep('processing');
    setLoading(true);

    // Simulate payment processing
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Simulate success (90% success rate)
    const success = Math.random() > 0.1;
    
    if (success) {
      setStep('success');
      toast({
        title: "Payment Successful!",
        description: `Your rent payment of KES ${parseFloat(formData.amount).toLocaleString()} has been processed successfully.`,
      });
      
      // Simulate real-time balance update
      setTimeout(() => {
        onPaymentSuccess();
        onOpenChange(false);
        setStep('method');
      }, 2000);
    } else {
      toast({
        title: "Payment Failed",
        description: "There was an issue processing your payment. Please try again or contact support.",
        variant: "destructive",
      });
      setStep('details');
    }
    
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate required fields based on payment method
    let isValid = true;
    if (paymentMethod === 'mpesa' && !formData.phoneNumber) isValid = false;
    if (paymentMethod === 'bank' && (!formData.accountNumber || !formData.bankCode)) isValid = false;
    if (paymentMethod === 'card' && (!formData.cardNumber || !formData.expiryDate || !formData.cvv)) isValid = false;
    if (paymentMethod === 'paypal' && !formData.paypalEmail) isValid = false;

    if (!isValid) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    await simulatePayment();
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const renderPaymentMethodSelection = () => (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold mb-2">Choose Payment Method</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Amount due: KES {rentAmount.toLocaleString()} • Due: {dueDate}
        </p>
      </div>
      
      <div className="grid grid-cols-1 gap-3">
        <Card 
          className={cn("cursor-pointer transition-all hover:shadow-md", paymentMethod === 'mpesa' && "border-primary bg-primary/5")}
          onClick={() => handlePaymentMethodSelect('mpesa')}
        >
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center">
                <Smartphone className="h-5 w-5 text-white" />
              </div>
              <div className="flex-1">
                <h4 className="font-medium">M-Pesa</h4>
                <p className="text-sm text-muted-foreground">Pay with your mobile money</p>
              </div>
              <div className="text-sm font-medium text-green-600">Instant</div>
            </div>
          </CardContent>
        </Card>

        <Card 
          className={cn("cursor-pointer transition-all hover:shadow-md", paymentMethod === 'bank' && "border-primary bg-primary/5")}
          onClick={() => handlePaymentMethodSelect('bank')}
        >
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
                <Building2 className="h-5 w-5 text-white" />
              </div>
              <div className="flex-1">
                <h4 className="font-medium">Bank Transfer</h4>
                <p className="text-sm text-muted-foreground">Direct bank account transfer</p>
              </div>
              <div className="text-sm font-medium text-blue-600">1-2 days</div>
            </div>
          </CardContent>
        </Card>

        <Card 
          className={cn("cursor-pointer transition-all hover:shadow-md", paymentMethod === 'card' && "border-primary bg-primary/5")}
          onClick={() => handlePaymentMethodSelect('card')}
        >
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-500 rounded-lg flex items-center justify-center">
                <CreditCard className="h-5 w-5 text-white" />
              </div>
              <div className="flex-1">
                <h4 className="font-medium">Credit/Debit Card</h4>
                <p className="text-sm text-muted-foreground">Visa, Mastercard accepted</p>
              </div>
              <div className="text-sm font-medium text-purple-600">Instant</div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  const renderPaymentDetails = () => (
    <div className="space-y-4 max-h-[60vh] overflow-y-auto">
      <div className="flex items-center gap-2 mb-4">
        <Button variant="ghost" size="sm" onClick={() => setStep('method')}>
          ← Back
        </Button>
        <h3 className="text-lg font-semibold">Payment Details</h3>
      </div>

      <div className="bg-muted/50 p-3 rounded-lg">
        <div className="flex justify-between text-sm">
          <span>Amount:</span>
          <span className="font-semibold">KES {parseFloat(formData.amount).toLocaleString()}</span>
        </div>
        <div className="flex justify-between text-sm mt-1">
          <span>Due Date:</span>
          <span>{dueDate}</span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {paymentMethod === 'mpesa' && (
          <div className="space-y-2">
            <Label htmlFor="phoneNumber">M-Pesa Phone Number *</Label>
            <Input
              id="phoneNumber"
              type="tel"
              placeholder="254712345678"
              value={formData.phoneNumber}
              onChange={(e) => handleInputChange('phoneNumber', e.target.value)}
              required
            />
            <p className="text-xs text-muted-foreground">
              You will receive an M-Pesa prompt on this number
            </p>
          </div>
        )}

        {paymentMethod === 'bank' && (
          <>
            <div className="space-y-2">
              <Label htmlFor="bankCode">Bank *</Label>
              <Select onValueChange={(value) => handleInputChange('bankCode', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select your bank" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="kcb">KCB Bank</SelectItem>
                  <SelectItem value="equity">Equity Bank</SelectItem>
                  <SelectItem value="coop">Co-operative Bank</SelectItem>
                  <SelectItem value="absa">ABSA Bank</SelectItem>
                  <SelectItem value="standard">Standard Chartered</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="accountNumber">Account Number *</Label>
              <Input
                id="accountNumber"
                type="text"
                placeholder="Enter your account number"
                value={formData.accountNumber}
                onChange={(e) => handleInputChange('accountNumber', e.target.value)}
                required
              />
            </div>
          </>
        )}

        {paymentMethod === 'card' && (
          <>
            <div className="space-y-2">
              <Label htmlFor="cardholderName">Cardholder Name *</Label>
              <Input
                id="cardholderName"
                type="text"
                placeholder="John Doe"
                value={formData.cardholderName}
                onChange={(e) => handleInputChange('cardholderName', e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cardNumber">Card Number *</Label>
              <Input
                id="cardNumber"
                type="text"
                placeholder="1234 5678 9012 3456"
                value={formData.cardNumber}
                onChange={(e) => handleInputChange('cardNumber', e.target.value)}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="expiryDate">Expiry Date *</Label>
                <Input
                  id="expiryDate"
                  type="text"
                  placeholder="MM/YY"
                  value={formData.expiryDate}
                  onChange={(e) => handleInputChange('expiryDate', e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cvv">CVV *</Label>
                <Input
                  id="cvv"
                  type="text"
                  placeholder="123"
                  value={formData.cvv}
                  onChange={(e) => handleInputChange('cvv', e.target.value)}
                  required
                />
              </div>
            </div>
          </>
        )}

        <div className="flex gap-2 pt-4">
          <Button type="button" variant="outline" onClick={() => setStep('method')} className="flex-1">
            Back
          </Button>
          <Button type="submit" disabled={loading} className="flex-1">
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              `Pay KES ${parseFloat(formData.amount).toLocaleString()}`
            )}
          </Button>
        </div>
      </form>
    </div>
  );

  const renderProcessing = () => (
    <div className="flex flex-col items-center justify-center py-8 space-y-4">
      <Loader2 className="h-12 w-12 animate-spin text-primary" />
      <h3 className="text-lg font-semibold">Processing Payment...</h3>
      <p className="text-sm text-muted-foreground text-center">
        Please wait while we process your payment. This may take a few moments.
      </p>
      {paymentMethod === 'mpesa' && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-4">
          <p className="text-sm text-blue-800">
            📱 Check your phone for the M-Pesa payment prompt and enter your PIN to complete the transaction.
          </p>
        </div>
      )}
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
            <CreditCard className="h-5 w-5" />
            Pay Rent
          </DialogTitle>
          <DialogDescription>Complete your rent payment using your preferred method.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {step === 'method' && renderPaymentMethodSelection()}
          {step === 'details' && renderPaymentDetails()}
          {step === 'processing' && renderProcessing()}
          {step === 'success' && renderSuccess()}
        </div>
      </DialogContent>
    </Dialog>
  );
};