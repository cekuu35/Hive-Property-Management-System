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
import { Wrench, Clock, CheckCircle, AlertTriangle, User, Calendar, DollarSign, Search, Filter, Loader2, Edit, Eye, MoreHorizontal, Plus, Phone, Mail, MapPin, Star, Trash2, Camera, X } from 'lucide-react';
import { useMaintenanceRequests } from '@/hooks/useMaintenanceRequests';
import { useContractors } from '@/hooks/useContractors';
import { MaintenanceRequestModal } from '@/components/dashboard/maintenance/MaintenanceRequestModal';
import { ContractorModal } from '@/components/dashboard/maintenance/ContractorModal';
import { EmergencyContactsManagement } from '../EmergencyContactsManagement';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { PhotoGallery } from '@/components/ui/PhotoGallery';
import { ScrollArea } from '@/components/ui/scroll-area';

export const MaintenanceSection = () => {
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isContractorModalOpen, setIsContractorModalOpen] = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [isCostModalOpen, setIsCostModalOpen] = useState(false);
  const [isViewDetailsOpen, setIsViewDetailsOpen] = useState(false);
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
  
  const {
    contractors,
    loading: contractorsLoading,
    createContractor,
    updateContractor,
    deleteContractor,
    toggleContractorStatus,
    getActiveContractors
  } = useContractors();
  
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

  const handleCreateContractor = async (contractorData: any) => {
    const success = await createContractor(contractorData);
    if (success) {
      setIsContractorModalOpen(false);
    }
    return success;
  };

  const handleDeleteContractor = async (contractorId: string) => {
    if (window.confirm('Are you sure you want to delete this contractor?')) {
      await deleteContractor(contractorId);
    }
  };

  const handleToggleContractorStatus = async (contractorId: string, isActive: boolean) => {
    await toggleContractorStatus(contractorId, !isActive);
  };

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
          <TabsTrigger value="emergency">Emergency Contacts</TabsTrigger>
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
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => {
                              setSelectedRequest(request);
                              setIsViewDetailsOpen(true);
                            }}
                            title="View Details"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
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
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-semibold">Contractors</h3>
              <p className="text-sm text-muted-foreground">Manage your network of contractors</p>
            </div>
            <Button onClick={() => setIsContractorModalOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Add Contractor
            </Button>
          </div>

          {contractorsLoading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : contractors.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <User className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Contractors Added</h3>
                <p className="text-muted-foreground mb-4">
                  Start building your contractor network to manage maintenance requests efficiently.
                </p>
                <Button onClick={() => setIsContractorModalOpen(true)} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Add Your First Contractor
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {contractors.map((contractor) => (
                <Card key={contractor.id} className={!contractor.is_active ? 'opacity-60' : ''}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <Avatar>
                        <AvatarFallback>{contractor.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="font-semibold">{contractor.name}</h3>
                            <p className="text-sm text-muted-foreground">{contractor.specialty}</p>
                          </div>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleToggleContractorStatus(contractor.id, contractor.is_active)}
                              title={contractor.is_active ? "Deactivate" : "Activate"}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteContractor(contractor.id)}
                              title="Delete contractor"
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        
                        {contractor.phone && (
                          <div className="flex items-center gap-1 mt-1">
                            <Phone className="h-3 w-3 text-muted-foreground" />
                            <p className="text-sm text-muted-foreground">{contractor.phone}</p>
                          </div>
                        )}
                        
                        {contractor.email && (
                          <div className="flex items-center gap-1 mt-1">
                            <Mail className="h-3 w-3 text-muted-foreground" />
                            <p className="text-sm text-muted-foreground">{contractor.email}</p>
                          </div>
                        )}
                        
                        {contractor.address && (
                          <div className="flex items-center gap-1 mt-1">
                            <MapPin className="h-3 w-3 text-muted-foreground" />
                            <p className="text-sm text-muted-foreground">{contractor.address}</p>
                          </div>
                        )}

                        <div className="flex items-center gap-1 mt-2">
                          <Star className="h-3 w-3 text-warning fill-current" />
                          <span className="text-sm font-medium">
                            {contractor.rating > 0 ? contractor.rating.toFixed(1) : 'Not rated'}
                          </span>
                          {contractor.rating_count > 0 && (
                            <span className="text-xs text-muted-foreground">
                              ({contractor.rating_count} review{contractor.rating_count !== 1 ? 's' : ''})
                            </span>
                          )}
                        </div>

                        {contractor.hourly_rate && (
                          <div className="mt-2">
                            <span className="text-sm font-medium">KES {contractor.hourly_rate.toLocaleString()}/hr</span>
                          </div>
                        )}

                        {contractor.description && (
                          <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                            {contractor.description}
                          </p>
                        )}

                        <div className="mt-3 flex gap-2">
                          <Button variant="outline" size="sm" className="flex-1">
                            <Phone className="h-3 w-3 mr-1" />
                            Contact
                          </Button>
                          <Badge variant={contractor.is_active ? "default" : "secondary"}>
                            {contractor.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
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

        <TabsContent value="emergency" className="space-y-4">
          <EmergencyContactsManagement />
        </TabsContent>
      </Tabs>

      <MaintenanceRequestModal 
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={refetch}
      />

      <ContractorModal
        isOpen={isContractorModalOpen}
        onClose={() => setIsContractorModalOpen(false)}
        onSubmit={handleCreateContractor}
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
                  {getActiveContractors().map((contractor) => (
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

      {/* View Details Modal */}
      <Dialog open={isViewDetailsOpen} onOpenChange={setIsViewDetailsOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wrench className="h-5 w-5" />
              Maintenance Request Details
            </DialogTitle>
          </DialogHeader>
          
          {selectedRequest && (
            <ScrollArea className="h-[70vh] pr-4">
              <div className="space-y-6">
                {/* Request Header */}
                <div>
                  <h3 className="text-xl font-semibold mb-2">{selectedRequest.title}</h3>
                  <div className="flex flex-wrap gap-2 mb-4">
                    <Badge variant={
                      selectedRequest.status === 'completed' ? 'success' :
                      selectedRequest.status === 'in-progress' ? 'default' :
                      selectedRequest.status === 'pending' ? 'secondary' :
                      'destructive'
                    }>
                      {selectedRequest.status.replace(/-/g, ' ').replace('_', ' ')}
                    </Badge>
                    <Badge variant={
                      selectedRequest.priority === 'emergency' ? 'destructive' :
                      selectedRequest.priority === 'high' ? 'destructive' :
                      selectedRequest.priority === 'medium' ? 'default' :
                      'secondary'
                    }>
                      {selectedRequest.priority} Priority
                    </Badge>
                    <Badge variant="outline">{selectedRequest.category}</Badge>
                  </div>
                </div>

                {/* Description */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Description</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {selectedRequest.description}
                    </p>
                  </CardContent>
                </Card>

                {/* Photos */}
                {selectedRequest.images && selectedRequest.images.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Camera className="h-4 w-4" />
                        Photos ({selectedRequest.images.length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <PhotoGallery
                        photos={selectedRequest.images}
                        maxColumns={3}
                        showActions={false}
                        allowFullscreen={true}
                        className="mt-2"
                      />
                    </CardContent>
                  </Card>
                )}

                {/* Request Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm flex items-center gap-2">
                        <User className="h-4 w-4" />
                        Tenant Information
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div>
                        <span className="text-sm font-medium">Name:</span>
                        <span className="text-sm text-muted-foreground ml-2">
                          {selectedRequest.tenantName || 'N/A'}
                        </span>
                      </div>
                      <div>
                        <span className="text-sm font-medium">Unit:</span>
                        <span className="text-sm text-muted-foreground ml-2">
                          {selectedRequest.unitNumber || 'N/A'}
                        </span>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        Timeline
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div>
                        <span className="text-sm font-medium">Created:</span>
                        <span className="text-sm text-muted-foreground ml-2">
                          {selectedRequest.createdDate}
                        </span>
                      </div>
                      {selectedRequest.scheduledDate && (
                        <div>
                          <span className="text-sm font-medium">Scheduled:</span>
                          <span className="text-sm text-muted-foreground ml-2">
                            {selectedRequest.scheduledDate}
                          </span>
                        </div>
                      )}
                      {selectedRequest.completedDate && (
                        <div>
                          <span className="text-sm font-medium">Completed:</span>
                          <span className="text-sm text-muted-foreground ml-2">
                            {selectedRequest.completedDate}
                          </span>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {(selectedRequest.estimatedCost || selectedRequest.actualCost) && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-sm flex items-center gap-2">
                          <DollarSign className="h-4 w-4" />
                          Cost Information
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        {selectedRequest.estimatedCost && (
                          <div>
                            <span className="text-sm font-medium">Estimated:</span>
                            <span className="text-sm text-muted-foreground ml-2">
                              KES {selectedRequest.estimatedCost.toLocaleString()}
                            </span>
                          </div>
                        )}
                        {selectedRequest.actualCost && (
                          <div>
                            <span className="text-sm font-medium">Actual:</span>
                            <span className="text-sm text-muted-foreground ml-2">
                              KES {selectedRequest.actualCost.toLocaleString()}
                            </span>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )}

                  {selectedRequest.assignedTo && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-sm flex items-center gap-2">
                          <Wrench className="h-4 w-4" />
                          Assignment
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div>
                          <span className="text-sm font-medium">Assigned To:</span>
                          <span className="text-sm text-muted-foreground ml-2">
                            {selectedRequest.assignedTo}
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>

                {/* Notes */}
                {selectedRequest.notes && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Additional Notes</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                        {selectedRequest.notes}
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </ScrollArea>
          )}

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={() => setIsViewDetailsOpen(false)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};