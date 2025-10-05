# Notification System Documentation

## Overview

The notification system in this property management app provides comprehensive notification functionality for all user types (tenants, landlords, caretakers, security). It includes real-time notifications, categorization, filtering, and bulk notification capabilities.

## Components

### 1. Core Components

#### `NotificationDropdown.tsx`
- **Location**: `src/components/dashboard/NotificationDropdown.tsx`
- **Purpose**: Main UI component for displaying notifications
- **Features**:
  - Dropdown menu with notification list
  - Tabbed interface for filtering by type
  - Real-time updates
  - Mark as read/delete functionality
  - Action buttons for each notification

#### `useNotifications.tsx`
- **Location**: `src/hooks/useNotifications.tsx`
- **Purpose**: Core hook for managing notification state and operations
- **Features**:
  - Fetch notifications from database
  - Real-time subscription to new notifications
  - Mark as read/delete operations
  - Filtering by type
  - Statistics and analytics

### 2. Service Layer

#### `NotificationService.ts`
- **Location**: `src/lib/notificationService.ts`
- **Purpose**: Service class for creating and managing notifications
- **Features**:
  - Static methods for creating different types of notifications
  - Bulk notification capabilities
  - Notification management operations

#### `useNotificationActions.tsx`
- **Location**: `src/hooks/useNotificationActions.tsx`
- **Purpose**: React hook for easy notification creation throughout the app
- **Features**:
  - Wrapper functions for all notification types
  - Toast notifications for user feedback
  - Error handling

## Notification Types

### 1. Payment Notifications (`payment`)
- **Purpose**: Notify users about payment-related events
- **Functions**:
  - `notifyPaymentReceived()` - Payment received confirmation
  - `notifyPaymentDue()` - Payment due reminders
  - `notifyPaymentOverdue()` - Overdue payment alerts

### 2. Maintenance Notifications (`maintenance`, `maintenance_request`)
- **Purpose**: Notify users about maintenance-related events
- **Functions**:
  - `notifyMaintenanceRequestCreated()` - New maintenance request
  - `notifyMaintenanceRequestApproved()` - Request approved
  - `notifyMaintenanceRequestCompleted()` - Request completed
  - `notifyCaretakerMaintenanceRequest()` - Notify caretakers of new requests

### 3. Lease Notifications (`lease`)
- **Purpose**: Notify users about lease-related events
- **Functions**:
  - `notifyLeaseExpiring()` - Lease expiry warnings
  - `notifyLeaseRenewed()` - Lease renewal confirmations
  - `notifyLeaseTerminated()` - Lease termination notices

### 4. Security Notifications (`security`, `visitor_request`, `visitor_response`)
- **Purpose**: Notify users about security-related events
- **Functions**:
  - `notifyVisitorRequest()` - New visitor requests
  - `notifyVisitorApproved()` - Visitor approval confirmations
  - `notifySecurityIncident()` - Security incident alerts

### 5. Message Notifications (`message`)
- **Purpose**: Notify users about new messages
- **Functions**:
  - `notifyNewMessage()` - New message received

### 6. System Notifications (`general`)
- **Purpose**: Notify users about system-wide events
- **Functions**:
  - `notifySystemMaintenance()` - Scheduled maintenance
  - `notifySystemUpdate()` - System updates

## Usage Examples

### Basic Notification Creation

```typescript
import { useNotificationActions } from '@/hooks/useNotificationActions';

const MyComponent = () => {
  const { notifyPaymentReceived } = useNotificationActions();

  const handlePaymentReceived = async () => {
    await notifyPaymentReceived('tenant-id', 50000, 'Property Name');
  };

  return (
    <button onClick={handlePaymentReceived}>
      Send Payment Notification
    </button>
  );
};
```

### Bulk Notifications

```typescript
import { useNotificationActions } from '@/hooks/useNotificationActions';

const MyComponent = () => {
  const { notifyAllTenants } = useNotificationActions();

  const handleBulkNotification = async () => {
    await notifyAllTenants(
      'property-id',
      'Important Notice',
      'Please be aware of upcoming maintenance work.',
      'general'
    );
  };

  return (
    <button onClick={handleBulkNotification}>
      Send Bulk Notification
    </button>
  );
};
```

