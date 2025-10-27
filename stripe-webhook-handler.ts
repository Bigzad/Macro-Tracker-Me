import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

// Stripe webhook signature verification
const STRIPE_WEBHOOK_SECRET = Deno.env.get('STRIPE_WEBHOOK_SECRET');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, stripe-signature',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // Only accept POST requests
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { 
      status: 405, 
      headers: corsHeaders 
    });
  }

  try {
    console.log('🎯 Stripe webhook received');

    // Initialize Supabase Admin Client
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

    // Get raw request body and signature
    const body = await req.text();
    const signature = req.headers.get('stripe-signature');

    if (!signature || !STRIPE_WEBHOOK_SECRET) {
      console.error('❌ Missing webhook signature or secret');
      return new Response('Webhook signature required', { 
        status: 400, 
        headers: corsHeaders 
      });
    }

    // Parse webhook event (Stripe signature verification would go here)
    let event;
    try {
      event = JSON.parse(body);
      console.log('📦 Webhook event type:', event.type);
    } catch (err) {
      console.error('❌ Invalid JSON in webhook body');
      return new Response('Invalid JSON', { 
        status: 400, 
        headers: corsHeaders 
      });
    }

    // Log webhook event for debugging
    const { error: logError } = await supabaseAdmin
      .from('webhook_events')
      .insert({
        stripe_event_id: event.id,
        event_type: event.type,
        data: event,
        processed: false
      });

    if (logError) {
      console.warn('⚠️ Could not log webhook event:', logError);
    }

    // Process webhook based on event type
    let result;
    switch (event.type) {
      case 'checkout.session.completed':
        result = await handleCheckoutSessionCompleted(event.data.object, supabaseAdmin);
        break;
        
      case 'customer.subscription.created':
        result = await handleSubscriptionCreated(event.data.object, supabaseAdmin);
        break;
        
      case 'customer.subscription.updated':
        result = await handleSubscriptionUpdated(event.data.object, supabaseAdmin);
        break;
        
      case 'customer.subscription.deleted':
        result = await handleSubscriptionDeleted(event.data.object, supabaseAdmin);
        break;
        
      case 'invoice.payment_succeeded':
        result = await handleInvoicePaymentSucceeded(event.data.object, supabaseAdmin);
        break;
        
      case 'invoice.payment_failed':
        result = await handleInvoicePaymentFailed(event.data.object, supabaseAdmin);
        break;
        
      default:
        console.log('ℹ️ Unhandled webhook event type:', event.type);
        result = { processed: true, message: 'Event type not handled' };
    }

    // Mark webhook as processed
    await supabaseAdmin
      .from('webhook_events')
      .update({ 
        processed: true, 
        processed_at: new Date().toISOString() 
      })
      .eq('stripe_event_id', event.id);

    console.log('✅ Webhook processed successfully:', event.type);
    
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });

  } catch (error) {
    console.error('❌ Webhook processing error:', error);
    
    return new Response(JSON.stringify({
      error: 'Webhook processing failed',
      details: error.message
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }
});

// ================================================
// WEBHOOK EVENT HANDLERS
// ================================================

async function handleCheckoutSessionCompleted(session, supabase) {
  console.log('🛒 Processing checkout session completed');
  
  try {
    const customerId = session.customer;
    const subscriptionId = session.subscription;
    const customerEmail = session.customer_details?.email;
    
    // Get user by email
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('user_id, email')
      .eq('email', customerEmail)
      .single();

    if (profileError || !profile) {
      console.error('❌ User not found for email:', customerEmail);
      return { processed: false, error: 'User not found' };
    }

    // Update user profile with Stripe customer ID
    const { error: updateError } = await supabase
      .from('user_profiles')
      .update({ 
        stripe_customer_id: customerId,
        subscription_status: 'active'
      })
      .eq('user_id', profile.user_id);

    if (updateError) {
      console.error('❌ Error updating user profile:', updateError);
    }

    console.log('✅ Checkout session processed for user:', profile.user_id);
    
    // Send welcome email via auto-invite system
    await sendWelcomeEmail(profile.email, profile.user_id);
    
    return { 
      processed: true, 
      userId: profile.user_id,
      customerId,
      subscriptionId
    };
    
  } catch (error) {
    console.error('❌ Error processing checkout session:', error);
    return { processed: false, error: error.message };
  }
}

async function handleSubscriptionCreated(subscription, supabase) {
  console.log('📝 Processing subscription created');
  
  try {
    const customerId = subscription.customer;
    const subscriptionId = subscription.id;
    const priceId = subscription.items.data[0]?.price?.id;
    
    // Find user by Stripe customer ID
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('user_id')
      .eq('stripe_customer_id', customerId)
      .single();

    if (profileError || !profile) {
      console.error('❌ User not found for customer ID:', customerId);
      return { processed: false, error: 'User not found' };
    }

    // Find subscription plan by Stripe price ID
    const { data: plan, error: planError } = await supabase
      .from('subscription_plans')
      .select('*')
      .eq('stripe_price_id', priceId)
      .single();

    if (planError || !plan) {
      console.error('❌ Plan not found for price ID:', priceId);
      return { processed: false, error: 'Plan not found' };
    }

    // Create user subscription record
    const { data: userSubscription, error: subError } = await supabase
      .from('user_subscriptions')
      .insert({
        user_id: profile.user_id,
        subscription_plan_id: plan.id,
        stripe_subscription_id: subscriptionId,
        stripe_customer_id: customerId,
        status: subscription.status,
        current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
        current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
        trial_end: subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null
      })
      .select()
      .single();

    if (subError) {
      console.error('❌ Error creating user subscription:', subError);
      return { processed: false, error: subError.message };
    }

    // Update user profile with subscription info
    const { error: updateError } = await supabase
      .from('user_profiles')
      .update({
        subscription_status: 'active',
        subscription_expires_at: new Date(subscription.current_period_end * 1000).toISOString(),
        user_type: plan.plan_type // 'client' or 'coach'
      })
      .eq('user_id', profile.user_id);

    if (updateError) {
      console.error('❌ Error updating user profile:', updateError);
    }

    console.log('✅ Subscription created for user:', profile.user_id);
    
    return { 
      processed: true, 
      userId: profile.user_id,
      subscriptionId: userSubscription.id,
      planCode: plan.plan_code
    };
    
  } catch (error) {
    console.error('❌ Error processing subscription created:', error);
    return { processed: false, error: error.message };
  }
}

async function handleSubscriptionUpdated(subscription, supabase) {
  console.log('📝 Processing subscription updated');
  
  try {
    const subscriptionId = subscription.id;
    
    // Update user subscription status
    const { error: updateError } = await supabase
      .from('user_subscriptions')
      .update({
        status: subscription.status,
        current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
        current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
        cancel_at_period_end: subscription.cancel_at_period_end || false,
        updated_at: new Date().toISOString()
      })
      .eq('stripe_subscription_id', subscriptionId);

    if (updateError) {
      console.error('❌ Error updating subscription:', updateError);
      return { processed: false, error: updateError.message };
    }

    // Update user profile subscription status
    const subscriptionStatus = subscription.status === 'active' ? 'active' : 
                              subscription.status === 'canceled' ? 'canceled' : 
                              subscription.status === 'past_due' ? 'expired' : 'inactive';

    const { error: profileError } = await supabase
      .rpc('update_user_profile_by_subscription', {
        stripe_subscription_id: subscriptionId,
        new_status: subscriptionStatus,
        expires_at: new Date(subscription.current_period_end * 1000).toISOString()
      });

    if (profileError) {
      console.error('❌ Error updating user profile status:', profileError);
    }

    console.log('✅ Subscription updated:', subscriptionId);
    
    return { processed: true, subscriptionId, status: subscription.status };
    
  } catch (error) {
    console.error('❌ Error processing subscription updated:', error);
    return { processed: false, error: error.message };
  }
}

async function handleSubscriptionDeleted(subscription, supabase) {
  console.log('🗑️ Processing subscription deleted');
  
  try {
    const subscriptionId = subscription.id;
    
    // Mark subscription as canceled
    const { error: updateError } = await supabase
      .from('user_subscriptions')
      .update({
        status: 'canceled',
        updated_at: new Date().toISOString()
      })
      .eq('stripe_subscription_id', subscriptionId);

    if (updateError) {
      console.error('❌ Error marking subscription as canceled:', updateError);
      return { processed: false, error: updateError.message };
    }

    // Update user profile
    const { error: profileError } = await supabase
      .rpc('update_user_profile_by_subscription', {
        stripe_subscription_id: subscriptionId,
        new_status: 'canceled',
        expires_at: new Date().toISOString()
      });

    if (profileError) {
      console.error('❌ Error updating user profile on cancellation:', profileError);
    }

    console.log('✅ Subscription canceled:', subscriptionId);
    
    return { processed: true, subscriptionId, status: 'canceled' };
    
  } catch (error) {
    console.error('❌ Error processing subscription deleted:', error);
    return { processed: false, error: error.message };
  }
}

async function handleInvoicePaymentSucceeded(invoice, supabase) {
  console.log('💳 Processing successful payment');
  
  try {
    const subscriptionId = invoice.subscription;
    
    if (subscriptionId) {
      // Update subscription status to active
      const { error: updateError } = await supabase
        .from('user_subscriptions')
        .update({
          status: 'active',
          updated_at: new Date().toISOString()
        })
        .eq('stripe_subscription_id', subscriptionId);

      if (updateError) {
        console.error('❌ Error updating subscription after payment:', updateError);
      }

      // Update user profile status
      const { error: profileError } = await supabase
        .rpc('update_user_profile_by_subscription', {
          stripe_subscription_id: subscriptionId,
          new_status: 'active'
        });

      if (profileError) {
        console.error('❌ Error updating user profile after payment:', profileError);
      }
    }

    console.log('✅ Payment processed successfully');
    
    return { processed: true, invoiceId: invoice.id };
    
  } catch (error) {
    console.error('❌ Error processing successful payment:', error);
    return { processed: false, error: error.message };
  }
}

async function handleInvoicePaymentFailed(invoice, supabase) {
  console.log('❌ Processing failed payment');
  
  try {
    const subscriptionId = invoice.subscription;
    
    if (subscriptionId) {
      // Update subscription status to past_due
      const { error: updateError } = await supabase
        .from('user_subscriptions')
        .update({
          status: 'past_due',
          updated_at: new Date().toISOString()
        })
        .eq('stripe_subscription_id', subscriptionId);

      if (updateError) {
        console.error('❌ Error updating subscription after failed payment:', updateError);
      }

      // Update user profile status
      const { error: profileError } = await supabase
        .rpc('update_user_profile_by_subscription', {
          stripe_subscription_id: subscriptionId,
          new_status: 'expired'
        });

      if (profileError) {
        console.error('❌ Error updating user profile after failed payment:', profileError);
      }
    }

    console.log('⚠️ Payment failed processed');
    
    return { processed: true, invoiceId: invoice.id, status: 'failed' };
    
  } catch (error) {
    console.error('❌ Error processing failed payment:', error);
    return { processed: false, error: error.message };
  }
}

// ================================================
// HELPER FUNCTIONS
// ================================================

async function sendWelcomeEmail(email, userId) {
  try {
    // This would integrate with your existing email system
    console.log('📧 Sending welcome email to:', email);
    
    // Use your existing InvitationEmailSender if needed
    // or implement a welcome email template
    
    return { sent: true };
  } catch (error) {
    console.error('❌ Error sending welcome email:', error);
    return { sent: false, error: error.message };
  }
}