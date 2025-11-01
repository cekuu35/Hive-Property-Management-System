import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

/**
 * Hook to process push notification queue
 * This runs in the background and sends push notifications when they're queued
 */
export const usePushNotificationProcessor = () => {
  const { user } = useAuth();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const processingRef = useRef(false);

  useEffect(() => {
    if (!user) return;

    // Start processing queue every 10 seconds
    intervalRef.current = setInterval(() => {
      processQueue();
    }, 10000); // 10 seconds

    // Process immediately on mount
    processQueue();

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [user]);

  const processQueue = async () => {
    // Prevent concurrent processing
    if (processingRef.current) return;
    
    try {
      processingRef.current = true;

      // Get pending push notifications for current user
      const { data: queueItems, error } = await supabase
        .from('push_notification_queue')
        .select('*')
        .eq('status', 'pending')
        .eq('user_id', user?.id)
        .lt('attempts', 3)
        .order('created_at', { ascending: true })
        .limit(10);

      if (error) {
        console.error('[usePushNotificationProcessor] Error fetching queue:', error);
        return;
      }

      if (!queueItems || queueItems.length === 0) return;

      console.log('[usePushNotificationProcessor] Processing', queueItems.length, 'notifications');

      // Process each queued notification
      for (const item of queueItems) {
        try {
          await sendPushNotification(item);

          // Mark as sent
          await supabase
            .from('push_notification_queue')
            .update({
              status: 'sent',
              attempts: item.attempts + 1,
              last_attempt_at: new Date().toISOString(),
            })
            .eq('id', item.id);

        } catch (error: any) {
          console.error('[usePushNotificationProcessor] Error sending notification:', error);

          // Mark as failed or retry
          await supabase
            .from('push_notification_queue')
            .update({
              status: item.attempts >= 2 ? 'failed' : 'pending',
              attempts: item.attempts + 1,
              last_attempt_at: new Date().toISOString(),
              error_message: error.message,
            })
            .eq('id', item.id);
        }
      }
    } catch (error) {
      console.error('[usePushNotificationProcessor] Queue processing error:', error);
    } finally {
      processingRef.current = false;
    }
  };

  const sendPushNotification = async (queueItem: any) => {
    const { payload } = queueItem;
    const { notification } = payload;

    // Check if user has push subscriptions
    const { data: subscriptions } = await supabase
      .from('push_subscriptions')
      .select('*')
      .eq('user_id', user?.id)
      .eq('is_active', true);

    if (!subscriptions || subscriptions.length === 0) {
      console.log('[sendPushNotification] No active subscriptions');
      return;
    }

    // Check notification preferences
    const { data: preferences, error: prefsError } = await supabase
      .from('notification_preferences')
      .select('*')
      .eq('profile_id', payload.userId)
      .maybeSingle();

    if (preferences && !preferences.push_enabled) {
      console.log('[sendPushNotification] Push notifications disabled');
      return;
    }

    // Check if this notification type is enabled
    const typeMapping: Record<string, string> = {
      'payment': 'payment_confirmations',
      'maintenance': 'maintenance_updates',
      'visitor_request': 'visitor_notifications',
      'visitor_response': 'visitor_notifications',
      'security': 'security_alerts',
      'message': 'messages',
      'lease': 'lease_updates',
      'application': 'application_updates',
    };

    const prefKey = typeMapping[notification.type];
    if (preferences && prefKey && !preferences[prefKey]) {
      console.log('[sendPushNotification] Notification type disabled:', notification.type);
      return;
    }

    // Get service worker registration
    const registration = await navigator.serviceWorker.ready;

    // Show notification
    await registration.showNotification(notification.title, {
      body: notification.message,
      icon: '/logo.png',
      badge: '/badge.png',
      tag: notification.type || 'general',
      data: {
        url: notification.action_url || '/dashboard',
        notificationId: notification.id,
        ...notification.data,
      },
      vibrate: [200, 100, 200],
      timestamp: Date.now(),
    });

    console.log('[sendPushNotification] Notification sent:', notification.title);
  };

  return null;
};

