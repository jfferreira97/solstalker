// Main application logic
class StalkerApp {
    constructor() {
        this.currentTab = 'token-analysis';
        this.currentTokenData = null;
        this.currentWalletData = null;
        this.currentCrossRefData = null;
        this.tokenInputCounter = 1;
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.setupTabNavigation();
        this.showTab('token-analysis');
    }

    setupEventListeners() {
        // Token Analysis
        document.getElementById('analyze-token').addEventListener('click', () => {
            this.analyzeToken();
        });

        document.getElementById('token-mint').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.analyzeToken();
            }
        });

        // Wallet Tracker
        document.getElementById('track-wallet').addEventListener('click', () => {
            this.trackWallet();
        });

        document.getElementById('wallet-address').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.trackWallet();
            }
        });

        // Cross Reference
        document.getElementById('add-token').addEventListener('click', () => {
            this.addTokenInput();
        });

        document.getElementById('cross-analyze').addEventListener('click', () => {
            this.crossAnalyze();
        });

        document.getElementById('save-to-list').addEventListener('click', () => {
            this.openSaveCrossRefModal();
        });

        // Wallet Lists
        document.getElementById('create-list').addEventListener('click', () => {
            this.createWalletList();
        });

        document.getElementById('new-list-name').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.createWalletList();
            }
        });

        // Bulk actions
        document.getElementById('add-all-buyers').addEventListener('click', () => {
            this.openAddAllBuyersModal();
        });
    }

    setupTabNavigation() {
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tab = e.target.dataset.tab;
                this.showTab(tab);
            });
        });
    }

    showTab(tabName) {
        // Update nav buttons
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tabName);
        });

        // Update tab content
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.toggle('active', content.id === tabName);
        });

        this.currentTab = tabName;

        // Special handling for wallet lists tab
        if (tabName === 'wallet-lists') {
            window.walletLists.renderLists();
            window.walletLists.updateModalDropdowns();
        }
    }

    // Token Analysis Methods
    async analyzeToken() {
        const mintAddress = document.getElementById('token-mint').value.trim();
        
        if (!mintAddress) {
            Utils.showToast('Please enter a token mint address', 'error');
            return;
        }

        if (!Utils.isValidSolanaAddress(mintAddress)) {
            Utils.showToast('Invalid Solana address format', 'error');
            return;
        }

        this.showLoading('token-loading', 'token-results');
        
        try {
            const buyers = await window.apiService.getTokenBuyers(mintAddress);
            this.currentTokenData = buyers;
            this.displayTokenResults(buyers);
            Utils.showToast('Token analysis completed!', 'success');
        } catch (error) {
            console.error('Token analysis error:', error);
            this.showError('token-results', 'Failed to analyze token: ' + error.message);
            Utils.showToast('Token analysis failed', 'error');
        } finally {
            this.hideLoading('token-loading');
        }
    }

    displayTokenResults(buyers) {
        const resultsDiv = document.getElementById('token-results');
        resultsDiv.style.display = 'block';

        // Update stats
        this.updateTokenStats(buyers);
        
        // Update table
        this.updateBuyersTable(buyers);
    }

    updateTokenStats(buyers) {
        const totalBuyers = buyers.length;
        const totalVolume = buyers.reduce((sum, buyer) => sum + (buyer.buyAmount || 0), 0);
        const avgBuy = totalBuyers > 0 ? totalVolume / totalBuyers : 0;
        
        const timestamps = buyers
            .filter(buyer => buyer.buyTime)
            .map(buyer => buyer.buyTime)
            .sort((a, b) => a - b);
        
        const timeRange = timestamps.length > 0 ? 
            `${Utils.formatTimestamp(timestamps[0])} - ${Utils.formatTimestamp(timestamps[timestamps.length - 1])}` : 
            '-';

        document.getElementById('total-buyers').textContent = totalBuyers;
        document.getElementById('total-volume').textContent = Utils.formatSol(totalVolume);
        document.getElementById('avg-buy').textContent = Utils.formatSol(avgBuy);
        document.getElementById('time-range').textContent = timeRange;
    }

    updateBuyersTable(buyers) {
        const tbody = document.getElementById('buyers-tbody');
        tbody.innerHTML = '';

        buyers.forEach(buyer => {
            const row = document.createElement('tr');
            const pnlFormatted = Utils.formatPnL(buyer.pnl || 0);
            
            row.innerHTML = `
                <td class="text-monospace truncate" title="${buyer.wallet}">
                    ${Utils.formatWallet(buyer.wallet)}
                </td>
                <td>${Utils.formatSol(buyer.buyAmount || 0)}</td>
                <td>${Utils.formatTimestamp(buyer.buyTime)}</td>
                <td>${Utils.formatSol(buyer.sellAmount || 0)}</td>
                <td>${Utils.formatTimestamp(buyer.sellTime)}</td>
                <td class="${pnlFormatted.class}">${pnlFormatted.text}</td>
                <td>
                    <button class="btn btn-secondary" onclick="app.trackSpecificWallet('${buyer.wallet}')" style="padding: 0.25rem 0.5rem; font-size: 0.75rem;">
                        <i class="fas fa-search"></i> Track
                    </button>
                    <button class="btn btn-secondary" onclick="Utils.copyToClipboard('${buyer.wallet}')" style="padding: 0.25rem 0.5rem; font-size: 0.75rem; margin-left: 0.25rem;">
                        <i class="fas fa-copy"></i>
                    </button>
                    <button class="btn btn-secondary" onclick="window.open('https://solscan.io/account/${buyer.wallet}', '_blank')" style="padding: 0.25rem 0.5rem; font-size: 0.75rem; margin-left: 0.25rem;">
                        <i class="fas fa-external-link-alt"></i>
                    </button>
                    <button class="btn btn-secondary" onclick="app.openAddWalletModal('${buyer.wallet}')" style="padding: 0.25rem 0.5rem; font-size: 0.75rem; margin-left: 0.25rem;">
                        <i class="fas fa-plus"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(row);
        });
    }

    // Wallet Tracker Methods
    async trackWallet() {
        const walletAddress = document.getElementById('wallet-address').value.trim();
        
        if (!walletAddress) {
            Utils.showToast('Please enter a wallet address', 'error');
            return;
        }

        if (!Utils.isValidSolanaAddress(walletAddress)) {
            Utils.showToast('Invalid wallet address format', 'error');
            return;
        }

        await this.performWalletTracking(walletAddress);
    }

    async trackSpecificWallet(walletAddress) {
        this.showTab('wallet-tracker');
        document.getElementById('wallet-address').value = walletAddress;
        await this.performWalletTracking(walletAddress);
    }

    async performWalletTracking(walletAddress) {
        this.showLoading('wallet-loading', 'wallet-results');
        
        try {
            const [history, holdings] = await Promise.all([
                window.apiService.getWalletHistory(walletAddress),
                window.apiService.getWalletHoldings(walletAddress)
            ]);
            
            this.currentWalletData = { history, holdings, address: walletAddress };
            this.displayWalletResults(walletAddress, history, holdings);
            Utils.showToast('Wallet tracking completed!', 'success');
        } catch (error) {
            console.error('Wallet tracking error:', error);
            this.showError('wallet-results', 'Failed to track wallet: ' + error.message);
            Utils.showToast('Wallet tracking failed', 'error');
        } finally {
            this.hideLoading('wallet-loading');
        }
    }

    displayWalletResults(address, history, holdings) {
        const resultsDiv = document.getElementById('wallet-results');
        resultsDiv.style.display = 'block';

        // Update wallet info
        document.getElementById('wallet-address-display').textContent = Utils.formatWallet(address, 12);
        
        // Update stats
        const totalTrades = history.length;
        const totalPnL = history.reduce((sum, tx) => {
            return sum + (tx.action === 'sell' ? tx.solAmount : -tx.solAmount);
        }, 0);
        const uniqueTokens = new Set(history.map(tx => tx.tokenMint)).size;

        document.getElementById('wallet-trades').textContent = totalTrades;
        document.getElementById('wallet-pnl').textContent = Utils.formatSol(totalPnL);
        document.getElementById('wallet-tokens').textContent = uniqueTokens;
        
        // Update trades table
        this.updateWalletTradesTable(history);
    }

    updateWalletTradesTable(history) {
        const tbody = document.getElementById('wallet-trades-tbody');
        tbody.innerHTML = '';

        history.forEach(tx => {
            const row = document.createElement('tr');
            const pnlFormatted = Utils.formatPnL(
                tx.action === 'sell' ? tx.solAmount : -tx.solAmount
            );
            
            row.innerHTML = `
                <td class="text-monospace truncate" title="${tx.tokenMint}">
                    ${Utils.formatWallet(tx.tokenMint)}
                </td>
                <td>
                    <span class="${tx.action === 'buy' ? 'text-danger' : 'text-success'}">
                        ${tx.action.toUpperCase()}
                    </span>
                </td>
                <td>${Utils.formatSol(tx.solAmount || 0)}</td>
                <td>${Utils.formatUsd(tx.marketCap || 0)}</td>
                <td>${Utils.formatTimestamp(tx.timestamp)}</td>
                <td class="${pnlFormatted.class}">${pnlFormatted.text}</td>
            `;
            tbody.appendChild(row);
        });
    }

    // Cross Reference Methods
    addTokenInput() {
        this.tokenInputCounter++;
        const container = document.getElementById('token-inputs');
        
        const inputGroup = document.createElement('div');
        inputGroup.className = 'token-input-group';
        inputGroup.innerHTML = `
            <input type="text" placeholder="Token mint address ${this.tokenInputCounter}" class="token-mint-input" />
            <div class="filters">
                <input type="number" placeholder="Min buy (SOL)" class="filter-input" />
                <input type="datetime-local" placeholder="Before date" class="filter-input" />
                <input type="number" placeholder="Min PnL (SOL)" class="filter-input" />
                <select class="filter-input">
                    <option value="">PnL Condition</option>
                    <option value="gt">Greater than</option>
                    <option value="lt">Less than</option>
                </select>
                <button type="button" class="btn btn-secondary" onclick="this.parentElement.parentElement.remove()" style="padding: 0.5rem; font-size: 0.75rem;">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;
        
        container.appendChild(inputGroup);
    }

    async crossAnalyze() {
        const tokenInputs = document.querySelectorAll('.token-input-group');
        const tokenConfigs = [];

        // Validate and collect token configs
        for (const inputGroup of tokenInputs) {
            const mintInput = inputGroup.querySelector('.token-mint-input');
            const filterInputs = inputGroup.querySelectorAll('.filter-input');
            
            const mintAddress = mintInput.value.trim();
            if (!mintAddress) {
                Utils.showToast('Please fill all token mint addresses', 'error');
                return;
            }

            if (!Utils.isValidSolanaAddress(mintAddress)) {
                Utils.showToast(`Invalid token address: ${mintAddress}`, 'error');
                return;
            }

            const filters = {
                minBuyAmount: parseFloat(filterInputs[0].value) || null,
                beforeDate: filterInputs[1].value || null,
                minPnl: parseFloat(filterInputs[2].value) || null,
                pnlCondition: filterInputs[3].value || null
            };

            tokenConfigs.push({ mintAddress, filters });
        }

        if (tokenConfigs.length < 2) {
            Utils.showToast('Please add at least 2 tokens for cross-reference', 'error');
            return;
        }

        this.showLoading('cross-loading', 'cross-results');
        
        try {
            const matchLogic = document.getElementById('match-logic').value;
            const commonWallets = await window.apiService.crossReferenceWallets(tokenConfigs, matchLogic);
            this.currentCrossRefData = commonWallets;
            this.displayCrossReferenceResults(commonWallets, tokenConfigs);
            
            // Show save button if we have results
            if (commonWallets.length > 0) {
                document.getElementById('save-to-list').style.display = 'inline-flex';
            }
            
            Utils.showToast('Cross-reference analysis completed!', 'success');
        } catch (error) {
            console.error('Cross-reference error:', error);
            this.showError('cross-results', 'Failed to cross-reference: ' + error.message);
            Utils.showToast('Cross-reference analysis failed', 'error');
        } finally {
            this.hideLoading('cross-loading');
        }
    }

    displayCrossReferenceResults(commonWallets, tokenConfigs) {
        const resultsDiv = document.getElementById('cross-results');
        resultsDiv.style.display = 'block';

        // Update stats
        const totalCommon = commonWallets.length;
        const overlapPercentage = tokenConfigs.length > 0 ? 
            (totalCommon / Math.max(...tokenConfigs.map(config => 100))) * 100 : // Placeholder calculation
            0;

        document.getElementById('common-wallets').textContent = totalCommon;
        document.getElementById('overlap-percentage').textContent = Utils.formatPercentage(overlapPercentage);
        
        // Update table
        this.updateCrossReferenceTable(commonWallets);
    }

    updateCrossReferenceTable(commonWallets) {
        const tbody = document.getElementById('cross-tbody');
        tbody.innerHTML = '';

        commonWallets.forEach(wallet => {
            const row = document.createElement('tr');
            const pnlFormatted = Utils.formatPnL(wallet.totalPnl || 0);
            const riskColor = Utils.getRiskScoreColor(wallet.riskScore || 0);
            
            row.innerHTML = `
                <td class="text-monospace truncate" title="${wallet.wallet}">
                    ${Utils.formatWallet(wallet.wallet)}
                </td>
                <td>${wallet.tokens.length}</td>
                <td class="${pnlFormatted.class}">${pnlFormatted.text}</td>
                <td>
                    <span style="color: ${riskColor}; font-weight: bold;">
                        ${wallet.riskScore || 0}/100
                    </span>
                </td>
                <td>
                    <button class="btn btn-secondary" onclick="app.trackSpecificWallet('${wallet.wallet}')" style="padding: 0.25rem 0.5rem; font-size: 0.75rem;">
                        <i class="fas fa-search"></i> Track
                    </button>
                    <button class="btn btn-secondary" onclick="Utils.copyToClipboard('${wallet.wallet}')" style="padding: 0.25rem 0.5rem; font-size: 0.75rem; margin-left: 0.25rem;">
                        <i class="fas fa-copy"></i>
                    </button>
                    <button class="btn btn-secondary" onclick="window.open('https://solscan.io/account/${wallet.wallet}', '_blank')" style="padding: 0.25rem 0.5rem; font-size: 0.75rem; margin-left: 0.25rem;">
                        <i class="fas fa-external-link-alt"></i>
                    </button>
                    <button class="btn btn-secondary" onclick="app.openAddWalletModal('${wallet.wallet}')" style="padding: 0.25rem 0.5rem; font-size: 0.75rem; margin-left: 0.25rem;">
                        <i class="fas fa-plus"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(row);
        });
    }

    // Utility Methods
    showLoading(loadingId, resultsId) {
        document.getElementById(loadingId).style.display = 'block';
        if (resultsId) {
            document.getElementById(resultsId).style.display = 'none';
        }
    }

    hideLoading(loadingId) {
        document.getElementById(loadingId).style.display = 'none';
    }

    showError(containerId, message) {
        const container = document.getElementById(containerId);
        container.style.display = 'block';
        container.innerHTML = `
            <div class="error-message">
                <i class="fas fa-exclamation-triangle"></i> ${message}
            </div>
        `;
    }

    // Wallet Lists Methods
    createWalletList() {
        const nameInput = document.getElementById('new-list-name');
        const name = nameInput.value.trim();
        
        if (!name) {
            Utils.showToast('Please enter a list name', 'error');
            return;
        }

        const listId = window.walletLists.createList(name);
        if (listId) {
            nameInput.value = '';
        }
    }

    openAddWalletModal(walletAddress) {
        document.getElementById('modal-wallet-address').value = walletAddress;
        document.getElementById('modal-wallet-note').value = '';
        window.walletLists.updateModalDropdowns();
        this.showModal('add-wallet-modal');
    }

    openAddAllBuyersModal() {
        if (!this.currentTokenData || this.currentTokenData.length === 0) {
            Utils.showToast('No buyer data to add', 'error');
            return;
        }

        const modal = document.getElementById('add-wallet-modal');
        const title = modal.querySelector('.modal-header h3');
        const walletField = modal.querySelector('#modal-wallet-address');
        const noteField = modal.querySelector('#modal-wallet-note');
        
        title.textContent = `Add ${this.currentTokenData.length} Buyers to List`;
        walletField.value = `${this.currentTokenData.length} wallets from token analysis`;
        walletField.disabled = true;
        noteField.value = 'Bulk added from token analysis';
        
        window.walletLists.updateModalDropdowns();
        this.showModal('add-wallet-modal');
    }

    openSaveCrossRefModal() {
        if (!this.currentCrossRefData || this.currentCrossRefData.length === 0) {
            Utils.showToast('No cross-reference data to save', 'error');
            return;
        }

        document.getElementById('modal-cross-list-name').value = '';
        document.getElementById('modal-wallet-count').textContent = this.currentCrossRefData.length;
        this.showModal('save-cross-modal');
    }

    confirmAddWallet() {
        const listId = document.getElementById('modal-list-select').value;
        const walletAddress = document.getElementById('modal-wallet-address').value;
        const note = document.getElementById('modal-wallet-note').value;
        
        if (!listId) {
            Utils.showToast('Please select a list', 'error');
            return;
        }

        // Check if this is a bulk add
        const title = document.querySelector('#add-wallet-modal .modal-header h3').textContent;
        if (title.includes('Buyers to List')) {
            // Bulk add all current token buyers
            const success = window.walletLists.addMultipleWallets(listId, this.currentTokenData);
            if (success) {
                this.closeModal();
                // Reset modal for single wallet adds
                document.querySelector('#add-wallet-modal .modal-header h3').textContent = 'Add Wallet to List';
                document.getElementById('modal-wallet-address').disabled = false;
            }
        } else {
            // Single wallet add
            if (!Utils.isValidSolanaAddress(walletAddress)) {
                Utils.showToast('Invalid wallet address', 'error');
                return;
            }

            const success = window.walletLists.addWalletToList(listId, walletAddress, note);
            if (success) {
                this.closeModal();
            }
        }
    }

    confirmSaveCrossReference() {
        const listName = document.getElementById('modal-cross-list-name').value.trim();
        
        if (!listName) {
            Utils.showToast('Please enter a list name', 'error');
            return;
        }

        const listId = window.walletLists.createList(listName);
        if (listId) {
            const success = window.walletLists.addMultipleWallets(listId, this.currentCrossRefData);
            if (success) {
                this.closeModal();
                document.getElementById('save-to-list').style.display = 'none';
            }
        }
    }

    showModal(modalId) {
        document.getElementById(modalId).style.display = 'flex';
    }

    closeModal() {
        document.querySelectorAll('.modal').forEach(modal => {
            modal.style.display = 'none';
        });
        
        // Reset bulk add modal state
        document.querySelector('#add-wallet-modal .modal-header h3').textContent = 'Add Wallet to List';
        document.getElementById('modal-wallet-address').disabled = false;
    }

    // Export functionality
    exportCurrentData() {
        if (this.currentTab === 'token-analysis' && this.currentTokenData) {
            Utils.exportToCSV(this.currentTokenData, 'token-buyers');
        } else if (this.currentTab === 'wallet-tracker' && this.currentWalletData) {
            Utils.exportToCSV(this.currentWalletData.history, 'wallet-history');
        } else if (this.currentTab === 'cross-reference' && this.currentCrossRefData) {
            Utils.exportToCSV(this.currentCrossRefData, 'cross-reference');
        } else {
            Utils.showToast('No data to export', 'error');
        }
    }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.app = new StalkerApp();
});

// Add keyboard shortcuts
document.addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
            case 'e':
                e.preventDefault();
                window.app.exportCurrentData();
                break;
            case '1':
                e.preventDefault();
                window.app.showTab('token-analysis');
                break;
            case '2':
                e.preventDefault();
                window.app.showTab('wallet-tracker');
                break;
            case '3':
                e.preventDefault();
                window.app.showTab('cross-reference');
                break;
            case '4':
                e.preventDefault();
                window.app.showTab('wallet-lists');
                break;
        }
    }
});