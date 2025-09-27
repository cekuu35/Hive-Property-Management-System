import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Clipboard, Calendar, Package, FileText, Clock, MapPin, Wrench, User } from 'lucide-react';
import { WorkOrdersSection } from './WorkOrdersSection';
import { ScheduleSection } from './ScheduleSection';
import { InventorySection } from './InventorySection';
import { ReportsSection } from './ReportsSection';
import { ProfileSection } from './ProfileSection';
import { MaintenanceRequestsSection } from './MaintenanceRequestsSection';
import { useMaintenanceRequests } from '@/hooks/useMaintenanceRequests';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface CaretakerDashboardProps {
  activeSection?: string;
  onSectionChange?: (section: string) => void;
}

const CaretakerDashboard = ({ activeSection = 'workorders', onSectionChange }: CaretakerDashboardProps) => {
  const { requests, getStats } = useMaintenanceRequests();
  const { profile } = useAuth();
  const stats = getStats();

  // Real-time updates are now handled in useMaintenanceRequests hook

  const todayRequests = requests.filter(req => 
    new Date(req.createdDate).toDateString() === new Date().toDateString()
  );

  const urgentRequests = requests.filter(req => 
    (req.priority === 'high' || req.priority === 'emergency') && req.status !== 'completed'
  );

  const scheduledRequests = requests.filter(req => 
    req.scheduledDate && req.status !== 'completed'
  );

  const myAssignedRequests = requests.filter(req => 
    req.assignedTo && req.assignedTo.includes(profile?.first_name || '') && req.status !== 'completed'
  );

  // Render different sections based on activeSection
  if (activeSection === 'workorders') {
    return <WorkOrdersSection />;
  }
  
  if (activeSection === 'schedule') {
    return <ScheduleSection />;
  }
  
  if (activeSection === 'inventory') {
    return <InventorySection />;
  }
  
  if (activeSection === 'reports') {
    return <ReportsSection />;
  }
  
  if (activeSection === 'profile') {
    return <ProfileSection />;
  }

  if (activeSection === 'maintenance') {
    return <MaintenanceRequestsSection />;
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-destructive';
      case 'medium': return 'bg-warning';
      case 'low': return 'bg-success';
      default: return 'bg-muted';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'urgent': return 'bg-destructive text-destructive-foreground';
      case 'in_progress': return 'bg-primary';
      case 'assigned': return 'bg-warning';
      case 'pending': return 'bg-muted';
      default: return 'bg-muted';
    }
  };

  const getStockStatus = (current: number, minimum: number) => {
    if (current <= minimum) return 'low';
    if (current <= minimum * 1.5) return 'medium';
    return 'good';
  };

  const getStockColor = (status: string) => {
    switch (status) {
      case 'low': return 'bg-destructive';
      case 'medium': return 'bg-warning';
      case 'good': return 'bg-success';
      default: return 'bg-muted';
    }
  };

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">Work Dashboard</h1>
        <p className="text-muted-foreground">Manage your work orders and maintenance tasks</p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-gradient-to-r from-primary to-primary-glow text-primary-foreground">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">My Assigned Tasks</CardTitle>
            <Clipboard className="h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{myAssignedRequests.length}</div>
            <p className="text-xs opacity-90">Assigned to me</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed Today</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{todayRequests.filter(r => r.status === 'completed').length}</div>
            <p className="text-xs text-muted-foreground">Tasks finished</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Urgent Tasks</CardTitle>
            <Wrench className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{urgentRequests.length}</div>
            <p className="text-xs text-muted-foreground">High/Emergency priority</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Scheduled</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{scheduledRequests.length}</div>
            <p className="text-xs text-muted-foreground">Upcoming tasks</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Common work management tasks</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Button 
              className="h-auto p-4 flex flex-col items-center gap-2" 
              variant="outline"
              onClick={() => onSectionChange?.('workorders')}
            >
              <Clipboard className="h-6 w-6" />
              <span>View All Orders</span>
            </Button>
            <Button 
              className="h-auto p-4 flex flex-col items-center gap-2" 
              variant="outline"
              onClick={() => onSectionChange?.('schedule')}
            >
              <Calendar className="h-6 w-6" />
              <span>My Schedule</span>
            </Button>
            <Button 
              className="h-auto p-4 flex flex-col items-center gap-2" 
              variant="outline"
              onClick={() => onSectionChange?.('inventory')}
            >
              <Package className="h-6 w-6" />
              <span>Check Inventory</span>
            </Button>
            <Button 
              className="h-auto p-4 flex flex-col items-center gap-2" 
              variant="outline"
              onClick={() => onSectionChange?.('reports')}
            >
              <FileText className="h-6 w-6" />
              <span>Submit Report</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Work Orders and Inventory */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Today's Work Orders */}
        <Card>
          <CardHeader>
            <CardTitle>Urgent Work Orders</CardTitle>
            <CardDescription>High priority tasks requiring immediate attention</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {urgentRequests.slice(0, 4).map((request) => (
                <div key={request.id} className="flex items-start justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <p className="font-medium text-sm">{request.title}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <User className="h-3 w-3 text-muted-foreground" />
                      <p className="text-xs text-muted-foreground">{request.tenant}</p>
                      <MapPin className="h-3 w-3 text-muted-foreground" />
                      <p className="text-xs text-muted-foreground">{request.category}</p>
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge className={getPriorityColor(request.priority)} variant="secondary">
                        {request.priority}
                      </Badge>
                      <Badge className={getStatusColor(request.status)} variant="secondary">
                        {request.status.replace('_', ' ')}
                      </Badge>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">{new Date(request.createdDate).toLocaleDateString()}</p>
                    {request.assignedTo && (
                      <p className="text-xs text-muted-foreground">Assigned</p>
                    )}
                  </div>
                </div>
              ))}
              {urgentRequests.length === 0 && (
                <p className="text-center text-muted-foreground py-4">No urgent tasks available</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Inventory Status */}
        <Card>
          <CardHeader>
            <CardTitle>Inventory Status</CardTitle>
            <CardDescription>Current stock levels</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { item: 'Light Bulbs', stock: 25, minimum: 15 },
                { item: 'Plumbing Fittings', stock: 8, minimum: 12 },
                { item: 'Paint (White)', stock: 5, minimum: 8 },
                { item: 'Cleaning Supplies', stock: 30, minimum: 20 },
              ].map((item, index) => {
                const stockStatus = getStockStatus(item.stock, item.minimum);
                return (
                  <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex-1">
                      <p className="font-medium text-sm">{item.item}</p>
                      <p className="text-xs text-muted-foreground">Min: {item.minimum}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold">{item.stock}</span>
                      <Badge className={getStockColor(stockStatus)} variant="secondary">
                        {stockStatus}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Important Notices */}
      <Card className="border-warning bg-warning/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-warning">
            <Clock className="h-5 w-5" />
            Daily Reminders
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <p className="text-sm">• Building A daily inspection due at 8:00 AM</p>
            <p className="text-sm">• Emergency contact training scheduled for 3:00 PM</p>
            <p className="text-sm">• Weekly inventory check due by end of day</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export { CaretakerDashboard };