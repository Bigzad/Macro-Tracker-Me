/**
 * Coach Authentication Wrapper
 * Shared utilities for coach authentication and session management
 * Used by both coach-login.html and coach-dashboard.html
 */

// Global coach authentication state
window.coachAuth = {
    user: null,
    role: null,
    isAuthenticated: false,
    isVerifying: false
};

/**
 * Initialize coach authentication system
 */
async function initializeCoachAuth() {
    console.log('🔐 Initializing Coach Authentication System...');
    
    // Wait for Supabase client
    if (!window.supabaseClient) {
        console.log('⏳ Waiting for Supabase client...');
        await waitForSupabaseInit();
    }

    // Set up auth state listener
    setupAuthStateListener();
    
    console.log('✅ Coach authentication system initialized');
}

/**
 * Wait for Supabase client to be initialized
 */
function waitForSupabaseInit(maxAttempts = 20) {
    return new Promise((resolve, reject) => {
        let attempts = 0;
        
        const checkInterval = setInterval(() => {
            attempts++;
            
            if (window.supabaseClient) {
                console.log('✅ Supabase client found');
                clearInterval(checkInterval);
                resolve();
            } else if (attempts >= maxAttempts) {
                console.error('❌ Supabase client not found after maximum attempts');
                clearInterval(checkInterval);
                reject(new Error('Supabase client initialization timeout'));
            }
            // Removed excessive logging - only log on success/failure
        }, 250);
    });
}

/**
 * Set up authentication state listener
 */
function setupAuthStateListener() {
    if (!window.supabaseClient) return;

    window.supabaseClient.auth.onAuthStateChange(async (event, session) => {
        console.log('🔄 Auth state changed:', event);
        
        if (event === 'SIGNED_IN' && session?.user) {
            await handleAuthSignIn(session.user);
        } else if (event === 'SIGNED_OUT') {
            handleAuthSignOut();
        }
    });
}

/**
 * Handle user sign in
 */
async function handleAuthSignIn(user) {
    console.log('👤 User signed in:', user.email);
    
    try {
        // Verify coach role
        const roleVerification = await verifyCoachRole(user);
        
        if (roleVerification.success) {
            window.coachAuth.user = user;
            window.coachAuth.role = roleVerification.role;
            window.coachAuth.isAuthenticated = true;
            
            console.log('✅ Coach authentication successful');
        } else {
            console.error('❌ Role verification failed:', roleVerification.error);
            await window.supabaseClient.auth.signOut();
        }
    } catch (error) {
        console.error('Auth sign in error:', error);
        await window.supabaseClient.auth.signOut();
    }
}

/**
 * Handle user sign out
 */
function handleAuthSignOut() {
    console.log('👋 User signed out');
    
    window.coachAuth.user = null;
    window.coachAuth.role = null;
    window.coachAuth.isAuthenticated = false;
    
    // Clear session storage
    sessionStorage.removeItem('coach_auth_verified');
    sessionStorage.removeItem('coach_user_id');
    sessionStorage.removeItem('coach_email');
    
    // Redirect to login if on dashboard
    if (window.location.pathname.includes('coach-dashboard.html')) {
        window.location.href = 'coach-login.html';
    }
}

/**
 * Verify if user has coach role
 */
