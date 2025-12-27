// assets/js/config.js
(function() {
    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    const apiBase = isLocal ? "http://127.0.0.1:8000/api/v1" : "/api/v1";

    window.APP_CONFIG = {
        API_BASE_URL: apiBase,
        TIMEOUT: 15000,
        
        // [AUDIT FIX] Added Maps Key (Env variable replacement recommended in CI/CD pipeline)
        GOOGLE_MAPS_KEY: 'YOUR_ACTUAL_GOOGLE_MAPS_KEY_HERE', 

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