-- Fix notifications type constraint to include message and maintenance_request types
ALTER TABLE notifications DROP CONSTRAINT notifications_type_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check 
CHECK (type = ANY (ARRAY['payment'::text, 'maintenance'::text, 'lease'::text, 'security'::text, 'general'::text, 'message'::text, 'maintenance_request'::text, 'visitor_request'::text, 'visitor_response'::text]));

-- Update the message notification trigger to use correct type
CREATE OR REPLACE FUNCTION public.notify_message_received()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.notifications (
    user_id,
    title,
    message,
    type,
    action_url
  )
  VALUES (
    NEW.receiver_id,
    'New Message',
    'You have received a new message: ' || LEFT(NEW.message, 50) || CASE WHEN LENGTH(NEW.message) > 50 THEN '...' ELSE '' END,
    'message',
    '/dashboard?tab=messages'
  );
  RETURN NEW;
END;
$function$;

-- Update the maintenance request notification trigger to use correct type  
CREATE OR REPLACE FUNCTION public.notify_caretaker_maintenance_request()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Create notification for all caretakers (or specific caretaker if assigned)
  INSERT INTO public.notifications (
    user_id,
    title,
    message,
    type,
    action_url
  )
  SELECT 
    p.user_id,
    'New Maintenance Request',
    'A new maintenance request has been submitted: ' || NEW.title,
    'maintenance',
    '/dashboard?tab=work-orders'
  FROM profiles p
  WHERE p.role = 'caretaker'
    OR (NEW.assigned_to IS NOT NULL AND p.id = NEW.assigned_to);
  
  RETURN NEW;
END;
$function$;