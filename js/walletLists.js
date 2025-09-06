// Wallet Lists Management System
class WalletListsManager {
    constructor() {
        this.lists = this.loadLists();
        this.currentListId = null;
    }

    // Load lists from localStorage
    loadLists() {
        try {
            const saved = localStorage.getItem('stalker_wallet_lists');
            return saved ? JSON.parse(saved) : {};
        } catch (error) {
            console.error('Error loading wallet lists:', error);
            return {};
        }
    }

    // Save lists to localStorage
    saveLists() {
        try {
            localStorage.setItem('stalker_wallet_lists', JSON.stringify(this.lists));
        } catch (error) {
            console.error('Error saving wallet lists:', error);
            Utils.showToast('Failed to save lists', 'error');
        }
    }

    // Create a new wallet list
    createList(name) {
        if (!name || name.trim() === '') {
            Utils.showToast('Please enter a list name', 'error');
            return null;
        }

        const listId = this.generateListId();
        const list = {
            id: listId,
            name: name.trim(),
            createdAt: Date.now(),
            wallets: [],
            description: ''
        };

        this.lists[listId] = list;
        this.saveLists();
        this.renderLists();
        
        Utils.showToast(`Created list: ${name}`, 'success');
        return listId;
    }

    // Delete a wallet list
    deleteList(listId) {
        if (!this.lists[listId]) return;

        const listName = this.lists[listId].name;
        if (confirm(`Are you sure you want to delete "${listName}"? This cannot be undone.`)) {
            delete this.lists[listId];
            this.saveLists();
            this.renderLists();
            Utils.showToast(`Deleted list: ${listName}`, 'success');
        }
    }

    // Add wallet to a list
    addWalletToList(listId, walletAddress, note = '', metadata = {}) {
        if (!this.lists[listId]) {
            Utils.showToast('List not found', 'error');
            return false;
        }

        const wallet = {
            address: walletAddress,
            note: note.trim(),
            addedAt: Date.now(),
            metadata: metadata // For storing PnL, risk score, etc.
        };

        // Check if wallet already exists in the list
        const existingIndex = this.lists[listId].wallets.findIndex(w => w.address === walletAddress);
        if (existingIndex !== -1) {
            // Update existing wallet
            this.lists[listId].wallets[existingIndex] = { ...this.lists[listId].wallets[existingIndex], ...wallet };
            Utils.showToast('Updated wallet in list', 'success');
        } else {
            // Add new wallet
            this.lists[listId].wallets.push(wallet);
            Utils.showToast('Added wallet to list', 'success');
        }

        this.saveLists();
        this.renderLists();
        return true;
    }

    // Remove wallet from a list
    removeWalletFromList(listId, walletAddress) {
        if (!this.lists[listId]) return;

        this.lists[listId].wallets = this.lists[listId].wallets.filter(w => w.address !== walletAddress);
        this.saveLists();
        this.renderLists();
        Utils.showToast('Removed wallet from list', 'success');
    }

    // Add multiple wallets to a list
    addMultipleWallets(listId, wallets) {
        if (!this.lists[listId]) {
            Utils.showToast('List not found', 'error');
            return false;
        }

        let addedCount = 0;
        wallets.forEach(wallet => {
            const walletData = {
                address: wallet.wallet || wallet.address,
                note: wallet.note || '',
                addedAt: Date.now(),
                metadata: {
                    pnl: wallet.pnl || 0,
                    riskScore: wallet.riskScore || 0,
                    buyAmount: wallet.buyAmount || 0,
                    sellAmount: wallet.sellAmount || 0,
                    ...wallet.metadata
                }
            };

            // Check if wallet already exists
            const existingIndex = this.lists[listId].wallets.findIndex(w => w.address === walletData.address);
            if (existingIndex === -1) {
                this.lists[listId].wallets.push(walletData);
                addedCount++;
            }
        });

        this.saveLists();
        this.renderLists();
        Utils.showToast(`Added ${addedCount} new wallets to list`, 'success');
        return true;
    }

    // Get all lists for dropdown
    getListsForDropdown() {
        return Object.values(this.lists).map(list => ({
            id: list.id,
            name: list.name
        }));
    }

