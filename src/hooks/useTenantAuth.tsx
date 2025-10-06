import { useState, useEffect } from 'react';
import { useAuth } from './useAuth';
import { TenantCreationService } from '@/services/tenantCreationService';

export interface TenantData {
  tenant_id: string;
  landlord_id: string;
  tenant_info_id: string;
  unit_id: string;
  rent_amount: number;
  security_deposit: number;
  status: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  unit_number: string;
  property_name: string;
}

export const useTenantAuth = () => {
  const { user, profile } = useAuth();
  const [tenantData, setTenantData] = useState<TenantData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTenantData = async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const tenant = await TenantCreationService.getTenantByAuthUser(user.id);
      
      if (tenant) {
        setTenantData(tenant);
      } else {
        setError('No tenant record found for this user');
      }
    } catch (err) {
      console.error('Error fetching tenant data:', err);
      setError('Failed to load tenant information');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTenantData();
  }, [user?.id]);

  const isTenant = !!tenantData;
  const isLandlord = profile?.role === 'landlord';
  const isCaretaker = profile?.role === 'caretaker';
  const isSecurity = profile?.role === 'security';

  return {
    tenantData,
    loading,
    error,
    isTenant,
    isLandlord,
    isCaretaker,
    isSecurity,
    refetch: fetchTenantData
  };
};
