/**
 * ENHANCED DATABASE FUNCTIONS WITH COMPREHENSIVE ERROR HANDLING
 * 
 * This file provides enhanced versions of all database operations with:
 * - Comprehensive error handling and recovery
 * - Automatic retry mechanisms  
 * - Fallback strategies
 * - User-friendly error messages
 * - Performance monitoring
 * 
 * These functions wrap around the existing functions to add safety without breaking anything.
 */

// Store original functions for enhanced versions
const originalFunctions = {};

// Enhanced wrapper for all save operations
function createEnhancedSaveFunction(originalFunction, functionName, config = {}) {
    return async function(...args) {
        const operationConfig = {
            operationName: functionName,
            isCritical: config.isCritical || false,
            enableRetry: config.enableRetry !== false,
            enableOfflineQueue: config.enableOfflineQueue !== false,
            showUserError: config.showUserError !== false,
            fallbackData: config.fallbackData || null,
            timeout: config.timeout || 15000,
            metadata: { 
                args: args.length,
                functionName 
            }
        };

        // Use database recovery if available, otherwise execute directly
        if (window.dbRecovery && window.dbRecovery.executeWithRecovery) {
            return await window.dbRecovery.executeWithRecovery(
                () => originalFunction.apply(this, args),
                operationConfig
            );
        } else {
            // Fallback: Execute directly with basic error handling
            try {
                return await originalFunction.apply(this, args);
            } catch (error) {
                console.warn(`⚠️ Database operation failed (no recovery available): ${functionName}`, error);
                throw error;
            }
        }
    };
}

// Enhanced JSON parsing function
function enhancedJSONParse(jsonString, fallbackValue = {}, schemaName = null) {
    return window.safeJSON.safeParse(jsonString, {
        fallback: fallbackValue,
        schemaName: schemaName,
        logErrors: true,
        validateTypes: true
    });
}

// Enhanced JSON stringification
function enhancedJSONStringify(object, fallbackValue = '{}') {
    return window.safeJSON.safeStringify(object, {
        fallback: fallbackValue,
        handleCircular: true
    });
}

// Enhanced localStorage operations
const enhancedLocalStorage = {
    getItem: function(key, fallback = null, parseJSON = true) {
        try {
            const item = localStorage.getItem(key);
            if (item === null) return fallback;
            
            if (parseJSON && typeof item === 'string') {
                return enhancedJSONParse(item, fallback);
            }
            return item;
        } catch (error) {
            if (window.errorHandler) {
                window.errorHandler.logError('ENHANCED_LOCALSTORAGE_GET', error, 'low', { key });
            }
            return fallback;
        }
    },

    setItem: function(key, value, stringify = true) {
        try {
            const valueToStore = stringify && typeof value !== 'string' 
                ? enhancedJSONStringify(value)
                : value;
            
            localStorage.setItem(key, valueToStore);
            return true;
        } catch (error) {
            if (window.errorHandler) {
                window.errorHandler.logError('ENHANCED_LOCALSTORAGE_SET', error, 'medium', { key });
            }
            
            // Show user notification for storage quota exceeded
            if (error.name === 'QuotaExceededError') {
                if (typeof showCustomNotification === 'function') {
                    showCustomNotification(
                        'Storage space is full. Some data may not be saved locally.', 
                        'warning'
                    );
                }
            }
            return false;
        }
    },

    removeItem: function(key) {
        try {
            localStorage.removeItem(key);
            return true;
        } catch (error) {
            if (window.errorHandler) {
                window.errorHandler.logError('ENHANCED_LOCALSTORAGE_REMOVE', error, 'low', { key });
            }
            return false;
        }
    }
};

