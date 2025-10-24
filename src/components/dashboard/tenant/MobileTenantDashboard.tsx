import React, { useState, useMemo, useCallback, useEffect } from 'react';
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
  User,
  Eye,
  Building2,
  UserCheck
} from 'lucide-react';
import { MpesaRentPaymentModal } from './MpesaRentPaymentModal';
import { MaintenanceRequestModal } from '@/components/dashboard/maintenance/MaintenanceRequestModal';
import { LandlordInfoCard } from './LandlordInfoCard';
import { useMaintenanceRequests } from '@/hooks/useMaintenanceRequests';
import { useApprovedLease } from '@/hooks/useApprovedLease';
import { useTenantPayments } from '@/hooks/useTenantPayments';
import { useTenantInfo } from '@/hooks/useTenantInfo';
import { useUtilityBills } from '@/hooks/useUtilityBills';
import { MpesaUtilityPaymentModal } from './MpesaUtilityPaymentModal';
import { useMessages } from '@/hooks/useMessages';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ProfileEditForm } from './profile/ProfileEditForm';
import { NotificationSettings } from '@/components/dashboard/NotificationSettings';
import { UnitBrowsing } from './UnitBrowsing';
import { MyApplications } from './MyApplications';
import { VisitorsSection } from './VisitorsSection';
import { TenantNotices } from './TenantNotices';
import { LeaseDocumentViewer } from './LeaseDocumentViewer';
import { MaintenanceRequestView } from './MaintenanceRequestView';
import { CoTenantManagement } from './profile/CoTenantManagement';
import { PasswordChangeForm } from './profile/PasswordChangeForm';
import { SessionsManagement } from './profile/SessionsManagement';
import { PaymentMethodsManagement } from './profile/PaymentMethodsManagement';
import { SecurityDepositTracker } from './SecurityDepositTracker';
import { useEmergencyContacts } from '@/hooks/useEmergencyContacts';
import { Phone } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

// Helper function to format dates consistently
const formatDate = (dateString: string | Date) => {
  try {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  } catch {
    return typeof dateString === 'string' ? dateString : 'N/A';
  }
};

interface MobileTenantDashboardProps {
  onTabChange?: (tab: string) => void;
}

