// assets/js/pages/catalog.js

// State Variables
let currentPage = 1;
let isLoading = false;
let hasNext = true;
let currentEndpointBase = ''; 

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Pehle Brands load karein
    await loadBrandFilters();
    
    // 2. Infinite Scroll setup karein
    setupInfiniteScroll();
    
    // 3. First Load trigger karein
    applyFilters(true);
});

// --- 1. Infinite Scroll Setup ---
function setupInfiniteScroll() {
    const list = document.getElementById('product-list');
    if (!list) return;

    // Sentinel Element (Trigger point)
    const sentinel = document.createElement('div');
    sentinel.id = 'catalog-sentinel';
    sentinel.style.width = '100%';
    sentinel.style.height = '50px';
    sentinel.style.textAlign = 'center';
    sentinel.innerHTML = '<div class="loader-spinner d-none"></div>';
    
    list.parentNode.insertBefore(sentinel, list.nextSibling);

    const observer = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && !isLoading && hasNext) {
            currentPage++;
            loadProducts(false); // Append data
        }
    }, { rootMargin: '300px' });

    observer.observe(sentinel);
}

// --- 2. Build URL & Apply Filters (FIXED LOGIC) ---
window.applyFilters = async (reset = true) => {
    // URL Params
    const params = new URLSearchParams(window.location.search);
    const query = params.get('q') || params.get('search');
    const slug = params.get('slug'); // Category Slug
    const brandFromUrl = params.get('brand'); // Brand from URL (e.g. Home page click)

    // Local Storage
    const whId = localStorage.getItem(APP_CONFIG.STORAGE_KEYS.WAREHOUSE_ID);
    
    // Sidebar Inputs
    const sortVal = document.getElementById('sort-select') ? document.getElementById('sort-select').value : '';
    
    // Checkboxes se selected brands nikalein
    const selectedBrands = Array.from(document.querySelectorAll('input[name="brand"]:checked')).map(cb => cb.value);

    // --- LOGIC FIX: Sab filters ko combine karna ---
    let queryParams = [];
    let title = 'All Products';

    // 1. Category Filter
    if (slug) {
        queryParams.push(`category__slug=${slug}`);
        title = capitalize(slug.replace(/-/g, ' '));
    }

    // 2. Search Query
    if (query) {
        queryParams.push(`search=${encodeURIComponent(query)}`);
        if(!slug) title = `Search: "${query}"`;
    }

    // 3. Brand Filter (URL + Sidebar Combined)
    let finalBrands = [...selectedBrands];
    if (brandFromUrl && !finalBrands.includes(brandFromUrl)) {
        finalBrands.push(brandFromUrl);
    }
    
    if (finalBrands.length > 0) {
        // Backend might expect comma separated IDs
        queryParams.push(`brand=${finalBrands.join(',')}`);
        if (!slug && !query) title = "Brand Products";
    }

    // 4. Warehouse Context
    if (whId) queryParams.push(`warehouse_id=${whId}`);
    
    // 5. Sorting
    if (sortVal) queryParams.push(`ordering=${sortVal}`);

    // Update Title UI
    const titleEl = document.getElementById('page-title');
    if (titleEl) titleEl.innerText = title;

    // Construct Endpoint
    const queryString = queryParams.length > 0 ? `?${queryParams.join('&')}` : '';
    currentEndpointBase = `/catalog/skus/${queryString}`;

    // Load Data
    await loadProducts(reset);
};

// Global handlers
window.applySort = () => applyFilters(true);
window.applyBrandFilter = () => applyFilters(true); // Checkbox click par ye call hoga

// --- 3. Core Loading Logic ---
async function loadProducts(reset = false) {
    if (isLoading) return;
    
    isLoading = true;
    const list = document.getElementById('product-list');
    const sentinelLoader = document.querySelector('#catalog-sentinel .loader-spinner');
    const emptyState = document.getElementById('empty-state');
    const countLabel = document.getElementById('result-count');

    if (reset) {
        currentPage = 1;
        hasNext = true;
        list.innerHTML = '';
        list.innerHTML = '<div class="loader-spinner main-loader"></div>';
        if (emptyState) emptyState.classList.add('d-none');
    } else {
        if (sentinelLoader) sentinelLoader.classList.remove('d-none');
    }

    try {
        const separator = currentEndpointBase.includes('?') ? '&' : '?';
        const url = `${currentEndpointBase}${separator}page=${currentPage}`;

        const res = await ApiService.get(url);
        
        let products = [];
        if (Array.isArray(res)) {
            products = res;
            hasNext = false; 
            if (countLabel) countLabel.innerText = `${products.length} Items`;
        } else {
            products = res.results || [];
            hasNext = !!res.next; 
            if (res.count !== undefined && countLabel) countLabel.innerText = `${res.count} Items`;
        }

        if (reset) list.innerHTML = ''; // Clear loader

        if (products.length === 0 && currentPage === 1) {
            if (emptyState) emptyState.classList.remove('d-none');
            hasNext = false;
        } else {
            renderProductCards(products, list);
        }

    } catch (e) {
        console.error("Load Error:", e);
        if (currentPage === 1) {
            list.innerHTML = '<p class="text-danger text-center w-100">Failed to load products.</p>';
        }
    } finally {
        isLoading = false;
        if (sentinelLoader) sentinelLoader.classList.add('d-none');
        
        const s = document.getElementById('catalog-sentinel');
        if (s) s.style.display = hasNext ? 'block' : 'none';
    }
}