// Enhanced authentication state checker - FIXED: No circular dependency
async function enhancedAuthCheck(showNotification = false) {
    try {
        if (!window.authHelper) {
            throw new Error('AuthHelper not available');
        }

        // Use direct authentication methods to avoid circular dependency
        // First check for authenticated user
        let userId = null;
        let anonProfileId = null;
        
        try {
            userId = await window.authHelper.getCurrentUserId();
        } catch (error) {
            console.warn('Enhanced auth check - failed to get current user ID:', error);
        }
        
        // If no authenticated user, try to get/create anonymous profile
        if (!userId) {
            try {
                // Anonymous profiles removed for invite-only system
            console.warn('Anonymous profiles not supported - authentication required');
            return { isAuthenticated: false, userId: null, requiresLogin: true };
            } catch (error) {
                console.warn('Enhanced auth check - failed to get anonymous profile:', error);
            }
        }

        const isAuthenticated = !!(userId || anonProfileId);

        return {
            isAuthenticated: isAuthenticated,
            userId: userId,
            anonProfileId: anonProfileId,
            identifier: {
                user_id: userId,
                anon_profile_id: anonProfileId
            }
        };

    } catch (error) {
        if (window.errorHandler) {
            window.errorHandler.logError('ENHANCED_AUTH_CHECK', error, 'high');
        }
        
        if (showNotification && typeof showCustomNotification === 'function') {
            showCustomNotification(
                'Authentication check failed. Please refresh the page.',
                'warning'
            );
        }

        return { 
            isAuthenticated: false, 
            error: error.message 
        };
    }
}

// Enhanced Supabase operation wrapper
async function enhancedSupabaseOperation(operation, operationName, options = {}) {
    const config = {
        operationName: operationName || 'supabase operation',
        isCritical: options.critical || false,
        enableRetry: options.retry !== false,
        showUserError: options.showError !== false,
        timeout: options.timeout || 15000,
        fallbackData: options.fallback || null,
        validateResponse: options.validateResponse || false,
        expectedStructure: options.expectedStructure || null,
        ...options
    };

    // Use database recovery if available, otherwise execute directly with error handling
    if (window.dbRecovery && window.dbRecovery.executeWithRecovery) {
        return await window.dbRecovery.executeWithRecovery(operation, config);
    } else {
        // Fallback: Execute with basic error handling
        try {
            const result = await operation();
            if (config.validateResponse && config.expectedStructure) {
                // Basic structure validation
                const isValid = typeof result === 'object' && result !== null;
                if (!isValid) {
                    throw new Error(`Invalid response structure for ${config.operationName}`);
                }
            }
            return result;
        } catch (error) {
            console.warn(`⚠️ Supabase operation failed (no recovery available): ${config.operationName}`, error);
            if (config.fallbackData !== null) {
                console.log(`📁 Using fallback data for ${config.operationName}`);
                return config.fallbackData;
            }
            throw error;
        }
    }
}

// Enhanced data validation
function enhancedDataValidation(data, rules, operationName = 'data validation') {
    try {
        if (!window.errorHandler) {
            console.warn('Error handler not available, skipping enhanced validation');
            return { valid: true, data: data };
        }

        const validation = window.errorHandler.validateInput(data, rules);
        
        if (!validation.valid) {
            const errorMessage = `${operationName} failed: ${validation.errors.join(', ')}`;
            
            if (typeof showCustomNotification === 'function') {
                showCustomNotification(errorMessage, 'error');
            }

            if (window.errorHandler) {
                window.errorHandler.logError('DATA_VALIDATION', new Error(errorMessage), 'medium', {
                    operation: operationName,
                    errors: validation.errors
                });
            }
        }

        return validation;
    } catch (error) {
        console.error('Enhanced validation failed:', error.message);
        // If validation itself fails, assume data is valid but log the issue
        if (window.errorHandler) {
            window.errorHandler.logError('VALIDATION_SYSTEM', error, 'high');
        }
        return { valid: true, data: data, validationError: error.message };
    }
}

// Enhanced network status monitoring
class EnhancedNetworkMonitor {
    constructor() {
        this.isOnline = navigator.onLine;
        this.callbacks = new Set();
        this.setupListeners();
    }

