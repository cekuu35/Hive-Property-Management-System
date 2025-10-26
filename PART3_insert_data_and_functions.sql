-- =====================================================
-- SUBSCRIPTION SYSTEM - PART 3: DEFAULT DATA
-- =====================================================
-- Run this after Part 2 is complete

-- =====================================================
-- INSERT DEFAULT SUBSCRIPTION PLANS
-- =====================================================

-- Free Tier (Trial)
INSERT INTO subscription_plans (
  name,
  display_name,
  description,
  price,
  currency,
  billing_period,
  trial_days,
  features,
  limits,
  is_active,
  sort_order
) VALUES (
  'free',
  'Free Trial',
  'Perfect for trying out Hive Property Management',
  0.00,
  'KES',
  'monthly',
  14,
  '{
    "basic_dashboard": true,
    "tenant_management": true,
    "rent_tracking": true,
    "basic_reports": true,
    "email_support": true
  }',
  '{
    "max_properties": 1,
    "max_units": 5,
    "max_tenants": 5,
    "max_maintenance_requests": 10
  }',
  true,
  1
) ON CONFLICT (name) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  description = EXCLUDED.description,
  price = EXCLUDED.price,
  features = EXCLUDED.features,
  limits = EXCLUDED.limits,
  updated_at = NOW();

-- Starter Plan
INSERT INTO subscription_plans (
  name,
  display_name,
  description,
  price,
  currency,
  billing_period,
  trial_days,
  features,
  limits,
  is_active,
  sort_order
) VALUES (
  'starter',
  'Starter',
  'Great for small landlords managing a few properties',
  2999.00,
  'KES',
  'monthly',
  14,
  '{
    "basic_dashboard": true,
    "tenant_management": true,
    "rent_tracking": true,
    "maintenance_requests": true,
    "payment_processing": true,
    "utility_billing": true,
    "basic_reports": true,
    "email_notifications": true,
    "email_support": true
  }',
  '{
    "max_properties": 2,
    "max_units": 10,
    "max_tenants": 10,
    "max_maintenance_requests": 50
  }',
  true,
  2
) ON CONFLICT (name) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  description = EXCLUDED.description,
  price = EXCLUDED.price,
  features = EXCLUDED.features,
  limits = EXCLUDED.limits,
  updated_at = NOW();

-- Professional Plan
INSERT INTO subscription_plans (
  name,
  display_name,
  description,
  price,
  currency,
  billing_period,
  trial_days,
  features,
  limits,
  is_active,
  sort_order
) VALUES (
  'professional',
  'Professional',
  'Ideal for growing property management businesses',
  5999.00,
  'KES',
  'monthly',
  14,
  '{
    "advanced_dashboard": true,
    "tenant_management": true,
    "rent_tracking": true,
    "maintenance_requests": true,
    "payment_processing": true,
    "utility_billing": true,
    "advanced_reports": true,
    "document_storage": true,
    "bulk_operations": true,
    "sms_notifications": true,
    "email_notifications": true,
    "priority_support": true,
    "custom_branding": true
  }',
  '{
    "max_properties": 5,
    "max_units": 50,
    "max_tenants": 50,
    "max_maintenance_requests": 200,
    "document_storage_gb": 10
  }',
  true,
  3
) ON CONFLICT (name) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  description = EXCLUDED.description,
  price = EXCLUDED.price,
  features = EXCLUDED.features,
  limits = EXCLUDED.limits,
  updated_at = NOW();

-- Enterprise Plan
INSERT INTO subscription_plans (
  name,
  display_name,
  description,
  price,
  currency,
  billing_period,
  trial_days,
  features,
  limits,
  is_active,
  sort_order
) VALUES (
  'enterprise',
  'Enterprise',
  'For large-scale property management operations',
  14999.00,
  'KES',
  'monthly',
  30,
  '{
    "advanced_dashboard": true,
    "tenant_management": true,
    "rent_tracking": true,
    "maintenance_requests": true,
    "payment_processing": true,
    "utility_billing": true,
    "advanced_reports": true,
    "custom_reports": true,
    "document_storage": true,
    "bulk_operations": true,
    "api_access": true,
    "sms_notifications": true,
    "email_notifications": true,
    "dedicated_support": true,
    "custom_branding": true,
    "white_label": true,
    "multi_user": true
  }',
  '{
    "max_properties": -1,
    "max_units": -1,
    "max_tenants": -1,
    "max_maintenance_requests": -1,
    "document_storage_gb": 100,
    "max_staff_users": 10
  }',
  true,
  4
) ON CONFLICT (name) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  description = EXCLUDED.description,
  price = EXCLUDED.price,
  features = EXCLUDED.features,
  limits = EXCLUDED.limits,
  updated_at = NOW();

