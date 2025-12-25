class CartService {
    static async getCart() {
        return await ApiService.get('/orders/cart/');
    }

    static async addItem(skuId, quantity = 1) {
        try {
            const res = await ApiService.post('/orders/cart/add/', { 
                sku_id: skuId, 
                quantity: quantity 
            });
            this.updateGlobalCount(); // Sync Navbar
            return res;
        } catch (e) {
            throw e;
        }
    }

    static async updateItem(skuId, quantity) {
        // Re-using add endpoint as per backend logic (often add/update are same or similar)
        return await this.addItem(skuId, quantity);
    }

    static async removeItem(skuId) {
        // Sending 0 usually removes item
        return await this.addItem(skuId, 0); 
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