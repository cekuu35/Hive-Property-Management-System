import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertTriangle, CheckCircle, Clock, TrendingUp, MapPin, Calendar, User, Loader2, Eye } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface Incident {
  id: string;
  incident_type: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: string;
  location?: string;
  created_at: string;
  resolved_at?: string;
  security_id: string;
  property_id: string;
  property?: {
    name: string;
  };
  security?: {
    first_name: string;
    last_name: string;
  };
}

export const IncidentsSection = () => {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchIncidents();
    
    // Real-time subscription
    const channel = supabase
      .channel('landlord_security_logs_changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'security_logs'
      }, () => {
        fetchIncidents();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchIncidents = async () => {
    try {
      setLoading(true);
      console.log('[LandlordIncidentsSection] Fetching incidents...');
      
      const { data, error } = await supabase
        .from('security_logs')
        .select(`
          *,
          property:properties(name),
          security:profiles!security_id(first_name, last_name)
        `)
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('[LandlordIncidentsSection] Error fetching:', error);
        throw error;
      }
      
      console.log('[LandlordIncidentsSection] Fetched incidents:', data?.length || 0, data);
      setIncidents(data || []);
    } catch (error) {
      console.error('[LandlordIncidentsSection] Error fetching incidents:', error);
      toast({
        title: "Error",
        description: "Failed to load incidents",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredIncidents = incidents.filter(incident => {
    if (statusFilter === 'all') return true;
    return incident.status === statusFilter;
  });

  const getStats = () => {
    const total = incidents.length;
    const open = incidents.filter(i => i.status === 'open').length;
    const investigating = incidents.filter(i => i.status === 'investigating').length;
    const resolved = incidents.filter(i => i.status === 'resolved').length;
    const critical = incidents.filter(i => i.severity === 'critical').length;
    
    return { total, open, investigating, resolved, critical };
  };

  const handleViewDetails = (incident: Incident) => {
    setSelectedIncident(incident);
    setIsDetailsOpen(true);
  };

  const stats = getStats();

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-destructive text-destructive-foreground';
      case 'high': return 'bg-destructive/80 text-destructive-foreground';
      case 'medium': return 'bg-warning text-warning-foreground';
      case 'low': return 'bg-muted text-muted-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'bg-destructive text-destructive-foreground';
      case 'investigating': return 'bg-warning text-warning-foreground';
      case 'resolved': return 'bg-success text-success-foreground';
      case 'closed': return 'bg-muted text-muted-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold">Security Incidents</h2>
        <p className="text-muted-foreground">Monitor and manage security incidents across all properties</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Incidents</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Open</p>
                <p className="text-2xl font-bold text-destructive">{stats.open}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-destructive" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Investigating</p>
                <p className="text-2xl font-bold text-warning">{stats.investigating}</p>
              </div>
              <Clock className="h-8 w-8 text-warning" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Resolved</p>
                <p className="text-2xl font-bold text-success">{stats.resolved}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-success" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Critical</p>
                <p className="text-2xl font-bold text-destructive">{stats.critical}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-destructive" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Incidents List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>All Incidents</CardTitle>
              <CardDescription>Security incidents reported across all properties</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={statusFilter} onValueChange={setStatusFilter} className="w-full">
            <TabsList>
              <TabsTrigger value="all">All ({incidents.length})</TabsTrigger>
              <TabsTrigger value="open">Open ({stats.open})</TabsTrigger>
              <TabsTrigger value="investigating">Investigating ({stats.investigating})</TabsTrigger>
              <TabsTrigger value="resolved">Resolved ({stats.resolved})</TabsTrigger>
            </TabsList>

            <TabsContent value={statusFilter} className="space-y-4 mt-4">
              {filteredIncidents.length === 0 ? (
                <Alert>
                  <AlertDescription>
                    No {statusFilter !== 'all' ? statusFilter.replace('_', ' ') : ''} incidents found.
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="space-y-4">
                  {filteredIncidents.map((incident) => (
                    <Card key={incident.id}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 space-y-2">
                            <div className="flex items-center gap-2">
                              <h3 className="font-medium capitalize">{incident.incident_type.replace(/_/g, ' ')}</h3>
                              <Badge className={getSeverityColor(incident.severity)}>
                                {incident.severity}
                              </Badge>
                              <Badge className={getStatusColor(incident.status)}>
                                {incident.status.replace('_', ' ')}
                              </Badge>
                            </div>
                            
                            <p className="text-sm text-muted-foreground line-clamp-2">{incident.description}</p>
                            
                            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                              {incident.property?.name && (
                                <div className="flex items-center gap-1">
                                  <MapPin className="h-4 w-4" />
                                  <span>{incident.property.name}</span>
                                </div>
                              )}
                              
                              {incident.location && (
                                <div className="flex items-center gap-1">
                                  <MapPin className="h-4 w-4" />
                                  <span>{incident.location}</span>
                                </div>
                              )}
                              
                              <div className="flex items-center gap-1">
                                <Calendar className="h-4 w-4" />
                                <span>{format(new Date(incident.created_at), 'PPp')}</span>
                              </div>
                              
                              {incident.security && (
                                <div className="flex items-center gap-1">
                                  <User className="h-4 w-4" />
                                  <span>Reported by: {incident.security.first_name} {incident.security.last_name}</span>
                                </div>
                              )}
                            </div>
                          </div>
                          
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleViewDetails(incident)}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            View Details
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Detailed Incident View Dialog */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Incident Details
            </DialogTitle>
            <DialogDescription>
              Complete information about this security incident
            </DialogDescription>
          </DialogHeader>
          
          {selectedIncident && (
            <div className="space-y-6">
              {/* Status and Severity */}
              <div className="flex gap-4">
                <div className="flex-1">
                  <p className="text-sm font-medium text-muted-foreground mb-1">Status</p>
                  <Badge className={getStatusColor(selectedIncident.status)}>
                    {selectedIncident.status.replace('_', ' ').toUpperCase()}
                  </Badge>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-muted-foreground mb-1">Severity</p>
                  <Badge className={getSeverityColor(selectedIncident.severity)}>
                    {selectedIncident.severity.toUpperCase()}
                  </Badge>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-muted-foreground mb-1">Type</p>
                  <p className="text-sm font-medium capitalize">{selectedIncident.incident_type.replace(/_/g, ' ')}</p>
                </div>
              </div>

              {/* Description */}
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">Description</p>
                <p className="text-sm bg-muted p-3 rounded-md">{selectedIncident.description}</p>
              </div>

              {/* Location */}
              {selectedIncident.location && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-2">Location</p>
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <p className="text-sm">{selectedIncident.location}</p>
                  </div>
                </div>
              )}

              {/* Property */}
              {selectedIncident.property && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-2">Property</p>
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <p className="text-sm font-medium">{selectedIncident.property.name}</p>
                  </div>
                </div>
              )}

              {/* Reporter */}
              {selectedIncident.security && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-2">Reported By</p>
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <p className="text-sm">
                      {selectedIncident.security.first_name} {selectedIncident.security.last_name}
                    </p>
                  </div>
                </div>
              )}

              {/* Timestamps */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-2">Reported On</p>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <p className="text-sm">{format(new Date(selectedIncident.created_at), 'PPpp')}</p>
                  </div>
                </div>
                
                {selectedIncident.resolved_at && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-2">Resolved On</p>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-success" />
                      <p className="text-sm">{format(new Date(selectedIncident.resolved_at), 'PPpp')}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button variant="outline" onClick={() => setIsDetailsOpen(false)}>
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

