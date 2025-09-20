import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { MapPin, Plus, Clock, CheckCircle, Play } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';

interface Patrol {
  id: string;
  location: string;
  scheduledTime: string;
  duration: string;
  status: 'scheduled' | 'in_progress' | 'completed';
  startTime?: string;
  endTime?: string;
  notes?: string;
  assignedTo?: string;
}

export const PatrolsSection = () => {
  const [patrols, setPatrols] = useState<Patrol[]>([
    {
      id: '1',
      location: 'Building A Perimeter',
      scheduledTime: '06:00 AM',
      duration: '15 min',
      status: 'completed',
      startTime: '06:00 AM',
      endTime: '06:15 AM',
      notes: 'All clear, no issues detected'
    },
    {
      id: '2',
      location: 'Parking Lot',
      scheduledTime: '09:00 AM',
      duration: '10 min',
      status: 'completed',
      startTime: '09:00 AM',
      endTime: '09:10 AM'
    },
    {
      id: '3',
      location: 'Building B Entrance',
      scheduledTime: '12:00 PM',
      duration: '15 min',
      status: 'in_progress',
      startTime: '12:00 PM'
    },
    {
      id: '4',
      location: 'Common Areas',
      scheduledTime: '03:00 PM',
      duration: '20 min',
      status: 'scheduled'
    },
    {
      id: '5',
      location: 'Rooftop Access',
      scheduledTime: '06:00 PM',
      duration: '10 min',
      status: 'scheduled'
    }
  ]);

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newPatrol, setNewPatrol] = useState({
    location: '',
    scheduledTime: '',
    duration: ''
  });
  const { toast } = useToast();

  const createPatrol = () => {
    const patrol: Patrol = {
      id: Date.now().toString(),
      ...newPatrol,
      status: 'scheduled'
    };
    
    setPatrols(prev => [...prev, patrol]);
    setIsCreateDialogOpen(false);
    setNewPatrol({ location: '', scheduledTime: '', duration: '' });
    toast({ title: "Patrol scheduled successfully" });
  };

  const startPatrol = (id: string) => {
    setPatrols(prev => prev.map(patrol => 
      patrol.id === id 
        ? { ...patrol, status: 'in_progress' as const, startTime: new Date().toLocaleTimeString() }
        : patrol
    ));
    toast({ title: "Patrol started" });
  };

  const completePatrol = (id: string, notes?: string) => {
    setPatrols(prev => prev.map(patrol => 
      patrol.id === id 
        ? { 
            ...patrol, 
            status: 'completed' as const, 
            endTime: new Date().toLocaleTimeString(),
            notes 
          }
        : patrol
    ));
    toast({ title: "Patrol completed" });
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

  const completedPatrols = patrols.filter(p => p.status === 'completed').length;
  const totalPatrols = patrols.length;
  const inProgressPatrols = patrols.filter(p => p.status === 'in_progress').length;

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
              <Input
                placeholder="Patrol location"
                value={newPatrol.location}
                onChange={(e) => setNewPatrol(prev => ({ ...prev, location: e.target.value }))}
              />
              <Input
                type="time"
                value={newPatrol.scheduledTime}
                onChange={(e) => setNewPatrol(prev => ({ ...prev, scheduledTime: e.target.value }))}
              />
              <Input
                placeholder="Expected duration (e.g., 15 min)"
                value={newPatrol.duration}
                onChange={(e) => setNewPatrol(prev => ({ ...prev, duration: e.target.value }))}
              />
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
            <div className="text-2xl font-bold">{totalPatrols}</div>
            <p className="text-xs text-muted-foreground">Scheduled today</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completedPatrols}</div>
            <p className="text-xs text-muted-foreground">Patrols finished</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
            <Play className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{inProgressPatrols}</div>
            <p className="text-xs text-muted-foreground">Currently active</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {totalPatrols > 0 ? Math.round((completedPatrols / totalPatrols) * 100) : 0}%
            </div>
            <p className="text-xs text-muted-foreground">Today's progress</p>
          </CardContent>
        </Card>
      </div>

      {/* Patrol List */}
      <Card>
        <CardHeader>
          <CardTitle>Today's Patrol Schedule</CardTitle>
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
                  </div>
                  
                  <div className="text-sm text-muted-foreground space-y-1">
                    <p>Scheduled: {patrol.scheduledTime} ({patrol.duration})</p>
                    {patrol.startTime && (
                      <p>Started: {patrol.startTime}</p>
                    )}
                    {patrol.endTime && (
                      <p>Completed: {patrol.endTime}</p>
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