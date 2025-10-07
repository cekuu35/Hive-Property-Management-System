import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  Bell, 
  Check, 
  CheckCheck, 
  Trash2, 
  X,
  Receipt,
  CreditCard,
  AlertTriangle,
  Info
} from 'lucide-react';
import { useNotifications } from '@/hooks/useNotifications';
import { format } from 'date-fns';

interface NotificationsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const Notifications = ({ open, onOpenChange }: NotificationsProps) => {
  const {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    getNotificationIcon,
    getNotificationColor
  } = useNotifications();

  const [selectedNotification, setSelectedNotification] = useState<string | null>(null);

  const handleMarkAsRead = async (notificationId: string) => {
    await markAsRead(notificationId);
    setSelectedNotification(null);
  };

  const handleDelete = async (notificationId: string) => {
    await deleteNotification(notificationId);
    setSelectedNotification(null);
  };

  const getNotificationIconComponent = (type: string) => {
    switch (type) {
      case 'utility_bill':
        return <Receipt className="h-4 w-4 text-blue-600" />;
      case 'payment_success':
        return <CreditCard className="h-4 w-4 text-green-600" />;
      case 'payment_failed':
        return <CreditCard className="h-4 w-4 text-red-600" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      case 'error':
        return <AlertTriangle className="h-4 w-4 text-red-600" />;
      default:
        return <Info className="h-4 w-4 text-gray-600" />;
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <Card className="w-full max-w-2xl max-h-[80vh] mx-4">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            <CardTitle>Notifications</CardTitle>
            {unreadCount > 0 && (
              <Badge variant="destructive" className="ml-2">
                {unreadCount}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={markAllAsRead}
                className="text-xs"
              >
                <CheckCheck className="h-3 w-3 mr-1" />
                Mark All Read
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[60vh]">
            {loading ? (
              <div className="flex items-center justify-center h-32">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                  <p className="text-muted-foreground">Loading notifications...</p>
                </div>
              </div>
            ) : notifications.length === 0 ? (
              <div className="text-center py-8">
                <Bell className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium">No notifications</h3>
                <p className="text-muted-foreground">You're all caught up!</p>
              </div>
            ) : (
              <div className="space-y-1">
                {notifications.map((notification, index) => (
                  <div key={notification.id}>
                    <div
                      className={`p-4 cursor-pointer hover:bg-gray-50 transition-colors ${
                        !notification.read ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
                      }`}
                      onClick={() => setSelectedNotification(
                        selectedNotification === notification.id ? null : notification.id
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 mt-1">
                          {getNotificationIconComponent(notification.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <h4 className={`text-sm font-medium ${!notification.read ? 'text-blue-900' : 'text-gray-900'}`}>
                              {notification.title}
                            </h4>
                            <div className="flex items-center gap-2">
                              {!notification.read && (
                                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                              )}
                              <span className="text-xs text-muted-foreground">
                                {format(new Date(notification.created_at), 'MMM dd, HH:mm')}
                              </span>
                            </div>
                          </div>
                          <p className={`text-sm mt-1 ${!notification.read ? 'text-blue-700' : 'text-gray-600'}`}>
                            {notification.message}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Expanded notification details */}
                    {selectedNotification === notification.id && (
                      <div className="px-4 pb-4 bg-gray-50 border-l-4 border-l-gray-300">
                        <div className="space-y-3">
                          <div>
                            <h5 className="text-sm font-medium text-gray-900">Details</h5>
                            <p className="text-sm text-gray-600 mt-1">
                              {notification.message}
                            </p>
                          </div>

                          {notification.data && (
                            <div>
                              <h5 className="text-sm font-medium text-gray-900">Additional Information</h5>
                              <div className="mt-1 p-2 bg-white rounded border text-xs text-gray-600">
                                <pre className="whitespace-pre-wrap">
                                  {JSON.stringify(notification.data, null, 2)}
                                </pre>
                              </div>
                            </div>
                          )}

                          <div className="flex items-center gap-2 pt-2">
                            {!notification.read && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleMarkAsRead(notification.id)}
                                className="text-xs"
                              >
                                <Check className="h-3 w-3 mr-1" />
                                Mark as Read
                              </Button>
                            )}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDelete(notification.id)}
                              className="text-xs text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="h-3 w-3 mr-1" />
                              Delete
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}

                    {index < notifications.length - 1 && <Separator />}
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
};




