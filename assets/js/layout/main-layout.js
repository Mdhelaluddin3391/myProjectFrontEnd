/* assets/js/layout/main-layout.js */

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Load Components
    await loadComponent('/components/navbar.html', 'navbar-placeholder');
    await loadComponent('/components/footer.html', 'footer-placeholder');

    initializeGlobalEvents();
    loadNavbarCategories(); // NEW: Load dynamic categories
});

async function loadComponent(url, elementId) {
    const element = document.getElementById(elementId);
    if (!element) return;
    try {
        const res = await fetch(url);
        if (res.ok) element.innerHTML = await res.text();
    } catch (e) { console.error(e); }
}

function initializeGlobalEvents() {
    updateAuthUI();
    updateCartCount();
    
    // Bind Location Button in Navbar
    const locBtn = document.getElementById('navbar-location-box');
    if(locBtn) {
        // Display current saved location
        const savedLoc = localStorage.getItem('user_address_text');
        if(savedLoc) {
            // Extract just the first part (Area Name) for cleaner look
            const shortLoc = savedLoc.split(',')[0];
            document.getElementById('header-location').innerText = shortLoc;
        }

        locBtn.addEventListener('click', () => {
            if(window.LocationPicker) LocationPicker.open();
        });
    }

    // Listen for Cart Updates
    window.addEventListener('cart-updated', (event) => {
        const badge = document.getElementById('cart-badge');
        if (badge) {
            const count = event.detail.count;
            badge.innerText = count;
            badge.style.display = count > 0 ? 'flex' : 'none';
        }
    });
}

// NEW: Fetch Categories for Horizontal Navbar
async function loadNavbarCategories() {
    const nav = document.getElementById('dynamic-navbar');
    if (!nav) return;
    
    try {
        // Using ApiService safely
        if(typeof ApiService === 'undefined') return;

        const res = await ApiService.get('/catalog/categories/?page_size=15');
        const cats = res.results || res;
        
        // Filter only parent categories
        const parents = cats.filter(c => !c.parent);

        parents.forEach(c => {
            const a = document.createElement('a');
            a.className = 'nav-item';
            a.href = `/search_results.html?slug=${c.slug}`;
            a.innerText = c.name;
            nav.appendChild(a);
        });

    } catch (e) {
        console.warn("Nav categories failed", e);
    }
}

// ... existing auth & cart functions (keep them as is) ...
function updateAuthUI() { /* existing logic */ }
async function updateCartCount() { 
    if(window.CartService) await CartService.updateGlobalCount(); 
}
window.logout = function() {
    if(confirm("Logout?")) {
        localStorage.clear();
        window.location.href = '/auth.html';
    }
}