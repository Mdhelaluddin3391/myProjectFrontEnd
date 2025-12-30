class Toast {
    static show(message, type = 'info', duration = 3000) {
        let container = document.getElementById('toast-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'toast-container';
            document.body.appendChild(container);
        }

        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        
        const icons = {
            success: 'fa-check-circle',
            error: 'fa-exclamation-circle',
            warning: 'fa-exclamation-triangle',
            info: 'fa-info-circle'
        };

        // UI Structure
        const content = document.createElement('div');
        content.className = 'toast-content';

        const iconWrap = document.createElement('span');
        iconWrap.className = 'toast-icon';
        iconWrap.innerHTML = `<i class="fas ${icons[type] || icons.info}"></i>`;

        const msgWrap = document.createElement('span');
        msgWrap.className = 'toast-msg';
        msgWrap.innerText = message; // SECURITY FIX: Use innerText instead of innerHTML

        const closeBtn = document.createElement('button');
        closeBtn.className = 'toast-close';
        closeBtn.innerHTML = '&times;';
        closeBtn.onclick = () => toast.remove();

        content.appendChild(iconWrap);
        content.appendChild(msgWrap);
        toast.appendChild(content);
        toast.appendChild(closeBtn);
        container.appendChild(toast);

        setTimeout(() => toast.classList.add('show'), 10);
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, duration);
    }
    static success(msg) { this.show(msg, 'success'); }
    static error(msg) { this.show(msg, 'error'); }
    static warning(msg) { this.show(msg, 'warning'); }
    static info(msg) { this.show(msg, 'info'); }
}
window.Toast = Toast;