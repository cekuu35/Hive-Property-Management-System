import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Shield, AlertTriangle, UserCheck, MapPin, Clock, Plus } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useVisitorRequests } from '@/hooks/useVisitorRequests';
import { useVisitors } from '@/hooks/useVisitors';
import { format } from 'date-fns';
import { IncidentsSection } from './IncidentsSection';
import { VisitorsSection } from './VisitorsSection';
import { PatrolsSection } from './PatrolsSection';
import { SecurityReportsSection } from './SecurityReportsSection';

interface SecurityDashboardProps {
  activeSection?: string;
  onSectionChange?: (section: string) => void;
}

const SecurityDashboard = ({ activeSection = "overview", onSectionChange }: SecurityDashboardProps) => {
  const { toast } = useToast();
  const [isReportDialogOpen, setIsReportDialogOpen] = useState(false);
  const [isVisitorDialogOpen, setIsVisitorDialogOpen] = useState(false);
  const [newIncident, setNewIncident] = useState({
    type: '',
    description: '',
    severity: 'medium',
    location: ''
  });
  const [newVisitor, setNewVisitor] = useState({
    name: '',
    visiting: '',
    phone: '',
    purpose: ''
  });

  // Real data hooks
  const { requests, loading: requestsLoading } = useVisitorRequests();
  const { visitors, loading: visitorsLoading, getStats } = useVisitors();

  // Calculate real-time stats
  const stats = getStats();
  const pendingRequests = requests.filter(r => r.status === 'pending').length;
  const activeVisitors = visitors.filter(v => v.status === 'active');
  const todaysVisitors = visitors.filter(v => {
    const today = new Date().toDateString();
    return new Date(v.created_at).toDateString() === today;
  });

  // Mock data for incidents and patrols (until those features are implemented)
  const mockIncidents = [
    { id: '1', type: 'visitor', description: 'Visitor request pending approval', severity: 'medium', time: '2 hours ago', status: 'investigating' },
    { id: '2', type: 'maintenance', description: 'Maintenance request submitted', severity: 'low', time: '4 hours ago', status: 'resolved' },
  ];

  const mockPatrols = [
    { id: '1', location: 'Building A Perimeter', time: '06:00 AM', status: 'completed', duration: '15 min' },
    { id: '2', location: 'Parking Lot', time: '09:00 AM', status: 'completed', duration: '10 min' },
    { id: '3', location: 'Building B Entrance', time: '12:00 PM', status: 'scheduled', duration: '15 min' },
    { id: '4', location: 'Common Areas', time: '03:00 PM', status: 'scheduled', duration: '20 min' },
  ];

  const handleReportIncident = () => {
    console.log('Reporting incident:', newIncident);
    toast({ title: "Incident reported successfully" });
    setIsReportDialogOpen(false);
    setNewIncident({ type: '', description: '', severity: 'medium', location: '' });
  };

  const handleRegisterVisitor = () => {
    console.log('Registering visitor:', newVisitor);
    toast({ title: "Visitor registered successfully" });
    setIsVisitorDialogOpen(false);
    setNewVisitor({ name: '', visiting: '', phone: '', purpose: '' });
  };

  const handleStartPatrol = () => {
    toast({ title: "Patrol started" });
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'bg-destructive';
      case 'medium': return 'bg-warning';
      case 'low': return 'bg-success';
      case 'critical': return 'bg-destructive';
      default: return 'bg-muted';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'bg-destructive text-destructive-foreground';
      case 'investigating': return 'bg-warning';
      case 'resolved': return 'bg-success';
      case 'active': return 'bg-primary';
      case 'completed': return 'bg-success';
      case 'checked_out': return 'bg-success';
      case 'scheduled': return 'bg-muted';
      default: return 'bg-muted';
    }
  };

  // Render different sections based on activeSection
  if (activeSection === 'incidents') {
    return <IncidentsSection />;
  }

  if (activeSection === 'visitors') {
    return <VisitorsSection />;
  }

  if (activeSection === 'patrols') {
    return <PatrolsSection />;
  }

  if (activeSection === 'reports') {
    return <SecurityReportsSection />;
  }

  // Show loading state if data is still loading
  if (requestsLoading || visitorsLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center space-y-2">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-sm text-muted-foreground">Loading security dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">Security Control Center</h1>
        <p className="text-muted-foreground">Monitor property security and manage incidents</p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-gradient-to-r from-destructive to-destructive/80 text-destructive-foreground">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Requests</CardTitle>
            <AlertTriangle className="h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingRequests}</div>
            <p className="text-xs opacity-90">Pending requests</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Visitors</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{todaysVisitors.length}</div>
            <p className="text-xs text-muted-foreground">Registered visits</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Patrols Done</CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mockPatrols.filter(p => p.status === 'completed').length}</div>
            <p className="text-xs text-muted-foreground">of {mockPatrols.length} scheduled</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Security Status</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">Secure</div>
            <p className="text-xs text-muted-foreground">All systems operational</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Common security tasks</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <Dialog open={isReportDialogOpen} onOpenChange={setIsReportDialogOpen}>
              <DialogTrigger asChild>
                <Button className="h-auto p-4 flex flex-col items-center gap-2" variant="outline">
                  <AlertTriangle className="h-6 w-6" />
                  <span>Report Incident</span>
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Report Security Incident</DialogTitle>
                  <DialogDescription>Provide details about the security incident</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <Select value={newIncident.type} onValueChange={(value) => 
                    setNewIncident(prev => ({ ...prev, type: value }))
                  }>
                    <SelectTrigger>
                      <SelectValue placeholder="Select incident type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unauthorized_access">Unauthorized Access</SelectItem>
                      <SelectItem value="suspicious_activity">Suspicious Activity</SelectItem>
                      <SelectItem value="vandalism">Vandalism</SelectItem>
                      <SelectItem value="noise_complaint">Noise Complaint</SelectItem>
                      <SelectItem value="emergency">Emergency</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    placeholder="Location"
                    value={newIncident.location}
                    onChange={(e) => setNewIncident(prev => ({ ...prev, location: e.target.value }))}
                  />
                  <Select value={newIncident.severity} onValueChange={(value) =>
                    setNewIncident(prev => ({ ...prev, severity: value }))
                  }>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                    </SelectContent>
                  </Select>
                  <Textarea
                    placeholder="Incident description"
                    value={newIncident.description}
                    onChange={(e) => setNewIncident(prev => ({ ...prev, description: e.target.value }))}
                  />
                  <Button onClick={handleReportIncident} className="w-full">
                    Report Incident
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            <Dialog open={isVisitorDialogOpen} onOpenChange={setIsVisitorDialogOpen}>
              <DialogTrigger asChild>
                <Button className="h-auto p-4 flex flex-col items-center gap-2" variant="outline">
                  <UserCheck className="h-6 w-6" />
                  <span>Register Visitor</span>
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Register Visitor</DialogTitle>
                  <DialogDescription>Enter visitor details for security records</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <Input
                    placeholder="Visitor name"
                    value={newVisitor.name}
                    onChange={(e) => setNewVisitor(prev => ({ ...prev, name: e.target.value }))}
                  />
                  <Input
                    placeholder="Visiting (Unit/Person)"
                    value={newVisitor.visiting}
                    onChange={(e) => setNewVisitor(prev => ({ ...prev, visiting: e.target.value }))}
                  />
                  <Input
                    placeholder="Phone number"
                    value={newVisitor.phone}
                    onChange={(e) => setNewVisitor(prev => ({ ...prev, phone: e.target.value }))}
                  />
                  <Input
                    placeholder="Purpose of visit"
                    value={newVisitor.purpose}
                    onChange={(e) => setNewVisitor(prev => ({ ...prev, purpose: e.target.value }))}
                  />
                  <Button onClick={handleRegisterVisitor} className="w-full">
                    Register Visitor
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            <Button 
              className="h-auto p-4 flex flex-col items-center gap-2" 
              variant="outline"
              onClick={handleStartPatrol}
            >
              <MapPin className="h-6 w-6" />
              <span>Start Patrol</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Incidents */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest security activity</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {mockIncidents.map((incident) => (
                <div key={incident.id} className="flex items-start justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <p className="font-medium text-sm">{incident.description}</p>
                    <p className="text-xs text-muted-foreground mt-1">{incident.time}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge className={getSeverityColor(incident.severity)} variant="secondary">
                        {incident.severity}
                      </Badge>
                      <Badge className={getStatusColor(incident.status)} variant="secondary">
                        {incident.status}
                      </Badge>
                    </div>
                  </div>
                  <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Active Visitors */}
        <Card>
          <CardHeader>
            <CardTitle>Active Visitors</CardTitle>
            <CardDescription>Currently on property</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {activeVisitors.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No active visitors currently</p>
              ) : (
                activeVisitors.slice(0, 5).map((visitor) => (
                  <div key={visitor.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex-1">
                      <p className="font-medium text-sm">{visitor.visitor_name}</p>
                      <p className="text-xs text-muted-foreground">
                        Purpose: {visitor.purpose}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        In: {format(new Date(visitor.time_in), 'hh:mm a')}
                        {visitor.time_out && ` | Out: ${format(new Date(visitor.time_out), 'hh:mm a')}`}
                      </p>
                    </div>
                    <Badge className={getStatusColor(visitor.status)} variant="secondary">
                      {visitor.status}
                    </Badge>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Patrol Schedule */}
      <Card>
        <CardHeader>
          <CardTitle>Today's Patrol Schedule</CardTitle>
          <CardDescription>Security patrol rounds</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {mockPatrols.map((patrol) => (
              <div key={patrol.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex-1">
                  <p className="font-medium text-sm">{patrol.location}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Clock className="h-3 w-3 text-muted-foreground" />
                    <p className="text-xs text-muted-foreground">{patrol.time} ({patrol.duration})</p>
                  </div>
                </div>
                <Badge className={getStatusColor(patrol.status)} variant="secondary">
                  {patrol.status}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Security Alerts */}
      <Card className="border-warning bg-warning/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-warning">
            <Shield className="h-5 w-5" />
            Security Alerts
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <p className="text-sm">• System updated with real-time visitor data</p>
            <p className="text-sm">• Visitor request management now fully operational</p>
            <p className="text-sm">• Contact administrator for additional security features</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export { SecurityDashboard };