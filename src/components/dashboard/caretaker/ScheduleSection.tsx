import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { useMaintenanceRequests } from '@/hooks/useMaintenanceRequests';
import { Clock, MapPin, Calendar as CalendarIcon } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

export const ScheduleSection = () => {
  const { profile } = useAuth();
  const { requests, loading } = useMaintenanceRequests();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());

  const scheduledRequests = requests.filter(request => 
    request.scheduledDate && 
    request.status !== 'completed' &&
    request.assignedTo === profile?.id
  );

  const todayTasks = scheduledRequests.filter(request => {
    if (!request.scheduledDate || !selectedDate) return false;
    const requestDate = new Date(request.scheduledDate);
    const compareDate = new Date(selectedDate);
    return requestDate.toDateString() === compareDate.toDateString();
  });

  const upcomingTasks = scheduledRequests.filter(request => {
    if (!request.scheduledDate || !selectedDate) return false;
    const requestDate = new Date(request.scheduledDate);
    const compareDate = new Date(selectedDate);
    return requestDate > compareDate;
  }).slice(0, 5);

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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">Schedule</h1>
        <p className="text-muted-foreground">View your work schedule and upcoming tasks</p>
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
                  <div key={task.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium">{task.title}</h4>
                        <Badge className={getPriorityColor(task.priority)}>
                          {task.priority}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">{task.description}</p>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          <span>Scheduled: {task.scheduledDate ? new Date(task.scheduledDate).toLocaleDateString() : 'No date set'}</span>
                        </div>
                      </div>
                    </div>
                    <Button size="sm" variant="outline">
                      View Details
                    </Button>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Upcoming Tasks */}
      <Card>
        <CardHeader>
          <CardTitle>Upcoming Tasks</CardTitle>
          <CardDescription>Next 5 scheduled maintenance tasks</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {upcomingTasks.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">
                No upcoming tasks scheduled
              </p>
            ) : (
              upcomingTasks.map((task) => (
                <div key={task.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium text-sm">{task.title}</h4>
                      <Badge className={getPriorityColor(task.priority)} variant="secondary">
                        {task.priority}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      <span>{task.scheduledDate ? new Date(task.scheduledDate).toLocaleDateString() : 'No date set'}</span>
                    </div>
                  </div>
                  <Button size="sm" variant="ghost">
                    View
                  </Button>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};