// --- 4. Render Logic ---
function renderProductCards(products, container) {
    const html = products.map(p => {
        const imgUrl = p.image_url || 'https://via.placeholder.com/150?text=No+Image';
        
        let discountBadge = '';
        if (p.mrp && p.sale_price && p.mrp > p.sale_price) {
            const off = Math.round(((p.mrp - p.sale_price) / p.mrp) * 100);
            discountBadge = `<div class="badge-off" style="position:absolute; top:10px; left:10px; background:#ef4444; color:white; padding:2px 8px; border-radius:4px; font-size:0.7rem; font-weight:bold; z-index:2;">${off}% OFF</div>`;
        }

        return `
        <div class="card product-card" style="position:relative; padding:15px; border:1px solid #eee; transition:0.3s;">
            ${discountBadge}
            <a href="/product.html?code=${p.sku}" style="text-decoration:none; color:inherit;">
                <img src="${imgUrl}" style="width:100%; height:140px; object-fit:contain; margin-bottom:15px;" loading="lazy">
                <div class="item-name" style="font-weight:600; font-size:0.95rem; height:44px; overflow:hidden; line-height:1.4;">${p.name}</div>
            </a>
            <div class="item-unit text-muted small mb-2">${p.unit || '1 Unit'}</div>
            
            <div class="d-flex justify-between align-center mt-2">
                <div class="price-section">
                    <span class="font-bold" style="font-size:1.1rem;">${Formatters.currency(p.sale_price || p.price)}</span>
                    ${p.mrp > (p.sale_price || p.price) ? `<span class="text-muted small ml-1" style="text-decoration: line-through; font-size:0.85rem;">${Formatters.currency(p.mrp)}</span>` : ''}
                </div>
                <button class="btn btn-sm btn-outline-primary" 
                        style="border-radius:6px; padding: 6px 20px;"
                        onclick="addToCart('${p.sku}', this)">
                    ADD
                </button>
            </div>
        </div>
        `;
    }).join('');

    container.insertAdjacentHTML('beforeend', html);
}

// --- 5. Helper Functions ---

async function loadBrandFilters() {
    // Duplicate check remove kar diya hai taaki reload hone par bhi sahi chale
    const container = document.getElementById('brand-filter-container');
    if (!container) return; // Agar sidebar html mein nahi hai to return

    try {
        const res = await ApiService.get('/catalog/brands/');
        const brands = res.results || res;
        
        if (!brands || brands.length === 0) {
            container.innerHTML = '<p class="text-muted small">No brands.</p>';
            return;
        }

        const urlParams = new URLSearchParams(window.location.search);
        const currentBrandId = urlParams.get('brand');

        container.innerHTML = brands.map(b => `
            <label class="filter-item">
                <input type="checkbox" class="filter-checkbox" name="brand" value="${b.id}" 
                       ${currentBrandId == b.id ? 'checked' : ''} 
                       onchange="applyBrandFilter()"> 
                <span style="margin-left: 8px;">${b.name}</span>
            </label>
        `).join('');

    } catch (e) {
        console.warn("Failed to load brands", e);
        if(container) container.innerHTML = '<p class="text-danger small">Error</p>';
    }
}

// Helper: Capitalize
function capitalize(str) {
    if(!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
}

// Helper: Add to Cart (Same as before)
window.addToCart = async function(skuCode, btn) {
    if (!localStorage.getItem(APP_CONFIG.STORAGE_KEYS.TOKEN)) {
        Toast.warning("Login required");
        setTimeout(() => window.location.href = APP_CONFIG.ROUTES.LOGIN, 1500);
        return;
    }
    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '...';
    try {
        await CartService.addItem(skuCode, 1);
        Toast.success("Added");
        btn.innerHTML = '✔';
    } catch (e) {
        Toast.error(e.message || "Failed");
        btn.innerHTML = originalText;
    } finally {
        setTimeout(() => {
            btn.disabled = false;
            btn.innerHTML = "ADD";
        }, 2000);
    }
};