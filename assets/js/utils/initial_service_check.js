/* assets/js/utils/initial_service_check.js */

class ServiceCheck {
    static async init() {
        // 1. Check if Service Location (Layer 2) exists
        if (localStorage.getItem(APP_CONFIG.STORAGE_KEYS.SERVICE_CONTEXT)) {
            return; // Good to go
        }
        
        // 2. Wait for Config to be ready (needed for Maps/Geocoding)
        try {
            if (window.AppConfigService) await window.AppConfigService.load();
        } catch(e) {}

        this.renderPermissionModal();
    }

    static renderPermissionModal() {
        if (document.getElementById('service-modal')) return;

        const div = document.createElement('div');
        div.id = 'service-modal';
        div.style.cssText = `position:fixed;inset:0;background:rgba(0,0,0,0.85);z-index:9999;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(4px);`;
        div.innerHTML = `
            <div style="background:#fff;padding:30px;border-radius:16px;text-align:center;max-width:400px;width:90%;box-shadow:0 10px 25px rgba(0,0,0,0.2);">
                <div style="background:#f0fdf4;width:80px;height:80px;border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 20px;">
                    <i class="fas fa-map-marked-alt fa-3x" style="color:#2ecc71;"></i>
                </div>
                <h3>Delivery Location</h3>
                <p class="text-muted mb-4">We need your location to show available products and accurate prices.</p>
                <button id="btn-grant" class="btn btn-primary w-100 py-3 mb-2" style="font-weight:600;">
                    <i class="fas fa-crosshairs me-2"></i> Enable Location
                </button>
                <button id="btn-manual" class="btn btn-outline-secondary w-100 py-2">Select Manually</button>
            </div>
        `;
        document.body.appendChild(div);

        document.getElementById('btn-grant').onclick = () => this.detectGPS();
        document.getElementById('btn-manual').onclick = () => {
            document.getElementById('service-modal').remove();
            if(window.LocationPicker) LocationPicker.open('SERVICE'); 
        };
    }

    static detectGPS() {
        if (!navigator.geolocation) {
            Toast.error("Geolocation is not supported by your browser.");
            return;
        }

        const btn = document.getElementById('btn-grant');
        if(btn) { btn.innerText = "Locating..."; btn.disabled = true; }

        navigator.geolocation.getCurrentPosition(
            async (pos) => {
                const { latitude, longitude } = pos.coords;
                
                try {
                    // Use Google Maps Geocoder via MapsLoader
                    await window.MapsLoader.load();
                    const geocoder = new google.maps.Geocoder();
                    
                    const response = await geocoder.geocode({ location: { lat: latitude, lng: longitude } });
                    
                    let city = 'Unknown';
                    let area = 'Current Location';
                    let fmt = 'Current Location';

                    if (response.results[0]) {
                        const r = response.results[0];
                        fmt = r.formatted_address;
                        r.address_components.forEach(c => {
                            if (c.types.includes('locality')) city = c.long_name;
                            if (c.types.includes('sublocality')) area = c.long_name;
                        });
                    }

                    const serviceCtx = {
                        lat: latitude,
                        lng: longitude,
                        city: city,
                        area_name: area,
                        formatted_address: fmt
                    };

                    console.info('ServiceCheck: setting SERVICE_CONTEXT after GPS detect', serviceCtx);
                    localStorage.setItem(APP_CONFIG.STORAGE_KEYS.SERVICE_CONTEXT, JSON.stringify(serviceCtx));
                    
                    window.dispatchEvent(new Event(APP_CONFIG.EVENTS.LOCATION_CHANGED));
                    document.getElementById('service-modal').remove();
                    setTimeout(() => window.location.reload(), 500);

                } catch(e) {
                    console.error("GPS Reverse Geocode Failed", e);
                    // Fallback to coordinates only if geocode fails
                    const fallbackCtx = { lat: latitude, lng: longitude, city: 'Detected', area_name: 'GPS Location' };
                    console.warn('ServiceCheck: geocode failed, saving fallback SERVICE_CONTEXT', fallbackCtx);
                    localStorage.setItem(APP_CONFIG.STORAGE_KEYS.SERVICE_CONTEXT, JSON.stringify(fallbackCtx));
                    window.location.reload();
                }
            },
            (err) => {
                if(btn) { btn.innerText = "Enable Location"; btn.disabled = false; }
                Toast.error("Permission Denied. Please select location manually.");
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
    }
}