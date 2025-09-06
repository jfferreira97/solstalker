// API Service Layer - Designed for easy transition to backend calls
class ApiService {
    constructor() {
        this.config = window.config;
        this.requestQueue = [];
        this.lastRequestTime = 0;
        this.requestInterval = 60000 / this.config.requestsPerMinute; // ms between requests
    }

    // Rate limiting wrapper
    async rateLimit() {
        const now = Date.now();
        const timeSinceLastRequest = now - this.lastRequestTime;
        
        if (timeSinceLastRequest < this.requestInterval) {
            const waitTime = this.requestInterval - timeSinceLastRequest;
            await new Promise(resolve => setTimeout(resolve, waitTime));
        }
        
        this.lastRequestTime = Date.now();
    }

    // Generic API request method - easily replaceable with backend calls
    async makeRequest(url, options = {}) {
        await this.rateLimit();
        
        const defaultOptions = {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            }
        };

        const requestOptions = { ...defaultOptions, ...options };
        
        try {
            const response = await fetch(url, requestOptions);
            
            if (!response.ok) {
                throw new Error(`API request failed: ${response.status} ${response.statusText}`);
            }
            
            return await response.json();
        } catch (error) {
            console.error('API request error:', error);
            throw error;
        }
    }

    // Get token buyers by searching transactions for the token mint
    async getTokenBuyers(mintAddress) {
        // First, let's try using the simple approach with parsed transactions by address
        // Since we need to find buyers, we'll search for transactions involving this token
        
        try {
            // Try to get token metadata first to understand the token
            console.log(`Analyzing token: ${mintAddress}`);
            
            // Try the DAS API first
            try {
                const tokenInfo = await this.getTokenInfo(mintAddress);
                console.log('Token info from DAS:', tokenInfo);
            } catch (e) {
                console.log('DAS API failed, will use mock data for now');
            }
            
            // For now, let's create some mock data to test the UI
            // TODO: Implement proper transaction parsing once we understand the correct API format
            console.log('Returning mock buyer data for UI testing');
            return this.getMockBuyerData(mintAddress);
            
        } catch (error) {
            console.error('Error fetching token buyers:', error);
            // Return mock data for testing
            return this.getMockBuyerData(mintAddress);
        }
    }

    // Get token information using DAS API
    async getTokenInfo(mintAddress) {
        // Try different Helius DAS API endpoint formats (no RPC, REST only)
        const possibleUrls = [
            `${this.config.dasApiUrl}/assets/${mintAddress}?api-key=${this.config.HELIUS_API_KEY}`,
            `${this.config.dasApiUrl}/token-metadata?api-key=${this.config.HELIUS_API_KEY}&mint=${mintAddress}`,
            `https://api.helius.xyz/v1/assets/${mintAddress}?api-key=${this.config.HELIUS_API_KEY}`
        ];
        
        for (const url of possibleUrls) {
            try {
                console.log(`Trying DAS API endpoint: ${url}`);
                const response = await this.makeRequest(url);
                console.log('DAS API success!', response);
                return response;
            } catch (error) {
                console.log(`DAS API failed for ${url}:`, error.message);
            }
        }
        
        throw new Error('All DAS API endpoints failed');
    }

    // Mock data for testing the UI while we fix the API
    getMockBuyerData(mintAddress) {
        const mockBuyers = [];
        const baseTime = Date.now() / 1000;
        
        for (let i = 0; i < 10; i++) {
            const wallet = this.generateMockWallet();
            const buyAmount = Math.random() * 10 * 1e9; // Random SOL amount in lamports
            const sellAmount = Math.random() > 0.5 ? Math.random() * buyAmount : 0;
            const pnl = sellAmount > 0 ? (sellAmount - buyAmount) : -buyAmount * Math.random() * 0.5;
            
            mockBuyers.push({
                wallet,
                buyAmount,
                buyTime: baseTime - Math.random() * 86400 * 7, // Last 7 days
                sellAmount,
                sellTime: sellAmount > 0 ? baseTime - Math.random() * 86400 * 3 : null,
                pnl,
                transactions: [
                    {
                        signature: this.generateMockSignature(),
                        timestamp: baseTime - Math.random() * 86400 * 7,
                        type: 'buy',
                        amount: buyAmount,
                        marketCap: Math.random() * 1000000,
                        tokenAmount: Math.random() * 1000000
                    }
                ]
            });
        }
        
        return mockBuyers;
    }

    generateMockWallet() {
        const chars = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
        let result = '';
        for (let i = 0; i < 44; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    }

    generateMockSignature() {
        const chars = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
        let result = '';
        for (let i = 0; i < 88; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    }

    // Parse transaction data to extract buyer information
    parseBuyerTransactions(response, mintAddress) {
        const buyers = new Map();
        
        if (!response || !response.result) return [];

        response.result.forEach(tx => {
            try {
                const { signature, timestamp, events } = tx;
                const walletAddress = tx.feePayer;
                
                // Parse swap events to determine buy/sell
                events?.forEach(event => {
                    if (event.type === 'swap' && this.isTokenPurchase(event, mintAddress)) {
                        const buyAmount = this.extractSolAmount(event.tokenTransfers, 'in');
                        const sellAmount = this.extractSolAmount(event.tokenTransfers, 'out');
                        const marketCap = this.calculateMarketCapAtTime(event, timestamp);
                        
                        if (!buyers.has(walletAddress)) {
                            buyers.set(walletAddress, {
                                wallet: walletAddress,
                                transactions: []
                            });
                        }
                        
                        buyers.get(walletAddress).transactions.push({
                            signature,
                            timestamp,
                            type: buyAmount > 0 ? 'buy' : 'sell',
                            amount: buyAmount || sellAmount,
                            marketCap,
                            tokenAmount: this.extractTokenAmount(event.tokenTransfers, mintAddress)
                        });
                    }
                });
            } catch (error) {
                console.warn('Error parsing transaction:', error, tx);
            }
        });

        return this.processBuyerData(Array.from(buyers.values()));
    }

    // Process buyer data to calculate PnL and aggregate trades
    processBuyerData(buyers) {
        return buyers.map(buyer => {
            const { wallet, transactions } = buyer;
            const buys = transactions.filter(tx => tx.type === 'buy');
            const sells = transactions.filter(tx => tx.type === 'sell');
            
            const totalBuyAmount = buys.reduce((sum, tx) => sum + tx.amount, 0);
            const totalSellAmount = sells.reduce((sum, tx) => sum + tx.amount, 0);
            
            const firstBuy = buys.sort((a, b) => a.timestamp - b.timestamp)[0];
            const lastSell = sells.sort((a, b) => b.timestamp - a.timestamp)[0];
            
            const pnlByMarketCap = this.calculatePnLByMarketCap(buys, sells);
            
            return {
                wallet,
                buyAmount: totalBuyAmount,
                buyTime: firstBuy?.timestamp || null,
                sellAmount: totalSellAmount,
                sellTime: lastSell?.timestamp || null,
                pnl: pnlByMarketCap,
                transactions
            };
        });
    }

    // Calculate PnL based on market cap changes
    calculatePnLByMarketCap(buys, sells) {
        let totalPnL = 0;
        let remainingTokens = 0;
        let weightedBuyMarketCap = 0;

        // Calculate weighted average buy market cap
        buys.forEach(buy => {
            remainingTokens += buy.tokenAmount || 0;
            weightedBuyMarketCap += (buy.marketCap || 0) * (buy.tokenAmount || 0);
        });

        if (remainingTokens === 0) return 0;
        weightedBuyMarketCap /= remainingTokens;

        // Subtract sold tokens and calculate PnL
        sells.forEach(sell => {
            const tokensToSell = Math.min(sell.tokenAmount || 0, remainingTokens);
            const buyPrice = weightedBuyMarketCap;
            const sellPrice = sell.marketCap || 0;
            
            totalPnL += (sellPrice - buyPrice) * tokensToSell / remainingTokens;
            remainingTokens -= tokensToSell;
        });

        return totalPnL;
    }

    // Get wallet transaction history
    async getWalletHistory(walletAddress) {
        try {
            // TODO: Implement real API call to Helius parsed transactions by address
            // For now, return mock data for testing
            return this.getMockWalletHistory(walletAddress);
        } catch (error) {
            console.error('Error fetching wallet history:', error);
            return this.getMockWalletHistory(walletAddress);
        }
    }

    // Mock wallet history data
    getMockWalletHistory(walletAddress) {
        const mockTransactions = [];
        const baseTime = Date.now() / 1000;
        
        for (let i = 0; i < 15; i++) {
            const tokenMint = this.generateMockWallet();
            const action = Math.random() > 0.6 ? 'buy' : 'sell';
            const solAmount = Math.random() * 5 * 1e9; // Random SOL amount
            
            mockTransactions.push({
                signature: this.generateMockSignature(),
                timestamp: baseTime - Math.random() * 86400 * 30, // Last 30 days
                tokenMint,
                action,
                solAmount,
                marketCap: Math.random() * 1000000
            });
        }
        
        return mockTransactions.sort((a, b) => b.timestamp - a.timestamp);
    }

    // Parse wallet transaction history
    parseWalletTransactions(response, walletAddress) {
        if (!response || !response.result) return [];

        const transactions = [];
        
        response.result.forEach(tx => {
            try {
                const { signature, timestamp, events } = tx;
                
                events?.forEach(event => {
                    if (event.type === 'swap') {
                        const tokenMint = this.extractTokenMintFromSwap(event);
                        const solAmount = this.extractSolAmount(event.tokenTransfers, 'in') || 
                                        this.extractSolAmount(event.tokenTransfers, 'out');
                        const action = this.extractSolAmount(event.tokenTransfers, 'in') > 0 ? 'buy' : 'sell';
                        const marketCap = this.calculateMarketCapAtTime(event, timestamp);
                        
                        transactions.push({
                            signature,
                            timestamp,
                            tokenMint,
                            action,
                            solAmount,
                            marketCap
                        });
                    }
                });
            } catch (error) {
                console.warn('Error parsing wallet transaction:', error, tx);
            }
        });

        return transactions.sort((a, b) => b.timestamp - a.timestamp);
    }

    // Get current wallet holdings
    async getWalletHoldings(walletAddress) {
        try {
            // TODO: Implement real DAS API call for wallet holdings
            // For now, return mock data for testing
            return this.getMockWalletHoldings(walletAddress);
        } catch (error) {
            console.error('Error fetching wallet holdings:', error);
            return this.getMockWalletHoldings(walletAddress);
        }
    }

    // Mock wallet holdings data
    getMockWalletHoldings(walletAddress) {
        const mockHoldings = [];
        
        for (let i = 0; i < 8; i++) {
            const mint = this.generateMockWallet();
            const balance = Math.random() * 1000000 * Math.pow(10, 6);
            
            mockHoldings.push({
                mint,
                name: `Token ${i + 1}`,
                symbol: `TOK${i + 1}`,
                balance,
                decimals: 6,
                uiBalance: balance / Math.pow(10, 6),
                image: null
            });
        }
        
        return mockHoldings;
    }

    // Parse wallet holdings data
    parseWalletHoldings(response) {
        if (!response || !response.result || !response.result.items) return [];

        return response.result.items.map(asset => ({
            mint: asset.id,
            name: asset.content?.metadata?.name || 'Unknown',
            symbol: asset.content?.metadata?.symbol || 'UNK',
            balance: asset.token_info?.balance || 0,
            decimals: asset.token_info?.decimals || 0,
            uiBalance: (asset.token_info?.balance || 0) / Math.pow(10, asset.token_info?.decimals || 0),
            image: asset.content?.files?.[0]?.uri || null
        }));
    }

    // Utility methods
    isTokenPurchase(event, mintAddress) {
        // Check if this swap event involves purchasing the specified token
        return event.tokenTransfers?.some(transfer => 
            transfer.mint === mintAddress && transfer.tokenAmount > 0
        );
    }

    extractSolAmount(tokenTransfers, direction) {
        if (!tokenTransfers) return 0;
        
        const solTransfer = tokenTransfers.find(transfer => 
            transfer.mint === 'So11111111111111111111111111111111111111112' // SOL mint
        );
        
        if (!solTransfer) return 0;
        
        return direction === 'in' ? 
            Math.abs(solTransfer.tokenAmount || 0) : 
            Math.abs(solTransfer.tokenAmount || 0);
    }

    extractTokenAmount(tokenTransfers, mintAddress) {
        if (!tokenTransfers) return 0;
        
        const tokenTransfer = tokenTransfers.find(transfer => transfer.mint === mintAddress);
        return Math.abs(tokenTransfer?.tokenAmount || 0);
    }

    extractTokenMintFromSwap(event) {
        // Extract the non-SOL token mint from a swap event
        const nonSolTransfer = event.tokenTransfers?.find(transfer => 
            transfer.mint !== 'So11111111111111111111111111111111111111112'
        );
        return nonSolTransfer?.mint || null;
    }

    calculateMarketCapAtTime(event, timestamp) {
        // Placeholder for market cap calculation
        // In a real implementation, you'd need historical market data
        // For now, we'll use a placeholder calculation
        return Math.random() * 1000000; // Placeholder
    }

    // Cross-reference multiple wallets
    async crossReferenceWallets(tokenConfigs, matchLogic = 'and') {
        const allBuyers = new Map();
        
        for (const config of tokenConfigs) {
            const { mintAddress, filters } = config;
            const buyers = await this.getTokenBuyers(mintAddress);
            
            buyers.forEach(buyer => {
                if (this.matchesFilters(buyer, filters)) {
                    const key = buyer.wallet;
                    if (!allBuyers.has(key)) {
                        allBuyers.set(key, {
                            wallet: buyer.wallet,
                            tokens: new Set(),
                            totalPnl: 0,
                            transactions: []
                        });
                    }
                    
                    const walletData = allBuyers.get(key);
                    walletData.tokens.add(mintAddress);
                    walletData.totalPnl += buyer.pnl || 0;
                    walletData.transactions.push(...buyer.transactions);
                }
            });
        }

        // Filter based on match logic
        const filteredWallets = Array.from(allBuyers.values()).filter(wallet => {
            if (matchLogic === 'and') {
                // AND logic: Must have bought ALL tokens
                return wallet.tokens.size === tokenConfigs.length;
            } else {
                // OR logic: Must have bought ANY token (at least 1)
                return wallet.tokens.size >= 1;
            }
        });

        return filteredWallets.map(wallet => ({
            ...wallet,
            tokens: Array.from(wallet.tokens),
            riskScore: this.calculateRiskScore(wallet)
        }));
    }

    // Check if buyer matches filters
    matchesFilters(buyer, filters) {
        if (!filters) return true;

        if (filters.minBuyAmount && buyer.buyAmount < filters.minBuyAmount) return false;
        if (filters.beforeDate && buyer.buyTime > new Date(filters.beforeDate).getTime()) return false;
        if (filters.pnlCondition && filters.minPnl) {
            if (filters.pnlCondition === 'gt' && buyer.pnl <= filters.minPnl) return false;
            if (filters.pnlCondition === 'lt' && buyer.pnl >= filters.minPnl) return false;
        }

        return true;
    }

    // Calculate risk score for cross-referenced wallets
    calculateRiskScore(wallet) {
        let score = 0;
        
        // High number of matching tokens
        score += wallet.tokens.length * 10;
        
        // Similar transaction timing patterns
        const timestamps = wallet.transactions.map(tx => tx.timestamp).sort((a, b) => a - b);
        const timeGaps = timestamps.slice(1).map((time, i) => time - timestamps[i]);
        const avgGap = timeGaps.reduce((sum, gap) => sum + gap, 0) / timeGaps.length;
        if (avgGap < 300000) score += 20; // Transactions within 5 minutes
        
        // High PnL correlation
        if (wallet.totalPnl > 10000) score += 30;
        
        return Math.min(score, 100);
    }
}

// Export singleton instance
window.apiService = new ApiService();