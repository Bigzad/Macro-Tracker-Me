// Bootstrapping listeners reconstructed from original inline script
(function(){
  document.addEventListener('DOMContentLoaded', function() {
              console.log('Main app loading - checking authentication...');
            
              // Initialize critical variables first
              initializeCriticalVariables();
            
              // Initialize enhanced error handling for all database operations with proper dependency waiting
              if (window.initManager) {
                  window.initManager.waitForComponents(['errorHandler', 'enhancedDB'], (degraded = false) => {
                      initializeEnhancedErrorHandling();
                    
                      if (degraded) {
                          console.warn('⚠️ Enhanced error handling initialized in degraded mode - some features may be limited');
                      }
                  });
              } else {
                  // Fallback: Initialize with delay
                  setTimeout(() => {
                      initializeEnhancedErrorHandling();
                  }, 1000);
              }
            
              // Temporarily disable auth check for testing
              // if (!checkAuthenticationStatus()) {
              //     return; // Will redirect to login page
              // }
            
              // Check if Supabase Auth is available
              if (typeof window.SupabaseAuth === 'undefined' || typeof window.authWrapper === 'undefined') {
                  console.log('ℹ️ Standard auth wrapper not available, using core authentication systems');
                
                  // Only show error notification if Supabase client is also not working
                  if (!window.supabaseClient || !window.enhancedDB) {
                      console.log('❌ Core authentication systems not available - showing configuration notice');
                      setTimeout(() => {
                          showNotification('warning', 'Configuration Notice', 'Please ensure Supabase is properly configured.');
                      }, 2000);
                  } else {
                      console.log('✅ Core authentication systems active - continuing without standard auth wrapper');
                  }
              } else {
                  // Auth is initialized automatically by authWrapper
                  console.log('Supabase Auth ready');
              }
            
              // Update UI and continue with app initialization
              updateAuthUI();
            
              // Check and display authentication status
              setTimeout(checkAuthStatus, 1000);
            
              // Load basic data from localStorage first (immediate display)
              loadBasicStoredData();
            
              // Then try to load user data from database if authenticated
              setTimeout(async () => {
                  try {
                      // Check if user is authenticated
                      let currentUser = null;
                      try {
                          if (typeof SupabaseAuth !== 'undefined') {
                              currentUser = await SupabaseAuth.getCurrentUser();
                          }
                      } catch (authError) {
                          console.warn('Authentication check failed:', authError);
                      }
                      const isAuthenticated = currentUser || localStorage.getItem('authenticated') === 'true';
                    
                      if (isAuthenticated) {
                          console.log('🔄 User authenticated - loading data from database on page load...');
                          await loadUserDataAfterAuth();
                      } else {
                          console.log('ℹ️ User not authenticated - using localStorage data only');
                      }
                  } catch (error) {
                      console.warn('⚠️ Could not load user data from database on page load:', error.message);
                      console.log('📱 Continuing with localStorage data');
                  }
              }, 3000); // Wait for Supabase Auth to initialize
          }
})();