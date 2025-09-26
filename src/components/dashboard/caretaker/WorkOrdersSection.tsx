import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useMaintenanceRequests } from '@/hooks/useMaintenanceRequests';
import { useAuth } from '@/hooks/useAuth';
import { Clock, Search, Filter, Eye, MessageCircle, User, MapPin, Calendar, Wrench, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export const WorkOrdersSection = () => {
  const { requests, updateRequestStatus, loading } = useMaintenanceRequests();
  const { profile } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [workNotes, setWorkNotes] = useState('');
  const [estimatedCost, setEstimatedCost] = useState('');
  const [actualCost, setActualCost] = useState('');

  console.log('WorkOrdersSection - All requests:', requests);
  console.log('WorkOrdersSection - Search term:', searchTerm);
  console.log('WorkOrdersSection - Status filter:', statusFilter);
  console.log('WorkOrdersSection - Priority filter:', priorityFilter);

  const filteredRequests = requests.filter(request => {
    const matchesSearch = request.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         request.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         request.tenant.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || request.status === statusFilter;
    const matchesPriority = priorityFilter === 'all' || request.priority === priorityFilter;
    
    return matchesSearch && matchesStatus && matchesPriority;
  });

  console.log('WorkOrdersSection - Filtered requests:', filteredRequests);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-warning text-warning-foreground';
      case 'in-progress': return 'bg-primary text-primary-foreground';
      case 'completed': return 'bg-success text-success-foreground';
      case 'cancelled': return 'bg-destructive text-destructive-foreground';
      default: return 'bg-muted';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'emergency': return 'bg-destructive text-destructive-foreground animate-pulse';
      case 'high': return 'bg-destructive text-destructive-foreground';
      case 'medium': return 'bg-warning text-warning-foreground';
      case 'low': return 'bg-success text-success-foreground';
      default: return 'bg-muted';
    }
  };

  const handleStatusUpdate = async (requestId: string, newStatus: string) => {
    try {
      await updateRequestStatus(requestId, newStatus, profile?.id);
      toast({
        title: "Status Updated",
        description: `Request status changed to ${newStatus}`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update request status",
        variant: "destructive",
      });
    }
  };

  const handleViewDetails = (request: any) => {
    setSelectedRequest(request);
    setIsDetailOpen(true);
  };

  const handleAddNotes = async () => {
    if (!selectedRequest || !workNotes.trim()) return;

    try {
      // Add notes to the request (you might want to create a notes table)
      toast({
        title: "Notes Added",
        description: "Work notes have been recorded",
      });
      setWorkNotes('');
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add notes",
        variant: "destructive",
      });
    }
  };

  const handleUpdateCosts = async () => {
    if (!selectedRequest) return;

    try {
      const updates: any = {};
      if (estimatedCost) updates.estimated_cost = parseFloat(estimatedCost);
      if (actualCost) updates.actual_cost = parseFloat(actualCost);

      const { error } = await supabase
        .from('maintenance_requests')
        .update(updates)
        .eq('id', selectedRequest.id);

      if (error) throw error;

      toast({
        title: "Costs Updated",
        description: "Cost information has been updated",
      });
      setEstimatedCost('');
      setActualCost('');
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update costs",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">Work Orders</h1>
        <p className="text-muted-foreground">Manage and track maintenance requests</p>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search work orders..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="in-progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priorities</SelectItem>
                <SelectItem value="emergency">Emergency</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Work Orders List */}
      <div className="grid gap-4">
        {loading ? (
          <Card>
            <CardContent className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading work orders...</p>
            </CardContent>
          </Card>
        ) : (
          filteredRequests.map((request) => (
            <Card key={request.id} className="hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-lg font-semibold">{request.title}</h3>
                      <Badge className={getStatusColor(request.status)}>
                        {request.status.replace('_', ' ')}
                      </Badge>
                      <Badge className={getPriorityColor(request.priority)}>
                        {request.priority} priority
                      </Badge>
                    </div>
                    
                    <div className="space-y-2 mb-4">
                      <p className="text-muted-foreground">{request.description}</p>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <User className="h-4 w-4" />
                          <span>Tenant: {request.tenant}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <MapPin className="h-4 w-4" />
                          <span>Unit: {request.unit}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Wrench className="h-4 w-4" />
                          <span>Category: {request.category}</span>
                        </div>
                      </div>
                      {request.assignedTo && (
                        <div className="text-sm text-muted-foreground">
                          <span className="font-medium">Assigned to:</span> {request.assignedTo}
                        </div>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        <span>Created: {new Date(request.createdDate).toLocaleDateString()}</span>
                      </div>
                      {request.scheduledDate && (
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          <span>Scheduled: {new Date(request.scheduledDate).toLocaleDateString()}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex flex-col gap-2 ml-4">
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewDetails(request)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewDetails(request)}
                      >
                        <MessageCircle className="h-4 w-4 mr-1" />
                        Chat
                      </Button>
                    </div>
                    
                    <div className="flex gap-2">
                      {request.status === 'pending' && (
                        <Button 
                          onClick={() => handleStatusUpdate(request.id, 'in-progress')}
                          size="sm"
                          className="bg-primary text-primary-foreground hover:bg-primary/90"
                        >
                          <Wrench className="h-4 w-4 mr-1" />
                          Start Work
                        </Button>
                      )}
                      {request.status === 'in-progress' && (
                        <Button 
                          onClick={() => handleStatusUpdate(request.id, 'completed')}
                          size="sm"
                          className="bg-success text-success-foreground hover:bg-success/90"
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Complete
                        </Button>
                      )}
                      {request.status === 'pending' && (
                        <Button 
                          onClick={() => handleStatusUpdate(request.id, 'cancelled')}
                          size="sm"
                          variant="destructive"
                        >
                          <XCircle className="h-4 w-4 mr-1" />
                          Cancel
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {filteredRequests.length === 0 && !loading && (
        <Card>
          <CardContent className="text-center py-8">
            <p className="text-muted-foreground">No work orders found matching your criteria.</p>
          </CardContent>
        </Card>
      )}

      {/* Work Order Detail Dialog */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wrench className="h-5 w-5" />
              Work Order Details
            </DialogTitle>
          </DialogHeader>
          
          {selectedRequest && (
            <div className="space-y-6">
              {/* Request Info */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5" />
                    Request Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Title</label>
                      <p className="text-lg font-semibold">{selectedRequest.title}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Status</label>
                      <div className="flex items-center gap-2">
                        <Badge className={getStatusColor(selectedRequest.status)}>
                          {selectedRequest.status.replace('_', ' ')}
                        </Badge>
                        <Badge className={getPriorityColor(selectedRequest.priority)}>
                          {selectedRequest.priority} priority
                        </Badge>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Description</label>
                    <p className="mt-1">{selectedRequest.description}</p>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Tenant</label>
                      <p>{selectedRequest.tenant}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Unit</label>
                      <p>{selectedRequest.unit}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Category</label>
                      <p>{selectedRequest.category}</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Created Date</label>
                      <p>{new Date(selectedRequest.createdDate).toLocaleDateString()}</p>
                    </div>
                    {selectedRequest.scheduledDate && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Scheduled Date</label>
                        <p>{new Date(selectedRequest.scheduledDate).toLocaleDateString()}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Work Management */}
              <Card>
                <CardHeader>
                  <CardTitle>Work Management</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Status Update */}
                  <div>
                    <label className="text-sm font-medium text-muted-foreground mb-2 block">Update Status</label>
                    <div className="flex gap-2">
                      {selectedRequest.status === 'pending' && (
                        <Button 
                          onClick={() => handleStatusUpdate(selectedRequest.id, 'in-progress')}
                          className="bg-primary text-primary-foreground hover:bg-primary/90"
                        >
                          <Wrench className="h-4 w-4 mr-2" />
                          Start Work
                        </Button>
                      )}
                      {selectedRequest.status === 'in-progress' && (
                        <Button 
                          onClick={() => handleStatusUpdate(selectedRequest.id, 'completed')}
                          className="bg-success text-success-foreground hover:bg-success/90"
                        >
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Mark Complete
                        </Button>
                      )}
                      {selectedRequest.status === 'pending' && (
                        <Button 
                          onClick={() => handleStatusUpdate(selectedRequest.id, 'cancelled')}
                          variant="destructive"
                        >
                          <XCircle className="h-4 w-4 mr-2" />
                          Cancel Request
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Work Notes */}
                  <div>
                    <label className="text-sm font-medium text-muted-foreground mb-2 block">Add Work Notes</label>
                    <div className="flex gap-2">
                      <Textarea
                        placeholder="Add notes about the work performed..."
                        value={workNotes}
                        onChange={(e) => setWorkNotes(e.target.value)}
                        rows={3}
                        className="flex-1"
                      />
                      <Button onClick={handleAddNotes} disabled={!workNotes.trim()}>
                        Add Notes
                      </Button>
                    </div>
                  </div>

                  {/* Cost Management */}
                  <div>
                    <label className="text-sm font-medium text-muted-foreground mb-2 block">Cost Management</label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-muted-foreground mb-1 block">Estimated Cost (KES)</label>
                        <div className="flex gap-2">
                          <Input
                            type="number"
                            placeholder="0.00"
                            value={estimatedCost}
                            onChange={(e) => setEstimatedCost(e.target.value)}
                          />
                          <Button onClick={handleUpdateCosts} disabled={!estimatedCost}>
                            Update
                          </Button>
                        </div>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-muted-foreground mb-1 block">Actual Cost (KES)</label>
                        <div className="flex gap-2">
                          <Input
                            type="number"
                            placeholder="0.00"
                            value={actualCost}
                            onChange={(e) => setActualCost(e.target.value)}
                          />
                          <Button onClick={handleUpdateCosts} disabled={!actualCost}>
                            Update
                          </Button>
                        </div>
                      </div>
                    </div>
                    {(selectedRequest.estimatedCost || selectedRequest.actualCost) && (
                      <div className="mt-2 p-3 bg-muted rounded-lg">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="font-medium">Estimated:</span> KES {selectedRequest.estimatedCost?.toLocaleString() || 'Not set'}
                          </div>
                          <div>
                            <span className="font-medium">Actual:</span> KES {selectedRequest.actualCost?.toLocaleString() || 'Not set'}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Images */}
              {selectedRequest.images && selectedRequest.images.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Request Images</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {selectedRequest.images.map((image: string, index: number) => (
                        <img
                          key={index}
                          src={image}
                          alt={`Request image ${index + 1}`}
                          className="w-full h-32 object-cover rounded-lg border"
                        />
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};