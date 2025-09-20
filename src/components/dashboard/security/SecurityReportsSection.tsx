import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DatePickerWithRange } from '@/components/ui/date-range-picker';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { FileText, Download, TrendingUp, AlertTriangle, UserCheck, MapPin } from 'lucide-react';
import { useState } from 'react';
import { DateRange } from 'react-day-picker';

const SecurityReportsSection = () => {
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [reportType, setReportType] = useState('all');

  // Mock data for charts
  const incidentsByType = [
    { type: 'Unauthorized Access', count: 5, color: '#ef4444' },
    { type: 'Suspicious Activity', count: 8, color: '#f97316' },
    { type: 'Noise Complaints', count: 12, color: '#eab308' },
    { type: 'Equipment Issues', count: 3, color: '#3b82f6' },
    { type: 'Emergency', count: 2, color: '#dc2626' }
  ];

  const incidentsTrend = [
    { month: 'Jan', incidents: 15, resolved: 14 },
    { month: 'Feb', incidents: 18, resolved: 17 },
    { month: 'Mar', incidents: 12, resolved: 12 },
    { month: 'Apr', incidents: 22, resolved: 20 },
    { month: 'May', incidents: 16, resolved: 16 },
    { month: 'Jun', incidents: 20, resolved: 19 }
  ];

  const patrolMetrics = [
    { location: 'Building A', completed: 28, scheduled: 30 },
    { location: 'Building B', completed: 25, scheduled: 30 },
    { location: 'Parking Lot', completed: 22, scheduled: 25 },
    { location: 'Common Areas', completed: 20, scheduled: 20 },
    { location: 'Perimeter', completed: 18, scheduled: 20 }
  ];

  const visitorStats = [
    { day: 'Mon', visitors: 25 },
    { day: 'Tue', visitors: 30 },
    { day: 'Wed', visitors: 22 },
    { day: 'Thu', visitors: 28 },
    { day: 'Fri', visitors: 35 },
    { day: 'Sat', visitors: 15 },
    { day: 'Sun', visitors: 12 }
  ];

  const exportReport = () => {
    // Simulate report export
    console.log('Exporting security report...');
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Security Reports</h1>
          <p className="text-muted-foreground">Analytics and reporting for security operations</p>
        </div>
        
        <Button onClick={exportReport}>
          <Download className="h-4 w-4 mr-2" />
          Export Report
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Report Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <DatePickerWithRange 
                date={dateRange} 
                onDateChange={setDateRange}
                placeholder="Select date range"
              />
            </div>
            <Select value={reportType} onValueChange={setReportType}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Report type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Reports</SelectItem>
                <SelectItem value="incidents">Incidents Only</SelectItem>
                <SelectItem value="patrols">Patrols Only</SelectItem>
                <SelectItem value="visitors">Visitors Only</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Incidents</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">30</div>
            <p className="text-xs text-muted-foreground">This month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Patrols Completed</CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">113</div>
            <p className="text-xs text-muted-foreground">of 125 scheduled</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Visitors</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">167</div>
            <p className="text-xs text-muted-foreground">This month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Response Time</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">12m</div>
            <p className="text-xs text-muted-foreground">Average response</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Incidents by Type */}
        <Card>
          <CardHeader>
            <CardTitle>Incidents by Type</CardTitle>
            <CardDescription>Distribution of security incidents</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={incidentsByType}
                  dataKey="count"
                  nameKey="type"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label={({ type, count }) => `${type}: ${count}`}
                >
                  {incidentsByType.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Incidents Trend */}
        <Card>
          <CardHeader>
            <CardTitle>Incident Trends</CardTitle>
            <CardDescription>Monthly incident reporting and resolution</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={incidentsTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="incidents" stroke="#ef4444" strokeWidth={2} />
                <Line type="monotone" dataKey="resolved" stroke="#22c55e" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Patrol Completion */}
        <Card>
          <CardHeader>
            <CardTitle>Patrol Completion Rates</CardTitle>
            <CardDescription>Patrol completion by location</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={patrolMetrics}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="location" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="completed" fill="#22c55e" name="Completed" />
                <Bar dataKey="scheduled" fill="#e5e7eb" name="Scheduled" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Visitor Traffic */}
        <Card>
          <CardHeader>
            <CardTitle>Weekly Visitor Traffic</CardTitle>
            <CardDescription>Daily visitor counts</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={visitorStats}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="visitors" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Summary Table */}
      <Card>
        <CardHeader>
          <CardTitle>Security Summary</CardTitle>
          <CardDescription>Key security metrics and performance indicators</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 border rounded-lg">
                <h4 className="font-medium text-sm text-muted-foreground">Incident Resolution Rate</h4>
                <p className="text-2xl font-bold text-success">96.7%</p>
                <p className="text-xs text-muted-foreground">29 of 30 incidents resolved</p>
              </div>
              
              <div className="p-4 border rounded-lg">
                <h4 className="font-medium text-sm text-muted-foreground">Patrol Completion Rate</h4>
                <p className="text-2xl font-bold text-primary">90.4%</p>
                <p className="text-xs text-muted-foreground">113 of 125 patrols completed</p>
              </div>
              
              <div className="p-4 border rounded-lg">
                <h4 className="font-medium text-sm text-muted-foreground">Average Response Time</h4>
                <p className="text-2xl font-bold text-warning">12 minutes</p>
                <p className="text-xs text-muted-foreground">Target: &lt;15 minutes</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export { SecurityReportsSection };