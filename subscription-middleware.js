/**
 * SUBSCRIPTION ACCESS MIDDLEWARE
 * 
 * Middleware layer for enforcing subscription-based access control
 * Integrates with existing security middleware and auth systems
 * 
 * Features:
 * - Subscription status checking
 * - Feature-based access control
 * - Coach client limit enforcement
 * - Graceful degradation and user messaging
 */

class SubscriptionMiddleware {
    constructor() {
        this.subscriptionManager = null;
        this.enabled = true; // Feature flag for gradual rollout
        this.bypassMode = false; // Development mode bypass
        
        this.init();
    }

    async init() {
        try {
            // Wait for subscription manager to be available
            await this.waitForSubscriptionManager();
            // Subscription Middleware ready
        } catch (error) {
            console.error('❌ Subscription Middleware initialization failed:', error);
            this.enabled = false; // Fail gracefully
        }
    }

    async waitForSubscriptionManager() {
        let attempts = 0;
        while (!window.subscriptionManager && attempts < 50) {
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }
        
        if (window.subscriptionManager) {
            this.subscriptionManager = window.subscriptionManager;
        } else {
            throw new Error('Subscription Manager not available');
        }
    }

    // ================================================
    // MIDDLEWARE INTERCEPTORS
    // ================================================

    /**
     * Main access control interceptor
     * Call this before any protected operation
     */
    async checkAccess(options = {}) {
        // Skip check if middleware is disabled or in bypass mode
        if (!this.enabled || this.bypassMode) {
            return { 
                allowed: true, 
                reason: 'middleware_disabled',
                message: 'Access control disabled'
            };
        }

        try {
            const {
                feature = 'app_access',
                redirectOnFail = true,
                showModal = true,
                customMessage = null
            } = options;

            // Basic app access check
            const access = await this.subscriptionManager.checkAppAccess();
            
            if (!access.hasAccess) {
                if (redirectOnFail || showModal) {
                    await this.handleAccessDenied(access, customMessage);
                }
                
                return {
                    allowed: false,
                    reason: access.reason,
                    message: access.message
                };
            }

            // Feature-specific access check
            if (feature !== 'app_access') {
                const hasFeature = await this.subscriptionManager.hasFeatureAccess(feature);
                
                if (!hasFeature) {
                    if (showModal) {
                        await this.handleFeatureUpgradeRequired(feature);
                    }
                    
                    return {
                        allowed: false,
                        reason: 'feature_not_available',
                        message: `Feature '${feature}' requires upgrade`
                    };
                }
            }

            return {
                allowed: true,
                reason: 'subscription_valid',
                message: 'Access granted'
            };
            
        } catch (error) {
            console.error('Error checking subscription access:', error);
            
            // Fail open in case of errors (graceful degradation)
            return {
                allowed: true,
                reason: 'check_failed',
                message: 'Access check failed, allowing access'
            };
        }
    }

    /**
     * Intercept navigation/page loads
     */
    async interceptPageLoad() {
        // Skip subscription check for certain pages
        const currentPath = window.location.pathname;
        const publicPages = [
            '/index.html',
            '/password-reset.html',
            '/access-denied.html',
            '/subscription-required.html',
            '/privacy-policy.html',
            '/terms-of-service.html',
            '/disclaimer.html'
        ];

        if (publicPages.includes(currentPath) || currentPath === '/') {
            return true;
        }

        // Check subscription access for protected pages
        const access = await this.checkAccess({
            feature: 'app_access',
            redirectOnFail: true
        });

        return access.allowed;
    }

    /**
     * Intercept API/database operations
     */
    async interceptDatabaseOperation(operation = 'read') {
        const featureMap = {
            'read': 'app_access',
            'write': 'app_access',
            'export': 'data_export',
            'analytics': 'advanced_analytics',
            'coach_dashboard': 'client_management'
        };

        const requiredFeature = featureMap[operation] || 'app_access';
        
        const access = await this.checkAccess({
            feature: requiredFeature,
            redirectOnFail: false,
            showModal: true
        });

        return access.allowed;
    }

