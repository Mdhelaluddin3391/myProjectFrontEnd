/* assets/js/utils/maps_loader.js */

const MapsLoader = {
    _promise: null,

    /**
     * Loads the Google Maps SDK with necessary libraries.
     * Guarantees singleton loading (only loads once).
     * Waits for AppConfig to be ready to get the API Key.
     */
    load() {
        if (this._promise) return this._promise;

        this._promise = new Promise(async (resolve, reject) => {
            // 1. Check if Google Maps is already available globally
            if (window.google && window.google.maps) {
                resolve(window.google.maps);
                return;
            }

            // 2. Wait for AppConfig (Backend Config) to load
            if (!window.APP_CONFIG || !window.APP_CONFIG.GOOGLE_MAPS_KEY) {
                try {
                    if (window.AppConfigService) {
                        await window.AppConfigService.load();
                    } else {
                        // Fallback/Retry logic if Service isn't ready immediately
                        await new Promise(r => setTimeout(r, 1000));
                        if (window.AppConfigService) await window.AppConfigService.load();
                    }
                } catch(e) {
                    console.error("MapsLoader: Config failed to load", e);
                    reject("Config Load Failed"); 
                    return;
                }
            }

            const apiKey = window.APP_CONFIG.GOOGLE_MAPS_KEY;
            if (!apiKey) {
                console.error("MapsLoader: Missing API Key");
                reject("No Google Maps Key found in Config");
                return;
            }

            // 3. Inject the Script Tag safely
            if (document.querySelector('script[src*="maps.googleapis.com"]')) {
                // Script exists but window.google not ready? Wait for it.
                const checkInterval = setInterval(() => {
                    if (window.google && window.google.maps) {
                        clearInterval(checkInterval);
                        resolve(window.google.maps);
                    }
                }, 100);
                return;
            }

            const script = document.createElement('script');
            // Loading 'places' and 'geometry' libraries is critical for Quick Commerce
            script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places,geometry&loading=async`;
            script.async = true;
            script.defer = true;
            
            script.onload = () => {
                resolve(window.google.maps);
            };
            
            script.onerror = (e) => {
                reject(e);
            };
            
            document.head.appendChild(script);
        });

        return this._promise;
    }
};

// Expose globally
window.MapsLoader = MapsLoader;