-- ================================================
-- SUBSCRIPTION SYSTEM DATABASE SCHEMA (FIXED)
-- Compatible with existing database structure
-- Business Model: B2C Individual Users + B2B Coaches
-- ================================================

-- 1. SUBSCRIPTION PLANS TABLE
-- Defines all available subscription plans with pricing
CREATE TABLE IF NOT EXISTS subscription_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_code TEXT UNIQUE NOT NULL, -- "client_monthly", "coach_starter", etc.
    plan_name TEXT NOT NULL, -- "Client Monthly", "Coach Starter", etc.
    plan_type TEXT NOT NULL CHECK (plan_type IN ('client', 'coach')), -- User type
    billing_cycle TEXT NOT NULL CHECK (billing_cycle IN ('monthly', 'annual')), -- Billing frequency
    price_cents INTEGER NOT NULL, -- Price in cents (e.g., 999 = $9.99)
    currency TEXT NOT NULL DEFAULT 'USD',
    client_limit INTEGER DEFAULT NULL, -- For coach plans: max clients allowed
    stripe_price_id TEXT UNIQUE, -- Stripe Price ID (set when Stripe is configured)
    features JSONB DEFAULT '{}', -- Plan features as JSON
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. USER SUBSCRIPTIONS TABLE
-- Tracks each user's current subscription status
CREATE TABLE IF NOT EXISTS user_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    subscription_plan_id UUID REFERENCES subscription_plans(id),
    stripe_subscription_id TEXT UNIQUE, -- Stripe Subscription ID
    stripe_customer_id TEXT, -- Stripe Customer ID
    status TEXT NOT NULL CHECK (status IN ('active', 'canceled', 'past_due', 'unpaid', 'trialing', 'incomplete')),
    current_period_start TIMESTAMP WITH TIME ZONE,
    current_period_end TIMESTAMP WITH TIME ZONE,
    cancel_at_period_end BOOLEAN DEFAULT false,
    trial_end TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create partial unique index for active subscriptions (FIXED SYNTAX)
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_subscriptions_one_active 
ON user_subscriptions(user_id) 
WHERE status = 'active';

-- 3. SUBSCRIPTION OVERAGES TABLE  
-- Tracks when coaches exceed their client limits ($2/client/month)
CREATE TABLE IF NOT EXISTS subscription_overages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subscription_id UUID REFERENCES user_subscriptions(id) ON DELETE CASCADE,
    billing_period_start TIMESTAMP WITH TIME ZONE NOT NULL,
    billing_period_end TIMESTAMP WITH TIME ZONE NOT NULL,
    plan_client_limit INTEGER NOT NULL, -- What their plan allows
    actual_client_count INTEGER NOT NULL, -- How many clients they actually have
    overage_clients INTEGER NOT NULL, -- actual_client_count - plan_client_limit
    overage_rate_cents INTEGER NOT NULL DEFAULT 200, -- $2.00 per client in cents
    total_overage_cents INTEGER NOT NULL, -- overage_clients * overage_rate_cents
    stripe_invoice_item_id TEXT, -- Stripe invoice item for this overage
    processed BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. WEBHOOK EVENTS LOG TABLE
-- Logs all Stripe webhook events for debugging and audit
CREATE TABLE IF NOT EXISTS webhook_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    stripe_event_id TEXT UNIQUE NOT NULL,
    event_type TEXT NOT NULL,
    processed BOOLEAN DEFAULT false,
    processing_attempts INTEGER DEFAULT 0,
    last_error TEXT,
    data JSONB, -- Full webhook payload
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processed_at TIMESTAMP WITH TIME ZONE
);

-- ================================================
-- EXTEND EXISTING USER PROFILES TABLE
-- Add subscription-related fields using your existing column structure
-- ================================================

