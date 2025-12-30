const Formatters = {
    currency: (amount) => {
        const val = parseFloat(amount);
        if (isNaN(val)) return '₹0.00';
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            minimumFractionDigits: 0,
            maximumFractionDigits: 2
        }).format(val);
    },

    date: (dateStr) => {
        if (!dateStr) return '';
        return new Date(dateStr).toLocaleDateString('en-IN', {
            day: 'numeric', month: 'short', year: 'numeric'
        });
    },

    dateTime: (dateStr) => {
        if (!dateStr) return '';
        return new Date(dateStr).toLocaleString('en-IN', {
            day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
        });
    }
};

window.Formatters = Formatters;