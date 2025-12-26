let selectedAddressId = null;
let paymentMethod = 'COD';

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
            container.innerHTML = '<p class="text-muted">No addresses found. Please add one.</p>';
            return;
        }

        // Default select first
        if (!selectedAddressId) selectedAddressId = addresses[0].id;

        container.innerHTML = addresses.map(addr => `
            <div class="address-card ${selectedAddressId === addr.id ? 'active' : ''}" 
                 onclick="selectAddress('${addr.id}', this)">
                <div class="d-flex justify-between">
                    <strong>${addr.address_type}</strong>
                    ${addr.is_default ? '<span class="text-success small">Default</span>' : ''}
                </div>
                <p class="text-muted small mt-1">
                    ${addr.full_address}<br>
                    ${addr.city} - ${addr.pincode}
                </p>
            </div>
        `).join('');

    } catch (e) {
        container.innerHTML = '<p class="text-danger">Failed to load addresses</p>';
    }
}

async function loadSummary() {
    try {
        const cart = await ApiService.get('/orders/cart/');

        if (!cart.items || cart.items.length === 0) {
            window.location.href = '/cart.html';
            return;
        }

        // Mini cart items render karna
        document.getElementById('mini-cart-list').innerHTML = cart.items.map(i => `
            <div class="d-flex justify-between mb-2 small">
                <span>${i.quantity} x ${i.sku_name}</span>
                <span>${Formatters.currency(i.total_price)}</span>
            </div>
        `).join('');

        // Backend se surge multiplier lane ke liye (Optional check if available)
        // Abhi hum base total dikha rahe hain
        let subtotal = parseFloat(cart.total_amount);
        let surgeMultiplier = 1.0; 
        
        // Agar backend Order creation se pehle surge batata hai toh yahan calculate hoga
        // Maan lete hain backend se multiplier mil raha hai
        let finalTotal = subtotal * surgeMultiplier;
        let surgeFee = finalTotal - subtotal;

        document.getElementById('summ-subtotal').innerText = Formatters.currency(subtotal);
        
        // Surge Fee section agar fee > 0 hai
        const totalContainer = document.getElementById('summ-total').parentElement;
        if (surgeFee > 0) {
            const surgeRow = document.createElement('div');
            surgeRow.className = 'summary-row text-danger small';
            surgeRow.innerHTML = `<span>High Demand Surge (x${surgeMultiplier})</span><span>${Formatters.currency(surgeFee)}</span>`;
            totalContainer.parentNode.insertBefore(surgeRow, totalContainer);
        }

        document.getElementById('summ-total').innerText = Formatters.currency(finalTotal);

    } catch (e) {
        console.error("Summary loading failed:", e);
    }
}

window.selectAddress = function (id, el) {
    selectedAddressId = id;
    document.querySelectorAll('.address-card').forEach(c => c.classList.remove('active'));
    el.classList.add('active');
}

window.selectPayment = function (method, el) {
    paymentMethod = method;
    document.querySelectorAll('.payment-option').forEach(c => c.classList.remove('selected'));
    el.classList.add('selected');
}

async function placeOrder() {
    if (!selectedAddressId) return Toast.warning("Please select a delivery address");

    const btn = document.getElementById('place-order-btn');
    const originalText = btn.innerText;
    btn.disabled = true;
    btn.innerText = "Processing...";

    try {
        // 1. Create Order
        const res = await ApiService.post('/orders/create/', {
            delivery_address_id: selectedAddressId,
            payment_method: paymentMethod
        });

        const orderId = res.order.id;

        if (paymentMethod === 'COD') {
            window.location.href = `/success.html?order_id=${orderId}`;
        } else if (paymentMethod === 'RAZORPAY') {
            handleRazorpay(res.razorpay_order, orderId, btn, originalText);
        }

    } catch (e) {
        Toast.error(e.message || "Order Failed");
        btn.disabled = false;
        btn.innerText = originalText;
    }
}

function handleRazorpay(rzpOrder, orderId, btn, originalText) {
    const user = JSON.parse(localStorage.getItem(APP_CONFIG.STORAGE_KEYS.USER) || '{}');

    const options = {
        // UPDATE: Use your actual Razorpay Key ID here
        "key": rzpOrder.key_id,

        "amount": rzpOrder.amount,
        "currency": "INR",
        "name": "QuickDash",
        "description": "Grocery Order",
        "order_id": rzpOrder.id,
        "handler": async function (response) {
            try {
                btn.innerText = "Verifying...";
                await ApiService.post('/orders/payment/verify/', {
                    razorpay_payment_id: response.razorpay_payment_id,
                    razorpay_order_id: response.razorpay_order_id,
                    razorpay_signature: response.razorpay_signature
                });
                window.location.href = `/success.html?order_id=${orderId}`;
            } catch (e) {
                Toast.error("Payment Verification Failed");
                btn.disabled = false;
                btn.innerText = originalText;
            }
        },
        "prefill": {
            "name": user.first_name || "Customer",
            "contact": user.phone || ""
        },
        "theme": { "color": "#32CD32" }
    };

    const rzp = new Razorpay(options);
    rzp.on('payment.failed', function (response) {
        Toast.error("Payment Failed: " + response.error.description);
        btn.disabled = false;
        btn.innerText = originalText;
    });
    rzp.open();
}

// Modal Logic
window.openAddressModal = () => document.getElementById('address-modal').classList.remove('d-none');
window.closeAddressModal = () => document.getElementById('address-modal').classList.add('d-none');

async function saveAddress(e) {
    e.preventDefault();
    const payload = {
        address_line: document.getElementById('a-text').value, // was full_address
        label: document.querySelector('input[name="atype"]:checked').value, // was address_type
        city: document.getElementById('a-city').value,
        pincode: document.getElementById('a-pin').value,
        latitude: document.getElementById('a-lat').value, // was lat
        longitude: document.getElementById('a-lng').value // was lng
    };

    try {
        await ApiService.post('/auth/customer/addresses/', payload);
        Toast.success("Address Saved");
        closeAddressModal();
        await loadAddresses(); // Refresh list
    } catch (err) {
        Toast.error(err.message);
    }
}