// Utility functions
class Utils {
    // Format SOL amounts
    static formatSol(amount) {
        if (!amount || amount === 0) return '0 SOL';
        
        const solAmount = amount / 1e9; // Convert lamports to SOL
        
        if (solAmount < 0.001) return '<0.001 SOL';
        if (solAmount < 1) return `${solAmount.toFixed(3)} SOL`;
        if (solAmount < 1000) return `${solAmount.toFixed(2)} SOL`;
        if (solAmount < 1000000) return `${(solAmount / 1000).toFixed(1)}K SOL`;
        return `${(solAmount / 1000000).toFixed(1)}M SOL`;
    }

    // Format USD amounts
    static formatUsd(amount) {
        if (!amount || amount === 0) return '$0';
        
        if (amount < 0.01) return '<$0.01';
        if (amount < 1000) return `$${amount.toFixed(2)}`;
        if (amount < 1000000) return `$${(amount / 1000).toFixed(1)}K`;
        return `$${(amount / 1000000).toFixed(1)}M`;
    }

    // Format timestamps
    static formatTimestamp(timestamp) {
        if (!timestamp) return '-';
        
        const date = new Date(timestamp * 1000);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;
        
        return date.toLocaleDateString();
    }

    // Format wallet address
    static formatWallet(address, length = 8) {
        if (!address) return '-';
        if (address.length <= length * 2) return address;
        
        return `${address.slice(0, length)}...${address.slice(-length)}`;
    }

    // Format percentage
    static formatPercentage(value) {
        if (!value || value === 0) return '0%';
        return `${value.toFixed(1)}%`;
    }

    // Format PnL with color class
    static formatPnL(pnl) {
        if (!pnl || pnl === 0) return { text: '$0', class: '' };
        
        const formatted = this.formatUsd(Math.abs(pnl));
        const sign = pnl > 0 ? '+' : '-';
        const colorClass = pnl > 0 ? 'text-success' : 'text-danger';
        
        return {
            text: `${sign}${formatted}`,
            class: colorClass
        };
    }

    // Copy to clipboard
    static async copyToClipboard(text) {
        try {
            await navigator.clipboard.writeText(text);
            this.showToast('Copied to clipboard!', 'success');
        } catch (err) {
            console.error('Failed to copy:', err);
            this.showToast('Failed to copy', 'error');
        }
    }

    // Show toast notification
    static showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;
        
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 12px 20px;
            background: ${type === 'success' ? 'var(--success)' : type === 'error' ? 'var(--danger)' : 'var(--primary)'};
            color: white;
            border-radius: var(--radius);
            z-index: 10000;
            animation: slideIn 0.3s ease;
        `;
        
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    // Validate Solana address
    static isValidSolanaAddress(address) {
        if (!address || typeof address !== 'string') return false;
        
        // Basic validation: should be base58 encoded, 32-44 characters
        const base58Regex = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
        return base58Regex.test(address);
    }

    // Debounce function
    static debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    // Throttle function
    static throttle(func, limit) {
        let inThrottle;
        return function() {
            const args = arguments;
            const context = this;
            if (!inThrottle) {
                func.apply(context, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }

    // Sort table data
    static sortTableData(data, column, direction = 'asc') {
        return data.sort((a, b) => {
            let aVal = a[column];
            let bVal = b[column];

            // Handle different data types
            if (typeof aVal === 'string' && typeof bVal === 'string') {
                aVal = aVal.toLowerCase();
                bVal = bVal.toLowerCase();
            }

            if (aVal < bVal) return direction === 'asc' ? -1 : 1;
            if (aVal > bVal) return direction === 'asc' ? 1 : -1;
            return 0;
        });
    }

    // Filter table data
    static filterTableData(data, filters) {
        return data.filter(item => {
            return Object.entries(filters).every(([key, value]) => {
                if (!value) return true;
                
                const itemValue = item[key];
                if (typeof itemValue === 'string') {
                    return itemValue.toLowerCase().includes(value.toLowerCase());
                }
                if (typeof itemValue === 'number') {
                    return itemValue >= parseFloat(value);
                }
                return true;
            });
        });
    }

    // Generate CSV export
    static exportToCSV(data, filename) {
        if (!data || data.length === 0) {
            this.showToast('No data to export', 'error');
            return;
        }

        const headers = Object.keys(data[0]);
        const csvContent = [
            headers.join(','),
            ...data.map(row => 
                headers.map(header => {
                    const value = row[header];
                    return typeof value === 'string' && value.includes(',') 
                        ? `"${value}"` 
                        : value;
                }).join(',')
            )
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${filename}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);

        this.showToast('Data exported successfully!', 'success');
    }

    // Calculate statistics
    static calculateStats(data, valueKey) {
        if (!data || data.length === 0) return { min: 0, max: 0, avg: 0, total: 0 };

        const values = data.map(item => item[valueKey] || 0);
        const total = values.reduce((sum, val) => sum + val, 0);
        const avg = total / values.length;
        const min = Math.min(...values);
        const max = Math.max(...values);

        return { min, max, avg, total };
    }

    // Generate risk score color
    static getRiskScoreColor(score) {
        if (score < 20) return 'var(--success)';
        if (score < 50) return 'var(--warning)';
        if (score < 80) return 'var(--danger)';
        return '#8b0000'; // Dark red for very high risk
    }

    // Format large numbers
    static formatLargeNumber(num) {
        if (!num || num === 0) return '0';
        
        const abs = Math.abs(num);
        if (abs < 1000) return num.toString();
        if (abs < 1000000) return `${(num / 1000).toFixed(1)}K`;
        if (abs < 1000000000) return `${(num / 1000000).toFixed(1)}M`;
        return `${(num / 1000000000).toFixed(1)}B`;
    }

    // Create loading animation
    static createLoadingElement(text = 'Loading...') {
        const loading = document.createElement('div');
        loading.className = 'loading';
        loading.innerHTML = `<i class="fas fa-spinner fa-spin"></i> ${text}`;
        return loading;
    }

    // Create error element
    static createErrorElement(message) {
        const error = document.createElement('div');
        error.className = 'error-message';
        error.style.cssText = `
            padding: 1rem;
            background: var(--danger);
            color: white;
            border-radius: var(--radius);
            margin: 1rem 0;
            text-align: center;
        `;
        error.innerHTML = `<i class="fas fa-exclamation-triangle"></i> ${message}`;
        return error;
    }

    // Animate number changes
    static animateNumber(element, from, to, duration = 1000) {
        const startTime = performance.now();
        const difference = to - from;

        function update(currentTime) {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            const easeOutQuart = 1 - Math.pow(1 - progress, 4);
            const current = from + (difference * easeOutQuart);
            
            element.textContent = Math.round(current);
            
            if (progress < 1) {
                requestAnimationFrame(update);
            }
        }
        
        requestAnimationFrame(update);
    }
}

// Add CSS animations
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
    
    .error-message {
        animation: fadeIn 0.3s ease;
    }
    
    @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
    }
`;
document.head.appendChild(style);

// Export Utils class
window.Utils = Utils;