    // ================================================
    // COACH-SPECIFIC MIDDLEWARE
    // ================================================

    /**
     * Check if coach can accept new clients
     */
    async checkCoachClientLimit(showWarning = true) {
        try {
            const isCoach = await this.subscriptionManager.isCoach();
            if (!isCoach) {
                return { allowed: false, reason: 'not_coach' };
            }

            const clientCheck = await this.subscriptionManager.canAcceptMoreClients();
            
            if (!clientCheck.canAccept && showWarning) {
                await this.handleClientLimitReached(clientCheck);
            }

            return {
                allowed: clientCheck.canAccept,
                ...clientCheck
            };
            
        } catch (error) {
            console.error('Error checking coach client limit:', error);
            return { allowed: true, reason: 'check_failed' };
        }
    }

    /**
     * Enforce client limit on invitation acceptance
     */
    async interceptClientInvitation(clientData) {
        const limitCheck = await this.checkCoachClientLimit(false);
        
        if (!limitCheck.allowed) {
            // Show overage confirmation dialog
            const allowOverage = await this.showOverageConfirmation(limitCheck);
            
            if (!allowOverage) {
                throw new Error('Client limit reached and overage declined');
            }
        }

        return true;
    }

    // ================================================
    // USER INTERACTION HANDLERS
    // ================================================

    async handleAccessDenied(access, customMessage = null) {
        const message = customMessage || access.message || 'Subscription required';
        
        console.warn('🚫 Access denied:', access.reason);
        
        // Show appropriate UI based on reason
        switch (access.reason) {
            case 'no_subscription':
                this.redirectToSubscriptionPage();
                break;
                
            case 'coached_client':
                // This shouldn't happen, but handle gracefully
                console.warn('Coached client denied access unexpectedly');
                break;
                
            default:
                this.showAccessDeniedModal(message);
        }
    }

    async handleFeatureUpgradeRequired(feature) {
        console.warn('🔒 Feature upgrade required:', feature);
        this.showUpgradeModal(feature);
    }

    async handleClientLimitReached(limitInfo) {
        console.warn('👥 Client limit reached:', limitInfo);
        this.showClientLimitModal(limitInfo);
    }

    // ================================================
    // UI MODAL/REDIRECT METHODS
    // ================================================

    redirectToSubscriptionPage() {
        // Create subscription required page if it doesn't exist
        window.location.href = 'subscription-required.html';
    }

    showAccessDeniedModal(message) {
        // Use existing modal system or create simple alert
        if (window.showNotification) {
            window.showNotification(message, 'error', 5000);
        } else {
            alert(`Access Denied: ${message}`);
        }
    }

    showUpgradeModal(feature) {
        const message = `This feature requires a plan upgrade. Feature: ${feature}`;
        
        if (window.showNotification) {
            window.showNotification(message, 'warning', 7000);
        } else {
            const upgrade = confirm(`${message}\n\nWould you like to upgrade now?`);
            if (upgrade) {
                this.redirectToSubscriptionPage();
            }
        }
    }

    showClientLimitModal(limitInfo) {
        const message = `You've reached your plan limit of ${limitInfo.planLimit} clients. ` +
                       `Current clients: ${limitInfo.currentCount}. ` +
                       `Additional clients cost $2/month each.`;
        
        if (window.showNotification) {
            window.showNotification(message, 'info', 10000);
        } else {
            alert(message);
        }
    }

    async showOverageConfirmation(limitInfo) {
        const message = `You're at your plan limit (${limitInfo.planLimit} clients). ` +
                       `Adding more clients will cost $2/client/month. ` +
                       `Current overage cost: $${limitInfo.overageCost.toFixed(2)}/month. ` +
                       `Continue?`;
        
        return confirm(message);
    }

    // ================================================
    // INTEGRATION WITH EXISTING SYSTEMS
    // ================================================

