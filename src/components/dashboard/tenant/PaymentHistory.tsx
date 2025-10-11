import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Receipt, Download, RefreshCw, CreditCard, Calendar, DollarSign, TrendingUp, AlertCircle, Clock } from 'lucide-react';
import { useTenantPayments } from '@/hooks/useTenantPayments';
import { fetchTenantPaymentHistory, getTenantPaymentStats, PaymentRecord } from '@/utils/paymentUtils';
import { useAuth } from '@/hooks/useAuth';

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
  
  // Debug logging
  console.log('🔍 [PaymentHistory] Component render:', {
    profileId: profile?.id,
    recentPaymentsCount: recentPayments?.length || 0,
    loading,
    recentPayments: recentPayments?.slice(0, 3) // Show first 3 payments
  });
  
  // Monitor recentPayments changes
  useEffect(() => {
    console.log('🔄 [PaymentHistory] recentPayments changed:', {
      count: recentPayments?.length || 0,
      hasPaidPayments: recentPayments?.some(p => p.status === 'paid'),
      firstPayment: recentPayments?.[0]
    });
  }, [recentPayments]);
  
  const [paymentStats, setPaymentStats] = useState({
    totalPaid: 0,
    totalPending: 0,
    totalOverdue: 0,
    totalAmount: 0
  });
  const [statsLoading, setStatsLoading] = useState(false);

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
      return new Date(dateString).toLocaleDateString('en-KE', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateString;
    }
  };

  const formatAmount = (amount: number) => {
    return `KES ${Math.abs(amount || 0).toLocaleString()}`;
  };

  const handleExport = () => {
    // TODO: Implement export functionality
    console.log('Exporting payment history...');
  };

  const handleDownloadReceipt = (payment: any) => {
    // TODO: Implement receipt download
    console.log('Downloading receipt for payment:', payment.id);
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
        {/* Debug section - remove in production */}
        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded text-xs">
          <strong>Debug Info:</strong> recentPayments.length = {recentPayments?.length || 0}, 
          loading = {loading ? 'true' : 'false'}, 
          profileId = {profile?.id || 'none'}
          {recentPayments && recentPayments.length > 0 && (
            <div className="mt-2">
              <strong>First payment:</strong> {JSON.stringify(recentPayments[0], null, 2)}
            </div>
          )}
        </div>
        
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
            {recentPayments.map((payment, index) => (
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
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatDate(payment.date)}
                      </div>
                      <div className="flex items-center gap-1">
                        <CreditCard className="h-3 w-3" />
                        {payment.method || 'N/A'}
                      </div>
                    </div>
                    {payment.reference && (
                      <p className="text-xs text-muted-foreground font-mono">
                        Ref: {payment.reference}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleDownloadReceipt(payment)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Download className="h-4 w-4 mr-1" />
                    Receipt
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
