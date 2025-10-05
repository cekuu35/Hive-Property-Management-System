import { useCallback } from 'react';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';
import { NotificationService } from '@/lib/notificationService';

export const useNotificationActions = () => {
  const { user } = useAuth();
  const { toast } = useToast();

  // Payment notifications
  const notifyPaymentReceived = useCallback(async (tenantId: string, amount: number, propertyName: string) => {
    try {
      await NotificationService.notifyPaymentReceived(tenantId, amount, propertyName);
      toast({
        title: "Notification Sent",
        description: "Payment notification sent to tenant",
      });
    } catch (error) {
      console.error('Error sending payment notification:', error);
      toast({
        title: "Error",
        description: "Failed to send payment notification",
        variant: "destructive",
      });
    }
  }, [toast]);

  const notifyPaymentDue = useCallback(async (tenantId: string, amount: number, dueDate: string, propertyName: string) => {
    try {
      await NotificationService.notifyPaymentDue(tenantId, amount, dueDate, propertyName);
    } catch (error) {
      console.error('Error sending payment due notification:', error);
    }
  }, []);

  const notifyPaymentOverdue = useCallback(async (tenantId: string, amount: number, daysOverdue: number, propertyName: string) => {
    try {
      await NotificationService.notifyPaymentOverdue(tenantId, amount, daysOverdue, propertyName);
    } catch (error) {
      console.error('Error sending payment overdue notification:', error);
    }
  }, []);

  // Maintenance notifications
  const notifyMaintenanceRequestCreated = useCallback(async (tenantId: string, requestId: string, description: string) => {
    try {
      await NotificationService.notifyMaintenanceRequestCreated(tenantId, requestId, description);
    } catch (error) {
      console.error('Error sending maintenance request notification:', error);
    }
  }, []);

  const notifyMaintenanceRequestApproved = useCallback(async (tenantId: string, requestId: string, description: string) => {
    try {
      await NotificationService.notifyMaintenanceRequestApproved(tenantId, requestId, description);
      toast({
        title: "Notification Sent",
        description: "Maintenance request approval notification sent",
      });
    } catch (error) {
      console.error('Error sending maintenance approval notification:', error);
      toast({
        title: "Error",
        description: "Failed to send maintenance approval notification",
        variant: "destructive",
      });
    }
  }, [toast]);

  const notifyMaintenanceRequestCompleted = useCallback(async (tenantId: string, requestId: string, description: string) => {
    try {
      await NotificationService.notifyMaintenanceRequestCompleted(tenantId, requestId, description);
      toast({
        title: "Notification Sent",
        description: "Maintenance completion notification sent",
      });
    } catch (error) {
      console.error('Error sending maintenance completion notification:', error);
      toast({
        title: "Error",
        description: "Failed to send maintenance completion notification",
        variant: "destructive",
      });
    }
  }, [toast]);

  const notifyCaretakerMaintenanceRequest = useCallback(async (caretakerId: string, requestId: string, description: string, propertyName: string) => {
    try {
      await NotificationService.notifyCaretakerMaintenanceRequest(caretakerId, requestId, description, propertyName);
    } catch (error) {
      console.error('Error sending caretaker maintenance notification:', error);
    }
  }, []);

  // Lease notifications
  const notifyLeaseExpiring = useCallback(async (tenantId: string, propertyName: string, daysUntilExpiry: number) => {
    try {
      await NotificationService.notifyLeaseExpiring(tenantId, propertyName, daysUntilExpiry);
    } catch (error) {
      console.error('Error sending lease expiry notification:', error);
    }
  }, []);

  const notifyLeaseRenewed = useCallback(async (tenantId: string, propertyName: string, newEndDate: string) => {
    try {
      await NotificationService.notifyLeaseRenewed(tenantId, propertyName, newEndDate);
      toast({
        title: "Notification Sent",
        description: "Lease renewal notification sent to tenant",
      });
    } catch (error) {
      console.error('Error sending lease renewal notification:', error);
      toast({
        title: "Error",
        description: "Failed to send lease renewal notification",
        variant: "destructive",
      });
    }
  }, [toast]);

  const notifyLeaseTerminated = useCallback(async (tenantId: string, propertyName: string, reason: string) => {
    try {
      await NotificationService.notifyLeaseTerminated(tenantId, propertyName, reason);
      toast({
        title: "Notification Sent",
        description: "Lease termination notification sent",
      });
    } catch (error) {
      console.error('Error sending lease termination notification:', error);
      toast({
        title: "Error",
        description: "Failed to send lease termination notification",
        variant: "destructive",
      });
    }
  }, [toast]);

  // Security notifications
  const notifyVisitorRequest = useCallback(async (tenantId: string, visitorName: string, visitDate: string) => {
    try {
      await NotificationService.notifyVisitorRequest(tenantId, visitorName, visitDate);
    } catch (error) {
      console.error('Error sending visitor request notification:', error);
    }
  }, []);

  const notifyVisitorApproved = useCallback(async (tenantId: string, visitorName: string, visitDate: string) => {
    try {
      await NotificationService.notifyVisitorApproved(tenantId, visitorName, visitDate);
    } catch (error) {
      console.error('Error sending visitor approval notification:', error);
    }
  }, []);

  const notifySecurityIncident = useCallback(async (tenantId: string, incidentType: string, location: string) => {
    try {
      await NotificationService.notifySecurityIncident(tenantId, incidentType, location);
    } catch (error) {
      console.error('Error sending security incident notification:', error);
    }
  }, []);

  // Message notifications
  const notifyNewMessage = useCallback(async (recipientId: string, senderName: string, messagePreview: string) => {
    try {
      await NotificationService.notifyNewMessage(recipientId, senderName, messagePreview);
    } catch (error) {
      console.error('Error sending message notification:', error);
    }
  }, []);

  // System notifications
  const notifySystemMaintenance = useCallback(async (userId: string, maintenanceTime: string, duration: string) => {
    try {
      await NotificationService.notifySystemMaintenance(userId, maintenanceTime, duration);
    } catch (error) {
      console.error('Error sending system maintenance notification:', error);
    }
  }, []);

  const notifySystemUpdate = useCallback(async (userId: string, updateDescription: string) => {
    try {
      await NotificationService.notifySystemUpdate(userId, updateDescription);
    } catch (error) {
      console.error('Error sending system update notification:', error);
    }
  }, []);

  // Bulk notifications
  const notifyAllTenants = useCallback(async (propertyId: string, title: string, message: string, type: 'payment' | 'maintenance' | 'lease' | 'security' | 'general' | 'message' | 'maintenance_request' | 'visitor_request' | 'visitor_response' = 'general') => {
    try {
      const count = await NotificationService.notifyAllTenants(propertyId, title, message, type);
      toast({
        title: "Notifications Sent",
        description: `Sent notifications to ${count} tenants`,
      });
    } catch (error) {
      console.error('Error sending bulk notifications:', error);
      toast({
        title: "Error",
        description: "Failed to send bulk notifications",
        variant: "destructive",
      });
    }
  }, [toast]);

  const notifyAllCaretakers = useCallback(async (title: string, message: string, type: 'payment' | 'maintenance' | 'lease' | 'security' | 'general' | 'message' | 'maintenance_request' | 'visitor_request' | 'visitor_response' = 'general') => {
    try {
      const count = await NotificationService.notifyAllCaretakers(title, message, type);
      toast({
        title: "Notifications Sent",
        description: `Sent notifications to ${count} caretakers`,
      });
    } catch (error) {
      console.error('Error sending bulk notifications to caretakers:', error);
      toast({
        title: "Error",
        description: "Failed to send bulk notifications to caretakers",
        variant: "destructive",
      });
    }
  }, [toast]);

  // Custom notification
  const createCustomNotification = useCallback(async (userId: string, title: string, message: string, type: 'payment' | 'maintenance' | 'lease' | 'security' | 'general' | 'message' | 'maintenance_request' | 'visitor_request' | 'visitor_response', actionUrl?: string) => {
    try {
      await NotificationService.createNotification({
        user_id: userId,
        title,
        message,
        type,
        action_url: actionUrl,
      });
      toast({
        title: "Notification Sent",
        description: "Custom notification sent successfully",
      });
    } catch (error) {
      console.error('Error creating custom notification:', error);
      toast({
        title: "Error",
        description: "Failed to create custom notification",
        variant: "destructive",
      });
    }
  }, [toast]);

  return {
    // Payment notifications
    notifyPaymentReceived,
    notifyPaymentDue,
    notifyPaymentOverdue,
    
    // Maintenance notifications
    notifyMaintenanceRequestCreated,
    notifyMaintenanceRequestApproved,
    notifyMaintenanceRequestCompleted,
    notifyCaretakerMaintenanceRequest,
    
    // Lease notifications
    notifyLeaseExpiring,
    notifyLeaseRenewed,
    notifyLeaseTerminated,
    
    // Security notifications
    notifyVisitorRequest,
    notifyVisitorApproved,
    notifySecurityIncident,
    
    // Message notifications
    notifyNewMessage,
    
    // System notifications
    notifySystemMaintenance,
    notifySystemUpdate,
    
    // Bulk notifications
    notifyAllTenants,
    notifyAllCaretakers,
    
    // Custom notification
    createCustomNotification,
  };
};