DO $$ 
BEGIN
    -- Add subscription_status column if it doesn't exist  
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'user_profiles' AND column_name = 'subscription_status') THEN
        ALTER TABLE user_profiles ADD COLUMN subscription_status TEXT DEFAULT 'inactive'
            CHECK (subscription_status IN ('active', 'inactive', 'trial', 'expired', 'canceled'));
    END IF;
    
    -- Add subscription_expires_at column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'user_profiles' AND column_name = 'subscription_expires_at') THEN
        ALTER TABLE user_profiles ADD COLUMN subscription_expires_at TIMESTAMP WITH TIME ZONE;
    END IF;
    
    -- Add stripe_customer_id column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'user_profiles' AND column_name = 'stripe_customer_id') THEN
        ALTER TABLE user_profiles ADD COLUMN stripe_customer_id TEXT;
    END IF;
    
    -- Note: We'll use existing columns instead of adding new ones:
    -- - computed_role (instead of user_type) 
    -- - coach_user_id (instead of assigned_coach_id)
    -- - user_email (instead of email)
    -- - user_name (instead of full_name)
END $$;

-- ================================================
-- INSERT SUBSCRIPTION PLANS DATA
-- Based on your exact pricing model
-- ================================================

INSERT INTO subscription_plans (plan_code, plan_name, plan_type, billing_cycle, price_cents, client_limit, features) VALUES

-- CLIENT PLANS
('client_monthly', 'Client Monthly', 'client', 'monthly', 999, NULL, '{"app_access": true, "personal_tracking": true, "nutrition_analysis": true, "progress_reports": true}'),
('client_annual', 'Client Annual', 'client', 'annual', 7999, NULL, '{"app_access": true, "personal_tracking": true, "nutrition_analysis": true, "progress_reports": true, "annual_discount": "2_months_free"}'),

-- COACH PLANS
('coach_starter', 'Coach Starter', 'coach', 'monthly', 2900, 5, '{"app_access": true, "client_management": true, "progress_tracking": true, "coach_dashboard": true, "client_invites": true, "max_clients": 5}'),
('coach_pro', 'Coach Pro', 'coach', 'monthly', 5900, 20, '{"app_access": true, "client_management": true, "progress_tracking": true, "coach_dashboard": true, "client_invites": true, "advanced_analytics": true, "bulk_operations": true, "max_clients": 20}'),
('coach_elite', 'Coach Elite', 'coach', 'monthly', 9900, 50, '{"app_access": true, "client_management": true, "progress_tracking": true, "coach_dashboard": true, "client_invites": true, "advanced_analytics": true, "bulk_operations": true, "white_label": true, "priority_support": true, "max_clients": 50}')

ON CONFLICT (plan_code) DO UPDATE SET
    plan_name = EXCLUDED.plan_name,
    price_cents = EXCLUDED.price_cents,
    client_limit = EXCLUDED.client_limit,
    features = EXCLUDED.features,
    updated_at = NOW();

-- ================================================
-- CREATE INDEXES FOR PERFORMANCE
-- ================================================

