-- ============================================================================
-- Fix Maintenance Contractor Assignment
-- ============================================================================
-- This migration properly connects contractors to maintenance requests
-- and updates the cost tracking for security deposit deductions
-- ============================================================================

-- Step 1: Add contractor assignment field to maintenance_requests
-- ============================================================================
ALTER TABLE maintenance_requests
ADD COLUMN IF NOT EXISTS assigned_contractor_id UUID REFERENCES contractors(id) ON DELETE SET NULL;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_maintenance_requests_assigned_contractor 
ON maintenance_requests(assigned_contractor_id);

-- Step 2: Update the status check constraint to include proper workflow
-- ============================================================================
ALTER TABLE maintenance_requests DROP CONSTRAINT IF EXISTS maintenance_requests_status_check;

ALTER TABLE maintenance_requests
ADD CONSTRAINT maintenance_requests_status_check 
CHECK (status IN ('pending', 'assigned', 'in-progress', 'on-hold', 'completed', 'cancelled'));

-- Step 3: Create function to update status when contractor is assigned
-- ============================================================================
CREATE OR REPLACE FUNCTION update_maintenance_status_on_assignment()
RETURNS TRIGGER AS $$
BEGIN
  -- When contractor is assigned, update status to 'assigned' if it was 'pending'
  IF NEW.assigned_contractor_id IS NOT NULL 
     AND OLD.assigned_contractor_id IS NULL 
     AND NEW.status = 'pending' THEN
    NEW.status := 'assigned';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 4: Create trigger for status update
-- ============================================================================
DROP TRIGGER IF EXISTS trigger_update_maintenance_status_on_assignment ON maintenance_requests;

CREATE TRIGGER trigger_update_maintenance_status_on_assignment
BEFORE UPDATE ON maintenance_requests
FOR EACH ROW
EXECUTE FUNCTION update_maintenance_status_on_assignment();

-- Step 5: Update security deposit deduction to use maintenance_cost or actual_cost
-- ============================================================================
CREATE OR REPLACE FUNCTION deduct_from_security_deposit()
RETURNS TRIGGER AS $$
DECLARE
  v_tenant_id UUID;
  v_remaining_balance DECIMAL(10, 2);
  v_deduction_amount DECIMAL(10, 2);
  v_cost_to_deduct DECIMAL(10, 2);
BEGIN
  -- Only process if status changed to 'completed' and cost is greater than 0
  IF NEW.status = 'completed' 
     AND OLD.status != 'completed' 
     AND NOT COALESCE(NEW.cost_deducted_from_deposit, false) THEN
    
    -- Use maintenance_cost if set, otherwise use actual_cost
    v_cost_to_deduct := COALESCE(NEW.maintenance_cost, NEW.actual_cost, 0);
    
    IF v_cost_to_deduct > 0 THEN
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
        v_deduction_amount := LEAST(v_cost_to_deduct, v_remaining_balance);
        
        -- Update tenant's remaining security deposit
        UPDATE tenant_info
        SET security_deposit_remaining = security_deposit_remaining - v_deduction_amount
        WHERE id = v_tenant_id;
        
        -- Update maintenance_cost if it wasn't set
        IF NEW.maintenance_cost IS NULL OR NEW.maintenance_cost = 0 THEN
          NEW.maintenance_cost := v_cost_to_deduct;
        END IF;
        
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
          v_deduction_amount,
          v_tenant_id,
          (SELECT security_deposit_remaining FROM tenant_info WHERE id = v_tenant_id);
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 6: Create view for maintenance assignments with contractor details
-- ============================================================================
CREATE OR REPLACE VIEW maintenance_with_contractor AS
SELECT 
  mr.*,
  c.name as contractor_name,
  c.specialty as contractor_specialty,
  c.phone as contractor_phone,
  c.email as contractor_email,
  c.hourly_rate as contractor_hourly_rate,
  u.unit_number,
  u.property_id,
  p.name as property_name,
  ti.first_name || ' ' || ti.last_name as tenant_name,
  ti.email as tenant_email
FROM maintenance_requests mr
LEFT JOIN contractors c ON mr.assigned_contractor_id = c.id
LEFT JOIN units u ON mr.unit_id = u.id
LEFT JOIN properties p ON u.property_id = p.id
LEFT JOIN tenant_info ti ON mr.tenant_id = ti.auth_user_id;

-- Enable RLS on the view
ALTER VIEW maintenance_with_contractor OWNER TO postgres;

-- Grant permissions
GRANT SELECT ON maintenance_with_contractor TO authenticated;

-- Step 7: Create RLS policy for the view
-- ============================================================================
-- Note: Views inherit RLS from base tables, but we ensure proper access

-- Step 8: Add comments for documentation
-- ============================================================================
COMMENT ON COLUMN maintenance_requests.assigned_contractor_id IS 'Reference to contractors table for third-party maintenance workers';
COMMENT ON COLUMN maintenance_requests.assigned_to IS 'Reference to profiles table for staff/landlord assignments (optional)';
COMMENT ON COLUMN maintenance_requests.maintenance_cost IS 'Final cost of maintenance (deducted from security deposit if applicable)';
COMMENT ON COLUMN maintenance_requests.actual_cost IS 'Actual cost of materials/labor';

