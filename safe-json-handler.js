/**
 * SAFE JSON HANDLER
 * Bulletproof JSON operations with validation and error recovery
 * Prevents all JSON-related crashes and provides intelligent fallbacks
 */

class SafeJSONHandler {
    constructor() {
        this.schemas = new Map();
        this.parseCache = new Map();
        this.maxCacheSize = 100;
    }

    /**
     * Register a schema for validation
     */
    registerSchema(name, schema) {
        this.schemas.set(name, schema);
    }

    /**
     * Ultra-safe JSON parsing with comprehensive error handling
     */
    safeParse(input, options = {}) {
        const {
            fallback = {},
            schemaName = null,
            allowPartialParse = true,
            trimInput = true,
            logErrors = true,
            validateTypes = true
        } = options;

        try {
            // Handle null/undefined/empty cases
            if (input === null || input === undefined) {
                return fallback;
            }

            // Handle already parsed objects
            if (typeof input === 'object' && input !== null) {
                return this.validateAndClean(input, schemaName, fallback);
            }

            // Convert to string and handle edge cases
            let jsonString = String(input);
            
            if (trimInput) {
                jsonString = jsonString.trim();
            }

            // Handle empty or invalid strings
            if (jsonString === '' || jsonString === 'undefined' || jsonString === 'null') {
                return fallback;
            }

            // Check cache first
            const cacheKey = this.generateCacheKey(jsonString, schemaName);
            if (this.parseCache.has(cacheKey)) {
                return this.parseCache.get(cacheKey);
            }

            // Attempt to fix common JSON issues before parsing
            jsonString = this.preprocessJSON(jsonString);

            // Parse JSON
            let parsed;
            try {
                parsed = JSON.parse(jsonString);
            } catch (parseError) {
                if (allowPartialParse) {
                    parsed = this.attemptPartialParse(jsonString, fallback);
                } else {
                    throw parseError;
                }
            }

            // Validate and clean the parsed object
            const result = this.validateAndClean(parsed, schemaName, fallback, validateTypes);

            // Cache successful parse
            this.cacheResult(cacheKey, result);

            return result;

        } catch (error) {
            if (logErrors) {
                console.warn('SafeJSONHandler: Parse failed, using fallback:', {
                    error: error.message,
                    input: typeof input === 'string' ? input.substring(0, 100) : input,
                    fallback
                });
                
                if (window.errorHandler) {
                    window.errorHandler.logError('SAFE_JSON_PARSE', error, 'medium', {
                        inputType: typeof input,
                        inputPreview: typeof input === 'string' ? input.substring(0, 50) : String(input).substring(0, 50)
                    });
                }
            }
            return fallback;
        }
    }

    /**
     * Safe JSON stringification with error handling
     */
    safeStringify(input, options = {}) {
        const {
            fallback = '{}',
            pretty = false,
            maxDepth = 10,
            handleCircular = true,
            logErrors = true
        } = options;

        try {
            if (input === undefined) {
                return fallback;
            }

            let processedInput = input;

            // Handle circular references if requested
            if (handleCircular) {
                processedInput = this.removeCircularReferences(input, maxDepth);
            }

            // Stringify with optional pretty printing
            const result = pretty 
                ? JSON.stringify(processedInput, null, 2)
                : JSON.stringify(processedInput);

            return result;

        } catch (error) {
            if (logErrors) {
                console.warn('SafeJSONHandler: Stringify failed, using fallback:', {
                    error: error.message,
                    inputType: typeof input,
                    fallback
                });

                if (window.errorHandler) {
                    window.errorHandler.logError('SAFE_JSON_STRINGIFY', error, 'medium', {
                        inputType: typeof input
                    });
                }
            }
            return fallback;
        }
    }

    /**
     * Preprocess JSON string to fix common issues
     */
    preprocessJSON(jsonString) {
        try {
            // Remove BOM if present
            if (jsonString.charCodeAt(0) === 0xFEFF) {
                jsonString = jsonString.slice(1);
            }

            // Fix common issues
            jsonString = jsonString
                // Remove trailing commas before closing braces/brackets
                .replace(/,(\s*[}\]])/g, '$1')
                // Fix unquoted keys (basic cases)
                .replace(/(\w+)(\s*:\s*)/g, '"$1"$2')
                // Fix single quotes to double quotes (basic cases)
                .replace(/'/g, '"')
                // Remove comments (// style)
                .replace(/\/\/.*$/gm, '')
                // Remove comments (/* */ style)
                .replace(/\/\*[\s\S]*?\*\//g, '');

            return jsonString.trim();
        } catch (error) {
            return jsonString;
        }
    }

