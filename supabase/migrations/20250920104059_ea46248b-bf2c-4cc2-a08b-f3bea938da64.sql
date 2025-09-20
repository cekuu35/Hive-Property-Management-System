-- Add security_id field to visitor_requests to track which security staff created the request
ALTER TABLE public.visitor_requests ADD COLUMN security_id uuid REFERENCES public.profiles(id);

-- Add constraint to ensure either tenant_id OR security_id is set (but not both for creation flow)
-- Note: We'll handle this in application logic since tenant approval still needs tenant_id

-- Enable realtime for visitor_requests table
ALTER TABLE public.visitor_requests REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.visitor_requests;

-- Add function to notify tenants when security creates visitor request
CREATE OR REPLACE FUNCTION public.notify_tenant_visitor_request()
RETURNS TRIGGER AS $$
BEGIN
  -- Create notification for tenant when security creates a visitor request
  IF NEW.security_id IS NOT NULL AND NEW.tenant_id IS NOT NULL THEN
    INSERT INTO public.notifications (
      user_id,
      title,
      message,
      type,
      action_url
    )
    SELECT 
      pr.user_id,
      'Visitor Request from Security',
      'Security is requesting approval for a visitor: ' || NEW.visitor_name || ' to visit your unit.',
      'visitor_request',
      '/dashboard?tab=visitors'
    FROM profiles pr
    WHERE pr.id = NEW.tenant_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for visitor request notifications
CREATE TRIGGER notify_tenant_visitor_request_trigger
  AFTER INSERT ON public.visitor_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_tenant_visitor_request();

-- Add function to notify security when tenant responds to visitor request
CREATE OR REPLACE FUNCTION public.notify_security_visitor_response()
RETURNS TRIGGER AS $$
BEGIN
  -- Notify security when tenant approves/rejects visitor request
  IF OLD.status = 'pending' AND NEW.status IN ('approved', 'rejected') AND NEW.security_id IS NOT NULL THEN
    INSERT INTO public.notifications (
      user_id,
      title,
      message,
      type,
      action_url
    )
    SELECT 
      pr.user_id,
      'Visitor Request ' || INITCAP(NEW.status),
      'Tenant has ' || NEW.status || ' the visitor request for: ' || NEW.visitor_name,
      'visitor_response',
      '/dashboard?tab=visitors'
    FROM profiles pr
    WHERE pr.id = NEW.security_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for visitor response notifications
CREATE TRIGGER notify_security_visitor_response_trigger
  AFTER UPDATE ON public.visitor_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_security_visitor_response();