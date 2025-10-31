import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { DollarSign, TrendingUp, TrendingDown, Receipt, Download, Plus, Calendar, Loader2, CheckCircle, AlertCircle, FileText } from 'lucide-react';
import { useFinancials } from '@/hooks/useFinancials';
import { useToast } from '@/hooks/use-toast';
import { exportToExcel, exportMultipleSheets, formatCurrency, formatDate } from '@/utils/excelExport';

export const FinancialsSection = () => {
  const [selectedPeriod, setSelectedPeriod] = useState('current-month');
  const [newExpense, setNewExpense] = useState({
    category: '',
    amount: '',
    description: ''
  });
  const [paymentStatusDialog, setPaymentStatusDialog] = useState<{
    open: boolean;
    paymentId: string;
    currentStatus: string;
  }>({ open: false, paymentId: '', currentStatus: '' });

  const { financialData, loading, addExpense, generateReport, updatePaymentStatus } = useFinancials();
  const { toast } = useToast();

  const handleAddExpense = async () => {
    if (!newExpense.category || !newExpense.amount || !newExpense.description) return;
    
    await addExpense({
      category: newExpense.category,
      amount: Number(newExpense.amount),
      description: newExpense.description,
      date: new Date().toISOString().split('T')[0]
    });
    
    setNewExpense({ category: '', amount: '', description: '' });
  };

  const handleUpdatePaymentStatus = async (status: 'paid' | 'overdue' | 'pending') => {
    if (!paymentStatusDialog.paymentId) return;
    
    const paidDate = status === 'paid' ? new Date().toISOString().split('T')[0] : undefined;
    await updatePaymentStatus(paymentStatusDialog.paymentId, status, paidDate);
    setPaymentStatusDialog({ open: false, paymentId: '', currentStatus: '' });
  };

  const handleDownloadReceipt = (paymentId: string) => {
    // In a real app, this would generate and download a PDF receipt
    toast({
      title: "Receipt Downloaded",
      description: "Payment receipt has been downloaded to your device.",
    });
  };

  const handleExportData = (format: 'csv' | 'excel') => {
    if (!financialData) {
      toast({
        title: "Error",
        description: "No financial data available to export",
        variant: "destructive"
      });
      return;
    }

    try {
      if (format === 'excel') {
        // Create multiple sheets for comprehensive export
        const sheets = [
          {
            name: 'Summary',
            data: [
              ['FINANCIAL SUMMARY'],
              [`Generated: ${new Date().toLocaleDateString()}`],
              [],
              ['Total Collected', `KES ${financialData.totalCollected.toLocaleString()}`],
              ['Total Expected', `KES ${financialData.totalExpected.toLocaleString()}`],
              ['Overdue Payments', `KES ${financialData.overdue.toLocaleString()}`],
              ['Total Expenses', `KES ${financialData.totalExpenses.toLocaleString()}`],
              ['Net Profit', `KES ${financialData.netProfit.toLocaleString()}`],
            ]
          },
          {
            name: 'Transactions',
            data: [
              ['Date', 'Tenant', 'Unit', 'Amount', 'Status', 'Type'],
              ...financialData.recentTransactions.map(t => [
                formatDate(t.date),
                t.tenant,
                t.unit,
                formatCurrency(Math.abs(t.amount)),
                t.status,
                t.type
              ])
            ]
          },
          {
            name: 'Monthly Data',
            data: [
              ['Month', 'Income', 'Expenses', 'Profit'],
              ...financialData.monthlyData.map(m => [
                m.month,
                formatCurrency(m.income),
                formatCurrency(m.expenses),
                formatCurrency(m.profit)
              ])
            ]
          },
          {
            name: 'Expenses by Category',
            data: [
              ['Category', 'Amount (KES)'],
              ...Object.entries(financialData.expenses).map(([category, amount]) => [
                category.charAt(0).toUpperCase() + category.slice(1),
                formatCurrency(amount)
              ])
            ]
          }
        ];

        exportMultipleSheets(
          sheets,
          `financial-data-${new Date().toISOString().split('T')[0]}.xlsx`
        );

        toast({
          title: "Export Complete",
          description: "Financial data has been exported to Excel successfully",
        });
      } else {
        // CSV export
        const csvContent = [
          'Date,Tenant,Unit,Amount,Status,Type',
          ...financialData.recentTransactions.map(t => 
            `${formatDate(t.date)},${t.tenant},${t.unit},${Math.abs(t.amount)},${t.status},${t.type}`
          )
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `financial-data-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);

        toast({
          title: "Export Complete",
          description: "Financial data has been exported to CSV successfully",
        });
      }
    } catch (error) {
      console.error('Error exporting data:', error);
      toast({
        title: "Export Failed",
        description: "Failed to export financial data. Please try again.",
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!financialData) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-muted-foreground">No financial data available</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Financials</h1>
          <p className="text-muted-foreground">Track income, expenses, and financial performance</p>
        </div>
        <div className="flex gap-2">
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="current-month">Current Month</SelectItem>
              <SelectItem value="last-month">Last Month</SelectItem>
              <SelectItem value="quarter">This Quarter</SelectItem>
              <SelectItem value="year">This Year</SelectItem>
            </SelectContent>
          </Select>
          <Button className="gap-2" onClick={() => generateReport('financial', selectedPeriod)}>
            <Receipt className="h-4 w-4" />
            Generate Report
          </Button>
          <Button variant="outline" className="gap-2" onClick={() => handleExportData('excel')}>
            <Download className="h-4 w-4" />
            Export Data
          </Button>
        </div>
      </div>

      {/* Financial Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-gradient-to-r from-success to-success/80 text-white">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Collected</CardTitle>
            <DollarSign className="h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">KES {financialData.totalCollected.toLocaleString()}</div>
            <p className="text-xs opacity-90">of KES {financialData.totalExpected.toLocaleString()} expected</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-destructive to-destructive/80 text-white">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overdue Payments</CardTitle>
            <TrendingDown className="h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">KES {financialData.overdue.toLocaleString()}</div>
            <p className="text-xs opacity-90">3 tenants behind</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">KES {financialData.totalExpenses.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">This month</p>
          </CardContent>
        </Card>

        <Card className={`${financialData.netProfit > 0 ? 'bg-gradient-to-r from-success to-success/80 text-white' : 'bg-gradient-to-r from-warning to-warning/80 text-white'}`}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Net Profit</CardTitle>
            <TrendingUp className="h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">KES {financialData.netProfit.toLocaleString()}</div>
            <p className="text-xs opacity-90">{financialData.netProfit > 0 ? 'Positive' : 'Negative'} this month</p>
          </CardContent>
        </Card>
      </div>

      {/* Financial Details Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="collections">Collections</TabsTrigger>
          <TabsTrigger value="expenses">Expenses</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Transactions */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Transactions</CardTitle>
                <CardDescription>Latest financial activity</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {financialData.recentTransactions.map((transaction) => (
                    <div key={transaction.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium text-sm">{transaction.tenant} - {transaction.unit}</p>
                        <p className="text-xs text-muted-foreground">{transaction.date}</p>
                      </div>
                      <div className="text-right">
                        <p className={`font-bold ${(transaction.amount || 0) > 0 ? 'text-success' : 'text-destructive'}`}>
                          {(transaction.amount || 0) > 0 ? '+' : ''}KES {Math.abs(transaction.amount || 0).toLocaleString()}
                        </p>
                          <Badge variant="secondary" className={`text-xs ${transaction.status === 'paid' ? 'text-success' : 'text-destructive'}`}>
                            {transaction.status}
                          </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Monthly P&L */}
            <Card>
              <CardHeader>
                <CardTitle>Monthly Performance</CardTitle>
                <CardDescription>Income vs expenses trend</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {financialData.monthlyData.map((month) => (
                    <div key={month.month} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{month.month} 2024</span>
                        <span className={`font-bold ${month.profit > 0 ? 'text-success' : 'text-destructive'}`}>
                          KES {month.profit.toLocaleString()}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div className="text-success">Income: KES {month.income.toLocaleString()}</div>
                        <div className="text-destructive">Expenses: KES {month.expenses.toLocaleString()}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="collections" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Rent Collection Status</CardTitle>
              <CardDescription>Track payment collection and overdue amounts</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tenant</TableHead>
                    <TableHead>Unit</TableHead>
                    <TableHead>Amount Due</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {financialData.recentTransactions.filter(t => t.type === 'rent').map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell className="font-medium">{payment.tenant}</TableCell>
                      <TableCell>{payment.unit}</TableCell>
                      <TableCell>KES {Math.abs(payment.amount || 0).toLocaleString()}</TableCell>
                      <TableCell>{payment.date}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={payment.status === 'paid' ? 'text-success' : 'text-destructive'}>
                          {payment.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => setPaymentStatusDialog({
                                  open: true,
                                  paymentId: payment.id,
                                  currentStatus: payment.status
                                })}
                              >
                                {payment.status === 'paid' ? (
                                  <CheckCircle className="h-4 w-4 text-success" />
                                ) : (
                                  <AlertCircle className="h-4 w-4 text-warning" />
                                )}
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Update Payment Status</DialogTitle>
                              </DialogHeader>
                              <div className="space-y-4">
                                <p>Update payment status for {payment.tenant} - Unit {payment.unit}</p>
                                <div className="flex gap-2">
                                  <Button
                                    onClick={() => handleUpdatePaymentStatus('paid')}
                                    variant={paymentStatusDialog.currentStatus === 'paid' ? 'default' : 'outline'}
                                    className="flex-1"
                                  >
                                    Mark Paid
                                  </Button>
                                  <Button
                                    onClick={() => handleUpdatePaymentStatus('overdue')}
                                    variant={paymentStatusDialog.currentStatus === 'overdue' ? 'default' : 'outline'}
                                    className="flex-1"
                                  >
                                    Mark Overdue
                                  </Button>
                                </div>
                              </div>
                            </DialogContent>
                          </Dialog>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleDownloadReceipt(payment.id)}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="expenses" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Expense Categories</CardTitle>
                <CardDescription>Breakdown of monthly expenses</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.entries(financialData.expenses || {}).length > 0 ? (
                    Object.entries(financialData.expenses).map(([category, amount]) => (
                      <div key={category} className="flex items-center justify-between p-3 border rounded-lg">
                        <span className="font-medium capitalize">{category}</span>
                        <span className="font-bold">KES {amount.toLocaleString()}</span>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <FileText className="h-8 w-8 mx-auto mb-2" />
                      <p>No expenses recorded yet</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Add Expense</CardTitle>
                <CardDescription>Record a new expense</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Select value={newExpense.category} onValueChange={(value) => setNewExpense(prev => ({...prev, category: value}))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Expense category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="maintenance">Maintenance</SelectItem>
                    <SelectItem value="repairs">Repairs</SelectItem>
                    <SelectItem value="taxes">Taxes</SelectItem>
                    <SelectItem value="insurance">Insurance</SelectItem>
                    <SelectItem value="staff">Staff</SelectItem>
                    <SelectItem value="utilities">Utilities</SelectItem>
                    <SelectItem value="marketing">Marketing</SelectItem>
                    <SelectItem value="legal">Legal</SelectItem>
                  </SelectContent>
                </Select>
                <Input 
                  placeholder="Amount (KES)" 
                  type="number" 
                  value={newExpense.amount}
                  onChange={(e) => setNewExpense(prev => ({...prev, amount: e.target.value}))}
                />
                <Input 
                  placeholder="Description" 
                  value={newExpense.description}
                  onChange={(e) => setNewExpense(prev => ({...prev, description: e.target.value}))}
                />
                <Button className="w-full gap-2" onClick={handleAddExpense}>
                  <Plus className="h-4 w-4" />
                  Add Expense
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="reports" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => generateReport('income-statement', selectedPeriod)}>
              <CardContent className="p-6 text-center">
                <Receipt className="h-8 w-8 mx-auto mb-3 text-primary" />
                <h3 className="font-semibold mb-2">Income Statement</h3>
                <p className="text-sm text-muted-foreground mb-4">Monthly revenue and expense breakdown</p>
                <Button variant="outline" className="w-full">Generate PDF</Button>
              </CardContent>
            </Card>
            
            <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => generateReport('profit-loss', selectedPeriod)}>
              <CardContent className="p-6 text-center">
                <TrendingUp className="h-8 w-8 mx-auto mb-3 text-primary" />
                <h3 className="font-semibold mb-2">Profit & Loss</h3>
                <p className="text-sm text-muted-foreground mb-4">Financial performance analysis</p>
                <Button variant="outline" className="w-full">Generate PDF</Button>
              </CardContent>
            </Card>
            
            <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => generateReport('tax-summary', selectedPeriod)}>
              <CardContent className="p-6 text-center">
                <Calendar className="h-8 w-8 mx-auto mb-3 text-primary" />
                <h3 className="font-semibold mb-2">Tax Summary</h3>
                <p className="text-sm text-muted-foreground mb-4">Annual tax preparation report</p>
                <Button variant="outline" className="w-full">Generate PDF</Button>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => handleExportData('csv')}>
              <CardContent className="p-6 text-center">
                <Download className="h-8 w-8 mx-auto mb-3 text-primary" />
                <h3 className="font-semibold mb-2">Data Export</h3>
                <p className="text-sm text-muted-foreground mb-4">Export all financial data as CSV</p>
                <Button variant="outline" className="w-full">Export CSV</Button>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => handleExportData('excel')}>
              <CardContent className="p-6 text-center">
                <FileText className="h-8 w-8 mx-auto mb-3 text-primary" />
                <h3 className="font-semibold mb-2">Excel Report</h3>
                <p className="text-sm text-muted-foreground mb-4">Comprehensive Excel analysis</p>
                <Button variant="outline" className="w-full">Export Excel</Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};