-- =====================================================
-- CREATE HELPER FUNCTIONS
-- =====================================================

-- Function to check if a landlord has an active subscription
CREATE OR REPLACE FUNCTION check_landlord_subscription(landlord_uuid UUID)
RETURNS TABLE (
  has_active_subscription BOOLEAN,
  subscription_status VARCHAR(20),
  plan_name VARCHAR(100),
  is_trial BOOLEAN,
  days_remaining INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    CASE 
      WHEN ls.status IN ('active', 'trial') THEN true 
      ELSE false 
    END as has_active_subscription,
    ls.status as subscription_status,
    sp.name as plan_name,
    CASE 
      WHEN ls.status = 'trial' THEN true 
      ELSE false 
    END as is_trial,
    CASE 
      WHEN ls.status = 'trial' AND ls.trial_end_date IS NOT NULL THEN 
        EXTRACT(DAY FROM (ls.trial_end_date - NOW()))::INTEGER
      WHEN ls.status = 'active' THEN 
        EXTRACT(DAY FROM (ls.current_period_end - NOW()))::INTEGER
      ELSE 0
    END as days_remaining
  FROM landlord_subscriptions ls
  JOIN subscription_plans sp ON ls.plan_id = sp.id
  WHERE ls.landlord_id = landlord_uuid
  ORDER BY ls.created_at DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if landlord has reached a specific limit
CREATE OR REPLACE FUNCTION check_subscription_limit(
  landlord_uuid UUID,
  limit_key TEXT
)
RETURNS TABLE (
  current_usage INTEGER,
  limit_value INTEGER,
  has_reached_limit BOOLEAN,
  remaining INTEGER
) AS $$
DECLARE
  v_plan_id UUID;
  v_limit_value INTEGER;
  v_current_usage INTEGER;
BEGIN
  -- Get the landlord's current plan and its limits
  SELECT ls.plan_id, (sp.limits->>limit_key)::INTEGER
  INTO v_plan_id, v_limit_value
  FROM landlord_subscriptions ls
  JOIN subscription_plans sp ON ls.plan_id = sp.id
  WHERE ls.landlord_id = landlord_uuid
    AND ls.status IN ('active', 'trial')
  ORDER BY ls.created_at DESC
  LIMIT 1;

  -- If no limit found or limit is -1 (unlimited), return unlimited
  IF v_limit_value IS NULL OR v_limit_value = -1 THEN
    RETURN QUERY SELECT 0, -1, false, -1;
    RETURN;
  END IF;

  -- Get current usage
  SELECT su.current_value
  INTO v_current_usage
  FROM subscription_usage su
  WHERE su.landlord_id = landlord_uuid
    AND su.metric = limit_key
  ORDER BY su.created_at DESC
  LIMIT 1;

  -- If no usage record exists, assume 0
  IF v_current_usage IS NULL THEN
    v_current_usage := 0;
  END IF;

  -- Return the result
  RETURN QUERY SELECT 
    v_current_usage,
    v_limit_value,
    v_current_usage >= v_limit_value,
    GREATEST(0, v_limit_value - v_current_usage);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Success message
DO $$ 
BEGIN 
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Part 3 Complete: Default data inserted!';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Subscription plans created:';
  RAISE NOTICE '  - Free Trial (0 KES/month, 5 units)';
  RAISE NOTICE '  - Starter (2,999 KES/month, 10 units)';
  RAISE NOTICE '  - Professional (5,999 KES/month, 50 units)';
  RAISE NOTICE '  - Enterprise (14,999 KES/month, unlimited)';
  RAISE NOTICE '';
  RAISE NOTICE 'Helper functions created:';
  RAISE NOTICE '  - check_landlord_subscription()';
  RAISE NOTICE '  - check_subscription_limit()';
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'DATABASE SETUP COMPLETE!';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '1. Make yourself an admin using setup-subscription-system.js';
  RAISE NOTICE '2. View SUBSCRIPTION_SETUP_GUIDE.md for details';
END $$;
