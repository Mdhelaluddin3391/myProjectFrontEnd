// assets/js/config.js
(function() {
    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    const apiBase = isLocal ? "http://127.0.0.1:8000/api/v1" : "/api/v1";

    // Initial Static Configuration
    window.APP_CONFIG = {
        API_BASE_URL: apiBase,
        TIMEOUT: 15000,
        
        // Placeholder - will be overwritten by AppConfigService
        GOOGLE_MAPS_KEY: null, 

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

    // Config Loader Service
    window.AppConfigService = {
        isLoaded: false,
        
        async load() {
            if (this.isLoaded) return;

            try {
                // Determine base URL dynamically for the config endpoint
                const configUrl = isLocal ? "http://127.0.0.1:8000/api/config/" : "/api/config/";
                
                const response = await fetch(configUrl);
                if (!response.ok) throw new Error("Config fetch failed");
                
                const data = await response.json();
                
                // Inject Keys
                if (data.keys && data.keys.google_maps) {
                    window.APP_CONFIG.GOOGLE_MAPS_KEY = data.keys.google_maps;
                }

                // Handle Maintenance Mode
                if (data.maintenance_mode) {
                    document.body.innerHTML = '<div style="text-align:center; padding:50px;"><h1>Maintenance Mode</h1><p>We will be back shortly.</p></div>';
                    throw new Error("System in maintenance");
                }

                this.isLoaded = true;
                console.log("App Config Loaded Successfully");

            } catch (e) {
                console.error("Critical: Failed to load app config", e);
                // In production, you might want to show a graceful error screen here
            }
        }
    };
})();