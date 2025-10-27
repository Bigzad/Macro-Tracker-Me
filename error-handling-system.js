/**
 * COMPREHENSIVE ERROR HANDLING SYSTEM
 * Centralized error management for zero error handling issues
 * Preserves all existing functionality while adding robust safety nets
 */

class ErrorHandlingSystem {
    constructor() {
        this.errorLog = [];
        this.retryConfig = {
            maxRetries: 3,
            retryDelay: 1000,
            backoffMultiplier: 2
        };
        this.setupGlobalErrorHandlers();
    }

    /**
     * Setup global error handlers to catch unhandled errors
     */
    setupGlobalErrorHandlers() {
        // Catch unhandled promise rejections
        window.addEventListener('unhandledrejection', (event) => {
            console.error('Unhandled promise rejection:', event.reason);
            this.logError('UNHANDLED_PROMISE', event.reason, 'critical');
            event.preventDefault(); // Prevent console error
        });

        // Catch uncaught exceptions
        window.addEventListener('error', (event) => {
            console.error('Uncaught error:', event.error);
            this.logError('UNCAUGHT_ERROR', event.error, 'critical');
        });
    }

    /**
     * Enhanced database operation wrapper with comprehensive error handling
     */
    async safeSupabaseOperation(operation, operationName = 'database operation', options = {}) {
        const { 
            maxRetries = this.retryConfig.maxRetries,
            retryDelay = this.retryConfig.retryDelay,
            fallbackValue = null,
            showUserError = true,
            criticalOperation = false
        } = options;

        let lastError = null;
        
        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            try {
                // Execute the Supabase operation
                const result = await operation();
                
                // Check for Supabase-specific errors
                if (result && result.error) {
                    throw new Error(`Supabase Error: ${result.error.message || result.error.details || 'Unknown database error'}`);
                }

                // Success - return result
                if (attempt > 0) {
                    console.log(`${operationName} succeeded on attempt ${attempt + 1}`);
                }
                return result;

            } catch (error) {
                lastError = error;
                const isNetworkError = this.isNetworkError(error);
                const isRetryable = this.isRetryableError(error);
                
                console.warn(`${operationName} attempt ${attempt + 1} failed:`, error.message);
                
                // Log the error
                this.logError('DATABASE_OPERATION', error, criticalOperation ? 'critical' : 'high', {
                    operation: operationName,
                    attempt: attempt + 1,
                    isNetworkError,
                    isRetryable
                });

                // Don't retry if it's not a retryable error or we've exhausted retries
                if (!isRetryable || attempt >= maxRetries) {
                    break;
                }

                // Wait before retrying (exponential backoff)
                if (attempt < maxRetries) {
                    const delay = retryDelay * Math.pow(this.retryConfig.backoffMultiplier, attempt);
                    await this.delay(delay);
                }
            }
        }

        // All retries failed - handle the error
        const errorMessage = this.getUserFriendlyErrorMessage(lastError, operationName);
        
        if (showUserError && typeof showCustomNotification === 'function') {
            showCustomNotification(errorMessage, 'error');
        }

        if (criticalOperation) {
            console.error(`CRITICAL OPERATION FAILED: ${operationName}`, lastError);
        }