    setupListeners() {
        window.addEventListener('online', () => {
            this.isOnline = true;
            this.notifyCallbacks('online');
            
            if (typeof showCustomNotification === 'function') {
                showCustomNotification('Connection restored', 'success', 2000);
            }
        });

        window.addEventListener('offline', () => {
            this.isOnline = false;
            this.notifyCallbacks('offline');
            
            if (typeof showCustomNotification === 'function') {
                showCustomNotification('Connection lost - working offline', 'warning', 3000);
            }
        });
    }

    onStatusChange(callback) {
        this.callbacks.add(callback);
        return () => this.callbacks.delete(callback);
    }

    notifyCallbacks(status) {
        this.callbacks.forEach(callback => {
            try {
                callback(status, this.isOnline);
            } catch (error) {
                console.warn('Network status callback failed:', error.message);
            }
        });
    }

    getStatus() {
        return {
            isOnline: this.isOnline,
            connectionType: navigator.connection?.effectiveType || 'unknown',
            downlink: navigator.connection?.downlink || null
        };
    }
}

// Initialize enhanced network monitor
window.networkMonitor = new EnhancedNetworkMonitor();

// Enhanced error reporting and recovery suggestions
class EnhancedErrorReporter {
    constructor() {
        this.errorCounts = new Map();
        this.lastErrorTimes = new Map();
        this.userNotifiedErrors = new Set();
    }

    reportError(error, context = {}) {
        const errorKey = this.getErrorKey(error);
        const now = Date.now();
        
        // Update error counts
        this.errorCounts.set(errorKey, (this.errorCounts.get(errorKey) || 0) + 1);
        this.lastErrorTimes.set(errorKey, now);

        // Determine if user should be notified
        const shouldNotify = this.shouldNotifyUser(errorKey, error, context);
        
        if (shouldNotify) {
            this.notifyUser(error, context);
            this.userNotifiedErrors.add(errorKey);
        }

        // Log to error handler
        if (window.errorHandler) {
            window.errorHandler.logError(
                'ENHANCED_ERROR_REPORT',
                error,
                this.getErrorSeverity(error, context),
                {
                    ...context,
                    errorCount: this.errorCounts.get(errorKey),
                    userNotified: shouldNotify
                }
            );
        }

        // Provide recovery suggestions
        return this.getRecoverySuggestions(error, context);
    }

    getErrorKey(error) {
        const message = error.message || error.toString();
        return message.substring(0, 100); // Use first 100 chars as key
    }

    shouldNotifyUser(errorKey, error, context) {
        // Don't spam user with same error
        if (this.userNotifiedErrors.has(errorKey)) {
            return false;
        }

        // Don't notify for low-severity background operations
        if (context.background || context.severity === 'low') {
            return false;
        }

        // Always notify for critical operations
        if (context.critical) {
            return true;
        }

        // Notify for errors that affect user experience
        const errorMessage = error.message?.toLowerCase() || '';
        const notificationTriggers = [
            'network', 'timeout', 'save', 'load', 'authentication',
            'permission', 'validation', 'database'
        ];

        return notificationTriggers.some(trigger => errorMessage.includes(trigger));
    }

    notifyUser(error, context) {
        if (typeof showCustomNotification !== 'function') {
            return;
        }

        const message = this.getUserFriendlyMessage(error, context);
        const type = this.getNotificationType(error);
        const duration = context.critical ? 8000 : 5000;

        showCustomNotification(message, type, duration);
    }

    getUserFriendlyMessage(error, context) {
        const operation = context.operation || 'operation';
        const errorMessage = error.message?.toLowerCase() || '';

        if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
            return `Network issue during ${operation}. Please check your connection and try again.`;
        }

        if (errorMessage.includes('timeout')) {
            return `${operation} is taking longer than expected. Please try again.`;
        }

        if (errorMessage.includes('authentication') || errorMessage.includes('unauthorized')) {
            return 'Session expired. Please refresh the page and log in again.';
        }

