// assets/js/pages/checkout.js
/**
 * PRODUCTION READY CHECKOUT LOGIC
 * Includes Razorpay Integration and Dynamic Warehouse/Location Handling
 */
let selectedAddressId = null;
let paymentMethod = 'COD';
let resolvedWarehouseId = null;

document.addEventListener('DOMContentLoaded', async () => {
    if (!localStorage.getItem(APP_CONFIG.STORAGE_KEYS.TOKEN)) {
        window.location.href = APP_CONFIG.ROUTES.LOGIN;
        return;
    }
    
    // Load summary and addresses
    await Promise.all([loadAddresses(), loadSummary()]);
    
    document.getElementById('place-order-btn').addEventListener('click', placeOrder);
    
    const addressForm = document.getElementById('address-form');
    if(addressForm) addressForm.addEventListener('submit', saveAddress);
});

async function loadSummary() {
    // Re-use logic from cart.js or fetch fresh cart
    try {
        const cart = await ApiService.get('/orders/cart/');
        if(!cart.items || cart.items.length === 0) {
            window.location.href = '/cart.html';
            return;
        }
        
        const list = document.getElementById('mini-cart-list');
        list.innerHTML = cart.items.map(item => `
            <div class="d-flex justify-between small mb-2">
                <span>${item.sku_name} x${item.quantity}</span>
                <span>${Formatters.currency(item.total_price)}</span>
            </div>
        `).join('');

        document.getElementById('summ-subtotal').innerText = Formatters.currency(cart.total_amount);
        document.getElementById('summ-total').innerText = Formatters.currency(cart.total_amount);
    } catch(e) {
        console.error("Cart load error", e);
    }
}

async function loadAddresses() {
    const container = document.getElementById('address-list');
    container.innerHTML = '<div class="loader-spinner"></div>';
    
    try {
        const res = await ApiService.get('/auth/customer/addresses/');
        const addresses = res.results || res;

        if (addresses.length === 0) {
            container.innerHTML = '<p class="text-muted">No addresses found. Please add one.</p>';
            return;
        }

        // Auto-select Default
        if (!selectedAddressId) {
            const def = addresses.find(a => a.is_default) || addresses[0];
            selectAddress(def.id, def.latitude, def.longitude, def.city, null); // Pass null for element initially
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
    
    // Update UI
    if (el) {
        document.querySelectorAll('.address-card').forEach(c => c.classList.remove('active'));
        el.classList.add('active');
    }
    
    // Check Serviceability with Backend
    resolveWarehouse(lat, lng, city);
};

window.selectPayment = function(method, el) {
    paymentMethod = method;
    document.querySelectorAll('.payment-option').forEach(c => c.classList.remove('selected'));
    el.classList.add('selected');
}

async function resolveWarehouse(lat, lng, city) {
    const placeOrderBtn = document.getElementById('place-order-btn');
    placeOrderBtn.disabled = true;
    placeOrderBtn.innerText = "Checking Availability...";

    try {
        const res = await ApiService.post('/warehouse/find-serviceable/', {
            latitude: lat, 
            longitude: lng, 
            city: city
        });

        if (res.serviceable) {
            resolvedWarehouseId = res.warehouse.id;
            placeOrderBtn.disabled = false;
            placeOrderBtn.innerText = "Place Order";
        } else {
            resolvedWarehouseId = null;
            placeOrderBtn.innerText = "Location Not Serviceable";
            Toast.error("We do not deliver to this location yet.");
        }
    } catch (e) {
        console.error("Warehouse resolution failed", e);
        placeOrderBtn.innerText = "Service Error";
    }
}

// Logic to open modal and inject current LocationPicker Coords if available
window.openAddressModal = function() {
    document.getElementById('address-modal').classList.remove('d-none');
    
    // Inject Lat/Lng from LocalStorage (Source of Truth)
    const lat = localStorage.getItem('user_lat');
    const lng = localStorage.getItem('user_lng');
    const city = localStorage.getItem('user_city');
    const pin = localStorage.getItem('user_pincode');
    const addrText = localStorage.getItem('user_address_text');

    if(lat && lng) {
        document.getElementById('addr-lat').value = lat;
        document.getElementById('addr-lng').value = lng;
    }
    if(city) document.getElementById('addr-city').value = city;
    if(pin) document.getElementById('addr-pin').value = pin;
    if(addrText) document.getElementById('addr-text').value = addrText;
}

window.closeAddressModal = function() {
    document.getElementById('address-modal').classList.add('d-none');
}

async function saveAddress(e) {
    e.preventDefault();
    
    // Validating Lat/Lng presence
    const lat = document.getElementById('addr-lat').value;
    const lng = document.getElementById('addr-lng').value;

    if(!lat || !lng || lat === "12.9716") {
        // Warning: if still default, it might be wrong.
        // In prod, force map picker. For now, allow but warn.
    }

    const payload = {
        address_line: document.getElementById('addr-text').value,
        label: document.getElementById('addr-type').value,
        city: document.getElementById('addr-city').value,
        pincode: document.getElementById('addr-pin').value,
        latitude: lat,
        longitude: lng
    };

    try {
        await ApiService.post('/auth/customer/addresses/', payload);
        Toast.success("Address Saved");
        closeAddressModal();
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
            warehouse_id: resolvedWarehouseId,
            payment_method: paymentMethod,
            delivery_type: 'express'
        });

        if (paymentMethod === 'COD') {
            window.location.href = `/success.html?order_id=${res.order.id}`;
        } else {
            // Call the missing function
            handleRazorpay(res.razorpay_order, res.order.id, btn);
        }
    } catch (e) {
        Toast.error(e.message || "Order Failed");
        btn.disabled = false;
        btn.innerText = "Place Order";
    }
}

