(function() {
    window.APP_CONFIG = {
        // Update this to your actual backend URL
        API_BASE_URL: "http://127.0.0.1:8000/api/v1",
        
        // Timeout for requests in ms
        TIMEOUT: 15000,

        // Routes
        ROUTES: {
            HOME: '/index.html',
            LOGIN: '/auth.html',
            CART: '/cart.html',
            CHECKOUT: '/checkout.html',
            PROFILE: '/profile.html',
            SUCCESS: '/success.html'
        },

        // Keys for LocalStorage
        STORAGE_KEYS: {
            TOKEN: 'access_token',
            USER: 'user_data',
            USER_PHONE: 'user_phone',
            LOCATION: 'user_location_data'
        }
    };
})();