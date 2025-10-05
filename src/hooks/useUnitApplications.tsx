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
            images,
            property_id
          ),
          properties (
            name,
            address,
            landlord_id
          ),
          profiles!unit_applications_tenant_id_fkey (
            first_name,
            last_name,
            phone,
            avatar_url
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Filter applications for this landlord's properties
      const landlordApplications = (data || []).filter((app: any) => 
        app.properties?.landlord_id === profile?.id
      );
      
      setApplications(landlordApplications as UnitApplication[]);
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
      console.log(`Updating application ${applicationId} to status: ${status}`);
      
      // Check if deposit is paid before approving
      if (status === 'approved') {
        const { data: applicationData, error: checkError } = await supabase
          .from('unit_applications')
          .select('deposit_paid, tenant_id, unit_id, property_id')
          .eq('id', applicationId)
          .single();

        if (checkError) {
          console.error('Error checking application:', checkError);
          throw checkError;
        }
        
        console.log('Application data:', applicationData);
        
        if (!applicationData?.deposit_paid) {
          toast.error('Cannot approve application: Security deposit has not been paid');
          return null;
        }
      }

      // Fetch full application data with all necessary relationships
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
            property_id,
            properties (
              id,
              name,
              address,
              landlord_id
            )
          )
        `)
        .single();

      if (error) {
        console.error('Error updating application status:', error);
        throw error;
      }
      
      console.log('Application updated with full data:', data);
      
      // If application is approved, create tenant and lease
      if (status === 'approved' && data) {
        console.log('Creating tenant from application...');
        await createTenantFromApplication(data);
        console.log('Tenant created successfully');
      }
      
      setApplications(prev => prev.map(app => app.id === applicationId ? data as UnitApplication : app));
      
      // Refresh applications list to ensure consistency
      if (profile?.role === 'landlord') {
        await fetchLandlordApplications();
      } else if (profile?.role === 'tenant') {
        await fetchTenantApplications();
      }
      
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
      console.log('Creating tenant from application:', application);
      
      // Get the property's landlord ID from the nested structure
      const landlordId = application.units?.properties?.landlord_id;
      
      if (!landlordId) {
        console.error('Could not find landlord_id in application data:', application);
        throw new Error('Property landlord not found in application data');
      }

      console.log('Found Landlord ID:', landlordId);

      // Get applicant's profile information including email
      const { data: applicantProfile, error: applicantError } = await supabase
        .from('profiles')
        .select('id, user_id, first_name, last_name, phone, email')
        .eq('id', application.tenant_id)
        .single();

      if (applicantError) {
        console.error('Error fetching applicant profile:', applicantError);
        throw applicantError;
      }

      console.log('Applicant profile:', applicantProfile);

      // Use the applicant's email from their profile
      const userEmail = applicantProfile.email || `tenant-${application.tenant_id.substring(0, 8)}@pending.com`;
      console.log('Applicant email:', userEmail);

      // Check if tenant_info already exists for this profile
      const { data: existingTenantInfo } = await supabase
        .from('tenant_info')
        .select('id')
        .eq('profile_id', application.tenant_id)
        .eq('landlord_id', landlordId)
        .single();

      let tenantInfo;
      if (existingTenantInfo) {
        console.log('Using existing tenant_info:', existingTenantInfo.id);
        tenantInfo = existingTenantInfo;
        
        // Update tenant status and balance after deposit is paid
        const { error: updateError } = await supabase
          .from('tenant_info')
          .update({
            tenant_status: 'active',
            current_balance: application.units?.rent_amount || 0,
            payment_status: 'unpaid'
          })
          .eq('id', existingTenantInfo.id);
          
        if (updateError) {
          console.error('Error updating tenant_info status:', updateError);
        }
      } else {
        // Create tenant info record with active status and initial balance
        console.log('Creating new tenant_info record');
        const { data: newTenantInfo, error: tenantError } = await supabase
          .from('tenant_info')
          .insert({
            landlord_id: landlordId,
            first_name: applicantProfile?.first_name || 'N/A',
            last_name: applicantProfile?.last_name || 'N/A',
            email: userEmail,
            phone: applicantProfile?.phone || null,
            profile_id: application.tenant_id,
            tenant_status: 'active',
            current_balance: application.units?.rent_amount || 0,
            payment_status: 'unpaid'
          })
          .select()
          .single();

        if (tenantError) {
          console.error('Error creating tenant_info:', tenantError);
          throw tenantError;
        }

        if (!newTenantInfo) {
          throw new Error('Failed to create tenant information');
        }

        tenantInfo = newTenantInfo;
        console.log('Created tenant_info:', tenantInfo.id);
      }

      // Create the lease with default dates (can be updated later)
      const startDate = application.preferred_move_in_date || new Date().toISOString().split('T')[0];
      const endDate = new Date(new Date(startDate).getTime() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      console.log('Creating lease with dates:', startDate, endDate);
      const { error: leaseError } = await supabase
        .from('leases')
        .insert({
          tenant_id: tenantInfo.id, // Reference to tenant_info table
          tenant_info_id: tenantInfo.id,
          unit_id: application.unit_id,
          start_date: startDate,
          end_date: endDate,
          rent_amount: application.units?.rent_amount || 0,
          deposit_amount: (application.units?.deposit_amount ?? application.deposit_amount ?? application.units?.rent_amount ?? 0),
          status: 'active'
        });

      if (leaseError) {
        console.error('Error creating lease:', leaseError);
        throw leaseError;
      }
      console.log('Lease created successfully');

      // Update unit status to occupied
      console.log('Updating unit status to occupied');
      const { error: unitError } = await supabase
        .from('units')
        .update({ status: 'occupied' })
        .eq('id', application.unit_id);

      if (unitError) {
        console.error('Error updating unit status:', unitError);
        throw unitError;
      }
      console.log('Unit status updated');

      // Update profile role to tenant if not already
      console.log('Updating profile role to tenant');
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ role: 'tenant' })
        .eq('id', application.tenant_id);

      if (profileError) {
        console.error('Error updating profile role:', profileError);
        // Don't throw here, just log the error
      } else {
        console.log('Profile role updated to tenant');
      }

      toast.success('Tenant created successfully from application!');
    } catch (error) {
      console.error('Error creating tenant from application:', error);
      toast.error('Failed to create tenant from application: ' + (error as Error).message);
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