import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface EmergencyContact {
  id: string;
  property_id: string;
  contact_type: 'maintenance' | 'security' | 'plumbing' | 'electrical' | 'hvac' | 'general';
  contact_name: string;
  contact_phone: string;
  contact_email?: string;
  description?: string;
  is_active: boolean;
  is_24_7: boolean;
  available_hours?: string;
  display_order: number;
}

export const useEmergencyContacts = () => {
  const { profile } = useAuth();
  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEmergencyContacts = useCallback(async () => {
    if (!profile?.id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // First, get the tenant's active lease and property
      const { data: leaseData, error: leaseError } = await supabase
        .from('leases')
        .select(`
          id,
          unit_id,
          units (
            id,
            property_id
          )
        `)
        .eq('tenant_id', profile.id)
        .eq('status', 'active')
        .maybeSingle();

      if (leaseError) {
        console.error('Error fetching lease:', leaseError);
        setContacts([]);
        setLoading(false);
        return;
      }

      if (!leaseData?.units?.property_id) {
        console.log('No active lease or property found');
        setContacts([]);
        setLoading(false);
        return;
      }

      // Then fetch emergency contacts for that property
      const { data: contactsData, error: contactsError } = await supabase
        .from('emergency_contacts')
        .select('*')
        .eq('property_id', leaseData.units.property_id)
        .eq('is_active', true)
        .order('display_order');

      if (contactsError) {
        throw contactsError;
      }

      setContacts(contactsData || []);
    } catch (err: any) {
      console.error('Error fetching emergency contacts:', err);
      setError(err.message);
      setContacts([]);
    } finally {
      setLoading(false);
    }
  }, [profile?.id]);

  useEffect(() => {
    fetchEmergencyContacts();
  }, [fetchEmergencyContacts]);

  return {
    contacts,
    loading,
    error,
    refetch: fetchEmergencyContacts,
  };
};

