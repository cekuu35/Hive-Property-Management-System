import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  CreditCard, Wrench, FileText, MessageCircle, AlertCircle, Calendar, Home, Receipt, Settings, Bell,
  Download, Upload, Phone, Shield, User, Mail, MapPin, DollarSign, Clock, CheckCircle, XCircle,
  Send, Plus, Search, Filter, Eye, Edit, Trash2, UserCheck, Star, Building2
} from 'lucide-react';
import { TenantPaymentModal } from './TenantPaymentModal';
import { MaintenanceRequestModal } from '@/components/dashboard/maintenance/MaintenanceRequestModal';
import { MaintenanceRequestView } from './MaintenanceRequestView';
import { TenantDocuments } from './TenantDocuments';
import { UnitBrowsing } from './UnitBrowsing';
import { MyApplications } from './MyApplications';
import { ProfileEditForm } from './profile/ProfileEditForm';
import { CoTenantManagement } from './profile/CoTenantManagement';
import { PasswordChangeForm } from './profile/PasswordChangeForm';
import { SessionsManagement } from './profile/SessionsManagement';
import { PaymentMethodsManagement } from './profile/PaymentMethodsManagement';
import { MessagesSection } from './MessagesSection';
import { VisitorsSection } from './VisitorsSection';
import { useMaintenanceRequests } from '@/hooks/useMaintenanceRequests';
import { useApprovedLease } from '@/hooks/useApprovedLease';
import { supabase } from '@/integrations/supabase/client';
import { useTenantPayments } from '@/hooks/useTenantPayments';
import { useMessages } from '@/hooks/useMessages';

interface TenantDashboardProps {
  activeTab?: string;
  onTabChange?: (tab: string) => void;
}

