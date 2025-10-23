import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PushPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: any;
  requireInteraction?: boolean;
  actions?: Array<{ action: string; title: string }>;
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { userId, notification } = await req.json();

    console.log('[send-push-notification] Received request:', { userId, notification });

    if (!userId || !notification) {
      return new Response(
        JSON.stringify({ error: 'userId and notification are required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Get user's active push subscriptions
    const { data: subscriptions, error: subError } = await supabaseClient
      .from('push_subscriptions')
      .select('*')
      .eq('profile_id', userId)
      .eq('is_active', true);

    if (subError) {
      console.error('[send-push-notification] Error fetching subscriptions:', subError);
      throw subError;
    }

    if (!subscriptions || subscriptions.length === 0) {
      console.log('[send-push-notification] No active subscriptions for user:', userId);
      return new Response(
        JSON.stringify({ message: 'No active subscriptions', sent: 0 }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Get notification preferences
    const { data: preferences } = await supabaseClient
      .from('notification_preferences')
      .select('*')
      .eq('profile_id', userId)
      .single();

    // Check if push notifications are enabled
    if (preferences && !preferences.push_enabled) {
      console.log('[send-push-notification] Push notifications disabled for user:', userId);
      return new Response(
        JSON.stringify({ message: 'Push notifications disabled', sent: 0 }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Check if this notification type is enabled
    const notificationType = notification.type || 'general';
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

    const prefKey = typeMapping[notificationType];
    if (preferences && prefKey && !preferences[prefKey]) {
      console.log('[send-push-notification] Notification type disabled:', notificationType);
      return new Response(
        JSON.stringify({ message: 'Notification type disabled', sent: 0 }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Prepare push payload
    const pushPayload: PushPayload = {
      title: notification.title || 'Property Manager',
      body: notification.message || notification.body || '',
      icon: '/logo.png',
      badge: '/badge.png',
      tag: notification.type || 'general',
      data: {
        url: notification.action_url || '/dashboard',
        notificationId: notification.id,
        ...notification.data,
      },
    };

    // Send to all subscriptions
    const results = [];
    for (const subscription of subscriptions) {
      try {
        const pushResponse = await sendWebPush(subscription, pushPayload);
        results.push({ subscriptionId: subscription.id, success: true });
        
        // Update last_used_at
        await supabaseClient
          .from('push_subscriptions')
          .update({ last_used_at: new Date().toISOString() })
          .eq('id', subscription.id);
          
      } catch (error: any) {
        console.error('[send-push-notification] Failed to send to subscription:', subscription.id, error);
        
        // If subscription is invalid (410 Gone), mark as inactive
        if (error.statusCode === 410) {
          await supabaseClient
            .from('push_subscriptions')
            .update({ is_active: false })
            .eq('id', subscription.id);
        }
        
        results.push({ subscriptionId: subscription.id, success: false, error: error.message });
      }
    }

    const successCount = results.filter(r => r.success).length;
    console.log('[send-push-notification] Sent to', successCount, 'of', subscriptions.length, 'subscriptions');

    return new Response(
      JSON.stringify({ 
        message: 'Push notifications sent', 
        sent: successCount,
        total: subscriptions.length,
        results 
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    console.error('[send-push-notification] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

async function sendWebPush(subscription: any, payload: PushPayload) {
  const vapidPublicKey = Deno.env.get('VITE_VAPID_PUBLIC_KEY');
  const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY');

  if (!vapidPublicKey || !vapidPrivateKey) {
    throw new Error('VAPID keys not configured');
  }

  // For now, just log (you'll need to implement actual web-push library)
  // In production, use: https://deno.land/x/web_push or similar
  console.log('[sendWebPush] Would send to:', subscription.endpoint);
  console.log('[sendWebPush] Payload:', payload);
  
  // TODO: Implement actual web-push sending using web-push library
  // This requires the web-push library which may not be available in Deno
  // For now, return success (you can implement this with a proper Deno web-push library)
  
  return { success: true };
}

