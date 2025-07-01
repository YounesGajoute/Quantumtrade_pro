# USDT Pairs Management Guide

## Overview

This guide explains how to fetch and manage all USDT trading pairs from Binance using the QuantumTrade Pro platform.

## 🔧 **API Endpoints**

### **Get All USDT Pairs**
```typescript
GET /api/trading/symbols?type=all
```

**Response:**
```json
{
  "success": true,
  "count": 150,
  "type": "all",
  "filters": { "minVolume": 1000000, "limit": 50 },
  "symbols": [
    {
      "symbol": "BTCUSDT",
      "baseAsset": "BTC",
      "quoteAsset": "USDT",
      "status": "TRADING",
      "pricePrecision": 2,
      "quantityPrecision": 3,
      "minQty": "0.001",
      "maxQty": "1000",
      "stepSize": "0.001",
      "minNotional": "5"
    }
  ]
}
```

### **Get USDT Pairs with Volume Filter**
```typescript
GET /api/trading/symbols?type=volume&minVolume=5000000
```

### **Get Top USDT Pairs by Volume**
```typescript
GET /api/trading/symbols?type=top&limit=20
```

## 📊 **Available Methods**

### **1. getAllUSDTPairs()**
Fetches all available USDT trading pairs from Binance.

```typescript
import { getAllUSDTPairs, getUSDTPairsWithVolume, getTopUSDTPairsByVolume } from "@/lib/binance-api"

const pairs = await getAllUSDTPairs()
console.log(`Found ${pairs.length} USDT pairs`)
```

### **2. getUSDTPairsWithVolume(minVolume)**
Fetches USDT pairs that meet a minimum 24-hour volume requirement.

```typescript
// Get pairs with at least 5M USDT volume
const highVolumePairs = await getUSDTPairsWithVolume(5000000)
```

### **3. getTopUSDTPairsByVolume(limit)**
Fetches the top USDT pairs ranked by 24-hour volume.

```typescript
// Get top 20 pairs by volume
const topPairs = await getTopUSDTPairsByVolume(20)
```

## 🎯 **Data Structure**

Each USDT pair contains the following information:

```typescript
interface USDTPair {
  symbol: string           // Trading pair symbol (e.g., "BTCUSDT")
  baseAsset: string        // Base asset (e.g., "BTC")
  quoteAsset: string       // Quote asset (always "USDT")
  status: string           // Trading status ("TRADING", "BREAK", etc.)
  pricePrecision: number   // Number of decimal places for price
  quantityPrecision: number // Number of decimal places for quantity
  minQty: string          // Minimum order quantity
  maxQty: string          // Maximum order quantity
  stepSize: string        // Order quantity step size
  minNotional: string     // Minimum order value in USDT
  volume?: number         // 24-hour trading volume (if available)
}
```

## 🔍 **Filtering and Search**

### **Using SymbolsUtils Class**

```typescript
import { SymbolsUtils } from "@/lib/symbols-utils"

// Search pairs by symbol or base asset
const btcPairs = await SymbolsUtils.searchUSDTPairs("BTC")

// Get pairs by base asset
const ethPairs = await SymbolsUtils.getPairsByBaseAsset("ETH")

// Get only trading pairs
const tradingPairs = await SymbolsUtils.getPairsByStatus("TRADING")

// Filter with multiple criteria
const filteredPairs = SymbolsUtils.filterPairs(allPairs, {
  searchTerm: "BTC",
  minVolume: 1000000,
  status: "TRADING"
})
```

## 📈 **Volume Analysis**

### **Format Volume Display**
```typescript
import { SymbolsUtils } from "@/lib/symbols-utils"

const volume = 1500000000 // 1.5B
const formatted = SymbolsUtils.formatVolume(volume)
console.log(formatted) // "1.50B"
```