export function MobileTenantDashboard({ onTabChange }: MobileTenantDashboardProps) {
  const [activeTab, setActiveTab] = useState('overview');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showMaintenanceModal, setShowMaintenanceModal] = useState(false);
  const [showUtilityPaymentModal, setShowUtilityPaymentModal] = useState(false);
  const [utilityPaymentData, setUtilityPaymentData] = useState<any>(null);

  const { profile } = useAuth();
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
  const { bills, loading: billsLoading, prepareBillPayment, handleBillPaymentSuccess, getTotals } = useUtilityBills();
  const { conversations, sendMessage, getConversationMessages, getLandlordForTenant } = useMessages();
  const { contacts: emergencyContacts, loading: emergencyContactsLoading } = useEmergencyContacts();
  
  // Debug logging for late fees
  useEffect(() => {
    console.log('💰 [MobileTenantDashboard] Payment State:', {
      rentBalance,
      currentRentDue,
      nextPaymentDue,
      isOverdue,
      daysUntilDue,
      lateFee,
      hasLateFee: lateFee > 0
    });
  }, [rentBalance, currentRentDue, nextPaymentDue, isOverdue, daysUntilDue, lateFee]);
  
  // Memoized calculations for performance
  const totals = useMemo(() => getTotals(), [bills]);
  const pendingRequestsCount = useMemo(() => 
    maintenanceRequests.filter(r => r.status === 'pending').length, 
    [maintenanceRequests]
  );
  const unreadCount = useMemo(() => 
    conversations.reduce((sum, conv) => sum + conv.unread_count, 0), 
    [conversations]
  );
  
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [profileSection, setProfileSection] = useState<'menu' | 'personal' | 'notifications' | 'security' | 'cotenant' | 'password' | 'sessions' | 'payment-methods'>('menu');
  const [showLeaseDocument, setShowLeaseDocument] = useState(false);
  const [showMaintenanceView, setShowMaintenanceView] = useState(false);
  const [selectedMaintenanceRequest, setSelectedMaintenanceRequest] = useState<any>(null);

  // Optimized event handlers with useCallback
  const handleTabChange = useCallback((tab: string) => {
    setActiveTab(tab);
    onTabChange?.(tab);
  }, [onTabChange]);

  const handleRefresh = useCallback(() => {
    window.location.reload();
  }, []);

  const getStatusColor = useCallback((status: string) => {
    switch (status) {
      case 'paid': return 'success';
      case 'pending': return 'warning';
      case 'overdue': return 'error';
      case 'in_progress': return 'info';
      default: return 'default';
    }
  }, []);

  const getPriorityColor = useCallback((priority: string) => {
    switch (priority) {
      case 'high': return 'error';
      case 'medium': return 'warning';
      case 'low': return 'success';
      default: return 'default';
    }
  }, []);

  const renderOverview = () => (
    <div className="space-y-3 px-3 py-4 w-full max-w-full overflow-x-hidden">
      {/* Quick Stats */}
      <MobileGrid columns={2}>
        <MobileCard
          title="Rent Balance"
          value={`KES ${(rentBalance || 0).toLocaleString()}`}
          description={
            isOverdue 
              ? `Overdue by ${Math.abs(daysUntilDue)} days` 
              : rentBalance > 0 
                ? `Due in ${daysUntilDue} days`
                : 'All paid up!'
          }
          status={isOverdue ? 'error' : 'success'}
          icon={<CreditCard className="h-5 w-5" />}
          action={{
            label: rentBalance > 0 ? 'Pay Now' : 'Paid',
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
          description={
            nextPaymentDue 
              ? `Due ${formatDate(nextPaymentDue)}${isOverdue ? ` (${Math.abs(daysUntilDue)} days overdue)` : ''}${lateFee > 0 ? ` • Late fee: KES ${lateFee.toLocaleString()}` : ''}` 
              : 'No payment due'
          }
          value={currentRentDue ? `KES ${currentRentDue.toLocaleString()}` : 'Paid'}
          status={isOverdue ? 'error' : 'success'}
          icon={<Calendar className="h-5 w-5" />}
        />
      )}

      {/* Landlord Info */}
      <LandlordInfoCard 
        onSendMessage={() => handleTabChange("messages")}
      />

      {/* Quick Actions */}
      <MobileCard title="Quick Actions">
        <div className="grid grid-cols-3 gap-2 w-full">
          {!hasApprovedLease && (
            <Button 
              className="h-16 flex flex-col gap-1.5 text-xs font-medium px-2" 
              onClick={() => handleTabChange('browse-units')}
            >
              <Building2 className="h-5 w-5 flex-shrink-0" />
              <span className="text-[11px] leading-tight truncate w-full">Browse</span>
            </Button>
          )}
          <Button 
            className="h-16 flex flex-col gap-1.5 text-xs font-medium px-2" 
            variant={rentBalance > 0 ? "default" : "outline"}
            onClick={() => setShowPaymentModal(true)}
            disabled={!hasApprovedLease || rentBalance === 0}
          >
            <CreditCard className="h-5 w-5 flex-shrink-0" />
            <span className="text-[11px] leading-tight truncate w-full">Pay Rent</span>
          </Button>
          <Button 
            className="h-16 flex flex-col gap-1.5 text-xs font-medium px-2"
            variant="outline"
            onClick={() => setShowMaintenanceModal(true)}
          >
            <Plus className="h-5 w-5 flex-shrink-0" />
            <span className="text-[11px] leading-tight truncate w-full">Repair</span>
          </Button>
          <Button 
            className="h-16 flex flex-col gap-1.5 text-xs font-medium px-2"
            variant="outline"
            onClick={() => handleTabChange('documents')}
          >
            <FileText className="h-5 w-5 flex-shrink-0" />
            <span className="text-[11px] leading-tight truncate w-full">Docs</span>
          </Button>
          <Button 
            className="h-16 flex flex-col gap-1.5 text-xs font-medium px-2"
            variant="outline"
            onClick={() => handleTabChange('messages')}
          >
            <MessageCircle className="h-5 w-5 flex-shrink-0" />
            <span className="text-[11px] leading-tight truncate w-full">Chat</span>
          </Button>
          <Button 
            className="h-16 flex flex-col gap-1.5 text-xs font-medium px-2"
            variant="outline"
            onClick={() => handleTabChange('visitors')}
          >
            <UserCheck className="h-5 w-5 flex-shrink-0" />
            <span className="text-[11px] leading-tight truncate w-full">Visitors</span>
          </Button>
        </div>
      </MobileCard>

      {/* Tenant Notices */}
      <TenantNotices maxNotices={3} />

      {/* Recent Activity */}
      <MobileCard title="Recent Activity">
        <MobileList>
          {recentPayments.slice(0, 3).map((payment, index) => (
            <MobileListItem
              key={index}
              title={`KES ${payment.amount?.toLocaleString() || '0'}`}
              subtitle={`Due ${formatDate(payment.date)} • ${payment.status === 'paid' ? 'Paid' : payment.status === 'overdue' ? 'Overdue' : 'Pending'}${payment.late_fee && payment.late_fee > 0 ? ` • Late fee: KES ${payment.late_fee.toLocaleString()}` : ''}`}
              value={payment.status}
              status={getStatusColor(payment.status || 'pending')}
              icon={<Receipt className="h-4 w-4" />}
            />
          ))}
        </MobileList>
      </MobileCard>
    </div>
  );

  const handleViewMaintenanceRequest = (request: any) => {
    setSelectedMaintenanceRequest(request);
    setShowMaintenanceView(true);
  };

  const renderMaintenance = () => (
    <div className="space-y-3 px-3 py-4 w-full max-w-full overflow-x-hidden">
      {/* Security Deposit Tracker */}
      {hasApprovedLease && (
        <SecurityDepositTracker />
      )}

      {/* Emergency Contacts */}
      {emergencyContacts.length > 0 && (
        <MobileCard
          title="🚨 Emergency Contacts"
          description="For urgent repairs only"
          status="error"
        >
          <div className="space-y-3 mt-3">
            {emergencyContacts.map((contact) => (
              <div key={contact.id} className="flex items-center gap-3 p-2 bg-muted/50 rounded-lg">
                <Phone className="h-4 w-4 text-destructive flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">{contact.contact_name}</div>
                  <div className="text-xs text-muted-foreground truncate">{contact.contact_phone}</div>
                  {contact.is_24_7 && (
                    <Badge variant="outline" className="mt-1 text-xs bg-success/10 text-success">
                      24/7
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        </MobileCard>
      )}

      <MobileCard
        title="Maintenance Requests"
        description="Track your repair requests"
        action={{
          label: 'New Request',
          onClick: () => setShowMaintenanceModal(true),
          variant: 'default'
        }}
      />

      {maintenanceRequests.length === 0 ? (
        <div className="text-center py-12">
          <Wrench className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium">No Maintenance Requests</h3>
          <p className="text-muted-foreground">Submit a request when you need repairs</p>
        </div>
      ) : (
        <MobileList>
          {maintenanceRequests.map((request) => (
            <div key={request.id} className="bg-card rounded-lg border p-4 space-y-2">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h4 className="font-semibold text-sm">{request.title || 'Maintenance Request'}</h4>
                  <p className="text-xs text-muted-foreground line-clamp-2">{request.description || 'No description'}</p>
                </div>
                <Badge 
                  variant="outline" 
                  className={`${getStatusColor(request.status || 'pending')} text-white ml-2 flex-shrink-0`}
                >
                  {request.status}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  {request.createdDate ? formatDate(request.createdDate) : '-'}
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleViewMaintenanceRequest(request)}
                  className="h-8 text-xs"
                >
                  <Eye className="h-3 w-3 mr-1" />
                  View Details
                </Button>
              </div>
            </div>
          ))}
        </MobileList>
      )}
    </div>
  );

  const renderPayments = () => (
    <div className="space-y-3 px-3 py-4 w-full max-w-full overflow-x-hidden">
      <MobileCard
        title="Payment History"
        description="View all your payments"
      />

      <MobileList>
        {recentPayments
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
          .map((payment, index) => (
          <MobileListItem
            key={index}
            title={`KES ${payment.amount?.toLocaleString() || '0'}`}
            subtitle={`Due ${formatDate(payment.date)} • ${payment.method || 'Pending'}${payment.late_fee && payment.late_fee > 0 ? ` • Late fee: KES ${payment.late_fee.toLocaleString()}` : ''}`}
            value={payment.status?.toUpperCase()}
            status={getStatusColor(payment.status || 'pending')}
            icon={<Receipt className="h-4 w-4" />}
          />
        ))}
      </MobileList>
    </div>
  );

  const handlePayUtilityBill = useCallback(async (billId: string) => {
    try {
      const paymentInfo = await prepareBillPayment(billId);
      setUtilityPaymentData(paymentInfo);
      setShowUtilityPaymentModal(true);
    } catch (error) {
      console.error('Payment preparation error:', error);
    }
  }, [prepareBillPayment]);

  const renderUtilityBills = () => {
    const unpaidBills = bills.filter(bill => bill.status === 'unpaid' || bill.status === 'overdue');
    const paidBills = bills.filter(bill => bill.status === 'paid');

    return (
      <div className="space-y-3 px-3 py-4 w-full max-w-full overflow-x-hidden">
        {/* Summary Cards */}
        <MobileGrid columns={2}>
          <MobileCard
            title="Total Due"
            value={`KES ${totals.totalUnpaid.toLocaleString()}`}
            status={totals.totalUnpaid > 0 ? 'error' : 'success'}
            icon={<DollarSign className="h-5 w-5" />}
          />
          <MobileCard
            title="Total Paid"
            value={`KES ${totals.totalPaid.toLocaleString()}`}
            status="success"
            icon={<CheckCircle className="h-5 w-5" />}
          />
        </MobileGrid>

        {/* Unpaid Bills */}
        {unpaidBills.length > 0 && (
          <MobileCard
            title="Unpaid Bills"
            description={`${unpaidBills.length} bills need payment`}
          >
            <MobileList>
              {unpaidBills.map((bill) => (
                <div key={bill.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg mb-2">
                  <div className="flex items-center gap-3 flex-1">
                    {bill.utilities?.name === 'Electricity' && <Wrench className="h-4 w-4" />}
                    {bill.utilities?.name === 'Water' && <Wrench className="h-4 w-4" />}
                    {!bill.utilities?.name && <Receipt className="h-4 w-4" />}
                    <div className="flex-1">
                      <div className="font-medium text-sm">{bill.utilities?.name || 'Utility'}</div>
                      <div className="text-xs text-muted-foreground">{bill.month}</div>
                      <div className="text-xs text-muted-foreground">
                        Due: {formatDate(bill.due_date)}
                      </div>
                    </div>
                  </div>
                  <div className="text-right flex flex-col items-end gap-2">
                    <div className="font-semibold text-sm">KES {bill.amount.toLocaleString()}</div>
                    <Button
                      size="sm"
                      onClick={() => handlePayUtilityBill(bill.id)}
                      className="h-8 text-xs"
                    >
                      Pay Now
                    </Button>
                  </div>
                </div>
              ))}
            </MobileList>
          </MobileCard>
        )}

        {/* Paid Bills */}
        {paidBills.length > 0 && (
          <MobileCard
            title="Paid Bills"
            description={`${paidBills.length} bills paid`}
          >
            <MobileList>
              {paidBills.map((bill) => (
                <MobileListItem
                  key={bill.id}
                  title={bill.utilities?.name || 'Utility'}
                  subtitle={`${bill.month} - Paid on ${formatDate(bill.created_at)}`}
                  value={`KES ${bill.amount.toLocaleString()}`}
                  status="success"
                  icon={<CheckCircle className="h-4 w-4" />}
                />
              ))}
            </MobileList>
          </MobileCard>
        )}

        {unpaidBills.length === 0 && paidBills.length === 0 && (
          <div className="text-center py-12">
            <Receipt className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium">No Utility Bills</h3>
            <p className="text-muted-foreground">Your utility bills will appear here</p>
          </div>
        )}
      </div>
    );
  };

  const renderDocuments = () => (
    <div className="space-y-3 px-3 py-4 w-full max-w-full overflow-x-hidden">
      <MobileCard
        title="Documents"
        description="Your lease and payment documents"
      />
      
      {hasApprovedLease && approvedLease ? (
        <>
          <Button
            className="w-full mb-4"
            onClick={() => setShowLeaseDocument(true)}
          >
            <FileText className="h-4 w-4 mr-2" />
            View Full Lease Document
          </Button>
          <MobileList>
            <MobileListItem
              title="Lease Agreement"
              subtitle={`Signed on ${formatDate(approvedLease.start_date)}`}
              value="View"
              icon={<FileText className="h-4 w-4" />}
              onClick={() => setShowLeaseDocument(true)}
            />
            <MobileListItem
              title="Property Info"
              subtitle={approvedLease.units?.properties?.name || 'N/A'}
              value="Info"
              icon={<Home className="h-4 w-4" />}
            />
            <MobileListItem
              title="Unit Number"
              subtitle={approvedLease.units?.unit_number || 'N/A'}
              value="Info"
              icon={<Home className="h-4 w-4" />}
            />
          </MobileList>
        </>
      ) : (
        <div className="text-center py-12">
          <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium">No Documents</h3>
          <p className="text-muted-foreground">Your lease documents will appear here</p>
        </div>
      )}

      {recentPayments.length > 0 && (
        <>
          <MobileCard title="Payment Receipts" />
          <MobileList>
            {recentPayments.slice(0, 5).map((payment, index) => (
              <MobileListItem
                key={index}
                title={`KES ${payment.amount?.toLocaleString() || '0'}`}
                subtitle={`${formatDate(payment.date)} • ${payment.status === 'paid' ? 'Paid' : payment.status === 'overdue' ? 'Overdue' : 'Pending'}`}
                value={payment.status?.toUpperCase() || 'PENDING'}
                status={getStatusColor(payment.status || 'pending')}
                icon={<Receipt className="h-4 w-4" />}
              />
            ))}
          </MobileList>
        </>
      )}
    </div>
  );

  const handleSendMessage = useCallback(async () => {
    if (!newMessage.trim() || !selectedConversation) return;
    
    const success = await sendMessage(selectedConversation, newMessage.trim());
    if (success) {
      setNewMessage('');
    }
  }, [newMessage, selectedConversation, sendMessage]);

  const renderMessages = () => {
    if (selectedConversation) {
      const conversation = conversations.find(c => c.participant_id === selectedConversation);
      const conversationMessages = getConversationMessages(selectedConversation);

      return (
        <div className="flex flex-col h-[calc(100vh-12rem)] px-3 py-4 w-full max-w-full overflow-x-hidden">
          {/* Header */}
          <div className="flex items-center gap-3 pb-4 border-b mb-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedConversation(null)}
            >
              ← Back
            </Button>
            <Avatar className="h-10 w-10">
              <AvatarImage src={conversation?.participant_avatar} />
              <AvatarFallback>
                {conversation?.participant_name.split(' ').map(n => n[0]).join('').toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <h3 className="font-semibold">{conversation?.participant_name}</h3>
              <p className="text-xs text-muted-foreground">{conversation?.participant_role}</p>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto space-y-3 mb-4">
            {conversationMessages.length === 0 ? (
              <div className="text-center py-12">
                <MessageCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No messages yet. Start the conversation!</p>
              </div>
            ) : (
              conversationMessages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.sender_id === profile?.id ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg p-3 ${
                      msg.sender_id === profile?.id
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted'
                    }`}
                  >
                    <p className="text-sm">{msg.message}</p>
                    <p className="text-xs opacity-70 mt-1">
                      {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Input */}
          <div className="flex gap-2">
            <Input
              placeholder="Type a message..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              className="flex-1"
            />
            <Button onClick={handleSendMessage} disabled={!newMessage.trim()}>
              Send
            </Button>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-3 px-3 py-4 w-full max-w-full overflow-x-hidden">
        <MobileCard
          title="Messages"
          description="Chat with your landlord and property staff"
        />
        
        {conversations.length === 0 ? (
          <div className="text-center py-12">
            <MessageCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium">No Conversations</h3>
            <p className="text-muted-foreground">Your messages will appear here</p>
          </div>
        ) : (
          <MobileList>
            {conversations.map((conv) => (
              <div
                key={conv.participant_id}
                className="flex items-center gap-3 p-4 bg-card rounded-lg border cursor-pointer hover:bg-accent transition-colors"
                onClick={() => setSelectedConversation(conv.participant_id)}
              >
                <Avatar className="h-12 w-12">
                  <AvatarImage src={conv.participant_avatar} />
                  <AvatarFallback>
                    {conv.participant_name.split(' ').map(n => n[0]).join('').toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium truncate">{conv.participant_name}</h4>
                    <span className="text-xs text-muted-foreground">
                      {formatDate(conv.last_message_time)}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground truncate">{conv.last_message}</p>
                  {conv.property_name && (
                    <p className="text-xs text-muted-foreground">
                      {conv.property_name} {conv.unit_number && `- Unit ${conv.unit_number}`}
                    </p>
                  )}
                </div>
                {conv.unread_count > 0 && (
                  <Badge variant="destructive" className="ml-2">
                    {conv.unread_count}
                  </Badge>
                )}
              </div>
            ))}
          </MobileList>
        )}
      </div>
    );
  };

  const renderBrowseUnits = () => (
    <div className="px-3 py-4 w-full max-w-full overflow-x-hidden">
      <UnitBrowsing />
    </div>
  );

  const renderMyApplications = () => (
    <div className="px-3 py-4 w-full max-w-full overflow-x-hidden">
      <MyApplications onTabChange={handleTabChange} />
    </div>
  );

  const renderVisitors = () => (
    <div className="px-3 py-4 w-full max-w-full overflow-x-hidden">
      <VisitorsSection />
    </div>
  );

  const renderNotices = () => (
    <div className="px-3 py-4 w-full max-w-full overflow-x-hidden">
      <TenantNotices />
    </div>
  );

  const renderProfile = () => {
    // When viewing a specific settings section
    if (profileSection === 'personal') {
      return (
        <div className="space-y-3 px-3 py-4 w-full max-w-full overflow-x-hidden">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setProfileSection('menu')}
            className="mb-2"
          >
            ← Back to Settings
          </Button>
          <ProfileEditForm />
        </div>
      );
    }

    if (profileSection === 'notifications') {
      return (
        <div className="space-y-3 px-3 py-4 w-full max-w-full overflow-x-hidden">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setProfileSection('menu')}
            className="mb-2"
          >
            ← Back to Settings
          </Button>
          <NotificationSettings />
        </div>
      );
    }

    if (profileSection === 'security') {
      return (
        <div className="space-y-3 px-3 py-4 w-full max-w-full overflow-x-hidden">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setProfileSection('menu')}
            className="mb-2"
          >
            ← Back to Settings
          </Button>
          <MobileCard
            title="Security Settings"
            description="Manage your password and security preferences"
          >
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Security settings coming soon. You can change your password through your account provider.
              </p>
              <Button variant="outline" className="w-full">
                Change Password
              </Button>
            </div>
          </MobileCard>
        </div>
      );
    }

    if (profileSection === 'cotenant') {
      return (
        <div className="space-y-3 px-3 py-4 w-full max-w-full overflow-x-hidden">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setProfileSection('menu')}
            className="mb-2"
          >
            ← Back to Settings
          </Button>
          <CoTenantManagement />
        </div>
      );
    }

    if (profileSection === 'password') {
      return (
        <div className="space-y-3 px-3 py-4 w-full max-w-full overflow-x-hidden">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setProfileSection('menu')}
            className="mb-2"
          >
            ← Back to Settings
          </Button>
          <PasswordChangeForm />
        </div>
      );
    }

    if (profileSection === 'sessions') {
      return (
        <div className="space-y-3 px-3 py-4 w-full max-w-full overflow-x-hidden">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setProfileSection('menu')}
            className="mb-2"
          >
            ← Back to Settings
          </Button>
          <SessionsManagement />
        </div>
      );
    }

    if (profileSection === 'payment-methods') {
      return (
        <div className="space-y-3 px-3 py-4 w-full max-w-full overflow-x-hidden">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setProfileSection('menu')}
            className="mb-2"
          >
            ← Back to Settings
          </Button>
          <PaymentMethodsManagement />
        </div>
      );
    }

    // Default menu view
    return (
      <div className="space-y-3 px-3 py-4 w-full max-w-full overflow-x-hidden">
        <MobileCard
          title="Profile Settings"
          description="Manage your account"
        />
        {tenantInfo && (
          <div className="flex items-center gap-4 p-4 bg-card rounded-lg border">
            <Avatar className="h-16 w-16">
              <AvatarImage src={tenantInfo.avatar_url} />
              <AvatarFallback>
                {tenantInfo.first_name[0]}{tenantInfo.last_name[0]}
              </AvatarFallback>
            </Avatar>
            <div>
              <h3 className="font-semibold">{tenantInfo.first_name} {tenantInfo.last_name}</h3>
              <p className="text-sm text-muted-foreground">{tenantInfo.email}</p>
              <p className="text-xs text-muted-foreground">{tenantInfo.phone || 'No phone number'}</p>
            </div>
          </div>
        )}
        <MobileList>
          <MobileListItem
            title="Personal Information"
            subtitle="Update your details"
            icon={<User className="h-4 w-4" />}
            onClick={() => setProfileSection('personal')}
          />
          <MobileListItem
            title="Co-Tenants"
            subtitle="Manage co-tenants and roommates"
            icon={<UserCheck className="h-4 w-4" />}
            onClick={() => setProfileSection('cotenant')}
          />
          <MobileListItem
            title="Notifications"
            subtitle="Configure alerts and push notifications"
            icon={<Bell className="h-4 w-4" />}
            onClick={() => setProfileSection('notifications')}
          />
          <MobileListItem
            title="Payment Methods"
            subtitle="Manage payment options"
            icon={<CreditCard className="h-4 w-4" />}
            onClick={() => setProfileSection('payment-methods')}
          />
          <MobileListItem
            title="Password & Security"
            subtitle="Change password and manage sessions"
            icon={<Shield className="h-4 w-4" />}
            onClick={() => setProfileSection('password')}
          />
          <MobileListItem
            title="Active Sessions"
            subtitle="Manage logged in devices"
            icon={<Shield className="h-4 w-4" />}
            onClick={() => setProfileSection('sessions')}
          />
        </MobileList>
      </div>
    );
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'overview':
        return renderOverview();
      case 'browse-units':
        return renderBrowseUnits();
      case 'my-applications':
        return renderMyApplications();
      case 'maintenance':
        return renderMaintenance();
      case 'payments':
        return renderPayments();
      case 'utility-bills':
        return renderUtilityBills();
      case 'visitors':
        return renderVisitors();
      case 'documents':
        return renderDocuments();
      case 'messages':
        return renderMessages();
      case 'notices':
        return renderNotices();
      case 'profile':
        return renderProfile();
      default:
        return renderOverview();
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20 w-full max-w-[100vw] overflow-x-hidden">
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
      <div className="pb-4 w-full max-w-[100vw] overflow-x-hidden">
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
      {showPaymentModal && approvedLease && (
        <MpesaRentPaymentModal
          open={showPaymentModal}
          onOpenChange={setShowPaymentModal}
          rentAmount={currentRentDue || 0}
          dueDate={nextPaymentDue || new Date().toISOString()}
          onPaymentSuccess={() => {
            setShowPaymentModal(false);
            handleRefresh();
          }}
          leaseData={{
            id: approvedLease.id,
            unit_id: approvedLease.unit_id,
            tenant_id: approvedLease.tenant_id,
            tenant_info_id: approvedLease.tenant_info_id || undefined,
            units: approvedLease.units ? {
              property_id: approvedLease.units.properties?.id || '',
              properties: {
                landlord_id: approvedLease.units.properties?.landlord_id || ''
              }
            } : undefined
          }}
        />
      )}

      {showMaintenanceModal && (
        <MaintenanceRequestModal
          isOpen={showMaintenanceModal}
          onClose={() => setShowMaintenanceModal(false)}
          onSuccess={() => {
            setShowMaintenanceModal(false);
            handleRefresh();
          }}
        />
      )}

      {showUtilityPaymentModal && utilityPaymentData && (
        <MpesaUtilityPaymentModal
          open={showUtilityPaymentModal}
          onOpenChange={setShowUtilityPaymentModal}
          paymentData={utilityPaymentData}
          onPaymentSuccess={async () => {
            if (utilityPaymentData) {
              await handleBillPaymentSuccess('', utilityPaymentData.billId);
            }
            setShowUtilityPaymentModal(false);
            setUtilityPaymentData(null);
            handleRefresh();
          }}
        />
      )}

      <LeaseDocumentViewer
        open={showLeaseDocument}
        onClose={() => setShowLeaseDocument(false)}
      />

      <MaintenanceRequestView
        isOpen={showMaintenanceView}
        onClose={() => setShowMaintenanceView(false)}
        request={selectedMaintenanceRequest}
      />
    </div>
  );
}
