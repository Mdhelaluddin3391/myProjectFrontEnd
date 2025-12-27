class CartService {
    static async getCart() {
        return await ApiService.get('/orders/cart/');
    }

    static async addItem(skuCode, quantity = 1, forceClear = false) {
        const whId = localStorage.getItem(APP_CONFIG.STORAGE_KEYS.WAREHOUSE_ID);
        
        if (!whId) {
            Toast.error("Please select a delivery location first.");
            // Open location picker if available
            if(window.LocationPicker) window.LocationPicker.open();
            throw new Error("Location not selected");
        }

        try {
            const res = await ApiService.post('/orders/cart/add/', { 
                sku: skuCode, 
                quantity: quantity,
                warehouse_id: whId,
                force_clear: forceClear
            });
            
            // Notify app
            this.updateGlobalCount(); 
            return res;

        } catch (e) {
            // [FIX] Robust Error Parsing for nested API responses
            let errData = {};
            try { 
                // ApiService often throws Error(JSON.stringify(data))
                errData = JSON.parse(e.message); 
            } catch(parseErr) { 
                errData = { message: e.message }; 
            }

            // Handle Warehouse Conflict (HTTP 409 from Backend)
            if (errData.code === 'warehouse_conflict' || (errData.message && errData.message.includes('different store'))) {
                
                const confirmMsg = errData.message || "Your cart contains items from a different store. Clear cart to proceed?";
                
                if (confirm(confirmMsg)) {
                    // Recursive retry with force_clear=true
                    console.log("Clearing cart and retrying...");
                    return this.addItem(skuCode, quantity, true); 
                } else {
                    // User cancelled
                    throw new Error("Cancelled by user");
                }
            }
            
            // Re-throw other errors
            throw e;
        }
    }

    static async updateItem(skuCode, quantity) {
        return await this.addItem(skuCode, quantity);
    }

    static async removeItem(skuCode) {
        return await this.addItem(skuCode, 0); 
    }

    static async updateGlobalCount() {
        const badge = document.getElementById('cart-badge');
        
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

            window.dispatchEvent(new CustomEvent('cart-updated', { detail: { count: count } }));

        } catch (e) {
            // Silent fail for background sync
            console.warn("Failed to sync cart count");
        }
    }
}

window.CartService = CartService;