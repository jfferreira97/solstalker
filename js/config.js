// Configuration and environment management
class Config {
    constructor() {
        this.loadEnv();
    }

    loadEnv() {
        // For client-side, we'll need to handle environment variables differently
        // In production, these would be injected during build or served from a config endpoint
        this.HELIUS_API_KEY = this.getEnvVar('HELIUS_API_KEY', '');
        this.RATE_LIMIT = parseInt(this.getEnvVar('RATE_LIMIT', '100'));
        this.NODE_ENV = this.getEnvVar('NODE_ENV', 'development');
    }

    getEnvVar(key, defaultValue) {
        // In a real production app, you'd inject these at build time
        // or fetch from a secure config endpoint
        if (typeof process !== 'undefined' && process.env) {
            return process.env[key] || defaultValue;
        }
        
        // For development, you can temporarily hardcode values here
        // TODO: Replace with proper environment variable handling
        const envVars = {
            'HELIUS_API_KEY': '93e859cd-c7da-4802-bb5d-b263f2116351',
            'RATE_LIMIT': '100',
            'NODE_ENV': 'development'
        };
        
        return envVars[key] || defaultValue;
    }

    // API endpoints - Helius REST APIs only
    get heliusApiBase() {
        return `https://api.helius.xyz/v0`;
    }

    get enhancedTransactionsUrl() {
        return `${this.heliusApiBase}/transactions?api-key=${this.HELIUS_API_KEY}`;
    }

    get parsedTransactionsByAddressUrl() {
        return `${this.heliusApiBase}/addresses`;
    }

    get dasApiUrl() {
        return `${this.heliusApiBase}`;
    }

    // Rate limiting
    get requestsPerMinute() {
        return this.RATE_LIMIT;
    }

    // Known program addresses for different DEXs (for filtering/analysis)
    get dexPrograms() {
        return {
            PUMP_FUN: '6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P',
            RAYDIUM_V4: '675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8',
            JUPITER_V4: 'JUP4LHuHiWTQ4ZjDVBN5fVnAT2U6vMLBTwLZE3vVNVf',
            ORCA_WHIRLPOOL: 'whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc',
            MOONSHOT: 'MoonCVVNZFSYkqNXP6bxHLPL6QQJiMagDL3qcqUQTrG'
        };
    }
}

// Export singleton instance
window.config = new Config();