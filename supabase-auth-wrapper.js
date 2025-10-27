// Supabase Auth Wrapper - Drop-in replacement for Netlify Identity
// This wrapper provides compatibility layer for easier migration

class AuthWrapper {
    constructor() {
        this.currentUser = null;
        this.listeners = {
            'init': [],
            'login': [],
            'logout': [],
            'error': []
        };
        
        // Initialize auth state with retry logic
        this.initializeAuthWithRetry();
    }

    async initializeAuthWithRetry() {
        // Wait for Supabase to be ready with retry logic
        if (!window.supabaseClient || !window.SupabaseAuth) {
            setTimeout(() => this.initializeAuthWithRetry(), 100);
            return;
        }
        
        // Now proceed with actual initialization
        this.initializeAuth();
    }

    async initializeAuth() {
        try {
            // Supabase should be available at this point
            if (!window.supabaseClient || !window.SupabaseAuth) {
                const error = new Error('Authentication system not available');
                this.handleError(error, 'Authentication initialization');
                this.trigger('error', error);
                return;
            }
            
            // Check for existing session with timeout
            const sessionPromise = SupabaseAuth.getSession();
            const timeoutPromise = new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Authentication check timeout')), 10000)
            );
            
            const sessionResult = await Promise.race([sessionPromise, timeoutPromise]);
            const session = sessionResult?.data?.session || sessionResult;
            
            if (session?.user) {
                this.currentUser = this.transformUser(session.user);
                this.trigger('init', this.currentUser);
            } else {
                this.trigger('init', null);
            }

            // Set up auth state listener with enhanced error handling
            SupabaseAuth.onAuthStateChange((event, session) => {
                try {
                    if (event === 'SIGNED_IN' && session?.user) {
                        const newUser = this.transformUser(session.user);
                        
                        // Only trigger login if this is a new user or different user
                        if (!this.currentUser || this.currentUser.id !== newUser.id) {
                            this.currentUser = newUser;
                            this.trigger('login', this.currentUser);
                        } else {
                            // Just update current user without triggering login event
                            this.currentUser = newUser;
                        }
                    } else if (event === 'SIGNED_OUT') {
                        this.currentUser = null;
                        this.trigger('logout');
                    }
                } catch (error) {
                    this.handleError(error, 'Auth state change');
                    this.trigger('error', error);
                }
            });
        } catch (error) {
            this.trigger('error', error);
        }
    }

    // Transform Supabase user to match Netlify Identity format
    transformUser(supabaseUser) {
        return {
            id: supabaseUser.id,
            email: supabaseUser.email,
            user_metadata: supabaseUser.user_metadata || {},
            app_metadata: {
                provider: 'email',
                roles: supabaseUser.user_metadata?.role ? [supabaseUser.user_metadata.role] : ['user']
            },
            created_at: supabaseUser.created_at,
            confirmed_at: supabaseUser.confirmed_at,
            email_confirmed_at: supabaseUser.email_confirmed_at,
            token: {
                access_token: supabaseUser.access_token,
                expires_at: supabaseUser.expires_at
            },
            // Additional compatibility fields
            name: supabaseUser.user_metadata?.name || supabaseUser.user_metadata?.full_name || '',
            avatar_url: supabaseUser.user_metadata?.avatar_url || '',
            
            // Original Supabase user object
            _supabase: supabaseUser
        };
    }

    // Event listener registration (compatible with Netlify Identity)
    on(event, callback) {
        if (this.listeners[event]) {
            this.listeners[event].push(callback);
        }
    }

    // Enhanced error handling method
    handleError(error, context = 'Authentication operation') {
        console.error(`Auth Error in ${context}:`, error);
        
        // Log to global error handler if available
        if (window.errorHandler) {
            window.errorHandler.logError('AUTH_WRAPPER', error, 'high', { context });
        }
        
        // Show user-friendly error message
        if (typeof showCustomNotification === 'function') {
            let userMessage = 'Authentication failed. Please try again.';
            
            if (error.message?.includes('timeout')) {
                userMessage = 'Authentication is taking too long. Please check your connection and try again.';
            } else if (error.message?.includes('network')) {
                userMessage = 'Network connection issue. Please check your internet and try again.';
            } else if (error.message?.includes('invalid') || error.message?.includes('credentials')) {
                userMessage = 'Invalid credentials. Please check your email and password.';
            } else if (error.message?.includes('not confirmed')) {
                userMessage = 'Please check your email and confirm your account before logging in.';
            }
            
            showCustomNotification(userMessage, 'error', 5000);
        }
        
        return error;
    }

    // Remove event listener
    off(event, callback) {
        if (this.listeners[event]) {
            const index = this.listeners[event].indexOf(callback);
            if (index > -1) {
                this.listeners[event].splice(index, 1);
            }
        }
    }

    // Trigger event
    trigger(event, data) {
        if (this.listeners[event]) {
            this.listeners[event].forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    // Silently handle callback errors
                }
            });
        }
    }

    // Open login modal only (signup disabled for invite-only app)
    open(type = 'login') {
        if (type === 'login') {
            this.showLoginForm();
        } else if (type === 'signup') {
            // Signup disabled - redirect to login with message
            console.warn('Signup disabled: This is an invite-only application');
            this.showLoginForm();
        }
    }

    // Close modal (compatibility method)
    close() {
        const modal = document.getElementById('supabase-auth-modal');
        if (modal) {
            modal.style.display = 'none';
        }
    }

    // Login method with enhanced error handling
    async login(email, password) {
        try {
            if (!email || !password) {
                throw new Error('Email and password are required');
            }
            
            // Validate email format
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                throw new Error('Invalid email format');
            }
            
            const result = await SupabaseAuth.signIn(email, password);
            if (result.success) {
                // User state will be updated via auth state listener
                return result.data;
            } else {
                const error = new Error(result.error || 'Login failed');
                this.handleError(error, 'Login');
                this.trigger('error', error);
                throw error;
            }
        } catch (error) {
            const enhancedError = this.handleError(error, 'Login');
            this.trigger('error', enhancedError);
            throw enhancedError;
        }
    }

    // Signup method with enhanced error handling
    async signup(email, password, metadata = {}) {
        try {
            if (!email || !password) {
                throw new Error('Email and password are required');
            }
            
            // Validate email format
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                throw new Error('Invalid email format');
            }
            
            // Validate password strength
            if (password.length < 6) {
                throw new Error('Password must be at least 6 characters long');
            }
            
            const result = await SupabaseAuth.signUp(email, password, metadata);
            if (result.success) {
                return result.data;
            } else {
                const error = new Error(result.error || 'Signup failed');
                this.handleError(error, 'Signup');
                this.trigger('error', error);
                throw error;
            }
        } catch (error) {
            const enhancedError = this.handleError(error, 'Signup');
            this.trigger('error', enhancedError);
            throw enhancedError;
        }
    }

    // Logout method with enhanced error handling
    async logout() {
        try {
            const result = await SupabaseAuth.signOut();
            if (result.success) {
                this.currentUser = null;
                // Logout event will be triggered via auth state listener
                return result;
            } else {
                const error = new Error(result.error || 'Logout failed');
                this.handleError(error, 'Logout');
                this.trigger('error', error);
                throw error;
            }
        } catch (error) {
            const enhancedError = this.handleError(error, 'Logout');
            this.trigger('error', enhancedError);
            throw enhancedError;
        }
    }

    // Get current user (compatibility method)
    currentUser() {
        return this.currentUser;
    }

    // Initialize (compatibility method)
    init(config = {}) {
        // Already initialized in constructor
    }

    // Show login form (basic implementation)
    showLoginForm() {
        let modal = document.getElementById('supabase-auth-modal');
        if (!modal) {
            modal = this.createAuthModal();
        }
        
        modal.innerHTML = `
            <div class="auth-modal-content">
                <span class="auth-modal-close" onclick="authWrapper.close()">&times;</span>
                <h2>Login</h2>
                <form id="auth-login-form">
                    <input type="email" id="auth-email" placeholder="Email" required>
                    <input type="password" id="auth-password" placeholder="Password" required>
                    <button type="submit">Login</button>
                </form>
                <p class="text-center text-sm text-gray-600 mt-4">This application is invite-only. Please log in with your invited account to continue.</p>
            </div>
        `;
        
        modal.style.display = 'block';
        
        document.getElementById('auth-login-form').onsubmit = async (e) => {
            e.preventDefault();
            const email = document.getElementById('auth-email').value;
            const password = document.getElementById('auth-password').value;
            try {
                await this.login(email, password);
                this.close();
            } catch (error) {
                alert('Login failed: ' + error.message);
            }
        };
    }

    // Show signup form (basic implementation)
    showSignupForm() {
        // Signup disabled for invite-only application
        console.warn('🚫 Signup attempt blocked: This is an invite-only application');
        
        let modal = document.getElementById('supabase-auth-modal');
        if (!modal) {
            modal = this.createAuthModal();
        }
        
        modal.innerHTML = `
            <div class="auth-modal-content">
                <span class="auth-modal-close" onclick="authWrapper.close()">&times;</span>
                <h2>⚠️ Invite-Only Application</h2>
                <div style="text-align: center; padding: 20px;">
                    <p style="color: #dc2626; font-weight: bold; margin-bottom: 15px;">
                        🚫 Public registration is not available
                    </p>
                    <p style="color: #6b7280; margin-bottom: 20px;">
                        This application requires an invitation to join. 
                        Please contact an administrator to receive an invitation link.
                    </p>
                    <button onclick="authWrapper.open('login')" style="
                        background: #10B981; 
                        color: white; 
                        border: none; 
                        padding: 10px 20px; 
                        border-radius: 6px; 
                        cursor: pointer;
                        font-size: 14px;
                    ">
                        ← Back to Login
                    </button>
                </div>
            </div>
        `;
        
        modal.style.display = 'block';
    }

    // Create auth modal element
    createAuthModal() {
        const modal = document.createElement('div');
        modal.id = 'supabase-auth-modal';
        modal.className = 'auth-modal';
        modal.style.cssText = `
            display: none;
            position: fixed;
            z-index: 1000;
            left: 0;
            top: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0,0,0,0.4);
        `;
        
        // Add basic styles
        const style = document.createElement('style');
        style.textContent = `
            .auth-modal-content {
                background-color: #fefefe;
                margin: 15% auto;
                padding: 20px;
                border: 1px solid #888;
                width: 80%;
                max-width: 400px;
                border-radius: 8px;
            }
            .auth-modal-close {
                color: #aaa;
                float: right;
                font-size: 28px;
                font-weight: bold;
                cursor: pointer;
            }
            .auth-modal-close:hover {
                color: black;
            }
            #supabase-auth-modal input {
                width: 100%;
                padding: 10px;
                margin: 8px 0;
                display: inline-block;
                border: 1px solid #ccc;
                border-radius: 4px;
                box-sizing: border-box;
            }
            #supabase-auth-modal button {
                width: 100%;
                background-color: #4CAF50;
                color: white;
                padding: 14px 20px;
                margin: 8px 0;
                border: none;
                border-radius: 4px;
                cursor: pointer;
            }
            #supabase-auth-modal button:hover {
                background-color: #45a049;
            }
        `;
        
        document.head.appendChild(style);
        document.body.appendChild(modal);
        return modal;
    }
}

// Initialize auth wrapper when Supabase is ready
function initializeAuthWrapper() {
    if (!window.SupabaseAuth || !window.supabaseClient) {
        // Retry initialization every 100ms until Supabase is ready
        setTimeout(initializeAuthWrapper, 100);
        return;
    }
    
    window.authWrapper = new AuthWrapper();
    // Create aliases for compatibility
    window.netlifyIdentity = window.authWrapper;
    window.simpleAuth = window.authWrapper;
}

// Start initialization immediately with retry logic
initializeAuthWrapper();