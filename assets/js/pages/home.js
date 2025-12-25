document.addEventListener('DOMContentLoaded', async () => {
    // Parallel Fetching for Performance
    Promise.all([loadBanners(), loadCategories(), loadFeed()]);
});

async function loadBanners() {
    const container = document.getElementById('hero-slider');
    try {
        const res = await ApiService.get('/catalog/banners/');
        const banners = res.results || res;

        // Filter for HERO position
        const heroBanners = banners.filter(b => b.position === 'HERO');
        
        if (heroBanners.length > 0) {
            container.classList.remove('skeleton');
            // Simplified: Just showing first banner for now, slider logic can be added
            const b = heroBanners[0];
            container.innerHTML = `
                <a href="${b.target_url || '#'}">
                    <img src="${b.image_url}" class="hero-slide" alt="${b.title}">
                </a>
            `;
        } else {
            container.style.display = 'none';
        }
    } catch (e) {
        container.innerHTML = '<p class="text-center text-muted p-4">Failed to load offers</p>';
    }
}

async function loadCategories() {
    const container = document.getElementById('category-grid');
    try {
        const res = await ApiService.get('/catalog/categories/?page_size=10');
        const cats = res.results || res;

        container.innerHTML = cats.map(c => `
            <div class="cat-card" onclick="window.location.href='/search_results.html?slug=${c.slug}'">
                <div class="cat-img-box">
                    <img src="${c.icon_url || 'https://via.placeholder.com/50'}" alt="${c.name}">
                </div>
                <div class="cat-name">${c.name}</div>
            </div>
        `).join('');
    } catch (e) {
        console.error(e);
    }
}

async function loadFeed() {
    const container = document.getElementById('feed-container');
    try {
        // Assuming there is a home feed endpoint, or we fetch generic products
        // Using the logic found in old code: /catalog/api/home/feed/
        const res = await ApiService.get('/catalog/api/home/feed/');
        const sections = res.sections || [];

        container.innerHTML = sections.map(sec => `
            <div class="mb-4">
                <div class="section-head">
                    <h3>${sec.category_name}</h3>
                </div>
                <div class="product-grid">
                    ${sec.products.map(p => createProductCard(p)).join('')}
                </div>
            </div>
        `).join('');

    } catch (e) {
        // Fallback if feed API fails, load generic products
        loadGenericProducts(container);
    }
}

function createProductCard(p) {
    return `
        <div class="product-card">
            <a href="/product.html?code=${p.sku_code || p.id}" style="display:block">
                <img src="${p.image || p.image_url || 'https://via.placeholder.com/150'}" class="p-img">
                <div class="p-title">${p.name}</div>
                <div class="text-muted small">${p.unit}</div>
            </a>
            <div class="p-meta">
                <div class="p-price">${Formatters.currency(p.price || p.sale_price)}</div>
                <button class="btn-add" onclick="addToCart('${p.id}', this)">ADD</button>
            </div>
        </div>
    `;
}

async function loadGenericProducts(container) {
    try {
        const res = await ApiService.get('/catalog/skus/?page_size=8');
        const products = res.results || res;
        
        container.innerHTML = `
            <div class="section-head"><h3>Top Picks</h3></div>
            <div class="product-grid">
                ${products.map(p => createProductCard(p)).join('')}
            </div>
        `;
    } catch(e) {}
}

// Add to Cart Logic
window.addToCart = async function(skuId, btn) {
    // Check Auth
    if (!localStorage.getItem(APP_CONFIG.STORAGE_KEYS.TOKEN)) {
        Toast.warning("Please login to add items");
        setTimeout(() => window.location.href = APP_CONFIG.ROUTES.LOGIN, 1000);
        return;
    }

    const originalText = btn.innerText;
    btn.innerText = "..";
    btn.disabled = true;

    try {
        await ApiService.post('/orders/cart/add/', { sku_id: skuId, quantity: 1 });
        Toast.success("Added to cart");
        btn.innerText = "✔";
        btn.style.background = "var(--primary)";
        btn.style.color = "#fff";
        
        // Update global cart badge
        // (Assuming main-layout.js exposes or re-runs updateCartCount)
        if(window.updateGlobalCartCount) window.updateGlobalCartCount(); // Legacy hook support or reload
        else location.reload(); // Simple fallback
        
    } catch (e) {
        Toast.error(e.message || "Failed to add");
        btn.innerText = originalText;
    } finally {
        setTimeout(() => {
            btn.disabled = false;
            btn.innerText = "ADD";
            btn.style.background = "";
            btn.style.color = "";
        }, 2000);
    }
}