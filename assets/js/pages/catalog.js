document.addEventListener('DOMContentLoaded', async () => {
    const params = new URLSearchParams(window.location.search);
    const query = params.get('q');
    const slug = params.get('slug');
    const sort = document.getElementById('sort-select');

    let endpoint = '/catalog/skus/';
    let title = 'All Products';

    if (slug) {
        endpoint += `?category__slug=${slug}`;
        title = capitalize(slug.replace(/-/g, ' '));
    } else if (query) {
        endpoint += `?search=${encodeURIComponent(query)}`;
        title = `Search: "${query}"`;
    }

    document.getElementById('page-title').innerText = title;
    document.getElementById('page-breadcrumb').innerText = title;

    // Load Initial Data
    await loadProducts(endpoint);

    // Sorting Logic
    window.applySort = async () => {
        const sortVal = sort.value;
        let sortedEndpoint = endpoint;
        
        // Append sort param
        const separator = endpoint.includes('?') ? '&' : '?';
        
        // Backend sort mapping (Adjust keys based on your Django filters)
        if(sortVal === 'price_asc') sortedEndpoint += `${separator}ordering=sale_price`;
        if(sortVal === 'price_desc') sortedEndpoint += `${separator}ordering=-sale_price`;
        if(sortVal === 'newest') sortedEndpoint += `${separator}ordering=-created_at`;

        await loadProducts(sortedEndpoint);
    };
});

async function loadProducts(url) {
    const grid = document.getElementById('product-list');
    const empty = document.getElementById('empty-state');
    const count = document.getElementById('result-count');
    
    grid.innerHTML = '<div class="loader-spinner"></div>';
    empty.classList.add('d-none');

    try {
        const res = await ApiService.get(url);
        const products = res.results || res;

        count.innerText = `${products.length} Items`;

        if (products.length === 0) {
            grid.innerHTML = '';
            empty.classList.remove('d-none');
            return;
        }

        grid.innerHTML = products.map(p => `
            <div class="card" style="padding:15px; transition:0.2s;">
                <a href="/product.html?code=${p.sku_code || p.id}" style="display:block; text-decoration:none; color:inherit;">
                    <div style="height:160px; display:flex; align-items:center; justify-content:center; margin-bottom:15px;">
                        <img src="${p.image_url || 'https://via.placeholder.com/150'}" style="max-height:100%; max-width:100%;">
                    </div>
                    <div style="height:40px; overflow:hidden; font-weight:600; font-size:0.95rem; margin-bottom:5px;">
                        ${p.name}
                    </div>
                    <div class="text-muted small mb-2">${p.unit}</div>
                    
                    <div class="d-flex justify-between align-center">
                        <div style="font-weight:700; font-size:1.1rem;">
                            ${Formatters.currency(p.sale_price)}
                        </div>
                        <button onclick="addToCart(event, '${p.id}', this)" class="btn btn-sm btn-outline-primary">
                            ADD
                        </button>
                    </div>
                </a>
            </div>
        `).join('');

    } catch (e) {
        grid.innerHTML = `<p class="text-danger text-center w-100">Failed to load products</p>`;
        console.error(e);
    }
}

window.addToCart = async function(e, skuId, btn) {
    e.preventDefault(); // Prevent navigation
    e.stopPropagation();

    // Auth Check
    if (!localStorage.getItem(APP_CONFIG.STORAGE_KEYS.TOKEN)) {
        Toast.warning("Login to add items");
        setTimeout(() => window.location.href = APP_CONFIG.ROUTES.LOGIN, 1500);
        return;
    }

    const originalText = btn.innerText;
    btn.innerText = '...';
    btn.disabled = true;

    try {
        await CartService.addItem(skuId, 1);
        Toast.success("Added to Cart");
        btn.innerText = "✔";
        btn.classList.add('btn-primary');
        btn.classList.remove('btn-outline-primary');
    } catch (err) {
        Toast.error("Failed to add");
        btn.innerText = originalText;
    } finally {
        setTimeout(() => {
            btn.disabled = false;
            btn.innerText = "ADD";
            btn.classList.remove('btn-primary');
            btn.classList.add('btn-outline-primary');
        }, 2000);
    }
};

function capitalize(str) {
    return str.replace(/\b\w/g, l => l.toUpperCase());
}