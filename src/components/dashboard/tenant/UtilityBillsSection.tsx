import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Receipt, 
  CreditCard, 
  CheckCircle, 
  Clock, 
  AlertTriangle,
  DollarSign,
  Calendar,
  Zap,
  Wifi,
  Droplets,
  RefreshCw
} from 'lucide-react';
import { useUtilityBills } from '@/hooks/useUtilityBills';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { UtilityBillPaymentModal } from './UtilityBillPaymentModal';

const getUtilityIcon = (utilityName: string) => {
  switch (utilityName.toLowerCase()) {
    case 'water':
      return <Droplets className="h-4 w-4" />;
    case 'electricity':
      return <Zap className="h-4 w-4" />;
    case 'internet':
      return <Wifi className="h-4 w-4" />;
    default:
      return <Receipt className="h-4 w-4" />;
  }
};

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'paid':
      return <Badge className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" />Paid</Badge>;
    case 'overdue':
      return <Badge className="bg-red-100 text-red-800"><AlertTriangle className="w-3 h-3 mr-1" />Overdue</Badge>;
    case 'unpaid':
    default:
      return <Badge className="bg-yellow-100 text-yellow-800"><Clock className="w-3 h-3 mr-1" />Unpaid</Badge>;
  }
};

export const UtilityBillsSection = () => {
  const { bills, loading, error, prepareBillPayment, handleBillPaymentSuccess, getTotals, fetchTenantBills } = useUtilityBills();
  const [payingBillId, setPayingBillId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [previousTotals, setPreviousTotals] = useState<any>(null);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [paymentData, setPaymentData] = useState<any>(null);
  const { toast } = useToast();

  const totals = getTotals();

  // Detect balance changes and show toast
  useEffect(() => {
    if (previousTotals && !loading) {
      const unpaidDifference = previousTotals.totalUnpaid - totals.totalUnpaid;
      const paidDifference = totals.totalPaid - previousTotals.totalPaid;
      
      if (unpaidDifference > 0 || paidDifference > 0) {
        toast({
          title: "Balance Updated!",
          description: `Your utility balance has been updated. ${unpaidDifference > 0 ? `KES ${unpaidDifference.toLocaleString()} paid.` : ''}`,
        });
      }
    }
    setPreviousTotals(totals);
  }, [totals, previousTotals, loading, toast]);

  // Auto-refresh bills every 30 seconds to catch webhook updates
  useEffect(() => {
    const interval = setInterval(() => {
      if (!loading && !refreshing) {
        fetchTenantBills();
      }
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [loading, refreshing, fetchTenantBills]);

  // Refresh when component becomes visible (user returns from payment)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && !loading && !refreshing) {
        fetchTenantBills();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleVisibilityChange);
    };
  }, [loading, refreshing, fetchTenantBills]);

  // Check for payment completion flag and refresh
  useEffect(() => {
    const checkPaymentFlag = () => {
      const paymentProcessed = localStorage.getItem('utility_payment_processed');
      const paymentTimestamp = localStorage.getItem('utility_payment_timestamp');
      
      if (paymentProcessed === 'true' && paymentTimestamp) {
        const timeSincePayment = Date.now() - parseInt(paymentTimestamp);
        // If payment was processed within the last 5 minutes, refresh
        if (timeSincePayment < 300000) { // 5 minutes
          fetchTenantBills();
          // Clear the flag
          localStorage.removeItem('utility_payment_processed');
          localStorage.removeItem('utility_payment_timestamp');
        }
      }
    };

    // Check immediately when component mounts
    checkPaymentFlag();

    // Also check periodically
    const interval = setInterval(checkPaymentFlag, 10000); // Every 10 seconds

    return () => clearInterval(interval);
  }, [fetchTenantBills]);

  const handlePayBill = async (billId: string) => {
    try {
      setPayingBillId(billId);
      const paymentInfo = await prepareBillPayment(billId);
      setPaymentData(paymentInfo);
      setPaymentModalOpen(true);
    } catch (error) {
      console.error('Payment preparation error:', error);
      toast({
        title: "Error",
        description: "Failed to prepare payment. Please try again.",
        variant: "destructive"
      });
    } finally {
      setPayingBillId(null);
    }
  };

  const handlePaymentSuccess = async (reference: string, billId: string) => {
    const success = await handleBillPaymentSuccess(reference, billId);
    if (success) {
      setPaymentModalOpen(false);
      setPaymentData(null);
    }
    return success;
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await fetchTenantBills();
    } catch (error) {
      console.error('Refresh error:', error);
    } finally {
      setRefreshing(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Utility Bills
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading utility bills...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Utility Bills
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  const unpaidBills = bills.filter(bill => bill.status === 'unpaid');
  const paidBills = bills.filter(bill => bill.status === 'paid');
  const overdueBills = bills.filter(bill => bill.status === 'overdue');

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Due</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              KES {totals.totalUnpaid.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              {totals.unpaidCount} unpaid bills
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Paid</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              KES {totals.totalPaid.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              {totals.paidCount} paid bills
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overdue</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              KES {totals.totalOverdue.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              {totals.overdueCount} overdue bills
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Bills Tabs */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Receipt className="h-5 w-5" />
                Utility Bills
              </CardTitle>
              <CardDescription>
                View and pay your utility bills
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={refreshing || loading}
              className="flex items-center gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="unpaid" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="unpaid">
                Unpaid ({unpaidBills.length})
              </TabsTrigger>
              <TabsTrigger value="paid">
                Paid ({paidBills.length})
              </TabsTrigger>
              <TabsTrigger value="overdue">
                Overdue ({overdueBills.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="unpaid" className="space-y-4">
              {unpaidBills.length === 0 ? (
                <div className="text-center py-8">
                  <Receipt className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium">No unpaid bills</h3>
                  <p className="text-muted-foreground">You're all caught up!</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {unpaidBills.map((bill) => (
                    <Card key={bill.id} className="border-l-4 border-l-yellow-500">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            {getUtilityIcon(bill.utilities?.name || 'Unknown Utility')}
                            <div>
                              <h4 className="font-medium">{bill.utilities?.name || 'Unknown Utility'}</h4>
                              <p className="text-sm text-muted-foreground">{bill.month}</p>
                              <p className="text-sm text-muted-foreground">
                                Due: {format(new Date(bill.due_date), 'MMM dd, yyyy')}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <p className="text-lg font-semibold">
                                KES {bill.amount.toLocaleString()}
                              </p>
                              {getStatusBadge(bill.status)}
                            </div>
                            <Button
                              onClick={() => handlePayBill(bill.id)}
                              disabled={payingBillId === bill.id}
                              size="sm"
                            >
                              {payingBillId === bill.id ? (
                                <>
                                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                  Processing...
                                </>
                              ) : (
                                <>
                                  <CreditCard className="h-4 w-4 mr-2" />
                                  Pay Now
                                </>
                              )}
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="paid" className="space-y-4">
              {paidBills.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium">No paid bills</h3>
                  <p className="text-muted-foreground">Your payment history will appear here</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {paidBills.map((bill) => (
                    <Card key={bill.id} className="border-l-4 border-l-green-500">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            {getUtilityIcon(bill.utilities?.name || 'Unknown Utility')}
                            <div>
                              <h4 className="font-medium">{bill.utilities?.name || 'Unknown Utility'}</h4>
                              <p className="text-sm text-muted-foreground">{bill.month}</p>
                              <p className="text-sm text-muted-foreground">
                                Paid: {format(new Date(bill.created_at), 'MMM dd, yyyy')}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <p className="text-lg font-semibold text-green-600">
                                KES {bill.amount.toLocaleString()}
                              </p>
                              {getStatusBadge(bill.status)}
                              {bill.paystack_reference && (
                                <p className="text-xs text-muted-foreground">
                                  Ref: {bill.paystack_reference}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="overdue" className="space-y-4">
              {overdueBills.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium">No overdue bills</h3>
                  <p className="text-muted-foreground">Great job staying on top of your payments!</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {overdueBills.map((bill) => (
                    <Card key={bill.id} className="border-l-4 border-l-red-500">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            {getUtilityIcon(bill.utilities?.name || 'Unknown Utility')}
                            <div>
                              <h4 className="font-medium">{bill.utilities?.name || 'Unknown Utility'}</h4>
                              <p className="text-sm text-muted-foreground">{bill.month}</p>
                              <p className="text-sm text-red-600">
                                Overdue since: {format(new Date(bill.due_date), 'MMM dd, yyyy')}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <p className="text-lg font-semibold text-red-600">
                                KES {bill.amount.toLocaleString()}
                              </p>
                              {getStatusBadge(bill.status)}
                            </div>
                            <Button
                              onClick={() => handlePayBill(bill.id)}
                              disabled={payingBillId === bill.id}
                              size="sm"
                              variant="destructive"
                            >
                              {payingBillId === bill.id ? (
                                <>
                                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                  Processing...
                                </>
                              ) : (
                                <>
                                  <CreditCard className="h-4 w-4 mr-2" />
                                  Pay Now
                                </>
                              )}
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Payment Modal */}
      <UtilityBillPaymentModal
        isOpen={paymentModalOpen}
        onClose={() => {
          setPaymentModalOpen(false);
          setPaymentData(null);
        }}
        paymentData={paymentData}
        onSuccess={handlePaymentSuccess}
      />
    </div>
  );
};




