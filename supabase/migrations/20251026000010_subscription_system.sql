-- =====================================================
-- SUBSCRIPTION SYSTEM - COMPLETE DATABASE SETUP
-- =====================================================
-- This migration creates the complete subscription system
-- for landlord subscription management
-- =====================================================

-- =====================================================
-- 1. SUBSCRIPTION PLANS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS subscription_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(50) UNIQUE NOT NULL,
  display_name VARCHAR(100) NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL DEFAULT 0,
  currency VARCHAR(3) DEFAULT 'KES',
  billing_period VARCHAR(20) NOT NULL DEFAULT 'monthly', -- 'monthly', 'yearly'
  trial_days INTEGER DEFAULT 0,
  features JSONB NOT NULL DEFAULT '{}',
  limits JSONB NOT NULL DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 2. LANDLORD SUBSCRIPTIONS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS landlord_subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  landlord_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES subscription_plans(id),
  status VARCHAR(20) NOT NULL DEFAULT 'trial', -- 'trial', 'active', 'past_due', 'cancelled', 'expired'
  trial_start_date TIMESTAMPTZ,
  trial_end_date TIMESTAMPTZ,
  current_period_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  current_period_end TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '30 days',
  cancel_at_period_end BOOLEAN DEFAULT false,
  cancelled_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 3. SUBSCRIPTION PAYMENTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS subscription_payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  subscription_id UUID NOT NULL REFERENCES landlord_subscriptions(id) ON DELETE CASCADE,
  landlord_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'KES',
  status VARCHAR(20) NOT NULL DEFAULT 'pending', -- 'pending', 'completed', 'failed', 'refunded'
  payment_method VARCHAR(50), -- 'mpesa', 'card', 'bank_transfer', 'manual'
  transaction_reference VARCHAR(255),
  paid_at TIMESTAMPTZ,
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 4. SUBSCRIPTION USAGE TRACKING
-- =====================================================
CREATE TABLE IF NOT EXISTS subscription_usage (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  landlord_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES landlord_subscriptions(id) ON DELETE CASCADE,
  metric VARCHAR(50) NOT NULL, -- 'properties', 'units', 'tenants', 'storage_mb', 'api_calls'
  current_value INTEGER NOT NULL DEFAULT 0,
  limit_value INTEGER, -- NULL or -1 for unlimited
  period_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  period_end TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '30 days',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT unique_usage_period UNIQUE (landlord_id, metric, period_start)
);

-- =====================================================
-- 5. DISCOUNT CODES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS discount_codes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code VARCHAR(50) UNIQUE NOT NULL,
  type VARCHAR(20) NOT NULL, -- 'percentage', 'fixed_amount'
  value DECIMAL(10,2) NOT NULL,
  duration VARCHAR(20) NOT NULL DEFAULT 'once', -- 'once', 'forever', 'repeating'
  duration_in_months INTEGER,
  max_redemptions INTEGER,
  current_redemptions INTEGER DEFAULT 0,
  valid_from TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  valid_until TIMESTAMPTZ,
  applicable_plans JSONB, -- Array of plan IDs or names
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 6. SUBSCRIPTION DISCOUNTS (Applied)
-- =====================================================
CREATE TABLE IF NOT EXISTS subscription_discounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  subscription_id UUID NOT NULL REFERENCES landlord_subscriptions(id) ON DELETE CASCADE,
  discount_code_id UUID REFERENCES discount_codes(id),
  type VARCHAR(20) NOT NULL,
  value DECIMAL(10,2) NOT NULL,
  start_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  end_date TIMESTAMPTZ,
  applied_by UUID REFERENCES profiles(id), -- Admin who applied it
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 7. SUBSCRIPTION HISTORY (Audit Trail)
-- =====================================================
CREATE TABLE IF NOT EXISTS subscription_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  subscription_id UUID NOT NULL REFERENCES landlord_subscriptions(id) ON DELETE CASCADE,
  landlord_id UUID NOT NULL REFERENCES profiles(id),
  action VARCHAR(50) NOT NULL, -- 'created', 'upgraded', 'downgraded', 'cancelled', 'renewed', 'trial_extended', 'suspended', 'reactivated'
  old_plan_id UUID REFERENCES subscription_plans(id),
  new_plan_id UUID REFERENCES subscription_plans(id),
  old_status VARCHAR(20),
  new_status VARCHAR(20),
  performed_by UUID REFERENCES profiles(id), -- NULL for system actions
  notes TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 8. BILLING ADJUSTMENTS
