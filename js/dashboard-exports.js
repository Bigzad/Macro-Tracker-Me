/* === ORIGINAL EXTRACTED CODE === */
// Module reconstructed from original inline script
// Category: exports

(function(){

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


   function exportGroceryList(format = 'txt') {
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
                
                  // Collect all ingredients with enhanced parsing
                  const ingredientsList = {};
                  const mealsByDay = {};
                  let totalMeals = 0;
                  let totalCalories = 0;
                
                  days.forEach(day => {
                      const dayData = savedMealPlan[day] || { breakfast: [], lunch: [], dinner: [] };
                      mealsByDay[day] = { breakfast: [], lunch: [], dinner: [] };
                    
                      ['breakfast', 'lunch', 'dinner'].forEach(mealType => {
                          if (dayData[mealType] && dayData[mealType].length > 0) {
                              dayData[mealType].forEach(item => {
                                  totalMeals++;
                                  mealsByDay[day][mealType].push(item.name);
                                
                                  // Calculate calories if available
                                  if (item.calories) {
                                      totalCalories += parseFloat(item.calories) || 0;
                                  }
                                
                                  // Try to find the recipe in the recipes database
                                  let recipe = recipes.find(r => r.name === item.name);
                                  if (!recipe) {
                                      recipe = customRecipes.find(r => r.name === item.name);
                                  }
                                
                                  if (recipe && recipe.ingredients) {
                                      // Parse ingredients based on the data structure
                                      let ingredientsArray = [];
                                    
                                      if (typeof recipe.ingredients === 'string') {
                                          ingredientsArray = recipe.ingredients.split(',').map(i => i.trim());
                                      } else if (Array.isArray(recipe.ingredients)) {
                                          ingredientsArray = recipe.ingredients;
                                      }
                                    
                                      ingredientsArray.forEach(ingredient => {
                                          const cleanIngredient = ingredient.trim();
                                          if (cleanIngredient) {
                                              // Extract quantity and unit if possible
                                              const parsed = parseIngredient(cleanIngredient);
                                              const key = parsed.name;
                                            
                                              if (!ingredientsList[key]) {
                                                  ingredientsList[key] = {
                                                      name: parsed.name,
                                                      quantity: 0,
                                                      unit: parsed.unit,
                                                      count: 0
                                                  };
                                              }
                                            
                                              ingredientsList[key].quantity += parsed.quantity;
                                              ingredientsList[key].count += 1;
                                          }
                                      });
                                  } else {
                                      // If no recipe found, add the meal name as a basic item
                                      if (!ingredientsList[item.name]) {
                                          ingredientsList[item.name] = {
                                              name: item.name,
                                              quantity: 1,
                                              unit: 'serving',
                                              count: 0
                                          };
                                      }
                                      ingredientsList[item.name].count += 1;
                                  }
                              });
                          }
                      });
                  });
                
                  // Generate content based on format
                  const dateStr = new Date().toISOString().split('T')[0];
                  let fileContent, mimeType, fileName, successMessage;
                  const itemCount = Object.keys(ingredientsList).length;
                
                  // Close dropdown
                  document.getElementById('groceryDropdown').classList.add('hidden');
                
                  switch (format.toLowerCase()) {
                      case 'pdf':
                          // Generate PDF using jsPDF
                          generateGroceryListPDF(ingredientsList, mealsByDay, totalMeals, totalCalories, dateStr);
                          showNotification('Success', `Professional PDF grocery list exported! ${itemCount} unique items with enhanced formatting.`, 'success');
                          return;
                        
                      case 'html':
                          fileContent = generateGroceryListHTML(ingredientsList, mealsByDay, totalMeals, totalCalories);
                          mimeType = 'text/html;charset=utf-8;';
                          fileName = `NutriTracker-GroceryList-${dateStr}.html`;
                          successMessage = `Interactive HTML grocery list exported! ${itemCount} unique items with web styling.`;
                          break;
                        
                      case 'csv':
                          fileContent = generateGroceryListCSV(ingredientsList, mealsByDay, totalMeals, totalCalories);
                          mimeType = 'text/csv;charset=utf-8;';
                          fileName = `NutriTracker-GroceryList-${dateStr}.csv`;
                          successMessage = `CSV grocery list exported! ${itemCount} unique items ready for spreadsheet apps.`;
                          break;
                        
                      case 'txt':
                      default:
                          fileContent = generateProfessionalGroceryList(ingredientsList, mealsByDay, totalMeals, totalCalories);
                          mimeType = 'text/plain;charset=utf-8;';
                          fileName = `NutriTracker-GroceryList-${dateStr}.txt`;
                          successMessage = `Smart text grocery list exported! ${itemCount} unique items organized by store sections.`;
                          break;
                  }
                
                  // Create and download the file
                  const blob = new Blob([fileContent], { type: mimeType });
                  const link = document.createElement('a');
                  const url = URL.createObjectURL(blob);
                  link.setAttribute('href', url);
                  link.setAttribute('download', fileName);
                  link.style.visibility = 'hidden';
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                
                  showNotification('Success', successMessage, 'success');
                
              } catch (error) {
                  console.error('Error exporting grocery list:', error);
                  showNotification('Export Error', 'Error exporting grocery list. Please try again.', 'error');
              }
          }


   function generateProfessionalGroceryList(ingredientsList, mealsByDay, totalMeals, totalCalories) {
              const now = new Date();
              const weekStart = new Date(now);
              weekStart.setDate(now.getDate() - now.getDay());
              const weekEnd = new Date(weekStart);
              weekEnd.setDate(weekStart.getDate() + 6);
            
              let content = '';
            
              // Header
              content += '┌─────────────────────────────────────────────────────────┐\n';
              content += '│                    NUTRITRACKER PRO                    │\n';
              content += '│                 SMART GROCERY LIST                     │\n';
              content += '└─────────────────────────────────────────────────────────┘\n\n';
            
              // Week info
              content += `📅 Week of: ${weekStart.toLocaleDateString()} - ${weekEnd.toLocaleDateString()}\n`;
              content += `📋 Generated: ${now.toLocaleDateString()} at ${now.toLocaleTimeString()}\n`;
              content += `🍽️ Total Meals Planned: ${totalMeals}\n`;
              if (totalCalories > 0) {
                  content += `🔥 Estimated Total Calories: ${totalCalories.toFixed(0)}\n`;
              }
              content += '\n';
            
              // Meal plan overview
              content += '═══════════════════════════════════════════════════════════\n';
              content += '                     MEAL PLAN OVERVIEW                    \n';
              content += '═══════════════════════════════════════════════════════════\n\n';
            
              const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
              const dayKeys = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
            
              dayKeys.forEach((dayKey, index) => {
                  const dayMeals = mealsByDay[dayKey];
                  if (dayMeals && (dayMeals.breakfast.length || dayMeals.lunch.length || dayMeals.dinner.length)) {
                      content += `${dayNames[index].toUpperCase()}:\n`;
                      if (dayMeals.breakfast.length) content += `  🌅 Breakfast: ${dayMeals.breakfast.join(', ')}\n`;
                      if (dayMeals.lunch.length) content += `  ☀️ Lunch: ${dayMeals.lunch.join(', ')}\n`;
                      if (dayMeals.dinner.length) content += `  🌙 Dinner: ${dayMeals.dinner.join(', ')}\n`;
                      content += '\n';
                  }
              });
            
              // Shopping list by store sections
              content += '═══════════════════════════════════════════════════════════\n';
              content += '                    SHOPPING LIST BY AISLE                \n';
              content += '═══════════════════════════════════════════════════════════\n\n';
            
              // Enhanced categorization with store layout
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
                
                  // Find matching category
                  for (const [categoryName, category] of Object.entries(storeCategories)) {
                      if (categoryName === '🛒 OTHER ITEMS') continue;
                    
                      if (category.keywords.some(keyword => lower.includes(keyword))) {
                          category.items.push(ingredient);
                          categorized = true;
                          break;
                      }
                  }
                
                  // If not categorized, add to OTHER ITEMS
                  if (!categorized) {
                      storeCategories['🛒 OTHER ITEMS'].items.push(ingredient);
                  }
              });
            
              // Output organized shopping list
              Object.entries(storeCategories).forEach(([categoryName, category]) => {
                  if (category.items.length > 0) {
                      content += `${categoryName}:\n`;
                      content += '─'.repeat(50) + '\n';
                    
                      // Sort items alphabetically
                      category.items.sort((a, b) => a.name.localeCompare(b.name));
                    
                      category.items.forEach(item => {
                          let itemLine = `  ☐ ${item.name}`;
                        
                          // Add quantity information
                          if (item.quantity > 1) {
                              if (item.unit) {
                                  itemLine += ` (${item.quantity} ${item.unit})`;
                              } else {
                                  itemLine += ` (×${item.quantity})`;
                              }
                          }
                        
                          // Add usage count if multiple meals use it
                          if (item.count > 1) {
                              itemLine += ` [Used in ${item.count} meals]`;
                          }
                        
                          content += itemLine + '\n';
                      });
                      content += '\n';
                  }
              });
            
              // Quick summary
              content += '═══════════════════════════════════════════════════════════\n';
              content += '                       SHOPPING SUMMARY                    \n';
              content += '═══════════════════════════════════════════════════════════\n\n';
            
              const totalItems = Object.keys(ingredientsList).length;
              content += `📊 Total Unique Items: ${totalItems}\n`;
              content += `📋 Items per Category:\n`;
              Object.entries(storeCategories).forEach(([categoryName, category]) => {
                  if (category.items.length > 0) {
                      content += `   ${categoryName}: ${category.items.length} items\n`;
                  }
              });
            
              content += '\n';
              content += '💡 SHOPPING TIPS:\n';
              content += '   • Check your pantry before shopping\n';
              content += '   • Buy perishables closer to cooking dates\n';
              content += '   • Consider bulk buying for frequently used items\n';
              content += '   • Stick to your list to maintain your nutrition goals\n\n';
            
              content += '─'.repeat(59) + '\n';
              content += '           Generated by NutriTracker Pro 🥗\n';
              content += '        Transform your nutrition, transform your life!\n';
              content += '─'.repeat(59) + '\n';
            
              return content;
          }


   function generateGroceryListPDF(ingredientsList, mealsByDay, totalMeals, totalCalories, dateStr) {
              try {
                  // Check if jsPDF is available - try multiple access patterns
                  let jsPDF;
                  if (window.jspdf && window.jspdf.jsPDF) {
                      jsPDF = window.jspdf.jsPDF;
                  } else if (window.jsPDF) {
                      jsPDF = window.jsPDF;
                  } else if (typeof window.jspdf !== 'undefined') {
                      jsPDF = window.jspdf.jsPDF;
                  } else {
                      // Load jsPDF dynamically if not available
                      console.log('Loading jsPDF dynamically for grocery list...');
                      const script = document.createElement('script');
                      script.src = 'https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js';
                      script.onload = () => {
                          console.log('jsPDF loaded, retrying PDF generation...');
                          setTimeout(() => generateGroceryListPDF(ingredientsList, mealsByDay, totalMeals, totalCalories, dateStr), 100);
                      };
                      script.onerror = () => {
                          console.error('Failed to load jsPDF');
                          showNotification('Error', 'Failed to load PDF library. Please try again.', 'error');
                      };
                      document.head.appendChild(script);
                      return;
                  }

                  console.log('Creating PDF with jsPDF...');
                  const doc = new jsPDF();
            
              // Set fonts and colors
              doc.setFont('helvetica');
            
              // Header
              doc.setFontSize(20);
              doc.setTextColor(16, 185, 129); // Green color
              doc.text('NutriTracker Pro - Smart Grocery List', 105, 25, { align: 'center' });
            
              doc.setFontSize(12);
              doc.setTextColor(0, 0, 0);
              const now = new Date();
              doc.text(`Generated: ${now.toLocaleDateString()} at ${now.toLocaleTimeString()}`, 20, 40);
              doc.text(`Total Meals Planned: ${totalMeals}`, 20, 50);
              if (totalCalories > 0) {
                  doc.text(`Estimated Calories: ${totalCalories.toFixed(0)}`, 20, 60);
              }
            
              let yPosition = 80;
            
              // Organize items by categories
              const storeCategories = getStoreCategories(ingredientsList);
            
              Object.entries(storeCategories).forEach(([categoryName, category]) => {
                  if (category.items.length > 0) {
                      // Check if we need a new page
                      if (yPosition > 250) {
                          doc.addPage();
                          yPosition = 30;
                      }
                    
                      // Category header
                      doc.setFontSize(14);
                      doc.setTextColor(16, 185, 129);
                      doc.text(categoryName.replace(/🥩|🥬|🥛|🍞|🌾|🥫|❄️|🧂|🥤|🛒/g, ''), 20, yPosition);
                      yPosition += 10;
                    
                      // Category items
                      doc.setFontSize(10);
                      doc.setTextColor(0, 0, 0);
                      category.items.sort((a, b) => a.name.localeCompare(b.name));
                    
                      category.items.forEach(item => {
                          if (yPosition > 270) {
                              doc.addPage();
                              yPosition = 30;
                          }
                        
                          let itemText = `☐ ${item.name}`;
                          if (item.quantity > 1) {
                              if (item.unit) {
                                  itemText += ` (${item.quantity} ${item.unit})`;
                              } else {
                                  itemText += ` (×${item.quantity})`;
                              }
                          }
                        
                          doc.text(itemText, 25, yPosition);
                          yPosition += 8;
                      });
                    
                      yPosition += 5;
                  }
              });
            
              // Footer
              if (yPosition > 250) {
                  doc.addPage();
                  yPosition = 30;
              }
              doc.setFontSize(10);
              doc.setTextColor(100, 100, 100);
              doc.text('Transform your nutrition, transform your life!', 105, 280, { align: 'center' });
            
              // Save the PDF
              console.log('Attempting to save PDF:', `NutriTracker-GroceryList-${dateStr}.pdf`);
              doc.save(`NutriTracker-GroceryList-${dateStr}.pdf`);
              console.log('PDF save command completed');
            
              } catch (error) {
                  console.error('Error generating grocery list PDF:', error);
                  showNotification('PDF Error', 'Failed to generate PDF. Error: ' + error.message, 'error');
              }
          }


   function generateGroceryListHTML(ingredientsList, mealsByDay, totalMeals, totalCalories) {
              const now = new Date();
              const storeCategories = getStoreCategories(ingredientsList);
            
              let html = `<!DOCTYPE html>
  <html lang="en">
  <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>NutriTracker Pro - Grocery List</title>
      <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background: #f8fafc; }
          .container { max-width: 800px; margin: 0 auto; background: white; border-radius: 12px; padding: 30px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
          .header { text-align: center; border-bottom: 3px solid #10B981; padding-bottom: 20px; margin-bottom: 30px; }
          .header h1 { color: #10B981; margin: 0; font-size: 28px; }
          .header p { color: #6b7280; margin: 5px 0; }
          .category { margin-bottom: 30px; }
          .category h2 { color: #1f2937; background: #f3f4f6; padding: 10px 15px; border-radius: 8px; margin: 0 0 15px 0; font-size: 16px; }
          .item { display: flex; align-items: center; padding: 8px 0; border-bottom: 1px solid #e5e7eb; }
          .item:last-child { border-bottom: none; }
          .checkbox { margin-right: 15px; width: 18px; height: 18px; }
          .item-text { flex: 1; font-size: 14px; color: #374151; }
          .quantity { color: #6b7280; font-size: 12px; }
          .footer { text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280; }
          @media print { body { background: white; } .container { box-shadow: none; } }
      </style>
  </head>
  <body>
      <div class="container">
          <div class="header">
              <h1>🥗 NutriTracker Pro</h1>
              <p><strong>Smart Grocery List</strong></p>
              <p>Generated: ${now.toLocaleDateString()} at ${now.toLocaleTimeString()}</p>
              <p>Total Meals Planned: ${totalMeals}`;
            
              if (totalCalories > 0) {
                  html += ` | Estimated Calories: ${totalCalories.toFixed(0)}`;
              }
            
              html += `</p>
          </div>`;
            
              Object.entries(storeCategories).forEach(([categoryName, category]) => {
                  if (category.items.length > 0) {
                      html += `<div class="category">
              <h2>${categoryName}</h2>`;
                    
                      category.items.sort((a, b) => a.name.localeCompare(b.name));
                      category.items.forEach(item => {
                          let itemText = item.name;
                          let quantityText = '';
                        
                          if (item.quantity > 1) {
                              if (item.unit) {
                                  quantityText = ` (${item.quantity} ${item.unit})`;
                              } else {
                                  quantityText = ` (×${item.quantity})`;
                              }
                          }
                        
                          html += `<div class="item">
                  <input type="checkbox" class="checkbox">
                  <span class="item-text">${itemText}<span class="quantity">${quantityText}</span></span>
              </div>`;
                      });
                    
                      html += `</div>`;
                  }
              });
            
              html += `<div class="footer">
              <p>Transform your nutrition, transform your life! 💪</p>
          </div>
      </div>
  </body>
  </html>`;
            
              return html;
          }


   function generateGroceryListCSV(ingredientsList, mealsByDay, totalMeals, totalCalories) {
              let csv = 'Category,Item,Quantity,Unit,Usage Count\\n';
            
              const storeCategories = getStoreCategories(ingredientsList);
            
              Object.entries(storeCategories).forEach(([categoryName, category]) => {
                  if (category.items.length > 0) {
                      const cleanCategoryName = categoryName.replace(/🥩|🥬|🥛|🍞|🌾|🥫|❄️|🧂|🥤|🛒/g, '').trim();
                    
                      category.items.sort((a, b) => a.name.localeCompare(b.name));
                      category.items.forEach(item => {
                          csv += `"${cleanCategoryName}","${item.name}","${item.quantity}","${item.unit}","${item.count}"\\n`;
                      });
                  }
              });
            
              return csv;
          }


})();

