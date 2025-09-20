import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { UserCheck, Plus, Clock, User } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useVisitorRequests } from '@/hooks/useVisitorRequests';
import { useVisitors } from '@/hooks/useVisitors';
import { format } from 'date-fns';

interface Visitor {
  id: string;
  name: string;
  visiting: string;
  timeIn: string;
  timeOut?: string;
  status: 'active' | 'completed';
  phone?: string;
  purpose?: string;
}

export const VisitorsSection = () => {
  const [isRegisterDialogOpen, setIsRegisterDialogOpen] = useState(false);
  const [newVisitor, setNewVisitor] = useState({
    name: '',
    visiting: '',
    phone: '',
    purpose: ''
  });
  
  const { requests: visitorRequests, updateVisitorRequestStatus } = useVisitorRequests();
  const { visitors, registerVisitor, checkOutVisitor, getStats } = useVisitors();
  const { toast } = useToast();
  
  const stats = getStats();

  const handleRegisterVisitor = async () => {
    const success = await registerVisitor({
      visitor_name: newVisitor.name,
      visitor_phone: newVisitor.phone,
      purpose: newVisitor.purpose,
      // For now, we'll need to implement unit selection logic
      visiting_unit_id: undefined,
      visiting_tenant_id: undefined,
    });
    
    if (success) {
      setIsRegisterDialogOpen(false);
      setNewVisitor({ name: '', visiting: '', phone: '', purpose: '' });
    }
  };

  const handleCheckOut = (id: string) => {
    checkOutVisitor(id);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-primary text-primary-foreground';
      case 'completed': return 'bg-success text-success-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const todaysVisitors = visitors.filter(visitor => {
    const today = new Date().toDateString();
    return new Date(visitor.time_in).toDateString() === today;
  });

  const activeVisitors = visitors.filter(visitor => visitor.status === 'active');
  const pendingRequests = visitorRequests.filter(req => req.status === 'pending');

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Visitor Management</h1>
          <p className="text-muted-foreground">Track and manage property visitors</p>
        </div>
        
        <Dialog open={isRegisterDialogOpen} onOpenChange={setIsRegisterDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Register Visitor
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Register New Visitor</DialogTitle>
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
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Visitors</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.active}</div>
            <p className="text-xs text-muted-foreground">Currently on property</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Total</CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.todaysVisitors}</div>
            <p className="text-xs text-muted-foreground">Visitors today</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed Visits</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.checkedOut}</div>
            <p className="text-xs text-muted-foreground">Checked out today</p>
          </CardContent>
        </Card>
      </div>

      {/* Active Visitors */}
      {activeVisitors.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Active Visitors</CardTitle>
            <CardDescription>Visitors currently on property</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {activeVisitors.map((visitor) => (
                <div key={visitor.id} className="flex items-center justify-between p-4 border rounded-lg bg-primary/5">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium">{visitor.visitor_name}</h3>
                      <Badge className={getStatusColor(visitor.status)}>
                        {visitor.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">Visiting: {visitor.unit?.unit_number || 'Unknown Unit'}</p>
                    <p className="text-sm text-muted-foreground">Time In: {format(new Date(visitor.time_in), 'h:mm a')}</p>
                    {visitor.purpose && (
                      <p className="text-sm text-muted-foreground">Purpose: {visitor.purpose}</p>
                    )}
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleCheckOut(visitor.id)}
                  >
                    Check Out
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Visitor Log */}
      <Card>
        <CardHeader>
          <CardTitle>Today's Visitor Log</CardTitle>
          <CardDescription>Complete visitor history for today</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {todaysVisitors.map((visitor) => (
              <div key={visitor.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium">{visitor.visitor_name}</h3>
                      <Badge className={getStatusColor(visitor.status)}>
                        {visitor.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">Visiting: {visitor.unit?.unit_number || 'Unknown Unit'}</p>
                    <p className="text-sm text-muted-foreground">Time In: {format(new Date(visitor.time_in), 'h:mm a')}</p>
                    {visitor.purpose && (
                      <p className="text-sm text-muted-foreground">Purpose: {visitor.purpose}</p>
                    )}
                </div>
              </div>
            ))}
            
            {todaysVisitors.length === 0 && (
              <div className="text-center py-8">
                <UserCheck className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-muted-foreground">No visitors today</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};