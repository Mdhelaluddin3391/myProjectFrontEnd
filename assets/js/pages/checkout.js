// assets/js/pages/checkout.js

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
    
    // Auto-resolve warehouse if location exists
    const lat = localStorage.getItem('user_lat');
    const lng = localStorage.getItem('user_lng');
    if(lat && lng) resolveWarehouse(lat, lng);
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

        if (!selectedAddressId) {
            const def = addresses.find(a => a.is_default) || addresses[0];
            selectAddress(def.id, def.latitude, def.longitude, def.city, null);
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
    if (el) {
        document.querySelectorAll('.address-card').forEach(c => c.classList.remove('active'));
        el.classList.add('active');
    }
    resolveWarehouse(lat, lng);
};

window.selectPayment = function(method, el) {
    paymentMethod = method;
    document.querySelectorAll('.payment-option').forEach(c => c.classList.remove('selected'));
    el.classList.add('selected');
}

async function resolveWarehouse(lat, lng) {
    const placeOrderBtn = document.getElementById('place-order-btn');
    placeOrderBtn.disabled = true;
    placeOrderBtn.innerText = "Checking Availability...";

    try {
        // Correct endpoint
        const res = await ApiService.post('/locations/check-service/', {
            customer_lat: lat, 
            customer_lon: lng
        });

        if (res.serviceable) {
            resolvedWarehouseId = res.warehouse_id || 1; 
            placeOrderBtn.disabled = false;
            placeOrderBtn.innerText = "Place Order";
        } else {
            resolvedWarehouseId = null;
            placeOrderBtn.innerText = "Location Not Serviceable";
            Toast.error("We do not deliver here yet.");
        }
    } catch (e) {
        placeOrderBtn.innerText = "Service Error";
    }
}

async function placeOrder() {
    if (!selectedAddressId || !resolvedWarehouseId) return Toast.warning("Please select a serviceable address");

    const btn = document.getElementById('place-order-btn');
    btn.disabled = true;
    btn.innerText = "Processing...";

    try {
        // 1. Create Order
        const orderRes = await ApiService.post('/orders/create/', {
            delivery_address_id: selectedAddressId,
            warehouse_id: resolvedWarehouseId,
            payment_method: paymentMethod,
            delivery_type: 'express'
        });

        if (paymentMethod === 'COD') {
            window.location.href = `/success.html?order_id=${orderRes.id}`;
        } else if (paymentMethod === 'RAZORPAY') {
            // 2. Initiate Payment
            await initiateOnlinePayment(orderRes.id, btn);
        }
    } catch (e) {
        Toast.error(e.message || "Order Failed");
        btn.disabled = false;
        btn.innerText = "Place Order";
    }
}

async function initiateOnlinePayment(orderId, btn) {
    try {
        // 3. Get Payment Config
        const rpOrder = await ApiService.post(`/payments/create/${orderId}/`);
        handleRazorpay(rpOrder, orderId, btn);
    } catch (e) {
        Toast.error("Payment Init Failed: " + e.message);
        btn.disabled = false;
        btn.innerText = "Retry Payment";
    }
}

function handleRazorpay(rpOrder, orderId, btn) {
    if (!window.Razorpay) {
        Toast.error("Payment SDK not loaded");
        btn.disabled = false;
        return;
    }

    const options = {
        "key": rpOrder.key,
        "amount": rpOrder.amount, 
        "currency": rpOrder.currency,
        "name": "QuickDash",
        "description": "Groceries Payment",
        "order_id": rpOrder.id,
        "handler": async function (response) {
            btn.innerText = "Verifying...";
            try {
                // 4. Verify Payment
                await ApiService.post('/payments/verify/razorpay/', {
                    razorpay_payment_id: response.razorpay_payment_id,
                    razorpay_order_id: response.razorpay_order_id,
                    razorpay_signature: response.razorpay_signature
                });
                window.location.href = `/success.html?order_id=${orderId}`;
            } catch (e) {
                Toast.error("Payment Verification Failed");
                btn.disabled = false;
                btn.innerText = "Retry";
            }
        },
        "prefill": {
            "contact": JSON.parse(localStorage.getItem(APP_CONFIG.STORAGE_KEYS.USER) || '{}').phone || ""
        },
        "theme": { "color": "#32CD32" }
    };

    const rzp1 = new Razorpay(options);
    rzp1.open();
    
    rzp1.on('payment.failed', function (response){
        Toast.error("Payment Failed: " + response.error.description);
        btn.disabled = false;
        btn.innerText = "Pay Now";
    });
}