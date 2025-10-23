-- =====================================================
-- Add Missing Foreign Keys and Columns for Visitors System
-- =====================================================
-- Fixes the schema to support automatic joins in PostgREST
-- =====================================================

-- Step 1: Add unit_id to visitor_requests table
ALTER TABLE public.visitor_requests 
ADD COLUMN IF NOT EXISTS unit_id UUID;

-- Step 2: Add foreign key constraints
-- For visitor_requests.unit_id -> units.id
ALTER TABLE public.visitor_requests
ADD CONSTRAINT visitor_requests_unit_id_fkey
FOREIGN KEY (unit_id) REFERENCES public.units(id) ON DELETE SET NULL;

-- For visitor_requests.tenant_id -> profiles.id (if not exists)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'visitor_requests_tenant_id_fkey'
    ) THEN
        ALTER TABLE public.visitor_requests
        ADD CONSTRAINT visitor_requests_tenant_id_fkey
        FOREIGN KEY (tenant_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
    END IF;
END $$;

-- For visitors.visiting_unit_id -> units.id
ALTER TABLE public.visitors
ADD CONSTRAINT visitors_visiting_unit_id_fkey
FOREIGN KEY (visiting_unit_id) REFERENCES public.units(id) ON DELETE SET NULL;

-- For visitors.visiting_tenant_id -> profiles.id (if not exists)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'visitors_visiting_tenant_id_fkey'
    ) THEN
        ALTER TABLE public.visitors
        ADD CONSTRAINT visitors_visiting_tenant_id_fkey
        FOREIGN KEY (visiting_tenant_id) REFERENCES public.profiles(id) ON DELETE SET NULL;
    END IF;
END $$;

-- For visitors.security_id -> profiles.id (if not exists)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'visitors_security_id_fkey'
    ) THEN
        ALTER TABLE public.visitors
        ADD CONSTRAINT visitors_security_id_fkey
        FOREIGN KEY (security_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
    END IF;
END $$;

-- For visitors.visitor_request_id -> visitor_requests.id (if not exists)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'visitors_visitor_request_id_fkey'
    ) THEN
        ALTER TABLE public.visitors
        ADD CONSTRAINT visitors_visitor_request_id_fkey
        FOREIGN KEY (visitor_request_id) REFERENCES public.visitor_requests(id) ON DELETE SET NULL;
    END IF;
END $$;

-- For visitor_requests.approved_by -> profiles.id (if not exists)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'visitor_requests_approved_by_fkey'
    ) THEN
        ALTER TABLE public.visitor_requests
        ADD CONSTRAINT visitor_requests_approved_by_fkey
        FOREIGN KEY (approved_by) REFERENCES public.profiles(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Step 3: Create index on new column
CREATE INDEX IF NOT EXISTS idx_visitor_requests_unit_id ON public.visitor_requests(unit_id);

-- Step 4: Update existing visitor_requests to set unit_id from tenant's lease
-- This populates unit_id for existing records based on the tenant's active lease
UPDATE public.visitor_requests vr
SET unit_id = (
    SELECT l.unit_id
    FROM public.leases l
    WHERE l.tenant_id = vr.tenant_id
    AND l.status = 'active'
    LIMIT 1
)
WHERE vr.unit_id IS NULL
AND EXISTS (
    SELECT 1 FROM public.leases l
    WHERE l.tenant_id = vr.tenant_id
    AND l.status = 'active'
);

-- Add helpful comments
COMMENT ON CONSTRAINT visitor_requests_unit_id_fkey ON public.visitor_requests IS 'Links visitor request to specific unit';
COMMENT ON CONSTRAINT visitors_visiting_unit_id_fkey ON public.visitors IS 'Links visitor to the unit they are visiting';
COMMENT ON CONSTRAINT visitors_visiting_tenant_id_fkey ON public.visitors IS 'Links visitor to the tenant they are visiting';
COMMENT ON CONSTRAINT visitors_security_id_fkey ON public.visitors IS 'Links visitor to the security guard who registered them';




