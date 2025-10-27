/**
 * DATABASE ERROR RECOVERY SYSTEM
 * Comprehensive database operation safety with automatic retry and fallback mechanisms
 * Preserves all existing Supabase functionality while adding bulletproof error handling
 */

class DatabaseErrorRecovery {
    constructor() {
        this.retryQueue = [];
        this.offlineQueue = [];
        this.isOnline = navigator.onLine;
        this.isProcessingQueue = false;
        
        this.config = {
            maxRetries: 3,
            baseDelay: 1000,
            maxDelay: 10000,
            backoffMultiplier: 2,
            networkTimeout: 15000,
            criticalOperationTimeout: 30000
        };

        this.setupNetworkMonitoring();
        this.setupPeriodicHealthCheck();
    }

    /**
     * Enhanced Supabase operation wrapper with comprehensive error recovery
     */
    async executeWithRecovery(operation, operationConfig = {}) {
        const config = {
            operationName: 'database operation',
            isCritical: false,
            enableOfflineQueue: true,
            enableRetry: true,
            fallbackData: null,
            timeout: this.config.networkTimeout,
            onError: null,
            onSuccess: null,
            metadata: {},
            ...operationConfig
        };

        const operationId = this.generateOperationId();
        
        try {
            // Pre-operation validation
            const validationResult = await this.preOperationValidation(config);
            if (!validationResult.success) {
                throw new Error(`Pre-operation validation failed: ${validationResult.error}`);
            }

            // Execute with timeout and monitoring
            const result = await this.executeWithTimeoutAndMonitoring(
                operation, 
                config, 
                operationId
            );

            // Post-operation validation and success handling
            await this.handleOperationSuccess(result, config, operationId);
            
            return result;

        } catch (error) {
            return await this.handleOperationError(error, operation, config, operationId);
        }
    }

    /**
     * Pre-operation validation
     */
    async preOperationValidation(config) {
        try {
            // Check if Supabase client is available
            if (!window.supabaseClient) {
                return { 
                    success: false, 
                    error: 'Supabase client not initialized' 
                };
            }

            // Check network connectivity for critical operations
            if (config.isCritical && !this.isOnline) {
                return { 
                    success: false, 
                    error: 'No network connection for critical operation' 
                };
            }

            // Check authentication state if required
            if (config.requiresAuth) {
                const authCheck = await window.errorHandler?.safeAuthCheck(false);
                if (!authCheck?.isAuthenticated) {
                    return { 
                        success: false, 
                        error: 'Authentication required for this operation' 
                    };
                }
            }

            return { success: true };

        } catch (error) {
            return { 
                success: false, 
                error: `Validation error: ${error.message}` 
            };
        }
    }

