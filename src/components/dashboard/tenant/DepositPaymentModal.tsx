import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CreditCard, Smartphone, Building2, Wallet, CheckCircle, Copy } from 'lucide-react';
import { toast } from 'sonner';

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
  const [paymentMethod, setPaymentMethod] = useState('mpesa');
  const [paymentReference, setPaymentReference] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [cvv, setCvv] = useState('');
  const [bankCode, setBankCode] = useState('');

  // Get the correct deposit amount from the unit (fallback to unit rent if missing)
  const depositAmount = (application?.units?.deposit_amount ?? application?.deposit_amount ?? application?.units?.rent_amount ?? 0);

  const handlePayment = async () => {
    // Validate based on payment method
    let isValid = false;
    let reference = '';

    switch (paymentMethod) {
      case 'mpesa':
        if (!phoneNumber.trim()) {
          toast.error('Please enter your M-Pesa phone number');
          return;
        }
        reference = `MPESA-${phoneNumber}-${Date.now()}`;
        isValid = true;
        break;
      case 'bank':
        if (!accountNumber.trim() || !bankCode.trim()) {
          toast.error('Please fill in all bank details');
          return;
        }
        reference = `BANK-${bankCode}-${accountNumber}-${Date.now()}`;
        isValid = true;
        break;
      case 'card':
        if (!cardNumber.trim() || !expiryDate.trim() || !cvv.trim()) {
          toast.error('Please fill in all card details');
          return;
        }
        reference = `CARD-****${cardNumber.slice(-4)}-${Date.now()}`;
        isValid = true;
        break;
      default:
        if (!paymentReference.trim()) {
          toast.error('Please enter a payment reference');
          return;
        }
        reference = paymentReference;
        isValid = true;
    }

    if (!isValid) return;

    setIsProcessing(true);
    try {
      // Simulate processing time
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      await onPaymentComplete(application.id, reference);
      
      // Success message with payment method
      const methodName = paymentMethod === 'mpesa' ? 'M-Pesa' : 
                        paymentMethod === 'bank' ? 'Bank Transfer' :
                        paymentMethod === 'card' ? 'Card Payment' : 'Manual Payment';
      
      toast.success(`Payment successful via ${methodName}!`, {
        description: `Reference: ${reference}`
      });
      
      onClose();
      
      // Reset form
      setPaymentReference('');
      setPhoneNumber('');
      setAccountNumber('');
      setCardNumber('');
      setExpiryDate('');
      setCvv('');
      setBankCode('');
    } catch (error) {
      console.error('Payment failed:', error);
      toast.error('Payment failed. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Pay Security Deposit
          </DialogTitle>
          <DialogDescription>Securely pay your refundable security deposit.</DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
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

          {/* Payment Methods */}
          <Card>
            <CardHeader>
              <CardTitle>Choose Payment Method</CardTitle>
              <CardDescription>Select your preferred payment method</CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs value={paymentMethod} onValueChange={setPaymentMethod} className="w-full">
                <TabsList className="grid w-full grid-cols-4 bg-muted p-1 h-auto">
                  <TabsTrigger 
                    value="mpesa" 
                    className="flex items-center gap-2 data-[state=active]:bg-success data-[state=active]:text-success-foreground font-medium py-3"
                  >
                    <Smartphone className="h-4 w-4" />
                    M-Pesa
                  </TabsTrigger>
                  <TabsTrigger 
                    value="bank" 
                    className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-medium py-3"
                  >
                    <Building2 className="h-4 w-4" />
                    Bank
                  </TabsTrigger>
                  <TabsTrigger 
                    value="card" 
                    className="flex items-center gap-2 data-[state=active]:bg-accent data-[state=active]:text-accent-foreground font-medium py-3"
                  >
                    <CreditCard className="h-4 w-4" />
                    Card
                  </TabsTrigger>
                  <TabsTrigger 
                    value="other" 
                    className="flex items-center gap-2 data-[state=active]:bg-secondary data-[state=active]:text-secondary-foreground font-medium py-3"
                  >
                    <Wallet className="h-4 w-4" />
                    Other
                  </TabsTrigger>
                </TabsList>

                {/* M-Pesa Payment */}
                <TabsContent value="mpesa" className="space-y-4 mt-6">
                  <div className="bg-success/10 border border-success/30 rounded-lg p-6 shadow-sm">
                    <div className="flex items-center gap-2 text-success mb-4">
                      <Smartphone className="h-5 w-5" />
                      <span className="font-semibold text-lg">M-Pesa Payment</span>
                    </div>
                    <div className="space-y-3">
                      <div>
                        <Label htmlFor="phone">Your M-Pesa Phone Number</Label>
                        <Input
                          id="phone"
                          value={phoneNumber}
                          onChange={(e) => setPhoneNumber(e.target.value)}
                          placeholder="e.g., 0712345678"
                          className="mt-1"
                        />
                      </div>
                      <div className="bg-card/50 rounded-md p-4 border border-border/50">
                        <p className="text-sm font-semibold mb-3 text-foreground">Payment Instructions:</p>
                        <ol className="text-sm space-y-2 text-muted-foreground">
                          <li>1. Go to M-Pesa menu</li>
                          <li>2. Select "Lipa na M-Pesa"</li>
                          <li>3. Select "Buy Goods and Services"</li>
                          <li>4. Enter Till Number: <span className="font-mono font-bold">247247</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-auto p-1 ml-1"
                              onClick={() => copyToClipboard('247247')}
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                          </li>
                          <li>5. Enter Amount: KES {depositAmount?.toLocaleString()}</li>
                          <li>6. Enter your PIN and confirm</li>
                        </ol>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                {/* Bank Transfer */}
                <TabsContent value="bank" className="space-y-4 mt-6">
                  <div className="bg-primary/10 border border-primary/30 rounded-lg p-6 shadow-sm">
                    <div className="flex items-center gap-2 text-primary mb-4">
                      <Building2 className="h-5 w-5" />
                      <span className="font-semibold text-lg">Bank Transfer</span>
                    </div>
                    <div className="space-y-3">
                      <div>
                        <Label htmlFor="bank">Select Bank</Label>
                        <Select value={bankCode} onValueChange={setBankCode}>
                          <SelectTrigger className="mt-1">
                            <SelectValue placeholder="Choose your bank" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="KCB">KCB Bank</SelectItem>
                            <SelectItem value="EQUITY">Equity Bank</SelectItem>
                            <SelectItem value="COOP">Co-operative Bank</SelectItem>
                            <SelectItem value="ABSA">Absa Bank</SelectItem>
                            <SelectItem value="STANBIC">Stanbic Bank</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="account">Account Number</Label>
                        <Input
                          id="account"
                          value={accountNumber}
                          onChange={(e) => setAccountNumber(e.target.value)}
                          placeholder="Enter your account number"
                          className="mt-1"
                        />
                      </div>
                      <div className="bg-card/50 rounded-md p-4 border border-border/50">
                        <p className="text-sm font-semibold mb-3 text-foreground">Company Bank Details:</p>
                        <div className="text-sm space-y-2">
                          <p>Account Name: <span className="font-semibold">Property Management Pro Ltd</span></p>
                          <p>Account Number: <span className="font-mono">1234567890</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-auto p-1 ml-1"
                              onClick={() => copyToClipboard('1234567890')}
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                          </p>
                          <p>Bank: <span className="font-semibold">KCB Bank</span></p>
                          <p>Branch: <span className="font-semibold">Westlands</span></p>
                          <p>Amount: <span className="font-semibold">KES {depositAmount?.toLocaleString()}</span></p>
                        </div>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                {/* Card Payment */}
                <TabsContent value="card" className="space-y-4 mt-6">
                  <div className="bg-accent/10 border border-accent/30 rounded-lg p-6 shadow-sm">
                    <div className="flex items-center gap-2 text-accent mb-4">
                      <CreditCard className="h-5 w-5" />
                      <span className="font-semibold text-lg">Card Payment</span>
                    </div>
                    <div className="space-y-3">
                      <div>
                        <Label htmlFor="card-number">Card Number</Label>
                        <Input
                          id="card-number"
                          value={cardNumber}
                          onChange={(e) => setCardNumber(e.target.value)}
                          placeholder="1234 5678 9012 3456"
                          maxLength={19}
                          className="mt-1"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label htmlFor="expiry">Expiry Date</Label>
                          <Input
                            id="expiry"
                            value={expiryDate}
                            onChange={(e) => setExpiryDate(e.target.value)}
                            placeholder="MM/YY"
                            maxLength={5}
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <Label htmlFor="cvv">CVV</Label>
                          <Input
                            id="cvv"
                            value={cvv}
                            onChange={(e) => setCvv(e.target.value)}
                            placeholder="123"
                            maxLength={3}
                            className="mt-1"
                          />
                        </div>
                      </div>
                      <div className="bg-card/50 rounded-md p-4 border border-border/50">
                        <div className="flex items-center gap-2 text-success">
                          <CheckCircle className="h-4 w-4" />
                          <span className="text-sm font-semibold">Secure Payment</span>
                        </div>
                        <p className="text-sm text-muted-foreground mt-2">
                          Your card details are encrypted and secure
                        </p>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                {/* Other Payment Methods */}
                <TabsContent value="other" className="space-y-4 mt-6">
                  <div className="bg-secondary/10 border border-secondary/30 rounded-lg p-6 shadow-sm">
                    <div className="flex items-center gap-2 text-secondary mb-4">
                      <Wallet className="h-5 w-5" />
                      <span className="font-semibold text-lg">Other Payment Methods</span>
                    </div>
                    <div className="space-y-3">
                      <div>
                        <Label htmlFor="payment-reference">Payment Reference/Transaction ID</Label>
                        <Input
                          id="payment-reference"
                          value={paymentReference}
                          onChange={(e) => setPaymentReference(e.target.value)}
                          placeholder="Enter transaction reference"
                          className="mt-1"
                        />
                      </div>
                      <div className="bg-card/50 rounded-md p-4 border border-border/50">
                        <p className="text-sm font-semibold mb-3 text-foreground">Alternative Options:</p>
                        <ul className="text-sm space-y-2 text-muted-foreground">
                          <li>• Cash deposit at any KCB branch</li>
                          <li>• Cheque payment</li>
                          <li>• Mobile money (Airtel Money, T-Kash)</li>
                          <li>• PayPal transfer</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1"
              disabled={isProcessing}
            >
              Cancel
            </Button>
            <Button
              onClick={handlePayment}
              className="flex-1"
              disabled={isProcessing}
            >
              {isProcessing ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Processing...
                </div>
              ) : (
                `Pay KES ${depositAmount?.toLocaleString()}`
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};