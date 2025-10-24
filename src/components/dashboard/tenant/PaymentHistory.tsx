import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Receipt, Download, RefreshCw, CreditCard, Calendar, DollarSign, TrendingUp, AlertCircle, Clock, Filter } from 'lucide-react';
import { useTenantPayments } from '@/hooks/useTenantPayments';
import { fetchTenantPaymentHistory, getTenantPaymentStats, PaymentRecord } from '@/utils/paymentUtils';
import { useAuth } from '@/hooks/useAuth';
import { generatePaymentReceipt } from '@/utils/receiptGenerator';

interface PaymentHistoryProps {
  onMakePayment?: () => void;
}

export const PaymentHistory = ({ onMakePayment }: PaymentHistoryProps) => {
  const { profile } = useAuth();
  const { 
    recentPayments, 
    loading, 
    refetch 
  } = useTenantPayments();
  
  const [paymentStats, setPaymentStats] = useState({
    totalPaid: 0,
    totalPending: 0,
    totalOverdue: 0,
    totalAmount: 0
  });
  const [statsLoading, setStatsLoading] = useState(false);
  const [filterStatus, setFilterStatus] = useState<'all' | 'paid' | 'pending' | 'overdue'>('all');

  // Load payment statistics
  useEffect(() => {
    const loadStats = async () => {
      if (!profile?.id) return;
      
      setStatsLoading(true);
      try {
        const stats = await getTenantPaymentStats(profile.id);
        setPaymentStats(stats);
      } catch (error) {
        console.error('Error loading payment stats:', error);
      } finally {
        setStatsLoading(false);
      }
    };

    loadStats();
  }, [profile?.id, recentPayments]);

  const handleRefresh = async () => {
    try {
      await refetch();
      if (profile?.id) {
        const stats = await getTenantPaymentStats(profile.id);
        setPaymentStats(stats);
      }
    } catch (error) {
      console.error('Error refreshing payments:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'paid': return 'bg-green-500';
      case 'pending': return 'bg-yellow-500';
      case 'overdue': return 'bg-red-500';
      case 'in_progress': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  const formatDateTime = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return {
        date: date.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        }),
        time: date.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit'
        })
      };
    } catch {
      return { date: dateString, time: '' };
    }
  };

  const formatAmount = (amount: number) => {
    return `KES ${Math.abs(amount || 0).toLocaleString()}`;
  };

  const handleExport = () => {
    // Create CSV export
    const csvContent = [
      ['Date', 'Amount', 'Status', 'Method', 'Reference', 'Late Fee'],
      ...recentPayments.map(p => [
        formatDate(p.date),
        p.amount,
        p.status,
        p.method || 'N/A',
        p.reference || 'N/A',
        p.late_fee || 0
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `payment-history-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleDownloadReceipt = (payment: any) => {
    generatePaymentReceipt({
      payment,
      tenant: {
        name: profile?.full_name || 'Tenant',
        email: profile?.email || '',
        phone: profile?.phone || ''
      }
    });
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Payment History
          </CardTitle>
          <CardDescription>Loading your payment records...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            <span>Payment History</span>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleRefresh}
              disabled={loading || statsLoading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${(loading || statsLoading) ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleExport}
              disabled={recentPayments.length === 0}
            >
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </CardTitle>
        <CardDescription>
          Your rent payment records • {recentPayments.length} payment{recentPayments.length !== 1 ? 's' : ''} found
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Payment Statistics */}
        {!statsLoading && recentPayments.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 p-4 bg-muted/50 rounded-lg">
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-green-600 mb-1">
                <TrendingUp className="h-4 w-4" />
                <span className="text-sm font-medium">Paid</span>
              </div>
              <div className="text-lg font-semibold">KES {paymentStats.totalPaid.toLocaleString()}</div>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-yellow-600 mb-1">
                <Clock className="h-4 w-4" />
                <span className="text-sm font-medium">Pending</span>
              </div>
              <div className="text-lg font-semibold">KES {paymentStats.totalPending.toLocaleString()}</div>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-red-600 mb-1">
                <AlertCircle className="h-4 w-4" />
                <span className="text-sm font-medium">Overdue</span>
              </div>
              <div className="text-lg font-semibold">KES {paymentStats.totalOverdue.toLocaleString()}</div>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-blue-600 mb-1">
                <DollarSign className="h-4 w-4" />
                <span className="text-sm font-medium">Total</span>
              </div>
              <div className="text-lg font-semibold">KES {paymentStats.totalAmount.toLocaleString()}</div>
            </div>
          </div>
        )}
        {/* Filter Tabs */}
        {recentPayments.length > 0 && (
          <div className="mb-4">
            <Tabs value={filterStatus} onValueChange={(v) => setFilterStatus(v as any)}>
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="all">
                  All ({recentPayments.length})
                </TabsTrigger>
                <TabsTrigger value="paid">
                  Paid ({recentPayments.filter(p => p.status === 'paid').length})
                </TabsTrigger>
                <TabsTrigger value="pending">
                  Pending ({recentPayments.filter(p => p.status === 'pending').length})
                </TabsTrigger>
                <TabsTrigger value="overdue">
                  Overdue ({recentPayments.filter(p => p.status === 'overdue').length})
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        )}
        
        {recentPayments.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
              <Receipt className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No Payment History</h3>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              You haven't made any rent payments yet. Your payment history will appear here once you make your first payment.
            </p>
            {onMakePayment && (
              <Button onClick={onMakePayment} size="lg">
                <CreditCard className="h-4 w-4 mr-2" />
                Make Your First Payment
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {recentPayments
              .filter(p => filterStatus === 'all' || p.status === filterStatus)
              .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
              .map((payment, index) => (
              <div 
                key={payment.id || index} 
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors group"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                    <Receipt className="h-6 w-6 text-primary" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-lg">{formatAmount(payment.amount)}</p>
                      <Badge 
                        className={`${getStatusColor(payment.status)} text-white text-xs`}
                        variant="secondary"
                      >
                        {payment.status?.charAt(0).toUpperCase() + payment.status?.slice(1)}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1 min-w-[140px]">
                        <Calendar className="h-3 w-3 flex-shrink-0" />
                        <span className="font-mono tabular-nums">{formatDate(payment.date)}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <CreditCard className="h-3 w-3 flex-shrink-0" />
                        <span>{payment.method || 'Pending'}</span>
                      </div>
                    </div>
                    {payment.late_fee && payment.late_fee > 0 && (
                      <div className="flex items-center gap-1 text-xs text-red-600 font-medium">
                        <AlertCircle className="h-3 w-3" />
                        Late fee: KES {payment.late_fee.toLocaleString()}
                      </div>
                    )}
                    {payment.reference && (
                      <p className="text-xs text-muted-foreground font-mono">
                        Ref: {payment.reference}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {payment.status === 'paid' && (
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleDownloadReceipt(payment)}
                    >
                      <Download className="h-4 w-4 mr-1" />
                      Receipt
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
