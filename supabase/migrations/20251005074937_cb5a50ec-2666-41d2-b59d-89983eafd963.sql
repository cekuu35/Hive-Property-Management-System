-- Add tenant status and payment tracking fields to tenant_info table
ALTER TABLE public.tenant_info
ADD COLUMN IF NOT EXISTS tenant_status text DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS current_balance numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS payment_status text DEFAULT 'unpaid';

-- Add comment for clarity
COMMENT ON COLUMN public.tenant_info.tenant_status IS 'Status of tenant: pending, active, inactive';
COMMENT ON COLUMN public.tenant_info.current_balance IS 'Current outstanding balance (rent amount)';
COMMENT ON COLUMN public.tenant_info.payment_status IS 'Payment status: paid, unpaid, overdue';

-- Update existing tenant_info records to have active status if they have an active lease
UPDATE public.tenant_info ti
SET tenant_status = 'active'
WHERE EXISTS (
  SELECT 1 FROM public.leases l
  WHERE l.tenant_info_id = ti.id
  AND l.status = 'active'
);