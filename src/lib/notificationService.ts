import { supabase } from '@/integrations/supabase/client';

export interface CreateNotificationParams {
  user_id: string;
  title: string;
  message: string;
  type: 'payment' | 'maintenance' | 'maintenance_request' | 'lease' | 'security' | 'general' | 'message' | 'visitor_request' | 'visitor_response';
  action_url?: string;
}

export class NotificationService {
  /**
   * Create a new notification
   */
  static async createNotification(params: CreateNotificationParams) {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .insert({
          user_id: params.user_id,
          title: params.title,
          message: params.message,
          type: params.type,
          action_url: params.action_url,
          read: false,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating notification:', error);
      throw error;
    }
  }

  /**
   * Create payment-related notifications
   */
  static async notifyPaymentReceived(tenantId: string, amount: number, propertyName: string) {
    return this.createNotification({
      user_id: tenantId,
      title: 'Payment Received',
      message: `Your payment of ₦${amount.toLocaleString()} for ${propertyName} has been received and processed.`,
      type: 'payment',
      action_url: '/tenant/payments'
    });
  }

  static async notifyPaymentDue(tenantId: string, amount: number, dueDate: string, propertyName: string) {
    return this.createNotification({
      user_id: tenantId,
      title: 'Payment Due Soon',
      message: `Your rent payment of ₦${amount.toLocaleString()} for ${propertyName} is due on ${dueDate}.`,
      type: 'payment',
      action_url: '/tenant/payments'
    });
  }

  static async notifyPaymentOverdue(tenantId: string, amount: number, daysOverdue: number, propertyName: string) {
    return this.createNotification({
      user_id: tenantId,
      title: 'Payment Overdue',
      message: `Your rent payment of ₦${amount.toLocaleString()} for ${propertyName} is ${daysOverdue} days overdue.`,
      type: 'payment',
      action_url: '/tenant/payments'
    });
  }

  /**
   * Create maintenance-related notifications
   */
  static async notifyMaintenanceRequestCreated(tenantId: string, requestId: string, description: string) {
    return this.createNotification({
      user_id: tenantId,
      title: 'Maintenance Request Submitted',
      message: `Your maintenance request "${description}" has been submitted and is being reviewed.`,
      type: 'maintenance_request',
      action_url: `/tenant/maintenance/${requestId}`
    });
  }

  static async notifyMaintenanceRequestApproved(tenantId: string, requestId: string, description: string) {
    return this.createNotification({
      user_id: tenantId,
      title: 'Maintenance Request Approved',
      message: `Your maintenance request "${description}" has been approved and a contractor will be assigned.`,
      type: 'maintenance_request',
      action_url: `/tenant/maintenance/${requestId}`
    });
  }

  static async notifyMaintenanceRequestCompleted(tenantId: string, requestId: string, description: string) {
    return this.createNotification({
      user_id: tenantId,
      title: 'Maintenance Request Completed',
      message: `Your maintenance request "${description}" has been completed. Please review the work.`,
      type: 'maintenance_request',
      action_url: `/tenant/maintenance/${requestId}`
    });
  }

  static async notifyCaretakerMaintenanceRequest(caretakerId: string, requestId: string, description: string, propertyName: string) {
    return this.createNotification({
      user_id: caretakerId,
      title: 'New Maintenance Request',
      message: `New maintenance request for ${propertyName}: "${description}"`,
      type: 'maintenance',
      action_url: `/caretaker/maintenance/${requestId}`
    });
  }

  /**
   * Create lease-related notifications
   */
  static async notifyLeaseExpiring(tenantId: string, propertyName: string, daysUntilExpiry: number) {
    return this.createNotification({
      user_id: tenantId,
      title: 'Lease Expiring Soon',
      message: `Your lease for ${propertyName} expires in ${daysUntilExpiry} days. Please contact your landlord to renew.`,
      type: 'lease',
      action_url: '/tenant/lease'
    });
  }

  static async notifyLeaseRenewed(tenantId: string, propertyName: string, newEndDate: string) {
    return this.createNotification({
      user_id: tenantId,
      title: 'Lease Renewed',
      message: `Your lease for ${propertyName} has been renewed until ${newEndDate}.`,
      type: 'lease',
      action_url: '/tenant/lease'
    });
  }

  static async notifyLeaseTerminated(tenantId: string, propertyName: string, reason: string) {
    return this.createNotification({
      user_id: tenantId,
      title: 'Lease Terminated',
      message: `Your lease for ${propertyName} has been terminated. Reason: ${reason}`,
      type: 'lease',
      action_url: '/tenant/lease'
    });
  }

  /**
   * Create security-related notifications
   */
  static async notifyVisitorRequest(tenantId: string, visitorName: string, visitDate: string) {
    return this.createNotification({
      user_id: tenantId,
      title: 'Visitor Request',
      message: `You have a visitor request from ${visitorName} for ${visitDate}. Please approve or reject.`,
      type: 'visitor_request',
      action_url: '/tenant/visitors'
    });
  }

  static async notifyVisitorApproved(tenantId: string, visitorName: string, visitDate: string) {
    return this.createNotification({
      user_id: tenantId,
      title: 'Visitor Approved',
      message: `Your visitor ${visitorName} has been approved for ${visitDate}.`,
      type: 'visitor_response',
      action_url: '/tenant/visitors'
    });
  }

  static async notifySecurityIncident(tenantId: string, incidentType: string, location: string) {
    return this.createNotification({
      user_id: tenantId,
      title: 'Security Incident',
      message: `A ${incidentType} incident has been reported at ${location}. Please be aware.`,
      type: 'security',
      action_url: '/tenant/security'
    });
  }

  /**
   * Create message-related notifications
   */
  static async notifyNewMessage(recipientId: string, senderName: string, messagePreview: string) {
    return this.createNotification({
      user_id: recipientId,
      title: `New Message from ${senderName}`,
      message: messagePreview,
      type: 'message',
      action_url: '/messages'
    });
  }

  /**
   * Create general system notifications
   */
  static async notifySystemMaintenance(userId: string, maintenanceTime: string, duration: string) {
    return this.createNotification({
      user_id: userId,
      title: 'Scheduled System Maintenance',
      message: `The system will be under maintenance on ${maintenanceTime} for approximately ${duration}.`,
      type: 'general',
      action_url: '/notifications'
    });
  }

  static async notifySystemUpdate(userId: string, updateDescription: string) {
    return this.createNotification({
      user_id: userId,
      title: 'System Update Available',
      message: updateDescription,
      type: 'general',
      action_url: '/notifications'
    });
  }

  /**
   * Bulk notification methods
   */
  static async notifyAllTenants(propertyId: string, title: string, message: string, type: CreateNotificationParams['type'] = 'general') {
    try {
      // Get all tenants for the property through leases
      const { data: leases, error: leaseError } = await supabase
        .from('leases')
        .select('tenant_id, profiles!inner(user_id)')
        .eq('units.property_id', propertyId)
        .eq('status', 'active');

      if (leaseError) throw leaseError;

      // Create notifications for all tenants
      const notifications = leases?.map(lease => ({
        user_id: (lease.profiles as any).user_id,
        title,
        message,
        type,
        read: false,
      })) || [];

      if (notifications.length > 0) {
        const { error } = await supabase
          .from('notifications')
          .insert(notifications);

        if (error) throw error;
      }

      return notifications.length;
    } catch (error) {
      console.error('Error creating bulk notifications:', error);
      throw error;
    }
  }

  static async notifyAllCaretakers(title: string, message: string, type: CreateNotificationParams['type'] = 'general') {
    try {
      // Get all caretakers from profiles
      const { data: caretakers, error: caretakerError } = await supabase
        .from('profiles')
        .select('user_id')
        .eq('role', 'caretaker');

      if (caretakerError) throw caretakerError;

      // Create notifications for all caretakers
      const notifications = caretakers?.map(caretaker => ({
        user_id: caretaker.user_id,
        title,
        message,
        type,
        read: false,
      })) || [];

      if (notifications.length > 0) {
        const { error } = await supabase
          .from('notifications')
          .insert(notifications);

        if (error) throw error;
      }

      return notifications.length;
    } catch (error) {
      console.error('Error creating bulk notifications for caretakers:', error);
      throw error;
    }
  }

  /**
   * Notification management methods
   */
  static async markAsRead(notificationId: string) {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId);

      if (error) throw error;
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw error;
    }
  }

  static async markAllAsRead(userId: string) {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', userId)
        .eq('read', false);

      if (error) throw error;
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      throw error;
    }
  }

  static async deleteNotification(notificationId: string) {
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting notification:', error);
      throw error;
    }
  }

  static async deleteByType(userId: string, type: string) {
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('user_id', userId)
        .eq('type', type);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting notifications by type:', error);
      throw error;
    }
  }
}
