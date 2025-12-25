const LocationPicker = {
    modal: null,
    map: null,
    marker: null,
    callback: null,
    
    init() {
        this.injectModal();
    },

    injectModal() {
        const div = document.createElement('div');
        div.id = 'loc-picker-modal';
        div.className = 'modal-overlay d-none';
        div.innerHTML = `
            <div class="modal-box" style="max-width:500px; width:95%; padding:0; overflow:hidden;">
                <div style="padding:15px; border-bottom:1px solid #eee; display:flex; justify-content:space-between;">
                    <h3 class="m-0">Set Location</h3>
                    <button onclick="LocationPicker.close()" class="border-0 bg-transparent" style="font-size:1.5rem;">&times;</button>
                </div>
                <div id="picker-map" style="height:300px; background:#eee;"></div>
                <div style="padding:20px;">
                    <p id="picker-address" class="text-muted small mb-3">Detecting...</p>
                    <button id="picker-confirm" class="btn btn-primary w-100" disabled>Confirm Location</button>
                </div>
            </div>
        `;
        document.body.appendChild(div);
        
        // Load Leaflet CSS if not present
        if(!document.querySelector('link[href*="leaflet"]')) {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
            document.head.appendChild(link);
        }
    },

    open(onSelectCallback) {
        this.callback = onSelectCallback;
        const modal = document.getElementById('loc-picker-modal');
        modal.classList.remove('d-none');
        
        // Lazy load Leaflet JS
        if(typeof L === 'undefined') {
            const script = document.createElement('script');
            script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
            script.onload = () => this.initMap();
            document.body.appendChild(script);
        } else {
            setTimeout(() => {
                if(!this.map) this.initMap();
                else this.map.invalidateSize();
            }, 100);
        }
    },

    initMap() {
        // Default: Bangalore
        const defLat = 12.9716, defLng = 77.5946;
        
        this.map = L.map('picker-map').setView([defLat, defLng], 13);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(this.map);
        
        // Center Marker Logic
        const centerIcon = L.divIcon({
            className: 'picker-center-marker',
            html: '<i class="fas fa-map-marker-alt" style="font-size:2rem; color:#e74c3c; transform:translate(-50%, -100%);"></i>',
            iconSize: [0, 0]
        });
        
        const marker = L.marker(this.map.getCenter(), {icon: centerIcon}).addTo(this.map);
        
        this.map.on('move', () => {
            marker.setLatLng(this.map.getCenter());
            document.getElementById('picker-confirm').disabled = true;
            document.getElementById('picker-confirm').innerText = 'Moving...';
        });

        this.map.on('moveend', async () => {
            const center = this.map.getCenter();
            await this.fetchAddress(center.lat, center.lng);
        });

        // Bind Confirm
        document.getElementById('picker-confirm').onclick = () => {
            const center = this.map.getCenter();
            const addr = document.getElementById('picker-address').innerText;
            if(this.callback) this.callback({ lat: center.lat, lng: center.lng, address: addr });
            this.close();
        };

        // Trigger initial fetch
        this.fetchAddress(defLat, defLng);
    },

    async fetchAddress(lat, lng) {
        try {
            // Using OpenStreetMap Nominatim (Free)
            const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
            const data = await res.json();
            document.getElementById('picker-address').innerText = data.display_name;
            document.getElementById('picker-confirm').disabled = false;
            document.getElementById('picker-confirm').innerText = 'Confirm Location';
        } catch(e) {
            document.getElementById('picker-address').innerText = "Location selected";
            document.getElementById('picker-confirm').disabled = false;
        }
    },

    close() {
        document.getElementById('loc-picker-modal').classList.add('d-none');
    }
};

// Initialize on load
document.addEventListener('DOMContentLoaded', () => LocationPicker.init());