/**
 * Security Middleware for API Protection
 * Protects sensitive API endpoints and manages fetch operations
 */

(function() {
    'use strict';
    
    console.log('🔒 Security Middleware initializing...');
    
    // Store original fetch function before any modifications
    if (!window.originalFetchStored) {
        window.originalFetchStored = window.fetch.bind(window);
        console.log('📦 Original fetch function stored');
    }
    
    // Configuration
    const config = {
        // Protected endpoints that require authentication
        protectedEndpoints: [
            '/tables/',
            '/admin/',
            '/api/protected'
        ],
        
        // Public endpoints that don't require authentication
        publicEndpoints: [
            '/api/public',
            '/health',
            '/status',
            'supabase.co',
            '/auth/v1',
            'tables/'
        ],
        
        // Development mode - allows bypassing for testing
        developmentMode: true
    };
    
    // Authentication check function
    function isUserAuthenticated() {
        try {
            // Check for Supabase auth
            if (window.SupabaseAuth && window.authWrapper) {
                const user = window.authWrapper.currentUser;
                return !!user;
            }
            
            // Fallback checks
            const token = localStorage.getItem('supabase.auth.token') || 
                         sessionStorage.getItem('supabase.auth.token');
            return !!token;
        } catch (error) {
            console.warn('🔍 Auth check error:', error);
            return false;
        }
    }
    
    // Check if user is authorized coach using database roles
    function isAuthorizedCoach() {
        try {
            // Check database-based role from global auth state
            if (window.currentUserRole && window.currentUser) {
                return ['coach', 'admin', 'owner'].includes(window.currentUserRole.role);
            }
            
            // Fallback: Check if user is authenticated (for development mode)
            if (config.developmentMode && window.authWrapper && window.authWrapper.currentUser) {
                return true;
            }
            
            return false;
        } catch (error) {
            console.warn('🔍 Coach auth check error:', error);
            return false;
        }
    }
    
    // Check if endpoint is protected
    function isProtectedEndpoint(url) {
        return config.protectedEndpoints.some(endpoint => 
            url.includes(endpoint)
        );
    }
    
    // Check if endpoint is public
    function isPublicEndpoint(url) {
        return config.publicEndpoints.some(endpoint => 
            url.includes(endpoint)
        );
    }
    
    // Enhanced fetch wrapper with security
    function secureFletch(url, options = {}) {
        const fullUrl = typeof url === 'string' ? url : url.toString();
        
        // Log the request for debugging
        console.log('🌐 Secure fetch request:', {
            url: fullUrl,
            method: options.method || 'GET',
            authenticated: isUserAuthenticated(),
            isCoach: isAuthorizedCoach()
        });
        
        // Allow public endpoints without authentication
        if (isPublicEndpoint(fullUrl)) {
            console.log('✅ Public endpoint access allowed:', fullUrl);
            return window.originalFetchStored(url, options);
        }
        
        // Check for protected endpoints
        if (isProtectedEndpoint(fullUrl)) {
            const isAuthenticated = isUserAuthenticated();
            const isCoach = isAuthorizedCoach();
            
            // In development mode, allow access for testing
            if (config.developmentMode) {
                console.log('🚧 Development mode: Allowing protected endpoint access:', fullUrl);
                return window.originalFetchStored(url, options);
            }
            
            // Require authentication for protected endpoints
            if (!isAuthenticated) {
                console.warn('🚫 Unauthorized access attempt to:', fullUrl);
                return Promise.reject(new Error('Authentication required for this endpoint'));
            }
            
            // For admin endpoints, require coach authorization
            if (fullUrl.includes('/admin/') && !isCoach) {
                console.warn('🚫 Insufficient privileges for admin endpoint:', fullUrl);
                return Promise.reject(new Error('Admin privileges required for this endpoint'));
            }
            
            console.log('✅ Authenticated access granted:', fullUrl);
        }
        
        // Proceed with original fetch
        return window.originalFetchStored(url, options);
    }
    
    // Override global fetch with security wrapper
    window.fetch = secureFletch;
    
    // Provide access to original fetch for authorized use
    window.secureFetch = {
        original: window.originalFetchStored,
        secure: secureFletch,
        config: config,
        
        // Helper methods
        isAuthenticated: isUserAuthenticated,
        isAuthorizedCoach: isAuthorizedCoach,
        

        
        // Development mode control
        setDevelopmentMode: function(enabled) {
            config.developmentMode = enabled;
            console.log('🔧 Development mode:', enabled ? 'enabled' : 'disabled');
        }
    };
    
    // Export for use in admin panels
    window.SecurityMiddleware = {
        config: config,
        isAuthenticated: isUserAuthenticated,
        isAuthorizedCoach: isAuthorizedCoach
    };
    
    console.log('🔒 Security Middleware initialized successfully');
    console.log('📋 Configuration:', {
        protectedEndpoints: config.protectedEndpoints.length,
        publicEndpoints: config.publicEndpoints.length,
        developmentMode: config.developmentMode
    });
    
    // Dispatch ready event
    window.dispatchEvent(new CustomEvent('securityMiddlewareReady', {
        detail: { config: config }
    }));
    
})();