import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from '@/hooks/use-toast';

export interface Tenant {
  id: string;
  profile_id: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  unit_id: string;
  unit_number: string;
  property_name: string;
  lease_start: string;
  lease_end: string;
  rent_amount: number;
  deposit_amount: number;
  lease_status: string;
  lease_id: string;
  email?: string;
}

export interface CreateTenantData {
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  unit_id: string;
  lease_start: string;
  lease_end: string;
  rent_amount: number;
  deposit_amount: number;
}

export const useTenants = () => {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const fetchTenants = async () => {
    if (!user) return;

    try {
      setLoading(true);
      
      // Get current user's profile ID
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();
      
      if (!profile) {
        throw new Error('Profile not found');
      }
      
      // Get tenants through leases joined with tenant_info, units, and properties
      // Filter by landlord's properties
      const { data, error } = await supabase
        .from('leases')
        .select(`
          id,
          start_date,
          end_date,
          rent_amount,
          deposit_amount,
          status,
          tenant_info_id,
          unit_id,
          tenant_info!leases_tenant_info_id_fkey (
            id,
            first_name,
            last_name,
            email,
            phone,
            avatar_url
          ),
          units!leases_unit_id_fkey (
            unit_number,
            property_id,
            properties!units_property_id_fkey (
              name,
              landlord_id
            )
          )
        `)
        .eq('units.properties.landlord_id', profile.id);

      if (error) throw error;

      // Transform the data to match our Tenant interface
      const transformedTenants: Tenant[] = (data || []).map((lease: any) => ({
        id: lease.tenant_info?.id || lease.tenant_info_id,
        profile_id: lease.tenant_info?.id || lease.tenant_info_id,
        first_name: lease.tenant_info?.first_name,
        last_name: lease.tenant_info?.last_name,
        phone: lease.tenant_info?.phone,
        avatar_url: lease.tenant_info?.avatar_url,
        email: lease.tenant_info?.email,
        unit_id: lease.unit_id,
        unit_number: lease.units?.unit_number || '',
        property_name: lease.units?.properties?.name || '',
        lease_start: lease.start_date,
        lease_end: lease.end_date,
        rent_amount: lease.rent_amount,
        deposit_amount: lease.deposit_amount,
        lease_status: lease.status,
        lease_id: lease.id
      }));

      setTenants(transformedTenants);
    } catch (error: any) {
      console.error('Error fetching tenants:', error);
      toast({
        title: "Error",
        description: "Failed to fetch tenants. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const createTenant = async (tenantData: CreateTenantData): Promise<boolean> => {
    if (!user) return false;

    try {
      // Get the current authenticated user's profile ID
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) throw new Error('Not authenticated');
      
      const { data: myProfile, error: myProfileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', authUser.id)
        .single();
        
      if (myProfileError || !myProfile) {
        throw new Error('Your profile was not found. Please contact support.');
      }

      // Create tenant info record
      const { data: tenantInfo, error: tenantError } = await supabase
        .from('tenant_info')
        .insert({
          landlord_id: myProfile.id,
          first_name: tenantData.first_name,
          last_name: tenantData.last_name,
          email: tenantData.email,
          phone: tenantData.phone
        })
        .select()
        .single();

      if (tenantError) throw tenantError;

      if (!tenantInfo) {
        throw new Error('Failed to create tenant information');
      }

      // Create the lease
      const { error: leaseError } = await supabase
        .from('leases')
        .insert({
          tenant_id: tenantInfo.id, // Use tenant_info id as tenant_id for now
          tenant_info_id: tenantInfo.id,
          unit_id: tenantData.unit_id,
          start_date: tenantData.lease_start,
          end_date: tenantData.lease_end,
          rent_amount: tenantData.rent_amount,
          deposit_amount: tenantData.deposit_amount,
          status: 'active'
        });

      if (leaseError) throw leaseError;

      // Update unit status to occupied
      const { error: unitError } = await supabase
        .from('units')
        .update({ status: 'occupied' })
        .eq('id', tenantData.unit_id);

      if (unitError) throw unitError;

      toast({
        title: "Success",
        description: "Tenant added successfully!",
      });

      fetchTenants(); // Refresh the list
      return true;
    } catch (error: any) {
      console.error('Error creating tenant:', error);
      toast({
        title: "Error",
        description: "Failed to add tenant. Please try again.",
        variant: "destructive",
      });
      return false;
    }
  };

  const updateTenant = async (tenantId: string, updates: Partial<CreateTenantData>): Promise<boolean> => {
    try {
      // Update tenant info
      if (updates.first_name || updates.last_name || updates.phone || updates.email) {
        const { error: tenantInfoError } = await supabase
          .from('tenant_info')
          .update({
            first_name: updates.first_name,
            last_name: updates.last_name,
            phone: updates.phone,
            email: updates.email
          })
          .eq('id', tenantId);

        if (tenantInfoError) throw tenantInfoError;
      }

      // Update lease information
      const tenant = tenants.find(t => t.id === tenantId);
      if (tenant && (updates.lease_start || updates.lease_end || updates.rent_amount || updates.deposit_amount)) {
        const { error: leaseError } = await supabase
          .from('leases')
          .update({
            start_date: updates.lease_start,
            end_date: updates.lease_end,
            rent_amount: updates.rent_amount,
            deposit_amount: updates.deposit_amount
          })
          .eq('id', tenant.lease_id);

        if (leaseError) throw leaseError;
      }

      toast({
        title: "Success",
        description: "Tenant updated successfully!",
      });

      fetchTenants(); // Refresh the list
      return true;
    } catch (error: any) {
      console.error('Error updating tenant:', error);
      toast({
        title: "Error",
        description: "Failed to update tenant. Please try again.",
        variant: "destructive",
      });
      return false;
    }
  };

  const terminateLease = async (tenantId: string): Promise<boolean> => {
    try {
      const tenant = tenants.find(t => t.id === tenantId);
      if (!tenant) return false;

      // Update lease status
      const { error: leaseError } = await supabase
        .from('leases')
        .update({ status: 'terminated' })
        .eq('id', tenant.lease_id);

      if (leaseError) throw leaseError;

      // Update unit status back to vacant
      const { error: unitError } = await supabase
        .from('units')
        .update({ status: 'vacant' })
        .eq('id', tenant.unit_id);

      if (unitError) throw unitError;

      toast({
        title: "Success",
        description: "Lease terminated successfully!",
      });

      fetchTenants(); // Refresh the list
      return true;
    } catch (error: any) {
      console.error('Error terminating lease:', error);
      toast({
        title: "Error",
        description: "Failed to terminate lease. Please try again.",
        variant: "destructive",
      });
      return false;
    }
  };

  useEffect(() => {
    if (user) {
      fetchTenants();
    }
  }, [user]);

  return {
    tenants,
    loading,
    createTenant,
    updateTenant,
    terminateLease,
    refetch: fetchTenants
  };
};