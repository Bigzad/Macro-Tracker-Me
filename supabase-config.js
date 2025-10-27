// Supabase Configuration and Client Initialization
// Replace the placeholder values with your actual Supabase project credentials

// Environment variables (in production, use proper env variable management)
const SUPABASE_URL = 'https://xnpsjajyjtczlxciatfy.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhucHNqYWp5anRjemx4Y2lhdGZ5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgyMTQ4OTcsImV4cCI6MjA3Mzc5MDg5N30.DqwC4jIYskdU9iXX8c1pX6qkfX3Wvuwzx-VzySJ9YX0';
// Note: Never expose service role key in client-side code
// Service role key should only be used in secure backend environments

// Initialize Supabase Client
// Wait for the script to load
if (typeof window.supabase === 'undefined') {
    console.warn('Supabase client library not loaded yet. Waiting...');
    // Create a placeholder to prevent errors
    window.supabaseClient = null;
} else {
    // Only create client if one doesn't already exist to prevent multiple instances
    if (!window.supabaseClient) {
        window.supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        console.log('✅ Supabase client created by supabase-config.js');
    } else {
        console.log('ℹ️ Supabase client already exists, reusing existing instance');
    }
}

// Use supabaseClient instead of supabase to avoid conflicts
const supabase = window.supabaseClient;

// Authentication Helper Functions
const SupabaseAuth = {
    // Sign up new user
    async signUp(email, password, metadata = {}) {
        try {
            if (!window.supabaseClient) {
                throw new Error('Supabase client not initialized');
            }
            const { data, error } = await window.supabaseClient.auth.signUp({
                email: email,
                password: password,
                options: {
                    data: metadata // Additional user metadata (name, etc.)
                }
            });
            
            if (error) throw error;
            return { success: true, data };
        } catch (error) {
            console.error('Signup error:', error);
            return { success: false, error: error.message };
        }
    },

    // Sign in existing user
    async signIn(email, password) {
        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email: email,
                password: password
            });
            
            if (error) throw error;
            return { success: true, data };
        } catch (error) {
            console.error('Login error:', error);
            return { success: false, error: error.message };
        }
    },

    // Sign out current user
    async signOut() {
        try {
            const { error } = await supabase.auth.signOut();
            if (error) throw error;
            return { success: true };
        } catch (error) {
            console.error('Logout error:', error);
            return { success: false, error: error.message };
        }
    },

    // Get current user
    async getCurrentUser() {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            return user;
        } catch (error) {
            console.error('Get user error:', error);
            return null;
        }
    },

    // Get current session
    async getSession() {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            return session;
        } catch (error) {
            console.error('Get session error:', error);
            return null;
        }
    },

    // Listen to auth state changes
    onAuthStateChange(callback) {
        return supabase.auth.onAuthStateChange((event, session) => {
            callback(event, session);
        });
    },

    // Check if user is admin (based on user metadata or database role)
    async isAdmin(user) {
        if (!user) return false;
        
        // Option 1: Check user metadata
        if (user.user_metadata?.role === 'admin') return true;
        
        // Option 2: Check database for admin role
        try {
            const { data, error } = await supabase
                .from('user_roles')
                .select('role')
                .eq('user_id', user.id)
                .single();
            
            if (error) {
                console.error('Error checking admin role:', error);
                return false;
            }
            
            return data?.role === 'admin';
        } catch (error) {
            console.error('Error checking admin role:', error);
            return false;
        }
    }
};

// Database Helper Functions
const SupabaseDB = {
    // Create a new record
    async create(table, data) {
        try {
            const { data: result, error } = await supabase
                .from(table)
                .insert(data)
                .select();
            
            if (error) throw error;
            return { success: true, data: result };
        } catch (error) {
            console.error(`Create error in ${table}:`, error);
            return { success: false, error: error.message };
        }
    },

    // Read records with optional filters
    async read(table, filters = {}, options = {}) {
        try {
            let query = supabase.from(table).select(options.select || '*');
            
            // Apply filters
            Object.entries(filters).forEach(([key, value]) => {
                query = query.eq(key, value);
            });
            
            // Apply pagination
            if (options.limit) {
                query = query.limit(options.limit);
            }
            if (options.offset) {
                query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
            }
            
            // Apply ordering
            if (options.orderBy) {
                query = query.order(options.orderBy, { ascending: options.ascending ?? true });
            }
            
            const { data, error } = await query;
            
            if (error) throw error;
            return { success: true, data };
        } catch (error) {
            console.error(`Read error in ${table}:`, error);
            return { success: false, error: error.message };
        }
    },

    // Update a record
    async update(table, id, updates) {
        try {
            const { data, error } = await supabase
                .from(table)
                .update(updates)
                .eq('id', id)
                .select();
            
            if (error) throw error;
            return { success: true, data };
        } catch (error) {
            console.error(`Update error in ${table}:`, error);
            return { success: false, error: error.message };
        }
    },

    // Delete a record
    async delete(table, id) {
        try {
            const { error } = await supabase
                .from(table)
                .delete()
                .eq('id', id);
            
            if (error) throw error;
            return { success: true };
        } catch (error) {
            console.error(`Delete error in ${table}:`, error);
            return { success: false, error: error.message };
        }
    },

    // Real-time subscription
    subscribe(table, filters = {}, callback) {
        const subscription = supabase
            .channel(`${table}_changes`)
            .on('postgres_changes', 
                { 
                    event: '*', 
                    schema: 'public', 
                    table: table,
                    filter: Object.entries(filters)
                        .map(([key, value]) => `${key}=eq.${value}`)
                        .join(',')
                },
                (payload) => callback(payload)
            )
            .subscribe();
        
        return subscription;
    }
};

// Export for use in other scripts
window.SupabaseAuth = SupabaseAuth;
window.SupabaseDB = SupabaseDB;
window.supabaseClient = supabase;

// Register with initialization manager if available
if (window.initManager && window.supabaseClient) {
    window.initManager.registerComponent('supabaseClient', window.supabaseClient);
}