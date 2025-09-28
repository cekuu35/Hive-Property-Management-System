-- Clean up invalid notifications and fix the notification system
-- Delete notifications with invalid user_ids
DELETE FROM notifications WHERE user_id NOT IN (SELECT id FROM auth.users);

-- Now add the proper foreign key constraint
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_user_id_fkey;
ALTER TABLE notifications ADD CONSTRAINT notifications_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;