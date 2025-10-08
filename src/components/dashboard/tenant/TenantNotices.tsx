import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  AlertCircle, 
  AlertTriangle, 
  Clock, 
  CheckCircle, 
  CreditCard, 
  Wrench,
  Bell,
  X
} from 'lucide-react';
import { useTenantNotices, TenantNotice } from '@/hooks/useTenantNotices';
import { format } from 'date-fns';

const getNoticeIcon = (type: TenantNotice['type']) => {
  switch (type) {
    case 'rent_due':
    case 'rent_overdue':
      return <CreditCard className="h-4 w-4" />;
    case 'utility_due':
    case 'utility_overdue':
      return <AlertTriangle className="h-4 w-4" />;
    case 'maintenance':
      return <Wrench className="h-4 w-4" />;
    case 'general':
      return <Bell className="h-4 w-4" />;
    default:
      return <AlertCircle className="h-4 w-4" />;
  }
};

const getPriorityColor = (priority: TenantNotice['priority']) => {
  switch (priority) {
    case 'urgent':
      return 'bg-red-100 text-red-800 border-red-200';
    case 'high':
      return 'bg-orange-100 text-orange-800 border-orange-200';
    case 'medium':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'low':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

const getPriorityBadge = (priority: TenantNotice['priority']) => {
  switch (priority) {
    case 'urgent':
      return <Badge className="bg-red-500 text-white">Urgent</Badge>;
    case 'high':
      return <Badge className="bg-orange-500 text-white">High</Badge>;
    case 'medium':
      return <Badge className="bg-yellow-500 text-white">Medium</Badge>;
    case 'low':
      return <Badge className="bg-blue-500 text-white">Low</Badge>;
    default:
      return <Badge variant="secondary">Normal</Badge>;
  }
};

interface TenantNoticesProps {
  maxNotices?: number;
  showAll?: boolean;
}

export const TenantNotices = ({ maxNotices = 3, showAll = false }: TenantNoticesProps) => {
  const { notices, loading, error, markAsRead, markAllAsRead } = useTenantNotices();

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Important Notices
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-20">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Important Notices
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  const displayNotices = showAll ? notices : notices.slice(0, maxNotices);
  const unreadCount = notices.filter(n => !n.is_read).length;

  if (displayNotices.length === 0) {
    return (
      <Card className="border-green-200 bg-green-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-green-700">
            <CheckCircle className="h-5 w-5" />
            All Caught Up!
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-green-600">
            No urgent notices at this time. You're all up to date!
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-warning bg-warning/5">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-warning">
            <Bell className="h-5 w-5" />
            Important Notices
            {unreadCount > 0 && (
              <Badge variant="destructive" className="ml-2">
                {unreadCount} new
              </Badge>
            )}
          </CardTitle>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={markAllAsRead}
              className="text-warning hover:text-warning/80"
            >
              Mark all as read
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {displayNotices.map((notice) => (
          <div
            key={notice.id}
            className={`p-3 rounded-lg border transition-all hover:shadow-sm ${
              notice.is_read 
                ? 'bg-white/50 opacity-75' 
                : getPriorityColor(notice.priority)
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 flex-1">
                <div className="mt-0.5">
                  {getNoticeIcon(notice.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-medium text-sm">{notice.title}</h4>
                    {getPriorityBadge(notice.priority)}
                    {!notice.is_read && (
                      <div className="w-2 h-2 bg-warning rounded-full"></div>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">
                    {notice.message}
                  </p>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    {notice.amount && (
                      <span className="font-medium">
                        Amount: KES {notice.amount.toLocaleString()}
                      </span>
                    )}
                    {notice.due_date && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Due: {format(new Date(notice.due_date), 'MMM dd, yyyy')}
                      </span>
                    )}
                    <span>
                      {format(new Date(notice.created_at), 'MMM dd, yyyy')}
                    </span>
                  </div>
                </div>
              </div>
              {!notice.is_read && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => markAsRead(notice.id)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        ))}
        
        {!showAll && notices.length > maxNotices && (
          <div className="text-center pt-2">
            <p className="text-xs text-muted-foreground">
              Showing {maxNotices} of {notices.length} notices
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
