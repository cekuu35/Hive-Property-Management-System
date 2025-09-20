import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useMaintenanceRequests } from '@/hooks/useMaintenanceRequests';
import { FileText, Download, Calendar, TrendingUp, Clock, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface DailyReport {
  id: string;
  date: string;
  tasksCompleted: number;
  hoursWorked: number;
  notes: string;
  issues?: string;
}

export const ReportsSection = () => {
  const { toast } = useToast();
  const { requests, getStats } = useMaintenanceRequests();
  const [isReportDialogOpen, setIsReportDialogOpen] = useState(false);
  const [reportType, setReportType] = useState('daily');
  const [reportNotes, setReportNotes] = useState('');
  const [hoursWorked, setHoursWorked] = useState('');
  const [issues, setIssues] = useState('');
  const [dailyReports, setDailyReports] = useState<DailyReport[]>([
    { id: '1', date: '2024-01-14', tasksCompleted: 3, hoursWorked: 8, notes: 'Completed AC maintenance and plumbing repairs. All tasks finished on schedule.' },
    { id: '2', date: '2024-01-13', tasksCompleted: 2, hoursWorked: 6, notes: 'Fixed lighting issues in Building A. Minor delay due to parts availability.' },
    { id: '3', date: '2024-01-12', tasksCompleted: 4, hoursWorked: 8, notes: 'Regular maintenance rounds completed. Identified potential issue with heating system in Unit 2B.' },
  ]);

  const stats = getStats();

  const todayCompleted = requests.filter(req => 
    req.status === 'completed' && 
    new Date(req.completedDate || '').toDateString() === new Date().toDateString()
  ).length;

  const thisWeekCompleted = requests.filter(req => {
    if (!req.completedDate) return false;
    const completedDate = new Date(req.completedDate);
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    return completedDate >= weekAgo && req.status === 'completed';
  }).length;

  const averageCompletionTime = requests
    .filter(req => req.status === 'completed' && req.createdDate && req.completedDate)
    .reduce((acc, req) => {
      const created = new Date(req.createdDate);
      const completed = new Date(req.completedDate!);
      const hours = Math.abs(completed.getTime() - created.getTime()) / (1000 * 60 * 60);
      return acc + hours;
    }, 0) / Math.max(stats.completed, 1);

  const submitDailyReport = () => {
    if (!reportNotes.trim() || !hoursWorked) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    const newReport: DailyReport = {
      id: Date.now().toString(),
      date: new Date().toISOString().split('T')[0],
      tasksCompleted: todayCompleted,
      hoursWorked: Number(hoursWorked),
      notes: reportNotes,
      issues: issues || undefined,
    };

    setDailyReports(prev => [newReport, ...prev]);
    setReportNotes('');
    setHoursWorked('');
    setIssues('');
    setIsReportDialogOpen(false);

    toast({
      title: "Report Submitted",
      description: "Your daily report has been submitted successfully",
    });
  };

  const exportReport = (type: string) => {
    toast({
      title: "Export Started",
      description: `Exporting ${type} report...`,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Reports & Analytics</h1>
          <p className="text-muted-foreground">Track performance and submit work reports</p>
        </div>
        <Dialog open={isReportDialogOpen} onOpenChange={setIsReportDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <FileText className="h-4 w-4 mr-2" />
              Submit Report
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Submit Daily Report</DialogTitle>
              <DialogDescription>
                Document your work activities for today
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="hours">Hours Worked</Label>
                <Input
                  id="hours"
                  type="number"
                  value={hoursWorked}
                  onChange={(e) => setHoursWorked(e.target.value)}
                  placeholder="8"
                  min="0"
                  max="24"
                  step="0.5"
                />
              </div>
              <div>
                <Label htmlFor="notes">Work Summary</Label>
                <Textarea
                  id="notes"
                  value={reportNotes}
                  onChange={(e) => setReportNotes(e.target.value)}
                  placeholder="Describe the work completed today..."
                  rows={3}
                />
              </div>
              <div>
                <Label htmlFor="issues">Issues/Concerns (Optional)</Label>
                <Textarea
                  id="issues"
                  value={issues}
                  onChange={(e) => setIssues(e.target.value)}
                  placeholder="Any issues or concerns to report..."
                  rows={2}
                />
              </div>
              <Button onClick={submitDailyReport} className="w-full">
                Submit Report
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed Today</CardTitle>
            <CheckCircle className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{todayCompleted}</div>
            <p className="text-xs text-muted-foreground">Tasks finished</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Week</CardTitle>
            <Calendar className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{thisWeekCompleted}</div>
            <p className="text-xs text-muted-foreground">Tasks completed</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Completion</CardTitle>
            <Clock className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Math.round(averageCompletionTime)}h</div>
            <p className="text-xs text-muted-foreground">Per task</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Completed</CardTitle>
            <TrendingUp className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.completed}</div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>
      </div>

      {/* Export Options */}
      <Card>
        <CardHeader>
          <CardTitle>Export Reports</CardTitle>
          <CardDescription>Download work reports in various formats</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Button 
              onClick={() => exportReport('daily')}
              variant="outline" 
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Daily Reports
            </Button>
            <Button 
              onClick={() => exportReport('weekly')}
              variant="outline" 
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Weekly Summary
            </Button>
            <Button 
              onClick={() => exportReport('monthly')}
              variant="outline" 
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Monthly Report
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Recent Reports */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Daily Reports</CardTitle>
          <CardDescription>Your submitted work reports</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {dailyReports.map((report) => (
              <div key={report.id} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold">{new Date(report.date).toLocaleDateString()}</h4>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span>{report.tasksCompleted} tasks</span>
                    <span>{report.hoursWorked}h worked</span>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground mb-2">{report.notes}</p>
                {report.issues && (
                  <div className="text-sm">
                    <span className="text-warning font-medium">Issues: </span>
                    <span>{report.issues}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};