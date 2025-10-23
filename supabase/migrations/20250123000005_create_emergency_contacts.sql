-- =====================================================
-- EMERGENCY CONTACTS TABLE
-- =====================================================
-- This migration creates a table for landlords to manage
-- emergency contacts for their properties. These contacts
-- will be displayed to tenants in their maintenance section.
-- =====================================================

-- Create emergency_contacts table
CREATE TABLE IF NOT EXISTS emergency_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  landlord_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  contact_type VARCHAR(50) NOT NULL CHECK (contact_type IN ('maintenance', 'security', 'plumbing', 'electrical', 'hvac', 'general')),
  contact_name VARCHAR(255) NOT NULL,
  contact_phone VARCHAR(50) NOT NULL,
  contact_email VARCHAR(255),
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  is_24_7 BOOLEAN DEFAULT false,
  available_hours VARCHAR(100),
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_emergency_contacts_property 
  ON emergency_contacts(property_id);
CREATE INDEX IF NOT EXISTS idx_emergency_contacts_landlord 
  ON emergency_contacts(landlord_id);
CREATE INDEX IF NOT EXISTS idx_emergency_contacts_type 
  ON emergency_contacts(contact_type);
CREATE INDEX IF NOT EXISTS idx_emergency_contacts_active 
  ON emergency_contacts(is_active) WHERE is_active = true;

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_emergency_contacts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_emergency_contacts_updated_at
  BEFORE UPDATE ON emergency_contacts
  FOR EACH ROW
  EXECUTE FUNCTION update_emergency_contacts_updated_at();

-- RLS Policies
ALTER TABLE emergency_contacts ENABLE ROW LEVEL SECURITY;

-- Landlords can manage their own property emergency contacts
CREATE POLICY "Landlords can view their emergency contacts"
  ON emergency_contacts
  FOR SELECT
  USING (
    auth.uid() IN (
      SELECT user_id FROM profiles WHERE id = landlord_id
    )
  );

CREATE POLICY "Landlords can create emergency contacts for their properties"
  ON emergency_contacts
  FOR INSERT
  WITH CHECK (
    auth.uid() IN (
      SELECT user_id FROM profiles WHERE id = landlord_id
    )
    AND
    property_id IN (
      SELECT id FROM properties WHERE landlord_id = emergency_contacts.landlord_id
    )
  );

CREATE POLICY "Landlords can update their emergency contacts"
  ON emergency_contacts
  FOR UPDATE
  USING (
    auth.uid() IN (
      SELECT user_id FROM profiles WHERE id = landlord_id
    )
  );

CREATE POLICY "Landlords can delete their emergency contacts"
  ON emergency_contacts
  FOR DELETE
  USING (
    auth.uid() IN (
      SELECT user_id FROM profiles WHERE id = landlord_id
    )
  );

-- Tenants can view emergency contacts for their property
CREATE POLICY "Tenants can view emergency contacts for their property"
  ON emergency_contacts
  FOR SELECT
  USING (
    is_active = true
    AND
    property_id IN (
      SELECT u.property_id
      FROM leases l
      JOIN units u ON l.unit_id = u.id
      WHERE l.tenant_id IN (
        SELECT id FROM profiles WHERE user_id = auth.uid()
      )
      AND l.status = 'active'
    )
  );

-- Service role has full access
CREATE POLICY "Service role can manage all emergency contacts"
  ON emergency_contacts
  FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

-- Grant permissions
GRANT SELECT ON emergency_contacts TO authenticated;
GRANT INSERT, UPDATE, DELETE ON emergency_contacts TO authenticated;

-- Add comments
COMMENT ON TABLE emergency_contacts IS 'Stores emergency contact information for properties';
COMMENT ON COLUMN emergency_contacts.contact_type IS 'Type of emergency contact (maintenance, security, etc.)';
COMMENT ON COLUMN emergency_contacts.is_24_7 IS 'Whether the contact is available 24/7';
COMMENT ON COLUMN emergency_contacts.available_hours IS 'Available hours if not 24/7 (e.g., "8:00 AM - 5:00 PM")';
COMMENT ON COLUMN emergency_contacts.display_order IS 'Order in which contacts should be displayed';

