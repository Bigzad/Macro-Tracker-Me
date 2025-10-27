// Professional Notification System for NutriTracker Pro
// Replaces generic alert() with branded notifications

class ProfessionalNotifications {
    constructor() {
        // Only initialize if DOM is ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.init());
        } else {
            this.init();
        }
    }

    init() {
        try {
            // Create notification container if it doesn't exist
            if (!document.getElementById('notification-container')) {
                const container = document.createElement('div');
                container.id = 'notification-container';
                container.className = 'fixed top-4 right-4 z-50 space-y-2';
                document.body.appendChild(container);
            }
        } catch (error) {
            console.warn('Notification system initialization deferred:', error.message);
            // Gracefully handle initialization errors
        }
    }

    // Show success notification
    showSuccess(title, message = '', duration = 4000) {
        this.showNotification('success', title, message, duration);
    }

    // Show error notification
    showError(title, message = '', duration = 6000) {
        // Validate inputs to prevent empty notifications
        if (!title || title.trim() === '') {
            title = 'Error';
        }
        if (!message || message.trim() === '') {
            message = 'An error occurred. Please try again.';
        }
        this.showNotification('error', title, message, duration);
    }

    // Show warning notification
    showWarning(title, message = '', duration = 5000) {
        this.showNotification('warning', title, message, duration);
    }

    // Show info notification
    showInfo(title, message = '', duration = 4000) {
        this.showNotification('info', title, message, duration);
    }

    // Main notification method
    showNotification(type, title, message, duration) {
        // Validate notification container exists
        const container = document.getElementById('notification-container');
        if (!container) {
            console.error('❌ Notification container not found! Cannot show notification.');
            console.error('Title:', title, 'Message:', message);
            return;
        }

        // Debug logging (remove in production)
        // console.log('📢 Notification called:', { type, title, message, duration });

        // Validate inputs
        if (!title || title.trim() === '') {
            console.warn('⚠️ Empty title provided to notification, using fallback');
            title = 'Notification';
        }
        if (!message) {
            message = '';
        }

        const notification = this.createNotificationElement(type, title, message);
        
        // Add notification to container
        container.appendChild(notification);

        // Animate in
        setTimeout(() => {
            notification.classList.remove('translate-x-full', 'opacity-0');
            notification.classList.add('translate-x-0', 'opacity-100');
        }, 100);

        // Auto remove after duration
        if (duration > 0) {
            setTimeout(() => {
                this.removeNotification(notification);
            }, duration);
        }

        return notification;
    }

    // Create notification element
    createNotificationElement(type, title, message) {
        const notification = document.createElement('div');
        notification.className = `
            transform translate-x-full opacity-0 transition-all duration-300 ease-in-out
            max-w-md w-full bg-white shadow-lg rounded-lg pointer-events-auto ring-1 ring-black ring-opacity-5 overflow-hidden
        `;

        const colors = {
            success: {
                accent: 'bg-green-500',
                icon: 'fas fa-check-circle text-green-500',
                border: 'border-green-200'
            },
            error: {
                accent: 'bg-red-500',
                icon: 'fas fa-exclamation-triangle text-red-500',
                border: 'border-red-200'
            },
            warning: {
                accent: 'bg-yellow-500',
                icon: 'fas fa-exclamation-circle text-yellow-500',
                border: 'border-yellow-200'
            },
            info: {
                accent: 'bg-blue-500',
                icon: 'fas fa-info-circle text-blue-500',
                border: 'border-blue-200'
            }
        };

        const config = colors[type] || colors.info;

        notification.innerHTML = `
            <div class="flex">
                <div class="flex-shrink-0">
                    <div class="w-1 h-full ${config.accent}"></div>
                </div>
                <div class="ml-3 w-0 flex-1 pt-0.5">
                    <div class="flex items-start">
                        <div class="flex-shrink-0">
                            <i class="${config.icon} w-5 h-5 mt-0.5"></i>
                        </div>
                        <div class="ml-3 flex-1 min-w-0">
                            <p class="text-sm font-semibold text-gray-900 break-words">${title || 'Notification'}</p>
                            ${message && message.trim() ? `<p class="mt-1 text-sm text-gray-500 break-words leading-relaxed">${message}</p>` : ''}
                        </div>
                        <div class="ml-4 flex-shrink-0 flex">
                            <button 
                                type="button" 
                                class="bg-white rounded-md inline-flex text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                                onclick="window.notifications.removeNotification(this.closest('.max-w-sm'))"
                            >
                                <span class="sr-only">Close</span>
                                <i class="fas fa-times w-5 h-5"></i>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        return notification;
    }

    // Remove notification with animation
    removeNotification(notification) {
        notification.classList.remove('translate-x-0', 'opacity-100');
        notification.classList.add('translate-x-full', 'opacity-0');
        
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }

    // Confirmation dialog (replaces confirm())
    showConfirmDialog(title, message, onConfirm, onCancel = null) {
        return new Promise((resolve) => {
            const overlay = document.createElement('div');
            overlay.className = 'fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50';
            
            overlay.innerHTML = `
                <div class="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
                    <div class="mt-3">
                        <div class="flex items-center">
                            <div class="flex-shrink-0">
                                <i class="fas fa-exclamation-triangle text-yellow-500 w-6 h-6"></i>
                            </div>
                            <div class="ml-3">
                                <h3 class="text-lg font-medium text-gray-900">${title}</h3>
                            </div>
                        </div>
                        <div class="mt-4">
                            <p class="text-sm text-gray-500">${message}</p>
                        </div>
                        <div class="flex justify-end space-x-3 mt-6">
                            <button 
                                type="button" 
                                class="cancel-btn px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors"
                            >
                                Cancel
                            </button>
                            <button 
                                type="button" 
                                class="confirm-btn px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
                            >
                                Confirm
                            </button>
                        </div>
                    </div>
                </div>
            `;

            document.body.appendChild(overlay);

            // Handle clicks
            overlay.querySelector('.cancel-btn').onclick = () => {
                document.body.removeChild(overlay);
                if (onCancel) onCancel();
                resolve(false);
            };

            overlay.querySelector('.confirm-btn').onclick = () => {
                document.body.removeChild(overlay);
                if (onConfirm) onConfirm();
                resolve(true);
            };

            // Close on overlay click
            overlay.onclick = (e) => {
                if (e.target === overlay) {
                    document.body.removeChild(overlay);
                    if (onCancel) onCancel();
                    resolve(false);
                }
            };
        });
    }

    // Loading notification (for processes that take time)
    showLoading(title, message = '') {
        const notification = document.createElement('div');
        notification.className = `
            max-w-sm w-full bg-white shadow-lg rounded-lg pointer-events-auto ring-1 ring-black ring-opacity-5 overflow-hidden
        `;

        notification.innerHTML = `
            <div class="flex items-center p-4">
                <div class="flex-shrink-0">
                    <div class="animate-spin rounded-full h-5 w-5 border-b-2 border-green-500"></div>
                </div>
                <div class="ml-3 flex-1">
                    <p class="text-sm font-semibold text-gray-900">${title}</p>
                    ${message ? `<p class="text-sm text-gray-500">${message}</p>` : ''}
                </div>
            </div>
        `;

        const container = document.getElementById('notification-container');
        container.appendChild(notification);

        return {
            element: notification,
            remove: () => this.removeNotification(notification),
            updateTitle: (newTitle) => {
                notification.querySelector('.font-semibold').textContent = newTitle;
            },
            updateMessage: (newMessage) => {
                const messageEl = notification.querySelector('.text-gray-500');
                if (messageEl) messageEl.textContent = newMessage;
            }
        };
    }
}

// Safe initialization with error handling
try {
    // Initialize global notifications
    window.notifications = new ProfessionalNotifications();

    // Override global alert function (optional - for backwards compatibility)
    window.originalAlert = window.alert;
    window.alert = function(message) {
        try {
            if (window.notifications) {
                window.notifications.showError('Alert', message);
            } else {
                window.originalAlert(message);
            }
        } catch (error) {
            window.originalAlert(message);
        }
    };

    // Helper functions for common use cases with safety checks
    window.showSuccess = (title, message, duration) => {
        try {
            return window.notifications?.showSuccess(title, message, duration);
        } catch (error) {
            console.warn('Notification error:', error);
            return null;
        }
    };

    window.showError = (title, message, duration) => {
        try {
            return window.notifications?.showError(title, message, duration);
        } catch (error) {
            console.warn('Notification error:', error);
            return null;
        }
    };

    window.showWarning = (title, message, duration) => {
        try {
            return window.notifications?.showWarning(title, message, duration);
        } catch (error) {
            console.warn('Notification error:', error);
            return null;
        }
    };

    window.showInfo = (title, message, duration) => {
        try {
            return window.notifications?.showInfo(title, message, duration);
        } catch (error) {
            console.warn('Notification error:', error);
            return null;
        }
    };

    window.showConfirm = (title, message, onConfirm, onCancel) => {
        try {
            return window.notifications?.showConfirmDialog(title, message, onConfirm, onCancel);
        } catch (error) {
            console.warn('Notification error:', error);
            return Promise.resolve(false);
        }
    };

    window.showLoading = (title, message) => {
        try {
            return window.notifications?.showLoading(title, message);
        } catch (error) {
            console.warn('Notification error:', error);
            return { remove: () => {}, updateTitle: () => {}, updateMessage: () => {} };
        }
    };

} catch (initError) {
    console.warn('Professional notifications system failed to initialize:', initError);
    
    // Fallback to native alerts if notification system fails
    window.showSuccess = (title, message) => {
        console.log(`✅ ${title}: ${message}`);
        if (window.originalAlert) window.originalAlert(`✅ ${title}: ${message}`);
    };
    window.showError = (title, message) => {
        console.error(`❌ ${title}: ${message}`);
        if (window.originalAlert) window.originalAlert(`❌ ${title}: ${message}`);
    };
    window.showWarning = (title, message) => {
        console.warn(`⚠️ ${title}: ${message}`);
        if (window.originalAlert) window.originalAlert(`⚠️ ${title}: ${message}`);
    };
    window.showInfo = (title, message) => {
        console.info(`ℹ️ ${title}: ${message}`);
        if (window.originalAlert) window.originalAlert(`ℹ️ ${title}: ${message}`);
    };
    window.showConfirm = (title, message) => {
        const result = confirm(`${title}\n\n${message}`);
        return Promise.resolve(result);
    };
    window.showLoading = (title, message) => {
        console.log(`🔄 Loading: ${title} - ${message}`);
        return { 
            remove: () => console.log(`✅ Loading complete: ${title}`),
            updateTitle: () => {},
            updateMessage: () => {}
        };
    };
}

// Ensure functions are available immediately (even before initialization completes)
if (!window.showSuccess) {
    window.showSuccess = (title, message) => console.log(`✅ ${title}: ${message}`);
}
if (!window.showError) {
    window.showError = (title, message) => console.error(`❌ ${title}: ${message}`);
}
if (!window.showWarning) {
    window.showWarning = (title, message) => console.warn(`⚠️ ${title}: ${message}`);
}
if (!window.showInfo) {
    window.showInfo = (title, message) => console.info(`ℹ️ ${title}: ${message}`);
}
if (!window.showConfirm) {
    window.showConfirm = (title, message) => Promise.resolve(confirm(`${title}\n\n${message}`));
}
if (!window.showLoading) {
    window.showLoading = (title, message) => ({
        remove: () => {},
        updateTitle: () => {},
        updateMessage: () => {}
    });
}