    /**
     * Execute operation with timeout and comprehensive monitoring
     */
    async executeWithTimeoutAndMonitoring(operation, config, operationId) {
        const startTime = Date.now();
        
        try {
            // Create timeout promise
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => {
                    reject(new Error(`Operation timeout after ${config.timeout}ms`));
                }, config.timeout);
            });

            // Execute operation with timeout race
            const result = await Promise.race([
                operation(),
                timeoutPromise
            ]);

            // Validate Supabase response structure
            if (result && typeof result === 'object') {
                // Check for Supabase error in response
                if (result.error) {
                    throw new Error(`Supabase error: ${result.error.message || JSON.stringify(result.error)}`);
                }

                // Validate expected response structure
                if (config.validateResponse && !this.validateResponseStructure(result, config.expectedStructure)) {
                    console.warn(`Response structure validation failed for ${config.operationName}`);
                }
            }

            // Log successful operation
            this.logOperation('success', config.operationName, {
                operationId,
                duration: Date.now() - startTime,
                metadata: config.metadata
            });

            return result;

        } catch (error) {
            // Enhance error with timing information
            error.operationDuration = Date.now() - startTime;
            error.operationId = operationId;
            throw error;
        }
    }

    /**
     * Comprehensive error handling with recovery strategies
     */
    async handleOperationError(error, originalOperation, config, operationId) {
        const errorAnalysis = this.analyzeError(error);
        
        // Log the error with full context
        this.logOperation('error', config.operationName, {
            operationId,
            error: error.message,
            errorType: errorAnalysis.type,
            isRetryable: errorAnalysis.isRetryable,
            metadata: config.metadata
        });

        // Call custom error handler if provided
        if (config.onError && typeof config.onError === 'function') {
            try {
                await config.onError(error, errorAnalysis);
            } catch (handlerError) {
                console.warn('Custom error handler failed:', handlerError.message);
            }
        }

        // Determine recovery strategy
        if (errorAnalysis.isRetryable && config.enableRetry) {
            return await this.attemptRetryRecovery(originalOperation, config, operationId, error);
        }
        
        if (!this.isOnline && config.enableOfflineQueue) {
            return await this.handleOfflineOperation(originalOperation, config);
        }

        // No recovery possible - return fallback or throw
        return this.handleUnrecoverableError(error, config);
    }

    /**
     * Retry recovery mechanism
     */
    async attemptRetryRecovery(operation, config, operationId, lastError) {
        const maxRetries = config.isCritical ? this.config.maxRetries + 2 : this.config.maxRetries;
        
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                // Calculate delay with exponential backoff
                const delay = Math.min(
                    this.config.baseDelay * Math.pow(this.config.backoffMultiplier, attempt - 1),
                    this.config.maxDelay
                );

                console.log(`Retrying ${config.operationName} (attempt ${attempt}/${maxRetries}) in ${delay}ms...`);
                
                // Wait before retry
                await this.delay(delay);

                // Check if we should still retry (e.g., network came back online)
                if (!this.shouldContinueRetry(lastError, attempt)) {
                    break;
                }

                // Attempt the operation again
                const result = await this.executeWithTimeoutAndMonitoring(operation, config, `${operationId}_retry_${attempt}`);
                
                // Success! Log the recovery
                console.log(`✅ ${config.operationName} succeeded on retry attempt ${attempt}`);
                this.logOperation('retry_success', config.operationName, {
                    operationId,
                    retryAttempt: attempt,
                    totalAttempts: attempt
                });
                
                return result;

            } catch (retryError) {
                lastError = retryError;
                
                this.logOperation('retry_failed', config.operationName, {
                    operationId,
                    retryAttempt: attempt,
                    error: retryError.message
                });

                // If this was the last attempt, continue to final error handling
                if (attempt === maxRetries) {
                    console.error(`❌ ${config.operationName} failed after ${maxRetries} attempts`);
                }
            }
        }

        // All retries failed
        return this.handleUnrecoverableError(lastError, config);
    }

    /**
     * Handle offline operations with queueing
     */
    async handleOfflineOperation(operation, config) {
        if (!config.enableOfflineQueue) {
            return this.handleUnrecoverableError(new Error('Offline and queueing disabled'), config);
        }

        const queueItem = {
            id: this.generateOperationId(),
            operation,
            config,
            timestamp: Date.now(),
            attempts: 0
        };

        this.offlineQueue.push(queueItem);
        
        console.log(`📥 Queued ${config.operationName} for offline processing (queue size: ${this.offlineQueue.length})`);
        
        // Show user feedback
        if (typeof showCustomNotification === 'function') {
            showCustomNotification(
                `${config.operationName} queued - will sync when connection is restored`, 
                'info', 
                3000
            );
        }

        // Return queued status
        return {
            success: false,
            queued: true,
            queueId: queueItem.id,
            data: config.fallbackData
        };
    }

    /**
     * Handle unrecoverable errors
     */
    handleUnrecoverableError(error, config) {
        const userMessage = this.generateUserFriendlyErrorMessage(error, config.operationName);
        
        // Show user notification if enabled
        if (config.showUserError !== false && typeof showCustomNotification === 'function') {
            showCustomNotification(userMessage, 'error');
        }

        // Log critical error
        if (window.errorHandler) {
            const severity = config.isCritical ? 'critical' : 'high';
            window.errorHandler.logError('DATABASE_UNRECOVERABLE', error, severity, {
                operation: config.operationName,
                metadata: config.metadata
            });
        }

        // Return error structure with fallback data
        return {
            success: false,
            error: error.message,
            userMessage,
            data: config.fallbackData
        };
    }

    /**
     * Error analysis for recovery decisions
     */
    analyzeError(error) {
        const errorMessage = error.message?.toLowerCase() || '';
        const errorCode = error.code;
        
        // Network/connectivity errors (retryable)
        if (this.isNetworkError(errorMessage)) {
            return {
                type: 'network',
                isRetryable: true,
                severity: 'medium',
                suggestedAction: 'retry_with_backoff'
            };
        }

        // Rate limiting (retryable with longer delay)
        if (errorMessage.includes('rate limit') || errorCode === '429') {
            return {
                type: 'rate_limit',
                isRetryable: true,
                severity: 'medium',
                suggestedAction: 'retry_with_longer_delay'
            };
        }

        // Server errors (retryable)
        if (errorMessage.includes('internal server error') || 
            errorCode === '500' || errorCode === '502' || errorCode === '503' || errorCode === '504') {
            return {
                type: 'server_error',
                isRetryable: true,
                severity: 'high',
                suggestedAction: 'retry_with_backoff'
            };
        }

        // Timeout errors (retryable)
        if (errorMessage.includes('timeout')) {
            return {
                type: 'timeout',
                isRetryable: true,
                severity: 'medium',
                suggestedAction: 'retry_with_longer_timeout'
            };
        }

        // Authentication errors (not retryable without re-auth)
        if (errorMessage.includes('unauthorized') || 
            errorMessage.includes('authentication') ||
            errorCode === '401') {
            return {
                type: 'auth_error',
                isRetryable: false,
                severity: 'high',
                suggestedAction: 'require_reauth'
            };
        }

        // Permission errors (not retryable)
        if (errorMessage.includes('permission') || 
            errorMessage.includes('forbidden') ||
            errorCode === '403') {
            return {
                type: 'permission_error',
                isRetryable: false,
                severity: 'high',
                suggestedAction: 'show_permission_error'
            };
        }

        // Data validation errors (not retryable without data fix)
        if (errorMessage.includes('constraint') || 
            errorMessage.includes('validation') ||
            errorMessage.includes('invalid')) {
            return {
                type: 'validation_error',
                isRetryable: false,
                severity: 'medium',
                suggestedAction: 'validate_input_data'
            };
        }

        // Default: treat as non-retryable
        return {
            type: 'unknown',
            isRetryable: false,
            severity: 'medium',
            suggestedAction: 'show_generic_error'
        };
    }

    /**
     * Network monitoring and queue processing
     */
    setupNetworkMonitoring() {
        window.addEventListener('online', () => {
            console.log('🌐 Network connection restored');
            this.isOnline = true;
            this.processOfflineQueue();
            
            if (typeof showCustomNotification === 'function') {
                showCustomNotification('Connection restored - syncing queued operations', 'success', 2000);
            }
        });

        window.addEventListener('offline', () => {
            console.log('📵 Network connection lost');
            this.isOnline = false;
            
            if (typeof showCustomNotification === 'function') {
                showCustomNotification('Connection lost - operations will be queued', 'warning', 3000);
            }
        });
    }

    /**
     * Process queued operations when network is restored
     */
    async processOfflineQueue() {
        if (this.isProcessingQueue || this.offlineQueue.length === 0) {
            return;
        }

        this.isProcessingQueue = true;
        console.log(`📤 Processing ${this.offlineQueue.length} queued operations...`);

        const results = [];
        
        while (this.offlineQueue.length > 0 && this.isOnline) {
            const queueItem = this.offlineQueue.shift();
            
            try {
                queueItem.attempts++;
                const result = await this.executeWithRecovery(queueItem.operation, {
                    ...queueItem.config,
                    timeout: this.config.criticalOperationTimeout // Longer timeout for queued operations
                });
                
                results.push({ success: true, id: queueItem.id, result });
                console.log(`✅ Processed queued operation: ${queueItem.config.operationName}`);
                
            } catch (error) {
                if (queueItem.attempts < 3) {
                    // Requeue for another attempt
                    this.offlineQueue.push(queueItem);
                    console.warn(`🔄 Requeued failed operation: ${queueItem.config.operationName} (attempt ${queueItem.attempts})`);
                } else {
                    // Give up after 3 attempts
                    results.push({ success: false, id: queueItem.id, error: error.message });
                    console.error(`❌ Failed to process queued operation after 3 attempts: ${queueItem.config.operationName}`);
                }
            }

            // Small delay between operations to prevent overwhelming the server
            await this.delay(200);
        }

        this.isProcessingQueue = false;
        
        if (results.length > 0) {
            const successCount = results.filter(r => r.success).length;
            console.log(`📊 Queue processing complete: ${successCount}/${results.length} operations successful`);
        }
    }

    /**
     * Periodic health check
     */
    setupPeriodicHealthCheck() {
        // Check database connectivity every 30 seconds
        setInterval(async () => {
            if (this.isOnline) {
                try {
                    await this.performHealthCheck();
                } catch (error) {
                    console.warn('Database health check failed:', error.message);
                }
            }
        }, 30000);
    }

    async performHealthCheck() {
        if (!window.supabaseClient) return;
        
        try {
            // Simple query to test connectivity
            await window.supabaseClient
                .from('user_profiles')
                .select('id')
                .limit(1);
                
        } catch (error) {
            // Health check failed - log but don't throw
            if (window.errorHandler) {
                window.errorHandler.logError('DATABASE_HEALTH_CHECK', error, 'low');
            }
        }
    }

    /**
     * Utility methods
     */
    isNetworkError(errorMessage) {
        const networkKeywords = [
            'network', 'fetch', 'connection', 'offline', 'disconnected',
            'unreachable', 'timeout', 'dns', 'resolve', 'connectivity'
        ];
        return networkKeywords.some(keyword => errorMessage.includes(keyword));
    }

    shouldContinueRetry(error, attempt) {
        // Don't retry auth errors
        if (error.message?.toLowerCase().includes('unauthorized')) {
            return false;
        }
        
        // Don't retry if we went offline
        if (!this.isOnline) {
            return false;
        }
        
        return true;
    }

    generateUserFriendlyErrorMessage(error, operationName) {
        const errorMessage = error.message?.toLowerCase() || '';
        
        if (this.isNetworkError(errorMessage)) {
            return 'Connection problem. Please check your internet connection and try again.';
        }
        
        if (errorMessage.includes('rate limit')) {
            return 'Too many requests. Please wait a moment and try again.';
        }
        
        if (errorMessage.includes('unauthorized') || errorMessage.includes('authentication')) {
            return 'Your session has expired. Please refresh the page and log in again.';
        }
        
        if (errorMessage.includes('permission') || errorMessage.includes('forbidden')) {
            return 'You don\'t have permission to perform this action.';
        }
        
        if (errorMessage.includes('validation') || errorMessage.includes('constraint')) {
            return 'The data provided is invalid. Please check your input and try again.';
        }
        
        return `${operationName} failed. Please try again or contact support if the issue persists.`;
    }

    validateResponseStructure(response, expectedStructure) {
        if (!expectedStructure) return true;
        
        try {
            for (const [key, type] of Object.entries(expectedStructure)) {
                if (key in response && typeof response[key] !== type) {
                    return false;
                }
            }
            return true;
        } catch {
            return false;
        }
    }

    generateOperationId() {
        return `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    logOperation(type, operationName, details) {
        const logEntry = {
            timestamp: new Date().toISOString(),
            type,
            operation: operationName,
            ...details
        };
        
        if (type === 'error' || type === 'retry_failed') {
            console.warn('[DB Recovery]', logEntry);
        } else {
            console.log('[DB Recovery]', logEntry);
        }
    }

    /**
     * Public API methods
     */
    getQueueStatus() {
        return {
            offlineQueueSize: this.offlineQueue.length,
            isProcessingQueue: this.isProcessingQueue,
            isOnline: this.isOnline
        };
    }

    clearOfflineQueue() {
        const count = this.offlineQueue.length;
        this.offlineQueue = [];
        console.log(`Cleared ${count} queued operations`);
        return count;
    }

    forceProcessQueue() {
        if (this.isOnline) {
            this.processOfflineQueue();
        }
    }
}

// Initialize global database error recovery
window.dbRecovery = new DatabaseErrorRecovery();

// Enhanced wrapper for common Supabase operations
window.safeSupabaseOperation = async (operation, config = {}) => {
    return await window.dbRecovery.executeWithRecovery(operation, config);
};

console.log('✅ Database Error Recovery System initialized');

// Register with initialization manager if available
if (window.initManager) {
    window.initManager.registerComponent('dbRecovery', window.dbRecovery);
}