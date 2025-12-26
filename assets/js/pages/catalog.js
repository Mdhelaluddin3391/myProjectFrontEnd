// assets/js/pages/catalog.js - UPDATED DOMContentLoaded aur naya loadFilters FUNCTION

document.addEventListener('DOMContentLoaded', async () => {
    const params = new URLSearchParams(window.location.search);
    const query = params.get('q') || params.get('search');
    const slug = params.get('slug');
    const brandId = params.get('brand'); // NEW

    let endpoint = '/catalog/skus/';
    let title = 'All Products';

    if (slug) {
        endpoint += `?category__slug=${slug}`;
        title = capitalize(slug.replace(/-/g, ' '));
    } else if (brandId) {
        endpoint += `?brand=${brandId}`;
        title = `Brand Products`;
    } else if (query) {
        endpoint += `?search=${encodeURIComponent(query)}`;
        title = `Search: "${query}"`;
    }

    document.getElementById('page-title').innerText = title;
    
    // Load dynamic filters (Brands)
    await loadBrandFilters();
    await loadProducts(endpoint);
});

async function loadBrandFilters() {
    const sidebar = document.querySelector('.filters-sidebar');
    try {
        const brands = await ApiService.get('/catalog/brands/');
        
        const filterGroup = document.createElement('div');
        filterGroup.className = 'filter-group mt-4';
        filterGroup.innerHTML = `
            <div class="filter-title">Filter By Brand</div>
            <div id="brand-filters-list" style="max-height:200px; overflow-y:auto; padding-right:5px;">
                ${brands.map(b => `
                    <label class="filter-item">
                        <input type="checkbox" name="brand" value="${b.id}" onchange="applyBrandFilter()">
                        <span>${b.name}</span>
                    </label>
                `).join('')}
            </div>
        `;
        sidebar.appendChild(filterGroup);
    } catch (e) {
        console.warn("Could not load brands for filtering");
    }
}

// Global filter application logic
window.applyBrandFilter = async () => {
    const selectedBrands = Array.from(document.querySelectorAll('input[name="brand"]:checked'))
                                .map(cb => cb.value);
    
    const params = new URLSearchParams(window.location.search);
    let newEndpoint = '/catalog/skus/';
    
    // Maintain existing category slug if any
    const slug = params.get('slug');
    const search = params.get('q') || params.get('search');
    
    let queryParams = [];
    if (slug) queryParams.push(`category__slug=${slug}`);
    if (search) queryParams.push(`search=${encodeURIComponent(search)}`);
    if (selectedBrands.length > 0) queryParams.push(`brand=${selectedBrands.join(',')}`);

    if (queryParams.length > 0) {
        newEndpoint += `?${queryParams.join('&')}`;
    }

    await loadProducts(newEndpoint);
};