-- =====================================================
-- FORCE FIX: Push Notification Queue Foreign Key
-- =====================================================
-- Explicitly drops and recreates the FK constraint
-- to ensure it points to auth.users(id)
-- =====================================================

-- Step 1: Drop the existing (incorrect) foreign key
ALTER TABLE public.push_notification_queue
DROP CONSTRAINT IF EXISTS push_notification_queue_user_id_fkey;

-- Step 2: Add the correct foreign key pointing to auth.users
ALTER TABLE public.push_notification_queue
ADD CONSTRAINT push_notification_queue_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Step 3: Verify trigger exists, recreate if needed
DROP TRIGGER IF EXISTS send_push_on_new_notification ON public.notifications;

CREATE TRIGGER send_push_on_new_notification
  AFTER INSERT ON public.notifications
  FOR EACH ROW
  EXECUTE FUNCTION public.send_push_notification_trigger();

-- Add comments
COMMENT ON CONSTRAINT push_notification_queue_user_id_fkey ON public.push_notification_queue 
IS 'References auth.users to match notifications.user_id foreign key (FIXED)';

COMMENT ON TRIGGER send_push_on_new_notification ON public.notifications
IS 'Automatically queues push notifications when a new notification is created';

