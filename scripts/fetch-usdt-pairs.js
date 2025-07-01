#!/usr/bin/env node

/**
 * Script to fetch all USDT pairs from Binance
 * Usage: node scripts/fetch-usdt-pairs.js [options]
 * 
 * Options:
 * --all: Get all USDT pairs
 * --volume <minVolume>: Get pairs with minimum volume
 * --top <limit>: Get top pairs by volume
 * --search <term>: Search pairs by symbol or base asset
 * --export: Export results to CSV
 */

const https = require('https');

class BinanceAPI {
  constructor() {
    this.baseURL = "https://fapi.binance.com";
  }

  async makeRequest(endpoint) {
    return new Promise((resolve, reject) => {
      const url = `${this.baseURL}${endpoint}`;
      
      https.get(url, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          try {
            const jsonData = JSON.parse(data);
            resolve(jsonData);
          } catch (error) {
            reject(error);
          }
        });
      }).on('error', (error) => {
        reject(error);
      });
    });
  }

  async getExchangeInfo() {
    return this.makeRequest("/fapi/v1/exchangeInfo");
  }

  async get24hrTicker() {
    return this.makeRequest("/fapi/v1/ticker/24hr");
  }

  async getAllUSDTPairs() {
    try {
      const exchangeInfo = await this.getExchangeInfo();
      
      const usdtPairs = exchangeInfo.symbols
        .filter((symbol) => 
          symbol.quoteAsset === "USDT" && 
          symbol.status === "TRADING"
        )
        .map((symbol) => {
          const lotSizeFilter = symbol.filters.find((filter) => filter.filterType === "LOT_SIZE");
          const minNotionalFilter = symbol.filters.find((filter) => filter.filterType === "MIN_NOTIONAL");
          
          return {
            symbol: symbol.symbol,
            baseAsset: symbol.baseAsset,
            quoteAsset: symbol.quoteAsset,
            status: symbol.status,
            pricePrecision: symbol.pricePrecision,
            quantityPrecision: symbol.quantityPrecision,
            minQty: lotSizeFilter?.minQty || "0",
            maxQty: lotSizeFilter?.maxQty || "0",
            stepSize: lotSizeFilter?.stepSize || "0",
            minNotional: minNotionalFilter?.notional || "0"
          };
        });

      return usdtPairs;
    } catch (error) {
      console.error("Error fetching USDT pairs:", error);
      throw error;
    }
  }

  async getUSDTPairsWithVolume(minVolume = 1000000) {
    try {
      const [usdtPairs, tickerData] = await Promise.all([
        this.getAllUSDTPairs(),
        this.get24hrTicker()
      ]);

      const volumeMap = new Map();
      tickerData.forEach((ticker) => {
        volumeMap.set(ticker.symbol, parseFloat(ticker.volume));
      });

      return usdtPairs
        .map(pair => ({
          ...pair,
          volume: volumeMap.get(pair.symbol) || 0
        }))
        .filter(pair => pair.volume >= minVolume)
        .sort((a, b) => b.volume - a.volume);
    } catch (error) {
      console.error("Error fetching USDT pairs with volume:", error);
      throw error;
    }
  }

  async getTopUSDTPairsByVolume(limit = 50) {
    try {
      const [usdtPairs, tickerData] = await Promise.all([
        this.getAllUSDTPairs(),
        this.get24hrTicker()
      ]);

      const volumeMap = new Map();
      tickerData.forEach((ticker) => {
        volumeMap.set(ticker.symbol, parseFloat(ticker.volume));
      });

      return usdtPairs
        .map(pair => ({
          ...pair,
          volume: volumeMap.get(pair.symbol) || 0
        }))
        .sort((a, b) => b.volume - a.volume)
        .slice(0, limit);
    } catch (error) {
      console.error("Error fetching top USDT pairs by volume:", error);
      throw error;
    }
  }
}

function formatVolume(volume) {
  if (volume >= 1e9) return `${(volume / 1e9).toFixed(2)}B`;
  if (volume >= 1e6) return `${(volume / 1e6).toFixed(2)}M`;
  if (volume >= 1e3) return `${(volume / 1e3).toFixed(2)}K`;
  return volume.toFixed(0);
}

