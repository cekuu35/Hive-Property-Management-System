import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { MapPin, Plus, Clock, CheckCircle, Play, Building } from 'lucide-react';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useSecurityPatrols } from '@/hooks/useSecurityPatrols';
import { useCaretakerProperties } from '@/hooks/useCaretakerProperties';
import { format } from 'date-fns';

export const PatrolsSection = () => {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newPatrol, setNewPatrol] = useState({
    location: '',
    scheduled_time: '',
    duration_minutes: '15',
    property_id: ''
  });
  const { toast } = useToast();
  
  // Use the security patrols hook
  const {
    patrols,
    loading,
    stats,
    createPatrol: createPatrolDb,
    startPatrol: startPatrolDb,
    completePatrol: completePatrolDb,
    getTodaysPatrols
  } = useSecurityPatrols();

  // Get assigned properties
  const { properties } = useCaretakerProperties();

  const createPatrol = async () => {
    if (!newPatrol.location || !newPatrol.scheduled_time || !newPatrol.property_id) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    const success = await createPatrolDb({
      property_id: newPatrol.property_id,
      location: newPatrol.location,
      scheduled_time: newPatrol.scheduled_time,
      duration_minutes: parseInt(newPatrol.duration_minutes) || 15
    });

    if (success) {
      setIsCreateDialogOpen(false);
      setNewPatrol({ location: '', scheduled_time: '', duration_minutes: '15', property_id: '' });
    }
  };

  const startPatrol = async (id: string) => {
    await startPatrolDb(id);
  };

  const completePatrol = async (id: string, notes?: string) => {
    await completePatrolDb(id, notes);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return 'bg-muted text-muted-foreground';
      case 'in_progress': return 'bg-warning text-warning-foreground';
      case 'completed': return 'bg-success text-success-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'scheduled': return <Clock className="h-4 w-4" />;
      case 'in_progress': return <Play className="h-4 w-4" />;
      case 'completed': return <CheckCircle className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const todaysPatrols = getTodaysPatrols();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-sm text-muted-foreground">Loading patrols...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Security Patrols</h1>
          <p className="text-muted-foreground">Manage and track security patrol rounds</p>
        </div>
        
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Schedule Patrol
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Schedule New Patrol</DialogTitle>
              <DialogDescription>Create a new patrol round</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="property">Property</Label>
                <Select 
                  value={newPatrol.property_id} 
                  onValueChange={(value) => setNewPatrol(prev => ({ ...prev, property_id: value }))}
                >
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
                <Label htmlFor="location">Patrol Location</Label>
                <Input
                  id="location"
                  placeholder="e.g., Building A Perimeter, Parking Lot"
                  value={newPatrol.location}
                  onChange={(e) => setNewPatrol(prev => ({ ...prev, location: e.target.value }))}
                />
              </div>

              <div>
                <Label htmlFor="scheduled_time">Scheduled Time</Label>
                <Input
                  id="scheduled_time"
                  type="datetime-local"
                  value={newPatrol.scheduled_time}
                  onChange={(e) => setNewPatrol(prev => ({ ...prev, scheduled_time: e.target.value }))}
                />
              </div>

              <div>
                <Label htmlFor="duration">Expected Duration (minutes)</Label>
                <Input
                  id="duration"
                  type="number"
                  placeholder="15"
                  value={newPatrol.duration_minutes}
                  onChange={(e) => setNewPatrol(prev => ({ ...prev, duration_minutes: e.target.value }))}
                />
              </div>

              <Button onClick={createPatrol} className="w-full">
                Schedule Patrol
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Patrols</CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total_patrols}</div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.completed_patrols}</div>
            <p className="text-xs text-muted-foreground">Patrols finished</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
            <Play className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.in_progress_patrols}</div>
            <p className="text-xs text-muted-foreground">Currently active</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.completion_rate}%</div>
            <p className="text-xs text-muted-foreground">Overall rate</p>
          </CardContent>
        </Card>
      </div>

      {/* Patrol List */}
      <Card>
        <CardHeader>
          <CardTitle>All Patrols</CardTitle>
          <CardDescription>Security patrol rounds and status</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {patrols.map((patrol) => (
              <div key={patrol.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    {getStatusIcon(patrol.status)}
                    <h3 className="font-medium">{patrol.location}</h3>
                    <Badge className={getStatusColor(patrol.status)}>
                      {patrol.status.replace('_', ' ')}
                    </Badge>
                    {patrol.property && (
                      <Badge variant="outline">
                        <Building className="w-3 h-3 mr-1" />
                        {patrol.property.name}
                      </Badge>
                    )}
                  </div>
                  
                  <div className="text-sm text-muted-foreground space-y-1">
                    <p>Scheduled: {format(new Date(patrol.scheduled_time), 'MMM d, yyyy h:mm a')} ({patrol.duration_minutes} min)</p>
                    {patrol.start_time && (
                      <p>Started: {format(new Date(patrol.start_time), 'h:mm a')}</p>
                    )}
                    {patrol.end_time && (
                      <p>Completed: {format(new Date(patrol.end_time), 'h:mm a')}</p>
                    )}
                    {patrol.notes && (
                      <p className="text-foreground">Notes: {patrol.notes}</p>
                    )}
                  </div>
                </div>
                
                <div className="flex gap-2">
                  {patrol.status === 'scheduled' && (
                    <Button 
                      size="sm" 
                      onClick={() => startPatrol(patrol.id)}
                    >
                      Start Patrol
                    </Button>
                  )}
                  {patrol.status === 'in_progress' && (
                    <PatrolCompletionDialog 
                      onComplete={(notes) => completePatrol(patrol.id, notes)}
                    />
                  )}
                </div>
              </div>
            ))}
            
            {patrols.length === 0 && (
              <div className="text-center py-8">
                <MapPin className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-muted-foreground">No patrols scheduled</p>
                <p className="text-xs text-muted-foreground mt-2">
                  Click "Schedule Patrol" to create your first patrol
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

const PatrolCompletionDialog = ({ onComplete }: { onComplete: (notes?: string) => void }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [notes, setNotes] = useState('');

  const handleComplete = () => {
    onComplete(notes);
    setIsOpen(false);
    setNotes('');
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          Complete
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Complete Patrol</DialogTitle>
          <DialogDescription>Add any notes about the patrol</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <Textarea
            placeholder="Patrol notes (optional)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
          <Button onClick={handleComplete} className="w-full">
            Complete Patrol
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};