-- User subscriptions indexes
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_id ON user_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_status ON user_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_stripe_subscription_id ON user_subscriptions(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_period_end ON user_subscriptions(current_period_end);

-- User profiles indexes for new columns
CREATE INDEX IF NOT EXISTS idx_user_profiles_subscription_status ON user_profiles(subscription_status);
CREATE INDEX IF NOT EXISTS idx_user_profiles_coach_user_id ON user_profiles(coach_user_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_computed_role ON user_profiles(computed_role);

-- Webhook events indexes
CREATE INDEX IF NOT EXISTS idx_webhook_events_stripe_event_id ON webhook_events(stripe_event_id);
CREATE INDEX IF NOT EXISTS idx_webhook_events_event_type ON webhook_events(event_type);
CREATE INDEX IF NOT EXISTS idx_webhook_events_processed ON webhook_events(processed);

-- ================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ================================================

-- Enable RLS on new tables
ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_overages ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_events ENABLE ROW LEVEL SECURITY;

-- Subscription Plans - Public read access (plans are public info)
CREATE POLICY "Subscription plans are publicly readable" ON subscription_plans
    FOR SELECT USING (active = true);

-- User Subscriptions - Users can only see their own subscriptions
CREATE POLICY "Users can view their own subscriptions" ON user_subscriptions
    FOR SELECT USING (auth.uid() = user_id);

-- Allow service role to manage subscriptions (for webhooks)
CREATE POLICY "Service role can manage all subscriptions" ON user_subscriptions
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Subscription Overages - Users can only see their own overages  
CREATE POLICY "Users can view their own subscription overages" ON subscription_overages
    FOR SELECT USING (
        auth.uid() IN (
            SELECT user_id FROM user_subscriptions 
            WHERE id = subscription_overages.subscription_id
        )
    );

-- Webhook Events - Service role only
CREATE POLICY "Service role can manage webhook events" ON webhook_events
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- ================================================
-- HELPFUL VIEWS FOR COMMON QUERIES
-- ================================================

-- View: Active Coach Client Count (using existing coach_assignments table)
CREATE OR REPLACE VIEW coach_active_client_count AS
SELECT 
    coach_user_id as coach_id,
    COUNT(*) as active_client_count,
    ARRAY_AGG(user_id) as client_ids
FROM user_profiles 
WHERE coach_user_id IS NOT NULL 
  AND assignment_status = 'assigned'
GROUP BY coach_user_id;

-- View: User Subscription Details (uses existing column names)
CREATE OR REPLACE VIEW user_subscription_details AS
SELECT 
    us.id as subscription_id,
    us.user_id,
    up.user_email as email,
    up.user_name as full_name,
    up.computed_role as user_type,
    sp.plan_code,
    sp.plan_name,
    sp.plan_type,
    sp.billing_cycle,
    sp.price_cents,
    sp.client_limit,
    us.status as subscription_status,
    us.current_period_start,
    us.current_period_end,
    us.stripe_subscription_id,
    us.stripe_customer_id,
    COALESCE(cc.active_client_count, 0) as current_client_count,
    GREATEST(0, COALESCE(cc.active_client_count, 0) - COALESCE(sp.client_limit, 0)) as overage_clients
FROM user_subscriptions us
JOIN user_profiles up ON us.user_id = up.user_id
JOIN subscription_plans sp ON us.subscription_plan_id = sp.id
LEFT JOIN coach_active_client_count cc ON us.user_id = cc.coach_id
WHERE us.status = 'active';

-- ================================================
-- COMPATIBILITY FUNCTIONS
-- Map new system to existing database structure
-- ================================================

-- Function to get coach client count using existing structure
CREATE OR REPLACE FUNCTION get_coach_client_count(coach_uuid UUID)
RETURNS INTEGER AS $$
BEGIN
    RETURN (
        SELECT COUNT(*)
        FROM user_profiles 
        WHERE coach_user_id = coach_uuid 
        AND assignment_status = 'assigned'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to assign client to coach (compatible with existing system)
CREATE OR REPLACE FUNCTION assign_client_to_coach(
    client_uuid UUID,
    coach_uuid UUID,
    invitation_code TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
    -- Update existing user_profiles structure
    UPDATE user_profiles 
    SET 
        coach_user_id = coach_uuid,
        assigned_coach_email = (SELECT user_email FROM user_profiles WHERE user_id = coach_uuid),
        assignment_status = 'assigned',
        coach_assignment_date = NOW(),
        computed_role = 'client'
    WHERE user_id = client_uuid;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update user profile subscription status
CREATE OR REPLACE FUNCTION update_user_profile_by_subscription(
    stripe_subscription_id TEXT,
    new_status TEXT,
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
    UPDATE user_profiles 
    SET 
        subscription_status = new_status,
        subscription_expires_at = COALESCE(expires_at, subscription_expires_at),
        updated_at = NOW()
    WHERE user_id IN (
        SELECT user_id FROM user_subscriptions 
        WHERE user_subscriptions.stripe_subscription_id = update_user_profile_by_subscription.stripe_subscription_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================================
-- SUCCESS MESSAGE
-- ================================================

DO $$ 
BEGIN 
    RAISE NOTICE '✅ Subscription System Database Schema Created Successfully!';
    RAISE NOTICE '🔄 Compatible with existing database structure';
    RAISE NOTICE '📊 Plans Created: Client Monthly ($9.99), Client Annual ($79.99), Coach Starter ($29), Coach Pro ($59), Coach Elite ($99)';
    RAISE NOTICE '🔗 Integrated with existing coach_assignments and user_profiles tables';
    RAISE NOTICE '🔒 RLS Policies Applied for Security';
    RAISE NOTICE '⚡ Indexes Created for Performance';
    RAISE NOTICE '📈 Views Created for Easy Querying';
    RAISE NOTICE '🔧 Helper Functions Created for Compatibility';
END $$;