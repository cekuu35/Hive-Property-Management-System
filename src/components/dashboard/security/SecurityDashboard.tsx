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
import { VisitorHistorySection } from './VisitorHistorySection';

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

  // Role verification
  if (profile && profile.role !== 'security') {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Shield className="h-12 w-12 text-destructive mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-foreground mb-2">Access Denied</h2>
          <p className="text-muted-foreground">You do not have permission to access the security portal.</p>
        </div>
      </div>
    );
  }

  useEffect(() => {
    if (profile?.id) {
      fetchDashboardData();
    }
  }, [profile?.id]);

  // Handle different sections - connect to your existing components
  if (activeSection === 'visitors') {
    return <VisitorsSection />;
  }
  
  if (activeSection === 'visitor-history') {
    return <VisitorHistorySection />;
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
        const { data: assignments, error: assignmentsError } = await supabase
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

        if (assignmentsError) {
          throw assignmentsError;
        }

        // Get assigned properties
        interface AssignmentData {
          property: {
            id: string;
            name: string;
            address: string;
            total_units: number;
          };
        }

        const propertyList: AssignedProperty[] = (assignments as AssignmentData[])?.map((a) => ({
          id: a.property.id,
          name: a.property.name,
          address: a.property.address,
          total_units: a.property.total_units,
          occupied_units: 0
        })) || [];

        // Calculate occupied units for each property
        if (propertyList.length > 0) {
          for (const property of propertyList) {
            const { count } = await supabase
              .from('leases')
              .select('*', { count: 'exact', head: true })
              .eq('status', 'active')
              .in('unit_id', 
                (await supabase
                  .from('units')
                  .select('id')
                  .eq('property_id', property.id)
                ).data?.map(u => u.id) || []
              );
            property.occupied_units = count || 0;
          }
        }
        
        properties = propertyList;
      } catch (error) {
        console.error('Staff assignments table not found or error fetching assignments:', error);
        // Security: Don't show any properties if assignments can't be verified
        properties = [];
        toast({
          title: 'Property Assignments Not Configured',
          description: 'Please contact your administrator to configure property assignments.',
          variant: 'destructive'
        });
      }

      setAssignedProperties(properties);

      // Fetch recent security logs (filtered by assigned properties)
      let logs: SecurityLog[] = [];
      
      if (properties.length > 0) {
        const propertyIds = properties.map(p => p.id);
        const { data: logsData } = await supabase
          .from('security_logs')
          .select('*')
          .in('property_id', propertyIds)
          .order('created_at', { ascending: false })
          .limit(10);
        
        logs = logsData || [];
      }

      setRecentLogs(logs);

      // Fetch pending visitor requests (filtered by assigned properties)
      let visitorRequests: VisitorRequest[] = [];
      
      try {
        if (properties.length > 0) {
          const propertyIds = properties.map(p => p.id);
          
          // Fetch visitor requests with unit data, filter by property
          const { data: visitors, error } = await supabase
            .from('visitor_requests')
            .select(`
              *,
              unit:units!visitor_requests_unit_id_fkey(
                id,
                unit_number,
                property_id
              )
            `)
            .in('status', ['pending', 'approved'])
            .order('created_at', { ascending: false })
            .limit(50); // Fetch more, then filter client-side
          
          if (error) {
            console.warn('Error fetching visitor requests:', error);
          } else if (visitors) {
            // Filter client-side by property_id to avoid URL length issues
            interface VisitorData {
              id: string;
              visitor_name: string;
              visitor_phone?: string;
              purpose: string;
              status: string;
              created_at: string;
              unit?: {
                id: string;
                unit_number: string;
                property_id: string;
              };
            }

            visitorRequests = (visitors as VisitorData[])
              .filter((v) => v.unit && propertyIds.includes(v.unit.property_id))
              .slice(0, 10) // Limit to 10 after filtering
              .map((v) => ({
                id: v.id,
                visitor_name: v.visitor_name,
                visitor_phone: v.visitor_phone || '',
                unit_number: v.unit?.unit_number || 'N/A',
                purpose: v.purpose,
                status: v.status,
                created_at: v.created_at
              }));
          }
        }
      } catch (error) {
        console.warn('Error fetching visitor requests:', error);
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

      {/* Quick Actions */}
      {assignedProperties.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Button 
            onClick={() => onSectionChange?.('visitors')}
            className="w-full h-auto flex flex-col items-center gap-2 p-6"
            variant="outline"
          >
            <Plus className="h-6 w-6" />
            <div className="text-center">
              <p className="font-semibold">Register Visitor</p>
              <p className="text-xs text-muted-foreground">Quick visitor check-in</p>
            </div>
          </Button>
          <Button 
            onClick={() => onSectionChange?.('incidents')}
            className="w-full h-auto flex flex-col items-center gap-2 p-6"
            variant="outline"
          >
            <AlertTriangle className="h-6 w-6" />
            <div className="text-center">
              <p className="font-semibold">Report Incident</p>
              <p className="text-xs text-muted-foreground">Log security issue</p>
            </div>
          </Button>
          <Button 
            onClick={() => onSectionChange?.('patrols')}
            className="w-full h-auto flex flex-col items-center gap-2 p-6"
            variant="outline"
          >
            <MapPin className="h-6 w-6" />
            <div className="text-center">
              <p className="font-semibold">Start Patrol</p>
              <p className="text-xs text-muted-foreground">Begin security round</p>
            </div>
          </Button>
        </div>
      )}

      {/* Empty State - No Assigned Properties */}
      {assignedProperties.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Building className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">No Properties Assigned</h3>
            <p className="text-muted-foreground text-center mb-4 max-w-md">
              You haven't been assigned to any properties yet. Please contact your administrator to configure your property assignments.
            </p>
            <Badge variant="outline" className="mb-2">
              <Shield className="w-3 h-3 mr-1" />
              Security Personnel
            </Badge>
            <p className="text-sm text-muted-foreground mt-4">
              Once assigned, you'll be able to:
            </p>
            <ul className="text-sm text-muted-foreground mt-2 space-y-1">
              <li>• Manage visitor access and registrations</li>
              <li>• Report and track security incidents</li>
              <li>• Conduct and log security patrols</li>
              <li>• View security reports and analytics</li>
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Stats Cards */}
      {assignedProperties.length > 0 && (
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
      )}

      {/* Main Content - Only show if properties are assigned */}
      {assignedProperties.length > 0 && (
      <>
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
      </>
      )}
    </div>
  );
};