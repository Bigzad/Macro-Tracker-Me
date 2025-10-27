/* === ORIGINAL EXTRACTED CODE === */
// Module reconstructed from original inline script
// Category: recipes

(function(){

   function saveCustomRecipeToDB(recipe) {
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


   function loadCustomRecipes() {
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


   function loadStoredData() {
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
                    
                  }


   function initializeRecipeDatabase() {
              loadCustomRecipes();
              displayRecipes();
          }


   function toggleAddRecipeForm() {
              const form = document.getElementById('addRecipeForm');
              const button = document.getElementById('addRecipeToggle');
            
              if (form.classList.contains('hidden')) {
                  form.classList.remove('hidden');
                  button.innerHTML = '<i class="fas fa-times mr-1"></i>Cancel';
                  button.classList.remove('bg-green-500', 'hover:bg-green-600');
                  button.classList.add('bg-gray-500', 'hover:bg-gray-600');
              } else {
                  form.classList.add('hidden');
                  button.innerHTML = '<i class="fas fa-plus mr-1"></i>Add Recipe';
                  button.classList.remove('bg-gray-500', 'hover:bg-gray-600');
                  button.classList.add('bg-green-500', 'hover:bg-green-600');
                  clearRecipeForm();
              }
          }


   function saveCustomRecipe() {
              const name = document.getElementById('newRecipeName').value.trim();
              const category = document.getElementById('newRecipeCategory').value;
              const calories = parseFloat(document.getElementById('newRecipeCalories').value) || 0;
              const protein = parseFloat(document.getElementById('newRecipeProtein').value) || 0;
              const carbs = parseFloat(document.getElementById('newRecipeCarbs').value) || 0;
              const fat = parseFloat(document.getElementById('newRecipeFat').value) || 0;
              const servings = parseInt(document.getElementById('newRecipeServings').value) || 1;
              const ingredients = document.getElementById('newRecipeIngredients').value.trim().split('\n').filter(i => i.trim());
              const instructions = document.getElementById('newRecipeInstructions').value.trim();

              if (!name || !instructions) {
                  showNotification('Missing Information', 'Please fill in at least the recipe name and instructions', 'warning');
                  return;
              }

              const newRecipe = {
                  id: Date.now(),
                  name: name,
                  category: category,
                  calories: calories,
                  protein: protein,
                  carbs: carbs,
                  fat: fat,
                  servings: servings || 1,
                  ingredients: ingredients,
                  instructions: instructions,
                  source: 'custom'
              };

              // Save to database first
              saveCustomRecipeToDB(newRecipe).then(() => {
                  console.log('Recipe saved to permanent storage');
              }).catch(error => {
                  console.error('Error saving recipe to database:', error);
              });

              customRecipes.push(newRecipe);
              saveCustomRecipes(); // Fallback localStorage save
              displayRecipes();
              toggleAddRecipeForm();
              showNotification('Recipe Saved', 'Your custom recipe has been successfully saved!', 'success');
          }


   function deleteCustomRecipe(recipeId) {
              const recipe = customRecipes.find(r => r.id === recipeId);
              showConfirmDialog(
                  'Delete Recipe',
                  `Are you sure you want to delete "${recipe?.name}"? This action cannot be undone.`,
                  () => {
                      customRecipes = customRecipes.filter(recipe => recipe.id !== recipeId);
                      saveCustomRecipes();
                      displayRecipes();
                      showNotification('Recipe Deleted', 'Recipe has been successfully removed', 'success');
                  }
              );
          }


   function clearCustomRecipes() {
              showConfirmDialog(
                  'Clear All Custom Recipes',
                  'Are you sure you want to delete all your custom recipes? This action cannot be undone and will permanently remove all recipes you\'ve created.',
                  () => {
                      const count = customRecipes.length;
                      customRecipes = [];
                      saveCustomRecipes();
                      displayRecipes();
                      showNotification('Custom Recipes Cleared', `${count} custom recipes have been permanently removed`, 'success');
                  }
              );
          }


   function filterRecipes() {
              const searchTerm = document.getElementById('recipeSearch').value.toLowerCase();
              const categoryFilter = document.getElementById('recipeFilter').value;
              const calorieRange = document.getElementById('caloryRange').value;

              const allRecipes = [...recipes, ...customRecipes];
            
              filteredRecipes = allRecipes.filter(recipe => {
                  // Search filter
                  const matchesSearch = recipe.name.toLowerCase().includes(searchTerm) || 
                                      recipe.ingredients.some(ingredient => ingredient.toLowerCase().includes(searchTerm));
                
                  // Category filter
                  const matchesCategory = !categoryFilter || 
                                        recipe.category === categoryFilter || 
                                        (categoryFilter === 'custom' && recipe.source === 'custom');
                
                  // Calorie range filter
                  let matchesCalories = true;
                  if (calorieRange) {
                      if (calorieRange === '0-300') matchesCalories = recipe.calories <= 300;
                      else if (calorieRange === '300-500') matchesCalories = recipe.calories > 300 && recipe.calories <= 500;
                      else if (calorieRange === '500-700') matchesCalories = recipe.calories > 500 && recipe.calories <= 700;
                      else if (calorieRange === '700+') matchesCalories = recipe.calories > 700;
                  }

                  return matchesSearch && matchesCategory && matchesCalories;
              });

              // Reset display state when filtering
              showAllRecipes = false;
              displayRecipes();
          }


   function updateShowMoreButton(totalRecipes) {
              const showMoreContainer = document.getElementById('showMoreContainer');
              const showMoreBtn = document.getElementById('showMoreBtn');
              const hiddenCount = document.getElementById('hiddenCount');

              if (totalRecipes <= RECIPES_INITIAL_DISPLAY) {
                  // Hide button if there are 4 or fewer recipes
                  showMoreContainer.classList.add('hidden');
              } else {
                  // Show button if there are more than 4 recipes
                  showMoreContainer.classList.remove('hidden');
                
                  if (showAllRecipes) {
                      showMoreBtn.innerHTML = '<i class="fas fa-chevron-up mr-2"></i>Show Less Recipes';
                  } else {
                      const hiddenRecipes = totalRecipes - RECIPES_INITIAL_DISPLAY;
                      hiddenCount.textContent = hiddenRecipes;
                      showMoreBtn.innerHTML = `<i class="fas fa-chevron-down mr-2"></i>Show More Recipes (<span id="hiddenCount">${hiddenRecipes}</span> hidden)`;
                  }
              }
          }


   function toggleRecipeDisplay() {
              showAllRecipes = !showAllRecipes;
              displayRecipes();
            
              // Scroll to recipes container when showing more
              if (showAllRecipes) {
                  document.getElementById('recipesContainer').scrollIntoView({ 
                      behavior: 'smooth', 
                      block: 'start' 
                  });
              }
          }


   function saveCustomRecipes() {
              localStorage.setItem('customRecipes', JSON.stringify(customRecipes));
          }


   function parseIngredient(ingredientStr) {
              // Extract quantity, unit, and name from ingredient string
              const match = ingredientStr.match(/^(\d+(?:\.\d+)?)\s*(\w+)?\s+(.+)/) || 
                           ingredientStr.match(/^(\d+(?:\.\d+)?)\s+(.+)/) ||
                           [null, 1, '', ingredientStr];
            
              return {
                  quantity: parseFloat(match[1]) || 1,
                  unit: match[2] || '',
                  name: (match[3] || match[2] || ingredientStr).trim()
              };
          }


   function getStoreCategories(ingredientsList) {
              const storeCategories = {
                  '🥩 MEAT & SEAFOOD': {
                      keywords: ['chicken', 'beef', 'fish', 'turkey', 'pork', 'salmon', 'tuna', 'shrimp', 'lamb', 'ground beef', 'steak'],
                      items: []
                  },
                  '🥬 FRESH PRODUCE': {
                      keywords: ['lettuce', 'tomato', 'onion', 'pepper', 'broccoli', 'spinach', 'carrot', 'cucumber', 'avocado', 'garlic', 'ginger', 'herb', 'vegetable', 'apple', 'banana', 'berry', 'fruit', 'orange', 'lemon', 'lime'],
                      items: []
                  },
                  '🥛 DAIRY & EGGS': {
                      keywords: ['milk', 'cheese', 'yogurt', 'butter', 'cream', 'egg', 'dairy'],
                      items: []
                  },
                  '🍞 BAKERY & BREAD': {
                      keywords: ['bread', 'bagel', 'roll', 'bun', 'croissant', 'muffin', 'pastry'],
                      items: []
                  },
                  '🌾 GRAINS & PASTA': {
                      keywords: ['rice', 'pasta', 'noodle', 'quinoa', 'oat', 'cereal', 'flour', 'grain'],
                      items: []
                  },
                  '🥫 CANNED GOODS': {
                      keywords: ['canned', 'jar', 'sauce', 'soup', 'broth', 'stock'],
                      items: []
                  },
                  '❄️ FROZEN FOODS': {
                      keywords: ['frozen', 'ice cream'],
                      items: []
                  },
                  '🧂 SPICES & CONDIMENTS': {
                      keywords: ['salt', 'pepper', 'spice', 'seasoning', 'oil', 'vinegar', 'mayo', 'mustard', 'ketchup'],
                      items: []
                  },
                  '🥤 BEVERAGES': {
                      keywords: ['juice', 'soda', 'water', 'tea', 'coffee', 'drink'],
                      items: []
                  },
                  '🛒 OTHER ITEMS': {
                      keywords: [],
                      items: []
                  }
              };
            
              // Categorize ingredients
              Object.values(ingredientsList).forEach(ingredient => {
                  const lower = ingredient.name.toLowerCase();
                  let categorized = false;
                
                  for (const [categoryName, category] of Object.entries(storeCategories)) {
                      if (categoryName === '🛒 OTHER ITEMS') continue;
                    
                      if (category.keywords.some(keyword => lower.includes(keyword))) {
                          category.items.push(ingredient);
                          categorized = true;
                          break;
                      }
                  }
                
                  if (!categorized) {
                      storeCategories['🛒 OTHER ITEMS'].items.push(ingredient);
                  }
              });
            
              return storeCategories;
          }


})();

