// assets/js/pages/home.js
let feedPage = 1;
let feedLoading = false;
let feedHasNext = true;



document.addEventListener('DOMContentLoaded', async () => {
    // Parallel load for independent components
    Promise.all([
        loadBanners(),
        loadBrands(),
        loadFlashSales()
    ]);
    
    // Smart Feed Loading based on Location
    const lat = localStorage.getItem('user_lat');
    const lng = localStorage.getItem('user_lng');
    const city = localStorage.getItem('user_city');

    if (lat && lng && city) {
        await loadStorefront(lat, lng, city);
    } else {
        // --- CHANGED THIS PART ---
        await loadCategories(); 
        setupInfiniteScroll(); // Start the progressive loader
    }
    
    startFlashTimer();
});

// 1. Optimized Storefront (Location Aware)
// 1. Optimized Storefront (Location Aware)
async function loadStorefront(lat, lng, city) {
    const feedContainer = document.getElementById('feed-container');
    const catContainer = document.getElementById('category-grid');
    
    feedContainer.innerHTML = '<div class="loader-spinner"></div>';

    try {
        const res = await ApiService.get(`/catalog/storefront/?lat=${lat}&lon=${lng}&city=${city}`);
        
        if (!res.serviceable) {
            feedContainer.innerHTML = `
                <div class="text-center py-5">
                    <p class="text-muted">We aren't in your area yet!</p>
                    <button onclick="LocationPicker.open()" class="btn btn-sm btn-primary">Change Location</button>
                </div>`;
            return;
        }

        // Render Categories from Storefront Data
        if (res.categories && res.categories.length > 0) {
            // FIX: Using c.slug instead of c.name.toLowerCase()
            catContainer.innerHTML = res.categories.slice(0, 8).map(c => `
                <div class="cat-card" onclick="window.location.href='/search_results.html?slug=${c.slug}'">
                    <div class="cat-img-box">
                        <img src="${c.icon || 'https://cdn-icons-png.flaticon.com/512/3703/3703377.png'}" alt="${c.name}">
                    </div>
                    <div class="cat-name">${c.name}</div>
                </div>
            `).join('');

            // Render Feed
            feedContainer.innerHTML = res.categories.map(cat => `
                <section class="feed-section">
                    <div class="section-head" style="padding: 0 20px;">
                        <h3>${cat.name}</h3>
                        <a href="/search_results.html?slug=${cat.slug}">See All</a>
                    </div>
                    <div class="product-scroll-wrapper">
                        ${cat.products.map(p => createProductCard(p)).join('')}
                    </div>
                </section>
            `).join('');
        } else {
            feedContainer.innerHTML = '<p class="text-center py-5">No products available right now.</p>';
        }

    } catch (e) {
        console.error("Storefront failed, falling back", e);
        loadGenericFeed();
    }
}



function setupInfiniteScroll() {
    // 1. Initial Load (Page 1)
    loadGenericFeed();

    // 2. Create Sentinel (Invisible Trigger at bottom)
    const sentinel = document.createElement('div');
    sentinel.id = 'feed-sentinel';
    sentinel.style.height = "50px";
    sentinel.style.marginBottom = "50px";
    sentinel.innerHTML = '<div class="loader-spinner d-none"></div>'; 
    
    // Insert after the feed container
    document.getElementById('feed-container').after(sentinel);

    // 3. Observer: Detects when user scrolls to bottom
    const observer = new IntersectionObserver((entries) => {
        if(entries[0].isIntersecting && !feedLoading && feedHasNext) {
            feedPage++;
            loadGenericFeed(); // Load next batch
        }
    }, { rootMargin: '200px' }); // Pre-load 200px before hitting bottom

    observer.observe(sentinel);
}



// 2. Generic Fallback
// 2. Generic Fallback
async function loadGenericFeed() {
    if (feedLoading || !feedHasNext) return;
    
    feedLoading = true;
    const container = document.getElementById('feed-container');
    const sentinelLoader = document.querySelector('#feed-sentinel .loader-spinner');
    
    if(feedPage > 1 && sentinelLoader) sentinelLoader.classList.remove('d-none');
    
    if(feedPage === 1) container.innerHTML = '<div class="loader-spinner"></div>';

    try {
        const res = await ApiService.get(`/catalog/home/feed/?page=${feedPage}`);
        
        const sections = res.sections || [];
        feedHasNext = res.has_next;

        if(feedPage === 1) container.innerHTML = '';

        if (sections.length === 0 && feedPage === 1) {
            container.innerHTML = `<p class="text-center text-muted py-5">No products found!</p>`;
            return;
        }

        // Append New Sections
        const html = sections.map(sec => `
            <section class="feed-section">
                <div class="section-head" style="padding: 0 20px;">
                    <h3>${sec.category_name}</h3>
                    <a href="/search_results.html?slug=${sec.slug}">View All</a>
                </div>
                <div class="product-scroll-wrapper">
                    ${sec.products.map(p => createProductCard(p)).join('')}
                </div>
            </section>
        `).join('');

        container.insertAdjacentHTML('beforeend', html);

    } catch (e) {
        console.error("Feed Error", e);
        if(feedPage === 1) container.innerHTML = `<p class="text-center text-muted py-5">Failed to load feed.</p>`;
    } finally {
        feedLoading = false;
        
        if(sentinelLoader) sentinelLoader.classList.add('d-none');
        
        if(!feedHasNext) {
            const s = document.getElementById('feed-sentinel');
            if(s) s.remove();
        }
    }
}

