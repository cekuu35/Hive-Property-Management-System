-- Add missing columns to existing payments table
-- This migration adds the missing columns for multi-landlord support

-- Add property_id column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'payments' 
        AND column_name = 'property_id'
    ) THEN
        ALTER TABLE public.payments ADD COLUMN property_id UUID;
        RAISE NOTICE 'Added property_id column to payments table';
    ELSE
        RAISE NOTICE 'property_id column already exists in payments table';
    END IF;
END $$;

-- Add subaccount_code column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'payments' 
        AND column_name = 'subaccount_code'
    ) THEN
        ALTER TABLE public.payments ADD COLUMN subaccount_code TEXT;
        RAISE NOTICE 'Added subaccount_code column to payments table';
    ELSE
        RAISE NOTICE 'subaccount_code column already exists in payments table';
    END IF;
END $$;

-- Add paystack_response column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'payments' 
        AND column_name = 'paystack_response'
    ) THEN
        ALTER TABLE public.payments ADD COLUMN paystack_response JSONB;
        RAISE NOTICE 'Added paystack_response column to payments table';
    ELSE
        RAISE NOTICE 'paystack_response column already exists in payments table';
    END IF;
END $$;

-- Add foreign key constraint for property_id if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'payments_property_id_fkey'
    ) THEN
        ALTER TABLE public.payments 
        ADD CONSTRAINT payments_property_id_fkey 
        FOREIGN KEY (property_id) REFERENCES public.properties(id) ON DELETE CASCADE;
        RAISE NOTICE 'Added foreign key constraint for property_id';
    ELSE
        RAISE NOTICE 'Foreign key constraint for property_id already exists';
    END IF;
END $$;

-- Add foreign key constraint for landlord_id if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'payments_landlord_id_fkey'
    ) THEN
        ALTER TABLE public.payments 
        ADD CONSTRAINT payments_landlord_id_fkey 
        FOREIGN KEY (landlord_id) REFERENCES public.landlords(id) ON DELETE CASCADE;
        RAISE NOTICE 'Added foreign key constraint for landlord_id';
    ELSE
        RAISE NOTICE 'Foreign key constraint for landlord_id already exists';
    END IF;
END $$;

-- Add foreign key constraint for tenant_id if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'payments_tenant_id_fkey'
    ) THEN
        ALTER TABLE public.payments 
        ADD CONSTRAINT payments_tenant_id_fkey 
        FOREIGN KEY (tenant_id) REFERENCES public.tenant_info(id) ON DELETE CASCADE;
        RAISE NOTICE 'Added foreign key constraint for tenant_id';
    ELSE
        RAISE NOTICE 'Foreign key constraint for tenant_id already exists';
    END IF;
END $$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_payments_property_id ON public.payments(property_id);
CREATE INDEX IF NOT EXISTS idx_payments_subaccount_code ON public.payments(subaccount_code);

-- Verify the setup
DO $$
DECLARE
    column_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO column_count 
    FROM information_schema.columns 
    WHERE table_name = 'payments' 
    AND table_schema = 'public';
    
    RAISE NOTICE 'Total columns in payments table: %', column_count;
    
    -- Check for required columns
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payments' AND column_name = 'property_id') THEN
        RAISE NOTICE '✅ property_id column exists';
    ELSE
        RAISE WARNING '❌ property_id column missing';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payments' AND column_name = 'subaccount_code') THEN
        RAISE NOTICE '✅ subaccount_code column exists';
    ELSE
        RAISE WARNING '❌ subaccount_code column missing';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payments' AND column_name = 'landlord_id') THEN
        RAISE NOTICE '✅ landlord_id column exists';
    ELSE
        RAISE WARNING '❌ landlord_id column missing';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payments' AND column_name = 'tenant_id') THEN
        RAISE NOTICE '✅ tenant_id column exists';
    ELSE
        RAISE WARNING '❌ tenant_id column missing';
    END IF;
END $$;
