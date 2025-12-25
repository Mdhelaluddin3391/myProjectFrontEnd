/**
 * Loads dynamic layout components (Navbar, Footer)
 * Handles global UI state like Cart Count and User Auth status
 */
document.addEventListener('DOMContentLoaded', async () => {
    // 1. Load Navbar
    await loadComponent('/components/navbar.html', 'navbar-placeholder');
    // 2. Load Footer
    await loadComponent('/components/footer.html', 'footer-placeholder');

    initializeGlobalEvents();
});

async function loadComponent(url, elementId) {
    const element = document.getElementById(elementId);
    if (!element) return;
    try {
        const res = await fetch(url);
        if (res.ok) {
            element.innerHTML = await res.text();
        }
    } catch (e) {
        console.error(`Failed to load component: ${url}`, e);
    }
}

function initializeGlobalEvents() {
    updateAuthUI();
    updateCartCount();
    highlightActiveLink();
}

function updateAuthUI() {
    const isLoggedIn = localStorage.getItem(APP_CONFIG.STORAGE_KEYS.TOKEN);
    const authLink = document.getElementById('nav-auth-link');
    const accountLink = document.getElementById('nav-account-link');
    const userPhone = document.getElementById('nav-user-phone');

    if (isLoggedIn) {
        if(authLink) authLink.style.display = 'none';
        if(accountLink) accountLink.style.display = 'flex';
        
        // Try getting cached user info
        const user = JSON.parse(localStorage.getItem(APP_CONFIG.STORAGE_KEYS.USER) || '{}');
        if(userPhone && user.phone) userPhone.innerText = user.phone;
    } else {
        if(authLink) authLink.style.display = 'flex';
        if(accountLink) accountLink.style.display = 'none';
    }
}

async function updateCartCount() {
    const badge = document.getElementById('cart-badge');
    if (!badge) return;

    // Only fetch if logged in
    if (!localStorage.getItem(APP_CONFIG.STORAGE_KEYS.TOKEN)) {
        badge.style.display = 'none';
        return;
    }

    try {
        const res = await ApiService.get('/orders/cart/');
        const count = res.items ? res.items.length : 0;
        
        if (count > 0) {
            badge.innerText = count;
            badge.style.display = 'flex';
        } else {
            badge.style.display = 'none';
        }
    } catch (e) {
        console.warn("Cart count fetch failed", e);
    }
}

function highlightActiveLink() {
    const path = window.location.pathname;
    document.querySelectorAll('.nav-link').forEach(link => {
        if (link.getAttribute('href') === path) {
            link.classList.add('active');
        }
    });
}

// Global Logout function
window.logout = function() {
    localStorage.clear();
    window.location.href = APP_CONFIG.ROUTES.HOME;
    Toast.info("Logged out successfully");
}