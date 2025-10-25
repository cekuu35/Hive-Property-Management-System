import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useTenants } from '@/hooks/useTenants';
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
  const { createTenant } = useTenants();

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
      console.log('🔍 [useUnitApplications] Fetching landlord applications for profile:', profile?.id);
      
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

      if (error) {
        console.error('❌ [useUnitApplications] Error fetching applications:', error);
        throw error;
      }
      
      console.log('📋 [useUnitApplications] Raw applications data:', data);
      
      // Filter applications for this landlord's properties
      const landlordApplications = (data || []).filter((app: any) => 
        app.properties?.landlord_id === profile?.id
      );
      
      console.log('🏠 [useUnitApplications] Filtered applications for landlord:', landlordApplications);
      
      setApplications(landlordApplications as UnitApplication[]);
    } catch (error) {
      console.error('❌ [useUnitApplications] Error fetching applications:', error);
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
    documents?: any[];
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
        console.log('🚀 [useUnitApplications] Creating tenant from approved application...');
        try {
          await createTenantFromApplicationSimple(data);
          console.log('✅ [useUnitApplications] Tenant and lease created successfully from application');
        } catch (tenantError) {
          console.error('❌ [useUnitApplications] Failed to create tenant from application:', tenantError);
          // Revert application status if tenant creation failed
          await supabase
            .from('unit_applications')
            .update({ 
              status: 'pending',
              reviewed_at: null,
              reviewed_by: null
            })
            .eq('id', applicationId);
          
          toast.error('Failed to create tenant record. Application status reverted to pending.');
          throw tenantError;
        }
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

  const createTenantFromApplicationSimple = async (application: any) => {
    let createdTenantInfoId: string | null = null;
    
    try {
      console.log('✨ [Application Approval] Creating tenant from application:', application.id);
      
      // Get applicant's profile information
      const { data: applicantProfile, error: applicantError } = await supabase
        .from('profiles')
        .select('id, user_id, first_name, last_name, phone, email')
        .eq('id', application.tenant_id)
        .single();

      if (applicantError) {
        console.error('❌ [Application Approval] Error fetching applicant profile:', applicantError);
        throw applicantError;
      }

      console.log('✅ [Application Approval] Applicant profile found:', applicantProfile.email);

      // Check if tenant already exists
      const { data: existingTenant } = await supabase
        .from('tenant_info')
        .select('id, tenant_status')
        .eq('profile_id', application.tenant_id)
        .single();

      if (existingTenant) {
        console.log('⚠️ [Application Approval] Tenant already exists, using existing tenant_info:', existingTenant.id);
        createdTenantInfoId = existingTenant.id;
        
        // If tenant exists, check if they already have an active lease for this unit
        const { data: existingLease } = await supabase
          .from('leases')
          .select('id, status')
          .eq('unit_id', application.unit_id)
          .eq('tenant_info_id', existingTenant.id)
          .in('status', ['active', 'approved'])
          .single();
        
        if (existingLease) {
          console.log('✅ [Application Approval] Tenant already has an active lease for this unit');
          return;
        }
        
        // Continue to create lease with existing tenant_info
      } else {
        // Create new tenant_info record
        console.log('📝 [Application Approval] Creating new tenant_info record...');
        
        const { data: tenantInfo, error: tenantError } = await supabase
          .from('tenant_info')
          .insert({
            profile_id: application.tenant_id,
            first_name: applicantProfile.first_name || 'N/A',
            last_name: applicantProfile.last_name || 'N/A',
            email: applicantProfile.email || `tenant-${application.tenant_id.substring(0, 8)}@example.com`,
            phone: applicantProfile.phone || null,
            landlord_id: application.units?.properties?.landlord_id,
            tenant_status: 'active',
            current_balance: 0, // Will be set when first rent payment is generated
            payment_status: 'unpaid',
            auth_user_id: applicantProfile.user_id,
            move_in_date: application.preferred_move_in_date || new Date().toISOString().split('T')[0],
            emergency_contact_name: null,
            emergency_contact_phone: null,
            notes: 'Created from approved application',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select()
          .single();

        if (tenantError) {
          console.error('❌ [Application Approval] Error creating tenant_info:', tenantError);
          throw tenantError;
        }

        createdTenantInfoId = tenantInfo.id;
        console.log('✅ [Application Approval] Tenant info created:', tenantInfo.id);
      }

      // Create lease record
      const leaseStartDate = application.preferred_move_in_date || new Date().toISOString().split('T')[0];
      const leaseEndDate = new Date(new Date(leaseStartDate).getTime() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      console.log('📋 [Application Approval] Creating lease record...');
      console.log(`   Lease: ${leaseStartDate} → ${leaseEndDate}`);
      console.log(`   Tenant ID (profile.id): ${application.tenant_id}`);
      console.log(`   Tenant Info ID: ${createdTenantInfoId}`);

      const { data: lease, error: leaseError } = await supabase
        .from('leases')
        .insert({
          tenant_id: application.tenant_id,  // ✅ FIXED: Use profile.id, not tenant_info.id
          tenant_info_id: createdTenantInfoId,  // ✅ Also set tenant_info_id
          unit_id: application.unit_id,
          start_date: leaseStartDate,
          end_date: leaseEndDate,
          rent_amount: application.units?.rent_amount || 0,
          deposit_amount: application.units?.deposit_amount || 0,
          status: 'active',
          lease_document_url: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (leaseError) {
        console.error('❌ [Application Approval] Error creating lease:', leaseError);
        throw leaseError;
      }

      console.log('✅ [Application Approval] Lease created:', lease.id);

      // Generate first month's rent payment
      console.log('💰 [Application Approval] Generating first rent payment...');
      
      const { data: rentPayment, error: rentPaymentError } = await supabase
        .from('rent_payments')
        .insert({
          lease_id: lease.id,
          amount: lease.rent_amount,
          due_date: leaseStartDate,
          status: 'pending',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (rentPaymentError) {
        console.error('⚠️ [Application Approval] Error generating first rent payment:', rentPaymentError);
        // Don't throw - this is not critical, monthly cron will handle it
      } else {
        console.log('✅ [Application Approval] First rent payment generated:', rentPayment.id);
        
        // Update tenant balance
        await supabase
          .from('tenant_info')
          .update({
            current_balance: lease.rent_amount,
            payment_status: 'unpaid',
            updated_at: new Date().toISOString()
          })
          .eq('id', createdTenantInfoId);
      }

      // Update unit status to occupied
      const { error: unitUpdateError } = await supabase
        .from('units')
        .update({ 
          status: 'occupied',
          tenant_id: application.tenant_id, // Link tenant to unit
          updated_at: new Date().toISOString()
        })
        .eq('id', application.unit_id);

      if (unitUpdateError) {
        console.error('⚠️ [Application Approval] Error updating unit status:', unitUpdateError);
        // Don't throw error here as lease was created successfully
      } else {
        console.log('✅ [Application Approval] Unit status updated to occupied');
      }

      // Send notification to tenant
      const { error: notificationError } = await supabase
        .from('notifications')
        .insert({
          user_id: application.tenant_id,
          title: 'Application Approved!',
          message: `Your application for Unit ${application.units?.unit_number} at ${application.units?.properties?.name} has been approved. Your lease has been created and you can now access your tenant portal.`,
          type: 'application_approved',
          read: false,
          data: { 
            application_id: application.id,
            unit_id: application.unit_id,
            lease_id: lease.id,
            rent_amount: lease.rent_amount,
            move_in_date: leaseStartDate
          },
          created_at: new Date().toISOString()
        });

      if (notificationError) {
        console.error('⚠️ [Application Approval] Error sending notification:', notificationError);
        // Don't throw - notification failure is not critical
      } else {
        console.log('✅ [Application Approval] Notification sent to tenant');
      }

      toast.success('Tenant and lease created successfully from application!');
      console.log('🎉 [Application Approval] Complete! Lease ID:', lease.id);
      
    } catch (error) {
      console.error('❌ [Application Approval] Error creating tenant from application:', error);
      
      // ROLLBACK: Delete tenant_info if we created it and something failed
      if (createdTenantInfoId && !existingTenant) {
        console.log('🔄 [Application Approval] Rolling back - deleting tenant_info:', createdTenantInfoId);
        
        await supabase
          .from('tenant_info')
          .delete()
          .eq('id', createdTenantInfoId)
          .then(() => console.log('✅ [Application Approval] Rollback successful'))
          .catch((rollbackError) => console.error('❌ [Application Approval] Rollback failed:', rollbackError));
      }
      
      toast.error('Failed to create tenant from application: ' + (error as Error).message);
      throw error;
    }
  };

  const createTenantFromApplicationNew = async (application: any) => {
    try {
      console.log('Creating tenant from application using useTenants hook:', application);
      
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

      // Create tenant using the useTenants hook with isDirectCreation: false
      const tenantData = {
        first_name: applicantProfile?.first_name || 'N/A',
        last_name: applicantProfile?.last_name || 'N/A',
        email: userEmail,
        phone: applicantProfile?.phone || undefined,
        unit_id: application.unit_id,
        lease_start: application.preferred_move_in_date || new Date().toISOString().split('T')[0],
        lease_end: new Date(new Date(application.preferred_move_in_date || new Date().toISOString().split('T')[0]).getTime() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        rent_amount: application.units?.rent_amount || 0,
        deposit_amount: application.units?.deposit_amount || 0,
        isDirectCreation: false // This is an application approval, not direct creation
      };

      console.log('Creating tenant with data:', tenantData);
      const result = await createTenant(tenantData);
      
      if (result.success) {
        console.log('Tenant created successfully from application');
        toast.success('Tenant created successfully from application!');
      } else {
        throw new Error('Failed to create tenant from application');
      }
      
    } catch (error) {
      console.error('Error creating tenant from application:', error);
      toast.error('Failed to create tenant from application: ' + (error as Error).message);
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
        
        // Update tenant status to active and set balance after application approval
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
          throw updateError;
        }
        
        // Fetch the updated tenant info
        const { data: updatedTenantInfo, error: fetchError } = await supabase
          .from('tenant_info')
          .select('*')
          .eq('id', existingTenantInfo.id)
          .single();
          
        if (fetchError) {
          console.error('Error fetching updated tenant_info:', fetchError);
          throw fetchError;
        }
        
        tenantInfo = updatedTenantInfo;
        console.log('Updated tenant_info to active status:', tenantInfo);
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
      const { data: leaseData, error: leaseError } = await supabase
        .from('leases')
        .insert({
          tenant_id: application.tenant_id, // Use the profile ID for tenant_id
          tenant_info_id: tenantInfo.id, // Reference to tenant_info table
          unit_id: application.unit_id,
          start_date: startDate,
          end_date: endDate,
          rent_amount: application.units?.rent_amount || 0,
          deposit_amount: (application.units?.deposit_amount ?? application.deposit_amount ?? application.units?.rent_amount ?? 0),
          status: 'active' // Application approvals create active leases immediately
        })
        .select()
        .single();

      if (leaseError) {
        console.error('Error creating lease:', leaseError);
        throw leaseError;
      }
      console.log('Lease created successfully with active status:', leaseData);

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

      // Final verification: Check that tenant status is active and lease is active
      console.log('Verifying tenant and lease status...');
      const { data: finalTenantInfo, error: verifyTenantError } = await supabase
        .from('tenant_info')
        .select('tenant_status')
        .eq('id', tenantInfo.id)
        .single();
        
      const { data: finalLeaseInfo, error: verifyLeaseError } = await supabase
        .from('leases')
        .select('status')
        .eq('tenant_info_id', tenantInfo.id)
        .single();
        
      if (verifyTenantError || verifyLeaseError) {
        console.error('Verification errors:', verifyTenantError, verifyLeaseError);
      } else {
        console.log('Verification successful - Tenant status:', finalTenantInfo?.tenant_status, 'Lease status:', finalLeaseInfo?.status);
      }

      toast.success('Tenant created successfully from application with active lease!');
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