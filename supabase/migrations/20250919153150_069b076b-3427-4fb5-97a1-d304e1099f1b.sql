-- Create inventory table for caretakers
CREATE TABLE public.inventory (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  current_stock INTEGER NOT NULL DEFAULT 0,
  minimum_stock INTEGER NOT NULL DEFAULT 0,
  unit TEXT NOT NULL,
  category TEXT NOT NULL,
  last_restocked DATE,
  property_id UUID,
  caretaker_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;

-- Create policies for inventory
CREATE POLICY "Caretakers can manage inventory" 
ON public.inventory 
FOR ALL
USING (caretaker_id IN (
  SELECT profiles.id 
  FROM profiles 
  WHERE profiles.user_id = auth.uid() AND profiles.role = 'caretaker'
));

-- Create trigger for updated_at
CREATE TRIGGER update_inventory_updated_at
BEFORE UPDATE ON public.inventory
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add trigger to create notification when maintenance request is created
CREATE OR REPLACE FUNCTION notify_caretaker_maintenance_request()
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
    p.id,
    'New Maintenance Request',
    'A new maintenance request has been submitted: ' || NEW.title,
    'maintenance_request',
    '/dashboard?tab=work-orders'
  FROM profiles p
  WHERE p.role = 'caretaker'
    OR (NEW.assigned_to IS NOT NULL AND p.id = NEW.assigned_to);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for maintenance request notifications
CREATE TRIGGER trigger_notify_caretaker_maintenance_request
  AFTER INSERT ON public.maintenance_requests
  FOR EACH ROW
  EXECUTE FUNCTION notify_caretaker_maintenance_request();