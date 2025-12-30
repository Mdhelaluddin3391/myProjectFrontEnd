/**
 * Handles Navbar Search Auto-complete & Redirection
 */
class SearchManager {
    constructor() {
        this.input = document.querySelector('input[name="search"]'); 
        this.form = document.querySelector('.search-bar-row');
        this.debounceTimer = null;
        this.suggestionBox = null;

        if (this.input && this.form) {
            this.init();
        }
    }

    init() {
        this.suggestionBox = document.createElement('div');
        this.suggestionBox.className = 'search-suggestions d-none';
        this.suggestionBox.style.cssText = `
            position: absolute; top: 100%; left: 0; right: 0;
            background: #fff; border: 1px solid #ddd;
            border-radius: 0 0 12px 12px; box-shadow: 0 10px 20px rgba(0,0,0,0.1);
            z-index: 1000; overflow: hidden;
        `;
        this.form.style.position = 'relative'; 
        this.form.appendChild(this.suggestionBox);

        this.input.addEventListener('input', (e) => this.handleInput(e));
        this.input.addEventListener('focus', (e) => { if(e.target.value.length > 1) this.showSuggestions(); });
        
        document.addEventListener('click', (e) => {
            if (!this.form.contains(e.target)) this.hideSuggestions();
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
            // Updated Endpoint
            const res = await ApiService.get(`/catalog/search/suggest/?q=${encodeURIComponent(query)}`);
            this.renderSuggestions(res);
        } catch (e) { console.warn("Search suggestion failed", e); }
    }

    renderSuggestions(items) {
        if (!items || items.length === 0) {
            this.hideSuggestions();
            return;
        }

        this.suggestionBox.innerHTML = items.map(item => `
            <div class="suggestion-item" onclick="window.location.href='${item.url}'" style="padding: 10px 15px; cursor: pointer; border-bottom: 1px solid #f5f5f5; display: flex; justify-content: space-between; align-items: center;">
                <div>
                    <span style="font-weight: 500;">${item.text}</span>
                    <small class="text-muted" style="display: block; font-size: 0.75rem;">${item.type}</small>
                </div>
                <i class="fas fa-chevron-right text-muted small"></i>
            </div>
        `).join('');
        
        const viewAll = document.createElement('div');
        viewAll.style.cssText = "padding: 10px; text-align: center; background: #f8f9fa; cursor: pointer; color: var(--primary); font-weight: 600; font-size: 0.9rem;";
        viewAll.innerText = `View all results for "${this.input.value}"`;
        viewAll.onclick = () => this.form.submit();
        this.suggestionBox.appendChild(viewAll);

        this.showSuggestions();
    }

    showSuggestions() { this.suggestionBox.classList.remove('d-none'); }
    hideSuggestions() { this.suggestionBox.classList.add('d-none'); }
}

document.addEventListener('DOMContentLoaded', () => new SearchManager());