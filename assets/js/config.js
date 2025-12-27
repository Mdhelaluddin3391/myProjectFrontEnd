// assets/js/config.js
(function() {
    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    
    // Environment variable injection point (configured via CI/CD or Server Template)
    const env = window.__ENV__ || {};

    const apiBase = isLocal ? "http://127.0.0.1:8000/api/v1" : "/api/v1";

    window.APP_CONFIG = {
        API_BASE_URL: apiBase,
        TIMEOUT: 15000,
        
        // SECURITY: Key must be restricted by HTTP Referrer in Google Cloud Console
        GOOGLE_MAPS_KEY: env.GOOGLE_MAPS_KEY || 'REPLACE_WITH_REAL_KEY_DURING_BUILD', 

        ROUTES: {
            HOME: '/index.html',
            LOGIN: '/auth.html',
            CART: '/cart.html',
            CHECKOUT: '/checkout.html',
            PROFILE: '/profile.html',
            SUCCESS: '/success.html'
        },

        STORAGE_KEYS: {
            TOKEN: 'access_token',
            REFRESH: 'refresh_token',
            USER: 'user_data',
            LOCATION: 'user_location_data',
            WAREHOUSE_ID: 'current_warehouse_id'
        }
    };
})();