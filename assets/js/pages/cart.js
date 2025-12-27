document.addEventListener('DOMContentLoaded', async () => {
    // Auth Check
    if (!localStorage.getItem(APP_CONFIG.STORAGE_KEYS.TOKEN)) {
        window.location.href = APP_CONFIG.ROUTES.LOGIN;
        return;
    }
    
    await loadCart();
});

async function loadCart() {
    const loader = document.getElementById('loader');
    const empty = document.getElementById('empty-cart');
    const content = document.getElementById('cart-content');
    const list = document.getElementById('cart-items');

    try {
        const cart = await CartService.getCart();
        
        loader.classList.add('d-none');

        if (!cart.items || cart.items.length === 0) {
            empty.classList.remove('d-none');
            return;
        }

        content.classList.remove('d-none');
        document.getElementById('item-count').innerText = `${cart.items.length} Items`;
        
        // Render Items
        // [FIX] Use item.sku (String) for changeQty calls
        list.innerHTML = cart.items.map(item => `
            <div class="card cart-item">
                <img src="${item.sku_image || 'https://via.placeholder.com/80'}" class="item-img">
                <div class="item-details">
                    <div class="item-name">${item.sku_name}</div>
                    <div class="item-unit text-muted small">${item.sku_unit || ''}</div>
                    <div class="item-price">${Formatters.currency(item.total_price)}</div>
                </div>
                <div class="qty-control">
                    <button class="qty-btn-sm" onclick="changeQty('${item.sku}', ${item.quantity - 1})">
                        ${item.quantity === 1 ? '<i class="fas fa-trash"></i>' : '-'}
                    </button>
                    <span>${item.quantity}</span>
                    <button class="qty-btn-sm" onclick="changeQty('${item.sku}', ${item.quantity + 1})">+</button>
                </div>
            </div>
        `).join('');

        // Update Summary
        document.getElementById('subtotal').innerText = Formatters.currency(cart.total_amount);
        document.getElementById('total').innerText = Formatters.currency(cart.total_amount);

    } catch (e) {
        console.error(e);
        loader.innerHTML = '<p class="text-danger text-center">Failed to load cart</p>';
    }
}

window.changeQty = async function(skuCode, newQty) {
    try {
        if (newQty <= 0) {
            if(!confirm("Remove item from cart?")) return;
        }
        
        // Show loading state implicitly by maybe blurring content, 
        // but for now we just wait for reload
        await CartService.updateItem(skuCode, newQty);
        await loadCart(); // Refresh UI
        
    } catch (e) {
        Toast.error("Failed to update cart");
    }
};