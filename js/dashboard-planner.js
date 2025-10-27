/* === ORIGINAL EXTRACTED CODE === */
// Module reconstructed from original inline script
// Category: planner

(function(){

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


   function selectDay(day) {
              currentSelectedDay = day;
            
              // Update button states
              document.querySelectorAll('.day-btn').forEach(btn => {
                  btn.classList.remove('bg-blue-500', 'text-white');
                  btn.classList.add('bg-blue-100', 'text-blue-800');
              });
            
              document.getElementById(`btn-${day}`).classList.remove('bg-blue-100', 'text-blue-800');
              document.getElementById(`btn-${day}`).classList.add('bg-blue-500', 'text-white');
            
              // Update current day display
              document.getElementById('currentDay').textContent = day.charAt(0).toUpperCase() + day.slice(1);
            
              // Refresh meal displays
              updateMealPlanDisplay();
          }


   function addPlannedMeal(mealType) {
              const mealName = document.getElementById(`${mealType}-meal`).value.trim();
              const calories = parseFloat(document.getElementById(`${mealType}-calories`).value) || 0;
              const protein = parseFloat(document.getElementById(`${mealType}-protein`).value) || 0;
              const carbs = parseFloat(document.getElementById(`${mealType}-carbs`).value) || 0;
              const fat = parseFloat(document.getElementById(`${mealType}-fat`).value) || 0;

              if (!mealName) {
                  showNotification('Missing Information', 'Please enter a meal name', 'warning');
                  return;
              }

              const plannedMeal = {
                  id: Date.now(),
                  name: mealName,
                  calories: calories,
                  protein: protein,
                  carbs: carbs,
                  fat: fat
              };

              mealPlan[currentSelectedDay][mealType].push(plannedMeal);

              // Clear form
              document.getElementById(`${mealType}-meal`).value = '';
              document.getElementById(`${mealType}-calories`).value = '';
              document.getElementById(`${mealType}-protein`).value = '';
              document.getElementById(`${mealType}-carbs`).value = '';
              document.getElementById(`${mealType}-fat`).value = '';

              updateMealPlanDisplay();
              saveMealPlan().catch(error => console.warn('Meal plan save error:', error));
          }


   function deletePlannedMeal(mealType, mealId) {
              mealPlan[currentSelectedDay][mealType] = mealPlan[currentSelectedDay][mealType].filter(meal => meal.id !== mealId);
              updateMealPlanDisplay();
              saveMealPlan().catch(error => console.warn('Meal plan save error:', error));
          }


   function updateMealPlanDisplay() {
              const dayPlan = mealPlan[currentSelectedDay];
            
              // Update meal lists (including custom section if enabled)
              const mealTypes = ['breakfast', 'lunch', 'dinner'];
              if (customSectionEnabled) {
                  mealTypes.push('custom');
              }
            
              mealTypes.forEach(mealType => {
                  const listElement = document.getElementById(`${mealType}-list`);
                  if (!listElement) return; // Skip if element doesn't exist
                
                  listElement.innerHTML = '';
                
                  // Ensure the meal type exists in the day plan
                  if (!dayPlan[mealType]) {
                      dayPlan[mealType] = [];
                  }
                
                  dayPlan[mealType].forEach(meal => {
                      const mealDiv = document.createElement('div');
                      mealDiv.className = 'bg-gray-50 p-2 rounded text-xs flex justify-between items-center';
                      mealDiv.innerHTML = `
                          <div>
                              <div class="font-medium">${meal.name}</div>
                              <div class="text-gray-600">${meal.calories} cal • ${meal.protein}g P • ${meal.carbs || 0}g C • ${meal.fat || 0}g F</div>
                          </div>
                          <button onclick="deletePlannedMeal('${mealType}', ${meal.id})" class="text-red-500 hover:text-red-700 text-xs">
                              <i class="fas fa-times"></i>
                          </button>
                      `;
                      listElement.appendChild(mealDiv);
                  });
              });

              // Update daily summary
              let totalCalories = 0;
              let totalProtein = 0;
              let totalCarbs = 0;
              let totalFat = 0;
              let totalMeals = 0;

              Object.values(dayPlan).forEach(meals => {
                  meals.forEach(meal => {
                      totalCalories += meal.calories || 0;
                      totalProtein += meal.protein || 0;
                      totalCarbs += meal.carbs || 0;
                      totalFat += meal.fat || 0;
                      totalMeals++;
                  });
              });

              document.getElementById('planned-calories').textContent = totalCalories;
              document.getElementById('planned-protein').textContent = Math.round(totalProtein) + 'g';
              document.getElementById('planned-carbs').textContent = Math.round(totalCarbs) + 'g';
              document.getElementById('planned-fat').textContent = Math.round(totalFat) + 'g';
              document.getElementById('planned-meals').textContent = totalMeals;
          }



          function copyToTracker() {
              const dayPlan = mealPlan[currentSelectedDay];
              let copiedCount = 0;

              Object.values(dayPlan).forEach(mealsList => {
                  mealsList.forEach(meal => {
                      // Add to current day's tracking
                      const trackingMeal = {
                          id: Date.now() + Math.random(),
                          name: meal.name,
                          protein: meal.protein || 0,
                          carbs: meal.carbs || 0,
                          fat: meal.fat || 0,
                          calories: meal.calories || 0
                      };

                      // Add to the global meals array (not the local forEach variable)
                      meals.push(trackingMeal);
                    
                      // Update ALL macros in currentIntake
                      currentIntake.protein += trackingMeal.protein;
                      currentIntake.carbs += trackingMeal.carbs;
                      currentIntake.fat += trackingMeal.fat;
                    
                      copiedCount++;
                  });
              }


   function clearMealPlan() {
              showConfirmDialog(
                  'Clear Meal Plan',
                  'Are you sure you want to clear the entire meal plan? This will remove all planned meals for all days and cannot be undone.',
                  () => {
                      mealPlan = {
                          monday: { breakfast: [], lunch: [], dinner: [] },
                          tuesday: { breakfast: [], lunch: [], dinner: [] },
                          wednesday: { breakfast: [], lunch: [], dinner: [] },
                          thursday: { breakfast: [], lunch: [], dinner: [] },
                          friday: { breakfast: [], lunch: [], dinner: [] },
                          saturday: { breakfast: [], lunch: [], dinner: [] },
                          sunday: { breakfast: [], lunch: [], dinner: [] }
                      };
                      updateMealPlanDisplay();
                      saveMealPlan().catch(error => console.warn('Meal plan save error:', error));
                      showNotification('Meal Plan Cleared', 'All planned meals have been successfully removed', 'success');
                  }
              );
          }


   function loadMealPlan() {
              console.log('📡 Loading meal plan data...');
            
              try {
                  // First try to load from database
                  const databaseData = await loadMealPlanFromDatabase();
                
                  if (databaseData) {
                      console.log('✅ Meal plan loaded from database');
                      mealPlan = databaseData.mealPlan;
                      customSections = databaseData.customSections || [];
                  } else {
                      // Fallback to localStorage
                      console.log('📱 Loading meal plan from localStorage...');
                      const savedMealPlan = localStorage.getItem('mealPlan');
                      if (savedMealPlan) {
                          mealPlan = JSON.parse(savedMealPlan);
                      }
                    
                      // Load custom sections from localStorage
                      const savedCustomSections = localStorage.getItem('customSections');
                      if (savedCustomSections) {
                          customSections = JSON.parse(savedCustomSections);
                      } else {
                          // Migration: Convert old single custom section to new format
                          const savedCustomEnabled = localStorage.getItem('customSectionEnabled');
                          const savedCustomName = localStorage.getItem('customSectionName');
                        
                          if (savedCustomEnabled === 'true' && savedCustomName) {
                              customSectionCounter = 1;
                              customSections = [{
                                  id: 'custom_1',
                                  name: savedCustomName,
                                  meals: {}
                              }];
                              // Clean up old localStorage items
                              localStorage.removeItem('customSectionEnabled');
                              localStorage.removeItem('customSectionName');
                          }
                      }
                  }
                
                  // Restore UI state for custom sections
                  if (customSections && customSections.length > 0) {
                      // Set counter to highest existing ID + 1
                      const maxId = Math.max(...customSections.map(s => parseInt(s.id.split('_')[1]) || 0));
                      customSectionCounter = maxId;
                    
                      // Enable custom sections flag
                      customSectionEnabled = true;
                    
                      // Recreate HTML for each custom section
                      customSections.forEach(section => {
                          createCustomSectionHTML(section);
                      });
                    
                      console.log(`🔄 Restored ${customSections.length} custom sections`);
                  } else {
                      customSectionEnabled = false;
                  }
                
              } catch (error) {
                  console.warn('⚠️ Error loading meal plan:', error.message);
                  // Continue with localStorage data as fallback
                  const savedMealPlan = localStorage.getItem('mealPlan');
                  if (savedMealPlan) {
                      mealPlan = JSON.parse(savedMealPlan);
                  }
              }
            
              selectDay('monday'); // Initialize with Monday selected
          }


   function clearRecipeForm() {
              document.getElementById('newRecipeName').value = '';
              document.getElementById('newRecipeCategory').value = 'breakfast';
              document.getElementById('newRecipeCalories').value = '';
              document.getElementById('newRecipeProtein').value = '';
              document.getElementById('newRecipeCarbs').value = '';
              document.getElementById('newRecipeFat').value = '';
              document.getElementById('newRecipeServings').value = '';
              document.getElementById('newRecipeIngredients').value = '';
              document.getElementById('newRecipeInstructions').value = '';
          }


   function displayRecipes() {
              const container = document.getElementById('recipesContainer');
              const noResults = document.getElementById('noResults');
              const showMoreContainer = document.getElementById('showMoreContainer');
            
              const recipesToShow = filteredRecipes.length > 0 ? filteredRecipes : [...recipes, ...customRecipes];

              if (recipesToShow.length === 0) {
                  container.innerHTML = '';
                  noResults.classList.remove('hidden');
                  showMoreContainer.classList.add('hidden');
                  return;
              }

              noResults.classList.add('hidden');
              container.innerHTML = '';

              // Determine how many recipes to display
              const displayCount = showAllRecipes ? recipesToShow.length : Math.min(RECIPES_INITIAL_DISPLAY, recipesToShow.length);
              const recipesToDisplay = recipesToShow.slice(0, displayCount);

              recipesToDisplay.forEach(recipe => {
                  const recipeCard = document.createElement('div');
                  recipeCard.className = 'bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow';
                
                  const isCustom = recipe.source === 'custom';
                  const categoryColor = {
                      breakfast: 'bg-orange-100 text-orange-800',
                      lunch: 'bg-green-100 text-green-800',
                      dinner: 'bg-purple-100 text-purple-800',
                      snack: 'bg-blue-100 text-blue-800'
                  };

                  recipeCard.innerHTML = `
                      <div class="flex justify-between items-start mb-3">
                          <h3 class="text-lg font-bold text-gray-800">${recipe.name}</h3>
                          <div class="flex items-center gap-2">
                              <span class="px-2 py-1 rounded-full text-xs font-medium ${categoryColor[recipe.category]}">${recipe.category}</span>
                              ${isCustom ? '<span class="px-2 py-1 rounded-full text-xs font-medium bg-pink-100 text-pink-800">Custom</span>' : ''}
                          </div>
                      </div>
                    
                      <div class="grid grid-cols-4 gap-2 mb-3 text-center">
                          <div>
                              <div class="text-lg font-bold text-blue-600">${recipe.calories}</div>
                              <div class="text-xs text-gray-600">Calories</div>
                          </div>
                          <div>
                              <div class="text-lg font-bold text-red-500">${recipe.protein}g</div>
                              <div class="text-xs text-gray-600">Protein</div>
                          </div>
                          <div>
                              <div class="text-lg font-bold text-green-500">${recipe.carbs}g</div>
                              <div class="text-xs text-gray-600">Carbs</div>
                          </div>
                          <div>
                              <div class="text-lg font-bold text-yellow-500">${recipe.fat}g</div>
                              <div class="text-xs text-gray-600">Fat</div>
                          </div>
                      </div>

                      <div class="text-sm text-gray-600 mb-3">
                          <strong>Serving:</strong> ${recipe.servings}
                      </div>

                      <div class="text-sm text-gray-700 mb-3">
                          <strong>Ingredients:</strong> ${recipe.ingredients.slice(0, 3).join(', ')}${recipe.ingredients.length > 3 ? '...' : ''}
                      </div>

                      <div class="flex flex-wrap gap-1 mb-3">
                          <button onclick="addRecipeToTracker(${recipe.id}, '${recipe.source}')" class="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-xs font-medium">
                              <i class="fas fa-plus mr-1"></i>Add to Tracker
                          </button>
                          <button onclick="showMealPlannerSelection(${recipe.id}, '${recipe.source}')" class="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded text-xs font-medium">
                              <i class="fas fa-calendar-plus mr-1"></i>Add to Planner
                          </button>
                          <button onclick="showRecipeDetails(${recipe.id}, '${recipe.source}')" class="bg-gray-500 hover:bg-gray-600 text-white px-3 py-1 rounded text-xs font-medium">
                              <i class="fas fa-eye mr-1"></i>Details
                          </button>
                          ${isCustom ? `<button onclick="deleteCustomRecipe(${recipe.id})" class="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-xs font-medium"><i class="fas fa-trash mr-1"></i>Delete</button>` : ''}
                      </div>
                  `;
                
                  container.appendChild(recipeCard);
              });

              // Update show more/less button
              updateShowMoreButton(recipesToShow.length);
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


})();

