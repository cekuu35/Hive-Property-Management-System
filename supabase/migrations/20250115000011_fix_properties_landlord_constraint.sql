-- Fix properties landlord_id constraint more gracefully
-- This migration handles the case where properties already have landlord_id values

-- First, ensure all properties have a landlord_id
-- If any properties still have null landlord_id, assign them to the first available landlord
UPDATE public.properties 
SET landlord_id = (
    SELECT id FROM public.landlords ORDER BY created_at ASC LIMIT 1
)
WHERE landlord_id IS NULL;

-- Now we can safely add the NOT NULL constraint
-- First, check if the constraint already exists
DO $$
BEGIN
    -- Check if the column already has a NOT NULL constraint
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'properties' 
        AND column_name = 'landlord_id'
        AND is_nullable = 'YES'
    ) THEN
        -- Add the NOT NULL constraint
        ALTER TABLE public.properties ALTER COLUMN landlord_id SET NOT NULL;
        RAISE NOTICE 'Added NOT NULL constraint to landlord_id column';
    ELSE
        RAISE NOTICE 'landlord_id column already has NOT NULL constraint';
    END IF;
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
        RAISE NOTICE 'Added foreign key constraint for landlord_id';
    ELSE
        RAISE NOTICE 'Foreign key constraint for landlord_id already exists';
    END IF;
END $$;

-- Create index for performance if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_properties_landlord_id ON public.properties(landlord_id);

-- Verify the setup
DO $$
DECLARE
    null_count INTEGER;
    total_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO null_count FROM public.properties WHERE landlord_id IS NULL;
    SELECT COUNT(*) INTO total_count FROM public.properties;
    
    RAISE NOTICE 'Properties with null landlord_id: %', null_count;
    RAISE NOTICE 'Total properties: %', total_count;
    
    IF null_count = 0 THEN
        RAISE NOTICE 'SUCCESS: All properties have a landlord_id assigned';
    ELSE
        RAISE WARNING 'WARNING: % properties still have null landlord_id', null_count;
    END IF;
END $$;
