import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface UnitApplication {
  id: string;
  tenant_id: string;
  unit_id: string;
  property_id: string;
  status: string;
  application_message?: string;
  preferred_move_in_date?: string;
  employment_info: any;
  personal_references: any;
  documents: any;
  created_at: string;
  updated_at: string;
  reviewed_at?: string;
  reviewed_by?: string;
  deposit_paid?: boolean;
  deposit_payment_reference?: string;
  deposit_amount?: number;
  deposit_paid_at?: string;
}

interface Property {
  id: string;
  name: string;
  address: string;
  description?: string;
  images: any;
  amenities: any;
}

interface Unit {
  id: string;
  property_id: string;
  unit_number: string;
  type: string;
  rent_amount: number;
  deposit_amount: number;
  square_feet?: number;
  status: string;
  images: any;
  amenities: any;
}

export const useUnitApplications = () => {
  const [applications, setApplications] = useState<UnitApplication[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [vacantUnits, setVacantUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);
  const { profile } = useAuth();

  useEffect(() => {
    if (profile?.id) {
      if (profile.role === 'tenant') {
        fetchTenantApplications();
      } else if (profile.role === 'landlord') {
        fetchLandlordApplications();
      }
      fetchPropertiesAndUnits();
    }
  }, [profile?.id, profile?.role]);

  const fetchTenantApplications = async () => {
    try {
      const { data, error } = await supabase
        .from('unit_applications')
        .select(`
          *,
          units (
            unit_number,
            type,
            rent_amount,
            deposit_amount,
            images
          ),
          properties (
            name,
            address
          )
        `)
        .eq('tenant_id', profile?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setApplications((data || []) as UnitApplication[]);
    } catch (error) {
      console.error('Error fetching applications:', error);
      toast.error('Failed to load applications');
    }
  };

  const fetchLandlordApplications = async () => {
    try {
      const { data, error } = await supabase
        .from('unit_applications')
        .select(`
          *,
          units (
            unit_number,
            type,
            rent_amount,
            deposit_amount,
            images
          ),
          properties (
            name,
            address
          ),
          profiles!unit_applications_tenant_id_fkey (
            first_name,
            last_name,
            phone,
            avatar_url
          )
        `)
        .eq('properties.landlord_id', profile?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setApplications((data || []) as UnitApplication[]);
    } catch (error) {
      console.error('Error fetching applications:', error);
      toast.error('Failed to load applications');
    }
  };

  const fetchPropertiesAndUnits = async () => {
    try {
      const [propertiesResponse, unitsResponse] = await Promise.all([
        supabase
          .from('properties')
          .select('*')
          .order('created_at', { ascending: false }),
        supabase
          .from('units')
          .select(`
            *,
            properties (
              name,
              address,
              landlord_id
            )
          `)
          .eq('status', 'vacant')
          .order('created_at', { ascending: false })
      ]);

      if (propertiesResponse.error) throw propertiesResponse.error;
      if (unitsResponse.error) throw unitsResponse.error;

      // Sort properties by name for better organization
      const sortedProperties = (propertiesResponse.data || []).sort((a: any, b: any) => 
        a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' })
      );
      
      setProperties(sortedProperties as Property[]);
      setVacantUnits((unitsResponse.data || []) as Unit[]);
    } catch (error) {
      console.error('Error fetching properties and units:', error);
      toast.error('Failed to load available units');
    } finally {
      setLoading(false);
    }
  };

  const submitApplication = async (applicationData: {
    unit_id: string;
    property_id: string;
    application_message?: string;
    preferred_move_in_date?: string;
    employment_info?: any;
    personal_references?: any[];
    deposit_amount?: number;
  }) => {
    try {
      const { data, error } = await supabase
        .from('unit_applications')
        .insert({
          ...applicationData,
          tenant_id: profile?.id,
          deposit_paid: false
        })
        .select()
        .single();

      if (error) throw error;
      
      setApplications(prev => [data as UnitApplication, ...prev]);
      toast.success('Application submitted successfully! You need to pay the security deposit before approval.');
      return data;
    } catch (error) {
      console.error('Error submitting application:', error);
      toast.error('Failed to submit application');
      throw error;
    }
  };

  const paySecurityDeposit = async (applicationId: string, paymentReference: string) => {
    try {
      const { data, error } = await supabase
        .from('unit_applications')
        .update({
          deposit_paid: true,
          deposit_payment_reference: paymentReference,
          deposit_paid_at: new Date().toISOString()
        })
        .eq('id', applicationId)
        .select()
        .single();

      if (error) throw error;
      
      setApplications(prev => prev.map(app => app.id === applicationId ? data as UnitApplication : app));
      toast.success('Security deposit payment recorded successfully!');
      return data;
    } catch (error) {
      console.error('Error recording deposit payment:', error);
      toast.error('Failed to record deposit payment');
      throw error;
    }
  };

  const updateApplicationStatus = async (applicationId: string, status: 'approved' | 'rejected') => {
    try {
      // Check if deposit is paid before approving
      if (status === 'approved') {
        const { data: applicationData, error: checkError } = await supabase
          .from('unit_applications')
          .select('deposit_paid')
          .eq('id', applicationId)
          .single();

        if (checkError) throw checkError;
        
        if (!applicationData?.deposit_paid) {
          toast.error('Cannot approve application: Security deposit has not been paid');
          return null;
        }
      }

      const { data, error } = await supabase
        .from('unit_applications')
        .update({
          status,
          reviewed_at: new Date().toISOString(),
          reviewed_by: profile?.id
        })
        .eq('id', applicationId)
        .select(`
          *,
          units (
            unit_number,
            type,
            rent_amount,
            deposit_amount,
            property_id
          ),
          properties (
            name,
            address
          )
        `)
        .single();

      if (error) throw error;
      
      // If application is approved, create tenant and lease
      if (status === 'approved' && data) {
        await createTenantFromApplication(data);
      }
      
      setApplications(prev => prev.map(app => app.id === applicationId ? data as UnitApplication : app));
      toast.success(`Application ${status} successfully!`);
      return data;
    } catch (error) {
      console.error('Error updating application status:', error);
      toast.error('Failed to update application');
      throw error;
    }
  };

  const createTenantFromApplication = async (application: any) => {
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

      // Get applicant's profile information
      const { data: applicantProfile, error: applicantError } = await supabase
        .from('profiles')
        .select('first_name, last_name, phone')
        .eq('id', application.tenant_id)
        .single();

      if (applicantError) throw applicantError;

      // Create tenant info record
      const { data: tenantInfo, error: tenantError } = await supabase
        .from('tenant_info')
        .insert({
          landlord_id: myProfile.id,
          first_name: applicantProfile?.first_name || 'N/A',
          last_name: applicantProfile?.last_name || 'N/A',
          email: `tenant-${application.tenant_id}@temp.com`, // Temporary email
          phone: applicantProfile?.phone || null,
          profile_id: application.tenant_id
        })
        .select()
        .single();

      if (tenantError) throw tenantError;

      if (!tenantInfo) {
        throw new Error('Failed to create tenant information');
      }

      // Create the lease with default dates (can be updated later)
      const startDate = application.preferred_move_in_date || new Date().toISOString().split('T')[0];
      const endDate = new Date(new Date(startDate).getTime() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      const { error: leaseError } = await supabase
        .from('leases')
        .insert({
          tenant_id: application.tenant_id, // Use the applicant's profile ID
          tenant_info_id: tenantInfo.id,
          unit_id: application.unit_id,
          start_date: startDate,
          end_date: endDate,
          rent_amount: application.units?.rent_amount || 0,
          deposit_amount: (application.units?.deposit_amount ?? application.deposit_amount ?? application.units?.rent_amount ?? 0),
          status: 'active'
        });

      if (leaseError) throw leaseError;

      // Update unit status to occupied
      const { error: unitError } = await supabase
        .from('units')
        .update({ status: 'occupied' })
        .eq('id', application.unit_id);

      if (unitError) throw unitError;

      // Update profile role to tenant if not already
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ role: 'tenant' })
        .eq('id', application.tenant_id);

      if (profileError) console.error('Error updating profile role:', profileError);

      toast.success('Tenant created successfully from application!');
    } catch (error) {
      console.error('Error creating tenant from application:', error);
      toast.error('Failed to create tenant from application');
      throw error;
    }
  };

  const withdrawApplication = async (applicationId: string) => {
    try {
      const { data, error } = await supabase
        .from('unit_applications')
        .update({ status: 'withdrawn' })
        .eq('id', applicationId)
        .select()
        .single();

      if (error) throw error;
      
      setApplications(prev => prev.map(app => app.id === applicationId ? data as UnitApplication : app));
      toast.success('Application withdrawn successfully!');
      return data;
    } catch (error) {
      console.error('Error withdrawing application:', error);
      toast.error('Failed to withdraw application');
      throw error;
    }
  };

  const getUnitsForProperty = (propertyId: string) => {
    const propertyUnits = vacantUnits.filter(unit => unit.property_id === propertyId);
    
    // Sort units by unit number (natural sort for proper numerical ordering)
    return propertyUnits.sort((a, b) => {
      const aNum = a.unit_number;
      const bNum = b.unit_number;
      
      // Handle pure numeric unit numbers
      const aIsNumeric = /^\d+$/.test(aNum);
      const bIsNumeric = /^\d+$/.test(bNum);
      
      if (aIsNumeric && bIsNumeric) {
        return parseInt(aNum, 10) - parseInt(bNum, 10);
      }
      
      // Handle alphanumeric unit numbers (e.g., A1, B2, etc.)
      const aMatch = aNum.match(/^([A-Za-z]*)(\d+)(.*)$/);
      const bMatch = bNum.match(/^([A-Za-z]*)(\d+)(.*)$/);
      
      if (aMatch && bMatch) {
        const [, aPrefix, aNumber, aSuffix] = aMatch;
        const [, bPrefix, bNumber, bSuffix] = bMatch;
        
        // First compare prefix (A, B, C, etc.)
        if (aPrefix !== bPrefix) {
          return aPrefix.localeCompare(bPrefix);
        }
        
        // Then compare numbers
        const numDiff = parseInt(aNumber, 10) - parseInt(bNumber, 10);
        if (numDiff !== 0) {
          return numDiff;
        }
        
        // Finally compare suffix
        return aSuffix.localeCompare(bSuffix);
      }
      
      // Fallback to string comparison
      return aNum.localeCompare(bNum, undefined, { numeric: true, sensitivity: 'base' });
    });
  };

  const hasAppliedToUnit = (unitId: string) => {
    return applications.some(app => 
      app.unit_id === unitId && 
      app.status !== 'withdrawn' && 
      app.status !== 'rejected'
    );
  };

  return {
    applications,
    properties,
    vacantUnits,
    loading,
    submitApplication,
    updateApplicationStatus,
    withdrawApplication,
    paySecurityDeposit,
    getUnitsForProperty,
    hasAppliedToUnit,
    refetch: () => {
      if (profile?.role === 'tenant') {
        fetchTenantApplications();
      } else if (profile?.role === 'landlord') {
        fetchLandlordApplications();
      }
      fetchPropertiesAndUnits();
    }
  };
};