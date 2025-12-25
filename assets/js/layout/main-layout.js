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

    // NEW: Listen for Cart Updates from any page
    window.addEventListener('cart-updated', (event) => {
        const badge = document.getElementById('cart-badge');
        if (badge) {
            const count = event.detail.count;
            badge.innerText = count;
            badge.style.display = count > 0 ? 'flex' : 'none';
        }
    });
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
    // Initial load check
    if(window.CartService) {
        await CartService.updateGlobalCount();
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
    if(confirm("Are you sure you want to logout?")) {
        localStorage.clear();
        Toast.info("Logged out successfully");
        setTimeout(() => {
            window.location.href = APP_CONFIG.ROUTES.LOGIN; // Redirect to Login
        }, 500);
    }
}