        return { error: lastError, data: fallbackValue };
    }

    /**
     * Safe JSON parsing with validation and fallbacks
     */
    safeJSONParse(jsonString, fallbackValue = {}, validationSchema = null) {
        try {
            // Handle null, undefined, empty string
            if (!jsonString || jsonString === 'undefined' || jsonString === 'null') {
                return fallbackValue;
            }

            // Handle already parsed objects
            if (typeof jsonString === 'object') {
                return jsonString;
            }

            // Parse JSON
            const parsed = JSON.parse(jsonString);
            
            // Validate structure if schema provided
            if (validationSchema && !this.validateObject(parsed, validationSchema)) {
                console.warn('JSON validation failed, using fallback:', jsonString);
                return fallbackValue;
            }

            return parsed;

        } catch (error) {
            console.warn('JSON parse error, using fallback:', error.message, jsonString);
            this.logError('JSON_PARSE', error, 'medium', { jsonString: jsonString?.substring(0, 100) });
            return fallbackValue;
        }
    }

    /**
     * Safe JSON stringification
     */
    safeJSONStringify(object, fallbackValue = '{}') {
        try {
            return JSON.stringify(object);
        } catch (error) {
            console.warn('JSON stringify error, using fallback:', error.message);
            this.logError('JSON_STRINGIFY', error, 'medium');
            return fallbackValue;
        }
    }

    /**
     * Enhanced authentication state checker
     */
    async safeAuthCheck(showError = false) {
        try {
            // Check if Supabase client exists
            if (!window.supabaseClient) {
                throw new Error('Supabase client not initialized');
            }

            // Get current user with timeout
            const authPromise = window.supabaseClient.auth.getUser();
            const timeoutPromise = this.createTimeout(5000, 'Authentication check timeout');
            
            const { data: { user }, error } = await Promise.race([authPromise, timeoutPromise]);
            
            if (error) {
                throw error;
            }

            return {
                isAuthenticated: !!user,
                user: user,
                userId: user?.id || null
            };

        } catch (error) {
            console.warn('Authentication check failed:', error.message);
            this.logError('AUTH_CHECK', error, 'high');
            
            if (showError && typeof showCustomNotification === 'function') {
                showCustomNotification('Authentication check failed. Please refresh the page.', 'warning');
            }

            return {
                isAuthenticated: false,
                user: null,
                userId: null,
                error: error
            };
        }
    }

    /**
     * Safe async operation wrapper with timeout and error handling
     */
    async safeAsyncOperation(operation, operationName = 'async operation', timeoutMs = 10000, options = {}) {
        const { showUserError = true, fallbackValue = null } = options;

        try {
            const timeoutPromise = this.createTimeout(timeoutMs, `${operationName} timeout`);
            const result = await Promise.race([operation(), timeoutPromise]);
            return result;

        } catch (error) {
            console.error(`${operationName} failed:`, error.message);
            this.logError('ASYNC_OPERATION', error, 'high', { operation: operationName });
            
            if (showUserError && typeof showCustomNotification === 'function') {
                const userMessage = this.getUserFriendlyErrorMessage(error, operationName);
                showCustomNotification(userMessage, 'error');
            }

            return fallbackValue;
        }
    }

    /**
     * Input validation with comprehensive checking
     */
    validateInput(input, rules = {}) {
        const errors = [];
        
        try {
            const {
                required = false,
                type = null,
                minLength = null,
                maxLength = null,
                pattern = null,
                range = null,
                custom = null
            } = rules;

            // Required check
            if (required && (input === null || input === undefined || input === '')) {
                errors.push('Field is required');
                return { valid: false, errors };
            }

            // Skip other checks if not required and empty
            if (!required && (input === null || input === undefined || input === '')) {
                return { valid: true, errors: [] };
            }

            // Type checking
            if (type && typeof input !== type) {
                errors.push(`Expected ${type}, got ${typeof input}`);
            }

            // String validations
            if (typeof input === 'string') {
                if (minLength !== null && input.length < minLength) {
                    errors.push(`Minimum length is ${minLength} characters`);
                }
                if (maxLength !== null && input.length > maxLength) {
                    errors.push(`Maximum length is ${maxLength} characters`);
                }
                if (pattern && !pattern.test(input)) {
                    errors.push('Invalid format');
                }
            }

            // Number validations
            if (typeof input === 'number' && range) {
                const { min, max } = range;
                if (min !== undefined && input < min) {
                    errors.push(`Minimum value is ${min}`);
                }
                if (max !== undefined && input > max) {
                    errors.push(`Maximum value is ${max}`);
                }
            }

            // Custom validation
            if (custom && typeof custom === 'function') {
                const customResult = custom(input);
                if (customResult !== true) {
                    errors.push(typeof customResult === 'string' ? customResult : 'Custom validation failed');
                }
            }

            return { valid: errors.length === 0, errors };

        } catch (error) {
            console.error('Input validation error:', error.message);
            this.logError('INPUT_VALIDATION', error, 'medium');
            return { valid: false, errors: ['Validation error occurred'] };
        }
    }

    /**
     * Enhanced localStorage operations with error handling
     */
    safeLocalStorage = {
        get: (key, fallback = null) => {
            try {
                const item = localStorage.getItem(key);
                if (item === null) return fallback;
                return this.safeJSONParse(item, fallback);
            } catch (error) {
                console.warn(`localStorage.getItem failed for key "${key}":`, error.message);
                this.logError('LOCALSTORAGE_GET', error, 'low', { key });
                return fallback;
            }
        },

        set: (key, value) => {
            try {
                const jsonValue = this.safeJSONStringify(value);
                localStorage.setItem(key, jsonValue);
                return true;
            } catch (error) {
                console.warn(`localStorage.setItem failed for key "${key}":`, error.message);
                this.logError('LOCALSTORAGE_SET', error, 'medium', { key });
                return false;
            }
        },

        remove: (key) => {
            try {
                localStorage.removeItem(key);
                return true;
            } catch (error) {
                console.warn(`localStorage.removeItem failed for key "${key}":`, error.message);
                this.logError('LOCALSTORAGE_REMOVE', error, 'low', { key });
                return false;
            }
        },

        clear: () => {
            try {
                localStorage.clear();
                return true;
            } catch (error) {
                console.warn('localStorage.clear failed:', error.message);
                this.logError('LOCALSTORAGE_CLEAR', error, 'medium');
                return false;
            }
        }
    };

    /**
     * Utility methods
     */
    isNetworkError(error) {
        const networkErrorMessages = [
            'fetch', 'network', 'connection', 'timeout', 'offline',
            'ERR_NETWORK', 'ERR_INTERNET_DISCONNECTED', 'ERR_CONNECTION'
        ];
        return networkErrorMessages.some(msg => 
            error.message?.toLowerCase().includes(msg.toLowerCase())
        );
    }

    isRetryableError(error) {
        const retryableErrors = [
            'network', 'timeout', 'fetch', 'connection',
            'temporary', 'rate limit', '429', '503', '502', '504'
        ];
        return retryableErrors.some(err => 
            error.message?.toLowerCase().includes(err.toLowerCase())
        );
    }

    getUserFriendlyErrorMessage(error, operation) {
        const errorMessage = error?.message || error || 'Unknown error';
        
        if (this.isNetworkError(error)) {
            return `Network connection issue. Please check your internet connection and try again.`;
        }
        
        if (errorMessage.includes('rate limit')) {
            return 'Too many requests. Please wait a moment and try again.';
        }
        
        if (errorMessage.includes('permission') || errorMessage.includes('unauthorized')) {
            return 'You don\'t have permission to perform this action.';
        }
        
        if (errorMessage.includes('not found') || errorMessage.includes('404')) {
            return 'The requested resource was not found.';
        }

        return `${operation} failed. Please try again or contact support if the issue persists.`;
    }

    validateObject(obj, schema) {
        try {
            for (const [key, rule] of Object.entries(schema)) {
                if (rule.required && !(key in obj)) {
                    return false;
                }
                if (key in obj && rule.type && typeof obj[key] !== rule.type) {
                    return false;
                }
            }
            return true;
        } catch {
            return false;
        }
    }

    createTimeout(ms, message) {
        return new Promise((_, reject) => 
            setTimeout(() => reject(new Error(message)), ms)
        );
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    logError(category, error, severity, context = {}) {
        const errorEntry = {
            timestamp: new Date().toISOString(),
            category,
            severity,
            message: error?.message || error,
            stack: error?.stack,
            context,
            userAgent: navigator.userAgent,
            url: window.location.href
        };
        
        this.errorLog.push(errorEntry);
        
        // Keep only last 100 errors to prevent memory issues
        if (this.errorLog.length > 100) {
            this.errorLog = this.errorLog.slice(-100);
        }
        
        // Log to console based on severity
        if (severity === 'critical') {
            console.error('[CRITICAL ERROR]', errorEntry);
        } else if (severity === 'high') {
            console.warn('[HIGH ERROR]', errorEntry);
        } else {
            console.log('[ERROR]', errorEntry);
        }
    }

    getErrorReport() {
        return {
            totalErrors: this.errorLog.length,
            errorsByCategory: this.groupBy(this.errorLog, 'category'),
            errorsBySeverity: this.groupBy(this.errorLog, 'severity'),
            recentErrors: this.errorLog.slice(-10),
            criticalErrors: this.errorLog.filter(e => e.severity === 'critical')
        };
    }

    groupBy(array, key) {
        return array.reduce((result, item) => {
            const group = item[key];
            result[group] = result[group] || [];
            result[group].push(item);
            return result;
        }, {});
    }

    clearErrorLog() {
        this.errorLog = [];
        console.log('Error log cleared');
    }
}

