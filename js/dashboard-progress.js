/* === ORIGINAL EXTRACTED CODE === */
// Module reconstructed from original inline script
// Category: progress

(function(){

   function getCurrentUserEmail() {
              if (currentUserEmail) {
                  // Using cached user email
                  return currentUserEmail;
              }
            
              // Try to get from Supabase auth
              try {
                  if (window.authWrapper && window.authWrapper.currentUser) {
                      currentUserEmail = window.authWrapper.currentUser.email;
                      // Email from Supabase auth
                      return currentUserEmail;
                  }
              } catch (error) {
                  console.warn('Could not get email from Supabase authWrapper:', error);
              }

              // Try to get from direct Supabase client (sync method)
              try {
                  if (window.supabaseClient) {
                      // Note: This is async, but we'll handle it in the calling function
                      // Supabase client available
                  }
              } catch (error) {
                  console.warn('Could not access Supabase client:', error);
              }
            
              // Fallback to localStorage with enhanced JSON parsing
              const userInfo = localStorage.getItem('user_info');
              if (userInfo) {
                  const safeJSON = window.safeGetEnhancedDB ? window.safeGetEnhancedDB() : null;
                  const parsed = (safeJSON && safeJSON.enhancedJSONParse) ? 
                      safeJSON.enhancedJSONParse(userInfo, {}) :
                      (() => {
                          try {
                              return JSON.parse(userInfo);
                          } catch (error) {
                              console.warn('Error parsing localStorage user info:', error);
                              return {};
                          }
                      })();
                
                  if (parsed.email) {
                      currentUserEmail = parsed.email;
                      // Email from localStorage
                      return currentUserEmail;
                  }
              }
            
              console.log('⚠️ Using fallback email for development');
              return 'test@example.com'; // Use our test data email
          }
        
          // Helper function to get current user ID from Supabase Auth
          async function getCurrentUserId() {
              try {
                  if (window.supabaseClient) {
                      const { data: { user } } = await window.supabaseClient.auth.getUser();
                      if (user) {
                          // User ID from Supabase auth
                          return user.id;
                      }
                  }
              } catch (error) {
                  console.warn('Could not get user ID from Supabase:', error);
              }
            
              console.log('⚠️ No user ID available, using fallback');
              return null;
          }
        
          // ====================================================================
          // NEW SCHEMA AUTHENTICATION FUNCTIONS (ADDITIVE - DOESN'T BREAK EXISTING)
          // ====================================================================
        
          // Get current user context for new schema (authenticated user or anonymous profile)
          async function getCurrentUserContext() {
              try {
                  if (window.supabaseClient) {
                      const { data: { user }, error } = await window.supabaseClient.auth.getUser();
                    
                      if (user && !error) {
                          // Authenticated user
                          return {
                              type: 'authenticated',
                              user_id: user.id,
                              email: user.email,
                              anon_profile_id: null
                          };
                      }
                    
                      // Try to get anonymous profile from JWT claims
                      const session = await window.supabaseClient.auth.getSession();
                      if (session.data?.session?.access_token) {
                          try {
                              const payload = JSON.parse(atob(session.data.session.access_token.split('.')[1]));
                              const anonProfileId = payload.anon_profile_id;
                            
                              if (anonProfileId) {
                                  return {
                                      type: 'anonymous',
                                      user_id: null,
                                      email: null,
                                      anon_profile_id: anonProfileId
                                  };
                              }
                          } catch (jwtError) {
                              console.warn('⚠️ Could not parse JWT for anon_profile_id:', jwtError);
                          }
                      }
                  }
                
                  // Create new anonymous profile if none exists
                  return await createAnonymousProfile();
                
              } catch (error) {
                  console.error('❌ Error getting user context:', error);
                
                  // Fallback to localStorage-based anonymous session
                  return getLocalAnonymousProfile();
              }
          }
        
          // Create new anonymous profile in database
          async function createAnonymousProfile() {
              try {
                  if (window.supabaseClient) {
                      const { data, error } = await window.supabaseClient
                          .from('anonymous_profiles')
                          .insert({
                              display_name: 'Anonymous User',
                              expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days
                          })
                          .select()
                          .single();
                    
                      if (!error && data) {
                          // Store in localStorage for future sessions
                          localStorage.setItem('anon_profile_context', JSON.stringify({
                              type: 'anonymous',
                              user_id: null,
                              email: null,
                              anon_profile_id: data.id,
                              created_at: new Date().toISOString()
                          }));
                        
                          console.log('✅ Created new anonymous profile:', data.id);
                          return {
                              type: 'anonymous',
                              user_id: null,
                              email: null,
                              anon_profile_id: data.id
                          };
                      }
                  }
              } catch (error) {
                  console.error('❌ Error creating anonymous profile:', error);
              }
            
              // Fallback to local anonymous session
              return getLocalAnonymousProfile();
          }
        
          // Get or create localStorage-based anonymous profile
          function getLocalAnonymousProfile() {
              let localContext = localStorage.getItem('anon_profile_context');
            
              if (localContext) {
                  try {
                      const parsed = JSON.parse(localContext);
                    
                      // Check if context is still valid (not expired)
                      const createdAt = new Date(parsed.created_at);
                      const now = new Date();
                      const daysDiff = (now - createdAt) / (1000 * 60 * 60 * 24);
                    
                      if (daysDiff < 30) { // Valid for 30 days
                          console.log('📱 Using existing local anonymous profile');
                          return parsed;
                      }
                  } catch (error) {
                      console.warn('⚠️ Error parsing local anonymous context:', error);
                  }
              }
            
              // Create new local anonymous profile
              const newContext = {
                  type: 'anonymous',
                  user_id: null,
                  email: null,
                  anon_profile_id: 'local_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
                  created_at: new Date().toISOString()
              };
            
              localStorage.setItem('anon_profile_context', JSON.stringify(newContext));
              console.log('📱 Created new local anonymous profile:', newContext.anon_profile_id);
              return newContext;
          }
        
          // Get database identifier for current user (user_id or anon_profile_id)
          async function getCurrentDatabaseIdentifier() {
              try {
                  const context = await getCurrentUserContext();
                  if (context.type === 'authenticated') {
                      return { user_id: context.user_id, anon_profile_id: null };
                  } else {
                      return { user_id: null, anon_profile_id: context.anon_profile_id };
                  }
              } catch (error) {
                  console.error('❌ Error getting database identifier:', error);
                  const fallback = getLocalAnonymousProfile();
                  return { user_id: null, anon_profile_id: fallback.anon_profile_id };
              }
          }

          // Safe fetch function to avoid security middleware binding issues
          async function safeFetch(url, options = {}) {
              // Always use the original fetch for database API calls from authenticated users
              if (url.includes('tables/')) {
                  // Check if user is authenticated
                  const isAuthenticated = (window.authWrapper && window.authWrapper.currentUser) || 
                                         localStorage.getItem('authenticated') === 'true';
                  if (isAuthenticated) {
                      console.log('🔓 Bypassing security middleware for authenticated user database call:', url);
                    
                      // Temporarily disable security middleware for this call
                      const originalFetch = window.originalFetchStored || fetch;
                    
                      // Make the API call directly
                      try {
                          const result = await originalFetch.call(window, url, options);
                          console.log('📡 Direct API call result:', result.status);
                          return result;
                      } catch (error) {
                          console.error('❌ Direct API call error:', error);
                          throw error;
                      }
                  }
              }
            
              // Use the original fetch function stored before security middleware activation
              const fetchFunction = window.originalFetchStored || window.fetch;
              return await fetchFunction.call(window, url, options);
          }

          // Function to check if RESTful API endpoints are available
          let apiEndpointsChecked = false;
          let apiEndpointsAvailable = false;
        
          async function checkApiEndpoints() {
              if (apiEndpointsChecked) {
                  return apiEndpointsAvailable;
              }
            
              try {
                  // Checking RESTful API availability
                
                  // Use apiCall instead of safeFetch to test the endpoint
                  // This will use the proper RESTful Table API handling
                  const testResponse = await apiCall('tables/user_profiles?limit=1');
                
                  if (testResponse && (testResponse.data !== undefined || Array.isArray(testResponse))) {
                      console.log('✅ RESTful API endpoints are available');
                      apiEndpointsAvailable = true;
                  } else {
                      console.log('⚠️ RESTful API endpoints not available - invalid response format');
                      apiEndpointsAvailable = false;
                  }
              } catch (error) {
                  console.log('⚠️ RESTful API endpoints not available (error):', error.message);
                  // Check if it's specifically a 404 error with HTML response
                  if (error.message && error.message.includes('404') && error.message.includes('<!DOCTYPE html>')) {
                      // RESTful API endpoints not available
                  }
                  apiEndpointsAvailable = false;
              }
            
              apiEndpointsChecked = true;
              return apiEndpointsAvailable;
          }

          // Supabase-first API helper function
          async function apiCall(endpoint, method = 'GET', data = null) {
              console.log('🌐 API Call:', { endpoint, method, hasData: !!data });
            
              try {
                  // Handle table operations with Supabase directly
                  if (endpoint.startsWith('tables/')) {
                      return await handleSupabaseTableCall(endpoint, method, data);
                  }
                
                  // Handle non-table endpoints (fallback to fetch)
                  const options = {
                      method: method,
                      headers: {
                          'Content-Type': 'application/json'
                      }
                  };
                
                  if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
                      options.body = JSON.stringify(data);
                  }
                
                  const response = await fetch(endpoint, options);
                
                  if (!response.ok) {
                      throw new Error(`API call failed: ${response.status}`);
                  }
                
                  if (method === 'DELETE') {
                      return { success: true };
                  }
                
                  return await response.json();
                
              } catch (error) {
                  console.error('API call error:', error);
                  throw error;
              }
          }

          // Handle Supabase table operations
          async function handleSupabaseTableCall(endpoint, method, data) {
              if (!window.supabaseClient) {
                  throw new Error('Supabase client not available');
              }

              // Validate data parameter for operations that require it
              if ((method === 'POST' || method === 'PUT' || method === 'PATCH') && (!data || typeof data !== 'object')) {
                  console.error('❌ Invalid data parameter for operation:', { method, data, endpoint });
                  throw new Error(`Data is required and must be an object for ${method} operations`);
              }

              const parts = endpoint.split('/');
              const tableName = parts[1];
              const recordId = parts[2];
              const queryParams = new URLSearchParams(endpoint.split('?')[1] || '');
            
              console.log('📊 Supabase operation:', { tableName, method, recordId, hasData: !!data });

              try {
                  switch (method) {
                      case 'GET':
                          let query = window.supabaseClient.from(tableName).select('*');
                        
                          // Handle search parameter using safe helper
                          const search = queryParams.get('search');
                          if (search) {
                              // Processing search query
                            
                              // ALWAYS use safe fallback logic to prevent PGRST100 errors
                              const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                              const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
                            
                              if (emailRegex.test(search)) {
                                  // Email - use exact match to avoid @ symbol issues
                                  console.log(`📧 Email detected: using exact match for '${search}'`);
                                  query = query.eq('user_email', search);
                              } else if (uuidRegex.test(search)) {
                                  // UUID - use exact match
                                  console.log(`🆔 UUID detected: using exact match for '${search}'`);
                                  query = query.eq('user_id', search);
                              } else {
                                  // Text - use simple ILIKE
                                  console.log(`📝 Text detected: using ILIKE for '${search}'`);
                                  query = query.ilike('user_email', `%${search}%`);
                              }
                          }
                        
                          // Handle pagination and sorting using safe helpers
                          if (window.SupabaseQueryHelper) {
                              const limit = queryParams.get('limit');
                              const sort = queryParams.get('sort');
                              query = window.SupabaseQueryHelper.applyPagination(query, limit, 0);
                              query = window.SupabaseQueryHelper.applySorting(query, sort);
                          } else {
                              // Fallback to direct methods
                              const limit = queryParams.get('limit');
                              if (limit) {
                                  query = query.limit(parseInt(limit));
                              }
                              const sort = queryParams.get('sort');
                              if (sort) {
                                  query = query.order(sort, { ascending: false });
                              }
                          }
                        
                          // Get single record by ID
                          if (recordId) {
                              query = query.eq('id', recordId).single();
                              const { data, error } = await query;
                              if (error) throw error;
                              return data;
                          }
                        
                          const { data, error } = await query;
                          if (error) throw error;
                        
                          return { data, total: data.length };

                      case 'POST':
                          const { data: newData, error: postError } = await window.supabaseClient
                              .from(tableName)
                              .insert(data)
                              .select()
                              .single();
                        
                          if (postError) throw postError;
                          return newData;

                      case 'PUT':
                      case 'PATCH':
                          const { data: updatedData, error: updateError } = await window.supabaseClient
                              .from(tableName)
                              .update(data)
                              .eq('id', recordId)
                              .select()
                              .single();
                        
                          if (updateError) throw updateError;
                          return updatedData;

                      case 'DELETE':
                          const { error: deleteError } = await window.supabaseClient
                              .from(tableName)
                              .delete()
                              .eq('id', recordId);
                        
                          if (deleteError) throw deleteError;
                          return { success: true };

                      default:
                          throw new Error(`Unsupported method: ${method}`);
                  }
              } catch (error) {
                  console.error('Supabase operation error:', error);
                  throw error;
              }
          }




          // Manual data refresh function (call from console)
          window.refreshUserData = async function() {
              try {
                  console.log('🔄 Manually refreshing user data...');
                  await loadUserDataAfterAuth();
                  console.log('✅ Manual data refresh completed');
              } catch (error) {
                  console.error('❌ Manual data refresh failed:', error);
              }
          };

          // Test Supabase connection (call from console)
          window.testSupabaseConnection = async function() {
              try {
                  console.log('🧪 Testing Supabase connection...');
                
                  if (!window.supabaseClient) {
                      console.error('❌ Supabase client not available');
                      return false;
                  }
                
                  // Test basic connection
                  const { data, error } = await window.supabaseClient
                      .from('user_profiles')
                      .select('id, user_name, user_email')
                      .limit(1);
                
                  if (error) {
                      console.error('❌ Supabase connection test failed:', error);
                      return false;
                  }
                
                  console.log('✅ Supabase connection successful:', data);
                  return true;
              } catch (error) {
                  console.error('❌ Supabase connection error:', error);
                  return false;
              }
          };



          // Migration function for existing users (call from console)
          window.migrateLocalStorageToDatabase = async function() {
              try {
                  console.log('🔄 Starting localStorage to database migration...');
                
                  // Check if user is authenticated
                  const userEmail = getCurrentUserEmail();
                  if (!userEmail || userEmail === 'anonymous@user.local') {
                      console.error('❌ User not authenticated - cannot migrate data');
                      return { error: 'User not authenticated' };
                  }
                
                  console.log('📧 Migrating data for user:', userEmail);
                
                  // Migrate meals from localStorage
                  const storedMeals = localStorage.getItem('meals');
                  if (storedMeals) {
                      const mealsArray = JSON.parse(storedMeals);
                      console.log('🍽️ Found', mealsArray.length, 'meals in localStorage');
                    
                      if (mealsArray.length > 0) {
                          const result = await saveDailyMeals(mealsArray);
                          console.log('✅ Meals migration result:', result);
                      }
                  }
                
                  // Migrate user profile from localStorage
                  const storedProfile = localStorage.getItem('userProfile');
                  if (storedProfile) {
                      const profileData = JSON.parse(storedProfile);
                      console.log('👤 Found user profile in localStorage:', profileData);
                    
                      const profileResult = await saveUserProfile(profileData);
                      console.log('✅ Profile migration result:', profileResult);
                  }
                
                  // Migrate targets if available
                  const storedTargets = localStorage.getItem('dailyTargets');
                  if (storedTargets && storedTargets !== 'undefined') {
                      const targets = JSON.parse(storedTargets);
                      console.log('🎯 Found daily targets in localStorage:', targets);
                    
                      const userInfo = localStorage.getItem('user_info');
                      const userName = userInfo ? JSON.parse(userInfo).name : '';
                    
                      const targetResult = await saveUserProfile({
                          name: userName,
                          unitSystem: currentUnitSystem || 'imperial',
                          dailyTargets: targets
                      });
                      console.log('✅ Targets migration result:', targetResult);
                  }
                
                  console.log('🎉 Migration completed successfully!');
                  console.log('🔄 Refreshing user data from database...');
                
                  // Reload data from database to verify
                  await loadUserDataAfterAuth();
                
                  return { 
                      success: true, 
                      message: 'Data migrated successfully from localStorage to database' 
                  };
                
              } catch (error) {
                  console.error('❌ Migration failed:', error);
                  return { error: error.message };
              }
          };

          // Load User Data After Authentication
          async function loadUserDataAfterAuth() {
              console.log('🔄 Loading user data from dedicated tables...');
            
              try {
                  // Load user preferences from dedicated table
                  const preferences = await loadUserPreferences();
                  if (preferences) {
                      console.log('✅ User preferences loaded:', preferences);
                    
                      // Update unit system if available
                      if (preferences.unit_system) {
                          currentUnitSystem = preferences.unit_system;
                          updateUnitLabels();
                          console.log('🔧 Unit system set to:', currentUnitSystem);
                      }
                  }
                
                  // Load daily targets from dedicated table
                  const targets = await loadDailyTargets();
                  if (targets) {
                      dailyTargets = {
                          calories: targets.daily_calories,
                          protein: targets.daily_protein,
                          carbs: targets.daily_carbs,
                          fat: targets.daily_fat
                      };
                      console.log('✅ Daily targets loaded from database:', dailyTargets);
                    
                      // Update display
                      if (document.getElementById('dailyCalories')) {
                          document.getElementById('dailyCalories').textContent = targets.daily_calories.toLocaleString();
                          document.getElementById('proteinAmount').textContent = targets.daily_protein + 'g';
                          document.getElementById('carbsAmount').textContent = targets.daily_carbs + 'g';
                          document.getElementById('fatAmount').textContent = targets.daily_fat + 'g';
                      }
                    
                      updateMacroCharts();
                  } else {
                      // Fallback to localStorage if database loading failed
                      console.log('📱 Database targets not found, checking localStorage fallback...');
                      const savedTargets = localStorage.getItem('dailyTargets');
                      if (savedTargets && savedTargets !== 'null') {
                          try {
                              const parsed = JSON.parse(savedTargets);
                              // Ensure all required fields are present and valid
                              if (parsed && parsed.calories > 0 && parsed.protein > 0) {
                                  dailyTargets = {
                                      calories: parsed.calories,
                                      protein: parsed.protein,
                                      carbs: parsed.carbs,
                                      fat: parsed.fat
                                  };
                                  console.log('✅ Daily targets loaded from localStorage:', dailyTargets);
                                
                                  // Update display
                                  if (document.getElementById('dailyCalories')) {
                                      document.getElementById('dailyCalories').textContent = dailyTargets.calories.toLocaleString();
                                      document.getElementById('proteinAmount').textContent = dailyTargets.protein + 'g';
                                      document.getElementById('carbsAmount').textContent = dailyTargets.carbs + 'g';
                                      document.getElementById('fatAmount').textContent = dailyTargets.fat + 'g';
                                  }
                                
                                  updateMacroCharts();
                              } else {
                                  console.log('ℹ️ localStorage targets incomplete, using defaults');
                              }
                          } catch (error) {
                              console.warn('⚠️ Error parsing localStorage targets:', error);
                          }
                      } else {
                          console.log('ℹ️ No saved targets found, using default values');
                      }
                  }
                
                  // Always ensure display is synchronized with current dailyTargets values
                  // This handles cases where defaults are used or saved data doesn't exist
                  ensureDisplaySync();
                
                  // Load calculation history and auto-populate personal info form
                  await loadAndPopulatePersonalInfo();
                
                  // Load today's meals from database (overrides localStorage)
                  const todayMeals = await loadDailyMeals();
                  if (todayMeals && todayMeals.length > 0) {
                      console.log('✅ Today\'s meals loaded from database:', todayMeals.length, 'meals');
                      meals = todayMeals;
                    
                      // Recalculate current intake from loaded meals
                      currentIntake = { protein: 0, carbs: 0, fat: 0 };
                      meals.forEach(meal => {
                          currentIntake.protein += meal.protein || 0;
                          currentIntake.carbs += meal.carbs || 0;
                          currentIntake.fat += meal.fat || 0;
                      });
                    
                      // Update all displays and save to localStorage for offline access
                      updateMealsList();
                      updateProgress();
                      updateMacroCharts();
                      updateCalorieDisplay();
                    
                      // Sync localStorage with database data
                      localStorage.setItem('meals', JSON.stringify(meals));
                      localStorage.setItem('currentIntake', JSON.stringify(currentIntake));
                      localStorage.setItem('lastSaved', new Date().toDateString());
                    
                      console.log('✅ Meals loaded from database, intake calculated:', currentIntake);
                      console.log('💾 Database meals synced to localStorage for offline access');
                  } else {
                      console.log('ℹ️ No meals found in database for today');
                      // Check if we have localStorage meals that weren't uploaded yet
                      const localMeals = localStorage.getItem('meals');
                      if (localMeals) {
                          const parsedMeals = JSON.parse(localMeals);
                          if (parsedMeals.length > 0) {
                              console.log('📱 Found localStorage meals not in database:', parsedMeals.length, 'meals');
                              meals = parsedMeals;
                            
                              // Recalculate intake from localStorage meals
                              currentIntake = { protein: 0, carbs: 0, fat: 0 };
                              meals.forEach(meal => {
                                  currentIntake.protein += meal.protein || 0;
                                  currentIntake.carbs += meal.carbs || 0;
                                  currentIntake.fat += meal.fat || 0;
                              });
                            
                              // Update displays
                              updateMealsList();
                              updateProgress();
                              updateMacroCharts();
                              updateCalorieDisplay();
                            
                              console.log('✅ Using localStorage meals, intake calculated:', currentIntake);
                          }
                      }
                  }
                
                  // Load progress entries for charts
                  await loadProgressData();
                
                  console.log('🎉 All user data loaded successfully!');
                
              } catch (error) {
                  console.error('❌ Error loading user data:', error);
                  showNotification('warning', 'Data Loading', 'Some data could not be loaded. You can still use the app normally.');
              }
          }

          // User Profile API - Updated for UUID-based schema
          async function saveUserProfile(profileData) {
              try {
                  console.log('💾 Saving user profile with UUID-based authentication...');
                
                  // Get user identifier (UUID-based)
                  const identifier = await window.authHelper.getCurrentUserIdentifier();
                  if (!identifier.user_id && !identifier.anon_profile_id) {
                      throw new Error('No valid user identifier available');
                  }
                
                  // Save user preferences to user_preferences table
                  const preferencesData = await window.authHelper.createInsertPayload({
                      unit_system: profileData.unitSystem || 'imperial',
                      theme: 'light', // Default theme
                      notifications_enabled: true,
                      show_tutorials: true,
                      custom_preferences: {}
                  });
                
                  // Save/update user preferences
                  const { data: prefsResult, error: prefsError } = await window.supabaseClient
                      .from('user_preferences')
                      .upsert(preferencesData, { 
                          onConflict: identifier.user_id ? 'user_id' : 'anon_profile_id'
                      })
                      .select();
                
                  if (prefsError) {
                      console.warn('⚠️ User preferences save failed:', prefsError.message);
                  }
                
                  // Save daily targets to daily_targets table if provided
                  let targetsResult = null;
                  if (profileData.dailyTargets) {
                      const targets = typeof profileData.dailyTargets === 'string' 
                          ? (window.JSON?.safeParse ? 
                              window.JSON.safeParse(profileData.dailyTargets, {}) : 
                              (() => {
                                  try {
                                      return JSON.parse(profileData.dailyTargets);
                                  } catch (error) {
                                      console.warn('Error parsing daily targets:', error);
                                      return {};
                                  }
                              })()
                            )
                          : profileData.dailyTargets;
                    
                      const targetsData = await window.authHelper.createInsertPayload({
                          daily_calories: parseInt(targets.calories) || 2000,
                          daily_protein: parseInt(targets.protein) || 150,
                          daily_carbs: parseInt(targets.carbs) || 250,
                          daily_fat: parseInt(targets.fat) || 67
                      });
                    
                      const { data: targetsRes, error: targetsError } = await window.supabaseClient
                          .from('daily_targets')
                          .upsert(targetsData, { 
                              onConflict: identifier.user_id ? 'user_id' : 'anon_profile_id'
                          })
                          .select();
                    
                      if (targetsError) {
                          console.warn('⚠️ Daily targets save failed:', targetsError.message);
                      } else {
                          targetsResult = targetsRes;
                      }
                  }
                
                  // Also save to localStorage for offline access
                  localStorage.setItem('userProfile', JSON.stringify(profileData));
                
                  console.log('✅ Profile saved to UUID-based schema successfully');
                  return {
                      preferences: prefsResult,
                      dailyTargets: targetsResult,
                      success: true
                  };
                
              } catch (error) {
                  console.error('❌ Error saving user profile:', error);
                  // Fallback to localStorage
                  localStorage.setItem('userProfile', JSON.stringify(profileData));
                  return { fallback: true, error: error.message };
              }
          }

          async function loadUserProfile() {
              const userEmail = getCurrentUserEmail();
            
              try {
                  // Try Supabase first (for cross-device sync)
                  if (window.supabaseClient) {
                      console.log('📡 Loading profile from Supabase...');
                      try {
                          // Check authentication status first
                          const { data: { user }, error: authError } = await window.supabaseClient.auth.getUser();
                          let lookupEmail = userEmail;
                        
                          // If user is authenticated, use their email or anonymous ID
                          if (user) {
                              lookupEmail = user.email || `anon_${user.id}`;
                          }
                        
                          const { data, error } = await window.supabaseClient
                              .from('user_profiles')
                              .select('*')
                              .eq('user_email', lookupEmail)
                              .maybeSingle();
                        
                          if (!error && data) {
                              console.log('✅ Profile loaded from Supabase:', data);
                            
                              // Get additional data from localStorage (unitSystem, dailyTargets)
                              const stored = localStorage.getItem('userProfile');
                              const localData = stored ? JSON.parse(stored) : {};
                            
                              return {
                                  name: data.name || 'User',
                                  unitSystem: localData.unitSystem || 'imperial',
                                  dailyTargets: localData.dailyTargets || { calories: 2000, protein: 150, carbs: 250, fat: 67 }
                              };
                          } else if (error) {
                              console.warn('⚠️ Supabase profile load failed:', error.message);
                          }
                      } catch (error) {
                          console.warn('⚠️ Supabase profile load error:', error);
                      }
                  }
                
                  // Fallback to localStorage
                  console.log('📱 Loading profile from localStorage fallback...');
                  const stored = localStorage.getItem('userProfile');
                  return stored ? JSON.parse(stored) : null;
              } catch (error) {
                  console.error('Error loading user profile:', error);
                  // Final fallback to localStorage
                  const stored = localStorage.getItem('userProfile');
                  return stored ? JSON.parse(stored) : null;
              }
          }

          // Daily Meals API - UUID-based with authHelper.js
          async function saveDailyMeals(meals, date = null) {
              const mealDate = date || new Date().toISOString().split('T')[0];
            
              console.log('💾 Saving daily meals to database...', {
                  mealDate: mealDate,
                  mealCount: meals.length
              });

              try {
                  if (!window.supabaseClient) {
                      console.log('ℹ️ No database connection available for daily meals save');
                      localStorage.setItem('meals', JSON.stringify(meals));
                      localStorage.setItem('lastSaved', mealDate);
                      return { fallback: true };
                  }

                  // Get user identifier (invite-only system - must be authenticated)
                  const identifier = await window.authHelper.getCurrentUserIdentifier();
                
                  if (!identifier.is_authenticated || !identifier.user_id) {
                      console.warn('User not authenticated - redirecting to login');
                      window.authHelper.redirectToLogin();
                      throw new Error('Authentication required to save meals');
                  }

                  console.info('💾 Saving meals for authenticated user:', identifier.user_id);

                  // Clear existing meals for this date (authenticated user only)
                  const deleteQuery = window.supabaseClient
                      .from('daily_meals')
                      .delete()
                      .eq('meal_date', mealDate)
                      .eq('user_id', identifier.user_id);

                  const { error: deleteError } = await deleteQuery;
                
                  if (deleteError) {
                      console.warn('⚠️ Failed to clear existing meals:', deleteError.message);
                  }

                  // Save new meals to Supabase using UUID-based schema
                  const supabaseResults = [];
                  for (const meal of meals) {
                      const mealData = await window.authHelper.createInsertPayload({
                          meal_date: mealDate,
                          meal_name: meal.name,
                          calories: Math.round(meal.calories || 0), // INTEGER type
                          protein: Math.round(meal.protein || 0), // INTEGER type
                          carbs: Math.round(meal.carbs || 0), // INTEGER type
                          fat: Math.round(meal.fat || 0), // INTEGER type
                          meal_uuid: meal.id ? meal.id.toString() : crypto.randomUUID(),
                          timestamp: new Date().toISOString()
                      });

                      const { data: inserted, error } = await window.supabaseClient
                          .from('daily_meals')
                          .insert(mealData)
                          .select();

                      if (error) {
                          console.warn('⚠️ Supabase meal insert failed:', error.message);
                          throw error;
                      } else {
                          supabaseResults.push(inserted[0]);
                          console.log('✅ Meal saved to Supabase:', inserted[0]);
                      }
                  }

                  console.log(`✅ ${supabaseResults.length} meals saved to Supabase successfully`);

                  // Also save to localStorage for offline access
                  localStorage.setItem('meals', JSON.stringify(meals));
                  localStorage.setItem('lastSaved', mealDate);

                  return { success: true, count: meals.length, supabase: supabaseResults.length };
                
              } catch (error) {
                  console.error('❌ Failed to save daily meals to database:', error);
                
                  // Final fallback to localStorage
                  localStorage.setItem('meals', JSON.stringify(meals));
                  localStorage.setItem('lastSaved', mealDate);
                  return { fallback: true, error: error.message };
              }
          }

          async function loadDailyMeals(date = null) {
              if (!window.supabaseClient) {
                  console.log('ℹ️ No database connection available, using localStorage for daily meals');
                  const stored = localStorage.getItem('meals');
                  return stored ? JSON.parse(stored) : [];
              }

              const mealDate = date || new Date().toISOString().split('T')[0];
              console.log('📡 Loading daily meals from database...');
            
              try {
                  // Get user identifier using authHelper (supports both authenticated users and anonymous profiles)
                  const identifier = await window.authHelper.getCurrentUserIdentifier();
                
                  if (!identifier.user_id && !identifier.anon_profile_id) {
                      console.log('ℹ️ No valid user identifier available, using localStorage');
                      const stored = localStorage.getItem('meals');
                      return stored ? JSON.parse(stored) : [];
                  }

                  console.log('📡 Using UUID-based authentication to load meals...', {
                      user_id: identifier.user_id ? 'authenticated' : null,
                      anon_profile_id: identifier.anon_profile_id ? 'anonymous' : null
                  });

                  // Query meals for this user and date
                  const query = window.supabaseClient
                      .from('daily_meals')
                      .select('*')
                      .eq('meal_date', mealDate);

                  // Apply user filter based on auth status
                  if (identifier.user_id) {
                      query.eq('user_id', identifier.user_id);
                  } else if (identifier.anon_profile_id) {
                      query.eq('anon_profile_id', identifier.anon_profile_id);
                  }

                  const { data, error } = await query.order('created_at', { ascending: true });
                
                  if (error) {
                      console.warn('⚠️ Supabase daily meals load error:', error.message);
                      throw error;
                  }

                  if (data && data.length > 0) {
                      console.log(`✅ Loaded ${data.length} daily meals from Supabase for ${mealDate}`);
                      return data.map((meal, index) => ({
                          id: meal.id || Date.now() + index,
                          name: meal.meal_name,
                          calories: meal.calories,
                          protein: meal.protein,
                          carbs: meal.carbs,
                          fat: meal.fat
                      }));
                  }

                  // No meals found in database
                  console.log('📱 No database meals found, falling back to localStorage...');
                  const stored = localStorage.getItem('meals');
                  return stored ? JSON.parse(stored) : [];
                
              } catch (error) {
                  console.error('❌ Failed to load daily meals from database:', error);
                
                  // Final fallback to localStorage
                  console.log('📱 Falling back to localStorage...');
                  const stored = localStorage.getItem('meals');
                  return stored ? JSON.parse(stored) : [];
              }
          }

          // Progress Entries API
          // Progress Tracker API with Supabase Integration
          async function saveProgressEntryToDB(entry) {
              if (!window.supabaseClient && !window.apiCall) {
                  console.log('ℹ️ No database connection available for progress entry save');
                  return { fallback: true };
              }

              console.log('💾 Saving progress entry to database...');
            
              try {
                  // Get user identifier using authHelper (supports both authenticated users and anonymous profiles)
                  const identifier = await window.authHelper.getCurrentUserIdentifier();
                
                  if (!identifier.user_id && !identifier.anon_profile_id) {
                      throw new Error('No valid user identifier available');
                  }

                  console.log('💾 Using UUID-based authentication with Supabase...', {
                      user_id: identifier.user_id ? 'authenticated' : null,
                      anon_profile_id: identifier.anon_profile_id ? 'anonymous' : null
                  });

                  // Check if progress entry exists for this date
                  const queryFilter = await window.authHelper.getUserQueryFilter();
                  const existingQuery = window.supabaseClient
                      .from('progress_entries')
                      .select('*')
                      .eq('date', entry.date);

                  // Apply user filter based on auth status
                  if (identifier.user_id) {
                      existingQuery.eq('user_id', identifier.user_id);
                  } else if (identifier.anon_profile_id) {
                      existingQuery.eq('anon_profile_id', identifier.anon_profile_id);
                  }

                  const { data: existing, error: selectError } = await existingQuery.maybeSingle();

                  // Prepare data using authHelper
                  const progressData = await window.authHelper.createInsertPayload({
                      date: entry.date,
                      weight_kg: entry.weight,
                      waist_cm: entry.measurements?.waist || null,
                      chest_cm: entry.measurements?.chest || null,
                      hips_cm: entry.measurements?.hips || null,
                      arms_cm: entry.measurements?.arms || null,
                      notes: entry.notes || '',
                      entry_uuid: entry.id.toString()
                  });

                  if (existing && !selectError) {
                      // Update existing progress entry using upsert
                      const { data: updateData, error } = await window.supabaseClient
                          .from('progress_entries')
                          .upsert(progressData, { 
                              onConflict: identifier.user_id ? 'user_id,date' : 'anon_profile_id,date'
                          })
                          .select();
                    
                      if (error) {
                          console.warn('⚠️ Supabase progress entry update failed:', error.message);
                          throw error;
                      }
                      console.log('✅ Progress entry updated in Supabase:', updateData);
                      return updateData;
                  } else {
                      // Create new progress entry
                      const { data: insertData, error } = await window.supabaseClient
                          .from('progress_entries')
                          .insert(progressData)
                          .select();
                    
                      if (error) {
                          console.warn('⚠️ Supabase progress entry insert failed:', error.message);
                          throw error;
                      }
                      console.log('✅ Progress entry created in Supabase:', insertData);
                      return insertData;
                  }
                
              } catch (error) {
                  console.warn('⚠️ Supabase save failed, trying RESTful API fallback:', error.message);
                
                  // Fallback to RESTful API if Supabase fails
                  if (window.apiCall) {
                      try {
                          console.log('📡 Using RESTful API for progress entry save...');
                        
                          // Get user email for RESTful API
                          const userEmail = getCurrentUserEmail();
                        
                          // Prepare data for RESTful API
                          const apiProgressData = {
                              email: userEmail,
                              date: entry.date,
                              weight_kg: entry.weight,
                              waist_cm: entry.measurements?.waist || null,
                              chest_cm: entry.measurements?.chest || null,
                              hips_cm: entry.measurements?.hips || null,
                              arms_cm: entry.measurements?.arms || null,
                              notes: entry.notes || '',
                              entry_uuid: entry.id.toString()
                          };
                        
                          // Check if RESTful API endpoints are available first
                          const apiAvailable = await checkApiEndpoints();
                          if (!apiAvailable) {
                              console.log('⚠️ RESTful API endpoints not available - skipping progress entry RESTful API fallback');
                              return { fallback: true };
                          }
                        
                          // Check if entry exists for this date using direct Supabase query
                          try {
                              // Checking existing progress entries
                              let query = window.supabaseClient.from('progress_entries').select('*');
                              if (window.SupabaseQueryHelper) {
                                  query = window.SupabaseQueryHelper.applySearchFilter(query, userEmail, 'progress_entries');
                              } else {
                                  query = query.eq('user_email', userEmail);
                              }
                              const { data: existingData, error: existingError } = await query;
                              if (existingError) throw existingError;
                              const existingEntry = existingData?.find(e => e.date === entry.date);
                            
                              if (existingEntry) {
                                  // Update existing entry
                                  const updateResult = await apiCall(`tables/progress_entries/${existingEntry.id}`, 'PUT', apiProgressData);
                                  console.log('✅ Progress entry updated via RESTful API');
                                  return updateResult;
                              } else {
                                  // Create new entry
                                  const createResult = await apiCall('tables/progress_entries', 'POST', apiProgressData);
                                  console.log('✅ Progress entry created via RESTful API');
                                  return createResult;
                              }
                          } catch (apiError) {
                              console.warn('⚠️ RESTful API save failed:', apiError.message);
                              return { fallback: true, error: `Both Supabase and RESTful API failed: ${error.message}, ${apiError.message}` };
                          }
                      } catch (apiFallbackError) {
                          console.error('❌ RESTful API fallback failed:', apiFallbackError.message);
                          return { fallback: true, error: `Both Supabase and RESTful API failed: ${error.message}, ${apiFallbackError.message}` };
                      }
                  } else {
                      console.error('❌ Failed to save progress entry to database:', error);
                      return { fallback: true, error: error.message };
                  }
              }
          }

          async function loadProgressEntries() {
              if (!window.supabaseClient && !window.apiCall) {
                  console.log('ℹ️ No database connection available, using localStorage for progress entries');
                  const stored = localStorage.getItem('progressEntries');
                  return stored ? JSON.parse(stored) : [];
              }

              console.log('📡 Loading progress entries from database...');
            
              try {
                  // Try Supabase first
                  if (window.supabaseClient) {
                      // Get user identifier using authHelper (supports both authenticated users and anonymous profiles)
                      const identifier = await window.authHelper.getCurrentUserIdentifier();
                    
                      if (!identifier.user_id && !identifier.anon_profile_id) {
                          console.log('ℹ️ No valid user identifier available for progress entries loading, using localStorage');
                          const stored = localStorage.getItem('progressEntries');
                          return stored ? JSON.parse(stored) : [];
                      }

                      console.log('📡 Using UUID-based authentication with Supabase...', {
                          user_id: identifier.user_id ? 'authenticated' : null,
                          anon_profile_id: identifier.anon_profile_id ? 'anonymous' : null
                      });

                      // Query based on available identifier
                      let query = window.supabaseClient.from('progress_entries').select('*');
                    
                      if (identifier.user_id) {
                          query = query.eq('user_id', identifier.user_id);
                      } else {
                          query = query.eq('anon_profile_id', identifier.anon_profile_id);
                      }
                    
                      const { data, error } = await query.order('date', { ascending: false });

                      if (error) {
                          console.warn('⚠️ Supabase progress entries load error:', error.message);
                          throw error; // Fall through to RESTful API
                      }

                      if (data && data.length > 0) {
                          console.log(`✅ Loaded ${data.length} progress entries from Supabase`);
                          return data.map(entry => ({
                              id: parseInt(entry.entry_uuid) || Date.now(),
                              date: entry.date,
                              weight: entry.weight_kg,
                              measurements: {
                                  waist: entry.waist_cm,
                                  chest: entry.chest_cm,
                                  hips: entry.hips_cm,
                                  arms: entry.arms_cm
                              },
                              notes: entry.notes || '',
                              timestamp: new Date(entry.created_at).getTime()
                          }));
                      }
                  }

                  // Fallback to RESTful API
                  if (window.apiCall) {
                      try {
                          console.log('📡 Using RESTful API for progress entries load...');
                        
                          // Check if RESTful API endpoints are available first
                          const apiAvailable = await checkApiEndpoints();
                          if (!apiAvailable) {
                              console.log('⚠️ RESTful API endpoints not available - skipping progress entries RESTful API fallback');
                              const stored = localStorage.getItem('progressEntries');
                              return stored ? JSON.parse(stored) : [];
                          }
                        
                          // Get user identifier using authHelper
                          const identifier = await window.authHelper.getCurrentUserIdentifier();
                        
                          if (!identifier.user_id && !identifier.anon_profile_id) {
                              console.log('ℹ️ No valid user identifier available for RESTful API progress entries, using localStorage');
                              const stored = localStorage.getItem('progressEntries');
                              return stored ? JSON.parse(stored) : [];
                          }

                          // Search for progress entries using UUID
                          const searchField = identifier.user_id ? 'user_id' : 'anon_profile_id';
                          const searchValue = identifier.user_id || identifier.anon_profile_id;
                        
                          // Use direct Supabase query to avoid PGRST100 errors
                          console.log(`🔍 Loading progress entries with safe query for ${searchField}:`, searchValue);
                          let query = window.supabaseClient.from('progress_entries').select('*');
                          if (window.SupabaseQueryHelper) {
                              query = window.SupabaseQueryHelper.applySearchFilter(query, searchValue, 'progress_entries');
                          } else {
                              query = query.eq(searchField, searchValue);
                          }
                          query = query.order('date', { ascending: false });
                          const { data: responseData, error: responseError } = await query;
                          if (responseError) throw responseError;
                        
                          const response = { data: responseData };
                        
                          if (response.data && response.data.length > 0) {
                              console.log(`✅ Loaded ${response.data.length} progress entries from RESTful API`);
                              return response.data
                                  .filter(entry => entry[searchField] === searchValue)
                                  .map(entry => ({
                                      id: parseInt(entry.entry_uuid) || Date.now(),
                                      date: entry.date,
                                      weight: entry.weight_kg,
                                      measurements: {
                                          waist: entry.waist_cm,
                                          chest: entry.chest_cm,
                                          hips: entry.hips_cm,
                                          arms: entry.arms_cm
                                      },
                                      notes: entry.notes || '',
                                      timestamp: new Date(entry.created_at).getTime()
                                  }))
                                  .sort((a, b) => new Date(b.date) - new Date(a.date));
                          } else {
                              console.log('📡 No progress entries found in RESTful API');
                              return [];
                          }
                      } catch (apiError) {
                          console.warn('⚠️ RESTful API progress entries load failed:', apiError.message);
                          if (apiError.message && apiError.message.includes('404')) {
                              console.log('📋 Progress entries table not found in RESTful API - this is normal for new users');
                          }
                          return [];
                      }
                  }
                
                  return [];
                
              } catch (error) {
                  console.error('❌ Failed to load progress entries from database:', error);
                
                  // Final fallback to localStorage
                  console.log('📱 Falling back to localStorage...');
                  const stored = localStorage.getItem('progressEntries');
                  return stored ? JSON.parse(stored) : [];
              }
          }

          // Progress Goals API with Supabase Integration
          async function saveProgressGoalToDB(goal) {
              if (!window.supabaseClient && !window.apiCall) {
                  console.log('ℹ️ No database connection available for progress goal save');
                  return { fallback: true };
              }

              console.log('💾 Saving progress goal to database...');
            
              try {
                  // Get user identifier using authHelper (supports both authenticated users and anonymous profiles)
                  const identifier = await window.authHelper.getCurrentUserIdentifier();
                
                  if (!identifier.user_id && !identifier.anon_profile_id) {
                      throw new Error('No valid user identifier available');
                  }

                  console.log('💾 Using UUID-based authentication with Supabase...', {
                      user_id: identifier.user_id ? 'authenticated' : null,
                      anon_profile_id: identifier.anon_profile_id ? 'anonymous' : null
                  });

                  // Deactivate existing goals for this user
                  const deactivateQuery = window.supabaseClient
                      .from('progress_goals')
                      .update({ is_active: false });

                  if (identifier.user_id) {
                      deactivateQuery.eq('user_id', identifier.user_id);
                  } else if (identifier.anon_profile_id) {
                      deactivateQuery.eq('anon_profile_id', identifier.anon_profile_id);
                  }

                  await deactivateQuery;
                
                  // Create new active goal using authHelper
                  const goalData = await window.authHelper.createInsertPayload({
                      goal_type: 'weight_loss', // Default goal type
                      current_value: goal.currentWeight || 0,
                      target_value: goal.targetWeight,
                      target_date: goal.targetDate,
                      unit: 'kg',
                      is_active: true,
                      notes: goal.notes || ''
                  });

                  const { data: insertData, error } = await window.supabaseClient
                      .from('progress_goals')
                      .insert(goalData)
                      .select();
                
                  if (error) {
                      console.warn('⚠️ Supabase progress goal insert failed:', error.message);
                      throw error;
                  }
                  console.log('✅ Progress goal created in Supabase:', insertData);
                  return insertData;
                
              } catch (error) {
                  console.warn('⚠️ Supabase save failed, trying RESTful API fallback:', error.message);
                
                  // Fallback to RESTful API if Supabase fails
                  if (window.apiCall) {
                      try {
                          console.log('📡 Using RESTful API for progress goal save...');
                        
                          // Check if RESTful API endpoints are available first
                          const apiAvailable = await checkApiEndpoints();
                          if (!apiAvailable) {
                              console.log('⚠️ RESTful API endpoints not available - skipping progress goal RESTful API fallback');
                              return { fallback: true };
                          }
                        
                          // Get user email for RESTful API
                          const userEmail = getCurrentUserEmail();
                        
                          // First, deactivate existing goals
                          try {
                              // Use direct Supabase query to avoid PGRST100 errors
                              console.log('🔍 Loading existing progress goals with safe query for:', userEmail);
                              const { data: existingGoalsData, error: existingGoalsError } = await window.supabaseClient
                                  .from('progress_goals')
                                  .select('*')
                                  .eq('user_email', userEmail);
                              if (existingGoalsError) throw existingGoalsError;
                            
                              const existingGoalsResponse = { data: existingGoalsData };
                              if (existingGoalsResponse.data && existingGoalsResponse.data.length > 0) {
                                  const activeGoals = existingGoalsResponse.data.filter(g => g.is_active);
                                  for (const activeGoal of activeGoals) {
                                      await apiCall(`tables/progress_goals/${activeGoal.id}`, 'PATCH', { is_active: false });
                                  }
                              }
                          } catch (deactivateError) {
                              console.warn('⚠️ Could not deactivate existing goals:', deactivateError.message);
                          }
                        
                          // Prepare data for RESTful API
                          const apiGoalData = {
                              email: userEmail,
                              goal_type: 'weight_loss', // Default goal type
                              current_value: goal.currentWeight || 0,
                              target_value: goal.targetWeight,
                              target_date: goal.targetDate,
                              unit: 'kg',
                              is_active: true,
                              created_date: goal.setDate || new Date().toISOString().split('T')[0],
                              notes: goal.notes || ''
                          };
                        
                          // Create new goal
                          const createResult = await apiCall('tables/progress_goals', 'POST', apiGoalData);
                          console.log('✅ Progress goal created via RESTful API');
                          return createResult;
                        
                      } catch (apiError) {
                          console.error('❌ RESTful API fallback failed:', apiError.message);
                          return { fallback: true, error: `Both Supabase and RESTful API failed: ${error.message}, ${apiError.message}` };
                      }
                  } else {
                      console.error('❌ Failed to save progress goal to database:', error);
                      return { fallback: true, error: error.message };
                  }
              }
          }

          async function loadProgressGoalFromDB() {
              if (!window.supabaseClient && !window.apiCall) {
                  return null;
              }

              const userEmail = getCurrentUserEmail();
              console.log('📡 Loading progress goal from database...');
            
              try {
                  // Try Supabase first
                  if (window.supabaseClient) {
                      const { data: { user } } = await window.supabaseClient.auth.getUser();
                      if (!user) {
                          console.log('ℹ️ No authenticated user for progress goal loading');
                          return null;
                      }

                      const lookupEmail = user.email || `anon_${user.id}`;
                    
                      // Use safe query to avoid PGRST100 errors
                      console.log('🔍 Loading progress goals from Supabase for:', lookupEmail);
                      const { data, error } = await window.supabaseClient
                          .from('progress_goals')
                          .select('*')
                          .eq('user_email', lookupEmail)  // Changed from 'email' to 'user_email'
                          .eq('is_active', true)
                          .order('created_at', { ascending: false })
                          .limit(1)
                          .maybeSingle();

                      if (error) {
                          console.warn('⚠️ Supabase progress goal load error:', error.message);
                          throw error; // Fall through to RESTful API
                      }

                      if (data) {
                          console.log('✅ Loaded progress goal from Supabase');
                          return {
                              targetWeight: data.target_value,
                              targetDate: data.target_date,
                              setDate: data.created_at,
                              currentWeight: data.current_value,
                              notes: data.notes
                          };
                      }
                  }

                  // Fallback to RESTful API
                  if (window.apiCall) {
                      try {
                          console.log('📡 Using RESTful API for progress goal load...');
                        
                          // Check if RESTful API endpoints are available first
                          const apiAvailable = await checkApiEndpoints();
                          if (!apiAvailable) {
                              console.log('⚠️ RESTful API endpoints not available - skipping progress goal RESTful API fallback');
                              return null;
                          }
                        
                          // Use direct Supabase query to avoid PGRST100 errors
                          console.log('🔍 Loading progress goals with safe query for:', userEmail);
                          const { data: responseData, error: responseError } = await window.supabaseClient
                              .from('progress_goals')
                              .select('*')
                              .eq('user_email', userEmail);
                          if (responseError) throw responseError;
                        
                          const response = { data: responseData };
                        
                          if (response.data && response.data.length > 0) {
                              const activeGoals = response.data
                                  .filter(goal => goal.is_active)
                                  .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
                            
                              if (activeGoals.length > 0) {
                                  const goal = activeGoals[0];
                                  console.log('✅ Loaded progress goal from RESTful API');
                                  return {
                                      targetWeight: goal.target_value,
                                      targetDate: goal.target_date,
                                      setDate: goal.created_at,
                                      currentWeight: goal.current_value,
                                      notes: goal.notes
                                  };
                              }
                          } else {
                              console.log('📡 No progress goals found in RESTful API');
                          }
                      } catch (apiError) {
                          console.warn('⚠️ RESTful API progress goal load failed:', apiError.message);
                          if (apiError.message && apiError.message.includes('404')) {
                              console.log('📋 Progress goals table not found in RESTful API - this is normal for new users');
                          }
                      }
                  }
                
                  return null;
                
              } catch (error) {
                  console.error('❌ Failed to load progress goal from database:', error);
                  return null;
              }
          }

          // Macro History API with Supabase Integration
          async function saveMacroHistoryToDB(macroEntry) {
              if (!window.supabaseClient) {
                  console.log('ℹ️ No database connection available for macro history save');
                  return { fallback: true };
              }

              console.log('💾 Saving macro history entry to database...');
            
              try {
                  // Get user identifier using authHelper (supports both authenticated users and anonymous profiles)
                  const identifier = await window.authHelper.getCurrentUserIdentifier();
                
                  if (!identifier.user_id && !identifier.anon_profile_id) {
                      throw new Error('No valid user identifier available');
                  }

                  console.log('💾 Using UUID-based authentication with Supabase...', {
                      user_id: identifier.user_id ? 'authenticated' : null,
                      anon_profile_id: identifier.anon_profile_id ? 'anonymous' : null
                  });

                  // Prepare data using authHelper
                  const macroData = await window.authHelper.createInsertPayload({
                      date: macroEntry.date,
                      calories_consumed: macroEntry.calories,
                      protein_consumed: macroEntry.protein,
                      carbs_consumed: macroEntry.carbs,
                      fat_consumed: macroEntry.fat,
                      calories_goal: macroEntry.caloriesGoal,
                      protein_goal: macroEntry.proteinGoal,
                      carbs_goal: macroEntry.carbsGoal,
                      fat_goal: macroEntry.fatGoal,
                      protein_percent: macroEntry.proteinPercent,
                      carbs_percent: macroEntry.carbsPercent,
                      fat_percent: macroEntry.fatPercent,
                      goals_met: macroEntry.goalsMet
                  });

                  // Use upsert to handle duplicates (update if exists, insert if not)
                  const conflictColumns = identifier.user_id ? 'user_id,date' : 'anon_profile_id,date';
                  const { data: upsertData, error } = await window.supabaseClient
                      .from('macro_history')
                      .upsert(macroData, { 
                          onConflict: conflictColumns,
                          ignoreDuplicates: false 
                      })
                      .select();
                
                  if (error) {
                      console.warn('⚠️ Supabase macro history upsert failed:', error.message);
                      throw error;
                  }
                  console.log('✅ Macro history saved to Supabase:', upsertData);
                  return upsertData;
                
              } catch (error) {
                  console.error('❌ Failed to save macro history to database:', error);
                  return { fallback: true, error: error.message };
              }
          }

          async function loadMacroHistoryFromDB() {
              if (!window.supabaseClient && !window.apiCall) {
                  return [];
              }

              const userEmail = getCurrentUserEmail();
              console.log('📡 Loading macro history from database...');
            
              try {
                  // Try Supabase first
                  if (window.supabaseClient) {
                      const { data: { user } } = await window.supabaseClient.auth.getUser();
                      if (!user) {
                          console.log('ℹ️ No authenticated user for macro history loading');
                          return [];
                      }

                      const lookupEmail = user.email || `anon_${user.id}`;
                    
                      const { data, error } = await window.supabaseClient
                          .from('macro_history')
                          .select('*')
                          .eq('user_email', lookupEmail)
                          .order('date', { ascending: false })
                          .limit(30); // Last 30 days

                      if (error) {
                          console.warn('⚠️ Supabase macro history load error:', error.message);
                          throw error; // Fall through to RESTful API
                      }

                      if (data && data.length > 0) {
                          console.log(`✅ Loaded ${data.length} macro history entries from Supabase`);
                          return data.map(entry => ({
                              date: entry.date,
                              calories: entry.calories_consumed,
                              protein: entry.protein_consumed,
                              carbs: entry.carbs_consumed,
                              fat: entry.fat_consumed,
                              caloriesGoal: entry.calories_goal,
                              proteinGoal: entry.protein_goal,
                              carbsGoal: entry.carbs_goal,
                              fatGoal: entry.fat_goal,
                              proteinPercent: entry.protein_percent,
                              carbsPercent: entry.carbs_percent,
                              fatPercent: entry.fat_percent,
                              goalsMet: entry.goals_met
                          }));
                      }
                  }

                  // Fallback to RESTful API
                  if (window.apiCall) {
                      console.log('📡 Using RESTful API for macro history load...');
                    
                      // Check if RESTful API endpoints are available first
                      const apiAvailable = await checkApiEndpoints();
                      if (!apiAvailable) {
                          console.log('⚠️ RESTful API endpoints not available - skipping macro history RESTful API fallback');
                          return [];
                      }
                    
                      // Use direct Supabase query to avoid PGRST100 errors
                      console.log('🔍 Loading macro history with safe query for:', userEmail);
                      let query = window.supabaseClient.from('macro_history').select('*');
                      if (window.SupabaseQueryHelper) {
                          query = window.SupabaseQueryHelper.applySearchFilter(query, userEmail, 'macro_history');
                      } else {
                          query = query.eq('user_email', userEmail);
                      }
                      const { data: responseData, error: responseError } = await query;
                      if (responseError) throw responseError;
                    
                      const response = { data: responseData };
                    
                      if (response.data && response.data.length > 0) {
                          console.log(`✅ Loaded ${response.data.length} macro history entries from RESTful API`);
                          return response.data
                              .map(entry => ({
                                  date: entry.date,
                                  calories: entry.calories_consumed,
                                  protein: entry.protein_consumed,
                                  carbs: entry.carbs_consumed,
                                  fat: entry.fat_consumed,
                                  caloriesGoal: entry.calories_goal,
                                  proteinGoal: entry.protein_goal,
                                  carbsGoal: entry.carbs_goal,
                                  fatGoal: entry.fat_goal,
                                  proteinPercent: entry.protein_percent,
                                  carbsPercent: entry.carbs_percent,
                                  fatPercent: entry.fat_percent,
                                  goalsMet: entry.goals_met
                              }))
                              .sort((a, b) => new Date(b.date) - new Date(a.date))
                              .slice(0, 30);
                      }
                  }
                
                  return [];
                
              } catch (error) {
                  console.error('❌ Failed to load macro history from database:', error);
                  return [];
              }
          }

          // Custom Recipes API with Supabase Integration
          async function saveCustomRecipeToDB(recipe) {
              if (!window.supabaseClient) {
                  console.log('ℹ️ No database connection available for recipe save');
                  return { fallback: true };
              }

              console.log('💾 Saving custom recipe to database...');
            
              try {
                  // Get user identifier using authHelper (supports both authenticated users and anonymous profiles)
                  const identifier = await window.authHelper.getCurrentUserIdentifier();
                
                  if (!identifier.user_id && !identifier.anon_profile_id) {
                      throw new Error('No valid user identifier available');
                  }

                  console.log('💾 Using UUID-based authentication with Supabase...', {
                      user_id: identifier.user_id ? 'authenticated' : null,
                      anon_profile_id: identifier.anon_profile_id ? 'anonymous' : null
                  });
                
                  // Generate proper UUID for recipe if not exists
                  const recipeUuid = recipe.uuid || 
                                    (recipe.id && typeof recipe.id === 'string' && recipe.id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i) ? 
                                     recipe.id : 
                                     crypto.randomUUID());

                  // Debug: Log the recipe object being processed
                  console.log('🔍 Processing recipe for database save:', recipe);
                
                  // Prepare recipe data using authHelper
                  const recipeData = await window.authHelper.createInsertPayload({
                      recipe_name: recipe.name,
                      category: recipe.category || 'General',
                      calories: Math.round(recipe.calories || 0), // Convert to INTEGER
                      protein: Math.round(recipe.protein || 0),   // Convert to INTEGER
                      carbs: Math.round(recipe.carbs || 0),       // Convert to INTEGER
                      fat: Math.round(recipe.fat || 0),           // Convert to INTEGER
                      servings: parseInt(recipe.servings) || 1,   // Ensure integer
                      ingredients: recipe.ingredients || [],      // Store as JSONB directly
                      instructions: recipe.instructions || '',
                      recipe_uuid: recipeUuid
                  });
                
                  console.log('🔍 Prepared recipe data for database:', recipeData);
                
                  // Validate data types before database operation
                  const validationErrors = [];
                  if (typeof recipeData.recipe_name !== 'string') {
                      validationErrors.push(`recipe_name should be string, got ${typeof recipeData.recipe_name}`);
                  }
                  if (typeof recipeData.calories !== 'number' || isNaN(recipeData.calories)) {
                      validationErrors.push(`calories should be number, got ${typeof recipeData.calories} (${recipeData.calories})`);
                  }
                  if (typeof recipeData.protein !== 'number' || isNaN(recipeData.protein)) {
                      validationErrors.push(`protein should be number, got ${typeof recipeData.protein} (${recipeData.protein})`);
                  }
                  if (typeof recipeData.carbs !== 'number' || isNaN(recipeData.carbs)) {
                      validationErrors.push(`carbs should be number, got ${typeof recipeData.carbs} (${recipeData.carbs})`);
                  }
                  if (typeof recipeData.fat !== 'number' || isNaN(recipeData.fat)) {
                      validationErrors.push(`fat should be number, got ${typeof recipeData.fat} (${recipeData.fat})`);
                  }
                  if (typeof recipeData.servings !== 'number' || isNaN(recipeData.servings)) {
                      validationErrors.push(`servings should be number, got ${typeof recipeData.servings} (${recipeData.servings})`);
                  }
                
                  if (validationErrors.length > 0) {
                      console.error('🚨 Data validation failed:', validationErrors);
                      throw new Error(`Recipe data validation failed: ${validationErrors.join(', ')}`);
                  }

                  // Check if recipe already exists for this user
                  const existingQuery = window.supabaseClient
                      .from('custom_recipes')
                      .select('*')
                      .eq('recipe_uuid', recipeUuid);

                  if (identifier.user_id) {
                      existingQuery.eq('user_id', identifier.user_id);
                  } else if (identifier.anon_profile_id) {
                      existingQuery.eq('anon_profile_id', identifier.anon_profile_id);
                  }

                  const { data: existing, error: selectError } = await existingQuery.maybeSingle();

                  if (existing && !selectError) {
                      // Update existing recipe using upsert
                      const conflictColumns = identifier.user_id ? 'user_id,recipe_uuid' : 'anon_profile_id,recipe_uuid';
                      const { data: updateData, error } = await window.supabaseClient
                          .from('custom_recipes')
                          .upsert(recipeData, { 
                              onConflict: conflictColumns,
                              ignoreDuplicates: false 
                          })
                          .select();
                    
                      if (error) {
                          console.error('⚠️ Supabase recipe update failed:', {
                              errorMessage: error.message,
                              errorDetails: error.details,
                              errorHint: error.hint,
                              errorCode: error.code,
                              recipeDataSent: recipeData
                          });
                        
                          // Try to provide more helpful error message
                          if (error.message.includes('invalid input syntax for type integer')) {
                              throw new Error(`Database schema issue: A text value is being sent to an integer field. Please check the database table schema for 'custom_recipes'. Original error: ${error.message}`);
                          }
                        
                          throw error;
                      }
                      console.log('✅ Recipe updated in Supabase:', updateData);
                      return updateData;
                  } else {
                      // Create new recipe
                      const { data: insertData, error } = await window.supabaseClient
                          .from('custom_recipes')
                          .insert(recipeData)
                          .select();
                    
                      if (error) {
                          console.error('⚠️ Supabase recipe insert failed:', {
                              errorMessage: error.message,
                              errorDetails: error.details,
                              errorHint: error.hint,
                              errorCode: error.code,
                              recipeDataSent: recipeData
                          });
                        
                          // Try to provide more helpful error message
                          if (error.message.includes('invalid input syntax for type integer')) {
                              throw new Error(`Database schema issue: A text value is being sent to an integer field. Please check the database table schema for 'custom_recipes'. Original error: ${error.message}`);
                          }
                        
                          throw error;
                      }
                      console.log('✅ Recipe created in Supabase:', insertData);
                      return insertData;
                  }
                
              } catch (error) {
                  console.error('❌ Failed to save recipe to database:', error);
                  return { fallback: true, error: error.message };
              }
          }

          async function loadCustomRecipes() {
              if (!window.supabaseClient && !window.apiCall) {
                  console.log('ℹ️ No database connection available, using localStorage for recipes');
                  const stored = localStorage.getItem('customRecipes');
                  return stored ? JSON.parse(stored) : [];
              }

              console.log('📡 Loading custom recipes from database...');
            
              try {
                  // Get user context for new schema
                  const userContext = await getCurrentUserContext();
                
                  // Try Supabase first (NEW SCHEMA)
                  if (window.supabaseClient && userContext) {
                      console.log('📡 Using Supabase with secure authentication...');
                    
                      const { data, error } = await window.supabaseClient
                          .from('custom_recipes')
                          .select('*')
                          .eq('user_id', userContext.user_id)
                          .order('created_at', { ascending: false });

                      if (error) {
                          console.warn('⚠️ Supabase custom recipes load error:', error.message);
                          throw error; // Fall through to RESTful API or legacy
                      }

                      if (data && data.length > 0) {
                          console.log(`✅ Loaded ${data.length} custom recipes from Supabase (NEW SCHEMA)`);
                          return data.map(recipe => ({
                              id: recipe.recipe_uuid, // Use UUID instead of integer ID
                              name: recipe.recipe_name,
                              category: recipe.category,
                              calories: recipe.calories,
                              protein: recipe.protein,
                              carbs: recipe.carbs,
                              fat: recipe.fat,
                              servings: recipe.servings,
                              ingredients: recipe.ingredients || [], // JSONB field - no parsing needed
                              instructions: recipe.instructions,
                              source: 'custom'
                          }));
                      }
                  }

                  // Legacy Supabase fallback (OLD SCHEMA) 
                  if (window.supabaseClient) {
                      const { data: { user } } = await window.supabaseClient.auth.getUser();
                      if (user) {
                          const lookupEmail = user.email || `anon_${user.id}`;
                          console.log('📡 Attempting legacy Supabase schema...');
                        
                          const { data, error } = await window.supabaseClient
                              .from('custom_recipes')
                              .select('*')
                              .eq('user_email', lookupEmail)
                              .order('created_at', { ascending: false });

                          if (!error && data && data.length > 0) {
                              console.log(`✅ Loaded ${data.length} custom recipes from Supabase (LEGACY SCHEMA)`);
                              return data.map(recipe => ({
                                  id: parseInt(recipe.recipe_id) || Date.now(),
                                  name: recipe.recipe_name,
                                  category: recipe.category,
                                  calories: recipe.calories,
                                  protein: recipe.protein,
                                  carbs: recipe.carbs,
                                  fat: recipe.fat,
                                  servings: recipe.servings,
                                  ingredients: JSON.parse(recipe.ingredients || '[]'),
                                  instructions: recipe.instructions,
                                  source: 'custom'
                              }));
                          }
                      }
                  }

                  // Fallback to RESTful API
                  if (window.apiCall) {
                      console.log('📡 Using RESTful API for recipe load...');
                      const userEmail = getCurrentUserEmail();
                      // Use direct Supabase query to avoid PGRST100 errors
                      console.log('🔍 Loading custom recipes with safe query for:', userEmail);
                      const { data: responseData, error: responseError } = await window.supabaseClient
                          .from('custom_recipes')
                          .select('*')
                          .eq('user_email', userEmail);
                      if (responseError) throw responseError;
                    
                      const response = { data: responseData };
                    
                      if (response.data && response.data.length > 0) {
                          console.log(`✅ Loaded ${response.data.length} custom recipes from RESTful API`);
                          return response.data.map(recipe => ({
                              id: parseInt(recipe.recipe_id) || Date.now(),
                              name: recipe.recipe_name,
                              category: recipe.category,
                              calories: recipe.calories,
                              protein: recipe.protein,
                              carbs: recipe.carbs,
                              fat: recipe.fat,
                              servings: recipe.servings,
                              ingredients: JSON.parse(recipe.ingredients || '[]'),
                              instructions: recipe.instructions,
                              source: 'custom'
                          }));
                      }
                  }
                
                  return [];
                
              } catch (error) {
                  console.error('❌ Failed to load custom recipes from database:', error);
                
                  // Final fallback to localStorage
                  console.log('📱 Falling back to localStorage...');
                  const stored = localStorage.getItem('customRecipes');
                  return stored ? JSON.parse(stored) : [];
              }
          }

          async function deleteCustomRecipeFromDB(recipeId) {
              if (!window.supabaseClient && !window.apiCall) {
                  console.log('ℹ️ No database connection available for recipe delete');
                  return { fallback: true };
              }

              console.log('🗑️ Deleting custom recipe from database...');
            
              try {
                  // Get user context for new schema
                  const userContext = await getCurrentUserContext();
                
                  // Try Supabase first (NEW SCHEMA)
                  if (window.supabaseClient && userContext) {
                      console.log('🗑️ Using Supabase with secure authentication...');
                    
                      // Delete using user_id and recipe_uuid for new schema
                      const { data, error } = await window.supabaseClient
                          .from('custom_recipes')
                          .delete()
                          .eq('user_id', userContext.user_id)
                          .eq('recipe_uuid', recipeId) // recipeId is already UUID for new schema
                          .select();

                      if (error) {
                          console.warn('⚠️ Supabase recipe delete failed (new schema):', error.message);
                          throw error; // Fall through to legacy method
                      }
                    
                      if (data && data.length > 0) {
                          console.log('✅ Recipe deleted from Supabase (NEW SCHEMA):', data);
                          return { success: true };
                      } else {
                          console.log('ℹ️ Recipe not found in Supabase (new schema)');
                          // Try legacy schema before giving up
                      }
                  }

                  // Legacy Supabase fallback (OLD SCHEMA)
                  if (window.supabaseClient) {
                      const { data: { user } } = await window.supabaseClient.auth.getUser();
                      if (user) {
                          const lookupEmail = user.email || `anon_${user.id}`;
                          console.log('🗑️ Attempting legacy Supabase schema...');
                        
                          // Delete the recipe using email and recipe_id (legacy)
                          const { data, error } = await window.supabaseClient
                              .from('custom_recipes')
                              .delete()
                              .eq('user_email', lookupEmail)
                              .eq('recipe_id', recipeId.toString())
                              .select();

                          if (!error && data && data.length > 0) {
                              console.log('✅ Recipe deleted from Supabase (LEGACY SCHEMA):', data);
                              return { success: true };
                          } else if (!error) {
                              console.log('ℹ️ Recipe not found in Supabase (legacy schema)');
                              return { success: true }; // Consider this success since recipe doesn't exist
                          }
                      }
                  }

                  // Fallback to RESTful API
                  if (window.apiCall) {
                      console.log('📡 Using RESTful API for recipe delete...');
                      const userEmail = getCurrentUserEmail();
                      // Use direct Supabase query to avoid PGRST100 errors
                      console.log('🔍 Loading custom recipes for delete with safe query for:', userEmail);
                      const { data: responseData, error: responseError } = await window.supabaseClient
                          .from('custom_recipes')
                          .select('*')
                          .eq('user_email', userEmail);
                      if (responseError) throw responseError;
                    
                      const response = { data: responseData };
                    
                      if (response.data) {
                          const recipe = response.data.find(r => parseInt(r.recipe_id) === recipeId);
                          if (recipe) {
                              await apiCall(`tables/custom_recipes/${recipe.id}`, 'DELETE');
                              console.log('✅ Recipe deleted via RESTful API');
                          } else {
                              console.log('ℹ️ Recipe not found in RESTful API');
                          }
                      }
                      return { success: true };
                  }
                
              } catch (error) {
                  console.error('❌ Failed to delete recipe from database:', error);
                
                  // Final fallback to RESTful API if Supabase fails
                  if (window.supabaseClient && window.apiCall) {
                      try {
                          console.log('🔄 Falling back to RESTful API...');
                          const userEmail = getCurrentUserEmail();
                          // Use direct Supabase query to avoid PGRST100 errors
                          console.log('🔍 Loading custom recipes with safe query for:', userEmail);
                          const { data: responseData, error: responseError } = await window.supabaseClient
                              .from('custom_recipes')
                              .select('*')
                              .eq('user_email', userEmail);
                          if (responseError) throw responseError;
                        
                          const response = { data: responseData };
                        
                          if (response.data) {
                              const recipe = response.data.find(r => parseInt(r.recipe_id) === recipeId);
                              if (recipe) {
                                  await apiCall(`tables/custom_recipes/${recipe.id}`, 'DELETE');
                                  console.log('✅ Recipe deleted via RESTful API fallback');
                              }
                          }
                          return { success: true };
                      } catch (apiError) {
                          console.error('❌ RESTful API fallback also failed:', apiError);
                      }
                  }
                
                  return { fallback: true, error: error.message };
              }
          }


   function checkApiEndpoints() {
              if (apiEndpointsChecked) {
                  return apiEndpointsAvailable;
              }
            
              try {
                  // Checking RESTful API availability
                
                  // Use apiCall instead of safeFetch to test the endpoint
                  // This will use the proper RESTful Table API handling
                  const testResponse = await apiCall('tables/user_profiles?limit=1');
                
                  if (testResponse && (testResponse.data !== undefined || Array.isArray(testResponse))) {
                      console.log('✅ RESTful API endpoints are available');
                      apiEndpointsAvailable = true;
                  } else {
                      console.log('⚠️ RESTful API endpoints not available - invalid response format');
                      apiEndpointsAvailable = false;
                  }
              } catch (error) {
                  console.log('⚠️ RESTful API endpoints not available (error):', error.message);
                  // Check if it's specifically a 404 error with HTML response
                  if (error.message && error.message.includes('404') && error.message.includes('<!DOCTYPE html>')) {
                      // RESTful API endpoints not available
                  }
                  apiEndpointsAvailable = false;
              }
            
              apiEndpointsChecked = true;
              return apiEndpointsAvailable;
          }

          // Supabase-first API helper function
          async function apiCall(endpoint, method = 'GET', data = null) {
              console.log('🌐 API Call:', { endpoint, method, hasData: !!data });
            
              try {
                  // Handle table operations with Supabase directly
                  if (endpoint.startsWith('tables/')) {
                      return await handleSupabaseTableCall(endpoint, method, data);
                  }
                
                  // Handle non-table endpoints (fallback to fetch)
                  const options = {
                      method: method,
                      headers: {
                          'Content-Type': 'application/json'
                      }
                  };
                
                  if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
                      options.body = JSON.stringify(data);
                  }
                
                  const response = await fetch(endpoint, options);
                
                  if (!response.ok) {
                      throw new Error(`API call failed: ${response.status}`);
                  }
                
                  if (method === 'DELETE') {
                      return { success: true };
                  }
                
                  return await response.json();
                
              } catch (error) {
                  console.error('API call error:', error);
                  throw error;
              }
          }

          // Handle Supabase table operations
          async function handleSupabaseTableCall(endpoint, method, data) {
              if (!window.supabaseClient) {
                  throw new Error('Supabase client not available');
              }

              // Validate data parameter for operations that require it
              if ((method === 'POST' || method === 'PUT' || method === 'PATCH') && (!data || typeof data !== 'object')) {
                  console.error('❌ Invalid data parameter for operation:', { method, data, endpoint });
                  throw new Error(`Data is required and must be an object for ${method} operations`);
              }

              const parts = endpoint.split('/');
              const tableName = parts[1];
              const recordId = parts[2];
              const queryParams = new URLSearchParams(endpoint.split('?')[1] || '');
            
              console.log('📊 Supabase operation:', { tableName, method, recordId, hasData: !!data });

              try {
                  switch (method) {
                      case 'GET':
                          let query = window.supabaseClient.from(tableName).select('*');
                        
                          // Handle search parameter using safe helper
                          const search = queryParams.get('search');
                          if (search) {
                              // Processing search query
                            
                              // ALWAYS use safe fallback logic to prevent PGRST100 errors
                              const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                              const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
                            
                              if (emailRegex.test(search)) {
                                  // Email - use exact match to avoid @ symbol issues
                                  console.log(`📧 Email detected: using exact match for '${search}'`);
                                  query = query.eq('user_email', search);
                              } else if (uuidRegex.test(search)) {
                                  // UUID - use exact match
                                  console.log(`🆔 UUID detected: using exact match for '${search}'`);
                                  query = query.eq('user_id', search);
                              } else {
                                  // Text - use simple ILIKE
                                  console.log(`📝 Text detected: using ILIKE for '${search}'`);
                                  query = query.ilike('user_email', `%${search}%`);
                              }
                          }
                        
                          // Handle pagination and sorting using safe helpers
                          if (window.SupabaseQueryHelper) {
                              const limit = queryParams.get('limit');
                              const sort = queryParams.get('sort');
                              query = window.SupabaseQueryHelper.applyPagination(query, limit, 0);
                              query = window.SupabaseQueryHelper.applySorting(query, sort);
                          } else {
                              // Fallback to direct methods
                              const limit = queryParams.get('limit');
                              if (limit) {
                                  query = query.limit(parseInt(limit));
                              }
                              const sort = queryParams.get('sort');
                              if (sort) {
                                  query = query.order(sort, { ascending: false });
                              }
                          }
                        
                          // Get single record by ID
                          if (recordId) {
                              query = query.eq('id', recordId).single();
                              const { data, error } = await query;
                              if (error) throw error;
                              return data;
                          }
                        
                          const { data, error } = await query;
                          if (error) throw error;
                        
                          return { data, total: data.length };

                      case 'POST':
                          const { data: newData, error: postError } = await window.supabaseClient
                              .from(tableName)
                              .insert(data)
                              .select()
                              .single();
                        
                          if (postError) throw postError;
                          return newData;

                      case 'PUT':
                      case 'PATCH':
                          const { data: updatedData, error: updateError } = await window.supabaseClient
                              .from(tableName)
                              .update(data)
                              .eq('id', recordId)
                              .select()
                              .single();
                        
                          if (updateError) throw updateError;
                          return updatedData;

                      case 'DELETE':
                          const { error: deleteError } = await window.supabaseClient
                              .from(tableName)
                              .delete()
                              .eq('id', recordId);
                        
                          if (deleteError) throw deleteError;
                          return { success: true };

                      default:
                          throw new Error(`Unsupported method: ${method}`);
                  }
              } catch (error) {
                  console.error('Supabase operation error:', error);
                  throw error;
              }
          }




          // Manual data refresh function (call from console)
          window.refreshUserData = async function() {
              try {
                  console.log('🔄 Manually refreshing user data...');
                  await loadUserDataAfterAuth();
                  console.log('✅ Manual data refresh completed');
              } catch (error) {
                  console.error('❌ Manual data refresh failed:', error);
              }
          };

          // Test Supabase connection (call from console)
          window.testSupabaseConnection = async function() {
              try {
                  console.log('🧪 Testing Supabase connection...');
                
                  if (!window.supabaseClient) {
                      console.error('❌ Supabase client not available');
                      return false;
                  }
                
                  // Test basic connection
                  const { data, error } = await window.supabaseClient
                      .from('user_profiles')
                      .select('id, user_name, user_email')
                      .limit(1);
                
                  if (error) {
                      console.error('❌ Supabase connection test failed:', error);
                      return false;
                  }
                
                  console.log('✅ Supabase connection successful:', data);
                  return true;
              } catch (error) {
                  console.error('❌ Supabase connection error:', error);
                  return false;
              }
          };



          // Migration function for existing users (call from console)
          window.migrateLocalStorageToDatabase = async function() {
              try {
                  console.log('🔄 Starting localStorage to database migration...');
                
                  // Check if user is authenticated
                  const userEmail = getCurrentUserEmail();
                  if (!userEmail || userEmail === 'anonymous@user.local') {
                      console.error('❌ User not authenticated - cannot migrate data');
                      return { error: 'User not authenticated' };
                  }
                
                  console.log('📧 Migrating data for user:', userEmail);
                
                  // Migrate meals from localStorage
                  const storedMeals = localStorage.getItem('meals');
                  if (storedMeals) {
                      const mealsArray = JSON.parse(storedMeals);
                      console.log('🍽️ Found', mealsArray.length, 'meals in localStorage');
                    
                      if (mealsArray.length > 0) {
                          const result = await saveDailyMeals(mealsArray);
                          console.log('✅ Meals migration result:', result);
                      }
                  }
                
                  // Migrate user profile from localStorage
                  const storedProfile = localStorage.getItem('userProfile');
                  if (storedProfile) {
                      const profileData = JSON.parse(storedProfile);
                      console.log('👤 Found user profile in localStorage:', profileData);
                    
                      const profileResult = await saveUserProfile(profileData);
                      console.log('✅ Profile migration result:', profileResult);
                  }
                
                  // Migrate targets if available
                  const storedTargets = localStorage.getItem('dailyTargets');
                  if (storedTargets && storedTargets !== 'undefined') {
                      const targets = JSON.parse(storedTargets);
                      console.log('🎯 Found daily targets in localStorage:', targets);
                    
                      const userInfo = localStorage.getItem('user_info');
                      const userName = userInfo ? JSON.parse(userInfo).name : '';
                    
                      const targetResult = await saveUserProfile({
                          name: userName,
                          unitSystem: currentUnitSystem || 'imperial',
                          dailyTargets: targets
                      });
                      console.log('✅ Targets migration result:', targetResult);
                  }
                
                  console.log('🎉 Migration completed successfully!');
                  console.log('🔄 Refreshing user data from database...');
                
                  // Reload data from database to verify
                  await loadUserDataAfterAuth();
                
                  return { 
                      success: true, 
                      message: 'Data migrated successfully from localStorage to database' 
                  };
                
              } catch (error) {
                  console.error('❌ Migration failed:', error);
                  return { error: error.message };
              }
          };

          // Load User Data After Authentication
          async function loadUserDataAfterAuth() {
              console.log('🔄 Loading user data from dedicated tables...');
            
              try {
                  // Load user preferences from dedicated table
                  const preferences = await loadUserPreferences();
                  if (preferences) {
                      console.log('✅ User preferences loaded:', preferences);
                    
                      // Update unit system if available
                      if (preferences.unit_system) {
                          currentUnitSystem = preferences.unit_system;
                          updateUnitLabels();
                          console.log('🔧 Unit system set to:', currentUnitSystem);
                      }
                  }
                
                  // Load daily targets from dedicated table
                  const targets = await loadDailyTargets();
                  if (targets) {
                      dailyTargets = {
                          calories: targets.daily_calories,
                          protein: targets.daily_protein,
                          carbs: targets.daily_carbs,
                          fat: targets.daily_fat
                      };
                      console.log('✅ Daily targets loaded from database:', dailyTargets);
                    
                      // Update display
                      if (document.getElementById('dailyCalories')) {
                          document.getElementById('dailyCalories').textContent = targets.daily_calories.toLocaleString();
                          document.getElementById('proteinAmount').textContent = targets.daily_protein + 'g';
                          document.getElementById('carbsAmount').textContent = targets.daily_carbs + 'g';
                          document.getElementById('fatAmount').textContent = targets.daily_fat + 'g';
                      }
                    
                      updateMacroCharts();
                  } else {
                      // Fallback to localStorage if database loading failed
                      console.log('📱 Database targets not found, checking localStorage fallback...');
                      const savedTargets = localStorage.getItem('dailyTargets');
                      if (savedTargets && savedTargets !== 'null') {
                          try {
                              const parsed = JSON.parse(savedTargets);
                              // Ensure all required fields are present and valid
                              if (parsed && parsed.calories > 0 && parsed.protein > 0) {
                                  dailyTargets = {
                                      calories: parsed.calories,
                                      protein: parsed.protein,
                                      carbs: parsed.carbs,
                                      fat: parsed.fat
                                  };
                                  console.log('✅ Daily targets loaded from localStorage:', dailyTargets);
                                
                                  // Update display
                                  if (document.getElementById('dailyCalories')) {
                                      document.getElementById('dailyCalories').textContent = dailyTargets.calories.toLocaleString();
                                      document.getElementById('proteinAmount').textContent = dailyTargets.protein + 'g';
                                      document.getElementById('carbsAmount').textContent = dailyTargets.carbs + 'g';
                                      document.getElementById('fatAmount').textContent = dailyTargets.fat + 'g';
                                  }
                                
                                  updateMacroCharts();
                              } else {
                                  console.log('ℹ️ localStorage targets incomplete, using defaults');
                              }
                          } catch (error) {
                              console.warn('⚠️ Error parsing localStorage targets:', error);
                          }
                      } else {
                          console.log('ℹ️ No saved targets found, using default values');
                      }
                  }
                
                  // Always ensure display is synchronized with current dailyTargets values
                  // This handles cases where defaults are used or saved data doesn't exist
                  ensureDisplaySync();
                
                  // Load calculation history and auto-populate personal info form
                  await loadAndPopulatePersonalInfo();
                
                  // Load today's meals from database (overrides localStorage)
                  const todayMeals = await loadDailyMeals();
                  if (todayMeals && todayMeals.length > 0) {
                      console.log('✅ Today\'s meals loaded from database:', todayMeals.length, 'meals');
                      meals = todayMeals;
                    
                      // Recalculate current intake from loaded meals
                      currentIntake = { protein: 0, carbs: 0, fat: 0 };
                      meals.forEach(meal => {
                          currentIntake.protein += meal.protein || 0;
                          currentIntake.carbs += meal.carbs || 0;
                          currentIntake.fat += meal.fat || 0;
                      });
                    
                      // Update all displays and save to localStorage for offline access
                      updateMealsList();
                      updateProgress();
                      updateMacroCharts();
                      updateCalorieDisplay();
                    
                      // Sync localStorage with database data
                      localStorage.setItem('meals', JSON.stringify(meals));
                      localStorage.setItem('currentIntake', JSON.stringify(currentIntake));
                      localStorage.setItem('lastSaved', new Date().toDateString());
                    
                      console.log('✅ Meals loaded from database, intake calculated:', currentIntake);
                      console.log('💾 Database meals synced to localStorage for offline access');
                  } else {
                      console.log('ℹ️ No meals found in database for today');
                      // Check if we have localStorage meals that weren't uploaded yet
                      const localMeals = localStorage.getItem('meals');
                      if (localMeals) {
                          const parsedMeals = JSON.parse(localMeals);
                          if (parsedMeals.length > 0) {
                              console.log('📱 Found localStorage meals not in database:', parsedMeals.length, 'meals');
                              meals = parsedMeals;
                            
                              // Recalculate intake from localStorage meals
                              currentIntake = { protein: 0, carbs: 0, fat: 0 };
                              meals.forEach(meal => {
                                  currentIntake.protein += meal.protein || 0;
                                  currentIntake.carbs += meal.carbs || 0;
                                  currentIntake.fat += meal.fat || 0;
                              });
                            
                              // Update displays
                              updateMealsList();
                              updateProgress();
                              updateMacroCharts();
                              updateCalorieDisplay();
                            
                              console.log('✅ Using localStorage meals, intake calculated:', currentIntake);
                          }
                      }
                  }
                
                  // Load progress entries for charts
                  await loadProgressData();
                
                  console.log('🎉 All user data loaded successfully!');
                
              } catch (error) {
                  console.error('❌ Error loading user data:', error);
                  showNotification('warning', 'Data Loading', 'Some data could not be loaded. You can still use the app normally.');
              }
          }

          // User Profile API - Updated for UUID-based schema
          async function saveUserProfile(profileData) {
              try {
                  console.log('💾 Saving user profile with UUID-based authentication...');
                
                  // Get user identifier (UUID-based)
                  const identifier = await window.authHelper.getCurrentUserIdentifier();
                  if (!identifier.user_id && !identifier.anon_profile_id) {
                      throw new Error('No valid user identifier available');
                  }
                
                  // Save user preferences to user_preferences table
                  const preferencesData = await window.authHelper.createInsertPayload({
                      unit_system: profileData.unitSystem || 'imperial',
                      theme: 'light', // Default theme
                      notifications_enabled: true,
                      show_tutorials: true,
                      custom_preferences: {}
                  });
                
                  // Save/update user preferences
                  const { data: prefsResult, error: prefsError } = await window.supabaseClient
                      .from('user_preferences')
                      .upsert(preferencesData, { 
                          onConflict: identifier.user_id ? 'user_id' : 'anon_profile_id'
                      })
                      .select();
                
                  if (prefsError) {
                      console.warn('⚠️ User preferences save failed:', prefsError.message);
                  }
                
                  // Save daily targets to daily_targets table if provided
                  let targetsResult = null;
                  if (profileData.dailyTargets) {
                      const targets = typeof profileData.dailyTargets === 'string' 
                          ? (window.JSON?.safeParse ? 
                              window.JSON.safeParse(profileData.dailyTargets, {}) : 
                              (() => {
                                  try {
                                      return JSON.parse(profileData.dailyTargets);
                                  } catch (error) {
                                      console.warn('Error parsing daily targets:', error);
                                      return {};
                                  }
                              })()
                            )
                          : profileData.dailyTargets;
                    
                      const targetsData = await window.authHelper.createInsertPayload({
                          daily_calories: parseInt(targets.calories) || 2000,
                          daily_protein: parseInt(targets.protein) || 150,
                          daily_carbs: parseInt(targets.carbs) || 250,
                          daily_fat: parseInt(targets.fat) || 67
                      });
                    
                      const { data: targetsRes, error: targetsError } = await window.supabaseClient
                          .from('daily_targets')
                          .upsert(targetsData, { 
                              onConflict: identifier.user_id ? 'user_id' : 'anon_profile_id'
                          })
                          .select();
                    
                      if (targetsError) {
                          console.warn('⚠️ Daily targets save failed:', targetsError.message);
                      } else {
                          targetsResult = targetsRes;
                      }
                  }
                
                  // Also save to localStorage for offline access
                  localStorage.setItem('userProfile', JSON.stringify(profileData));
                
                  console.log('✅ Profile saved to UUID-based schema successfully');
                  return {
                      preferences: prefsResult,
                      dailyTargets: targetsResult,
                      success: true
                  };
                
              } catch (error) {
                  console.error('❌ Error saving user profile:', error);
                  // Fallback to localStorage
                  localStorage.setItem('userProfile', JSON.stringify(profileData));
                  return { fallback: true, error: error.message };
              }
          }

          async function loadUserProfile() {
              const userEmail = getCurrentUserEmail();
            
              try {
                  // Try Supabase first (for cross-device sync)
                  if (window.supabaseClient) {
                      console.log('📡 Loading profile from Supabase...');
                      try {
                          // Check authentication status first
                          const { data: { user }, error: authError } = await window.supabaseClient.auth.getUser();
                          let lookupEmail = userEmail;
                        
                          // If user is authenticated, use their email or anonymous ID
                          if (user) {
                              lookupEmail = user.email || `anon_${user.id}`;
                          }
                        
                          const { data, error } = await window.supabaseClient
                              .from('user_profiles')
                              .select('*')
                              .eq('user_email', lookupEmail)
                              .maybeSingle();
                        
                          if (!error && data) {
                              console.log('✅ Profile loaded from Supabase:', data);
                            
                              // Get additional data from localStorage (unitSystem, dailyTargets)
                              const stored = localStorage.getItem('userProfile');
                              const localData = stored ? JSON.parse(stored) : {};
                            
                              return {
                                  name: data.name || 'User',
                                  unitSystem: localData.unitSystem || 'imperial',
                                  dailyTargets: localData.dailyTargets || { calories: 2000, protein: 150, carbs: 250, fat: 67 }
                              };
                          } else if (error) {
                              console.warn('⚠️ Supabase profile load failed:', error.message);
                          }
                      } catch (error) {
                          console.warn('⚠️ Supabase profile load error:', error);
                      }
                  }
                
                  // Fallback to localStorage
                  console.log('📱 Loading profile from localStorage fallback...');
                  const stored = localStorage.getItem('userProfile');
                  return stored ? JSON.parse(stored) : null;
              } catch (error) {
                  console.error('Error loading user profile:', error);
                  // Final fallback to localStorage
                  const stored = localStorage.getItem('userProfile');
                  return stored ? JSON.parse(stored) : null;
              }
          }

          // Daily Meals API - UUID-based with authHelper.js
          async function saveDailyMeals(meals, date = null) {
              const mealDate = date || new Date().toISOString().split('T')[0];
            
              console.log('💾 Saving daily meals to database...', {
                  mealDate: mealDate,
                  mealCount: meals.length
              });

              try {
                  if (!window.supabaseClient) {
                      console.log('ℹ️ No database connection available for daily meals save');
                      localStorage.setItem('meals', JSON.stringify(meals));
                      localStorage.setItem('lastSaved', mealDate);
                      return { fallback: true };
                  }

                  // Get user identifier (invite-only system - must be authenticated)
                  const identifier = await window.authHelper.getCurrentUserIdentifier();
                
                  if (!identifier.is_authenticated || !identifier.user_id) {
                      console.warn('User not authenticated - redirecting to login');
                      window.authHelper.redirectToLogin();
                      throw new Error('Authentication required to save meals');
                  }

                  console.info('💾 Saving meals for authenticated user:', identifier.user_id);

                  // Clear existing meals for this date (authenticated user only)
                  const deleteQuery = window.supabaseClient
                      .from('daily_meals')
                      .delete()
                      .eq('meal_date', mealDate)
                      .eq('user_id', identifier.user_id);

                  const { error: deleteError } = await deleteQuery;
                
                  if (deleteError) {
                      console.warn('⚠️ Failed to clear existing meals:', deleteError.message);
                  }

                  // Save new meals to Supabase using UUID-based schema
                  const supabaseResults = [];
                  for (const meal of meals) {
                      const mealData = await window.authHelper.createInsertPayload({
                          meal_date: mealDate,
                          meal_name: meal.name,
                          calories: Math.round(meal.calories || 0), // INTEGER type
                          protein: Math.round(meal.protein || 0), // INTEGER type
                          carbs: Math.round(meal.carbs || 0), // INTEGER type
                          fat: Math.round(meal.fat || 0), // INTEGER type
                          meal_uuid: meal.id ? meal.id.toString() : crypto.randomUUID(),
                          timestamp: new Date().toISOString()
                      });

                      const { data: inserted, error } = await window.supabaseClient
                          .from('daily_meals')
                          .insert(mealData)
                          .select();

                      if (error) {
                          console.warn('⚠️ Supabase meal insert failed:', error.message);
                          throw error;
                      } else {
                          supabaseResults.push(inserted[0]);
                          console.log('✅ Meal saved to Supabase:', inserted[0]);
                      }
                  }

                  console.log(`✅ ${supabaseResults.length} meals saved to Supabase successfully`);

                  // Also save to localStorage for offline access
                  localStorage.setItem('meals', JSON.stringify(meals));
                  localStorage.setItem('lastSaved', mealDate);

                  return { success: true, count: meals.length, supabase: supabaseResults.length };
                
              } catch (error) {
                  console.error('❌ Failed to save daily meals to database:', error);
                
                  // Final fallback to localStorage
                  localStorage.setItem('meals', JSON.stringify(meals));
                  localStorage.setItem('lastSaved', mealDate);
                  return { fallback: true, error: error.message };
              }
          }

          async function loadDailyMeals(date = null) {
              if (!window.supabaseClient) {
                  console.log('ℹ️ No database connection available, using localStorage for daily meals');
                  const stored = localStorage.getItem('meals');
                  return stored ? JSON.parse(stored) : [];
              }

              const mealDate = date || new Date().toISOString().split('T')[0];
              console.log('📡 Loading daily meals from database...');
            
              try {
                  // Get user identifier using authHelper (supports both authenticated users and anonymous profiles)
                  const identifier = await window.authHelper.getCurrentUserIdentifier();
                
                  if (!identifier.user_id && !identifier.anon_profile_id) {
                      console.log('ℹ️ No valid user identifier available, using localStorage');
                      const stored = localStorage.getItem('meals');
                      return stored ? JSON.parse(stored) : [];
                  }

                  console.log('📡 Using UUID-based authentication to load meals...', {
                      user_id: identifier.user_id ? 'authenticated' : null,
                      anon_profile_id: identifier.anon_profile_id ? 'anonymous' : null
                  });

                  // Query meals for this user and date
                  const query = window.supabaseClient
                      .from('daily_meals')
                      .select('*')
                      .eq('meal_date', mealDate);

                  // Apply user filter based on auth status
                  if (identifier.user_id) {
                      query.eq('user_id', identifier.user_id);
                  } else if (identifier.anon_profile_id) {
                      query.eq('anon_profile_id', identifier.anon_profile_id);
                  }

                  const { data, error } = await query.order('created_at', { ascending: true });
                
                  if (error) {
                      console.warn('⚠️ Supabase daily meals load error:', error.message);
                      throw error;
                  }

                  if (data && data.length > 0) {
                      console.log(`✅ Loaded ${data.length} daily meals from Supabase for ${mealDate}`);
                      return data.map((meal, index) => ({
                          id: meal.id || Date.now() + index,
                          name: meal.meal_name,
                          calories: meal.calories,
                          protein: meal.protein,
                          carbs: meal.carbs,
                          fat: meal.fat
                      }));
                  }

                  // No meals found in database
                  console.log('📱 No database meals found, falling back to localStorage...');
                  const stored = localStorage.getItem('meals');
                  return stored ? JSON.parse(stored) : [];
                
              } catch (error) {
                  console.error('❌ Failed to load daily meals from database:', error);
                
                  // Final fallback to localStorage
                  console.log('📱 Falling back to localStorage...');
                  const stored = localStorage.getItem('meals');
                  return stored ? JSON.parse(stored) : [];
              }
          }

          // Progress Entries API
          // Progress Tracker API with Supabase Integration
          async function saveProgressEntryToDB(entry) {
              if (!window.supabaseClient && !window.apiCall) {
                  console.log('ℹ️ No database connection available for progress entry save');
                  return { fallback: true };
              }

              console.log('💾 Saving progress entry to database...');
            
              try {
                  // Get user identifier using authHelper (supports both authenticated users and anonymous profiles)
                  const identifier = await window.authHelper.getCurrentUserIdentifier();
                
                  if (!identifier.user_id && !identifier.anon_profile_id) {
                      throw new Error('No valid user identifier available');
                  }

                  console.log('💾 Using UUID-based authentication with Supabase...', {
                      user_id: identifier.user_id ? 'authenticated' : null,
                      anon_profile_id: identifier.anon_profile_id ? 'anonymous' : null
                  });

                  // Check if progress entry exists for this date
                  const queryFilter = await window.authHelper.getUserQueryFilter();
                  const existingQuery = window.supabaseClient
                      .from('progress_entries')
                      .select('*')
                      .eq('date', entry.date);

                  // Apply user filter based on auth status
                  if (identifier.user_id) {
                      existingQuery.eq('user_id', identifier.user_id);
                  } else if (identifier.anon_profile_id) {
                      existingQuery.eq('anon_profile_id', identifier.anon_profile_id);
                  }

                  const { data: existing, error: selectError } = await existingQuery.maybeSingle();

                  // Prepare data using authHelper
                  const progressData = await window.authHelper.createInsertPayload({
                      date: entry.date,
                      weight_kg: entry.weight,
                      waist_cm: entry.measurements?.waist || null,
                      chest_cm: entry.measurements?.chest || null,
                      hips_cm: entry.measurements?.hips || null,
                      arms_cm: entry.measurements?.arms || null,
                      notes: entry.notes || '',
                      entry_uuid: entry.id.toString()
                  });

                  if (existing && !selectError) {
                      // Update existing progress entry using upsert
                      const { data: updateData, error } = await window.supabaseClient
                          .from('progress_entries')
                          .upsert(progressData, { 
                              onConflict: identifier.user_id ? 'user_id,date' : 'anon_profile_id,date'
                          })
                          .select();
                    
                      if (error) {
                          console.warn('⚠️ Supabase progress entry update failed:', error.message);
                          throw error;
                      }
                      console.log('✅ Progress entry updated in Supabase:', updateData);
                      return updateData;
                  } else {
                      // Create new progress entry
                      const { data: insertData, error } = await window.supabaseClient
                          .from('progress_entries')
                          .insert(progressData)
                          .select();
                    
                      if (error) {
                          console.warn('⚠️ Supabase progress entry insert failed:', error.message);
                          throw error;
                      }
                      console.log('✅ Progress entry created in Supabase:', insertData);
                      return insertData;
                  }
                
              } catch (error) {
                  console.warn('⚠️ Supabase save failed, trying RESTful API fallback:', error.message);
                
                  // Fallback to RESTful API if Supabase fails
                  if (window.apiCall) {
                      try {
                          console.log('📡 Using RESTful API for progress entry save...');
                        
                          // Get user email for RESTful API
                          const userEmail = getCurrentUserEmail();
                        
                          // Prepare data for RESTful API
                          const apiProgressData = {
                              email: userEmail,
                              date: entry.date,
                              weight_kg: entry.weight,
                              waist_cm: entry.measurements?.waist || null,
                              chest_cm: entry.measurements?.chest || null,
                              hips_cm: entry.measurements?.hips || null,
                              arms_cm: entry.measurements?.arms || null,
                              notes: entry.notes || '',
                              entry_uuid: entry.id.toString()
                          };
                        
                          // Check if RESTful API endpoints are available first
                          const apiAvailable = await checkApiEndpoints();
                          if (!apiAvailable) {
                              console.log('⚠️ RESTful API endpoints not available - skipping progress entry RESTful API fallback');
                              return { fallback: true };
                          }
                        
                          // Check if entry exists for this date using direct Supabase query
                          try {
                              // Checking existing progress entries
                              let query = window.supabaseClient.from('progress_entries').select('*');
                              if (window.SupabaseQueryHelper) {
                                  query = window.SupabaseQueryHelper.applySearchFilter(query, userEmail, 'progress_entries');
                              } else {
                                  query = query.eq('user_email', userEmail);
                              }
                              const { data: existingData, error: existingError } = await query;
                              if (existingError) throw existingError;
                              const existingEntry = existingData?.find(e => e.date === entry.date);
                            
                              if (existingEntry) {
                                  // Update existing entry
                                  const updateResult = await apiCall(`tables/progress_entries/${existingEntry.id}`, 'PUT', apiProgressData);
                                  console.log('✅ Progress entry updated via RESTful API');
                                  return updateResult;
                              } else {
                                  // Create new entry
                                  const createResult = await apiCall('tables/progress_entries', 'POST', apiProgressData);
                                  console.log('✅ Progress entry created via RESTful API');
                                  return createResult;
                              }
                          } catch (apiError) {
                              console.warn('⚠️ RESTful API save failed:', apiError.message);
                              return { fallback: true, error: `Both Supabase and RESTful API failed: ${error.message}, ${apiError.message}` };
                          }
                      } catch (apiFallbackError) {
                          console.error('❌ RESTful API fallback failed:', apiFallbackError.message);
                          return { fallback: true, error: `Both Supabase and RESTful API failed: ${error.message}, ${apiFallbackError.message}` };
                      }
                  } else {
                      console.error('❌ Failed to save progress entry to database:', error);
                      return { fallback: true, error: error.message };
                  }
              }
          }

          async function loadProgressEntries() {
              if (!window.supabaseClient && !window.apiCall) {
                  console.log('ℹ️ No database connection available, using localStorage for progress entries');
                  const stored = localStorage.getItem('progressEntries');
                  return stored ? JSON.parse(stored) : [];
              }

              console.log('📡 Loading progress entries from database...');
            
              try {
                  // Try Supabase first
                  if (window.supabaseClient) {
                      // Get user identifier using authHelper (supports both authenticated users and anonymous profiles)
                      const identifier = await window.authHelper.getCurrentUserIdentifier();
                    
                      if (!identifier.user_id && !identifier.anon_profile_id) {
                          console.log('ℹ️ No valid user identifier available for progress entries loading, using localStorage');
                          const stored = localStorage.getItem('progressEntries');
                          return stored ? JSON.parse(stored) : [];
                      }

                      console.log('📡 Using UUID-based authentication with Supabase...', {
                          user_id: identifier.user_id ? 'authenticated' : null,
                          anon_profile_id: identifier.anon_profile_id ? 'anonymous' : null
                      });

                      // Query based on available identifier
                      let query = window.supabaseClient.from('progress_entries').select('*');
                    
                      if (identifier.user_id) {
                          query = query.eq('user_id', identifier.user_id);
                      } else {
                          query = query.eq('anon_profile_id', identifier.anon_profile_id);
                      }
                    
                      const { data, error } = await query.order('date', { ascending: false });

                      if (error) {
                          console.warn('⚠️ Supabase progress entries load error:', error.message);
                          throw error; // Fall through to RESTful API
                      }

                      if (data && data.length > 0) {
                          console.log(`✅ Loaded ${data.length} progress entries from Supabase`);
                          return data.map(entry => ({
                              id: parseInt(entry.entry_uuid) || Date.now(),
                              date: entry.date,
                              weight: entry.weight_kg,
                              measurements: {
                                  waist: entry.waist_cm,
                                  chest: entry.chest_cm,
                                  hips: entry.hips_cm,
                                  arms: entry.arms_cm
                              },
                              notes: entry.notes || '',
                              timestamp: new Date(entry.created_at).getTime()
                          }));
                      }
                  }

                  // Fallback to RESTful API
                  if (window.apiCall) {
                      try {
                          console.log('📡 Using RESTful API for progress entries load...');
                        
                          // Check if RESTful API endpoints are available first
                          const apiAvailable = await checkApiEndpoints();
                          if (!apiAvailable) {
                              console.log('⚠️ RESTful API endpoints not available - skipping progress entries RESTful API fallback');
                              const stored = localStorage.getItem('progressEntries');
                              return stored ? JSON.parse(stored) : [];
                          }
                        
                          // Get user identifier using authHelper
                          const identifier = await window.authHelper.getCurrentUserIdentifier();
                        
                          if (!identifier.user_id && !identifier.anon_profile_id) {
                              console.log('ℹ️ No valid user identifier available for RESTful API progress entries, using localStorage');
                              const stored = localStorage.getItem('progressEntries');
                              return stored ? JSON.parse(stored) : [];
                          }

                          // Search for progress entries using UUID
                          const searchField = identifier.user_id ? 'user_id' : 'anon_profile_id';
                          const searchValue = identifier.user_id || identifier.anon_profile_id;
                        
                          // Use direct Supabase query to avoid PGRST100 errors
                          console.log(`🔍 Loading progress entries with safe query for ${searchField}:`, searchValue);
                          let query = window.supabaseClient.from('progress_entries').select('*');
                          if (window.SupabaseQueryHelper) {
                              query = window.SupabaseQueryHelper.applySearchFilter(query, searchValue, 'progress_entries');
                          } else {
                              query = query.eq(searchField, searchValue);
                          }
                          query = query.order('date', { ascending: false });
                          const { data: responseData, error: responseError } = await query;
                          if (responseError) throw responseError;
                        
                          const response = { data: responseData };
                        
                          if (response.data && response.data.length > 0) {
                              console.log(`✅ Loaded ${response.data.length} progress entries from RESTful API`);
                              return response.data
                                  .filter(entry => entry[searchField] === searchValue)
                                  .map(entry => ({
                                      id: parseInt(entry.entry_uuid) || Date.now(),
                                      date: entry.date,
                                      weight: entry.weight_kg,
                                      measurements: {
                                          waist: entry.waist_cm,
                                          chest: entry.chest_cm,
                                          hips: entry.hips_cm,
                                          arms: entry.arms_cm
                                      },
                                      notes: entry.notes || '',
                                      timestamp: new Date(entry.created_at).getTime()
                                  }))
                                  .sort((a, b) => new Date(b.date) - new Date(a.date));
                          } else {
                              console.log('📡 No progress entries found in RESTful API');
                              return [];
                          }
                      } catch (apiError) {
                          console.warn('⚠️ RESTful API progress entries load failed:', apiError.message);
                          if (apiError.message && apiError.message.includes('404')) {
                              console.log('📋 Progress entries table not found in RESTful API - this is normal for new users');
                          }
                          return [];
                      }
                  }
                
                  return [];
                
              } catch (error) {
                  console.error('❌ Failed to load progress entries from database:', error);
                
                  // Final fallback to localStorage
                  console.log('📱 Falling back to localStorage...');
                  const stored = localStorage.getItem('progressEntries');
                  return stored ? JSON.parse(stored) : [];
              }
          }

          // Progress Goals API with Supabase Integration
          async function saveProgressGoalToDB(goal) {
              if (!window.supabaseClient && !window.apiCall) {
                  console.log('ℹ️ No database connection available for progress goal save');
                  return { fallback: true };
              }

              console.log('💾 Saving progress goal to database...');
            
              try {
                  // Get user identifier using authHelper (supports both authenticated users and anonymous profiles)
                  const identifier = await window.authHelper.getCurrentUserIdentifier();
                
                  if (!identifier.user_id && !identifier.anon_profile_id) {
                      throw new Error('No valid user identifier available');
                  }

                  console.log('💾 Using UUID-based authentication with Supabase...', {
                      user_id: identifier.user_id ? 'authenticated' : null,
                      anon_profile_id: identifier.anon_profile_id ? 'anonymous' : null
                  });

                  // Deactivate existing goals for this user
                  const deactivateQuery = window.supabaseClient
                      .from('progress_goals')
                      .update({ is_active: false });

                  if (identifier.user_id) {
                      deactivateQuery.eq('user_id', identifier.user_id);
                  } else if (identifier.anon_profile_id) {
                      deactivateQuery.eq('anon_profile_id', identifier.anon_profile_id);
                  }

                  await deactivateQuery;
                
                  // Create new active goal using authHelper
                  const goalData = await window.authHelper.createInsertPayload({
                      goal_type: 'weight_loss', // Default goal type
                      current_value: goal.currentWeight || 0,
                      target_value: goal.targetWeight,
                      target_date: goal.targetDate,
                      unit: 'kg',
                      is_active: true,
                      notes: goal.notes || ''
                  });

                  const { data: insertData, error } = await window.supabaseClient
                      .from('progress_goals')
                      .insert(goalData)
                      .select();
                
                  if (error) {
                      console.warn('⚠️ Supabase progress goal insert failed:', error.message);
                      throw error;
                  }
                  console.log('✅ Progress goal created in Supabase:', insertData);
                  return insertData;
                
              } catch (error) {
                  console.warn('⚠️ Supabase save failed, trying RESTful API fallback:', error.message);
                
                  // Fallback to RESTful API if Supabase fails
                  if (window.apiCall) {
                      try {
                          console.log('📡 Using RESTful API for progress goal save...');
                        
                          // Check if RESTful API endpoints are available first
                          const apiAvailable = await checkApiEndpoints();
                          if (!apiAvailable) {
                              console.log('⚠️ RESTful API endpoints not available - skipping progress goal RESTful API fallback');
                              return { fallback: true };
                          }
                        
                          // Get user email for RESTful API
                          const userEmail = getCurrentUserEmail();
                        
                          // First, deactivate existing goals
                          try {
                              // Use direct Supabase query to avoid PGRST100 errors
                              console.log('🔍 Loading existing progress goals with safe query for:', userEmail);
                              const { data: existingGoalsData, error: existingGoalsError } = await window.supabaseClient
                                  .from('progress_goals')
                                  .select('*')
                                  .eq('user_email', userEmail);
                              if (existingGoalsError) throw existingGoalsError;
                            
                              const existingGoalsResponse = { data: existingGoalsData };
                              if (existingGoalsResponse.data && existingGoalsResponse.data.length > 0) {
                                  const activeGoals = existingGoalsResponse.data.filter(g => g.is_active);
                                  for (const activeGoal of activeGoals) {
                                      await apiCall(`tables/progress_goals/${activeGoal.id}`, 'PATCH', { is_active: false });
                                  }
                              }
                          } catch (deactivateError) {
                              console.warn('⚠️ Could not deactivate existing goals:', deactivateError.message);
                          }
                        
                          // Prepare data for RESTful API
                          const apiGoalData = {
                              email: userEmail,
                              goal_type: 'weight_loss', // Default goal type
                              current_value: goal.currentWeight || 0,
                              target_value: goal.targetWeight,
                              target_date: goal.targetDate,
                              unit: 'kg',
                              is_active: true,
                              created_date: goal.setDate || new Date().toISOString().split('T')[0],
                              notes: goal.notes || ''
                          };
                        
                          // Create new goal
                          const createResult = await apiCall('tables/progress_goals', 'POST', apiGoalData);
                          console.log('✅ Progress goal created via RESTful API');
                          return createResult;
                        
                      } catch (apiError) {
                          console.error('❌ RESTful API fallback failed:', apiError.message);
                          return { fallback: true, error: `Both Supabase and RESTful API failed: ${error.message}, ${apiError.message}` };
                      }
                  } else {
                      console.error('❌ Failed to save progress goal to database:', error);
                      return { fallback: true, error: error.message };
                  }
              }
          }

          async function loadProgressGoalFromDB() {
              if (!window.supabaseClient && !window.apiCall) {
                  return null;
              }

              const userEmail = getCurrentUserEmail();
              console.log('📡 Loading progress goal from database...');
            
              try {
                  // Try Supabase first
                  if (window.supabaseClient) {
                      const { data: { user } } = await window.supabaseClient.auth.getUser();
                      if (!user) {
                          console.log('ℹ️ No authenticated user for progress goal loading');
                          return null;
                      }

                      const lookupEmail = user.email || `anon_${user.id}`;
                    
                      // Use safe query to avoid PGRST100 errors
                      console.log('🔍 Loading progress goals from Supabase for:', lookupEmail);
                      const { data, error } = await window.supabaseClient
                          .from('progress_goals')
                          .select('*')
                          .eq('user_email', lookupEmail)  // Changed from 'email' to 'user_email'
                          .eq('is_active', true)
                          .order('created_at', { ascending: false })
                          .limit(1)
                          .maybeSingle();

                      if (error) {
                          console.warn('⚠️ Supabase progress goal load error:', error.message);
                          throw error; // Fall through to RESTful API
                      }

                      if (data) {
                          console.log('✅ Loaded progress goal from Supabase');
                          return {
                              targetWeight: data.target_value,
                              targetDate: data.target_date,
                              setDate: data.created_at,
                              currentWeight: data.current_value,
                              notes: data.notes
                          };
                      }
                  }

                  // Fallback to RESTful API
                  if (window.apiCall) {
                      try {
                          console.log('📡 Using RESTful API for progress goal load...');
                        
                          // Check if RESTful API endpoints are available first
                          const apiAvailable = await checkApiEndpoints();
                          if (!apiAvailable) {
                              console.log('⚠️ RESTful API endpoints not available - skipping progress goal RESTful API fallback');
                              return null;
                          }
                        
                          // Use direct Supabase query to avoid PGRST100 errors
                          console.log('🔍 Loading progress goals with safe query for:', userEmail);
                          const { data: responseData, error: responseError } = await window.supabaseClient
                              .from('progress_goals')
                              .select('*')
                              .eq('user_email', userEmail);
                          if (responseError) throw responseError;
                        
                          const response = { data: responseData };
                        
                          if (response.data && response.data.length > 0) {
                              const activeGoals = response.data
                                  .filter(goal => goal.is_active)
                                  .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
                            
                              if (activeGoals.length > 0) {
                                  const goal = activeGoals[0];
                                  console.log('✅ Loaded progress goal from RESTful API');
                                  return {
                                      targetWeight: goal.target_value,
                                      targetDate: goal.target_date,
                                      setDate: goal.created_at,
                                      currentWeight: goal.current_value,
                                      notes: goal.notes
                                  };
                              }
                          } else {
                              console.log('📡 No progress goals found in RESTful API');
                          }
                      } catch (apiError) {
                          console.warn('⚠️ RESTful API progress goal load failed:', apiError.message);
                          if (apiError.message && apiError.message.includes('404')) {
                              console.log('📋 Progress goals table not found in RESTful API - this is normal for new users');
                          }
                      }
                  }
                
                  return null;
                
              } catch (error) {
                  console.error('❌ Failed to load progress goal from database:', error);
                  return null;
              }
          }

          // Macro History API with Supabase Integration
          async function saveMacroHistoryToDB(macroEntry) {
              if (!window.supabaseClient) {
                  console.log('ℹ️ No database connection available for macro history save');
                  return { fallback: true };
              }

              console.log('💾 Saving macro history entry to database...');
            
              try {
                  // Get user identifier using authHelper (supports both authenticated users and anonymous profiles)
                  const identifier = await window.authHelper.getCurrentUserIdentifier();
                
                  if (!identifier.user_id && !identifier.anon_profile_id) {
                      throw new Error('No valid user identifier available');
                  }

                  console.log('💾 Using UUID-based authentication with Supabase...', {
                      user_id: identifier.user_id ? 'authenticated' : null,
                      anon_profile_id: identifier.anon_profile_id ? 'anonymous' : null
                  });

                  // Prepare data using authHelper
                  const macroData = await window.authHelper.createInsertPayload({
                      date: macroEntry.date,
                      calories_consumed: macroEntry.calories,
                      protein_consumed: macroEntry.protein,
                      carbs_consumed: macroEntry.carbs,
                      fat_consumed: macroEntry.fat,
                      calories_goal: macroEntry.caloriesGoal,
                      protein_goal: macroEntry.proteinGoal,
                      carbs_goal: macroEntry.carbsGoal,
                      fat_goal: macroEntry.fatGoal,
                      protein_percent: macroEntry.proteinPercent,
                      carbs_percent: macroEntry.carbsPercent,
                      fat_percent: macroEntry.fatPercent,
                      goals_met: macroEntry.goalsMet
                  });

                  // Use upsert to handle duplicates (update if exists, insert if not)
                  const conflictColumns = identifier.user_id ? 'user_id,date' : 'anon_profile_id,date';
                  const { data: upsertData, error } = await window.supabaseClient
                      .from('macro_history')
                      .upsert(macroData, { 
                          onConflict: conflictColumns,
                          ignoreDuplicates: false 
                      })
                      .select();
                
                  if (error) {
                      console.warn('⚠️ Supabase macro history upsert failed:', error.message);
                      throw error;
                  }
                  console.log('✅ Macro history saved to Supabase:', upsertData);
                  return upsertData;
                
              } catch (error) {
                  console.error('❌ Failed to save macro history to database:', error);
                  return { fallback: true, error: error.message };
              }
          }

          async function loadMacroHistoryFromDB() {
              if (!window.supabaseClient && !window.apiCall) {
                  return [];
              }

              const userEmail = getCurrentUserEmail();
              console.log('📡 Loading macro history from database...');
            
              try {
                  // Try Supabase first
                  if (window.supabaseClient) {
                      const { data: { user } } = await window.supabaseClient.auth.getUser();
                      if (!user) {
                          console.log('ℹ️ No authenticated user for macro history loading');
                          return [];
                      }

                      const lookupEmail = user.email || `anon_${user.id}`;
                    
                      const { data, error } = await window.supabaseClient
                          .from('macro_history')
                          .select('*')
                          .eq('user_email', lookupEmail)
                          .order('date', { ascending: false })
                          .limit(30); // Last 30 days

                      if (error) {
                          console.warn('⚠️ Supabase macro history load error:', error.message);
                          throw error; // Fall through to RESTful API
                      }

                      if (data && data.length > 0) {
                          console.log(`✅ Loaded ${data.length} macro history entries from Supabase`);
                          return data.map(entry => ({
                              date: entry.date,
                              calories: entry.calories_consumed,
                              protein: entry.protein_consumed,
                              carbs: entry.carbs_consumed,
                              fat: entry.fat_consumed,
                              caloriesGoal: entry.calories_goal,
                              proteinGoal: entry.protein_goal,
                              carbsGoal: entry.carbs_goal,
                              fatGoal: entry.fat_goal,
                              proteinPercent: entry.protein_percent,
                              carbsPercent: entry.carbs_percent,
                              fatPercent: entry.fat_percent,
                              goalsMet: entry.goals_met
                          }));
                      }
                  }

                  // Fallback to RESTful API
                  if (window.apiCall) {
                      console.log('📡 Using RESTful API for macro history load...');
                    
                      // Check if RESTful API endpoints are available first
                      const apiAvailable = await checkApiEndpoints();
                      if (!apiAvailable) {
                          console.log('⚠️ RESTful API endpoints not available - skipping macro history RESTful API fallback');
                          return [];
                      }
                    
                      // Use direct Supabase query to avoid PGRST100 errors
                      console.log('🔍 Loading macro history with safe query for:', userEmail);
                      let query = window.supabaseClient.from('macro_history').select('*');
                      if (window.SupabaseQueryHelper) {
                          query = window.SupabaseQueryHelper.applySearchFilter(query, userEmail, 'macro_history');
                      } else {
                          query = query.eq('user_email', userEmail);
                      }
                      const { data: responseData, error: responseError } = await query;
                      if (responseError) throw responseError;
                    
                      const response = { data: responseData };
                    
                      if (response.data && response.data.length > 0) {
                          console.log(`✅ Loaded ${response.data.length} macro history entries from RESTful API`);
                          return response.data
                              .map(entry => ({
                                  date: entry.date,
                                  calories: entry.calories_consumed,
                                  protein: entry.protein_consumed,
                                  carbs: entry.carbs_consumed,
                                  fat: entry.fat_consumed,
                                  caloriesGoal: entry.calories_goal,
                                  proteinGoal: entry.protein_goal,
                                  carbsGoal: entry.carbs_goal,
                                  fatGoal: entry.fat_goal,
                                  proteinPercent: entry.protein_percent,
                                  carbsPercent: entry.carbs_percent,
                                  fatPercent: entry.fat_percent,
                                  goalsMet: entry.goals_met
                              }))
                              .sort((a, b) => new Date(b.date) - new Date(a.date))
                              .slice(0, 30);
                      }
                  }
                
                  return [];
                
              } catch (error) {
                  console.error('❌ Failed to load macro history from database:', error);
                  return [];
              }
          }

          // Custom Recipes API with Supabase Integration
          async function saveCustomRecipeToDB(recipe) {
              if (!window.supabaseClient) {
                  console.log('ℹ️ No database connection available for recipe save');
                  return { fallback: true };
              }

              console.log('💾 Saving custom recipe to database...');
            
              try {
                  // Get user identifier using authHelper (supports both authenticated users and anonymous profiles)
                  const identifier = await window.authHelper.getCurrentUserIdentifier();
                
                  if (!identifier.user_id && !identifier.anon_profile_id) {
                      throw new Error('No valid user identifier available');
                  }

                  console.log('💾 Using UUID-based authentication with Supabase...', {
                      user_id: identifier.user_id ? 'authenticated' : null,
                      anon_profile_id: identifier.anon_profile_id ? 'anonymous' : null
                  });
                
                  // Generate proper UUID for recipe if not exists
                  const recipeUuid = recipe.uuid || 
                                    (recipe.id && typeof recipe.id === 'string' && recipe.id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i) ? 
                                     recipe.id : 
                                     crypto.randomUUID());

                  // Debug: Log the recipe object being processed
                  console.log('🔍 Processing recipe for database save:', recipe);
                
                  // Prepare recipe data using authHelper
                  const recipeData = await window.authHelper.createInsertPayload({
                      recipe_name: recipe.name,
                      category: recipe.category || 'General',
                      calories: Math.round(recipe.calories || 0), // Convert to INTEGER
                      protein: Math.round(recipe.protein || 0),   // Convert to INTEGER
                      carbs: Math.round(recipe.carbs || 0),       // Convert to INTEGER
                      fat: Math.round(recipe.fat || 0),           // Convert to INTEGER
                      servings: parseInt(recipe.servings) || 1,   // Ensure integer
                      ingredients: recipe.ingredients || [],      // Store as JSONB directly
                      instructions: recipe.instructions || '',
                      recipe_uuid: recipeUuid
                  });
                
                  console.log('🔍 Prepared recipe data for database:', recipeData);
                
                  // Validate data types before database operation
                  const validationErrors = [];
                  if (typeof recipeData.recipe_name !== 'string') {
                      validationErrors.push(`recipe_name should be string, got ${typeof recipeData.recipe_name}`);
                  }
                  if (typeof recipeData.calories !== 'number' || isNaN(recipeData.calories)) {
                      validationErrors.push(`calories should be number, got ${typeof recipeData.calories} (${recipeData.calories})`);
                  }
                  if (typeof recipeData.protein !== 'number' || isNaN(recipeData.protein)) {
                      validationErrors.push(`protein should be number, got ${typeof recipeData.protein} (${recipeData.protein})`);
                  }
                  if (typeof recipeData.carbs !== 'number' || isNaN(recipeData.carbs)) {
                      validationErrors.push(`carbs should be number, got ${typeof recipeData.carbs} (${recipeData.carbs})`);
                  }
                  if (typeof recipeData.fat !== 'number' || isNaN(recipeData.fat)) {
                      validationErrors.push(`fat should be number, got ${typeof recipeData.fat} (${recipeData.fat})`);
                  }
                  if (typeof recipeData.servings !== 'number' || isNaN(recipeData.servings)) {
                      validationErrors.push(`servings should be number, got ${typeof recipeData.servings} (${recipeData.servings})`);
                  }
                
                  if (validationErrors.length > 0) {
                      console.error('🚨 Data validation failed:', validationErrors);
                      throw new Error(`Recipe data validation failed: ${validationErrors.join(', ')}`);
                  }

                  // Check if recipe already exists for this user
                  const existingQuery = window.supabaseClient
                      .from('custom_recipes')
                      .select('*')
                      .eq('recipe_uuid', recipeUuid);

                  if (identifier.user_id) {
                      existingQuery.eq('user_id', identifier.user_id);
                  } else if (identifier.anon_profile_id) {
                      existingQuery.eq('anon_profile_id', identifier.anon_profile_id);
                  }

                  const { data: existing, error: selectError } = await existingQuery.maybeSingle();

                  if (existing && !selectError) {
                      // Update existing recipe using upsert
                      const conflictColumns = identifier.user_id ? 'user_id,recipe_uuid' : 'anon_profile_id,recipe_uuid';
                      const { data: updateData, error } = await window.supabaseClient
                          .from('custom_recipes')
                          .upsert(recipeData, { 
                              onConflict: conflictColumns,
                              ignoreDuplicates: false 
                          })
                          .select();
                    
                      if (error) {
                          console.error('⚠️ Supabase recipe update failed:', {
                              errorMessage: error.message,
                              errorDetails: error.details,
                              errorHint: error.hint,
                              errorCode: error.code,
                              recipeDataSent: recipeData
                          });
                        
                          // Try to provide more helpful error message
                          if (error.message.includes('invalid input syntax for type integer')) {
                              throw new Error(`Database schema issue: A text value is being sent to an integer field. Please check the database table schema for 'custom_recipes'. Original error: ${error.message}`);
                          }
                        
                          throw error;
                      }
                      console.log('✅ Recipe updated in Supabase:', updateData);
                      return updateData;
                  } else {
                      // Create new recipe
                      const { data: insertData, error } = await window.supabaseClient
                          .from('custom_recipes')
                          .insert(recipeData)
                          .select();
                    
                      if (error) {
                          console.error('⚠️ Supabase recipe insert failed:', {
                              errorMessage: error.message,
                              errorDetails: error.details,
                              errorHint: error.hint,
                              errorCode: error.code,
                              recipeDataSent: recipeData
                          });
                        
                          // Try to provide more helpful error message
                          if (error.message.includes('invalid input syntax for type integer')) {
                              throw new Error(`Database schema issue: A text value is being sent to an integer field. Please check the database table schema for 'custom_recipes'. Original error: ${error.message}`);
                          }
                        
                          throw error;
                      }
                      console.log('✅ Recipe created in Supabase:', insertData);
                      return insertData;
                  }
                
              } catch (error) {
                  console.error('❌ Failed to save recipe to database:', error);
                  return { fallback: true, error: error.message };
              }
          }

          async function loadCustomRecipes() {
              if (!window.supabaseClient && !window.apiCall) {
                  console.log('ℹ️ No database connection available, using localStorage for recipes');
                  const stored = localStorage.getItem('customRecipes');
                  return stored ? JSON.parse(stored) : [];
              }

              console.log('📡 Loading custom recipes from database...');
            
              try {
                  // Get user context for new schema
                  const userContext = await getCurrentUserContext();
                
                  // Try Supabase first (NEW SCHEMA)
                  if (window.supabaseClient && userContext) {
                      console.log('📡 Using Supabase with secure authentication...');
                    
                      const { data, error } = await window.supabaseClient
                          .from('custom_recipes')
                          .select('*')
                          .eq('user_id', userContext.user_id)
                          .order('created_at', { ascending: false });

                      if (error) {
                          console.warn('⚠️ Supabase custom recipes load error:', error.message);
                          throw error; // Fall through to RESTful API or legacy
                      }

                      if (data && data.length > 0) {
                          console.log(`✅ Loaded ${data.length} custom recipes from Supabase (NEW SCHEMA)`);
                          return data.map(recipe => ({
                              id: recipe.recipe_uuid, // Use UUID instead of integer ID
                              name: recipe.recipe_name,
                              category: recipe.category,
                              calories: recipe.calories,
                              protein: recipe.protein,
                              carbs: recipe.carbs,
                              fat: recipe.fat,
                              servings: recipe.servings,
                              ingredients: recipe.ingredients || [], // JSONB field - no parsing needed
                              instructions: recipe.instructions,
                              source: 'custom'
                          }));
                      }
                  }

                  // Legacy Supabase fallback (OLD SCHEMA) 
                  if (window.supabaseClient) {
                      const { data: { user } } = await window.supabaseClient.auth.getUser();
                      if (user) {
                          const lookupEmail = user.email || `anon_${user.id}`;
                          console.log('📡 Attempting legacy Supabase schema...');
                        
                          const { data, error } = await window.supabaseClient
                              .from('custom_recipes')
                              .select('*')
                              .eq('user_email', lookupEmail)
                              .order('created_at', { ascending: false });

                          if (!error && data && data.length > 0) {
                              console.log(`✅ Loaded ${data.length} custom recipes from Supabase (LEGACY SCHEMA)`);
                              return data.map(recipe => ({
                                  id: parseInt(recipe.recipe_id) || Date.now(),
                                  name: recipe.recipe_name,
                                  category: recipe.category,
                                  calories: recipe.calories,
                                  protein: recipe.protein,
                                  carbs: recipe.carbs,
                                  fat: recipe.fat,
                                  servings: recipe.servings,
                                  ingredients: JSON.parse(recipe.ingredients || '[]'),
                                  instructions: recipe.instructions,
                                  source: 'custom'
                              }));
                          }
                      }
                  }

                  // Fallback to RESTful API
                  if (window.apiCall) {
                      console.log('📡 Using RESTful API for recipe load...');
                      const userEmail = getCurrentUserEmail();
                      // Use direct Supabase query to avoid PGRST100 errors
                      console.log('🔍 Loading custom recipes with safe query for:', userEmail);
                      const { data: responseData, error: responseError } = await window.supabaseClient
                          .from('custom_recipes')
                          .select('*')
                          .eq('user_email', userEmail);
                      if (responseError) throw responseError;
                    
                      const response = { data: responseData };
                    
                      if (response.data && response.data.length > 0) {
                          console.log(`✅ Loaded ${response.data.length} custom recipes from RESTful API`);
                          return response.data.map(recipe => ({
                              id: parseInt(recipe.recipe_id) || Date.now(),
                              name: recipe.recipe_name,
                              category: recipe.category,
                              calories: recipe.calories,
                              protein: recipe.protein,
                              carbs: recipe.carbs,
                              fat: recipe.fat,
                              servings: recipe.servings,
                              ingredients: JSON.parse(recipe.ingredients || '[]'),
                              instructions: recipe.instructions,
                              source: 'custom'
                          }));
                      }
                  }
                
                  return [];
                
              } catch (error) {
                  console.error('❌ Failed to load custom recipes from database:', error);
                
                  // Final fallback to localStorage
                  console.log('📱 Falling back to localStorage...');
                  const stored = localStorage.getItem('customRecipes');
                  return stored ? JSON.parse(stored) : [];
              }
          }

          async function deleteCustomRecipeFromDB(recipeId) {
              if (!window.supabaseClient && !window.apiCall) {
                  console.log('ℹ️ No database connection available for recipe delete');
                  return { fallback: true };
              }

              console.log('🗑️ Deleting custom recipe from database...');
            
              try {
                  // Get user context for new schema
                  const userContext = await getCurrentUserContext();
                
                  // Try Supabase first (NEW SCHEMA)
                  if (window.supabaseClient && userContext) {
                      console.log('🗑️ Using Supabase with secure authentication...');
                    
                      // Delete using user_id and recipe_uuid for new schema
                      const { data, error } = await window.supabaseClient
                          .from('custom_recipes')
                          .delete()
                          .eq('user_id', userContext.user_id)
                          .eq('recipe_uuid', recipeId) // recipeId is already UUID for new schema
                          .select();

                      if (error) {
                          console.warn('⚠️ Supabase recipe delete failed (new schema):', error.message);
                          throw error; // Fall through to legacy method
                      }
                    
                      if (data && data.length > 0) {
                          console.log('✅ Recipe deleted from Supabase (NEW SCHEMA):', data);
                          return { success: true };
                      } else {
                          console.log('ℹ️ Recipe not found in Supabase (new schema)');
                          // Try legacy schema before giving up
                      }
                  }

                  // Legacy Supabase fallback (OLD SCHEMA)
                  if (window.supabaseClient) {
                      const { data: { user } } = await window.supabaseClient.auth.getUser();
                      if (user) {
                          const lookupEmail = user.email || `anon_${user.id}`;
                          console.log('🗑️ Attempting legacy Supabase schema...');
                        
                          // Delete the recipe using email and recipe_id (legacy)
                          const { data, error } = await window.supabaseClient
                              .from('custom_recipes')
                              .delete()
                              .eq('user_email', lookupEmail)
                              .eq('recipe_id', recipeId.toString())
                              .select();

                          if (!error && data && data.length > 0) {
                              console.log('✅ Recipe deleted from Supabase (LEGACY SCHEMA):', data);
                              return { success: true };
                          } else if (!error) {
                              console.log('ℹ️ Recipe not found in Supabase (legacy schema)');
                              return { success: true }; // Consider this success since recipe doesn't exist
                          }
                      }


   function loadUserDataAfterAuth() {
              console.log('🔄 Loading user data from dedicated tables...');
            
              try {
                  // Load user preferences from dedicated table
                  const preferences = await loadUserPreferences();
                  if (preferences) {
                      console.log('✅ User preferences loaded:', preferences);
                    
                      // Update unit system if available
                      if (preferences.unit_system) {
                          currentUnitSystem = preferences.unit_system;
                          updateUnitLabels();
                          console.log('🔧 Unit system set to:', currentUnitSystem);
                      }
                  }
                
                  // Load daily targets from dedicated table
                  const targets = await loadDailyTargets();
                  if (targets) {
                      dailyTargets = {
                          calories: targets.daily_calories,
                          protein: targets.daily_protein,
                          carbs: targets.daily_carbs,
                          fat: targets.daily_fat
                      };
                      console.log('✅ Daily targets loaded from database:', dailyTargets);
                    
                      // Update display
                      if (document.getElementById('dailyCalories')) {
                          document.getElementById('dailyCalories').textContent = targets.daily_calories.toLocaleString();
                          document.getElementById('proteinAmount').textContent = targets.daily_protein + 'g';
                          document.getElementById('carbsAmount').textContent = targets.daily_carbs + 'g';
                          document.getElementById('fatAmount').textContent = targets.daily_fat + 'g';
                      }
                    
                      updateMacroCharts();
                  } else {
                      // Fallback to localStorage if database loading failed
                      console.log('📱 Database targets not found, checking localStorage fallback...');
                      const savedTargets = localStorage.getItem('dailyTargets');
                      if (savedTargets && savedTargets !== 'null') {
                          try {
                              const parsed = JSON.parse(savedTargets);
                              // Ensure all required fields are present and valid
                              if (parsed && parsed.calories > 0 && parsed.protein > 0) {
                                  dailyTargets = {
                                      calories: parsed.calories,
                                      protein: parsed.protein,
                                      carbs: parsed.carbs,
                                      fat: parsed.fat
                                  };
                                  console.log('✅ Daily targets loaded from localStorage:', dailyTargets);
                                
                                  // Update display
                                  if (document.getElementById('dailyCalories')) {
                                      document.getElementById('dailyCalories').textContent = dailyTargets.calories.toLocaleString();
                                      document.getElementById('proteinAmount').textContent = dailyTargets.protein + 'g';
                                      document.getElementById('carbsAmount').textContent = dailyTargets.carbs + 'g';
                                      document.getElementById('fatAmount').textContent = dailyTargets.fat + 'g';
                                  }
                                
                                  updateMacroCharts();
                              } else {
                                  console.log('ℹ️ localStorage targets incomplete, using defaults');
                              }
                          } catch (error) {
                              console.warn('⚠️ Error parsing localStorage targets:', error);
                          }
                      } else {
                          console.log('ℹ️ No saved targets found, using default values');
                      }
                  }
                
                  // Always ensure display is synchronized with current dailyTargets values
                  // This handles cases where defaults are used or saved data doesn't exist
                  ensureDisplaySync();
                
                  // Load calculation history and auto-populate personal info form
                  await loadAndPopulatePersonalInfo();
                
                  // Load today's meals from database (overrides localStorage)
                  const todayMeals = await loadDailyMeals();
                  if (todayMeals && todayMeals.length > 0) {
                      console.log('✅ Today\'s meals loaded from database:', todayMeals.length, 'meals');
                      meals = todayMeals;
                    
                      // Recalculate current intake from loaded meals
                      currentIntake = { protein: 0, carbs: 0, fat: 0 };
                      meals.forEach(meal => {
                          currentIntake.protein += meal.protein || 0;
                          currentIntake.carbs += meal.carbs || 0;
                          currentIntake.fat += meal.fat || 0;
                      });
                    
                      // Update all displays and save to localStorage for offline access
                      updateMealsList();
                      updateProgress();
                      updateMacroCharts();
                      updateCalorieDisplay();
                    
                      // Sync localStorage with database data
                      localStorage.setItem('meals', JSON.stringify(meals));
                      localStorage.setItem('currentIntake', JSON.stringify(currentIntake));
                      localStorage.setItem('lastSaved', new Date().toDateString());
                    
                      console.log('✅ Meals loaded from database, intake calculated:', currentIntake);
                      console.log('💾 Database meals synced to localStorage for offline access');
                  } else {
                      console.log('ℹ️ No meals found in database for today');
                      // Check if we have localStorage meals that weren't uploaded yet
                      const localMeals = localStorage.getItem('meals');
                      if (localMeals) {
                          const parsedMeals = JSON.parse(localMeals);
                          if (parsedMeals.length > 0) {
                              console.log('📱 Found localStorage meals not in database:', parsedMeals.length, 'meals');
                              meals = parsedMeals;
                            
                              // Recalculate intake from localStorage meals
                              currentIntake = { protein: 0, carbs: 0, fat: 0 };
                              meals.forEach(meal => {
                                  currentIntake.protein += meal.protein || 0;
                                  currentIntake.carbs += meal.carbs || 0;
                                  currentIntake.fat += meal.fat || 0;
                              });
                            
                              // Update displays
                              updateMealsList();
                              updateProgress();
                              updateMacroCharts();
                              updateCalorieDisplay();
                            
                              console.log('✅ Using localStorage meals, intake calculated:', currentIntake);
                          }
                      }
                  }
                
                  // Load progress entries for charts
                  await loadProgressData();
                
                  console.log('🎉 All user data loaded successfully!');
                
              } catch (error) {
                  console.error('❌ Error loading user data:', error);
                  showNotification('warning', 'Data Loading', 'Some data could not be loaded. You can still use the app normally.');
              }
          }

          // User Profile API - Updated for UUID-based schema
          async function saveUserProfile(profileData) {
              try {
                  console.log('💾 Saving user profile with UUID-based authentication...');
                
                  // Get user identifier (UUID-based)
                  const identifier = await window.authHelper.getCurrentUserIdentifier();
                  if (!identifier.user_id && !identifier.anon_profile_id) {
                      throw new Error('No valid user identifier available');
                  }
                
                  // Save user preferences to user_preferences table
                  const preferencesData = await window.authHelper.createInsertPayload({
                      unit_system: profileData.unitSystem || 'imperial',
                      theme: 'light', // Default theme
                      notifications_enabled: true,
                      show_tutorials: true,
                      custom_preferences: {}
                  });
                
                  // Save/update user preferences
                  const { data: prefsResult, error: prefsError } = await window.supabaseClient
                      .from('user_preferences')
                      .upsert(preferencesData, { 
                          onConflict: identifier.user_id ? 'user_id' : 'anon_profile_id'
                      })
                      .select();
                
                  if (prefsError) {
                      console.warn('⚠️ User preferences save failed:', prefsError.message);
                  }
                
                  // Save daily targets to daily_targets table if provided
                  let targetsResult = null;
                  if (profileData.dailyTargets) {
                      const targets = typeof profileData.dailyTargets === 'string' 
                          ? (window.JSON?.safeParse ? 
                              window.JSON.safeParse(profileData.dailyTargets, {}) : 
                              (() => {
                                  try {
                                      return JSON.parse(profileData.dailyTargets);
                                  } catch (error) {
                                      console.warn('Error parsing daily targets:', error);
                                      return {};
                                  }
                              })()
                            )
                          : profileData.dailyTargets;
                    
                      const targetsData = await window.authHelper.createInsertPayload({
                          daily_calories: parseInt(targets.calories) || 2000,
                          daily_protein: parseInt(targets.protein) || 150,
                          daily_carbs: parseInt(targets.carbs) || 250,
                          daily_fat: parseInt(targets.fat) || 67
                      });
                    
                      const { data: targetsRes, error: targetsError } = await window.supabaseClient
                          .from('daily_targets')
                          .upsert(targetsData, { 
                              onConflict: identifier.user_id ? 'user_id' : 'anon_profile_id'
                          })
                          .select();
                    
                      if (targetsError) {
                          console.warn('⚠️ Daily targets save failed:', targetsError.message);
                      } else {
                          targetsResult = targetsRes;
                      }
                  }
                
                  // Also save to localStorage for offline access
                  localStorage.setItem('userProfile', JSON.stringify(profileData));
                
                  console.log('✅ Profile saved to UUID-based schema successfully');
                  return {
                      preferences: prefsResult,
                      dailyTargets: targetsResult,
                      success: true
                  };
                
              } catch (error) {
                  console.error('❌ Error saving user profile:', error);
                  // Fallback to localStorage
                  localStorage.setItem('userProfile', JSON.stringify(profileData));
                  return { fallback: true, error: error.message };
              }
          }

          async function loadUserProfile() {
              const userEmail = getCurrentUserEmail();
            
              try {
                  // Try Supabase first (for cross-device sync)
                  if (window.supabaseClient) {
                      console.log('📡 Loading profile from Supabase...');
                      try {
                          // Check authentication status first
                          const { data: { user }, error: authError } = await window.supabaseClient.auth.getUser();
                          let lookupEmail = userEmail;
                        
                          // If user is authenticated, use their email or anonymous ID
                          if (user) {
                              lookupEmail = user.email || `anon_${user.id}`;
                          }
                        
                          const { data, error } = await window.supabaseClient
                              .from('user_profiles')
                              .select('*')
                              .eq('user_email', lookupEmail)
                              .maybeSingle();
                        
                          if (!error && data) {
                              console.log('✅ Profile loaded from Supabase:', data);
                            
                              // Get additional data from localStorage (unitSystem, dailyTargets)
                              const stored = localStorage.getItem('userProfile');
                              const localData = stored ? JSON.parse(stored) : {};
                            
                              return {
                                  name: data.name || 'User',
                                  unitSystem: localData.unitSystem || 'imperial',
                                  dailyTargets: localData.dailyTargets || { calories: 2000, protein: 150, carbs: 250, fat: 67 }
                              };
                          } else if (error) {
                              console.warn('⚠️ Supabase profile load failed:', error.message);
                          }
                      } catch (error) {
                          console.warn('⚠️ Supabase profile load error:', error);
                      }
                  }
                
                  // Fallback to localStorage
                  console.log('📱 Loading profile from localStorage fallback...');
                  const stored = localStorage.getItem('userProfile');
                  return stored ? JSON.parse(stored) : null;
              } catch (error) {
                  console.error('Error loading user profile:', error);
                  // Final fallback to localStorage
                  const stored = localStorage.getItem('userProfile');
                  return stored ? JSON.parse(stored) : null;
              }
          }

          // Daily Meals API - UUID-based with authHelper.js
          async function saveDailyMeals(meals, date = null) {
              const mealDate = date || new Date().toISOString().split('T')[0];
            
              console.log('💾 Saving daily meals to database...', {
                  mealDate: mealDate,
                  mealCount: meals.length
              });

              try {
                  if (!window.supabaseClient) {
                      console.log('ℹ️ No database connection available for daily meals save');
                      localStorage.setItem('meals', JSON.stringify(meals));
                      localStorage.setItem('lastSaved', mealDate);
                      return { fallback: true };
                  }

                  // Get user identifier (invite-only system - must be authenticated)
                  const identifier = await window.authHelper.getCurrentUserIdentifier();
                
                  if (!identifier.is_authenticated || !identifier.user_id) {
                      console.warn('User not authenticated - redirecting to login');
                      window.authHelper.redirectToLogin();
                      throw new Error('Authentication required to save meals');
                  }

                  console.info('💾 Saving meals for authenticated user:', identifier.user_id);

                  // Clear existing meals for this date (authenticated user only)
                  const deleteQuery = window.supabaseClient
                      .from('daily_meals')
                      .delete()
                      .eq('meal_date', mealDate)
                      .eq('user_id', identifier.user_id);

                  const { error: deleteError } = await deleteQuery;
                
                  if (deleteError) {
                      console.warn('⚠️ Failed to clear existing meals:', deleteError.message);
                  }

                  // Save new meals to Supabase using UUID-based schema
                  const supabaseResults = [];
                  for (const meal of meals) {
                      const mealData = await window.authHelper.createInsertPayload({
                          meal_date: mealDate,
                          meal_name: meal.name,
                          calories: Math.round(meal.calories || 0), // INTEGER type
                          protein: Math.round(meal.protein || 0), // INTEGER type
                          carbs: Math.round(meal.carbs || 0), // INTEGER type
                          fat: Math.round(meal.fat || 0), // INTEGER type
                          meal_uuid: meal.id ? meal.id.toString() : crypto.randomUUID(),
                          timestamp: new Date().toISOString()
                      });

                      const { data: inserted, error } = await window.supabaseClient
                          .from('daily_meals')
                          .insert(mealData)
                          .select();

                      if (error) {
                          console.warn('⚠️ Supabase meal insert failed:', error.message);
                          throw error;
                      } else {
                          supabaseResults.push(inserted[0]);
                          console.log('✅ Meal saved to Supabase:', inserted[0]);
                      }
                  }

                  console.log(`✅ ${supabaseResults.length} meals saved to Supabase successfully`);

                  // Also save to localStorage for offline access
                  localStorage.setItem('meals', JSON.stringify(meals));
                  localStorage.setItem('lastSaved', mealDate);

                  return { success: true, count: meals.length, supabase: supabaseResults.length };
                
              } catch (error) {
                  console.error('❌ Failed to save daily meals to database:', error);
                
                  // Final fallback to localStorage
                  localStorage.setItem('meals', JSON.stringify(meals));
                  localStorage.setItem('lastSaved', mealDate);
                  return { fallback: true, error: error.message };
              }
          }

          async function loadDailyMeals(date = null) {
              if (!window.supabaseClient) {
                  console.log('ℹ️ No database connection available, using localStorage for daily meals');
                  const stored = localStorage.getItem('meals');
                  return stored ? JSON.parse(stored) : [];
              }

              const mealDate = date || new Date().toISOString().split('T')[0];
              console.log('📡 Loading daily meals from database...');
            
              try {
                  // Get user identifier using authHelper (supports both authenticated users and anonymous profiles)
                  const identifier = await window.authHelper.getCurrentUserIdentifier();
                
                  if (!identifier.user_id && !identifier.anon_profile_id) {
                      console.log('ℹ️ No valid user identifier available, using localStorage');
                      const stored = localStorage.getItem('meals');
                      return stored ? JSON.parse(stored) : [];
                  }

                  console.log('📡 Using UUID-based authentication to load meals...', {
                      user_id: identifier.user_id ? 'authenticated' : null,
                      anon_profile_id: identifier.anon_profile_id ? 'anonymous' : null
                  });

                  // Query meals for this user and date
                  const query = window.supabaseClient
                      .from('daily_meals')
                      .select('*')
                      .eq('meal_date', mealDate);

                  // Apply user filter based on auth status
                  if (identifier.user_id) {
                      query.eq('user_id', identifier.user_id);
                  } else if (identifier.anon_profile_id) {
                      query.eq('anon_profile_id', identifier.anon_profile_id);
                  }

                  const { data, error } = await query.order('created_at', { ascending: true });
                
                  if (error) {
                      console.warn('⚠️ Supabase daily meals load error:', error.message);
                      throw error;
                  }

                  if (data && data.length > 0) {
                      console.log(`✅ Loaded ${data.length} daily meals from Supabase for ${mealDate}`);
                      return data.map((meal, index) => ({
                          id: meal.id || Date.now() + index,
                          name: meal.meal_name,
                          calories: meal.calories,
                          protein: meal.protein,
                          carbs: meal.carbs,
                          fat: meal.fat
                      }));
                  }

                  // No meals found in database
                  console.log('📱 No database meals found, falling back to localStorage...');
                  const stored = localStorage.getItem('meals');
                  return stored ? JSON.parse(stored) : [];
                
              } catch (error) {
                  console.error('❌ Failed to load daily meals from database:', error);
                
                  // Final fallback to localStorage
                  console.log('📱 Falling back to localStorage...');
                  const stored = localStorage.getItem('meals');
                  return stored ? JSON.parse(stored) : [];
              }
          }

          // Progress Entries API
          // Progress Tracker API with Supabase Integration
          async function saveProgressEntryToDB(entry) {
              if (!window.supabaseClient && !window.apiCall) {
                  console.log('ℹ️ No database connection available for progress entry save');
                  return { fallback: true };
              }

              console.log('💾 Saving progress entry to database...');
            
              try {
                  // Get user identifier using authHelper (supports both authenticated users and anonymous profiles)
                  const identifier = await window.authHelper.getCurrentUserIdentifier();
                
                  if (!identifier.user_id && !identifier.anon_profile_id) {
                      throw new Error('No valid user identifier available');
                  }

                  console.log('💾 Using UUID-based authentication with Supabase...', {
                      user_id: identifier.user_id ? 'authenticated' : null,
                      anon_profile_id: identifier.anon_profile_id ? 'anonymous' : null
                  });

                  // Check if progress entry exists for this date
                  const queryFilter = await window.authHelper.getUserQueryFilter();
                  const existingQuery = window.supabaseClient
                      .from('progress_entries')
                      .select('*')
                      .eq('date', entry.date);

                  // Apply user filter based on auth status
                  if (identifier.user_id) {
                      existingQuery.eq('user_id', identifier.user_id);
                  } else if (identifier.anon_profile_id) {
                      existingQuery.eq('anon_profile_id', identifier.anon_profile_id);
                  }

                  const { data: existing, error: selectError } = await existingQuery.maybeSingle();

                  // Prepare data using authHelper
                  const progressData = await window.authHelper.createInsertPayload({
                      date: entry.date,
                      weight_kg: entry.weight,
                      waist_cm: entry.measurements?.waist || null,
                      chest_cm: entry.measurements?.chest || null,
                      hips_cm: entry.measurements?.hips || null,
                      arms_cm: entry.measurements?.arms || null,
                      notes: entry.notes || '',
                      entry_uuid: entry.id.toString()
                  });

                  if (existing && !selectError) {
                      // Update existing progress entry using upsert
                      const { data: updateData, error } = await window.supabaseClient
                          .from('progress_entries')
                          .upsert(progressData, { 
                              onConflict: identifier.user_id ? 'user_id,date' : 'anon_profile_id,date'
                          })
                          .select();
                    
                      if (error) {
                          console.warn('⚠️ Supabase progress entry update failed:', error.message);
                          throw error;
                      }
                      console.log('✅ Progress entry updated in Supabase:', updateData);
                      return updateData;
                  } else {
                      // Create new progress entry
                      const { data: insertData, error } = await window.supabaseClient
                          .from('progress_entries')
                          .insert(progressData)
                          .select();
                    
                      if (error) {
                          console.warn('⚠️ Supabase progress entry insert failed:', error.message);
                          throw error;
                      }
                      console.log('✅ Progress entry created in Supabase:', insertData);
                      return insertData;
                  }
                
              } catch (error) {
                  console.warn('⚠️ Supabase save failed, trying RESTful API fallback:', error.message);
                
                  // Fallback to RESTful API if Supabase fails
                  if (window.apiCall) {
                      try {
                          console.log('📡 Using RESTful API for progress entry save...');
                        
                          // Get user email for RESTful API
                          const userEmail = getCurrentUserEmail();
                        
                          // Prepare data for RESTful API
                          const apiProgressData = {
                              email: userEmail,
                              date: entry.date,
                              weight_kg: entry.weight,
                              waist_cm: entry.measurements?.waist || null,
                              chest_cm: entry.measurements?.chest || null,
                              hips_cm: entry.measurements?.hips || null,
                              arms_cm: entry.measurements?.arms || null,
                              notes: entry.notes || '',
                              entry_uuid: entry.id.toString()
                          };
                        
                          // Check if RESTful API endpoints are available first
                          const apiAvailable = await checkApiEndpoints();
                          if (!apiAvailable) {
                              console.log('⚠️ RESTful API endpoints not available - skipping progress entry RESTful API fallback');
                              return { fallback: true };
                          }
                        
                          // Check if entry exists for this date using direct Supabase query
                          try {
                              // Checking existing progress entries
                              let query = window.supabaseClient.from('progress_entries').select('*');
                              if (window.SupabaseQueryHelper) {
                                  query = window.SupabaseQueryHelper.applySearchFilter(query, userEmail, 'progress_entries');
                              } else {
                                  query = query.eq('user_email', userEmail);
                              }
                              const { data: existingData, error: existingError } = await query;
                              if (existingError) throw existingError;
                              const existingEntry = existingData?.find(e => e.date === entry.date);
                            
                              if (existingEntry) {
                                  // Update existing entry
                                  const updateResult = await apiCall(`tables/progress_entries/${existingEntry.id}`, 'PUT', apiProgressData);
                                  console.log('✅ Progress entry updated via RESTful API');
                                  return updateResult;
                              } else {
                                  // Create new entry
                                  const createResult = await apiCall('tables/progress_entries', 'POST', apiProgressData);
                                  console.log('✅ Progress entry created via RESTful API');
                                  return createResult;
                              }
                          } catch (apiError) {
                              console.warn('⚠️ RESTful API save failed:', apiError.message);
                              return { fallback: true, error: `Both Supabase and RESTful API failed: ${error.message}, ${apiError.message}` };
                          }
                      } catch (apiFallbackError) {
                          console.error('❌ RESTful API fallback failed:', apiFallbackError.message);
                          return { fallback: true, error: `Both Supabase and RESTful API failed: ${error.message}, ${apiFallbackError.message}` };
                      }
                  } else {
                      console.error('❌ Failed to save progress entry to database:', error);
                      return { fallback: true, error: error.message };
                  }
              }
          }

          async function loadProgressEntries() {
              if (!window.supabaseClient && !window.apiCall) {
                  console.log('ℹ️ No database connection available, using localStorage for progress entries');
                  const stored = localStorage.getItem('progressEntries');
                  return stored ? JSON.parse(stored) : [];
              }

              console.log('📡 Loading progress entries from database...');
            
              try {
                  // Try Supabase first
                  if (window.supabaseClient) {
                      // Get user identifier using authHelper (supports both authenticated users and anonymous profiles)
                      const identifier = await window.authHelper.getCurrentUserIdentifier();
                    
                      if (!identifier.user_id && !identifier.anon_profile_id) {
                          console.log('ℹ️ No valid user identifier available for progress entries loading, using localStorage');
                          const stored = localStorage.getItem('progressEntries');
                          return stored ? JSON.parse(stored) : [];
                      }

                      console.log('📡 Using UUID-based authentication with Supabase...', {
                          user_id: identifier.user_id ? 'authenticated' : null,
                          anon_profile_id: identifier.anon_profile_id ? 'anonymous' : null
                      });

                      // Query based on available identifier
                      let query = window.supabaseClient.from('progress_entries').select('*');
                    
                      if (identifier.user_id) {
                          query = query.eq('user_id', identifier.user_id);
                      } else {
                          query = query.eq('anon_profile_id', identifier.anon_profile_id);
                      }
                    
                      const { data, error } = await query.order('date', { ascending: false });

                      if (error) {
                          console.warn('⚠️ Supabase progress entries load error:', error.message);
                          throw error; // Fall through to RESTful API
                      }

                      if (data && data.length > 0) {
                          console.log(`✅ Loaded ${data.length} progress entries from Supabase`);
                          return data.map(entry => ({
                              id: parseInt(entry.entry_uuid) || Date.now(),
                              date: entry.date,
                              weight: entry.weight_kg,
                              measurements: {
                                  waist: entry.waist_cm,
                                  chest: entry.chest_cm,
                                  hips: entry.hips_cm,
                                  arms: entry.arms_cm
                              },
                              notes: entry.notes || '',
                              timestamp: new Date(entry.created_at).getTime()
                          }));
                      }
                  }

                  // Fallback to RESTful API
                  if (window.apiCall) {
                      try {
                          console.log('📡 Using RESTful API for progress entries load...');
                        
                          // Check if RESTful API endpoints are available first
                          const apiAvailable = await checkApiEndpoints();
                          if (!apiAvailable) {
                              console.log('⚠️ RESTful API endpoints not available - skipping progress entries RESTful API fallback');
                              const stored = localStorage.getItem('progressEntries');
                              return stored ? JSON.parse(stored) : [];
                          }
                        
                          // Get user identifier using authHelper
                          const identifier = await window.authHelper.getCurrentUserIdentifier();
                        
                          if (!identifier.user_id && !identifier.anon_profile_id) {
                              console.log('ℹ️ No valid user identifier available for RESTful API progress entries, using localStorage');
                              const stored = localStorage.getItem('progressEntries');
                              return stored ? JSON.parse(stored) : [];
                          }

                          // Search for progress entries using UUID
                          const searchField = identifier.user_id ? 'user_id' : 'anon_profile_id';
                          const searchValue = identifier.user_id || identifier.anon_profile_id;
                        
                          // Use direct Supabase query to avoid PGRST100 errors
                          console.log(`🔍 Loading progress entries with safe query for ${searchField}:`, searchValue);
                          let query = window.supabaseClient.from('progress_entries').select('*');
                          if (window.SupabaseQueryHelper) {
                              query = window.SupabaseQueryHelper.applySearchFilter(query, searchValue, 'progress_entries');
                          } else {
                              query = query.eq(searchField, searchValue);
                          }
                          query = query.order('date', { ascending: false });
                          const { data: responseData, error: responseError } = await query;
                          if (responseError) throw responseError;
                        
                          const response = { data: responseData };
                        
                          if (response.data && response.data.length > 0) {
                              console.log(`✅ Loaded ${response.data.length} progress entries from RESTful API`);
                              return response.data
                                  .filter(entry => entry[searchField] === searchValue)
                                  .map(entry => ({
                                      id: parseInt(entry.entry_uuid) || Date.now(),
                                      date: entry.date,
                                      weight: entry.weight_kg,
                                      measurements: {
                                          waist: entry.waist_cm,
                                          chest: entry.chest_cm,
                                          hips: entry.hips_cm,
                                          arms: entry.arms_cm
                                      },
                                      notes: entry.notes || '',
                                      timestamp: new Date(entry.created_at).getTime()
                                  }))
                                  .sort((a, b) => new Date(b.date) - new Date(a.date));
                          } else {
                              console.log('📡 No progress entries found in RESTful API');
                              return [];
                          }
                      } catch (apiError) {
                          console.warn('⚠️ RESTful API progress entries load failed:', apiError.message);
                          if (apiError.message && apiError.message.includes('404')) {
                              console.log('📋 Progress entries table not found in RESTful API - this is normal for new users');
                          }
                          return [];
                      }
                  }
                
                  return [];
                
              } catch (error) {
                  console.error('❌ Failed to load progress entries from database:', error);
                
                  // Final fallback to localStorage
                  console.log('📱 Falling back to localStorage...');
                  const stored = localStorage.getItem('progressEntries');
                  return stored ? JSON.parse(stored) : [];
              }
          }

          // Progress Goals API with Supabase Integration
          async function saveProgressGoalToDB(goal) {
              if (!window.supabaseClient && !window.apiCall) {
                  console.log('ℹ️ No database connection available for progress goal save');
                  return { fallback: true };
              }

              console.log('💾 Saving progress goal to database...');
            
              try {
                  // Get user identifier using authHelper (supports both authenticated users and anonymous profiles)
                  const identifier = await window.authHelper.getCurrentUserIdentifier();
                
                  if (!identifier.user_id && !identifier.anon_profile_id) {
                      throw new Error('No valid user identifier available');
                  }

                  console.log('💾 Using UUID-based authentication with Supabase...', {
                      user_id: identifier.user_id ? 'authenticated' : null,
                      anon_profile_id: identifier.anon_profile_id ? 'anonymous' : null
                  });

                  // Deactivate existing goals for this user
                  const deactivateQuery = window.supabaseClient
                      .from('progress_goals')
                      .update({ is_active: false });

                  if (identifier.user_id) {
                      deactivateQuery.eq('user_id', identifier.user_id);
                  } else if (identifier.anon_profile_id) {
                      deactivateQuery.eq('anon_profile_id', identifier.anon_profile_id);
                  }

                  await deactivateQuery;
                
                  // Create new active goal using authHelper
                  const goalData = await window.authHelper.createInsertPayload({
                      goal_type: 'weight_loss', // Default goal type
                      current_value: goal.currentWeight || 0,
                      target_value: goal.targetWeight,
                      target_date: goal.targetDate,
                      unit: 'kg',
                      is_active: true,
                      notes: goal.notes || ''
                  });

                  const { data: insertData, error } = await window.supabaseClient
                      .from('progress_goals')
                      .insert(goalData)
                      .select();
                
                  if (error) {
                      console.warn('⚠️ Supabase progress goal insert failed:', error.message);
                      throw error;
                  }
                  console.log('✅ Progress goal created in Supabase:', insertData);
                  return insertData;
                
              } catch (error) {
                  console.warn('⚠️ Supabase save failed, trying RESTful API fallback:', error.message);
                
                  // Fallback to RESTful API if Supabase fails
                  if (window.apiCall) {
                      try {
                          console.log('📡 Using RESTful API for progress goal save...');
                        
                          // Check if RESTful API endpoints are available first
                          const apiAvailable = await checkApiEndpoints();
                          if (!apiAvailable) {
                              console.log('⚠️ RESTful API endpoints not available - skipping progress goal RESTful API fallback');
                              return { fallback: true };
                          }
                        
                          // Get user email for RESTful API
                          const userEmail = getCurrentUserEmail();
                        
                          // First, deactivate existing goals
                          try {
                              // Use direct Supabase query to avoid PGRST100 errors
                              console.log('🔍 Loading existing progress goals with safe query for:', userEmail);
                              const { data: existingGoalsData, error: existingGoalsError } = await window.supabaseClient
                                  .from('progress_goals')
                                  .select('*')
                                  .eq('user_email', userEmail);
                              if (existingGoalsError) throw existingGoalsError;
                            
                              const existingGoalsResponse = { data: existingGoalsData };
                              if (existingGoalsResponse.data && existingGoalsResponse.data.length > 0) {
                                  const activeGoals = existingGoalsResponse.data.filter(g => g.is_active);
                                  for (const activeGoal of activeGoals) {
                                      await apiCall(`tables/progress_goals/${activeGoal.id}`, 'PATCH', { is_active: false });
                                  }
                              }
                          } catch (deactivateError) {
                              console.warn('⚠️ Could not deactivate existing goals:', deactivateError.message);
                          }
                        
                          // Prepare data for RESTful API
                          const apiGoalData = {
                              email: userEmail,
                              goal_type: 'weight_loss', // Default goal type
                              current_value: goal.currentWeight || 0,
                              target_value: goal.targetWeight,
                              target_date: goal.targetDate,
                              unit: 'kg',
                              is_active: true,
                              created_date: goal.setDate || new Date().toISOString().split('T')[0],
                              notes: goal.notes || ''
                          };
                        
                          // Create new goal
                          const createResult = await apiCall('tables/progress_goals', 'POST', apiGoalData);
                          console.log('✅ Progress goal created via RESTful API');
                          return createResult;
                        
                      } catch (apiError) {
                          console.error('❌ RESTful API fallback failed:', apiError.message);
                          return { fallback: true, error: `Both Supabase and RESTful API failed: ${error.message}, ${apiError.message}` };
                      }
                  } else {
                      console.error('❌ Failed to save progress goal to database:', error);
                      return { fallback: true, error: error.message };
                  }
              }
          }

          async function loadProgressGoalFromDB() {
              if (!window.supabaseClient && !window.apiCall) {
                  return null;
              }

              const userEmail = getCurrentUserEmail();
              console.log('📡 Loading progress goal from database...');
            
              try {
                  // Try Supabase first
                  if (window.supabaseClient) {
                      const { data: { user } } = await window.supabaseClient.auth.getUser();
                      if (!user) {
                          console.log('ℹ️ No authenticated user for progress goal loading');
                          return null;
                      }

                      const lookupEmail = user.email || `anon_${user.id}`;
                    
                      // Use safe query to avoid PGRST100 errors
                      console.log('🔍 Loading progress goals from Supabase for:', lookupEmail);
                      const { data, error } = await window.supabaseClient
                          .from('progress_goals')
                          .select('*')
                          .eq('user_email', lookupEmail)  // Changed from 'email' to 'user_email'
                          .eq('is_active', true)
                          .order('created_at', { ascending: false })
                          .limit(1)
                          .maybeSingle();

                      if (error) {
                          console.warn('⚠️ Supabase progress goal load error:', error.message);
                          throw error; // Fall through to RESTful API
                      }

                      if (data) {
                          console.log('✅ Loaded progress goal from Supabase');
                          return {
                              targetWeight: data.target_value,
                              targetDate: data.target_date,
                              setDate: data.created_at,
                              currentWeight: data.current_value,
                              notes: data.notes
                          };
                      }
                  }

                  // Fallback to RESTful API
                  if (window.apiCall) {
                      try {
                          console.log('📡 Using RESTful API for progress goal load...');
                        
                          // Check if RESTful API endpoints are available first
                          const apiAvailable = await checkApiEndpoints();
                          if (!apiAvailable) {
                              console.log('⚠️ RESTful API endpoints not available - skipping progress goal RESTful API fallback');
                              return null;
                          }
                        
                          // Use direct Supabase query to avoid PGRST100 errors
                          console.log('🔍 Loading progress goals with safe query for:', userEmail);
                          const { data: responseData, error: responseError } = await window.supabaseClient
                              .from('progress_goals')
                              .select('*')
                              .eq('user_email', userEmail);
                          if (responseError) throw responseError;
                        
                          const response = { data: responseData };
                        
                          if (response.data && response.data.length > 0) {
                              const activeGoals = response.data
                                  .filter(goal => goal.is_active)
                                  .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
                            
                              if (activeGoals.length > 0) {
                                  const goal = activeGoals[0];
                                  console.log('✅ Loaded progress goal from RESTful API');
                                  return {
                                      targetWeight: goal.target_value,
                                      targetDate: goal.target_date,
                                      setDate: goal.created_at,
                                      currentWeight: goal.current_value,
                                      notes: goal.notes
                                  };
                              }
                          } else {
                              console.log('📡 No progress goals found in RESTful API');
                          }
                      } catch (apiError) {
                          console.warn('⚠️ RESTful API progress goal load failed:', apiError.message);
                          if (apiError.message && apiError.message.includes('404')) {
                              console.log('📋 Progress goals table not found in RESTful API - this is normal for new users');
                          }
                      }
                  }
                
                  return null;
                
              } catch (error) {
                  console.error('❌ Failed to load progress goal from database:', error);
                  return null;
              }
          }

          // Macro History API with Supabase Integration
          async function saveMacroHistoryToDB(macroEntry) {
              if (!window.supabaseClient) {
                  console.log('ℹ️ No database connection available for macro history save');
                  return { fallback: true };
              }

              console.log('💾 Saving macro history entry to database...');
            
              try {
                  // Get user identifier using authHelper (supports both authenticated users and anonymous profiles)
                  const identifier = await window.authHelper.getCurrentUserIdentifier();
                
                  if (!identifier.user_id && !identifier.anon_profile_id) {
                      throw new Error('No valid user identifier available');
                  }

                  console.log('💾 Using UUID-based authentication with Supabase...', {
                      user_id: identifier.user_id ? 'authenticated' : null,
                      anon_profile_id: identifier.anon_profile_id ? 'anonymous' : null
                  });

                  // Prepare data using authHelper
                  const macroData = await window.authHelper.createInsertPayload({
                      date: macroEntry.date,
                      calories_consumed: macroEntry.calories,
                      protein_consumed: macroEntry.protein,
                      carbs_consumed: macroEntry.carbs,
                      fat_consumed: macroEntry.fat,
                      calories_goal: macroEntry.caloriesGoal,
                      protein_goal: macroEntry.proteinGoal,
                      carbs_goal: macroEntry.carbsGoal,
                      fat_goal: macroEntry.fatGoal,
                      protein_percent: macroEntry.proteinPercent,
                      carbs_percent: macroEntry.carbsPercent,
                      fat_percent: macroEntry.fatPercent,
                      goals_met: macroEntry.goalsMet
                  });

                  // Use upsert to handle duplicates (update if exists, insert if not)
                  const conflictColumns = identifier.user_id ? 'user_id,date' : 'anon_profile_id,date';
                  const { data: upsertData, error } = await window.supabaseClient
                      .from('macro_history')
                      .upsert(macroData, { 
                          onConflict: conflictColumns,
                          ignoreDuplicates: false 
                      })
                      .select();
                
                  if (error) {
                      console.warn('⚠️ Supabase macro history upsert failed:', error.message);
                      throw error;
                  }
                  console.log('✅ Macro history saved to Supabase:', upsertData);
                  return upsertData;
                
              } catch (error) {
                  console.error('❌ Failed to save macro history to database:', error);
                  return { fallback: true, error: error.message };
              }
          }

          async function loadMacroHistoryFromDB() {
              if (!window.supabaseClient && !window.apiCall) {
                  return [];
              }

              const userEmail = getCurrentUserEmail();
              console.log('📡 Loading macro history from database...');
            
              try {
                  // Try Supabase first
                  if (window.supabaseClient) {
                      const { data: { user } } = await window.supabaseClient.auth.getUser();
                      if (!user) {
                          console.log('ℹ️ No authenticated user for macro history loading');
                          return [];
                      }

                      const lookupEmail = user.email || `anon_${user.id}`;
                    
                      const { data, error } = await window.supabaseClient
                          .from('macro_history')
                          .select('*')
                          .eq('user_email', lookupEmail)
                          .order('date', { ascending: false })
                          .limit(30); // Last 30 days

                      if (error) {
                          console.warn('⚠️ Supabase macro history load error:', error.message);
                          throw error; // Fall through to RESTful API
                      }

                      if (data && data.length > 0) {
                          console.log(`✅ Loaded ${data.length} macro history entries from Supabase`);
                          return data.map(entry => ({
                              date: entry.date,
                              calories: entry.calories_consumed,
                              protein: entry.protein_consumed,
                              carbs: entry.carbs_consumed,
                              fat: entry.fat_consumed,
                              caloriesGoal: entry.calories_goal,
                              proteinGoal: entry.protein_goal,
                              carbsGoal: entry.carbs_goal,
                              fatGoal: entry.fat_goal,
                              proteinPercent: entry.protein_percent,
                              carbsPercent: entry.carbs_percent,
                              fatPercent: entry.fat_percent,
                              goalsMet: entry.goals_met
                          }));
                      }
                  }

                  // Fallback to RESTful API
                  if (window.apiCall) {
                      console.log('📡 Using RESTful API for macro history load...');
                    
                      // Check if RESTful API endpoints are available first
                      const apiAvailable = await checkApiEndpoints();
                      if (!apiAvailable) {
                          console.log('⚠️ RESTful API endpoints not available - skipping macro history RESTful API fallback');
                          return [];
                      }
                    
                      // Use direct Supabase query to avoid PGRST100 errors
                      console.log('🔍 Loading macro history with safe query for:', userEmail);
                      let query = window.supabaseClient.from('macro_history').select('*');
                      if (window.SupabaseQueryHelper) {
                          query = window.SupabaseQueryHelper.applySearchFilter(query, userEmail, 'macro_history');
                      } else {
                          query = query.eq('user_email', userEmail);
                      }
                      const { data: responseData, error: responseError } = await query;
                      if (responseError) throw responseError;
                    
                      const response = { data: responseData };
                    
                      if (response.data && response.data.length > 0) {
                          console.log(`✅ Loaded ${response.data.length} macro history entries from RESTful API`);
                          return response.data
                              .map(entry => ({
                                  date: entry.date,
                                  calories: entry.calories_consumed,
                                  protein: entry.protein_consumed,
                                  carbs: entry.carbs_consumed,
                                  fat: entry.fat_consumed,
                                  caloriesGoal: entry.calories_goal,
                                  proteinGoal: entry.protein_goal,
                                  carbsGoal: entry.carbs_goal,
                                  fatGoal: entry.fat_goal,
                                  proteinPercent: entry.protein_percent,
                                  carbsPercent: entry.carbs_percent,
                                  fatPercent: entry.fat_percent,
                                  goalsMet: entry.goals_met
                              }))
                              .sort((a, b) => new Date(b.date) - new Date(a.date))
                              .slice(0, 30);
                      }
                  }
                
                  return [];
                
              } catch (error) {
                  console.error('❌ Failed to load macro history from database:', error);
                  return [];
              }
          }

          // Custom Recipes API with Supabase Integration
          async function saveCustomRecipeToDB(recipe) {
              if (!window.supabaseClient) {
                  console.log('ℹ️ No database connection available for recipe save');
                  return { fallback: true };
              }

              console.log('💾 Saving custom recipe to database...');
            
              try {
                  // Get user identifier using authHelper (supports both authenticated users and anonymous profiles)
                  const identifier = await window.authHelper.getCurrentUserIdentifier();
                
                  if (!identifier.user_id && !identifier.anon_profile_id) {
                      throw new Error('No valid user identifier available');
                  }

                  console.log('💾 Using UUID-based authentication with Supabase...', {
                      user_id: identifier.user_id ? 'authenticated' : null,
                      anon_profile_id: identifier.anon_profile_id ? 'anonymous' : null
                  });
                
                  // Generate proper UUID for recipe if not exists
                  const recipeUuid = recipe.uuid || 
                                    (recipe.id && typeof recipe.id === 'string' && recipe.id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i) ? 
                                     recipe.id : 
                                     crypto.randomUUID());

                  // Debug: Log the recipe object being processed
                  console.log('🔍 Processing recipe for database save:', recipe);
                
                  // Prepare recipe data using authHelper
                  const recipeData = await window.authHelper.createInsertPayload({
                      recipe_name: recipe.name,
                      category: recipe.category || 'General',
                      calories: Math.round(recipe.calories || 0), // Convert to INTEGER
                      protein: Math.round(recipe.protein || 0),   // Convert to INTEGER
                      carbs: Math.round(recipe.carbs || 0),       // Convert to INTEGER
                      fat: Math.round(recipe.fat || 0),           // Convert to INTEGER
                      servings: parseInt(recipe.servings) || 1,   // Ensure integer
                      ingredients: recipe.ingredients || [],      // Store as JSONB directly
                      instructions: recipe.instructions || '',
                      recipe_uuid: recipeUuid
                  });
                
                  console.log('🔍 Prepared recipe data for database:', recipeData);
                
                  // Validate data types before database operation
                  const validationErrors = [];
                  if (typeof recipeData.recipe_name !== 'string') {
                      validationErrors.push(`recipe_name should be string, got ${typeof recipeData.recipe_name}`);
                  }
                  if (typeof recipeData.calories !== 'number' || isNaN(recipeData.calories)) {
                      validationErrors.push(`calories should be number, got ${typeof recipeData.calories} (${recipeData.calories})`);
                  }
                  if (typeof recipeData.protein !== 'number' || isNaN(recipeData.protein)) {
                      validationErrors.push(`protein should be number, got ${typeof recipeData.protein} (${recipeData.protein})`);
                  }
                  if (typeof recipeData.carbs !== 'number' || isNaN(recipeData.carbs)) {
                      validationErrors.push(`carbs should be number, got ${typeof recipeData.carbs} (${recipeData.carbs})`);
                  }
                  if (typeof recipeData.fat !== 'number' || isNaN(recipeData.fat)) {
                      validationErrors.push(`fat should be number, got ${typeof recipeData.fat} (${recipeData.fat})`);
                  }
                  if (typeof recipeData.servings !== 'number' || isNaN(recipeData.servings)) {
                      validationErrors.push(`servings should be number, got ${typeof recipeData.servings} (${recipeData.servings})`);
                  }
                
                  if (validationErrors.length > 0) {
                      console.error('🚨 Data validation failed:', validationErrors);
                      throw new Error(`Recipe data validation failed: ${validationErrors.join(', ')}`);
                  }

                  // Check if recipe already exists for this user
                  const existingQuery = window.supabaseClient
                      .from('custom_recipes')
                      .select('*')
                      .eq('recipe_uuid', recipeUuid);

                  if (identifier.user_id) {
                      existingQuery.eq('user_id', identifier.user_id);
                  } else if (identifier.anon_profile_id) {
                      existingQuery.eq('anon_profile_id', identifier.anon_profile_id);
                  }

                  const { data: existing, error: selectError } = await existingQuery.maybeSingle();

                  if (existing && !selectError) {
                      // Update existing recipe using upsert
                      const conflictColumns = identifier.user_id ? 'user_id,recipe_uuid' : 'anon_profile_id,recipe_uuid';
                      const { data: updateData, error } = await window.supabaseClient
                          .from('custom_recipes')
                          .upsert(recipeData, { 
                              onConflict: conflictColumns,
                              ignoreDuplicates: false 
                          })
                          .select();
                    
                      if (error) {
                          console.error('⚠️ Supabase recipe update failed:', {
                              errorMessage: error.message,
                              errorDetails: error.details,
                              errorHint: error.hint,
                              errorCode: error.code,
                              recipeDataSent: recipeData
                          });
                        
                          // Try to provide more helpful error message
                          if (error.message.includes('invalid input syntax for type integer')) {
                              throw new Error(`Database schema issue: A text value is being sent to an integer field. Please check the database table schema for 'custom_recipes'. Original error: ${error.message}`);
                          }
                        
                          throw error;
                      }
                      console.log('✅ Recipe updated in Supabase:', updateData);
                      return updateData;
                  } else {
                      // Create new recipe
                      const { data: insertData, error } = await window.supabaseClient
                          .from('custom_recipes')
                          .insert(recipeData)
                          .select();
                    
                      if (error) {
                          console.error('⚠️ Supabase recipe insert failed:', {
                              errorMessage: error.message,
                              errorDetails: error.details,
                              errorHint: error.hint,
                              errorCode: error.code,
                              recipeDataSent: recipeData
                          });
                        
                          // Try to provide more helpful error message
                          if (error.message.includes('invalid input syntax for type integer')) {
                              throw new Error(`Database schema issue: A text value is being sent to an integer field. Please check the database table schema for 'custom_recipes'. Original error: ${error.message}`);
                          }
                        
                          throw error;
                      }
                      console.log('✅ Recipe created in Supabase:', insertData);
                      return insertData;
                  }
                
              } catch (error) {
                  console.error('❌ Failed to save recipe to database:', error);
                  return { fallback: true, error: error.message };
              }
          }

          async function loadCustomRecipes() {
              if (!window.supabaseClient && !window.apiCall) {
                  console.log('ℹ️ No database connection available, using localStorage for recipes');
                  const stored = localStorage.getItem('customRecipes');
                  return stored ? JSON.parse(stored) : [];
              }

              console.log('📡 Loading custom recipes from database...');
            
              try {
                  // Get user context for new schema
                  const userContext = await getCurrentUserContext();
                
                  // Try Supabase first (NEW SCHEMA)
                  if (window.supabaseClient && userContext) {
                      console.log('📡 Using Supabase with secure authentication...');
                    
                      const { data, error } = await window.supabaseClient
                          .from('custom_recipes')
                          .select('*')
                          .eq('user_id', userContext.user_id)
                          .order('created_at', { ascending: false });

                      if (error) {
                          console.warn('⚠️ Supabase custom recipes load error:', error.message);
                          throw error; // Fall through to RESTful API or legacy
                      }

                      if (data && data.length > 0) {
                          console.log(`✅ Loaded ${data.length} custom recipes from Supabase (NEW SCHEMA)`);
                          return data.map(recipe => ({
                              id: recipe.recipe_uuid, // Use UUID instead of integer ID
                              name: recipe.recipe_name,
                              category: recipe.category,
                              calories: recipe.calories,
                              protein: recipe.protein,
                              carbs: recipe.carbs,
                              fat: recipe.fat,
                              servings: recipe.servings,
                              ingredients: recipe.ingredients || [], // JSONB field - no parsing needed
                              instructions: recipe.instructions,
                              source: 'custom'
                          }));
                      }
                  }

                  // Legacy Supabase fallback (OLD SCHEMA) 
                  if (window.supabaseClient) {
                      const { data: { user } } = await window.supabaseClient.auth.getUser();
                      if (user) {
                          const lookupEmail = user.email || `anon_${user.id}`;
                          console.log('📡 Attempting legacy Supabase schema...');
                        
                          const { data, error } = await window.supabaseClient
                              .from('custom_recipes')
                              .select('*')
                              .eq('user_email', lookupEmail)
                              .order('created_at', { ascending: false });

                          if (!error && data && data.length > 0) {
                              console.log(`✅ Loaded ${data.length} custom recipes from Supabase (LEGACY SCHEMA)`);
                              return data.map(recipe => ({
                                  id: parseInt(recipe.recipe_id) || Date.now(),
                                  name: recipe.recipe_name,
                                  category: recipe.category,
                                  calories: recipe.calories,
                                  protein: recipe.protein,
                                  carbs: recipe.carbs,
                                  fat: recipe.fat,
                                  servings: recipe.servings,
                                  ingredients: JSON.parse(recipe.ingredients || '[]'),
                                  instructions: recipe.instructions,
                                  source: 'custom'
                              }));
                          }
                      }
                  }

                  // Fallback to RESTful API
                  if (window.apiCall) {
                      console.log('📡 Using RESTful API for recipe load...');
                      const userEmail = getCurrentUserEmail();
                      // Use direct Supabase query to avoid PGRST100 errors
                      console.log('🔍 Loading custom recipes with safe query for:', userEmail);
                      const { data: responseData, error: responseError } = await window.supabaseClient
                          .from('custom_recipes')
                          .select('*')
                          .eq('user_email', userEmail);
                      if (responseError) throw responseError;
                    
                      const response = { data: responseData };
                    
                      if (response.data && response.data.length > 0) {
                          console.log(`✅ Loaded ${response.data.length} custom recipes from RESTful API`);
                          return response.data.map(recipe => ({
                              id: parseInt(recipe.recipe_id) || Date.now(),
                              name: recipe.recipe_name,
                              category: recipe.category,
                              calories: recipe.calories,
                              protein: recipe.protein,
                              carbs: recipe.carbs,
                              fat: recipe.fat,
                              servings: recipe.servings,
                              ingredients: JSON.parse(recipe.ingredients || '[]'),
                              instructions: recipe.instructions,
                              source: 'custom'
                          }));
                      }
                  }
                
                  return [];
                
              } catch (error) {
                  console.error('❌ Failed to load custom recipes from database:', error);
                
                  // Final fallback to localStorage
                  console.log('📱 Falling back to localStorage...');
                  const stored = localStorage.getItem('customRecipes');
                  return stored ? JSON.parse(stored) : [];
              }
          }

          async function deleteCustomRecipeFromDB(recipeId) {
              if (!window.supabaseClient && !window.apiCall) {
                  console.log('ℹ️ No database connection available for recipe delete');
                  return { fallback: true };
              }

              console.log('🗑️ Deleting custom recipe from database...');
            
              try {
                  // Get user context for new schema
                  const userContext = await getCurrentUserContext();
                
                  // Try Supabase first (NEW SCHEMA)
                  if (window.supabaseClient && userContext) {
                      console.log('🗑️ Using Supabase with secure authentication...');
                    
                      // Delete using user_id and recipe_uuid for new schema
                      const { data, error } = await window.supabaseClient
                          .from('custom_recipes')
                          .delete()
                          .eq('user_id', userContext.user_id)
                          .eq('recipe_uuid', recipeId) // recipeId is already UUID for new schema
                          .select();

                      if (error) {
                          console.warn('⚠️ Supabase recipe delete failed (new schema):', error.message);
                          throw error; // Fall through to legacy method
                      }
                    
                      if (data && data.length > 0) {
                          console.log('✅ Recipe deleted from Supabase (NEW SCHEMA):', data);
                          return { success: true };
                      } else {
                          console.log('ℹ️ Recipe not found in Supabase (new schema)');
                          // Try legacy schema before giving up
                      }
                  }

                  // Legacy Supabase fallback (OLD SCHEMA)
                  if (window.supabaseClient) {
                      const { data: { user } } = await window.supabaseClient.auth.getUser();
                      if (user) {
                          const lookupEmail = user.email || `anon_${user.id}`;
                          console.log('🗑️ Attempting legacy Supabase schema...');
                        
                          // Delete the recipe using email and recipe_id (legacy)
                          const { data, error } = await window.supabaseClient
                              .from('custom_recipes')
                              .delete()
                              .eq('user_email', lookupEmail)
                              .eq('recipe_id', recipeId.toString())
                              .select();

                          if (!error && data && data.length > 0) {
                              console.log('✅ Recipe deleted from Supabase (LEGACY SCHEMA):', data);
                              return { success: true };
                          } else if (!error) {
                              console.log('ℹ️ Recipe not found in Supabase (legacy schema)');
                              return { success: true }; // Consider this success since recipe doesn't exist
                          }
                      }
                  }


   function saveProgressGoalToDB(goal) {
              if (!window.supabaseClient && !window.apiCall) {
                  console.log('ℹ️ No database connection available for progress goal save');
                  return { fallback: true };
              }

              console.log('💾 Saving progress goal to database...');
            
              try {
                  // Get user identifier using authHelper (supports both authenticated users and anonymous profiles)
                  const identifier = await window.authHelper.getCurrentUserIdentifier();
                
                  if (!identifier.user_id && !identifier.anon_profile_id) {
                      throw new Error('No valid user identifier available');
                  }

                  console.log('💾 Using UUID-based authentication with Supabase...', {
                      user_id: identifier.user_id ? 'authenticated' : null,
                      anon_profile_id: identifier.anon_profile_id ? 'anonymous' : null
                  });

                  // Deactivate existing goals for this user
                  const deactivateQuery = window.supabaseClient
                      .from('progress_goals')
                      .update({ is_active: false });

                  if (identifier.user_id) {
                      deactivateQuery.eq('user_id', identifier.user_id);
                  } else if (identifier.anon_profile_id) {
                      deactivateQuery.eq('anon_profile_id', identifier.anon_profile_id);
                  }

                  await deactivateQuery;
                
                  // Create new active goal using authHelper
                  const goalData = await window.authHelper.createInsertPayload({
                      goal_type: 'weight_loss', // Default goal type
                      current_value: goal.currentWeight || 0,
                      target_value: goal.targetWeight,
                      target_date: goal.targetDate,
                      unit: 'kg',
                      is_active: true,
                      notes: goal.notes || ''
                  });

                  const { data: insertData, error } = await window.supabaseClient
                      .from('progress_goals')
                      .insert(goalData)
                      .select();
                
                  if (error) {
                      console.warn('⚠️ Supabase progress goal insert failed:', error.message);
                      throw error;
                  }
                  console.log('✅ Progress goal created in Supabase:', insertData);
                  return insertData;
                
              } catch (error) {
                  console.warn('⚠️ Supabase save failed, trying RESTful API fallback:', error.message);
                
                  // Fallback to RESTful API if Supabase fails
                  if (window.apiCall) {
                      try {
                          console.log('📡 Using RESTful API for progress goal save...');
                        
                          // Check if RESTful API endpoints are available first
                          const apiAvailable = await checkApiEndpoints();
                          if (!apiAvailable) {
                              console.log('⚠️ RESTful API endpoints not available - skipping progress goal RESTful API fallback');
                              return { fallback: true };
                          }
                        
                          // Get user email for RESTful API
                          const userEmail = getCurrentUserEmail();
                        
                          // First, deactivate existing goals
                          try {
                              // Use direct Supabase query to avoid PGRST100 errors
                              console.log('🔍 Loading existing progress goals with safe query for:', userEmail);
                              const { data: existingGoalsData, error: existingGoalsError } = await window.supabaseClient
                                  .from('progress_goals')
                                  .select('*')
                                  .eq('user_email', userEmail);
                              if (existingGoalsError) throw existingGoalsError;
                            
                              const existingGoalsResponse = { data: existingGoalsData };
                              if (existingGoalsResponse.data && existingGoalsResponse.data.length > 0) {
                                  const activeGoals = existingGoalsResponse.data.filter(g => g.is_active);
                                  for (const activeGoal of activeGoals) {
                                      await apiCall(`tables/progress_goals/${activeGoal.id}`, 'PATCH', { is_active: false });
                                  }
                              }
                          } catch (deactivateError) {
                              console.warn('⚠️ Could not deactivate existing goals:', deactivateError.message);
                          }
                        
                          // Prepare data for RESTful API
                          const apiGoalData = {
                              email: userEmail,
                              goal_type: 'weight_loss', // Default goal type
                              current_value: goal.currentWeight || 0,
                              target_value: goal.targetWeight,
                              target_date: goal.targetDate,
                              unit: 'kg',
                              is_active: true,
                              created_date: goal.setDate || new Date().toISOString().split('T')[0],
                              notes: goal.notes || ''
                          };
                        
                          // Create new goal
                          const createResult = await apiCall('tables/progress_goals', 'POST', apiGoalData);
                          console.log('✅ Progress goal created via RESTful API');
                          return createResult;
                        
                      } catch (apiError) {
                          console.error('❌ RESTful API fallback failed:', apiError.message);
                          return { fallback: true, error: `Both Supabase and RESTful API failed: ${error.message}, ${apiError.message}` };
                      }
                  } else {
                      console.error('❌ Failed to save progress goal to database:', error);
                      return { fallback: true, error: error.message };
                  }
              }
          }


   function loadProgressGoalFromDB() {
              if (!window.supabaseClient && !window.apiCall) {
                  return null;
              }

              const userEmail = getCurrentUserEmail();
              console.log('📡 Loading progress goal from database...');
            
              try {
                  // Try Supabase first
                  if (window.supabaseClient) {
                      const { data: { user } } = await window.supabaseClient.auth.getUser();
                      if (!user) {
                          console.log('ℹ️ No authenticated user for progress goal loading');
                          return null;
                      }

                      const lookupEmail = user.email || `anon_${user.id}`;
                    
                      // Use safe query to avoid PGRST100 errors
                      console.log('🔍 Loading progress goals from Supabase for:', lookupEmail);
                      const { data, error } = await window.supabaseClient
                          .from('progress_goals')
                          .select('*')
                          .eq('user_email', lookupEmail)  // Changed from 'email' to 'user_email'
                          .eq('is_active', true)
                          .order('created_at', { ascending: false })
                          .limit(1)
                          .maybeSingle();

                      if (error) {
                          console.warn('⚠️ Supabase progress goal load error:', error.message);
                          throw error; // Fall through to RESTful API
                      }

                      if (data) {
                          console.log('✅ Loaded progress goal from Supabase');
                          return {
                              targetWeight: data.target_value,
                              targetDate: data.target_date,
                              setDate: data.created_at,
                              currentWeight: data.current_value,
                              notes: data.notes
                          };
                      }
                  }

                  // Fallback to RESTful API
                  if (window.apiCall) {
                      try {
                          console.log('📡 Using RESTful API for progress goal load...');
                        
                          // Check if RESTful API endpoints are available first
                          const apiAvailable = await checkApiEndpoints();
                          if (!apiAvailable) {
                              console.log('⚠️ RESTful API endpoints not available - skipping progress goal RESTful API fallback');
                              return null;
                          }
                        
                          // Use direct Supabase query to avoid PGRST100 errors
                          console.log('🔍 Loading progress goals with safe query for:', userEmail);
                          const { data: responseData, error: responseError } = await window.supabaseClient
                              .from('progress_goals')
                              .select('*')
                              .eq('user_email', userEmail);
                          if (responseError) throw responseError;
                        
                          const response = { data: responseData };
                        
                          if (response.data && response.data.length > 0) {
                              const activeGoals = response.data
                                  .filter(goal => goal.is_active)
                                  .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
                            
                              if (activeGoals.length > 0) {
                                  const goal = activeGoals[0];
                                  console.log('✅ Loaded progress goal from RESTful API');
                                  return {
                                      targetWeight: goal.target_value,
                                      targetDate: goal.target_date,
                                      setDate: goal.created_at,
                                      currentWeight: goal.current_value,
                                      notes: goal.notes
                                  };
                              }
                          } else {
                              console.log('📡 No progress goals found in RESTful API');
                          }
                      } catch (apiError) {
                          console.warn('⚠️ RESTful API progress goal load failed:', apiError.message);
                          if (apiError.message && apiError.message.includes('404')) {
                              console.log('📋 Progress goals table not found in RESTful API - this is normal for new users');
                          }
                      }
                  }
                
                  return null;
                
              } catch (error) {
                  console.error('❌ Failed to load progress goal from database:', error);
                  return null;
              }
          }


   function saveMacroHistoryToDB(macroEntry) {
              if (!window.supabaseClient) {
                  console.log('ℹ️ No database connection available for macro history save');
                  return { fallback: true };
              }

              console.log('💾 Saving macro history entry to database...');
            
              try {
                  // Get user identifier using authHelper (supports both authenticated users and anonymous profiles)
                  const identifier = await window.authHelper.getCurrentUserIdentifier();
                
                  if (!identifier.user_id && !identifier.anon_profile_id) {
                      throw new Error('No valid user identifier available');
                  }

                  console.log('💾 Using UUID-based authentication with Supabase...', {
                      user_id: identifier.user_id ? 'authenticated' : null,
                      anon_profile_id: identifier.anon_profile_id ? 'anonymous' : null
                  });

                  // Prepare data using authHelper
                  const macroData = await window.authHelper.createInsertPayload({
                      date: macroEntry.date,
                      calories_consumed: macroEntry.calories,
                      protein_consumed: macroEntry.protein,
                      carbs_consumed: macroEntry.carbs,
                      fat_consumed: macroEntry.fat,
                      calories_goal: macroEntry.caloriesGoal,
                      protein_goal: macroEntry.proteinGoal,
                      carbs_goal: macroEntry.carbsGoal,
                      fat_goal: macroEntry.fatGoal,
                      protein_percent: macroEntry.proteinPercent,
                      carbs_percent: macroEntry.carbsPercent,
                      fat_percent: macroEntry.fatPercent,
                      goals_met: macroEntry.goalsMet
                  });

                  // Use upsert to handle duplicates (update if exists, insert if not)
                  const conflictColumns = identifier.user_id ? 'user_id,date' : 'anon_profile_id,date';
                  const { data: upsertData, error } = await window.supabaseClient
                      .from('macro_history')
                      .upsert(macroData, { 
                          onConflict: conflictColumns,
                          ignoreDuplicates: false 
                      })
                      .select();
                
                  if (error) {
                      console.warn('⚠️ Supabase macro history upsert failed:', error.message);
                      throw error;
                  }
                  console.log('✅ Macro history saved to Supabase:', upsertData);
                  return upsertData;
                
              } catch (error) {
                  console.error('❌ Failed to save macro history to database:', error);
                  return { fallback: true, error: error.message };
              }
          }


   function loadMacroHistoryFromDB() {
              if (!window.supabaseClient && !window.apiCall) {
                  return [];
              }

              const userEmail = getCurrentUserEmail();
              console.log('📡 Loading macro history from database...');
            
              try {
                  // Try Supabase first
                  if (window.supabaseClient) {
                      const { data: { user } } = await window.supabaseClient.auth.getUser();
                      if (!user) {
                          console.log('ℹ️ No authenticated user for macro history loading');
                          return [];
                      }

                      const lookupEmail = user.email || `anon_${user.id}`;
                    
                      const { data, error } = await window.supabaseClient
                          .from('macro_history')
                          .select('*')
                          .eq('user_email', lookupEmail)
                          .order('date', { ascending: false })
                          .limit(30); // Last 30 days

                      if (error) {
                          console.warn('⚠️ Supabase macro history load error:', error.message);
                          throw error; // Fall through to RESTful API
                      }

                      if (data && data.length > 0) {
                          console.log(`✅ Loaded ${data.length} macro history entries from Supabase`);
                          return data.map(entry => ({
                              date: entry.date,
                              calories: entry.calories_consumed,
                              protein: entry.protein_consumed,
                              carbs: entry.carbs_consumed,
                              fat: entry.fat_consumed,
                              caloriesGoal: entry.calories_goal,
                              proteinGoal: entry.protein_goal,
                              carbsGoal: entry.carbs_goal,
                              fatGoal: entry.fat_goal,
                              proteinPercent: entry.protein_percent,
                              carbsPercent: entry.carbs_percent,
                              fatPercent: entry.fat_percent,
                              goalsMet: entry.goals_met
                          }));
                      }
                  }

                  // Fallback to RESTful API
                  if (window.apiCall) {
                      console.log('📡 Using RESTful API for macro history load...');
                    
                      // Check if RESTful API endpoints are available first
                      const apiAvailable = await checkApiEndpoints();
                      if (!apiAvailable) {
                          console.log('⚠️ RESTful API endpoints not available - skipping macro history RESTful API fallback');
                          return [];
                      }
                    
                      // Use direct Supabase query to avoid PGRST100 errors
                      console.log('🔍 Loading macro history with safe query for:', userEmail);
                      let query = window.supabaseClient.from('macro_history').select('*');
                      if (window.SupabaseQueryHelper) {
                          query = window.SupabaseQueryHelper.applySearchFilter(query, userEmail, 'macro_history');
                      } else {
                          query = query.eq('user_email', userEmail);
                      }
                      const { data: responseData, error: responseError } = await query;
                      if (responseError) throw responseError;
                    
                      const response = { data: responseData };
                    
                      if (response.data && response.data.length > 0) {
                          console.log(`✅ Loaded ${response.data.length} macro history entries from RESTful API`);
                          return response.data
                              .map(entry => ({
                                  date: entry.date,
                                  calories: entry.calories_consumed,
                                  protein: entry.protein_consumed,
                                  carbs: entry.carbs_consumed,
                                  fat: entry.fat_consumed,
                                  caloriesGoal: entry.calories_goal,
                                  proteinGoal: entry.protein_goal,
                                  carbsGoal: entry.carbs_goal,
                                  fatGoal: entry.fat_goal,
                                  proteinPercent: entry.protein_percent,
                                  carbsPercent: entry.carbs_percent,
                                  fatPercent: entry.fat_percent,
                                  goalsMet: entry.goals_met
                              }))
                              .sort((a, b) => new Date(b.date) - new Date(a.date))
                              .slice(0, 30);
                      }
                  }
                
                  return [];
                
              } catch (error) {
                  console.error('❌ Failed to load macro history from database:', error);
                  return [];
              }
          }


   function deleteCustomRecipeFromDB(recipeId) {
              if (!window.supabaseClient && !window.apiCall) {
                  console.log('ℹ️ No database connection available for recipe delete');
                  return { fallback: true };
              }

              console.log('🗑️ Deleting custom recipe from database...');
            
              try {
                  // Get user context for new schema
                  const userContext = await getCurrentUserContext();
                
                  // Try Supabase first (NEW SCHEMA)
                  if (window.supabaseClient && userContext) {
                      console.log('🗑️ Using Supabase with secure authentication...');
                    
                      // Delete using user_id and recipe_uuid for new schema
                      const { data, error } = await window.supabaseClient
                          .from('custom_recipes')
                          .delete()
                          .eq('user_id', userContext.user_id)
                          .eq('recipe_uuid', recipeId) // recipeId is already UUID for new schema
                          .select();

                      if (error) {
                          console.warn('⚠️ Supabase recipe delete failed (new schema):', error.message);
                          throw error; // Fall through to legacy method
                      }
                    
                      if (data && data.length > 0) {
                          console.log('✅ Recipe deleted from Supabase (NEW SCHEMA):', data);
                          return { success: true };
                      } else {
                          console.log('ℹ️ Recipe not found in Supabase (new schema)');
                          // Try legacy schema before giving up
                      }
                  }

                  // Legacy Supabase fallback (OLD SCHEMA)
                  if (window.supabaseClient) {
                      const { data: { user } } = await window.supabaseClient.auth.getUser();
                      if (user) {
                          const lookupEmail = user.email || `anon_${user.id}`;
                          console.log('🗑️ Attempting legacy Supabase schema...');
                        
                          // Delete the recipe using email and recipe_id (legacy)
                          const { data, error } = await window.supabaseClient
                              .from('custom_recipes')
                              .delete()
                              .eq('user_email', lookupEmail)
                              .eq('recipe_id', recipeId.toString())
                              .select();

                          if (!error && data && data.length > 0) {
                              console.log('✅ Recipe deleted from Supabase (LEGACY SCHEMA):', data);
                              return { success: true };
                          } else if (!error) {
                              console.log('ℹ️ Recipe not found in Supabase (legacy schema)');
                              return { success: true }; // Consider this success since recipe doesn't exist
                          }
                      }
                  }

                  // Fallback to RESTful API
                  if (window.apiCall) {
                      console.log('📡 Using RESTful API for recipe delete...');
                      const userEmail = getCurrentUserEmail();
                      // Use direct Supabase query to avoid PGRST100 errors
                      console.log('🔍 Loading custom recipes for delete with safe query for:', userEmail);
                      const { data: responseData, error: responseError } = await window.supabaseClient
                          .from('custom_recipes')
                          .select('*')
                          .eq('user_email', userEmail);
                      if (responseError) throw responseError;
                    
                      const response = { data: responseData };
                    
                      if (response.data) {
                          const recipe = response.data.find(r => parseInt(r.recipe_id) === recipeId);
                          if (recipe) {
                              await apiCall(`tables/custom_recipes/${recipe.id}`, 'DELETE');
                              console.log('✅ Recipe deleted via RESTful API');
                          } else {
                              console.log('ℹ️ Recipe not found in RESTful API');
                          }
                      }
                      return { success: true };
                  }
                
              } catch (error) {
                  console.error('❌ Failed to delete recipe from database:', error);
                
                  // Final fallback to RESTful API if Supabase fails
                  if (window.supabaseClient && window.apiCall) {
                      try {
                          console.log('🔄 Falling back to RESTful API...');
                          const userEmail = getCurrentUserEmail();
                          // Use direct Supabase query to avoid PGRST100 errors
                          console.log('🔍 Loading custom recipes with safe query for:', userEmail);
                          const { data: responseData, error: responseError } = await window.supabaseClient
                              .from('custom_recipes')
                              .select('*')
                              .eq('user_email', userEmail);
                          if (responseError) throw responseError;
                        
                          const response = { data: responseData };
                        
                          if (response.data) {
                              const recipe = response.data.find(r => parseInt(r.recipe_id) === recipeId);
                              if (recipe) {
                                  await apiCall(`tables/custom_recipes/${recipe.id}`, 'DELETE');
                                  console.log('✅ Recipe deleted via RESTful API fallback');
                              }
                          }
                          return { success: true };
                      } catch (apiError) {
                          console.error('❌ RESTful API fallback also failed:', apiError);
                      }
                  }
                
                  return { fallback: true, error: error.message };
              }
          }

          // Supabase Authentication Initialization
          async function initAuthentication() {
              console.log('Initializing Supabase Authentication');
            
              // Check for existing session
              try {
                  if (typeof SupabaseAuth !== 'undefined') {
                      const user = await SupabaseAuth.getCurrentUser();
                      if (user) {
                          currentUserEmail = user.email;
                          console.log('User already logged in:', user.email);
                      }
                  } else {
                      console.warn('SupabaseAuth not available - authentication may not be initialized');
                  }
              } catch (authError) {
                  console.warn('Error checking authentication status:', authError.message);
              }
            
              // Continue with existing user setup if we have one
              if (currentUserEmail) {
                
                  // Load user data for already logged-in users
                  setTimeout(() => {
                      loadUserDataAfterAuth();
                  }, 2000);
              }
            
              updateAuthUI();
            
              // Set up auth state listener
              SupabaseAuth.onAuthStateChange((event, session) => {
                  if (event === 'SIGNED_IN' && session?.user) {
                      currentUserEmail = session.user.email;
                      updateAuthUI();
                    
                      setTimeout(() => {
                          loadUserDataAfterAuth();
                        

                      }, 1000);
                    
                      showNotification('success', 'Welcome!', `Hello ${session.user.user_metadata?.name || session.user.email}. Access granted to the application.`);
                  } else if (event === 'SIGNED_OUT') {
                      console.log('User logged out');
                      localStorage.removeItem('authenticated');
                      localStorage.removeItem('user_info');
                      showNotification('info', 'Signed Out', 'You have been logged out. Redirecting to login page...');
                      setTimeout(() => {
                          window.location.href = 'index.html';
                      }, 1500);
                  }
              });
          }
        
          // Legacy authentication code - updated for Supabase
          // This function is no longer called as we're using Supabase now
        
          // Check authentication status and redirect if needed
          async function checkAuthenticationStatus() {
              // Check for Supabase session
              let user = null;
              try {
                  if (typeof SupabaseAuth !== 'undefined') {
                      user = await SupabaseAuth.getCurrentUser();
                  }
              } catch (error) {
                  console.warn('Error getting current user:', error);
              }
            
              // Also check localStorage for fallback authentication
              const isAuthenticated = localStorage.getItem('authenticated') === 'true';
              const storedUserInfo = localStorage.getItem('user_info');
            
              if (!user && !isAuthenticated) {
                  // No authentication found, redirect to login page
                  console.log('User not authenticated - redirecting to login...');
                  window.location.href = 'index.html';
                  return false;
              }
            
              if (user) {
                  console.log('✅ User authenticated via Supabase:', user.email);
              } else if (isAuthenticated) {
                  console.log('✅ User authenticated via localStorage fallback');
              }
            
              return true;
          }
        
          // Update authentication UI and control app access
          async function updateAuthUI() {
              let user = null;
              try {
                  if (typeof SupabaseAuth !== 'undefined') {
                      user = await SupabaseAuth.getCurrentUser();
                  }
              } catch (error) {
                  console.warn('Error getting user in updateAuthUI:', error);
              }
              const appSection = document.getElementById('app-section');
              const authButton = document.getElementById('auth-button');
              const authText = document.getElementById('auth-text');
              const userInfo = document.getElementById('user-info');
              const userName = document.getElementById('user-name');
            
              // Check localStorage authentication first
              const isAuthenticated = localStorage.getItem('authenticated') === 'true';
              const storedUserInfo = localStorage.getItem('user_info');
            
              if (user || (isAuthenticated && storedUserInfo)) {
                  // User is authenticated - show app
                  if (appSection) {
                      appSection.classList.remove('hidden');
                  }
                
                  // Update header auth UI (Desktop)
                  const desktopAuthButton = document.getElementById('desktop-auth-button');
                  const desktopUserInfo = document.getElementById('desktop-user-info');
                  const desktopUserName = document.getElementById('desktop-user-name');

                
                  if (desktopUserInfo) {
                      // Ensure responsive behavior: hidden on mobile, flex on desktop
                      desktopUserInfo.className = 'hidden md:flex items-center space-x-3';
                  }
                  if (desktopUserName) {
                      if (user) {
                          desktopUserName.textContent = user.user_metadata.full_name || user.email;
                      } else if (storedUserInfo) {
                          const parsed = JSON.parse(storedUserInfo);
                          desktopUserName.textContent = parsed.name || parsed.email;
                      }
                  }
                
                  // Update mobile sidebar user info
                  const sidebarUserName = document.getElementById('sidebar-user-name');
                  const sidebarUserEmail = document.getElementById('sidebar-user-email');
                  const sidebarUserSection = document.getElementById('sidebar-user-section');
                
                  if (sidebarUserSection) sidebarUserSection.classList.remove('hidden');
                  if (sidebarUserName && sidebarUserEmail) {
                      if (user) {
                          sidebarUserName.textContent = user.user_metadata.full_name || user.email;
                          sidebarUserEmail.textContent = user.email;
                      } else if (storedUserInfo) {
                          const parsed = JSON.parse(storedUserInfo);
                          sidebarUserName.textContent = parsed.name || parsed.email;
                          sidebarUserEmail.textContent = parsed.email;
                      }
                  }
                
                  // Update footer user name
                  const footerUserName = document.getElementById('footer-user-name');
                  if (footerUserName) {
                      if (user) {
                          footerUserName.textContent = user.user_metadata.full_name || user.email;
                      } else if (storedUserInfo) {
                          const parsed = JSON.parse(storedUserInfo);
                          footerUserName.textContent = parsed.name || parsed.email;
                      }
                  }
                
                  console.log('User authenticated');
              } else {
                  // User not authenticated - redirect to login
                  console.log('User not authenticated - redirecting to login...');
                  window.location.href = 'index.html';
              }
          }
        
          // Handle authentication button click (logout)
          async function handleAuth() {
              // Since this page is for authenticated users, this is a logout action
              showConfirmDialog(
                  'Confirm Logout',
                  'Are you sure you want to log out? You will be redirected to the login page and will need to sign in again to access the application.',
                  async () => {
                      // Clear authentication state
                      localStorage.removeItem('authenticated');
                      localStorage.removeItem('user_info');
                    
                      // Logout from Supabase
                      const result = await SupabaseAuth.signOut();
                      if (!result.success) {
                          console.error('Logout error:', result.error);
                      }
                    
                      // Show notification and redirect
                      showNotification('Signed Out', 'You have been logged out successfully.', 'info');
                    
                      setTimeout(() => {
                          window.location.href = 'index.html';
                      }, 1500);
                  },
                  () => {
                      // User cancelled logout - do nothing
                      console.log('Logout cancelled by user');
                  }
              );
          }

          // ====================================================================
          // NEW DATABASE FUNCTIONS FOR ORGANIZED DATA STORAGE
          // ====================================================================

          // Global flag to disable Supabase table operations if they consistently fail
          let supabaseTablesDisabled = false;

          // Save daily macro targets to dedicated table
          async function saveDailyTargets(targetsData) {
              if (!window.supabaseClient && !window.apiCall) {
                  console.log('ℹ️ No database connection available for daily targets save');
                  return { fallback: true };
              }

              console.log('💾 Saving daily targets to database...');
            
              try {
                  // Get user identifier using authHelper (supports both authenticated users and anonymous profiles)
                  const identifier = await window.authHelper.getCurrentUserIdentifier();
                
                  if (!identifier.user_id && !identifier.anon_profile_id) {
                      throw new Error('No valid user identifier available');
                  }

                  console.log('💾 Using UUID-based authentication with Supabase...', {
                      user_id: identifier.user_id ? 'authenticated' : null,
                      anon_profile_id: identifier.anon_profile_id ? 'anonymous' : null
                  });

                  // Prepare targets data using authHelper
                  const targetsPayload = await window.authHelper.createInsertPayload({
                      daily_calories: targetsData.calories,
                      daily_protein: targetsData.protein,
                      daily_carbs: targetsData.carbs,
                      daily_fat: targetsData.fat
                  });

                  // Use upsert to handle updates/inserts
                  const conflictColumns = identifier.user_id ? 'user_id' : 'anon_profile_id';
                  const { data, error } = await window.supabaseClient
                      .from('daily_targets')
                      .upsert(targetsPayload, { 
                          onConflict: conflictColumns,
                          ignoreDuplicates: false 
                      })
                      .select();
                
                  if (error) {
                      console.warn('⚠️ Daily targets upsert failed:', error.message);
                      throw error;
                  }
                  console.log('✅ Daily targets saved:', data);
                  return { success: true };
                
              } catch (error) {
                  console.warn('⚠️ Supabase save failed, trying RESTful API fallback:', error.message);
                
                  // Fallback to RESTful API if Supabase fails
                  if (window.apiCall) {
                      try {
                          console.log('📡 Using RESTful API for daily targets save...');
                        
                          // Get user email for RESTful API
                          const userEmail = getCurrentUserEmail();
                        
                          // Prepare data for RESTful API
                          const apiTargetsData = {
                              email: userEmail,
                              daily_calories: targetsData.calories,
                              daily_protein: targetsData.protein,
                              daily_carbs: targetsData.carbs,
                              daily_fat: targetsData.fat,
                              unit_system: targetsData.unit_system || 'imperial',
                              goal_type: targetsData.goal_type || 'maintenance',
                              activity_level: targetsData.activity_level || 1.55,
                              updated_at: new Date().toISOString()
                          };
                        
                          // Check if targets exist for this user
                          try {
                              // Use direct Supabase query to avoid PGRST100 errors
                              console.log('🔍 Loading existing daily targets with safe query for:', userEmail);
                              const { data: existingData, error: existingError } = await window.supabaseClient
                                  .from('daily_targets')
                                  .select('*')
                                  .eq('user_email', userEmail);
                              if (existingError) throw existingError;
                            
                              const existingResponse = { data: existingData };
                              const existingTarget = existingResponse.data?.find(t => t.email === userEmail);
                            
                              if (existingTarget) {
                                  // Update existing targets
                                  const updateResult = await apiCall(`tables/daily_targets/${existingTarget.id}`, 'PUT', apiTargetsData);
                                  console.log('✅ Daily targets updated via RESTful API');
                                  return { success: true };
                              } else {
                                  // Create new targets
                                  const createResult = await apiCall('tables/daily_targets', 'POST', apiTargetsData);
                                  console.log('✅ Daily targets created via RESTful API');
                                  return { success: true };
                              }
                          } catch (apiError) {
                              console.warn('⚠️ RESTful API save failed:', apiError.message);
                              return { fallback: true, error: `Both Supabase and RESTful API failed: ${error.message}, ${apiError.message}` };
                          }
                      } catch (apiFallbackError) {
                          console.error('❌ RESTful API fallback failed:', apiFallbackError.message);
                          return { fallback: true, error: `Both Supabase and RESTful API failed: ${error.message}, ${apiFallbackError.message}` };
                      }
                  } else {
                      console.error('Error saving daily targets:', error);
                      return { fallback: true };
                  }
              }
          }

          // Save user preferences to dedicated table
          async function saveUserPreferences(prefsData) {
              if (!window.supabaseClient) {
                  console.log('ℹ️ No database connection available for user preferences save');
                  return { fallback: true };
              }

              console.log('💾 Saving user preferences to database...');
            
              try {
                  // Get user identifier using authHelper (supports both authenticated users and anonymous profiles)
                  const identifier = await window.authHelper.getCurrentUserIdentifier();
                
                  if (!identifier.user_id && !identifier.anon_profile_id) {
                      throw new Error('No valid user identifier available');
                  }

                  console.log('💾 Using UUID-based authentication with Supabase...', {
                      user_id: identifier.user_id ? 'authenticated' : null,
                      anon_profile_id: identifier.anon_profile_id ? 'anonymous' : null
                  });

                  // Prepare preferences data using authHelper
                  const prefsPayload = await window.authHelper.createInsertPayload({
                      unit_system: prefsData.unitSystem || 'imperial',
                      theme: prefsData.theme || 'light',
                      notifications_enabled: prefsData.notifications !== false,
                      show_tutorials: prefsData.showTutorials !== false,
                      custom_preferences: prefsData.custom || {}
                  });

                  // Use upsert to handle updates/inserts
                  const conflictColumns = identifier.user_id ? 'user_id' : 'anon_profile_id';
                  const { data, error } = await window.supabaseClient
                      .from('user_preferences')
                      .upsert(prefsPayload, { 
                          onConflict: conflictColumns,
                          ignoreDuplicates: false 
                      })
                      .select();
                
                  if (error) {
                      console.warn('⚠️ User preferences upsert failed:', error.message);
                      throw error;
                  }
                  console.log('✅ User preferences saved:', data);
                  return { success: true };
                
              } catch (error) {
                  console.error('❌ Supabase user preferences save failed:', error);
                
                  // Try RESTful API fallback
                  try {
                      console.log('🔄 Attempting RESTful API fallback for user preferences...');
                    
                      // Get user identifier using authHelper
                      const identifier = await window.authHelper.getCurrentUserIdentifier();
                    
                      if (!identifier.user_id && !identifier.anon_profile_id) {
                          throw new Error('No valid user identifier available for RESTful API');
                      }
                    
                      // Search for existing user preferences
                      const searchField = identifier.user_id ? 'user_id' : 'anon_profile_id';
                      const searchValue = identifier.user_id || identifier.anon_profile_id;
                    
                      // Use direct Supabase query to avoid PGRST100 errors
                      console.log('🔍 Loading user preferences with safe query for:', searchValue);
                      let query = window.supabaseClient.from('user_preferences').select('*');
                      if (window.SupabaseQueryHelper) {
                          query = window.SupabaseQueryHelper.applySearchFilter(query, searchValue, 'user_preferences');
                      } else {
                          query = query.eq('user_email', searchValue);
                      }
                      const { data: searchData, error: searchError } = await query;
                      const searchResponse = { data: searchData, error: searchError };
                      let existingPrefs = null;
                    
                      if (searchResponse.ok) {
                          const searchResult = await searchResponse.json();
                          existingPrefs = searchResult.data?.find(pref => 
                              pref[searchField] === searchValue
                          );
                      } else {
                          const errorText = await searchResponse.text();
                          console.warn('⚠️ User preferences search failed:', searchResponse.status, errorText.substring(0, 200));
                      }
                    
                      // Prepare preferences payload for RESTful API
                      const prefsPayload = {
                          [searchField]: searchValue,
                          unit_system: prefsData.unitSystem || 'imperial',
                          theme: prefsData.theme || 'light',
                          notifications_enabled: prefsData.notifications !== false,
                          show_tutorials: prefsData.showTutorials !== false,
                          custom_preferences: prefsData.custom || {}
                      };
                    
                      let response;
                      if (existingPrefs) {
                          // Update existing preferences
                          console.log('🔄 Updating existing user preferences via RESTful API...');
                          response = await safeFetch(`tables/user_preferences/${existingPrefs.id}`, {
                              method: 'PUT',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify(prefsPayload)
                          });
                      } else {
                          // Create new preferences
                          console.log('🔄 Creating new user preferences via RESTful API...');
                          response = await safeFetch('tables/user_preferences', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify(prefsPayload)
                          });
                      }
                    
                      if (response.ok) {
                          const result = await response.json();
                          console.log('✅ User preferences saved via RESTful API:', result);
                          return { success: true, restful_api: true };
                      } else {
                          throw new Error(`RESTful API failed with status ${response.status}`);
                      }
                    
                  } catch (restfulError) {
                      console.error('❌ RESTful API fallback also failed:', restfulError);
                      return { fallback: true };
                  }
              }
          }

          // Save macro calculation result to dedicated table
          async function saveMacroCalculation(calculationData) {
              if (!window.supabaseClient) {
                  console.log('ℹ️ No database connection available for macro calculation save');
                  return { fallback: true };
              }

              console.log('💾 Saving macro calculation to database...');
            
              try {
                  // Get user identifier using authHelper (supports both authenticated users and anonymous profiles)
                  const identifier = await window.authHelper.getCurrentUserIdentifier();
                
                  if (!identifier.user_id && !identifier.anon_profile_id) {
                      throw new Error('No valid user identifier available');
                  }

                  console.log('💾 Using UUID-based authentication with Supabase...', {
                      user_id: identifier.user_id ? 'authenticated' : null,
                      anon_profile_id: identifier.anon_profile_id ? 'anonymous' : null
                  });

                  // Convert to metric for consistent storage
                  let weightKg = calculationData.weight;
                  let heightCm = calculationData.height;
                
                  if (calculationData.inputUnitSystem === 'imperial') {
                      weightKg = calculationData.weight * 0.453592; // lbs to kg
                      heightCm = calculationData.height * 2.54; // inches to cm
                  }

                  // Prepare calculation data using authHelper
                  const calculationPayload = await window.authHelper.createInsertPayload({
                      age: calculationData.age,
                      gender: calculationData.gender,
                      weight_kg: weightKg,
                      height_cm: heightCm,
                      activity_level: calculationData.activityLevel,
                      goal_calories: calculationData.goalCalories,
                      bmr: calculationData.bmr,
                      tdee: calculationData.tdee,
                      target_calories: calculationData.targetCalories,
                      target_protein: calculationData.targetProtein,
                      target_carbs: calculationData.targetCarbs,
                      target_fat: calculationData.targetFat,
                      input_unit_system: calculationData.inputUnitSystem || 'imperial'
                  });

                  // Always insert new calculation (for history)
                  const { data, error } = await window.supabaseClient
                      .from('macro_calculations')
                      .insert(calculationPayload)
                      .select();
                
                  if (error) {
                      console.warn('⚠️ Macro calculation save failed:', error.message);
                      throw error;
                  }
                  console.log('✅ Macro calculation saved:', data);
                  return { success: true, data };
                
              } catch (error) {
                  console.error('Error saving macro calculation:', error);
                  return { fallback: true };
              }
          }

          // Load functions for the new tables
          async function loadDailyTargets() {
              if (!window.supabaseClient) {
                  console.log('ℹ️ No database connection available for daily targets load');
                  return null;
              }

              console.log('📊 Loading daily targets from database...');

              try {
                  // Get user identifier using authHelper (supports both authenticated users and anonymous profiles)
                  const identifier = await window.authHelper.getCurrentUserIdentifier();
                
                  if (!identifier.user_id && !identifier.anon_profile_id) {
                      console.log('⚠️ No valid user identifier available for daily targets');
                      return null;
                  }

                  console.log('📊 Using UUID-based authentication with Supabase...', {
                      user_id: identifier.user_id ? 'authenticated' : null,
                      anon_profile_id: identifier.anon_profile_id ? 'anonymous' : null
                  });

                  // First, try to get effective macros (coach-adjusted if available, AI if not)
                  console.log('🎯 Attempting to load effective macros (coach-adjusted or AI)...');
                
                  const { data: effectiveMacros, error: macrosError } = await window.supabaseClient
                      .rpc('get_effective_client_macros', { 
                          p_client_user_id: identifier.user_id,
                          p_client_email: identifier.email,
                          p_client_anon_profile_id: identifier.anon_profile_id
                      });

                  if (!macrosError && effectiveMacros && effectiveMacros.length > 0) {
                      const macroData = effectiveMacros[0];
                      console.log(`✅ Effective macros loaded (source: ${macroData.source}):`, macroData);
                    
                      // Convert to the format expected by the client app
                      return {
                          daily_calories: macroData.calories,
                          daily_protein: macroData.protein,
                          daily_carbs: macroData.carbs,
                          daily_fat: macroData.fat,
                          updated_at: macroData.last_updated,
                          macro_source: macroData.source, // 'coach_adjusted' or 'ai_generated'
                          adjusted_by_coach: macroData.adjusted_by_coach_email,
                          adjustment_reason: macroData.adjustment_reason
                      };
                  }
                
                  console.log('⚠️ Effective macros function failed, falling back to direct daily_targets query...');
                
                  // Fallback to original daily_targets query
                  let query = window.supabaseClient.from('daily_targets').select('*');
                
                  if (identifier.user_id) {
                      query = query.eq('user_id', identifier.user_id);
                  } else {
                      query = query.eq('anon_profile_id', identifier.anon_profile_id);
                  }
                
                  const { data, error } = await query
                      .order('updated_at', { ascending: false })
                      .limit(1)
                      .maybeSingle();

                  if (error) {
                      console.warn('⚠️ Supabase daily targets query failed:', error.message);
                      throw error;
                  }

                  console.log('✅ Daily targets loaded from Supabase (AI only):', data);
                  return data;
                
              } catch (error) {
                  console.error('❌ Supabase daily targets load failed:', error);
                
                  // Try RESTful API fallback
                  try {
                      console.log('🔄 Attempting RESTful API fallback for daily targets...');
                    
                      // Check if RESTful API endpoints are available
                      const apiAvailable = await checkApiEndpoints();
                      if (!apiAvailable) {
                          console.log('⚠️ RESTful API endpoints not available - skipping daily targets fallback');
                          return null;
                      }
                    
                      // Get user identifier using authHelper
                      const identifier = await window.authHelper.getCurrentUserIdentifier();
                    
                      if (!identifier.user_id && !identifier.anon_profile_id) {
                          console.log('⚠️ No valid user identifier available for RESTful API daily targets');
                          return null;
                      }
                    
                      // Search for daily targets
                      const searchField = identifier.user_id ? 'user_id' : 'anon_profile_id';
                      const searchValue = identifier.user_id || identifier.anon_profile_id;
                    
                      // Use direct Supabase query to avoid PGRST100 errors
                      console.log('🔍 Loading daily targets with safe query for:', searchValue);
                      let query = window.supabaseClient.from('daily_targets').select('*');
                      if (window.SupabaseQueryHelper) {
                          query = window.SupabaseQueryHelper.applySearchFilter(query, searchValue, 'daily_targets');
                      } else {
                          query = query.eq('user_email', searchValue);
                      }
                      query = query.order('updated_at', { ascending: false }).limit(1);
                      const { data: responseData, error: responseError } = await query;
                      const response = { ok: !responseError, data: responseData, error: responseError };
                    
                      if (response.ok) {
                          const result = await response.json();
                          const dailyTarget = result.data?.find(target => 
                              target[searchField] === searchValue
                          );
                        
                          console.log('✅ Daily targets loaded via RESTful API:', dailyTarget);
                          return dailyTarget || null;
                      } else {
                          const errorText = await response.text();
                          console.warn('⚠️ RESTful API daily targets query failed:', response.status, errorText.substring(0, 200));
                          return null;
                      }
                    
                  } catch (restfulError) {
                      console.error('❌ RESTful API fallback also failed:', restfulError);
                      return null;
                  }
              }
          }

          async function loadUserPreferences() {
              if (!window.supabaseClient) {
                  console.log('ℹ️ No database connection available for user preferences load');
                  return null;
              }

              console.log('⚙️ Loading user preferences from database...');

              try {
                  // Get user identifier using authHelper (supports both authenticated users and anonymous profiles)
                  const identifier = await window.authHelper.getCurrentUserIdentifier();
                
                  if (!identifier.user_id && !identifier.anon_profile_id) {
                      console.log('⚠️ No valid user identifier available for user preferences');
                      return null;
                  }

                  console.log('⚙️ Using UUID-based authentication with Supabase...', {
                      user_id: identifier.user_id ? 'authenticated' : null,
                      anon_profile_id: identifier.anon_profile_id ? 'anonymous' : null
                  });

                  // Query based on available identifier
                  let query = window.supabaseClient.from('user_preferences').select('*');
                
                  if (identifier.user_id) {
                      query = query.eq('user_id', identifier.user_id);
                  } else {
                      query = query.eq('anon_profile_id', identifier.anon_profile_id);
                  }
                
                  const { data, error } = await query.maybeSingle();

                  if (error) {
                      console.warn('⚠️ Supabase user preferences query failed:', error.message);
                      throw error;
                  }

                  console.log('✅ User preferences loaded from Supabase:', data);
                  return data;
                
              } catch (error) {
                  console.error('❌ Supabase user preferences load failed:', error);
                
                  // Try RESTful API fallback
                  try {
                      console.log('🔄 Attempting RESTful API fallback for user preferences...');
                    
                      // Get user identifier using authHelper
                      const identifier = await window.authHelper.getCurrentUserIdentifier();
                    
                      if (!identifier.user_id && !identifier.anon_profile_id) {
                          console.log('⚠️ No valid user identifier available for RESTful API user preferences');
                          return null;
                      }
                    
                      // Search for user preferences
                      const searchField = identifier.user_id ? 'user_id' : 'anon_profile_id';
                      const searchValue = identifier.user_id || identifier.anon_profile_id;
                    
                      // Use direct Supabase query to avoid PGRST100 errors
                      console.log('🔍 Loading user preferences with safe query for:', searchValue);
                      let query = window.supabaseClient.from('user_preferences').select('*');
                      if (window.SupabaseQueryHelper) {
                          query = window.SupabaseQueryHelper.applySearchFilter(query, searchValue, 'user_preferences');
                      } else {
                          query = query.eq('user_email', searchValue);
                      }
                      query = query.limit(1);
                      const { data: responseData, error: responseError } = await query;
                      const response = { ok: !responseError, data: responseData, error: responseError };
                    
                      if (response.ok) {
                          const result = await response.json();
                          const userPrefs = result.data?.find(pref => 
                              pref[searchField] === searchValue
                          );
                        
                          console.log('✅ User preferences loaded via RESTful API:', userPrefs);
                          return userPrefs || null;
                      } else {
                          const errorText = await response.text();
                          console.warn('⚠️ RESTful API user preferences query failed:', response.status, errorText.substring(0, 200));
                          return null;
                      }
                    
                  } catch (restfulError) {
                      console.error('❌ RESTful API fallback also failed:', restfulError);
                      return null;
                  }
              }
          }

          async function loadMacroCalculationHistory(limit = 10) {
              if (!window.supabaseClient && !window.apiCall) {
                  console.log('ℹ️ No database connection available for calculation history');
                  return [];
              }

              console.log('📊 Loading macro calculation history from database...');

              try {
                  // Get user identifier using authHelper (supports both authenticated users and anonymous profiles)
                  const identifier = await window.authHelper.getCurrentUserIdentifier();
                
                  if (!identifier.user_id && !identifier.anon_profile_id) {
                      console.log('⚠️ No valid user identifier available for calculation history');
                      return [];
                  }

                  console.log('📊 Using UUID-based authentication with Supabase...', {
                      user_id: identifier.user_id ? 'authenticated' : null,
                      anon_profile_id: identifier.anon_profile_id ? 'anonymous' : null
                  });

                  // Query based on available identifier
                  let query = window.supabaseClient.from('macro_calculations').select('*');
                
                  if (identifier.user_id) {
                      query = query.eq('user_id', identifier.user_id);
                  } else {
                      query = query.eq('anon_profile_id', identifier.anon_profile_id);
                  }
                
                  const { data, error } = await query
                      .order('created_at', { ascending: false })
                      .limit(limit);

                  if (error) {
                      console.warn('⚠️ Supabase calculation history query failed:', error.message);
                      throw error;
                  }

                  console.log('✅ Calculation history loaded from Supabase:', data?.length || 0, 'entries');
                  return data || [];
                
              } catch (error) {
                  console.error('❌ Supabase calculation history load failed:', error);
                
                  // Try RESTful API fallback
                  try {
                      console.log('🔄 Attempting RESTful API fallback for calculation history...');
                    
                      // Check if RESTful API endpoints are available
                      const apiAvailable = await checkApiEndpoints();
                      if (!apiAvailable) {
                          console.log('⚠️ RESTful API endpoints not available - skipping calculation history fallback');
                          return [];
                      }
                    
                      const identifier = await window.authHelper.getCurrentUserIdentifier();
                    
                      if (!identifier.user_id && !identifier.anon_profile_id) {
                          console.log('⚠️ No valid user identifier available for RESTful API calculation history');
                          return [];
                      }
                    
                      // Search for calculation history using RESTful API
                      let searchParams = '';
                      if (identifier.user_id) {
                          searchParams = `?user_id=${identifier.user_id}`;
                      } else {
                          searchParams = `?anon_profile_id=${identifier.anon_profile_id}`;
                      }
                    
                      const response = await safeFetch(`tables/macro_calculations${searchParams}&limit=${limit}&sort=created_at`);
                    
                      if (response.status === 404) {
                          console.log('📝 No calculation history found in RESTful API');
                          return [];
                      }
                    
                      if (!response.ok) {
                          const errorText = await response.text();
                          console.warn('⚠️ RESTful API error response:', response.status, errorText.substring(0, 200));
                          throw new Error(`RESTful API error: ${response.status}`);
                      }
                    
                      const result = await response.json();
                      console.log('✅ Calculation history loaded from RESTful API:', result.data?.length || 0, 'entries');
                      return result.data || [];
                    
                  } catch (fallbackError) {
                      console.error('❌ RESTful API calculation history fallback also failed:', fallbackError);
                      return [];
                  }
              }
          }

          // Function to populate personal info form from calculation history
          async function loadAndPopulatePersonalInfo(forceOverride = false) {
              try {
                  console.log('🔄 Loading personal information from calculation history...');
                
                  // Load the most recent calculation
                  const history = await loadMacroCalculationHistory(1);
                
                  if (!history || history.length === 0) {
                      console.log('ℹ️ No calculation history found - form will remain empty');
                      if (forceOverride) {
                          showNotification('No Previous Data', 'No previous calculations found to load', 'info');
                      }
                      return false;
                  }
                
                  const mostRecent = history[0];
                  console.log('📋 Most recent calculation found:', {
                      age: mostRecent.age,
                      gender: mostRecent.gender,
                      date: mostRecent.created_at
                  });
                
                  // Get form fields
                  const ageField = document.getElementById('age');
                  const genderField = document.getElementById('gender');
                  const weightField = document.getElementById('weight');
                  const heightField = document.getElementById('height');
                  const activityField = document.getElementById('activity');
                  const goalField = document.getElementById('goal');
                
                  let fieldsPopulated = 0;
                
                  // Populate fields - either if empty (auto-load) or if forceOverride (manual button)
                  if (ageField && (forceOverride || !ageField.value) && mostRecent.age) {
                      ageField.value = mostRecent.age;
                      fieldsPopulated++;
                  }
                
                  if (genderField && (forceOverride || !genderField.value) && mostRecent.gender) {
                      genderField.value = mostRecent.gender;
                      fieldsPopulated++;
                  }
                
                  if (weightField && (forceOverride || !weightField.value) && mostRecent.weight_kg) {
                      // Convert weight based on current unit system
                      let displayWeight = mostRecent.weight_kg;
                      if (currentUnitSystem === 'imperial') {
                          displayWeight = (mostRecent.weight_kg * 2.20462).toFixed(1); // kg to lbs
                      }
                      weightField.value = displayWeight;
                      fieldsPopulated++;
                  }
                
                  if (heightField && (forceOverride || !heightField.value) && mostRecent.height_cm) {
                      // Convert height based on current unit system
                      let displayHeight = mostRecent.height_cm;
                      if (currentUnitSystem === 'imperial') {
                          displayHeight = (mostRecent.height_cm / 2.54).toFixed(1); // cm to inches
                      }
                      heightField.value = displayHeight;
                      fieldsPopulated++;
                  }
                
                  if (activityField && (forceOverride || !activityField.value) && mostRecent.activity_level) {
                      activityField.value = mostRecent.activity_level;
                      fieldsPopulated++;
                  }
                
                  if (goalField && (forceOverride || !goalField.value) && mostRecent.goal_calories) {
                      goalField.value = mostRecent.goal_calories;
                      fieldsPopulated++;
                  }
                
                  if (fieldsPopulated > 0) {
                      const message = forceOverride ? 
                          `Previous details loaded successfully (${fieldsPopulated} fields filled)` :
                          `Your previous details have been restored (${fieldsPopulated} fields filled)`;
                      console.log('✅ Personal information populated from history:', fieldsPopulated, 'fields filled');
                      showNotification('Personal Info Loaded', message, 'success');
                      return true;
                  } else {
                      if (forceOverride) {
                          showNotification('No Data to Load', 'No new information found to populate', 'info');
                      } else {
                          console.log('ℹ️ Form fields already have values - no auto-population needed');
                      }
                      return false;
                  }
                
              } catch (error) {
                  console.error('❌ Error loading personal information:', error);
                  if (forceOverride) {
                      showNotification('Load Failed', 'Could not load previous details. Please try again.', 'error');
                  }
                  return false;
              }
          }

          // Function to manually load today's meals from database
          async function loadTodayMeals() {
              try {
                  console.log('🔄 Manually loading today\'s meals from database...');
                
                  // Show loading notification
                  showNotification('Loading...', 'Loading your meals from database', 'info');
                
                  // Load today's meals from database
                  const todayMeals = await loadDailyMeals();
                
                  if (!todayMeals || todayMeals.length === 0) {
                      console.log('ℹ️ No meals found in database for today');
                      showNotification('No Meals Found', 'No meals found in database for today', 'info');
                      return false;
                  }
                
                  console.log('✅ Manually loaded meals from database:', todayMeals.length, 'meals');
                
                  // Update meals array
                  meals = todayMeals;
                
                  // Recalculate current intake from loaded meals
                  currentIntake = { protein: 0, carbs: 0, fat: 0 };
                  meals.forEach(meal => {
                      currentIntake.protein += meal.protein || 0;
                      currentIntake.carbs += meal.carbs || 0;
                      currentIntake.fat += meal.fat || 0;
                  });
                
                  // Update all displays
                  updateMealsList();
                  updateProgress();
                  updateMacroCharts();
                  updateCalorieDisplay();
                
                  // Sync to localStorage
                  localStorage.setItem('meals', JSON.stringify(meals));
                  localStorage.setItem('currentIntake', JSON.stringify(currentIntake));
                  localStorage.setItem('lastSaved', new Date().toDateString());
                
                  showNotification('Meals Loaded', `Successfully loaded ${todayMeals.length} meals from database`, 'success');
                  console.log('✅ Meals manually loaded, intake calculated:', currentIntake);
                  return true;
                
              } catch (error) {
                  console.error('❌ Error manually loading meals:', error);
                  showNotification('Load Failed', 'Could not load meals from database. Please try again.', 'error');
                  return false;
              }
          }

          // ====================================================================
          // END NEW DATABASE FUNCTIONS
          // ====================================================================

          // Global error handler for button clicks
          window.addEventListener('error', function(event) {
              if (event.error && event.error.message) {
                  const message = event.error.message;
                  if (message.includes('is not defined') || message.includes('is not a function')) {
                      console.error('⚠️ Button click error:', message);
                      console.error('📍 Error occurred at:', event.filename, 'line', event.lineno);
                    
                      // Show user-friendly notification
                      if (typeof showNotification === 'function') {
                          showNotification('Action Failed', 'This feature is temporarily unavailable. Please try again.', 'warning');
                      }
                  }
              }
          });

          // Function to check and display authentication status
          async function checkAuthStatus() {
              const statusElement = document.getElementById('auth-status');
              const statusText = document.getElementById('auth-status-text');
            
              if (!statusElement || !statusText) return;
            
              statusElement.classList.remove('hidden');
            
              if (window.supabaseClient) {
                  try {
                      const { data: { user }, error } = await window.supabaseClient.auth.getUser();
                    
                      if (user) {
                          if (user.email) {
                              statusText.innerHTML = `<i class="fas fa-check-circle text-green-500 mr-1"></i>Synced with ${user.email}`;
                          } else {
                              statusText.innerHTML = `<i class="fas fa-user-secret text-blue-500 mr-1"></i>Anonymous session - data will sync`;
                          }
                      } else {
                          statusText.innerHTML = `<i class="fas fa-exclamation-triangle text-yellow-500 mr-1"></i>Ready to sync anonymously`;
                      }
                  } catch (error) {
                      statusText.innerHTML = `<i class="fas fa-wifi-slash text-gray-500 mr-1"></i>Offline mode only`;
                  }
              } else {
                  statusText.innerHTML = `<i class="fas fa-wifi-slash text-gray-500 mr-1"></i>Offline mode only`;
              }
          }
        
          // Variable safety checks
          function initializeCriticalVariables() {
              // Ensure critical arrays exist
              if (typeof meals === 'undefined') {
                  window.meals = [];
              }
              if (typeof customRecipes === 'undefined') {
                  window.customRecipes = [];
              }
              if (typeof macroHistory === 'undefined') {
                  window.macroHistory = [];
              }
              if (typeof currentIntake === 'undefined') {
                  window.currentIntake = { protein: 0, carbs: 0, fat: 0 };
              }
              if (typeof dailyTargets === 'undefined') {
                  // Try to load saved targets from localStorage first
                  const savedTargets = localStorage.getItem('dailyTargets');
                  if (savedTargets && savedTargets !== 'null') {
                      try {
                          const parsed = JSON.parse(savedTargets);
                          if (parsed && parsed.calories > 0 && parsed.protein > 0) {
                              window.dailyTargets = parsed;
                              console.log('✅ Daily targets loaded from localStorage during init:', parsed);
                          } else {
                              window.dailyTargets = { calories: 2000, protein: 150, carbs: 250, fat: 67 };
                          }
                      } catch (error) {
                          console.warn('⚠️ Error parsing saved targets during init:', error);
                          window.dailyTargets = { calories: 2000, protein: 150, carbs: 250, fat: 67 };
                      }
                  } else {
                      window.dailyTargets = { calories: 2000, protein: 150, carbs: 250, fat: 67 };
                  }
              }
            
              console.log('✅ Critical variables initialized');
          }

          /**
           * Initialize Enhanced Error Handling for All Database Operations
           * Wraps existing functions with comprehensive error handling
           */
          function initializeEnhancedErrorHandling() {
              console.log('🛡️ Initializing enhanced error handling system...');
            
              try {
                  // Enhanced JSON operations - Replace global JSON methods
                  const originalJSONParse = JSON.parse;
                  const originalJSONStringify = JSON.stringify;
                
                  // Override global JSON methods with safe versions
                  window.JSON.safeParse = window.enhancedDB.enhancedJSONParse;
                  window.JSON.safeStringify = window.enhancedDB.enhancedJSONStringify;
                
                  // Enhanced localStorage operations
                  if (typeof Storage !== 'undefined') {
                      const originalGetItem = localStorage.getItem.bind(localStorage);
                      const originalSetItem = localStorage.setItem.bind(localStorage);
                      const originalRemoveItem = localStorage.removeItem.bind(localStorage);
                    
                      // Override localStorage methods
                      localStorage.safeGetItem = window.enhancedDB.enhancedLocalStorage.getItem;
                      localStorage.safeSetItem = window.enhancedDB.enhancedLocalStorage.setItem;
                      localStorage.safeRemoveItem = window.enhancedDB.enhancedLocalStorage.removeItem;
                  }

                  // Wrap key database functions with enhanced error handling
                  if (typeof saveDailyMeals === 'function') {
                      const originalSaveDailyMeals = saveDailyMeals;
                      window.saveDailyMeals = window.enhancedDB.wrapFunctionWithErrorHandling(
                          originalSaveDailyMeals, 
                          'saveDailyMeals',
                          {
                              critical: false,
                              validateArgs: true,
                              argRules: {
                                  required: true,
                                  type: 'object'
                              }
                          }
                      );
                  }

                  if (typeof saveProgressEntryToDB === 'function') {
                      const originalSaveProgress = saveProgressEntryToDB;
                      window.saveProgressEntryToDB = window.enhancedDB.wrapFunctionWithErrorHandling(
                          originalSaveProgress,
                          'saveProgressEntry',
                          {
                              critical: false,
                              validateArgs: true
                          }
                      );
                  }

                  if (typeof saveCustomRecipeToDB === 'function') {
                      const originalSaveRecipe = saveCustomRecipeToDB;
                      window.saveCustomRecipeToDB = window.enhancedDB.wrapFunctionWithErrorHandling(
                          originalSaveRecipe,
                          'saveCustomRecipe',
                          {
                              critical: false,
                              validateArgs: true
                          }
                      );
                  }

                  if (typeof saveUserPreferences === 'function') {
                      const originalSavePrefs = saveUserPreferences;
                      window.saveUserPreferences = window.enhancedDB.wrapFunctionWithErrorHandling(
                          originalSavePrefs,
                          'saveUserPreferences',
                          {
                              critical: true,
                              validateArgs: true
                          }
                      );
                  }

                  if (typeof saveMacroCalculation === 'function') {
                      const originalSaveMacro = saveMacroCalculation;
                      window.saveMacroCalculation = window.enhancedDB.wrapFunctionWithErrorHandling(
                          originalSaveMacro,
                          'saveMacroCalculation',
                          {
                              critical: false,
                              validateArgs: true
                          }
                      );
                  }

                  // Skip wrapping getCurrentUserIdentifier to avoid circular dependency
                  // This function already has internal enhanced error handling
                  console.log('⚠️ Skipping getCurrentUserIdentifier wrapping to prevent circular dependency');

                  // Enhanced fetch operations for Supabase
                  if (window.supabaseClient) {
                      // Wrap Supabase operations with enhanced error handling
                      const originalFrom = window.supabaseClient.from.bind(window.supabaseClient);
                      window.supabaseClient.enhancedFrom = function(tableName) {
                          const table = originalFrom(tableName);
                        
                          // Wrap common operations
                          const originalSelect = table.select.bind(table);
                          const originalInsert = table.insert.bind(table);
                          const originalUpdate = table.update.bind(table);
                          const originalUpsert = table.upsert.bind(table);
                          const originalDelete = table.delete.bind(table);

                          table.safeSelect = function(...args) {
                              return window.enhancedDB.enhancedSupabaseOperation(
                                  () => originalSelect(...args),
                                  `select from ${tableName}`,
                                  { timeout: 10000 }
                              );
                          };

                          table.safeInsert = function(...args) {
                              return window.enhancedDB.enhancedSupabaseOperation(
                                  () => originalInsert(...args),
                                  `insert into ${tableName}`,
                                  { critical: true, timeout: 15000 }
                              );
                          };

                          table.safeUpdate = function(...args) {
                              return window.enhancedDB.enhancedSupabaseOperation(
                                  () => originalUpdate(...args),
                                  `update ${tableName}`,
                                  { critical: true, timeout: 15000 }
                              );
                          };

                          table.safeUpsert = function(...args) {
                              return window.enhancedDB.enhancedSupabaseOperation(
                                  () => originalUpsert(...args),
                                  `upsert ${tableName}`,
                                  { critical: true, timeout: 15000 }
                              );
                          };

                          table.safeDelete = function(...args) {
                              return window.enhancedDB.enhancedSupabaseOperation(
                                  () => originalDelete(...args),
                                  `delete from ${tableName}`,
                                  { critical: true, timeout: 10000 }
                              );
                          };

                          return table;
                      };
                  }

                  // Global error handling for unhandled promise rejections
                  window.addEventListener('unhandledrejection', function(event) {
                      console.error('🚨 Unhandled Promise Rejection:', event.reason);
                    
                      window.handleError(event.reason, {
                          operation: 'unhandled promise',
                          critical: true,
                          background: false
                      });
                    
                      // Prevent the default browser error handling
                      event.preventDefault();
                  });

                  // Global error handling for uncaught errors
                  window.addEventListener('error', function(event) {
                      console.error('🚨 Uncaught Error:', event.error);
                    
                      window.handleError(event.error, {
                          operation: 'uncaught error',
                          critical: true,
                          background: false,
                          filename: event.filename,
                          lineno: event.lineno,
                          colno: event.colno
                      });
                  });

                  // Enhanced notification system integration
                  if (typeof showCustomNotification === 'function') {
                      const originalNotification = showCustomNotification;
                      window.showCustomNotification = function(message, type, duration) {
                          try {
                              return originalNotification(message, type, duration);
                          } catch (error) {
                              console.error('Notification system failed:', error.message);
                              // Fallback to browser alert for critical messages
                              if (type === 'error') {
                                  alert(message);
                              }
                          }
                      };
                  }

                  // Network status monitoring integration with proper availability checking
                  if (window.initManager) {
                      window.initManager.waitForComponents(['networkMonitor'], (degraded = false) => {
                          if (!degraded && window.networkMonitor && window.networkMonitor.onStatusChange) {
                              window.networkMonitor.onStatusChange((status, isOnline) => {
                                  console.log(`🌐 Network status changed: ${status} (online: ${isOnline})`);
                                
                                  if (isOnline) {
                                      // Trigger queue processing when back online
                                      if (window.dbRecovery) {
                                          window.dbRecovery.forceProcessQueue();
                                      }
                                  }
                              });
                          } else {
                              console.log('📡 Network monitor not available - using basic connectivity detection');
                              // Fallback: Basic online/offline detection
                              window.addEventListener('online', () => {
                                  console.log('🌐 Basic network: Back online');
                                  if (window.dbRecovery) {
                                      window.dbRecovery.forceProcessQueue();
                                  }
                              });
                          }
                      });
                  } else {
                      // Fallback when initialization manager is not available
                      setTimeout(() => {
                          if (window.networkMonitor && window.networkMonitor.onStatusChange) {
                              window.networkMonitor.onStatusChange((status, isOnline) => {
                                  console.log(`🌐 Network status changed: ${status} (online: ${isOnline})`);
                                  if (isOnline && window.dbRecovery) {
                                      window.dbRecovery.forceProcessQueue();
                                  }
                              });
                          }
                      }, 1000);
                  }

                  // Periodic error report
                  setInterval(() => {
                      const errorStats = window.errorReporter.getErrorStats();
                      const performanceStats = window.performanceMonitor.getMetrics();
                    
                      // Only report errors if there are meaningful recent errors (excluding 403s)
                      if (errorStats.recentErrors > 0) {
                          // In development, show all error reports
                          // In production, only show if there are significant errors
                          if (!PRODUCTION_MODE || errorStats.recentErrors > 2) {
                              console.warn('📊 Error Report:', errorStats);
                          }
                      }
                    
                      // Log performance issues
                      Object.entries(performanceStats.averageResponseTimes).forEach(([operation, avgTime]) => {
                          if (avgTime > 3000) { // 3 seconds
                              console.warn(`⚠️ Slow operation detected: ${operation} (avg: ${avgTime.toFixed(0)}ms)`);
                          }
                      });
                  }, 300000); // Every 5 minutes

                  console.log('✅ Enhanced error handling system initialized successfully');
                
                  // Show initialization success
                  if (typeof showCustomNotification === 'function') {
                      showCustomNotification(
                          'Enhanced error handling active - your data is protected',
                          'success',
                          3000
                      );
                  }

              } catch (error) {
                  console.error('❌ Failed to initialize enhanced error handling:', error);
                
                  // Even if enhanced error handling fails, log the error
                  if (window.errorHandler) {
                      window.errorHandler.logError('ERROR_HANDLING_INIT', error, 'critical');
                  }
                
                  // Fallback notification
                  if (typeof showCustomNotification === 'function') {
                      showCustomNotification(
                          'Error handling initialization failed - basic functionality may be limited',
                          'warning',
                          5000
                      );
                  }
              }
          }

          // Initialize app when page loads (Protected main application)
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
          });
        
          // Unit System Variables and Functions
          let currentUnitSystem = 'imperial'; // Default to imperial
        
          // Unit conversion functions
          function lbsToKg(lbs) {
              return lbs * 0.453592;
          }
        
          function kgToLbs(kg) {
              return kg * 2.20462;
          }
        
          function inToCm(inches) {
              return inches * 2.54;
          }
        
          function cmToIn(cm) {
              return cm / 2.54;
          }
        
          function getWeightUnit() {
              return currentUnitSystem === 'imperial' ? 'lbs' : 'kg';
          }
        
          function getHeightUnit() {
              return currentUnitSystem === 'imperial' ? 'inches' : 'cm';
          }
        
          function convertWeight(value, fromSystem, toSystem) {
              if (fromSystem === toSystem) return value;
              if (fromSystem === 'imperial' && toSystem === 'metric') {
                  return lbsToKg(value);
              }
              if (fromSystem === 'metric' && toSystem === 'imperial') {
                  return kgToLbs(value);
              }
              return value;
          }
        
          function convertHeight(value, fromSystem, toSystem) {
              if (fromSystem === toSystem) return value;
              if (fromSystem === 'imperial' && toSystem === 'metric') {
                  return inToCm(value);
              }
              if (fromSystem === 'metric' && toSystem === 'imperial') {
                  return cmToIn(value);
              }
              return value;
          }
        
          function changeUnitSystem() {
              // Check which dropdown was changed
              const desktopSelect = document.getElementById('unitSystem');
              const mobileSelect = document.getElementById('unitSystemMobile');
            
              let newSystem;
              if (event && event.target) {
                  newSystem = event.target.value;
              } else {
                  newSystem = desktopSelect ? desktopSelect.value : 'imperial';
              }
            
              const oldSystem = currentUnitSystem;
            
              if (newSystem === oldSystem) return;
            
              // Sync both dropdowns
              if (desktopSelect) desktopSelect.value = newSystem;
              if (mobileSelect) mobileSelect.value = newSystem;
            
              // Convert existing values
              convertFormValues(oldSystem, newSystem);
            
              // Update current system
              currentUnitSystem = newSystem;
            
              // Update all labels
              updateUnitLabels();
            
              // Save preference
              localStorage.setItem('unitSystem', currentUnitSystem);
            
              // Show notification
              const systemName = newSystem === 'imperial' ? 'Imperial (lbs/inches)' : 'Metric (kg/cm)';
              showNotification('Units Changed', `Switched to ${systemName}`, 'success');
          }
        
          function convertFormValues(fromSystem, toSystem) {
              // Convert Macro Calculator values
              const weightInput = document.getElementById('weight');
              const heightInput = document.getElementById('height');
            
              if (weightInput && weightInput.value) {
                  const currentValue = parseFloat(weightInput.value);
                  const convertedValue = convertWeight(currentValue, fromSystem, toSystem);
                  weightInput.value = convertedValue.toFixed(1);
              }
            
              if (heightInput && heightInput.value) {
                  const currentValue = parseFloat(heightInput.value);
                  const convertedValue = convertHeight(currentValue, fromSystem, toSystem);
                  heightInput.value = convertedValue.toFixed(1);
              }
            
              // Convert Progress Tracker values
              const progressWeight = document.getElementById('progressEntryWeight');
              const progressWaist = document.getElementById('progressEntryWaist');
              const progressChest = document.getElementById('progressEntryChest');
              const progressHips = document.getElementById('progressEntryHips');
              const progressArms = document.getElementById('progressEntryArms');
              const targetWeight = document.getElementById('targetWeight');
            
              if (progressWeight && progressWeight.value) {
                  const currentValue = parseFloat(progressWeight.value);
                  const convertedValue = convertWeight(currentValue, fromSystem, toSystem);
                  progressWeight.value = convertedValue.toFixed(1);
              }
            
              if (targetWeight && targetWeight.value) {
                  const currentValue = parseFloat(targetWeight.value);
                  const convertedValue = convertWeight(currentValue, fromSystem, toSystem);
                  targetWeight.value = convertedValue.toFixed(1);
              }
            
              // Convert body measurements
              const measurementInputs = [progressWaist, progressChest, progressHips, progressArms];
              measurementInputs.forEach(input => {
                  if (input && input.value) {
                      const currentValue = parseFloat(input.value);
                      const convertedValue = convertHeight(currentValue, fromSystem, toSystem);
                      input.value = convertedValue.toFixed(1);
                  }
              });
          }
        
          // Mobile Sidebar Functions
          function toggleSidebar() {
              const sidebar = document.getElementById('sidebar-menu');
              const overlay = document.getElementById('sidebar-overlay');
              const body = document.body;
            
              if (sidebar.classList.contains('sidebar-open')) {
                  closeSidebar();
              } else {
                  openSidebar();
              }
          }
        
          function openSidebar() {
              const sidebar = document.getElementById('sidebar-menu');
              const overlay = document.getElementById('sidebar-overlay');
              const body = document.body;
            
              sidebar.classList.add('sidebar-open');
              overlay.classList.add('sidebar-overlay-visible');
              body.classList.add('sidebar-no-scroll');
            
              // Sync unit system with desktop
              const desktopSelect = document.getElementById('unitSystem');
              const mobileSelect = document.getElementById('mobile-unit-system');
              if (desktopSelect && mobileSelect) {
                  mobileSelect.value = desktopSelect.value;
              }
          }
        
          function closeSidebar() {
              const sidebar = document.getElementById('sidebar-menu');
              const overlay = document.getElementById('sidebar-overlay');
              const body = document.body;
            
              sidebar.classList.remove('sidebar-open');
              overlay.classList.remove('sidebar-overlay-visible');
              body.classList.remove('sidebar-no-scroll');
          }
        
          function changeUnitSystemMobile() {
              // Get the mobile select value and update desktop
              const mobileSelect = document.getElementById('mobile-unit-system');
              const desktopSelect = document.getElementById('unitSystem');
            
              if (mobileSelect && desktopSelect) {
                  desktopSelect.value = mobileSelect.value;
                  // Trigger the existing changeUnitSystem function
                  changeUnitSystem();
              }
          }
        
          function handleAuthMobile() {
              // Close sidebar first, then handle auth
              closeSidebar();
              setTimeout(() => handleAuth(), 300); // Small delay for smooth animation
          }
        
          function updateUnitLabels() {
              const weightUnit = getWeightUnit();
              const heightUnit = getHeightUnit();
            
              // Update Macro Calculator labels
              const weightLabel = document.querySelector('label[for="weight"]');
              const heightLabel = document.querySelector('label[for="height"]');
            
              if (weightLabel) weightLabel.textContent = `Weight (${weightUnit})`;
              if (heightLabel) heightLabel.textContent = `Height (${heightUnit})`;
            
              // Update Progress Tracker labels
              const progressWeightLabel = document.querySelector('label[for="progressEntryWeight"]');
              const progressWaistLabel = document.querySelector('label[for="progressEntryWaist"]');
              const progressChestLabel = document.querySelector('label[for="progressEntryChest"]');
              const progressHipsLabel = document.querySelector('label[for="progressEntryHips"]');
              const progressArmsLabel = document.querySelector('label[for="progressEntryArms"]');
              const targetWeightLabel = document.querySelector('label[for="targetWeight"]');
            
              if (progressWeightLabel) progressWeightLabel.textContent = `Weight (${weightUnit})`;
              if (progressWaistLabel) progressWaistLabel.textContent = `Waist (${heightUnit})`;
              if (progressChestLabel) progressChestLabel.textContent = `Chest (${heightUnit})`;
              if (progressHipsLabel) progressHipsLabel.textContent = `Hips (${heightUnit})`;
              if (progressArmsLabel) progressArmsLabel.textContent = `Arms (${heightUnit})`;
              if (targetWeightLabel) targetWeightLabel.textContent = `Target Weight (${weightUnit})`;
            
              // Update placeholders
              updatePlaceholders();
            
              // Update displayed statistics
              updateDisplayedStats();
            
              // Refresh progress display when units change
              if (typeof refreshProgressDisplay === 'function') {
                  refreshProgressDisplay();
              }
          }
        
          function updatePlaceholders() {
              const weightInput = document.getElementById('weight');
              const heightInput = document.getElementById('height');
              const progressWeight = document.getElementById('progressEntryWeight');
              const progressWaist = document.getElementById('progressEntryWaist');
              const progressChest = document.getElementById('progressEntryChest');
              const progressHips = document.getElementById('progressEntryHips');
              const progressArms = document.getElementById('progressEntryArms');
              const targetWeight = document.getElementById('targetWeight');
            
              if (currentUnitSystem === 'imperial') {
                  if (weightInput) weightInput.placeholder = '152.19';
                  if (heightInput) heightInput.placeholder = '68';
                  if (progressWeight) progressWeight.placeholder = '150.0';
                  if (progressWaist) progressWaist.placeholder = '32.0';
                  if (progressChest) progressChest.placeholder = '38.0';
                  if (progressHips) progressHips.placeholder = '36.0';
                  if (progressArms) progressArms.placeholder = '13.0';
                  if (targetWeight) targetWeight.placeholder = '150';
              } else {
                  if (weightInput) weightInput.placeholder = '69.1';
                  if (heightInput) heightInput.placeholder = '173';
                  if (progressWeight) progressWeight.placeholder = '68.0';
                  if (progressWaist) progressWaist.placeholder = '81.3';
                  if (progressChest) progressChest.placeholder = '96.5';
                  if (progressHips) progressHips.placeholder = '91.4';
                  if (progressArms) progressArms.placeholder = '33.0';
                  if (targetWeight) targetWeight.placeholder = '68';
              }
          }
        
          function updateDisplayedStats() {
              // Update any displayed statistics that show units
              const currentWeightEl = document.getElementById('currentWeight');
              const latestWaistEl = document.getElementById('latestWaist');
              const latestChestEl = document.getElementById('latestChest');
              const latestHipsEl = document.getElementById('latestHips');
              const latestArmsEl = document.getElementById('latestArms');
            
              // Update unit labels in statistics display
              const unitLabels = document.querySelectorAll('.unit-label');
              unitLabels.forEach(label => {
                  if (label.textContent.includes('lbs') || label.textContent.includes('kg')) {
                      label.textContent = getWeightUnit();
                  } else if (label.textContent.includes('inches') || label.textContent.includes('cm')) {
                      label.textContent = getHeightUnit();
                  }
              });
          }
        
          function initializeUnitSystem() {
              // Load saved unit preference
              const savedUnit = localStorage.getItem('unitSystem');
              if (savedUnit) {
                  currentUnitSystem = savedUnit;
                  const desktopSelect = document.getElementById('unitSystem');
                  const mobileSelect = document.getElementById('unitSystemMobile');
                  if (desktopSelect) desktopSelect.value = savedUnit;
                  if (mobileSelect) mobileSelect.value = savedUnit;
              }
            
              // Update labels for current system
              updateUnitLabels();
          }

          // Global variables - Initialize with defaults but check for existing values
          let dailyTargets;
        
          // Initialize dailyTargets with proper fallback logic
          function initializeDailyTargets() {
              if (!dailyTargets) {
                  // Try to load from localStorage first
                  const savedTargets = localStorage.getItem('dailyTargets');
                  if (savedTargets && savedTargets !== 'null') {
                      try {
                          const parsed = JSON.parse(savedTargets);
                          if (parsed && parsed.calories > 0 && parsed.protein > 0) {
                              dailyTargets = parsed;
                              console.log('✅ Daily targets initialized from localStorage:', dailyTargets);
                              return;
                          }
                      } catch (error) {
                          console.warn('⚠️ Error parsing saved targets during initialization:', error);
                      }
                  }
                
                  // Use defaults if no valid saved data
                  dailyTargets = {
                      calories: 2000,
                      protein: 150,
                      carbs: 250,
                      fat: 67
                  };
                  console.log('ℹ️ Daily targets initialized with defaults:', dailyTargets);
              }
          }
        
          // Initialize immediately
          initializeDailyTargets();
        
          // Function to ensure display elements match dailyTargets values
          function ensureDisplaySync() {
              if (document.getElementById('dailyCalories')) {
                  const currentCalories = document.getElementById('dailyCalories').textContent;
                  const currentProtein = document.getElementById('proteinAmount').textContent;
                  const currentCarbs = document.getElementById('carbsAmount').textContent;
                  const currentFat = document.getElementById('fatAmount').textContent;
                
                  // Update if display shows default placeholders or doesn't match current values
                  if (currentCalories === '2,000' || 
                      currentProtein === '150g' || 
                      currentCarbs === '250g' || 
                      currentFat === '67g' ||
                      currentCalories !== dailyTargets.calories.toLocaleString()) {
                    
                      console.log('🔄 Synchronizing display with dailyTargets:', dailyTargets);
                      document.getElementById('dailyCalories').textContent = dailyTargets.calories.toLocaleString();
                      document.getElementById('proteinAmount').textContent = dailyTargets.protein + 'g';
                      document.getElementById('carbsAmount').textContent = dailyTargets.carbs + 'g';
                      document.getElementById('fatAmount').textContent = dailyTargets.fat + 'g';
                  }
              }
          }

          let currentIntake = {
              protein: 0,
              carbs: 0,
              fat: 0
          };

          let meals = [];
          let charts = {};

          // Custom Notification System
          function showNotification(title, message, type = 'success', duration = 4000) {
              const notification = document.createElement('div');
              notification.className = `notification ${type}`;
            
              const icons = {
                  success: 'fas fa-check-circle',
                  warning: 'fas fa-exclamation-triangle',
                  error: 'fas fa-times-circle',
                  info: 'fas fa-info-circle'
              };
            
              notification.innerHTML = `
                  <div class="notification-content">
                      <i class="${icons[type]} notification-icon"></i>
                      <div class="notification-text">
                          <div class="notification-title">${title}</div>
                          <div class="notification-message">${message}</div>
                      </div>
                      <button class="notification-close" onclick="closeNotification(this.parentElement.parentElement)">&times;</button>
                  </div>
              `;
            
              document.body.appendChild(notification);
            
              // Trigger animation with mobile fix
              setTimeout(() => {
                  notification.classList.add('show');
                  notification.style.opacity = '1';
                  notification.style.visibility = 'visible';
              }, 100);
            
              // Auto remove
              setTimeout(() => {
                  closeNotification(notification);
              }, duration);
          }
        
          function closeNotification(notification) {
              notification.classList.remove('show');
              setTimeout(() => {
                  if (notification.parentElement) {
                      notification.parentElement.removeChild(notification);
                  }
              }, 300);
          }
        
          // Custom Confirm Dialog
          function showConfirmDialog(title, message, onConfirm, onCancel = null) {
              const modal = document.createElement('div');
              modal.className = 'custom-modal';
            
              modal.innerHTML = `
                  <div class="custom-modal-content">
                      <div class="modal-icon">
                          <i class="fas fa-question-circle text-yellow-500"></i>
                      </div>
                      <div class="modal-title">${title}</div>
                      <div class="modal-message">${message}</div>
                      <div class="modal-buttons">
                          <button class="modal-btn modal-btn-secondary" onclick="closeModal(this)">Cancel</button>
                          <button class="modal-btn modal-btn-primary" onclick="confirmAction(this)">Confirm</button>
                      </div>
                  </div>
              `;
            
              modal.querySelector('.modal-btn-primary').addEventListener('click', () => {
                  onConfirm();
                  closeModal(modal);
              });
            
              modal.querySelector('.modal-btn-secondary').addEventListener('click', () => {
                  if (onCancel) onCancel();
                  closeModal(modal);
              });
            
              // Close on backdrop click
              modal.addEventListener('click', (e) => {
                  if (e.target === modal) {
                      if (onCancel) onCancel();
                      closeModal(modal);
                  }
              });
            
              document.body.appendChild(modal);
          }
        
          function closeModal(modal) {
              if (typeof modal === 'string' || modal.tagName === 'BUTTON') {
                  modal = modal.closest ? modal.closest('.custom-modal') : document.querySelector('.custom-modal');
              }
              if (modal && modal.parentElement) {
                  modal.parentElement.removeChild(modal);
              }
          }

          // Function to update calorie display with total from all meals
          function updateCalorieDisplay() {
              try {
                  let totalCalories = 0;
                
                  // Calculate total calories from all meals
                  if (meals && meals.length > 0) {
                      totalCalories = meals.reduce((total, meal) => {
                          return total + (parseFloat(meal.calories) || 0);
                      }, 0);
                  }
                
                  // Update the planned calories display
                  const plannedCaloriesElement = document.getElementById('planned-calories');
                  if (plannedCaloriesElement) {
                      plannedCaloriesElement.textContent = Math.round(totalCalories);
                  }
                
                  logger.debug('📊 Updated calorie display:', totalCalories, 'calories from', meals?.length || 0, 'meals');
              } catch (error) {
                  logger.error('❌ Error updating calorie display:', error);
              }
          }

          // Function to refresh all meal-related displays after initialization
          function refreshMealDisplays() {
              try {
                  // Only refresh if we have meals loaded
                  if (meals && meals.length > 0) {
                      console.log('🔄 Refreshing meal displays after initialization...', meals.length, 'meals');
                    
                      // Update meal list
                      updateMealsList();
                    
                      // Update progress bars and charts
                      updateProgress();
                    
                      // Update macro charts
                      updateMacroCharts();
                    
                      // Update calorie display
                      updateCalorieDisplay();
                    
                      console.log('✅ Meal displays refreshed successfully');
                  } else {
                      console.log('ℹ️ No meals to display - skipping meal display refresh');
                  }
              } catch (error) {
                  console.warn('⚠️ Error refreshing meal displays:', error);
              }
          }
        
          // Make functions available globally for button onclick
          window.loadAndPopulatePersonalInfo = loadAndPopulatePersonalInfo;
          window.loadTodayMeals = loadTodayMeals;
        
          window.confirmAction = function(button) {
              // This will be handled by the event listener
          };
        
          window.closeModal = closeModal;

          // Function to test critical button functionality
          function testAllButtons() {
              const criticalFunctions = [
                  'calculateMacros', 'addMeal', 'resetTracker',
                  'exportMealPlanPDF', 'exportMealPlanCSV', 'exportGroceryList',
                  'selectDay', 'copyToTracker', 'clearMealPlan', 'handleAuth',
                  'changeUnitSystem', 'showNotification', 'showConfirmDialog'
              ];
            
              const results = [];
            
              criticalFunctions.forEach(funcName => {
                  if (typeof window[funcName] === 'function') {
                      results.push(`✅ ${funcName}: Available`);
                  } else {
                      results.push(`❌ ${funcName}: Missing`);
                  }
              });
            
              console.log('🧪 Button Function Test Results:');
              results.forEach(result => console.log(result));
            
              return results;
          }
        
          // Make testAllButtons available globally for debugging
          window.testAllButtons = testAllButtons;

          // ====================================================================
          // CUSTOM SECTION FUNCTIONALITY FOR MEAL PLANNER
          // ====================================================================

          // Custom sections state (now supports multiple)
          let customSections = []; // Array to store multiple custom sections
          let customSectionCounter = 0; // Counter for unique IDs

          function toggleAddCustomSection() {
              const config = document.getElementById('customSectionConfig');
              const toggleBtn = document.getElementById('toggleAddCustomBtn');
            
              if (config.classList.contains('hidden')) {
                  config.classList.remove('hidden');
                  config.classList.add('custom-section-transition');
                  toggleBtn.innerHTML = '<i class="fas fa-times mr-1"></i>Cancel';
                  toggleBtn.onclick = cancelAddCustomSection;
                  // Focus on the input
                  document.getElementById('customSectionName').focus();
              } else {
                  cancelAddCustomSection();
              }
          }
        
          function cancelAddCustomSection() {
              const config = document.getElementById('customSectionConfig');
              const toggleBtn = document.getElementById('toggleAddCustomBtn');
              const nameInput = document.getElementById('customSectionName');
            
              config.classList.add('hidden');
              toggleBtn.innerHTML = '<i class="fas fa-plus mr-1"></i>Add';
              toggleBtn.onclick = toggleAddCustomSection;
              nameInput.value = '';
          }

          function createCustomSection() {
              const nameInput = document.getElementById('customSectionName');
              const sectionName = nameInput.value.trim();
            
              if (!sectionName) {
                  showNotification('Invalid Name', 'Please enter a name for your custom section', 'warning');
                  nameInput.focus();
                  return;
              }
            
              // Check if section name already exists
              if (customSections.find(section => section.name.toLowerCase() === sectionName.toLowerCase())) {
                  showNotification('Duplicate Name', 'A section with this name already exists', 'warning');
                  nameInput.focus();
                  return;
              }
            
              // Create new custom section
              customSectionCounter++;
              const sectionId = `custom_${customSectionCounter}`;
              const newSection = {
                  id: sectionId,
                  name: sectionName,
                  meals: {}
              };
            
              customSections.push(newSection);
            
              // Enable custom sections flag
              customSectionEnabled = true;
            
              // Add custom section to meal plan data structure
              Object.keys(mealPlan).forEach(day => {
                  if (!mealPlan[day][sectionId]) {
                      mealPlan[day][sectionId] = [];
                  }
              });
            
              // Create and add the custom section HTML
              createCustomSectionHTML(newSection);
            
              // Reset the form
              cancelAddCustomSection();
            
              // Update display and save
              updateMealPlanDisplay();
              saveMealPlan().catch(error => console.warn('Meal plan save error:', error));
            
              showNotification('Custom Section Created', `"${sectionName}" section has been added to your meal planner!`, 'success');
          }

          function removeCustomSection(sectionId) {
              const section = customSections.find(s => s.id === sectionId);
              if (!section) return;
            
              showConfirmDialog(
                  'Remove Custom Section',
                  `Are you sure you want to remove the "${section.name}" section? All items in this section will be deleted.`,
                  () => {
                      // Remove from customSections array
                      const index = customSections.findIndex(s => s.id === sectionId);
                      if (index > -1) {
                          customSections.splice(index, 1);
                      }
                    
                      // Remove from meal plan data structure
                      Object.keys(mealPlan).forEach(day => {
                          if (mealPlan[day][sectionId]) {
                              delete mealPlan[day][sectionId];
                          }
                      });
                    
                      // Remove the HTML element
                      const sectionElement = document.getElementById(`customSection_${sectionId}`);
                      if (sectionElement) {
                          sectionElement.remove();
                      }
                    
                      // Update custom sections enabled flag
                      customSectionEnabled = customSections.length > 0;
                    
                      // Update display and save
                      updateMealPlanDisplay();
                      saveMealPlan().catch(error => console.warn('Meal plan save error:', error));
                    
                      showNotification('Section Removed', `"${section.name}" section has been removed from your meal planner`, 'success');
                  }
              );
          }
        
          // Create HTML for a custom section
          function createCustomSectionHTML(section) {
              const container = document.getElementById('customSectionsContainer');
            
              const sectionHTML = `
                  <div id="customSection_${section.id}" class="bg-white p-4 rounded-lg border mb-4">
                      <h4 class="font-bold text-blue-600 mb-3">
                          <i class="fas fa-star mr-2"></i><span>${section.name}</span>
                      </h4>
                      <div class="space-y-2 mb-3">
                          <input type="text" id="${section.id}-meal" placeholder="Item name" class="w-full p-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500">
                          <div class="grid grid-cols-2 gap-2">
                              <input type="number" id="${section.id}-calories" placeholder="Calories" class="p-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500" step="1">
                              <input type="number" id="${section.id}-protein" placeholder="Protein (g)" class="p-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500" step="0.1">
                              <input type="number" id="${section.id}-carbs" placeholder="Carbs (g)" class="p-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500" step="0.1">
                              <input type="number" id="${section.id}-fat" placeholder="Fat (g)" class="p-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500" step="0.1">
                          </div>
                      </div>
                      <div class="flex gap-2">
                          <button onclick="addPlannedMeal('${section.id}')" class="flex-1 bg-blue-500 hover:bg-blue-600 text-white py-2 px-3 rounded text-sm font-medium">
                              <i class="fas fa-plus mr-1"></i>Add
                          </button>
                          <button onclick="removeCustomSection('${section.id}')" class="bg-red-500 hover:bg-red-600 text-white py-2 px-3 rounded text-sm font-medium" title="Remove custom section">
                              <i class="fas fa-trash"></i>
                          </button>
                      </div>
                      <div id="${section.id}-list" class="mt-3 space-y-1"></div>
                  </div>
              `;
            
              container.insertAdjacentHTML('beforeend', sectionHTML);
          }

          // ====================================================================
          // END CUSTOM SECTION FUNCTIONALITY
          // ====================================================================

          // Old initialization removed - using new unified initialization below

          function calculateMacros() {
              console.log('Calculating macros...');
            
              const age = parseFloat(document.getElementById('age').value) || 25;
              const gender = document.getElementById('gender').value;
              const weight = parseFloat(document.getElementById('weight').value) || 152.19;
              const height = parseFloat(document.getElementById('height').value) || 66.9291;
              const activity = parseFloat(document.getElementById('activity').value) || 1.55;
              const goal = parseFloat(document.getElementById('goal').value) || -500;

              // Convert to metric for BMR calculation
              let weightKg, heightCm;
              if (currentUnitSystem === 'imperial') {
                  weightKg = weight * 0.453592; // lbs to kg
                  heightCm = height * 2.54; // inches to cm
              } else {
                  weightKg = weight; // already in kg
                  heightCm = height; // already in cm
              }

              // Calculate BMR using Harris-Benedict equation
              let bmr;
              if (gender === 'male') {
                  bmr = 88.362 + (13.397 * weightKg) + (4.799 * heightCm) - (5.677 * age);
              } else {
                  bmr = 447.593 + (9.247 * weightKg) + (3.098 * heightCm) - (4.330 * age);
              }

              // Calculate TDEE and adjust for goal
              const tdee = bmr * activity;
              const dailyCalories = Math.round(tdee + goal);

              // Calculate macros (40% carbs, 30% protein, 30% fat)
              const protein = Math.round((dailyCalories * 0.30) / 4);
              const carbs = Math.round((dailyCalories * 0.40) / 4);
              const fat = Math.round((dailyCalories * 0.30) / 9);

              // Update targets
              dailyTargets = {
                  calories: dailyCalories,
                  protein: protein,
                  carbs: carbs,
                  fat: fat
              };

              // Update display
              document.getElementById('dailyCalories').textContent = dailyCalories.toLocaleString();
              document.getElementById('proteinAmount').textContent = protein + 'g';
              document.getElementById('carbsAmount').textContent = carbs + 'g';
              document.getElementById('fatAmount').textContent = fat + 'g';

              // IMPORTANT: Recalculate currentIntake from existing meals to preserve data
              if (meals && meals.length > 0) {
                  console.log('Preserving existing meal data...');
                  currentIntake = {
                      protein: meals.reduce((sum, meal) => sum + (meal.protein || 0), 0),
                      carbs: meals.reduce((sum, meal) => sum + (meal.carbs || 0), 0),
                      fat: meals.reduce((sum, meal) => sum + (meal.fat || 0), 0)
                  };
                  console.log('Recalculated currentIntake from existing meals:', currentIntake);
              }
            
              // Update progress will handle chart updates based on actual data
              updateProgress();
              updateRecommendations(goal);

              // Save to localStorage (for offline access)
              localStorage.setItem('dailyTargets', JSON.stringify(dailyTargets));
              localStorage.setItem('unitSystem', currentUnitSystem);
            
              // Save to dedicated Supabase tables (with independent error handling)
              const saveOperations = async () => {
                  const results = [];
                
                  try {
                      // Save daily targets
                      const targetsResult = await saveDailyTargets({
                          calories: dailyCalories,
                          protein: protein,
                          carbs: carbs,
                          fat: fat
                      });
                      results.push({ targets: targetsResult });
                  } catch (error) {
                      console.warn('⚠️ Daily targets save failed:', error.message);
                      results.push({ targets: { error: error.message } });
                  }
                
                  try {
                      // Save user preferences
                      const prefsResult = await saveUserPreferences({
                          unitSystem: currentUnitSystem
                      });
                      results.push({ preferences: prefsResult });
                  } catch (error) {
                      console.warn('⚠️ User preferences save failed:', error.message);
                      results.push({ preferences: { error: error.message } });
                  }
                
                  try {
                      // Save calculation result for history
                      const calcResult = await saveMacroCalculation({
                          age: age,
                          gender: gender,
                          weight: weight,
                          height: height,
                          activityLevel: activity,
                          goalCalories: goal,
                          bmr: Math.round(bmr),
                          tdee: Math.round(tdee),
                          targetCalories: dailyCalories,
                          targetProtein: protein,
                          targetCarbs: carbs,
                          targetFat: fat,
                          inputUnitSystem: currentUnitSystem
                      });
                      results.push({ calculation: calcResult });
                  } catch (error) {
                      console.warn('⚠️ Calculation save failed:', error.message);
                      results.push({ calculation: { error: error.message } });
                  }
                
                  console.log('💾 Data save operations completed:', results);
                  setTimeout(checkAuthStatus, 500);
              };
            
              // Execute save operations without blocking the UI
              saveOperations().catch(error => {
                  console.warn('⚠️ Save operations error:', error.message);
                  setTimeout(checkAuthStatus, 500);
              });
            
              // Ensure display remains synchronized after calculation
              ensureDisplaySync();
            
              showNotification('Macros Calculated', `Daily targets: ${dailyCalories} calories, ${protein}g protein, ${carbs}g carbs, ${fat}g fat`, 'success');
          }

          function initializeMacroDoughnutCharts() {
              console.log('Initializing macro doughnut charts...');
            
              // Destroy existing doughnut charts first to prevent canvas conflicts
              if (charts.calories) {
                  charts.calories.destroy();
                  console.log('🗑️ Destroyed existing calories chart');
              }
              if (charts.protein) {
                  charts.protein.destroy();
                  console.log('🗑️ Destroyed existing protein chart');
              }
              if (charts.carbs) {
                  charts.carbs.destroy();
                  console.log('🗑️ Destroyed existing carbs chart');
              }
              if (charts.fat) {
                  charts.fat.destroy();
                  console.log('🗑️ Destroyed existing fat chart');
              }
            
              const chartOptions = {
                  type: 'doughnut',
                  options: {
                      responsive: true,
                      maintainAspectRatio: false,
                      cutout: '70%',
                      plugins: {
                          legend: {
                              display: false
                          }
                      },
                      animation: {
                          animateRotate: true,
                          duration: 1000
                      }
                  }
              };

              try {
                  // Calories chart
                  const caloriesCanvas = document.getElementById('caloriesChart');
                  if (caloriesCanvas) {
                      charts.calories = new Chart(caloriesCanvas, {
                          ...chartOptions,
                          data: {
                              datasets: [{
                                  data: [0, 100],
                                  backgroundColor: ['#3b82f6', '#bfdbfe'],
                                  borderWidth: 0
                              }]
                          }
                      });
                      console.log('Calories chart created');
                  }

                  // Protein chart
                  const proteinCanvas = document.getElementById('proteinChart');
                  if (proteinCanvas) {
                      charts.protein = new Chart(proteinCanvas, {
                          ...chartOptions,
                          data: {
                              datasets: [{
                                  data: [0, 100],
                                  backgroundColor: ['#ef4444', '#fecaca'],
                                  borderWidth: 0
                              }]
                          }
                      });
                      console.log('Protein chart created');
                  }

                  // Carbs chart
                  const carbsCanvas = document.getElementById('carbsChart');
                  if (carbsCanvas) {
                      charts.carbs = new Chart(carbsCanvas, {
                          ...chartOptions,
                          data: {
                              datasets: [{
                                  data: [0, 100],
                                  backgroundColor: ['#22c55e', '#bbf7d0'],
                                  borderWidth: 0
                              }]
                          }
                      });
                      console.log('Carbs chart created');
                  }

                  // Fat chart
                  const fatCanvas = document.getElementById('fatChart');
                  if (fatCanvas) {
                      charts.fat = new Chart(fatCanvas, {
                          ...chartOptions,
                          data: {
                              datasets: [{
                                  data: [0, 100],
                                  backgroundColor: ['#eab308', '#fef3c7'],
                                  borderWidth: 0
                              }]
                          }
                      });
                      console.log('Fat chart created');
                  }
                
              } catch (error) {
                  console.error('Error initializing macro doughnut charts:', error);
              }
          }

          function updateCharts() {
              if (!allChartsInitialized) {
                  console.log('Charts not yet initialized, skipping update');
                  return;
              }
            
              try {
                  // Calculate actual progress based on current intake
                  const caloriesConsumed = meals.reduce((sum, meal) => sum + (meal.calories || 0), 0);
                  const caloriesPercent = dailyTargets.calories > 0 ? Math.min((caloriesConsumed / dailyTargets.calories) * 100, 100) : 0;
                  const proteinPercent = dailyTargets.protein > 0 ? Math.min((currentIntake.protein / dailyTargets.protein) * 100, 100) : 0;
                  const carbsPercent = dailyTargets.carbs > 0 ? Math.min((currentIntake.carbs / dailyTargets.carbs) * 100, 100) : 0;
                  const fatPercent = dailyTargets.fat > 0 ? Math.min((currentIntake.fat / dailyTargets.fat) * 100, 100) : 0;
                
                  // Update calories chart with actual progress
                  if (charts.calories) {
                      charts.calories.data.datasets[0].data = [caloriesPercent, 100 - caloriesPercent];
                      charts.calories.update('none');
                      console.log('Updated calories chart with actual progress:', caloriesPercent + '%');
                  }

                  // Update protein chart with actual progress
                  if (charts.protein) {
                      charts.protein.data.datasets[0].data = [proteinPercent, 100 - proteinPercent];
                      charts.protein.update('none');
                      console.log('Updated protein chart with actual progress:', proteinPercent + '%');
                  }

                  // Update carbs chart with actual progress
                  if (charts.carbs) {
                      charts.carbs.data.datasets[0].data = [carbsPercent, 100 - carbsPercent];
                      charts.carbs.update('none');
                      console.log('Updated carbs chart with actual progress:', carbsPercent + '%');
                  }

                  // Update fat chart with actual progress
                  if (charts.fat) {
                      charts.fat.data.datasets[0].data = [fatPercent, 100 - fatPercent];
                      charts.fat.update('none');
                      console.log('Updated fat chart with actual progress:', fatPercent + '%');
                  }
              } catch (error) {
                  console.error('Error updating doughnut charts:', error);
              }
          }

          function addMeal() {
              const name = document.getElementById('mealName').value.trim();
              const calories = parseFloat(document.getElementById('mealCalories').value) || 0;
              const protein = parseFloat(document.getElementById('mealProtein').value) || 0;
              const carbs = parseFloat(document.getElementById('mealCarbs').value) || 0;
              const fat = parseFloat(document.getElementById('mealFat').value) || 0;

              if (!name) {
                  showNotification('Missing Information', 'Please enter a meal name', 'warning');
                  return;
              }

              const meal = {
                  id: Date.now(),
                  name: name,
                  protein: protein,
                  carbs: carbs,
                  fat: fat,
                  calories: calories || Math.round((protein * 4) + (carbs * 4) + (fat * 9))
              };

              meals.push(meal);
              currentIntake.protein += protein;
              currentIntake.carbs += carbs;
              currentIntake.fat += fat;

              // Clear form
              document.getElementById('mealName').value = '';
              document.getElementById('mealCalories').value = '';
              document.getElementById('mealProtein').value = '';
              document.getElementById('mealCarbs').value = '';
              document.getElementById('mealFat').value = '';

              updateMealsList();
              updateProgress();
              saveData();
              saveDailyMacros().catch(error => console.error('Error saving daily macros:', error)); // Save daily macro progress
            
              showNotification('Meal Added', `${meal.name} has been added to your tracker!`, 'success');
          }

          function deleteMeal(id) {
              const meal = meals.find(m => m.id === id);
              if (meal) {
                  currentIntake.protein -= meal.protein;
                  currentIntake.carbs -= meal.carbs;
                  currentIntake.fat -= meal.fat;
                  meals = meals.filter(m => m.id !== id);
                  updateMealsList();
                  updateProgress();
                  saveData();
                  saveDailyMacros().catch(error => console.error('Error saving daily macros:', error)); // Save daily macro progress
                
                  showNotification('Meal Deleted', 'Meal has been removed from your tracker', 'info');
              }
          }

          function updateMealsList() {
              const mealsList = document.getElementById('mealsList');
              mealsList.innerHTML = '';

              if (meals.length === 0) {
                  mealsList.innerHTML = '<p class="text-gray-500 text-center py-4">No meals logged yet. Add your first meal above!</p>';
                  return;
              }

              meals.forEach(meal => {
                  const mealDiv = document.createElement('div');
                  mealDiv.className = 'meal-item bg-white border border-gray-200 rounded-lg p-4 flex justify-between items-center';
                  mealDiv.innerHTML = `
                      <div>
                          <h4 class="font-medium text-gray-800">${meal.name}</h4>
                          <div class="text-sm text-gray-600 mt-1">
                              <span class="text-red-600">P: ${meal.protein}g</span> |
                              <span class="text-green-600">C: ${meal.carbs}g</span> |
                              <span class="text-yellow-600">F: ${meal.fat}g</span> |
                              <span class="text-blue-600">${meal.calories} cal</span>
                          </div>
                      </div>
                      <button onclick="deleteMeal(${meal.id})" class="text-red-500 hover:text-red-700 p-2">
                          <i class="fas fa-trash"></i>
                      </button>
                  `;
                  mealsList.appendChild(mealDiv);
              });
          }

          function updateProgress() {
              // Calculate current calories from meals
              const currentCalories = meals.reduce((sum, meal) => sum + meal.calories, 0);
            
              // Update progress bars
              const caloriesPercent = Math.min((currentCalories / dailyTargets.calories) * 100, 100);
              const proteinPercent = Math.min((currentIntake.protein / dailyTargets.protein) * 100, 100);
              const carbsPercent = Math.min((currentIntake.carbs / dailyTargets.carbs) * 100, 100);
              const fatPercent = Math.min((currentIntake.fat / dailyTargets.fat) * 100, 100);

              // Calculate overall daily progress (average of all macros)
              const overallProgress = Math.round((caloriesPercent + proteinPercent + carbsPercent + fatPercent) / 4);

              // Update bars
              document.getElementById('caloriesBar').style.width = caloriesPercent + '%';
              document.getElementById('proteinBar').style.width = proteinPercent + '%';
              document.getElementById('carbsBar').style.width = carbsPercent + '%';
              document.getElementById('fatBar').style.width = fatPercent + '%';

              // Update text displays
              document.getElementById('caloriesProgress').textContent = `${Math.round(currentCalories)} / ${dailyTargets.calories}`;
              document.getElementById('proteinProgress').textContent = `${Math.round(currentIntake.protein)}g / ${dailyTargets.protein}g`;
              document.getElementById('carbsProgress').textContent = `${Math.round(currentIntake.carbs)}g / ${dailyTargets.carbs}g`;
              document.getElementById('fatProgress').textContent = `${Math.round(currentIntake.fat)}g / ${dailyTargets.fat}g`;

              // Update daily progress percentage with color coding
              const dailyProgressElement = document.getElementById('dailyProgress');
              dailyProgressElement.textContent = `${overallProgress}%`;
            
              // Color coding for progress
              const progressContainer = dailyProgressElement.parentElement;
              if (overallProgress >= 90) {
                  progressContainer.className = 'bg-green-50 border border-green-200 rounded-full px-4 py-2';
                  dailyProgressElement.className = 'font-bold text-green-700';
              } else if (overallProgress >= 70) {
                  progressContainer.className = 'bg-yellow-50 border border-yellow-200 rounded-full px-4 py-2';
                  dailyProgressElement.className = 'font-bold text-yellow-700';
              } else if (overallProgress >= 50) {
                  progressContainer.className = 'bg-blue-50 border border-blue-200 rounded-full px-4 py-2';
                  dailyProgressElement.className = 'font-bold text-blue-700';
              } else {
                  progressContainer.className = 'bg-red-50 border border-red-200 rounded-full px-4 py-2';
                  dailyProgressElement.className = 'font-bold text-red-700';
              }

              // Update doughnut charts
              if (allChartsInitialized && charts.calories && charts.protein && charts.carbs && charts.fat) {
                  try {
                      // Calculate calories progress
                      const currentCalories = meals.reduce((sum, meal) => sum + meal.calories, 0);
                      const caloriesPercent = Math.min((currentCalories / dailyTargets.calories) * 100, 100);
                    
                      charts.calories.data.datasets[0].data = [caloriesPercent, 100 - caloriesPercent];
                      charts.protein.data.datasets[0].data = [proteinPercent, 100 - proteinPercent];
                      charts.carbs.data.datasets[0].data = [carbsPercent, 100 - carbsPercent];
                      charts.fat.data.datasets[0].data = [fatPercent, 100 - fatPercent];

                      charts.calories.update('none');
                      charts.protein.update('none');
                      charts.carbs.update('none');
                      charts.fat.update('none');
                  } catch (error) {
                      console.error('Error updating progress charts:', error);
                  }
              }
          }

          function resetTracker() {
              showConfirmDialog(
                  'Reset Daily Tracker',
                  'Are you sure you want to reset today\'s tracking? This will clear all logged meals and cannot be undone.',
                  () => {
                      meals = [];
                      currentIntake = { protein: 0, carbs: 0, fat: 0 };
                      updateMealsList();
                      updateProgress();
                      saveData();
                      showNotification('Tracker Reset', 'Daily tracking has been successfully reset', 'success');
                  }
              );
          }

          function updateRecommendations(goal) {
              const recommendations = document.getElementById('recommendations');
              let tips = [];

              if (goal < 0) {
                  tips = [
                      '• Focus on high-protein foods to maintain muscle mass',
                      '• Eat nutrient-dense, low-calorie foods',
                      '• Stay hydrated and consider intermittent fasting',
                      '• Include fiber-rich vegetables for satiety'
                  ];
              } else if (goal > 0) {
                  tips = [
                      '• Eat in a slight caloric surplus for lean gains',
                      '• Time carbs around your workouts',
                      '• Focus on compound exercises and progressive overload',
                      '• Get adequate sleep for muscle recovery'
                  ];
              } else {
                  tips = [
                      '• Maintain balanced macronutrient ratios',
                      '• Focus on whole, unprocessed foods',
                      '• Stay consistent with your eating schedule',
                      '• Monitor body composition over weight'
                  ];
              }

              recommendations.innerHTML = tips.map(tip => `<li>${tip}</li>`).join('');
          }

          function saveData() {
              // Always save to localStorage immediately
              localStorage.setItem('meals', JSON.stringify(meals));
              localStorage.setItem('currentIntake', JSON.stringify(currentIntake));
              localStorage.setItem('lastSaved', new Date().toDateString());
            
              // Try to save to database in background
              setTimeout(async () => {
                  try {
                      console.log('💾 Attempting to save to database...');
                      console.log('📧 Current user email:', getCurrentUserEmail());
                      console.log('🍽️ Meals to save:', meals.length, 'meals');
                    
                      // Save meals to database
                      const mealSaveResult = await saveDailyMeals(meals);
                      console.log('✅ Meals save result:', mealSaveResult);
                    
                      // Save user profile with current targets and settings
                      const userInfo = localStorage.getItem('user_info');
                      const userName = userInfo ? JSON.parse(userInfo).name : '';
                    
                      const profileSaveResult = await saveUserProfile({
                          name: userName,
                          unitSystem: currentUnitSystem,
                          dailyTargets: dailyTargets
                      });
                      console.log('✅ Profile save result:', profileSaveResult);
                    
                      console.log('🎉 Data saved to permanent storage successfully');
                  } catch (error) {
                      console.error('❌ Database save failed:', error);
                      console.log('💽 Data saved locally only:', error.message);
                  }
              }, 100);
          }

          async function loadBasicStoredData() {
              console.log('Loading basic stored data (localStorage only)...');
            
              // Always try localStorage first to ensure app works
              const savedTargets = localStorage.getItem('dailyTargets');
              const savedMeals = localStorage.getItem('meals');
              const savedIntake = localStorage.getItem('currentIntake');
              const lastSaved = localStorage.getItem('lastSaved');

              // Reset if it's a new day
              const today = new Date().toDateString();
              console.log('📅 Day check:', { lastSaved, today, isNewDay: lastSaved && lastSaved !== today });
            
              if (lastSaved && lastSaved !== today) {
                  console.log('🗑️ New day detected - clearing yesterday\'s meal data');
                  localStorage.removeItem('meals');
                  localStorage.removeItem('currentIntake');
                  console.log('✅ Cleared old day data from localStorage');
              } else {
                  console.log('📱 Same day or no previous date - loading existing meal data');
                  if (savedTargets) {
                      dailyTargets = JSON.parse(savedTargets);
                      const caloriesEl = document.getElementById('dailyCalories');
                      const proteinEl = document.getElementById('proteinAmount');
                      const carbsEl = document.getElementById('carbsAmount');
                      const fatEl = document.getElementById('fatAmount');
                    
                      if (caloriesEl) caloriesEl.textContent = dailyTargets.calories.toLocaleString();
                      if (proteinEl) proteinEl.textContent = dailyTargets.protein + 'g';
                      if (carbsEl) carbsEl.textContent = dailyTargets.carbs + 'g';
                      if (fatEl) fatEl.textContent = dailyTargets.fat + 'g';
                    
                      console.log('Loaded daily targets from localStorage:', dailyTargets);
                  }

                  if (savedMeals) {
                      meals = JSON.parse(savedMeals);
                      console.log('Loaded meals from localStorage:', meals.length, 'meals');
                    
                      // Recalculate current intake from loaded meals (in case localStorage is out of sync)
                      currentIntake = { protein: 0, carbs: 0, fat: 0 };
                      meals.forEach(meal => {
                          currentIntake.protein += meal.protein || 0;
                          currentIntake.carbs += meal.carbs || 0;
                          currentIntake.fat += meal.fat || 0;
                      });
                    
                      // Update all displays
                      updateMealsList();
                      console.log('Recalculated current intake from meals:', currentIntake);
                  } else if (savedIntake) {
                      currentIntake = JSON.parse(savedIntake);
                      console.log('Loaded current intake from localStorage:', currentIntake);
                  } else {
                      // Initialize empty intake if nothing saved
                      currentIntake = { protein: 0, carbs: 0, fat: 0 };
                  }
              }
            
              console.log('Basic data loading complete - database loading will happen after authentication');
          }

          async function loadStoredData() {
              console.log('Loading stored data...');
            
              // Always try localStorage first to ensure app works
              const savedTargets = localStorage.getItem('dailyTargets');
              const savedMeals = localStorage.getItem('meals');
              const savedIntake = localStorage.getItem('currentIntake');
              const lastSaved = localStorage.getItem('lastSaved');

              // Reset if it's a new day
              const today = new Date().toDateString();
              if (lastSaved && lastSaved !== today) {
                  localStorage.removeItem('meals');
                  localStorage.removeItem('currentIntake');
              } else {
                  if (savedTargets) {
                      dailyTargets = JSON.parse(savedTargets);
                      const caloriesEl = document.getElementById('dailyCalories');
                      const proteinEl = document.getElementById('proteinAmount');
                      const carbsEl = document.getElementById('carbsAmount');
                      const fatEl = document.getElementById('fatAmount');
                    
                      if (caloriesEl) caloriesEl.textContent = dailyTargets.calories.toLocaleString();
                      if (proteinEl) proteinEl.textContent = dailyTargets.protein + 'g';
                      if (carbsEl) carbsEl.textContent = dailyTargets.carbs + 'g';
                      if (fatEl) fatEl.textContent = dailyTargets.fat + 'g';
                  }

                  if (savedMeals) {
                      meals = JSON.parse(savedMeals);
                      updateMealsList();
                  }

                  if (savedIntake) {
                      currentIntake = JSON.parse(savedIntake);
                  }
              }
            
              // Try to load from database in background (non-blocking)
              setTimeout(async () => {
                  try {
                      console.log('Attempting to load from permanent storage...');
                    
                      // Load user profile (targets and settings) 
                      const profile = await loadUserProfile();
                      if (profile) {
                          console.log('Profile loaded from database');
                        
                          // Update daily targets if available
                          if (profile.dailyTargets && Object.keys(profile.dailyTargets).length > 0) {
                              dailyTargets = profile.dailyTargets;
                              const caloriesEl = document.getElementById('dailyCalories');
                              const proteinEl = document.getElementById('proteinAmount');
                              const carbsEl = document.getElementById('carbsAmount');
                              const fatEl = document.getElementById('fatAmount');
                            
                              if (caloriesEl) caloriesEl.textContent = dailyTargets.calories.toLocaleString();
                              if (proteinEl) proteinEl.textContent = dailyTargets.protein + 'g';
                              if (carbsEl) carbsEl.textContent = dailyTargets.carbs + 'g';
                              if (fatEl) fatEl.textContent = dailyTargets.fat + 'g';
                          }
                        
                          // Update unit system
                          if (profile.unitSystem) {
                              currentUnitSystem = profile.unitSystem;
                              const desktopSelect = document.getElementById('unitSystem');
                              const mobileSelect = document.getElementById('unitSystemMobile');
                              if (desktopSelect) desktopSelect.value = profile.unitSystem;
                              if (mobileSelect) mobileSelect.value = profile.unitSystem;
                              updateUnitLabels();
                          }
                        
                          console.log('Database connected - data is permanently stored and synced');
                      }
                    
                      // Load today's meals
                      const todayMeals = await loadDailyMeals();
                      if (todayMeals && todayMeals.length > 0) {
                          meals = todayMeals;
                        
                          // Recalculate current intake
                          currentIntake = { protein: 0, carbs: 0, fat: 0 };
                          meals.forEach(meal => {
                              currentIntake.protein += meal.protein || 0;
                              currentIntake.carbs += meal.carbs || 0;
                              currentIntake.fat += meal.fat || 0;
                          });
                        
                          updateMealsList();
                          updateProgress();
                      }
                    
                      // Load custom recipes
                      const customRecipesFromDB = await loadCustomRecipes();
                      if (customRecipesFromDB && customRecipesFromDB.length > 0) {
                          customRecipes = customRecipesFromDB;
                          displayRecipes();
                      }
                    
                  } catch (error) {
                      console.log('Database not available, using localStorage only:', error.message);
                      // App continues to work with localStorage
                  }
              }, 1000); // Delay to ensure UI is ready
            
              // Load meal plan data
              loadMealPlan().catch(error => console.warn('Meal plan load error:', error));
          }


   function loadTodayMeals() {
              try {
                  console.log('🔄 Manually loading today\'s meals from database...');
                
                  // Show loading notification
                  showNotification('Loading...', 'Loading your meals from database', 'info');
                
                  // Load today's meals from database
                  const todayMeals = await loadDailyMeals();
                
                  if (!todayMeals || todayMeals.length === 0) {
                      console.log('ℹ️ No meals found in database for today');
                      showNotification('No Meals Found', 'No meals found in database for today', 'info');
                      return false;
                  }
                
                  console.log('✅ Manually loaded meals from database:', todayMeals.length, 'meals');
                
                  // Update meals array
                  meals = todayMeals;
                
                  // Recalculate current intake from loaded meals
                  currentIntake = { protein: 0, carbs: 0, fat: 0 };
                  meals.forEach(meal => {
                      currentIntake.protein += meal.protein || 0;
                      currentIntake.carbs += meal.carbs || 0;
                      currentIntake.fat += meal.fat || 0;
                  });
                
                  // Update all displays
                  updateMealsList();
                  updateProgress();
                  updateMacroCharts();
                  updateCalorieDisplay();
                
                  // Sync to localStorage
                  localStorage.setItem('meals', JSON.stringify(meals));
                  localStorage.setItem('currentIntake', JSON.stringify(currentIntake));
                  localStorage.setItem('lastSaved', new Date().toDateString());
                
                  showNotification('Meals Loaded', `Successfully loaded ${todayMeals.length} meals from database`, 'success');
                  console.log('✅ Meals manually loaded, intake calculated:', currentIntake);
                  return true;
                
              } catch (error) {
                  console.error('❌ Error manually loading meals:', error);
                  showNotification('Load Failed', 'Could not load meals from database. Please try again.', 'error');
                  return false;
              }
          }

          // ====================================================================
          // END NEW DATABASE FUNCTIONS
          // ====================================================================

          // Global error handler for button clicks
          window.addEventListener('error', function(event) {
              if (event.error && event.error.message) {
                  const message = event.error.message;
                  if (message.includes('is not defined') || message.includes('is not a function')) {
                      console.error('⚠️ Button click error:', message);
                      console.error('📍 Error occurred at:', event.filename, 'line', event.lineno);
                    
                      // Show user-friendly notification
                      if (typeof showNotification === 'function') {
                          showNotification('Action Failed', 'This feature is temporarily unavailable. Please try again.', 'warning');
                      }
                  }
              }
          });

          // Function to check and display authentication status
          async function checkAuthStatus() {
              const statusElement = document.getElementById('auth-status');
              const statusText = document.getElementById('auth-status-text');
            
              if (!statusElement || !statusText) return;
            
              statusElement.classList.remove('hidden');
            
              if (window.supabaseClient) {
                  try {
                      const { data: { user }, error } = await window.supabaseClient.auth.getUser();
                    
                      if (user) {
                          if (user.email) {
                              statusText.innerHTML = `<i class="fas fa-check-circle text-green-500 mr-1"></i>Synced with ${user.email}`;
                          } else {
                              statusText.innerHTML = `<i class="fas fa-user-secret text-blue-500 mr-1"></i>Anonymous session - data will sync`;
                          }
                      } else {
                          statusText.innerHTML = `<i class="fas fa-exclamation-triangle text-yellow-500 mr-1"></i>Ready to sync anonymously`;
                      }
                  } catch (error) {
                      statusText.innerHTML = `<i class="fas fa-wifi-slash text-gray-500 mr-1"></i>Offline mode only`;
                  }
              } else {
                  statusText.innerHTML = `<i class="fas fa-wifi-slash text-gray-500 mr-1"></i>Offline mode only`;
              }
          }
        
          // Variable safety checks
          function initializeCriticalVariables() {
              // Ensure critical arrays exist
              if (typeof meals === 'undefined') {
                  window.meals = [];
              }
              if (typeof customRecipes === 'undefined') {
                  window.customRecipes = [];
              }
              if (typeof macroHistory === 'undefined') {
                  window.macroHistory = [];
              }
              if (typeof currentIntake === 'undefined') {
                  window.currentIntake = { protein: 0, carbs: 0, fat: 0 };
              }
              if (typeof dailyTargets === 'undefined') {
                  // Try to load saved targets from localStorage first
                  const savedTargets = localStorage.getItem('dailyTargets');
                  if (savedTargets && savedTargets !== 'null') {
                      try {
                          const parsed = JSON.parse(savedTargets);
                          if (parsed && parsed.calories > 0 && parsed.protein > 0) {
                              window.dailyTargets = parsed;
                              console.log('✅ Daily targets loaded from localStorage during init:', parsed);
                          } else {
                              window.dailyTargets = { calories: 2000, protein: 150, carbs: 250, fat: 67 };
                          }
                      } catch (error) {
                          console.warn('⚠️ Error parsing saved targets during init:', error);
                          window.dailyTargets = { calories: 2000, protein: 150, carbs: 250, fat: 67 };
                      }
                  } else {
                      window.dailyTargets = { calories: 2000, protein: 150, carbs: 250, fat: 67 };
                  }
              }
            
              console.log('✅ Critical variables initialized');
          }

          /**
           * Initialize Enhanced Error Handling for All Database Operations
           * Wraps existing functions with comprehensive error handling
           */
          function initializeEnhancedErrorHandling() {
              console.log('🛡️ Initializing enhanced error handling system...');
            
              try {
                  // Enhanced JSON operations - Replace global JSON methods
                  const originalJSONParse = JSON.parse;
                  const originalJSONStringify = JSON.stringify;
                
                  // Override global JSON methods with safe versions
                  window.JSON.safeParse = window.enhancedDB.enhancedJSONParse;
                  window.JSON.safeStringify = window.enhancedDB.enhancedJSONStringify;
                
                  // Enhanced localStorage operations
                  if (typeof Storage !== 'undefined') {
                      const originalGetItem = localStorage.getItem.bind(localStorage);
                      const originalSetItem = localStorage.setItem.bind(localStorage);
                      const originalRemoveItem = localStorage.removeItem.bind(localStorage);
                    
                      // Override localStorage methods
                      localStorage.safeGetItem = window.enhancedDB.enhancedLocalStorage.getItem;
                      localStorage.safeSetItem = window.enhancedDB.enhancedLocalStorage.setItem;
                      localStorage.safeRemoveItem = window.enhancedDB.enhancedLocalStorage.removeItem;
                  }

                  // Wrap key database functions with enhanced error handling
                  if (typeof saveDailyMeals === 'function') {
                      const originalSaveDailyMeals = saveDailyMeals;
                      window.saveDailyMeals = window.enhancedDB.wrapFunctionWithErrorHandling(
                          originalSaveDailyMeals, 
                          'saveDailyMeals',
                          {
                              critical: false,
                              validateArgs: true,
                              argRules: {
                                  required: true,
                                  type: 'object'
                              }
                          }
                      );
                  }

                  if (typeof saveProgressEntryToDB === 'function') {
                      const originalSaveProgress = saveProgressEntryToDB;
                      window.saveProgressEntryToDB = window.enhancedDB.wrapFunctionWithErrorHandling(
                          originalSaveProgress,
                          'saveProgressEntry',
                          {
                              critical: false,
                              validateArgs: true
                          }
                      );
                  }

                  if (typeof saveCustomRecipeToDB === 'function') {
                      const originalSaveRecipe = saveCustomRecipeToDB;
                      window.saveCustomRecipeToDB = window.enhancedDB.wrapFunctionWithErrorHandling(
                          originalSaveRecipe,
                          'saveCustomRecipe',
                          {
                              critical: false,
                              validateArgs: true
                          }
                      );
                  }

                  if (typeof saveUserPreferences === 'function') {
                      const originalSavePrefs = saveUserPreferences;
                      window.saveUserPreferences = window.enhancedDB.wrapFunctionWithErrorHandling(
                          originalSavePrefs,
                          'saveUserPreferences',
                          {
                              critical: true,
                              validateArgs: true
                          }
                      );
                  }

                  if (typeof saveMacroCalculation === 'function') {
                      const originalSaveMacro = saveMacroCalculation;
                      window.saveMacroCalculation = window.enhancedDB.wrapFunctionWithErrorHandling(
                          originalSaveMacro,
                          'saveMacroCalculation',
                          {
                              critical: false,
                              validateArgs: true
                          }
                      );
                  }

                  // Skip wrapping getCurrentUserIdentifier to avoid circular dependency
                  // This function already has internal enhanced error handling
                  console.log('⚠️ Skipping getCurrentUserIdentifier wrapping to prevent circular dependency');

                  // Enhanced fetch operations for Supabase
                  if (window.supabaseClient) {
                      // Wrap Supabase operations with enhanced error handling
                      const originalFrom = window.supabaseClient.from.bind(window.supabaseClient);
                      window.supabaseClient.enhancedFrom = function(tableName) {
                          const table = originalFrom(tableName);
                        
                          // Wrap common operations
                          const originalSelect = table.select.bind(table);
                          const originalInsert = table.insert.bind(table);
                          const originalUpdate = table.update.bind(table);
                          const originalUpsert = table.upsert.bind(table);
                          const originalDelete = table.delete.bind(table);

                          table.safeSelect = function(...args) {
                              return window.enhancedDB.enhancedSupabaseOperation(
                                  () => originalSelect(...args),
                                  `select from ${tableName}`,
                                  { timeout: 10000 }
                              );
                          };

                          table.safeInsert = function(...args) {
                              return window.enhancedDB.enhancedSupabaseOperation(
                                  () => originalInsert(...args),
                                  `insert into ${tableName}`,
                                  { critical: true, timeout: 15000 }
                              );
                          };

                          table.safeUpdate = function(...args) {
                              return window.enhancedDB.enhancedSupabaseOperation(
                                  () => originalUpdate(...args),
                                  `update ${tableName}`,
                                  { critical: true, timeout: 15000 }
                              );
                          };

                          table.safeUpsert = function(...args) {
                              return window.enhancedDB.enhancedSupabaseOperation(
                                  () => originalUpsert(...args),
                                  `upsert ${tableName}`,
                                  { critical: true, timeout: 15000 }
                              );
                          };

                          table.safeDelete = function(...args) {
                              return window.enhancedDB.enhancedSupabaseOperation(
                                  () => originalDelete(...args),
                                  `delete from ${tableName}`,
                                  { critical: true, timeout: 10000 }
                              );
                          };

                          return table;
                      };
                  }

                  // Global error handling for unhandled promise rejections
                  window.addEventListener('unhandledrejection', function(event) {
                      console.error('🚨 Unhandled Promise Rejection:', event.reason);
                    
                      window.handleError(event.reason, {
                          operation: 'unhandled promise',
                          critical: true,
                          background: false
                      });
                    
                      // Prevent the default browser error handling
                      event.preventDefault();
                  });

                  // Global error handling for uncaught errors
                  window.addEventListener('error', function(event) {
                      console.error('🚨 Uncaught Error:', event.error);
                    
                      window.handleError(event.error, {
                          operation: 'uncaught error',
                          critical: true,
                          background: false,
                          filename: event.filename,
                          lineno: event.lineno,
                          colno: event.colno
                      });
                  });

                  // Enhanced notification system integration
                  if (typeof showCustomNotification === 'function') {
                      const originalNotification = showCustomNotification;
                      window.showCustomNotification = function(message, type, duration) {
                          try {
                              return originalNotification(message, type, duration);
                          } catch (error) {
                              console.error('Notification system failed:', error.message);
                              // Fallback to browser alert for critical messages
                              if (type === 'error') {
                                  alert(message);
                              }
                          }
                      };
                  }

                  // Network status monitoring integration with proper availability checking
                  if (window.initManager) {
                      window.initManager.waitForComponents(['networkMonitor'], (degraded = false) => {
                          if (!degraded && window.networkMonitor && window.networkMonitor.onStatusChange) {
                              window.networkMonitor.onStatusChange((status, isOnline) => {
                                  console.log(`🌐 Network status changed: ${status} (online: ${isOnline})`);
                                
                                  if (isOnline) {
                                      // Trigger queue processing when back online
                                      if (window.dbRecovery) {
                                          window.dbRecovery.forceProcessQueue();
                                      }
                                  }
                              });
                          } else {
                              console.log('📡 Network monitor not available - using basic connectivity detection');
                              // Fallback: Basic online/offline detection
                              window.addEventListener('online', () => {
                                  console.log('🌐 Basic network: Back online');
                                  if (window.dbRecovery) {
                                      window.dbRecovery.forceProcessQueue();
                                  }
                              });
                          }
                      });
                  } else {
                      // Fallback when initialization manager is not available
                      setTimeout(() => {
                          if (window.networkMonitor && window.networkMonitor.onStatusChange) {
                              window.networkMonitor.onStatusChange((status, isOnline) => {
                                  console.log(`🌐 Network status changed: ${status} (online: ${isOnline})`);
                                  if (isOnline && window.dbRecovery) {
                                      window.dbRecovery.forceProcessQueue();
                                  }
                              });
                          }
                      }, 1000);
                  }

                  // Periodic error report
                  setInterval(() => {
                      const errorStats = window.errorReporter.getErrorStats();
                      const performanceStats = window.performanceMonitor.getMetrics();
                    
                      // Only report errors if there are meaningful recent errors (excluding 403s)
                      if (errorStats.recentErrors > 0) {
                          // In development, show all error reports
                          // In production, only show if there are significant errors
                          if (!PRODUCTION_MODE || errorStats.recentErrors > 2) {
                              console.warn('📊 Error Report:', errorStats);
                          }
                      }
                    
                      // Log performance issues
                      Object.entries(performanceStats.averageResponseTimes).forEach(([operation, avgTime]) => {
                          if (avgTime > 3000) { // 3 seconds
                              console.warn(`⚠️ Slow operation detected: ${operation} (avg: ${avgTime.toFixed(0)}ms)`);
                          }
                      });
                  }, 300000); // Every 5 minutes

                  console.log('✅ Enhanced error handling system initialized successfully');
                
                  // Show initialization success
                  if (typeof showCustomNotification === 'function') {
                      showCustomNotification(
                          'Enhanced error handling active - your data is protected',
                          'success',
                          3000
                      );
                  }

              } catch (error) {
                  console.error('❌ Failed to initialize enhanced error handling:', error);
                
                  // Even if enhanced error handling fails, log the error
                  if (window.errorHandler) {
                      window.errorHandler.logError('ERROR_HANDLING_INIT', error, 'critical');
                  }
                
                  // Fallback notification
                  if (typeof showCustomNotification === 'function') {
                      showCustomNotification(
                          'Error handling initialization failed - basic functionality may be limited',
                          'warning',
                          5000
                      );
                  }
              }
          }

          // Initialize app when page loads (Protected main application)
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
          });
        
          // Unit System Variables and Functions
          let currentUnitSystem = 'imperial'; // Default to imperial
        
          // Unit conversion functions
          function lbsToKg(lbs) {
              return lbs * 0.453592;
          }
        
          function kgToLbs(kg) {
              return kg * 2.20462;
          }
        
          function inToCm(inches) {
              return inches * 2.54;
          }
        
          function cmToIn(cm) {
              return cm / 2.54;
          }
        
          function getWeightUnit() {
              return currentUnitSystem === 'imperial' ? 'lbs' : 'kg';
          }
        
          function getHeightUnit() {
              return currentUnitSystem === 'imperial' ? 'inches' : 'cm';
          }
        
          function convertWeight(value, fromSystem, toSystem) {
              if (fromSystem === toSystem) return value;
              if (fromSystem === 'imperial' && toSystem === 'metric') {
                  return lbsToKg(value);
              }
              if (fromSystem === 'metric' && toSystem === 'imperial') {
                  return kgToLbs(value);
              }
              return value;
          }
        
          function convertHeight(value, fromSystem, toSystem) {
              if (fromSystem === toSystem) return value;
              if (fromSystem === 'imperial' && toSystem === 'metric') {
                  return inToCm(value);
              }
              if (fromSystem === 'metric' && toSystem === 'imperial') {
                  return cmToIn(value);
              }
              return value;
          }
        
          function changeUnitSystem() {
              // Check which dropdown was changed
              const desktopSelect = document.getElementById('unitSystem');
              const mobileSelect = document.getElementById('unitSystemMobile');
            
              let newSystem;
              if (event && event.target) {
                  newSystem = event.target.value;
              } else {
                  newSystem = desktopSelect ? desktopSelect.value : 'imperial';
              }
            
              const oldSystem = currentUnitSystem;
            
              if (newSystem === oldSystem) return;
            
              // Sync both dropdowns
              if (desktopSelect) desktopSelect.value = newSystem;
              if (mobileSelect) mobileSelect.value = newSystem;
            
              // Convert existing values
              convertFormValues(oldSystem, newSystem);
            
              // Update current system
              currentUnitSystem = newSystem;
            
              // Update all labels
              updateUnitLabels();
            
              // Save preference
              localStorage.setItem('unitSystem', currentUnitSystem);
            
              // Show notification
              const systemName = newSystem === 'imperial' ? 'Imperial (lbs/inches)' : 'Metric (kg/cm)';
              showNotification('Units Changed', `Switched to ${systemName}`, 'success');
          }
        
          function convertFormValues(fromSystem, toSystem) {
              // Convert Macro Calculator values
              const weightInput = document.getElementById('weight');
              const heightInput = document.getElementById('height');
            
              if (weightInput && weightInput.value) {
                  const currentValue = parseFloat(weightInput.value);
                  const convertedValue = convertWeight(currentValue, fromSystem, toSystem);
                  weightInput.value = convertedValue.toFixed(1);
              }
            
              if (heightInput && heightInput.value) {
                  const currentValue = parseFloat(heightInput.value);
                  const convertedValue = convertHeight(currentValue, fromSystem, toSystem);
                  heightInput.value = convertedValue.toFixed(1);
              }
            
              // Convert Progress Tracker values
              const progressWeight = document.getElementById('progressEntryWeight');
              const progressWaist = document.getElementById('progressEntryWaist');
              const progressChest = document.getElementById('progressEntryChest');
              const progressHips = document.getElementById('progressEntryHips');
              const progressArms = document.getElementById('progressEntryArms');
              const targetWeight = document.getElementById('targetWeight');
            
              if (progressWeight && progressWeight.value) {
                  const currentValue = parseFloat(progressWeight.value);
                  const convertedValue = convertWeight(currentValue, fromSystem, toSystem);
                  progressWeight.value = convertedValue.toFixed(1);
              }
            
              if (targetWeight && targetWeight.value) {
                  const currentValue = parseFloat(targetWeight.value);
                  const convertedValue = convertWeight(currentValue, fromSystem, toSystem);
                  targetWeight.value = convertedValue.toFixed(1);
              }
            
              // Convert body measurements
              const measurementInputs = [progressWaist, progressChest, progressHips, progressArms];
              measurementInputs.forEach(input => {
                  if (input && input.value) {
                      const currentValue = parseFloat(input.value);
                      const convertedValue = convertHeight(currentValue, fromSystem, toSystem);
                      input.value = convertedValue.toFixed(1);
                  }
              });
          }
        
          // Mobile Sidebar Functions
          function toggleSidebar() {
              const sidebar = document.getElementById('sidebar-menu');
              const overlay = document.getElementById('sidebar-overlay');
              const body = document.body;
            
              if (sidebar.classList.contains('sidebar-open')) {
                  closeSidebar();
              } else {
                  openSidebar();
              }
          }
        
          function openSidebar() {
              const sidebar = document.getElementById('sidebar-menu');
              const overlay = document.getElementById('sidebar-overlay');
              const body = document.body;
            
              sidebar.classList.add('sidebar-open');
              overlay.classList.add('sidebar-overlay-visible');
              body.classList.add('sidebar-no-scroll');
            
              // Sync unit system with desktop
              const desktopSelect = document.getElementById('unitSystem');
              const mobileSelect = document.getElementById('mobile-unit-system');
              if (desktopSelect && mobileSelect) {
                  mobileSelect.value = desktopSelect.value;
              }
          }
        
          function closeSidebar() {
              const sidebar = document.getElementById('sidebar-menu');
              const overlay = document.getElementById('sidebar-overlay');
              const body = document.body;
            
              sidebar.classList.remove('sidebar-open');
              overlay.classList.remove('sidebar-overlay-visible');
              body.classList.remove('sidebar-no-scroll');
          }
        
          function changeUnitSystemMobile() {
              // Get the mobile select value and update desktop
              const mobileSelect = document.getElementById('mobile-unit-system');
              const desktopSelect = document.getElementById('unitSystem');
            
              if (mobileSelect && desktopSelect) {
                  desktopSelect.value = mobileSelect.value;
                  // Trigger the existing changeUnitSystem function
                  changeUnitSystem();
              }
          }
        
          function handleAuthMobile() {
              // Close sidebar first, then handle auth
              closeSidebar();
              setTimeout(() => handleAuth(), 300); // Small delay for smooth animation
          }
        
          function updateUnitLabels() {
              const weightUnit = getWeightUnit();
              const heightUnit = getHeightUnit();
            
              // Update Macro Calculator labels
              const weightLabel = document.querySelector('label[for="weight"]');
              const heightLabel = document.querySelector('label[for="height"]');
            
              if (weightLabel) weightLabel.textContent = `Weight (${weightUnit})`;
              if (heightLabel) heightLabel.textContent = `Height (${heightUnit})`;
            
              // Update Progress Tracker labels
              const progressWeightLabel = document.querySelector('label[for="progressEntryWeight"]');
              const progressWaistLabel = document.querySelector('label[for="progressEntryWaist"]');
              const progressChestLabel = document.querySelector('label[for="progressEntryChest"]');
              const progressHipsLabel = document.querySelector('label[for="progressEntryHips"]');
              const progressArmsLabel = document.querySelector('label[for="progressEntryArms"]');
              const targetWeightLabel = document.querySelector('label[for="targetWeight"]');
            
              if (progressWeightLabel) progressWeightLabel.textContent = `Weight (${weightUnit})`;
              if (progressWaistLabel) progressWaistLabel.textContent = `Waist (${heightUnit})`;
              if (progressChestLabel) progressChestLabel.textContent = `Chest (${heightUnit})`;
              if (progressHipsLabel) progressHipsLabel.textContent = `Hips (${heightUnit})`;
              if (progressArmsLabel) progressArmsLabel.textContent = `Arms (${heightUnit})`;
              if (targetWeightLabel) targetWeightLabel.textContent = `Target Weight (${weightUnit})`;
            
              // Update placeholders
              updatePlaceholders();
            
              // Update displayed statistics
              updateDisplayedStats();
            
              // Refresh progress display when units change
              if (typeof refreshProgressDisplay === 'function') {
                  refreshProgressDisplay();
              }
          }
        
          function updatePlaceholders() {
              const weightInput = document.getElementById('weight');
              const heightInput = document.getElementById('height');
              const progressWeight = document.getElementById('progressEntryWeight');
              const progressWaist = document.getElementById('progressEntryWaist');
              const progressChest = document.getElementById('progressEntryChest');
              const progressHips = document.getElementById('progressEntryHips');
              const progressArms = document.getElementById('progressEntryArms');
              const targetWeight = document.getElementById('targetWeight');
            
              if (currentUnitSystem === 'imperial') {
                  if (weightInput) weightInput.placeholder = '152.19';
                  if (heightInput) heightInput.placeholder = '68';
                  if (progressWeight) progressWeight.placeholder = '150.0';
                  if (progressWaist) progressWaist.placeholder = '32.0';
                  if (progressChest) progressChest.placeholder = '38.0';
                  if (progressHips) progressHips.placeholder = '36.0';
                  if (progressArms) progressArms.placeholder = '13.0';
                  if (targetWeight) targetWeight.placeholder = '150';
              } else {
                  if (weightInput) weightInput.placeholder = '69.1';
                  if (heightInput) heightInput.placeholder = '173';
                  if (progressWeight) progressWeight.placeholder = '68.0';
                  if (progressWaist) progressWaist.placeholder = '81.3';
                  if (progressChest) progressChest.placeholder = '96.5';
                  if (progressHips) progressHips.placeholder = '91.4';
                  if (progressArms) progressArms.placeholder = '33.0';
                  if (targetWeight) targetWeight.placeholder = '68';
              }
          }
        
          function updateDisplayedStats() {
              // Update any displayed statistics that show units
              const currentWeightEl = document.getElementById('currentWeight');
              const latestWaistEl = document.getElementById('latestWaist');
              const latestChestEl = document.getElementById('latestChest');
              const latestHipsEl = document.getElementById('latestHips');
              const latestArmsEl = document.getElementById('latestArms');
            
              // Update unit labels in statistics display
              const unitLabels = document.querySelectorAll('.unit-label');
              unitLabels.forEach(label => {
                  if (label.textContent.includes('lbs') || label.textContent.includes('kg')) {
                      label.textContent = getWeightUnit();
                  } else if (label.textContent.includes('inches') || label.textContent.includes('cm')) {
                      label.textContent = getHeightUnit();
                  }
              });
          }
        
          function initializeUnitSystem() {
              // Load saved unit preference
              const savedUnit = localStorage.getItem('unitSystem');
              if (savedUnit) {
                  currentUnitSystem = savedUnit;
                  const desktopSelect = document.getElementById('unitSystem');
                  const mobileSelect = document.getElementById('unitSystemMobile');
                  if (desktopSelect) desktopSelect.value = savedUnit;
                  if (mobileSelect) mobileSelect.value = savedUnit;
              }
            
              // Update labels for current system
              updateUnitLabels();
          }

          // Global variables - Initialize with defaults but check for existing values
          let dailyTargets;
        
          // Initialize dailyTargets with proper fallback logic
          function initializeDailyTargets() {
              if (!dailyTargets) {
                  // Try to load from localStorage first
                  const savedTargets = localStorage.getItem('dailyTargets');
                  if (savedTargets && savedTargets !== 'null') {
                      try {
                          const parsed = JSON.parse(savedTargets);
                          if (parsed && parsed.calories > 0 && parsed.protein > 0) {
                              dailyTargets = parsed;
                              console.log('✅ Daily targets initialized from localStorage:', dailyTargets);
                              return;
                          }
                      } catch (error) {
                          console.warn('⚠️ Error parsing saved targets during initialization:', error);
                      }
                  }
                
                  // Use defaults if no valid saved data
                  dailyTargets = {
                      calories: 2000,
                      protein: 150,
                      carbs: 250,
                      fat: 67
                  };
                  console.log('ℹ️ Daily targets initialized with defaults:', dailyTargets);
              }
          }
        
          // Initialize immediately
          initializeDailyTargets();
        
          // Function to ensure display elements match dailyTargets values
          function ensureDisplaySync() {
              if (document.getElementById('dailyCalories')) {
                  const currentCalories = document.getElementById('dailyCalories').textContent;
                  const currentProtein = document.getElementById('proteinAmount').textContent;
                  const currentCarbs = document.getElementById('carbsAmount').textContent;
                  const currentFat = document.getElementById('fatAmount').textContent;
                
                  // Update if display shows default placeholders or doesn't match current values
                  if (currentCalories === '2,000' || 
                      currentProtein === '150g' || 
                      currentCarbs === '250g' || 
                      currentFat === '67g' ||
                      currentCalories !== dailyTargets.calories.toLocaleString()) {
                    
                      console.log('🔄 Synchronizing display with dailyTargets:', dailyTargets);
                      document.getElementById('dailyCalories').textContent = dailyTargets.calories.toLocaleString();
                      document.getElementById('proteinAmount').textContent = dailyTargets.protein + 'g';
                      document.getElementById('carbsAmount').textContent = dailyTargets.carbs + 'g';
                      document.getElementById('fatAmount').textContent = dailyTargets.fat + 'g';
                  }
              }
          }


   function initializeCriticalVariables() {
              // Ensure critical arrays exist
              if (typeof meals === 'undefined') {
                  window.meals = [];
              }
              if (typeof customRecipes === 'undefined') {
                  window.customRecipes = [];
              }
              if (typeof macroHistory === 'undefined') {
                  window.macroHistory = [];
              }
              if (typeof currentIntake === 'undefined') {
                  window.currentIntake = { protein: 0, carbs: 0, fat: 0 };
              }
              if (typeof dailyTargets === 'undefined') {
                  // Try to load saved targets from localStorage first
                  const savedTargets = localStorage.getItem('dailyTargets');
                  if (savedTargets && savedTargets !== 'null') {
                      try {
                          const parsed = JSON.parse(savedTargets);
                          if (parsed && parsed.calories > 0 && parsed.protein > 0) {
                              window.dailyTargets = parsed;
                              console.log('✅ Daily targets loaded from localStorage during init:', parsed);
                          } else {
                              window.dailyTargets = { calories: 2000, protein: 150, carbs: 250, fat: 67 };
                          }
                      } catch (error) {
                          console.warn('⚠️ Error parsing saved targets during init:', error);
                          window.dailyTargets = { calories: 2000, protein: 150, carbs: 250, fat: 67 };
                      }
                  } else {
                      window.dailyTargets = { calories: 2000, protein: 150, carbs: 250, fat: 67 };
                  }
              }
            
              console.log('✅ Critical variables initialized');
          }


   function convertFormValues(fromSystem, toSystem) {
              // Convert Macro Calculator values
              const weightInput = document.getElementById('weight');
              const heightInput = document.getElementById('height');
            
              if (weightInput && weightInput.value) {
                  const currentValue = parseFloat(weightInput.value);
                  const convertedValue = convertWeight(currentValue, fromSystem, toSystem);
                  weightInput.value = convertedValue.toFixed(1);
              }
            
              if (heightInput && heightInput.value) {
                  const currentValue = parseFloat(heightInput.value);
                  const convertedValue = convertHeight(currentValue, fromSystem, toSystem);
                  heightInput.value = convertedValue.toFixed(1);
              }
            
              // Convert Progress Tracker values
              const progressWeight = document.getElementById('progressEntryWeight');
              const progressWaist = document.getElementById('progressEntryWaist');
              const progressChest = document.getElementById('progressEntryChest');
              const progressHips = document.getElementById('progressEntryHips');
              const progressArms = document.getElementById('progressEntryArms');
              const targetWeight = document.getElementById('targetWeight');
            
              if (progressWeight && progressWeight.value) {
                  const currentValue = parseFloat(progressWeight.value);
                  const convertedValue = convertWeight(currentValue, fromSystem, toSystem);
                  progressWeight.value = convertedValue.toFixed(1);
              }
            
              if (targetWeight && targetWeight.value) {
                  const currentValue = parseFloat(targetWeight.value);
                  const convertedValue = convertWeight(currentValue, fromSystem, toSystem);
                  targetWeight.value = convertedValue.toFixed(1);
              }
            
              // Convert body measurements
              const measurementInputs = [progressWaist, progressChest, progressHips, progressArms];
              measurementInputs.forEach(input => {
                  if (input && input.value) {
                      const currentValue = parseFloat(input.value);
                      const convertedValue = convertHeight(currentValue, fromSystem, toSystem);
                      input.value = convertedValue.toFixed(1);
                  }
              });
          }


   function updateUnitLabels() {
              const weightUnit = getWeightUnit();
              const heightUnit = getHeightUnit();
            
              // Update Macro Calculator labels
              const weightLabel = document.querySelector('label[for="weight"]');
              const heightLabel = document.querySelector('label[for="height"]');
            
              if (weightLabel) weightLabel.textContent = `Weight (${weightUnit})`;
              if (heightLabel) heightLabel.textContent = `Height (${heightUnit})`;
            
              // Update Progress Tracker labels
              const progressWeightLabel = document.querySelector('label[for="progressEntryWeight"]');
              const progressWaistLabel = document.querySelector('label[for="progressEntryWaist"]');
              const progressChestLabel = document.querySelector('label[for="progressEntryChest"]');
              const progressHipsLabel = document.querySelector('label[for="progressEntryHips"]');
              const progressArmsLabel = document.querySelector('label[for="progressEntryArms"]');
              const targetWeightLabel = document.querySelector('label[for="targetWeight"]');
            
              if (progressWeightLabel) progressWeightLabel.textContent = `Weight (${weightUnit})`;
              if (progressWaistLabel) progressWaistLabel.textContent = `Waist (${heightUnit})`;
              if (progressChestLabel) progressChestLabel.textContent = `Chest (${heightUnit})`;
              if (progressHipsLabel) progressHipsLabel.textContent = `Hips (${heightUnit})`;
              if (progressArmsLabel) progressArmsLabel.textContent = `Arms (${heightUnit})`;
              if (targetWeightLabel) targetWeightLabel.textContent = `Target Weight (${weightUnit})`;
            
              // Update placeholders
              updatePlaceholders();
            
              // Update displayed statistics
              updateDisplayedStats();
            
              // Refresh progress display when units change
              if (typeof refreshProgressDisplay === 'function') {
                  refreshProgressDisplay();
              }
          }


   function updatePlaceholders() {
              const weightInput = document.getElementById('weight');
              const heightInput = document.getElementById('height');
              const progressWeight = document.getElementById('progressEntryWeight');
              const progressWaist = document.getElementById('progressEntryWaist');
              const progressChest = document.getElementById('progressEntryChest');
              const progressHips = document.getElementById('progressEntryHips');
              const progressArms = document.getElementById('progressEntryArms');
              const targetWeight = document.getElementById('targetWeight');
            
              if (currentUnitSystem === 'imperial') {
                  if (weightInput) weightInput.placeholder = '152.19';
                  if (heightInput) heightInput.placeholder = '68';
                  if (progressWeight) progressWeight.placeholder = '150.0';
                  if (progressWaist) progressWaist.placeholder = '32.0';
                  if (progressChest) progressChest.placeholder = '38.0';
                  if (progressHips) progressHips.placeholder = '36.0';
                  if (progressArms) progressArms.placeholder = '13.0';
                  if (targetWeight) targetWeight.placeholder = '150';
              } else {
                  if (weightInput) weightInput.placeholder = '69.1';
                  if (heightInput) heightInput.placeholder = '173';
                  if (progressWeight) progressWeight.placeholder = '68.0';
                  if (progressWaist) progressWaist.placeholder = '81.3';
                  if (progressChest) progressChest.placeholder = '96.5';
                  if (progressHips) progressHips.placeholder = '91.4';
                  if (progressArms) progressArms.placeholder = '33.0';
                  if (targetWeight) targetWeight.placeholder = '68';
              }
          }


   function addRecipeToTracker(recipeId, source) {
              let recipe;
              if (source === 'custom') {
                  recipe = customRecipes.find(r => r.id === recipeId);
              } else {
                  recipe = recipes.find(r => r.id === recipeId);
              }

              if (!recipe) return;

              // Add to current day's tracking
              const trackingMeal = {
                  id: Date.now() + Math.random(),
                  name: recipe.name,
                  protein: recipe.protein,
                  carbs: recipe.carbs,
                  fat: recipe.fat,
                  calories: recipe.calories
              };

              meals.push(trackingMeal);
              currentIntake.protein += recipe.protein;
              currentIntake.carbs += recipe.carbs;
              currentIntake.fat += recipe.fat;

              updateMealsList();
              updateProgress();
              saveData();
              saveDailyMacros().catch(error => console.error('Error saving daily macros:', error)); // Save daily macro progress
            
              showNotification('Recipe Added', `${recipe.name} has been added to today's tracker!`, 'success');
          }

          function addRecipeToMealPlan(recipeId, source, mealType) {
              let recipe;
              if (source === 'custom') {
                  recipe = customRecipes.find(r => r.id === recipeId);
              } else {
                  recipe = recipes.find(r => r.id === recipeId);
              }

              if (!recipe) return;

              const plannedMeal = {
                  id: Date.now() + Math.random(),
                  name: recipe.name,
                  calories: recipe.calories,
                  protein: recipe.protein,
                  carbs: recipe.carbs || 0,
                  fat: recipe.fat || 0
              };

              mealPlan[currentSelectedDay][mealType].push(plannedMeal);
              updateMealPlanDisplay();
              saveMealPlan().catch(error => console.warn('Meal plan save error:', error));
              showNotification('Meal Planned', `${recipe.name} added to ${mealType} for ${currentSelectedDay.charAt(0).toUpperCase() + currentSelectedDay.slice(1)}!`, 'success');
          }

          function showMealPlannerSelection(recipeId, source) {
              let recipe;
              if (source === 'custom') {
                  recipe = customRecipes.find(r => r.id === recipeId);
              } else {
                  recipe = recipes.find(r => r.id === recipeId);
              }

              if (!recipe) return;

              const modal = document.createElement('div');
              modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4';
              modal.innerHTML = `
                  <div class="bg-white rounded-lg max-w-md w-full">
                      <div class="p-6">
                          <div class="flex justify-between items-start mb-4">
                              <h3 class="text-xl font-bold text-gray-800">Add to Meal Planner</h3>
                              <button onclick="this.closest('.fixed').remove()" class="text-gray-400 hover:text-gray-600">
                                  <i class="fas fa-times text-xl"></i>
                              </button>
                          </div>
                        
                          <div class="mb-4">
                              <div class="bg-gray-50 p-3 rounded-lg mb-4">
                                  <h4 class="font-semibold text-gray-800">${recipe.name}</h4>
                                  <div class="text-sm text-gray-600 mt-1">
                                      ${recipe.calories} cal • ${recipe.protein}g protein
                                  </div>
                              </div>
                            
                              <p class="text-gray-600 mb-4">Select which meal and day to add this recipe:</p>
                            
                              <!-- Day Selection -->
                              <div class="mb-4">
                                  <label class="block text-sm font-medium text-gray-700 mb-2">Select Day:</label>
                                  <select id="plannerDaySelect" class="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500">
                                      <option value="Sunday">Sunday</option>
                                      <option value="Monday">Monday</option>
                                      <option value="Tuesday">Tuesday</option>
                                      <option value="Wednesday">Wednesday</option>
                                      <option value="Thursday">Thursday</option>
                                      <option value="Friday">Friday</option>
                                      <option value="Saturday">Saturday</option>
                                  </select>
                              </div>
                            
                              <!-- Meal Type Selection -->
                              <div class="mb-6">
                                  <label class="block text-sm font-medium text-gray-700 mb-2">Select Meal:</label>
                                  <div class="grid grid-cols-2 gap-2" id="mealTypeGrid">
                                      <button onclick="addRecipeToMealPlanFromSelection(${recipeId}, '${source}', 'breakfast')" class="bg-orange-500 hover:bg-orange-600 text-white px-4 py-3 rounded-lg font-medium" style="background-color: #f97316 !important; color: white !important;">
                                          <i class="fas fa-sun mr-2"></i>Breakfast
                                      </button>
                                      <button onclick="addRecipeToMealPlanFromSelection(${recipeId}, '${source}', 'lunch')" class="bg-green-500 hover:bg-green-600 text-white px-4 py-3 rounded-lg font-medium">
                                          <i class="fas fa-leaf mr-2"></i>Lunch
                                      </button>
                                      <button onclick="addRecipeToMealPlanFromSelection(${recipeId}, '${source}', 'dinner')" class="bg-purple-500 hover:bg-purple-600 text-white px-4 py-3 rounded-lg font-medium">
                                          <i class="fas fa-moon mr-2"></i>Dinner
                                      </button>
                                      <button onclick="addRecipeToMealPlanFromSelection(${recipeId}, '${source}', 'snacks')" class="bg-blue-500 hover:bg-blue-600 text-white px-4 py-3 rounded-lg font-medium">
                                          <i class="fas fa-cookie-bite mr-2"></i>Snacks
                                      </button>
                                      ${customSectionEnabled && customSections.length > 0 ? `
                                      <button onclick="addRecipeToMealPlanFromSelection(${recipeId}, '${source}', '${customSections[0].id}')" class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-lg font-medium col-span-2">
                                          <i class="fas fa-star mr-2"></i>${customSections[0].name}
                                      </button>` : ''}
                                  </div>
                              </div>
                          </div>
                      </div>
                  </div>
              `;

              document.body.appendChild(modal);
            
              // Set current selected day as default
              const daySelect = document.getElementById('plannerDaySelect');
              if (daySelect && currentSelectedDay) {
                  daySelect.value = currentSelectedDay.charAt(0).toUpperCase() + currentSelectedDay.slice(1);
              }
          }

          function addRecipeToMealPlanFromSelection(recipeId, source, mealType) {
              const daySelect = document.getElementById('plannerDaySelect');
              const selectedDay = daySelect ? daySelect.value.toLowerCase() : currentSelectedDay;
            
              let recipe;
              if (source === 'custom') {
                  recipe = customRecipes.find(r => r.id === recipeId);
              } else {
                  recipe = recipes.find(r => r.id === recipeId);
              }

              if (!recipe) return;

              // Initialize meal plan structure if needed
              if (!mealPlan[selectedDay]) {
                  mealPlan[selectedDay] = {
                      breakfast: [],
                      lunch: [],
                      dinner: [],
                      snacks: []
                  };
                
                  // Add custom sections if they exist
                  customSections.forEach(section => {
                      mealPlan[selectedDay][section.id] = [];
                  });
              }
            
              // Ensure the specific meal type exists (for custom sections)
              if (!mealPlan[selectedDay][mealType]) {
                  mealPlan[selectedDay][mealType] = [];
              }

              const plannedMeal = {
                  id: Date.now() + Math.random(),
                  name: recipe.name,
                  calories: recipe.calories,
                  protein: recipe.protein,
                  carbs: recipe.carbs || 0,
                  fat: recipe.fat || 0
              };

              mealPlan[selectedDay][mealType].push(plannedMeal);
              updateMealPlanDisplay();
              saveMealPlan().catch(error => console.warn('Meal plan save error:', error));
            
              // Close modal
              const modal = document.querySelector('.fixed.inset-0');
              if (modal) modal.remove();
            
              // Show success notification
              const dayName = selectedDay.charAt(0).toUpperCase() + selectedDay.slice(1);
              const mealName = mealType.charAt(0).toUpperCase() + mealType.slice(1);
              showNotification('Recipe Added to Planner', `${recipe.name} added to ${mealName} for ${dayName}!`, 'success');
          }

          function showRecipeDetails(recipeId, source) {
              let recipe;
              if (source === 'custom') {
                  recipe = customRecipes.find(r => r.id === recipeId);
              } else {
                  recipe = recipes.find(r => r.id === recipeId);
              }

              if (!recipe) return;

              const modal = document.createElement('div');
              modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4';
              modal.innerHTML = `
                  <div class="bg-white rounded-lg max-w-2xl w-full max-h-screen overflow-y-auto">
                      <div class="p-6">
                          <div class="flex justify-between items-center mb-4">
                              <h2 class="text-2xl font-bold text-gray-800">${recipe.name}</h2>
                              <button onclick="this.closest('.fixed').remove()" class="text-gray-500 hover:text-gray-700 text-2xl">&times;</button>
                          </div>
                        
                          <div class="grid grid-cols-4 gap-4 mb-6 text-center">
                              <div class="bg-blue-50 p-3 rounded">
                                  <div class="text-xl font-bold text-blue-600">${recipe.calories}</div>
                                  <div class="text-sm text-gray-600">Calories</div>
                              </div>
                              <div class="bg-red-50 p-3 rounded">
                                  <div class="text-xl font-bold text-red-500">${recipe.protein}g</div>
                                  <div class="text-sm text-gray-600">Protein</div>
                              </div>
                              <div class="bg-green-50 p-3 rounded">
                                  <div class="text-xl font-bold text-green-500">${recipe.carbs}g</div>
                                  <div class="text-sm text-gray-600">Carbs</div>
                              </div>
                              <div class="bg-yellow-50 p-3 rounded">
                                  <div class="text-xl font-bold text-yellow-500">${recipe.fat}g</div>
                                  <div class="text-sm text-gray-600">Fat</div>
                              </div>
                          </div>

                          <div class="mb-4">
                              <h3 class="font-bold text-gray-800 mb-2">Serving Size</h3>
                              <p class="text-gray-700">${recipe.servings}</p>
                          </div>

                          <div class="mb-4">
                              <h3 class="font-bold text-gray-800 mb-2">Ingredients</h3>
                              <ul class="list-disc list-inside text-gray-700 space-y-1">
                                  ${recipe.ingredients.map(ingredient => `<li>${ingredient}</li>`).join('')}
                              </ul>
                          </div>

                          <div class="mb-6">
                              <h3 class="font-bold text-gray-800 mb-2">Instructions</h3>
                              <p class="text-gray-700 whitespace-pre-line">${recipe.instructions}</p>
                          </div>

                          <div class="flex flex-wrap gap-2">
                              <button onclick="addRecipeToTracker(${recipe.id}, '${recipe.source}'); this.closest('.fixed').remove();" class="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded font-medium">
                                  <i class="fas fa-plus mr-1"></i>Add to Tracker
                              </button>
                              <button onclick="addRecipeToMealPlan(${recipe.id}, '${recipe.source}', 'breakfast'); this.closest('.fixed').remove();" class="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded font-medium" style="background-color: #f97316 !important; color: white !important;">
                                  <i class="fas fa-sun mr-1"></i>Add to Breakfast
                              </button>
                              <button onclick="addRecipeToMealPlan(${recipe.id}, '${recipe.source}', 'lunch'); this.closest('.fixed').remove();" class="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded font-medium">
                                  <i class="fas fa-sun mr-1"></i>Add to Lunch
                              </button>
                              <button onclick="addRecipeToMealPlan(${recipe.id}, '${recipe.source}', 'dinner'); this.closest('.fixed').remove();" class="bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded font-medium">
                                  <i class="fas fa-moon mr-1"></i>Add to Dinner
                              </button>
                              ${customSectionEnabled && customSections.length > 0 ? `
                              <button onclick="addRecipeToMealPlan(${recipe.id}, '${recipe.source}', '${customSections[0].id}'); this.closest('.fixed').remove();" class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded font-medium">
                                  <i class="fas fa-star mr-1"></i>Add to ${customSections[0].name}
                              </button>` : ''}
                          </div>
                      </div>
                  </div>
              `;
            
              document.body.appendChild(modal);
          }

          function saveCustomRecipes() {
              localStorage.setItem('customRecipes', JSON.stringify(customRecipes));
          }

          function loadCustomRecipes() {
              const saved = localStorage.getItem('customRecipes');
              if (saved) {
                  customRecipes = JSON.parse(saved);
              }
          }

          // Progress Tracker Functions
          let progressEntries = [];
        
          // Ensure progressEntries is always an array
          function ensureProgressEntriesInitialized() {
              if (!progressEntries || !Array.isArray(progressEntries)) {
                  console.warn('Progress entries not properly initialized, creating empty array');
                  progressEntries = [];
              }
              return progressEntries;
          }
          let progressGoal = null;
          let progressChart = null;

          function initializeProgressTracker() {
              console.log('Initializing progress tracker...');
              loadProgressData();
            
              // Use setTimeout to ensure DOM is fully ready
              setTimeout(() => {
                  updateProgressDisplay();
                  initializeProgressChart();
                
                  // Set today's date as default
                  const today = new Date().toISOString().split('T')[0];
                  const dateField = document.getElementById('progressEntryDate');
                  if (dateField) {
                      dateField.value = today;
                  }
                
                  console.log('Progress tracker initialized with', progressEntries.length, 'entries');
              }, 100);
          }

          function clearProgressForm() {
              const fields = ['progressEntryWeight', 'progressEntryWaist', 'progressEntryChest', 'progressEntryHips', 'progressEntryArms', 'progressEntryNotes'];
              fields.forEach(fieldId => {
                  const field = document.getElementById(fieldId);
                  if (field) field.value = '';
              });
          }

          async function saveProgressEntry() {
              const date = document.getElementById('progressEntryDate')?.value;
              const weight = parseFloat(document.getElementById('progressEntryWeight')?.value);
              const waist = parseFloat(document.getElementById('progressEntryWaist')?.value) || null;
              const chest = parseFloat(document.getElementById('progressEntryChest')?.value) || null;
              const hips = parseFloat(document.getElementById('progressEntryHips')?.value) || null;
              const arms = parseFloat(document.getElementById('progressEntryArms')?.value) || null;
              const notes = document.getElementById('progressEntryNotes')?.value?.trim() || '';

              if (!date) {
                  showNotification('Missing Information', 'Please select a date', 'warning');
                  return;
              }

              if (!weight || weight <= 0) {
                  showNotification('Missing Information', 'Please enter a valid weight', 'warning');
                  return;
              }

              // Check if entry for this date already exists
              const existingIndex = progressEntries.findIndex(entry => entry.date === date);
            
              const progressEntry = {
                  id: existingIndex >= 0 ? progressEntries[existingIndex].id : Date.now(),
                  date: date,
                  weight: weight,
                  measurements: {
                      waist: waist,
                      chest: chest,
                      hips: hips,
                      arms: arms
                  },
                  notes: notes,
                  timestamp: Date.now()
              };

              // Save to database first
              try {
                  await saveProgressEntryToDB(progressEntry);
                  console.log('Progress entry saved to permanent storage');
              } catch (error) {
                  console.error('Error saving progress entry to database:', error);
              }

              if (existingIndex >= 0) {
                  progressEntries[existingIndex] = progressEntry;
                  showNotification('Entry Updated', 'Progress entry has been updated successfully', 'success');
              } else {
                  progressEntries.push(progressEntry);
                  showNotification('Entry Saved', 'Progress entry has been saved successfully', 'success');
              }

              // Sort by date (newest first)
              progressEntries.sort((a, b) => new Date(b.date) - new Date(a.date));

              // Fallback save to localStorage
              saveProgressData();
            
              updateProgressDisplay();
              updateProgressChart();
              clearProgressForm();
            
              console.log('Progress entry saved and displays updated');
          }

          async function setProgressGoal() {
              const targetWeight = parseFloat(document.getElementById('targetWeight')?.value);
              const targetDate = document.getElementById('targetDate')?.value;

              if (!targetWeight || targetWeight <= 0) {
                  showNotification('Missing Information', 'Please enter a valid target weight', 'warning');
                  return;
              }

              if (!targetDate) {
                  showNotification('Missing Information', 'Please select a target date', 'warning');
                  return;
              }

              const today = new Date();
              const target = new Date(targetDate);
            
              if (target <= today) {
                  showNotification('Invalid Date', 'Target date must be in the future', 'warning');
                  return;
              }

              progressGoal = {
                  targetWeight: targetWeight,
                  targetDate: targetDate,
                  setDate: today.toISOString().split('T')[0]
              };

              try {
                  // Save to database first
                  const dbResult = await saveProgressGoalToDB(progressGoal);
                
                  if (dbResult && !dbResult.fallback) {
                      console.log('✅ Progress goal saved to database:', dbResult);
                  } else {
                      console.log('📱 Progress goal saved to localStorage fallback');
                  }
                
                  // Also save to localStorage for backwards compatibility and offline access
                  saveProgressData();
                
                  // Double-save for critical data
                  setTimeout(() => {
                      saveProgressData();
                  }, 100);
                
                  updateProgressDisplay();
                  showNotification('Goal Set', `Target: ${targetWeight} ${getWeightUnit()} by ${target.toLocaleDateString()}`, 'success');
                
                  console.log('Progress goal saved:', progressGoal);
              } catch (error) {
                  console.error('❌ Error saving progress goal:', error);
                
                  // Fallback to localStorage only
                  saveProgressData();
                  setTimeout(() => {
                      saveProgressData();
                  }, 100);
                
                  updateProgressDisplay();
                  showNotification('Goal Set', `Target: ${targetWeight} ${getWeightUnit()} by ${target.toLocaleDateString()}`, 'success');
                  console.log('Progress goal saved to localStorage fallback:', progressGoal);
              }
          }

          function updateProgressDisplay() {
              // Update quick stats
              if (progressEntries.length > 0) {
                  const latest = progressEntries[0];
                  const oldest = progressEntries[progressEntries.length - 1];
                
                  // Current weight with proper unit
                  const currentWeightEl = document.getElementById('currentWeight');
                  if (currentWeightEl) {
                      const weightUnit = getWeightUnit();
                      let displayWeight = latest.weight;
                      // Convert weight if needed for display
                      if (currentUnitSystem === 'metric' && latest.weight > 50) {
                          // Assume stored weight is in lbs, convert to kg for display
                          displayWeight = lbsToKg(latest.weight);
                      }
                      currentWeightEl.textContent = displayWeight.toFixed(1) + ' ' + weightUnit;
                  }
                
                  // Weight change
                  const weightChangeEl = document.getElementById('weightChange');
                  if (weightChangeEl && progressEntries.length > 1) {
                      let change = latest.weight - oldest.weight;
                      const weightUnit = getWeightUnit();
                      // Convert change if needed for display
                      if (currentUnitSystem === 'metric' && Math.abs(change) > 1) {
                          change = lbsToKg(latest.weight) - lbsToKg(oldest.weight);
                      }
                      const changeText = change >= 0 ? `+${change.toFixed(1)} ${weightUnit}` : `${change.toFixed(1)} ${weightUnit}`;
                      weightChangeEl.textContent = changeText;
                      weightChangeEl.className = `text-xs mt-1 ${change >= 0 ? 'text-red-600' : 'text-green-600'}`;
                  } else if (weightChangeEl) {
                      weightChangeEl.textContent = 'First entry';
                      weightChangeEl.className = 'text-xs mt-1 text-blue-600';
                  }
                
                  // Days tracked
                  const daysSinceEl = document.getElementById('daysSinceStart');
                  if (daysSinceEl) {
                      const daysDiff = Math.max(0, Math.ceil((new Date(latest.date) - new Date(oldest.date)) / (1000 * 60 * 60 * 24)));
                      daysSinceEl.textContent = `${daysDiff} days`;
                  }
                
                  // Latest measurements with proper units
                  const measurements = latest.measurements || {};
                  const waistEl = document.getElementById('latestWaist');
                  const chestEl = document.getElementById('latestChest');
                  const hipsEl = document.getElementById('latestHips');
                  const armsEl = document.getElementById('latestArms');
                
                  const heightUnit = getHeightUnit();
                
                  if (waistEl) {
                      if (measurements.waist) {
                          let displayWaist = measurements.waist;
                          if (currentUnitSystem === 'metric' && measurements.waist < 50) {
                              displayWaist = inToCm(measurements.waist);
                          }
                          waistEl.textContent = displayWaist.toFixed(1);
                      } else {
                          waistEl.textContent = '--';
                      }
                  }
                
                  if (chestEl) {
                      if (measurements.chest) {
                          let displayChest = measurements.chest;
                          if (currentUnitSystem === 'metric' && measurements.chest < 50) {
                              displayChest = inToCm(measurements.chest);
                          }
                          chestEl.textContent = displayChest.toFixed(1);
                      } else {
                          chestEl.textContent = '--';
                      }
                  }
                
                  if (hipsEl) {
                      if (measurements.hips) {
                          let displayHips = measurements.hips;
                          if (currentUnitSystem === 'metric' && measurements.hips < 50) {
                              displayHips = inToCm(measurements.hips);
                          }
                          hipsEl.textContent = displayHips.toFixed(1);
                      } else {
                          hipsEl.textContent = '--';
                      }
                  }
                
                  if (armsEl) {
                      if (measurements.arms) {
                          let displayArms = measurements.arms;
                          if (currentUnitSystem === 'metric' && measurements.arms < 50) {
                              displayArms = inToCm(measurements.arms);
                          }
                          armsEl.textContent = displayArms.toFixed(1);
                      } else {
                          armsEl.textContent = '--';
                      }
                  }
                
                  // Weekly average
                  const weeklyAvgEl = document.getElementById('weeklyAverage');
                  if (weeklyAvgEl && progressEntries.length >= 2) {
                      const recentEntries = progressEntries.slice(0, Math.min(7, progressEntries.length));
                      if (recentEntries.length >= 2) {
                          const weekChange = recentEntries[0].weight - recentEntries[recentEntries.length - 1].weight;
                          const days = Math.max(1, (new Date(recentEntries[0].date) - new Date(recentEntries[recentEntries.length - 1].date)) / (1000 * 60 * 60 * 24));
                          let weekAvg = weekChange / (days / 7);
                        
                          // Convert for display if needed
                          if (currentUnitSystem === 'metric' && Math.abs(weekAvg) > 1) {
                              weekAvg = weekAvg * 0.453592; // Convert lbs to kg
                          }
                        
                          weeklyAvgEl.textContent = (weekAvg >= 0 ? '+' : '') + weekAvg.toFixed(1);
                      } else {
                          weeklyAvgEl.textContent = '--';
                      }
                  } else if (weeklyAvgEl) {
                      weeklyAvgEl.textContent = '--';
                  }
              } else {
                  // No data available - reset all displays
                  const currentWeightEl = document.getElementById('currentWeight');
                  const weightChangeEl = document.getElementById('weightChange');
                  const daysSinceEl = document.getElementById('daysSinceStart');
                  const weeklyAvgEl = document.getElementById('weeklyAverage');
                  const waistEl = document.getElementById('latestWaist');
                  const chestEl = document.getElementById('latestChest');
                  const hipsEl = document.getElementById('latestHips');
                  const armsEl = document.getElementById('latestArms');
                
                  if (currentWeightEl) currentWeightEl.textContent = '--';
                  if (weightChangeEl) {
                      weightChangeEl.textContent = 'No data';
                      weightChangeEl.className = 'text-xs mt-1 text-gray-600';
                  }
                  if (daysSinceEl) daysSinceEl.textContent = '0 days';
                  if (weeklyAvgEl) weeklyAvgEl.textContent = '--';
                  if (waistEl) waistEl.textContent = '--';
                  if (chestEl) chestEl.textContent = '--';
                  if (hipsEl) hipsEl.textContent = '--';
                  if (armsEl) armsEl.textContent = '--';
              }

              // Total entries
              const totalEntriesEl = document.getElementById('totalProgressEntries');
              if (totalEntriesEl) totalEntriesEl.textContent = progressEntries.length;

              // Goal progress
              const goalProgressEl = document.getElementById('goalProgressPercent');
              const goalStatusEl = document.getElementById('goalStatusText');
            
              if (progressGoal && progressEntries.length > 0) {
                  const currentWeight = progressEntries[0].weight;
                  const startWeight = progressEntries[progressEntries.length - 1].weight;
                  const targetWeight = progressGoal.targetWeight;
                
                  const totalChange = Math.abs(targetWeight - startWeight);
                  const currentChange = Math.abs(currentWeight - startWeight);
                  const progress = totalChange > 0 ? Math.min(100, (currentChange / totalChange) * 100) : 0;
                
                  if (goalProgressEl) goalProgressEl.textContent = Math.round(progress) + '%';
                  if (goalStatusEl) goalStatusEl.textContent = `${Math.abs(targetWeight - currentWeight).toFixed(1)} ${getWeightUnit()} to go`;
              } else {
                  if (goalProgressEl) goalProgressEl.textContent = '0%';
                  if (goalStatusEl) goalStatusEl.textContent = 'Set goal';
              }

              updateProgressTimeline();
          }

          function updateProgressTimeline() {
              const timeline = document.getElementById('progressTimeline');
              if (!timeline) return;
            
              if (progressEntries.length === 0) {
                  timeline.innerHTML = `
                      <div class="text-center text-gray-500 py-8">
                          <i class="fas fa-chart-line text-4xl mb-4"></i>
                          <p>No progress entries yet. Add your first entry to start tracking!</p>
                      </div>
                  `;
                  return;
              }

              timeline.innerHTML = '';
            
              // Show last 5 entries
              const recentEntries = progressEntries.slice(0, 5);
              const weightUnit = getWeightUnit();
            
              recentEntries.forEach((entry, index) => {
                  const entryDiv = document.createElement('div');
                  entryDiv.className = 'flex items-start space-x-3 pb-3 mb-3 border-b border-gray-200 last:border-b-0';
                
                  const weightChange = index < progressEntries.length - 1 ? 
                      entry.weight - progressEntries[index + 1].weight : 0;
                
                  const changeColor = weightChange > 0 ? 'text-red-500' : weightChange < 0 ? 'text-green-500' : 'text-gray-500';
                  const changeIcon = weightChange > 0 ? 'fa-arrow-up' : weightChange < 0 ? 'fa-arrow-down' : 'fa-minus';
                
                  // Handle weight display with proper units
                  let displayWeight = entry.weight;
                  if (currentUnitSystem === 'metric' && entry.weight > 50) {
                      displayWeight = lbsToKg(entry.weight);
                  }
                
                  // Handle change display with proper units
                  let displayChange = weightChange;
                  if (currentUnitSystem === 'metric' && Math.abs(weightChange) > 1) {
                      displayChange = displayChange * 0.453592;
                  }
                
                  entryDiv.innerHTML = `
                      <div class="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                          <i class="fas fa-weight text-blue-600 text-xs"></i>
                      </div>
                      <div class="flex-1 min-w-0">
                          <div class="flex items-center justify-between">
                              <div class="text-sm font-medium text-gray-900">
                                  ${new Date(entry.date).toLocaleDateString('en-US', { 
                                      month: 'short', 
                                      day: 'numeric',
                                      year: 'numeric'
                                  })}
                              </div>
                              <div class="text-sm font-bold text-gray-900">
                                  ${displayWeight.toFixed(1)} ${weightUnit}
                                  ${Math.abs(displayChange) > 0.1 ? `<span class="${changeColor}"><i class="fas ${changeIcon} ml-1"></i></span>` : ''}
                              </div>
                          </div>
                          ${entry.notes ? `<div class="text-xs text-gray-600 mt-1">"${entry.notes}"</div>` : ''}
                          ${entry.measurements && (entry.measurements.waist || entry.measurements.chest || entry.measurements.hips || entry.measurements.arms) ? 
                              `<div class="text-xs text-gray-500 mt-1">
                                  ${entry.measurements.waist ? `W: ${entry.measurements.waist}" ` : ''}
                                  ${entry.measurements.chest ? `C: ${entry.measurements.chest}" ` : ''}
                                  ${entry.measurements.hips ? `H: ${entry.measurements.hips}" ` : ''}
                                  ${entry.measurements.arms ? `A: ${entry.measurements.arms}"` : ''}
                              </div>` : ''}
                      </div>
                  `;
                
                  timeline.appendChild(entryDiv);
              });
          }

          function initializeProgressChart() {
              const ctx = document.getElementById('progressWeightChart');
              if (!ctx) {
                  console.error('Progress chart canvas not found');
                  return;
              }

              // Destroy existing chart first to prevent canvas reuse errors
              if (progressChart) {
                  progressChart.destroy();
                  progressChart = null;
                  console.log('🗑️ Destroyed existing progress chart before reinitializing');
              }

              try {
                  progressChart = new Chart(ctx.getContext('2d'), {
                      type: 'line',
                      data: {
                          labels: [],
                          datasets: [{
                              label: 'Weight (' + getWeightUnit() + ')',
                              data: [],
                              borderColor: '#3b82f6',
                              backgroundColor: 'rgba(59, 130, 246, 0.1)',
                              borderWidth: 3,
                              fill: true,
                              tension: 0.4,
                              pointBackgroundColor: '#3b82f6',
                              pointBorderColor: '#ffffff',
                              pointBorderWidth: 2,
                              pointRadius: 6
                          }]
                      },
                      options: {
                          responsive: true,
                          maintainAspectRatio: false,
                          plugins: {
                              legend: {
                                  display: true,
                                  position: 'top'
                              },
                              tooltip: {
                                  mode: 'index',
                                  intersect: false
                              }
                          },
                          interaction: {
                              mode: 'nearest',
                              axis: 'x',
                              intersect: false
                          },
                          scales: {
                              y: {
                                  beginAtZero: false,
                                  grid: {
                                      color: 'rgba(0,0,0,0.1)'
                                  },
                                  ticks: {
                                      callback: function(value) {
                                          return value.toFixed(1) + ' ' + getWeightUnit();
                                      }
                                  }
                              },
                              x: {
                                  grid: {
                                      color: 'rgba(0,0,0,0.1)'
                                  }
                              }
                          }
                      }
                  });
                
                  console.log('Progress chart initialized successfully');
                  updateProgressChart();
              } catch (error) {
                  console.error('Error initializing progress chart:', error);
              }
          }

          function updateProgressChart() {
              if (!progressChart) {
                  console.warn('Progress chart not initialized');
                  return;
              }
            
              if (progressEntries.length === 0) {
                  // Show empty chart with message
                  progressChart.data.labels = ['No Data'];
                  progressChart.data.datasets[0].data = [];
                  progressChart.update();
                  return;
              }

              try {
                  // Reverse data for chronological order in chart
                  const chronologicalData = [...progressEntries].reverse();
                
                  const labels = chronologicalData.map(entry => 
                      new Date(entry.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                  );
                
                  // Convert weights for display if needed
                  const data = chronologicalData.map(entry => {
                      let displayWeight = entry.weight;
                      if (currentUnitSystem === 'metric' && entry.weight > 50) {
                          displayWeight = lbsToKg(entry.weight);
                      }
                      return parseFloat(displayWeight.toFixed(1));
                  });
                
                  progressChart.data.labels = labels;
                  progressChart.data.datasets[0].data = data;
                  progressChart.data.datasets[0].label = 'Weight (' + getWeightUnit() + ')';
                  progressChart.update('none'); // Use 'none' for immediate update
                
                  console.log('Progress chart updated with', data.length, 'data points');
              } catch (error) {
                  console.error('Error updating progress chart:', error);
              }
          }

          // Toggle progress export dropdown
          // Simple PDF Export Function
          function exportProgressPDF() {
              try {
                  console.log('🔄 Starting PDF export...');
                
                  // Get progress entries safely
                  const entries = getProgressEntries();
                  if (!entries || entries.length === 0) {
                      showNotification('No Data', 'No progress data to export. Please add some progress entries first.', 'info');
                      return;
                  }
                
                  // Generate PDF
                  generateSimplePDF(entries);
                  showNotification('Success', 'PDF report exported successfully!', 'success');
                
              } catch (error) {
                  console.error('❌ PDF export failed:', error);
                  showNotification('Export Failed', 'Unable to export PDF: ' + error.message, 'error');
              }
          }

          // Simple CSV Export Function  
          function exportProgressCSV() {
              try {
                  console.log('🔄 Starting CSV export...');
                
                  // Get progress entries safely
                  const entries = getProgressEntries();
                  if (!entries || entries.length === 0) {
                      showNotification('No Data', 'No progress data to export. Please add some progress entries first.', 'info');
                      return;
                  }
                
                  // Generate CSV
                  const csvContent = generateSimpleCSV(entries);
                  const dateStr = new Date().toISOString().split('T')[0];
                  downloadFile(csvContent, `Progress-Data-${dateStr}.csv`, 'text/csv;charset=utf-8;');
                  showNotification('Success', 'CSV data exported successfully!', 'success');
                
              } catch (error) {
                  console.error('❌ CSV export failed:', error);
                  showNotification('Export Failed', 'Unable to export CSV: ' + error.message, 'error');
              }
          }

          // Safe function to get progress entries
          function getProgressEntries() {
              try {
                  // Ensure progressEntries exists and is an array
                  if (typeof progressEntries === 'undefined' || !progressEntries) {
                      console.log('⚠️ progressEntries not found, trying to load from localStorage');
                      const stored = localStorage.getItem('progressEntries');
                      if (stored) {
                          return JSON.parse(stored);
                      }
                      return [];
                  }
                
                  if (!Array.isArray(progressEntries)) {
                      console.warn('⚠️ progressEntries is not an array, converting');
                      return [];
                  }
                
                  // Filter for valid entries only
                  return progressEntries.filter(entry => entry && typeof entry === 'object' && entry.date);
                
              } catch (error) {
                  console.error('❌ Error getting progress entries:', error);
                  return [];
              }
          }

          function exportProgressData(format = 'pdf') {
              try {
                  // Ensure progressEntries is properly initialized
                  ensureProgressEntriesInitialized();
                
                  // Debug log to check progressEntries state
                  console.log('Export called - progressEntries:', progressEntries);
                
                  // Check if progressEntries exists and has data
                  if (!progressEntries || !Array.isArray(progressEntries) || progressEntries.length === 0) {
                      console.warn('No progress entries available for export');
                      showNotification('No Data', 'No progress data to export. Please add some progress entries first.', 'info');
                      return;
                  }
                
                  console.log(`Exporting ${progressEntries.length} progress entries in ${format} format`);

              // Close dropdown
              document.getElementById('progressExportDropdown').classList.add('hidden');
            
              const dateStr = new Date().toISOString().split('T')[0];
              const totalEntries = progressEntries.length;
            
              // Calculate progress statistics
              console.log('🔍 About to calculate progress statistics...');
              const stats = calculateProgressStatistics();
              console.log('🔍 Calculated stats result:', stats);
            
              switch (format.toLowerCase()) {
                  case 'pdf':
                      generateProgressReportPDF(stats, dateStr);
                      showNotification('Success', `Professional progress report (PDF) exported! ${totalEntries} entries with charts included.`, 'success');
                      break;
                    
                  case 'csv':
                      const csvContent = generateProgressCSV(stats);
                      if (csvContent) {
                          downloadFile(csvContent, `NutriTracker-ProgressData-${dateStr}.csv`, 'text/csv;charset=utf-8;');
                          const entriesText = totalEntries > 0 ? `${totalEntries} entries` : 'empty template';
                          showNotification('Success', `Progress data exported to CSV! ${entriesText} ready for spreadsheet analysis.`, 'success');
                      } else {
                          showNotification('Export Failed', 'Unable to generate CSV file. Please try again.', 'error');
                      }
                      break;
                    
                  case 'xlsx':
                      generateProgressExcel(stats, dateStr);
                      const excelEntriesText = totalEntries > 0 ? `${totalEntries} entries with multiple sheets and charts` : 'empty template with instructions';
                      showNotification('Success', `Excel workbook exported! ${excelEntriesText}.`, 'success');
                      break;
                    
                  default:
                      showNotification('Error', 'Invalid export format selected.', 'error');
              }
              } catch (error) {
                  console.error('Error in exportProgressData:', error);
                  showNotification('Export Failed', 'An error occurred while exporting progress data: ' + error.message, 'error');
              }
          }

          // Calculate comprehensive progress statistics
          function calculateProgressStatistics() {
              console.log('Calculating progress statistics - progressEntries:', progressEntries);
              console.log('🔍 progressEntries type:', typeof progressEntries, 'isArray:', Array.isArray(progressEntries));
            
              // Ensure progressEntries is initialized
              if (!progressEntries || !Array.isArray(progressEntries)) {
                  console.warn('progressEntries not properly initialized, creating empty array');
                  progressEntries = [];
              }
            
              if (progressEntries.length === 0) {
                  console.warn('No progress entries available for statistics');
                  return {
                      entries: [],
                      goal: progressGoal,
                      totalEntries: 0,
                      dateRange: null,
                      weight: null,
                      bodyFat: null,
                      muscleMass: null,
                      measurements: null
                  };
              }
            
              // Filter out invalid entries and sort by date
              const validEntries = progressEntries.filter(entry => entry && entry.date);
            
              if (validEntries.length === 0) {
                  console.warn('No valid progress entries found for statistics');
                  return {
                      entries: [],
                      goal: progressGoal,
                      totalEntries: 0,
                      dateRange: null,
                      weight: null,
                      bodyFat: null,
                      muscleMass: null,
                      measurements: null
                  };
              }
            
              const sortedEntries = [...validEntries].sort((a, b) => new Date(a.date) - new Date(b.date));
            
              const stats = {
                  entries: sortedEntries,
                  goal: progressGoal,
                  totalEntries: sortedEntries.length,
                  dateRange: {
                      start: sortedEntries[0].date,
                      end: sortedEntries[sortedEntries.length - 1].date
                  }
              };
            
              // Calculate weight statistics
              const weightEntries = sortedEntries.filter(entry => entry && entry.weight && !isNaN(parseFloat(entry.weight)));
              if (weightEntries.length > 0) {
                  const weights = weightEntries.map(entry => parseFloat(entry.weight));
                  const weightTrendData = weightEntries.map(entry => ({ 
                      date: entry.date, 
                      value: parseFloat(entry.weight) 
                  })).filter(item => item.date && !isNaN(item.value));
                
                  stats.weight = {
                      current: weights[weights.length - 1],
                      initial: weights[0],
                      min: Math.min(...weights),
                      max: Math.max(...weights),
                      average: weights.reduce((a, b) => a + b, 0) / weights.length,
                      change: weights[weights.length - 1] - weights[0],
                      trend: calculateTrend(weightTrendData)
                  };
              }
            
              // Calculate body fat statistics  
              const bodyFatEntries = sortedEntries.filter(entry => entry && entry.bodyFat && !isNaN(parseFloat(entry.bodyFat)));
              if (bodyFatEntries.length > 0) {
                  const bodyFats = bodyFatEntries.map(entry => parseFloat(entry.bodyFat));
                  const bodyFatTrendData = bodyFatEntries.map(entry => ({ 
                      date: entry.date, 
                      value: parseFloat(entry.bodyFat) 
                  })).filter(item => item.date && !isNaN(item.value));
                
                  stats.bodyFat = {
                      current: bodyFats[bodyFats.length - 1],
                      initial: bodyFats[0],
                      min: Math.min(...bodyFats),
                      max: Math.max(...bodyFats),
                      average: bodyFats.reduce((a, b) => a + b, 0) / bodyFats.length,
                      change: bodyFats[bodyFats.length - 1] - bodyFats[0],
                      trend: calculateTrend(bodyFatTrendData)
                  };
              }
            
              // Calculate muscle mass statistics
              // Calculate muscle mass statistics
              const muscleMassEntries = sortedEntries.filter(entry => entry && entry.muscleMass && !isNaN(parseFloat(entry.muscleMass)));
              if (muscleMassEntries.length > 0) {
                  const muscleMasses = muscleMassEntries.map(entry => parseFloat(entry.muscleMass));
                  const muscleMassTrendData = muscleMassEntries.map(entry => ({ 
                      date: entry.date, 
                      value: parseFloat(entry.muscleMass) 
                  })).filter(item => item.date && !isNaN(item.value));
                
                  stats.muscleMass = {
                      current: muscleMasses[muscleMasses.length - 1],
                      initial: muscleMasses[0],
                      min: Math.min(...muscleMasses),
                      max: Math.max(...muscleMasses),
                      average: muscleMasses.reduce((a, b) => a + b, 0) / muscleMasses.length,
                      change: muscleMasses[muscleMasses.length - 1] - muscleMasses[0],
                      trend: calculateTrend(muscleMassTrendData)
                  };
              }
            
              return stats;
          }

          // Calculate trend (positive = increasing, negative = decreasing)
          function calculateTrend(dataPoints) {
              if (!dataPoints || !Array.isArray(dataPoints) || dataPoints.length < 2) {
                  console.warn('Invalid dataPoints for trend calculation:', dataPoints);
                  return 0;
              }
            
              const n = dataPoints.length;
              let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
            
              dataPoints.forEach((point, index) => {
                  sumX += index;
                  sumY += point.value;
                  sumXY += index * point.value;
                  sumX2 += index * index;
              });
            
              // Calculate slope (trend)
              return (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
          }

          // Generate professional PDF report with charts
          // Simple, reliable PDF generation
          function generateSimplePDF(entries) {
              console.log('📄 Generating PDF with', entries.length, 'entries');
            
              // Check if jsPDF is available - look for it in different locations
              let jsPDF;
              if (window.jspdf && window.jspdf.jsPDF) {
                  jsPDF = window.jspdf.jsPDF;
              } else if (window.jsPDF) {
                  jsPDF = window.jsPDF;
              } else {
                  console.error('❌ jsPDF library not found');
                  showNotification('Error', 'PDF library not available. Please refresh the page and try again.', 'error');
                  return;
              }
            
              console.log('🔧 Creating jsPDF instance...');
              const doc = new jsPDF();
            
              // Colors
              const primaryColor = [16, 185, 129]; // Green
              const secondaryColor = [107, 114, 128]; // Gray
              const textColor = [0, 0, 0]; // Black
            
              let yPos = 30;
            
              // Header
              doc.setFontSize(24);
              doc.setTextColor(...primaryColor);
              doc.text('NutriTracker Progress Report', 20, yPos);
            
              // Subtitle
              yPos += 15;
              doc.setFontSize(14);
              doc.setTextColor(...secondaryColor);
              doc.text(`Generated on ${new Date().toLocaleDateString()}`, 20, yPos);
            
              // Summary
              yPos += 20;
              doc.setFontSize(16);
              doc.setTextColor(...textColor);
              doc.text('Progress Summary', 20, yPos);
            
              yPos += 15;
              doc.setFontSize(12);
              doc.setTextColor(...secondaryColor);
              doc.text(`Total Entries: ${entries.length}`, 25, yPos);
            
              if (entries.length > 0) {
                  yPos += 8;
                  const startDate = new Date(entries[0].date).toLocaleDateString();
                  const endDate = new Date(entries[entries.length - 1].date).toLocaleDateString();
                  doc.text(`Period: ${startDate} - ${endDate}`, 25, yPos);
              }
            
              // Data Table
              yPos += 25;
              doc.setFontSize(14);
              doc.setTextColor(...textColor);
              doc.text('Progress Entries', 20, yPos);
            
              // Table headers
              yPos += 15;
              doc.setFontSize(10);
              doc.setTextColor(...textColor);
              doc.text('Date', 25, yPos);
              doc.text('Weight', 65, yPos);
              doc.text('Waist', 95, yPos);
              doc.text('Chest', 125, yPos);
              doc.text('Hips', 155, yPos);
              doc.text('Arms', 180, yPos);
            
              // Table data
              entries.forEach((entry, index) => {
                  yPos += 12;
                
                  // Check if we need a new page
                  if (yPos > 270) {
                      doc.addPage();
                      yPos = 30;
                  }
                
                  doc.setTextColor(...secondaryColor);
                  doc.text(new Date(entry.date).toLocaleDateString(), 25, yPos);
                  doc.text(entry.weight ? `${entry.weight} kg` : '--', 65, yPos);
                  doc.text(entry.waist ? `${entry.waist} cm` : '--', 95, yPos);
                  doc.text(entry.chest ? `${entry.chest} cm` : '--', 125, yPos);
                  doc.text(entry.hips ? `${entry.hips} cm` : '--', 155, yPos);
                  doc.text(entry.arms ? `${entry.arms} cm` : '--', 180, yPos);
              });
            
              // Footer
              const pageCount = doc.internal.getNumberOfPages();
              for (let i = 1; i <= pageCount; i++) {
                  doc.setPage(i);
                  doc.setFontSize(8);
                  doc.setTextColor(...secondaryColor);
                  doc.text(`Page ${i} of ${pageCount}`, 170, 285);
                  doc.text('Generated by NutriTracker Pro', 20, 285);
              }
            
              // Save
              const dateStr = new Date().toISOString().split('T')[0];
              const filename = `Progress-Report-${dateStr}.pdf`;
              console.log('💾 Attempting to download PDF:', filename);
            
              try {
                  doc.save(filename);
                  console.log('✅ PDF download initiated successfully');
              } catch (error) {
                  console.error('❌ PDF save failed:', error);
                  showNotification('Download Failed', 'Failed to download PDF: ' + error.message, 'error');
              }
          }

          function generateProgressReportPDF(stats, dateStr) {
              // Check if stats exists
              if (!stats) {
                  console.error('No stats object provided for PDF generation');
                  showNotification('Export Failed', 'Unable to generate PDF report. Please try again.', 'error');
                  return;
              }
            
              // Handle case with no entries - create a report showing empty state
              const hasEntries = stats.entries && stats.entries.length > 0;
            
              // Check if jsPDF is available
              if (typeof window.jsPDF === 'undefined') {
                  const script = document.createElement('script');
                  script.src = 'https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js';
                  script.onload = () => generateProgressReportPDF(stats, dateStr);
                  document.head.appendChild(script);
                  return;
              }

              const { jsPDF } = window;
              const doc = new jsPDF();
            
              // Set up fonts and colors
              doc.setFont('helvetica');
              const primaryColor = [16, 185, 129]; // Green
              const secondaryColor = [107, 114, 128]; // Gray
            
              let yPos = 30;
            
              // Header Section
              doc.setFontSize(22);
              doc.setTextColor(...primaryColor);
              doc.text('NutriTracker Pro', 20, yPos);
            
              doc.setFontSize(18);
              doc.setTextColor(0, 0, 0);
              yPos += 15;
              doc.text('Progress Tracking Report', 20, yPos);
            
              // Report Info
              doc.setFontSize(11);
              doc.setTextColor(...secondaryColor);
              yPos += 20;
              doc.text(`Generated: ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}`, 20, yPos);
              yPos += 8;
            
              if (hasEntries && stats.dateRange && stats.dateRange.start && stats.dateRange.end) {
                  doc.text(`Tracking Period: ${new Date(stats.dateRange.start).toLocaleDateString()} - ${new Date(stats.dateRange.end).toLocaleDateString()}`, 20, yPos);
                  yPos += 8;
              } else if (!hasEntries) {
                  doc.text('Tracking Period: No data recorded yet', 20, yPos);
                  yPos += 8;
              }
            
              doc.text(`Total Entries: ${stats.totalEntries || 0}`, 20, yPos);
            
              // Goal Information
              yPos += 20;
              doc.setFontSize(14);
              doc.setTextColor(0, 0, 0);
              doc.text('FITNESS GOALS', 20, yPos);
            
              doc.setFontSize(10);
              doc.setTextColor(...secondaryColor);
              yPos += 15;
              if (stats.goal && stats.goal.targetWeight) {
                  doc.text(`Target Weight: ${stats.goal.targetWeight} ${stats.goal.weightUnit || 'lbs'}`, 25, yPos);
                  yPos += 8;
              }
              if (stats.goal && stats.goal.targetDate) {
                  doc.text(`Target Date: ${new Date(stats.goal.targetDate).toLocaleDateString()}`, 25, yPos);
                  yPos += 8;
              }
            
              // Progress Summary
              yPos += 15;
              doc.setFontSize(14);
              doc.setTextColor(0, 0, 0);
              doc.text('PROGRESS SUMMARY', 20, yPos);
            
              yPos += 15;
              doc.setFontSize(10);
            
              if (!hasEntries) {
                  // Show empty state message
                  doc.setTextColor(...secondaryColor);
                  doc.text('No progress entries recorded yet.', 25, yPos);
                  yPos += 8;
                  doc.text('Start tracking your progress by adding entries in the app!', 25, yPos);
                  yPos += 20;
              } else {
                  // Weight Progress
                  if (stats.weight) {
                  const weightChange = stats.weight.change;
                  const changeColor = weightChange >= 0 ? [34, 197, 94] : [239, 68, 68]; // Green for gain, Red for loss
                
                  doc.setTextColor(0, 0, 0);
                  doc.text('Weight Progress:', 25, yPos);
                  yPos += 8;
                
                  doc.text(`• Initial: ${stats.weight.initial.toFixed(1)} lbs`, 30, yPos);
                  yPos += 6;
                  doc.text(`• Current: ${stats.weight.current.toFixed(1)} lbs`, 30, yPos);
                  yPos += 6;
                
                  doc.setTextColor(...changeColor);
                  doc.text(`• Change: ${weightChange > 0 ? '+' : ''}${weightChange.toFixed(1)} lbs`, 30, yPos);
                  yPos += 6;
                
                  doc.setTextColor(...secondaryColor);
                  doc.text(`• Trend: ${stats.weight.trend > 0 ? 'Increasing' : stats.weight.trend < 0 ? 'Decreasing' : 'Stable'}`, 30, yPos);
                  yPos += 10;
              }
            
              // Body Fat Progress
              if (stats.bodyFat) {
                  doc.setTextColor(0, 0, 0);
                  doc.text('Body Fat Progress:', 25, yPos);
                  yPos += 8;
                
                  doc.setTextColor(...secondaryColor);
                  doc.text(`• Initial: ${stats.bodyFat.initial.toFixed(1)}%`, 30, yPos);
                  yPos += 6;
                  doc.text(`• Current: ${stats.bodyFat.current.toFixed(1)}%`, 30, yPos);
                  yPos += 6;
                  doc.text(`• Change: ${stats.bodyFat.change > 0 ? '+' : ''}${stats.bodyFat.change.toFixed(1)}%`, 30, yPos);
                  yPos += 10;
              }
            
              // Muscle Mass Progress
              if (stats.muscleMass) {
                  doc.setTextColor(0, 0, 0);
                  doc.text('Muscle Mass Progress:', 25, yPos);
                  yPos += 8;
                
                  doc.setTextColor(...secondaryColor);
                  doc.text(`• Initial: ${stats.muscleMass.initial.toFixed(1)} lbs`, 30, yPos);
                  yPos += 6;
                  doc.text(`• Current: ${stats.muscleMass.current.toFixed(1)} lbs`, 30, yPos);
                  yPos += 6;
                  doc.text(`• Change: ${stats.muscleMass.change > 0 ? '+' : ''}${stats.muscleMass.change.toFixed(1)} lbs`, 30, yPos);
                  yPos += 10;
              }
            
              // Add new page for data table
              doc.addPage();
              yPos = 30;
            
              // Data Table Header
              doc.setFontSize(14);
              doc.setTextColor(0, 0, 0);
              doc.text('DETAILED PROGRESS DATA', 20, yPos);
            
              yPos += 20;
              doc.setFontSize(9);
            
              // Table Headers
              doc.setTextColor(...primaryColor);
              doc.text('Date', 25, yPos);
              doc.text('Weight', 55, yPos);
              doc.text('Body Fat %', 85, yPos);
              doc.text('Muscle Mass', 120, yPos);
              doc.text('Notes', 155, yPos);
            
              yPos += 8;
            
              // Table Data
              doc.setTextColor(0, 0, 0);
              stats.entries.forEach(entry => {
                  if (yPos > 270) {
                      doc.addPage();
                      yPos = 30;
                  }
                
                  doc.text(new Date(entry.date).toLocaleDateString(), 25, yPos);
                  doc.text(entry.weight ? `${entry.weight} lbs` : '-', 55, yPos);
                  doc.text(entry.bodyFat ? `${entry.bodyFat}%` : '-', 85, yPos);
                  doc.text(entry.muscleMass ? `${entry.muscleMass} lbs` : '-', 120, yPos);
                  doc.text(entry.notes ? entry.notes.substring(0, 20) + '...' : '-', 155, yPos);
                
                  yPos += 7;
              });
            
              // Footer
              const pageCount = doc.internal.getNumberOfPages();
              for (let i = 1; i <= pageCount; i++) {
                  doc.setPage(i);
                  doc.setFontSize(8);
                  doc.setTextColor(...secondaryColor);
                  doc.text(`Page ${i} of ${pageCount}`, 170, 285);
                  doc.text('Generated by NutriTracker Pro - Transform your nutrition, transform your life!', 20, 285);
              }
            
              } // Close the else block for hasEntries
            
              // Save PDF
              doc.save(`NutriTracker-ProgressReport-${dateStr}.pdf`);
          }

          // Simple, reliable CSV generation
          function generateSimpleCSV(entries) {
              try {
                  let csv = 'Date,Weight (kg),Waist (cm),Chest (cm),Hips (cm),Arms (cm),Notes\n';
                
                  entries.forEach(entry => {
                      const date = entry.date ? new Date(entry.date).toLocaleDateString() : '';
                      const weight = entry.weight || '';
                      const waist = entry.waist || '';
                      const chest = entry.chest || '';
                      const hips = entry.hips || '';
                      const arms = entry.arms || '';
                      const notes = entry.notes ? `"${entry.notes.replace(/"/g, '""')}


   function initializeProgressTracker() {
              console.log('Initializing progress tracker...');
              loadProgressData();
            
              // Use setTimeout to ensure DOM is fully ready
              setTimeout(() => {
                  updateProgressDisplay();
                  initializeProgressChart();
                
                  // Set today's date as default
                  const today = new Date().toISOString().split('T')[0];
                  const dateField = document.getElementById('progressEntryDate');
                  if (dateField) {
                      dateField.value = today;
                  }
                
                  console.log('Progress tracker initialized with', progressEntries.length, 'entries');
              }, 100);
          }

          function clearProgressForm() {
              const fields = ['progressEntryWeight', 'progressEntryWaist', 'progressEntryChest', 'progressEntryHips', 'progressEntryArms', 'progressEntryNotes'];
              fields.forEach(fieldId => {
                  const field = document.getElementById(fieldId);
                  if (field) field.value = '';
              });
          }

          async function saveProgressEntry() {
              const date = document.getElementById('progressEntryDate')?.value;
              const weight = parseFloat(document.getElementById('progressEntryWeight')?.value);
              const waist = parseFloat(document.getElementById('progressEntryWaist')?.value) || null;
              const chest = parseFloat(document.getElementById('progressEntryChest')?.value) || null;
              const hips = parseFloat(document.getElementById('progressEntryHips')?.value) || null;
              const arms = parseFloat(document.getElementById('progressEntryArms')?.value) || null;
              const notes = document.getElementById('progressEntryNotes')?.value?.trim() || '';

              if (!date) {
                  showNotification('Missing Information', 'Please select a date', 'warning');
                  return;
              }

              if (!weight || weight <= 0) {
                  showNotification('Missing Information', 'Please enter a valid weight', 'warning');
                  return;
              }

              // Check if entry for this date already exists
              const existingIndex = progressEntries.findIndex(entry => entry.date === date);
            
              const progressEntry = {
                  id: existingIndex >= 0 ? progressEntries[existingIndex].id : Date.now(),
                  date: date,
                  weight: weight,
                  measurements: {
                      waist: waist,
                      chest: chest,
                      hips: hips,
                      arms: arms
                  },
                  notes: notes,
                  timestamp: Date.now()
              };

              // Save to database first
              try {
                  await saveProgressEntryToDB(progressEntry);
                  console.log('Progress entry saved to permanent storage');
              } catch (error) {
                  console.error('Error saving progress entry to database:', error);
              }

              if (existingIndex >= 0) {
                  progressEntries[existingIndex] = progressEntry;
                  showNotification('Entry Updated', 'Progress entry has been updated successfully', 'success');
              } else {
                  progressEntries.push(progressEntry);
                  showNotification('Entry Saved', 'Progress entry has been saved successfully', 'success');
              }

              // Sort by date (newest first)
              progressEntries.sort((a, b) => new Date(b.date) - new Date(a.date));

              // Fallback save to localStorage
              saveProgressData();
            
              updateProgressDisplay();
              updateProgressChart();
              clearProgressForm();
            
              console.log('Progress entry saved and displays updated');
          }

          async function setProgressGoal() {
              const targetWeight = parseFloat(document.getElementById('targetWeight')?.value);
              const targetDate = document.getElementById('targetDate')?.value;

              if (!targetWeight || targetWeight <= 0) {
                  showNotification('Missing Information', 'Please enter a valid target weight', 'warning');
                  return;
              }

              if (!targetDate) {
                  showNotification('Missing Information', 'Please select a target date', 'warning');
                  return;
              }

              const today = new Date();
              const target = new Date(targetDate);
            
              if (target <= today) {
                  showNotification('Invalid Date', 'Target date must be in the future', 'warning');
                  return;
              }

              progressGoal = {
                  targetWeight: targetWeight,
                  targetDate: targetDate,
                  setDate: today.toISOString().split('T')[0]
              };

              try {
                  // Save to database first
                  const dbResult = await saveProgressGoalToDB(progressGoal);
                
                  if (dbResult && !dbResult.fallback) {
                      console.log('✅ Progress goal saved to database:', dbResult);
                  } else {
                      console.log('📱 Progress goal saved to localStorage fallback');
                  }
                
                  // Also save to localStorage for backwards compatibility and offline access
                  saveProgressData();
                
                  // Double-save for critical data
                  setTimeout(() => {
                      saveProgressData();
                  }, 100);
                
                  updateProgressDisplay();
                  showNotification('Goal Set', `Target: ${targetWeight} ${getWeightUnit()} by ${target.toLocaleDateString()}`, 'success');
                
                  console.log('Progress goal saved:', progressGoal);
              } catch (error) {
                  console.error('❌ Error saving progress goal:', error);
                
                  // Fallback to localStorage only
                  saveProgressData();
                  setTimeout(() => {
                      saveProgressData();
                  }, 100);
                
                  updateProgressDisplay();
                  showNotification('Goal Set', `Target: ${targetWeight} ${getWeightUnit()} by ${target.toLocaleDateString()}`, 'success');
                  console.log('Progress goal saved to localStorage fallback:', progressGoal);
              }
          }

          function updateProgressDisplay() {
              // Update quick stats
              if (progressEntries.length > 0) {
                  const latest = progressEntries[0];
                  const oldest = progressEntries[progressEntries.length - 1];
                
                  // Current weight with proper unit
                  const currentWeightEl = document.getElementById('currentWeight');
                  if (currentWeightEl) {
                      const weightUnit = getWeightUnit();
                      let displayWeight = latest.weight;
                      // Convert weight if needed for display
                      if (currentUnitSystem === 'metric' && latest.weight > 50) {
                          // Assume stored weight is in lbs, convert to kg for display
                          displayWeight = lbsToKg(latest.weight);
                      }
                      currentWeightEl.textContent = displayWeight.toFixed(1) + ' ' + weightUnit;
                  }
                
                  // Weight change
                  const weightChangeEl = document.getElementById('weightChange');
                  if (weightChangeEl && progressEntries.length > 1) {
                      let change = latest.weight - oldest.weight;
                      const weightUnit = getWeightUnit();
                      // Convert change if needed for display
                      if (currentUnitSystem === 'metric' && Math.abs(change) > 1) {
                          change = lbsToKg(latest.weight) - lbsToKg(oldest.weight);
                      }
                      const changeText = change >= 0 ? `+${change.toFixed(1)} ${weightUnit}` : `${change.toFixed(1)} ${weightUnit}`;
                      weightChangeEl.textContent = changeText;
                      weightChangeEl.className = `text-xs mt-1 ${change >= 0 ? 'text-red-600' : 'text-green-600'}`;
                  } else if (weightChangeEl) {
                      weightChangeEl.textContent = 'First entry';
                      weightChangeEl.className = 'text-xs mt-1 text-blue-600';
                  }
                
                  // Days tracked
                  const daysSinceEl = document.getElementById('daysSinceStart');
                  if (daysSinceEl) {
                      const daysDiff = Math.max(0, Math.ceil((new Date(latest.date) - new Date(oldest.date)) / (1000 * 60 * 60 * 24)));
                      daysSinceEl.textContent = `${daysDiff} days`;
                  }
                
                  // Latest measurements with proper units
                  const measurements = latest.measurements || {};
                  const waistEl = document.getElementById('latestWaist');
                  const chestEl = document.getElementById('latestChest');
                  const hipsEl = document.getElementById('latestHips');
                  const armsEl = document.getElementById('latestArms');
                
                  const heightUnit = getHeightUnit();
                
                  if (waistEl) {
                      if (measurements.waist) {
                          let displayWaist = measurements.waist;
                          if (currentUnitSystem === 'metric' && measurements.waist < 50) {
                              displayWaist = inToCm(measurements.waist);
                          }
                          waistEl.textContent = displayWaist.toFixed(1);
                      } else {
                          waistEl.textContent = '--';
                      }
                  }
                
                  if (chestEl) {
                      if (measurements.chest) {
                          let displayChest = measurements.chest;
                          if (currentUnitSystem === 'metric' && measurements.chest < 50) {
                              displayChest = inToCm(measurements.chest);
                          }
                          chestEl.textContent = displayChest.toFixed(1);
                      } else {
                          chestEl.textContent = '--';
                      }
                  }
                
                  if (hipsEl) {
                      if (measurements.hips) {
                          let displayHips = measurements.hips;
                          if (currentUnitSystem === 'metric' && measurements.hips < 50) {
                              displayHips = inToCm(measurements.hips);
                          }
                          hipsEl.textContent = displayHips.toFixed(1);
                      } else {
                          hipsEl.textContent = '--';
                      }
                  }
                
                  if (armsEl) {
                      if (measurements.arms) {
                          let displayArms = measurements.arms;
                          if (currentUnitSystem === 'metric' && measurements.arms < 50) {
                              displayArms = inToCm(measurements.arms);
                          }
                          armsEl.textContent = displayArms.toFixed(1);
                      } else {
                          armsEl.textContent = '--';
                      }
                  }
                
                  // Weekly average
                  const weeklyAvgEl = document.getElementById('weeklyAverage');
                  if (weeklyAvgEl && progressEntries.length >= 2) {
                      const recentEntries = progressEntries.slice(0, Math.min(7, progressEntries.length));
                      if (recentEntries.length >= 2) {
                          const weekChange = recentEntries[0].weight - recentEntries[recentEntries.length - 1].weight;
                          const days = Math.max(1, (new Date(recentEntries[0].date) - new Date(recentEntries[recentEntries.length - 1].date)) / (1000 * 60 * 60 * 24));
                          let weekAvg = weekChange / (days / 7);
                        
                          // Convert for display if needed
                          if (currentUnitSystem === 'metric' && Math.abs(weekAvg) > 1) {
                              weekAvg = weekAvg * 0.453592; // Convert lbs to kg
                          }
                        
                          weeklyAvgEl.textContent = (weekAvg >= 0 ? '+' : '') + weekAvg.toFixed(1);
                      } else {
                          weeklyAvgEl.textContent = '--';
                      }
                  } else if (weeklyAvgEl) {
                      weeklyAvgEl.textContent = '--';
                  }
              } else {
                  // No data available - reset all displays
                  const currentWeightEl = document.getElementById('currentWeight');
                  const weightChangeEl = document.getElementById('weightChange');
                  const daysSinceEl = document.getElementById('daysSinceStart');
                  const weeklyAvgEl = document.getElementById('weeklyAverage');
                  const waistEl = document.getElementById('latestWaist');
                  const chestEl = document.getElementById('latestChest');
                  const hipsEl = document.getElementById('latestHips');
                  const armsEl = document.getElementById('latestArms');
                
                  if (currentWeightEl) currentWeightEl.textContent = '--';
                  if (weightChangeEl) {
                      weightChangeEl.textContent = 'No data';
                      weightChangeEl.className = 'text-xs mt-1 text-gray-600';
                  }
                  if (daysSinceEl) daysSinceEl.textContent = '0 days';
                  if (weeklyAvgEl) weeklyAvgEl.textContent = '--';
                  if (waistEl) waistEl.textContent = '--';
                  if (chestEl) chestEl.textContent = '--';
                  if (hipsEl) hipsEl.textContent = '--';
                  if (armsEl) armsEl.textContent = '--';
              }

              // Total entries
              const totalEntriesEl = document.getElementById('totalProgressEntries');
              if (totalEntriesEl) totalEntriesEl.textContent = progressEntries.length;

              // Goal progress
              const goalProgressEl = document.getElementById('goalProgressPercent');
              const goalStatusEl = document.getElementById('goalStatusText');
            
              if (progressGoal && progressEntries.length > 0) {
                  const currentWeight = progressEntries[0].weight;
                  const startWeight = progressEntries[progressEntries.length - 1].weight;
                  const targetWeight = progressGoal.targetWeight;
                
                  const totalChange = Math.abs(targetWeight - startWeight);
                  const currentChange = Math.abs(currentWeight - startWeight);
                  const progress = totalChange > 0 ? Math.min(100, (currentChange / totalChange) * 100) : 0;
                
                  if (goalProgressEl) goalProgressEl.textContent = Math.round(progress) + '%';
                  if (goalStatusEl) goalStatusEl.textContent = `${Math.abs(targetWeight - currentWeight).toFixed(1)} ${getWeightUnit()} to go`;
              } else {
                  if (goalProgressEl) goalProgressEl.textContent = '0%';
                  if (goalStatusEl) goalStatusEl.textContent = 'Set goal';
              }

              updateProgressTimeline();
          }

          function updateProgressTimeline() {
              const timeline = document.getElementById('progressTimeline');
              if (!timeline) return;
            
              if (progressEntries.length === 0) {
                  timeline.innerHTML = `
                      <div class="text-center text-gray-500 py-8">
                          <i class="fas fa-chart-line text-4xl mb-4"></i>
                          <p>No progress entries yet. Add your first entry to start tracking!</p>
                      </div>
                  `;
                  return;
              }

              timeline.innerHTML = '';
            
              // Show last 5 entries
              const recentEntries = progressEntries.slice(0, 5);
              const weightUnit = getWeightUnit();
            
              recentEntries.forEach((entry, index) => {
                  const entryDiv = document.createElement('div');
                  entryDiv.className = 'flex items-start space-x-3 pb-3 mb-3 border-b border-gray-200 last:border-b-0';
                
                  const weightChange = index < progressEntries.length - 1 ? 
                      entry.weight - progressEntries[index + 1].weight : 0;
                
                  const changeColor = weightChange > 0 ? 'text-red-500' : weightChange < 0 ? 'text-green-500' : 'text-gray-500';
                  const changeIcon = weightChange > 0 ? 'fa-arrow-up' : weightChange < 0 ? 'fa-arrow-down' : 'fa-minus';
                
                  // Handle weight display with proper units
                  let displayWeight = entry.weight;
                  if (currentUnitSystem === 'metric' && entry.weight > 50) {
                      displayWeight = lbsToKg(entry.weight);
                  }
                
                  // Handle change display with proper units
                  let displayChange = weightChange;
                  if (currentUnitSystem === 'metric' && Math.abs(weightChange) > 1) {
                      displayChange = displayChange * 0.453592;
                  }
                
                  entryDiv.innerHTML = `
                      <div class="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                          <i class="fas fa-weight text-blue-600 text-xs"></i>
                      </div>
                      <div class="flex-1 min-w-0">
                          <div class="flex items-center justify-between">
                              <div class="text-sm font-medium text-gray-900">
                                  ${new Date(entry.date).toLocaleDateString('en-US', { 
                                      month: 'short', 
                                      day: 'numeric',
                                      year: 'numeric'
                                  })}
                              </div>
                              <div class="text-sm font-bold text-gray-900">
                                  ${displayWeight.toFixed(1)} ${weightUnit}
                                  ${Math.abs(displayChange) > 0.1 ? `<span class="${changeColor}"><i class="fas ${changeIcon} ml-1"></i></span>` : ''}
                              </div>
                          </div>
                          ${entry.notes ? `<div class="text-xs text-gray-600 mt-1">"${entry.notes}"</div>` : ''}
                          ${entry.measurements && (entry.measurements.waist || entry.measurements.chest || entry.measurements.hips || entry.measurements.arms) ? 
                              `<div class="text-xs text-gray-500 mt-1">
                                  ${entry.measurements.waist ? `W: ${entry.measurements.waist}" ` : ''}
                                  ${entry.measurements.chest ? `C: ${entry.measurements.chest}" ` : ''}
                                  ${entry.measurements.hips ? `H: ${entry.measurements.hips}" ` : ''}
                                  ${entry.measurements.arms ? `A: ${entry.measurements.arms}"` : ''}
                              </div>` : ''}
                      </div>
                  `;
                
                  timeline.appendChild(entryDiv);
              });
          }

          function initializeProgressChart() {
              const ctx = document.getElementById('progressWeightChart');
              if (!ctx) {
                  console.error('Progress chart canvas not found');
                  return;
              }

              // Destroy existing chart first to prevent canvas reuse errors
              if (progressChart) {
                  progressChart.destroy();
                  progressChart = null;
                  console.log('🗑️ Destroyed existing progress chart before reinitializing');
              }

              try {
                  progressChart = new Chart(ctx.getContext('2d'), {
                      type: 'line',
                      data: {
                          labels: [],
                          datasets: [{
                              label: 'Weight (' + getWeightUnit() + ')',
                              data: [],
                              borderColor: '#3b82f6',
                              backgroundColor: 'rgba(59, 130, 246, 0.1)',
                              borderWidth: 3,
                              fill: true,
                              tension: 0.4,
                              pointBackgroundColor: '#3b82f6',
                              pointBorderColor: '#ffffff',
                              pointBorderWidth: 2,
                              pointRadius: 6
                          }]
                      },
                      options: {
                          responsive: true,
                          maintainAspectRatio: false,
                          plugins: {
                              legend: {
                                  display: true,
                                  position: 'top'
                              },
                              tooltip: {
                                  mode: 'index',
                                  intersect: false
                              }
                          },
                          interaction: {
                              mode: 'nearest',
                              axis: 'x',
                              intersect: false
                          },
                          scales: {
                              y: {
                                  beginAtZero: false,
                                  grid: {
                                      color: 'rgba(0,0,0,0.1)'
                                  },
                                  ticks: {
                                      callback: function(value) {
                                          return value.toFixed(1) + ' ' + getWeightUnit();
                                      }
                                  }
                              },
                              x: {
                                  grid: {
                                      color: 'rgba(0,0,0,0.1)'
                                  }
                              }
                          }
                      }
                  });
                
                  console.log('Progress chart initialized successfully');
                  updateProgressChart();
              } catch (error) {
                  console.error('Error initializing progress chart:', error);
              }
          }

          function updateProgressChart() {
              if (!progressChart) {
                  console.warn('Progress chart not initialized');
                  return;
              }
            
              if (progressEntries.length === 0) {
                  // Show empty chart with message
                  progressChart.data.labels = ['No Data'];
                  progressChart.data.datasets[0].data = [];
                  progressChart.update();
                  return;
              }

              try {
                  // Reverse data for chronological order in chart
                  const chronologicalData = [...progressEntries].reverse();
                
                  const labels = chronologicalData.map(entry => 
                      new Date(entry.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                  );
                
                  // Convert weights for display if needed
                  const data = chronologicalData.map(entry => {
                      let displayWeight = entry.weight;
                      if (currentUnitSystem === 'metric' && entry.weight > 50) {
                          displayWeight = lbsToKg(entry.weight);
                      }
                      return parseFloat(displayWeight.toFixed(1));
                  });
                
                  progressChart.data.labels = labels;
                  progressChart.data.datasets[0].data = data;
                  progressChart.data.datasets[0].label = 'Weight (' + getWeightUnit() + ')';
                  progressChart.update('none'); // Use 'none' for immediate update
                
                  console.log('Progress chart updated with', data.length, 'data points');
              } catch (error) {
                  console.error('Error updating progress chart:', error);
              }
          }

          // Toggle progress export dropdown
          // Simple PDF Export Function
          function exportProgressPDF() {
              try {
                  console.log('🔄 Starting PDF export...');
                
                  // Get progress entries safely
                  const entries = getProgressEntries();
                  if (!entries || entries.length === 0) {
                      showNotification('No Data', 'No progress data to export. Please add some progress entries first.', 'info');
                      return;
                  }
                
                  // Generate PDF
                  generateSimplePDF(entries);
                  showNotification('Success', 'PDF report exported successfully!', 'success');
                
              } catch (error) {
                  console.error('❌ PDF export failed:', error);
                  showNotification('Export Failed', 'Unable to export PDF: ' + error.message, 'error');
              }
          }

          // Simple CSV Export Function  
          function exportProgressCSV() {
              try {
                  console.log('🔄 Starting CSV export...');
                
                  // Get progress entries safely
                  const entries = getProgressEntries();
                  if (!entries || entries.length === 0) {
                      showNotification('No Data', 'No progress data to export. Please add some progress entries first.', 'info');
                      return;
                  }
                
                  // Generate CSV
                  const csvContent = generateSimpleCSV(entries);
                  const dateStr = new Date().toISOString().split('T')[0];
                  downloadFile(csvContent, `Progress-Data-${dateStr}.csv`, 'text/csv;charset=utf-8;');
                  showNotification('Success', 'CSV data exported successfully!', 'success');
                
              } catch (error) {
                  console.error('❌ CSV export failed:', error);
                  showNotification('Export Failed', 'Unable to export CSV: ' + error.message, 'error');
              }
          }

          // Safe function to get progress entries
          function getProgressEntries() {
              try {
                  // Ensure progressEntries exists and is an array
                  if (typeof progressEntries === 'undefined' || !progressEntries) {
                      console.log('⚠️ progressEntries not found, trying to load from localStorage');
                      const stored = localStorage.getItem('progressEntries');
                      if (stored) {
                          return JSON.parse(stored);
                      }
                      return [];
                  }
                
                  if (!Array.isArray(progressEntries)) {
                      console.warn('⚠️ progressEntries is not an array, converting');
                      return [];
                  }
                
                  // Filter for valid entries only
                  return progressEntries.filter(entry => entry && typeof entry === 'object' && entry.date);
                
              } catch (error) {
                  console.error('❌ Error getting progress entries:', error);
                  return [];
              }
          }

          function exportProgressData(format = 'pdf') {
              try {
                  // Ensure progressEntries is properly initialized
                  ensureProgressEntriesInitialized();
                
                  // Debug log to check progressEntries state
                  console.log('Export called - progressEntries:', progressEntries);
                
                  // Check if progressEntries exists and has data
                  if (!progressEntries || !Array.isArray(progressEntries) || progressEntries.length === 0) {
                      console.warn('No progress entries available for export');
                      showNotification('No Data', 'No progress data to export. Please add some progress entries first.', 'info');
                      return;
                  }
                
                  console.log(`Exporting ${progressEntries.length} progress entries in ${format} format`);

              // Close dropdown
              document.getElementById('progressExportDropdown').classList.add('hidden');
            
              const dateStr = new Date().toISOString().split('T')[0];
              const totalEntries = progressEntries.length;
            
              // Calculate progress statistics
              console.log('🔍 About to calculate progress statistics...');
              const stats = calculateProgressStatistics();
              console.log('🔍 Calculated stats result:', stats);
            
              switch (format.toLowerCase()) {
                  case 'pdf':
                      generateProgressReportPDF(stats, dateStr);
                      showNotification('Success', `Professional progress report (PDF) exported! ${totalEntries} entries with charts included.`, 'success');
                      break;
                    
                  case 'csv':
                      const csvContent = generateProgressCSV(stats);
                      if (csvContent) {
                          downloadFile(csvContent, `NutriTracker-ProgressData-${dateStr}.csv`, 'text/csv;charset=utf-8;');
                          const entriesText = totalEntries > 0 ? `${totalEntries} entries` : 'empty template';
                          showNotification('Success', `Progress data exported to CSV! ${entriesText} ready for spreadsheet analysis.`, 'success');
                      } else {
                          showNotification('Export Failed', 'Unable to generate CSV file. Please try again.', 'error');
                      }
                      break;
                    
                  case 'xlsx':
                      generateProgressExcel(stats, dateStr);
                      const excelEntriesText = totalEntries > 0 ? `${totalEntries} entries with multiple sheets and charts` : 'empty template with instructions';
                      showNotification('Success', `Excel workbook exported! ${excelEntriesText}.`, 'success');
                      break;
                    
                  default:
                      showNotification('Error', 'Invalid export format selected.', 'error');
              }
              } catch (error) {
                  console.error('Error in exportProgressData:', error);
                  showNotification('Export Failed', 'An error occurred while exporting progress data: ' + error.message, 'error');
              }
          }

          // Calculate comprehensive progress statistics
          function calculateProgressStatistics() {
              console.log('Calculating progress statistics - progressEntries:', progressEntries);
              console.log('🔍 progressEntries type:', typeof progressEntries, 'isArray:', Array.isArray(progressEntries));
            
              // Ensure progressEntries is initialized
              if (!progressEntries || !Array.isArray(progressEntries)) {
                  console.warn('progressEntries not properly initialized, creating empty array');
                  progressEntries = [];
              }
            
              if (progressEntries.length === 0) {
                  console.warn('No progress entries available for statistics');
                  return {
                      entries: [],
                      goal: progressGoal,
                      totalEntries: 0,
                      dateRange: null,
                      weight: null,
                      bodyFat: null,
                      muscleMass: null,
                      measurements: null
                  };
              }
            
              // Filter out invalid entries and sort by date
              const validEntries = progressEntries.filter(entry => entry && entry.date);
            
              if (validEntries.length === 0) {
                  console.warn('No valid progress entries found for statistics');
                  return {
                      entries: [],
                      goal: progressGoal,
                      totalEntries: 0,
                      dateRange: null,
                      weight: null,
                      bodyFat: null,
                      muscleMass: null,
                      measurements: null
                  };
              }
            
              const sortedEntries = [...validEntries].sort((a, b) => new Date(a.date) - new Date(b.date));
            
              const stats = {
                  entries: sortedEntries,
                  goal: progressGoal,
                  totalEntries: sortedEntries.length,
                  dateRange: {
                      start: sortedEntries[0].date,
                      end: sortedEntries[sortedEntries.length - 1].date
                  }
              };
            
              // Calculate weight statistics
              const weightEntries = sortedEntries.filter(entry => entry && entry.weight && !isNaN(parseFloat(entry.weight)));
              if (weightEntries.length > 0) {
                  const weights = weightEntries.map(entry => parseFloat(entry.weight));
                  const weightTrendData = weightEntries.map(entry => ({ 
                      date: entry.date, 
                      value: parseFloat(entry.weight) 
                  })).filter(item => item.date && !isNaN(item.value));
                
                  stats.weight = {
                      current: weights[weights.length - 1],
                      initial: weights[0],
                      min: Math.min(...weights),
                      max: Math.max(...weights),
                      average: weights.reduce((a, b) => a + b, 0) / weights.length,
                      change: weights[weights.length - 1] - weights[0],
                      trend: calculateTrend(weightTrendData)
                  };
              }
            
              // Calculate body fat statistics  
              const bodyFatEntries = sortedEntries.filter(entry => entry && entry.bodyFat && !isNaN(parseFloat(entry.bodyFat)));
              if (bodyFatEntries.length > 0) {
                  const bodyFats = bodyFatEntries.map(entry => parseFloat(entry.bodyFat));
                  const bodyFatTrendData = bodyFatEntries.map(entry => ({ 
                      date: entry.date, 
                      value: parseFloat(entry.bodyFat) 
                  })).filter(item => item.date && !isNaN(item.value));
                
                  stats.bodyFat = {
                      current: bodyFats[bodyFats.length - 1],
                      initial: bodyFats[0],
                      min: Math.min(...bodyFats),
                      max: Math.max(...bodyFats),
                      average: bodyFats.reduce((a, b) => a + b, 0) / bodyFats.length,
                      change: bodyFats[bodyFats.length - 1] - bodyFats[0],
                      trend: calculateTrend(bodyFatTrendData)
                  };
              }
            
              // Calculate muscle mass statistics
              // Calculate muscle mass statistics
              const muscleMassEntries = sortedEntries.filter(entry => entry && entry.muscleMass && !isNaN(parseFloat(entry.muscleMass)));
              if (muscleMassEntries.length > 0) {
                  const muscleMasses = muscleMassEntries.map(entry => parseFloat(entry.muscleMass));
                  const muscleMassTrendData = muscleMassEntries.map(entry => ({ 
                      date: entry.date, 
                      value: parseFloat(entry.muscleMass) 
                  })).filter(item => item.date && !isNaN(item.value));
                
                  stats.muscleMass = {
                      current: muscleMasses[muscleMasses.length - 1],
                      initial: muscleMasses[0],
                      min: Math.min(...muscleMasses),
                      max: Math.max(...muscleMasses),
                      average: muscleMasses.reduce((a, b) => a + b, 0) / muscleMasses.length,
                      change: muscleMasses[muscleMasses.length - 1] - muscleMasses[0],
                      trend: calculateTrend(muscleMassTrendData)
                  };
              }
            
              return stats;
          }

          // Calculate trend (positive = increasing, negative = decreasing)
          function calculateTrend(dataPoints) {
              if (!dataPoints || !Array.isArray(dataPoints) || dataPoints.length < 2) {
                  console.warn('Invalid dataPoints for trend calculation:', dataPoints);
                  return 0;
              }
            
              const n = dataPoints.length;
              let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
            
              dataPoints.forEach((point, index) => {
                  sumX += index;
                  sumY += point.value;
                  sumXY += index * point.value;
                  sumX2 += index * index;
              });
            
              // Calculate slope (trend)
              return (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
          }

          // Generate professional PDF report with charts
          // Simple, reliable PDF generation
          function generateSimplePDF(entries) {
              console.log('📄 Generating PDF with', entries.length, 'entries');
            
              // Check if jsPDF is available - look for it in different locations
              let jsPDF;
              if (window.jspdf && window.jspdf.jsPDF) {
                  jsPDF = window.jspdf.jsPDF;
              } else if (window.jsPDF) {
                  jsPDF = window.jsPDF;
              } else {
                  console.error('❌ jsPDF library not found');
                  showNotification('Error', 'PDF library not available. Please refresh the page and try again.', 'error');
                  return;
              }
            
              console.log('🔧 Creating jsPDF instance...');
              const doc = new jsPDF();
            
              // Colors
              const primaryColor = [16, 185, 129]; // Green
              const secondaryColor = [107, 114, 128]; // Gray
              const textColor = [0, 0, 0]; // Black
            
              let yPos = 30;
            
              // Header
              doc.setFontSize(24);
              doc.setTextColor(...primaryColor);
              doc.text('NutriTracker Progress Report', 20, yPos);
            
              // Subtitle
              yPos += 15;
              doc.setFontSize(14);
              doc.setTextColor(...secondaryColor);
              doc.text(`Generated on ${new Date().toLocaleDateString()}`, 20, yPos);
            
              // Summary
              yPos += 20;
              doc.setFontSize(16);
              doc.setTextColor(...textColor);
              doc.text('Progress Summary', 20, yPos);
            
              yPos += 15;
              doc.setFontSize(12);
              doc.setTextColor(...secondaryColor);
              doc.text(`Total Entries: ${entries.length}`, 25, yPos);
            
              if (entries.length > 0) {
                  yPos += 8;
                  const startDate = new Date(entries[0].date).toLocaleDateString();
                  const endDate = new Date(entries[entries.length - 1].date).toLocaleDateString();
                  doc.text(`Period: ${startDate} - ${endDate}`, 25, yPos);
              }
            
              // Data Table
              yPos += 25;
              doc.setFontSize(14);
              doc.setTextColor(...textColor);
              doc.text('Progress Entries', 20, yPos);
            
              // Table headers
              yPos += 15;
              doc.setFontSize(10);
              doc.setTextColor(...textColor);
              doc.text('Date', 25, yPos);
              doc.text('Weight', 65, yPos);
              doc.text('Waist', 95, yPos);
              doc.text('Chest', 125, yPos);
              doc.text('Hips', 155, yPos);
              doc.text('Arms', 180, yPos);
            
              // Table data
              entries.forEach((entry, index) => {
                  yPos += 12;
                
                  // Check if we need a new page
                  if (yPos > 270) {
                      doc.addPage();
                      yPos = 30;
                  }
                
                  doc.setTextColor(...secondaryColor);
                  doc.text(new Date(entry.date).toLocaleDateString(), 25, yPos);
                  doc.text(entry.weight ? `${entry.weight} kg` : '--', 65, yPos);
                  doc.text(entry.waist ? `${entry.waist} cm` : '--', 95, yPos);
                  doc.text(entry.chest ? `${entry.chest} cm` : '--', 125, yPos);
                  doc.text(entry.hips ? `${entry.hips} cm` : '--', 155, yPos);
                  doc.text(entry.arms ? `${entry.arms} cm` : '--', 180, yPos);
              });
            
              // Footer
              const pageCount = doc.internal.getNumberOfPages();
              for (let i = 1; i <= pageCount; i++) {
                  doc.setPage(i);
                  doc.setFontSize(8);
                  doc.setTextColor(...secondaryColor);
                  doc.text(`Page ${i} of ${pageCount}`, 170, 285);
                  doc.text('Generated by NutriTracker Pro', 20, 285);
              }
            
              // Save
              const dateStr = new Date().toISOString().split('T')[0];
              const filename = `Progress-Report-${dateStr}.pdf`;
              console.log('💾 Attempting to download PDF:', filename);
            
              try {
                  doc.save(filename);
                  console.log('✅ PDF download initiated successfully');
              } catch (error) {
                  console.error('❌ PDF save failed:', error);
                  showNotification('Download Failed', 'Failed to download PDF: ' + error.message, 'error');
              }
          }

          function generateProgressReportPDF(stats, dateStr) {
              // Check if stats exists
              if (!stats) {
                  console.error('No stats object provided for PDF generation');
                  showNotification('Export Failed', 'Unable to generate PDF report. Please try again.', 'error');
                  return;
              }
            
              // Handle case with no entries - create a report showing empty state
              const hasEntries = stats.entries && stats.entries.length > 0;
            
              // Check if jsPDF is available
              if (typeof window.jsPDF === 'undefined') {
                  const script = document.createElement('script');
                  script.src = 'https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js';
                  script.onload = () => generateProgressReportPDF(stats, dateStr);
                  document.head.appendChild(script);
                  return;
              }

              const { jsPDF } = window;
              const doc = new jsPDF();
            
              // Set up fonts and colors
              doc.setFont('helvetica');
              const primaryColor = [16, 185, 129]; // Green
              const secondaryColor = [107, 114, 128]; // Gray
            
              let yPos = 30;
            
              // Header Section
              doc.setFontSize(22);
              doc.setTextColor(...primaryColor);
              doc.text('NutriTracker Pro', 20, yPos);
            
              doc.setFontSize(18);
              doc.setTextColor(0, 0, 0);
              yPos += 15;
              doc.text('Progress Tracking Report', 20, yPos);
            
              // Report Info
              doc.setFontSize(11);
              doc.setTextColor(...secondaryColor);
              yPos += 20;
              doc.text(`Generated: ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}`, 20, yPos);
              yPos += 8;
            
              if (hasEntries && stats.dateRange && stats.dateRange.start && stats.dateRange.end) {
                  doc.text(`Tracking Period: ${new Date(stats.dateRange.start).toLocaleDateString()} - ${new Date(stats.dateRange.end).toLocaleDateString()}`, 20, yPos);
                  yPos += 8;
              } else if (!hasEntries) {
                  doc.text('Tracking Period: No data recorded yet', 20, yPos);
                  yPos += 8;
              }
            
              doc.text(`Total Entries: ${stats.totalEntries || 0}`, 20, yPos);
            
              // Goal Information
              yPos += 20;
              doc.setFontSize(14);
              doc.setTextColor(0, 0, 0);
              doc.text('FITNESS GOALS', 20, yPos);
            
              doc.setFontSize(10);
              doc.setTextColor(...secondaryColor);
              yPos += 15;
              if (stats.goal && stats.goal.targetWeight) {
                  doc.text(`Target Weight: ${stats.goal.targetWeight} ${stats.goal.weightUnit || 'lbs'}`, 25, yPos);
                  yPos += 8;
              }
              if (stats.goal && stats.goal.targetDate) {
                  doc.text(`Target Date: ${new Date(stats.goal.targetDate).toLocaleDateString()}`, 25, yPos);
                  yPos += 8;
              }
            
              // Progress Summary
              yPos += 15;
              doc.setFontSize(14);
              doc.setTextColor(0, 0, 0);
              doc.text('PROGRESS SUMMARY', 20, yPos);
            
              yPos += 15;
              doc.setFontSize(10);
            
              if (!hasEntries) {
                  // Show empty state message
                  doc.setTextColor(...secondaryColor);
                  doc.text('No progress entries recorded yet.', 25, yPos);
                  yPos += 8;
                  doc.text('Start tracking your progress by adding entries in the app!', 25, yPos);
                  yPos += 20;
              } else {
                  // Weight Progress
                  if (stats.weight) {
                  const weightChange = stats.weight.change;
                  const changeColor = weightChange >= 0 ? [34, 197, 94] : [239, 68, 68]; // Green for gain, Red for loss
                
                  doc.setTextColor(0, 0, 0);
                  doc.text('Weight Progress:', 25, yPos);
                  yPos += 8;
                
                  doc.text(`• Initial: ${stats.weight.initial.toFixed(1)} lbs`, 30, yPos);
                  yPos += 6;
                  doc.text(`• Current: ${stats.weight.current.toFixed(1)} lbs`, 30, yPos);
                  yPos += 6;
                
                  doc.setTextColor(...changeColor);
                  doc.text(`• Change: ${weightChange > 0 ? '+' : ''}${weightChange.toFixed(1)} lbs`, 30, yPos);
                  yPos += 6;
                
                  doc.setTextColor(...secondaryColor);
                  doc.text(`• Trend: ${stats.weight.trend > 0 ? 'Increasing' : stats.weight.trend < 0 ? 'Decreasing' : 'Stable'}`, 30, yPos);
                  yPos += 10;
              }
            
              // Body Fat Progress
              if (stats.bodyFat) {
                  doc.setTextColor(0, 0, 0);
                  doc.text('Body Fat Progress:', 25, yPos);
                  yPos += 8;
                
                  doc.setTextColor(...secondaryColor);
                  doc.text(`• Initial: ${stats.bodyFat.initial.toFixed(1)}%`, 30, yPos);
                  yPos += 6;
                  doc.text(`• Current: ${stats.bodyFat.current.toFixed(1)}%`, 30, yPos);
                  yPos += 6;
                  doc.text(`• Change: ${stats.bodyFat.change > 0 ? '+' : ''}${stats.bodyFat.change.toFixed(1)}%`, 30, yPos);
                  yPos += 10;
              }
            
              // Muscle Mass Progress
              if (stats.muscleMass) {
                  doc.setTextColor(0, 0, 0);
                  doc.text('Muscle Mass Progress:', 25, yPos);
                  yPos += 8;
                
                  doc.setTextColor(...secondaryColor);
                  doc.text(`• Initial: ${stats.muscleMass.initial.toFixed(1)} lbs`, 30, yPos);
                  yPos += 6;
                  doc.text(`• Current: ${stats.muscleMass.current.toFixed(1)} lbs`, 30, yPos);
                  yPos += 6;
                  doc.text(`• Change: ${stats.muscleMass.change > 0 ? '+' : ''}${stats.muscleMass.change.toFixed(1)} lbs`, 30, yPos);
                  yPos += 10;
              }
            
              // Add new page for data table
              doc.addPage();
              yPos = 30;
            
              // Data Table Header
              doc.setFontSize(14);
              doc.setTextColor(0, 0, 0);
              doc.text('DETAILED PROGRESS DATA', 20, yPos);
            
              yPos += 20;
              doc.setFontSize(9);
            
              // Table Headers
              doc.setTextColor(...primaryColor);
              doc.text('Date', 25, yPos);
              doc.text('Weight', 55, yPos);
              doc.text('Body Fat %', 85, yPos);
              doc.text('Muscle Mass', 120, yPos);
              doc.text('Notes', 155, yPos);
            
              yPos += 8;
            
              // Table Data
              doc.setTextColor(0, 0, 0);
              stats.entries.forEach(entry => {
                  if (yPos > 270) {
                      doc.addPage();
                      yPos = 30;
                  }
                
                  doc.text(new Date(entry.date).toLocaleDateString(), 25, yPos);
                  doc.text(entry.weight ? `${entry.weight} lbs` : '-', 55, yPos);
                  doc.text(entry.bodyFat ? `${entry.bodyFat}%` : '-', 85, yPos);
                  doc.text(entry.muscleMass ? `${entry.muscleMass} lbs` : '-', 120, yPos);
                  doc.text(entry.notes ? entry.notes.substring(0, 20) + '...' : '-', 155, yPos);
                
                  yPos += 7;
              });
            
              // Footer
              const pageCount = doc.internal.getNumberOfPages();
              for (let i = 1; i <= pageCount; i++) {
                  doc.setPage(i);
                  doc.setFontSize(8);
                  doc.setTextColor(...secondaryColor);
                  doc.text(`Page ${i} of ${pageCount}`, 170, 285);
                  doc.text('Generated by NutriTracker Pro - Transform your nutrition, transform your life!', 20, 285);
              }
            
              } // Close the else block for hasEntries
            
              // Save PDF
              doc.save(`NutriTracker-ProgressReport-${dateStr}.pdf`);
          }

          // Simple, reliable CSV generation
          function generateSimpleCSV(entries) {
              try {
                  let csv = 'Date,Weight (kg),Waist (cm),Chest (cm),Hips (cm),Arms (cm),Notes\n';
                
                  entries.forEach(entry => {
                      const date = entry.date ? new Date(entry.date).toLocaleDateString() : '';
                      const weight = entry.weight || '';
                      const waist = entry.waist || '';
                      const chest = entry.chest || '';
                      const hips = entry.hips || '';
                      const arms = entry.arms || '';
                      const notes = entry.notes ? `"${entry.notes.replace(/"/g, '""')}"` : '';
                    
                      csv += `${date},${weight},${waist},${chest},${hips},${arms},${notes}\n`;
                  });
                
                  return csv;
                
              } catch (error) {
                  console.error('❌ CSV generation error:', error);
                  return 'Date,Weight (kg),Waist (cm),Chest (cm),Hips (cm),Arms (cm),Notes\n# Error generating CSV data\n';
              }
          }

          // Generate CSV format
          function generateProgressCSV(stats) {
              try {
                  if (!stats || !stats.entries || !Array.isArray(stats.entries) || stats.entries.length === 0) {
                      console.warn('No progress data available for CSV generation');
                      // Return CSV with headers only
                      return 'Date,Weight (lbs),Body Fat (%),Muscle Mass (lbs),Notes\n# No progress entries recorded yet\n# Start tracking your progress in the app!';
                  }
                
                  let csv = 'Date,Weight (lbs),Body Fat (%),Muscle Mass (lbs),Notes\\n';
                
                  stats.entries.forEach(entry => {
                      if (entry && entry.date) {
                          const date = new Date(entry.date).toLocaleDateString();
                          const weight = entry.weight || '';
                          const bodyFat = entry.bodyFat || '';
                          const muscleMass = entry.muscleMass || '';
                          const notes = entry.notes ? `"${entry.notes.replace(/"/g, '""')}"` : '';
                        
                          csv += `${date},${weight},${bodyFat},${muscleMass},${notes}\\n`;
                      }
                  });
                
                  return csv;
              } catch (error) {
                  console.error('Error generating CSV:', error);
                  return null;
              }
          }

          // Generate Excel format
          function generateProgressExcel(stats, dateStr) {
              try {
                  if (!stats) {
                      console.error('No stats object provided for Excel generation');
                      showNotification('Error', 'Cannot generate Excel file - no data available', 'error');
                      return;
                  }
                
                  const hasEntries = stats.entries && Array.isArray(stats.entries) && stats.entries.length > 0;
                
                  // Generate enhanced CSV with additional statistics
                  let content = 'NutriTracker Pro - Progress Report\\n';
                  content += `Generated: ${new Date().toLocaleDateString()}\\n`;
                
                  if (hasEntries && stats.dateRange && stats.dateRange.start && stats.dateRange.end) {
                      content += `Period: ${new Date(stats.dateRange.start).toLocaleDateString()} - ${new Date(stats.dateRange.end).toLocaleDateString()}\\n\\n`;
                  } else {
                      content += 'Period: No data recorded yet\\n\\n';
                  }
                
                  if (!hasEntries) {
                      content += 'No progress entries recorded yet.\\n';
                      content += 'Start tracking your progress in the app!\\n\\n';
                      content += `Total Entries: ${stats.totalEntries || 0}\\n\\n`;
                  }
                
                  // Summary statistics
                  content += 'SUMMARY STATISTICS\\n';
                  if (stats.weight) {
                      content += `Weight Change: ${stats.weight.change ? stats.weight.change.toFixed(1) : 'N/A'} lbs\\n`;
                      content += `Weight Average: ${stats.weight.average ? stats.weight.average.toFixed(1) : 'N/A'} lbs\\n`;
                  }
                  if (stats.bodyFat) {
                      content += `Body Fat Change: ${stats.bodyFat.change ? stats.bodyFat.change.toFixed(1) : 'N/A'}%\\n`;
                  }
                  if (stats.muscleMass) {
                      content += `Muscle Mass Change: ${stats.muscleMass.change ? stats.muscleMass.change.toFixed(1) : 'N/A'} lbs\\n`;
                  }
                  content += '\\n';
                
                  // Data table
                  content += 'DETAILED DATA\\n';
                  const csvData = generateProgressCSV(stats);
                  if (csvData) {
                      content += csvData;
                  } else {
                      content += 'No detailed data available\\n';
                  }
                
                  downloadFile(content, `NutriTracker-ProgressData-${dateStr}.xlsx`, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
              } catch (error) {
                  console.error('Error generating Excel file:', error);
                  showNotification('Error', 'Failed to generate Excel file: ' + error.message, 'error');
              }
          }

          // Helper function to download files
          function downloadFile(content, filename, mimeType) {
              try {
                  if (!content) {
                      throw new Error('No content provided for download');
                  }
                
                  const blob = new Blob([content], { type: mimeType });
                  const link = document.createElement('a');
                  const url = URL.createObjectURL(blob);
                  link.setAttribute('href', url);
                  link.setAttribute('download', filename);
                  link.style.visibility = 'hidden';
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                
                  // Clean up the URL object
                  setTimeout(() => URL.revokeObjectURL(url), 100);
              } catch (error) {
                  console.error('Error downloading file:', error);
                  showNotification('Error', 'Failed to download file: ' + error.message, 'error');
              }
          }

          function clearAllProgressData() {
              showConfirmDialog(
                  'Clear All Progress Data',
                  'Are you sure you want to delete all progress entries and goals? This action cannot be undone.',
                  () => {
                      const count = progressEntries.length;
                      progressEntries = [];
                      progressGoal = null;
                    
                      // Clear goal form
                      const targetWeightEl = document.getElementById('targetWeight');
                      const targetDateEl = document.getElementById('targetDate');
                      if (targetWeightEl) targetWeightEl.value = '';
                      if (targetDateEl) targetDateEl.value = '';
                    
                      saveProgressData();
                      updateProgressDisplay();
                      updateProgressChart();
                      showNotification('All Progress Data Cleared', `${count} progress entries, recent timeline, and latest measurements have been cleared`, 'success');
                  }
              );
          }

          function saveProgressData() {
              try {
                  // Primary storage
                  localStorage.setItem('progressEntries', JSON.stringify(progressEntries));
                  localStorage.setItem('progressGoal', JSON.stringify(progressGoal));
                
                  // Backup storage with timestamp
                  const backupData = {
                      entries: progressEntries,
                      goal: progressGoal,
                      timestamp: Date.now(),
                      version: '1.0'
                  };
                  localStorage.setItem('progressData_backup', JSON.stringify(backupData));
                
                  // Multiple storage keys for redundancy
                  localStorage.setItem('progress_entries_v2', JSON.stringify(progressEntries));
                  localStorage.setItem('progress_goal_v2', JSON.stringify(progressGoal));
                
                  console.log('Progress data saved successfully:', {
                      entries: progressEntries.length,
                      goal: progressGoal ? 'Set' : 'None',
                      timestamp: new Date().toISOString()
                  });
              } catch (error) {
                  console.error('Error saving progress data:', error);
                  showNotification('Save Error', 'Failed to save progress data. Please try again.', 'error');
              }
          }

          async function loadProgressData() {
              console.log('Loading progress data...');
            
              try {
                  // Try multiple storage sources in order of preference
                  let loadedEntries = false;
                  let loadedGoal = false;
                
                  // 0. Try database first (highest priority)
                  try {
                      console.log('🔄 Loading progress data from database...');
                    
                      // Load progress entries from database
                      const dbEntries = await loadProgressEntries();
                      if (dbEntries && dbEntries.length > 0) {
                          progressEntries = dbEntries;
                          loadedEntries = true;
                          console.log('✅ Loaded from database:', progressEntries.length, 'entries');
                      }
                    
                      // Load progress goal from database
                      const dbGoal = await loadProgressGoalFromDB();
                      if (dbGoal) {
                          progressGoal = dbGoal;
                          loadedGoal = true;
                          console.log('✅ Loaded goal from database');
                      }
                  } catch (dbError) {
                      console.warn('⚠️ Database loading failed, using localStorage fallback:', dbError.message);
                  }
                
                  // 1. Try primary storage
                  const savedEntries = localStorage.getItem('progressEntries');
                  const savedGoal = localStorage.getItem('progressGoal');
                
                  if (savedEntries && savedEntries !== 'null') {
                      const parsed = JSON.parse(savedEntries);
                      if (Array.isArray(parsed) && parsed.length > 0) {
                          progressEntries = parsed;
                          loadedEntries = true;
                          console.log('Loaded from primary storage:', progressEntries.length, 'entries');
                      }
                  }
                
                  // 2. Try backup storage if primary failed
                  if (!loadedEntries) {
                      const backupData = localStorage.getItem('progressData_backup');
                      if (backupData) {
                          const backup = JSON.parse(backupData);
                          if (backup.entries && Array.isArray(backup.entries)) {
                              progressEntries = backup.entries;
                              loadedEntries = true;
                              console.log('Loaded from backup storage:', progressEntries.length, 'entries');
                          }
                          if (backup.goal && !loadedGoal) {
                              progressGoal = backup.goal;
                              loadedGoal = true;
                          }
                      }
                  }
                
                  // 3. Try v2 storage if others failed
                  if (!loadedEntries) {
                      const v2Entries = localStorage.getItem('progress_entries_v2');
                      if (v2Entries) {
                          const parsed = JSON.parse(v2Entries);
                          if (Array.isArray(parsed)) {
                              progressEntries = parsed;
                              loadedEntries = true;
                              console.log('Loaded from v2 storage:', progressEntries.length, 'entries');
                          }
                      }
                  }
                
                  // Load goal if not loaded from backup
                  if (!loadedGoal && savedGoal && savedGoal !== 'null') {
                      const parsed = JSON.parse(savedGoal);
                      if (parsed && typeof parsed === 'object') {
                          progressGoal = parsed;
                          loadedGoal = true;
                          console.log('Loaded goal from primary storage');
                      }
                  }
                
                  // Try v2 goal storage
                  if (!loadedGoal) {
                      const v2Goal = localStorage.getItem('progress_goal_v2');
                      if (v2Goal && v2Goal !== 'null') {
                          const parsed = JSON.parse(v2Goal);
                          if (parsed && typeof parsed === 'object') {
                              progressGoal = parsed;
                              loadedGoal = true;
                              console.log('Loaded goal from v2 storage');
                          }
                      }
                  }
                
                  // Ensure data integrity
                  if (progressEntries && progressEntries.length > 0) {
                      // Ensure data is sorted by date (newest first)
                      progressEntries.sort((a, b) => new Date(b.date) - new Date(a.date));
                    
                      // Validate data structure
                      progressEntries = progressEntries.filter(entry => {
                          return entry && entry.date && entry.weight && !isNaN(entry.weight);
                      });
                    
                      console.log('Progress entries validated:', progressEntries.length, 'valid entries');
                  }
                
                  // Populate goal form fields after DOM is ready
                  setTimeout(() => {
                      if (progressGoal) {
                          const targetWeightEl = document.getElementById('targetWeight');
                          const targetDateEl = document.getElementById('targetDate');
                          if (targetWeightEl && progressGoal.targetWeight) {
                              targetWeightEl.value = progressGoal.targetWeight;
                              console.log('Populated target weight:', progressGoal.targetWeight);
                          }
                          if (targetDateEl && progressGoal.targetDate) {
                              targetDateEl.value = progressGoal.targetDate;
                              console.log('Populated target date:', progressGoal.targetDate);
                          }
                      }
                  }, 200);
                
                  console.log('Progress data loading complete:', {
                      entries: progressEntries.length,
                      goal: progressGoal ? 'Loaded' : 'None'
                  });
                
              } catch (error) {
                  console.error('Error loading progress data:', error);
                  progressEntries = [];
                  progressGoal = null;
                  showNotification('Load Error', 'Some progress data may not have loaded correctly', 'warning');
              }
          }

          // Helper function to update elements safely
          function updateElement(id, value) {
              const element = document.getElementById(id);
              if (element) {
                  element.textContent = value;
              }
          }
        
          // Helper function to refresh progress display
          function refreshProgressDisplay() {
              if (progressEntries && progressEntries.length > 0) {
                  updateProgressDisplay();
                  if (progressChart) {
                      updateProgressChart();
                  }
              }
          }
        
          // Auto-save mechanism
          function setupAutoSave() {
              // Save all data every 30 seconds as backup
              setInterval(() => {
                  // Save progress data
                  if (progressEntries.length > 0 || progressGoal) {
                      saveProgressData();
                  }
                
                  // Save macro tracking data
                  if (meals.length > 0 || currentIntake.protein > 0 || currentIntake.carbs > 0 || currentIntake.fat > 0) {
                      saveData();
                      saveDailyMacros().catch(error => console.error('Error saving daily macros:', error));
                  }
                
                  // Save meal plan data
                  saveMealPlan().catch(error => console.warn('Meal plan save error:', error));
                
                  console.log('Auto-save completed at', new Date().toLocaleTimeString());
              }, 30000); // 30 seconds
          }
        
          // Data verification function
          function verifyDataIntegrity() {
              console.log('Verifying data integrity...');
            
              const checks = {
                  progressEntries: progressEntries && Array.isArray(progressEntries) && progressEntries.length >= 0,
                  progressGoal: progressGoal === null || (progressGoal && typeof progressGoal === 'object'),
                  localStorage: typeof localStorage !== 'undefined'
              };
            
              console.log('Data integrity check:', checks);
            
              if (!checks.localStorage) {
                  showNotification('Storage Warning', 'Local storage not available. Data may not persist.', 'warning');
                  return false;
              }
            
              // Verify macro tracking data integrity
              verifyMacroDataIntegrity();
            
              return Object.values(checks).every(Boolean);
          }
        
          function verifyMacroDataIntegrity() {
              console.log('Verifying macro data integrity...', {
                  meals: meals.length,
                  currentIntake: currentIntake,
                  dailyTargets: dailyTargets
              });
            
              // Recalculate currentIntake from meals to ensure consistency
              if (meals && meals.length > 0) {
                  const recalculatedIntake = {
                      protein: meals.reduce((sum, meal) => sum + (meal.protein || 0), 0),
                      carbs: meals.reduce((sum, meal) => sum + (meal.carbs || 0), 0),
                      fat: meals.reduce((sum, meal) => sum + (meal.fat || 0), 0)
                  };
                
                  // If there's a mismatch, fix it
                  if (Math.abs(currentIntake.protein - recalculatedIntake.protein) > 0.1 ||
                      Math.abs(currentIntake.carbs - recalculatedIntake.carbs) > 0.1 ||
                      Math.abs(currentIntake.fat - recalculatedIntake.fat) > 0.1) {
                      console.warn('Macro data integrity issue detected - fixing currentIntake', {
                          stored: currentIntake,
                          calculated: recalculatedIntake
                      });
                      currentIntake = recalculatedIntake;
                      localStorage.setItem('currentIntake', JSON.stringify(currentIntake));
                    
                      // Update displays to reflect correct data
                      updateProgress();
                  }
              }
          }


   function setProgressGoal() {
              const targetWeight = parseFloat(document.getElementById('targetWeight')?.value);
              const targetDate = document.getElementById('targetDate')?.value;

              if (!targetWeight || targetWeight <= 0) {
                  showNotification('Missing Information', 'Please enter a valid target weight', 'warning');
                  return;
              }

              if (!targetDate) {
                  showNotification('Missing Information', 'Please select a target date', 'warning');
                  return;
              }

              const today = new Date();
              const target = new Date(targetDate);
            
              if (target <= today) {
                  showNotification('Invalid Date', 'Target date must be in the future', 'warning');
                  return;
              }

              progressGoal = {
                  targetWeight: targetWeight,
                  targetDate: targetDate,
                  setDate: today.toISOString().split('T')[0]
              };

              try {
                  // Save to database first
                  const dbResult = await saveProgressGoalToDB(progressGoal);
                
                  if (dbResult && !dbResult.fallback) {
                      console.log('✅ Progress goal saved to database:', dbResult);
                  } else {
                      console.log('📱 Progress goal saved to localStorage fallback');
                  }
                
                  // Also save to localStorage for backwards compatibility and offline access
                  saveProgressData();
                
                  // Double-save for critical data
                  setTimeout(() => {
                      saveProgressData();
                  }, 100);
                
                  updateProgressDisplay();
                  showNotification('Goal Set', `Target: ${targetWeight} ${getWeightUnit()} by ${target.toLocaleDateString()}`, 'success');
                
                  console.log('Progress goal saved:', progressGoal);
              } catch (error) {
                  console.error('❌ Error saving progress goal:', error);
                
                  // Fallback to localStorage only
                  saveProgressData();
                  setTimeout(() => {
                      saveProgressData();
                  }, 100);
                
                  updateProgressDisplay();
                  showNotification('Goal Set', `Target: ${targetWeight} ${getWeightUnit()} by ${target.toLocaleDateString()}`, 'success');
                  console.log('Progress goal saved to localStorage fallback:', progressGoal);
              }
          }


   function updateProgressDisplay() {
              // Update quick stats
              if (progressEntries.length > 0) {
                  const latest = progressEntries[0];
                  const oldest = progressEntries[progressEntries.length - 1];
                
                  // Current weight with proper unit
                  const currentWeightEl = document.getElementById('currentWeight');
                  if (currentWeightEl) {
                      const weightUnit = getWeightUnit();
                      let displayWeight = latest.weight;
                      // Convert weight if needed for display
                      if (currentUnitSystem === 'metric' && latest.weight > 50) {
                          // Assume stored weight is in lbs, convert to kg for display
                          displayWeight = lbsToKg(latest.weight);
                      }
                      currentWeightEl.textContent = displayWeight.toFixed(1) + ' ' + weightUnit;
                  }
                
                  // Weight change
                  const weightChangeEl = document.getElementById('weightChange');
                  if (weightChangeEl && progressEntries.length > 1) {
                      let change = latest.weight - oldest.weight;
                      const weightUnit = getWeightUnit();
                      // Convert change if needed for display
                      if (currentUnitSystem === 'metric' && Math.abs(change) > 1) {
                          change = lbsToKg(latest.weight) - lbsToKg(oldest.weight);
                      }
                      const changeText = change >= 0 ? `+${change.toFixed(1)} ${weightUnit}` : `${change.toFixed(1)} ${weightUnit}`;
                      weightChangeEl.textContent = changeText;
                      weightChangeEl.className = `text-xs mt-1 ${change >= 0 ? 'text-red-600' : 'text-green-600'}`;
                  } else if (weightChangeEl) {
                      weightChangeEl.textContent = 'First entry';
                      weightChangeEl.className = 'text-xs mt-1 text-blue-600';
                  }
                
                  // Days tracked
                  const daysSinceEl = document.getElementById('daysSinceStart');
                  if (daysSinceEl) {
                      const daysDiff = Math.max(0, Math.ceil((new Date(latest.date) - new Date(oldest.date)) / (1000 * 60 * 60 * 24)));
                      daysSinceEl.textContent = `${daysDiff} days`;
                  }
                
                  // Latest measurements with proper units
                  const measurements = latest.measurements || {};
                  const waistEl = document.getElementById('latestWaist');
                  const chestEl = document.getElementById('latestChest');
                  const hipsEl = document.getElementById('latestHips');
                  const armsEl = document.getElementById('latestArms');
                
                  const heightUnit = getHeightUnit();
                
                  if (waistEl) {
                      if (measurements.waist) {
                          let displayWaist = measurements.waist;
                          if (currentUnitSystem === 'metric' && measurements.waist < 50) {
                              displayWaist = inToCm(measurements.waist);
                          }
                          waistEl.textContent = displayWaist.toFixed(1);
                      } else {
                          waistEl.textContent = '--';
                      }
                  }
                
                  if (chestEl) {
                      if (measurements.chest) {
                          let displayChest = measurements.chest;
                          if (currentUnitSystem === 'metric' && measurements.chest < 50) {
                              displayChest = inToCm(measurements.chest);
                          }
                          chestEl.textContent = displayChest.toFixed(1);
                      } else {
                          chestEl.textContent = '--';
                      }
                  }
                
                  if (hipsEl) {
                      if (measurements.hips) {
                          let displayHips = measurements.hips;
                          if (currentUnitSystem === 'metric' && measurements.hips < 50) {
                              displayHips = inToCm(measurements.hips);
                          }
                          hipsEl.textContent = displayHips.toFixed(1);
                      } else {
                          hipsEl.textContent = '--';
                      }
                  }
                
                  if (armsEl) {
                      if (measurements.arms) {
                          let displayArms = measurements.arms;
                          if (currentUnitSystem === 'metric' && measurements.arms < 50) {
                              displayArms = inToCm(measurements.arms);
                          }
                          armsEl.textContent = displayArms.toFixed(1);
                      } else {
                          armsEl.textContent = '--';
                      }
                  }
                
                  // Weekly average
                  const weeklyAvgEl = document.getElementById('weeklyAverage');
                  if (weeklyAvgEl && progressEntries.length >= 2) {
                      const recentEntries = progressEntries.slice(0, Math.min(7, progressEntries.length));
                      if (recentEntries.length >= 2) {
                          const weekChange = recentEntries[0].weight - recentEntries[recentEntries.length - 1].weight;
                          const days = Math.max(1, (new Date(recentEntries[0].date) - new Date(recentEntries[recentEntries.length - 1].date)) / (1000 * 60 * 60 * 24));
                          let weekAvg = weekChange / (days / 7);
                        
                          // Convert for display if needed
                          if (currentUnitSystem === 'metric' && Math.abs(weekAvg) > 1) {
                              weekAvg = weekAvg * 0.453592; // Convert lbs to kg
                          }
                        
                          weeklyAvgEl.textContent = (weekAvg >= 0 ? '+' : '') + weekAvg.toFixed(1);
                      } else {
                          weeklyAvgEl.textContent = '--';
                      }
                  } else if (weeklyAvgEl) {
                      weeklyAvgEl.textContent = '--';
                  }
              } else {
                  // No data available - reset all displays
                  const currentWeightEl = document.getElementById('currentWeight');
                  const weightChangeEl = document.getElementById('weightChange');
                  const daysSinceEl = document.getElementById('daysSinceStart');
                  const weeklyAvgEl = document.getElementById('weeklyAverage');
                  const waistEl = document.getElementById('latestWaist');
                  const chestEl = document.getElementById('latestChest');
                  const hipsEl = document.getElementById('latestHips');
                  const armsEl = document.getElementById('latestArms');
                
                  if (currentWeightEl) currentWeightEl.textContent = '--';
                  if (weightChangeEl) {
                      weightChangeEl.textContent = 'No data';
                      weightChangeEl.className = 'text-xs mt-1 text-gray-600';
                  }
                  if (daysSinceEl) daysSinceEl.textContent = '0 days';
                  if (weeklyAvgEl) weeklyAvgEl.textContent = '--';
                  if (waistEl) waistEl.textContent = '--';
                  if (chestEl) chestEl.textContent = '--';
                  if (hipsEl) hipsEl.textContent = '--';
                  if (armsEl) armsEl.textContent = '--';
              }

              // Total entries
              const totalEntriesEl = document.getElementById('totalProgressEntries');
              if (totalEntriesEl) totalEntriesEl.textContent = progressEntries.length;

              // Goal progress
              const goalProgressEl = document.getElementById('goalProgressPercent');
              const goalStatusEl = document.getElementById('goalStatusText');
            
              if (progressGoal && progressEntries.length > 0) {
                  const currentWeight = progressEntries[0].weight;
                  const startWeight = progressEntries[progressEntries.length - 1].weight;
                  const targetWeight = progressGoal.targetWeight;
                
                  const totalChange = Math.abs(targetWeight - startWeight);
                  const currentChange = Math.abs(currentWeight - startWeight);
                  const progress = totalChange > 0 ? Math.min(100, (currentChange / totalChange) * 100) : 0;
                
                  if (goalProgressEl) goalProgressEl.textContent = Math.round(progress) + '%';
                  if (goalStatusEl) goalStatusEl.textContent = `${Math.abs(targetWeight - currentWeight).toFixed(1)} ${getWeightUnit()} to go`;
              } else {
                  if (goalProgressEl) goalProgressEl.textContent = '0%';
                  if (goalStatusEl) goalStatusEl.textContent = 'Set goal';
              }

              updateProgressTimeline();
          }


   function calculateProgressStatistics() {
              console.log('Calculating progress statistics - progressEntries:', progressEntries);
              console.log('🔍 progressEntries type:', typeof progressEntries, 'isArray:', Array.isArray(progressEntries));
            
              // Ensure progressEntries is initialized
              if (!progressEntries || !Array.isArray(progressEntries)) {
                  console.warn('progressEntries not properly initialized, creating empty array');
                  progressEntries = [];
              }
            
              if (progressEntries.length === 0) {
                  console.warn('No progress entries available for statistics');
                  return {
                      entries: [],
                      goal: progressGoal,
                      totalEntries: 0,
                      dateRange: null,
                      weight: null,
                      bodyFat: null,
                      muscleMass: null,
                      measurements: null
                  };
              }
            
              // Filter out invalid entries and sort by date
              const validEntries = progressEntries.filter(entry => entry && entry.date);
            
              if (validEntries.length === 0) {
                  console.warn('No valid progress entries found for statistics');
                  return {
                      entries: [],
                      goal: progressGoal,
                      totalEntries: 0,
                      dateRange: null,
                      weight: null,
                      bodyFat: null,
                      muscleMass: null,
                      measurements: null
                  };
              }
            
              const sortedEntries = [...validEntries].sort((a, b) => new Date(a.date) - new Date(b.date));
            
              const stats = {
                  entries: sortedEntries,
                  goal: progressGoal,
                  totalEntries: sortedEntries.length,
                  dateRange: {
                      start: sortedEntries[0].date,
                      end: sortedEntries[sortedEntries.length - 1].date
                  }
              };
            
              // Calculate weight statistics
              const weightEntries = sortedEntries.filter(entry => entry && entry.weight && !isNaN(parseFloat(entry.weight)));
              if (weightEntries.length > 0) {
                  const weights = weightEntries.map(entry => parseFloat(entry.weight));
                  const weightTrendData = weightEntries.map(entry => ({ 
                      date: entry.date, 
                      value: parseFloat(entry.weight) 
                  })).filter(item => item.date && !isNaN(item.value));
                
                  stats.weight = {
                      current: weights[weights.length - 1],
                      initial: weights[0],
                      min: Math.min(...weights),
                      max: Math.max(...weights),
                      average: weights.reduce((a, b) => a + b, 0) / weights.length,
                      change: weights[weights.length - 1] - weights[0],
                      trend: calculateTrend(weightTrendData)
                  };
              }
            
              // Calculate body fat statistics  
              const bodyFatEntries = sortedEntries.filter(entry => entry && entry.bodyFat && !isNaN(parseFloat(entry.bodyFat)));
              if (bodyFatEntries.length > 0) {
                  const bodyFats = bodyFatEntries.map(entry => parseFloat(entry.bodyFat));
                  const bodyFatTrendData = bodyFatEntries.map(entry => ({ 
                      date: entry.date, 
                      value: parseFloat(entry.bodyFat) 
                  })).filter(item => item.date && !isNaN(item.value));
                
                  stats.bodyFat = {
                      current: bodyFats[bodyFats.length - 1],
                      initial: bodyFats[0],
                      min: Math.min(...bodyFats),
                      max: Math.max(...bodyFats),
                      average: bodyFats.reduce((a, b) => a + b, 0) / bodyFats.length,
                      change: bodyFats[bodyFats.length - 1] - bodyFats[0],
                      trend: calculateTrend(bodyFatTrendData)
                  };
              }
            
              // Calculate muscle mass statistics
              // Calculate muscle mass statistics
              const muscleMassEntries = sortedEntries.filter(entry => entry && entry.muscleMass && !isNaN(parseFloat(entry.muscleMass)));
              if (muscleMassEntries.length > 0) {
                  const muscleMasses = muscleMassEntries.map(entry => parseFloat(entry.muscleMass));
                  const muscleMassTrendData = muscleMassEntries.map(entry => ({ 
                      date: entry.date, 
                      value: parseFloat(entry.muscleMass) 
                  })).filter(item => item.date && !isNaN(item.value));
                
                  stats.muscleMass = {
                      current: muscleMasses[muscleMasses.length - 1],
                      initial: muscleMasses[0],
                      min: Math.min(...muscleMasses),
                      max: Math.max(...muscleMasses),
                      average: muscleMasses.reduce((a, b) => a + b, 0) / muscleMasses.length,
                      change: muscleMasses[muscleMasses.length - 1] - muscleMasses[0],
                      trend: calculateTrend(muscleMassTrendData)
                  };
              }
            
              return stats;
          }


   function calculateTrend(dataPoints) {
              if (!dataPoints || !Array.isArray(dataPoints) || dataPoints.length < 2) {
                  console.warn('Invalid dataPoints for trend calculation:', dataPoints);
                  return 0;
              }
            
              const n = dataPoints.length;
              let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
            
              dataPoints.forEach((point, index) => {
                  sumX += index;
                  sumY += point.value;
                  sumXY += index * point.value;
                  sumX2 += index * index;
              });
            
              // Calculate slope (trend)
              return (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
          }


   function generateProgressReportPDF(stats, dateStr) {
              // Check if stats exists
              if (!stats) {
                  console.error('No stats object provided for PDF generation');
                  showNotification('Export Failed', 'Unable to generate PDF report. Please try again.', 'error');
                  return;
              }
            
              // Handle case with no entries - create a report showing empty state
              const hasEntries = stats.entries && stats.entries.length > 0;
            
              // Check if jsPDF is available
              if (typeof window.jsPDF === 'undefined') {
                  const script = document.createElement('script');
                  script.src = 'https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js';
                  script.onload = () => generateProgressReportPDF(stats, dateStr);
                  document.head.appendChild(script);
                  return;
              }

              const { jsPDF } = window;
              const doc = new jsPDF();
            
              // Set up fonts and colors
              doc.setFont('helvetica');
              const primaryColor = [16, 185, 129]; // Green
              const secondaryColor = [107, 114, 128]; // Gray
            
              let yPos = 30;
            
              // Header Section
              doc.setFontSize(22);
              doc.setTextColor(...primaryColor);
              doc.text('NutriTracker Pro', 20, yPos);
            
              doc.setFontSize(18);
              doc.setTextColor(0, 0, 0);
              yPos += 15;
              doc.text('Progress Tracking Report', 20, yPos);
            
              // Report Info
              doc.setFontSize(11);
              doc.setTextColor(...secondaryColor);
              yPos += 20;
              doc.text(`Generated: ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}`, 20, yPos);
              yPos += 8;
            
              if (hasEntries && stats.dateRange && stats.dateRange.start && stats.dateRange.end) {
                  doc.text(`Tracking Period: ${new Date(stats.dateRange.start).toLocaleDateString()} - ${new Date(stats.dateRange.end).toLocaleDateString()}`, 20, yPos);
                  yPos += 8;
              } else if (!hasEntries) {
                  doc.text('Tracking Period: No data recorded yet', 20, yPos);
                  yPos += 8;
              }
            
              doc.text(`Total Entries: ${stats.totalEntries || 0}`, 20, yPos);
            
              // Goal Information
              yPos += 20;
              doc.setFontSize(14);
              doc.setTextColor(0, 0, 0);
              doc.text('FITNESS GOALS', 20, yPos);
            
              doc.setFontSize(10);
              doc.setTextColor(...secondaryColor);
              yPos += 15;
              if (stats.goal && stats.goal.targetWeight) {
                  doc.text(`Target Weight: ${stats.goal.targetWeight} ${stats.goal.weightUnit || 'lbs'}`, 25, yPos);
                  yPos += 8;
              }
              if (stats.goal && stats.goal.targetDate) {
                  doc.text(`Target Date: ${new Date(stats.goal.targetDate).toLocaleDateString()}`, 25, yPos);
                  yPos += 8;
              }
            
              // Progress Summary
              yPos += 15;
              doc.setFontSize(14);
              doc.setTextColor(0, 0, 0);
              doc.text('PROGRESS SUMMARY', 20, yPos);
            
              yPos += 15;
              doc.setFontSize(10);
            
              if (!hasEntries) {
                  // Show empty state message
                  doc.setTextColor(...secondaryColor);
                  doc.text('No progress entries recorded yet.', 25, yPos);
                  yPos += 8;
                  doc.text('Start tracking your progress by adding entries in the app!', 25, yPos);
                  yPos += 20;
              } else {
                  // Weight Progress
                  if (stats.weight) {
                  const weightChange = stats.weight.change;
                  const changeColor = weightChange >= 0 ? [34, 197, 94] : [239, 68, 68]; // Green for gain, Red for loss
                
                  doc.setTextColor(0, 0, 0);
                  doc.text('Weight Progress:', 25, yPos);
                  yPos += 8;
                
                  doc.text(`• Initial: ${stats.weight.initial.toFixed(1)} lbs`, 30, yPos);
                  yPos += 6;
                  doc.text(`• Current: ${stats.weight.current.toFixed(1)} lbs`, 30, yPos);
                  yPos += 6;
                
                  doc.setTextColor(...changeColor);
                  doc.text(`• Change: ${weightChange > 0 ? '+' : ''}${weightChange.toFixed(1)} lbs`, 30, yPos);
                  yPos += 6;
                
                  doc.setTextColor(...secondaryColor);
                  doc.text(`• Trend: ${stats.weight.trend > 0 ? 'Increasing' : stats.weight.trend < 0 ? 'Decreasing' : 'Stable'}`, 30, yPos);
                  yPos += 10;
              }
            
              // Body Fat Progress
              if (stats.bodyFat) {
                  doc.setTextColor(0, 0, 0);
                  doc.text('Body Fat Progress:', 25, yPos);
                  yPos += 8;
                
                  doc.setTextColor(...secondaryColor);
                  doc.text(`• Initial: ${stats.bodyFat.initial.toFixed(1)}%`, 30, yPos);
                  yPos += 6;
                  doc.text(`• Current: ${stats.bodyFat.current.toFixed(1)}%`, 30, yPos);
                  yPos += 6;
                  doc.text(`• Change: ${stats.bodyFat.change > 0 ? '+' : ''}${stats.bodyFat.change.toFixed(1)}%`, 30, yPos);
                  yPos += 10;
              }
            
              // Muscle Mass Progress
              if (stats.muscleMass) {
                  doc.setTextColor(0, 0, 0);
                  doc.text('Muscle Mass Progress:', 25, yPos);
                  yPos += 8;
                
                  doc.setTextColor(...secondaryColor);
                  doc.text(`• Initial: ${stats.muscleMass.initial.toFixed(1)} lbs`, 30, yPos);
                  yPos += 6;
                  doc.text(`• Current: ${stats.muscleMass.current.toFixed(1)} lbs`, 30, yPos);
                  yPos += 6;
                  doc.text(`• Change: ${stats.muscleMass.change > 0 ? '+' : ''}${stats.muscleMass.change.toFixed(1)} lbs`, 30, yPos);
                  yPos += 10;
              }
            
              // Add new page for data table
              doc.addPage();
              yPos = 30;
            
              // Data Table Header
              doc.setFontSize(14);
              doc.setTextColor(0, 0, 0);
              doc.text('DETAILED PROGRESS DATA', 20, yPos);
            
              yPos += 20;
              doc.setFontSize(9);
            
              // Table Headers
              doc.setTextColor(...primaryColor);
              doc.text('Date', 25, yPos);
              doc.text('Weight', 55, yPos);
              doc.text('Body Fat %', 85, yPos);
              doc.text('Muscle Mass', 120, yPos);
              doc.text('Notes', 155, yPos);
            
              yPos += 8;
            
              // Table Data
              doc.setTextColor(0, 0, 0);
              stats.entries.forEach(entry => {
                  if (yPos > 270) {
                      doc.addPage();
                      yPos = 30;
                  }
                
                  doc.text(new Date(entry.date).toLocaleDateString(), 25, yPos);
                  doc.text(entry.weight ? `${entry.weight} lbs` : '-', 55, yPos);
                  doc.text(entry.bodyFat ? `${entry.bodyFat}%` : '-', 85, yPos);
                  doc.text(entry.muscleMass ? `${entry.muscleMass} lbs` : '-', 120, yPos);
                  doc.text(entry.notes ? entry.notes.substring(0, 20) + '...' : '-', 155, yPos);
                
                  yPos += 7;
              });
            
              // Footer
              const pageCount = doc.internal.getNumberOfPages();
              for (let i = 1; i <= pageCount; i++) {
                  doc.setPage(i);
                  doc.setFontSize(8);
                  doc.setTextColor(...secondaryColor);
                  doc.text(`Page ${i} of ${pageCount}`, 170, 285);
                  doc.text('Generated by NutriTracker Pro - Transform your nutrition, transform your life!', 20, 285);
              }
            
              } // Close the else block for hasEntries
            
              // Save PDF
              doc.save(`NutriTracker-ProgressReport-${dateStr}.pdf`);
          }


   function clearAllProgressData() {
              showConfirmDialog(
                  'Clear All Progress Data',
                  'Are you sure you want to delete all progress entries and goals? This action cannot be undone.',
                  () => {
                      const count = progressEntries.length;
                      progressEntries = [];
                      progressGoal = null;
                    
                      // Clear goal form
                      const targetWeightEl = document.getElementById('targetWeight');
                      const targetDateEl = document.getElementById('targetDate');
                      if (targetWeightEl) targetWeightEl.value = '';
                      if (targetDateEl) targetDateEl.value = '';
                    
                      saveProgressData();
                      updateProgressDisplay();
                      updateProgressChart();
                      showNotification('All Progress Data Cleared', `${count} progress entries, recent timeline, and latest measurements have been cleared`, 'success');
                  }
              );
          }


   function loadProgressData() {
              console.log('Loading progress data...');
            
              try {
                  // Try multiple storage sources in order of preference
                  let loadedEntries = false;
                  let loadedGoal = false;
                
                  // 0. Try database first (highest priority)
                  try {
                      console.log('🔄 Loading progress data from database...');
                    
                      // Load progress entries from database
                      const dbEntries = await loadProgressEntries();
                      if (dbEntries && dbEntries.length > 0) {
                          progressEntries = dbEntries;
                          loadedEntries = true;
                          console.log('✅ Loaded from database:', progressEntries.length, 'entries');
                      }
                    
                      // Load progress goal from database
                      const dbGoal = await loadProgressGoalFromDB();
                      if (dbGoal) {
                          progressGoal = dbGoal;
                          loadedGoal = true;
                          console.log('✅ Loaded goal from database');
                      }
                  } catch (dbError) {
                      console.warn('⚠️ Database loading failed, using localStorage fallback:', dbError.message);
                  }
                
                  // 1. Try primary storage
                  const savedEntries = localStorage.getItem('progressEntries');
                  const savedGoal = localStorage.getItem('progressGoal');
                
                  if (savedEntries && savedEntries !== 'null') {
                      const parsed = JSON.parse(savedEntries);
                      if (Array.isArray(parsed) && parsed.length > 0) {
                          progressEntries = parsed;
                          loadedEntries = true;
                          console.log('Loaded from primary storage:', progressEntries.length, 'entries');
                      }
                  }
                
                  // 2. Try backup storage if primary failed
                  if (!loadedEntries) {
                      const backupData = localStorage.getItem('progressData_backup');
                      if (backupData) {
                          const backup = JSON.parse(backupData);
                          if (backup.entries && Array.isArray(backup.entries)) {
                              progressEntries = backup.entries;
                              loadedEntries = true;
                              console.log('Loaded from backup storage:', progressEntries.length, 'entries');
                          }
                          if (backup.goal && !loadedGoal) {
                              progressGoal = backup.goal;
                              loadedGoal = true;
                          }
                      }
                  }
                
                  // 3. Try v2 storage if others failed
                  if (!loadedEntries) {
                      const v2Entries = localStorage.getItem('progress_entries_v2');
                      if (v2Entries) {
                          const parsed = JSON.parse(v2Entries);
                          if (Array.isArray(parsed)) {
                              progressEntries = parsed;
                              loadedEntries = true;
                              console.log('Loaded from v2 storage:', progressEntries.length, 'entries');
                          }
                      }
                  }
                
                  // Load goal if not loaded from backup
                  if (!loadedGoal && savedGoal && savedGoal !== 'null') {
                      const parsed = JSON.parse(savedGoal);
                      if (parsed && typeof parsed === 'object') {
                          progressGoal = parsed;
                          loadedGoal = true;
                          console.log('Loaded goal from primary storage');
                      }
                  }
                
                  // Try v2 goal storage
                  if (!loadedGoal) {
                      const v2Goal = localStorage.getItem('progress_goal_v2');
                      if (v2Goal && v2Goal !== 'null') {
                          const parsed = JSON.parse(v2Goal);
                          if (parsed && typeof parsed === 'object') {
                              progressGoal = parsed;
                              loadedGoal = true;
                              console.log('Loaded goal from v2 storage');
                          }
                      }
                  }
                
                  // Ensure data integrity
                  if (progressEntries && progressEntries.length > 0) {
                      // Ensure data is sorted by date (newest first)
                      progressEntries.sort((a, b) => new Date(b.date) - new Date(a.date));
                    
                      // Validate data structure
                      progressEntries = progressEntries.filter(entry => {
                          return entry && entry.date && entry.weight && !isNaN(entry.weight);
                      });
                    
                      console.log('Progress entries validated:', progressEntries.length, 'valid entries');
                  }
                
                  // Populate goal form fields after DOM is ready
                  setTimeout(() => {
                      if (progressGoal) {
                          const targetWeightEl = document.getElementById('targetWeight');
                          const targetDateEl = document.getElementById('targetDate');
                          if (targetWeightEl && progressGoal.targetWeight) {
                              targetWeightEl.value = progressGoal.targetWeight;
                              console.log('Populated target weight:', progressGoal.targetWeight);
                          }
                          if (targetDateEl && progressGoal.targetDate) {
                              targetDateEl.value = progressGoal.targetDate;
                              console.log('Populated target date:', progressGoal.targetDate);
                          }
                      }
                  }, 200);
                
                  console.log('Progress data loading complete:', {
                      entries: progressEntries.length,
                      goal: progressGoal ? 'Loaded' : 'None'
                  });
                
              } catch (error) {
                  console.error('Error loading progress data:', error);
                  progressEntries = [];
                  progressGoal = null;
                  showNotification('Load Error', 'Some progress data may not have loaded correctly', 'warning');
              }
          }


   function refreshMacroProgress() {
              console.log('Refreshing macro progress...');
              // Save current day's data first
              if (meals.length > 0 || (currentIntake.protein + currentIntake.carbs + currentIntake.fat) > 0) {
                  saveDailyMacros().catch(error => console.error('Error saving daily macros:', error));
              }
              // Force refresh of displays
              setTimeout(() => {
                  updateMacroProgressDisplay();
                  updateMacroCharts();
                  showNotification('Macro Progress Updated', 'Latest data has been refreshed', 'success');
              }, 100);
          }
        
          // Clear all macro progress data
          function clearMacroProgress() {
              showConfirmDialog(
                  'Clear Macro Progress Data',
                  'Are you sure you want to clear ALL macro progress data? This will permanently delete all daily macro history, progress charts data, and trend statistics. This action cannot be undone.',
                  () => {
                      try {
                          // Clear the macroHistory array
                          macroHistory = [];
                        
                          // Remove from localStorage
                          localStorage.removeItem('macroHistory');
                        
                          // Reset all macro progress displays
                          updateMacroProgressDisplay();
                          updateMacroCharts();
                        
                          // Clear the progress table
                          const tableBody = document.getElementById('macroHistoryTable');
                          if (tableBody) {
                              tableBody.innerHTML = `
                                  <tr>
                                      <td colspan="6" class="text-center py-8 text-gray-500">
                                          <i class="fas fa-chart-line text-2xl mb-2"></i>
                                          <p>Start tracking daily macros to see your progress here!</p>
                                      </td>
                                  </tr>
                              `;
                          }
                        
                          // Reset macro stats overview
                          document.getElementById('avgProtein').textContent = '0g';
                          document.getElementById('avgCarbs').textContent = '0g';
                          document.getElementById('avgFat').textContent = '0g';
                          document.getElementById('proteinTrend').textContent = 'No trend';
                          document.getElementById('carbsTrend').textContent = 'No trend';
                          document.getElementById('fatTrend').textContent = 'No trend';
                        
                          console.log('Macro progress data cleared successfully');
                          showNotification('Progress Data Cleared', 'All macro progress data has been permanently deleted', 'success');
                        
                      } catch (error) {
                          console.error('Error clearing macro progress:', error);
                          showNotification('Clear Failed', 'There was an error clearing the progress data. Please try again.', 'error');
                      }
                  }
              );
          }
        


            

            











          // Macro Progress Tracking Functions
          let macroHistory = [];
          let macroTotalsChart = null;
          let macroGoalsChart = null;

          async function initializeMacroTracking() {
              console.log('Initializing macro tracking...');
              await loadMacroHistory();
            
              // Use timeout to ensure DOM is ready
              setTimeout(() => {
                  updateMacroProgressDisplay();
                  initializeMacroCharts();
                
                  // Save current day's data if we have any meals
                  if (meals.length > 0 || (currentIntake.protein + currentIntake.carbs + currentIntake.fat) > 0) {
                      saveDailyMacros().catch(error => console.error('Error saving daily macros:', error));
                  }
                
                  console.log('Macro tracking initialized');
              }


   function clearMacroProgress() {
              showConfirmDialog(
                  'Clear Macro Progress Data',
                  'Are you sure you want to clear ALL macro progress data? This will permanently delete all daily macro history, progress charts data, and trend statistics. This action cannot be undone.',
                  () => {
                      try {
                          // Clear the macroHistory array
                          macroHistory = [];
                        
                          // Remove from localStorage
                          localStorage.removeItem('macroHistory');
                        
                          // Reset all macro progress displays
                          updateMacroProgressDisplay();
                          updateMacroCharts();
                        
                          // Clear the progress table
                          const tableBody = document.getElementById('macroHistoryTable');
                          if (tableBody) {
                              tableBody.innerHTML = `
                                  <tr>
                                      <td colspan="6" class="text-center py-8 text-gray-500">
                                          <i class="fas fa-chart-line text-2xl mb-2"></i>
                                          <p>Start tracking daily macros to see your progress here!</p>
                                      </td>
                                  </tr>
                              `;
                          }
                        
                          // Reset macro stats overview
                          document.getElementById('avgProtein').textContent = '0g';
                          document.getElementById('avgCarbs').textContent = '0g';
                          document.getElementById('avgFat').textContent = '0g';
                          document.getElementById('proteinTrend').textContent = 'No trend';
                          document.getElementById('carbsTrend').textContent = 'No trend';
                          document.getElementById('fatTrend').textContent = 'No trend';
                        
                          console.log('Macro progress data cleared successfully');
                          showNotification('Progress Data Cleared', 'All macro progress data has been permanently deleted', 'success');
                        
                      } catch (error) {
                          console.error('Error clearing macro progress:', error);
                          showNotification('Clear Failed', 'There was an error clearing the progress data. Please try again.', 'error');
                      }
                  }
              );
          }


   function initializeMacroTracking() {
              console.log('Initializing macro tracking...');
              await loadMacroHistory();
            
              // Use timeout to ensure DOM is ready
              setTimeout(() => {
                  updateMacroProgressDisplay();
                  initializeMacroCharts();
                
                  // Save current day's data if we have any meals
                  if (meals.length > 0 || (currentIntake.protein + currentIntake.carbs + currentIntake.fat) > 0) {
                      saveDailyMacros().catch(error => console.error('Error saving daily macros:', error));
                  }
                
                  console.log('Macro tracking initialized');
              }, 200);
          }

          async function saveDailyMacros() {
              const today = new Date().toISOString().split('T')[0];
            
              // Get current macro totals from the daily tracker
              const currentProtein = Math.round(currentIntake.protein || 0);
              const currentCarbs = Math.round(currentIntake.carbs || 0);
              const currentFat = Math.round(currentIntake.fat || 0);
              const currentCalories = Math.round(meals.reduce((sum, meal) => sum + meal.calories, 0));

              // Get macro goals
              const proteinGoal = dailyTargets.protein || 0;
              const carbsGoal = dailyTargets.carbs || 0;
              const fatGoal = dailyTargets.fat || 0;
              const caloriesGoal = dailyTargets.calories || 0;

              // Only save if we have meaningful data (calories > 0 or goals set)
              if (currentCalories === 0 && proteinGoal === 0) {
                  return; // Don't save empty entries
              }

              // Check if entry for today already exists
              const existingIndex = macroHistory.findIndex(entry => entry.date === today);
            
              const macroEntry = {
                  date: today,
                  calories: currentCalories,
                  protein: currentProtein,
                  carbs: currentCarbs,
                  fat: currentFat,
                  caloriesGoal: caloriesGoal,
                  proteinGoal: proteinGoal,
                  carbsGoal: carbsGoal,
                  fatGoal: fatGoal,
                  proteinPercent: proteinGoal > 0 ? Math.round((currentProtein / proteinGoal) * 100) : 0,
                  carbsPercent: carbsGoal > 0 ? Math.round((currentCarbs / carbsGoal) * 100) : 0,
                  fatPercent: fatGoal > 0 ? Math.round((currentFat / fatGoal) * 100) : 0,
                  goalsMet: (currentProtein >= proteinGoal * 0.9 && currentCarbs >= carbsGoal * 0.9 && currentFat >= fatGoal * 0.9)
              };

              if (existingIndex >= 0) {
                  macroHistory[existingIndex] = macroEntry;
              } else {
                  macroHistory.push(macroEntry);
              }

              // Keep only last 30 days of data
              macroHistory = macroHistory
                  .sort((a, b) => new Date(b.date) - new Date(a.date))
                  .slice(0, 30);

              try {
                  // Save to database first
                  const dbResult = await saveMacroHistoryToDB(macroEntry);
                
                  if (dbResult && !dbResult.fallback) {
                      console.log('✅ Macro history saved to database:', dbResult);
                  } else {
                      console.log('📱 Macro history saved to localStorage fallback');
                  }
              } catch (error) {
                  console.error('❌ Error saving macro history to database:', error);
              }
            
              // Also save to localStorage for backwards compatibility and offline access
              localStorage.setItem('macroHistory', JSON.stringify(macroHistory));
            
              // Force immediate update of macro progress display
              setTimeout(() => {
                  updateMacroProgressDisplay();
                  updateMacroCharts();
              }, 100);
            
              console.log('Saved daily macros:', macroEntry);
          }


   function saveDailyMacros() {
              const today = new Date().toISOString().split('T')[0];
            
              // Get current macro totals from the daily tracker
              const currentProtein = Math.round(currentIntake.protein || 0);
              const currentCarbs = Math.round(currentIntake.carbs || 0);
              const currentFat = Math.round(currentIntake.fat || 0);
              const currentCalories = Math.round(meals.reduce((sum, meal) => sum + meal.calories, 0));

              // Get macro goals
              const proteinGoal = dailyTargets.protein || 0;
              const carbsGoal = dailyTargets.carbs || 0;
              const fatGoal = dailyTargets.fat || 0;
              const caloriesGoal = dailyTargets.calories || 0;

              // Only save if we have meaningful data (calories > 0 or goals set)
              if (currentCalories === 0 && proteinGoal === 0) {
                  return; // Don't save empty entries
              }

              // Check if entry for today already exists
              const existingIndex = macroHistory.findIndex(entry => entry.date === today);
            
              const macroEntry = {
                  date: today,
                  calories: currentCalories,
                  protein: currentProtein,
                  carbs: currentCarbs,
                  fat: currentFat,
                  caloriesGoal: caloriesGoal,
                  proteinGoal: proteinGoal,
                  carbsGoal: carbsGoal,
                  fatGoal: fatGoal,
                  proteinPercent: proteinGoal > 0 ? Math.round((currentProtein / proteinGoal) * 100) : 0,
                  carbsPercent: carbsGoal > 0 ? Math.round((currentCarbs / carbsGoal) * 100) : 0,
                  fatPercent: fatGoal > 0 ? Math.round((currentFat / fatGoal) * 100) : 0,
                  goalsMet: (currentProtein >= proteinGoal * 0.9 && currentCarbs >= carbsGoal * 0.9 && currentFat >= fatGoal * 0.9)
              };

              if (existingIndex >= 0) {
                  macroHistory[existingIndex] = macroEntry;
              } else {
                  macroHistory.push(macroEntry);
              }

              // Keep only last 30 days of data
              macroHistory = macroHistory
                  .sort((a, b) => new Date(b.date) - new Date(a.date))
                  .slice(0, 30);

              try {
                  // Save to database first
                  const dbResult = await saveMacroHistoryToDB(macroEntry);
                
                  if (dbResult && !dbResult.fallback) {
                      console.log('✅ Macro history saved to database:', dbResult);
                  } else {
                      console.log('📱 Macro history saved to localStorage fallback');
                  }
              } catch (error) {
                  console.error('❌ Error saving macro history to database:', error);
              }
            
              // Also save to localStorage for backwards compatibility and offline access
              localStorage.setItem('macroHistory', JSON.stringify(macroHistory));
            
              // Force immediate update of macro progress display
              setTimeout(() => {
                  updateMacroProgressDisplay();
                  updateMacroCharts();
              }, 100);
            
              console.log('Saved daily macros:', macroEntry);
          }

          async function loadMacroHistory() {
              console.log('📡 Loading macro history data...');
            
              try {
                  // Try database first (highest priority)
                  const dbHistory = await loadMacroHistoryFromDB();
                
                  if (dbHistory && dbHistory.length > 0) {
                      macroHistory = dbHistory;
                      console.log('✅ Loaded macro history from database:', macroHistory.length, 'entries');
                    
                      // Also save to localStorage for offline access
                      localStorage.setItem('macroHistory', JSON.stringify(macroHistory));
                      return;
                  }
                
                  // Fallback to localStorage
                  console.log('📱 Loading macro history from localStorage fallback...');
                  const saved = localStorage.getItem('macroHistory');
                  if (saved && saved !== 'null') {
                      const parsed = JSON.parse(saved);
                      if (Array.isArray(parsed)) {
                          macroHistory = parsed;
                          console.log('Loaded macro history from localStorage:', macroHistory.length, 'entries');
                      } else {
                          macroHistory = [];
                      }
                  } else {
                      macroHistory = [];
                  }
              } catch (error) {
                  console.error('❌ Error loading macro history:', error);
                
                  // Final fallback to localStorage
                  try {
                      const saved = localStorage.getItem('macroHistory');
                      if (saved && saved !== 'null') {
                          const parsed = JSON.parse(saved);
                          if (Array.isArray(parsed)) {
                              macroHistory = parsed;
                          } else {
                              macroHistory = [];
                          }
                      } else {
                          macroHistory = [];
                      }
                  } catch (localStorageError) {
                      console.error('❌ Even localStorage fallback failed:', localStorageError);
                      macroHistory = [];
                  }
              }
          }

          function updateMacroProgressDisplay() {
              const last7Days = macroHistory
                  .sort((a, b) => new Date(b.date) - new Date(a.date))
                  .slice(0, 7);

              if (last7Days.length > 0) {
                  // Calculate averages
                  const avgProtein = Math.round(last7Days.reduce((sum, entry) => sum + entry.protein, 0) / last7Days.length);
                  const avgCarbs = Math.round(last7Days.reduce((sum, entry) => sum + entry.carbs, 0) / last7Days.length);
                  const avgFat = Math.round(last7Days.reduce((sum, entry) => sum + entry.fat, 0) / last7Days.length);

                  // Calculate trends (compare first 3 days vs last 3 days)
                  const firstHalf = last7Days.slice(-3);
                  const secondHalf = last7Days.slice(0, 3);
                
                  const proteinTrend = calculateTrend(firstHalf, secondHalf, 'protein');
                  const carbsTrend = calculateTrend(firstHalf, secondHalf, 'carbs');
                  const fatTrend = calculateTrend(firstHalf, secondHalf, 'fat');

                  updateElement('avgProtein', avgProtein + 'g');
                  updateElement('avgCarbs', avgCarbs + 'g');
                  updateElement('avgFat', avgFat + 'g');
                  updateElement('proteinTrend', proteinTrend);
                  updateElement('carbsTrend', carbsTrend);
                  updateElement('fatTrend', fatTrend);
              }

              updateMacroHistoryTable();
          }

          function calculateTrend(firstHalf, secondHalf, macro) {
              if (firstHalf.length === 0 || secondHalf.length === 0) return 'No trend';
            
              const firstAvg = firstHalf.reduce((sum, entry) => sum + entry[macro], 0) / firstHalf.length;
              const secondAvg = secondHalf.reduce((sum, entry) => sum + entry[macro], 0) / secondHalf.length;
            
              const change = secondAvg - firstAvg;
              const changePercent = Math.abs(change / firstAvg * 100);
            
              if (changePercent < 5) return 'Stable';
              return change > 0 ? `↗ +${Math.round(change)}g` : `↘ ${Math.round(change)}g`;
          }

          function updateMacroHistoryTable() {
              const tableBody = document.getElementById('macroHistoryTable');
              if (!tableBody) return;

              const last7Days = macroHistory
                  .sort((a, b) => new Date(b.date) - new Date(a.date))
                  .slice(0, 7);

              if (last7Days.length === 0) {
                  tableBody.innerHTML = `
                      <tr>
                          <td colspan="6" class="text-center py-8 text-gray-500">
                              <i class="fas fa-chart-line text-2xl mb-2"></i>
                              <p>Start tracking daily macros to see your progress here!</p>
                          </td>
                      </tr>
                  `;
                  return;
              }

              tableBody.innerHTML = last7Days.map(entry => {
                  const date = new Date(entry.date).toLocaleDateString();
                  const goalBadge = entry.goalsMet 
                      ? '<span class="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">✓ Met</span>'
                      : '<span class="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs">✗ Missed</span>';
                
                  return `
                      <tr class="border-b border-gray-100 hover:bg-gray-50">
                          <td class="p-3 font-medium">${date}</td>
                          <td class="p-3 text-center">${entry.calories}</td>
                          <td class="p-3 text-center text-red-600">${entry.protein}g (${entry.proteinPercent}%)</td>
                          <td class="p-3 text-center text-yellow-600">${entry.carbs}g (${entry.carbsPercent}%)</td>
                          <td class="p-3 text-center text-green-600">${entry.fat}g (${entry.fatPercent}%)</td>
                          <td class="p-3 text-center">${goalBadge}</td>
                      </tr>
                  `;
              }).join('');
          }

          function initializeMacroCharts() {
              console.log('Initializing macro charts...');
              // Destroy existing macro charts first to prevent canvas conflicts
              macroTotalsChart = destroyChart(macroTotalsChart);
              macroGoalsChart = destroyChart(macroGoalsChart);
            
              // Initialize Macro Totals Chart
              const totalsCtx = document.getElementById('macroTotalsChart');
              if (totalsCtx) {
                  try {
                      macroTotalsChart = new Chart(totalsCtx, {
                          type: 'line',
                          data: {
                              labels: [],
                              datasets: [
                                  {
                                      label: 'Protein (g)',
                                      data: [],
                                      borderColor: '#ef4444',
                                      backgroundColor: 'rgba(239, 68, 68, 0.1)',
                                      borderWidth: 2,
                                      fill: false,
                                      tension: 0.3,
                                      pointRadius: 4,
                                      pointHoverRadius: 6
                                  },
                                  {
                                      label: 'Carbs (g)',
                                      data: [],
                                      borderColor: '#f59e0b',
                                      backgroundColor: 'rgba(245, 158, 11, 0.1)',
                                      borderWidth: 2,
                                      fill: false,
                                      tension: 0.3,
                                      pointRadius: 4,
                                      pointHoverRadius: 6
                                  },
                                  {
                                      label: 'Fat (g)',
                                      data: [],
                                      borderColor: '#10b981',
                                      backgroundColor: 'rgba(16, 185, 129, 0.1)',
                                      borderWidth: 2,
                                      fill: false,
                                      tension: 0.3,
                                      pointRadius: 4,
                                      pointHoverRadius: 6
                                  }
                              ]
                          },
                          options: {
                              responsive: true,
                              maintainAspectRatio: false,
                              interaction: {
                                  mode: 'index',
                                  intersect: false
                              },
                              scales: {
                                  y: {
                                      beginAtZero: true,
                                      title: {
                                          display: true,
                                          text: 'Grams'
                                      },
                                      grid: {
                                          color: 'rgba(0,0,0,0.1)'
                                      }
                                  },
                                  x: {
                                      grid: {
                                          color: 'rgba(0,0,0,0.1)'
                                      }
                                  }
                              },
                              plugins: {
                                  legend: {
                                      position: 'top'
                                  },
                                  tooltip: {
                                      mode: 'index',
                                      intersect: false
                                  }
                              }
                          }
                      });
                      console.log('Macro totals chart initialized');
                  } catch (error) {
                      console.error('Error initializing macro totals chart:', error);
                  }
              } else {
                  console.error('Macro totals chart canvas not found');
              }

              // Initialize Macro Goals Chart
              const goalsCtx = document.getElementById('macroGoalsChart');
              if (goalsCtx) {
                  try {
                      macroGoalsChart = new Chart(goalsCtx, {
                          type: 'line',
                          data: {
                              labels: [],
                              datasets: [
                                  {
                                      label: 'Protein %',
                                      data: [],
                                      borderColor: '#ef4444',
                                      backgroundColor: 'rgba(239, 68, 68, 0.1)',
                                      borderWidth: 2,
                                      fill: false,
                                      tension: 0.3,
                                      pointRadius: 4,
                                      pointHoverRadius: 6
                                  },
                                  {
                                      label: 'Carbs %',
                                      data: [],
                                      borderColor: '#f59e0b',
                                      backgroundColor: 'rgba(245, 158, 11, 0.1)',
                                      borderWidth: 2,
                                      fill: false,
                                      tension: 0.3,
                                      pointRadius: 4,
                                      pointHoverRadius: 6
                                  },
                                  {
                                      label: 'Fat %',
                                      data: [],
                                      borderColor: '#10b981',
                                      backgroundColor: 'rgba(16, 185, 129, 0.1)',
                                      borderWidth: 2,
                                      fill: false,
                                      tension: 0.3,
                                      pointRadius: 4,
                                      pointHoverRadius: 6
                                  }
                              ]
                          },
                          options: {
                              responsive: true,
                              maintainAspectRatio: false,
                              interaction: {
                                  mode: 'index',
                                  intersect: false
                              },
                              scales: {
                                  y: {
                                      beginAtZero: true,
                                      max: 150,
                                      title: {
                                          display: true,
                                          text: 'Goal Achievement %'
                                      },
                                      grid: {
                                          color: 'rgba(0,0,0,0.1)'
                                      },
                                      ticks: {
                                          callback: function(value) {
                                              return value + '%';
                                          }
                                      }
                                  },
                                  x: {
                                      grid: {
                                          color: 'rgba(0,0,0,0.1)'
                                      }
                                  }
                              },
                              plugins: {
                                  legend: {
                                      position: 'top'
                                  },
                                  tooltip: {
                                      mode: 'index',
                                      intersect: false,
                                      callbacks: {
                                          label: function(context) {
                                              return context.dataset.label + ': ' + context.parsed.y + '%';
                                          }
                                      }
                                  }
                              }
                          }
                      });
                      console.log('Macro goals chart initialized');
                  } catch (error) {
                      console.error('Error initializing macro goals chart:', error);
                  }
              } else {
                  console.error('Macro goals chart canvas not found');
              }

              // Initial update with current data
              setTimeout(() => {
                  updateMacroCharts();
              }, 100);
          }

          function updateMacroCharts() {
              try {
                  const last7Days = macroHistory
                      .sort((a, b) => new Date(a.date) - new Date(b.date))
                      .slice(-7);

                  if (last7Days.length === 0) {
                      // Show empty state for charts
                      if (macroTotalsChart) {
                          macroTotalsChart.data.labels = ['No Data'];
                          macroTotalsChart.data.datasets[0].data = [];
                          macroTotalsChart.data.datasets[1].data = [];
                          macroTotalsChart.data.datasets[2].data = [];
                          macroTotalsChart.update('none');
                      }
                    
                      if (macroGoalsChart) {
                          macroGoalsChart.data.labels = ['No Data'];
                          macroGoalsChart.data.datasets[0].data = [];
                          macroGoalsChart.data.datasets[1].data = [];
                          macroGoalsChart.data.datasets[2].data = [];
                          macroGoalsChart.update('none');
                      }
                    
                      console.log('No macro data available for charts');
                      return;
                  }

                  const labels = last7Days.map(entry => {
                      const date = new Date(entry.date);
                      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                  });

                  // Update Totals Chart
                  if (macroTotalsChart) {
                      macroTotalsChart.data.labels = labels;
                      macroTotalsChart.data.datasets[0].data = last7Days.map(entry => entry.protein || 0);
                      macroTotalsChart.data.datasets[1].data = last7Days.map(entry => entry.carbs || 0);
                      macroTotalsChart.data.datasets[2].data = last7Days.map(entry => entry.fat || 0);
                      macroTotalsChart.update('none');
                      console.log('Updated macro totals chart with', last7Days.length, 'days of data');
                  } else {
                      console.warn('Macro totals chart not available');
                  }

                  // Update Goals Chart
                  if (macroGoalsChart) {
                      macroGoalsChart.data.labels = labels;
                      macroGoalsChart.data.datasets[0].data = last7Days.map(entry => entry.proteinPercent || 0);
                      macroGoalsChart.data.datasets[1].data = last7Days.map(entry => entry.carbsPercent || 0);
                      macroGoalsChart.data.datasets[2].data = last7Days.map(entry => entry.fatPercent || 0);
                      macroGoalsChart.update('none');
                      console.log('Updated macro goals chart with', last7Days.length, 'days of data');
                  } else {
                      console.warn('Macro goals chart not available');
                  }
              } catch (error) {
                  console.error('Error updating macro charts:', error);
              }
          }

          // Export Functions for Weekly Meal Planner
          function exportMealPlanPDF() {
              try {
                  // First check if jsPDF is available
                  if (typeof window.jspdf === 'undefined') {
                      // Load jsPDF library if not already loaded
                      const script = document.createElement('script');
                      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
                      script.onload = () => {
                          exportMealPlanPDF(); // Retry after loading
                      };
                      document.head.appendChild(script);
                      showNotification('Loading PDF library...', 'Please wait', 'info');
                      return;
                  }
                
                  const { jsPDF } = window.jspdf;
                  const doc = new jsPDF();
                
                  // Get current date
                  const currentDate = new Date();
                  const weekStart = new Date(currentDate.setDate(currentDate.getDate() - currentDate.getDay()));
                
                  // Title
                  doc.setFontSize(20);
                  doc.text('Weekly Meal Plan', 20, 30);
                
                  doc.setFontSize(12);
                  doc.text(`Week of: ${weekStart.toLocaleDateString()}`, 20, 45);
                
                  // Get meal plan data from the correct location
                  const savedMealPlan = window.JSON?.safeParse ? 
              window.JSON.safeParse(localStorage.getItem('mealPlan') || '{}', {}) :
              (() => {
                  try {
                      return JSON.parse(localStorage.getItem('mealPlan') || '{}');
                  } catch (error) {
                      console.warn('Error parsing meal plan:', error);
                      return {};
                  }
              })();
                  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
                  const dayLabels = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
                
                  let yPosition = 60;
                  let hasContent = false;
                
                  days.forEach((day, index) => {
                      const dayData = savedMealPlan[day] || { breakfast: [], lunch: [], dinner: [] };
                      const hasDataForDay = dayData.breakfast.length > 0 || dayData.lunch.length > 0 || dayData.dinner.length > 0;
                    
                      if (hasDataForDay) {
                          hasContent = true;
                        
                          // Day header
                          doc.setFontSize(14);
                          doc.setFont(undefined, 'bold');
                          doc.text(dayLabels[index], 20, yPosition);
                          yPosition += 10;
                        
                          doc.setFont(undefined, 'normal');
                          doc.setFontSize(10);
                        
                          // Breakfast
                          if (dayData.breakfast && dayData.breakfast.length > 0) {
                              doc.text('  Breakfast:', 25, yPosition);
                              yPosition += 5;
                              dayData.breakfast.forEach(item => {
                                  const macros = `${item.calories || 0} cal, ${item.protein || 0}g P, ${item.carbs || 0}g C, ${item.fat || 0}g F`;
                                  doc.text(`    • ${item.name} (${macros})`, 30, yPosition);
                                  yPosition += 5;
                              });
                          }
                        
                          // Lunch
                          if (dayData.lunch && dayData.lunch.length > 0) {
                              doc.text('  Lunch:', 25, yPosition);
                              yPosition += 5;
                              dayData.lunch.forEach(item => {
                                  const macros = `${item.calories || 0} cal, ${item.protein || 0}g P, ${item.carbs || 0}g C, ${item.fat || 0}g F`;
                                  doc.text(`    • ${item.name} (${macros})`, 30, yPosition);
                                  yPosition += 5;
                              });
                          }
                        
                          // Dinner
                          if (dayData.dinner && dayData.dinner.length > 0) {
                              doc.text('  Dinner:', 25, yPosition);
                              yPosition += 5;
                              dayData.dinner.forEach(item => {
                                  const macros = `${item.calories || 0} cal, ${item.protein || 0}g P, ${item.carbs || 0}g C, ${item.fat || 0}g F`;
                                  doc.text(`    • ${item.name} (${macros})`, 30, yPosition);
                                  yPosition += 5;
                              });
                          }
                        
                          yPosition += 10;
                        
                          // Check if we need a new page
                          if (yPosition > 250) {
                              doc.addPage();
                              yPosition = 20;
                          }
                      }
                  });
                
                  if (!hasContent) {
                      doc.text('No meals planned yet. Add some meals to your planner!', 20, yPosition);
                  }
                
                  // Download the PDF
                  doc.save(`meal-plan-${weekStart.toISOString().split('T')[0]}.pdf`);
                  showNotification('Success', 'Meal plan PDF exported successfully!', 'success');
                
              } catch (error) {
                  console.error('Error exporting PDF:', error);
                  showNotification('Export Error', 'Error exporting PDF. Please try again.', 'error');
              }
          }
        
          function exportMealPlanCSV() {
              try {
                  // Get meal plan data from the correct location
                  const savedMealPlan = window.JSON?.safeParse ? 
              window.JSON.safeParse(localStorage.getItem('mealPlan') || '{}', {}) :
              (() => {
                  try {
                      return JSON.parse(localStorage.getItem('mealPlan') || '{}');
                  } catch (error) {
                      console.warn('Error parsing meal plan:', error);
                      return {};
                  }
              })();
                  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
                  const dayLabels = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
                
                  let csvContent = 'Day,Meal,Item,Calories,Protein (g),Carbs (g),Fat (g)\n';
                  let hasContent = false;
                
                  // Calculate totals
                  let totalCalories = 0;
                  let totalProtein = 0;
                  let totalCarbs = 0;
                  let totalFat = 0;
                
                  days.forEach((day, index) => {
                      const dayData = savedMealPlan[day] || { breakfast: [], lunch: [], dinner: [] };
                    
                      // Process breakfast
                      if (dayData.breakfast && dayData.breakfast.length > 0) {
                          hasContent = true;
                          dayData.breakfast.forEach(item => {
                              csvContent += `${dayLabels[index]},Breakfast,"${item.name}",${item.calories || 0},${item.protein || 0},${item.carbs || 0},${item.fat || 0}\n`;
                              totalCalories += item.calories || 0;
                              totalProtein += item.protein || 0;
                              totalCarbs += item.carbs || 0;
                              totalFat += item.fat || 0;
                          });
                      }
                    
                      // Process lunch
                      if (dayData.lunch && dayData.lunch.length > 0) {
                          hasContent = true;
                          dayData.lunch.forEach(item => {
                              csvContent += `${dayLabels[index]},Lunch,"${item.name}",${item.calories || 0},${item.protein || 0},${item.carbs || 0},${item.fat || 0}\n`;
                              totalCalories += item.calories || 0;
                              totalProtein += item.protein || 0;
                              totalCarbs += item.carbs || 0;
                              totalFat += item.fat || 0;
                          });
                      }
                    
                      // Process dinner
                      if (dayData.dinner && dayData.dinner.length > 0) {
                          hasContent = true;
                          dayData.dinner.forEach(item => {
                              csvContent += `${dayLabels[index]},Dinner,"${item.name}",${item.calories || 0},${item.protein || 0},${item.carbs || 0},${item.fat || 0}\n`;
                              totalCalories += item.calories || 0;
                              totalProtein += item.protein || 0;
                              totalCarbs += item.carbs || 0;
                              totalFat += item.fat || 0;
                          });
                      }
                  });
                
                  if (hasContent) {
                      // Add totals row
                      csvContent += `\n,,TOTALS,${totalCalories},${Math.round(totalProtein)},${Math.round(totalCarbs)},${Math.round(totalFat)}\n`;
                  } else {
                      csvContent += 'No meals planned,,,,,,';
                  }
                
                  // Create and download the CSV file
                  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                  const link = document.createElement('a');
                  const url = URL.createObjectURL(blob);
                  link.setAttribute('href', url);
                  link.setAttribute('download', `meal-plan-${new Date().toISOString().split('T')[0]}.csv`);
                  link.style.visibility = 'hidden';
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                
                  showNotification('Success', `Meal plan CSV exported successfully! ${hasContent ? `Total: ${totalCalories} calories` : ''}`, 'success');
                
              } catch (error) {
                  console.error('Error exporting CSV:', error);
                  showNotification('Export Error', 'Error exporting CSV. Please try again.', 'error');
              }
          }
        
          // Toggle grocery list format dropdown
          function toggleGroceryDropdown() {
              const dropdown = document.getElementById('groceryDropdown');
            
              if (!dropdown) {
                  console.error('Grocery dropdown element not found');
                  return;
              }
            
              const isHidden = dropdown.classList.contains('hidden');
            
              if (isHidden) {
                  // Show dropdown
                  dropdown.classList.remove('hidden');
                  console.log('Grocery dropdown shown');
                
                  // Ensure it's visible on mobile
                  if (window.innerWidth <= 480) {
                      dropdown.style.position = 'absolute';
                      dropdown.style.top = '100%';
                      dropdown.style.right = '0';
                      dropdown.style.zIndex = '9999';
                      console.log('Mobile dropdown positioning applied');
                  }
              } else {
                  // Hide dropdown
                  dropdown.classList.add('hidden');
                  console.log('Grocery dropdown hidden');
              }
            
              // Close dropdown when clicking outside
              if (isHidden) {
                  setTimeout(() => {
                      document.addEventListener('click', function closeDropdown(e) {
                          if (!e.target.closest('.relative')) {
                              dropdown.classList.add('hidden');
                              document.removeEventListener('click', closeDropdown);
                              console.log('Dropdown closed by outside click');
                          }
                      });
                  }, 100);
              }
          }


   function loadMacroHistory() {
              console.log('📡 Loading macro history data...');
            
              try {
                  // Try database first (highest priority)
                  const dbHistory = await loadMacroHistoryFromDB();
                
                  if (dbHistory && dbHistory.length > 0) {
                      macroHistory = dbHistory;
                      console.log('✅ Loaded macro history from database:', macroHistory.length, 'entries');
                    
                      // Also save to localStorage for offline access
                      localStorage.setItem('macroHistory', JSON.stringify(macroHistory));
                      return;
                  }
                
                  // Fallback to localStorage
                  console.log('📱 Loading macro history from localStorage fallback...');
                  const saved = localStorage.getItem('macroHistory');
                  if (saved && saved !== 'null') {
                      const parsed = JSON.parse(saved);
                      if (Array.isArray(parsed)) {
                          macroHistory = parsed;
                          console.log('Loaded macro history from localStorage:', macroHistory.length, 'entries');
                      } else {
                          macroHistory = [];
                      }
                  } else {
                      macroHistory = [];
                  }
              } catch (error) {
                  console.error('❌ Error loading macro history:', error);
                
                  // Final fallback to localStorage
                  try {
                      const saved = localStorage.getItem('macroHistory');
                      if (saved && saved !== 'null') {
                          const parsed = JSON.parse(saved);
                          if (Array.isArray(parsed)) {
                              macroHistory = parsed;
                          } else {
                              macroHistory = [];
                          }
                      } else {
                          macroHistory = [];
                      }
                  } catch (localStorageError) {
                      console.error('❌ Even localStorage fallback failed:', localStorageError);
                      macroHistory = [];
                  }
              }
          }


   function updateMacroProgressDisplay() {
              const last7Days = macroHistory
                  .sort((a, b) => new Date(b.date) - new Date(a.date))
                  .slice(0, 7);

              if (last7Days.length > 0) {
                  // Calculate averages
                  const avgProtein = Math.round(last7Days.reduce((sum, entry) => sum + entry.protein, 0) / last7Days.length);
                  const avgCarbs = Math.round(last7Days.reduce((sum, entry) => sum + entry.carbs, 0) / last7Days.length);
                  const avgFat = Math.round(last7Days.reduce((sum, entry) => sum + entry.fat, 0) / last7Days.length);

                  // Calculate trends (compare first 3 days vs last 3 days)
                  const firstHalf = last7Days.slice(-3);
                  const secondHalf = last7Days.slice(0, 3);
                
                  const proteinTrend = calculateTrend(firstHalf, secondHalf, 'protein');
                  const carbsTrend = calculateTrend(firstHalf, secondHalf, 'carbs');
                  const fatTrend = calculateTrend(firstHalf, secondHalf, 'fat');

                  updateElement('avgProtein', avgProtein + 'g');
                  updateElement('avgCarbs', avgCarbs + 'g');
                  updateElement('avgFat', avgFat + 'g');
                  updateElement('proteinTrend', proteinTrend);
                  updateElement('carbsTrend', carbsTrend);
                  updateElement('fatTrend', fatTrend);
              }

              updateMacroHistoryTable();
          }


   function updateMacroHistoryTable() {
              const tableBody = document.getElementById('macroHistoryTable');
              if (!tableBody) return;

              const last7Days = macroHistory
                  .sort((a, b) => new Date(b.date) - new Date(a.date))
                  .slice(0, 7);

              if (last7Days.length === 0) {
                  tableBody.innerHTML = `
                      <tr>
                          <td colspan="6" class="text-center py-8 text-gray-500">
                              <i class="fas fa-chart-line text-2xl mb-2"></i>
                              <p>Start tracking daily macros to see your progress here!</p>
                          </td>
                      </tr>
                  `;
                  return;
              }

              tableBody.innerHTML = last7Days.map(entry => {
                  const date = new Date(entry.date).toLocaleDateString();
                  const goalBadge = entry.goalsMet 
                      ? '<span class="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">✓ Met</span>'
                      : '<span class="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs">✗ Missed</span>';
                
                  return `
                      <tr class="border-b border-gray-100 hover:bg-gray-50">
                          <td class="p-3 font-medium">${date}</td>
                          <td class="p-3 text-center">${entry.calories}</td>
                          <td class="p-3 text-center text-red-600">${entry.protein}g (${entry.proteinPercent}%)</td>
                          <td class="p-3 text-center text-yellow-600">${entry.carbs}g (${entry.carbsPercent}%)</td>
                          <td class="p-3 text-center text-green-600">${entry.fat}g (${entry.fatPercent}%)</td>
                          <td class="p-3 text-center">${goalBadge}</td>
                      </tr>
                  `;
              }).join('');
          }


   function initializeMacroCharts() {
              console.log('Initializing macro charts...');
              // Destroy existing macro charts first to prevent canvas conflicts
              macroTotalsChart = destroyChart(macroTotalsChart);
              macroGoalsChart = destroyChart(macroGoalsChart);
            
              // Initialize Macro Totals Chart
              const totalsCtx = document.getElementById('macroTotalsChart');
              if (totalsCtx) {
                  try {
                      macroTotalsChart = new Chart(totalsCtx, {
                          type: 'line',
                          data: {
                              labels: [],
                              datasets: [
                                  {
                                      label: 'Protein (g)',
                                      data: [],
                                      borderColor: '#ef4444',
                                      backgroundColor: 'rgba(239, 68, 68, 0.1)',
                                      borderWidth: 2,
                                      fill: false,
                                      tension: 0.3,
                                      pointRadius: 4,
                                      pointHoverRadius: 6
                                  },
                                  {
                                      label: 'Carbs (g)',
                                      data: [],
                                      borderColor: '#f59e0b',
                                      backgroundColor: 'rgba(245, 158, 11, 0.1)',
                                      borderWidth: 2,
                                      fill: false,
                                      tension: 0.3,
                                      pointRadius: 4,
                                      pointHoverRadius: 6
                                  },
                                  {
                                      label: 'Fat (g)',
                                      data: [],
                                      borderColor: '#10b981',
                                      backgroundColor: 'rgba(16, 185, 129, 0.1)',
                                      borderWidth: 2,
                                      fill: false,
                                      tension: 0.3,
                                      pointRadius: 4,
                                      pointHoverRadius: 6
                                  }
                              ]
                          },
                          options: {
                              responsive: true,
                              maintainAspectRatio: false,
                              interaction: {
                                  mode: 'index',
                                  intersect: false
                              },
                              scales: {
                                  y: {
                                      beginAtZero: true,
                                      title: {
                                          display: true,
                                          text: 'Grams'
                                      },
                                      grid: {
                                          color: 'rgba(0,0,0,0.1)'
                                      }
                                  },
                                  x: {
                                      grid: {
                                          color: 'rgba(0,0,0,0.1)'
                                      }
                                  }
                              },
                              plugins: {
                                  legend: {
                                      position: 'top'
                                  },
                                  tooltip: {
                                      mode: 'index',
                                      intersect: false
                                  }
                              }
                          }
                      });
                      console.log('Macro totals chart initialized');
                  } catch (error) {
                      console.error('Error initializing macro totals chart:', error);
                  }
              } else {
                  console.error('Macro totals chart canvas not found');
              }

              // Initialize Macro Goals Chart
              const goalsCtx = document.getElementById('macroGoalsChart');
              if (goalsCtx) {
                  try {
                      macroGoalsChart = new Chart(goalsCtx, {
                          type: 'line',
                          data: {
                              labels: [],
                              datasets: [
                                  {
                                      label: 'Protein %',
                                      data: [],
                                      borderColor: '#ef4444',
                                      backgroundColor: 'rgba(239, 68, 68, 0.1)',
                                      borderWidth: 2,
                                      fill: false,
                                      tension: 0.3,
                                      pointRadius: 4,
                                      pointHoverRadius: 6
                                  },
                                  {
                                      label: 'Carbs %',
                                      data: [],
                                      borderColor: '#f59e0b',
                                      backgroundColor: 'rgba(245, 158, 11, 0.1)',
                                      borderWidth: 2,
                                      fill: false,
                                      tension: 0.3,
                                      pointRadius: 4,
                                      pointHoverRadius: 6
                                  },
                                  {
                                      label: 'Fat %',
                                      data: [],
                                      borderColor: '#10b981',
                                      backgroundColor: 'rgba(16, 185, 129, 0.1)',
                                      borderWidth: 2,
                                      fill: false,
                                      tension: 0.3,
                                      pointRadius: 4,
                                      pointHoverRadius: 6
                                  }
                              ]
                          },
                          options: {
                              responsive: true,
                              maintainAspectRatio: false,
                              interaction: {
                                  mode: 'index',
                                  intersect: false
                              },
                              scales: {
                                  y: {
                                      beginAtZero: true,
                                      max: 150,
                                      title: {
                                          display: true,
                                          text: 'Goal Achievement %'
                                      },
                                      grid: {
                                          color: 'rgba(0,0,0,0.1)'
                                      },
                                      ticks: {
                                          callback: function(value) {
                                              return value + '%';
                                          }
                                      }
                                  },
                                  x: {
                                      grid: {
                                          color: 'rgba(0,0,0,0.1)'
                                      }
                                  }
                              },
                              plugins: {
                                  legend: {
                                      position: 'top'
                                  },
                                  tooltip: {
                                      mode: 'index',
                                      intersect: false,
                                      callbacks: {
                                          label: function(context) {
                                              return context.dataset.label + ': ' + context.parsed.y + '%';
                                          }
                                      }
                                  }
                              }
                          }
                      });
                      console.log('Macro goals chart initialized');
                  } catch (error) {
                      console.error('Error initializing macro goals chart:', error);
                  }
              } else {
                  console.error('Macro goals chart canvas not found');
              }

              // Initial update with current data
              setTimeout(() => {
                  updateMacroCharts();
              }, 100);
          }


   function updateMacroCharts() {
              try {
                  const last7Days = macroHistory
                      .sort((a, b) => new Date(a.date) - new Date(b.date))
                      .slice(-7);

                  if (last7Days.length === 0) {
                      // Show empty state for charts
                      if (macroTotalsChart) {
                          macroTotalsChart.data.labels = ['No Data'];
                          macroTotalsChart.data.datasets[0].data = [];
                          macroTotalsChart.data.datasets[1].data = [];
                          macroTotalsChart.data.datasets[2].data = [];
                          macroTotalsChart.update('none');
                      }
                    
                      if (macroGoalsChart) {
                          macroGoalsChart.data.labels = ['No Data'];
                          macroGoalsChart.data.datasets[0].data = [];
                          macroGoalsChart.data.datasets[1].data = [];
                          macroGoalsChart.data.datasets[2].data = [];
                          macroGoalsChart.update('none');
                      }
                    
                      console.log('No macro data available for charts');
                      return;
                  }

                  const labels = last7Days.map(entry => {
                      const date = new Date(entry.date);
                      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                  });

                  // Update Totals Chart
                  if (macroTotalsChart) {
                      macroTotalsChart.data.labels = labels;
                      macroTotalsChart.data.datasets[0].data = last7Days.map(entry => entry.protein || 0);
                      macroTotalsChart.data.datasets[1].data = last7Days.map(entry => entry.carbs || 0);
                      macroTotalsChart.data.datasets[2].data = last7Days.map(entry => entry.fat || 0);
                      macroTotalsChart.update('none');
                      console.log('Updated macro totals chart with', last7Days.length, 'days of data');
                  } else {
                      console.warn('Macro totals chart not available');
                  }

                  // Update Goals Chart
                  if (macroGoalsChart) {
                      macroGoalsChart.data.labels = labels;
                      macroGoalsChart.data.datasets[0].data = last7Days.map(entry => entry.proteinPercent || 0);
                      macroGoalsChart.data.datasets[1].data = last7Days.map(entry => entry.carbsPercent || 0);
                      macroGoalsChart.data.datasets[2].data = last7Days.map(entry => entry.fatPercent || 0);
                      macroGoalsChart.update('none');
                      console.log('Updated macro goals chart with', last7Days.length, 'days of data');
                  } else {
                      console.warn('Macro goals chart not available');
                  }
              } catch (error) {
                  console.error('Error updating macro charts:', error);
              }
          }


   function exportMealPlanPDF() {
              try {
                  // First check if jsPDF is available
                  if (typeof window.jspdf === 'undefined') {
                      // Load jsPDF library if not already loaded
                      const script = document.createElement('script');
                      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
                      script.onload = () => {
                          exportMealPlanPDF(); // Retry after loading
                      };
                      document.head.appendChild(script);
                      showNotification('Loading PDF library...', 'Please wait', 'info');
                      return;
                  }
                
                  const { jsPDF } = window.jspdf;
                  const doc = new jsPDF();
                
                  // Get current date
                  const currentDate = new Date();
                  const weekStart = new Date(currentDate.setDate(currentDate.getDate() - currentDate.getDay()));
                
                  // Title
                  doc.setFontSize(20);
                  doc.text('Weekly Meal Plan', 20, 30);
                
                  doc.setFontSize(12);
                  doc.text(`Week of: ${weekStart.toLocaleDateString()}`, 20, 45);
                
                  // Get meal plan data from the correct location
                  const savedMealPlan = window.JSON?.safeParse ? 
              window.JSON.safeParse(localStorage.getItem('mealPlan') || '{}', {}) :
              (() => {
                  try {
                      return JSON.parse(localStorage.getItem('mealPlan') || '{}');
                  } catch (error) {
                      console.warn('Error parsing meal plan:', error);
                      return {};
                  }
              })();
                  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
                  const dayLabels = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
                
                  let yPosition = 60;
                  let hasContent = false;
                
                  days.forEach((day, index) => {
                      const dayData = savedMealPlan[day] || { breakfast: [], lunch: [], dinner: [] };
                      const hasDataForDay = dayData.breakfast.length > 0 || dayData.lunch.length > 0 || dayData.dinner.length > 0;
                    
                      if (hasDataForDay) {
                          hasContent = true;
                        
                          // Day header
                          doc.setFontSize(14);
                          doc.setFont(undefined, 'bold');
                          doc.text(dayLabels[index], 20, yPosition);
                          yPosition += 10;
                        
                          doc.setFont(undefined, 'normal');
                          doc.setFontSize(10);
                        
                          // Breakfast
                          if (dayData.breakfast && dayData.breakfast.length > 0) {
                              doc.text('  Breakfast:', 25, yPosition);
                              yPosition += 5;
                              dayData.breakfast.forEach(item => {
                                  const macros = `${item.calories || 0} cal, ${item.protein || 0}g P, ${item.carbs || 0}g C, ${item.fat || 0}g F`;
                                  doc.text(`    • ${item.name} (${macros})`, 30, yPosition);
                                  yPosition += 5;
                              });
                          }
                        
                          // Lunch
                          if (dayData.lunch && dayData.lunch.length > 0) {
                              doc.text('  Lunch:', 25, yPosition);
                              yPosition += 5;
                              dayData.lunch.forEach(item => {
                                  const macros = `${item.calories || 0} cal, ${item.protein || 0}g P, ${item.carbs || 0}g C, ${item.fat || 0}g F`;
                                  doc.text(`    • ${item.name} (${macros})`, 30, yPosition);
                                  yPosition += 5;
                              });
                          }
                        
                          // Dinner
                          if (dayData.dinner && dayData.dinner.length > 0) {
                              doc.text('  Dinner:', 25, yPosition);
                              yPosition += 5;
                              dayData.dinner.forEach(item => {
                                  const macros = `${item.calories || 0} cal, ${item.protein || 0}g P, ${item.carbs || 0}g C, ${item.fat || 0}g F`;
                                  doc.text(`    • ${item.name} (${macros})`, 30, yPosition);
                                  yPosition += 5;
                              });
                          }
                        
                          yPosition += 10;
                        
                          // Check if we need a new page
                          if (yPosition > 250) {
                              doc.addPage();
                              yPosition = 20;
                          }
                      }
                  });
                
                  if (!hasContent) {
                      doc.text('No meals planned yet. Add some meals to your planner!', 20, yPosition);
                  }
                
                  // Download the PDF
                  doc.save(`meal-plan-${weekStart.toISOString().split('T')[0]}.pdf`);
                  showNotification('Success', 'Meal plan PDF exported successfully!', 'success');
                
              } catch (error) {
                  console.error('Error exporting PDF:', error);
                  showNotification('Export Error', 'Error exporting PDF. Please try again.', 'error');
              }
          }


   function initializeApp() {
              console.log('Initializing Macro Calculator (Protected by Cloudflare Access)...');
            
              // Check authentication for invite-only system
              try {
                  const authState = await window.authHelper.getAuthState();
                  if (!authState.isAuthenticated) {
                      console.warn('User not authenticated - redirecting to login');
                      window.authHelper.redirectToLogin();
                      return; // Stop initialization
                  }
                  console.info('✅ User authenticated, proceeding with app initialization');
              } catch (error) {
                  console.error('Authentication check failed:', error);
                  window.authHelper.redirectToLogin();
                  return;
              }
            
              // Clean up any old authentication session data
              localStorage.removeItem('macro_auth_session');
            
              // Check if Chart.js is loaded
              if (typeof Chart === 'undefined') {
                  console.error('Chart.js is not loaded! Charts will not work.');
                  showNotification('Charts Error', 'Chart.js library failed to load. Charts will not work.', 'error');
                  return;
              } else {
                  console.log('Chart.js version:', Chart.version);
              }
            
              // Initialize in proper order with delays
              initializeUnitSystem();
            
              setTimeout(async () => {
                  // Load basic data first (without database calls)
                  await loadBasicStoredData();
                  initializeRecipeDatabase();
                  initializeProgressTracker();
                  initializeMacroTracking();
                
                  // Load weekly meal planner data
                  loadMealPlan().catch(error => console.warn('Meal plan load error:', error));
                
                  // Check for and restore final backup if needed
                  checkForFinalBackup();
              }, 100);
            
              setTimeout(() => {
                  initializeAllCharts();
                  updateProgress();
                  allChartsInitialized = true;
                
                  // Setup auto-save mechanism
                  setupAutoSave();
                
                  // Verify data integrity
                  verifyDataIntegrity();
                
                  // Ensure display is synchronized with saved/calculated values
                  ensureDisplaySync();
                
                  // Ensure meal displays are properly updated after initialization
                  refreshMealDisplays();
                
                  // Save data before page unload
                  window.addEventListener('beforeunload', function(event) {
                      console.log('Page unloading - saving progress data...');
                      saveProgressData();
                    
                      // Create final backup
                      try {
                          const finalBackup = {
                              progressEntries: progressEntries,
                              progressGoal: progressGoal,
                              timestamp: Date.now(),
                              finalSave: true
                          };
                          localStorage.setItem('progress_final_backup', JSON.stringify(finalBackup));
                      } catch (error) {
                          console.error('Error creating final backup:', error);
                      }
                  });
                
                  console.log('All app components initialized successfully');
              }, 500);
          }


})();

