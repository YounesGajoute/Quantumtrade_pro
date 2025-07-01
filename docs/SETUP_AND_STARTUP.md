# QuantumTrade Pro - Setup and Startup Guide

## 🚀 **Quick Start**

```bash
# 1. Clone the repository
git clone <repository-url>
cd quantumtrade_pro

# 2. Install dependencies
pnpm install

# 3. Set up environment variables
cp .env.example .env.local

# 4. Start development server
pnpm dev
```

## 📋 **Prerequisites**

### **System Requirements**
- **Node.js**: 18.0.0 or higher
- **pnpm**: 8.0.0 or higher (recommended) or npm 9.0.0+
- **Git**: Latest version
- **Operating System**: Windows, macOS, or Linux

### **Required Accounts**
- **Binance Account**: For API access
- **Supabase Account**: For database
- **Telegram Bot**: For notifications (optional)

## 🔧 **Step-by-Step Setup**

### **1. Environment Setup**

#### **Install Node.js**
```bash
# Using Node Version Manager (nvm) - Recommended
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 18
nvm use 18

# Or download from https://nodejs.org/
```

#### **Install pnpm**
```bash
# Using npm
npm install -g pnpm

# Using curl (macOS/Linux)
curl -fsSL https://get.pnpm.io/install.sh | sh -

# Using PowerShell (Windows)
iwr https://get.pnpm.io/install.ps1 -useb | iex
```

### **2. Project Setup**

#### **Clone Repository**
```bash
git clone <repository-url>
cd quantumtrade_pro
```

#### **Install Dependencies**
```bash
# Using pnpm (recommended)
pnpm install

# Using npm
npm install

# Using yarn
yarn install
```

### **3. Environment Configuration**

#### **Create Environment File**
```bash
cp .env.example .env.local
```

#### **Required Environment Variables**
```bash
# .env.local
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

### **4. External Service Setup**

#### **Binance API Setup**
1. **Create Binance Account**
   - Go to [Binance](https://www.binance.com)
   - Complete KYC verification
   - Enable Futures trading

2. **Generate API Keys**
   - Go to API Management
   - Create new API key
   - Enable Futures trading permissions
   - **Important**: Enable IP restrictions for security

3. **API Key Permissions**
   - ✅ Read Info
   - ✅ Futures Trading
   - ❌ Spot & Margin Trading (not needed)
   - ❌ Withdraw (not needed for security)

#### **Supabase Database Setup**
1. **Create Supabase Project**
   - Go to [Supabase](https://supabase.com)
   - Create new project
   - Note your project URL and API keys

2. **Set Up Database Schema**
   ```bash
   # Option 1: Using Supabase Dashboard
   # Go to SQL Editor and run the schema script
   
   # Option 2: Using psql
   psql -h your-db-host -U your-username -d your-database -f scripts/create-database-schema.sql
   ```

3. **Get API Keys**
   - Project URL: `https://your-project.supabase.co`
   - Service Role Key: Found in Settings > API

