import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertTriangle, Plus, Eye, Edit, Building } from 'lucide-react';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useCaretakerProperties } from '@/hooks/useCaretakerProperties';

interface Incident {
  id: string;
  incident_type: string;
  description: string;
  severity: string;
  status: string;
  location?: string;
  property_id?: string;
  created_at: string;
  resolved_date?: string;
  property?: {
    name: string;
  };
}

export const IncidentsSection = () => {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newIncident, setNewIncident] = useState({
    incident_type: '',
    description: '',
    severity: 'medium',
    location: '',
    property_id: ''
  });
  const { toast } = useToast();
  const { properties } = useCaretakerProperties();

  useEffect(() => {
    fetchIncidents();
    
    // Real-time subscription
    const channel = supabase
      .channel('security_logs_changes')
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
      console.log('[IncidentsSection] Fetching incidents...');
      const { data, error } = await supabase
        .from('security_logs')
        .select(`
          *,
          property:properties(name)
        `)
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('[IncidentsSection] Error fetching:', error);
        throw error;
      }
      
      console.log('[IncidentsSection] Fetched incidents:', data?.length || 0, data);
      setIncidents(data || []);
    } catch (error) {
      console.error('[IncidentsSection] Error fetching incidents:', error);
      toast({
        title: "Error",
        description: "Failed to load incidents",
        variant: "destructive"
      });
    }
  };

  const createIncident = async () => {
    if (!newIncident.property_id) {
      toast({ 
        title: "Property Required", 
        description: "Please select a property for this incident",
        variant: "destructive" 
      });
      return;
    }

    if (!newIncident.incident_type || !newIncident.description) {
      toast({ 
        title: "Missing Information", 
        description: "Please fill in all required fields",
        variant: "destructive" 
      });
      return;
    }

    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
        .single();

      const { error } = await supabase
        .from('security_logs')
        .insert({
          incident_type: newIncident.incident_type,
          description: newIncident.description,
          severity: newIncident.severity,
          location: newIncident.location,
          property_id: newIncident.property_id,
          security_id: profile?.id,
          status: 'open'
        });

      if (error) throw error;
      
      toast({ title: "Incident reported successfully" });
      setIsCreateDialogOpen(false);
      setNewIncident({ incident_type: '', description: '', severity: 'medium', location: '', property_id: '' });
    } catch (error) {
      console.error('Error creating incident:', error);
      toast({ title: "Error reporting incident", variant: "destructive" });
    }
  };

  const updateIncidentStatus = async (id: string, status: string) => {
    try {
      const { error } = await supabase
        .from('security_logs')
        .update({ 
          status,
          resolved_date: status === 'resolved' ? new Date().toISOString().split('T')[0] : null
        })
        .eq('id', id);

      if (error) throw error;
      toast({ title: `Incident ${status}` });
    } catch (error) {
      console.error('Error updating incident:', error);
      toast({ title: "Error updating incident", variant: "destructive" });
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'bg-destructive text-destructive-foreground';
      case 'medium': return 'bg-warning text-warning-foreground';
      case 'low': return 'bg-success text-success-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'bg-destructive text-destructive-foreground';
      case 'investigating': return 'bg-warning text-warning-foreground';
      case 'resolved': return 'bg-success text-success-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Security Incidents</h1>
          <p className="text-muted-foreground">Manage and track security incidents</p>
        </div>
        
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Report Incident
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Report New Incident</DialogTitle>
              <DialogDescription>Provide details about the security incident</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="property">Property *</Label>
                <Select value={newIncident.property_id} onValueChange={(value) => 
                  setNewIncident(prev => ({ ...prev, property_id: value }))
                }>
                  <SelectTrigger>
                    <SelectValue placeholder="Select property" />
                  </SelectTrigger>
                  <SelectContent>
                    {properties.map((property) => (
                      <SelectItem key={property.id} value={property.id}>
                        <div className="flex items-center gap-2">
                          <Building className="w-4 h-4" />
                          {property.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="incident_type">Incident Type *</Label>
                <Select value={newIncident.incident_type} onValueChange={(value) => 
                  setNewIncident(prev => ({ ...prev, incident_type: value }))
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
                    <SelectItem value="equipment_failure">Equipment Failure</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  placeholder="Specific location (e.g., Lobby, Parking Lot B)"
                  value={newIncident.location}
                  onChange={(e) => setNewIncident(prev => ({ ...prev, location: e.target.value }))}
                />
              </div>

              <div>
                <Label htmlFor="severity">Severity *</Label>
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
              </div>

              <div>
                <Label htmlFor="description">Description *</Label>
                <Textarea
                  id="description"
                  placeholder="Detailed description of the incident"
                  value={newIncident.description}
                  onChange={(e) => setNewIncident(prev => ({ ...prev, description: e.target.value }))}
                />
              </div>

              <Button onClick={createIncident} className="w-full">
                Report Incident
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {incidents.map((incident) => (
          <Card key={incident.id}>
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="h-4 w-4 text-warning" />
                    <h3 className="font-medium capitalize">{incident.incident_type.replace(/_/g, ' ')}</h3>
                    <Badge className={getSeverityColor(incident.severity)}>
                      {incident.severity}
                    </Badge>
                    <Badge className={getStatusColor(incident.status)}>
                      {incident.status}
                    </Badge>
                    {incident.property && (
                      <Badge variant="outline">
                        <Building className="w-3 h-3 mr-1" />
                        {incident.property.name}
                      </Badge>
                    )}
                  </div>
                  
                  <p className="text-sm text-muted-foreground mb-2">{incident.description}</p>
                  
                  {incident.location && (
                    <p className="text-xs text-muted-foreground">Location: {incident.location}</p>
                  )}
                  
                  <p className="text-xs text-muted-foreground">
                    Reported: {new Date(incident.created_at).toLocaleString()}
                  </p>
                  
                  {incident.resolved_date && (
                    <p className="text-xs text-muted-foreground">
                      Resolved: {new Date(incident.resolved_date).toLocaleString()}
                    </p>
                  )}
                </div>
                
                <div className="flex gap-2">
                  {incident.status === 'open' && (
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => updateIncidentStatus(incident.id, 'investigating')}
                    >
                      Investigate
                    </Button>
                  )}
                  {incident.status === 'investigating' && (
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => updateIncidentStatus(incident.id, 'resolved')}
                    >
                      Resolve
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        
        {incidents.length === 0 && (
          <Card>
            <CardContent className="p-6 text-center">
              <AlertTriangle className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-muted-foreground">No incidents reported</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};