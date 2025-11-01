import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { useMaintenanceRequests } from '@/hooks/useMaintenanceRequests';
import { Clock, MapPin, Calendar as CalendarIcon, User, Wrench, Building, AlertCircle, CheckCircle2, Clipboard, Eye } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';

export const ScheduleSection = () => {
  const { profile } = useAuth();
  const { requests, loading, updateRequestStatus } = useMaintenanceRequests();
  const { toast } = useToast();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [isViewDetailsOpen, setIsViewDetailsOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');

  // Filter requests assigned to this caretaker
  // For caretakers, we want to show ALL work orders assigned to them, not just scheduled ones
  const assignedRequests = requests.filter(request => 
    request.status !== 'completed' &&
    request.assignedTo && 
    profile?.first_name && 
    request.assignedTo.includes(profile.first_name)
  );

  // Filter based on status
  const filteredRequests = assignedRequests.filter(request => {
    if (statusFilter === 'all') return true;
    if (statusFilter === 'urgent') return request.priority === 'high' || request.priority === 'emergency';
    return request.status === statusFilter;
  });

  // Tasks scheduled for today
  const todayTasks = filteredRequests.filter(request => {
    if (!request.scheduledDate || !selectedDate) return false;
    const requestDate = new Date(request.scheduledDate);
    const compareDate = new Date(selectedDate);
    return requestDate.toDateString() === compareDate.toDateString();
  });

  // Tasks scheduled for future dates
  const upcomingTasks = filteredRequests.filter(request => {
    if (!request.scheduledDate || !selectedDate) return false;
    const requestDate = new Date(request.scheduledDate);
    const compareDate = new Date(selectedDate);
    return requestDate > compareDate;
  });

  // Tasks without a scheduled date
  const unscheduledTasks = filteredRequests.filter(request => 
    !request.scheduledDate || request.scheduledDate === null || request.scheduledDate === ''
  );

  const handleViewDetails = (task: any) => {
    setSelectedTask(task);
    setIsViewDetailsOpen(true);
  };

  const handleStatusUpdate = async (taskId: string, newStatus: string) => {
    try {
      await updateRequestStatus(taskId, newStatus, profile?.id);
      toast({
        title: "Status Updated",
        description: `Task status changed to ${newStatus}`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update task status",
        variant: "destructive",
      });
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'plumbing': return '🔧';
      case 'electrical': return '⚡';
      case 'hvac': return '❄️';
      case 'appliances': return '🏠';
      case 'general': return '🛠️';
      case 'pest_control': return '🐀';
      case 'security': return '🔒';
      default: return '📋';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'assigned': return 'bg-blue-100 text-blue-800';
      case 'in-progress': return 'bg-orange-100 text-orange-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'on-hold': return 'bg-gray-100 text-gray-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-muted';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-destructive text-destructive-foreground';
      case 'medium': return 'bg-warning text-warning-foreground';
      case 'low': return 'bg-success text-success-foreground';
      default: return 'bg-muted';
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center p-8">Loading schedule...</div>;
  }

  // Get stats for summary
  const urgentCount = filteredRequests.filter(r => r.priority === 'high' || r.priority === 'emergency').length;
  const inProgressCount = filteredRequests.filter(r => r.status === 'in-progress').length;
  const completedTodayCount = assignedRequests.filter(r => r.status === 'completed' && r.completedDate === new Date().toISOString().split('T')[0]).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Work Schedule</h1>
          <p className="text-muted-foreground">Manage your assigned maintenance tasks and work orders</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Tasks</SelectItem>
              <SelectItem value="urgent">Urgent Only</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="assigned">Assigned</SelectItem>
              <SelectItem value="in-progress">In Progress</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Assigned</p>
                <p className="text-2xl font-bold">{filteredRequests.length}</p>
              </div>
              <Clipboard className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-orange-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Urgent Tasks</p>
                <p className="text-2xl font-bold text-orange-600">{urgentCount}</p>
              </div>
              <AlertCircle className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-blue-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">In Progress</p>
                <p className="text-2xl font-bold text-blue-600">{inProgressCount}</p>
              </div>
              <Wrench className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-green-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Completed Today</p>
                <p className="text-2xl font-bold text-green-600">{completedTodayCount}</p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarIcon className="h-5 w-5" />
              Calendar
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              className="rounded-md border"
            />
          </CardContent>
        </Card>

        {/* Today's Tasks */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>
              {selectedDate ? 
                `Tasks for ${selectedDate.toLocaleDateString()}` : 
                "Today's Tasks"
              }
            </CardTitle>
            <CardDescription>
              {todayTasks.length} task{todayTasks.length !== 1 ? 's' : ''} scheduled
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {todayTasks.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">
                  No tasks scheduled for this day
                </p>
              ) : (
                todayTasks.map((task) => (
                  <div key={task.id} className="border rounded-lg p-4 hover:bg-muted/50 transition-colors">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-2xl">{getCategoryIcon(task.category)}</span>
                          <h4 className="font-medium">{task.title}</h4>
                          <Badge className={getPriorityColor(task.priority)} variant="secondary">
                            {task.priority}
                          </Badge>
                          <Badge className={getStatusColor(task.status)} variant="outline">
                            {task.status.replace('-', ' ')}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{task.description}</p>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            <span>{task.tenant}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Building className="h-3 w-3" />
                            <span>{task.unit}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            <span>{task.scheduledDate ? new Date(task.scheduledDate).toLocaleDateString() : 'No date set'}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 pt-2 border-t">
                      <Button size="sm" variant="outline" onClick={() => handleViewDetails(task)} className="flex-1">
                        <Eye className="h-3 w-3 mr-1" />
                        View Details
                      </Button>
                      {task.status === 'assigned' && (
                        <Button 
                          size="sm" 
                          onClick={() => handleStatusUpdate(task.id, 'in-progress')}
                          className="flex-1"
                        >
                          Start Work
                        </Button>
                      )}
                      {task.status === 'in-progress' && (
                        <Button 
                          size="sm" 
                          variant="default"
                          onClick={() => handleStatusUpdate(task.id, 'completed')}
                          className="flex-1 bg-green-600 hover:bg-green-700"
                        >
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Complete
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

      {/* Upcoming Tasks */}
      {upcomingTasks.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Scheduled Tasks</CardTitle>
            <CardDescription>{upcomingTasks.length} task{upcomingTasks.length !== 1 ? 's' : ''} scheduled for future dates</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px]">
              <div className="space-y-3 pr-4">
                {upcomingTasks.map((task) => (
                  <div key={task.id} className="border rounded-lg p-3 hover:bg-muted/50 transition-colors">
                    <div className="flex items-start gap-3">
                      <span className="text-xl mt-1">{getCategoryIcon(task.category)}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-medium text-sm truncate">{task.title}</h4>
                          <Badge className={getPriorityColor(task.priority)} variant="secondary" style={{ flexShrink: 0 }}>
                            {task.priority}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mb-2 line-clamp-2">{task.description}</p>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                          <div className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            <span className="truncate">{task.tenant}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Building className="h-3 w-3" />
                            <span className="truncate">{task.unit}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            <span>{task.scheduledDate ? new Date(task.scheduledDate).toLocaleDateString() : 'No date'}</span>
                          </div>
                        </div>
                      </div>
                      <Button size="sm" variant="ghost" onClick={() => handleViewDetails(task)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Unscheduled Tasks */}
      {unscheduledTasks.length > 0 && (
        <Card className="border-orange-200 bg-orange-50/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-orange-600" />
              Unscheduled Work Orders
            </CardTitle>
            <CardDescription>{unscheduledTasks.length} work order{unscheduledTasks.length !== 1 ? 's' : ''} awaiting scheduling</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[300px]">
              <div className="space-y-3 pr-4">
                {unscheduledTasks.map((task) => (
                  <div key={task.id} className="border border-orange-200 rounded-lg p-3 bg-white hover:bg-orange-50 transition-colors">
                    <div className="flex items-start gap-3">
                      <span className="text-xl mt-1">{getCategoryIcon(task.category)}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-medium text-sm truncate">{task.title}</h4>
                          <Badge className={getPriorityColor(task.priority)} variant="secondary" style={{ flexShrink: 0 }}>
                            {task.priority}
                          </Badge>
                          <Badge variant="outline" className="bg-orange-100 text-orange-800 border-orange-300" style={{ flexShrink: 0 }}>
                            Unscheduled
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mb-2 line-clamp-2">{task.description}</p>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                          <div className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            <span className="truncate">{task.tenant}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Building className="h-3 w-3" />
                            <span className="truncate">{task.unit}</span>
                          </div>
                        </div>
                      </div>
                      <Button size="sm" variant="ghost" onClick={() => handleViewDetails(task)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Task Details Modal */}
      <Dialog open={isViewDetailsOpen} onOpenChange={setIsViewDetailsOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="text-2xl">{selectedTask && getCategoryIcon(selectedTask.category)}</span>
              {selectedTask?.title}
            </DialogTitle>
            <DialogDescription>Complete task details and information</DialogDescription>
          </DialogHeader>
          {selectedTask && (
            <ScrollArea className="max-h-[calc(90vh-200px)] pr-4">
              <div className="space-y-4">
                {/* Task Status and Priority */}
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge className={getPriorityColor(selectedTask.priority)} variant="secondary">
                    Priority: {selectedTask.priority}
                  </Badge>
                  <Badge className={getStatusColor(selectedTask.status)} variant="outline">
                    Status: {selectedTask.status.replace('-', ' ')}
                  </Badge>
                  <Badge variant="outline">
                    {selectedTask.category.replace('_', ' ')}
                  </Badge>
                </div>

                {/* Description */}
                <div>
                  <h4 className="font-medium mb-2">Description</h4>
                  <p className="text-sm text-muted-foreground">{selectedTask.description}</p>
                </div>

                {/* Tenant and Unit Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Tenant</p>
                      <p className="font-medium">{selectedTask.tenant}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Building className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Unit</p>
                      <p className="font-medium">{selectedTask.unit}</p>
                    </div>
                  </div>
                  {selectedTask.scheduledDate && (
                    <div className="flex items-center gap-2">
                      <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-xs text-muted-foreground">Scheduled Date</p>
                        <p className="font-medium">{new Date(selectedTask.scheduledDate).toLocaleDateString()}</p>
                      </div>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Created</p>
                      <p className="font-medium">{new Date(selectedTask.createdDate).toLocaleDateString()}</p>
                    </div>
                  </div>
                </div>

                {/* Status Update Actions */}
                {selectedTask.status !== 'completed' && selectedTask.status !== 'cancelled' && (
                  <div className="pt-4 border-t space-y-2">
                    <h4 className="font-medium mb-2">Quick Actions</h4>
                    <div className="flex gap-2">
                      {selectedTask.status === 'assigned' && (
                        <Button 
                          size="sm" 
                          onClick={() => {
                            handleStatusUpdate(selectedTask.id, 'in-progress');
                            setIsViewDetailsOpen(false);
                          }}
                          className="flex-1"
                        >
                          <Wrench className="h-3 w-3 mr-1" />
                          Start Work
                        </Button>
                      )}
                      {selectedTask.status === 'in-progress' && (
                        <Button 
                          size="sm" 
                          onClick={() => {
                            handleStatusUpdate(selectedTask.id, 'completed');
                            setIsViewDetailsOpen(false);
                          }}
                          className="flex-1 bg-green-600 hover:bg-green-700"
                        >
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Mark Complete
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};