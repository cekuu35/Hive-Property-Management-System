-- Update properties table to reference landlords table
-- First, check if landlord_id column exists and add it if not
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'properties' 
        AND column_name = 'landlord_id'
    ) THEN
        ALTER TABLE public.properties ADD COLUMN landlord_id UUID;
    END IF;
END $$;

-- Create a default landlord for existing properties if none exists
INSERT INTO public.landlords (id, name, email, subaccount_code)
SELECT 
    gen_random_uuid(),
    'Default Landlord',
    'default@landlord.com',
    'ACCT_default_landlord'
WHERE NOT EXISTS (SELECT 1 FROM public.landlords LIMIT 1);

-- Get the default landlord ID
DO $$
DECLARE
    default_landlord_id UUID;
BEGIN
    -- Get the first landlord (or default one we just created)
    SELECT id INTO default_landlord_id FROM public.landlords ORDER BY created_at ASC LIMIT 1;
    
    -- Update all properties that don't have a landlord_id
    UPDATE public.properties 
    SET landlord_id = default_landlord_id
    WHERE landlord_id IS NULL;
    
    -- Now add the NOT NULL constraint
    ALTER TABLE public.properties ALTER COLUMN landlord_id SET NOT NULL;
END $$;

-- Add foreign key constraint if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'properties_landlord_id_fkey'
    ) THEN
        ALTER TABLE public.properties 
        ADD CONSTRAINT properties_landlord_id_fkey 
        FOREIGN KEY (landlord_id) REFERENCES public.landlords(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_properties_landlord_id ON public.properties(landlord_id);