    // Generate unique list ID
    generateListId() {
        return 'list_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    // Export list to CSV
    exportList(listId) {
        if (!this.lists[listId]) return;

        const list = this.lists[listId];
        const exportData = list.wallets.map(wallet => ({
            address: wallet.address,
            note: wallet.note,
            pnl: wallet.metadata?.pnl || 0,
            riskScore: wallet.metadata?.riskScore || 0,
            buyAmount: wallet.metadata?.buyAmount || 0,
            sellAmount: wallet.metadata?.sellAmount || 0,
            addedAt: new Date(wallet.addedAt).toISOString()
        }));

        Utils.exportToCSV(exportData, `wallet-list-${list.name.replace(/\s+/g, '-').toLowerCase()}`);
    }

    // Render all lists in the UI
    renderLists() {
        const container = document.getElementById('lists-grid');
        if (!container) return;

        container.innerHTML = '';

        if (Object.keys(this.lists).length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-list fa-3x"></i>
                    <h3>No Wallet Lists Yet</h3>
                    <p>Create your first wallet list to start organizing and tracking wallets.</p>
                </div>
            `;
            return;
        }

        Object.values(this.lists).forEach(list => {
            const listCard = this.createListCard(list);
            container.appendChild(listCard);
        });
    }

    // Create a list card element
    createListCard(list) {
        const card = document.createElement('div');
        card.className = 'list-card';
        card.innerHTML = `
            <div class="list-header">
                <h3>${this.escapeHtml(list.name)}</h3>
                <div class="list-actions">
                    <button class="btn btn-secondary" onclick="walletLists.exportList('${list.id}')" title="Export to CSV">
                        <i class="fas fa-download"></i>
                    </button>
                    <button class="btn btn-secondary" onclick="walletLists.editList('${list.id}')" title="Edit List">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-secondary" onclick="walletLists.deleteList('${list.id}')" title="Delete List">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
            <div class="list-stats">
                <div class="stat">
                    <span class="stat-value">${list.wallets.length}</span>
                    <span class="stat-label">Wallets</span>
                </div>
                <div class="stat">
                    <span class="stat-value">${new Date(list.createdAt).toLocaleDateString()}</span>
                    <span class="stat-label">Created</span>
                </div>
            </div>
            <div class="wallet-preview">
                ${this.renderWalletPreview(list.wallets)}
            </div>
            <div class="list-footer">
                <button class="btn btn-primary" onclick="walletLists.viewList('${list.id}')">
                    <i class="fas fa-eye"></i> View Details
                </button>
            </div>
        `;
        return card;
    }

    // Render wallet preview (first few wallets)
    renderWalletPreview(wallets) {
        if (wallets.length === 0) {
            return '<p class="empty-wallets">No wallets added yet</p>';
        }

        const preview = wallets.slice(0, 3).map(wallet => `
            <div class="wallet-item">
                <span class="wallet-address">${Utils.formatWallet(wallet.address)}</span>
                <div class="wallet-actions">
                    <button class="btn-icon" onclick="Utils.copyToClipboard('${wallet.address}')" title="Copy">
                        <i class="fas fa-copy"></i>
                    </button>
                    <button class="btn-icon" onclick="window.open('https://solscan.io/account/${wallet.address}', '_blank')" title="View on Solscan">
                        <i class="fas fa-external-link-alt"></i>
                    </button>
                </div>
            </div>
        `).join('');

        const moreText = wallets.length > 3 ? `<p class="more-wallets">+${wallets.length - 3} more...</p>` : '';
        
        return preview + moreText;
    }

    // View detailed list
    viewList(listId) {
        const list = this.lists[listId];
        if (!list) return;

        this.currentListId = listId;
        this.renderDetailedList(list);
    }

    // Render detailed list view
    renderDetailedList(list) {
        const container = document.getElementById('lists-grid');
        container.innerHTML = `
            <div class="detailed-list-view">
                <div class="detailed-header">
                    <button class="btn btn-secondary" onclick="walletLists.renderLists()">
                        <i class="fas fa-arrow-left"></i> Back to Lists
                    </button>
                    <h2>${this.escapeHtml(list.name)}</h2>
                    <div class="header-actions">
                        <button class="btn btn-secondary" onclick="walletLists.exportList('${list.id}')">
                            <i class="fas fa-download"></i> Export
                        </button>
                        <button class="btn btn-secondary" onclick="walletLists.editList('${list.id}')">
                            <i class="fas fa-edit"></i> Edit
                        </button>
                    </div>
                </div>
                
                <div class="detailed-stats">
                    <div class="stat-card">
                        <div class="stat-value">${list.wallets.length}</div>
                        <div class="stat-label">Total Wallets</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value">${this.calculateTotalPnL(list.wallets)}</div>
                        <div class="stat-label">Total PnL</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value">${this.calculateAverageRisk(list.wallets)}/100</div>
                        <div class="stat-label">Avg Risk Score</div>
                    </div>
                </div>

                <div class="detailed-table-container">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>Wallet Address</th>
                                <th>Note</th>
                                <th>PnL</th>
                                <th>Risk Score</th>
                                <th>Added Date</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${this.renderDetailedWalletRows(list.wallets, list.id)}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }

    // Render detailed wallet rows
    renderDetailedWalletRows(wallets, listId) {
        return wallets.map(wallet => {
            const pnlFormatted = Utils.formatPnL(wallet.metadata?.pnl || 0);
            const riskColor = Utils.getRiskScoreColor(wallet.metadata?.riskScore || 0);
            
            return `
                <tr>
                    <td class="text-monospace">${Utils.formatWallet(wallet.address, 12)}</td>
                    <td>${this.escapeHtml(wallet.note || '-')}</td>
                    <td class="${pnlFormatted.class}">${pnlFormatted.text}</td>
                    <td style="color: ${riskColor}; font-weight: bold;">
                        ${wallet.metadata?.riskScore || 0}/100
                    </td>
                    <td>${new Date(wallet.addedAt).toLocaleDateString()}</td>
                    <td>
                        <button class="btn-icon" onclick="app.trackSpecificWallet('${wallet.address}')" title="Track Wallet">
                            <i class="fas fa-search"></i>
                        </button>
                        <button class="btn-icon" onclick="Utils.copyToClipboard('${wallet.address}')" title="Copy Address">
                            <i class="fas fa-copy"></i>
                        </button>
                        <button class="btn-icon" onclick="window.open('https://solscan.io/account/${wallet.address}', '_blank')" title="View on Solscan">
                            <i class="fas fa-external-link-alt"></i>
                        </button>
                        <button class="btn-icon text-danger" onclick="walletLists.removeWalletFromList('${listId}', '${wallet.address}')" title="Remove from List">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
    }

    // Edit list (simple name change for now)
    editList(listId) {
        const list = this.lists[listId];
        if (!list) return;

        const newName = prompt('Enter new list name:', list.name);
        if (newName && newName.trim() !== '' && newName !== list.name) {
            list.name = newName.trim();
            this.saveLists();
            this.renderLists();
            Utils.showToast('List renamed successfully', 'success');
        }
    }

    // Calculate total PnL for a list
    calculateTotalPnL(wallets) {
        const total = wallets.reduce((sum, wallet) => sum + (wallet.metadata?.pnl || 0), 0);
        return Utils.formatPnL(total).text;
    }

    // Calculate average risk score
    calculateAverageRisk(wallets) {
        if (wallets.length === 0) return 0;
        const total = wallets.reduce((sum, wallet) => sum + (wallet.metadata?.riskScore || 0), 0);
        return Math.round(total / wallets.length);
    }

    // Update modal dropdowns
    updateModalDropdowns() {
        const select = document.getElementById('modal-list-select');
        if (!select) return;

        select.innerHTML = '<option value="">Choose a list...</option>';
        
        Object.values(this.lists).forEach(list => {
            const option = document.createElement('option');
            option.value = list.id;
            option.textContent = list.name;
            select.appendChild(option);
        });
    }

    // Utility: Escape HTML to prevent XSS
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Initialize global wallet lists manager
window.walletLists = new WalletListsManager();