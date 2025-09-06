# Solana Memecoin Stalker

A comprehensive web application for analyzing Solana memecoin buyer patterns and cross-referencing wallet activities across major DEXs.

## Features

- **Token Buyer Analysis**: Extract all wallet addresses that purchased specific tokens with buy/sell times and PnL calculations
- **Wallet Deep Dive**: Track complete trading history and current holdings for any wallet
- **Cross-Reference Analysis**: Find common wallets across multiple tokens with advanced filtering
- **PnL by Market Cap**: Calculate profits/losses based on market cap changes rather than token prices
- **Real-time Data**: Fetch live data from Helius APIs with rate limiting

## Setup

1. **Environment Configuration**
   - Copy `.env` file and add your Helius API key:
   ```
   HELIUS_API_KEY=your_helius_api_key_here
   ```
   
2. **Local Development**
   - Open `js/config.js` and temporarily add your API key to the `envVars` object for local testing
   - Open `index.html` in your browser
   - No build process required - pure vanilla JS/HTML/CSS

3. **API Key Setup**
   - Sign up for Helius Labs (https://helius.xyz)
   - Get your API key from the dashboard
   - Developer edition ($49/month) recommended for proper rate limits

## Usage

### Token Analysis
1. Enter a Solana token mint address
2. Click "Analyze Token" to fetch all buyers
3. View buy/sell times, amounts, and PnL calculations
4. Export data or track individual wallets

### Wallet Tracker
1. Enter a wallet address
2. View complete trading history across all DEXs
3. See current holdings and calculated PnL
4. Track specific wallets from token analysis

### Cross Reference
1. Add multiple tokens with optional filters:
   - Minimum buy amount (SOL)
   - Purchase before specific date
   - PnL conditions (greater/less than)
2. Find wallets that bought ALL specified tokens
3. View risk scores and overlap analysis

## Architecture

The app is designed for easy transition from client-side to backend API calls:

- `js/api.js`: All external API calls isolated here
- `js/config.js`: Environment and configuration management
- `js/utils.js`: Utility functions and formatting
- `js/app.js`: Main application logic and UI handling

## Supported DEXs

- pump.fun
- Raydium
- Jupiter
- Orca
- Moonshot (planned)

## Data Sources

- **Primary**: Helius Enhanced Transactions API
- **Holdings**: Helius DAS (Digital Asset Standard) API
- **Supplementary**: Jupiter Token Lists, Solscan API

## Rate Limiting

- Configurable requests per minute
- Automatic request queuing
- Built-in retry logic for failed requests

## Keyboard Shortcuts

- `Ctrl/Cmd + 1`: Token Analysis tab
- `Ctrl/Cmd + 2`: Wallet Tracker tab  
- `Ctrl/Cmd + 3`: Cross Reference tab
- `Ctrl/Cmd + E`: Export current data

## Future Backend Migration

The API service layer is designed to easily switch from direct Helius calls to your own backend:

1. Update `js/api.js` endpoints to point to your backend
2. Implement rate limiting, caching, and authentication on the backend
3. Keep the same response format for seamless transition

## Security Notes

- API keys are not exposed in production builds
- No private keys handled - read-only analysis only
- Rate limiting prevents API abuse
- CORS-compliant for web deployment