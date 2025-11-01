-- Add critical indexes for rent_payments table performance
-- These indexes are essential for the monthly rent calculation queries

-- Composite index for lease_id + due_date lookups (most common query pattern)
CREATE INDEX IF NOT EXISTS idx_rent_payments_lease_id_due_date 
ON public.rent_payments(lease_id, due_date);

-- Partial index for status lookups (pending/overdue only)
CREATE INDEX IF NOT EXISTS idx_rent_payments_status 
ON public.rent_payments(status) 
WHERE status IN ('pending', 'overdue');

-- Index for paid_date queries (for payment history)
CREATE INDEX IF NOT EXISTS idx_rent_payments_paid_date 
ON public.rent_payments(paid_date) 
WHERE paid_date IS NOT NULL;

-- Index for lease_id lookups (used in RLS policies)
CREATE INDEX IF NOT EXISTS idx_rent_payments_lease_id 
ON public.rent_payments(lease_id);

-- Verify indexes were created
SELECT 
  tablename, 
  indexname,
  indexdef
FROM pg_indexes 
WHERE tablename = 'rent_payments' 
ORDER BY indexname;

