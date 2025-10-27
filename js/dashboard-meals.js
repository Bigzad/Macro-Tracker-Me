/* === ORIGINAL EXTRACTED CODE === */
// Module reconstructed from original inline script
// Category: meals

(function(){

   function saveDailyMeals(meals, date = null) {
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


   function loadDailyMeals(date = null) {
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


   function loadBasicStoredData() {
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
              }


   function saveMealPlan() {
              // Always save to localStorage first (immediate backup)
              localStorage.setItem('mealPlan', JSON.stringify(mealPlan));
              localStorage.setItem('customSections', JSON.stringify(customSections));
            
              // Save to Supabase database for cross-device sync
              try {
                  await saveMealPlanToDatabase();
              } catch (error) {
                  console.warn('⚠️ Failed to sync meal plan to database:', error.message);
              }
          }


   function saveMealPlanToDatabase() {
              if (!window.supabaseClient && !window.apiCall) {
                  console.log('ℹ️ No database connection available for meal plan sync');
                  return;
              }

              console.log('💾 Syncing meal plan to database (New Schema)...');

              try {
                  // Get current user context for new schema
                  const userContext = await getCurrentUserContext();
                
                  // Prepare meal plan data for new schema
                  const mealPlanData = {
                      user_id: userContext.user_id,
                      anon_profile_id: userContext.anon_profile_id,
                      week_data: mealPlan, // Store as JSONB directly (not stringified)
                      updated_at: new Date().toISOString()
                  };

                  let supabaseSuccess = false;

                  // Try Supabase first (if available)
                  if (window.supabaseClient) {
                      try {
                          // Build where clause based on user type
                          let whereClause = {};
                          if (userContext.type === 'authenticated') {
                              whereClause.user_id = userContext.user_id;
                          } else {
                              whereClause.anon_profile_id = userContext.anon_profile_id;
                          }
                        
                          // Check if meal plan exists for this user
                          const { data: existing, error: selectError } = await window.supabaseClient
                              .from('meal_plans')
                              .select('*')
                              .match(whereClause)
                              .maybeSingle();

                          if (existing && !selectError) {
                              // Update existing meal plan
                              const { data, error } = await window.supabaseClient
                                  .from('meal_plans')
                                  .update(mealPlanData)
                                  .match(whereClause)
                                  .select();
                            
                              if (error) {
                                  console.warn('⚠️ Supabase meal plan update failed:', error.message);
                                  throw error;
                              }
                              console.log('✅ Meal plan updated in Supabase (New Schema):', data);
                              supabaseSuccess = true;
                          } else {
                              // Create new meal plan
                              const { data, error } = await window.supabaseClient
                                  .from('meal_plans')
                                  .insert(mealPlanData)
                                  .select();
                            
                              if (error) {
                                  console.warn('⚠️ Supabase meal plan insert failed:', error.message);
                                  throw error;
                              }
                              console.log('✅ Meal plan created in Supabase (New Schema):', data);
                              supabaseSuccess = true;
                          }
                      } catch (supabaseError) {
                          console.error('❌ Supabase meal plan operation failed:', supabaseError.message);
                        
                          // Check if it's a schema-related error
                          if (supabaseError.message && (
                              supabaseError.message.includes('week_data') || 
                              supabaseError.message.includes('column') ||
                              supabaseError.message.includes('PGRST')
                          )) {
                              console.log('🔄 Schema mismatch detected, falling back to RESTful API...');
                          }
                          // Continue to RESTful API fallback
                      }
                  }

                  // Fallback to RESTful API (if Supabase not available or failed)
                  if (!supabaseSuccess && window.apiCall) {
                      console.log('📡 Using RESTful API for meal plan save (New Schema)...');
                    
                      // For RESTful API, we need to convert JSONB back to string
                      const apiMealPlanData = {
                          ...mealPlanData,
                          week_data: JSON.stringify(mealPlan) // Convert back to string for RESTful API
                      };
                    
                      // Check if meal plan exists using UUID-based search
                      const searchField = userContext.type === 'authenticated' ? 'user_id' : 'anon_profile_id';
                      const searchValue = userContext.type === 'authenticated' ? userContext.user_id : userContext.anon_profile_id;
                    
                      // Use direct Supabase query to avoid PGRST100 errors
                      console.log('🔍 Loading existing meal plans with safe query for:', searchValue);
                      let query = window.supabaseClient.from('meal_plans').select('*');
                      if (window.SupabaseQueryHelper) {
                          query = window.SupabaseQueryHelper.applySearchFilter(query, searchValue, 'meal_plans');
                      } else {
                          // Determine field based on searchValue type (UUID vs email)
                          const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(searchValue);
                          const field = isUUID ? 'user_id' : 'user_email';
                          query = query.eq(field, searchValue);
                      }
                      const { data: existingData, error: existingError } = await query;
                      if (existingError) throw existingError;
                    
                      const existingResponse = { data: existingData };
                    
                      if (existingResponse.data && existingResponse.data.length > 0) {
                          // Find the correct user's meal plan
                          const userMealPlan = existingResponse.data.find(plan => plan[searchField] === searchValue);
                        
                          if (userMealPlan) {
                              // Update existing
                              await apiCall(`tables/meal_plans/${userMealPlan.id}`, 'PUT', apiMealPlanData);
                              console.log('✅ Meal plan updated via RESTful API (New Schema)');
                          } else {
                              // Create new - no existing meal plan found for this user
                              await apiCall('tables/meal_plans', 'POST', apiMealPlanData);
                              console.log('✅ Meal plan created via RESTful API (New Schema)');
                          }
                      } else {
                          // Create new - no meal plans exist at all
                          await apiCall('tables/meal_plans', 'POST', apiMealPlanData);
                          console.log('✅ Meal plan created via RESTful API (New Schema)');
                      }
                  }

              } catch (error) {
                  console.error('❌ Failed to save meal plan to database:', error);
                  throw error;
              }
          }


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


})();