const TenantDashboard = ({ activeTab = "overview", onTabChange }: TenantDashboardProps) => {
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showMaintenanceModal, setShowMaintenanceModal] = useState(false);
  const [showMaintenanceView, setShowMaintenanceView] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [rentBalance, setRentBalance] = useState(25000);
  const [maintenanceFilter, setMaintenanceFilter] = useState('all');
  const [maintenanceSearchTerm, setMaintenanceSearchTerm] = useState('');
  
  const { requests: maintenanceRequests, loading: maintenanceLoading, refetch } = useMaintenanceRequests();
  const { approvedLease, hasApprovedLease, loading: leaseLoading } = useApprovedLease();
  const { recentPayments, rentBalance: tenantRentBalance, nextPaymentDue } = useTenantPayments();
  const { conversations } = useMessages();
  const pendingRequestsCount = maintenanceRequests.filter(r => r.status === 'pending').length;
  const unreadCount = conversations.reduce((sum, c) => sum + (c.unread_count || 0), 0);

  // Real-time updates for all tenant data
  useEffect(() => {
    const rentPaymentsChannel = supabase
      .channel('rent_payments_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'rent_payments'
        },
        (payload) => {
          console.log('Payment update:', payload);
          // Update rent balance based on payments
          if (payload.eventType === 'INSERT' && payload.new.status === 'paid') {
            setRentBalance(prev => Math.max(0, prev - (payload.new.amount || 0)));
          }
          // Refresh maintenance requests to update overview stats
          refetch();
        }
      )
      .subscribe();

    const maintenanceChannel = supabase
      .channel('maintenance_requests_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'maintenance_requests'
        },
        (payload) => {
          console.log('Maintenance request update:', payload);
          // Refresh maintenance requests data
          refetch();
        }
      )
      .subscribe();

    const notificationsChannel = supabase
      .channel('notifications_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications'
        },
        (payload) => {
          console.log('Notification update:', payload);
          // Could trigger a notification refresh here
        }
      )
      .subscribe();

    const unitApplicationsChannel = supabase
      .channel('unit_applications_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'unit_applications'
        },
        (payload) => {
          console.log('Application update:', payload);
          // Could trigger application refresh here
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(rentPaymentsChannel);
      supabase.removeChannel(maintenanceChannel);
      supabase.removeChannel(notificationsChannel);
      supabase.removeChannel(unitApplicationsChannel);
    };
  }, [refetch]);

  const mockData = {
    rentBalance,
    nextPaymentDue: '2024-02-15',
    pendingRequests: maintenanceRequests.filter(r => r.status === 'pending').length,
    recentPayments: [
      { id: '1', amount: 25000, date: '2024-01-15', status: 'paid', method: 'M-PESA', reference: 'NEV123456' },
      { id: '2', amount: 25000, date: '2023-12-15', status: 'paid', method: 'Bank Transfer', reference: 'BNK789012' },
      { id: '3', amount: 25000, date: '2023-11-15', status: 'paid', method: 'M-PESA', reference: 'NEV345678' },
    ],
    maintenanceRequests: maintenanceRequests || [
      { id: '1', title: 'Leaking Faucet', status: 'in_progress', priority: 'medium', date: '2024-01-20', category: 'Plumbing', assignedTo: 'John Technician' },
      { id: '2', title: 'AC Not Working', status: 'pending', priority: 'high', date: '2024-01-22', category: 'HVAC', assignedTo: null },
      { id: '3', title: 'Door Lock Repair', status: 'completed', priority: 'low', date: '2024-01-10', category: 'Security', assignedTo: 'Mike Handyman' },
    ],
    messages: [
      { id: '1', from: 'Property Manager', subject: 'Monthly Inspection Notice', date: '2024-01-20', read: false, type: 'announcement' },
      { id: '2', from: 'Maintenance Team', subject: 'AC Repair Update', date: '2024-01-19', read: true, type: 'maintenance' },
      { id: '3', from: 'Landlord', subject: 'Lease Renewal', date: '2024-01-18', read: false, type: 'direct' },
    ],
    documents: [
      { id: '1', name: 'Lease Agreement', type: 'PDF', size: '2.4 MB', date: '2024-01-01', category: 'lease' },
      { id: '2', name: 'January Rent Receipt', type: 'PDF', size: '156 KB', date: '2024-01-15', category: 'receipt' },
      { id: '3', name: 'Move-in Checklist', type: 'PDF', size: '1.2 MB', date: '2024-01-01', category: 'lease' },
      { id: '4', name: 'Property Rules', type: 'PDF', size: '800 KB', date: '2024-01-01', category: 'policy' },
      { id: '5', name: 'Insurance Documents', type: 'PDF', size: '1.8 MB', date: '2024-01-15', category: 'insurance' },
    ],
    profile: {
      name: 'John Doe',
      email: 'john.doe@email.com',
      phone: '+254 712 345 678',
      emergencyContact: 'Jane Doe - +254 712 345 679',
      unit: 'Apt 3B',
      leaseType: '12-month lease',
      leaseStart: '2024-01-01',
      leaseEnd: '2024-12-31',
      defaultPaymentMethod: 'M-PESA'
    }
  };

  const handlePaymentSuccess = () => {
    // This would typically refresh payment data
    setRentBalance(0); // Reset balance after successful payment
    refetch(); // Refresh maintenance requests if needed
  };

  const handleViewRequest = (request: any) => {
    setSelectedRequest(request);
    setShowMaintenanceView(true);
  };

  // Filter maintenance requests
  const filteredMaintenanceRequests = mockData.maintenanceRequests.filter(request => {
    const matchesFilter = maintenanceFilter === 'all' || request.status === maintenanceFilter;
    const matchesSearch = request.title.toLowerCase().includes(maintenanceSearchTerm.toLowerCase()) ||
                         request.category.toLowerCase().includes(maintenanceSearchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-success';
      case 'pending': return 'bg-warning';
      case 'overdue': return 'bg-destructive';
      case 'in_progress': return 'bg-primary';
      default: return 'bg-muted';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-destructive';
      case 'medium': return 'bg-warning';
      case 'low': return 'bg-success';
      default: return 'bg-muted';
    }
  };

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">Welcome Back</h1>
        <p className="text-muted-foreground">Here's what's happening with your rental</p>
      </div>

      {/* Tabbed Interface */}
      <Tabs value={activeTab} onValueChange={onTabChange} className="w-full">
        <TabsList className={`grid w-full ${hasApprovedLease ? 'grid-cols-7' : 'grid-cols-9'} mb-6`}>
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <Home className="h-4 w-4" />
            Overview
          </TabsTrigger>
          {!hasApprovedLease && (
            <>
              <TabsTrigger value="browse-units" className="flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Browse Units
              </TabsTrigger>
              <TabsTrigger value="my-applications" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Applications
              </TabsTrigger>
            </>
          )}
          <TabsTrigger value="payments" className="flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            Payments
          </TabsTrigger>
          <TabsTrigger value="maintenance" className="flex items-center gap-2">
            <Wrench className="h-4 w-4" />
            Maintenance
          </TabsTrigger>
          <TabsTrigger value="visitors" className="flex items-center gap-2">
            <UserCheck className="h-4 w-4" />
            Visitors
          </TabsTrigger>
          <TabsTrigger value="documents" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Documents
          </TabsTrigger>
          <TabsTrigger value="messages" className="flex items-center gap-2">
            <MessageCircle className="h-4 w-4" />
            Messages
          </TabsTrigger>
          <TabsTrigger value="profile" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            Profile
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="bg-gradient-to-r from-primary to-primary-glow text-primary-foreground">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Current Balance</CardTitle>
                <CreditCard className="h-4 w-4" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">KES {(tenantRentBalance ?? 0).toLocaleString()}</div>
                <p className="text-xs opacity-90">Due: {nextPaymentDue || '-'}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Maintenance Requests</CardTitle>
                <Wrench className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{pendingRequestsCount}</div>
                <p className="text-xs text-muted-foreground">Active requests</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Lease Status</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">Active</div>
                <p className="text-xs text-muted-foreground">Expires: Dec 2024</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Messages</CardTitle>
                <MessageCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{unreadCount}</div>
                <p className="text-xs text-muted-foreground">Unread messages</p>
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Quick Actions
              </CardTitle>
              <CardDescription>Common tasks and shortcuts</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {!hasApprovedLease && (
                  <Button 
                    className="h-auto p-4 flex flex-col items-center gap-2" 
                    variant="outline"
                    onClick={() => onTabChange?.("browse-units")}
                  >
                    <Building2 className="h-6 w-6" />
                    <span>Browse Units</span>
                  </Button>
                )}
                <Button 
                  className="h-auto p-4 flex flex-col items-center gap-2" 
                  variant="outline"
                  onClick={() => setShowPaymentModal(true)}
                >
                  <CreditCard className="h-6 w-6" />
                  <span>Pay Rent</span>
                </Button>
                <Button 
                  className="h-auto p-4 flex flex-col items-center gap-2" 
                  variant="outline"
                  onClick={() => setShowMaintenanceModal(true)}
                >
                  <Wrench className="h-6 w-6" />
                  <span>Request Maintenance</span>
                </Button>
                <Button className="h-auto p-4 flex flex-col items-center gap-2" variant="outline">
                  <FileText className="h-6 w-6" />
                  <span>View Documents</span>
                </Button>
                <Button 
                  className="h-auto p-4 flex flex-col items-center gap-2" 
                  variant="outline"
                  onClick={() => onTabChange?.("messages")}
                >
                  <MessageCircle className="h-6 w-6" />
                  <span>Contact Landlord</span>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Important Notice */}
          <Card className="border-warning bg-warning/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-warning">
                <AlertCircle className="h-5 w-5" />
                Important Notice
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm">
                Your rent payment for February is due in 5 days. Please ensure payment is made on time to avoid late fees.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Browse Units Tab - Only show if no approved lease */}
        {!hasApprovedLease && (
          <TabsContent value="browse-units" className="space-y-6">
            <UnitBrowsing />
          </TabsContent>
        )}

        {/* My Applications Tab - Only show if no approved lease */}
        {!hasApprovedLease && (
          <TabsContent value="my-applications" className="space-y-6">
            <MyApplications />
          </TabsContent>
        )}

        {/* Payments Tab */}
        <TabsContent value="payments" className="space-y-6">
          {/* Header */}
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-xl font-semibold">Rent & Payments</h3>
              <p className="text-muted-foreground">Manage your rent payments and history</p>
            </div>
            <Button onClick={() => setShowPaymentModal(true)}>
              <CreditCard className="h-4 w-4 mr-2" />
              Pay Rent
            </Button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Current Balance */}
            <Card className="bg-gradient-to-r from-primary to-primary-glow text-primary-foreground">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Current Balance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold mb-2">KES {(tenantRentBalance ?? 0).toLocaleString()}</div>
                <p className="text-sm opacity-90 mb-2">Due: {nextPaymentDue || '-'}</p>
                <p className="text-xs opacity-75 mb-4">Late fee: KES 2,500 after due date</p>
                <Button 
                  variant="secondary" 
                  onClick={() => setShowPaymentModal(true)}
                  className="w-full"
                >
                  Pay Now
                </Button>
              </CardContent>
            </Card>

            {/* Payment Plans */}
            <Card>
              <CardHeader>
                <CardTitle>Payment Plans</CardTitle>
                <CardDescription>Available payment options</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="p-3 border rounded-lg bg-primary/5">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Full Payment</p>
                        <p className="text-sm text-muted-foreground">Pay entire amount</p>
                      </div>
                      <Badge variant="secondary">Recommended</Badge>
                    </div>
                  </div>
                  <div className="p-3 border rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Split Payment</p>
                        <p className="text-sm text-muted-foreground">2 installments available</p>
                      </div>
                      <Button variant="outline" size="sm">Setup</Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Payment History */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Payment History</span>
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
              </CardTitle>
              <CardDescription>Your rent payment records</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentPayments.map((payment) => (
                  <div key={payment.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                        <Receipt className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">KES {Math.abs(payment.amount || 0).toLocaleString()}</p>
                        <p className="text-sm text-muted-foreground">{payment.date} • {payment.method || 'N/A'}</p>
                        {payment.reference && (
                          <p className="text-xs text-muted-foreground">Ref: {payment.reference}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={getStatusColor(payment.status)}>
                        {payment.status}
                      </Badge>
                      <Button variant="outline" size="sm">
                        <Download className="h-4 w-4 mr-1" />
                        Receipt
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Payment Methods */}
          <Card>
            <CardHeader>
              <CardTitle>Payment Methods</CardTitle>
              <CardDescription>Manage your preferred payment options</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="p-4 border-2 border-primary bg-primary/5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-6 bg-primary rounded flex items-center justify-center">
                        <span className="text-xs text-primary-foreground font-bold">M</span>
                      </div>
                      <div>
                        <p className="font-medium">M-Pesa</p>
                        <p className="text-xs text-muted-foreground">Mobile Money</p>
                      </div>
                    </div>
                    <CheckCircle className="h-4 w-4 text-primary" />
                  </div>
                </Card>
                <Card className="p-4 border-2 border-dashed border-muted-foreground/30 cursor-pointer hover:border-primary/50">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-6 bg-muted rounded flex items-center justify-center">
                      <Plus className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="font-medium">Add Bank Account</p>
                      <p className="text-xs text-muted-foreground">Connect your bank</p>
                    </div>
                  </div>
                </Card>
                <Card className="p-4 border-2 border-dashed border-muted-foreground/30 cursor-pointer hover:border-primary/50">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-6 bg-muted rounded flex items-center justify-center">
                      <Plus className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="font-medium">Add Card</p>
                      <p className="text-xs text-muted-foreground">Credit/Debit card</p>
                    </div>
                  </div>
                </Card>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Maintenance Tab */}
        <TabsContent value="maintenance" className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-xl font-semibold">Maintenance Requests</h3>
              <p className="text-muted-foreground">Submit and track maintenance requests</p>
            </div>
            <Button onClick={() => setShowMaintenanceModal(true)}>
              <Wrench className="h-4 w-4 mr-2" />
              New Request
            </Button>
          </div>

          {/* Emergency Contacts */}
          <Card className="border-destructive bg-destructive/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <Phone className="h-5 w-5" />
                Emergency Contacts
              </CardTitle>
              <CardDescription>For urgent repairs that require immediate attention</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-destructive/10 rounded-lg flex items-center justify-center">
                    <Wrench className="h-5 w-5 text-destructive" />
                  </div>
                  <div>
                    <p className="font-medium">Emergency Maintenance</p>
                    <p className="text-sm text-muted-foreground">+254 700 123 456</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-destructive/10 rounded-lg flex items-center justify-center">
                    <Shield className="h-5 w-5 text-destructive" />
                  </div>
                  <div>
                    <p className="font-medium">Security Emergency</p>
                    <p className="text-sm text-muted-foreground">+254 700 789 012</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Request Filters */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Label>Filter by:</Label>
                  <Button variant="outline" size="sm">All Requests</Button>
                  <Button variant="outline" size="sm">Active</Button>
                  <Button variant="outline" size="sm">Completed</Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Active and Past Requests */}
          <div className="space-y-4">
            <h4 className="font-medium">Active Requests</h4>
            {mockData.maintenanceRequests.filter(req => req.status !== 'completed').map((request) => (
              <Card key={request.id}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-semibold text-lg">{request.title}</h4>
                        <Badge variant="outline">{request.category}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">Submitted: {(request as any).createdDate || (request as any).date}</p>
                      {request.assignedTo && (
                        <p className="text-sm text-muted-foreground mb-3">
                          Assigned to: {request.assignedTo}
                        </p>
                      )}
                      <div className="flex items-center gap-2">
                        <Badge className={getPriorityColor(request.priority)} variant="secondary">
                          {request.priority} priority
                        </Badge>
                        <Badge className={getStatusColor(request.status)} variant="secondary">
                          {request.status}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewRequest({
                          id: request.id,
                          title: request.title,
                          description: (request as any).description || `${request.category} issue reported`,
                          status: ((request as any).status === 'in-progress' ? 'in_progress' : (request as any).status) || 'pending',
                          priority: (request as any).priority || 'medium',
                          category: request.category || 'General',
                          date: (request as any).createdDate || (request as any).date || new Date().toISOString(),
                          assignedTo: (request as any).assignedTo,
                          images: (request as any).images || [],
                          estimatedCost: (request as any).estimatedCost,
                          actualCost: (request as any).actualCost,
                          scheduledDate: (request as any).scheduledDate,
                          completedDate: (request as any).completedDate,
                        })}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewRequest({
                          id: request.id,
                          title: request.title,
                          description: (request as any).description || `${request.category} issue reported`,
                          status: ((request as any).status === 'in-progress' ? 'in_progress' : (request as any).status) || 'pending',
                          priority: (request as any).priority || 'medium',
                          category: request.category || 'General',
                          date: (request as any).createdDate || (request as any).date || new Date().toISOString(),
                          assignedTo: (request as any).assignedTo,
                          images: (request as any).images || [],
                          estimatedCost: (request as any).estimatedCost,
                          actualCost: (request as any).actualCost,
                          scheduledDate: (request as any).scheduledDate,
                          completedDate: (request as any).completedDate,
                        })}
                      >
                        <MessageCircle className="h-4 w-4 mr-1" />
                        Chat
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            <Separator />
            
            <h4 className="font-medium">Past Requests</h4>
            {mockData.maintenanceRequests.filter(req => req.status === 'completed').map((request) => (
              <Card key={request.id} className="opacity-75">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-semibold">{request.title}</h4>
                        <Badge variant="outline">{request.category}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        Completed: {(request as any).createdDate || (request as any).date} • {request.assignedTo}
                      </p>
                      <div className="flex items-center gap-2">
                        <Badge className="bg-success text-success-foreground">
                          Completed
                        </Badge>
                        <Button variant="ghost" size="sm">
                          <Star className="h-4 w-4 mr-1" />
                          Rate Service
                        </Button>
                      </div>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleViewRequest({
                        id: request.id,
                        title: request.title,
                        description: (request as any).description || `${request.category} issue reported`,
                        status: ((request as any).status === 'in-progress' ? 'in_progress' : (request as any).status) || 'completed',
                        priority: (request as any).priority || 'medium',
                        category: request.category || 'General',
                        date: (request as any).createdDate || (request as any).date || new Date().toISOString(),
                        assignedTo: (request as any).assignedTo,
                        images: (request as any).images || [],
                        estimatedCost: (request as any).estimatedCost,
                        actualCost: (request as any).actualCost,
                        scheduledDate: (request as any).scheduledDate,
                        completedDate: (request as any).completedDate,
                      })}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      View
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Maintenance Tips */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Maintenance Tips
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-primary rounded-full mt-2"></div>
                  <div>
                    <p className="font-medium">Report issues early</p>
                    <p className="text-sm text-muted-foreground">Small problems can become big expenses if left unaddressed</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-primary rounded-full mt-2"></div>
                  <div>
                    <p className="font-medium">Include photos and details</p>
                    <p className="text-sm text-muted-foreground">Photos and detailed descriptions help maintenance staff understand issues better</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-primary rounded-full mt-2"></div>
                  <div>
                    <p className="font-medium">Use emergency contacts wisely</p>
                    <p className="text-sm text-muted-foreground">Emergency line is for urgent issues only (water leaks, electrical hazards, security)</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Visitors Tab */}
        <TabsContent value="visitors" className="space-y-6">
          <VisitorsSection />
        </TabsContent>

        {/* Documents Tab */}
        <TabsContent value="documents" className="space-y-6">
          <TenantDocuments />
        </TabsContent>

        {/* Messages Tab */}
        <TabsContent value="messages" className="space-y-6">
          <MessagesSection />
        </TabsContent>

        {/* Profile Tab */}
        <TabsContent value="profile" className="space-y-6">
          <ProfileEditForm />
          <CoTenantManagement />
          <PaymentMethodsManagement />
          <PasswordChangeForm />
          <SessionsManagement />
        </TabsContent>
      </Tabs>

      {/* Modals */}
      <TenantPaymentModal
        open={showPaymentModal}
        onOpenChange={setShowPaymentModal}
        rentAmount={tenantRentBalance ?? 0}
        dueDate={nextPaymentDue || '-'}
        onPaymentSuccess={handlePaymentSuccess}
      />
      
      <MaintenanceRequestModal
        isOpen={showMaintenanceModal}
        onClose={() => setShowMaintenanceModal(false)}
        onSuccess={refetch}
      />
      
      <MaintenanceRequestView
        isOpen={showMaintenanceView}
        onClose={() => setShowMaintenanceView(false)}
        request={selectedRequest}
      />
    </div>
  );
};

export { TenantDashboard };