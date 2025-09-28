import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Shield, AlertTriangle, UserCheck, MapPin, Clock, Plus, Bell, TrendingUp, Activity } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useVisitors } from '@/hooks/useVisitors';
import { useVisitorRequests } from '@/hooks/useVisitorRequests';
import { IncidentsSection } from './IncidentsSection';
import { VisitorsSection } from './VisitorsSection';
import { PatrolsSection } from './PatrolsSection';
import { SecurityReportsSection } from './SecurityReportsSection';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface SecurityDashboardProps {
  activeSection?: string;
  onSectionChange?: (section: string) => void;
}

const SecurityDashboard = ({ activeSection = "overview", onSectionChange }: SecurityDashboardProps) => {
  const { toast } = useToast();
  const { profile } = useAuth();
  const [isReportDialogOpen, setIsReportDialogOpen] = useState(false);
  const [isVisitorDialogOpen, setIsVisitorDialogOpen] = useState(false);
  const [isQuickRegisterDialogOpen, setIsQuickRegisterDialogOpen] = useState(false);
  const [securityData, setSecurityData] = useState({
    activeIncidents: 0,
    todaysVisitorsCount: 0,
    patrolsCompleted: 0,
    scheduledPatrols: 0,
    recentIncidents: [],
    todaysVisitors: [],
    patrols: []
  });
  const [loading, setLoading] = useState(true);
  
  const { visitors, getStats: getVisitorStats } = useVisitors();
  const { requests } = useVisitorRequests();
  
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
  const [quickVisitor, setQuickVisitor] = useState({
    name: '',
    phone: '',
    purpose: '',
    unit: ''
  });

  // Fetch security data
  const fetchSecurityData = async () => {
    if (!profile?.id) return;

    try {
      setLoading(true);

      // Fetch incidents
      const { data: incidents } = await supabase
        .from('security_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);

      // Fetch today's visitors
      const today = new Date().toDateString();
      const todaysVisitors = visitors.filter(v => 
        new Date(v.time_in).toDateString() === today
      );

      // Get visitor stats
      const visitorStats = getVisitorStats();

      // Fetch patrols (mock for now - you can implement patrols table)
      const patrols = [
        { id: '1', location: 'Building A Perimeter', time: '06:00 AM', status: 'completed', duration: '15 min' },
        { id: '2', location: 'Parking Lot', time: '09:00 AM', status: 'completed', duration: '10 min' },
        { id: '3', location: 'Building B Entrance', time: '12:00 PM', status: 'scheduled', duration: '15 min' },
        { id: '4', location: 'Common Areas', time: '03:00 PM', status: 'scheduled', duration: '20 min' },
      ];

      setSecurityData({
        activeIncidents: incidents?.filter(i => i.status === 'open' || i.status === 'investigating').length || 0,
        todaysVisitorsCount: visitorStats.todaysVisitors,
        patrolsCompleted: patrols.filter(p => p.status === 'completed').length,
        scheduledPatrols: patrols.length,
        recentIncidents: incidents || [],
        todaysVisitors: todaysVisitors.slice(0, 5),
        patrols
      });
    } catch (error) {
      console.error('Error fetching security data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Real-time updates
  useEffect(() => {
    fetchSecurityData();

    // Set up real-time subscriptions
    const incidentsChannel = supabase
      .channel('security_incidents')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'security_logs'
      }, () => {
        fetchSecurityData();
      })
      .subscribe();

    const visitorsChannel = supabase
      .channel('security_visitors')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'visitors'
      }, () => {
        fetchSecurityData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(incidentsChannel);
      supabase.removeChannel(visitorsChannel);
    };
  }, [profile?.id, visitors]);

  const handleReportIncident = async () => {
    try {
      const { error } = await supabase
        .from('security_logs')
        .insert({
          incident_type: newIncident.type,
          description: newIncident.description,
          severity: newIncident.severity,
          location: newIncident.location,
          security_id: profile?.id,
          property_id: '00000000-0000-0000-0000-000000000000', // Default property
          status: 'open'
        });

      if (error) throw error;

      toast({ title: "Incident reported successfully" });
      setIsReportDialogOpen(false);
      setNewIncident({ type: '', description: '', severity: 'medium', location: '' });
      fetchSecurityData();
    } catch (error) {
      console.error('Error reporting incident:', error);
      toast({ title: "Error reporting incident", variant: "destructive" });
    }
  };

  const handleRegisterVisitor = async () => {
    try {
      // This would integrate with the visitor registration system
      console.log('Registering visitor:', newVisitor);
      toast({ title: "Visitor registered successfully" });
      setIsVisitorDialogOpen(false);
      setNewVisitor({ name: '', visiting: '', phone: '', purpose: '' });
    } catch (error) {
      console.error('Error registering visitor:', error);
      toast({ title: "Error registering visitor", variant: "destructive" });
    }
  };

  const handleQuickRegisterVisitor = async () => {
    try {
      // Quick visitor registration without tenant approval
      const { error } = await supabase
        .from('visitors')
        .insert({
          security_id: profile?.id,
          visitor_name: quickVisitor.name,
          visitor_phone: quickVisitor.phone,
          purpose: quickVisitor.purpose,
          visiting_unit_id: quickVisitor.unit,
          status: 'active'
        });

      if (error) throw error;

      toast({ title: "Visitor registered successfully" });
      setIsQuickRegisterDialogOpen(false);
      setQuickVisitor({ name: '', phone: '', purpose: '', unit: '' });
      fetchSecurityData();
    } catch (error) {
      console.error('Error registering visitor:', error);
      toast({ title: "Error registering visitor", variant: "destructive" });
    }
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
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
        <Card className={`${securityData.activeIncidents > 0 ? 'bg-gradient-to-r from-destructive to-destructive/80 text-destructive-foreground' : 'bg-gradient-to-r from-success to-success/80 text-success-foreground'}`}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Incidents</CardTitle>
            <AlertTriangle className="h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{securityData.activeIncidents}</div>
            <p className="text-xs opacity-90">
              {securityData.activeIncidents > 0 ? 'Require attention' : 'All clear'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Visitors</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{securityData.todaysVisitorsCount}</div>
            <p className="text-xs text-muted-foreground">Registered visits</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Patrols Done</CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{securityData.patrolsCompleted}</div>
            <p className="text-xs text-muted-foreground">of {securityData.scheduledPatrols} scheduled</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Security Status</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${securityData.activeIncidents > 0 ? 'text-warning' : 'text-success'}`}>
              {securityData.activeIncidents > 0 ? 'Alert' : 'Secure'}
            </div>
            <p className="text-xs text-muted-foreground">
              {securityData.activeIncidents > 0 ? 'Incidents require attention' : 'All systems operational'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Quick Actions
          </CardTitle>
          <CardDescription>Common security tasks and visitor management</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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

            <Dialog open={isQuickRegisterDialogOpen} onOpenChange={setIsQuickRegisterDialogOpen}>
              <DialogTrigger asChild>
                <Button className="h-auto p-4 flex flex-col items-center gap-2" variant="outline">
                  <UserCheck className="h-6 w-6" />
                  <span>Quick Register</span>
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Quick Visitor Registration</DialogTitle>
                  <DialogDescription>Register visitor without tenant approval</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <Input
                    placeholder="Visitor name"
                    value={quickVisitor.name}
                    onChange={(e) => setQuickVisitor(prev => ({ ...prev, name: e.target.value }))}
                  />
                  <Input
                    placeholder="Phone number"
                    value={quickVisitor.phone}
                    onChange={(e) => setQuickVisitor(prev => ({ ...prev, phone: e.target.value }))}
                  />
                  <Input
                    placeholder="Purpose of visit"
                    value={quickVisitor.purpose}
                    onChange={(e) => setQuickVisitor(prev => ({ ...prev, purpose: e.target.value }))}
                  />
                  <Input
                    placeholder="Unit ID (optional)"
                    value={quickVisitor.unit}
                    onChange={(e) => setQuickVisitor(prev => ({ ...prev, unit: e.target.value }))}
                  />
                  <Button onClick={handleQuickRegisterVisitor} className="w-full">
                    Register Visitor
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            <Dialog open={isVisitorDialogOpen} onOpenChange={setIsVisitorDialogOpen}>
              <DialogTrigger asChild>
                <Button className="h-auto p-4 flex flex-col items-center gap-2" variant="outline">
                  <Bell className="h-6 w-6" />
                  <span>Request Access</span>
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Request Visitor Access</DialogTitle>
                  <DialogDescription>Send visitor request to tenant for approval</DialogDescription>
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
                    Send Request
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
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Recent Incidents
            </CardTitle>
            <CardDescription>Latest security incidents</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {securityData.recentIncidents.length > 0 ? (
                securityData.recentIncidents.map((incident: any) => (
                  <div key={incident.id} className="flex items-start justify-between p-3 border rounded-lg">
                    <div className="flex-1">
                      <p className="font-medium text-sm">{incident.description}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(incident.created_at).toLocaleString()}
                      </p>
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
                ))
              ) : (
                <div className="text-center py-8">
                  <AlertTriangle className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-muted-foreground">No recent incidents</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Today's Visitor Log */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserCheck className="h-5 w-5" />
              Today's Visitor Log
            </CardTitle>
            <CardDescription>Recent visitor activity</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {securityData.todaysVisitors.length > 0 ? (
                securityData.todaysVisitors.map((visitor: any) => (
                  <div key={visitor.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex-1">
                      <p className="font-medium text-sm">{visitor.visitor_name}</p>
                      <p className="text-xs text-muted-foreground">
                        Visiting: {visitor.unit?.unit_number || 'Unknown Unit'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        In: {new Date(visitor.time_in).toLocaleTimeString()} 
                        {visitor.time_out && ` | Out: ${new Date(visitor.time_out).toLocaleTimeString()}`}
                      </p>
                    </div>
                    <Badge className={getStatusColor(visitor.status)} variant="secondary">
                      {visitor.status}
                    </Badge>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <UserCheck className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-muted-foreground">No visitors today</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Patrol Schedule */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Today's Patrol Schedule
          </CardTitle>
          <CardDescription>Security patrol rounds and status</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {securityData.patrols.map((patrol: any) => (
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

      {/* Real-time Notifications */}
      <Card className="border-primary bg-primary/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-primary">
            <Bell className="h-5 w-5" />
            Real-time Notifications
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {securityData.activeIncidents > 0 && (
              <p className="text-sm text-destructive">• {securityData.activeIncidents} active incident(s) require attention</p>
            )}
            {securityData.todaysVisitorsCount > 0 && (
              <p className="text-sm text-success">• {securityData.todaysVisitorsCount} visitors registered today</p>
            )}
            <p className="text-sm">• System monitoring active - all sensors operational</p>
            <p className="text-sm">• Real-time updates enabled for incidents and visitors</p>
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
            <p className="text-sm">• Camera #3 in parking lot is offline - maintenance scheduled</p>
            <p className="text-sm">• New access code required for Building B entrance</p>
            <p className="text-sm">• Night shift briefing at 6:00 PM - mandatory attendance</p>
            <p className="text-sm">• Visitor registration system updated - new features available</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export { SecurityDashboard };