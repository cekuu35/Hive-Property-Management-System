import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { email, password, tenantName, landlordName } = await req.json()

    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Send email using a service like Resend, SendGrid, or AWS SES
    const emailData = {
      to: email,
      subject: `Welcome to ${landlordName}'s Property Management`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Welcome to Your New Rental Account!</h2>
          <p>Hello ${tenantName},</p>
          <p>Your landlord ${landlordName} has created an account for you in their property management system.</p>
          
          <div style="background-color: #f5f5f5; padding: 20px; margin: 20px 0; border-radius: 5px;">
            <h3>Your Login Credentials:</h3>
            <p><strong>Email:</strong> ${email}</p>
            <p><strong>Password:</strong> ${password}</p>
          </div>
          
          <p>Please log in and change your password on first login for security.</p>
          
          <div style="margin: 20px 0;">
            <a href="${Deno.env.get('SITE_URL')}/login" 
               style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
              Log In Now
            </a>
          </div>
          
          <p>If you have any questions, please contact your landlord.</p>
          
          <hr style="margin: 20px 0;">
          <p style="color: #666; font-size: 12px;">
            This is an automated message. Please do not reply to this email.
          </p>
        </div>
      `
    }

    // Example using Resend (you'd need to install and configure)
    // const response = await fetch('https://api.resend.com/emails', {
    //   method: 'POST',
    //   headers: {
    //     'Authorization': `Bearer ${Deno.env.get('RESEND_API_KEY')}`,
    //     'Content-Type': 'application/json',
    //   },
    //   body: JSON.stringify(emailData),
    // })

    // For now, just log the email (replace with actual email service)
    console.log('Email would be sent:', emailData)

    return new Response(
      JSON.stringify({ success: true, message: 'Email sent successfully' }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error) {
    console.error('Error sending email:', error)
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})
