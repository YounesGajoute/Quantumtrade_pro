import { getKlines, get24hrTicker } from './binance-api'
import { calculateAllIndicators, calculateIndicatorsFromTicker, klineToOHLCV, type KlineData, type OHLCV, type TechnicalIndicatorsData } from './technical-indicators'

// Data storage interfaces
export interface MarketDataPoint {
  symbol: string
  timestamp: number
  price: number
  volume: number
  change24h: number
  indicators: TechnicalIndicatorsData
  klines: KlineData[]
}

export interface CachedMarketData {
  [symbol: string]: {
    data: MarketDataPoint
    lastUpdated: number
    cacheExpiry: number
  }
}

export interface DataFlowMetrics {
  totalSymbols: number
  symbolsWithIndicators: number
  averageCalculationTime: number
  lastUpdateTime: number
  errors: string[]
}

class DataService {
  private cache: CachedMarketData = {}
  private readonly CACHE_DURATION = 5 * 60 * 1000 // 5 minutes
  private readonly KLINES_LIMIT = 100 // Historical data for indicators
  private readonly UPDATE_INTERVAL = 30 * 1000 // 30 seconds
  private metrics: DataFlowMetrics = {
    totalSymbols: 0,
    symbolsWithIndicators: 0,
    averageCalculationTime: 0,
    lastUpdateTime: 0,
    errors: []
  }
  private isUpdating = false
  private updateTimer?: NodeJS.Timeout

  /**
   * Main data flow orchestration
   */
  async startDataFlow(symbols: string[]): Promise<void> {
    if (this.isUpdating) {
      console.log('Data flow already in progress')
      return
    }

    this.isUpdating = true
    this.metrics.totalSymbols = symbols.length
    this.metrics.symbolsWithIndicators = 0 // Reset counter
    this.metrics.errors = [] // Clear previous errors
    this.metrics.lastUpdateTime = Date.now()

    try {
      console.log(`Starting data flow for ${symbols.length} symbols`)
      
      // Step 1: Fetch market data in batches
      const marketData = await this.fetchMarketDataBatch(symbols)
      
      // Step 2: Fetch historical klines for technical analysis
      const enrichedData = await this.enrichWithHistoricalData(marketData)
      
      // Step 3: Calculate technical indicators
      const dataWithIndicators = await this.calculateIndicatorsBatch(enrichedData)
      
      // Step 4: Cache and store results
      await this.cacheResults(dataWithIndicators)
      
      console.log(`Data flow completed: ${this.metrics.symbolsWithIndicators}/${this.metrics.totalSymbols} symbols processed`)
      
    } catch (error) {
      console.error('Data flow error:', error)
      this.metrics.errors.push(error instanceof Error ? error.message : 'Unknown error')
    } finally {
      this.isUpdating = false
    }
  }

  /**
   * Step 1: Fetch current market data efficiently
   */
  private async fetchMarketDataBatch(symbols: string[]): Promise<Map<string, any>> {
    console.log('Fetching market data...')
    const startTime = Date.now()
    
    try {
      // Fetch all 24hr ticker data in one API call
      const tickerData = await get24hrTicker()
      
      console.log('Raw ticker data sample:', tickerData[0])
      
      // Filter and map to our symbols
      const marketDataMap = new Map<string, any>()
      
      for (const symbol of symbols) {
        const ticker = tickerData.find((item: any) => item.symbol === symbol)
        if (ticker) {
          // Try different possible price field names
          const tickerAny = ticker as any
          const price = parseFloat(tickerAny.lastPrice || tickerAny.price || '0')
          const volume = parseFloat(ticker.volume)
          const change24h = parseFloat(ticker.priceChangePercent)
          
          console.log(`Processing ${symbol}:`, { 
            price, 
            volume, 
            change24h,
            tickerKeys: Object.keys(ticker),
            lastPrice: tickerAny.lastPrice,
            priceField: tickerAny.price
          })
          
          marketDataMap.set(symbol, {
            symbol: ticker.symbol,
            price: price,
            volume: volume,
            change24h: change24h,
            timestamp: Date.now()
          })
        }
      }
      
      console.log(`Fetched market data for ${marketDataMap.size} symbols in ${Date.now() - startTime}ms`)
      return marketDataMap
      
    } catch (error) {
      console.error('Error fetching market data:', error)
      throw error
    }
  }

