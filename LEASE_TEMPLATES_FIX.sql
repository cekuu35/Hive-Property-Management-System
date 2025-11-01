-- Run this SQL in your Supabase Dashboard to fix database access issues
-- Go to: https://supabase.com/dashboard/project/kozhlejudselgtmohdfm/editor
-- This fixes: 1) Lease templates columns, 2) Caretaker/Security access to tenant info

-- Add missing columns to lease_templates if they don't exist
ALTER TABLE public.lease_templates 
ADD COLUMN IF NOT EXISTS header_content TEXT;

ALTER TABLE public.lease_templates 
ADD COLUMN IF NOT EXISTS standard_terms TEXT;

ALTER TABLE public.lease_templates 
ADD COLUMN IF NOT EXISTS additional_terms TEXT;

ALTER TABLE public.lease_templates 
ADD COLUMN IF NOT EXISTS footer_content TEXT;

ALTER TABLE public.lease_templates 
ADD COLUMN IF NOT EXISTS is_default BOOLEAN DEFAULT false;

-- Verify the columns exist
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'lease_templates' 
ORDER BY ordinal_position;

-- ==========================================
-- Fix RLS Policies (Run this too!)
-- ==========================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Landlords can view their own lease templates" ON public.lease_templates;
DROP POLICY IF EXISTS "Landlords can insert their own lease templates" ON public.lease_templates;
DROP POLICY IF EXISTS "Landlords can update their own lease templates" ON public.lease_templates;
DROP POLICY IF EXISTS "Landlords can delete their own lease templates" ON public.lease_templates;
DROP POLICY IF EXISTS "Tenants can view their landlord's lease templates" ON public.lease_templates;

-- Recreate policies
CREATE POLICY "Landlords can view their own lease templates"
  ON public.lease_templates
  FOR SELECT
  USING (landlord_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Landlords can insert their own lease templates"
  ON public.lease_templates
  FOR INSERT
  WITH CHECK (landlord_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Landlords can update their own lease templates"
  ON public.lease_templates
  FOR UPDATE
  USING (landlord_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()))
  WITH CHECK (landlord_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Landlords can delete their own lease templates"
  ON public.lease_templates
  FOR DELETE
  USING (landlord_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Tenants can view their landlord's lease templates"
  ON public.lease_templates
  FOR SELECT
  USING (
    landlord_id IN (
      SELECT p.landlord_id
      FROM public.leases l
      JOIN public.units u ON l.unit_id = u.id
      JOIN public.properties p ON u.property_id = p.id
      JOIN public.tenant_info ti ON l.tenant_info_id = ti.id
      WHERE ti.profile_id IN (
        SELECT id FROM public.profiles WHERE user_id = auth.uid()
      )
      AND l.status IN ('active', 'approved')
    )
  );

-- Verify RLS is enabled
SELECT tablename, policyname 
FROM pg_policies 
WHERE tablename = 'lease_templates';

-- ==========================================
-- Fix Tenant Info Access for Caretakers/Security
-- ==========================================

-- Add RLS policy for caretakers to view tenant_info for their assigned properties
-- This allows them to view tenants who have maintenance requests in properties they're assigned to
CREATE POLICY IF NOT EXISTS "Caretakers can view tenant info for assigned properties"
ON public.tenant_info
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.staff_assignments sa
    JOIN public.profiles p ON sa.staff_id = p.id
    JOIN public.properties pr ON sa.property_id = pr.id
    JOIN public.units u ON u.property_id = pr.id
    JOIN public.maintenance_requests mr ON mr.unit_id = u.id
    WHERE p.user_id = auth.uid()
      AND sa.role = 'caretaker'
      AND sa.is_active = true
      AND tenant_info.profile_id = mr.tenant_id
  )
);

-- Add RLS policy for security to view tenant_info for their assigned properties
-- This allows them to view tenants who have maintenance requests in properties they're assigned to
CREATE POLICY IF NOT EXISTS "Security can view tenant info for assigned properties"
ON public.tenant_info
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.staff_assignments sa
    JOIN public.profiles p ON sa.staff_id = p.id
    JOIN public.properties pr ON sa.property_id = pr.id
    JOIN public.units u ON u.property_id = pr.id
    JOIN public.maintenance_requests mr ON mr.unit_id = u.id
    WHERE p.user_id = auth.uid()
      AND sa.role = 'security'
      AND sa.is_active = true
      AND tenant_info.profile_id = mr.tenant_id
  )
);

-- Verify the new policies exist
SELECT tablename, policyname 
FROM pg_policies 
WHERE tablename = 'tenant_info' 
AND (policyname LIKE '%Caretakers%' OR policyname LIKE '%Security%');

-- ==========================================
-- Add Indexes for Performance (Critical for rent_payments queries)
-- ==========================================

-- Add composite index for rent_payments queries (lease_id + due_date)
CREATE INDEX IF NOT EXISTS idx_rent_payments_lease_id_due_date 
ON public.rent_payments(lease_id, due_date);

-- Add index for status lookups
CREATE INDEX IF NOT EXISTS idx_rent_payments_status 
ON public.rent_payments(status) 
WHERE status IN ('pending', 'overdue');

-- Add index for paid_date queries
CREATE INDEX IF NOT EXISTS idx_rent_payments_paid_date 
ON public.rent_payments(paid_date) 
WHERE paid_date IS NOT NULL;

-- Verify indexes were created
SELECT 
  tablename, 
  indexname,
  indexdef
FROM pg_indexes 
WHERE tablename = 'rent_payments' 
ORDER BY indexname;
