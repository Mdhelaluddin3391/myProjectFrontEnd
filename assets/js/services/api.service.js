/**
 * Centralized API Service (Production Hardened)
 * - Auto-injects Authorization headers
 * - Handles 401 Token Refresh automatically
 * - Injects Idempotency-Key for mutating requests
 * - Centralized Error Handling
 */
class ApiService {
    static isRefreshing = false;
    static refreshSubscribers = [];

    // Generate UUIDv4 for Idempotency
    static uuidv4() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    static getHeaders(uploadFile = false, method = 'GET') {
        const headers = {};
        if (!uploadFile) {
            headers['Content-Type'] = 'application/json';
        }
        
        const token = localStorage.getItem(APP_CONFIG.STORAGE_KEYS.TOKEN);
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        // [AUDIT FIX] Idempotency for mutating methods
        if (['POST', 'PUT', 'PATCH'].includes(method.toUpperCase())) {
            headers['Idempotency-Key'] = this.uuidv4();
        }

        return headers;
    }

    static async request(endpoint, method = 'GET', body = null, isRetry = false) {
        // Ensure endpoint starts with /
        const safeEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
        const url = `${APP_CONFIG.API_BASE_URL}${safeEndpoint}`;

        const options = {
            method,
            headers: this.getHeaders(false, method),
        };

        if (body) {
            options.body = JSON.stringify(body);
        }

        try {
            const response = await fetch(url, options);

            // [AUDIT FIX] Handle 401 Unauthorized (Token Refresh Flow)
            if (response.status === 401 && !isRetry) {
                if (this.isRefreshing) {
                    // If already refreshing, queue this request
                    return new Promise((resolve) => {
                        this.refreshSubscribers.push(() => {
                            resolve(this.request(endpoint, method, body, true));
                        });
                    });
                }

                this.isRefreshing = true;
                const success = await this.refreshToken();
                this.isRefreshing = false;

                if (success) {
                    this.onRefreshed();
                    return this.request(endpoint, method, body, true);
                } else {
                    this.logoutAndRedirect();
                    return; // Stop execution
                }
            }

            // Read response safely to handle empty or non-JSON bodies (e.g., 204 No Content)
            const text = await response.text();
            let data;
            try {
                data = text ? JSON.parse(text) : null;
            } catch (parseErr) {
                // Not JSON, keep raw text
                data = text;
            }

            // [FIXED] Improved Error Parsing for Django Field Errors
            if (!response.ok) {
                let errorMsg = 'An unexpected error occurred';
                
                if (data) {
                    if (data.detail) {
                        // Global error (e.g. Authentication failed)
                        errorMsg = data.detail;
                    } else if (data.error) {
                        // Custom error object
                        errorMsg = typeof data.error === 'object' ? JSON.stringify(data.error) : data.error;
                    } else if (data.non_field_errors) {
                        // Django non-field errors
                        errorMsg = data.non_field_errors[0];
                    } else {
                        // Handle Field Errors (e.g. { "pincode": ["This field is required."] })
                        const keys = Object.keys(data);
                        if (keys.length > 0) {
                            const firstKey = keys[0];
                            const firstErr = Array.isArray(data[firstKey]) ? data[firstKey][0] : data[firstKey];
                            // User friendly format: "pincode: This field is required"
                            errorMsg = `${firstKey}: ${firstErr}`;
                        }
                    }
                }
                
                // Route to error reporting hook if needed (e.g. Sentry)
                if (window.reportError) window.reportError(errorMsg, endpoint);
                
                throw new Error(errorMsg);
            }

            // For empty successful responses, return empty object to avoid breaking callers
            return data === null ? {} : data;

        } catch (error) {
            // Suppress logs in production
            if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
                console.error(`API Error [${method} ${endpoint}]:`, error);
            }
            throw error;
        }
    }

    static async refreshToken() {
        const refresh = localStorage.getItem(APP_CONFIG.STORAGE_KEYS.REFRESH);
        if (!refresh) return false;

        try {
            // Direct fetch to avoid recursion
            const response = await fetch(`${APP_CONFIG.API_BASE_URL}/auth/refresh/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ refresh })
            });

            if (response.ok) {
                const data = await response.json();
                localStorage.setItem(APP_CONFIG.STORAGE_KEYS.TOKEN, data.access);
                // Some backends rotate refresh tokens too
                if (data.refresh) {
                    localStorage.setItem(APP_CONFIG.STORAGE_KEYS.REFRESH, data.refresh);
                }
                return true;
            }
        } catch (e) {
            console.warn("Token refresh failed", e);
        }
        return false;
    }

    static onRefreshed() {
        this.refreshSubscribers.forEach((callback) => callback());
        this.refreshSubscribers = [];
    }

    static logoutAndRedirect() {
        localStorage.clear();
        window.location.href = APP_CONFIG.ROUTES.LOGIN;
    }

    static get(endpoint) { return this.request(endpoint, 'GET'); }
    static post(endpoint, body) { return this.request(endpoint, 'POST', body); }
    static put(endpoint, body) { return this.request(endpoint, 'PUT', body); }
    static patch(endpoint, body) { return this.request(endpoint, 'PATCH', body); }
    static delete(endpoint) { return this.request(endpoint, 'DELETE'); }
}

// Expose globally
window.ApiService = ApiService;