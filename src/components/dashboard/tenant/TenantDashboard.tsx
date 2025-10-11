import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  CreditCard, Wrench, FileText, MessageCircle, AlertCircle, Calendar, Home, Receipt, Settings, Bell,
  Download, Upload, Phone, Shield, User, Mail, MapPin, DollarSign, Clock, CheckCircle, XCircle,
  Send, Plus, Search, Filter, Eye, Edit, Trash2, UserCheck, Star, Building2, RefreshCw
} from 'lucide-react';
import { TenantPaymentModal } from './TenantPaymentModal';
import { MaintenanceRequestModal } from '@/components/dashboard/maintenance/MaintenanceRequestModal';
import { MaintenanceRequestView } from './MaintenanceRequestView';
import { TenantDocuments } from './TenantDocuments';
import { UnitBrowsing } from './UnitBrowsing';
import { MyApplications } from './MyApplications';
import { PaymentHistory } from './PaymentHistory';
import { ProfileEditForm } from './profile/ProfileEditForm';
import { CoTenantManagement } from './profile/CoTenantManagement';
import { PasswordChangeForm } from './profile/PasswordChangeForm';
import { SessionsManagement } from './profile/SessionsManagement';
import { PaymentMethodsManagement } from './profile/PaymentMethodsManagement';
import { MessagesSection } from './MessagesSection';
import { VisitorsSection } from './VisitorsSection';
import { UtilityBillsSection } from './UtilityBillsSection';
import { TenantNotices } from './TenantNotices';
import { useMaintenanceRequests } from '@/hooks/useMaintenanceRequests';
import { useApprovedLease } from '@/hooks/useApprovedLease';
import { supabase } from '@/integrations/supabase/client';
import { useTenantPayments } from '@/hooks/useTenantPayments';
import { useRentFlow } from '@/hooks/useRentFlow';
import { useMessages } from '@/hooks/useMessages';
import { useTenantInfo } from '@/hooks/useTenantInfo';

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
  const { approvedLease, hasApprovedLease, loading: leaseLoading, refetch: refetchLease } = useApprovedLease();
  const { 
    recentPayments, 
    rentBalance: tenantRentBalance, 
    nextPaymentDue,
    currentRentDue,
    isOverdue,
    daysUntilDue,
    lateFee,
    refetch: refetchPayments
  } = useTenantPayments();
  
  const { 
    hasActiveLease, 
    securityDepositPaid, 
    monthlyRentDue, 
    loading: rentFlowLoading 
  } = useRentFlow();
  const { tenantInfo, refetch: refetchTenantInfo } = useTenantInfo();
  const { conversations } = useMessages();
  const pendingRequestsCount = maintenanceRequests.filter(r => r.status === 'pending').length;
  const unreadCount = conversations.reduce((sum, c) => sum + (c.unread_count || 0), 0);
  
  // Use calculated balance from monthly rent hook as the primary source
  // The monthly rent hook calculates based on actual payments and is more accurate
  const calculatedBalance = tenantRentBalance || 0;
  const tenantInfoBalance = tenantInfo?.current_balance || 0;
  
  // If monthly rent calculation shows 0, it means either:
  // 1. No rent is due (all payments made), or
  // 2. No payment record exists for current month (rent is due)
  // In case 2, we should show the rent amount, not 0
  const displayBalance = calculatedBalance > 0 ? calculatedBalance : (tenantInfoBalance > 0 ? tenantInfoBalance : 0);
  
  const displayPaymentStatus = hasApprovedLease 
    ? (displayBalance > 0 ? 'unpaid' : 'paid')
    : (tenantInfo?.payment_status ?? 'paid');

  // Debug logging
  console.log('🏠 [TenantDashboard] Rent Display Debug:', {
    tenantInfo: tenantInfo ? {
      current_balance: tenantInfo.current_balance,
      payment_status: tenantInfo.payment_status,
      tenant_status: tenantInfo.tenant_status
    } : null,
    tenantRentBalance,
    displayBalance,
    hasApprovedLease,
    approvedLease: approvedLease ? {
      id: approvedLease.id,
      rent_amount: approvedLease.rent_amount,
      status: approvedLease.status
    } : null
  });

  // Real-time updates for all tenant data
  useEffect(() => {
    const tenantDataChannel = supabase
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

    // Listen for payment completion notifications from edge function
    const paymentUpdatesChannel = supabase
      .channel('payment_updates')
      .on(
        'broadcast',
        { event: 'payment_completed' },
        (payload) => {
          console.log('🔄 [TenantDashboard] Payment completion notification received:', payload);
          // Refresh all data when payment is completed
          refreshBalance();
          refetch();
          
          // Show success notification
          console.log('Payment processed successfully! Balance updated.');
        }
      )
      .subscribe();

    // Also listen for database changes in rent_payments
    const rentPaymentsChannel = supabase
      .channel('rent_payments_realtime')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'rent_payments'
        },
        (payload) => {
          console.log('🔄 [TenantDashboard] Rent payment updated:', payload);
          if (payload.new.status === 'paid') {
            refreshBalance();
            refetch();
            console.log('Payment confirmed! Balance updated.');
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(rentPaymentsChannel);
      supabase.removeChannel(maintenanceChannel);
      supabase.removeChannel(notificationsChannel);
      supabase.removeChannel(unitApplicationsChannel);
      supabase.removeChannel(paymentUpdatesChannel);
    };
  }, [refetch]);

  const mockData = {
    rentBalance: tenantRentBalance || rentBalance,
    nextPaymentDue: nextPaymentDue || '2024-02-15',
    pendingRequests: maintenanceRequests.filter(r => r.status === 'pending').length,
    recentPayments: recentPayments || [],
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

  const handlePaymentSuccess = async () => {
    // Refresh all tenant data after successful payment
    console.log('🔄 [TenantDashboard] Payment successful, refreshing data...');
    
    try {
      // Immediate refresh - run all refreshes in parallel for faster response
      console.log('📊 [TenantDashboard] Refreshing all data sources...');
      await Promise.all([
        refetch(), // Maintenance requests
        refetchPayments(), // Payment data and balance
        refetchLease(), // Lease information
        refetchTenantInfo() // Tenant info including balance
      ]);
      
      console.log('✅ [TenantDashboard] Initial refresh completed');
      
      // Add multiple refresh attempts to ensure balance updates
      console.log('🔄 [TenantDashboard] Additional refresh attempts...');
      
      // Second refresh after 500ms
      setTimeout(() => {
        console.log('🔄 [TenantDashboard] Second refresh attempt...');
        refreshBalance();
      }, 500);
      
      // Third refresh after 1.5 seconds
      setTimeout(() => {
        console.log('🔄 [TenantDashboard] Third refresh attempt...');
        refreshBalance();
      }, 1500);
      
      // Final refresh after 3 seconds
      setTimeout(() => {
        console.log('🔄 [TenantDashboard] Final refresh attempt...');
        refreshBalance();
      }, 3000);
      
    } catch (error) {
      console.error('❌ [TenantDashboard] Error refreshing data after payment:', error);
      // Don't throw error to avoid breaking the payment flow
    }
  };

  const handleViewRequest = (request: any) => {
    setSelectedRequest(request);
    setShowMaintenanceView(true);
  };

  // Global refresh function for balance updates
  const refreshBalance = async () => {
    console.log('🔄 [TenantDashboard] Global balance refresh triggered');
    try {
      await Promise.all([
        refetchPayments(),
        refetchTenantInfo(),
        refetchLease()
      ]);
      console.log('✅ [TenantDashboard] Global refresh completed');
    } catch (error) {
      console.error('❌ [TenantDashboard] Global refresh failed:', error);
    }
  };

  // Keyboard shortcut for refreshing balance (Ctrl+R or Cmd+R)
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key === 'r') {
        event.preventDefault();
        refreshBalance();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

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

      {/* Content based on current tab */}

        {/* Overview Tab */}
        {activeTab === "overview" && (
          <div className="space-y-6">
          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className={`${displayPaymentStatus === 'overdue' || isOverdue ? 'bg-gradient-to-r from-destructive to-destructive/80' : displayBalance > 0 ? 'bg-gradient-to-r from-warning to-warning/80' : 'bg-gradient-to-r from-success to-success/80'} text-primary-foreground`}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Rent Balance</CardTitle>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-primary-foreground hover:bg-white/20 h-6 w-6 p-0"
                    onClick={refreshBalance}
                  >
                    <RefreshCw className="h-3 w-3" />
                  </Button>
                  <CreditCard className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">KES {(displayBalance ?? 0).toLocaleString()}</div>
                <p className="text-xs opacity-90">
                  {displayPaymentStatus === 'paid' ? 'Paid' : displayPaymentStatus === 'overdue' || isOverdue ? `Overdue by ${Math.abs(daysUntilDue)} days` : `Due: ${nextPaymentDue || '-'}`}
                </p>
                {lateFee > 0 && (
                  <p className="text-xs opacity-90 mt-1">Late fee: KES {lateFee.toLocaleString()}</p>
                )}
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
                <div className="text-2xl font-bold">{hasApprovedLease ? 'Active' : 'No Lease'}</div>
                <p className="text-xs text-muted-foreground">
                  {hasApprovedLease && approvedLease?.end_date 
                    ? `Expires: ${new Date(approvedLease.end_date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}`
                    : hasApprovedLease 
                      ? 'Lease Active'
                      : 'Apply for a lease'
                  }
                </p>
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
                  variant={displayBalance > 0 ? "default" : "outline"}
                  onClick={() => setShowPaymentModal(true)}
                  disabled={displayBalance === 0}
                >
                  <CreditCard className="h-6 w-6" />
                  <span>Pay Rent</span>
                  {displayBalance > 0 && (
                    <span className="text-xs">KES {displayBalance.toLocaleString()}</span>
                  )}
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

          {/* Real-time Notices */}
          <TenantNotices maxNotices={3} />
          </div>
        )}

        {/* Browse Units Tab */}
        {activeTab === "browse-units" && (
          <div className="space-y-6">
            <UnitBrowsing />
          </div>
        )}

        {/* My Applications Tab */}
        {activeTab === "my-applications" && (
          <div className="space-y-6">
            <MyApplications onTabChange={onTabChange} />
          </div>
        )}

        {/* Payments Tab */}
        {activeTab === "payments" && (
          <div className="space-y-6">
          {/* Header */}
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-xl font-semibold">Rent & Payments</h3>
              <p className="text-muted-foreground">Manage your rent payments and history</p>
            </div>
            <Button 
              onClick={() => setShowPaymentModal(true)}
              disabled={displayBalance === 0}
              variant={displayBalance > 0 ? "default" : "outline"}
            >
              <CreditCard className="h-4 w-4 mr-2" />
              Pay Rent {displayBalance > 0 && `(KES ${displayBalance.toLocaleString()})`}
            </Button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Current Balance */}
            <Card className={`bg-gradient-to-r ${isOverdue ? 'from-red-500 to-red-600' : 'from-primary to-primary-glow'} text-primary-foreground`}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5" />
                    {isOverdue ? 'Overdue Balance' : 'Current Balance'}
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-primary-foreground hover:bg-white/20 h-8 w-8 p-0"
                    onClick={refreshBalance}
                  >
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold mb-2">KES {(displayBalance ?? 0).toLocaleString()}</div>
                
                {/* Rent Flow Status */}
                {hasApprovedLease && (
                  <div className="mb-4 p-3 bg-white/10 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <div className={`w-2 h-2 rounded-full ${securityDepositPaid ? 'bg-green-400' : 'bg-yellow-400'}`}></div>
                      <span className="text-sm font-medium">
                        {securityDepositPaid ? 'Security Deposit Paid ✓' : 'Security Deposit Pending'}
                      </span>
                    </div>
                    {securityDepositPaid && monthlyRentDue > 0 && (
                      <p className="text-xs opacity-90">
                        Monthly rent of KES {monthlyRentDue.toLocaleString()} is now due
                      </p>
                    )}
                  </div>
                )}
                
                <div className="space-y-1 mb-4">
                  <p className="text-sm opacity-90">
                    Due: {nextPaymentDue ? new Date(nextPaymentDue).toLocaleDateString() : '-'}
                  </p>
                  {currentRentDue > 0 && (
                    <p className="text-xs opacity-75">
                      Monthly Rent: KES {currentRentDue.toLocaleString()}
                    </p>
                  )}
                  {lateFee > 0 && (
                    <p className="text-xs opacity-75 text-red-200">
                      Late Fee: KES {lateFee.toLocaleString()}
                    </p>
                  )}
                  {daysUntilDue !== 0 && (
                    <p className="text-xs opacity-75">
                      {isOverdue 
                        ? `${Math.abs(daysUntilDue)} days overdue` 
                        : `${daysUntilDue} days until due`
                      }
                    </p>
                  )}
                </div>
                <Button 
                  variant="secondary" 
                  onClick={() => setShowPaymentModal(true)}
                  className="w-full"
                  disabled={!hasApprovedLease || !securityDepositPaid}
                >
                  {!hasApprovedLease ? 'No Active Lease' : 
                   !securityDepositPaid ? 'Security Deposit Required' :
                   isOverdue ? 'Pay Overdue Amount' : 'Pay Now'}
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
          <PaymentHistory onMakePayment={() => setShowPaymentModal(true)} />

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
          </div>
        )}

        {/* Utility Bills Tab */}
        {activeTab === "utility-bills" && (
          <div className="space-y-6">
            <UtilityBillsSection />
          </div>
        )}

        {/* Maintenance Tab */}
        {activeTab === "maintenance" && (
          <div className="space-y-6">
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
          </div>
        )}

        {/* Visitors Tab */}
        {activeTab === "visitors" && (
          <div className="space-y-6">
            <VisitorsSection />
          </div>
        )}

        {/* Documents Tab */}
        {activeTab === "documents" && (
          <div className="space-y-6">
            <TenantDocuments />
          </div>
        )}

        {/* Messages Tab */}
        {activeTab === "messages" && (
          <div className="space-y-6">
            <MessagesSection />
          </div>
        )}

        {/* Profile Tab */}
        {activeTab === "profile" && (
          <div className="space-y-6">
          <ProfileEditForm />
          <CoTenantManagement />
          <PaymentMethodsManagement />
          <PasswordChangeForm />
          <SessionsManagement />
          </div>
        )}

      {/* Modals */}
      <TenantPaymentModal
        open={showPaymentModal}
        onOpenChange={setShowPaymentModal}
        rentAmount={displayBalance}
        dueDate={nextPaymentDue || '-'}
        onPaymentSuccess={handlePaymentSuccess}
        leaseData={approvedLease ? {
          id: approvedLease.id,
          unit_id: approvedLease.unit_id,
          tenant_id: approvedLease.tenant_id,
          units: approvedLease.units ? {
            property_id: approvedLease.units.properties?.id || '',
            properties: {
              landlord_id: approvedLease.units.properties?.landlord_id || ''
            }
          } : undefined
        } : undefined}
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