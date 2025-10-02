-- Drop the existing notification trigger and function with CASCADE
DROP TRIGGER IF EXISTS on_message_created ON public.messages CASCADE;
DROP TRIGGER IF EXISTS trigger_notify_message_received ON public.messages CASCADE;
DROP FUNCTION IF EXISTS public.notify_message_received() CASCADE;

-- Recreate the notification function with correct user_id handling
CREATE OR REPLACE FUNCTION public.notify_message_received()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Get the auth.users user_id for the receiver from profiles
  INSERT INTO public.notifications (
    user_id,
    title,
    message,
    type,
    action_url
  )
  SELECT 
    p.user_id,
    'New Message',
    'You have received a new message: ' || LEFT(NEW.message, 50) || CASE WHEN LENGTH(NEW.message) > 50 THEN '...' ELSE '' END,
    'message',
    '/dashboard?tab=messages'
  FROM profiles p
  WHERE p.id = NEW.receiver_id;
  
  RETURN NEW;
END;
$function$;

-- Recreate the trigger
CREATE TRIGGER on_message_created
  AFTER INSERT ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_message_received();