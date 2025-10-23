-- =====================================================
-- Fix Push Notification Queue Foreign Key
-- =====================================================
-- Changes push_notification_queue.user_id foreign key
-- from profiles(id) to auth.users(id) to match notifications.user_id
-- =====================================================

-- Drop the existing foreign key constraint if it exists
ALTER TABLE public.push_notification_queue
DROP CONSTRAINT IF EXISTS push_notification_queue_user_id_fkey;

-- Add the corrected foreign key pointing to auth.users
ALTER TABLE public.push_notification_queue
ADD CONSTRAINT push_notification_queue_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Add comment
COMMENT ON CONSTRAINT push_notification_queue_user_id_fkey ON public.push_notification_queue 
IS 'References auth.users to match notifications.user_id foreign key';

