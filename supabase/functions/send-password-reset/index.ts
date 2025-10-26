import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { email } = await req.json()
    console.log('🔐 Password reset requested for:', email)

    const brevoApiKey = Deno.env.get('BREVO_API_KEY')
    const siteUrl = Deno.env.get('SITE_URL') || 'http://localhost:5173'
    const fromEmail = Deno.env.get('FROM_EMAIL') || 'noreply@yourdomain.com'
    const fromName = Deno.env.get('FROM_NAME') || 'Hive Property Management'

    // Create Supabase client with service role to check if user exists
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Check if user exists
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, email, first_name, last_name, user_id')
      .eq('email', email)
      .single()

    if (profileError || !profile) {
      // Don't reveal if email exists for security
      console.log('⚠️ Email not found, but returning success for security')
      return new Response(
        JSON.stringify({
          success: true,
          message: 'If this email exists, a reset link has been sent'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        }
      )
    }

    // Generate a secure reset token
    const resetToken = crypto.randomUUID()
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000) // 1 hour from now

    // Store reset token in database
    const { error: insertError } = await supabase
      .from('password_reset_tokens')
      .insert({
        user_id: profile.user_id,
        token: resetToken,
        expires_at: expiresAt.toISOString(),
        used: false
      })

    if (insertError) {
      console.error('❌ Error storing reset token:', insertError)
      throw new Error('Failed to generate reset token')
    }

    const resetLink = `${siteUrl}/reset-password?token=${resetToken}`
    const userName = profile.first_name ? `${profile.first_name} ${profile.last_name || ''}`.trim() : 'User'

    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f4f4; }
          .container { max-width: 600px; margin: 40px auto; background: #ffffff; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px 30px; text-align: center; }
          .header h1 { margin: 0; font-size: 28px; font-weight: 600; }
          .content { padding: 40px 30px; }
          .content h2 { color: #667eea; margin-top: 0; font-size: 24px; }
          .content p { margin: 15px 0; color: #555; font-size: 16px; }
          .button { display: inline-block; padding: 16px 40px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; border-radius: 8px; font-weight: 600; margin: 25px 0; transition: transform 0.2s; }
          .button:hover { transform: translateY(-2px); }
          .info-box { background-color: #f8f9fa; border-left: 4px solid #667eea; padding: 15px; margin: 20px 0; border-radius: 4px; }
          .footer { background-color: #f8f9fa; padding: 25px 30px; text-align: center; color: #777; font-size: 14px; }
          .warning { color: #e74c3c; font-weight: 600; margin-top: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Reset Your Password</h1>
          </div>
          <div class="content">
            <h2>Hi ${userName},</h2>
            <p>We received a request to reset your password for your <strong>${fromName}</strong> account.</p>
            <p>Click the button below to create a new password:</p>
            <div style="text-align: center;">
              <a href="${resetLink}" class="button">Reset My Password →</a>
            </div>
            <div class="info-box">
              <p style="margin: 0;"><strong>This link expires in 1 hour</strong></p>
            </div>
            <p>Or copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color: #667eea; font-size: 14px;">${resetLink}</p>
            <p class="warning">If you didn't request this password reset, please ignore this email. Your password will remain unchanged.</p>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} ${fromName}. All rights reserved.</p>
            <p>This is an automated message, please do not reply to this email.</p>
          </div>
        </div>
      </body>
      </html>
    `

    if (!brevoApiKey) {
      console.warn('⚠️ BREVO_API_KEY not found. Email will not be sent.')
      console.log('Reset link:', resetLink)
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Email service not configured (link logged)',
          logged: true,
          resetLink: resetLink // Only for testing
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        }
      )
    }

    // Send email via Brevo
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'api-key': brevoApiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sender: { name: fromName, email: fromEmail },
        to: [{ email: email, name: userName }],
        subject: `Reset Your Password - ${fromName}`,
        htmlContent: emailHtml,
        textContent: `Hi ${userName},\n\nWe received a request to reset your password for your ${fromName} account.\n\nClick the link below to create a new password:\n\n${resetLink}\n\nThis link expires in 1 hour.\n\nIf you didn't request this password reset, please ignore this email. Your password will remain unchanged.\n\n© ${new Date().getFullYear()} ${fromName}. All rights reserved.`,
        headers: {
          'X-Priority': '1',
          'Importance': 'high'
        },
        tags: ['password-reset']
      }),
    })

    const responseData = await response.json()

    if (!response.ok) {
      console.error('❌ Brevo API error:', responseData)
      throw new Error(responseData.message || 'Failed to send email')
    }

    console.log('✅ Password reset email sent successfully via Brevo')

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Password reset email sent successfully'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )

  } catch (error) {
    console.error('❌ Error in password reset:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Failed to process password reset request'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})

