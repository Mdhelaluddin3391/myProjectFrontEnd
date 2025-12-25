/**
 * QuickDash AI Assistant
 * Floats on bottom right, handles simple chat interface.
 */
class Assistant {
    static init() {
        this.render();
        this.bindEvents();
    }

    static render() {
        const div = document.createElement('div');
        // FIX: Removed <img> tag and used FontAwesome icon for reliability
        div.innerHTML = `
            <div id="ast-trigger" class="ast-btn">
                <i class="fas fa-robot" style="font-size: 1.8rem; color: #fff;"></i>
            </div>

            <div id="ast-window" class="ast-box">
                <div class="ast-header">
                    <div class="d-flex align-center gap-2">
                        <i class="fas fa-robot"></i> <strong>QuickDash AI</strong>
                    </div>
                    <i class="fas fa-times" id="ast-close" style="cursor:pointer"></i>
                </div>
                
                <div id="ast-messages" class="ast-body">
                    <div class="msg-bubble bot">
                        Hi! I can help you find products or track orders. Try typing "Milk" or "Order Status".
                    </div>
                </div>

                <div class="ast-footer">
                    <input type="text" id="ast-input" placeholder="Ask me anything..." autocomplete="off">
                    <button id="ast-send"><i class="fas fa-paper-plane"></i></button>
                </div>
            </div>
        `;
        document.body.appendChild(div);
    }

    static bindEvents() {
        const trigger = document.getElementById('ast-trigger');
        const windowEl = document.getElementById('ast-window');
        const close = document.getElementById('ast-close');
        const send = document.getElementById('ast-send');
        const input = document.getElementById('ast-input');

        if(!trigger) return;

        // Toggle
        trigger.onclick = () => {
            windowEl.classList.add('active');
            trigger.style.display = 'none';
            input.focus();
        };

        close.onclick = () => {
            windowEl.classList.remove('active');
            setTimeout(() => trigger.style.display = 'flex', 300);
        };

        // Send Logic
        const handleSend = async () => {
            const text = input.value.trim();
            if (!text) return;

            this.addMessage(text, 'user');
            input.value = '';

            try {
                this.addTyping();
                
                // Call Backend
                const res = await ApiService.post('/catalog/assistant/chat/', { message: text });
                
                this.removeTyping();
                this.addMessage(res.reply || "I didn't understand that.", 'bot');

                if (res.action === 'cart_updated') {
                    // Trigger global event update
                    if(window.CartService) CartService.updateGlobalCount();
                    Toast.success("Cart updated!");
                }

            } catch (e) {
                this.removeTyping();
                this.addMessage("Sorry, I'm having trouble connecting to the server.", 'bot');
            }
        };

        send.onclick = handleSend;
        input.onkeypress = (e) => { if (e.key === 'Enter') handleSend(); };
    }

    static addMessage(text, type) {
        const area = document.getElementById('ast-messages');
        const div = document.createElement('div');
        div.className = `msg-row ${type}`;
        div.innerHTML = `<div class="msg-bubble ${type}">${text}</div>`;
        area.appendChild(div);
        area.scrollTop = area.scrollHeight;
    }

    static addTyping() {
        const area = document.getElementById('ast-messages');
        const div = document.createElement('div');
        div.id = 'ast-typing';
        div.className = 'msg-row bot';
        div.innerHTML = `<div class="msg-bubble bot">...</div>`;
        area.appendChild(div);
        area.scrollTop = area.scrollHeight;
    }

    static removeTyping() {
        const el = document.getElementById('ast-typing');
        if (el) el.remove();
    }
}

// Auto-init
document.addEventListener('DOMContentLoaded', () => {
    // Adding a small delay to ensure CSS loads
    setTimeout(() => Assistant.init(), 1000); 
});