/**
 * Centralized API Service
 * Handles headers, auth tokens, error parsing, and response formatting.
 */
class ApiService {
    static getHeaders(uploadFile = false) {
        const headers = {};
        if (!uploadFile) {
            headers['Content-Type'] = 'application/json';
        }
        
        const token = localStorage.getItem(APP_CONFIG.STORAGE_KEYS.TOKEN);
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        return headers;
    }

    static async request(endpoint, method = 'GET', body = null) {
        // Ensure endpoint starts with /
        const safeEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
        const url = `${APP_CONFIG.API_BASE_URL}${safeEndpoint}`;

        const options = {
            method,
            headers: this.getHeaders(),
        };

        if (body) {
            options.body = JSON.stringify(body);
        }

        try {
            const response = await fetch(url, options);

            // Handle 401 Unauthorized (Session Expired)
            if (response.status === 401) {
                console.warn("Session expired. Redirecting to login.");
                localStorage.removeItem(APP_CONFIG.STORAGE_KEYS.TOKEN);
                localStorage.removeItem(APP_CONFIG.STORAGE_KEYS.USER);
                window.location.href = APP_CONFIG.ROUTES.LOGIN;
                return;
            }

            const data = await response.json();

            if (!response.ok) {
                // Extract error message from Django DRF format
                const errorMsg = data.detail || 
                                 data.error || 
                                 (data.non_field_errors ? data.non_field_errors[0] : 'An unexpected error occurred');
                throw new Error(errorMsg);
            }

            return data;

        } catch (error) {
            console.error(`API Error [${method} ${endpoint}]:`, error);
            throw error; // Re-throw for component handling
        }
    }

    static get(endpoint) { return this.request(endpoint, 'GET'); }
    static post(endpoint, body) { return this.request(endpoint, 'POST', body); }
    static put(endpoint, body) { return this.request(endpoint, 'PUT', body); }
    static patch(endpoint, body) { return this.request(endpoint, 'PATCH', body); }
    static delete(endpoint) { return this.request(endpoint, 'DELETE'); }
}

// Expose globally
window.ApiService = ApiService;