// Initialize global error handling system
window.errorHandler = new ErrorHandlingSystem();

// Enhanced notification system with error handling
function showCustomNotification(message, type = 'info', duration = 5000) {
    try {
        // Remove existing notifications of same type to prevent spam
        const existingNotifications = document.querySelectorAll(`.notification-${type}`);
        existingNotifications.forEach(notification => {
            if (notification.textContent === message) {
                notification.remove();
            }
        });

        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'error' ? '#dc3545' : type === 'warning' ? '#ffc107' : type === 'success' ? '#28a745' : '#007bff'};
            color: ${type === 'warning' ? '#212529' : 'white'};
            padding: 15px 20px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 10000;
            max-width: 400px;
            word-wrap: break-word;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            font-size: 14px;
            line-height: 1.4;
            border-left: 4px solid ${type === 'error' ? '#721c24' : type === 'warning' ? '#d39e00' : type === 'success' ? '#155724' : '#004085'};
            animation: slideInRight 0.3s ease-out;
        `;
        notification.textContent = message;

        // Add close button
        const closeButton = document.createElement('button');
        closeButton.innerHTML = '×';
        closeButton.style.cssText = `
            background: none;
            border: none;
            color: inherit;
            font-size: 18px;
            font-weight: bold;
            float: right;
            margin-left: 10px;
            cursor: pointer;
            padding: 0;
            line-height: 1;
        `;
        closeButton.onclick = () => notification.remove();
        notification.appendChild(closeButton);

        document.body.appendChild(notification);

        // Auto-remove notification
        setTimeout(() => {
            if (notification.parentNode) {
                notification.style.animation = 'slideOutRight 0.3s ease-in';
                setTimeout(() => notification.remove(), 300);
            }
        }, duration);

        return notification;

    } catch (error) {
        console.error('Failed to show notification:', error);
        // Fallback to alert for critical errors
        if (type === 'error') {
            alert(message);
        }
    }
}

// Add CSS animations for notifications
if (!document.getElementById('notification-styles')) {
    const style = document.createElement('style');
    style.id = 'notification-styles';
    style.textContent = `
        @keyframes slideInRight {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
        @keyframes slideOutRight {
            from { transform: translateX(0); opacity: 1; }
            to { transform: translateX(100%); opacity: 0; }
        }
    `;
    document.head.appendChild(style);
}

// Expose notification function globally for use across all files
window.showCustomNotification = showCustomNotification;

console.log('✅ Comprehensive Error Handling System initialized');

// Register with initialization manager if available
if (window.initManager) {
    window.initManager.registerComponent('errorHandler', window.errorHandler);
}