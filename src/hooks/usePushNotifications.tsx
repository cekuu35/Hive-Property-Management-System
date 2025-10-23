import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

// VAPID public key - This should be stored in environment variables
// For now, using a placeholder - you'll need to generate your own VAPID keys
const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY || 'BGRzfXfpFdYqPiP5H3KLUzaV7Y3BnKQVLJpUMJQN0V8X9TFdVJGZKJZvY2';

interface PushSubscription {
  id: string;
  endpoint: string;
  is_active: boolean;
  device_name?: string;
  created_at: string;
}

export const usePushNotifications = () => {
  const { user, profile } = useAuth();
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);
  const [loading, setLoading] = useState(false);
  const [supported, setSupported] = useState(false);

  useEffect(() => {
    // Check if push notifications are supported
    const isSupported = 'Notification' in window && 
                       'serviceWorker' in navigator && 
                       'PushManager' in window;
    setSupported(isSupported);

    if (isSupported) {
      setPermission(Notification.permission);
      checkExistingSubscription();
    }
  }, [user]);

  const checkExistingSubscription = async () => {
    if (!user || !profile) return;

    try {
      const { data, error } = await supabase
        .from('push_subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      setSubscription(data);
    } catch (error) {
      console.error('[usePushNotifications] Error checking subscription:', error);
    }
  };

  const registerServiceWorker = async (): Promise<ServiceWorkerRegistration | null> => {
    try {
      console.log('[usePushNotifications] Registering service worker...');
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
        updateViaCache: 'none',
      });

      console.log('[usePushNotifications] Service worker registered:', registration);

      // Wait for service worker to be ready
      await navigator.serviceWorker.ready;
      console.log('[usePushNotifications] Service worker ready');

      return registration;
    } catch (error) {
      console.error('[usePushNotifications] Service worker registration failed:', error);
      toast.error('Failed to register service worker');
      return null;
    }
  };

  const urlBase64ToUint8Array = (base64String: string): Uint8Array => {
    try {
      // Remove any whitespace
      const cleanString = base64String.trim();
      
      // Add padding if needed
      const padding = '='.repeat((4 - (cleanString.length % 4)) % 4);
      
      // Convert URL-safe base64 to standard base64
      const base64 = (cleanString + padding)
        .replace(/-/g, '+')
        .replace(/_/g, '/');

      console.log('[usePushNotifications] Converting VAPID key:', {
        original: cleanString.substring(0, 20) + '...',
        withPadding: base64.substring(0, 20) + '...',
        length: base64.length
      });

      const rawData = window.atob(base64);
      const outputArray = new Uint8Array(rawData.length);

      for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
      }
      
      console.log('[usePushNotifications] VAPID key converted successfully, length:', outputArray.length);
      return outputArray;
    } catch (error) {
      console.error('[usePushNotifications] Failed to convert VAPID key:', error);
      throw new Error('Invalid VAPID public key format. Please check your environment configuration.');
    }
  };

  const requestPermission = async (): Promise<boolean> => {
    if (!supported) {
      toast.error('Push notifications are not supported in this browser');
      return false;
    }

    try {
      const result = await Notification.requestPermission();
      setPermission(result);

      if (result === 'granted') {
        toast.success('Notification permission granted!');
        return true;
      } else if (result === 'denied') {
        toast.error('Notification permission denied');
        return false;
      } else {
        toast.info('Notification permission dismissed');
        return false;
      }
    } catch (error) {
      console.error('[usePushNotifications] Permission request error:', error);
      toast.error('Failed to request notification permission');
      return false;
    }
  };

  const subscribe = async (): Promise<boolean> => {
    if (!user || !profile) {
      toast.error('You must be logged in to subscribe to notifications');
      return false;
    }

    if (!supported) {
      toast.error('Push notifications are not supported');
      return false;
    }

    // Validate VAPID key
    if (!VAPID_PUBLIC_KEY || VAPID_PUBLIC_KEY.length < 20) {
      console.error('[usePushNotifications] Invalid VAPID public key');
      toast.error('Push notification configuration error. Please contact support.');
      return false;
    }

    setLoading(true);

    try {
      // Request permission if not granted
      if (permission !== 'granted') {
        const granted = await requestPermission();
        if (!granted) {
          setLoading(false);
          return false;
        }
      }

      // Register service worker
      const registration = await registerServiceWorker();
      if (!registration) {
        setLoading(false);
        return false;
      }

      // Subscribe to push
      console.log('[usePushNotifications] Subscribing to push...');
      console.log('[usePushNotifications] VAPID key length:', VAPID_PUBLIC_KEY.length);
      
      const pushSubscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });

      console.log('[usePushNotifications] Push subscription:', pushSubscription);

      // Extract subscription data
      const subscriptionJSON = pushSubscription.toJSON();
      const endpoint = subscriptionJSON.endpoint;
      const p256dh = subscriptionJSON.keys?.p256dh;
      const auth = subscriptionJSON.keys?.auth;

      if (!endpoint || !p256dh || !auth) {
        throw new Error('Invalid subscription data');
      }

      // Get device info
      const userAgent = navigator.userAgent;
      const deviceName = getDeviceName(userAgent);

      // Save to database
      const { data, error } = await supabase
        .from('push_subscriptions')
        .insert({
          user_id: user.id,
          profile_id: profile.id,
          endpoint,
          p256dh,
          auth,
          user_agent: userAgent,
          device_name: deviceName,
          is_active: true,
        })
        .select()
        .single();

      if (error) {
        // If unique constraint violation, update existing
        if (error.code === '23505') {
          const { data: updatedData, error: updateError } = await supabase
            .from('push_subscriptions')
            .update({
              user_id: user.id,
              profile_id: profile.id,
              p256dh,
              auth,
              user_agent: userAgent,
              device_name: deviceName,
              is_active: true,
              updated_at: new Date().toISOString(),
            })
            .eq('endpoint', endpoint)
            .select()
            .single();

          if (updateError) throw updateError;
          setSubscription(updatedData);
        } else {
          throw error;
        }
      } else {
        setSubscription(data);
      }

      toast.success('Successfully subscribed to push notifications!');
      return true;
    } catch (error: any) {
      console.error('[usePushNotifications] Subscribe error:', error);
      toast.error(`Failed to subscribe: ${error.message}`);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const unsubscribe = async (): Promise<boolean> => {
    if (!user) return false;

    setLoading(true);

    try {
      // Unsubscribe from browser
      const registration = await navigator.serviceWorker.ready;
      const pushSubscription = await registration.pushManager.getSubscription();

      if (pushSubscription) {
        await pushSubscription.unsubscribe();
        console.log('[usePushNotifications] Unsubscribed from push');
      }

      // Mark as inactive in database
      if (subscription) {
        const { error } = await supabase
          .from('push_subscriptions')
          .update({ is_active: false })
          .eq('id', subscription.id);

        if (error) throw error;
      }

      setSubscription(null);
      toast.success('Successfully unsubscribed from push notifications');
      return true;
    } catch (error: any) {
      console.error('[usePushNotifications] Unsubscribe error:', error);
      toast.error(`Failed to unsubscribe: ${error.message}`);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const testNotification = async () => {
    if (!supported || permission !== 'granted') {
      toast.error('Notifications not enabled');
      return;
    }

    if (!user || !profile) {
      toast.error('You must be logged in to test notifications');
      return;
    }

    setLoading(true);

    try {
      console.log('[usePushNotifications] Sending real push notification via Edge Function...');
      
      // Call the Edge Function to send a real push notification
      const { data, error } = await supabase.functions.invoke('send-push-notification', {
        body: {
          userId: user.id,
          notification: {
            title: 'Test Notification 🔔',
            message: 'This is a real push notification from the server!',
            body: 'If you can see this, push notifications are working correctly.',
            type: 'test',
            action_url: '/dashboard',
            data: {
              timestamp: new Date().toISOString(),
              test: true,
            },
          },
        },
      });

      if (error) {
        console.error('[usePushNotifications] Edge Function error:', error);
        throw error;
      }

      console.log('[usePushNotifications] Edge Function response:', data);
      
      if (data.sent > 0) {
        toast.success(`Test notification sent to ${data.sent} device(s)! Check your notifications.`);
      } else {
        toast.info(`Test notification queued but not sent. Reason: ${data.message}`);
      }
    } catch (error: any) {
      console.error('[usePushNotifications] Test notification error:', error);
      toast.error(`Failed to send test notification: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return {
    supported,
    permission,
    subscription,
    loading,
    isSubscribed: !!subscription,
    requestPermission,
    subscribe,
    unsubscribe,
    testNotification,
  };
};

// Helper function to extract device name from user agent
function getDeviceName(userAgent: string): string {
  if (/iPhone/.test(userAgent)) return 'iPhone';
  if (/iPad/.test(userAgent)) return 'iPad';
  if (/Android/.test(userAgent)) return 'Android Device';
  if (/Windows/.test(userAgent)) return 'Windows PC';
  if (/Mac/.test(userAgent)) return 'Mac';
  if (/Linux/.test(userAgent)) return 'Linux PC';
  return 'Unknown Device';
}

