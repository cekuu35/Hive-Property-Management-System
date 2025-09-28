import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Wrench, Clock, CheckCircle, AlertTriangle, User, Calendar, DollarSign, Search, Filter, Loader2, Edit, Eye, MoreHorizontal } from 'lucide-react';
import { useMaintenanceRequests } from '@/hooks/useMaintenanceRequests';
import { MaintenanceRequestModal } from '@/components/dashboard/maintenance/MaintenanceRequestModal';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

export const MaintenanceSection = () => {
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [isCostModalOpen, setIsCostModalOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [assignmentData, setAssignmentData] = useState({
    contractorId: '',
    notes: '',
    estimatedCost: '',
    scheduledDate: ''
  });

  const { 
    requests, 
    loading, 
    createMaintenanceRequest, 
    updateRequestStatus, 
    assignContractor,
    updateCost,
    scheduleMaintenance,
    updatePriority,
    getStats, 
    refetch 
  } = useMaintenanceRequests();
  const { toast } = useToast();

  const handleCreateRequest = async (requestData: any) => {
    const success = await createMaintenanceRequest(requestData);
    if (success) {
      setIsCreateModalOpen(false);
    }
  };

  const handleAssignContractor = async (request: any) => {
    setSelectedRequest(request);
    setAssignmentData({
      contractorId: request.assignedTo || '',
      notes: '',
      estimatedCost: request.estimatedCost?.toString() || '',
      scheduledDate: request.scheduledDate || ''
    });
    setIsAssignModalOpen(true);
  };

  const handleSubmitAssignment = async () => {
    if (!selectedRequest || !assignmentData.contractorId) {
      toast({
        title: "Error",
        description: "Please select a contractor",
        variant: "destructive"
      });
      return;
    }

    try {
      await assignContractor(
        selectedRequest.id,
        assignmentData.contractorId,
        assignmentData.notes,
        assignmentData.estimatedCost ? parseFloat(assignmentData.estimatedCost) : undefined,
        assignmentData.scheduledDate || undefined
      );

      setIsAssignModalOpen(false);
      setSelectedRequest(null);
      setAssignmentData({ contractorId: '', notes: '', estimatedCost: '', scheduledDate: '' });
    } catch (error) {
      console.error('Error assigning contractor:', error);
    }
  };

  const handleScheduleMaintenance = async (request: any) => {
    setSelectedRequest(request);
    setAssignmentData({
      contractorId: request.assignedTo || '',
      notes: '',
      estimatedCost: request.estimatedCost?.toString() || '',
      scheduledDate: request.scheduledDate || ''
    });
    setIsScheduleModalOpen(true);
  };

  const handleSubmitSchedule = async () => {
    if (!selectedRequest) return;

    try {
      await scheduleMaintenance(
        selectedRequest.id,
        assignmentData.scheduledDate,
        assignmentData.estimatedCost ? parseFloat(assignmentData.estimatedCost) : undefined,
        assignmentData.notes || undefined
      );

      setIsScheduleModalOpen(false);
      setSelectedRequest(null);
      setAssignmentData({ contractorId: '', notes: '', estimatedCost: '', scheduledDate: '' });
    } catch (error) {
      console.error('Error scheduling maintenance:', error);
    }
  };

  const handleUpdateCost = async (request: any) => {
    setSelectedRequest(request);
    setAssignmentData({
      contractorId: request.assignedTo || '',
      notes: '',
      estimatedCost: request.estimatedCost?.toString() || '',
      scheduledDate: request.scheduledDate || ''
    });
    setIsCostModalOpen(true);
  };

  const handleSubmitCost = async () => {
    if (!selectedRequest) return;

    try {
      await updateCost(
        selectedRequest.id,
        parseFloat(assignmentData.estimatedCost),
        assignmentData.notes || undefined
      );

      setIsCostModalOpen(false);
      setSelectedRequest(null);
      setAssignmentData({ contractorId: '', notes: '', estimatedCost: '', scheduledDate: '' });
    } catch (error) {
      console.error('Error updating cost:', error);
    }
  };

  const handleCompleteRequest = async (requestId: string) => {
    try {
      await updateRequestStatus(requestId, 'completed');
      toast({
        title: "Success",
        description: "Maintenance request completed successfully"
      });
    } catch (error) {
      console.error('Error completing request:', error);
      toast({
        title: "Error",
        description: "Failed to complete request",
        variant: "destructive"
      });
    }
  };

  const handleUpdatePriority = async (requestId: string, newPriority: string) => {
    try {
      await updatePriority(requestId, newPriority);
    } catch (error) {
      console.error('Error updating priority:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const filteredRequests = requests.filter(request => {
    const matchesSearch = request.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         request.tenant.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         request.unit.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || request.status === statusFilter;
    const matchesPriority = priorityFilter === 'all' || request.priority === priorityFilter;
    return matchesSearch && matchesStatus && matchesPriority;
  });

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'destructive';
      case 'medium': return 'warning';
      case 'low': return 'secondary';
      default: return 'secondary';
    }
  };

  const mockContractors = [
    { id: '1', name: 'Mike Johnson', specialty: 'Plumbing', phone: '+254 712 123 456', rating: 4.8 },
    { id: '2', name: 'Sarah Wilson', specialty: 'General Repairs', phone: '+254 723 234 567', rating: 4.9 },
    { id: '3', name: 'David Kim', specialty: 'HVAC', phone: '+254 734 345 678', rating: 4.7 }
  ];

  const statsData = getStats();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Maintenance</h1>
          <p className="text-muted-foreground">Manage maintenance requests and track repairs</p>
        </div>
        <Button className="gap-2" onClick={() => setIsCreateModalOpen(true)}>
          <Wrench className="h-4 w-4" />
          Create Request
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-warning" />
              <div>
                <div className="text-2xl font-bold text-warning">{statsData.pending}</div>
                <div className="text-sm text-muted-foreground">Pending</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Wrench className="h-5 w-5 text-primary" />
              <div>
                <div className="text-2xl font-bold">{statsData.inProgress}</div>
                <div className="text-sm text-muted-foreground">In Progress</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-success" />
              <div>
                <div className="text-2xl font-bold text-success">{statsData.completed}</div>
                <div className="text-sm text-muted-foreground">Completed</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-destructive" />
              <div>
                <div className="text-2xl font-bold">KES {(statsData.totalCost || 0).toLocaleString()}</div>
                <div className="text-sm text-muted-foreground">Total Cost</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card className="p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by title, tenant, or unit..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-background"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-36 bg-background">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="in-progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-36 bg-background">
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priority</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => {
                setStatusFilter('all');
                setPriorityFilter('all');
                setSearchTerm('');
              }}
            >
              Clear Filters
            </Button>
          </div>
        </div>
        {(statusFilter !== 'all' || priorityFilter !== 'all' || searchTerm) && (
          <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
            <span>Showing {filteredRequests.length} of {requests.length} requests</span>
            {statusFilter !== 'all' && <Badge variant="outline">Status: {statusFilter}</Badge>}
            {priorityFilter !== 'all' && <Badge variant="outline">Priority: {priorityFilter}</Badge>}
            {searchTerm && <Badge variant="outline">Search: "{searchTerm}"</Badge>}
          </div>
        )}
      </Card>

      {/* Maintenance Tabs */}
      <Tabs defaultValue="requests" className="space-y-4">
        <TabsList>
          <TabsTrigger value="requests">Active Requests</TabsTrigger>
          <TabsTrigger value="contractors">Contractors</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="requests" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Maintenance Requests</CardTitle>
              <CardDescription>Track and manage all maintenance requests</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Request</TableHead>
                    <TableHead>Tenant/Unit</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Assigned To</TableHead>
                    <TableHead>Cost</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRequests.map((request) => (
                    <TableRow key={request.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{request.title}</div>
                          <div className="text-sm text-muted-foreground">{request.description.slice(0, 50)}...</div>
                          <Badge variant="outline" className="mt-1 text-xs">{request.category}</Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{request.tenant}</div>
                          <div className="text-sm text-muted-foreground">{request.unit}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={request.priority === 'high' ? 'text-destructive' : request.priority === 'medium' ? 'text-warning' : ''}>
                          {request.priority}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={request.status === 'completed' ? 'text-success' : request.status === 'pending' ? 'text-warning' : ''}>
                          {request.status.replace('-', ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {request.assignedTo ? (
                          <div className="flex items-center gap-2">
                            <Avatar className="h-6 w-6">
                              <AvatarFallback className="text-xs">{request.assignedTo.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                            </Avatar>
                            <span className="text-sm">{request.assignedTo}</span>
                          </div>
                        ) : (
                          <Button variant="outline" size="sm" onClick={() => handleAssignContractor(request)}>
                            <User className="h-3 w-3 mr-1" />
                            Assign
                          </Button>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {request.actualCost != null ? (
                            <span className="font-medium">KES {(request.actualCost ?? 0).toLocaleString()}</span>
                          ) : (
                            <span className="text-muted-foreground">Est. KES {(request.estimatedCost ?? 0).toLocaleString()}</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div>{request.createdDate}</div>
                          {request.scheduledDate && (
                            <div className="text-muted-foreground">Scheduled: {request.scheduledDate}</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {request.status === 'pending' && (
                            <>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => handleScheduleMaintenance(request)}
                                title="Schedule Maintenance"
                              >
                                <Calendar className="h-4 w-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => handleAssignContractor(request)}
                                title="Assign Contractor"
                              >
                                <User className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                          {request.status === 'in-progress' && (
                            <>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => handleCompleteRequest(request.id)}
                                title="Mark as Completed"
                                className="text-success hover:text-success"
                              >
                                <CheckCircle className="h-4 w-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => handleUpdateCost(request)}
                                title="Update Cost"
                              >
                                <DollarSign className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                          <Select 
                            value={request.priority} 
                            onValueChange={(value) => handleUpdatePriority(request.id, value)}
                          >
                            <SelectTrigger className="w-20 h-8">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="low">Low</SelectItem>
                              <SelectItem value="medium">Medium</SelectItem>
                              <SelectItem value="high">High</SelectItem>
                              <SelectItem value="emergency">Emergency</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="contractors" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {mockContractors.map((contractor) => (
              <Card key={contractor.id}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <Avatar>
                      <AvatarFallback>{contractor.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <h3 className="font-semibold">{contractor.name}</h3>
                      <p className="text-sm text-muted-foreground">{contractor.specialty}</p>
                      <p className="text-sm text-muted-foreground">{contractor.phone}</p>
                      <div className="flex items-center gap-1 mt-2">
                        <span className="text-sm font-medium">Rating: {contractor.rating}</span>
                        <span className="text-warning">★</span>
                      </div>
                      <Button variant="outline" size="sm" className="mt-2 w-full">
                        View Profile
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Maintenance History</CardTitle>
              <CardDescription>Completed maintenance requests and costs</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Request</TableHead>
                    <TableHead>Tenant/Unit</TableHead>
                    <TableHead>Contractor</TableHead>
                    <TableHead>Cost</TableHead>
                    <TableHead>Completed Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {requests.filter(r => r.status === 'completed').map((request) => (
                    <TableRow key={request.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{request.title}</div>
                          <Badge variant="outline" className="mt-1 text-xs">{request.category}</Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{request.tenant}</div>
                          <div className="text-sm text-muted-foreground">{request.unit}</div>
                        </div>
                      </TableCell>
                      <TableCell>{request.assignedTo}</TableCell>
                      <TableCell>
                        <span className="font-medium">KES {request.actualCost?.toLocaleString()}</span>
                      </TableCell>
                      <TableCell>{request.completedDate}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <MaintenanceRequestModal 
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={refetch}
      />

      {/* Assignment Modal */}
      <Dialog open={isAssignModalOpen} onOpenChange={setIsAssignModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Contractor</DialogTitle>
            <DialogDescription>
              Assign a contractor to handle this maintenance request
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="contractor">Contractor</Label>
              <Select 
                value={assignmentData.contractorId} 
                onValueChange={(value) => setAssignmentData(prev => ({ ...prev, contractorId: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select contractor" />
                </SelectTrigger>
                <SelectContent>
                  {mockContractors.map((contractor) => (
                    <SelectItem key={contractor.id} value={contractor.id}>
                      {contractor.name} - {contractor.specialty}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="estimatedCost">Estimated Cost (KES)</Label>
              <Input
                id="estimatedCost"
                type="number"
                value={assignmentData.estimatedCost}
                onChange={(e) => setAssignmentData(prev => ({ ...prev, estimatedCost: e.target.value }))}
                placeholder="Enter estimated cost"
              />
            </div>
            <div>
              <Label htmlFor="scheduledDate">Scheduled Date</Label>
              <Input
                id="scheduledDate"
                type="date"
                value={assignmentData.scheduledDate}
                onChange={(e) => setAssignmentData(prev => ({ ...prev, scheduledDate: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={assignmentData.notes}
                onChange={(e) => setAssignmentData(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Additional notes for the contractor"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsAssignModalOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSubmitAssignment}>
                Assign Contractor
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Schedule Modal */}
      <Dialog open={isScheduleModalOpen} onOpenChange={setIsScheduleModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Schedule Maintenance</DialogTitle>
            <DialogDescription>
              Schedule this maintenance request for a specific date
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="scheduleDate">Scheduled Date</Label>
              <Input
                id="scheduleDate"
                type="date"
                value={assignmentData.scheduledDate}
                onChange={(e) => setAssignmentData(prev => ({ ...prev, scheduledDate: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="scheduleCost">Estimated Cost (KES)</Label>
              <Input
                id="scheduleCost"
                type="number"
                value={assignmentData.estimatedCost}
                onChange={(e) => setAssignmentData(prev => ({ ...prev, estimatedCost: e.target.value }))}
                placeholder="Enter estimated cost"
              />
            </div>
            <div>
              <Label htmlFor="scheduleNotes">Notes</Label>
              <Textarea
                id="scheduleNotes"
                value={assignmentData.notes}
                onChange={(e) => setAssignmentData(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Scheduling notes"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsScheduleModalOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSubmitSchedule}>
                Schedule
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Cost Update Modal */}
      <Dialog open={isCostModalOpen} onOpenChange={setIsCostModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Cost</DialogTitle>
            <DialogDescription>
              Update the actual cost for this maintenance request
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="actualCost">Actual Cost (KES)</Label>
              <Input
                id="actualCost"
                type="number"
                value={assignmentData.estimatedCost}
                onChange={(e) => setAssignmentData(prev => ({ ...prev, estimatedCost: e.target.value }))}
                placeholder="Enter actual cost"
              />
            </div>
            <div>
              <Label htmlFor="costNotes">Notes</Label>
              <Textarea
                id="costNotes"
                value={assignmentData.notes}
                onChange={(e) => setAssignmentData(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Cost breakdown or notes"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsCostModalOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSubmitCost}>
                Update Cost
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};