/**
 * Handles Navbar Search Auto-complete & Redirection
 */
class SearchManager {
    constructor() {
        this.input = document.querySelector('input[name="q"]');
        this.form = document.querySelector('.search-bar');
        this.debounceTimer = null;
        this.suggestionBox = null;

        if (this.input && this.form) {
            this.init();
        }
    }

    init() {
        // Create Suggestion Box UI
        this.suggestionBox = document.createElement('div');
        this.suggestionBox.className = 'search-suggestions d-none';
        this.form.style.position = 'relative'; // Ensure positioning context
        this.form.appendChild(this.suggestionBox);

        // Bind Events
        this.input.addEventListener('input', (e) => this.handleInput(e));
        this.input.addEventListener('focus', (e) => this.handleInput(e));
        
        // Close on click outside
        document.addEventListener('click', (e) => {
            if (!this.form.contains(e.target)) {
                this.hideSuggestions();
            }
        });
    }

    handleInput(e) {
        const query = e.target.value.trim();
        clearTimeout(this.debounceTimer);

        if (query.length < 2) {
            this.hideSuggestions();
            return;
        }

        this.debounceTimer = setTimeout(() => this.fetchSuggestions(query), 300);
    }

    async fetchSuggestions(query) {
        try {
            // Adjust endpoint if your backend has a specific suggest API
            // Otherwise, we search products and limit results
            const res = await ApiService.get(`/catalog/skus/?search=${encodeURIComponent(query)}&page_size=5`);
            const results = res.results || res;
            this.renderSuggestions(results);
        } catch (e) {
            console.warn("Search suggestion failed", e);
        }
    }

    renderSuggestions(items) {
        if (!items || items.length === 0) {
            this.hideSuggestions();
            return;
        }

        this.suggestionBox.innerHTML = items.map(item => `
            <a href="/product.html?code=${item.sku_code || item.id}" class="suggestion-item">
                <img src="${item.image_url || 'https://via.placeholder.com/30'}" width="30">
                <div>
                    <div class="s-name">${item.name}</div>
                    <div class="s-price">${Formatters.currency(item.sale_price)}</div>
                </div>
            </a>
        `).join('');
        
        // Add "View All" link
        const viewAll = document.createElement('a');
        viewAll.href = `/search_results.html?q=${encodeURIComponent(this.input.value)}`;
        viewAll.className = 'suggestion-footer';
        viewAll.innerText = `View all results for "${this.input.value}"`;
        this.suggestionBox.appendChild(viewAll);

        this.showSuggestions();
    }

    showSuggestions() {
        this.suggestionBox.classList.remove('d-none');
    }

    hideSuggestions() {
        this.suggestionBox.classList.add('d-none');
    }
}

// Initialize on load
document.addEventListener('DOMContentLoaded', () => new SearchManager());