  /**
   * Step 2: Enrich with historical klines for technical analysis
   */
  private async enrichWithHistoricalData(marketData: Map<string, any>): Promise<Map<string, any>> {
    console.log('Enriching with historical data...')
    const startTime = Date.now()
    
    const enrichedData = new Map<string, any>()
    const batchSize = 10 // Process in batches to avoid rate limits
    const symbols = Array.from(marketData.keys())
    
    for (let i = 0; i < symbols.length; i += batchSize) {
      const batch = symbols.slice(i, i + batchSize)
      
      // Process batch concurrently
      const batchPromises = batch.map(async (symbol) => {
        try {
          const klines = await getKlines(symbol, '1h', this.KLINES_LIMIT)
          const marketInfo = marketData.get(symbol)
          
          return {
            symbol,
            ...marketInfo,
            klines
          }
        } catch (error) {
          console.warn(`Failed to fetch klines for ${symbol}:`, error)
          return {
            symbol,
            ...marketData.get(symbol),
            klines: []
          }
        }
      })
      
      const batchResults = await Promise.all(batchPromises)
      
      for (const result of batchResults) {
        if (result.klines.length > 0) {
          enrichedData.set(result.symbol, result)
        }
      }
      
      // Rate limiting delay between batches
      if (i + batchSize < symbols.length) {
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
    }
    
    console.log(`Enriched ${enrichedData.size} symbols with historical data in ${Date.now() - startTime}ms`)
    return enrichedData
  }

  /**
   * Step 3: Calculate technical indicators efficiently
   */
  private async calculateIndicatorsBatch(enrichedData: Map<string, any>): Promise<MarketDataPoint[]> {
    console.log('Calculating technical indicators...')
    const startTime = Date.now()
    const calculationTimes: number[] = []
    
    const results: MarketDataPoint[] = []
    
    for (const [symbol, data] of enrichedData) {
      const calcStartTime = Date.now()
      
      try {
        if (data.klines.length >= 30) { // Minimum required for indicators
          const indicators = calculateAllIndicators(data.klines)
          
          results.push({
            symbol: data.symbol,
            timestamp: data.timestamp,
            price: data.price,
            volume: data.volume,
            change24h: data.change24h,
            indicators,
            klines: data.klines
          })
          
          this.metrics.symbolsWithIndicators++
        } else {
          console.warn(`Insufficient klines for ${symbol}: ${data.klines.length}, using ticker-based indicators`)
          
          // Fallback to ticker-based indicators when klines are insufficient
          const tickerIndicators = calculateIndicatorsFromTicker({
            priceChangePercent: data.change24h.toString(),
            volume: data.volume.toString(),
            lastPrice: data.price.toString()
          })
          
          // Convert to full indicators structure
          const indicators = {
            rsi: tickerIndicators.rsi,
            macd: {
              macd: tickerIndicators.macd,
              signal: tickerIndicators.macd * 0.9, // Approximate signal line
              histogram: tickerIndicators.macd * 0.1 // Approximate histogram
            },
            bollinger: {
              upper: data.price * 1.02,
              middle: data.price,
              lower: data.price * 0.98,
              position: tickerIndicators.bollinger
            },
            volume: {
              average: data.volume,
              current: data.volume,
              ratio: tickerIndicators.volume
            }
          }
          
          results.push({
            symbol: data.symbol,
            timestamp: data.timestamp,
            price: data.price,
            volume: data.volume,
            change24h: data.change24h,
            indicators,
            klines: data.klines
          })
          
          this.metrics.symbolsWithIndicators++
        }
        
        calculationTimes.push(Date.now() - calcStartTime)
        
      } catch (error) {
        console.error(`Error calculating indicators for ${symbol}:`, error)
        this.metrics.errors.push(`Indicator calculation failed for ${symbol}`)
      }
    }
    
    // Update metrics
    if (calculationTimes.length > 0) {
      this.metrics.averageCalculationTime = calculationTimes.reduce((a, b) => a + b, 0) / calculationTimes.length
    }
    
    console.log(`Calculated indicators for ${results.length} symbols in ${Date.now() - startTime}ms`)
    return results
  }

  /**
   * Step 4: Cache results with proper expiration
   */
  private async cacheResults(dataPoints: MarketDataPoint[]): Promise<void> {
    console.log('Caching results...')
    const startTime = Date.now()
    
    const now = Date.now()
    const expiry = now + this.CACHE_DURATION
    
    for (const dataPoint of dataPoints) {
      this.cache[dataPoint.symbol] = {
        data: dataPoint,
        lastUpdated: now,
        cacheExpiry: expiry
      }
    }
    
    console.log(`Cached ${dataPoints.length} data points in ${Date.now() - startTime}ms`)
    console.log('Cache contents after caching:', Object.keys(this.cache))
    
    // Clean expired cache entries (but not the ones we just added)
    this.cleanExpiredCache()
  }

  /**
   * Get cached market data for dashboard
   */
  getMarketData(symbols?: string[]): MarketDataPoint[] {
    const now = Date.now()
    const results: MarketDataPoint[] = []
    
    const targetSymbols = symbols || Object.keys(this.cache)
    
    console.log('getMarketData called:', {
      requestedSymbols: symbols?.length || 'all',
      cacheKeys: Object.keys(this.cache),
      targetSymbols: targetSymbols.length
    })
    
    for (const symbol of targetSymbols) {
      const cached = this.cache[symbol]
      if (cached && now < cached.cacheExpiry) {
        results.push(cached.data)
      } else {
        console.log(`Cache miss for ${symbol}:`, {
          hasCached: !!cached,
          isExpired: cached ? now >= cached.cacheExpiry : 'no cache',
          now,
          expiry: cached?.cacheExpiry
        })
      }
    }
    
    console.log(`getMarketData returning ${results.length} results`)
    return results.sort((a, b) => b.volume - a.volume) // Sort by volume
  }

  /**
   * Get data for specific symbol
   */
  getSymbolData(symbol: string): MarketDataPoint | null {
    const cached = this.cache[symbol]
    if (cached && Date.now() < cached.cacheExpiry) {
      return cached.data
    }
    return null
  }

  /**
   * Get data flow metrics
   */
  getMetrics(): DataFlowMetrics {
    return { ...this.metrics }
  }

  /**
   * Start continuous data flow updates
   */
  startContinuousUpdates(symbols: string[]): void {
    if (this.updateTimer) {
      clearInterval(this.updateTimer)
    }
    
    // Initial update
    this.startDataFlow(symbols)
    
    // Set up periodic updates
    this.updateTimer = setInterval(() => {
      this.startDataFlow(symbols)
    }, this.UPDATE_INTERVAL)
    
    console.log(`Started continuous updates every ${this.UPDATE_INTERVAL / 1000}s`)
  }

  /**
   * Stop continuous updates
   */
  stopContinuousUpdates(): void {
    if (this.updateTimer) {
      clearInterval(this.updateTimer)
      this.updateTimer = undefined
      console.log('Stopped continuous updates')
    }
  }

  /**
   * Clean expired cache entries
   */
  private cleanExpiredCache(): void {
    const now = Date.now()
    const expiredSymbols = Object.keys(this.cache).filter(
      symbol => now >= this.cache[symbol].cacheExpiry
    )
    
    for (const symbol of expiredSymbols) {
      delete this.cache[symbol]
    }
    
    if (expiredSymbols.length > 0) {
      console.log(`Cleaned ${expiredSymbols.length} expired cache entries`)
    }
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    totalEntries: number
    validEntries: number
    expiredEntries: number
    memoryUsage: number
  } {
    const now = Date.now()
    let validEntries = 0
    let expiredEntries = 0
    
    for (const symbol of Object.keys(this.cache)) {
      if (now < this.cache[symbol].cacheExpiry) {
        validEntries++
      } else {
        expiredEntries++
      }
    }
    
    return {
      totalEntries: Object.keys(this.cache).length,
      validEntries,
      expiredEntries,
      memoryUsage: JSON.stringify(this.cache).length
    }
  }
}

// Singleton instance
const dataService = new DataService()

// Export functions for external use
export async function startDataFlow(symbols: string[]): Promise<void> {
  return dataService.startDataFlow(symbols)
}

export function getMarketData(symbols?: string[]): MarketDataPoint[] {
  return dataService.getMarketData(symbols)
}

export function getSymbolData(symbol: string): MarketDataPoint | null {
  return dataService.getSymbolData(symbol)
}

export function getDataFlowMetrics(): DataFlowMetrics {
  return dataService.getMetrics()
}

export function startContinuousUpdates(symbols: string[]): void {
  dataService.startContinuousUpdates(symbols)
}

export function stopContinuousUpdates(): void {
  dataService.stopContinuousUpdates()
}

export function getCacheStats() {
  return dataService.getCacheStats()
}

export default dataService 