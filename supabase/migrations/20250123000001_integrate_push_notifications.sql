-- =====================================================
-- Integrate Push Notifications with Existing Notification System
-- =====================================================
-- This migration connects the push notification system to the existing
-- notifications table, so push notifications are sent automatically
-- FULLY IDEMPOTENT: Safe to re-run multiple times
-- =====================================================

-- 1) Ensure pgcrypto extension exists (for gen_random_uuid)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2) Create update_updated_at_column function if not exists
-- (can't CREATE FUNCTION inside DO in a portable way, so check and create)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_proc p
    JOIN pg_catalog.pg_namespace n ON p.pronamespace = n.oid
    WHERE p.proname = 'update_updated_at_column'
      AND n.nspname = 'public'
  ) THEN
    PERFORM 1; -- signal we'll create below
  END IF;
END;
$$;

-- Create function (will replace if exists) - safe
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql VOLATILE;

-- 3) Trigger function for sending push notifications
CREATE OR REPLACE FUNCTION public.send_push_notification_trigger()
RETURNS TRIGGER AS $$
DECLARE
  push_payload JSONB;
BEGIN
  push_payload := jsonb_build_object(
    'userId', NEW.user_id,
    'notification', jsonb_build_object(
      'id', NEW.id,
      'title', NEW.title,
      'message', NEW.message,
      'type', NEW.type,
      'action_url', NEW.action_url,
      'data', NEW.data
    )
  );

  INSERT INTO public.push_notification_queue (
    user_id,
    notification_id,
    payload,
    status,
    created_at,
    updated_at
  ) VALUES (
    NEW.user_id,
    NEW.id,
    push_payload,
    'pending',
    NOW(),
    NOW()
  );

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Failed to queue push notification: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4) Create push_notification_queue table if missing
CREATE TABLE IF NOT EXISTS public.push_notification_queue (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  notification_id UUID,
  payload JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  attempts INTEGER NOT NULL DEFAULT 0,
  last_attempt_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add foreign keys if not present (use ALTER TABLE ... ADD CONSTRAINT if missing)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c JOIN pg_class t ON c.conrelid = t.oid JOIN pg_namespace n ON t.relnamespace = n.oid
    WHERE c.contype = 'f' AND n.nspname = 'public' AND t.relname = 'push_notification_queue' AND c.conname = 'push_notification_queue_user_id_fkey'
  ) THEN
    -- Reference auth.users(id) to match notifications.user_id foreign key
    ALTER TABLE public.push_notification_queue
      ADD CONSTRAINT push_notification_queue_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c JOIN pg_class t ON c.conrelid = t.oid JOIN pg_namespace n ON t.relnamespace = n.oid
    WHERE c.contype = 'f' AND n.nspname = 'public' AND t.relname = 'push_notification_queue' AND c.conname = 'push_notification_queue_notification_id_fkey'
  ) THEN
    ALTER TABLE public.push_notification_queue
      ADD CONSTRAINT push_notification_queue_notification_id_fkey FOREIGN KEY (notification_id) REFERENCES public.notifications(id) ON DELETE CASCADE;
  END IF;
END;
$$;

-- 5) Create indexes (idempotent)
CREATE INDEX IF NOT EXISTS idx_push_queue_status ON public.push_notification_queue(status) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_push_queue_user_id ON public.push_notification_queue(user_id);

-- 6) Enable RLS
ALTER TABLE public.push_notification_queue ENABLE ROW LEVEL SECURITY;

-- 7) Create policy if missing (idempotent approach)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy p JOIN pg_class c ON p.polrelid = c.oid JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE p.polname = 'service_role_can_manage_push_queue' AND n.nspname = 'public' AND c.relname = 'push_notification_queue'
  ) THEN
    CREATE POLICY service_role_can_manage_push_queue
      ON public.push_notification_queue
      FOR ALL
      USING (true)
      WITH CHECK (true);
  END IF;
END;
$$;

-- 8) Trigger on notifications table (idempotent)
DROP TRIGGER IF EXISTS send_push_on_new_notification ON public.notifications;
CREATE TRIGGER send_push_on_new_notification
  AFTER INSERT ON public.notifications
  FOR EACH ROW
  EXECUTE FUNCTION public.send_push_notification_trigger();

-- 9) Function to process push notification queue
CREATE OR REPLACE FUNCTION public.process_push_notification_queue()
RETURNS void AS $$
DECLARE
  queue_item RECORD;
BEGIN
  FOR queue_item IN
    SELECT * FROM public.push_notification_queue
    WHERE status = 'pending' AND attempts < 3
    ORDER BY created_at ASC
    LIMIT 100
  LOOP
    BEGIN
      UPDATE public.push_notification_queue
      SET status = 'sent', attempts = attempts + 1, last_attempt_at = NOW(), updated_at = NOW()
      WHERE id = queue_item.id;
    EXCEPTION WHEN OTHERS THEN
      UPDATE public.push_notification_queue
      SET status = CASE WHEN attempts >= 2 THEN 'failed' ELSE 'pending' END,
          attempts = attempts + 1,
          last_attempt_at = NOW(),
          error_message = SQLERRM,
          updated_at = NOW()
      WHERE id = queue_item.id;
    END;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to clean up old queue items (older than 7 days)
CREATE OR REPLACE FUNCTION public.cleanup_push_notification_queue()
RETURNS void AS $$
BEGIN
  DELETE FROM public.push_notification_queue
  WHERE created_at < NOW() - INTERVAL '7 days' AND status IN ('sent', 'failed');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10) Trigger to update updated_at (idempotent)
DROP TRIGGER IF EXISTS update_push_queue_updated_at ON public.push_notification_queue;
CREATE TRIGGER update_push_queue_updated_at
  BEFORE UPDATE ON public.push_notification_queue
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 11) Grant permissions
GRANT SELECT, INSERT, UPDATE ON public.push_notification_queue TO authenticated;
GRANT EXECUTE ON FUNCTION public.send_push_notification_trigger() TO authenticated;
GRANT EXECUTE ON FUNCTION public.process_push_notification_queue() TO authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_push_notification_queue() TO authenticated;

-- 12) Comments
COMMENT ON TABLE public.push_notification_queue IS 'Queue for processing push notifications asynchronously';
COMMENT ON FUNCTION public.send_push_notification_trigger() IS 'Trigger function that queues push notifications when notifications are created';
COMMENT ON FUNCTION public.process_push_notification_queue() IS 'Processes pending push notifications from the queue';
COMMENT ON FUNCTION public.cleanup_push_notification_queue() IS 'Removes old processed push notifications from queue';

-- 13) Create monitoring view (idempotent)
CREATE OR REPLACE VIEW public.push_notification_stats AS
SELECT DATE_TRUNC('day', created_at) as date, status, COUNT(*) as count
FROM public.push_notification_queue
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY DATE_TRUNC('day', created_at), status
ORDER BY date DESC, status;

GRANT SELECT ON public.push_notification_stats TO authenticated;
