/**
 * PRODUCTION READY CHECKOUT LOGIC
 * Fixes ID mismatches and implements Warehouse resolution
 */
let selectedAddressId = null;
let paymentMethod = 'COD';
let resolvedWarehouseId = null;

document.addEventListener('DOMContentLoaded', async () => {
    if (!localStorage.getItem(APP_CONFIG.STORAGE_KEYS.TOKEN)) {
        window.location.href = APP_CONFIG.ROUTES.LOGIN;
        return;
    }
    await Promise.all([loadAddresses(), loadSummary()]);
    document.getElementById('place-order-btn').addEventListener('click', placeOrder);
    document.getElementById('address-form').addEventListener('submit', saveAddress);
});

async function loadAddresses() {
    const container = document.getElementById('address-list');
    try {
        const res = await ApiService.get('/auth/customer/addresses/');
        const addresses = res.results || res;

        if (addresses.length === 0) {
            container.innerHTML = '<p class="text-muted">No addresses found.</p>';
            return;
        }

        // Set initial selection
        if (!selectedAddressId) {
            const def = addresses.find(a => a.is_default) || addresses[0];
            selectedAddressId = def.id;
            // Resolve warehouse based on default address
            resolveWarehouse(def.latitude, def.longitude, def.city);
        }

        container.innerHTML = addresses.map(addr => `
            <div class="address-card ${selectedAddressId == addr.id ? 'active' : ''}" 
                 onclick="selectAddress('${addr.id}', ${addr.latitude}, ${addr.longitude}, '${addr.city}', this)">
                <div class="d-flex justify-between">
                    <strong>${addr.label}</strong>
                    ${addr.is_default ? '<span class="text-success small">Default</span>' : ''}
                </div>
                <p class="text-muted small mt-1">
                    ${addr.address_line}<br>${addr.city} - ${addr.pincode}
                </p>
            </div>
        `).join('');
    } catch (e) {
        container.innerHTML = '<p class="text-danger">Failed to load addresses</p>';
    }
}

window.selectAddress = function(id, lat, lng, city, el) {
    selectedAddressId = id;
    document.querySelectorAll('.address-card').forEach(c => c.classList.remove('active'));
    el.classList.add('active');
    resolveWarehouse(lat, lng, city);
};

async function resolveWarehouse(lat, lng, city) {
    try {
        const res = await ApiService.post('/warehouse/find-serviceable/', {
            latitude: lat, longitude: lng, city: city
        });
        if (res.serviceable) {
            resolvedWarehouseId = res.warehouse.id;
            document.getElementById('place-order-btn').disabled = false;
        } else {
            resolvedWarehouseId = null;
            Toast.error("Selected address is not serviceable");
            document.getElementById('place-order-btn').disabled = true;
        }
    } catch (e) { console.error("Warehouse resolution failed"); }
}

async function saveAddress(e) {
    e.preventDefault();
    const payload = {
        address_line: document.getElementById('addr-text').value, // Corrected ID
        label: document.getElementById('addr-type').value,       // Corrected ID
        city: document.getElementById('addr-city').value,       // Corrected ID
        pincode: document.getElementById('addr-pin').value,     // Corrected ID
        latitude: document.getElementById('addr-lat').value,
        longitude: document.getElementById('addr-lng').value
    };

    try {
        await ApiService.post('/auth/customer/addresses/', payload);
        Toast.success("Address Saved");
        document.getElementById('address-modal').classList.add('d-none');
        await loadAddresses(); 
    } catch (err) { Toast.error(err.message); }
}

async function placeOrder() {
    if (!selectedAddressId || !resolvedWarehouseId) return Toast.warning("Please select a serviceable address");

    const btn = document.getElementById('place-order-btn');
    btn.disabled = true;
    btn.innerText = "Processing...";

    try {
        const res = await ApiService.post('/orders/create/', {
            delivery_address_id: selectedAddressId,
            warehouse_id: resolvedWarehouseId, // Dynamic warehouse scaling
            payment_method: paymentMethod,
            delivery_type: 'express'
        });

        if (paymentMethod === 'COD') {
            window.location.href = `/success.html?order_id=${res.order.id}`;
        } else {
            handleRazorpay(res.razorpay_order, res.order.id, btn);
        }
    } catch (e) {
        Toast.error(e.message);
        btn.disabled = false;
        btn.innerText = "Place Order";
    }
}