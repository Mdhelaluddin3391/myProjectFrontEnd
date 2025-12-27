(function() {
    window.APP_CONFIG = {
        // Updated to match your Django API Prefix
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
            REFRESH: 'refresh_token',
            USER: 'user_data',
            LOCATION: 'user_location_data'
        }
    };
})();