#### **Telegram Bot Setup (Optional)**
1. **Create Telegram Bot**
   - Message [@BotFather](https://t.me/botfather) on Telegram
   - Send `/newbot` command
   - Follow instructions to create bot
   - Save the bot token

2. **Get Chat ID**
   - Message your bot
   - Visit: `https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getUpdates`
   - Find your chat ID in the response

3. **Set Webhook (Optional)**
   ```bash
   curl -X POST "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook" \
        -H "Content-Type: application/json" \
        -d '{"url": "https://your-domain.com/api/telegram/webhook"}'
   ```

## 🚀 **Starting the Application**

### **Development Mode**
```bash
# Start development server
pnpm dev

# Or using npm
npm run dev

# Or using yarn
yarn dev
```

The application will be available at: `http://localhost:3000`

### **Production Build**
```bash
# Build the application
pnpm build

# Start production server
pnpm start
```

### **Available Scripts**
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

## 🔍 **Verification Steps**

### **1. Check Application Status**
```bash
# Visit the application
open http://localhost:3000

# Check API endpoints
curl http://localhost:3000/api/trading/status
curl http://localhost:3000/api/database/stats
```

### **2. Verify Database Connection**
```bash
# Check database health
curl http://localhost:3000/api/database/stats?type=health
```

### **3. Test Binance API**
```bash
# Test API connection (check logs)
# The trading bot will attempt to connect on startup
```

### **4. Test Telegram Bot (if configured)**
```bash
# Send message to your bot
# Should receive response with available commands
```

## 🛠️ **Configuration Options**

### **Trading Bot Configuration**
```typescript
// Default configuration in lib/trading-bot.ts
const config = {
  leverage: 5,                    // Trading leverage
  riskPerTrade: 0.02,            // 2% risk per trade
  profitTarget: 30,              // $30 USDT profit target
  stopLoss: 0.2,                 // 20% stop loss
  maxPositions: 3,               // Maximum concurrent positions
  minVolume: 1000000,            // Minimum 24h volume
  symbols: [                     // Trading pairs
    "BTCUSDT", "ETHUSDT", "BNBUSDT", "ADAUSDT", "SOLUSDT",
    "XRPUSDT", "DOTUSDT", "DOGEUSDT", "AVAXUSDT", "MATICUSDT"
  ]
}
```

### **Environment Variables Reference**
```bash
# Required
NEXT_PUBLIC_SUPABASE_URL=          # Supabase project URL
SUPABASE_SERVICE_ROLE_KEY=         # Supabase service role key
BINANCE_API_KEY=                   # Binance API key
BINANCE_API_SECRET=                # Binance API secret

# Optional
TELEGRAM_BOT_TOKEN=                # Telegram bot token
TELEGRAM_CHAT_ID=                  # Telegram chat ID
NEXT_PUBLIC_APP_URL=               # Application URL
NODE_ENV=                          # Environment (development/production)
```

## 🔧 **Development Tools**

### **VS Code Extensions (Recommended)**
```json
{
  "recommendations": [
    "bradlc.vscode-tailwindcss",
    "esbenp.prettier-vscode",
    "ms-vscode.vscode-typescript-next",
    "formulahendry.auto-rename-tag",
    "christian-kohler.path-intellisense",
    "ms-vscode.vscode-json"
  ]
}
```

### **VS Code Settings**
```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "typescript.preferences.importModuleSpecifier": "relative",
  "tailwindCSS.includeLanguages": {
    "typescript": "javascript",
    "typescriptreact": "javascript"
  }
}
```

## 🚨 **Troubleshooting**

### **Common Issues**

#### **1. Port Already in Use**
```bash
# Check what's using port 3000
lsof -i :3000

# Kill the process
kill -9 <PID>

# Or use different port
pnpm dev --port 3001
```

#### **2. Database Connection Issues**
```bash
# Check environment variables
echo $NEXT_PUBLIC_SUPABASE_URL
echo $SUPABASE_SERVICE_ROLE_KEY

# Test database connection
curl http://localhost:3000/api/database/stats?type=health
```

#### **3. Binance API Issues**
```bash
# Check API keys
echo $BINANCE_API_KEY
echo $BINANCE_API_SECRET

# Verify API permissions in Binance dashboard
# Ensure Futures trading is enabled
```

#### **4. Build Errors**
```bash
# Clear cache and reinstall
rm -rf node_modules .next
pnpm install
pnpm build
```

#### **5. TypeScript Errors**
```bash
# Check TypeScript configuration
npx tsc --noEmit

# Fix type issues or add type declarations
```

### **Logs and Debugging**
```bash
# View application logs
pnpm dev 2>&1 | tee app.log

# Check specific API endpoints
curl -v http://localhost:3000/api/trading/status

# Database queries (in Supabase dashboard)
SELECT * FROM trades ORDER BY timestamp DESC LIMIT 10;
```

## 📊 **Performance Optimization**

### **Development Performance**
```bash
# Use pnpm for faster installs
pnpm install

# Enable Next.js cache
export NEXT_TELEMETRY_DISABLED=1

# Use development optimizations
NODE_ENV=development pnpm dev
```

### **Production Performance**
```bash
# Build optimization
pnpm build

# Start with production optimizations
NODE_ENV=production pnpm start

# Monitor performance
curl http://localhost:3000/api/database/stats
```

## 🔒 **Security Considerations**

### **API Key Security**
- ✅ Use environment variables
- ✅ Enable IP restrictions on Binance API
- ✅ Use service role key for database
- ❌ Never commit API keys to git
- ❌ Don't expose keys in client-side code

### **Database Security**
- ✅ Enable Row Level Security (RLS)
- ✅ Use service role key for server operations
- ✅ Regular backups
- ✅ Monitor access logs

### **Application Security**
- ✅ HTTPS in production
- ✅ Input validation
- ✅ Rate limiting
- ✅ Error handling

## 📈 **Monitoring and Maintenance**

### **Health Checks**
```bash
# Application health
curl http://localhost:3000/api/database/stats?type=health

# Database health
curl http://localhost:3000/api/database/stats?type=performance

# Trading bot status
curl http://localhost:3000/api/trading/status
```

### **Regular Maintenance**
```bash
# Update dependencies
pnpm update

# Clean up old data
curl -X POST http://localhost:3000/api/database/cleanup

# Backup database (via Supabase dashboard)
```

## 🎯 **Next Steps**

### **After Setup**
1. **Configure Trading Parameters**
   - Adjust risk settings
   - Set trading pairs
   - Configure notifications

2. **Test with Paper Trading**
   - Start with small amounts
   - Monitor performance
   - Adjust strategies

3. **Set Up Monitoring**
   - Configure alerts
   - Set up logging
   - Monitor performance

4. **Production Deployment**
   - Set up hosting
   - Configure SSL
   - Set up monitoring

---

## 📞 **Support**

### **Documentation**
- [Trading Logic Analysis](./TRADING_LOGIC_ANALYSIS.md)
- [Database Integration](./DATABASE_INTEGRATION.md)
- [USDT Pairs Guide](./USDT_PAIRS_GUIDE.md)

### **Issues and Questions**
- Check troubleshooting section above
- Review error logs
- Test individual components
- Verify configuration

---

*This guide covers the complete setup and startup process for QuantumTrade Pro. Follow each step carefully to ensure proper configuration and operation.* 