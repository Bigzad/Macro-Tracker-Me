if (!window.SubscriptionManager) {
/**
 * SUBSCRIPTION MANAGEMENT SYSTEM
 * 
 * Handles all subscription-related operations:
 * - Plan management and pricing
 * - User subscription status
 * - Coach client limits and overages
 * - Access control and feature gating
 * 
 * Business Model:
 * - B2C: Individual clients ($9.99/month, $79.99/year)
 * - B2B: Coaches with client limits + $2/client overage
 */

class SubscriptionManager {
    constructor() {
        this.supabase = window.supabaseClient;
        this.currentUser = null;
        this.userSubscription = null;
        this.plans = [];
        
        // Cache subscription data for performance
        this.cache = {
            subscription: null,
            plans: null,
            clientCount: null,
            lastUpdated: null
        };
        
        // Initialize when Supabase is ready
        this.init();
    }

    async init() {
        try {
            await this.waitForSupabase();
            await this.loadSubscriptionPlans();
            // Subscription Manager ready
        } catch (error) {
            console.error('❌ Subscription Manager initialization failed:', error);
        }
    }

    async waitForSupabase() {
        let attempts = 0;
        while (!window.supabaseClient && attempts < 50) {
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }
        
        if (!window.supabaseClient) {
            throw new Error('Supabase client not available');
        }
        
        this.supabase = window.supabaseClient;
    }

    // ================================================
    // SUBSCRIPTION PLANS MANAGEMENT
    // ================================================

    async loadSubscriptionPlans() {
        try {
            const { data: plans, error } = await this.supabase
                .from('subscription_plans')
                .select('*')
                .eq('active', true)
                .order('price_cents', { ascending: true });

            if (error) throw error;

            this.plans = plans;
            this.cache.plans = plans;
            this.cache.lastUpdated = new Date();
            
            // Subscription plans loaded
            return plans;
        } catch (error) {
            console.error('Error loading subscription plans:', error);
            return [];
        }
    }

    getPlans() {
        return this.plans;
    }

    getClientPlans() {
        return this.plans.filter(plan => plan.plan_type === 'client');
    }

    getCoachPlans() {
        return this.plans.filter(plan => plan.plan_type === 'coach');
    }

    getPlanByCode(planCode) {
        return this.plans.find(plan => plan.plan_code === planCode);
    }

    // ================================================
    // USER SUBSCRIPTION STATUS
    // ================================================

    async getCurrentUserSubscription() {
        try {
            const { data: { user } } = await this.supabase.auth.getUser();
            if (!user) return null;

            this.currentUser = user;

            const { data: subscription, error } = await this.supabase
                .from('user_subscription_details')
                .select('*')
                .eq('user_id', user.id)
                .single();

            if (error && error.code !== 'PGRST116') { // Not found is OK
                throw error;
            }

            this.userSubscription = subscription;
            this.cache.subscription = subscription;
            
            return subscription;
        } catch (error) {
            console.error('Error fetching user subscription:', error);
            return null;
        }
    }

    async getUserProfile() {
        try {
            const { data: { user } } = await this.supabase.auth.getUser();
            if (!user) return null;

            const { data: profile, error } = await this.supabase
                .from('user_profiles')
                .select('*')
                .eq('user_id', user.id)
                .single();

            if (error) throw error;
            return profile;
        } catch (error) {
            console.error('Error fetching user profile:', error);
            return null;
        }
    }

    // ================================================
    // ACCESS CONTROL & FEATURE GATING
    // ================================================

    async hasActiveSubscription() {
        const subscription = await this.getCurrentUserSubscription();
        return subscription && subscription.subscription_status === 'active';
    }

    async isCoach() {
        const profile = await this.getUserProfile();
        return profile && profile.user_type === 'coach';
    }

    async isClient() {
        const profile = await this.getUserProfile();
        return profile && profile.user_type === 'client';
    }

    async hasFeatureAccess(feature) {
        const subscription = await this.getCurrentUserSubscription();
        
        if (!subscription || subscription.subscription_status !== 'active') {
            return false;
        }

        const plan = this.getPlanByCode(subscription.plan_code);
        if (!plan || !plan.features) return false;

        return plan.features[feature] === true;
    }

    async checkAppAccess() {
        const hasActiveSubscription = await this.hasActiveSubscription();
        const profile = await this.getUserProfile();
        
        // If user has assigned coach, they get free access
        if (profile && profile.assigned_coach_id) {
            return {
                hasAccess: true,
                reason: 'coached_client',
                message: 'Access provided by your coach'
            };
        }

        // Check for active subscription
        if (hasActiveSubscription) {
            return {
                hasAccess: true,
                reason: 'active_subscription',
                message: 'Active subscription'
            };
        }

        // No access
        return {
            hasAccess: false,
            reason: 'no_subscription',
            message: 'Subscription required for app access'
        };
    }

    // ================================================
    // COACH CLIENT MANAGEMENT
    // ================================================

    async getCoachClientCount() {
        try {
            const { data: { user } } = await this.supabase.auth.getUser();
            if (!user) return 0;

            const { count, error } = await this.supabase
                .from('coach_client_assignments')
                .select('*', { count: 'exact', head: true })
                .eq('coach_id', user.id)
                .eq('status', 'active');

            if (error) throw error;
            
            this.cache.clientCount = count;
            return count || 0;
        } catch (error) {
            console.error('Error getting coach client count:', error);
            return 0;
        }
    }

    async getCoachClients() {
        try {
            const { data: { user } } = await this.supabase.auth.getUser();
            if (!user) return [];

            const { data: assignments, error } = await this.supabase
                .from('coach_client_assignments')
                .select(`
                    *,
                    client_profile:user_profiles!coach_client_assignments_client_id_fkey(*)
                `)
                .eq('coach_id', user.id)
                .eq('status', 'active')
                .order('assigned_at', { ascending: false });

            if (error) throw error;
            return assignments || [];
        } catch (error) {
            console.error('Error fetching coach clients:', error);
            return [];
        }
    }

    async canAcceptMoreClients() {
        const subscription = await this.getCurrentUserSubscription();
        if (!subscription || subscription.subscription_status !== 'active') {
            return { canAccept: false, reason: 'No active subscription' };
        }

        const currentClientCount = await this.getCoachClientCount();
        const planLimit = subscription.client_limit;

        if (!planLimit) {
            return { canAccept: false, reason: 'Not a coach plan' };
        }

        const canAccept = currentClientCount < planLimit;
        const overageClients = Math.max(0, currentClientCount - planLimit);

        return {
            canAccept,
            currentCount: currentClientCount,
            planLimit,
            overageClients,
            overageCost: overageClients * 2.00, // $2 per client
            reason: canAccept ? 'Within limit' : 'At plan limit (overage charges apply)'
        };
    }

    // ================================================
    // SUBSCRIPTION OPERATIONS
    // ================================================

    async createStripeCheckoutSession(planCode, successUrl, cancelUrl) {
        try {
            const plan = this.getPlanByCode(planCode);
            if (!plan) throw new Error('Plan not found');

            // This will be implemented when we set up the Stripe webhook
            // For now, return the plan details for checkout
            return {
                plan,
                checkoutUrl: `#checkout-${planCode}`, // Placeholder
                message: 'Stripe integration pending'
            };
        } catch (error) {
            console.error('Error creating checkout session:', error);
            throw error;
        }
    }

    async assignClientToCoach(clientUserId, invitationCode = null) {
        try {
            const { data: { user } } = await this.supabase.auth.getUser();
            if (!user) throw new Error('Coach not authenticated');

            // Check if coach can accept more clients
            const clientCheck = await this.canAcceptMoreClients();
            
            // Allow assignment even if over limit (overage charges will apply)
            const { data: assignment, error } = await this.supabase
                .from('coach_client_assignments')
                .insert({
                    coach_id: user.id,
                    client_id: clientUserId,
                    invitation_code: invitationCode,
                    status: 'active'
                })
                .select()
                .single();

            if (error) throw error;

            // Update client's profile to reflect coach assignment
            const { error: profileError } = await this.supabase
                .from('user_profiles')
                .update({ 
                    assigned_coach_id: user.id,
                    user_type: 'client' 
                })
                .eq('user_id', clientUserId);

            if (profileError) {
                console.warn('Could not update client profile:', profileError);
            }

            return assignment;
        } catch (error) {
            console.error('Error assigning client to coach:', error);
            throw error;
        }
    }

    // ================================================
    // PRICING & CALCULATIONS
    // ================================================

    formatPrice(cents) {
        return (cents / 100).toLocaleString('en-US', {
            style: 'currency',
            currency: 'USD'
        });
    }

    calculateAnnualSavings() {
        const monthlyPlan = this.getPlanByCode('client_monthly');
        const annualPlan = this.getPlanByCode('client_annual');
        
        if (!monthlyPlan || !annualPlan) return 0;
        
        const monthlyTotal = monthlyPlan.price_cents * 12;
        const savings = monthlyTotal - annualPlan.price_cents;
        
        return savings; // Savings in cents
    }

    // ================================================
    // UI HELPER METHODS
    // ================================================

    async renderSubscriptionStatus() {
        const subscription = await this.getCurrentUserSubscription();
        const access = await this.checkAppAccess();
        
        return {
            subscription,
            access,
            isCoach: await this.isCoach(),
            clientCount: await this.getCoachClientCount(),
            canAcceptClients: await this.canAcceptMoreClients()
        };
    }

    // ================================================
    // SUBSCRIPTION MIDDLEWARE FOR ACCESS CONTROL
    // ================================================

    async enforceSubscriptionAccess(feature = 'app_access') {
        const access = await this.checkAppAccess();
        
        if (!access.hasAccess) {
            // Redirect to subscription page or show modal
            this.showSubscriptionRequiredModal(access.message);
            return false;
        }

        // Check specific feature access if provided
        if (feature !== 'app_access') {
            const hasFeature = await this.hasFeatureAccess(feature);
            if (!hasFeature) {
                this.showUpgradeRequiredModal(feature);
                return false;
            }
        }

        return true;
    }

    showSubscriptionRequiredModal(message) {
        // This will be implemented with UI components
        console.warn('Subscription required:', message);
        
        // For now, redirect to a subscription page
        if (window.location.pathname !== '/index.html') {
            window.location.href = '/subscription-required.html';
        }
    }

    showUpgradeRequiredModal(feature) {
        console.warn('Feature upgrade required:', feature);
        // Show upgrade modal or redirect
    }
}

// ================================================
// GLOBAL INITIALIZATION
// ================================================

// Initialize subscription manager when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    if (!window.subscriptionManager) {
        window.subscriptionManager = new SubscriptionManager();
    }
});

// Also initialize if DOM is already loaded
if (document.readyState === 'loading') {
    // Wait for DOM content loaded
} else {
    // DOM already loaded
    if (!window.subscriptionManager) {
        window.subscriptionManager = new SubscriptionManager();
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SubscriptionManager;
}
  window.SubscriptionManager = SubscriptionManager;
}
