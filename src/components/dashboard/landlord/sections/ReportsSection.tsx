import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { BarChart3, TrendingUp, FileText, Download, Calendar as CalendarIcon, Mail, Filter, Loader2, Clock, Bell, Settings } from 'lucide-react';
import { format } from 'date-fns';
import { useReports } from '@/hooks/useReports';
import { useProperties } from '@/hooks/useProperties';
import { useToast } from '@/hooks/use-toast';
import { ReportsDashboard } from '../ReportsDashboard';
import { ReportsChart } from '../../charts/ReportsChart';

export const ReportsSection = () => {
  const [dateRange, setDateRange] = useState({ from: new Date(), to: new Date() });
  const [reportType, setReportType] = useState('dashboard');
  const [selectedProperty, setSelectedProperty] = useState('all');
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  const [scheduleConfig, setScheduleConfig] = useState({
    reportType: 'financial',
    frequency: 'monthly',
    email: ''
  });

  const { reportData, loading, exportReport, generateComprehensiveReport, scheduleReport } = useReports();
  const { properties } = useProperties();
  const { toast } = useToast();

  const handleScheduleReport = async () => {
    if (!scheduleConfig.email) {
      toast({
        title: "Email Required",
        description: "Please enter an email address for scheduled reports.",
        variant: "destructive"
      });
      return;
    }
    
    await scheduleReport(scheduleConfig.reportType, scheduleConfig.frequency as any, scheduleConfig.email);
    setScheduleDialogOpen(false);
    setScheduleConfig({ reportType: 'financial', frequency: 'monthly', email: '' });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!reportData) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-muted-foreground">No report data available</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Reports</h1>
          <p className="text-muted-foreground">Generate comprehensive business reports and analytics</p>
        </div>
        <div className="flex gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Filter className="h-4 w-4" />
                Filters
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80">
              <div className="space-y-4">
                <div>
                  <Label>Property Filter</Label>
                  <Select value={selectedProperty} onValueChange={setSelectedProperty}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Properties</SelectItem>
                      {properties?.map(property => (
                        <SelectItem key={property.id} value={property.id}>
                          {property.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Date Range</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left font-normal">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {dateRange.from ? format(dateRange.from, 'MMM dd') : 'Start'} - {dateRange.to ? format(dateRange.to, 'MMM dd') : 'End'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="range"
                        selected={{ from: dateRange.from, to: dateRange.to }}
                        onSelect={(range) => range && setDateRange({ from: range.from!, to: range.to! })}
                        numberOfMonths={2}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            </PopoverContent>
          </Popover>
          
          <Dialog open={scheduleDialogOpen} onOpenChange={setScheduleDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Clock className="h-4 w-4" />
                Schedule
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Schedule Automated Reports</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Report Type</Label>
                  <Select value={scheduleConfig.reportType} onValueChange={(value) => setScheduleConfig(prev => ({...prev, reportType: value}))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="financial">Financial Report</SelectItem>
                      <SelectItem value="occupancy">Occupancy Report</SelectItem>
                      <SelectItem value="maintenance">Maintenance Report</SelectItem>
                      <SelectItem value="comprehensive">Comprehensive Report</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Frequency</Label>
                  <Select value={scheduleConfig.frequency} onValueChange={(value) => setScheduleConfig(prev => ({...prev, frequency: value}))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="quarterly">Quarterly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Email Address</Label>
                  <Input 
                    type="email"
                    placeholder="your@email.com"
                    value={scheduleConfig.email}
                    onChange={(e) => setScheduleConfig(prev => ({...prev, email: e.target.value}))}
                  />
                </div>
                <Button onClick={handleScheduleReport} className="w-full">
                  Schedule Report
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <Button className="gap-2" onClick={() => exportReport(reportType, 'pdf', dateRange)}>
            <Download className="h-4 w-4" />
            Export PDF
          </Button>
        </div>
      </div>

      {/* Report Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Report Configuration</CardTitle>
          <CardDescription>Configure your report parameters</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Report Type</Label>
              <Select value={reportType} onValueChange={setReportType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="financial">Financial Report</SelectItem>
                  <SelectItem value="occupancy">Occupancy Report</SelectItem>
                  <SelectItem value="maintenance">Maintenance Report</SelectItem>
                  <SelectItem value="comprehensive">Comprehensive Report</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Property</Label>
              <Select value={selectedProperty} onValueChange={setSelectedProperty}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Properties</SelectItem>
                  {properties?.map(property => (
                    <SelectItem key={property.id} value={property.id}>
                      {property.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Date Range</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateRange.from ? format(dateRange.from, 'MMM dd') : 'Start date'} - {dateRange.to ? format(dateRange.to, 'MMM dd') : 'End date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 z-50" align="start">
                  <Calendar
                    mode="range"
                    selected={{ from: dateRange.from, to: dateRange.to }}
                    onSelect={(range) => range && setDateRange({ from: range.from!, to: range.to! })}
                    numberOfMonths={2}
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>Export Format</Label>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => exportReport(reportType, 'pdf', dateRange)}
                  className="flex-1"
                >
                  PDF
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => exportReport(reportType, 'excel', dateRange)}
                  className="flex-1"
                >
                  Excel
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => exportReport(reportType, 'email', dateRange)}
                  className="flex-1"
                >
                  <Mail className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Report Content */}
      <Tabs value={reportType} onValueChange={setReportType} className="space-y-4">
        <TabsList>
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="financial">Financial</TabsTrigger>
          <TabsTrigger value="occupancy">Occupancy</TabsTrigger>
          <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
          <TabsTrigger value="comprehensive">Comprehensive</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-4">
          <ReportsDashboard />
        </TabsContent>

        <TabsContent value="financial" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-success">KES {reportData.financial.totalRevenue.toLocaleString()}</div>
                <div className="text-sm text-muted-foreground">Total Revenue</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-destructive">KES {reportData.financial.totalExpenses.toLocaleString()}</div>
                <div className="text-sm text-muted-foreground">Total Expenses</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-primary">KES {reportData.financial.netProfit.toLocaleString()}</div>
                <div className="text-sm text-muted-foreground">Net Profit</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold">{reportData.financial.occupancyRate}%</div>
                <div className="text-sm text-muted-foreground">Occupancy Rate</div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Monthly Financial Trend</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <ReportsChart
                  data={reportData.financial}
                  type="financial"
                  title="Revenue vs Expenses"
                  description="6-month trend comparison"
                />
                <div className="space-y-4">
                  {reportData.financial.monthlyTrend.map((month) => (
                    <div key={month.month} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="font-medium">{month.month} 2024</div>
                      <div className="flex gap-6">
                        <div className="text-right">
                          <div className="text-sm text-muted-foreground">Revenue</div>
                          <div className="font-bold text-success">KES {month.revenue.toLocaleString()}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm text-muted-foreground">Expenses</div>
                          <div className="font-bold text-destructive">KES {month.expenses.toLocaleString()}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm text-muted-foreground">Profit</div>
                          <div className="font-bold">KES {(month.revenue - month.expenses).toLocaleString()}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="occupancy" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold">{reportData.occupancy.totalUnits}</div>
                <div className="text-sm text-muted-foreground">Total Units</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-success">{reportData.occupancy.occupiedUnits}</div>
                <div className="text-sm text-muted-foreground">Occupied Units</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-warning">{reportData.occupancy.vacantUnits}</div>
                <div className="text-sm text-muted-foreground">Vacant Units</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold">{reportData.occupancy.averageVacancyDuration}</div>
                <div className="text-sm text-muted-foreground">Avg Vacancy (days)</div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Property Occupancy Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <ReportsChart
                  data={reportData.occupancy}
                  type="occupancy"
                  title="Occupancy Rates by Property"
                  description="Current occupancy across all properties"
                />
                <div className="space-y-4">
                  {reportData.occupancy.propertyBreakdown.map((property) => (
                    <div key={property.property} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <div className="font-medium">{property.property}</div>
                        <div className="text-sm text-muted-foreground">{property.occupied}/{property.total} units</div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold">{property.rate}%</div>
                        <Badge variant="secondary" className={property.rate === 100 ? 'text-success' : property.rate > 80 ? '' : 'text-warning'}>
                          {property.rate === 100 ? 'Full' : property.rate > 80 ? 'Good' : 'Needs Attention'}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="maintenance" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold">{reportData.maintenance.totalRequests}</div>
                <div className="text-sm text-muted-foreground">Total Requests</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-success">{reportData.maintenance.completedRequests}</div>
                <div className="text-sm text-muted-foreground">Completed</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-warning">{reportData.maintenance.pendingRequests}</div>
                <div className="text-sm text-muted-foreground">Pending</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold">KES {reportData.maintenance.totalMaintenanceCost.toLocaleString()}</div>
                <div className="text-sm text-muted-foreground">Total Cost</div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Maintenance Category Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <ReportsChart
                  data={reportData.maintenance}
                  type="maintenance"
                  title="Cost Distribution by Category"
                  description="Maintenance costs breakdown"
                />
                <div className="space-y-4">
                  {reportData.maintenance.categoryBreakdown.map((category) => (
                    <div key={category.category} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <div className="font-medium">{category.category}</div>
                        <div className="text-sm text-muted-foreground">{category.count} requests</div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold">KES {category.cost.toLocaleString()}</div>
                        <div className="text-sm text-muted-foreground">Average: KES {Math.round(category.cost / category.count).toLocaleString()}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="comprehensive" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => generateComprehensiveReport('executive-summary')}>
              <CardContent className="p-6 text-center">
                <BarChart3 className="h-12 w-12 mx-auto mb-4 text-primary" />
                <h3 className="font-semibold mb-2">Executive Summary</h3>
                <p className="text-sm text-muted-foreground mb-4">Complete business overview with key metrics and insights</p>
                <Button variant="outline" className="w-full">Generate Report</Button>
              </CardContent>
            </Card>
            
            <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => generateComprehensiveReport('performance-analysis')}>
              <CardContent className="p-6 text-center">
                <TrendingUp className="h-12 w-12 mx-auto mb-4 text-primary" />
                <h3 className="font-semibold mb-2">Performance Analysis</h3>
                <p className="text-sm text-muted-foreground mb-4">Detailed performance trends and comparative analysis</p>
                <Button variant="outline" className="w-full">Generate Report</Button>
              </CardContent>
            </Card>
            
            <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => generateComprehensiveReport('annual-report')}>
              <CardContent className="p-6 text-center">
                <FileText className="h-12 w-12 mx-auto mb-4 text-primary" />
                <h3 className="font-semibold mb-2">Annual Report</h3>
                <p className="text-sm text-muted-foreground mb-4">Comprehensive yearly business report for stakeholders</p>
                <Button variant="outline" className="w-full">Generate Report</Button>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => exportReport('tax-summary', 'pdf', dateRange)}>
              <CardContent className="p-6 text-center">
                <FileText className="h-12 w-12 mx-auto mb-4 text-primary" />
                <h3 className="font-semibold mb-2">Tax Summary</h3>
                <p className="text-sm text-muted-foreground mb-4">Annual tax preparation and compliance report</p>
                <Button variant="outline" className="w-full">Generate PDF</Button>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => exportReport('financial-forecast', 'excel', dateRange)}>
              <CardContent className="p-6 text-center">
                <TrendingUp className="h-12 w-12 mx-auto mb-4 text-primary" />
                <h3 className="font-semibold mb-2">Financial Forecast</h3>
                <p className="text-sm text-muted-foreground mb-4">Predictive analysis and budgeting report</p>
                <Button variant="outline" className="w-full">Export Excel</Button>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => exportReport('investor-report', 'pdf', dateRange)}>
              <CardContent className="p-6 text-center">
                <BarChart3 className="h-12 w-12 mx-auto mb-4 text-primary" />
                <h3 className="font-semibold mb-2">Investor Report</h3>
                <p className="text-sm text-muted-foreground mb-4">Professional report for investors and stakeholders</p>
                <Button variant="outline" className="w-full">Generate PDF</Button>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Scheduled Reports
              </CardTitle>
              <CardDescription>Manage automatically generated reports sent to your email</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <div className="font-medium">Weekly Financial Summary</div>
                    <div className="text-sm text-muted-foreground">Every Monday at 9:00 AM</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Switch defaultChecked />
                    <Badge variant="default">Active</Badge>
                  </div>
                </div>
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <div className="font-medium">Monthly Occupancy Report</div>
                    <div className="text-sm text-muted-foreground">First day of each month</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Switch defaultChecked />
                    <Badge variant="default">Active</Badge>
                  </div>
                </div>
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <div className="font-medium">Quarterly Business Review</div>
                    <div className="text-sm text-muted-foreground">Every 3 months</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Switch />
                    <Badge variant="secondary">Inactive</Badge>
                  </div>
                </div>
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <div className="font-medium">Maintenance Cost Analysis</div>
                    <div className="text-sm text-muted-foreground">Monthly on the 15th</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Switch defaultChecked />
                    <Badge variant="default">Active</Badge>
                  </div>
                </div>
              </div>
              
              <div className="mt-6 pt-4 border-t">
                <Button 
                  variant="outline" 
                  className="w-full gap-2"
                  onClick={() => setScheduleDialogOpen(true)}
                >
                  <Settings className="h-4 w-4" />
                  Configure New Schedule
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};