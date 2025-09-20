import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { CreditCard, Plus, Star, Trash2, Edit, Smartphone, Building2, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

const paymentMethodSchema = z.object({
  type: z.enum(['mpesa', 'bank', 'card']),
  name: z.string().min(1, 'Payment method name is required'),
  // M-PESA fields
  phone: z.string().optional(),
  // Bank fields
  accountName: z.string().optional(),
  accountNumber: z.string().optional(),
  bankName: z.string().optional(),
  // Card fields
  cardNumber: z.string().optional(),
  expiryDate: z.string().optional(),
  cvv: z.string().optional(),
});

type PaymentMethodFormData = z.infer<typeof paymentMethodSchema>;

interface PaymentMethod {
  id: string;
  type: 'mpesa' | 'bank' | 'card';
  name: string;
  isDefault: boolean;
  details: {
    phone?: string;
    accountName?: string;
    accountNumber?: string;
    bankName?: string;
    cardLast4?: string;
    cardType?: string;
    expiryDate?: string;
  };
  addedAt: string;
}

export const PaymentMethodsManagement = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [editingMethod, setEditingMethod] = useState<PaymentMethod | null>(null);
  
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([
    {
      id: '1',
      type: 'mpesa',
      name: 'Primary M-PESA',
      isDefault: true,
      details: {
        phone: '+254 712 345 678'
      },
      addedAt: '2024-01-01',
    },
    {
      id: '2',
      type: 'bank',
      name: 'KCB Savings Account',
      isDefault: false,
      details: {
        accountName: 'John Doe',
        accountNumber: '1234567890',
        bankName: 'Kenya Commercial Bank'
      },
      addedAt: '2024-01-15',
    },
    {
      id: '3',
      type: 'card',
      name: 'Visa Card',
      isDefault: false,
      details: {
        cardLast4: '4532',
        cardType: 'Visa',
        expiryDate: '12/26'
      },
      addedAt: '2024-01-10',
    },
  ]);

  const form = useForm<PaymentMethodFormData>({
    resolver: zodResolver(paymentMethodSchema),
    defaultValues: {
      type: 'mpesa',
      name: '',
      phone: '',
      accountName: '',
      accountNumber: '',
      bankName: '',
      cardNumber: '',
      expiryDate: '',
      cvv: '',
    }
  });

  const watchedType = form.watch('type');

  const onSubmit = async (data: PaymentMethodFormData) => {
    setIsLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const newMethod: PaymentMethod = {
        id: Math.random().toString(),
        type: data.type,
        name: data.name,
        isDefault: paymentMethods.length === 0,
        details: getDetailsFromFormData(data),
        addedAt: new Date().toISOString().split('T')[0],
      };

      if (editingMethod) {
        setPaymentMethods(prev => 
          prev.map(method => 
            method.id === editingMethod.id ? { ...method, ...newMethod, id: editingMethod.id } : method
          )
        );
        toast.success('Payment method updated successfully');
      } else {
        setPaymentMethods(prev => [...prev, newMethod]);
        toast.success('Payment method added successfully');
      }
      
      form.reset();
      setIsOpen(false);
      setEditingMethod(null);
    } catch (error: any) {
      toast.error('Failed to save payment method');
    } finally {
      setIsLoading(false);
    }
  };

  const getDetailsFromFormData = (data: PaymentMethodFormData) => {
    switch (data.type) {
      case 'mpesa':
        return { phone: data.phone };
      case 'bank':
        return {
          accountName: data.accountName,
          accountNumber: data.accountNumber,
          bankName: data.bankName,
        };
      case 'card':
        return {
          cardLast4: data.cardNumber?.slice(-4),
          cardType: 'Visa', // Would determine from card number
          expiryDate: data.expiryDate,
        };
      default:
        return {};
    }
  };

  const handleEdit = (method: PaymentMethod) => {
    setEditingMethod(method);
    form.reset({
      type: method.type,
      name: method.name,
      phone: method.details.phone || '',
      accountName: method.details.accountName || '',
      accountNumber: method.details.accountNumber || '',
      bankName: method.details.bankName || '',
    });
    setIsOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      setPaymentMethods(prev => prev.filter(method => method.id !== id));
      toast.success('Payment method deleted successfully');
    } catch (error: any) {
      toast.error('Failed to delete payment method');
    }
  };

  const handleSetDefault = async (id: string) => {
    try {
      setPaymentMethods(prev =>
        prev.map(method => ({
          ...method,
          isDefault: method.id === id
        }))
      );
      toast.success('Default payment method updated');
    } catch (error: any) {
      toast.error('Failed to update default payment method');
    }
  };

  const getMethodIcon = (type: string) => {
    switch (type) {
      case 'mpesa': return <Smartphone className="h-5 w-5 text-green-600" />;
      case 'bank': return <Building2 className="h-5 w-5 text-blue-600" />;
      case 'card': return <CreditCard className="h-5 w-5 text-purple-600" />;
      default: return <CreditCard className="h-5 w-5" />;
    }
  };

  const formatMethodDetails = (method: PaymentMethod) => {
    switch (method.type) {
      case 'mpesa':
        return method.details.phone;
      case 'bank':
        return `${method.details.bankName} - ***${method.details.accountNumber?.slice(-4)}`;
      case 'card':
        return `${method.details.cardType} ending in ${method.details.cardLast4}`;
      default:
        return '';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Payment Methods
          </span>
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button size="sm" onClick={() => {
                setEditingMethod(null);
                form.reset();
              }}>
                <Plus className="h-4 w-4 mr-2" />
                Add Payment Method
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>
                  {editingMethod ? 'Edit Payment Method' : 'Add Payment Method'}
                </DialogTitle>
                <DialogDescription>
                  {editingMethod ? 'Update your payment method details.' : 'Add a new payment method for rent payments.'}
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Payment Type</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select payment type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="mpesa">M-PESA</SelectItem>
                            <SelectItem value="bank">Bank Account</SelectItem>
                            <SelectItem value="card">Credit/Debit Card</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Display Name</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="e.g., Primary M-PESA" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {watchedType === 'mpesa' && (
                    <FormField
                      control={form.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>M-PESA Number</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="+254 712 345 678" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  {watchedType === 'bank' && (
                    <>
                      <FormField
                        control={form.control}
                        name="bankName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Bank Name</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="Kenya Commercial Bank" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="accountName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Account Name</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="John Doe" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="accountNumber"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Account Number</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="1234567890" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </>
                  )}

                  {watchedType === 'card' && (
                    <>
                      <FormField
                        control={form.control}
                        name="cardNumber"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Card Number</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="1234 5678 9012 3456" maxLength={19} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="expiryDate"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Expiry Date</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="MM/YY" maxLength={5} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="cvv"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>CVV</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="123" maxLength={4} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </>
                  )}

                  <div className="flex gap-2">
                    <Button type="submit" disabled={isLoading} className="flex-1">
                      {isLoading ? 'Saving...' : editingMethod ? 'Update' : 'Add Payment Method'}
                    </Button>
                    <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
                      Cancel
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </CardTitle>
        <CardDescription>
          Manage your preferred payment methods for rent payments
        </CardDescription>
      </CardHeader>
      <CardContent>
        {paymentMethods.length === 0 ? (
          <div className="text-center py-8">
            <CreditCard className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No Payment Methods</h3>
            <p className="text-muted-foreground mb-4">
              Add a payment method to make rent payments easier.
            </p>
            <Button onClick={() => setIsOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Payment Method
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {paymentMethods.map((method) => (
              <div key={method.id} className={`p-4 border rounded-lg ${method.isDefault ? 'border-primary bg-primary/5' : ''}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {getMethodIcon(method.type)}
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium">{method.name}</h4>
                        {method.isDefault && (
                          <Badge variant="secondary" className="text-xs">
                            <Star className="h-3 w-3 mr-1 fill-current" />
                            Default
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {formatMethodDetails(method)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Added: {method.addedAt}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {!method.isDefault && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleSetDefault(method.id)}
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Set Default
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(method)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(method.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
            
            <div className="pt-4 border-t">
              <p className="text-sm text-muted-foreground">
                <strong>Security:</strong> All payment information is encrypted and stored securely. 
                We use industry-standard security measures to protect your data.
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};