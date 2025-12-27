/* assets/js/utils/location_picker.js */
const LocationPicker = {
    state: { lat: 12.9716, lng: 77.5946, address: '', pincode: '', city: 'Bengaluru' },
    map: null,
    callback: null,

    init() {
        this.injectModal();
        this.checkInitialLocation();
    },

    injectModal() {
        if(document.getElementById('location-modal')) return;
        // ... (Modal HTML remains same as your file, skipping for brevity) ...
        const div = document.createElement('div');
        div.id = 'location-modal';
        div.className = 'location-modal';
        div.innerHTML = `
            <div class="modal-content-map">
                <div class="map-header">
                    <h3 style="margin:0; font-size:1.1rem;">Set Delivery Location</h3>
                    <button id="close-map" style="background:none; border:none; font-size:1.5rem; cursor:pointer;">&times;</button>
                </div>
                <div class="map-wrapper">
                    <div id="picker-map" style="width:100%; height:100%;"></div>
                    <div class="center-pin"><i class="fas fa-map-marker-alt pin-icon"></i></div>
                    <button id="gps-trigger" class="gps-btn"><i class="fas fa-crosshairs"></i></button>
                </div>
                <div class="loc-footer">
                    <h4 id="loc-title">Detecting...</h4>
                    <p id="loc-desc" class="text-muted small mb-3">Move map to adjust</p>
                    <button id="btn-confirm-loc" class="btn btn-primary w-100" disabled>Confirm Location</button>
                </div>
            </div>`;
        document.body.appendChild(div);

        document.getElementById('close-map').onclick = () => this.close();
        document.getElementById('gps-trigger').onclick = () => this.triggerGPS();
        document.getElementById('btn-confirm-loc').onclick = () => this.confirm();
    },

    checkInitialLocation() {
        const saved = localStorage.getItem('user_address_text');
        if(!saved && window.location.pathname === '/index.html') {
            setTimeout(() => this.open(), 1000);
        }
    },

    open(onSelectCallback = null) {
        this.callback = onSelectCallback;
        const modal = document.getElementById('location-modal');
        modal.classList.add('active');
        document.body.classList.add('location-mode-active');

        if(typeof L === 'undefined') {
            const css = document.createElement('link');
            css.rel = 'stylesheet'; href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
            document.head.appendChild(css);
            const script = document.createElement('script');
            script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
            script.onload = () => this.initMap();
            document.body.appendChild(script);
        } else {
            setTimeout(() => { if(!this.map) this.initMap(); else this.map.invalidateSize(); }, 100);
        }
    },

    close() {
        document.getElementById('location-modal').classList.remove('active');
        document.body.classList.remove('location-mode-active');
    },

    initMap() {
        this.map = L.map('picker-map', { zoomControl: false }).setView([this.state.lat, this.state.lng], 13);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(this.map);
        this.map.on('move', () => {
            document.getElementById('btn-confirm-loc').innerText = "Locating...";
            document.getElementById('btn-confirm-loc').disabled = true;
        });
        this.map.on('moveend', () => {
            const c = this.map.getCenter();
            this.fetchAddress(c.lat, c.lng);
        });
        this.fetchAddress(this.state.lat, this.state.lng);
    },

    triggerGPS() {
        if(!navigator.geolocation) return alert("GPS not supported");
        navigator.geolocation.getCurrentPosition(
            (pos) => this.map.flyTo([pos.coords.latitude, pos.coords.longitude], 16),
            () => alert("Location access denied")
        );
    },

    async fetchAddress(lat, lng) {
        this.state.lat = lat;
        this.state.lng = lng;
        try {
            const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
            const data = await res.json();
            const addr = data.address;
            this.state.address = data.display_name;
            this.state.city = addr.city || addr.town || "Bengaluru";
            this.state.pincode = addr.postcode || "";

            document.getElementById('loc-title').innerText = addr.suburb || this.state.city;
            document.getElementById('loc-desc').innerText = this.state.address;
            
            const btn = document.getElementById('btn-confirm-loc');
            btn.disabled = false;
            btn.innerText = "Confirm Location";
        } catch(e) { document.getElementById('btn-confirm-loc').innerText = "Retry"; }
    },

    async confirm() {
        const btn = document.getElementById('btn-confirm-loc');
        const originalText = btn.innerText;
        btn.innerText = "Checking Service...";
        btn.disabled = true;

        try {
            // FIX: Endpoint updated to match Backend 'ServiceableWarehouseAPIView'
            // Old: /locations/check-service/ -> New: /warehouse/find-serviceable/
            const payload = {
                latitude: this.state.lat,
                longitude: this.state.lng,
                city: this.state.city || 'Bengaluru' // City is required by backend
            };

            const res = await ApiService.post('/warehouse/find-serviceable/', payload);

            if (res.serviceable === false) {
                window.location.href = '/not_serviceable.html';
                return;
            }

            // Save Validated Location
            localStorage.setItem('user_lat', this.state.lat);
            localStorage.setItem('user_lng', this.state.lng);
            localStorage.setItem('user_address_text', this.state.address);
            localStorage.setItem('user_city', this.state.city);
            if(this.state.pincode) localStorage.setItem('user_pincode', this.state.pincode);
            
            // Save Warehouse ID logic (Backend sends 'warehouse' object inside response)
            if(res.warehouse && res.warehouse.id) {
                localStorage.setItem('current_warehouse_id', res.warehouse.id);
            }

            Toast.success("Location Confirmed & Serviceable!");
            
            if(this.callback) this.callback(this.state);
            else window.location.reload();
            
            this.close();

        } catch (e) {
            console.error("Service Check Failed", e);
            // Agar backend se specific error aaye (jaise City not supported)
            Toast.error(e.message || "Service check failed. Try another location.");
            btn.innerText = originalText;
            btn.disabled = false;
        }
    }
};

window.LocationPicker = LocationPicker;
document.addEventListener('DOMContentLoaded', () => LocationPicker.init());