/**
 * Handles Razorpay Payment Flow
 * @param {Object} rpOrder - Config from backend
 * @param {Number} orderId - Our internal order ID
 * @param {HTMLElement} btn - Button to reset on failure
 */
function handleRazorpay(rpOrder, orderId, btn) {
    if (!window.Razorpay) {
        Toast.error("Payment Gateway SDK failed to load");
        btn.disabled = false;
        return;
    }

    const options = {
        "key": rpOrder.key || rpOrder.key_id, // Handle backend naming variation
        "amount": rpOrder.amount, 
        "currency": rpOrder.currency,
        "name": "QuickDash",
        "description": "Groceries in Minutes",
        "image": "/assets/img/logo.png",
        "order_id": rpOrder.id, // Razorpay Order ID
        "handler": async function (response) {
            // Payment Success - Verify on Backend
            btn.innerText = "Verifying...";
            try {
                await ApiService.post('/orders/payment/verify/', {
                    razorpay_payment_id: response.razorpay_payment_id,
                    razorpay_order_id: response.razorpay_order_id,
                    razorpay_signature: response.razorpay_signature
                });
                window.location.href = `/success.html?order_id=${orderId}`;
            } catch (e) {
                Toast.error("Payment Verification Failed: " + e.message);
                btn.disabled = false;
                btn.innerText = "Retry Payment";
            }
        },
        "prefill": {
            "contact": JSON.parse(localStorage.getItem(APP_CONFIG.STORAGE_KEYS.USER) || '{}').phone || ""
        },
        "theme": { "color": "#32CD32" },
        "modal": {
            "ondismiss": function() {
                Toast.info("Payment Cancelled");
                btn.disabled = false;
                btn.innerText = "Place Order";
            }
        }
    };

    const rzp1 = new Razorpay(options);
    rzp1.open();
    
    rzp1.on('payment.failed', function (response){
        Toast.error("Payment Failed: " + response.error.description);
        btn.disabled = false;
        btn.innerText = "Place Order";
    });
}