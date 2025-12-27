// assets/js/config.js
(function() {
    window.APP_CONFIG = {
        // Updated: Pointing to your actual Django API
        API_BASE_URL: "http://127.0.0.1:8000/api/v1",
        
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
            REFRESH: 'refresh_token', // Added for logout support
            USER: 'user_data',
            LOCATION: 'user_location_data'
        }
    };
})();