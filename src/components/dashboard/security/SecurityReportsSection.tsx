import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DatePickerWithRange } from '@/components/ui/date-range-picker';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { FileText, Download, TrendingUp, AlertTriangle, UserCheck, MapPin, Activity, Clock } from 'lucide-react';
import { useState, useEffect } from 'react';
import { DateRange } from 'react-day-picker';
import { useVisitors } from '@/hooks/useVisitors';
import { useVisitorRequests } from '@/hooks/useVisitorRequests';
import { useSecurityPatrols } from '@/hooks/useSecurityPatrols';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { format, subDays, startOfMonth, endOfMonth } from 'date-fns';
import { exportToExcel, exportMultipleSheets, formatCurrency } from '@/utils/excelExport';

const SecurityReportsSection = () => {
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [reportType, setReportType] = useState('all');
  const [incidents, setIncidents] = useState<any[]>([]);
  const [reportData, setReportData] = useState({
    incidentsByType: [],
    incidentsTrend: [],
    patrolMetrics: [],
    visitorStats: [],
    totalIncidents: 0,
    patrolsCompleted: 0,
    totalVisitors: 0,
    responseTime: 0
  });
  const [loading, setLoading] = useState(true);

  const { visitors, getStats: getVisitorStats } = useVisitors();
  const { requests } = useVisitorRequests();
  const { patrols, stats: patrolStats } = useSecurityPatrols();
  const { profile } = useAuth();
  const { toast } = useToast();

  // Fetch real data
  const fetchReportData = async () => {
    if (!profile?.id) return;

    try {
      setLoading(true);

      // Set default date range to current month if not set
      const startDate = dateRange?.from || startOfMonth(new Date());
      const endDate = dateRange?.to || endOfMonth(new Date());

      // Fetch incidents
      const { data: incidentsData } = await supabase
        .from('security_logs')
        .select('*')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());
      
      // Save incidents to state for summary calculations
      setIncidents(incidentsData || []);

      // Process incidents by type
      const incidentsByType = incidentsData?.reduce((acc: any[], incident: any) => {
        const existing = acc.find(item => item.type === incident.incident_type);
        if (existing) {
          existing.count += 1;
        } else {
          acc.push({
            type: incident.incident_type?.replace('_', ' ') || 'Unknown',
            count: 1,
            color: getIncidentColor(incident.incident_type)
          });
        }
        return acc;
      }, []) || [];

      // Process incidents trend (last 6 months)
      const incidentsTrend = [];
      for (let i = 5; i >= 0; i--) {
        const monthStart = startOfMonth(subDays(new Date(), i * 30));
        const monthEnd = endOfMonth(monthStart);
        
        const monthIncidents = incidentsData?.filter(incident => {
          const incidentDate = new Date(incident.created_at);
          return incidentDate >= monthStart && incidentDate <= monthEnd;
        }) || [];

        const resolved = monthIncidents.filter(incident => incident.status === 'resolved').length;

        incidentsTrend.push({
          month: format(monthStart, 'MMM'),
          incidents: monthIncidents.length,
          resolved
        });
      }

      // Get patrol metrics from real data
      const patrolsByLocation = patrols.reduce((acc: any, patrol) => {
        const location = patrol.location;
        if (!acc[location]) {
          acc[location] = { location, completed: 0, scheduled: 0 };
        }
        
        if (patrol.status === 'completed') {
          acc[location].completed += 1;
        }
        acc[location].scheduled += 1;
        
        return acc;
      }, {});
      
      const patrolMetrics = Object.values(patrolsByLocation).slice(0, 5);

      // Process visitor stats (last 7 days)
      const visitorStats = [];
      for (let i = 6; i >= 0; i--) {
        const day = subDays(new Date(), i);
        const dayVisitors = visitors.filter(visitor => {
          const visitorDate = new Date(visitor.time_in);
          return visitorDate.toDateString() === day.toDateString();
        }).length;

        visitorStats.push({
          day: format(day, 'EEE'),
          visitors: dayVisitors
        });
      }

      // Calculate metrics
      const totalIncidents = incidentsData?.length || 0;
      const patrolsCompleted = patrolStats.completed_patrols;
      const visitorStatsData = getVisitorStats();
      const totalVisitors = visitorStatsData.todaysVisitors;

      // Calculate average response time
      const resolvedIncidents = incidentsData?.filter(incident => 
        incident.status === 'resolved' && incident.resolved_date
      ) || [];
      
      const responseTime = resolvedIncidents.length > 0 ? 
        resolvedIncidents.reduce((sum, incident) => {
          const created = new Date(incident.created_at);
          const resolved = new Date(incident.resolved_date);
          const hours = (resolved.getTime() - created.getTime()) / (1000 * 60 * 60);
          return sum + hours;
        }, 0) / resolvedIncidents.length : 0;

      setReportData({
        incidentsByType,
        incidentsTrend,
        patrolMetrics,
        visitorStats,
        totalIncidents,
        patrolsCompleted,
        totalVisitors,
        responseTime: Math.round(responseTime * 10) / 10
      });
    } catch (error) {
      console.error('Error fetching report data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getIncidentColor = (type: string) => {
    const colors: { [key: string]: string } = {
      'unauthorized_access': '#ef4444',
      'suspicious_activity': '#f97316',
      'noise_complaint': '#eab308',
      'equipment_failure': '#3b82f6',
      'emergency': '#dc2626',
      'vandalism': '#8b5cf6',
      'other': '#6b7280'
    };
    return colors[type] || '#6b7280';
  };

  useEffect(() => {
    fetchReportData();
  }, [profile?.id, dateRange, visitors, requests]);

  const exportReport = () => {
    if (!profile?.id || loading) {
      toast({
        title: "Error",
        description: "Please wait for data to load",
        variant: "destructive"
      });
      return;
    }

    try {
      const startDate = dateRange?.from || startOfMonth(new Date());
      const endDate = dateRange?.to || endOfMonth(new Date());
      const dateRangeText = format(startDate, 'MMM d, yyyy') + ' - ' + format(endDate, 'MMM d, yyyy');

      // Create comprehensive Excel export with multiple sheets
      const sheets = [
        {
          name: 'Summary',
          data: [
            ['SECURITY REPORT SUMMARY'],
            [`Period: ${dateRangeText}`],
            [`Generated: ${new Date().toLocaleDateString()}`],
            [],
            ['KEY METRICS'],
            ['Total Incidents', reportData.totalIncidents],
            ['Patrols Completed', reportData.patrolsCompleted],
            ['Total Visitors', reportData.totalVisitors],
            ['Average Response Time', `${reportData.responseTime}h`],
            [],
            ['RESOLUTION RATE'],
            ['Incidents Resolved', reportData.totalIncidents - (incidents?.filter(i => i.status === 'open' || i.status === 'investigating').length || 0)],
            ['Resolution Rate', `${reportData.totalIncidents > 0 ? Math.round((reportData.totalIncidents - (incidents?.filter(i => i.status === 'open' || i.status === 'investigating').length || 0)) / reportData.totalIncidents * 100) : 0}%`],
            [],
            ['PATROL METRICS'],
            ['Completion Rate', `${patrolStats.completion_rate}%`],
            ['Completed Patrols', patrolStats.completed_patrols],
            ['Total Patrols', patrolStats.total_patrols],
          ]
        },
        {
          name: 'Incidents',
          data: [
            ['Incident Type', 'Count'],
            ...reportData.incidentsByType.map((item: any) => [
              item.type,
              item.count
            ])
          ]
        },
        {
          name: 'Incident Trends',
          data: [
            ['Month', 'Incidents', 'Resolved'],
            ...reportData.incidentsTrend.map((trend => [
              trend.month,
              trend.incidents,
              trend.resolved
            ])))
          ]
        },
        {
          name: 'Patrols',
          data: [
            ['Location', 'Completed', 'Scheduled'],
            ...reportData.patrolMetrics.map((patrol: any) => [
              patrol.location,
              patrol.completed,
              patrol.scheduled
            ])
          ]
        },
        {
          name: 'Visitors',
          data: [
            ['Day', 'Visitors'],
            ...reportData.visitorStats.map(stat => [
              stat.day,
              stat.visitors
            ])
          ]
        },
        {
          name: 'Incident Details',
          data: [
            ['Date', 'Type', 'Severity', 'Status', 'Description', 'Location'],
            ...incidents.map(incident => [
              format(new Date(incident.created_at), 'MMM d, yyyy h:mm a'),
              incident.incident_type?.replace(/_/g, ' ') || 'Unknown',
              incident.severity || 'N/A',
              incident.status || 'N/A',
              incident.description || '',
              incident.location || 'N/A'
            ])
          ]
        }
      ];

      exportMultipleSheets(
        sheets,
        `security-report-${format(new Date(), 'yyyy-MM-dd')}.xlsx`
      );

      toast({
        title: "Export Complete",
        description: "Security report has been exported to Excel successfully",
      });
    } catch (error) {
      console.error('Error exporting report:', error);
      toast({
        title: "Export Failed",
        description: "Failed to export report. Please try again.",
        variant: "destructive"
      });
    }
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
            <div className="text-2xl font-bold">{loading ? '...' : reportData.totalIncidents}</div>
            <p className="text-xs text-muted-foreground">
              {dateRange ? 'Selected period' : 'This month'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Patrols Completed</CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? '...' : reportData.patrolsCompleted}</div>
            <p className="text-xs text-muted-foreground">of 125 scheduled</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Visitors</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? '...' : reportData.totalVisitors}</div>
            <p className="text-xs text-muted-foreground">Today</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Response Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? '...' : `${reportData.responseTime}h`}
            </div>
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
            {loading ? (
              <div className="flex items-center justify-center h-[300px]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : reportData.incidentsByType.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={reportData.incidentsByType}
                    dataKey="count"
                    nameKey="type"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={({ type, count }) => `${type}: ${count}`}
                  >
                    {reportData.incidentsByType.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                No incidents data available
              </div>
            )}
          </CardContent>
        </Card>

        {/* Incidents Trend */}
        <Card>
          <CardHeader>
            <CardTitle>Incident Trends</CardTitle>
            <CardDescription>Monthly incident reporting and resolution</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center h-[300px]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={reportData.incidentsTrend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="incidents" stroke="#ef4444" strokeWidth={2} />
                  <Line type="monotone" dataKey="resolved" stroke="#22c55e" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            )}
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
              <BarChart data={reportData.patrolMetrics}>
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
            <CardDescription>Daily visitor counts for the past 7 days</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center h-[300px]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={reportData.visitorStats}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="day" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="visitors" fill="#3b82f6" />
                </BarChart>
              </ResponsiveContainer>
            )}
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
                <p className="text-2xl font-bold text-success">
                  {loading ? '...' : `${reportData.totalIncidents > 0 
                    ? Math.round((reportData.totalIncidents - 
                        incidents?.filter(i => i.status === 'open' || i.status === 'investigating').length || 0) 
                        / reportData.totalIncidents * 100) 
                    : 0}%`}
                </p>
                <p className="text-xs text-muted-foreground">
                  {loading ? '...' : `${reportData.totalIncidents - (incidents?.filter(i => i.status === 'open' || i.status === 'investigating').length || 0)} of ${reportData.totalIncidents} incidents resolved`}
                </p>
              </div>
              
              <div className="p-4 border rounded-lg">
                <h4 className="font-medium text-sm text-muted-foreground">Patrol Completion Rate</h4>
                <p className="text-2xl font-bold text-primary">
                  {loading ? '...' : `${patrolStats.completion_rate}%`}
                </p>
                <p className="text-xs text-muted-foreground">
                  {loading ? '...' : `${patrolStats.completed_patrols} of ${patrolStats.total_patrols} patrols completed`}
                </p>
              </div>
              
              <div className="p-4 border rounded-lg">
                <h4 className="font-medium text-sm text-muted-foreground">Average Response Time</h4>
                <p className="text-2xl font-bold text-warning">
                  {loading ? '...' : `${reportData.responseTime}h`}
                </p>
                <p className="text-xs text-muted-foreground">
                  Average time to resolve
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export { SecurityReportsSection };