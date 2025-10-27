// Supabase Initialization Handler
// This file ensures Supabase is properly loaded before initializing

(function() {
    // Configuration
    const SUPABASE_URL = 'https://xnpsjajyjtczlxciatfy.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhucHNqYWp5anRjemx4Y2lhdGZ5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgyMTQ4OTcsImV4cCI6MjA3Mzc5MDg5N30.DqwC4jIYskdU9iXX8c1pX6qkfX3Wvuwzx-VzySJ9YX0';

    // Initialize when DOM is ready
    function initializeSupabase() {
        if (typeof window.supabase === 'undefined') {
            setTimeout(initializeSupabase, 100);
            return;
        }
        
        // Create Supabase client only if one doesn't already exist
        if (!window.supabaseClient) {
            window.supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
            console.log('✅ Supabase client created by supabase-init.js');
        } else {
            console.log('ℹ️ Supabase client already exists, reusing existing instance');
        }

        // Create Authentication Helper
        window.SupabaseAuth = {
            async signUp(email, password, metadata = {}) {
                try {
                    const { data, error } = await window.supabaseClient.auth.signUp({
                        email: email,
                        password: password,
                        options: {
                            data: metadata
                        }
                    });
                    
                    if (error) throw error;
                    return { success: true, data };
                } catch (error) {
                    return { success: false, error: error.message };
                }
            },

            async signIn(email, password) {
                try {
                    const { data, error } = await window.supabaseClient.auth.signInWithPassword({
                        email: email,
                        password: password
                    });
                    
                    if (error) throw error;
                    return { success: true, data };
                } catch (error) {
                    return { success: false, error: error.message };
                }
            },

            async signOut() {
                try {
                    const { error } = await window.supabaseClient.auth.signOut();
                    if (error) throw error;
                    return { success: true };
                } catch (error) {
                    return { success: false, error: error.message };
                }
            },

            async getCurrentUser() {
                try {
                    const { data: { user } } = await window.supabaseClient.auth.getUser();
                    return user;
                } catch (error) {
                    return null;
                }
            },

            async getSession() {
                try {
                    const { data: { session } } = await window.supabaseClient.auth.getSession();
                    return session;
                } catch (error) {
                    return null;
                }
            },

            onAuthStateChange(callback) {
                return window.supabaseClient.auth.onAuthStateChange((event, session) => {
                    callback(event, session);
                });
            },

            async isAdmin(user) {
                if (!user) return false;
                
                if (user.user_metadata?.role === 'admin') return true;
                
                try {
                    const { data, error } = await window.supabaseClient
                        .from('user_roles')
                        .select('role')
                        .eq('user_id', user.id)
                        .single();
                    
                    if (error) {
                        return false;
                    }
                    
                    return data?.role === 'admin';
                } catch (error) {
                    return false;
                }
            }
        };

        // Create Database Helper
        window.SupabaseDB = {
            async create(table, data) {
                try {
                    const { data: result, error } = await window.supabaseClient
                        .from(table)
                        .insert(data)
                        .select();
                    
                    if (error) throw error;
                    return { success: true, data: result };
                } catch (error) {
                    return { success: false, error: error.message };
                }
            },

            async read(table, filters = {}, options = {}) {
                try {
                    let query = window.supabaseClient.from(table).select(options.select || '*');
                    
                    Object.entries(filters).forEach(([key, value]) => {
                        query = query.eq(key, value);
                    });
                    
                    if (options.limit) {
                        query = query.limit(options.limit);
                    }
                    if (options.offset) {
                        query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
                    }
                    if (options.orderBy) {
                        query = query.order(options.orderBy, { ascending: options.ascending ?? true });
                    }
                    
                    const { data, error } = await query;
                    
                    if (error) throw error;
                    return { success: true, data };
                } catch (error) {
                    return { success: false, error: error.message };
                }
            },

            async update(table, id, updates) {
                try {
                    const { data, error } = await window.supabaseClient
                        .from(table)
                        .update(updates)
                        .eq('id', id)
                        .select();
                    
                    if (error) throw error;
                    return { success: true, data };
                } catch (error) {
                    return { success: false, error: error.message };
                }
            },

            async delete(table, id) {
                try {
                    const { error } = await window.supabaseClient
                        .from(table)
                        .delete()
                        .eq('id', id);
                    
                    if (error) throw error;
                    return { success: true };
                } catch (error) {
                    return { success: false, error: error.message };
                }
            }
        };

        // Initialize auth wrapper after Supabase is ready
        if (typeof initializeAuthWrapper === 'function') {
            initializeAuthWrapper();
        }

        // Dispatch custom event to notify that Supabase is ready
        window.dispatchEvent(new Event('supabaseReady'));
    }

    // Start initialization
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeSupabase);
    } else {
        initializeSupabase();
    }
})();