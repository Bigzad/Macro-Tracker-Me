/* === ORIGINAL EXTRACTED CODE === */
// Module reconstructed from original inline script
// Category: macros

(function(){

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


   function saveProgressEntry() {
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


   function refreshProgressDisplay() {
              if (progressEntries && progressEntries.length > 0) {
                  updateProgressDisplay();
                  if (progressChart) {
                      updateProgressChart();
                  }
              }
          }


   function checkForFinalBackup() {
              try {
                  const finalBackup = localStorage.getItem('progress_final_backup');
                  if (finalBackup) {
                      const backup = JSON.parse(finalBackup);
                      if (backup.finalSave && backup.progressEntries) {
                          console.log('Found final backup from previous session');
                        
                          if (progressEntries.length === 0 && backup.progressEntries.length > 0) {
                              console.log('Restoring from final backup:', backup.progressEntries.length, 'entries');
                              progressEntries = backup.progressEntries;
                              if (backup.progressGoal) {
                                  progressGoal = backup.progressGoal;
                              }
                              saveProgressData(); // Save restored data to primary storage
                              updateProgressDisplay();
                              showNotification('Data Restored', 'Progress data restored from previous session', 'info');
                          }
                      }
                  }
              } catch (error) {
                  console.error('Error checking final backup:', error);
              }
          }


   function destroyChart(chartVariable) {
              if (chartVariable && typeof chartVariable.destroy === 'function') {
                  try {
                      chartVariable.destroy();
                  } catch (error) {
                      console.warn('Error destroying chart:', error);
                  }
              }
              return null;
          }


   function initializeAllCharts() {
              console.log('Initializing all charts...');
            
              // Destroy existing charts first
              charts.calories = destroyChart(charts.calories);
              charts.protein = destroyChart(charts.protein);
              charts.carbs = destroyChart(charts.carbs);
              charts.fat = destroyChart(charts.fat);
              progressChart = destroyChart(progressChart);
              macroTotalsChart = destroyChart(macroTotalsChart);
              macroGoalsChart = destroyChart(macroGoalsChart);
            
              // Initialize macro doughnut charts
              initializeMacroDoughnutCharts();
            
              // Initialize progress chart
              initializeProgressChart();
            
              // Initialize macro line charts
              initializeMacroCharts();
          }


})();

