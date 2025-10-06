import { supabase } from '@/integrations/supabase/client';

export interface WelcomeEmailData {
  email: string;
  password: string;
  tenantName: string;
  landlordName: string;
}

export class EmailService {
  /**
   * Send welcome email to new tenant
   */
  static async sendWelcomeEmail(data: WelcomeEmailData) {
    try {
      // Option 1: Use Supabase Edge Function
      const { data: result, error } = await supabase.functions.invoke('send-welcome-email', {
        body: data
      });

      if (error) {
        console.error('Error calling email function:', error);
        return { success: false, error: error.message };
      }

      return { success: true, data: result };
    } catch (error) {
      console.error('Error in sendWelcomeEmail:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Send password reset email
   */
  static async sendPasswordResetEmail(email: string) {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`
      });

      if (error) {
        console.error('Error sending password reset:', error);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      console.error('Error in sendPasswordResetEmail:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Send payment confirmation email
   */
  static async sendPaymentConfirmationEmail(data: {
    email: string;
    tenantName: string;
    amount: number;
    paymentDate: string;
    transactionId: string;
  }) {
    try {
      // This would integrate with your email service
      console.log('Payment confirmation email would be sent:', data);
      
      // Example implementation:
      // const emailData = {
      //   to: data.email,
      //   subject: 'Payment Confirmation',
      //   html: `
      //     <h2>Payment Confirmed</h2>
      //     <p>Hello ${data.tenantName},</p>
      //     <p>Your payment of $${data.amount} has been confirmed.</p>
      //     <p>Transaction ID: ${data.transactionId}</p>
      //     <p>Date: ${data.paymentDate}</p>
      //   `
      // };
      
      return { success: true };
    } catch (error) {
      console.error('Error in sendPaymentConfirmationEmail:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }
}
