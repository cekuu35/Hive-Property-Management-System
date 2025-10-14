-- Add M-Pesa fields to landlords table
ALTER TABLE public.landlords 
ADD COLUMN IF NOT EXISTS paybill_number VARCHAR(20),
ADD COLUMN IF NOT EXISTS account_reference VARCHAR(50);

-- Add comments for documentation
COMMENT ON COLUMN public.landlords.paybill_number IS 'M-Pesa Paybill number for receiving payments';
COMMENT ON COLUMN public.landlords.account_reference IS 'Account reference for M-Pesa payments';

-- Update existing landlords with default M-Pesa values (sandbox)
UPDATE public.landlords 
SET 
  paybill_number = '174379',
  account_reference = 'RENT_PAYMENT'
WHERE paybill_number IS NULL;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_landlords_paybill_number ON public.landlords(paybill_number);

-- Add validation constraint
ALTER TABLE public.landlords 
ADD CONSTRAINT check_paybill_number_format 
CHECK (paybill_number ~ '^[0-9]{5,7}$' OR paybill_number IS NULL);