    /**
     * Integrate with existing security middleware
     */
    enhanceSecurityMiddleware() {
        if (window.securityMiddleware) {
            console.log('🔗 Integrating with existing security middleware');
            
            // Store original fetch function if not already stored
            if (!window.securityMiddleware.originalFetch) {
                window.securityMiddleware.originalFetch = window.fetch;
            }

            // Wrap with subscription checking
            window.fetch = async (url, options = {}) => {
                // Check if this is a protected database operation
                if (url.includes('supabase.co') || url.includes('/api/')) {
                    const allowed = await this.interceptDatabaseOperation('read');
                    if (!allowed) {
                        throw new Error('Subscription required for this operation');
                    }
                }

                // Call original or security-wrapped fetch
                return window.securityMiddleware.originalFetch(url, options);
            };
        }
    }

    /**
     * Auto-check access on page load
     */
    setupPageLoadInterceptor() {
        // Check access when DOM is ready
        document.addEventListener('DOMContentLoaded', async () => {
            await this.interceptPageLoad();
        });

        // Check access on navigation (for SPAs)
        window.addEventListener('popstate', async () => {
            await this.interceptPageLoad();
        });
    }

    // ================================================
    // CONFIGURATION AND CONTROLS
    // ================================================

    enableSubscriptionEnforcement() {
        this.enabled = true;
        this.bypassMode = false;
        console.log('✅ Subscription enforcement enabled');
    }

    disableSubscriptionEnforcement() {
        this.enabled = false;
        console.log('⚠️ Subscription enforcement disabled');
    }

    enableBypassMode() {
        this.bypassMode = true;
        console.log('🚧 Subscription bypass mode enabled (development)');
    }

    disableBypassMode() {
        this.bypassMode = false;
        console.log('🔒 Subscription bypass mode disabled');
    }

    // ================================================
    // UTILITY METHODS
    // ================================================

    async getCurrentSubscriptionStatus() {
        if (!this.subscriptionManager) return null;
        
        return await this.subscriptionManager.renderSubscriptionStatus();
    }

    async debugAccessCheck(feature = 'app_access') {
        const status = await this.getCurrentSubscriptionStatus();
        const access = await this.checkAccess({ feature, redirectOnFail: false, showModal: false });
        
        console.table({
            'Feature': feature,
            'Access Allowed': access.allowed,
            'Reason': access.reason,
            'Subscription Status': status?.subscription?.subscription_status || 'none',
            'User Type': status?.subscription?.plan_type || 'unknown',
            'Client Count': status?.clientCount || 0,
            'Middleware Enabled': this.enabled,
            'Bypass Mode': this.bypassMode
        });
        
        return { status, access };
    }
}

// ================================================
// GLOBAL INITIALIZATION AND INTEGRATION
// ================================================

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
    if (!window.subscriptionMiddleware) {
        window.subscriptionMiddleware = new SubscriptionMiddleware();
        
        // Setup automatic integrations
        setTimeout(() => {
            if (window.subscriptionMiddleware) {
                window.subscriptionMiddleware.enhanceSecurityMiddleware();
                window.subscriptionMiddleware.setupPageLoadInterceptor();
            }
        }, 1000);
    }
});

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SubscriptionMiddleware;
}

// Global helper functions for easy access
window.checkSubscriptionAccess = async (feature) => {
    if (window.subscriptionMiddleware) {
        return await window.subscriptionMiddleware.checkAccess({ 
            feature, 
            redirectOnFail: false, 
            showModal: false 
        });
    }
    return { allowed: true, reason: 'middleware_not_ready' };
};

window.requireSubscription = async (feature = 'app_access') => {
    if (window.subscriptionMiddleware) {
        return await window.subscriptionMiddleware.checkAccess({ 
            feature, 
            redirectOnFail: true, 
            showModal: true 
        });
    }
    return { allowed: true, reason: 'middleware_not_ready' };
};