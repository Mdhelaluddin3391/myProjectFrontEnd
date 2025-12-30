// assets/js/pages/checkout.js

let selectedAddressId = null;
let paymentMethod = 'COD';
let resolvedWarehouseId = null;

document.addEventListener('DOMContentLoaded', async () => {
    if (!localStorage.getItem(APP_CONFIG.STORAGE_KEYS.TOKEN)) {
        window.location.href = APP_CONFIG.ROUTES.LOGIN;
        return;
    }
    
    if (window.AppConfigService && !window.AppConfigService.isLoaded) {
        await window.AppConfigService.load();
    }

    await Promise.all([loadAddresses(), loadSummary()]);
    document.getElementById('place-order-btn').addEventListener('click', placeOrder);
    
    // Check if we already have a context to resolve warehouse immediately
    const deliveryCtx = JSON.parse(localStorage.getItem(APP_CONFIG.STORAGE_KEYS.DELIVERY_CONTEXT) || 'null');
    if (deliveryCtx) {
        resolveWarehouse(deliveryCtx.lat, deliveryCtx.lng, deliveryCtx.city);
    }
});

async function loadSummary() {
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
    } catch(e) { console.error("Cart error", e); }
}

async function loadAddresses() {
    const container = document.getElementById('address-list');
    container.innerHTML = '<div class="loader-spinner"></div>';
    
    try {
        const res = await ApiService.get('/auth/customer/addresses/');
        const addresses = res.results || res;

        if (addresses.length === 0) {
            container.innerHTML = '<p class="text-muted">No addresses found. Add one.</p>';
            return;
        }

        container.innerHTML = addresses.map(addr => `
            <div class="address-card ${addr.is_default ? 'active' : ''}" 
                 data-id="${addr.id}"
                 data-lat="${addr.latitude}"
                 data-lng="${addr.longitude}"
                 data-city="${addr.city}"
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

        // Auto-select logic
        const def = addresses.find(a => a.is_default) || addresses[0];
        
        // If a specific delivery context exists in storage, prioritize highlighting that
        const storedCtx = JSON.parse(localStorage.getItem(APP_CONFIG.STORAGE_KEYS.DELIVERY_CONTEXT) || 'null');
        
        let initialSelect = def;
        if(storedCtx) {
            const match = addresses.find(a => a.id == storedCtx.id);
            if(match) initialSelect = match;
        }

        if (initialSelect) {
            selectedAddressId = initialSelect.id;
            // Visual Update
            const defEl = container.querySelector(`.address-card[data-id="${initialSelect.id}"]`);
            if (defEl) {
                document.querySelectorAll('.address-card').forEach(c => c.classList.remove('active'));
                defEl.classList.add('active');
                
                // We call selectAddress logic internally to sync contexts
                // Passing 'null' as element to avoid re-toggling class
                updateContextAndResolve(initialSelect.id, initialSelect.latitude, initialSelect.longitude, initialSelect.city, defEl);
            }
        }

    } catch (e) {
        container.innerHTML = '<p class="text-danger">Failed to load addresses</p>';
    }
}

// Wrapper to handle click event
window.selectAddress = function(id, lat, lng, city, el) {
    // Visual Update
    document.querySelectorAll('.address-card').forEach(c => c.classList.remove('active'));
    if (el) el.classList.add('active');
    
    updateContextAndResolve(id, lat, lng, city, el);
};

// Core Logic separated for reusability
function updateContextAndResolve(id, lat, lng, city, el) {
    selectedAddressId = id;

    // --- UX UPGRADE: Update Navbar Context ---
    
    // Extract readable data
    let label = 'Delivery';
    let fullText = 'Selected Address';
    
    if (el) {
        label = el.querySelector('strong').innerText;
        fullText = el.querySelector('p').innerText.split('\n')[0]; // First line of address
    }
    
    // 1. Set Delivery Context (Layer 1 - Priority)
    // This tells Navbar to show "Home • Indiranagar"
    const deliveryCtx = {
        id: id,
        lat: lat,
        lng: lng,
        city: city,
        label: label,
        area_name: fullText.split(',')[0], // Approximation
        full_address: fullText
    };
    localStorage.setItem(APP_CONFIG.STORAGE_KEYS.DELIVERY_CONTEXT, JSON.stringify(deliveryCtx));

    // 2. Set Service Context (Layer 2 - Sync)
    // This tells Catalog/Surge Pricing to use this location
    const serviceCtx = {
        lat: lat,
        lng: lng,
        city: city,
        area_name: fullText.split(',')[0],
        formatted_address: fullText
    };
    localStorage.setItem(APP_CONFIG.STORAGE_KEYS.SERVICE_CONTEXT, JSON.stringify(serviceCtx));

    // 3. Update UI globally
    window.dispatchEvent(new Event(APP_CONFIG.EVENTS.LOCATION_CHANGED));

    // 4. Check Backend Serviceability
    resolveWarehouse(lat, lng, city);
}

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
            city: city || 'Bengaluru'
        });

        if (res.serviceable && res.warehouse && res.warehouse.id) {
            resolvedWarehouseId = res.warehouse.id; 
            // Store WH ID for Cart operations
            localStorage.setItem(APP_CONFIG.STORAGE_KEYS.WAREHOUSE_ID, resolvedWarehouseId);
            
            placeOrderBtn.disabled = false;
            placeOrderBtn.innerText = "Place Order";
        } else {
            resolvedWarehouseId = null;
            placeOrderBtn.innerText = "Location Not Serviceable";
            Toast.error("Sorry, we do not deliver to this location yet.");
        }
    } catch (e) {
        resolvedWarehouseId = null;
        placeOrderBtn.innerText = "Service Error";
        console.error("Warehouse check error", e);
    }
}

async function placeOrder() {
    if (!selectedAddressId) {
        return Toast.warning("Please select a delivery address");
    }

    if (!resolvedWarehouseId) {
        return Toast.error("Service check failed. Please select a serviceable address.");
    }

    const btn = document.getElementById('place-order-btn');
    const originalText = btn.innerText;
    btn.disabled = true;
    btn.innerText = "Processing...";

    try {
        if (paymentMethod === 'RAZORPAY') {
            if (typeof Razorpay === 'undefined') {
                btn.innerText = "Loading Secure Payment...";
                await loadRazorpayScript();
            }
        }

        const orderRes = await ApiService.post('/orders/create/', {
            delivery_address_id: selectedAddressId,
            warehouse_id: resolvedWarehouseId,
            payment_method: paymentMethod,
            delivery_type: 'express'
        });

        if (paymentMethod === 'COD') {
            // Clear checkout contexts on success
            localStorage.removeItem(APP_CONFIG.STORAGE_KEYS.DELIVERY_CONTEXT);
            window.location.href = `/success.html?order_id=${orderRes.order.id}`;
        } else if (paymentMethod === 'RAZORPAY') {
            if (orderRes.razorpay_order) {
                handleRazorpay(orderRes.razorpay_order, orderRes.order.id, btn);
            } else {
                throw new Error("Payment initialization failed");
            }
        }
    } catch (e) {
        let msg = e.message || "Order Failed";
        if (msg.includes("razorpay")) msg = "Payment Gateway unavailable. Please disable AdBlocker.";
        if (msg.toLowerCase().includes("stock")) msg = "⚠️ Some items are out of stock.";
        
        Toast.error(msg);
        btn.disabled = false;
        btn.innerText = originalText;
    }
}

function loadRazorpayScript() {
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
        script.onload = resolve;
        script.onerror = () => reject(new Error("Failed to load Razorpay SDK"));
        document.body.appendChild(script);
    });
}

function handleRazorpay(rpOrder, orderId, btn) {
    if (!window.Razorpay) {
        Toast.error("Payment SDK not loaded");
        btn.disabled = false;
        btn.innerText = "Place Order";
        return;
    }

    const key = rpOrder.key || rpOrder.key_id;
    if (!key) {
        Toast.error("Payment Configuration Error");
        btn.disabled = false;
        btn.innerText = "Place Order";
        return;
    }

    const options = {
        "key": key, 
        "amount": rpOrder.amount, 
        "currency": rpOrder.currency,
        "name": "QuickDash",
        "description": "Order #" + orderId,
        "order_id": rpOrder.id,
        "handler": async function (response) {
            btn.innerText = "Verifying...";
            try {
                await ApiService.post('/payments/verify/razorpay/', {
                    razorpay_payment_id: response.razorpay_payment_id,
                    razorpay_order_id: response.razorpay_order_id,
                    razorpay_signature: response.razorpay_signature
                });
                // Clear checkout contexts on success
                localStorage.removeItem(APP_CONFIG.STORAGE_KEYS.DELIVERY_CONTEXT);
                window.location.href = `/success.html?order_id=${orderId}`;
            } catch (e) {
                console.error("Verification Error", e);
                alert("Payment successful but verification timed out.\n\nPlease do NOT pay again. Check 'My Orders' in a few minutes.");
                window.location.href = '/orders.html';
            }
        },
        "prefill": {
            "contact": JSON.parse(localStorage.getItem(APP_CONFIG.STORAGE_KEYS.USER) || '{}').phone || ""
        },
        "theme": { "color": "#32CD32" },
        "modal": {
            "ondismiss": function() {
                btn.disabled = false;
                btn.innerText = "Place Order";
            }
        }
    };

    try {
        const rzp1 = new Razorpay(options);
        rzp1.open();
        rzp1.on('payment.failed', function (response){
            Toast.error("Payment Failed: " + response.error.description);
            btn.disabled = false;
            btn.innerText = "Place Order";
        });
    } catch (e) {
        console.error("Razorpay Launch Error", e);
        Toast.error("Could not launch payment gateway.");
        btn.disabled = false;
        btn.innerText = "Place Order";
    }
}