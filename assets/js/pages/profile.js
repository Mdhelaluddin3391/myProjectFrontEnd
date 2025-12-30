document.addEventListener('DOMContentLoaded', async () => {
    // Auth Guard
    if(!localStorage.getItem(APP_CONFIG.STORAGE_KEYS.TOKEN)) {
        window.location.href = APP_CONFIG.ROUTES.LOGIN;
        return;
    }
    
    // Load Data
    const user = JSON.parse(localStorage.getItem(APP_CONFIG.STORAGE_KEYS.USER) || '{}');
    renderUserInfo(user);
    loadStats();
    loadRecentOrders();

    // Bind Edit Button
    document.getElementById('edit-profile-btn').addEventListener('click', openEditModal);
    document.getElementById('profile-form').addEventListener('submit', updateProfile);
});

function renderUserInfo(user) {
    document.getElementById('user-name').innerText = user.first_name 
        ? `${user.first_name} ${user.last_name || ''}` 
        : 'QuickDash User';
    document.getElementById('user-phone').innerText = user.phone;
    
    // Pre-fill form
    document.getElementById('edit-fname').value = user.first_name || '';
    document.getElementById('edit-lname').value = user.last_name || '';
    document.getElementById('edit-email').value = user.email || '';
}

async function loadStats() {
    try {
        const res = await ApiService.get('/orders/my/');
        const orders = res.results || res;
        
        document.getElementById('total-orders').innerText = orders.length;
        const spent = orders.reduce((acc, o) => acc + parseFloat(o.final_amount), 0);
        document.getElementById('total-spent').innerText = Formatters.currency(spent);
    } catch(e) {
        console.warn("Stats load failed", e);
    }
}

async function loadRecentOrders() {
    const container = document.getElementById('recent-orders-list');
    try {
        const res = await ApiService.get('/orders/my/?page_size=3');
        const orders = res.results || res;

        if(orders.length === 0) {
            container.innerHTML = '<p class="text-muted">No orders yet.</p>';
            return;
        }

        container.innerHTML = orders.map(o => `
            <div class="order-card">
                <div>
                    <strong>Order #${o.id.slice(0,8).toUpperCase()}</strong>
                    <p class="text-muted small">${Formatters.date(o.created_at)}</p>
                </div>
                <div class="text-right">
                    <span class="status-badge status-${o.status.toLowerCase()}">${o.status}</span>
                    <div class="mt-1 font-weight-bold">${Formatters.currency(o.final_amount)}</div>
                </div>
            </div>
        `).join('');
    } catch(e) {
        container.innerHTML = '<p class="text-danger">Failed to load orders</p>';
    }
}

// --- Edit Profile Logic ---

function openEditModal() {
    document.getElementById('profile-modal').classList.remove('d-none');
}

window.closeProfileModal = function() {
    document.getElementById('profile-modal').classList.add('d-none');
}

async function updateProfile(e) {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    const originalText = btn.innerText;
    btn.innerText = "Saving...";
    btn.disabled = true;

    const payload = {
        first_name: document.getElementById('edit-fname').value,
        last_name: document.getElementById('edit-lname').value,
        email: document.getElementById('edit-email').value
    };

    try {
        const updatedUser = await ApiService.patch('/auth/customer/me/', payload);
        localStorage.setItem(APP_CONFIG.STORAGE_KEYS.USER, JSON.stringify(updatedUser));
        renderUserInfo(updatedUser);
        Toast.success("Profile Updated");
        closeProfileModal();
    } catch(err) {
        Toast.error(err.message || "Update failed");
    } finally {
        btn.innerText = originalText;
        btn.disabled = false;
    }
}