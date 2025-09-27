-- Add notification functions and fix security issues
-- Part 2 of messaging and maintenance integration

-- 1. Create function for message notifications with proper search path
CREATE OR REPLACE FUNCTION public.notify_message_received()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 2. Create trigger for message notifications
DROP TRIGGER IF EXISTS trigger_notify_message_received ON public.messages;
CREATE TRIGGER trigger_notify_message_received
  AFTER INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.notify_message_received();

-- 3. Create function to notify caretaker of new maintenance requests
CREATE OR REPLACE FUNCTION public.notify_caretaker_maintenance_request()
RETURNS TRIGGER AS $$
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
    'maintenance_request',
    '/dashboard?tab=work-orders'
  FROM profiles p
  WHERE p.role = 'caretaker'
    OR (NEW.assigned_to IS NOT NULL AND p.id = NEW.assigned_to);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 4. Create trigger for maintenance request notifications  
DROP TRIGGER IF EXISTS trigger_notify_caretaker_maintenance_request ON public.maintenance_requests;
CREATE TRIGGER trigger_notify_caretaker_maintenance_request
  AFTER INSERT ON public.maintenance_requests
  FOR EACH ROW EXECUTE FUNCTION public.notify_caretaker_maintenance_request();