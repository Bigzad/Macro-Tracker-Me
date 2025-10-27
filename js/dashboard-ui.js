/* === ORIGINAL EXTRACTED CODE === */
// Module reconstructed from original inline script
// Category: ui

(function(){

   function updateAuthUI() {
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


   function loadAndPopulatePersonalInfo(forceOverride = false) {
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


   function closeDropdown(e) {
                          if (!e.target.closest('.relative')) {
                              dropdown.classList.add('hidden');
                              document.removeEventListener('click', closeDropdown);
                              console.log('Dropdown closed by outside click');
                          }
                      }


})();

