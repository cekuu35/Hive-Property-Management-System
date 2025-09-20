import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CheckCircle, AlertCircle, Mail } from 'lucide-react';
import { usePaymentReceipts } from '@/hooks/usePaymentReceipts';

interface PaymentStatusModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  payment: {
    id: string;
    tenant: string;
    unit: string;
    amount: number;
    status: string;
    date: string;
  } | null;
  onUpdateStatus: (status: 'paid' | 'overdue' | 'pending', paymentMethod?: string) => void;
}

export const PaymentStatusModal = ({ 
  open, 
  onOpenChange, 
  payment, 
  onUpdateStatus 
}: PaymentStatusModalProps) => {
  const [paymentMethod, setPaymentMethod] = useState('');
  const [tenantEmail, setTenantEmail] = useState('');
  const { generateReceipt, emailReceipt } = usePaymentReceipts();

  if (!payment) return null;

  const handleUpdateStatus = (status: 'paid' | 'overdue' | 'pending') => {
    onUpdateStatus(status, paymentMethod);
    
    // If payment is marked as paid, generate receipt
    if (status === 'paid') {
      generateReceipt({
        paymentId: payment.id,
        tenant: payment.tenant,
        unit: payment.unit,
        amount: payment.amount,
        date: payment.date,
        paymentMethod
      });
    }
  };

  const handleEmailReceipt = () => {
    if (!tenantEmail) return;
    
    emailReceipt({
      paymentId: payment.id,
      tenant: payment.tenant,
      unit: payment.unit,
      amount: payment.amount,
      date: payment.date,
      paymentMethod
    }, tenantEmail);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Update Payment Status</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <p className="text-sm text-muted-foreground mb-2">
              Payment for {payment.tenant} - Unit {payment.unit}
            </p>
            <p className="font-semibold">KES {payment.amount.toLocaleString()}</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="payment-method">Payment Method</Label>
            <Select value={paymentMethod} onValueChange={setPaymentMethod}>
              <SelectTrigger>
                <SelectValue placeholder="Select payment method" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">Cash</SelectItem>
                <SelectItem value="bank-transfer">Bank Transfer</SelectItem>
                <SelectItem value="mobile-money">Mobile Money</SelectItem>
                <SelectItem value="check">Check</SelectItem>
                <SelectItem value="card">Card Payment</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="tenant-email">Tenant Email (for receipt)</Label>
            <Input
              id="tenant-email"
              type="email"
              placeholder="tenant@example.com"
              value={tenantEmail}
              onChange={(e) => setTenantEmail(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex gap-2">
              <Button
                onClick={() => handleUpdateStatus('paid')}
                variant={payment.status === 'paid' ? 'default' : 'outline'}
                className="flex-1 gap-2"
              >
                <CheckCircle className="h-4 w-4" />
                Mark Paid
              </Button>
              <Button
                onClick={() => handleUpdateStatus('overdue')}
                variant={payment.status === 'overdue' ? 'default' : 'outline'}
                className="flex-1 gap-2"
              >
                <AlertCircle className="h-4 w-4" />
                Mark Overdue
              </Button>
            </div>
            
            {tenantEmail && (
              <Button
                onClick={handleEmailReceipt}
                variant="outline"
                className="gap-2"
              >
                <Mail className="h-4 w-4" />
                Email Receipt
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};