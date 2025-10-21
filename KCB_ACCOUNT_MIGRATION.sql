-- Migration to add KCB bank account fields to profiles table
-- Run this in Supabase SQL Editor

-- Add KCB account fields to profiles table
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS kcb_account_number TEXT,
ADD COLUMN IF NOT EXISTS kcb_account_name TEXT,
ADD COLUMN IF NOT EXISTS kcb_branch TEXT,
ADD COLUMN IF NOT EXISTS kcb_payments_enabled BOOLEAN DEFAULT false;

-- Add comment to explain the columns
COMMENT ON COLUMN profiles.kcb_account_number IS 'KCB bank account number for receiving M-Pesa payments';
COMMENT ON COLUMN profiles.kcb_account_name IS 'Name as registered with KCB bank';
COMMENT ON COLUMN profiles.kcb_branch IS 'KCB branch name (optional)';
COMMENT ON COLUMN profiles.kcb_payments_enabled IS 'Whether KCB M-Pesa payments are enabled for this landlord';

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_kcb_enabled 
ON profiles(kcb_payments_enabled) 
WHERE kcb_payments_enabled = true;

-- Grant permissions (if needed)
-- ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;


