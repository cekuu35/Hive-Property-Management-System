import { supabaseAdmin } from '@/integrations/supabase/admin'

interface PaystackVerificationResponse {
  status: boolean
  message: string
  data: {
    status: string
    reference: string
    amount: number
    // ... other Paystack response fields
  }
}

/**
 * Verify a Paystack payment
 * This is used by the frontend to verify payments before redirecting
 * The actual payment recording is handled by the Paystack webhook
 */
export const verifyPaystackPayment = async (reference: string): Promise<{ success: boolean; error?: string }> => {
  try {
    const paystackSecretKey = import.meta.env.VITE_PAYSTACK_SECRET_KEY

    if (!paystackSecretKey) {
      return { success: false, error: 'Payment configuration error' }
    }

    const response = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
      headers: {
        Authorization: `Bearer ${paystackSecretKey}`
      }
    })

    if (!response.ok) {
      return { success: false, error: 'Failed to verify payment' }
    }

    const result: PaystackVerificationResponse = await response.json()

    if (result.status && result.data.status === 'success') {
      return { success: true }
    }

    return { success: false, error: result.message || 'Payment verification failed' }
  } catch (error) {
    console.error('❌ Error verifying payment:', error)
    return { success: false, error: 'Payment verification failed' }
  }
}

/**
 * Update utility bill payment status
 * NOTE: This is a fallback. Primary payment recording is handled by Paystack webhook
 * at supabase/functions/paystack-webhook/index.ts which correctly updates unit_bills
 */
export const updateUtilityBillPayment = async (
  billId: string,
  reference: string,
  amount: number
): Promise<boolean> => {
  try {
    console.log('🔧 Updating utility bill payment status...', { billId, reference, amount })

    const { error: billError } = await supabaseAdmin
      .from('unit_bills')
      .update({
        status: 'paid',
        paystack_reference: reference,
        updated_at: new Date().toISOString()
      })
      .eq('id', billId)

    if (billError) {
      console.error('❌ Error updating utility bill:', billError)
      return false
    }

    console.log('✅ Utility bill updated successfully')
    return true
  } catch (error) {
    console.error('❌ Error updating utility bill payment:', error)
    return false
  }
}

/**
 * Update rent payment
 * NOTE: This is a fallback. Primary payment recording is handled by Paystack webhook
 * at supabase/functions/paystack-webhook/index.ts which correctly updates rent_payments
 * using .update() to avoid duplicates
 */
export const updateRentPayment = async (
  leaseId: string,
  reference: string,
  amount: number
): Promise<boolean> => {
  try {
    console.log('🔧 Updating rent payment status...', { leaseId, reference, amount })
    
    // UPDATE existing pending rent_payment (don't create duplicate)
    // This matches the fix in supabase/functions/mpesa-stk-push/index.ts
    const { error: paymentError } = await supabaseAdmin
      .from('rent_payments')
      .update({
        status: 'paid',
        paid_date: new Date().toISOString(),
        payment_method: 'card',
        transaction_reference: reference,
        updated_at: new Date().toISOString()
      })
      .eq('lease_id', leaseId)
      .eq('status', 'pending')

    if (paymentError) {
      console.error('❌ Error updating rent payment record:', paymentError)
      return false
    }

    console.log('✅ Rent payment updated successfully')
    return true
  } catch (error) {
    console.error('❌ Error updating rent payment:', error)
    return false
  }
}


