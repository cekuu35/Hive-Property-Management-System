import React, { useState } from 'react';
import { MobileHeader } from '@/components/ui/mobile-header';
import { MobileCard, MobileGrid, MobileList, MobileListItem } from '@/components/ui/mobile-card';
import { MobileNavigation } from '@/components/ui/mobile-navigation';
import { MobileBottomNav } from '@/components/ui/mobile-bottom-nav';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  CreditCard, 
  Wrench, 
  FileText, 
  MessageCircle, 
  Bell, 
  Home, 
  Receipt,
  Calendar,
  AlertCircle,
  CheckCircle,
  Clock,
  DollarSign,
  RefreshCw,
  Plus,
  Shield,
  User
} from 'lucide-react';
import { MpesaRentPaymentModal } from './MpesaRentPaymentModal';
import { MaintenanceRequestModal } from '@/components/dashboard/maintenance/MaintenanceRequestModal';
import { LandlordInfoCard } from './LandlordInfoCard';
import { useMaintenanceRequests } from '@/hooks/useMaintenanceRequests';
import { useApprovedLease } from '@/hooks/useApprovedLease';
import { useTenantPayments } from '@/hooks/useTenantPayments';
import { useTenantInfo } from '@/hooks/useTenantInfo';

interface MobileTenantDashboardProps {
  onTabChange?: (tab: string) => void;
}

