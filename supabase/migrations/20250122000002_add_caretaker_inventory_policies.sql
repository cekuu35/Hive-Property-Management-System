-- Add INSERT and DELETE policies for caretakers on property_inventory
-- This allows caretakers to fully manage inventory for their assigned properties

-- Policy for INSERT
CREATE POLICY "Caretakers can add inventory items for their assigned properties"
ON public.property_inventory
FOR INSERT
WITH CHECK (
  property_id IN (
    SELECT sa.property_id FROM public.staff_assignments sa
    JOIN public.profiles pr ON sa.staff_id = pr.id
    WHERE pr.user_id = auth.uid() 
      AND sa.role = 'caretaker' 
      AND sa.is_active = true
  )
);

-- Policy for DELETE
CREATE POLICY "Caretakers can delete inventory items for their assigned properties"
ON public.property_inventory
FOR DELETE
USING (
  property_id IN (
    SELECT sa.property_id FROM public.staff_assignments sa
    JOIN public.profiles pr ON sa.staff_id = pr.id
    WHERE pr.user_id = auth.uid() 
      AND sa.role = 'caretaker' 
      AND sa.is_active = true
  )
);

-- Optional: Add unique constraint to prevent duplicate item names per property
ALTER TABLE public.property_inventory
DROP CONSTRAINT IF EXISTS property_inventory_property_id_item_name_key;

ALTER TABLE public.property_inventory
ADD CONSTRAINT unique_property_inventory_item_name 
UNIQUE (property_id, item_name);

-- Log the migration
INSERT INTO public.cron_log (message, created_at)
VALUES ('[Migration] Added caretaker INSERT/DELETE policies for property_inventory', NOW());

COMMENT ON POLICY "Caretakers can add inventory items for their assigned properties" 
  ON public.property_inventory IS 
  'Allows caretakers to add new inventory items for properties they are assigned to';

COMMENT ON POLICY "Caretakers can delete inventory items for their assigned properties" 
  ON public.property_inventory IS 
  'Allows caretakers to remove inventory items from properties they manage';

