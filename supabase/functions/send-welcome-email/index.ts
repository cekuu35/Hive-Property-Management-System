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
    const { email, password, tenantName, landlordName, propertyName, unitNumber } = await req.json()

    console.log('📧 Sending welcome email to:', email)

    // Get environment variables
    const brevoApiKey = Deno.env.get('BREVO_API_KEY')
    const siteUrl = Deno.env.get('SITE_URL') || 'https://your-app-url.com'
    const fromEmail = Deno.env.get('FROM_EMAIL') || 'noreply@yourdomain.com'
    const fromName = Deno.env.get('FROM_NAME') || 'Hive Property Management'

    // Create professional email template
    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to Your New Home</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
        <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #f6f9fc; padding: 40px 0;">
          <tr>
            <td align="center">
              <table cellpadding="0" cellspacing="0" border="0" width="600" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                
                <!-- Header -->
                <tr>
                  <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; text-align: center;">
                    <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 700;">🏠 Welcome to Your New Home!</h1>
                  </td>
                </tr>
                
                <!-- Content -->
                <tr>
                  <td style="padding: 40px 30px;">
                    <p style="font-size: 16px; color: #333333; line-height: 1.6; margin: 0 0 20px 0;">
                      Hello <strong>${tenantName}</strong>,
                    </p>
                    
                    <p style="font-size: 16px; color: #333333; line-height: 1.6; margin: 0 0 20px 0;">
                      Great news! Your landlord <strong>${landlordName}</strong> has created a tenant account for you at <strong>${propertyName}${unitNumber ? `, Unit ${unitNumber}` : ''}</strong>.
                    </p>
                    
                    <p style="font-size: 16px; color: #333333; line-height: 1.6; margin: 0 0 30px 0;">
                      You can now access your tenant portal to view your lease, make payments, submit maintenance requests, and more!
                    </p>
                    
                    <!-- Credentials Box -->
                    <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #f8f9fa; border-left: 4px solid #667eea; border-radius: 4px; margin: 0 0 30px 0;">
                      <tr>
                        <td style="padding: 25px;">
                          <h3 style="color: #667eea; margin: 0 0 15px 0; font-size: 18px; font-weight: 600;">
                            🔑 Your Login Credentials
                          </h3>
                          <table cellpadding="0" cellspacing="0" border="0" width="100%">
                            <tr>
                              <td style="padding: 8px 0;">
                                <span style="color: #666666; font-size: 14px;">Email:</span>
                              </td>
                              <td style="padding: 8px 0;">
                                <strong style="color: #333333; font-size: 14px; font-family: 'Courier New', monospace;">${email}</strong>
                              </td>
                            </tr>
                            <tr>
                              <td style="padding: 8px 0;">
                                <span style="color: #666666; font-size: 14px;">Temporary Password:</span>
                              </td>
                              <td style="padding: 8px 0;">
                                <strong style="color: #333333; font-size: 14px; font-family: 'Courier New', monospace; background-color: #fff3cd; padding: 4px 8px; border-radius: 3px;">${password}</strong>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                    
                    <!-- CTA Button -->
                    <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin: 0 0 30px 0;">
                      <tr>
                        <td align="center">
                          <a href="${siteUrl}/login" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; padding: 15px 40px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);">
                            Access Your Tenant Portal →
                          </a>
                        </td>
                      </tr>
                    </table>
                    
                    <!-- Security Notice -->
                    <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #fff3cd; border-radius: 4px; margin: 0 0 20px 0;">
                      <tr>
                        <td style="padding: 15px;">
                          <p style="margin: 0; font-size: 14px; color: #856404; line-height: 1.5;">
                            <strong>⚠️ Important Security Notice:</strong><br>
                            Please change your password immediately after your first login. Never share your credentials with anyone.
                          </p>
                        </td>
                      </tr>
                    </table>
                    
                    <!-- Features -->
                    <p style="font-size: 16px; color: #333333; line-height: 1.6; margin: 0 0 15px 0; font-weight: 600;">
                      What you can do in your portal:
                    </p>
                    <ul style="font-size: 15px; color: #555555; line-height: 1.8; margin: 0 0 30px 0; padding-left: 20px;">
                      <li>View your lease details and documents</li>
                      <li>Make rent payments securely</li>
                      <li>Submit and track maintenance requests</li>
                      <li>Communicate with your landlord</li>
                      <li>View your payment history</li>
                      <li>Manage your profile and settings</li>
                    </ul>
                    
                    <p style="font-size: 16px; color: #333333; line-height: 1.6; margin: 0;">
                      If you have any questions or need assistance, please contact your landlord <strong>${landlordName}</strong>.
                    </p>
                  </td>
                </tr>
                
                <!-- Footer -->
                <tr>
                  <td style="background-color: #f8f9fa; padding: 30px; text-align: center; border-top: 1px solid #e9ecef;">
                    <p style="margin: 0 0 10px 0; font-size: 14px; color: #6c757d;">
                      Welcome to the Hive Property Management System
                    </p>
                    <p style="margin: 0; font-size: 12px; color: #adb5bd;">
                      This is an automated message. Please do not reply to this email.<br>
                      For support, contact your property manager.
                    </p>
                  </td>
                </tr>
                
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `

    // Check if Brevo API key is available
    if (!brevoApiKey) {
      console.warn('⚠️ BREVO_API_KEY not found. Email will not be sent.')
      console.log('Email details:', { email, tenantName, landlordName })
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Email service not configured (credentials logged)',
          logged: true
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      )
    }

    // Send email via Brevo (formerly Sendinblue)
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'api-key': brevoApiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sender: {
          name: fromName,
          email: fromEmail
        },
        to: [
          {
            email: email,
            name: tenantName
          }
        ],
        subject: `🏠 Welcome to ${propertyName} - Your Tenant Portal Access`,
        htmlContent: emailHtml,
      }),
    })

    const responseData = await response.json()

    if (!response.ok) {
      console.error('❌ Brevo API error:', responseData)
      throw new Error(responseData.message || 'Failed to send email')
    }

    console.log('✅ Email sent successfully via Brevo:', responseData)

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Welcome email sent successfully',
        messageId: responseData.messageId 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error) {
    console.error('❌ Error sending welcome email:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'Failed to send email'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})