function exportToCSV(pairs, filename = "usdt-pairs.csv") {
  const fs = require('fs');
  const csvContent = [
    "Symbol,Base Asset,Quote Asset,Status,Price Precision,Quantity Precision,Min Qty,Max Qty,Step Size,Min Notional,Volume",
    ...pairs.map(pair => 
      `${pair.symbol},${pair.baseAsset},${pair.quoteAsset},${pair.status},${pair.pricePrecision},${pair.quantityPrecision},${pair.minQty},${pair.maxQty},${pair.stepSize},${pair.minNotional},${pair.volume || 0}`
    )
  ].join("\n");

  fs.writeFileSync(filename, csvContent);
  console.log(`✅ Exported ${pairs.length} pairs to ${filename}`);
}

function displayPairs(pairs, title) {
  console.log(`\n📊 ${title} (${pairs.length} pairs)`);
  console.log("=".repeat(80));
  
  if (pairs.length === 0) {
    console.log("No pairs found matching criteria.");
    return;
  }

  // Display table header
  console.log(`${"Symbol".padEnd(12)} ${"Base Asset".padEnd(12)} ${"Status".padEnd(8)} ${"Min Qty".padEnd(10)} ${"Volume (24h)".padEnd(15)}`);
  console.log("-".repeat(80));

  // Display pairs
  pairs.slice(0, 20).forEach(pair => {
    const volume = pair.volume ? formatVolume(pair.volume) : "N/A";
    console.log(
      `${pair.symbol.padEnd(12)} ${pair.baseAsset.padEnd(12)} ${pair.status.padEnd(8)} ${pair.minQty.padEnd(10)} ${volume.padEnd(15)}`
    );
  });

  if (pairs.length > 20) {
    console.log(`... and ${pairs.length - 20} more pairs`);
  }

  // Display statistics
  const totalVolume = pairs.reduce((sum, pair) => sum + (pair.volume || 0), 0);
  const avgVolume = totalVolume / pairs.length;
  
  console.log("\n📈 Statistics:");
  console.log(`Total Pairs: ${pairs.length}`);
  console.log(`Total Volume: ${formatVolume(totalVolume)} USDT`);
  console.log(`Average Volume: ${formatVolume(avgVolume)} USDT`);
}

async function main() {
  const args = process.argv.slice(2);
  const binanceAPI = new BinanceAPI();

  try {
    let pairs = [];
    let title = "";

    if (args.includes("--all") || args.length === 0) {
      pairs = await binanceAPI.getAllUSDTPairs();
      title = "All USDT Pairs";
    } else if (args.includes("--volume")) {
      const volumeIndex = args.indexOf("--volume");
      const minVolume = parseFloat(args[volumeIndex + 1]) || 1000000;
      pairs = await binanceAPI.getUSDTPairsWithVolume(minVolume);
      title = `USDT Pairs with Volume >= ${formatVolume(minVolume)}`;
    } else if (args.includes("--top")) {
      const topIndex = args.indexOf("--top");
      const limit = parseInt(args[topIndex + 1]) || 50;
      pairs = await binanceAPI.getTopUSDTPairsByVolume(limit);
      title = `Top ${limit} USDT Pairs by Volume`;
    } else if (args.includes("--search")) {
      const searchIndex = args.indexOf("--search");
      const searchTerm = args[searchIndex + 1];
      const allPairs = await binanceAPI.getAllUSDTPairs();
      pairs = allPairs.filter(pair =>
        pair.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
        pair.baseAsset.toLowerCase().includes(searchTerm.toLowerCase())
      );
      title = `USDT Pairs matching "${searchTerm}"`;
    }

    displayPairs(pairs, title);

    if (args.includes("--export")) {
      const filename = `usdt-pairs-${new Date().toISOString().split('T')[0]}.csv`;
      exportToCSV(pairs, filename);
    }

  } catch (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  }
}

// Show help if requested
if (process.argv.includes("--help") || process.argv.includes("-h")) {
  console.log(`
🔍 USDT Pairs Fetcher

Usage: node scripts/fetch-usdt-pairs.js [options]

Options:
  --all                    Get all USDT pairs (default)
  --volume <minVolume>     Get pairs with minimum volume (default: 1M)
  --top <limit>           Get top pairs by volume (default: 50)
  --search <term>         Search pairs by symbol or base asset
  --export                Export results to CSV file
  --help, -h              Show this help message

Examples:
  node scripts/fetch-usdt-pairs.js --all
  node scripts/fetch-usdt-pairs.js --volume 5000000
  node scripts/fetch-usdt-pairs.js --top 20
  node scripts/fetch-usdt-pairs.js --search BTC
  node scripts/fetch-usdt-pairs.js --top 100 --export
`);
  process.exit(0);
}

main(); 