-- Add deposit payment tracking to unit applications
ALTER TABLE public.unit_applications 
ADD COLUMN deposit_paid boolean DEFAULT false,
ADD COLUMN deposit_payment_reference text,
ADD COLUMN deposit_amount numeric,
ADD COLUMN deposit_paid_at timestamp with time zone;