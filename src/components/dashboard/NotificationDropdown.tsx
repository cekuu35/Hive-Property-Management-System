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
import { formatDistanceToNow } from "date-fns";
import { useState } from "react";

export const NotificationDropdown = () => {
  const {
    notifications,
    loading,
    unreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    getNotificationsByType,
    getUnreadByType,
    markAsReadByType,
    deleteByType,
    getNotificationStats,
  } = useNotifications();
  
  const [activeTab, setActiveTab] = useState("all");

  const handleNotificationClick = async (notification: any) => {
    if (!notification.read) {
      await markAsRead(notification.id);
    }
    
    if (notification.action_url) {
      window.open(notification.action_url, '_blank');
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'payment':
        return '💰';
      case 'maintenance':
      case 'maintenance_request':
        return '🔧';
      case 'lease':
        return '📄';
      case 'security':
        return '🛡️';
      case 'visitor_request':
      case 'visitor_response':
        return '👥';
      case 'message':
        return '💬';
      case 'general':
        return '⚙️';
      default:
        return '🔔';
    }
  };

  const getFilteredNotifications = () => {
    if (activeTab === "all") {
      return notifications;
    }
    return getNotificationsByType(activeTab);
  };

  const getUnreadCountForTab = (tab: string) => {
    if (tab === "all") {
      return unreadCount;
    }
    return getUnreadByType(tab).length;
  };

  const renderNotificationItem = (notification: any) => (
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
            {getNotificationIcon(notification.type)}
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

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-96">
        <div className="flex items-center justify-between p-3">
          <DropdownMenuLabel className="text-lg font-semibold">Notifications</DropdownMenuLabel>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
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
                onClick={() => deleteByType(activeTab)}
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
              All {unreadCount > 0 && `(${unreadCount})`}
            </TabsTrigger>
            <TabsTrigger value="payment" className="text-xs">
              💰 {getUnreadCountForTab('payment') > 0 && `(${getUnreadCountForTab('payment')})`}
            </TabsTrigger>
            <TabsTrigger value="maintenance" className="text-xs">
              🔧 {getUnreadCountForTab('maintenance') + getUnreadCountForTab('maintenance_request') > 0 && 
                `(${getUnreadCountForTab('maintenance') + getUnreadCountForTab('maintenance_request')})`}
            </TabsTrigger>
            <TabsTrigger value="security" className="text-xs">
              🛡️ {getUnreadCountForTab('security') + getUnreadCountForTab('visitor_request') + getUnreadCountForTab('visitor_response') > 0 && 
                `(${getUnreadCountForTab('security') + getUnreadCountForTab('visitor_request') + getUnreadCountForTab('visitor_response')})`}
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="all" className="mt-0">
            {loading ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                Loading notifications...
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                No notifications yet
              </div>
            ) : (
              <ScrollArea className="max-h-96">
                {notifications.map(renderNotificationItem)}
              </ScrollArea>
            )}
          </TabsContent>
          
          <TabsContent value="payment" className="mt-0">
            {getFilteredNotifications().length === 0 ? (
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
            {getFilteredNotifications().length === 0 ? (
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
            {getFilteredNotifications().length === 0 ? (
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