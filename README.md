# QuantumTrade Pro

A professional-grade cryptocurrency trading platform with intelligent market analysis, automated trading execution, and comprehensive risk management.

## 🚀 Quick Start

### Prerequisites
- **Node.js** 18.0.0 or higher
- **pnpm** (recommended) or npm
- **Git**

### Installation

#### Option 1: Automated Setup (Recommended)

**Linux/macOS:**
```bash
git clone <repository-url>
cd quantumtrade_pro
chmod +x scripts/setup.sh
./scripts/setup.sh
```

**Windows:**
```bash
git clone <repository-url>
cd quantumtrade_pro
scripts/setup.bat
```

#### Option 2: Manual Setup

```bash
# 1. Clone repository
git clone <repository-url>
cd quantumtrade_pro

# 2. Install dependencies
pnpm install

# 3. Create environment file
cp .env.example .env.local

# 4. Configure environment variables
# Edit .env.local with your API keys

# 5. Start development server
pnpm dev
```

## 📋 Required Configuration

### Environment Variables (.env.local)

```bash
# Database Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Binance API Configuration
BINANCE_API_KEY=your_binance_api_key
BINANCE_API_SECRET=your_binance_api_secret

# Telegram Bot Configuration (Optional)
TELEGRAM_BOT_TOKEN=your_telegram_bot_token
TELEGRAM_CHAT_ID=your_telegram_chat_id

# Application Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development
```

### External Services Setup

#### 1. Binance API
- Create account at [Binance](https://www.binance.com)
- Enable Futures trading
- Generate API keys with Futures permissions
- Enable IP restrictions for security

#### 2. Supabase Database
- Create project at [Supabase](https://supabase.com)
- Run database schema: `scripts/create-database-schema.sql`
- Get project URL and service role key

#### 3. Telegram Bot (Optional)
- Message [@BotFather](https://t.me/botfather)
- Create bot and get token
- Get your chat ID

## 🎯 Features

### Trading Bot
- **Multi-indicator Strategy**: RSI, MACD, Bollinger Bands, VWAP
- **Risk Management**: Configurable leverage, stop-loss, profit targets
- **Position Management**: Automatic sizing and monitoring
- **Emergency Stop**: Immediate position closure

### Dashboard
- **Real-time Data**: Live market feeds and indicators
- **Technical Analysis**: Multiple indicator charts
- **Portfolio Tracking**: Active positions, P&L, balance
- **Risk Metrics**: Margin usage, drawdown tracking

### Telegram Integration
- **Remote Control**: Start/stop trading, check status
- **Notifications**: Trade alerts, risk warnings
- **Account Monitoring**: Balance, positions, performance

### Database Integration
- **Complete Audit Trail**: All trades and activities logged
- **Performance Tracking**: Daily metrics and analytics
- **User Configuration**: Persistent settings
- **Risk Management**: Comprehensive risk logging

## 📊 Trading Strategy

The platform implements a **mean reversion strategy** with momentum confirmation:

### Buy Signal Conditions
- RSI < 30 (oversold)
- MACD > 0 (positive momentum)
- Price below lower Bollinger Band
- Price below VWAP

### Sell Signal Conditions
- RSI > 70 (overbought)
- MACD < 0 (negative momentum)
- Price above upper Bollinger Band
- Price above VWAP

### Risk Management
- **Position Sizing**: 2% risk per trade
- **Leverage**: 5x (configurable)
- **Stop Loss**: 20% of account balance
- **Profit Target**: $30 USDT per position
- **Max Positions**: 3 concurrent trades

## 🛠️ Development

### Available Scripts

```bash
# Development
pnpm dev          # Start development server
pnpm build        # Build for production
pnpm start        # Start production server
pnpm lint         # Run ESLint

# Database
pnpm db:setup     # Setup database schema
pnpm db:seed      # Seed initial data

# Testing
pnpm test         # Run tests
pnpm test:watch   # Run tests in watch mode
```

### Project Structure

```
quantumtrade_pro/
├── app/                    # Next.js app directory
│   ├── api/               # API routes
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Home page
├── components/            # React components
│   ├── ui/               # UI components
│   └── *.tsx             # Feature components
├── lib/                  # Utility libraries
│   ├── binance-api.ts    # Binance API client
│   ├── trading-bot.ts    # Trading bot logic
│   └── technical-indicators.ts
├── scripts/              # Setup and utility scripts
├── docs/                 # Documentation
└── public/               # Static assets
```

### API Endpoints

- `GET /api/trading/status` - Get trading bot status
- `POST /api/trading/start` - Start trading bot
- `POST /api/trading/stop` - Stop trading bot
- `POST /api/trading/emergency-stop` - Emergency stop
- `GET /api/trading/symbols` - Get USDT pairs
- `GET /api/database/stats` - Get database statistics
- `POST /api/telegram/webhook` - Telegram webhook

## 📈 Performance

### Expected Metrics
- **Win Rate**: 60-70% (mean reversion strategies)
- **Average Trade**: Small profits with occasional larger losses
- **Drawdown**: 10-20% during unfavorable conditions
- **Sharpe Ratio**: 1.0-1.5 (moderate risk-adjusted returns)

### Risk Considerations
- **Leverage Risk**: 5x leverage amplifies losses
- **Correlation Risk**: Crypto assets may move together
- **Liquidity Risk**: Market gaps can cause slippage
- **Technical Risk**: API failures, network issues

## 🔒 Security

### Best Practices
- ✅ Use environment variables for API keys
- ✅ Enable IP restrictions on Binance API
- ✅ Use service role key for database
- ✅ Enable Row Level Security (RLS)
- ✅ Regular backups and monitoring
- ❌ Never commit API keys to git
- ❌ Don't expose keys in client-side code

## 📚 Documentation

- [Setup and Startup Guide](./docs/SETUP_AND_STARTUP.md)
- [Trading Logic Analysis](./docs/TRADING_LOGIC_ANALYSIS.md)
- [Database Integration](./docs/DATABASE_INTEGRATION.md)
- [USDT Pairs Guide](./docs/USDT_PAIRS_GUIDE.md)

## 🚨 Important Warnings

### Risk Disclosure
- **This is a real trading system with financial risk**
- **Test thoroughly with paper trading first**
- **Start with small amounts**
- **Monitor performance closely**
- **Ensure compliance with local regulations**

### Technical Warnings
- **API Security**: Proper API key management required
- **Backup**: Implement proper backup procedures
- **Monitoring**: Set up alerts and monitoring
- **Testing**: Thorough testing before live trading

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

### Troubleshooting
- Check the [Setup Guide](./docs/SETUP_AND_STARTUP.md)
- Review error logs
- Verify configuration
- Test individual components

### Common Issues
- **Port conflicts**: Use `pnpm dev --port 3001`
- **API errors**: Check API key permissions
- **Database issues**: Verify Supabase configuration
- **Build errors**: Clear cache and reinstall dependencies

---

## 🎯 Quick Commands

```bash
# Start development
pnpm dev

# Check status
curl http://localhost:3000/api/trading/status

# View logs
tail -f logs/app.log

# Health check
curl http://localhost:3000/api/database/stats?type=health
```

---

**QuantumTrade Pro** - Professional cryptocurrency trading automation platform.

*Built with Next.js, TypeScript, Tailwind CSS, and Supabase.* 