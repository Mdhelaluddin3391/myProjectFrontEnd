class CartService {
    static async getCart() {
        return await ApiService.get('/orders/cart/');
    }

    static async addItem(skuCode, quantity = 1) {
        // [FIX] Retrieve Warehouse ID from storage to ensure backend context
        const whId = localStorage.getItem(APP_CONFIG.STORAGE_KEYS.WAREHOUSE_ID);
        
        if (!whId) {
            Toast.error("Please select a location first.");
            throw new Error("Location not selected");
        }

        try {
            // [FIX] Send 'sku' string and 'warehouse_id' instead of 'sku_id'
            const res = await ApiService.post('/orders/cart/add/', { 
                sku: skuCode, 
                quantity: quantity,
                warehouse_id: whId
            });
            this.updateGlobalCount(); // Sync Navbar
            return res;
        } catch (e) {
            throw e;
        }
    }

    static async updateItem(skuCode, quantity) {
        // Re-using add endpoint as per backend logic (add/update are unified)
        return await this.addItem(skuCode, quantity);
    }

    static async removeItem(skuCode) {
        // Sending 0 removes item
        return await this.addItem(skuCode, 0); 
    }

    static async updateGlobalCount() {
        const badge = document.getElementById('cart-badge');
        
        // Agar user login nahi hai
        if (!localStorage.getItem(APP_CONFIG.STORAGE_KEYS.TOKEN)) {
            if(badge) badge.style.display = 'none';
            return;
        }

        try {
            const cart = await this.getCart();
            const count = cart.items ? cart.items.length : 0;
            
            if(badge) {
                badge.innerText = count;
                badge.style.display = count > 0 ? 'flex' : 'none';
            }

            // NEW: Dispatch event to notify entire app
            window.dispatchEvent(new CustomEvent('cart-updated', { detail: { count: count } }));

        } catch (e) {
            console.warn("Failed to sync cart count");
        }
    }
}

// Expose globally
window.CartService = CartService;