// 3. Components
async function loadBanners() {
    const container = document.getElementById('hero-slider');
    try {
        const banners = await ApiService.get('/catalog/banners/');
        if (banners.length > 0) {
            container.classList.remove('skeleton');
            container.innerHTML = banners.map(b => `
                <img src="${b.image_url}" class="hero-slide" 
                     onclick="window.location.href='${b.target_url || '#'}'">
            `).join('');
        } else { container.style.display = 'none'; }
    } catch (e) { container.style.display = 'none'; }
}

async function loadCategories() {
    const container = document.getElementById('category-grid');
    try {
        const cats = await ApiService.get('/catalog/categories/');
        container.innerHTML = cats.slice(0, 8).map(c => `
            <div class="cat-card" onclick="window.location.href='/search_results.html?slug=${c.slug}'">
                <div class="cat-img-box">
                    <img src="${c.icon_url || 'https://cdn-icons-png.flaticon.com/512/3703/3703377.png'}">
                </div>
                <div class="cat-name">${c.name}</div>
            </div>
        `).join('');
    } catch (e) {}
}

async function loadBrands() {
    const container = document.getElementById('brand-scroller');
    try {
        const brands = await ApiService.get('/catalog/brands/');
        if(!brands.length) return;
        container.innerHTML = brands.map(b => `
            <div class="brand-circle" onclick="window.location.href='/search_results.html?brand=${b.id}'">
                <img src="${b.logo_url}" alt="${b.name}">
            </div>
        `).join('');
    } catch (e) {}
}

async function loadFlashSales() {
    const section = document.getElementById('flash-sale-section');
    const grid = document.getElementById('flash-sale-grid');
    try {
        const sales = await ApiService.get('/catalog/flash-sales/');
        if (!sales || sales.length === 0) {
            section.style.display = 'none';
            return;
        }
        section.style.display = 'block';
        grid.innerHTML = sales.map(item => `
            <div class="flash-card">
                <div class="badge-off">${item.discount_percent}% OFF</div>
                <a href="/product.html?code=${item.sku_id}">
                    <img src="${item.sku_image}" style="width:100%; height:100px; object-fit:contain; margin-bottom:5px;">
                    <div style="font-size:0.85rem; font-weight:600; height:36px; overflow:hidden;">${item.sku_name}</div>
                </a>
                <div class="f-price-box">
                    <span>${Formatters.currency(item.discounted_price)}</span>
                    <span class="f-mrp">${Formatters.currency(item.original_price)}</span>
                </div>
                <button onclick="addToCart('${item.sku}', this)" class="btn btn-sm btn-primary w-100 mt-2">ADD</button>
            </div>
        `).join('');
    } catch (e) { section.style.display = 'none'; }
}

function createProductCard(p) {
    // [FIX] 'undefined' error resolved by adding a hardcoded fallback URL
    const imageSrc = p.image_url || p.image || 'https://via.placeholder.com/150?text=No+Image';

    return `
        <div class="card product-card" style="padding:10px; border:1px solid #eee; box-shadow:none;">
            <a href="/product.html?code=${p.sku || p.id}">
                <img src="${imageSrc}" style="width:100%; height:120px; object-fit:contain; margin-bottom:8px;">
                <div style="font-size:0.9rem; font-weight:600; height:40px; overflow:hidden; margin-bottom:5px;">
                    ${p.name}
                </div>
            </a>
            <div class="d-flex justify-between align-center mt-2">
                <div style="font-weight:700;">${Formatters.currency(p.sale_price || p.selling_price || p.price)}</div>
                <button class="btn btn-sm btn-outline-primary" onclick="addToCart('${p.sku}', this)">ADD</button>
            </div>
        </div>
    `;
}

function startFlashTimer() {
    const display = document.getElementById('flash-timer');
    if(!display) return;
    const end = new Date();
    end.setHours(23, 59, 59, 999); 
    setInterval(() => {
        const diff = end - new Date();
        if(diff <= 0) { display.innerText = "00:00:00"; return; }
        const h = Math.floor((diff / (1000 * 60 * 60)) % 24);
        const m = Math.floor((diff / (1000 * 60)) % 60);
        const s = Math.floor((diff / 1000) % 60);
        display.innerText = `${h}:${m}:${s}`;
    }, 1000);
}

window.addToCart = async function(skuCode, btn) {
    if (!localStorage.getItem(APP_CONFIG.STORAGE_KEYS.TOKEN)) {
        Toast.warning("Login required");
        setTimeout(() => window.location.href = APP_CONFIG.ROUTES.LOGIN, 1000);
        return;
    }
    const originalText = btn.innerText;
    btn.innerText = "..";
    btn.disabled = true;
    try {
        await CartService.addItem(skuCode, 1);
        Toast.success("Added");
        btn.innerText = "✔";
        setTimeout(() => { btn.innerText = "ADD"; btn.disabled = false; }, 1500);
    } catch (e) {
        Toast.error(e.message || "Failed");
        btn.innerText = originalText;
        btn.disabled = false;
    }
};