-- =====================================================
CREATE TABLE IF NOT EXISTS billing_adjustments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  subscription_id UUID NOT NULL REFERENCES landlord_subscriptions(id) ON DELETE CASCADE,
  landlord_id UUID NOT NULL REFERENCES profiles(id),
  type VARCHAR(50) NOT NULL, -- 'credit', 'debit', 'refund', 'discount', 'waiver'
  amount DECIMAL(10,2) NOT NULL,
  description TEXT NOT NULL,
  applied_to_payment_id UUID REFERENCES subscription_payments(id),
  applied_by UUID NOT NULL REFERENCES profiles(id), -- Admin
  approved_by UUID REFERENCES profiles(id),
  status VARCHAR(20) DEFAULT 'approved', -- 'pending', 'approved', 'rejected'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 9. SUBSCRIPTION OVERRIDES (Custom limits/features)
-- =====================================================
CREATE TABLE IF NOT EXISTS subscription_overrides (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  subscription_id UUID NOT NULL REFERENCES landlord_subscriptions(id) ON DELETE CASCADE,
  override_type VARCHAR(50) NOT NULL, -- 'limit', 'feature', 'price', 'trial'
  override_key VARCHAR(100) NOT NULL,
  override_value JSONB NOT NULL,
  reason TEXT,
  valid_until TIMESTAMPTZ,
  applied_by UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 10. ADMIN ACTIONS LOG
-- =====================================================
CREATE TABLE IF NOT EXISTS admin_actions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  admin_id UUID NOT NULL REFERENCES profiles(id),
  action_type VARCHAR(100) NOT NULL,
  target_type VARCHAR(50), -- 'subscription', 'plan', 'payment', 'landlord', 'discount'
  target_id UUID,
  old_value JSONB,
  new_value JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_subscription_plans_name ON subscription_plans(name);
CREATE INDEX IF NOT EXISTS idx_subscription_plans_active ON subscription_plans(is_active);

CREATE INDEX IF NOT EXISTS idx_landlord_subscriptions_landlord ON landlord_subscriptions(landlord_id);
CREATE INDEX IF NOT EXISTS idx_landlord_subscriptions_plan ON landlord_subscriptions(plan_id);
CREATE INDEX IF NOT EXISTS idx_landlord_subscriptions_status ON landlord_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_landlord_subscriptions_period_end ON landlord_subscriptions(current_period_end);

CREATE INDEX IF NOT EXISTS idx_subscription_payments_subscription ON subscription_payments(subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscription_payments_landlord ON subscription_payments(landlord_id);
CREATE INDEX IF NOT EXISTS idx_subscription_payments_status ON subscription_payments(status);
CREATE INDEX IF NOT EXISTS idx_subscription_payments_created ON subscription_payments(created_at);

CREATE INDEX IF NOT EXISTS idx_subscription_usage_landlord ON subscription_usage(landlord_id);
CREATE INDEX IF NOT EXISTS idx_subscription_usage_metric ON subscription_usage(metric);

CREATE INDEX IF NOT EXISTS idx_discount_codes_code ON discount_codes(code);
CREATE INDEX IF NOT EXISTS idx_discount_codes_active ON discount_codes(is_active);

CREATE INDEX IF NOT EXISTS idx_subscription_discounts_subscription ON subscription_discounts(subscription_id);

CREATE INDEX IF NOT EXISTS idx_subscription_history_subscription ON subscription_history(subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscription_history_landlord ON subscription_history(landlord_id);

CREATE INDEX IF NOT EXISTS idx_billing_adjustments_subscription ON billing_adjustments(subscription_id);
CREATE INDEX IF NOT EXISTS idx_billing_adjustments_landlord ON billing_adjustments(landlord_id);

CREATE INDEX IF NOT EXISTS idx_subscription_overrides_subscription ON subscription_overrides(subscription_id);

CREATE INDEX IF NOT EXISTS idx_admin_actions_admin ON admin_actions(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_actions_target ON admin_actions(target_type, target_id);

-- =====================================================
-- ADD ADMIN ROLE TO PROFILES
-- =====================================================
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false;

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
-- RLS POLICIES: SUBSCRIPTION PLANS
-- =====================================================
DROP POLICY IF EXISTS "Anyone can view active plans" ON subscription_plans;
CREATE POLICY "Anyone can view active plans" ON subscription_plans
  FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "Admins can manage plans" ON subscription_plans;
CREATE POLICY "Admins can manage plans" ON subscription_plans
  FOR ALL 
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

-- =====================================================
-- RLS POLICIES: LANDLORD SUBSCRIPTIONS
-- =====================================================
DROP POLICY IF EXISTS "Landlords can view their own subscriptions" ON landlord_subscriptions;
CREATE POLICY "Landlords can view their own subscriptions" ON landlord_subscriptions
  FOR SELECT USING (auth.uid() = landlord_id);

DROP POLICY IF EXISTS "Admins can manage all subscriptions" ON landlord_subscriptions;
CREATE POLICY "Admins can manage all subscriptions" ON landlord_subscriptions
  FOR ALL 
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

DROP POLICY IF EXISTS "Service role can manage subscriptions" ON landlord_subscriptions;
CREATE POLICY "Service role can manage subscriptions" ON landlord_subscriptions
  FOR ALL 
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- =====================================================
-- RLS POLICIES: SUBSCRIPTION PAYMENTS
-- =====================================================
DROP POLICY IF EXISTS "Landlords can view their own payments" ON subscription_payments;
CREATE POLICY "Landlords can view their own payments" ON subscription_payments
  FOR SELECT USING (auth.uid() = landlord_id);

DROP POLICY IF EXISTS "Admins can manage all payments" ON subscription_payments;
CREATE POLICY "Admins can manage all payments" ON subscription_payments
  FOR ALL 
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

DROP POLICY IF EXISTS "Service role can manage payments" ON subscription_payments;
CREATE POLICY "Service role can manage payments" ON subscription_payments
  FOR ALL 
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- =====================================================
-- RLS POLICIES: SUBSCRIPTION USAGE
-- =====================================================
DROP POLICY IF EXISTS "Landlords can view their own usage" ON subscription_usage;
CREATE POLICY "Landlords can view their own usage" ON subscription_usage
  FOR SELECT USING (auth.uid() = landlord_id);

DROP POLICY IF EXISTS "Admins can view all usage" ON subscription_usage;
CREATE POLICY "Admins can view all usage" ON subscription_usage
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.is_admin = true
    )
  );

DROP POLICY IF EXISTS "Service role can manage usage" ON subscription_usage;
CREATE POLICY "Service role can manage usage" ON subscription_usage
  FOR ALL 
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- =====================================================
-- RLS POLICIES: DISCOUNT CODES
-- =====================================================
DROP POLICY IF EXISTS "Admins can manage discount codes" ON discount_codes;
CREATE POLICY "Admins can manage discount codes" ON discount_codes
  FOR ALL 
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

-- =====================================================
-- RLS POLICIES: SUBSCRIPTION DISCOUNTS
-- =====================================================
DROP POLICY IF EXISTS "Landlords can view their discounts" ON subscription_discounts;
CREATE POLICY "Landlords can view their discounts" ON subscription_discounts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM landlord_subscriptions 
      WHERE landlord_subscriptions.id = subscription_id 
      AND landlord_subscriptions.landlord_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Admins can manage discounts" ON subscription_discounts;
CREATE POLICY "Admins can manage discounts" ON subscription_discounts
  FOR ALL 
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

-- =====================================================
-- RLS POLICIES: SUBSCRIPTION HISTORY
-- =====================================================
DROP POLICY IF EXISTS "Landlords can view their history" ON subscription_history;
CREATE POLICY "Landlords can view their history" ON subscription_history
  FOR SELECT USING (auth.uid() = landlord_id);

DROP POLICY IF EXISTS "Admins can view all history" ON subscription_history;
CREATE POLICY "Admins can view all history" ON subscription_history
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.is_admin = true
    )
  );

