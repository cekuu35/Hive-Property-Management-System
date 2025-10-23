-- =====================================================
-- Create Push Subscriptions System
-- =====================================================
-- This migration creates the infrastructure for web push notifications

-- Create push_subscriptions table
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  user_agent TEXT,
  device_name TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_used_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(endpoint)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id ON public.push_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_profile_id ON public.push_subscriptions(profile_id);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_active ON public.push_subscriptions(is_active) WHERE is_active = true;

-- Enable RLS
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own push subscriptions"
  ON public.push_subscriptions
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own push subscriptions"
  ON public.push_subscriptions
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own push subscriptions"
  ON public.push_subscriptions
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own push subscriptions"
  ON public.push_subscriptions
  FOR DELETE
  USING (user_id = auth.uid());

-- Create notification preferences table
CREATE TABLE IF NOT EXISTS public.notification_preferences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  
  -- Notification channels
  email_enabled BOOLEAN NOT NULL DEFAULT true,
  push_enabled BOOLEAN NOT NULL DEFAULT true,
  sms_enabled BOOLEAN NOT NULL DEFAULT false,
  
  -- Notification types
  rent_reminders BOOLEAN NOT NULL DEFAULT true,
  payment_confirmations BOOLEAN NOT NULL DEFAULT true,
  maintenance_updates BOOLEAN NOT NULL DEFAULT true,
  visitor_notifications BOOLEAN NOT NULL DEFAULT true,
  security_alerts BOOLEAN NOT NULL DEFAULT true,
  messages BOOLEAN NOT NULL DEFAULT true,
  lease_updates BOOLEAN NOT NULL DEFAULT true,
  application_updates BOOLEAN NOT NULL DEFAULT true,
  
  -- Timing preferences
  quiet_hours_enabled BOOLEAN NOT NULL DEFAULT false,
  quiet_hours_start TIME,
  quiet_hours_end TIME,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  UNIQUE(profile_id)
);

-- Create index
CREATE INDEX IF NOT EXISTS idx_notification_preferences_profile_id ON public.notification_preferences(profile_id);

-- Enable RLS
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

-- RLS Policies for notification preferences
CREATE POLICY "Users can view their own notification preferences"
  ON public.notification_preferences
  FOR SELECT
  USING (profile_id IN (
    SELECT id FROM public.profiles WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can insert their own notification preferences"
  ON public.notification_preferences
  FOR INSERT
  WITH CHECK (profile_id IN (
    SELECT id FROM public.profiles WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can update their own notification preferences"
  ON public.notification_preferences
  FOR UPDATE
  USING (profile_id IN (
    SELECT id FROM public.profiles WHERE user_id = auth.uid()
  ))
  WITH CHECK (profile_id IN (
    SELECT id FROM public.profiles WHERE user_id = auth.uid()
  ));

-- Function to create default notification preferences
CREATE OR REPLACE FUNCTION public.create_default_notification_preferences()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.notification_preferences (profile_id)
  VALUES (NEW.id)
  ON CONFLICT (profile_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create default preferences when profile is created
DROP TRIGGER IF EXISTS create_default_notification_preferences_trigger ON public.profiles;
CREATE TRIGGER create_default_notification_preferences_trigger
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.create_default_notification_preferences();

-- Function to get active push subscriptions for a user
CREATE OR REPLACE FUNCTION public.get_user_push_subscriptions(user_profile_id UUID)
RETURNS TABLE (
  subscription_id UUID,
  endpoint TEXT,
  p256dh TEXT,
  auth_key TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ps.id as subscription_id,
    ps.endpoint,
    ps.p256dh,
    ps.auth as auth_key
  FROM public.push_subscriptions ps
  JOIN public.profiles p ON ps.profile_id = p.id
  WHERE p.id = user_profile_id
  AND ps.is_active = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to clean up inactive subscriptions (older than 90 days)
CREATE OR REPLACE FUNCTION public.cleanup_inactive_push_subscriptions()
RETURNS void AS $$
BEGIN
  DELETE FROM public.push_subscriptions
  WHERE is_active = false
  AND updated_at < now() - INTERVAL '90 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for updated_at
CREATE TRIGGER update_push_subscriptions_updated_at
  BEFORE UPDATE ON public.push_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_notification_preferences_updated_at
  BEFORE UPDATE ON public.notification_preferences
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.push_subscriptions TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.notification_preferences TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_push_subscriptions(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_inactive_push_subscriptions() TO authenticated;

-- Comments
COMMENT ON TABLE public.push_subscriptions IS 'Stores web push notification subscriptions for users';
COMMENT ON TABLE public.notification_preferences IS 'Stores user notification preferences and settings';
COMMENT ON FUNCTION public.get_user_push_subscriptions(UUID) IS 'Retrieves active push subscriptions for a user';
COMMENT ON FUNCTION public.cleanup_inactive_push_subscriptions() IS 'Removes old inactive push subscriptions';