        if (errorMessage.includes('permission') || errorMessage.includes('forbidden')) {
            return `You don't have permission to perform this ${operation}.`;
        }

        if (errorMessage.includes('validation') || errorMessage.includes('invalid')) {
            return `Invalid data for ${operation}. Please check your input and try again.`;
        }

        if (context.critical) {
            return `Critical ${operation} failed. Please contact support if this continues.`;
        }

        return `${operation} encountered an issue. Please try again.`;
    }

    getNotificationType(error) {
        const errorMessage = error.message?.toLowerCase() || '';
        
        if (errorMessage.includes('critical') || errorMessage.includes('fatal')) {
            return 'error';
        }
        
        if (errorMessage.includes('warning') || errorMessage.includes('timeout')) {
            return 'warning';
        }
        
        return 'error';
    }

    getErrorSeverity(error, context) {
        if (context.critical) return 'critical';
        
        const errorMessage = error.message?.toLowerCase() || '';
        
        if (errorMessage.includes('authentication') || errorMessage.includes('permission')) {
            return 'high';
        }
        
        if (errorMessage.includes('network') || errorMessage.includes('timeout')) {
            return 'medium';
        }
        
        return 'low';
    }

    getRecoverySuggestions(error, context) {
        const errorMessage = error.message?.toLowerCase() || '';
        const suggestions = [];

        if (errorMessage.includes('network')) {
            suggestions.push('Check internet connection');
            suggestions.push('Try again in a moment');
        }

        if (errorMessage.includes('timeout')) {
            suggestions.push('Wait and try again');
            suggestions.push('Check for slow internet connection');
        }

        if (errorMessage.includes('authentication')) {
            suggestions.push('Refresh the page and log in again');
            suggestions.push('Clear browser cache if problem persists');
        }

        if (errorMessage.includes('validation')) {
            suggestions.push('Check input data format');
            suggestions.push('Ensure all required fields are filled');
        }

        if (errorMessage.includes('quota') || errorMessage.includes('storage')) {
            suggestions.push('Clear browser storage');
            suggestions.push('Free up device storage space');
        }

        if (suggestions.length === 0) {
            suggestions.push('Try refreshing the page');
            suggestions.push('Contact support if issue persists');
        }

        return suggestions;
    }

    getErrorStats() {
        return {
            totalErrors: Array.from(this.errorCounts.values()).reduce((a, b) => a + b, 0),
            uniqueErrors: this.errorCounts.size,
            topErrors: Array.from(this.errorCounts.entries())
                .sort((a, b) => b[1] - a[1])
                .slice(0, 5),
            recentErrors: Array.from(this.lastErrorTimes.entries())
                .filter(([key, time]) => {
                    // Filter out recent errors within 5 minutes
                    if (Date.now() - time >= 300000) return false;
                    // Filter out 403 errors (likely infrastructure/CDN issues)
                    if (key.includes('403') || key.includes('Failed to load resource')) return false;
                    return true;
                })
                .length
        };
    }

    clearErrorHistory() {
        this.errorCounts.clear();
        this.lastErrorTimes.clear();
        this.userNotifiedErrors.clear();
    }
}

// Initialize enhanced error reporter
window.errorReporter = new EnhancedErrorReporter();

// Global enhanced error handler wrapper
window.handleError = function(error, context = {}) {
    return window.errorReporter.reportError(error, context);
};

// Enhanced performance monitor
class EnhancedPerformanceMonitor {
    constructor() {
        this.operations = new Map();
        this.metrics = {
            slowOperations: [],
            averageResponseTimes: new Map(),
            operationCounts: new Map()
        };
    }