async function verifyCoachRole(user) {
    try {
        const { data: profileData, error } = await window.supabaseClient
            .from('user_profiles')
            .select('role, computed_role')
            .eq('user_id', user.id)
            .single();

        if (error) {
            console.error('Profile query error:', error);
            return { success: false, error: 'Unable to verify profile' };
        }

        if (!profileData) {
            return { success: false, error: 'Profile not found' };
        }

        // Check both role and computed_role fields for compatibility
        const userRole = profileData.computed_role || profileData.role;
        
        if (!['coach', 'owner', 'admin'].includes(userRole)) {
            return { success: false, error: 'Insufficient permissions' };
        }

        return { success: true, role: userRole };
    } catch (error) {
        console.error('Role verification error:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Check if user is authenticated and authorized
 */
async function checkCoachAuth() {
    if (window.coachAuth.isVerifying) {
        console.log('🔄 Auth verification already in progress...');
        return false;
    }

    window.coachAuth.isVerifying = true;

    try {
        if (!window.supabaseClient) {
            await waitForSupabaseInit();
        }

        const { data: { session }, error } = await window.supabaseClient.auth.getSession();
        
        if (error) {
            console.error('Session check error:', error);
            return false;
        }

        if (!session?.user) {
            console.log('❌ No active session found');
            return false;
        }

        // Verify role
        const roleVerification = await verifyCoachRole(session.user);
        
        if (roleVerification.success) {
            window.coachAuth.user = session.user;
            window.coachAuth.role = roleVerification.role;
            window.coachAuth.isAuthenticated = true;
            
            console.log('✅ Coach authentication verified');
            return true;
        } else {
            console.error('❌ Role verification failed');
            await window.supabaseClient.auth.signOut();
            return false;
        }
    } catch (error) {
        console.error('Auth check failed:', error);
        return false;
    } finally {
        window.coachAuth.isVerifying = false;
    }
}

/**
 * Protect coach dashboard - redirect to login if not authenticated
 */
async function protectCoachDashboard() {
    console.log('🛡️ Protecting coach dashboard...');
    
    const isAuthenticated = await checkCoachAuth();
    
    if (!isAuthenticated) {
        console.log('🚫 Access denied - redirecting to login');
        
        // Show brief message before redirect
        if (window.showWarning) {
            window.showWarning('Authentication Required', 'Redirecting to login...');
        }
        
        setTimeout(() => {
            window.location.href = 'coach-login.html';
        }, 1000);
        
        return false;
    }
    
    console.log('✅ Dashboard access granted');
    return true;
}

/**
 * Handle coach logout
 */
async function coachLogout() {
    console.log('👋 Initiating coach logout...');
    
    try {
        if (window.showInfo) {
            window.showInfo('Signing Out', 'Please wait...');
        }
        
        if (window.supabaseClient) {
            await window.supabaseClient.auth.signOut();
        }
        
        // Clear local state
        window.coachAuth.user = null;
        window.coachAuth.role = null;
        window.coachAuth.isAuthenticated = false;
        
        // Clear session storage
        sessionStorage.clear();
        
        if (window.showSuccess) {
            window.showSuccess('Signed Out', 'Redirecting to login...');
        }
        
        setTimeout(() => {
            window.location.href = 'coach-login.html';
        }, 1000);
        
    } catch (error) {
        console.error('Logout error:', error);
        
        if (window.showError) {
            window.showError('Logout Error', 'Please refresh the page to sign out.');
        }
    }
}

/**
 * Get current coach user info
 */
function getCurrentCoach() {
    return {
        user: window.coachAuth.user,
        role: window.coachAuth.role,
        isAuthenticated: window.coachAuth.isAuthenticated,
        email: window.coachAuth.user?.email || null,
        id: window.coachAuth.user?.id || null
    };
}

/**
 * Redirect to dashboard if already authenticated (for login page)
 */
async function redirectIfAuthenticated() {
    const isAuthenticated = await checkCoachAuth();
    
    if (isAuthenticated) {
        console.log('🔀 Already authenticated - redirecting to dashboard');
        
        if (window.showInfo) {
            window.showInfo('Already Signed In', 'Redirecting to dashboard...');
        }
        
        setTimeout(() => {
            window.location.href = 'coach-dashboard.html';
        }, 1000);
        
        return true;
    }
    
    return false;
}

/**
 * Initialize auth system when script loads
 */
if (typeof window !== 'undefined') {
    // Auto-initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeCoachAuth);
    } else {
        initializeCoachAuth();
    }
}

// Export functions for use in other scripts
window.coachAuthWrapper = {
    initializeCoachAuth,
    checkCoachAuth,
    protectCoachDashboard,
    coachLogout,
    getCurrentCoach,
    redirectIfAuthenticated,
    verifyCoachRole
};