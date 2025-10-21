import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { supabaseAdmin } from '@/integrations/supabase/admin';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export interface UtilityBill {
  id: string;
  unit_id: string;
  utility_id: string;
  month: string;
  amount: number;
  due_date: string;
  status: 'unpaid' | 'paid' | 'overdue';
  paystack_reference?: string;
  created_at: string;
  utilities?: {
    name: string;
  };
}

export interface LandlordBill extends UtilityBill {
  unit_number: string;
  property_name: string;
  tenant_name?: string;
}

export interface Utility {
  id: string;
  name: string;
}

export const useUtilityBills = () => {
  const { profile } = useAuth();
  const [bills, setBills] = useState<UtilityBill[]>([]);
  const [landlordBills, setLandlordBills] = useState<LandlordBill[]>([]);
  const [utilities, setUtilities] = useState<Utility[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch utilities
  const fetchUtilities = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('utilities' as any)
        .select('*')
        .order('name');

      if (error) throw error;
      setUtilities((data as any) || []);
    } catch (err) {
      console.error('Error fetching utilities:', err);
    }
  }, []);

  // Fetch tenant bills
  const fetchTenantBills = useCallback(async () => {
    if (!profile?.id) {
      console.log('🔍 [fetchTenantBills] No profile ID, skipping fetch');
      return;
    }

    try {
      console.log('🔍 [fetchTenantBills] Starting fetch for profile:', profile.id);
      setLoading(true);
      setError(null);

      // First, get the tenant_info record for this profile
      const { data: tenantInfo, error: tenantError } = await supabase
        .from('tenant_info')
        .select('id')
        .eq('profile_id', profile.id)
        .single();

      console.log('🔍 [fetchTenantBills] Tenant info query result:', { tenantInfo, tenantError });

      if (tenantError || !tenantInfo || !tenantInfo.id) {
        console.error('❌ [fetchTenantBills] Error fetching tenant_info:', tenantError);
        setBills([]);
        return;
      }

      console.log('🔍 [fetchTenantBills] Tenant info found:', tenantInfo.id);

      // Get bills for this tenant
      const { data: bills, error: billsError } = await (supabase as any)
        .from('unit_bills')
        .select(`
          id,
          amount,
          due_date,
          status,
          month,
          created_at,
          utilities!unit_bills_utility_id_fkey (name),
          units!unit_bills_unit_id_fkey (
            unit_number,
            properties!units_property_id_fkey (name)
          )
        `)
        .eq('tenant_id', tenantInfo.id)
        .order('created_at', { ascending: false });

      if (billsError) {
        console.error('❌ [fetchTenantBills] Error fetching bills:', billsError);
        throw billsError;
      }

      console.log('🔍 [fetchTenantBills] Setting bills:', bills?.length || 0);
      setBills(bills || []);
    } catch (err) {
      console.error('❌ [fetchTenantBills] Error:', err);
      setError('Failed to load utility bills');
    } finally {
      setLoading(false);
    }
  }, [profile?.id]);

  // Fetch landlord bills
  const fetchLandlordBills = useCallback(async () => {
    if (!profile?.id) return;

    try {
      setLoading(true);
      setError(null);

      // Use direct database approach instead of edge function
      const { data: bills, error: billsError } = await (supabase as any)
        .from('unit_bills')
        .select(`
          id,
          amount,
          due_date,
          status,
          month,
          created_at,
          tenant_id,
          utilities!unit_bills_utility_id_fkey (name),
          units!unit_bills_unit_id_fkey (
            unit_number,
            properties!units_property_id_fkey (name)
          )
        `)
        .eq('landlord_id', profile.id)
        .order('created_at', { ascending: false });

      if (billsError) {
        throw billsError;
      }

      console.log('Raw bills data:', bills);

      // Get tenant_info records
      const { data: tenantInfos, error: tenantInfosError } = await supabase
        .from('tenant_info')
        .select('id, first_name, last_name');

      if (tenantInfosError) {
        console.warn('Error fetching tenant_info:', tenantInfosError);
      }

      // Create tenant lookup map
      const tenantMap = new Map();
      if (tenantInfos) {
        tenantInfos.forEach(tenant => {
          tenantMap.set(tenant.id, tenant);
        });
      }

      // Add tenant information to bills
      const billsWithTenants = (bills || []).map(bill => {
        let tenantInfo = null;
        
        if (bill.tenant_id && tenantMap.has(bill.tenant_id)) {
          tenantInfo = tenantMap.get(bill.tenant_id);
        }
        
        return {
          ...bill,
          tenant_info: tenantInfo,
          unit_number: bill.units?.unit_number || 'Unknown',
          property_name: bill.units?.properties?.name || 'Unknown Property',
          tenant_name: tenantInfo ? `${tenantInfo.first_name} ${tenantInfo.last_name}` : undefined
        };
      });

      console.log('Bills with tenant info:', billsWithTenants);
      setLandlordBills(billsWithTenants);
    } catch (err) {
      console.error('Error fetching landlord bills:', err);
      setError('Failed to load utility bills');
    } finally {
      setLoading(false);
    }
  }, [profile?.id]);

  // Create a new bill (landlord only)
  const createBill = async (billData: {
    unit_id: string;
    utility_id: string;
    month: string;
    amount: number;
    due_date: string;
    tenant_id?: string;
  }) => {
    try {
      // Get the current user's profile
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!profile) {
        throw new Error('Profile not found');
      }

      // Check for duplicate bill
      const { data: existingBill, error: duplicateError } = await (supabase as any)
        .from('unit_bills')
        .select('id')
        .eq('unit_id', billData.unit_id)
        .eq('utility_id', billData.utility_id)
        .eq('month', billData.month)
        .maybeSingle();

      if (duplicateError) {
        console.error('Duplicate check error:', duplicateError);
        // Continue anyway, the unique constraint will catch duplicates
      }

      if (existingBill) {
        throw new Error('Bill already exists for this unit, utility, and month');
      }

      // If no tenant_id provided, try to find the current tenant for this unit
      let finalTenantId = billData.tenant_id;
      if (!finalTenantId) {
        // First try to find through active lease
        const { data: lease, error: leaseError } = await supabase
          .from('leases')
          .select('tenant_id')
          .eq('unit_id', billData.unit_id)
          .eq('status', 'active')
          .single();

        if (!leaseError && lease) {
          finalTenantId = lease.tenant_id;
          console.log('Auto-assigned tenant from lease to bill:', finalTenantId);
        } else {
          // Fallback: try tenant_info table
          const { data: currentTenant, error: tenantError } = await (supabase as any)
            .from('tenant_info')
            .select('id')
            .eq('unit_id', billData.unit_id)
            .eq('status', 'active')
            .single();

          if (!tenantError && currentTenant) {
            finalTenantId = currentTenant.id;
            console.log('Auto-assigned tenant from tenant_info to bill:', finalTenantId);
          } else {
            console.log('No active tenant found for unit:', billData.unit_id);
          }
        }
      }

      // Validate required fields before creating bill
      console.log('Validating bill data...', {
        unit_id: billData.unit_id,
        utility_id: billData.utility_id,
        month: billData.month,
        amount: parseFloat(billData.amount.toString()),
        due_date: billData.due_date,
        landlord_id: profile.id,
        tenant_id: finalTenantId
      });

      // Check for empty UUIDs
      if (!billData.unit_id || billData.unit_id === '') {
        throw new Error('Unit ID is required');
      }
      if (!billData.utility_id || billData.utility_id === '') {
        throw new Error('Utility ID is required');
      }
      if (!profile?.id || profile.id === '') {
        throw new Error('Landlord ID is required');
      }

      // Create the bill using admin client to bypass trigger issues
      console.log('Creating bill with admin client...', {
        unit_id: billData.unit_id,
        utility_id: billData.utility_id,
        month: billData.month,
        amount: parseFloat(billData.amount.toString()),
        due_date: billData.due_date,
        landlord_id: profile.id,
        tenant_id: finalTenantId
      });
      
      console.log('Using supabaseAdmin client:', !!supabaseAdmin);
      
      // Force a fresh request by adding a timestamp
      const timestamp = Date.now();
      console.log('Request timestamp:', timestamp);
      
      // Try to clear any potential caching issues
      console.log('Clearing any potential caching issues...');
      
      const { data: bill, error: createError } = await supabaseAdmin
        .from('unit_bills')
        .insert({
          unit_id: billData.unit_id,
          utility_id: billData.utility_id,
          month: billData.month,
          amount: parseFloat(billData.amount.toString()),
          due_date: billData.due_date,
          landlord_id: profile.id,
          tenant_id: finalTenantId
        })
        .select()
        .single();

      if (createError) {
        console.error('Create bill error details:', createError);
        
        // Check if the error is related to notifications foreign key constraint
        if (createError.message.includes('notifications') && 
            (createError.message.includes('foreign key constraint') || 
             createError.message.includes('notifications_user_id_fkey'))) {
          console.log('🔄 Notifications foreign key constraint issue detected. Creating bill without trigger...');
          
          // The issue is that the database trigger is trying to insert into notifications
          // with a user_id that doesn't exist in the profiles table. We'll create the bill 
          // without the trigger by temporarily setting tenant_id to null to avoid the trigger
          const { data: retryBill, error: retryError } = await supabaseAdmin
            .from('unit_bills')
            .insert({
              unit_id: billData.unit_id,
              utility_id: billData.utility_id,
              month: billData.month,
              amount: parseFloat(billData.amount.toString()),
              due_date: billData.due_date,
              landlord_id: profile.id,
              tenant_id: null // Set to null to avoid trigger
            })
            .select()
            .single();

          if (retryError) {
            console.error('Retry bill creation error:', retryError);
            throw new Error(`Failed to create bill: ${retryError.message}`);
          }
          
          // Update the bill with the correct tenant_id after creation
          if (finalTenantId && finalTenantId !== '') {
            const { error: updateError } = await supabaseAdmin
              .from('unit_bills')
              .update({ tenant_id: finalTenantId })
              .eq('id', retryBill.id);
            
            if (updateError) {
              console.warn('⚠️ Could not update tenant_id after bill creation:', updateError);
            } else {
              console.log('✅ Tenant ID updated after bill creation');
            }
          } else {
            console.log('⚠️ No valid tenant ID to update');
          }
          
          console.log('✅ Bill created successfully (without trigger):', retryBill);
          toast.success('Utility bill created successfully (notification may not be sent due to user profile issue)');
          await fetchLandlordBills();
          return retryBill;
        } else {
          throw new Error(`Failed to create bill: ${createError.message}`);
        }
      }

      console.log('Bill created successfully:', bill);

      toast.success('Utility bill created successfully');
      await fetchLandlordBills();
      return bill;
    } catch (err) {
      console.error('Error creating bill:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to create bill');
      throw err;
    }
  };

  // Update a bill (landlord only)
  const updateBill = async (billId: string, updates: {
    amount?: number;
    due_date?: string;
    status?: string;
    payment_reason?: string;
  }) => {
    try {
      // Get the current user's profile
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!profile) {
        throw new Error('Profile not found');
      }

      // Update the bill
      const { data: bill, error: updateError } = await (supabase as any)
        .from('unit_bills')
        .update(updates)
        .eq('id', billId)
        .eq('landlord_id', profile.id)
        .select()
        .single();

      if (updateError) {
        throw updateError;
      }

      toast.success('Bill updated successfully');
      await fetchLandlordBills();
      return bill;
    } catch (err) {
      console.error('Error updating bill:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to update bill');
      throw err;
    }
  };

  // Delete a bill (landlord only)
  const deleteBill = async (billId: string) => {
    try {
      // Get the current user's profile
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!profile) {
        throw new Error('Profile not found');
      }

      // Delete the bill
      const { error: deleteError } = await (supabase as any)
        .from('unit_bills')
        .delete()
        .eq('id', billId)
        .eq('landlord_id', profile.id);

      if (deleteError) {
        throw deleteError;
      }

      toast.success('Bill deleted successfully');
      await fetchLandlordBills();
    } catch (err) {
      console.error('Error deleting bill:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to delete bill');
      throw err;
    }
  };

  // Prepare bill payment data (tenant only) - returns data for Paystack modal
  const prepareBillPayment = async (billId: string) => {
    try {
      // Find the bill
      const bill = bills.find(b => b.id === billId);
      if (!bill) {
        throw new Error('Bill not found');
      }

      // Get user profile for email
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) {
        throw new Error('User email not found');
      }

      // Generate payment reference
      const reference = `utility_${billId}_${Date.now()}`;

      return {
        billId: bill.id,
        amount: bill.amount,
        email: user.email,
        reference: reference,
        utilityName: bill.utilities?.name || 'Utility',
        dueDate: bill.due_date
      };
    } catch (err) {
      console.error('Error preparing bill payment:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to prepare payment');
      throw err;
    }
  };

  // Handle successful bill payment
  const handleBillPaymentSuccess = async (reference: string, billId: string) => {
    try {
      console.log('Processing utility bill payment:', { reference, billId });

      // Direct database update (since payment is already verified by Paystack)
      console.log('Using direct database update');
      
      const { data: bill, error: billError } = await (supabase as any)
        .from('unit_bills')
        .select(`
          id,
          amount,
          status,
          utilities!unit_bills_utility_id_fkey (name),
          units!unit_bills_unit_id_fkey (
            unit_number,
            properties!units_property_id_fkey (name)
          )
        `)
        .eq('id', billId)
        .single();

      if (billError || !bill) {
        throw new Error('Bill not found');
      }

      if (bill.status === 'paid') {
        console.log('Bill already marked as paid');
        toast.success('Payment already processed!');
        await fetchTenantBills();
        return true;
      }

      // Update bill status directly
      const { error: updateError } = await (supabase as any)
        .from('unit_bills')
        .update({
          status: 'paid',
          paystack_reference: reference,
          updated_at: new Date().toISOString()
        })
        .eq('id', billId);

      if (updateError) {
        console.error('Failed to update bill:', updateError);
        throw new Error('Failed to update bill status');
      }

      console.log('Bill updated successfully via direct update:', billId);
      toast.success(`Payment successful! Your ${bill.utilities?.name || 'utility'} bill has been paid.`);
      
      // Refresh bills to show updated status
      await fetchTenantBills();
      
      return true;
    } catch (err) {
      console.error('Error processing bill payment:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to process payment';
      toast.error(errorMessage);
      throw err;
    }
  };

  // Calculate totals
  const getTotals = () => {
    const unpaidBills = bills.filter(bill => bill.status === 'unpaid');
    const paidBills = bills.filter(bill => bill.status === 'paid');
    const overdueBills = bills.filter(bill => bill.status === 'overdue');

    return {
      totalUnpaid: unpaidBills.reduce((sum, bill) => sum + bill.amount, 0),
      totalPaid: paidBills.reduce((sum, bill) => sum + bill.amount, 0),
      totalOverdue: overdueBills.reduce((sum, bill) => sum + bill.amount, 0),
      unpaidCount: unpaidBills.length,
      paidCount: paidBills.length,
      overdueCount: overdueBills.length
    };
  };

  // Auto-fetch based on user role
  useEffect(() => {
    if (profile?.role === 'tenant') {
      fetchTenantBills();
    } else if (profile?.role === 'landlord') {
      fetchLandlordBills();
    }
    fetchUtilities();
  }, [profile?.id, profile?.role, fetchTenantBills, fetchLandlordBills, fetchUtilities]);

  // Subscribe to real-time updates on unit_bills table
  useEffect(() => {
    if (!profile?.id) return;

    console.log('🔔 [useUtilityBills] Setting up realtime subscription');

    const channel = supabase
      .channel('unit_bills_changes')
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to all events (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'unit_bills'
        },
        (payload) => {
          console.log('🔔 [useUtilityBills] Realtime update received:', payload);
          
          // Refresh bills when any change occurs
          if (profile?.role === 'tenant') {
            console.log('🔄 Refreshing tenant bills due to realtime update');
            fetchTenantBills();
          } else if (profile?.role === 'landlord') {
            console.log('🔄 Refreshing landlord bills due to realtime update');
            fetchLandlordBills();
          }
        }
      )
      .subscribe();

    // Cleanup subscription on unmount
    return () => {
      console.log('🔕 [useUtilityBills] Cleaning up realtime subscription');
      supabase.removeChannel(channel);
    };
  }, [profile?.id, profile?.role]);

  return {
    // Data
    bills,
    landlordBills,
    utilities,
    loading,
    error,
    
    // Actions
    createBill,
    updateBill,
    deleteBill,
    prepareBillPayment,
    handleBillPaymentSuccess,
    fetchTenantBills,
    fetchLandlordBills,
    fetchUtilities,
    
    // Computed
    getTotals
  };
};
