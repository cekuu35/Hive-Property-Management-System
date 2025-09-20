import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface ApprovedLease {
  id: string;
  unit_id: string;
  start_date: string;
  end_date: string;
  rent_amount: number;
  deposit_amount: number;
  status: string;
  tenant_id: string;
  tenant_info_id: string | null;
  lease_document_url: string | null;
  created_at: string;
  updated_at: string;
  units: {
    unit_number: string;
    type: string;
    properties: {
      id: string;
      name: string;
      address: string;
      landlord_id: string;
    };
  } | null;
}

export const useApprovedLease = () => {
  const [approvedLease, setApprovedLease] = useState<ApprovedLease | null>(null);
  const [loading, setLoading] = useState(true);
  const { profile } = useAuth();

  const fetchApprovedLease = async () => {
    if (!profile?.id) return;

    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('leases')
        .select(`
          *,
          units (
            unit_number,
            type,
            properties (
              id,
              name,
              address,
              landlord_id
            )
          )
        `)
        .eq('tenant_id', profile.id)
        .eq('status', 'active')
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 is "not found"
        throw error;
      }

      setApprovedLease(data as ApprovedLease);
    } catch (error) {
      console.error('Error fetching approved lease:', error);
      setApprovedLease(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApprovedLease();
  }, [profile?.id]);

  return {
    approvedLease,
    loading,
    refetch: fetchApprovedLease,
    hasApprovedLease: !!approvedLease,
  };
};