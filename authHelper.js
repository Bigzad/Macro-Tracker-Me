/**
 * AUTH HELPER - Simplified for Invite-Only System
 * 
 * Provides centralized authentication helpers for invite-only applications.
 * Handles only authenticated users - no anonymous profiles needed.
 */

// Session-level flags to prevent error spam
window.authTimeoutLogged = false;
window.authErrorCount = 0;

/**
 * Get current authenticated user ID
 * @returns {Promise<string|null>} User UUID or null if not authenticated
 */
async function getCurrentUserId() {
    try {

        
        // Check if supabase client is available
        if (!window.supabaseClient) {
            console.warn('Supabase client not available');
            return null;
        }

        // Enhanced authentication check with timeout and better error handling
        const authPromise = window.supabaseClient.auth.getUser();
        const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Authentication timeout')), 5000) // Reduced timeout
        );

        try {
            const { data, error } = await Promise.race([authPromise, timeoutPromise]);
            
            if (error) {
                console.warn('Error getting current user:', error.message);
                
                // Log to enhanced error handler if available (but only once per session)
                if (window.errorHandler && !window.authTimeoutLogged) {
                    window.errorHandler.logError('AUTH_GET_USER', error, 'medium');
                    window.authTimeoutLogged = true; // Prevent spam
                }
                return null;
            }
            
            const user = data?.user ?? null;
            return user?.id ?? null;
        } catch (timeoutError) {
            // Handle timeout specifically without excessive logging
            if (timeoutError.message.includes('timeout')) {
                console.log('Authentication timeout - user not authenticated');
                
                // Only log timeout error once per session to prevent spam
                if (window.errorHandler && !window.authTimeoutLogged) {
                    window.errorHandler.logError('AUTH_TIMEOUT', timeoutError, 'low');
                    window.authTimeoutLogged = true;
                }
                return null;
            }
            throw timeoutError; // Re-throw non-timeout errors
        }

    } catch (error) {
        // Only log non-timeout errors to reduce console spam
        if (!error.message.includes('timeout')) {
            console.error('Error in getCurrentUserId:', error);
            
            // Log to enhanced error handler if available
            if (window.errorHandler) {
                window.errorHandler.logError('AUTH_GET_USER_ID', error, 'high');
            }
        }
        return null;
    }
}

/**
 * Get current user identifier (simplified for invite-only system)
 * @returns {Promise<Object>} User identifier object
 */
async function getCurrentUserIdentifier() {
    try {
        // Simplified for invite-only system - only handle authenticated users
        const userId = await getCurrentUserId();
        
        if (userId) {
            // Authenticated user
            return {
                user_id: userId,
                is_authenticated: true
            };
        } else {
            // Not authenticated - redirect to login (invite-only system)
            console.warn('User not authenticated - redirecting to login');
            return {
                user_id: null,
                is_authenticated: false,
                requires_login: true
            };
        }
    } catch (error) {
        console.error('Error in getCurrentUserIdentifier:', error);
        
        // Log to enhanced error handler if available
        if (window.errorHandler) {
            window.errorHandler.logError('AUTH_GET_IDENTIFIER', error, 'high');
        }
        
        return {
            user_id: null,
            is_authenticated: false,
            requires_login: true
        };
    }
}

/**
 * Check if user is authenticated
 * @returns {Promise<boolean>}
 */
async function isAuthenticated() {
    const userId = await getCurrentUserId();
    return userId !== null;
}

/**
 * Get user authentication state
 * @returns {Promise<Object>}
 */
async function getAuthState() {
    const userId = await getCurrentUserId();
    return {
        isAuthenticated: userId !== null,
        userId: userId
    };
}

/**
 * Require authentication - redirect to login if not authenticated
 * @returns {Promise<string>} User ID if authenticated
 * @throws {Error} If not authenticated
 */
async function requireAuthentication() {
    const userId = await getCurrentUserId();
    if (!userId) {
        // Redirect to login page for invite-only system
        if (window.location.pathname !== '/index.html' && window.location.pathname !== '/') {
            console.info('User not authenticated, redirecting to login');
            window.location.href = '/index.html';
        }
        throw new Error('Authentication required');
    }
    return userId;
}

/**
 * Require user identifier for operations
 * @returns {Promise<Object>} User identifier object
 * @throws {Error} If not authenticated
 */
async function requireUserIdentifier() {
    const identifier = await getCurrentUserIdentifier();
    if (!identifier.is_authenticated || !identifier.user_id) {
        throw new Error('Authentication required for this operation');
    }
    return identifier;
}

/**
 * Add user identifier to data object (simplified)
 * @param {Object} data - Data object to add user ID to
 * @returns {Promise<Object>} Data with user identifier
 */
async function addUserIdentifierToData(data) {
    const identifier = await getCurrentUserIdentifier();
    
    if (identifier.is_authenticated && identifier.user_id) {
        return {
            ...data,
            user_id: identifier.user_id
        };
    } else {
        throw new Error('Authentication required to save data');
    }
}

/**
 * Create insert payload with user authentication (simplified)
 * @param {Object} data - Data to insert
 * @param {boolean} requireAuth - Whether authentication is required
 * @returns {Promise<Object>} Insert payload
 */
async function createInsertPayload(data, requireAuth = true) {
    if (requireAuth) {
        const identifier = await requireUserIdentifier();
        return {
            ...data,
            user_id: identifier.user_id
        };
    } else {
        return await addUserIdentifierToData(data);
    }
}

/**
 * Get user query filter for database operations (simplified)
 * @returns {Promise<Object>} Query filter object
 */
async function getUserQueryFilter() {
    const identifier = await getCurrentUserIdentifier();
    
    if (identifier.is_authenticated && identifier.user_id) {
        return {
            field: 'user_id',
            value: identifier.user_id,
            authenticated: true
        };
    } else {
        throw new Error('Authentication required for database queries');
    }
}

/**
 * Redirect to login page
 */
function redirectToLogin() {
    console.info('Redirecting to login page');
    if (window.location.pathname !== '/index.html' && window.location.pathname !== '/') {
        window.location.href = '/index.html';
    }
}

// Export functions to global scope for browser compatibility
window.authHelper = {
    getCurrentUserId,
    getCurrentUserIdentifier,
    isAuthenticated,
    getAuthState,
    requireAuthentication,
    requireUserIdentifier,
    addUserIdentifierToData,
    createInsertPayload,
    getUserQueryFilter,
    redirectToLogin
};

console.info('✅ Simplified Auth Helper loaded (invite-only system)');