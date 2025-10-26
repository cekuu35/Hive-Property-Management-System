-- Add payment_method column to subscription_payments table
ALTER TABLE subscription_payments
ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'mpesa_daraja';

-- Add result_description column for Daraja callback details
ALTER TABLE subscription_payments
ADD COLUMN IF NOT EXISTS result_description TEXT;

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_subscription_payments_transaction_reference 
ON subscription_payments(transaction_reference);

-- Comment
COMMENT ON COLUMN subscription_payments.payment_method IS 'Payment method used: mpesa_daraja for Safaricom Daraja API, mpesa_kcb for KCB Buni';
COMMENT ON COLUMN subscription_payments.result_description IS 'Result description from M-Pesa callback';

