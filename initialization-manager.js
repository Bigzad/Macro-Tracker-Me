/**
 * INITIALIZATION SEQUENCE MANAGER
 * 
 * Manages the proper loading and initialization order of all system components
 * Provides graceful fallbacks and prevents integration gaps
 * 
 * Features:
 * - Dependency tracking and waiting
 * - Initialization status monitoring
 * - Graceful degradation when components fail
 * - Non-breaking backward compatibility
 */

class InitializationManager {
    constructor() {
        this.components = new Map();
        this.readyCallbacks = [];
        this.initialized = false;
        this.initializationStarted = false;
        
        // Track component readiness
        this.componentStatus = {
            supabaseClient: false,
            errorHandler: false,
            enhancedDB: false,
            networkMonitor: false,
            dbRecovery: false,
            authWrapper: false,
            safeJSON: false,
            securityMiddleware: false
        };
        
        // Initialize immediately if DOM is ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.startInitialization());
        } else {
            setTimeout(() => this.startInitialization(), 0);
        }
        
        console.log('🔧 Initialization Manager created');
    }
    
    /**
     * Register a component as ready
     */
    registerComponent(name, instance = null) {
        if (this.componentStatus.hasOwnProperty(name)) {
            this.componentStatus[name] = true;
            this.components.set(name, instance);
            // Component registered: ${name}
            
            // Check if we can proceed with dependent initializations
            this.checkDependencies();
        } else {
            console.warn(`⚠️ Unknown component registration: ${name}`);
        }
    }
    
    /**
     * Check if a component is ready
     */
    isComponentReady(name) {
        return this.componentStatus[name] === true;
    }
    
    /**
     * Get a component instance safely
     */
    getComponent(name) {
        return this.components.get(name) || null;
    }
    
    /**
     * Wait for specific components to be ready
     */
    waitForComponents(componentNames, callback, timeout = 10000) {
        const checkReady = () => {
            const allReady = componentNames.every(name => this.isComponentReady(name));
            if (allReady) {
                callback();
                return true;
            }
            return false;
        };
        
        // Check immediately
        if (checkReady()) {
            return;
        }
        
        // Set up polling with timeout
        const startTime = Date.now();
        const pollInterval = setInterval(() => {
            if (checkReady()) {
                clearInterval(pollInterval);
            } else if (Date.now() - startTime > timeout) {
                clearInterval(pollInterval);
                console.warn(`⚠️ Timeout waiting for components: ${componentNames.join(', ')}`);
                // Call callback anyway with degraded functionality warning
                callback(true); // true indicates timeout/degraded mode
            }
        }, 100);
    }
    
    /**
     * Start the initialization sequence
     */
    async startInitialization() {
        if (this.initializationStarted) {
            return;
        }
        
        this.initializationStarted = true;
        console.info('🚀 Starting system initialization sequence...');
        
        try {
            // Phase 1: Check for basic dependencies
            await this.initializePhase1();
            
            // Phase 2: Initialize core systems
            await this.initializePhase2();
            
            // Phase 3: Initialize enhanced features
            await this.initializePhase3();
            
            // Phase 4: Final integration
            await this.initializePhase4();
            
            this.initialized = true;
            console.info('✅ System initialization complete');
            this.executeReadyCallbacks();
            
        } catch (error) {
            console.error('❌ Initialization failed:', error);
            // Still execute callbacks with degraded mode flag
            this.executeReadyCallbacks(true);
        }
    }
    
    /**
     * Phase 1: Basic Dependencies
     */
    async initializePhase1() {
        // Phase 1: Basic dependencies
        
        // Check if Supabase is available
        if (typeof window.supabase !== 'undefined' && window.supabaseClient) {
            this.registerComponent('supabaseClient', window.supabaseClient);
        }
        
        // Wait a moment for scripts to load
        await this.delay(500);
    }
    
    /**
     * Phase 2: Core Systems
     */
    async initializePhase2() {
        // Phase 2: Core systems
        
        // Check error handler
        if (window.errorHandler) {
            this.registerComponent('errorHandler', window.errorHandler);
        }
        
        // Check safe JSON handler
        if (window.JSON && window.JSON.safeParse) {
            this.registerComponent('safeJSON', window.JSON);
        }
        
        await this.delay(200);
    }
    
    /**
     * Phase 3: Enhanced Features
     */
    async initializePhase3() {
        // Phase 3: Enhanced features
        
        // Check enhanced database functions
        if (window.enhancedDB) {
            this.registerComponent('enhancedDB', window.enhancedDB);
        }
        
        // Check network monitor
        if (window.networkMonitor) {
            this.registerComponent('networkMonitor', window.networkMonitor);
        }
        
        // Check database recovery
        if (window.dbRecovery) {
            this.registerComponent('dbRecovery', window.dbRecovery);
        }
        
        await this.delay(300);
    }
    
    /**
     * Phase 4: Final Integration
     */
    async initializePhase4() {
        // Phase 4: Final integration
        
        // Check auth wrapper
        if (window.authWrapper || typeof authWrapper !== 'undefined') {
            this.registerComponent('authWrapper', window.authWrapper || authWrapper);
        }
        
        // Check security middleware
        if (window.originalFetchStored) {
            this.registerComponent('securityMiddleware', true);
        }
        
        await this.delay(200);
    }
    
    /**
     * Add callback for when initialization is complete
     */
    onReady(callback) {
        if (this.initialized) {
            callback();
        } else {
            this.readyCallbacks.push(callback);
        }
    }
    
    /**
     * Execute all ready callbacks
     */
    executeReadyCallbacks(degradedMode = false) {
        this.readyCallbacks.forEach(callback => {
            try {
                callback(degradedMode);
            } catch (error) {
                console.error('Error in ready callback:', error);
            }
        });
        this.readyCallbacks = [];
    }
    
    /**
     * Get system status report
     */
    getSystemStatus() {
        const ready = Object.values(this.componentStatus).filter(status => status).length;
        const total = Object.keys(this.componentStatus).length;
        
        return {
            initialized: this.initialized,
            readyComponents: ready,
            totalComponents: total,
            readinessPercentage: Math.round((ready / total) * 100),
            componentStatus: { ...this.componentStatus },
            missingComponents: Object.keys(this.componentStatus).filter(name => !this.componentStatus[name])
        };
    }
    
    /**
     * Create safe accessor for global objects
     */
    createSafeAccessor(globalName, fallback = null) {
        return () => {
            const component = window[globalName];
            if (component) {
                return component;
            }
            
            console.warn(`⚠️ ${globalName} not available, using fallback`);
            return fallback;
        };
    }
    
    /**
     * Utility: delay function
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    /**
     * Check all dependencies and trigger ready state
     */
    checkDependencies() {
        // Don't check if initialization hasn't started
        if (!this.initializationStarted) {
            return;
        }
        
        const status = this.getSystemStatus();
        // System readiness: ${status.readinessPercentage}% (${status.readyComponents}/${status.totalComponents})
        // Missing components: ${status.missingComponents.join(', ')}
    }
}

// Create global instance
window.initManager = new InitializationManager();

// Create safe accessors for commonly used globals
window.safeGetSupabaseClient = window.initManager.createSafeAccessor('supabaseClient', null);
window.safeGetErrorHandler = window.initManager.createSafeAccessor('errorHandler', { 
    logError: () => console.error, 
    validateInput: () => ({ valid: true })
});
window.safeGetEnhancedDB = window.initManager.createSafeAccessor('enhancedDB', {
    enhancedJSONParse: JSON.parse,
    enhancedJSONStringify: JSON.stringify,
    enhancedLocalStorage: localStorage
});

console.info('✅ Initialization Manager loaded');