### **Get Statistics**
```typescript
const stats = SymbolsUtils.getPairsStatistics(pairs)
console.log(stats)
// {
//   totalPairs: 150,
//   tradingPairs: 145,
//   totalVolume: 50000000000,
//   avgVolume: 333333333.33,
//   volumeFormatted: "50.00B",
//   avgVolumeFormatted: "333.33M"
// }
```

## 📤 **Export Functionality**

### **Export to CSV**
```typescript
import { SymbolsUtils } from "@/lib/symbols-utils"

const pairs = await SymbolsUtils.getAllUSDTPairs()
SymbolsUtils.exportToCSV(pairs, "my-usdt-pairs.csv")
```

### **API Export**
```typescript
// The API automatically includes export functionality
// Use the --export flag in the command line script
node scripts/fetch-usdt-pairs.js --top 100 --export
```

## 🖥️ **UI Components**

### **USDTPairsManager Component**
A complete React component for managing USDT pairs with:
- Real-time data fetching
- Advanced filtering
- Search functionality
- Bulk selection
- CSV export
- Volume analysis

```typescript
import { USDTPairsManager } from "@/components/usdt-pairs-manager"

function MyPage() {
  return (
    <div>
      <USDTPairsManager />
    </div>
  )
}
```

## 🚀 **Command Line Usage**

### **Install and Run**
```bash
# Make script executable
chmod +x scripts/fetch-usdt-pairs.js

# Get all USDT pairs
node scripts/fetch-usdt-pairs.js --all

# Get pairs with minimum volume
node scripts/fetch-usdt-pairs.js --volume 5000000

# Get top 20 pairs by volume
node scripts/fetch-usdt-pairs.js --top 20

# Search for specific pairs
node scripts/fetch-usdt-pairs.js --search BTC

# Export to CSV
node scripts/fetch-usdt-pairs.js --top 100 --export
```

## 📊 **Example Use Cases**

### **1. Trading Bot Symbol Selection**
```typescript
// Get high-volume pairs for trading
const tradingPairs = await getUSDTPairsWithVolume(10000000)
const symbols = tradingPairs.map(pair => pair.symbol)

// Update trading bot configuration
await tradingBot.updateConfig({ symbols })
```

### **2. Market Analysis**
```typescript
// Get top pairs for market analysis
const topPairs = await getTopUSDTPairsByVolume(50)
const analysisData = topPairs.map(pair => ({
  symbol: pair.symbol,
  volume: pair.volume,
  volumeFormatted: SymbolsUtils.formatVolume(pair.volume || 0)
}))
```

### **3. Portfolio Diversification**
```typescript
// Get diverse set of pairs
const allPairs = await getAllUSDTPairs()
const diversePairs = allPairs
  .filter(pair => pair.status === "TRADING")
  .sort(() => Math.random() - 0.5)
  .slice(0, 10)
```

## ⚠️ **Important Notes**

### **Rate Limits**
- Binance API has rate limits
- Use caching for frequently accessed data
- Implement proper error handling

### **Data Freshness**
- Volume data is from 24-hour ticker
- Exchange info is updated periodically
- Consider implementing data caching

### **Error Handling**
```typescript
try {
  const pairs = await getAllUSDTPairs()
} catch (error) {
  console.error("Failed to fetch pairs:", error)
  // Implement fallback logic
}
```

## 🔧 **Configuration**

### **Environment Variables**
```bash
# Required for authenticated requests
BINANCE_API_KEY=your_api_key
BINANCE_API_SECRET=your_api_secret
```

### **Default Settings**
```typescript
const defaultConfig = {
  minVolume: 1000000,    // 1M USDT minimum volume
  limit: 50,             // Default limit for top pairs
  baseURL: "https://fapi.binance.com" // Binance Futures API
}
```

## 📚 **Related Documentation**

- [Trading Logic Analysis](./TRADING_LOGIC_ANALYSIS.md)
- [API Integration Guide](./API_INTEGRATION.md)
- [Risk Management](./RISK_MANAGEMENT.md)

---

*This guide covers the complete USDT pairs management functionality in QuantumTrade Pro.* 