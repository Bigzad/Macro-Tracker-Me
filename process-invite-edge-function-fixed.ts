// FIXED: Supabase Edge Function - process-invite
// Resolved null expires_at validation bug for codes that never expire
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
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
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { token, code, email, password, fullName, invitationType } = await req.json();

    // Validate required fields - need either token OR code
    if ((!token && !code) || !email || !password || !fullName) {
      return new Response(JSON.stringify({
        error: 'Missing required fields: (token OR code), email, password, fullName'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    let userRole = 'client';
    let assignedCoach = null;
    let invitationData = null;

    // Process based on invitation type
    if (code) {
      // INVITATION CODE PROCESSING
      console.log('Processing invitation code:', code);
      
      const { data, error } = await supabaseClient
        .from('invitation_codes')
        .select('*')
        .ilike('code', code)  // Case-insensitive search
        .single();

      if (error || !data) {
        console.error('Invitation code not found:', error);
        return new Response(JSON.stringify({ error: 'Invalid invitation code' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // FIXED: Check if code is still valid (only if expires_at is set)
      if (data.expires_at) {
        const now = new Date();
        const expiresAt = new Date(data.expires_at);
        if (now > expiresAt) {
          return new Response(JSON.stringify({ error: 'This invitation code has expired' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
      }

      if (!data.is_active) {
        return new Response(JSON.stringify({ error: 'This invitation code has been deactivated' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      if (data.usage_count >= data.max_uses && data.max_uses > 0) {
        return new Response(JSON.stringify({ error: 'This invitation code has no remaining uses' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      invitationData = data;
      userRole = 'client';
      assignedCoach = data.coach_email;

    } else if (token) {
      // EMAIL TOKEN PROCESSING
      console.log('Processing email invitation token');
      
      const { data: invitation, error: inviteError } = await supabaseClient
        .from('invites')
        .select('*')
        .eq('token', token)
        .eq('email', email)
        .is('used_at', null)
        .gt('expires_at', new Date().toISOString())
        .single();

      if (inviteError || !invitation) {
        return new Response(JSON.stringify({ error: 'Invalid or expired invitation token' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      invitationData = invitation;
      userRole = 'client';
    }

    // Create user account using Admin client
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        invitation_code: code || null,
        invitation_token: token || null,
        invitation_type: code ? 'code' : 'token'
      }
    });

    if (authError) {
      return new Response(JSON.stringify({ error: 'Failed to create user account: ' + authError.message }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Create user profile
    console.log('Creating user profile with correct column mapping...');
    const { error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .insert({
        user_id: authData.user.id,
        user_email: email,
        user_name: fullName,
        role: userRole,
        computed_role: userRole,
        is_admin: userRole === 'admin',
        assigned_coach: assignedCoach,
        coach_user_id: invitationData?.coach_user_id || null,
        coach_invite_code: code || null,
        assignment_status: assignedCoach ? 'assigned' : 'unassigned',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

    if (profileError) {
      console.error('Profile creation error:', profileError);
      return new Response(JSON.stringify({ error: 'Failed to create user profile: ' + profileError.message }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    } else {
      console.log('✅ User profile created successfully');
    }

    // Create coach assignment if user was assigned to a coach via invitation code
    if (code && invitationData?.coach_user_id) {
      console.log('Creating coach assignment:', {
        coach_id: invitationData.coach_user_id,
        client_id: authData.user.id,
        coach_email: invitationData.coach_email
      });

      const { error: assignmentError } = await supabaseAdmin
        .from('coach_assignments')
        .insert({
          coach_id: invitationData.coach_user_id,
          client_id: authData.user.id,
          assigned_at: new Date().toISOString(),
          is_active: true
        });

      if (assignmentError) {
        console.error('Failed to create coach assignment:', assignmentError);
      } else {
        console.log('✅ Coach assignment created successfully');
      }
    }

    // Mark invitation as used
    if (token) {
      // Mark email invitation as used
      const { error: updateError } = await supabaseClient
        .from('invites')
        .update({
          used_at: new Date().toISOString(),
          used_by: authData.user.id
        })
        .eq('id', invitationData.id);

      if (updateError) {
        console.error('Failed to mark email invitation as used:', updateError);
      } else {
        console.log('✅ Email invitation marked as used');
      }
    } else if (code) {
      // Update invitation code usage
      console.log('Updating invitation code usage:', {
        code: code,
        currentUsage: invitationData.usage_count,
        newUsage: invitationData.usage_count + 1
      });

      const { error: updateError } = await supabaseClient
        .from('invitation_codes')
        .update({
          usage_count: invitationData.usage_count + 1,
          updated_at: new Date().toISOString()
        })
        .eq('code', code);

      if (updateError) {
        console.error('Failed to update invitation code usage:', updateError);
      } else {
        console.log('✅ Successfully updated invitation code usage');
      }
    }

    return new Response(JSON.stringify({
      success: true,
      message: 'User account created successfully',
      user: {
        id: authData.user.id,
        email: email,
        full_name: fullName,
        role: userRole,
        assigned_coach: assignedCoach,
        coach_user_id: invitationData?.coach_user_id || null,
        invitation_type: code ? 'code' : 'token'
      }
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});