-- Fix security warnings by updating functions with proper search path settings
DROP FUNCTION IF EXISTS public.notify_tenant_visitor_request();
DROP FUNCTION IF EXISTS public.notify_security_visitor_response();

-- Recreate functions with security definer and proper search path
CREATE OR REPLACE FUNCTION public.notify_tenant_visitor_request()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

-- Create secure function for visitor response notifications
CREATE OR REPLACE FUNCTION public.notify_security_visitor_response()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;