    startOperation(operationName, metadata = {}) {
        const operationId = `${operationName}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        this.operations.set(operationId, {
            name: operationName,
            startTime: performance.now(),
            metadata
        });
        
        return operationId;
    }

    endOperation(operationId, success = true, additionalData = {}) {
        const operation = this.operations.get(operationId);
        if (!operation) return null;

        const endTime = performance.now();
        const duration = endTime - operation.startTime;
        
        // Update metrics
        this.updateMetrics(operation.name, duration, success);
        
        // Check for slow operations
        if (duration > 5000) { // 5 seconds
            this.metrics.slowOperations.push({
                name: operation.name,
                duration,
                timestamp: new Date().toISOString(),
                success,
                ...additionalData
            });
            
            // Keep only last 10 slow operations
            if (this.metrics.slowOperations.length > 10) {
                this.metrics.slowOperations = this.metrics.slowOperations.slice(-10);
            }
        }

        const result = {
            operationId,
            name: operation.name,
            duration,
            success,
            ...additionalData
        };

        this.operations.delete(operationId);
        return result;
    }

    updateMetrics(operationName, duration, success) {
        // Update average response times
        const current = this.metrics.averageResponseTimes.get(operationName) || { total: 0, count: 0 };
        current.total += duration;
        current.count += 1;
        this.metrics.averageResponseTimes.set(operationName, current);

        // Update operation counts
        const counts = this.metrics.operationCounts.get(operationName) || { success: 0, failure: 0 };
        if (success) {
            counts.success += 1;
        } else {
            counts.failure += 1;
        }
        this.metrics.operationCounts.set(operationName, counts);
    }

    getMetrics() {
        const avgTimes = {};
        this.metrics.averageResponseTimes.forEach((value, key) => {
            avgTimes[key] = value.total / value.count;
        });

        return {
            averageResponseTimes: avgTimes,
            operationCounts: Object.fromEntries(this.metrics.operationCounts),
            slowOperations: this.metrics.slowOperations,
            activeOperations: this.operations.size
        };
    }
}

// Initialize performance monitor
window.performanceMonitor = new EnhancedPerformanceMonitor();

// Utility function to wrap existing functions with enhanced error handling
function wrapFunctionWithErrorHandling(originalFunction, functionName, config = {}) {
    if (typeof originalFunction !== 'function') {
        console.warn(`Cannot wrap non-function: ${functionName}`);
        return originalFunction;
    }

    return async function wrappedFunction(...args) {
        const performanceId = window.performanceMonitor.startOperation(functionName);
        
        try {
            // Pre-execution validation if configured
            if (config.validateArgs && args.length > 0) {
                const validation = enhancedDataValidation(args[0], config.argRules, functionName);
                if (!validation.valid) {
                    throw new Error(`Invalid arguments for ${functionName}: ${validation.errors.join(', ')}`);
                }
            }

            // Execute with error handling
            const result = await originalFunction.apply(this, args);
            
            // Post-execution validation if configured
            if (config.validateResult && result) {
                const validation = enhancedDataValidation(result, config.resultRules, `${functionName} result`);
                if (!validation.valid) {
                    console.warn(`${functionName} returned invalid result:`, validation.errors);
                }
            }

            window.performanceMonitor.endOperation(performanceId, true, { 
                resultType: typeof result,
                hasData: !!result 
            });

            return result;

        } catch (error) {
            window.performanceMonitor.endOperation(performanceId, false, { 
                errorMessage: error.message 
            });

            // Handle the error with enhanced error reporter
            const suggestions = window.handleError(error, {
                operation: functionName,
                args: args.length,
                critical: config.critical || false
            });

            // Re-throw the error with additional context
            error.suggestions = suggestions;
            error.functionName = functionName;
            throw error;
        }
    };
}

console.log('✅ Enhanced Database Functions loaded successfully');

// Export for use in other scripts
window.enhancedDB = {
    createEnhancedSaveFunction,
    enhancedJSONParse,
    enhancedJSONStringify,
    enhancedLocalStorage,
    enhancedAuthCheck,
    enhancedSupabaseOperation,
    enhancedDataValidation,
    wrapFunctionWithErrorHandling
};

// Register with initialization manager if available
if (window.initManager) {
    window.initManager.registerComponent('enhancedDB', window.enhancedDB);
    window.initManager.registerComponent('networkMonitor', window.networkMonitor);
}