### Custom Notifications

```typescript
import { useNotificationActions } from '@/hooks/useNotificationActions';

const MyComponent = () => {
  const { createCustomNotification } = useNotificationActions();

  const handleCustomNotification = async () => {
    await createCustomNotification(
      'user-id',
      'Custom Title',
      'Custom message content',
      'general',
      '/custom-action-url'
    );
  };

  return (
    <button onClick={handleCustomNotification}>
      Send Custom Notification
    </button>
  );
};
```

## Database Schema

The notification system uses the following database structure:

```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('payment', 'maintenance', 'lease', 'security', 'general', 'message', 'maintenance_request', 'visitor_request', 'visitor_response')),
  read BOOLEAN DEFAULT FALSE,
  action_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## Real-time Features

The notification system includes real-time capabilities:

1. **Real-time Updates**: New notifications appear instantly without page refresh
2. **Live Counters**: Unread count updates in real-time
3. **Auto-refresh**: Notification list updates when new notifications arrive

## UI Features

### Notification Dropdown
- **Bell Icon**: Shows unread count badge
- **Tabbed Interface**: Filter by notification type
- **Action Buttons**: Mark as read, delete, open action URL
- **Responsive Design**: Works on all screen sizes

### Notification Types Display
- **Icons**: Each notification type has a unique emoji icon
- **Color Coding**: Unread notifications are highlighted
- **Time Stamps**: Shows relative time (e.g., "2 hours ago")
- **Action URLs**: Clickable links to relevant pages

## Integration Points

### 1. Payment System
- Automatically sends notifications when payments are received
- Sends reminders for overdue payments
- Notifies about payment confirmations

### 2. Maintenance System
- Notifies tenants when maintenance requests are created
- Alerts caretakers of new maintenance requests
- Confirms when maintenance work is completed

### 3. Lease Management
- Sends lease expiry warnings
- Confirms lease renewals
- Notifies about lease terminations

### 4. Security System
- Alerts about visitor requests
- Notifies about security incidents
- Confirms visitor approvals

### 5. Messaging System
- Notifies about new messages
- Shows message previews
- Links to message center

## Best Practices

### 1. Notification Timing
- Send payment reminders 7 days before due date
- Send lease expiry warnings 30 days before expiry
- Send maintenance confirmations immediately after completion

### 2. Message Content
- Keep titles concise and descriptive
- Include relevant details in the message
- Use action URLs to direct users to relevant pages

### 3. User Experience
- Don't overwhelm users with too many notifications
- Use appropriate notification types for different events
- Provide clear action buttons for each notification

### 4. Error Handling
- Always handle notification creation errors gracefully
- Show user-friendly error messages
- Log errors for debugging purposes

## Troubleshooting

### Common Issues

1. **Notifications not appearing**
   - Check if user is authenticated
   - Verify database connection
   - Check real-time subscription status

2. **Real-time updates not working**
   - Ensure Supabase real-time is enabled
   - Check notification table is in realtime publication
   - Verify user permissions

3. **Bulk notifications failing**
   - Check if target users exist
   - Verify property/tenant relationships
   - Ensure proper error handling

### Debug Tips

1. **Check Console Logs**: Look for error messages in browser console
2. **Verify Database**: Check if notifications are being created in the database
3. **Test Real-time**: Use Supabase dashboard to monitor real-time events
4. **Check Permissions**: Ensure RLS policies allow notification access

## Future Enhancements

### Planned Features
1. **Email Notifications**: Send email copies of important notifications
2. **Push Notifications**: Browser push notifications for urgent alerts
3. **Notification Preferences**: User-configurable notification settings
4. **Notification Templates**: Pre-defined notification templates
5. **Analytics**: Notification analytics and reporting
6. **Scheduled Notifications**: Send notifications at specific times
7. **Notification Groups**: Group related notifications together
8. **Rich Notifications**: Support for images and rich content

### Integration Opportunities
1. **SMS Notifications**: Integrate with SMS service for urgent alerts
2. **WhatsApp Integration**: Send notifications via WhatsApp
3. **Slack Integration**: Send notifications to Slack channels
4. **Webhook Support**: Send notifications to external systems
