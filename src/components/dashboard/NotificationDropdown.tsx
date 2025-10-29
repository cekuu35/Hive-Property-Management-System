import { Bell, Check, X, ExternalLink, CheckCheck, Filter, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useNotifications } from "@/hooks/useNotifications";
import { useTenantNotices } from "@/hooks/useTenantNotices";
import { useLandlordAlerts } from "@/hooks/useLandlordAlerts";
import { useMessages } from "@/hooks/useMessages";
import { useAuth } from "@/hooks/useAuth";
import { formatDistanceToNow } from "date-fns";
import { useState, useMemo } from "react";

export const NotificationDropdown = () => {
  const {
    notifications,
    loading,
    unreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    getNotificationIcon,
  } = useNotifications();
  
  const { profile } = useAuth();
  const { notices: tenantNotices, loading: noticesLoading } = useTenantNotices();
  const { alerts: landlordAlerts, loading: alertsLoading } = useLandlordAlerts();
  const { conversations, loading: messagesLoading } = useMessages();
  
  // Combine notifications with role-specific alerts and messages
  const allNotifications = useMemo(() => {
    // Convert unread messages to notification format
    const unreadMessages = conversations
      .filter(conv => conv.unread_count > 0)
      .map(conv => ({
        id: `message-${conv.participant_id}`,
        user_id: profile?.id || '',
        title: `New message from ${conv.participant_name}`,
        message: conv.last_message,
        type: 'message' as any,
        read: false,
        created_at: conv.last_message_time,
        action_url: undefined,
        sender_name: conv.participant_name,
        sender_avatar: conv.participant_avatar,
        sender_role: conv.participant_role,
        unread_count: conv.unread_count
      }));

    if (profile?.role === 'tenant') {
      // Convert tenant notices to notification format
      const convertedNotices = tenantNotices.map(notice => ({
        id: `notice-${notice.id}`,
        user_id: profile.id,
        title: notice.title,
        message: notice.message,
        type: notice.type as any,
        read: notice.is_read,
        created_at: notice.created_at,
        action_url: undefined,
        priority: notice.priority,
        amount: notice.amount,
        due_date: notice.due_date
      }));
      
      // Combine and sort by date
      return [...notifications, ...convertedNotices, ...unreadMessages].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    } else if (profile?.role === 'landlord') {
      // Convert landlord alerts to notification format
      const convertedAlerts = landlordAlerts.map(alert => ({
        id: `alert-${alert.id}`,
        user_id: profile.id,
        title: alert.title,
        message: alert.message,
        type: alert.type as any,
        read: alert.is_read,
        created_at: alert.created_at,
        action_url: undefined,
        priority: alert.priority,
        amount: alert.amount
      }));
      
      // Combine and sort by date
      return [...notifications, ...convertedAlerts, ...unreadMessages].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    }
    
    // For other roles, just combine notifications with messages
    return [...notifications, ...unreadMessages].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }, [notifications, tenantNotices, landlordAlerts, conversations, profile]);
  
  const combinedUnreadCount = useMemo(() => {
    return allNotifications.filter(n => !n.read).length;
  }, [allNotifications]);
  
  const [activeTab, setActiveTab] = useState("all");

  const handleNotificationClick = async (notification: any) => {
    if (!notification.read) {
      await markAsRead(notification.id);
    }
    
    if (notification.action_url) {
      window.open(notification.action_url, '_blank');
    }
  };

  const getNotificationIconByType = (type: string) => {
    switch (type) {
      case 'payment_success':
      case 'payment_failed':
        return '💰';
      case 'utility_bill':
        return '📄';
      case 'warning':
        return '⚠️';
      case 'error':
        return '🚨';
      case 'success':
        return '🎉';
      case 'info':
        return 'ℹ️';
      default:
        return '🔔';
    }
  };

  const getFilteredNotifications = () => {
    if (activeTab === "all") {
      return allNotifications;
    }
    return allNotifications.filter(notification => {
      const notificationType = notification.type?.toLowerCase() || '';
      const notificationTitle = notification.title?.toLowerCase() || '';
      const notificationMessage = notification.message?.toLowerCase() || '';
      
      switch (activeTab) {
        case 'payment':
          return (
            notificationType.includes('payment') ||
            notificationType.includes('rent') ||
            notificationType.includes('bill') ||
            notificationType.includes('overdue') ||
            notificationTitle.includes('payment') ||
            notificationTitle.includes('rent') ||
            notificationTitle.includes('paid') ||
            notificationTitle.includes('due') ||
            notificationTitle.includes('overdue')
          );
        case 'maintenance':
          return (
            notificationType.includes('maintenance') ||
            notificationType.includes('repair') ||
            notificationType.includes('utility') ||
            notificationType === 'warning' ||
            notificationTitle.includes('maintenance') ||
            notificationTitle.includes('repair') ||
            notificationTitle.includes('fixed') ||
            notificationTitle.includes('request')
          );
        case 'security':
          return (
            notificationType.includes('security') ||
            notificationType.includes('visitor') ||
            notificationType.includes('access') ||
            notificationType.includes('occupancy') ||
            notificationType === 'error' ||
            notificationType === 'info' ||
            notificationTitle.includes('security') ||
            notificationTitle.includes('visitor') ||
            notificationTitle.includes('access') ||
            notificationTitle.includes('alert') ||
            notificationTitle.includes('occupancy')
          );
        default:
          return true;
      }
    });
  };

  const getUnreadCountForTab = (tab: string) => {
    if (tab === "all") {
      return combinedUnreadCount;
    }
    
    // Temporarily set activeTab to get filtered notifications for that specific tab
    const filteredNotifications = allNotifications.filter(notification => {
      const notificationType = notification.type?.toLowerCase() || '';
      const notificationTitle = notification.title?.toLowerCase() || '';
      
      switch (tab) {
        case 'payment':
          return (
            notificationType.includes('payment') ||
            notificationType.includes('rent') ||
            notificationType.includes('bill') ||
            notificationType.includes('overdue') ||
            notificationTitle.includes('payment') ||
            notificationTitle.includes('rent') ||
            notificationTitle.includes('paid') ||
            notificationTitle.includes('due') ||
            notificationTitle.includes('overdue')
          );
        case 'maintenance':
          return (
            notificationType.includes('maintenance') ||
            notificationType.includes('repair') ||
            notificationType.includes('utility') ||
            notificationType === 'warning' ||
            notificationTitle.includes('maintenance') ||
            notificationTitle.includes('repair') ||
            notificationTitle.includes('fixed') ||
            notificationTitle.includes('request')
          );
        case 'security':
          return (
            notificationType.includes('security') ||
            notificationType.includes('visitor') ||
            notificationType.includes('access') ||
            notificationType.includes('occupancy') ||
            notificationType === 'error' ||
            notificationType === 'info' ||
            notificationTitle.includes('security') ||
            notificationTitle.includes('visitor') ||
            notificationTitle.includes('access') ||
            notificationTitle.includes('alert') ||
            notificationTitle.includes('occupancy')
          );
        default:
          return true;
      }
    });
    
    return filteredNotifications.filter(n => !n.read).length;
  };

  const renderNotificationItem = (notification: any) => {
    // Special rendering for message notifications (Instagram-style)
    if (notification.type === 'message') {
      return (
        <DropdownMenuItem
          key={notification.id}
          className={`flex items-center gap-3 p-3 cursor-pointer ${
            !notification.read ? 'bg-accent/50' : ''
          }`}
          onClick={() => {
            // Store the participant ID to open this conversation
            const participantId = notification.id.replace('message-', '');
            localStorage.setItem('openConversation', participantId);
            
            // Trigger navigation to messages tab
            window.dispatchEvent(new CustomEvent('navigateToMessages', { detail: { participantId } }));
          }}
        >
          {/* Avatar (Instagram-style) */}
          <div className="relative flex-shrink-0">
            {notification.sender_avatar ? (
              <img 
                src={notification.sender_avatar} 
                alt={notification.sender_name}
                className="w-10 h-10 rounded-full object-cover"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-sm font-medium">
                  {notification.sender_name?.charAt(0)?.toUpperCase() || 'U'}
                </span>
              </div>
            )}
            {notification.unread_count > 0 && (
              <div className="absolute -top-1 -right-1 w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                <span className="text-xs text-white font-bold">{notification.unread_count}</span>
              </div>
            )}
          </div>

          {/* Message Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="font-semibold text-sm truncate">
                {notification.sender_name}
              </p>
              {!notification.read && (
                <div className="w-2 h-2 bg-primary rounded-full flex-shrink-0" />
              )}
            </div>
            <p className="text-xs text-muted-foreground truncate">
              {notification.message}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
            </p>
          </div>
        </DropdownMenuItem>
      );
    }

    // Regular notification rendering
    return (
      <DropdownMenuItem
        key={notification.id}
        className={`flex flex-col items-start p-3 cursor-pointer ${
          !notification.read ? 'bg-accent/50' : ''
        }`}
        onClick={() => handleNotificationClick(notification)}
      >
        <div className="flex items-start justify-between w-full">
          <div className="flex items-start gap-2 flex-1">
            <span className="text-lg">
              {getNotificationIconByType(notification.type)}
            </span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-medium text-sm truncate">
                  {notification.title}
                </p>
                {!notification.read && (
                  <div className="w-2 h-2 bg-primary rounded-full flex-shrink-0" />
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                {notification.message}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1 ml-2">
            {notification.action_url && (
              <Button
                variant="ghost"
                size="sm"
                className="h-auto p-1"
                onClick={(e) => {
                  e.stopPropagation();
                  window.open(notification.action_url!, '_blank');
                }}
              >
                <ExternalLink className="h-3 w-3" />
              </Button>
            )}
            {!notification.read && (
              <Button
                variant="ghost"
                size="sm"
                className="h-auto p-1"
                onClick={(e) => {
                  e.stopPropagation();
                  markAsRead(notification.id);
                }}
              >
                <Check className="h-3 w-3" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="h-auto p-1 text-destructive hover:text-destructive"
              onClick={(e) => {
                e.stopPropagation();
                deleteNotification(notification.id);
              }}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </DropdownMenuItem>
    );
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="relative">
          <Bell className="h-5 w-5" />
          {combinedUnreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs"
            >
              {combinedUnreadCount > 99 ? '99+' : combinedUnreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-96">
        <div className="flex items-center justify-between p-3">
          <DropdownMenuLabel className="text-lg font-semibold">Notifications</DropdownMenuLabel>
          <div className="flex items-center gap-2">
            {combinedUnreadCount > 0 && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={markAllAsRead}
                className="h-auto p-1 text-xs"
              >
                <CheckCheck className="h-3 w-3 mr-1" />
                Mark all read
              </Button>
            )}
            {activeTab !== "all" && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => {
                  const filteredNotifications = getFilteredNotifications();
                  filteredNotifications.forEach(notification => {
                    deleteNotification(notification.id);
                  });
                }}
                className="h-auto p-1 text-xs text-destructive"
              >
                <Trash2 className="h-3 w-3 mr-1" />
                Clear {activeTab}
              </Button>
            )}
          </div>
        </div>
        <DropdownMenuSeparator />
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4 h-auto p-1">
            <TabsTrigger value="all" className="text-xs">
              All {combinedUnreadCount > 0 && `(${combinedUnreadCount})`}
            </TabsTrigger>
            <TabsTrigger value="payment" className="text-xs">
              💰 {getUnreadCountForTab('payment') > 0 && `(${getUnreadCountForTab('payment')})`}
            </TabsTrigger>
            <TabsTrigger value="maintenance" className="text-xs">
              🔧 {getUnreadCountForTab('maintenance') > 0 && `(${getUnreadCountForTab('maintenance')})`}
            </TabsTrigger>
            <TabsTrigger value="security" className="text-xs">
              🛡️ {getUnreadCountForTab('security') > 0 && `(${getUnreadCountForTab('security')})`}
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="all" className="mt-0">
            {(loading || noticesLoading || alertsLoading || messagesLoading) ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                Loading notifications...
              </div>
            ) : allNotifications.length === 0 ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                No notifications yet
              </div>
            ) : (
              <ScrollArea className="max-h-96">
                {allNotifications.map(renderNotificationItem)}
              </ScrollArea>
            )}
          </TabsContent>
          
          <TabsContent value="payment" className="mt-0">
            {(loading || noticesLoading || alertsLoading || messagesLoading) ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                Loading notifications...
              </div>
            ) : getFilteredNotifications().length === 0 ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                No payment notifications
              </div>
            ) : (
              <ScrollArea className="max-h-96">
                {getFilteredNotifications().map(renderNotificationItem)}
              </ScrollArea>
            )}
          </TabsContent>
          
          <TabsContent value="maintenance" className="mt-0">
            {(loading || noticesLoading || alertsLoading || messagesLoading) ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                Loading notifications...
              </div>
            ) : getFilteredNotifications().length === 0 ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                No maintenance notifications
              </div>
            ) : (
              <ScrollArea className="max-h-96">
                {getFilteredNotifications().map(renderNotificationItem)}
              </ScrollArea>
            )}
          </TabsContent>
          
          <TabsContent value="security" className="mt-0">
            {(loading || noticesLoading || alertsLoading || messagesLoading) ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                Loading notifications...
              </div>
            ) : getFilteredNotifications().length === 0 ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                No security notifications
              </div>
            ) : (
              <ScrollArea className="max-h-96">
                {getFilteredNotifications().map(renderNotificationItem)}
              </ScrollArea>
            )}
          </TabsContent>
        </Tabs>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};