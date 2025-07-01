# Database Integration Guide

## Overview

QuantumTrade Pro uses **Supabase** (PostgreSQL) as its primary database for storing trading data, bot activities, user settings, and performance metrics. This guide explains how the application integrates with the database.

## 🏗️ **Database Architecture**

### **Technology Stack**
- **Database**: PostgreSQL (via Supabase)
- **ORM**: Supabase Client (`@supabase/supabase-js`)
- **Connection**: Server-side with service role key
- **Schema**: Custom trading-focused schema

### **Environment Configuration**
```bash
# Required environment variables
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

## 📊 **Database Schema**

### **1. Trades Table**
Stores all executed trades with technical indicators.

```sql
CREATE TABLE trades (
    id SERIAL PRIMARY KEY,
    symbol VARCHAR(20) NOT NULL,
    side VARCHAR(10) NOT NULL,
    quantity DECIMAL(20, 8) NOT NULL,
    price VARCHAR(20) NOT NULL,
    confidence DECIMAL(3, 2),
    indicators JSONB,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Usage in Code:**
```typescript
// Log a trade execution
await this.supabase.from("trades").insert({
  symbol: trade.symbol,
  side: trade.side,
  quantity: trade.quantity,
  price: trade.price,
  confidence: trade.confidence,
  indicators: trade.indicators,
  timestamp: new Date().toISOString(),
})
```

### **2. Bot Activities Table**
Tracks all bot events and activities for monitoring and debugging.

```sql
CREATE TABLE bot_activities (
    id SERIAL PRIMARY KEY,
    type VARCHAR(50) NOT NULL,
    message TEXT NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Usage in Code:**
```typescript
// Log bot activity
await this.supabase.from("bot_activities").insert({
  type: "BOT_STARTED",
  message: "Trading bot activated",
  timestamp: new Date().toISOString(),
})
```

### **3. Market Data Table**
Caches market data for performance optimization.

```sql
CREATE TABLE market_data (
    id SERIAL PRIMARY KEY,
    symbol VARCHAR(20) NOT NULL,
    price DECIMAL(20, 8) NOT NULL,
    change_24h DECIMAL(10, 4),
    volume DECIMAL(20, 8),
    indicators JSONB,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### **4. User Settings Table**
Stores user preferences and configuration.

```sql
CREATE TABLE user_settings (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(100) NOT NULL UNIQUE,
    telegram_chat_id VARCHAR(50),
    trading_config JSONB,
    notifications_enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### **5. Risk Management Logs**
Tracks risk management events and alerts.

```sql
CREATE TABLE risk_logs (
    id SERIAL PRIMARY KEY,
    event_type VARCHAR(50) NOT NULL,
    symbol VARCHAR(20),
    risk_level VARCHAR(20),
    details JSONB,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### **6. Performance Metrics**
Daily performance tracking and analytics.

```sql
CREATE TABLE performance_metrics (
    id SERIAL PRIMARY KEY,
    date DATE NOT NULL,
    total_trades INTEGER DEFAULT 0,
    winning_trades INTEGER DEFAULT 0,
    total_pnl DECIMAL(20, 8) DEFAULT 0,
    max_drawdown DECIMAL(10, 4) DEFAULT 0,
    sharpe_ratio DECIMAL(10, 4),
    profit_factor DECIMAL(10, 4),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(date)
);
```

## 🔧 **Database Integration in Code**

### **1. Supabase Client Initialization**
```typescript
// lib/trading-bot.ts
import { createClient } from "@supabase/supabase-js"

class TradingBot {
  private supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}
```

### **2. Trade Logging**
```typescript
private async logTrade(trade: any) {
  try {
    await this.supabase.from("trades").insert({
      symbol: trade.symbol,
      side: trade.side,
      quantity: trade.quantity,
      price: trade.price,
      confidence: trade.confidence,
      indicators: trade.indicators,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("Error logging trade:", error)
  }
}
```

### **3. Activity Logging**
```typescript
private async logActivity(type: string, message: string) {
  try {
    await this.supabase.from("bot_activities").insert({
      type,
      message,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("Error logging activity:", error)
  }
}
```

## 📈 **Data Flow**

### **Trading Bot Data Flow**
```
1. Signal Generation → Technical Analysis
2. Trade Execution → Binance API
3. Trade Logging → Database (trades table)
4. Activity Logging → Database (bot_activities table)
5. Position Management → Real-time monitoring
6. Performance Tracking → Daily metrics calculation
```

### **Real-time Data Flow**
```
1. Market Data → Binance API
2. Data Processing → Technical Indicators
3. Signal Generation → Trading Logic
4. Trade Execution → Order Placement
5. Database Logging → Audit Trail
6. UI Updates → Real-time Dashboard
```

## 🔍 **Database Operations**

### **Insert Operations**
```typescript
// Insert trade
await supabase.from("trades").insert(tradeData)

// Insert activity
await supabase.from("bot_activities").insert(activityData)

// Insert market data
await supabase.from("market_data").insert(marketData)
```

### **Query Operations**
```typescript
// Get recent trades
const { data: trades } = await supabase
  .from("trades")
  .select("*")
  .order("timestamp", { ascending: false })
  .limit(100)

// Get bot activities by type
const { data: activities } = await supabase
  .from("bot_activities")
  .select("*")
  .eq("type", "TRADE_EXECUTED")
  .order("timestamp", { ascending: false })

// Get performance metrics
const { data: metrics } = await supabase
  .from("performance_metrics")
  .select("*")
  .order("date", { ascending: false })
  .limit(30)
```

### **Update Operations**
```typescript
// Update user settings
await supabase
  .from("user_settings")
  .update({ trading_config: newConfig })
  .eq("user_id", userId)

// Update performance metrics
await supabase
  .from("performance_metrics")
  .upsert({
    date: today,
    total_trades: totalTrades,
    winning_trades: winningTrades,
    total_pnl: totalPnl
  })
```

## 🎯 **Performance Optimization**

### **Indexes**
```sql
-- Performance indexes
CREATE INDEX idx_trades_symbol ON trades(symbol);
CREATE INDEX idx_trades_timestamp ON trades(timestamp);
CREATE INDEX idx_bot_activities_type ON bot_activities(type);
CREATE INDEX idx_bot_activities_timestamp ON bot_activities(timestamp);
CREATE INDEX idx_market_data_symbol ON market_data(symbol);
CREATE INDEX idx_market_data_timestamp ON market_data(timestamp);
CREATE INDEX idx_risk_logs_event_type ON risk_logs(event_type);
CREATE INDEX idx_risk_logs_timestamp ON risk_logs(timestamp);
CREATE INDEX idx_performance_metrics_date ON performance_metrics(date);
```

### **Triggers**
```sql
-- Automatic timestamp updates
CREATE TRIGGER update_user_settings_updated_at 
    BEFORE UPDATE ON user_settings 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

## 📊 **Analytics and Reporting**

### **Trade Analysis**
```typescript
// Get trading statistics
const getTradingStats = async () => {
  const { data: trades } = await supabase
    .from("trades")
    .select("*")
    .gte("timestamp", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())

  const stats = {
    totalTrades: trades?.length || 0,
    winningTrades: trades?.filter(t => t.side === "BUY").length || 0,
    totalVolume: trades?.reduce((sum, t) => sum + parseFloat(t.quantity), 0) || 0,
    avgConfidence: trades?.reduce((sum, t) => sum + t.confidence, 0) / (trades?.length || 1) || 0
  }

  return stats
}
```

### **Performance Metrics**
```typescript
// Calculate daily performance
const calculateDailyMetrics = async (date: string) => {
  const { data: trades } = await supabase
    .from("trades")
    .select("*")
    .gte("timestamp", `${date}T00:00:00Z`)
    .lt("timestamp", `${date}T23:59:59Z`)

  const metrics = {
    date,
    total_trades: trades?.length || 0,
    winning_trades: trades?.filter(t => t.side === "BUY").length || 0,
    total_pnl: calculateTotalPnL(trades),
    max_drawdown: calculateMaxDrawdown(trades),
    sharpe_ratio: calculateSharpeRatio(trades),
    profit_factor: calculateProfitFactor(trades)
  }

  await supabase.from("performance_metrics").upsert(metrics)
}
```

## 🔒 **Security and Access Control**

### **Service Role Key**
- Used for server-side operations
- Has full database access
- Should be kept secure
- Never exposed to client-side code

### **Row Level Security (RLS)**
```sql
-- Enable RLS on sensitive tables
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE trades ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view own settings" ON user_settings
    FOR SELECT USING (auth.uid()::text = user_id);

CREATE POLICY "Users can view own trades" ON trades
    FOR SELECT USING (auth.uid()::text = user_id);
```

## 🚀 **Database Setup**

### **1. Create Database Schema**
```bash
# Run the schema creation script
psql -h your-db-host -U your-username -d your-database -f scripts/create-database-schema.sql
```

### **2. Set Environment Variables**
```bash
# .env.local
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### **3. Initialize Database**
```typescript
// scripts/init-database.ts
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function initializeDatabase() {
  // Create initial user settings
  await supabase.from("user_settings").insert({
    user_id: "default",
    trading_config: {
      leverage: 5,
      riskPerTrade: 0.02,
      profitTarget: 30,
      stopLoss: 0.2,
      maxPositions: 3
    },
    notifications_enabled: true
  })

  console.log("Database initialized successfully")
}

initializeDatabase()
```

## 📈 **Monitoring and Maintenance**

### **Database Health Checks**
```typescript
// Check database connectivity
const checkDatabaseHealth = async () => {
  try {
    const { data, error } = await supabase
      .from("bot_activities")
      .select("count")
      .limit(1)
    
    if (error) throw error
    return { status: "healthy", timestamp: new Date() }
  } catch (error) {
    return { status: "unhealthy", error: error.message, timestamp: new Date() }
  }
}
```

### **Data Cleanup**
```sql
-- Clean up old market data (keep last 30 days)
DELETE FROM market_data 
WHERE timestamp < NOW() - INTERVAL '30 days';

-- Clean up old activities (keep last 90 days)
DELETE FROM bot_activities 
WHERE timestamp < NOW() - INTERVAL '90 days';
```

## 🔧 **Troubleshooting**

### **Common Issues**

1. **Connection Errors**
   ```typescript
   // Check environment variables
   console.log("SUPABASE_URL:", process.env.NEXT_PUBLIC_SUPABASE_URL)
   console.log("SERVICE_ROLE_KEY:", process.env.SUPABASE_SERVICE_ROLE_KEY ? "SET" : "NOT SET")
   ```

2. **Permission Errors**
   ```sql
   -- Check table permissions
   SELECT table_name, privilege_type 
   FROM information_schema.table_privileges 
   WHERE table_schema = 'public';
   ```

3. **Performance Issues**
   ```sql
   -- Check slow queries
   SELECT query, mean_time, calls 
   FROM pg_stat_statements 
   ORDER BY mean_time DESC 
   LIMIT 10;
   ```

## 📚 **Best Practices**

### **1. Error Handling**
```typescript
try {
  await supabase.from("trades").insert(tradeData)
} catch (error) {
  console.error("Database error:", error)
  // Implement fallback logic
}
```

### **2. Connection Pooling**
```typescript
// Use connection pooling for high-traffic applications
const supabase = createClient(url, key, {
  db: {
    pool: {
      min: 2,
      max: 10
    }
  }
})
```

### **3. Data Validation**
```typescript
// Validate data before insertion
const validateTradeData = (trade: any) => {
  if (!trade.symbol || !trade.side || !trade.quantity) {
    throw new Error("Invalid trade data")
  }
  return trade
}
```

### **4. Batch Operations**
```typescript
// Use batch operations for multiple inserts
const batchInsert = async (trades: any[]) => {
  const { data, error } = await supabase
    .from("trades")
    .insert(trades)
  
  if (error) throw error
  return data
}
```

---

## 📋 **Summary**

The QuantumTrade Pro database integration provides:

1. **Complete Audit Trail**: All trades and activities are logged
2. **Performance Tracking**: Daily metrics and analytics
3. **User Configuration**: Persistent settings and preferences
4. **Risk Management**: Comprehensive risk logging
5. **Real-time Data**: Market data caching for performance
6. **Scalability**: Optimized indexes and queries
7. **Security**: Row-level security and service role access
8. **Monitoring**: Health checks and maintenance tools

This database architecture supports the complete trading ecosystem with robust data persistence, analytics, and monitoring capabilities. 