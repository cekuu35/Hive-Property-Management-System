-- =====================================================
-- SUBSCRIPTION SYSTEM - PART 2: INDEXES AND RLS POLICIES
-- =====================================================
-- Run this after Part 1 is complete

-- =====================================================
-- CREATE INDEXES FOR PERFORMANCE
-- =====================================================

-- Subscription Plans
CREATE INDEX IF NOT EXISTS idx_subscription_plans_active ON subscription_plans(is_active);
CREATE INDEX IF NOT EXISTS idx_subscription_plans_name ON subscription_plans(name);

-- Landlord Subscriptions
CREATE INDEX IF NOT EXISTS idx_landlord_subscriptions_landlord ON landlord_subscriptions(landlord_id);
CREATE INDEX IF NOT EXISTS idx_landlord_subscriptions_plan ON landlord_subscriptions(plan_id);
CREATE INDEX IF NOT EXISTS idx_landlord_subscriptions_status ON landlord_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_landlord_subscriptions_period ON landlord_subscriptions(current_period_end);

-- Subscription Payments
CREATE INDEX IF NOT EXISTS idx_subscription_payments_subscription ON subscription_payments(subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscription_payments_landlord ON subscription_payments(landlord_id);
CREATE INDEX IF NOT EXISTS idx_subscription_payments_status ON subscription_payments(status);
CREATE INDEX IF NOT EXISTS idx_subscription_payments_date ON subscription_payments(created_at);

-- Subscription Usage
CREATE INDEX IF NOT EXISTS idx_subscription_usage_landlord ON subscription_usage(landlord_id);
CREATE INDEX IF NOT EXISTS idx_subscription_usage_subscription ON subscription_usage(subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscription_usage_metric ON subscription_usage(metric);

-- Discount Codes
CREATE INDEX IF NOT EXISTS idx_discount_codes_code ON discount_codes(code);
CREATE INDEX IF NOT EXISTS idx_discount_codes_active ON discount_codes(is_active);
CREATE INDEX IF NOT EXISTS idx_discount_codes_validity ON discount_codes(valid_from, valid_until);

-- Subscription Discounts
CREATE INDEX IF NOT EXISTS idx_subscription_discounts_subscription ON subscription_discounts(subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscription_discounts_code ON subscription_discounts(discount_code_id);

-- Subscription History
CREATE INDEX IF NOT EXISTS idx_subscription_history_subscription ON subscription_history(subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscription_history_landlord ON subscription_history(landlord_id);
CREATE INDEX IF NOT EXISTS idx_subscription_history_date ON subscription_history(created_at);

-- Billing Adjustments
CREATE INDEX IF NOT EXISTS idx_billing_adjustments_subscription ON billing_adjustments(subscription_id);
CREATE INDEX IF NOT EXISTS idx_billing_adjustments_landlord ON billing_adjustments(landlord_id);

-- Subscription Overrides
CREATE INDEX IF NOT EXISTS idx_subscription_overrides_subscription ON subscription_overrides(subscription_id);

-- Admin Actions
CREATE INDEX IF NOT EXISTS idx_admin_actions_admin ON admin_actions(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_actions_type ON admin_actions(action_type);
CREATE INDEX IF NOT EXISTS idx_admin_actions_target ON admin_actions(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_admin_actions_date ON admin_actions(created_at);

-- =====================================================
-- ENABLE ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE landlord_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE discount_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_discounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_adjustments ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_actions ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- RLS POLICIES
-- =====================================================

-- SUBSCRIPTION PLANS POLICIES
DROP POLICY IF EXISTS "Anyone can view active subscription plans" ON subscription_plans;
CREATE POLICY "Anyone can view active subscription plans"
  ON subscription_plans FOR SELECT
  USING (is_active = true);

DROP POLICY IF EXISTS "Admins can manage subscription plans" ON subscription_plans;
CREATE POLICY "Admins can manage subscription plans"
  ON subscription_plans FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.is_admin = true
    )
  );

-- LANDLORD SUBSCRIPTIONS POLICIES
DROP POLICY IF EXISTS "Landlords can view own subscription" ON landlord_subscriptions;
CREATE POLICY "Landlords can view own subscription"
  ON landlord_subscriptions FOR SELECT
  USING (landlord_id = auth.uid());

DROP POLICY IF EXISTS "Admins can manage all subscriptions" ON landlord_subscriptions;
CREATE POLICY "Admins can manage all subscriptions"
  ON landlord_subscriptions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.is_admin = true
    )
  );

-- SUBSCRIPTION PAYMENTS POLICIES
DROP POLICY IF EXISTS "Landlords can view own payments" ON subscription_payments;
CREATE POLICY "Landlords can view own payments"
  ON subscription_payments FOR SELECT
  USING (landlord_id = auth.uid());

DROP POLICY IF EXISTS "Admins can manage all payments" ON subscription_payments;
CREATE POLICY "Admins can manage all payments"
  ON subscription_payments FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.is_admin = true
    )
  );