DROP POLICY IF EXISTS "Service role can manage history" ON subscription_history;
CREATE POLICY "Service role can manage history" ON subscription_history
  FOR ALL 
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- =====================================================
-- RLS POLICIES: BILLING ADJUSTMENTS
-- =====================================================
DROP POLICY IF EXISTS "Admins can manage billing adjustments" ON billing_adjustments;
CREATE POLICY "Admins can manage billing adjustments" ON billing_adjustments
  FOR ALL 
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

-- =====================================================
-- RLS POLICIES: SUBSCRIPTION OVERRIDES
-- =====================================================
DROP POLICY IF EXISTS "Admins can manage overrides" ON subscription_overrides;
CREATE POLICY "Admins can manage overrides" ON subscription_overrides
  FOR ALL 
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

-- =====================================================
-- RLS POLICIES: ADMIN ACTIONS
-- =====================================================
DROP POLICY IF EXISTS "Admins can view admin actions" ON admin_actions;
CREATE POLICY "Admins can view admin actions" ON admin_actions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.is_admin = true
    )
  );

DROP POLICY IF EXISTS "Service role can log admin actions" ON admin_actions;
CREATE POLICY "Service role can log admin actions" ON admin_actions
  FOR INSERT WITH CHECK (auth.role() = 'service_role');

