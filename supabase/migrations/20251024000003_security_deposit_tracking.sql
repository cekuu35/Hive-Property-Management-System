-- ============================================================================
-- Security Deposit Tracking System
-- ============================================================================
-- Purpose: Track security deposits and deduct maintenance costs
-- When tenant moves out, refund remaining balance after all deductions
-- ============================================================================

-- Step 1: Add security deposit fields to tenant_info table
-- ============================================================================
ALTER TABLE tenant_info
ADD COLUMN IF NOT EXISTS security_deposit_amount DECIMAL(10, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS security_deposit_remaining DECIMAL(10, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS security_deposit_paid BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS security_deposit_paid_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS security_deposit_refunded BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS security_deposit_refund_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS security_deposit_refund_amount DECIMAL(10, 2) DEFAULT 0;

-- Add check constraints
ALTER TABLE tenant_info
DROP CONSTRAINT IF EXISTS check_security_deposit_positive;

ALTER TABLE tenant_info
ADD CONSTRAINT check_security_deposit_positive 
CHECK (security_deposit_amount >= 0 AND security_deposit_remaining >= 0);

-- Step 2: Add maintenance cost field to maintenance_requests table
-- ============================================================================
ALTER TABLE maintenance_requests
ADD COLUMN IF NOT EXISTS maintenance_cost DECIMAL(10, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS cost_deducted_from_deposit BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS cost_deduction_date TIMESTAMP WITH TIME ZONE;

-- Add check constraint
ALTER TABLE maintenance_requests
DROP CONSTRAINT IF EXISTS check_maintenance_cost_positive;

ALTER TABLE maintenance_requests
ADD CONSTRAINT check_maintenance_cost_positive 
CHECK (maintenance_cost >= 0);

-- Step 3: Create security deposit deductions history table
-- ============================================================================
CREATE TABLE IF NOT EXISTS security_deposit_deductions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenant_info(id) ON DELETE CASCADE,
  maintenance_request_id UUID REFERENCES maintenance_requests(id) ON DELETE SET NULL,
  deduction_amount DECIMAL(10, 2) NOT NULL,
  deduction_reason TEXT NOT NULL,
  remaining_balance DECIMAL(10, 2) NOT NULL,
  deducted_by UUID, -- Reference to auth.users, no FK constraint
  deducted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_security_deposit_deductions_tenant_id 
ON security_deposit_deductions(tenant_id);

CREATE INDEX IF NOT EXISTS idx_security_deposit_deductions_maintenance_request_id 
ON security_deposit_deductions(maintenance_request_id);

-- Step 4: Create function to automatically deduct from security deposit
-- ============================================================================
CREATE OR REPLACE FUNCTION deduct_from_security_deposit()
RETURNS TRIGGER AS $$
DECLARE
  v_tenant_id UUID;
  v_remaining_balance DECIMAL(10, 2);
  v_deduction_amount DECIMAL(10, 2);
BEGIN
  -- Only process if status changed to 'completed' and cost is greater than 0
  IF NEW.status = 'completed' 
     AND OLD.status != 'completed' 
     AND NEW.maintenance_cost > 0 
     AND NOT COALESCE(NEW.cost_deducted_from_deposit, false) THEN
    
    -- Get tenant_id from the unit
    SELECT ti.id, ti.security_deposit_remaining
    INTO v_tenant_id, v_remaining_balance
    FROM tenant_info ti
    INNER JOIN leases l ON l.tenant_info_id = ti.id
    WHERE l.unit_id = NEW.unit_id
      AND l.status = 'active'
    LIMIT 1;
    
    -- If tenant found and has security deposit
    IF v_tenant_id IS NOT NULL AND v_remaining_balance > 0 THEN
      -- Calculate deduction amount (can't deduct more than remaining)
      v_deduction_amount := LEAST(NEW.maintenance_cost, v_remaining_balance);
      
      -- Update tenant's remaining security deposit
      UPDATE tenant_info
      SET security_deposit_remaining = security_deposit_remaining - v_deduction_amount
      WHERE id = v_tenant_id;
      
      -- Mark maintenance request as deducted
      NEW.cost_deducted_from_deposit := true;
      NEW.cost_deduction_date := NOW();
      
      -- Record the deduction in history
      INSERT INTO security_deposit_deductions (
        tenant_id,
        maintenance_request_id,
        deduction_amount,
        deduction_reason,
        remaining_balance,
        deducted_by,
        notes
      ) VALUES (
        v_tenant_id,
        NEW.id,
        v_deduction_amount,
        NEW.title || ' - Maintenance cost deduction',
        (SELECT security_deposit_remaining FROM tenant_info WHERE id = v_tenant_id),
        NEW.assigned_to,
        'Automatic deduction from security deposit for completed maintenance'
      );
      
      -- Log the deduction
      RAISE NOTICE 'Deducted % from security deposit for tenant %. Remaining: %',
        v_deduction_amount, v_tenant_id, 
        (SELECT security_deposit_remaining FROM tenant_info WHERE id = v_tenant_id);
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 5: Create trigger for automatic deduction
-- ============================================================================
DROP TRIGGER IF EXISTS trigger_deduct_from_security_deposit ON maintenance_requests;

CREATE TRIGGER trigger_deduct_from_security_deposit
BEFORE UPDATE ON maintenance_requests
FOR EACH ROW
EXECUTE FUNCTION deduct_from_security_deposit();

-- Step 6: Create function to initialize security deposit from lease
-- ============================================================================
CREATE OR REPLACE FUNCTION initialize_security_deposit()
RETURNS TRIGGER AS $$
BEGIN
  -- When lease is approved, set security deposit amount from lease
  IF NEW.status = 'approved' AND OLD.status != 'approved' THEN
    UPDATE tenant_info
    SET 
      security_deposit_amount = NEW.security_deposit,
      security_deposit_remaining = NEW.security_deposit
    WHERE id = NEW.tenant_info_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 7: Create trigger to initialize security deposit
-- ============================================================================
DROP TRIGGER IF EXISTS trigger_initialize_security_deposit ON leases;

CREATE TRIGGER trigger_initialize_security_deposit
AFTER UPDATE ON leases
FOR EACH ROW
EXECUTE FUNCTION initialize_security_deposit();

-- Step 8: Create view for security deposit summary
-- ============================================================================
CREATE OR REPLACE VIEW security_deposit_summary AS
SELECT 
  ti.id AS tenant_id,
  ti.user_id,
  (ti.first_name || ' ' || ti.last_name) AS tenant_name,
  ti.email AS tenant_email,
  l.id AS lease_id,
  l.unit_id,
  un.unit_number,
  p.name AS property_name,
  ti.security_deposit_amount,
  ti.security_deposit_remaining,
  ti.security_deposit_paid,
  ti.security_deposit_paid_date,
  ti.security_deposit_refunded,
  ti.security_deposit_refund_date,
  ti.security_deposit_refund_amount,
  (ti.security_deposit_amount - ti.security_deposit_remaining) AS total_deductions,
  (
    SELECT COUNT(*)
    FROM security_deposit_deductions sdd
    WHERE sdd.tenant_id = ti.id
  ) AS deduction_count,
  l.start_date AS lease_start_date,
  l.end_date AS lease_end_date,
  l.status AS lease_status
FROM tenant_info ti
INNER JOIN leases l ON l.tenant_info_id = ti.id
INNER JOIN units un ON un.id = l.unit_id
INNER JOIN properties p ON p.id = un.property_id
WHERE ti.security_deposit_amount > 0;

-- Step 9: Enable RLS on security_deposit_deductions
-- ============================================================================
ALTER TABLE security_deposit_deductions ENABLE ROW LEVEL SECURITY;

-- Policy for tenants to view their own deductions
CREATE POLICY "Tenants can view their own security deposit deductions"
ON security_deposit_deductions
FOR SELECT
TO authenticated
USING (
  tenant_id IN (
    SELECT ti.id 
    FROM tenant_info ti 
    WHERE ti.user_id = auth.uid()
  )
);

-- Policy for landlords to view deductions for their properties
CREATE POLICY "Landlords can view security deposit deductions for their properties"
ON security_deposit_deductions
FOR SELECT
TO authenticated
USING (
  tenant_id IN (
    SELECT ti.id
    FROM tenant_info ti
    INNER JOIN leases l ON l.tenant_info_id = ti.id
    INNER JOIN units u ON u.id = l.unit_id
    INNER JOIN properties p ON p.id = u.property_id
    WHERE p.landlord_id = auth.uid()
  )
);

-- Policy for landlords to insert manual deductions
CREATE POLICY "Landlords can insert security deposit deductions"
ON security_deposit_deductions
FOR INSERT
TO authenticated
WITH CHECK (
  tenant_id IN (
    SELECT ti.id
    FROM tenant_info ti
    INNER JOIN leases l ON l.tenant_info_id = ti.id
    INNER JOIN units u ON u.id = l.unit_id
    INNER JOIN properties p ON p.id = u.property_id
    WHERE p.landlord_id = auth.uid()
  )
);

-- Step 10: Enable RLS on security_deposit_summary view
-- ============================================================================
ALTER VIEW security_deposit_summary SET (security_invoker = true);

-- Step 11: Create function to process security deposit refund
-- ============================================================================
CREATE OR REPLACE FUNCTION process_security_deposit_refund(
  p_tenant_id UUID,
  p_refund_amount DECIMAL(10, 2),
  p_processed_by UUID,
  p_notes TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  v_remaining_balance DECIMAL(10, 2);
  v_result JSON;
BEGIN
  -- Get current remaining balance
  SELECT security_deposit_remaining
  INTO v_remaining_balance
  FROM tenant_info
  WHERE id = p_tenant_id;
  
  -- Validate refund amount
  IF p_refund_amount > v_remaining_balance THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Refund amount cannot exceed remaining balance',
      'remaining_balance', v_remaining_balance
    );
  END IF;
  
  -- Update tenant_info with refund details
  UPDATE tenant_info
  SET 
    security_deposit_refunded = true,
    security_deposit_refund_date = NOW(),
    security_deposit_refund_amount = p_refund_amount,
    security_deposit_remaining = security_deposit_remaining - p_refund_amount
  WHERE id = p_tenant_id;
  
  -- Record the refund as a deduction (negative to show refund)
  INSERT INTO security_deposit_deductions (
    tenant_id,
    deduction_amount,
    deduction_reason,
    remaining_balance,
    deducted_by,
    notes
  ) VALUES (
    p_tenant_id,
    -p_refund_amount, -- Negative to indicate refund
    'Security deposit refund at lease end',
    (SELECT security_deposit_remaining FROM tenant_info WHERE id = p_tenant_id),
    p_processed_by,
    p_notes
  );
  
  -- Return success with details
  SELECT json_build_object(
    'success', true,
    'tenant_id', p_tenant_id,
    'refund_amount', p_refund_amount,
    'remaining_balance', security_deposit_remaining,
    'refund_date', security_deposit_refund_date
  )
  INTO v_result
  FROM tenant_info
  WHERE id = p_tenant_id;
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 12: Create function to manually add deduction
-- ============================================================================
CREATE OR REPLACE FUNCTION add_manual_security_deposit_deduction(
  p_tenant_id UUID,
  p_deduction_amount DECIMAL(10, 2),
  p_reason TEXT,
  p_deducted_by UUID,
  p_notes TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  v_remaining_balance DECIMAL(10, 2);
  v_new_balance DECIMAL(10, 2);
  v_result JSON;
BEGIN
  -- Get current remaining balance
  SELECT security_deposit_remaining
  INTO v_remaining_balance
  FROM tenant_info
  WHERE id = p_tenant_id;
  
  -- Validate deduction amount
  IF p_deduction_amount > v_remaining_balance THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Deduction amount cannot exceed remaining balance',
      'remaining_balance', v_remaining_balance
    );
  END IF;
  
  -- Calculate new balance
  v_new_balance := v_remaining_balance - p_deduction_amount;
  
  -- Update tenant's remaining security deposit
  UPDATE tenant_info
  SET security_deposit_remaining = v_new_balance
  WHERE id = p_tenant_id;
  
  -- Record the deduction in history
  INSERT INTO security_deposit_deductions (
    tenant_id,
    deduction_amount,
    deduction_reason,
    remaining_balance,
    deducted_by,
    notes
  ) VALUES (
    p_tenant_id,
    p_deduction_amount,
    p_reason,
    v_new_balance,
    p_deducted_by,
    p_notes
  );
  
  -- Return success with details
  v_result := json_build_object(
    'success', true,
    'tenant_id', p_tenant_id,
    'deduction_amount', p_deduction_amount,
    'previous_balance', v_remaining_balance,
    'new_balance', v_new_balance
  );
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 13: Update existing tenant_info records with security deposit from leases
-- ============================================================================
UPDATE tenant_info ti
SET 
  security_deposit_amount = l.security_deposit,
  security_deposit_remaining = l.security_deposit
FROM leases l
WHERE l.tenant_info_id = ti.id
  AND l.status = 'active'
  AND ti.security_deposit_amount = 0
  AND l.security_deposit > 0;

-- ============================================================================
-- End of Security Deposit Tracking Migration
-- ============================================================================

-- Verification queries (commented out for production)
-- SELECT * FROM security_deposit_summary;
-- SELECT * FROM security_deposit_deductions ORDER BY created_at DESC;