-- SUBSCRIPTION USAGE POLICIES
DROP POLICY IF EXISTS "Landlords can view own usage" ON subscription_usage;
CREATE POLICY "Landlords can view own usage"
  ON subscription_usage FOR SELECT
  USING (landlord_id = auth.uid());

DROP POLICY IF EXISTS "Admins can manage all usage" ON subscription_usage;
CREATE POLICY "Admins can manage all usage"
  ON subscription_usage FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.is_admin = true
    )
  );

-- DISCOUNT CODES POLICIES
DROP POLICY IF EXISTS "Admins can manage discount codes" ON discount_codes;
CREATE POLICY "Admins can manage discount codes"
  ON discount_codes FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.is_admin = true
    )
  );

-- SUBSCRIPTION DISCOUNTS POLICIES
DROP POLICY IF EXISTS "Landlords can view own discounts" ON subscription_discounts;
CREATE POLICY "Landlords can view own discounts"
  ON subscription_discounts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM landlord_subscriptions 
      WHERE landlord_subscriptions.id = subscription_discounts.subscription_id 
      AND landlord_subscriptions.landlord_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Admins can manage all discounts" ON subscription_discounts;
CREATE POLICY "Admins can manage all discounts"
  ON subscription_discounts FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.is_admin = true
    )
  );

-- SUBSCRIPTION HISTORY POLICIES
DROP POLICY IF EXISTS "Landlords can view own history" ON subscription_history;
CREATE POLICY "Landlords can view own history"
  ON subscription_history FOR SELECT
  USING (landlord_id = auth.uid());

DROP POLICY IF EXISTS "Admins can manage all history" ON subscription_history;
CREATE POLICY "Admins can manage all history"
  ON subscription_history FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.is_admin = true
    )
  );

-- BILLING ADJUSTMENTS POLICIES
DROP POLICY IF EXISTS "Landlords can view own adjustments" ON billing_adjustments;
CREATE POLICY "Landlords can view own adjustments"
  ON billing_adjustments FOR SELECT
  USING (landlord_id = auth.uid());

DROP POLICY IF EXISTS "Admins can manage all adjustments" ON billing_adjustments;
CREATE POLICY "Admins can manage all adjustments"
  ON billing_adjustments FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.is_admin = true
    )
  );

-- SUBSCRIPTION OVERRIDES POLICIES
DROP POLICY IF EXISTS "Admins can manage overrides" ON subscription_overrides;
CREATE POLICY "Admins can manage overrides"
  ON subscription_overrides FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.is_admin = true
    )
  );

-- ADMIN ACTIONS POLICIES
DROP POLICY IF EXISTS "Admins can view all admin actions" ON admin_actions;
CREATE POLICY "Admins can view all admin actions"
  ON admin_actions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.is_admin = true
    )
  );

DROP POLICY IF EXISTS "Admins can log their own actions" ON admin_actions;
CREATE POLICY "Admins can log their own actions"
  ON admin_actions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.is_admin = true
    )
    AND admin_id = auth.uid()
  );

-- Success message
DO $$ 
BEGIN 
  RAISE NOTICE 'Part 2 Complete: All indexes and RLS policies created successfully!';
  RAISE NOTICE 'Next: Run PART3_insert_data_and_functions.sql';
END $$;
