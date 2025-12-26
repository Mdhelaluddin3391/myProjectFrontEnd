// assets/js/pages/home.js

document.addEventListener('DOMContentLoaded', async () => {
    // Load everything in parallel for performance
    Promise.all([
        loadBanners(),
        loadCategories(),
        loadFlashSales(),
        loadBrands(),
        loadFeed()
    ]);
    
    // Start Flash Sale Timer countdown
    startFlashTimer();
});

async function loadBanners() {
    const container = document.getElementById('hero-slider');
    try {
        const res = await ApiService.get('/catalog/banners/');
        const banners = res.results || res;
        const heroBanners = banners.filter(b => b.position === 'HERO');
        
        if (heroBanners.length > 0) {
            container.classList.remove('skeleton');
            container.innerHTML = heroBanners.map(b => `
                <img src="${b.image_url}" class="hero-slide" 
                     onclick="window.location.href='${b.target_url || '#'}'" 
                     alt="${b.title}">
            `).join('');
        } else {
            container.style.display = 'none';
        }
    } catch (e) {
        console.warn("Banner load failed", e);
        container.classList.remove('skeleton');
    }
}

async function loadCategories() {
    const container = document.getElementById('category-grid');
    try {
        // Fetch top 8 categories for grid
        const res = await ApiService.get('/catalog/categories/?page_size=8');
        const cats = res.results || res;

        // Ensure we show parent categories
        const displayCats = cats.filter(c => !c.parent).slice(0, 8);

        container.innerHTML = displayCats.map(c => `
            <div class="cat-card" onclick="window.location.href='/search_results.html?slug=${c.slug}'">
                <div class="cat-img-box">
                    <img src="${c.icon_url || '/assets/img/placeholder_cat.png'}" alt="${c.name}">
                </div>
                <div class="cat-name">${c.name}</div>
            </div>
        `).join('');
    } catch (e) {
        console.error("Category load failed", e);
    }
}

async function loadFlashSales() {
    const section = document.getElementById('flash-sale-section');
    const grid = document.getElementById('flash-sale-grid');
    
    try {
        const res = await ApiService.get('/catalog/flash-sales/');
        const sales = res.results || res;

        if (!sales || sales.length === 0) {
            section.style.display = 'none';
            return;
        }

        section.style.display = 'block';
        grid.innerHTML = sales.map(item => `
            <div class="flash-card">
                <div class="badge-off">${item.discount_percent}% OFF</div>
                <a href="/product.html?code=${item.sku_code || item.sku_id}">
                    <img src="${item.sku_image}" style="width:100%; height:100px; object-fit:contain; margin-bottom:5px;">
                    <div style="font-size:0.85rem; font-weight:600; height:36px; overflow:hidden; line-height:1.2;">
                        ${item.sku_name}
                    </div>
                </a>
                <div class="f-price-box">
                    <span>${Formatters.currency(item.discounted_price)}</span>
                    <span class="f-mrp">${Formatters.currency(item.original_price)}</span>
                </div>
                <button onclick="addToCart('${item.sku_id}', this)" class="btn btn-sm btn-primary w-100 mt-2" style="padding: 5px;">
                    ADD
                </button>
            </div>
        `).join('');

    } catch (e) {
        section.style.display = 'none';
    }
}

async function loadBrands() {
    const container = document.getElementById('brand-scroller');
    try {
        const res = await ApiService.get('/catalog/brands/');
        const brands = res.results || res;

        if(!brands.length) {
            document.querySelector('.brands-section').style.display = 'none';
            return;
        }

        container.innerHTML = brands.map(b => `
            <div class="brand-circle" onclick="window.location.href='/search_results.html?q=${encodeURIComponent(b.name)}'">
                <img src="${b.logo_url}" alt="${b.name}">
            </div>
        `).join('');
    } catch (e) {
        console.warn("Brands load failed", e);
    }
}

async function loadFeed() {
    const container = document.getElementById('feed-container');
    try {
        // QuickDash uses 'shelves' for feed (Horizontal scroll per category)
        const res = await ApiService.get('/catalog/api/home/feed/');
        const sections = res.sections || [];

        container.innerHTML = sections.map(sec => `
            <section class="feed-section">
                <div class="section-head" style="padding: 0 20px;">
                    <h3>${sec.category_name}</h3>
                    <a href="/search_results.html?slug=${sec.category_slug}">See All</a>
                </div>
                <div class="product-scroll-wrapper">
                    ${sec.products.map(p => createProductCard(p)).join('')}
                </div>
            </section>
        `).join('');

    } catch (e) {
        container.innerHTML = `<p class="text-center text-muted py-5">Start searching to find products!</p>`;
    }
}

function createProductCard(p) {
    // Reusing the HTML structure for standard cards
    return `
        <div class="card product-card" style="padding:10px; border:1px solid #eee; box-shadow:none;">
            <a href="/product.html?code=${p.sku_code || p.id}">
                <img src="${p.image || p.image_url}" style="width:100%; height:120px; object-fit:contain; margin-bottom:8px;">
                <div style="font-size:0.9rem; font-weight:600; height:40px; overflow:hidden; margin-bottom:5px;">
                    ${p.name}
                </div>
                <div class="text-muted small">${p.unit}</div>
            </a>
            <div class="d-flex justify-between align-center mt-2">
                <div style="font-weight:700;">${Formatters.currency(p.price || p.sale_price)}</div>
                <button class="btn btn-sm btn-outline-primary" onclick="addToCart('${p.id}', this)">ADD</button>
            </div>
        </div>
    `;
}

function startFlashTimer() {
    const display = document.getElementById('flash-timer');
    if(!display) return;
    
    // Set deadline to end of day or specific time
    const end = new Date();
    end.setHours(23, 59, 59, 999); 

    setInterval(() => {
        const now = new Date();
        const diff = end - now;
        
        if(diff <= 0) {
            display.innerText = "00:00:00";
            return;
        }

        const h = Math.floor((diff / (1000 * 60 * 60)) % 24);
        const m = Math.floor((diff / (1000 * 60)) % 60);
        const s = Math.floor((diff / 1000) % 60);

        display.innerText = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }, 1000);
}

// Global Add to Cart Wrapper
window.addToCart = async function(skuId, btn) {
    if (!localStorage.getItem(APP_CONFIG.STORAGE_KEYS.TOKEN)) {
        Toast.warning("Login to shop");
        setTimeout(() => window.location.href = APP_CONFIG.ROUTES.LOGIN, 1000);
        return;
    }

    const originalText = btn.innerText;
    btn.innerText = "..";
    btn.disabled = true;

    try {
        await CartService.addItem(skuId, 1);
        Toast.success("Added");
        btn.innerText = "✔";
        btn.classList.add('btn-primary');
        btn.classList.remove('btn-outline-primary');
        
        // Reset button after 2 seconds
        setTimeout(() => {
            btn.disabled = false;
            btn.innerText = "ADD";
            btn.classList.remove('btn-primary');
            btn.classList.add('btn-outline-primary');
        }, 2000);
    } catch (e) {
        Toast.error("Failed");
        btn.innerText = originalText;
        btn.disabled = false;
    }
};