    /**
     * Attempt to parse partial JSON or extract useful data
     */
    attemptPartialParse(jsonString, fallback) {
        try {
            // Try to extract object-like content
            const objectMatch = jsonString.match(/\{[^{}]*\}/);
            if (objectMatch) {
                return JSON.parse(objectMatch[0]);
            }

            // Try to extract array-like content
            const arrayMatch = jsonString.match(/\[[^\[\]]*\]/);
            if (arrayMatch) {
                return JSON.parse(arrayMatch[0]);
            }

            // Try to extract quoted string value
            const stringMatch = jsonString.match(/"([^"]*)"/);
            if (stringMatch) {
                return stringMatch[1];
            }

            // Try to extract number value
            const numberMatch = jsonString.match(/\b\d+\.?\d*\b/);
            if (numberMatch) {
                return parseFloat(numberMatch[0]);
            }

            return fallback;
        } catch {
            return fallback;
        }
    }

    /**
     * Validate and clean parsed JSON against schema
     */
    validateAndClean(parsed, schemaName, fallback, validateTypes = true) {
        try {
            if (!schemaName || !this.schemas.has(schemaName)) {
                return parsed;
            }

            const schema = this.schemas.get(schemaName);
            const cleaned = { ...parsed };

            // Validate required fields
            for (const [field, rules] of Object.entries(schema)) {
                if (rules.required && !(field in cleaned)) {
                    if (rules.default !== undefined) {
                        cleaned[field] = rules.default;
                    } else {
                        console.warn(`SafeJSONHandler: Required field '${field}' missing`);
                        return fallback;
                    }
                }

                // Type validation and coercion
                if (validateTypes && field in cleaned && rules.type) {
                    const currentValue = cleaned[field];
                    const expectedType = rules.type;

                    if (!this.isValidType(currentValue, expectedType)) {
                        const coercedValue = this.coerceType(currentValue, expectedType, rules.default);
                        if (coercedValue !== null) {
                            cleaned[field] = coercedValue;
                        } else {
                            console.warn(`SafeJSONHandler: Type validation failed for field '${field}'`);
                            if (rules.default !== undefined) {
                                cleaned[field] = rules.default;
                            } else {
                                delete cleaned[field];
                            }
                        }
                    }
                }

                // Range validation for numbers
                if (field in cleaned && rules.range && typeof cleaned[field] === 'number') {
                    const { min, max } = rules.range;
                    if ((min !== undefined && cleaned[field] < min) || 
                        (max !== undefined && cleaned[field] > max)) {
                        cleaned[field] = rules.default !== undefined ? rules.default : 
                                        (min !== undefined ? min : max);
                    }
                }

                // String length validation
                if (field in cleaned && rules.maxLength && typeof cleaned[field] === 'string') {
                    if (cleaned[field].length > rules.maxLength) {
                        cleaned[field] = cleaned[field].substring(0, rules.maxLength);
                    }
                }
            }

            return cleaned;
        } catch (error) {
            console.warn('SafeJSONHandler: Validation failed:', error.message);
            return parsed || fallback;
        }
    }

    /**
     * Type validation helper
     */
    isValidType(value, expectedType) {
        if (expectedType === 'array') {
            return Array.isArray(value);
        }
        if (expectedType === 'null') {
            return value === null;
        }
        return typeof value === expectedType;
    }

    /**
     * Type coercion helper
     */
    coerceType(value, targetType, fallback = null) {
        try {
            switch (targetType) {
                case 'string':
                    return String(value);
                case 'number':
                    const num = Number(value);
                    return isNaN(num) ? fallback : num;
                case 'boolean':
                    if (typeof value === 'boolean') return value;
                    if (typeof value === 'string') {
                        const lower = value.toLowerCase();
                        return lower === 'true' || lower === '1' || lower === 'yes';
                    }
                    return Boolean(value);
                case 'array':
                    return Array.isArray(value) ? value : (value ? [value] : fallback);
                case 'object':
                    return (typeof value === 'object' && value !== null) ? value : fallback;
                default:
                    return fallback;
            }
        } catch {
            return fallback;
        }
    }

    /**
     * Remove circular references from object
     */
    removeCircularReferences(obj, maxDepth = 10, visited = new WeakSet(), currentDepth = 0) {
        if (currentDepth >= maxDepth) {
            return '[Max Depth Reached]';
        }

        if (obj === null || typeof obj !== 'object') {
            return obj;
        }

        if (visited.has(obj)) {
            return '[Circular Reference]';
        }

        visited.add(obj);

        try {
            if (Array.isArray(obj)) {
                return obj.map(item => 
                    this.removeCircularReferences(item, maxDepth, visited, currentDepth + 1)
                );
            } else {
                const cleaned = {};
                for (const [key, value] of Object.entries(obj)) {
                    cleaned[key] = this.removeCircularReferences(value, maxDepth, visited, currentDepth + 1);
                }
                return cleaned;
            }
        } catch (error) {
            return '[Processing Error]';
        } finally {
            visited.delete(obj);
        }
    }

    /**
     * Cache management
     */
    generateCacheKey(jsonString, schemaName) {
        const hash = this.simpleHash(jsonString + (schemaName || ''));
        return `${hash}_${schemaName || 'default'}`;
    }

    cacheResult(key, result) {
        if (this.parseCache.size >= this.maxCacheSize) {
            // Remove oldest entry
            const firstKey = this.parseCache.keys().next().value;
            this.parseCache.delete(firstKey);
        }
        this.parseCache.set(key, result);
    }

    simpleHash(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32bit integer
        }
        return Math.abs(hash).toString(36);
    }

    /**
     * Utility methods
     */
    clearCache() {
        this.parseCache.clear();
    }

    getCacheStats() {
        return {
            size: this.parseCache.size,
            maxSize: this.maxCacheSize,
            schemas: this.schemas.size
        };
    }

    /**
     * Common schema definitions
     */
    static getCommonSchemas() {
        return {
            userPreferences: {
                unit_system: { type: 'string', default: 'imperial', required: true },
                theme: { type: 'string', default: 'light' },
                notifications_enabled: { type: 'boolean', default: true },
                show_tutorials: { type: 'boolean', default: true }
            },
            dailyTargets: {
                daily_calories: { type: 'number', default: 2000, range: { min: 800, max: 5000 } },
                daily_protein: { type: 'number', default: 150, range: { min: 20, max: 500 } },
                daily_carbs: { type: 'number', default: 250, range: { min: 20, max: 800 } },
                daily_fat: { type: 'number', default: 67, range: { min: 10, max: 300 } }
            },
            mealPlan: {
                day: { type: 'string', required: true },
                meal_type: { type: 'string', required: true },
                recipe_name: { type: 'string', maxLength: 200 },
                calories: { type: 'number', range: { min: 0, max: 5000 } },
                protein: { type: 'number', range: { min: 0, max: 200 } },
                carbs: { type: 'number', range: { min: 0, max: 500 } },
                fat: { type: 'number', range: { min: 0, max: 100 } }
            },
            customRecipe: {
                name: { type: 'string', required: true, maxLength: 200 },
                category: { type: 'string', default: 'other' },
                ingredients: { type: 'array', default: [] },
                instructions: { type: 'string', maxLength: 2000 },
                calories: { type: 'number', range: { min: 0, max: 5000 } },
                servings: { type: 'number', default: 1, range: { min: 1, max: 20 } }
            }
        };
    }
}

// Initialize global safe JSON handler
window.safeJSON = new SafeJSONHandler();

// Register common schemas
const commonSchemas = SafeJSONHandler.getCommonSchemas();
Object.entries(commonSchemas).forEach(([name, schema]) => {
    window.safeJSON.registerSchema(name, schema);
});

// Global helper functions for backward compatibility
window.safeParse = (input, fallback = {}, schemaName = null) => {
    return window.safeJSON.safeParse(input, { fallback, schemaName });
};

window.safeStringify = (input, fallback = '{}', pretty = false) => {
    return window.safeJSON.safeStringify(input, { fallback, pretty });
};

console.log('✅ Safe JSON Handler initialized with schemas:', Object.keys(commonSchemas));

// Register with initialization manager if available
if (window.initManager && window.JSON && window.JSON.safeParse) {
    window.initManager.registerComponent('safeJSON', window.JSON);
}