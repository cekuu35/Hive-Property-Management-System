import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
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
  const fetchUtilities = async () => {
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
  };

  // Fetch tenant bills
  const fetchTenantBills = async () => {
    if (!profile?.id) {
      console.log('🔍 [fetchTenantBills] No profile ID, skipping fetch');
      return;
    }

    try {
      console.log('🔍 [fetchTenantBills] Starting fetch for profile:', profile.id);
      setLoading(true);
      setError(null);

      const { data: { session } } = await supabase.auth.getSession();
      console.log('🔍 [fetchTenantBills] Session exists:', !!session?.access_token);
      
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "https://kozhlejudselgtmohdfm.supabase.co";
      const requestUrl = `${supabaseUrl}/functions/v1/utility-bills/api/tenant/bills`;
      
      console.log('🔍 [fetchTenantBills] Request URL:', requestUrl);
      
      const response = await fetch(requestUrl, {
        headers: {
          'Authorization': `Bearer ${session?.access_token}`
        }
      });

      console.log('🔍 [fetchTenantBills] Response status:', response.status);
      
      const result = await response.json();
      console.log('🔍 [fetchTenantBills] Response data:', result);

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch bills');
      }

      console.log('🔍 [fetchTenantBills] Setting bills:', result.bills?.length || 0);
      setBills(result.bills || []);
    } catch (err) {
      console.error('❌ [fetchTenantBills] Error:', err);
      setError('Failed to load utility bills');
    } finally {
      setLoading(false);
    }
  };

  // Fetch landlord bills
  const fetchLandlordBills = async () => {
    if (!profile?.id) return;

    try {
      setLoading(true);
      setError(null);

      const { data: { session } } = await supabase.auth.getSession();
      
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "https://kozhlejudselgtmohdfm.supabase.co";
      
      const response = await fetch(`${supabaseUrl}/functions/v1/utility-bills/api/landlord/bills`, {
        headers: {
          'Authorization': `Bearer ${session?.access_token}`
        }
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch bills');
      }

      setLandlordBills(result.bills || []);
    } catch (err) {
      console.error('Error fetching landlord bills:', err);
      setError('Failed to load utility bills');
    } finally {
      setLoading(false);
    }
  };

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
      const { data: { session } } = await supabase.auth.getSession();
      
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "https://kozhlejudselgtmohdfm.supabase.co";
      const requestUrl = `${supabaseUrl}/functions/v1/utility-bills/api/landlord/bills`;
      
      console.log('🔍 Creating bill:', {
        url: requestUrl,
        billData,
        hasSession: !!session?.access_token
      });
      
      const response = await fetch(requestUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify(billData)
      });

      if (!response.ok) {
        let errorMessage = 'Failed to create bill';
        try {
          const result = await response.json();
          errorMessage = result.error || errorMessage;
        } catch (e) {
          errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        }
        throw new Error(errorMessage);
      }

      const result = await response.json();

      toast.success('Utility bill created successfully');
      await fetchLandlordBills();
      return result.bill;
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
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL || "https://kozhlejudselgtmohdfm.supabase.co"}/functions/v1/utility-bills/api/landlord/bills/${billId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify(updates)
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to update bill');
      }

      toast.success('Bill updated successfully');
      await fetchLandlordBills();
      return result.bill;
    } catch (err) {
      console.error('Error updating bill:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to update bill');
      throw err;
    }
  };

  // Delete a bill (landlord only)
  const deleteBill = async (billId: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL || "https://kozhlejudselgtmohdfm.supabase.co"}/functions/v1/utility-bills/api/landlord/bills/${billId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`
        }
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to delete bill');
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

      const { data: { session } } = await supabase.auth.getSession();
      const supabaseUrl = "https://kozhlejudselgtmohdfm.supabase.co";
      
      // Call verify-payment edge function to update bill status
      const verifyResponse = await fetch(`${supabaseUrl}/functions/v1/verify-payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({
          reference: reference,
          type: 'utility',
          bill_id: billId
        })
      });

      const verifyResult = await verifyResponse.json();

      if (!verifyResponse.ok || !verifyResult.success) {
        throw new Error(verifyResult.error || 'Payment verification failed');
      }

      toast.success(`Payment successful! Your ${verifyResult.bill?.utility_name || 'utility'} bill has been paid.`);
      
      // Refresh bills to show updated status
      await fetchTenantBills();
      
      return true;
    } catch (err) {
      console.error('Error processing bill payment:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to process payment');
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
  }, [profile?.id, profile?.role]);

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