-- =====================================================
-- INSERT DEFAULT SUBSCRIPTION PLANS
-- =====================================================
INSERT INTO subscription_plans (name, display_name, description, price, billing_period, trial_days, features, limits, sort_order) VALUES
(
  'trial',
  'Free Trial',
  'Try all features free for 14 days - Perfect for testing the platform',
  0,
  'monthly',
  14,
  '{
    "payment_processing": true,
    "maintenance_tracking": true,
    "basic_reports": true,
    "advanced_analytics": false,
    "multi_currency": false,
    "api_access": false,
    "priority_support": false
  }'::jsonb,
  '{
    "properties": 1,
    "units": 5,
    "tenants": 5
  }'::jsonb,
  1
),
(
  'basic',
  'Basic Plan',
  'Perfect for individual landlords managing a few properties',
  2999,
  'monthly',
  0,
  '{
    "payment_processing": true,
    "maintenance_tracking": true,
    "basic_reports": true,
    "advanced_analytics": false,
    "multi_currency": false,
    "api_access": false,
    "priority_support": false
  }'::jsonb,
  '{
    "properties": 3,
    "units": 20,
    "tenants": 20
  }'::jsonb,
  2
),
(
  'professional',
  'Professional Plan',
  'For growing property managers and small agencies',
  5999,
  'monthly',
  0,
  '{
    "payment_processing": true,
    "maintenance_tracking": true,
    "basic_reports": true,
    "advanced_analytics": true,
    "multi_currency": true,
    "api_access": false,
    "priority_support": true
  }'::jsonb,
  '{
    "properties": 10,
    "units": 100,
    "tenants": 100
  }'::jsonb,
  3
),
(
  'enterprise',
  'Enterprise Plan',
  'For large property management companies and agencies',
  12999,
  'monthly',
  0,
  '{
    "payment_processing": true,
    "maintenance_tracking": true,
    "basic_reports": true,
    "advanced_analytics": true,
    "multi_currency": true,
    "api_access": true,
    "priority_support": true,
    "white_label": true,
    "dedicated_manager": true
  }'::jsonb,
  '{
    "properties": -1,
    "units": -1,
    "tenants": -1
  }'::jsonb,
  4
)
ON CONFLICT (name) DO NOTHING;

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Function to make a user an admin
CREATE OR REPLACE FUNCTION make_user_admin(user_email TEXT)
RETURNS VOID AS $$
BEGIN
  UPDATE profiles 
  SET is_admin = true 
  WHERE email = user_email;
  
  RAISE NOTICE 'User % is now an admin', user_email;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to log subscription history
CREATE OR REPLACE FUNCTION log_subscription_change()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO subscription_history (
    subscription_id,
    landlord_id,
    action,
    old_plan_id,
    new_plan_id,
    old_status,
    new_status,
    performed_by,
    metadata
  ) VALUES (
    NEW.id,
    NEW.landlord_id,
    CASE 
      WHEN TG_OP = 'INSERT' THEN 'created'
      WHEN OLD.plan_id != NEW.plan_id THEN 'plan_changed'
      WHEN OLD.status != NEW.status THEN 'status_changed'
      ELSE 'updated'
    END,
    OLD.plan_id,
    NEW.plan_id,
    OLD.status,
    NEW.status,
    auth.uid(),
    jsonb_build_object(
      'operation', TG_OP,
      'table', TG_TABLE_NAME
    )
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for logging subscription changes
DROP TRIGGER IF EXISTS trigger_log_subscription_changes ON landlord_subscriptions;
CREATE TRIGGER trigger_log_subscription_changes
AFTER INSERT OR UPDATE ON landlord_subscriptions
FOR EACH ROW EXECUTE FUNCTION log_subscription_change();

-- =====================================================
-- COMMENTS FOR DOCUMENTATION
-- =====================================================
COMMENT ON TABLE subscription_plans IS 'Subscription plan definitions with pricing and limits';
COMMENT ON TABLE landlord_subscriptions IS 'Active subscriptions for landlords';
COMMENT ON TABLE subscription_payments IS 'Payment history for subscriptions';
COMMENT ON TABLE subscription_usage IS 'Track resource usage per landlord';
COMMENT ON TABLE discount_codes IS 'Discount/promo codes for subscriptions';
COMMENT ON TABLE subscription_discounts IS 'Applied discounts on subscriptions';
COMMENT ON TABLE subscription_history IS 'Audit trail of all subscription changes';
COMMENT ON TABLE billing_adjustments IS 'Manual billing adjustments (credits, refunds, etc)';
COMMENT ON TABLE subscription_overrides IS 'Custom overrides for specific subscriptions';
COMMENT ON TABLE admin_actions IS 'Log of all administrative actions';

