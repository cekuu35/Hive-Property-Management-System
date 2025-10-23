-- Create property_inventory table for caretaker inventory management
CREATE TABLE IF NOT EXISTS public.property_inventory (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  item_name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('tools', 'cleaning', 'plumbing', 'electrical', 'paint', 'hardware', 'safety', 'other')),
  current_stock INTEGER NOT NULL DEFAULT 0 CHECK (current_stock >= 0),
  minimum_stock INTEGER NOT NULL DEFAULT 0 CHECK (minimum_stock >= 0),
  unit TEXT NOT NULL DEFAULT 'pieces',  -- e.g., 'pieces', 'liters', 'meters', 'kg'
  location TEXT,  -- e.g., 'Storage Room A', 'Basement', 'Tool Shed'
  supplier TEXT,
  cost_per_unit DECIMAL(10, 2) DEFAULT 0,
  last_restocked_at TIMESTAMP WITH TIME ZONE,
  last_restocked_by UUID REFERENCES public.profiles(id),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.property_inventory ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Landlords can manage inventory for their properties" 
ON public.property_inventory 
FOR ALL 
USING (
  property_id IN (
    SELECT p.id FROM public.properties p 
    WHERE p.landlord_id IN (
      SELECT id FROM public.profiles WHERE user_id = auth.uid()
    )
  )
);

CREATE POLICY "Caretakers can view inventory for assigned properties" 
ON public.property_inventory 
FOR SELECT 
USING (
  property_id IN (
    SELECT sa.property_id 
    FROM public.staff_assignments sa
    JOIN public.profiles p ON sa.staff_id = p.id
    WHERE p.user_id = auth.uid() 
      AND sa.role = 'caretaker' 
      AND sa.is_active = true
  )
);

CREATE POLICY "Caretakers can update inventory for assigned properties" 
ON public.property_inventory 
FOR UPDATE 
USING (
  property_id IN (
    SELECT sa.property_id 
    FROM public.staff_assignments sa
    JOIN public.profiles p ON sa.staff_id = p.id
    WHERE p.user_id = auth.uid() 
      AND sa.role = 'caretaker' 
      AND sa.is_active = true
  )
);

-- Create indexes
CREATE INDEX idx_property_inventory_property_id ON public.property_inventory(property_id);
CREATE INDEX idx_property_inventory_category ON public.property_inventory(category);
CREATE INDEX idx_property_inventory_stock_status ON public.property_inventory(current_stock, minimum_stock);

-- Add trigger for updated_at
CREATE TRIGGER update_property_inventory_updated_at
  BEFORE UPDATE ON public.property_inventory
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert some sample data for common inventory items (optional)
INSERT INTO public.property_inventory (property_id, item_name, category, current_stock, minimum_stock, unit, location)
SELECT 
  p.id,
  item.name,
  item.category,
  item.default_stock,
  item.min_stock,
  item.unit,
  'Main Storage'
FROM public.properties p,
(VALUES 
  ('Light Bulbs', 'electrical', 20, 10, 'pieces'),
  ('Cleaning Supplies', 'cleaning', 5, 3, 'sets'),
  ('Plumbing Fittings', 'plumbing', 10, 5, 'pieces'),
  ('Paint (White)', 'paint', 4, 2, 'liters'),
  ('Screwdriver Set', 'tools', 2, 1, 'sets'),
  ('Safety Gloves', 'safety', 20, 10, 'pairs')
) AS item(name, category, default_stock, min_stock, unit)
WHERE EXISTS (SELECT 1 FROM public.properties WHERE id = p.id)
ON CONFLICT DO NOTHING;

-- Create function to check low stock items
CREATE OR REPLACE FUNCTION get_low_stock_items(p_property_id UUID DEFAULT NULL)
RETURNS TABLE (
  id UUID,
  property_id UUID,
  property_name TEXT,
  item_name TEXT,
  category TEXT,
  current_stock INTEGER,
  minimum_stock INTEGER,
  stock_deficit INTEGER
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    i.id,
    i.property_id,
    p.name as property_name,
    i.item_name,
    i.category,
    i.current_stock,
    i.minimum_stock,
    (i.minimum_stock - i.current_stock) as stock_deficit
  FROM public.property_inventory i
  JOIN public.properties p ON i.property_id = p.id
  WHERE i.current_stock <= i.minimum_stock
    AND (p_property_id IS NULL OR i.property_id = p_property_id)
  ORDER BY (i.minimum_stock - i.current_stock) DESC;
END;
$$;

-- Log the migration
INSERT INTO public.cron_log (message, created_at)
VALUES ('[Migration] Property inventory system created successfully', NOW());




