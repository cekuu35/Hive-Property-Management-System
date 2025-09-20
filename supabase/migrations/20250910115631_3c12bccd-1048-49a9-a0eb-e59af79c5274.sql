-- Fix foreign key constraint for leases.tenant_id
-- It should reference tenant_info.id, not profiles.id

-- Drop the existing foreign key constraint
ALTER TABLE public.leases DROP CONSTRAINT IF EXISTS leases_tenant_id_fkey;

-- Add the correct foreign key constraint
ALTER TABLE public.leases 
ADD CONSTRAINT leases_tenant_id_fkey 
FOREIGN KEY (tenant_id) REFERENCES public.tenant_info(id) ON DELETE CASCADE;