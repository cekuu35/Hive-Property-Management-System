import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  DollarSign, 
  TrendingDown, 
  AlertCircle, 
  CheckCircle, 
  Eye, 
  EyeOff,
  Wrench,
  Calendar,
  FileText
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface SecurityDepositDeduction {
  id: string;
  maintenance_request_id: string | null;
  deduction_amount: number;
  deduction_reason: string;
  remaining_balance: number;
  deducted_at: string;
  notes: string | null;
  maintenance_requests?: {
    title: string;
    description: string;
    status: string;
  };
}

interface SecurityDepositInfo {
  security_deposit_amount: number;
  security_deposit_remaining: number;
  security_deposit_paid: boolean;
  security_deposit_paid_date: string | null;
  security_deposit_refunded: boolean;
  security_deposit_refund_date: string | null;
  security_deposit_refund_amount: number;
}

export const SecurityDepositTracker: React.FC = () => {
  const { user } = useAuth();
  const [depositInfo, setDepositInfo] = useState<SecurityDepositInfo | null>(null);
  const [deductions, setDeductions] = useState<SecurityDepositDeduction[]>([]);
  const [loading, setLoading] = useState(true);
  const [showHistory, setShowHistory] = useState(false);
  const [showDetails, setShowDetails] = useState(true);

  useEffect(() => {
    if (user?.id) {
      fetchSecurityDepositInfo();
      fetchDeductions();
    }
  }, [user?.id]);

  const fetchSecurityDepositInfo = async () => {
    try {
      const { data, error } = await supabase
        .from('tenant_info')
        .select('security_deposit_amount, security_deposit_remaining, security_deposit_paid, security_deposit_paid_date, security_deposit_refunded, security_deposit_refund_date, security_deposit_refund_amount')
        .eq('auth_user_id', user?.id)
        .maybeSingle();

      if (error) throw error;
      
      if (data) {
        setDepositInfo(data);
      } else {
        console.log('No security deposit found for user');
      }
    } catch (error) {
      console.error('Error fetching security deposit info:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchDeductions = async () => {
    try {
      const { data: tenantData } = await supabase
        .from('tenant_info')
        .select('id')
        .eq('auth_user_id', user?.id)
        .maybeSingle();

      if (!tenantData) return;

      const { data, error } = await supabase
        .from('security_deposit_deductions')
        .select(`
          *,
          maintenance_requests (
            title,
            description,
            status
          )
        `)
        .eq('tenant_id', tenantData.id)
        .order('deducted_at', { ascending: false });

      if (error) throw error;
      setDeductions(data || []);
    } catch (error) {
      console.error('Error fetching deductions:', error);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatCurrency = (amount: number) => {
    return `KES ${amount.toLocaleString()}`;
  };

  const calculatePercentageRemaining = () => {
    if (!depositInfo || depositInfo.security_deposit_amount === 0) return 0;
    return (depositInfo.security_deposit_remaining / depositInfo.security_deposit_amount) * 100;
  };

  const getStatusColor = () => {
    const percentage = calculatePercentageRemaining();
    if (percentage >= 80) return 'bg-green-500';
    if (percentage >= 50) return 'bg-yellow-500';
    if (percentage >= 20) return 'bg-orange-500';
    return 'bg-red-500';
  };

  const getStatusText = () => {
    const percentage = calculatePercentageRemaining();
    if (percentage >= 80) return 'Excellent';
    if (percentage >= 50) return 'Good';
    if (percentage >= 20) return 'Fair';
    return 'Low';
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!depositInfo || depositInfo.security_deposit_amount === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Security Deposit
          </CardTitle>
          <CardDescription>No security deposit on record</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const totalDeductions = depositInfo.security_deposit_amount - depositInfo.security_deposit_remaining;
  const percentageRemaining = calculatePercentageRemaining();

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Security Deposit
              </CardTitle>
              <CardDescription>Track your deposit balance and deductions</CardDescription>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowDetails(!showDetails)}
            >
              {showDetails ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {showDetails && (
            <>
              {/* Status Badge */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Deposit Status</span>
                <div className="flex items-center gap-2">
                  {depositInfo.security_deposit_paid && (
                    <Badge variant="default" className="bg-green-600">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Paid
                    </Badge>
                  )}
                  <Badge variant={percentageRemaining >= 80 ? 'default' : percentageRemaining >= 50 ? 'secondary' : 'destructive'}>
                    {getStatusText()} ({percentageRemaining.toFixed(0)}%)
                  </Badge>
                </div>
              </div>

              {/* Payment Date */}
              {depositInfo.security_deposit_paid_date && (
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Paid on:</span>
                  <span>{formatDate(depositInfo.security_deposit_paid_date)}</span>
                </div>
              )}

              {/* Progress Bar */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Remaining Balance</span>
                  <span className="font-semibold">{formatCurrency(depositInfo.security_deposit_remaining)}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                  <div
                    className={`h-full transition-all duration-500 ${getStatusColor()}`}
                    style={{ width: `${percentageRemaining}%` }}
                  ></div>
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>0</span>
                  <span>{formatCurrency(depositInfo.security_deposit_amount)}</span>
                </div>
              </div>

              {/* Summary Cards */}
              <div className="grid grid-cols-2 gap-4">
                {/* Initial Deposit */}
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <DollarSign className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">Initial</span>
                  </div>
                  <div className="text-lg font-bold text-blue-700 dark:text-blue-300">
                    {formatCurrency(depositInfo.security_deposit_amount)}
                  </div>
                </div>

                {/* Total Deductions */}
                <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingDown className="h-4 w-4 text-red-600 dark:text-red-400" />
                    <span className="text-xs text-red-600 dark:text-red-400 font-medium">Deducted</span>
                  </div>
                  <div className="text-lg font-bold text-red-700 dark:text-red-300">
                    {formatCurrency(totalDeductions)}
                  </div>
                </div>
              </div>

              {/* Refund Status */}
              {depositInfo.security_deposit_refunded && (
                <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                    <span className="font-semibold text-green-700 dark:text-green-300">Deposit Refunded</span>
                  </div>
                  <div className="text-sm text-green-600 dark:text-green-400">
                    Amount: {formatCurrency(depositInfo.security_deposit_refund_amount)}
                  </div>
                  {depositInfo.security_deposit_refund_date && (
                    <div className="text-xs text-green-600 dark:text-green-400 mt-1">
                      Refunded on {formatDate(depositInfo.security_deposit_refund_date)}
                    </div>
                  )}
                </div>
              )}

              {/* Warning for low balance */}
              {percentageRemaining < 30 && !depositInfo.security_deposit_refunded && (
                <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                    <div>
                      <div className="font-semibold text-yellow-700 dark:text-yellow-300 text-sm">
                        Low Security Deposit Balance
                      </div>
                      <div className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">
                        Your security deposit balance is running low. Future maintenance costs may require additional payment.
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Deduction History Button */}
          <div className="pt-4 border-t">
            <Button
              variant="outline"
              className="w-full"
              onClick={() => setShowHistory(true)}
            >
              <FileText className="h-4 w-4 mr-2" />
              View Deduction History ({deductions.length})
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Deduction History Modal */}
      <Dialog open={showHistory} onOpenChange={setShowHistory}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Security Deposit Deduction History</DialogTitle>
            <DialogDescription>
              All deductions made from your security deposit
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {deductions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <CheckCircle className="h-12 w-12 mx-auto mb-2 text-green-500" />
                <p>No deductions yet! Your deposit is intact.</p>
              </div>
            ) : (
              deductions.map((deduction) => (
                <div
                  key={deduction.id}
                  className="p-4 border rounded-lg hover:bg-accent transition-colors"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-start gap-3 flex-1">
                      <div className={`p-2 rounded-lg ${deduction.deduction_amount < 0 ? 'bg-green-100 dark:bg-green-900/20' : 'bg-red-100 dark:bg-red-900/20'}`}>
                        {deduction.deduction_amount < 0 ? (
                          <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                        ) : (
                          <Wrench className="h-5 w-5 text-red-600 dark:text-red-400" />
                        )}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-sm">{deduction.deduction_reason}</h4>
                        {deduction.maintenance_requests && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {deduction.maintenance_requests.title}
                          </p>
                        )}
                        {deduction.notes && (
                          <p className="text-xs text-muted-foreground mt-1 italic">
                            {deduction.notes}
                          </p>
                        )}
                        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {formatDate(deduction.deducted_at)}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`text-lg font-bold ${deduction.deduction_amount < 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                        {deduction.deduction_amount < 0 ? '+' : '-'}{formatCurrency(Math.abs(deduction.deduction_amount))}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        Balance: {formatCurrency(deduction.remaining_balance)}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

