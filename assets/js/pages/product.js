let currentProduct = null;
let quantity = 1;

document.addEventListener('DOMContentLoaded', async () => {
    const code = new URLSearchParams(window.location.search).get('code');
    if (!code) {
        window.location.href = '/search_results.html';
        return;
    }

    await loadProduct(code);
    
    document.getElementById('add-btn').addEventListener('click', addToCart);
});


async function loadProduct(skuCode) {
    const loader = document.getElementById('loader');
    const content = document.getElementById('product-content');

    try {
        // [FIX] Inject Warehouse Context for Accurate Pricing
        const whId = localStorage.getItem(APP_CONFIG.STORAGE_KEYS.WAREHOUSE_ID);
        let url = `/catalog/skus/${skuCode}/`;
        if (whId) {
            url += `?warehouse_id=${whId}`;
        }

        // Fetch logic
        currentProduct = await ApiService.get(url);
        
        // Render
        document.getElementById('p-image').src = currentProduct.image_url || 'https://via.placeholder.com/400';
        document.getElementById('p-brand').innerText = currentProduct.brand_name || 'QuickDash';
        document.getElementById('p-name').innerText = currentProduct.name;
        document.getElementById('p-unit').innerText = currentProduct.unit;
        document.getElementById('p-desc').innerText = currentProduct.description || "Fresh and high quality product delivered to your doorstep.";
        
        // Price Rendering (Now reflects Warehouse specific price if available)
        document.getElementById('p-price').innerText = Formatters.currency(currentProduct.sale_price);
        
        if (currentProduct.mrp && currentProduct.mrp > currentProduct.sale_price) {
            document.getElementById('p-mrp').innerText = Formatters.currency(currentProduct.mrp);
            const discount = Math.round(((currentProduct.mrp - currentProduct.sale_price) / currentProduct.mrp) * 100);
            document.getElementById('p-discount').innerText = `${discount}% OFF`;
        }

        // Show
        loader.classList.add('d-none');
        content.classList.remove('d-none');

    } catch (e) {
        loader.innerHTML = '<p class="text-center text-danger">Product not found</p>';
        console.error(e);
    }
}

window.updateQty = function(change) {
    let newQty = quantity + change;
    if (newQty < 1) newQty = 1;
    if (newQty > 10) {
        Toast.info("Max limit is 10 units");
        return;
    }
    quantity = newQty;
    document.getElementById('qty-val').innerText = quantity;
}

async function addToCart() {
    if (!localStorage.getItem(APP_CONFIG.STORAGE_KEYS.TOKEN)) {
        window.location.href = APP_CONFIG.ROUTES.LOGIN;
        return;
    }

    const btn = document.getElementById('add-btn');
    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerText = "Adding...";

    try {
        // [FIX] Use CartService (centralized logic) and pass SKU string
        await CartService.addItem(currentProduct.sku, quantity);
        Toast.success("Added to Cart Successfully");
    } catch (e) {
        Toast.error(e.message || "Failed to add to cart");
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalText;
    }
}