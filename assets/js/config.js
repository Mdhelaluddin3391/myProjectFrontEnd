// assets/js/config.js
(function() {
    // Determine API Base URL dynamically
    // If running on localhost/file protocol, keep the hardcoded dev URL
    // Otherwise, use relative path for production (served by Nginx on same domain)
    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    
    // In production, Nginx proxies /api/v1 -> Backend. 
    // In local dev, we might need direct access if not using Nginx.
    const apiBase = isLocal ? "http://127.0.0.1:8000/api/v1" : "/api/v1";

    window.APP_CONFIG = {
        API_BASE_URL: apiBase,
        
        TIMEOUT: 15000,

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
            WAREHOUSE_ID: 'current_warehouse_id' // Explicit key for warehouse
        }
    };
})();