import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { supabaseAdmin } from '@/integrations/supabase/admin';
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
      
      // Query tenant_info table directly for this landlord
      const { data: tenantInfoData, error: tenantInfoError } = await supabase
        .from('tenant_info')
        .select(`
          id,
          first_name,
          last_name,
          email,
          phone,
          avatar_url,
          profile_id
        `)
        .eq('landlord_id', profile.id);

      if (tenantInfoError) throw tenantInfoError;

      if (!tenantInfoData || tenantInfoData.length === 0) {
        setTenants([]);
        return;
      }

      // Get tenant_info IDs
      const tenantInfoIds = tenantInfoData.map(t => t.id);

      // Fetch leases for these tenant_info records
      const { data: leasesData, error: leasesError } = await supabase
        .from('leases')
        .select(`
          id,
          tenant_info_id,
          unit_id,
          start_date,
          end_date,
          rent_amount,
          deposit_amount,
          status,
          units!leases_unit_id_fkey (
            unit_number,
            property_id,
            properties!units_property_id_fkey (
              name
            )
          )
        `)
        .in('tenant_info_id', tenantInfoIds);

      if (leasesError) throw leasesError;

      // Transform the data to match our Tenant interface
      const transformedTenants: Tenant[] = tenantInfoData
        .map((tenantInfo: any) => {
          // Find the most recent active lease for this tenant
          const lease = leasesData?.find(l => l.tenant_info_id === tenantInfo.id);
          
          // Include tenant even if no lease exists (for approved tenants without leases yet)
          return {
            id: tenantInfo.id,
            profile_id: tenantInfo.profile_id || tenantInfo.id,
            first_name: tenantInfo.first_name,
            last_name: tenantInfo.last_name,
            phone: tenantInfo.phone,
            avatar_url: tenantInfo.avatar_url,
            email: tenantInfo.email,
            unit_id: lease?.unit_id || '',
            unit_number: lease?.units?.unit_number || 'Not Assigned',
            property_name: lease?.units?.properties?.name || 'No Property',
            lease_start: lease?.start_date || '',
            lease_end: lease?.end_date || '',
            rent_amount: lease?.rent_amount || 0,
            deposit_amount: lease?.deposit_amount || 0,
            lease_status: lease?.status || 'no_lease',
            lease_id: lease?.id || ''
          };
        });

      console.log('Fetched tenants from tenant_info:', transformedTenants);
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

  const createTenant = async (tenantData: CreateTenantData): Promise<{ success: boolean; credentials?: { email: string; password: string; tenantName: string } }> => {
    if (!user) return { success: false };

    try {
      console.log('🚀 [useTenants] Starting tenant creation:', tenantData);
      
      // Get the current authenticated user's profile ID (landlord)
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

      console.log('👤 [useTenants] Landlord profile ID:', myProfile.id);

      // Generate a temporary password
      const tempPassword = Math.random().toString(36).slice(-8) + 'A1!'; // 8 chars + special chars
      
      // Create Supabase auth user using admin client
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: tenantData.email,
        password: tempPassword,
        email_confirm: true, // Auto-confirm email
        user_metadata: {
          first_name: tenantData.first_name,
          last_name: tenantData.last_name,
          role: 'tenant'
        }
      });

      if (authError) {
        console.error('❌ [useTenants] Error creating auth user:', authError);
        throw authError;
      }

      if (!authData.user) {
        throw new Error('Failed to create auth user');
      }

      console.log('✅ [useTenants] Auth user created:', authData.user.id);

      // Check if profile already exists (might be auto-created by trigger)
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', authData.user.id)
        .maybeSingle();

      let profile;
      
      if (existingProfile) {
        console.log('✅ [useTenants] Profile already exists (auto-created):', existingProfile.id);
        
        // Try to update existing profile with tenant details using admin client
        const { data: updatedProfile, error: updateError } = await supabaseAdmin
          .from('profiles')
          .update({
            role: 'tenant',
            first_name: tenantData.first_name,
            last_name: tenantData.last_name,
            phone: tenantData.phone
          })
          .eq('user_id', authData.user.id)
          .select()
          .maybeSingle(); // Changed to maybeSingle to handle 0 rows gracefully

        if (updateError) {
          console.warn('⚠️ [useTenants] Could not update profile, using existing:', updateError);
          // Don't fail, just use the existing profile
        }
        
        // Use updated profile if successful, otherwise use existing
        profile = updatedProfile || existingProfile;
      } else {
        // Create profile record for the tenant
        const { data: newProfile, error: profileError } = await supabase
          .from('profiles')
          .insert({
            id: authData.user.id,
            user_id: authData.user.id,
            role: 'tenant',
            first_name: tenantData.first_name,
            last_name: tenantData.last_name,
            phone: tenantData.phone
          })
          .select()
          .single();

        if (profileError) {
          console.error('❌ [useTenants] Error creating profile:', profileError);
          await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
          throw profileError;
        }
        
        profile = newProfile;
      }

      console.log('✅ [useTenants] Profile ready:', profile.id);

      // Create tenant info record with landlord link
      const { data: tenantInfo, error: tenantError } = await supabase
        .from('tenant_info')
        .insert({
          landlord_id: myProfile.id, // Link to landlord
          profile_id: authData.user.id, // Link to profile
          first_name: tenantData.first_name,
          last_name: tenantData.last_name,
          email: tenantData.email,
          phone: tenantData.phone,
          tenant_status: 'active', // Set as active immediately
          current_balance: tenantData.rent_amount, // Initialize with first month's rent
          payment_status: 'unpaid'
        })
        .select()
        .single();

      if (tenantError) {
        console.error('❌ [useTenants] Error creating tenant_info:', tenantError);
        // Clean up auth user and profile if tenant_info creation fails
        await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
        throw tenantError;
      }

      if (!tenantInfo) {
        throw new Error('Failed to create tenant information');
      }

      console.log('✅ [useTenants] Tenant info created:', tenantInfo.id);

      // Create the lease with all required fields
      const { data: lease, error: leaseError} = await supabase
        .from('leases')
        .insert({
          tenant_id: profile.id, // Link to profiles table
          tenant_info_id: tenantInfo.id, // Link to tenant_info table
          unit_id: tenantData.unit_id,
          start_date: tenantData.lease_start,
          end_date: tenantData.lease_end,
          rent_amount: tenantData.rent_amount,
          deposit_amount: tenantData.deposit_amount,
          status: 'active' // Set lease as active
        })
        .select()
        .single();

      if (leaseError) {
        console.error('❌ [useTenants] Error creating lease:', leaseError);
        // Clean up auth user, profile, and tenant_info if lease creation fails
        await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
        throw leaseError;
      }

      console.log('✅ [useTenants] Lease created:', lease.id);

      // Update unit status to occupied
      const { error: unitError } = await supabase
        .from('units')
        .update({ status: 'occupied' })
        .eq('id', tenantData.unit_id);

      if (unitError) {
        console.error('❌ [useTenants] Error updating unit:', unitError);
        throw unitError;
      }

      console.log('✅ [useTenants] Unit updated to occupied');

      const credentials = {
        email: tenantData.email,
        password: tempPassword,
        tenantName: `${tenantData.first_name} ${tenantData.last_name}`
      };

      // Get unit and property information for the welcome email
      const { data: unitData } = await supabase
        .from('units')
        .select('unit_number, property:properties(name, landlord:profiles!landlord_id(first_name, last_name))')
        .eq('id', tenantData.unit_id)
        .single();

      // Send welcome email with login credentials
      try {
        console.log('📧 [useTenants] Sending welcome email...');
        
        const landlordName = unitData?.property?.landlord 
          ? `${unitData.property.landlord.first_name} ${unitData.property.landlord.last_name}`
          : 'Your Landlord';
        
        const propertyName = unitData?.property?.name || 'Your Property';
        const unitNumber = unitData?.unit_number || '';

        const { data, error } = await supabase.functions.invoke('send-welcome-email', {
          body: {
            email: tenantData.email,
            password: tempPassword,
            tenantName: credentials.tenantName,
            landlordName: landlordName,
            propertyName: propertyName,
            unitNumber: unitNumber
          }
        });

        if (error) {
          console.error('⚠️ [useTenants] Failed to send welcome email:', error);
          // Don't fail the tenant creation if email fails
          toast({
            title: "Tenant Created",
            description: "Tenant account created but welcome email failed to send. Please share credentials manually.",
            variant: "default",
          });
        } else {
          console.log('✅ [useTenants] Welcome email sent:', data);
          toast({
            title: "Success",
            description: "Tenant account created and welcome email sent!",
          });
        }
      } catch (emailError) {
        console.error('⚠️ [useTenants] Error sending welcome email:', emailError);
        // Don't fail the tenant creation if email fails
        toast({
          title: "Tenant Created",
          description: "Tenant account created. Save the credentials to share with the tenant.",
        });
      }

      fetchTenants(); // Refresh the list
      return { success: true, credentials };
    } catch (error: any) {
      console.error('❌ [useTenants] Error creating tenant:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to add tenant. Please try again.",
        variant: "destructive",
      });
      return { success: false };
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