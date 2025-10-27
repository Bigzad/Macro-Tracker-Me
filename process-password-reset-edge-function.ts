import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
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
    // Initialize Supabase Admin Client (with service_role key)
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Initialize regular Supabase client for validation
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    // Only accept POST requests
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({
        error: 'Method not allowed'
      }), {
        status: 405,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }

    // Parse request body
    const { action, email, token, new_password } = await req.json();

    console.log(`Processing password reset action: ${action}`);

    // Handle password reset request
    if (action === 'request') {
      console.log(`Password reset request for email: ${email}`);

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return new Response(JSON.stringify({
          error: 'Invalid email address format'
        }), {
          status: 400,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        });
      }

      // Check if user exists in auth.users
      const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.getUserByEmail(email);

      if (authError || !authUser.user) {
        console.log(`User not found for email: ${email}`);
        // For security reasons, don't reveal if email exists or not
        return new Response(JSON.stringify({
          success: true,
          message: 'If this email is registered, you will receive a password reset link.'
        }), {
          status: 200,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        });
      }

      // Generate secure reset token
      const resetToken = crypto.randomUUID();
      
      // Set expiry time (1 hour from now)
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 1);

      // Store reset token in password_resets table
      const { data: resetData, error: resetError } = await supabaseAdmin
        .from('password_resets')
        .insert({
          email: email,
          token: resetToken,
          expires_at: expiresAt.toISOString(),
          user_id: authUser.user.id,
          user_email: email,
          used: false
        })
        .select('*')
        .single();

      if (resetError) {
        console.error('Failed to store reset token:', resetError);
        return new Response(JSON.stringify({
          error: 'Failed to process password reset request'
        }), {
          status: 500,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        });
      }

      console.log(`Reset token created: ${resetToken}`);

      // Create reset link
      const baseUrl = req.headers.get('origin') || Deno.env.get('SITE_URL') || 'https://loquacious-elf-737316.netlify.app';
      const resetLink = `${baseUrl}/password-reset.html?token=${resetToken}`;

      // Send password reset email via EmailJS (handled by frontend)
      // The frontend will call the EmailJS API directly
      
      return new Response(JSON.stringify({
        success: true,
        message: 'Password reset email sent successfully',
        reset_link: resetLink, // Include for frontend to send email
        expires_at: expiresAt.toISOString()
      }), {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }

    // Handle password update
    if (action === 'update') {
      console.log(`Password update request for token: ${token}`);

      if (!token || !email || !new_password) {
        return new Response(JSON.stringify({
          error: 'Missing required parameters'
        }), {
          status: 400,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        });
      }

      // Validate password strength
      if (new_password.length < 6) {
        return new Response(JSON.stringify({
          error: 'Password must be at least 6 characters long'
        }), {
          status: 400,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        });
      }

      // Validate reset token
      const { data: resetRecord, error: tokenError } = await supabaseAdmin
        .from('password_resets')
        .select('*')
        .eq('token', token)
        .eq('email', email)
        .eq('used', false)
        .gt('expires_at', new Date().toISOString())
        .single();

      if (tokenError || !resetRecord) {
        console.error('Invalid or expired token:', tokenError);
        return new Response(JSON.stringify({
          error: 'Invalid or expired reset token'
        }), {
          status: 400,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        });
      }

      console.log(`Valid token found for user: ${resetRecord.user_id}`);

      // Update password in Supabase Auth
      const { data: updateData, error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
        resetRecord.user_id,
        {
          password: new_password,
          email_confirm: true // Ensure email is confirmed
        }
      );

      if (updateError) {
        console.error('Failed to update password:', updateError);
        return new Response(JSON.stringify({
          error: 'Failed to update password'
        }), {
          status: 500,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        });
      }

      // Mark token as used
      const { error: markUsedError } = await supabaseAdmin
        .from('password_resets')
        .update({
          used: true,
          used_at: new Date().toISOString()
        })
        .eq('token', token);

      if (markUsedError) {
        console.error('Failed to mark token as used:', markUsedError);
        // Don't fail the request as password was already updated
      }

      // Optionally: Invalidate all existing sessions for the user
      try {
        await supabaseAdmin.auth.admin.signOut(resetRecord.user_id, 'global');
        console.log('All user sessions invalidated');
      } catch (signOutError) {
        console.warn('Failed to invalidate sessions:', signOutError);
        // Don't fail the request
      }

      console.log(`Password updated successfully for user: ${resetRecord.user_id}`);

      return new Response(JSON.stringify({
        success: true,
        message: 'Password updated successfully'
      }), {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }

    // Invalid action
    return new Response(JSON.stringify({
      error: 'Invalid action parameter'
    }), {
      status: 400,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });

  } catch (error) {
    console.error('Password reset error:', error);
    return new Response(JSON.stringify({
      error: 'Internal server error',
      details: error.message
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }
})