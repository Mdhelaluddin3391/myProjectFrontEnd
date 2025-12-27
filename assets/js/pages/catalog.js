// assets/js/pages/catalog.js

document.addEventListener('DOMContentLoaded', async () => {
    const params = new URLSearchParams(window.location.search);
    const query = params.get('q') || params.get('search');
    const slug = params.get('slug');
    const brandId = params.get('brand');

    // [FIX] Get Warehouse ID
    const whId = localStorage.getItem(APP_CONFIG.STORAGE_KEYS.WAREHOUSE_ID);

    let endpoint = '/catalog/skus/?';
    let title = 'All Products';
    let queryParams = [];

    if (slug) {
        queryParams.push(`category__slug=${slug}`);
        title = capitalize(slug.replace(/-/g, ' '));
    } else if (brandId) {
        queryParams.push(`brand=${brandId}`);
        title = `Brand Products`;
    } else if (query) {
        queryParams.push(`search=${encodeURIComponent(query)}`);
        title = `Search: "${query}"`;
    }

    // [FIX] Append Warehouse ID to Query
    if (whId) {
        queryParams.push(`warehouse_id=${whId}`);
    }

    endpoint += queryParams.join('&');

    document.getElementById('page-title').innerText = title;
    
    await loadBrandFilters();
    await loadProducts(endpoint);
});

// Global filter application logic
window.applyBrandFilter = async () => {
    const selectedBrands = Array.from(document.querySelectorAll('input[name="brand"]:checked'))
                                .map(cb => cb.value);
    
    const params = new URLSearchParams(window.location.search);
    const whId = localStorage.getItem(APP_CONFIG.STORAGE_KEYS.WAREHOUSE_ID); // [FIX]
    
    let newEndpoint = '/catalog/skus/';
    
    // Maintain existing category slug/search
    const slug = params.get('slug');
    const search = params.get('q') || params.get('search');
    
    let queryParams = [];
    if (slug) queryParams.push(`category__slug=${slug}`);
    if (search) queryParams.push(`search=${encodeURIComponent(search)}`);
    if (selectedBrands.length > 0) queryParams.push(`brand=${selectedBrands.join(',')}`);
    
    // [FIX] Ensure warehouse context is maintained during filtering
    if (whId) queryParams.push(`warehouse_id=${whId}`);

    if (queryParams.length > 0) {
        newEndpoint += `?${queryParams.join('&')}`;
    }

    await loadProducts(newEndpoint);
};

// Helper for title capitalization
function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}