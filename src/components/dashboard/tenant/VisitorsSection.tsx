import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { 
  UserCheck, Plus, Clock, User, Phone, Calendar, MapPin, 
  CheckCircle, XCircle, AlertCircle, Eye, Edit, Trash2 
} from 'lucide-react';
import { useVisitorRequests } from '@/hooks/useVisitorRequests';
import { useVisitors } from '@/hooks/useVisitors';
import { format } from 'date-fns';

export const VisitorsSection = () => {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newRequest, setNewRequest] = useState({
    visitor_name: '',
    visitor_phone: '',
    purpose: '',
    expected_arrival: '',
    expected_duration: '',
    special_instructions: ''
  });

  const { 
    requests, 
    loading: requestsLoading, 
    createVisitorRequest, 
    cancelVisitorRequest 
  } = useVisitorRequests();
  
  const { visitors, loading: visitorsLoading } = useVisitors();

  const handleCreateRequest = async () => {
    const success = await createVisitorRequest({
      ...newRequest,
      expected_duration: newRequest.expected_duration ? parseInt(newRequest.expected_duration) : undefined
    });

    if (success) {
      setIsCreateDialogOpen(false);
      setNewRequest({
        visitor_name: '',
        visitor_phone: '',
        purpose: '',
        expected_arrival: '',
        expected_duration: '',
        special_instructions: ''
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-success text-success-foreground';
      case 'pending': return 'bg-warning text-warning-foreground';
      case 'rejected': return 'bg-destructive text-destructive-foreground';
      case 'expired': return 'bg-muted text-muted-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getVisitorStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-primary text-primary-foreground';
      case 'checked_out': return 'bg-success text-success-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const pendingRequests = requests.filter(r => r.status === 'pending');
  const approvedRequests = requests.filter(r => r.status === 'approved');
  const activeVisitors = visitors.filter(v => v.status === 'active');

  if (requestsLoading || visitorsLoading) {
    return <div className="flex items-center justify-center p-8">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Visitor Management</h1>
          <p className="text-muted-foreground">Manage your visitor requests and view current visitors</p>
        </div>
        
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Request Visitor Access
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Request Visitor Access</DialogTitle>
              <DialogDescription>
                Submit a visitor request for approval. Security will be notified once approved.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="visitor_name">Visitor Name</Label>
                <Input
                  id="visitor_name"
                  placeholder="Full name of visitor"
                  value={newRequest.visitor_name}
                  onChange={(e) => setNewRequest(prev => ({ ...prev, visitor_name: e.target.value }))}
                />
              </div>
              
              <div>
                <Label htmlFor="visitor_phone">Phone Number (Optional)</Label>
                <Input
                  id="visitor_phone"
                  placeholder="Visitor's phone number"
                  value={newRequest.visitor_phone}
                  onChange={(e) => setNewRequest(prev => ({ ...prev, visitor_phone: e.target.value }))}
                />
              </div>
              
              <div>
                <Label htmlFor="purpose">Purpose of Visit</Label>
                <Input
                  id="purpose"
                  placeholder="Reason for the visit"
                  value={newRequest.purpose}
                  onChange={(e) => setNewRequest(prev => ({ ...prev, purpose: e.target.value }))}
                />
              </div>
              
              <div>
                <Label htmlFor="expected_arrival">Expected Arrival</Label>
                <Input
                  id="expected_arrival"
                  type="datetime-local"
                  value={newRequest.expected_arrival}
                  onChange={(e) => setNewRequest(prev => ({ ...prev, expected_arrival: e.target.value }))}
                />
              </div>
              
              <div>
                <Label htmlFor="expected_duration">Expected Duration (minutes)</Label>
                <Input
                  id="expected_duration"
                  type="number"
                  placeholder="How long will the visit take?"
                  value={newRequest.expected_duration}
                  onChange={(e) => setNewRequest(prev => ({ ...prev, expected_duration: e.target.value }))}
                />
              </div>
              
              <div>
                <Label htmlFor="special_instructions">Special Instructions (Optional)</Label>
                <Textarea
                  id="special_instructions"
                  placeholder="Any special instructions for security"
                  value={newRequest.special_instructions}
                  onChange={(e) => setNewRequest(prev => ({ ...prev, special_instructions: e.target.value }))}
                />
              </div>
              
              <Button 
                onClick={handleCreateRequest} 
                className="w-full"
                disabled={!newRequest.visitor_name || !newRequest.purpose || !newRequest.expected_arrival}
              >
                Submit Request
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Requests</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingRequests.length}</div>
            <p className="text-xs text-muted-foreground">Awaiting approval</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approved Requests</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{approvedRequests.length}</div>
            <p className="text-xs text-muted-foreground">Ready for visit</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Visitors</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeVisitors.length}</div>
            <p className="text-xs text-muted-foreground">Currently visiting</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{requests.length}</div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>
      </div>

      {/* Active Visitors */}
      {activeVisitors.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserCheck className="h-5 w-5" />
              Your Current Visitors
            </CardTitle>
            <CardDescription>Visitors currently at your unit</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {activeVisitors.map((visitor) => (
                <div key={visitor.id} className="flex items-center justify-between p-4 border rounded-lg bg-primary/5">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium">{visitor.visitor_name}</h3>
                      <Badge className={getVisitorStatusColor(visitor.status)}>
                        {visitor.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">Purpose: {visitor.purpose}</p>
                    <p className="text-sm text-muted-foreground">
                      Checked in: {format(new Date(visitor.time_in), 'MMM d, yyyy h:mm a')}
                    </p>
                    {visitor.visitor_phone && (
                      <p className="text-sm text-muted-foreground">Phone: {visitor.visitor_phone}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Visitor Requests */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Your Visitor Requests
          </CardTitle>
          <CardDescription>Track the status of your visitor requests</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {requests.length === 0 ? (
              <div className="text-center py-8">
                <UserCheck className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-muted-foreground">No visitor requests yet</p>
                <p className="text-sm text-muted-foreground">Create your first visitor request to get started</p>
              </div>
            ) : (
              requests.map((request) => (
                <div key={request.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium">{request.visitor_name}</h3>
                      <Badge className={getStatusColor(request.status)}>
                        {request.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">Purpose: {request.purpose}</p>
                    <p className="text-sm text-muted-foreground">
                      Expected: {format(new Date(request.expected_arrival), 'MMM d, yyyy h:mm a')}
                    </p>
                    {request.expected_duration && (
                      <p className="text-sm text-muted-foreground">
                        Duration: {request.expected_duration} minutes
                      </p>
                    )}
                    {request.security_notes && (
                      <p className="text-sm text-muted-foreground">
                        Security Notes: {request.security_notes}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Requested: {format(new Date(request.created_at), 'MMM d, yyyy h:mm a')}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {request.status === 'pending' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => cancelVisitorRequest(request.id)}
                      >
                        <XCircle className="h-4 w-4 mr-1" />
                        Cancel
                      </Button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};