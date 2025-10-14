import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Shield, 
  Building, 
  Users, 
  AlertTriangle, 
  CheckCircle, 
  Clock,
  Eye,
  Plus,
  Calendar,
  MapPin
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { VisitorsSection } from './VisitorsSection';
import { IncidentsSection } from './IncidentsSection';
import { PatrolsSection } from './PatrolsSection';
import { SecurityReportsSection } from './SecurityReportsSection';
import { SettingsSection } from './SettingsSection';

interface SecurityDashboardProps {
  className?: string;
  activeSection?: string;
  onSectionChange?: (section: string) => void;
}

interface AssignedProperty {
  id: string;
  name: string;
  address: string;
  total_units: number;
  occupied_units: number;
}

interface SecurityLog {
  id: string;
  incident_type: string;
  description: string;
  severity: string;
  status: string;
  location: string;
  created_at: string;
}

interface VisitorRequest {
  id: string;
  visitor_name: string;
  visitor_phone: string;
  unit_number: string;
  purpose: string;
  status: string;
  created_at: string;
}

export const SecurityDashboard: React.FC<SecurityDashboardProps> = ({ className, activeSection = 'overview', onSectionChange }) => {
  const [assignedProperties, setAssignedProperties] = useState<AssignedProperty[]>([]);
  const [recentLogs, setRecentLogs] = useState<SecurityLog[]>([]);
  const [pendingVisitors, setPendingVisitors] = useState<VisitorRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const { profile } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (profile?.id) {
      fetchDashboardData();
    }
  }, [profile?.id]);

  // Handle different sections - connect to your existing components
  if (activeSection === 'visitors') {
    return <VisitorsSection />;
  }
  
  if (activeSection === 'incidents') {
    return <IncidentsSection />;
  }
  
  if (activeSection === 'patrols') {
    return <PatrolsSection />;
  }
  
  if (activeSection === 'reports') {
    return <SecurityReportsSection />;
  }
  
  if (activeSection === 'settings') {
    return <SettingsSection />;
  }

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      // Fetch assigned properties (if staff_assignments table exists)
      let properties: AssignedProperty[] = [];
      
      try {
        const { data: assignments } = await (supabase as any)
          .from('staff_assignments')
          .select(`
            property:properties!staff_assignments_property_id_fkey (
              id,
              name,
              address,
              total_units
            )
          `)
          .eq('staff_id', profile.id)
          .eq('role', 'security')
          .eq('is_active', true);

        properties = assignments?.map((a: any) => ({
          id: a.property.id,
          name: a.property.name,
          address: a.property.address,
          total_units: a.property.total_units,
          occupied_units: 0 // This would need to be calculated
        })) || [];
      } catch (error) {
        console.warn('staff_assignments table not found, using fallback data');
        // Fallback: show all properties for soft landing during development
        const { data: allProperties } = await supabase
          .from('properties')
          .select('id, name, address, total_units')
          .order('name', { ascending: true }); // Show all properties, sorted by name

        properties = allProperties?.map(p => ({
          id: p.id,
          name: p.name,
          address: p.address,
          total_units: p.total_units,
          occupied_units: 0
        })) || [];
      }

      setAssignedProperties(properties);

      // Fetch recent security logs
      const { data: logs } = await supabase
        .from('security_logs')
        .select('*')
        .eq('security_id', profile.id)
        .order('created_at', { ascending: false })
        .limit(5);

      setRecentLogs(logs || []);

      // Fetch pending visitor requests
      let visitorRequests: VisitorRequest[] = [];
      
      try {
        const { data: visitors } = await supabase
          .from('visitor_requests')
          .select('*')
          .in('status', ['pending', 'approved'])
          .order('created_at', { ascending: false })
          .limit(10);

        visitorRequests = visitors?.map((v: any) => ({
          id: v.id,
          visitor_name: v.visitor_name,
          visitor_phone: v.visitor_phone || '',
          unit_number: 'N/A', // Will be populated by the proper visitor management component
          purpose: v.purpose,
          status: v.status,
          created_at: v.created_at
        })) || [];
      } catch (error) {
        console.warn('visitor_requests table not found or has different structure');
        // Fallback: show empty array
        visitorRequests = [];
      }

      setPendingVisitors(visitorRequests);

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load dashboard data',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'destructive';
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low': return 'secondary';
      default: return 'secondary';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'destructive';
      case 'investigating': return 'default';
      case 'resolved': return 'secondary';
      case 'closed': return 'outline';
      default: return 'secondary';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-sm text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
      <div>
          <h1 className="text-3xl font-bold tracking-tight">Security Dashboard</h1>
          <p className="text-muted-foreground">
            Monitor security activities and manage visitor access
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="flex items-center gap-1">
            <Shield className="w-3 h-3" />
            Security Personnel
          </Badge>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Assigned Properties</CardTitle>
            <Building className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{assignedProperties.length}</div>
            <p className="text-xs text-muted-foreground">
              Properties under your watch
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Open Incidents</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {recentLogs.filter(log => log.status === 'open').length}
            </div>
            <p className="text-xs text-muted-foreground">
              Active security incidents
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Visitors</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {pendingVisitors.filter(v => v.status === 'pending').length}
            </div>
            <p className="text-xs text-muted-foreground">
              Awaiting approval
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Resolved Today</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {recentLogs.filter(log => 
                log.status === 'resolved' && 
                new Date(log.created_at).toDateString() === new Date().toDateString()
              ).length}
            </div>
            <p className="text-xs text-muted-foreground">
              Incidents resolved today
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Assigned Properties */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building className="w-5 h-5" />
              Assigned Properties
            </CardTitle>
            <CardDescription>
              Properties under your security management
              {assignedProperties.length > 0 && assignedProperties.length > 3 && (
                <span className="text-xs text-blue-600 ml-2">
                  (Showing all properties - staff assignments pending)
                </span>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {assignedProperties.length === 0 ? (
              <div className="text-center py-8">
                <Building className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No properties found</p>
                <p className="text-xs text-muted-foreground mt-2">
                  Properties will appear here once staff assignments are configured
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {assignedProperties.map((property) => (
                  <div key={property.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                        <Building className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <h4 className="font-medium">{property.name}</h4>
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {property.address}
                        </p>
                      </div>
                    </div>
                    <Badge variant="outline">
                      {property.total_units} units
                    </Badge>
                </div>
              ))}
            </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Security Logs */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              Recent Security Logs
            </CardTitle>
            <CardDescription>
              Latest security incidents and activities
            </CardDescription>
          </CardHeader>
          <CardContent>
            {recentLogs.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
                <p className="text-muted-foreground">No recent incidents</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentLogs.map((log) => (
                  <div key={log.id} className="flex items-start gap-3 p-3 border rounded-lg">
                    <div className="w-2 h-2 bg-primary rounded-full mt-2"></div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium capitalize">{log.incident_type}</h4>
                        <Badge variant={getSeverityColor(log.severity)}>
                          {log.severity}
                        </Badge>
                        <Badge variant={getStatusColor(log.status)}>
                          {log.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">{log.description}</p>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {log.location || 'No location'}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatDate(log.created_at)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              )}
          </CardContent>
        </Card>
      </div>

      {/* Pending Visitor Requests */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Pending Visitor Requests
          </CardTitle>
          <CardDescription>
            Visitor access requests requiring your attention
          </CardDescription>
        </CardHeader>
        <CardContent>
          {pendingVisitors.length === 0 ? (
            <div className="text-center py-8">
              <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No pending visitor requests</p>
            </div>
          ) : (
            <div className="space-y-3">
              {pendingVisitors.map((visitor) => (
                <div key={visitor.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                      <Users className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-medium">{visitor.visitor_name}</h4>
                      <p className="text-sm text-muted-foreground">{visitor.visitor_phone}</p>
                      <p className="text-sm text-muted-foreground">Unit {visitor.unit_number} - {visitor.purpose}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={visitor.status === 'pending' ? 'default' : 'secondary'}>
                      {visitor.status}
                    </Badge>
                    <Button size="sm" variant="outline">
                      <Eye className="w-4 h-4 mr-1" />
                      Review
                    </Button>
                  </div>
              </div>
            ))}
          </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};