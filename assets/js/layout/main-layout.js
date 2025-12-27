/* assets/js/layout/main-layout.js */

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Bootstrap Configuration (Critical)
    if (window.AppConfigService) {
        await window.AppConfigService.load();
    }

    // 2. Centralized Auth Guard
    enforceAuth();

    // 3. Load Components
    await loadComponent('/components/navbar.html', 'navbar-placeholder');
    await loadComponent('/components/footer.html', 'footer-placeholder');

    initializeGlobalEvents();
    loadNavbarCategories(); 
});

// [AUDIT FIX] Check protected routes centrally
function enforceAuth() {
    const protectedRoutes = ['/cart.html', '/checkout.html', '/profile.html', '/orders.html', '/track_order.html'];
    const path = window.location.pathname;
    
    if (protectedRoutes.some(route => path.includes(route))) {
        if (!localStorage.getItem(APP_CONFIG.STORAGE_KEYS.TOKEN)) {
            window.location.href = APP_CONFIG.ROUTES.LOGIN;
        }
    }
}

async function loadComponent(url, elementId) {
    const element = document.getElementById(elementId);
    if (!element) return;
    try {
        const res = await fetch(url);
        if (res.ok) element.innerHTML = await res.text();
    } catch (e) { /* Console logs removed for prod */ }
}

function initializeGlobalEvents() {
    updateAuthUI();
    updateCartCount();
    
    const locBtn = document.getElementById('navbar-location-box');
    if(locBtn) {
        const savedLoc = localStorage.getItem('user_address_text');
        if(savedLoc) {
            const shortLoc = savedLoc.split(',')[0];
            document.getElementById('header-location').innerText = shortLoc;
        }

        locBtn.addEventListener('click', () => {
            if(window.LocationPicker) LocationPicker.open();
        });
    }

    window.addEventListener('cart-updated', (event) => {
        const badge = document.getElementById('cart-badge');
        if (badge) {
            const count = event.detail.count;
            badge.innerText = count;
            badge.style.display = count > 0 ? 'flex' : 'none';
        }
    });
}

async function loadNavbarCategories() {
    const nav = document.getElementById('dynamic-navbar');
    if (!nav) return;
    
    try {
        if(typeof ApiService === 'undefined') return;

        const res = await ApiService.get('/catalog/categories/?page_size=15');
        const cats = res.results || res;
        
        const parents = cats.filter(c => !c.parent);

        parents.forEach(c => {
            const a = document.createElement('a');
            a.className = 'nav-item';
            a.href = `/search_results.html?slug=${c.slug}`;
            a.innerText = c.name;
            nav.appendChild(a);
        });

    } catch (e) {
        // Silent fail in prod
    }
}

function updateAuthUI() { /* existing logic */ }
async function updateCartCount() { 
    if(window.CartService) await CartService.updateGlobalCount(); 
}

// [AUDIT FIX] Robust Logout
window.logout = async function() {
    if(confirm("Logout?")) {
        try {
            // Attempt server-side blacklist (Fire and forget)
            const refresh = localStorage.getItem(APP_CONFIG.STORAGE_KEYS.REFRESH);
            if (refresh) {
                await ApiService.post('/auth/logout/', { refresh: refresh });
            }
        } catch(e) {
            console.warn("Logout API failed, proceeding with local cleanup");
        } finally {
            localStorage.clear();
            window.location.href = '/auth.html';
        }
    }
}