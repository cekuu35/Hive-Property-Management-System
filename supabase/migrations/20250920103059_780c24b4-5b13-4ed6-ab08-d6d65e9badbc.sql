-- Enable realtime for maintenance_requests table
ALTER TABLE public.maintenance_requests REPLICA IDENTITY FULL;

-- Add maintenance_requests to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.maintenance_requests;

-- Enable realtime for notifications table  
ALTER TABLE public.notifications REPLICA IDENTITY FULL;

-- Add notifications to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;