export function MobileTenantDashboard({ onTabChange }: MobileTenantDashboardProps) {
  const [activeTab, setActiveTab] = useState('overview');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showMaintenanceModal, setShowMaintenanceModal] = useState(false);

  const { requests: maintenanceRequests, loading: maintenanceLoading } = useMaintenanceRequests();
  const { approvedLease, hasApprovedLease } = useApprovedLease();
  const { 
    recentPayments, 
    rentBalance, 
    nextPaymentDue,
    currentRentDue,
    isOverdue,
    daysUntilDue,
    lateFee
  } = useTenantPayments();
  const { tenantInfo } = useTenantInfo();

  const pendingRequestsCount = maintenanceRequests.filter(r => r.status === 'pending').length;
  const unreadCount = 0; // This would come from messages hook

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    onTabChange?.(tab);
  };

  const handleRefresh = () => {
    // Refresh all data
    window.location.reload();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'success';
      case 'pending': return 'warning';
      case 'overdue': return 'error';
      case 'in_progress': return 'info';
      default: return 'default';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'error';
      case 'medium': return 'warning';
      case 'low': return 'success';
      default: return 'default';
    }
  };

  const renderOverview = () => (
    <div className="space-y-4 p-4">
      {/* Quick Stats */}
      <MobileGrid columns={2}>
        <MobileCard
          title="Rent Balance"
          value={`KES ${(rentBalance || 0).toLocaleString()}`}
          status={isOverdue ? 'error' : rentBalance > 0 ? 'warning' : 'success'}
          icon={<CreditCard className="h-5 w-5" />}
          action={{
            label: 'Pay Now',
            onClick: () => setShowPaymentModal(true),
            variant: rentBalance > 0 ? 'default' : 'outline'
          }}
        />
        <MobileCard
          title="Maintenance"
          value={pendingRequestsCount}
          status={pendingRequestsCount > 0 ? 'warning' : 'success'}
          icon={<Wrench className="h-5 w-5" />}
          action={{
            label: 'View All',
            onClick: () => handleTabChange('maintenance'),
            variant: 'outline'
          }}
        />
      </MobileGrid>

      {/* Payment Info */}
      {hasApprovedLease && (
        <MobileCard
          title="Next Payment Due"
          description={nextPaymentDue ? `Due on ${new Date(nextPaymentDue).toLocaleDateString()}` : 'No payment due'}
          value={currentRentDue ? `KES ${currentRentDue.toLocaleString()}` : 'Paid'}
          status={isOverdue ? 'error' : rentBalance > 0 ? 'warning' : 'success'}
          icon={<Calendar className="h-5 w-5" />}
        />
      )}

      {/* Landlord Info */}
      <LandlordInfoCard />

      {/* Quick Actions */}
      <MobileCard title="Quick Actions">
        <div className="space-y-3">
          <Button 
            className="w-full h-12" 
            onClick={() => setShowMaintenanceModal(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            Request Maintenance
          </Button>
          <Button 
            variant="outline" 
            className="w-full h-12"
            onClick={() => handleTabChange('messages')}
          >
            <MessageCircle className="h-4 w-4 mr-2" />
            Message Landlord
          </Button>
        </div>
      </MobileCard>

      {/* Recent Activity */}
      <MobileCard title="Recent Activity">
        <MobileList>
          {recentPayments.slice(0, 3).map((payment, index) => (
            <MobileListItem
              key={index}
              title={`Payment - ${payment.amount ? `KES ${payment.amount.toLocaleString()}` : 'Rent'}`}
              subtitle={payment.payment_date ? new Date(payment.payment_date).toLocaleDateString() : 'Recent'}
              value={payment.status}
              status={getStatusColor(payment.status || 'pending')}
              icon={<Receipt className="h-4 w-4" />}
            />
          ))}
        </MobileList>
      </MobileCard>
    </div>
  );

  const renderMaintenance = () => (
    <div className="space-y-4 p-4">
      <MobileCard
        title="Maintenance Requests"
        description="Track your repair requests"
        action={{
          label: 'New Request',
          onClick: () => setShowMaintenanceModal(true),
          variant: 'default'
        }}
      />

      <MobileList>
        {maintenanceRequests.map((request) => (
          <MobileListItem
            key={request.id}
            title={request.title || 'Maintenance Request'}
            subtitle={request.description || 'No description'}
            value={request.status}
            status={getStatusColor(request.status || 'pending')}
            icon={<Wrench className="h-4 w-4" />}
            onClick={() => {
              // Handle view request
            }}
          />
        ))}
      </MobileList>
    </div>
  );

  const renderPayments = () => (
    <div className="space-y-4 p-4">
      <MobileCard
        title="Payment History"
        description="View all your payments"
      />

      <MobileList>
        {recentPayments.map((payment, index) => (
          <MobileListItem
            key={index}
            title={`Payment - ${payment.amount ? `KES ${payment.amount.toLocaleString()}` : 'Rent'}`}
            subtitle={payment.payment_date ? new Date(payment.payment_date).toLocaleDateString() : 'Recent'}
            value={payment.status}
            status={getStatusColor(payment.status || 'pending')}
            icon={<Receipt className="h-4 w-4" />}
          />
        ))}
      </MobileList>
    </div>
  );

  const renderDocuments = () => (
    <div className="space-y-4 p-4">
      <MobileCard
        title="Documents"
        description="Your lease and payment documents"
      />
      <MobileList>
        <MobileListItem
          title="Lease Agreement"
          subtitle="Signed on Jan 1, 2024"
          value="PDF"
          icon={<FileText className="h-4 w-4" />}
        />
        <MobileListItem
          title="Rent Receipt - January"
          subtitle="Paid on Jan 15, 2024"
          value="PDF"
          icon={<Receipt className="h-4 w-4" />}
        />
        <MobileListItem
          title="Property Rules"
          subtitle="Updated Jan 1, 2024"
          value="PDF"
          icon={<FileText className="h-4 w-4" />}
        />
      </MobileList>
    </div>
  );

  const renderMessages = () => (
    <div className="space-y-4 p-4">
      <MobileCard
        title="Messages"
        description="Chat with your landlord"
      />
      <MobileList>
        <MobileListItem
          title="Property Manager"
          subtitle="Monthly inspection scheduled"
          value="2 min ago"
          icon={<MessageCircle className="h-4 w-4" />}
        />
        <MobileListItem
          title="Maintenance Team"
          subtitle="AC repair completed"
          value="1 hour ago"
          icon={<MessageCircle className="h-4 w-4" />}
        />
        <MobileListItem
          title="Landlord"
          subtitle="Lease renewal discussion"
          value="2 days ago"
          icon={<MessageCircle className="h-4 w-4" />}
        />
      </MobileList>
    </div>
  );

  const renderProfile = () => (
    <div className="space-y-4 p-4">
      <MobileCard
        title="Profile Settings"
        description="Manage your account"
      />
      <MobileList>
        <MobileListItem
          title="Personal Information"
          subtitle="Update your details"
          icon={<User className="h-4 w-4" />}
        />
        <MobileListItem
          title="Payment Methods"
          subtitle="Manage M-Pesa settings"
          icon={<CreditCard className="h-4 w-4" />}
        />
        <MobileListItem
          title="Notifications"
          subtitle="Configure alerts"
          icon={<Bell className="h-4 w-4" />}
        />
        <MobileListItem
          title="Security"
          subtitle="Password and privacy"
          icon={<Shield className="h-4 w-4" />}
        />
      </MobileList>
    </div>
  );

  const renderContent = () => {
    switch (activeTab) {
      case 'overview':
        return renderOverview();
      case 'maintenance':
        return renderMaintenance();
      case 'payments':
        return renderPayments();
      case 'documents':
        return renderDocuments();
      case 'messages':
        return renderMessages();
      case 'profile':
        return renderProfile();
      default:
        return renderOverview();
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Mobile Navigation Sidebar */}
      <MobileNavigation
        activeTab={activeTab}
        onTabChange={handleTabChange}
        pendingRequests={pendingRequestsCount}
        unreadMessages={unreadCount}
        userRole="tenant"
      />

      {/* Mobile Header */}
      <MobileHeader
        title="Dashboard"
        subtitle="Welcome back"
        notifications={pendingRequestsCount + unreadCount}
        onRefresh={handleRefresh}
        userAvatar={tenantInfo?.avatar_url}
        userName={tenantInfo ? `${tenantInfo.first_name} ${tenantInfo.last_name}` : 'Tenant'}
      />

      {/* Content */}
      <div className="pb-4">
        {renderContent()}
      </div>

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav
        activeTab={activeTab}
        onTabChange={handleTabChange}
        pendingRequests={pendingRequestsCount}
        unreadMessages={unreadCount}
        userRole="tenant"
      />

      {/* Modals */}
      {showPaymentModal && (
        <MpesaRentPaymentModal
          open={showPaymentModal}
          onOpenChange={setShowPaymentModal}
          paymentData={{
            leaseId: approvedLease?.id || '',
            amount: currentRentDue || 0,
            tenantId: tenantInfo?.id || '',
            landlordId: approvedLease?.landlord_id || ''
          }}
          onPaymentSuccess={() => {
            setShowPaymentModal(false);
            handleRefresh();
          }}
        />
      )}

      {showMaintenanceModal && (
        <MaintenanceRequestModal
          open={showMaintenanceModal}
          onOpenChange={setShowMaintenanceModal}
          onSuccess={() => {
            setShowMaintenanceModal(false);
            handleRefresh();
          }}
        />
      )}
    </div>
  );
}
