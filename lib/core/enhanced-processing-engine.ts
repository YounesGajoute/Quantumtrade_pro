// Enhanced Processing Engine - Robust Scaling Solution
// Transforms from 10 symbols to 500+ symbols with multi-timeframe support

import { EventBus, EventType } from './event-bus'

// Core interfaces for enhanced processing
export interface TimeframeData {
  '1m': KlineData[]
  '5m': KlineData[]
  '15m': KlineData[]
  '1h': KlineData[]
}

export interface KlineData {
  openTime: number
  open: number
  high: number
  low: number
  close: number
  volume: number
  closeTime: number
  quoteVolume: number
  trades: number
  takerBuyBase: number
  takerBuyQuote: number
}

export interface ProcessedData {
  symbol: string
  timeframes: TimeframeData
  indicators: MultiTimeframeIndicators
  lastUpdate: number
  cacheSource: 'L1-Redis' | 'L2-TimescaleDB' | 'L3-Archive' | 'API'
}

export interface MultiTimeframeIndicators {
  '1m': IndicatorSuite
  '5m': IndicatorSuite
  '15m': IndicatorSuite
  '1h': IndicatorSuite
}

export interface IndicatorSuite {
  rsi: number
  macd: { macd: number; signal: number; histogram: number }
  bollinger: { upper: number; middle: number; lower: number; position: number }
  volume: { ratio: number; surge: boolean }
  atr: number
  stochastic: { k: number; d: number }
}

export interface APIRequest {
  symbol: string
  timeframe: string
  limit: number
  priority: 'high' | 'medium' | 'low'
  weight: number
}

export interface CachedData {
  data: any
  source: string
  hitTime: number
  ttl: number
}

export interface DataRetentionPolicy {
  timeframe: string
  hotStorage: string
  warmStorage: string
  coldStorage: string
  deleteAfter: string
}

// Performance targets for 500+ symbols
export interface PerformanceTargets {
  symbolCapacity: 500
  responseTime: '< 2 seconds'
  cacheHitRate: '> 95%'
  memoryUsage: '< 4GB'
  apiEfficiency: '> 95%'
  concurrentUsers: 100
  uptime: '99.9%'
}

// Data retention policies
const RETENTION_POLICIES: DataRetentionPolicy[] = [
  {
    timeframe: '1m',
    hotStorage: '6 hours',
    warmStorage: '7 days',
    coldStorage: '30 days',
    deleteAfter: '90 days'
  },
  {
    timeframe: '5m',
    hotStorage: '24 hours',
    warmStorage: '30 days',
    coldStorage: '6 months',
    deleteAfter: '2 years'
  },
  {
    timeframe: '15m',
    hotStorage: '3 days',
    warmStorage: '90 days',
    coldStorage: '1 year',
    deleteAfter: '5 years'
  },
  {
    timeframe: '1h',
    hotStorage: '7 days',
    warmStorage: '2 years',
    coldStorage: '10 years',
    deleteAfter: 'never'
  }
]

class EnhancedProcessingEngine {
  private eventBus: EventBus
  private symbolWorkers: Map<string, any> = new Map()
  private indicatorWorkers: Map<string, any> = new Map()
  private readonly MAX_PARALLEL_SYMBOLS = 50 // Increased from 10
  private readonly WORKER_COUNT = Math.max(4, navigator.hardwareConcurrency * 2)
  
  // Multi-tier cache management
  private L1Cache: Map<string, CachedData> = new Map() // Redis simulation
  private L2Cache: Map<string, CachedData> = new Map() // TimescaleDB simulation
  private L3Cache: Map<string, CachedData> = new Map() // S3 Archive simulation
  
  // Rate limiting and API management
  private requestQueue: APIRequest[] = []
  private usedWeight = 0
  private lastReset = Date.now()
  private readonly MAX_WEIGHT = 6000
  private readonly WEIGHT_RESET_INTERVAL = 60 * 1000 // 1 minute
  
  // Performance tracking
  private metrics = {
    symbolsProcessed: 0,
    cacheHits: { L1: 0, L2: 0, L3: 0 },
    apiCalls: 0,
    averageResponseTime: 0,
    memoryUsage: 0,
    lastUpdate: Date.now()
  }
  
  // Timeframe configuration
  private readonly TIMEFRAMES = ['1m', '5m', '15m', '1h'] as const
  private readonly KLINE_LIMITS = {
    '1m': 500,   // 8+ hours of data
    '5m': 288,   // 24 hours of data
    '15m': 96,   // 24 hours of data
    '1h': 168    // 7 days of data
  }

  constructor() {
    this.eventBus = EventBus.getInstance()
    this.initializeWorkers()
    this.startMetricsCollection()
  }

  private initializeWorkers(): void {
    console.log(`Initializing Enhanced Processing Engine with ${this.WORKER_COUNT} workers`)
    
    for (let i = 0; i < this.WORKER_COUNT; i++) {
      this.symbolWorkers.set(`symbol-worker-${i}`, {
        id: i,
        status: 'idle',
        currentTask: null,
        processedCount: 0
      })
      
      this.indicatorWorkers.set(`indicator-worker-${i}`, {
        id: i,
        status: 'idle',
        currentTask: null,
        processedCount: 0
      })
    }
  }

  async processSymbolsBatch(symbols: string[]): Promise<Map<string, ProcessedData>> {
    const startTime = performance.now()
    console.log(`Processing ${symbols.length} symbols with enhanced engine`)
    
    try {
      // Calculate optimal batch size based on API weight capacity
      const optimalBatchSize = this.calculateOptimalBatchSize()
      const symbolBatches = this.createIntelligentBatches(symbols, optimalBatchSize)
      
      // Process multiple batches in parallel
      const batchPromises = symbolBatches.map((batch, index) => 
        this.processSymbolBatch(batch, index)
      )
      
      const results = await Promise.allSettled(batchPromises)
      const aggregatedResults = this.aggregateResults(results)
      
      const totalTime = performance.now() - startTime
      this.updateMetrics(totalTime, symbols.length)
      
      console.log(`Enhanced engine processed ${symbols.length} symbols in ${totalTime.toFixed(2)}ms`)
      
      return aggregatedResults
      
    } catch (error) {
      console.error('Enhanced processing engine error:', error)
      throw error
    }
  }

  private calculateOptimalBatchSize(): number {
    const availableWeight = this.getAvailableAPIWeight()
    const avgSymbolWeight = 8 // 4 timeframes × 2 requests per timeframe
    const optimalSize = Math.min(
      Math.floor(availableWeight / avgSymbolWeight),
      this.MAX_PARALLEL_SYMBOLS
    )
    
    return Math.max(10, optimalSize) // Minimum batch size of 10
  }

  private getAvailableAPIWeight(): number {
    const now = Date.now()
    if (now - this.lastReset > this.WEIGHT_RESET_INTERVAL) {
      this.usedWeight = 0
      this.lastReset = now
    }
    
    return this.MAX_WEIGHT - this.usedWeight
  }

  private createIntelligentBatches(symbols: string[], batchSize: number): string[][] {
    const batches: string[][] = []
    
    for (let i = 0; i < symbols.length; i += batchSize) {
      batches.push(symbols.slice(i, i + batchSize))
    }
    
    return batches
  }

  private async processSymbolBatch(symbols: string[], batchIndex: number): Promise<Map<string, ProcessedData>> {
    const results = new Map<string, ProcessedData>()
    
    // Process symbols in parallel within the batch
    const symbolPromises = symbols.map(symbol => 
      this.processSingleSymbol(symbol)
    )
    
    const symbolResults = await Promise.allSettled(symbolPromises)
    
    symbolResults.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        const [symbol, data] = result.value
        results.set(symbol, data)
      } else {
        console.error(`Failed to process symbol ${symbols[index]}:`, result.reason)
      }
    })
    
    return results
  }

  private async processSingleSymbol(symbol: string): Promise<[string, ProcessedData]> {
    // Process all timeframes in parallel
    const timeframePromises = this.TIMEFRAMES.map(async (timeframe) => {
      const cached = await this.getCachedData(symbol, timeframe)
      
      if (this.isCacheValid(cached, timeframe)) {
        this.metrics.cacheHits.L1++
        return { timeframe, data: cached.data, source: 'L1-Redis' }
      }
      
      // Fetch fresh data from API
      const fresh = await this.fetchKlinesFromAPI(symbol, timeframe)
      await this.cacheData(symbol, timeframe, fresh)
      this.metrics.apiCalls++
      
      return { timeframe, data: fresh, source: 'API' }
    })

    const timeframeResults = await Promise.allSettled(timeframePromises)
    const timeframes = this.processTimeframeResults(timeframeResults)
    
    // Calculate indicators for all timeframes
    const indicators = await this.calculateMultiTimeframeIndicators(symbol, timeframes)
    
    const processedData: ProcessedData = {
      symbol,
      timeframes,
      indicators,
      lastUpdate: Date.now(),
      cacheSource: this.determineCacheSource(timeframeResults)
    }
    
    return [symbol, processedData]
  }

  private async getCachedData(symbol: string, timeframe: string): Promise<CachedData | null> {
    const key = this.buildCacheKey(symbol, timeframe)
    
    // Check L1 cache first (Redis simulation)
    const l1Data = this.L1Cache.get(key)
    if (l1Data && Date.now() - l1Data.hitTime < l1Data.ttl) {
      return l1Data
    }
    
    // Check L2 cache (TimescaleDB simulation)
    const l2Data = this.L2Cache.get(key)
    if (l2Data && Date.now() - l2Data.hitTime < l2Data.ttl) {
      // Promote to L1
      this.L1Cache.set(key, { ...l2Data, hitTime: Date.now() })
      this.metrics.cacheHits.L2++
      return l2Data
    }
    
    // Check L3 cache (Archive simulation)
    const l3Data = this.L3Cache.get(key)
    if (l3Data && Date.now() - l3Data.hitTime < l3Data.ttl) {
      this.metrics.cacheHits.L3++
      return l3Data
    }
    
    return null
  }

  private isCacheValid(cached: CachedData | null, timeframe: string): boolean {
    if (!cached || !cached.data || cached.data.length === 0) return false
    
    const lastCandle = cached.data[cached.data.length - 1]
    const now = Date.now()
    const timeframeMs = this.getTimeframeMs(timeframe)
    
    // Cache valid if last candle is within current timeframe
    return (now - lastCandle.closeTime) < timeframeMs
  }

  private getTimeframeMs(timeframe: string): number {
    const multipliers = { '1m': 1, '5m': 5, '15m': 15, '1h': 60 }
    return multipliers[timeframe as keyof typeof multipliers] * 60 * 1000
  }

  private async fetchKlinesFromAPI(symbol: string, timeframe: string): Promise<KlineData[]> {
    const limit = this.KLINE_LIMITS[timeframe as keyof typeof this.KLINE_LIMITS]
    
    // Simulate API call with rate limiting
    await this.waitForAPIWeight(8) // 8 weight units per kline request
    
    // Generate sample kline data
    const klines: KlineData[] = []
    const now = Date.now()
    const timeframeMs = this.getTimeframeMs(timeframe)
    
    for (let i = limit - 1; i >= 0; i--) {
      const closeTime = now - (i * timeframeMs)
      const openTime = closeTime - timeframeMs
      
      const basePrice = 100 + Math.random() * 1000
      const volatility = 0.02
      
      const open = basePrice * (1 + (Math.random() - 0.5) * volatility)
      const high = open * (1 + Math.random() * volatility)
      const low = open * (1 - Math.random() * volatility)
      const close = (high + low) / 2
      const volume = 1000 + Math.random() * 10000
      
      klines.push({
        openTime,
        open,
        high,
        low,
        close,
        volume,
        closeTime,
        quoteVolume: volume * close,
        trades: 100 + Math.floor(Math.random() * 1000),
        takerBuyBase: volume * 0.6,
        takerBuyQuote: volume * close * 0.6
      })
    }
    
    return klines
  }

  private async waitForAPIWeight(weight: number): Promise<void> {
    while (this.usedWeight + weight > this.MAX_WEIGHT - 500) { // Leave 500 buffer
      await new Promise(resolve => setTimeout(resolve, 100))
    }
    
    this.usedWeight += weight
  }

  private async cacheData(symbol: string, timeframe: string, data: KlineData[]): Promise<void> {
    const key = this.buildCacheKey(symbol, timeframe)
    const policy = this.getRetentionPolicy(timeframe)
    
    const cachedData: CachedData = {
      data,
      source: 'API',
      hitTime: Date.now(),
      ttl: this.parseTimestring(policy.hotStorage)
    }
    
    // Always store in L1 for immediate access
    this.L1Cache.set(key, cachedData)
    
    // For important timeframes, also store in L2
    if (['5m', '15m', '1h'].includes(timeframe)) {
      this.L2Cache.set(key, {
        ...cachedData,
        ttl: this.parseTimestring(policy.warmStorage)
      })
    }
  }

  private buildCacheKey(symbol: string, timeframe: string): string {
    return `${symbol}:${timeframe}:klines`
  }

  private getRetentionPolicy(timeframe: string): DataRetentionPolicy {
    return RETENTION_POLICIES.find(p => p.timeframe === timeframe) || RETENTION_POLICIES[3]
  }

  private parseTimestring(timestring: string): number {
    const multipliers = {
      'hours': 60 * 60 * 1000,
      'days': 24 * 60 * 60 * 1000,
      'months': 30 * 24 * 60 * 60 * 1000,
      'years': 365 * 24 * 60 * 60 * 1000
    }
    
    const match = timestring.match(/(\d+)\s*(hours?|days?|months?|years?)/)
    if (match) {
      const value = parseInt(match[1])
      const unit = match[2].replace(/s$/, '') as keyof typeof multipliers
      return value * multipliers[unit]
    }
    
    return 24 * 60 * 60 * 1000 // Default to 1 day
  }

  private processTimeframeResults(results: PromiseSettledResult<any>[]): TimeframeData {
    const timeframes: TimeframeData = {
      '1m': [],
      '5m': [],
      '15m': [],
      '1h': []
    }
    
    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        const timeframe = this.TIMEFRAMES[index]
        timeframes[timeframe] = result.value.data
      }
    })
    
    return timeframes
  }

  private async calculateMultiTimeframeIndicators(
    symbol: string, 
    timeframes: TimeframeData
  ): Promise<MultiTimeframeIndicators> {
    const indicators: MultiTimeframeIndicators = {
      '1m': await this.calculateIndicators(timeframes['1m']),
      '5m': await this.calculateIndicators(timeframes['5m']),
      '15m': await this.calculateIndicators(timeframes['15m']),
      '1h': await this.calculateIndicators(timeframes['1h'])
    }
    
    return indicators
  }

  private async calculateIndicators(klines: KlineData[]): Promise<IndicatorSuite> {
    if (klines.length < 26) {
      return this.getDefaultIndicators()
    }
    
    const closes = klines.map(k => k.close)
    const volumes = klines.map(k => k.volume)
    
    const rsi = this.calculateRSI(closes, 14)
    const macd = this.calculateMACD(closes)
    const bollinger = this.calculateBollingerBands(closes, 20)
    const volume = this.calculateVolumeIndicators(volumes)
    const atr = this.calculateATR(klines, 14)
    const stochastic = this.calculateStochastic(klines, 14)
    
    return {
      rsi,
      macd,
      bollinger,
      volume,
      atr,
      stochastic
    }
  }

  private calculateRSI(prices: number[], period: number): number {
    if (prices.length < period + 1) return 50
    
    const gains: number[] = []
    const losses: number[] = []
    
    for (let i = 1; i < prices.length; i++) {
      const change = prices[i] - prices[i - 1]
      gains.push(change > 0 ? change : 0)
      losses.push(change < 0 ? -change : 0)
    }
    
    const avgGain = gains.slice(-period).reduce((a, b) => a + b, 0) / period
    const avgLoss = losses.slice(-period).reduce((a, b) => a + b, 0) / period
    
    if (avgLoss === 0) return 100
    
    const rs = avgGain / avgLoss
    return 100 - (100 / (1 + rs))
  }

  private calculateMACD(prices: number[]): { macd: number; signal: number; histogram: number } {
    const ema12 = this.calculateEMA(prices, 12)
    const ema26 = this.calculateEMA(prices, 26)
    const macd = ema12 - ema26
    const signal = macd * 0.9 // Simplified signal line
    const histogram = macd - signal
    
    return { macd, signal, histogram }
  }

  private calculateEMA(prices: number[], period: number): number {
    if (prices.length < period) return prices[prices.length - 1]
    
    const multiplier = 2 / (period + 1)
    let ema = prices[0]
    
    for (let i = 1; i < prices.length; i++) {
      ema = (prices[i] * multiplier) + (ema * (1 - multiplier))
    }
    
    return ema
  }

  private calculateBollingerBands(prices: number[], period: number): { upper: number; middle: number; lower: number; position: number } {
    if (prices.length < period) {
      return { upper: 0, middle: 0, lower: 0, position: 50 }
    }
    
    const recentPrices = prices.slice(-period)
    const sma = recentPrices.reduce((a, b) => a + b, 0) / period
    
    const variance = recentPrices.reduce((sum, price) => {
      return sum + Math.pow(price - sma, 2)
    }, 0) / period
    
    const standardDeviation = Math.sqrt(variance)
    const upper = sma + (2 * standardDeviation)
    const lower = sma - (2 * standardDeviation)
    
    const currentPrice = prices[prices.length - 1]
    const position = ((currentPrice - lower) / (upper - lower)) * 100
    
    return { upper, middle: sma, lower, position }
  }

  private calculateVolumeIndicators(volumes: number[]): { ratio: number; surge: boolean } {
    if (volumes.length < 20) {
      return { ratio: 1, surge: false }
    }
    
    const recentVolume = volumes[volumes.length - 1]
    const avgVolume = volumes.slice(-20).reduce((a, b) => a + b, 0) / 20
    const ratio = recentVolume / avgVolume
    const surge = ratio > 2
    
    return { ratio, surge }
  }

  private calculateATR(klines: KlineData[], period: number): number {
    if (klines.length < period + 1) return 0
    
    const trueRanges: number[] = []
    
    for (let i = 1; i < klines.length; i++) {
      const high = klines[i].high
      const low = klines[i].low
      const prevClose = klines[i - 1].close
      
      const tr = Math.max(
        high - low,
        Math.abs(high - prevClose),
        Math.abs(low - prevClose)
      )
      trueRanges.push(tr)
    }
    
    return trueRanges.slice(-period).reduce((a, b) => a + b, 0) / period
  }

  private calculateStochastic(klines: KlineData[], period: number): { k: number; d: number } {
    if (klines.length < period) {
      return { k: 50, d: 50 }
    }
    
    const recentKlines = klines.slice(-period)
    const highest = Math.max(...recentKlines.map(k => k.high))
    const lowest = Math.min(...recentKlines.map(k => k.low))
    const current = recentKlines[recentKlines.length - 1].close
    
    const k = ((current - lowest) / (highest - lowest)) * 100
    const d = k * 0.8 // Simplified %D calculation
    
    return { k, d }
  }

  private getDefaultIndicators(): IndicatorSuite {
    return {
      rsi: 50,
      macd: { macd: 0, signal: 0, histogram: 0 },
      bollinger: { upper: 0, middle: 0, lower: 0, position: 50 },
      volume: { ratio: 1, surge: false },
      atr: 0,
      stochastic: { k: 50, d: 50 }
    }
  }

  private determineCacheSource(results: PromiseSettledResult<any>[]): ProcessedData['cacheSource'] {
    const sources = results.map(r => r.status === 'fulfilled' ? r.value.source : 'API')
    
    if (sources.every(s => s === 'L1-Redis')) return 'L1-Redis'
    if (sources.some(s => s === 'L2-TimescaleDB')) return 'L2-TimescaleDB'
    if (sources.some(s => s === 'L3-Archive')) return 'L3-Archive'
    return 'API'
  }

  private aggregateResults(results: PromiseSettledResult<Map<string, ProcessedData>>[]): Map<string, ProcessedData> {
    const aggregated = new Map<string, ProcessedData>()
    
    results.forEach(result => {
      if (result.status === 'fulfilled') {
        result.value.forEach((data, symbol) => {
          aggregated.set(symbol, data)
        })
      }
    })
    
    return aggregated
  }

  private updateMetrics(totalTime: number, symbolCount: number): void {
    this.metrics.symbolsProcessed += symbolCount
    this.metrics.averageResponseTime = (this.metrics.averageResponseTime + totalTime) / 2
    this.metrics.lastUpdate = Date.now()
    
    // Calculate memory usage (simplified)
    this.metrics.memoryUsage = this.L1Cache.size + this.L2Cache.size + this.L3Cache.size
  }

  private startMetricsCollection(): void {
    setInterval(() => {
      this.eventBus.emit(EventType.ENHANCED_METRICS_UPDATED, this.metrics)
    }, 5000) // Update every 5 seconds
  }

  getMetrics() {
    return { ...this.metrics }
  }

  getCacheStats() {
    return {
      L1: this.L1Cache.size,
      L2: this.L2Cache.size,
      L3: this.L3Cache.size,
      total: this.L1Cache.size + this.L2Cache.size + this.L3Cache.size
    }
  }

  getAPIStats() {
    return {
      usedWeight: this.usedWeight,
      maxWeight: this.MAX_WEIGHT,
      efficiency: ((this.MAX_WEIGHT - this.usedWeight) / this.MAX_WEIGHT) * 100,
      resetTime: this.lastReset + this.WEIGHT_RESET_INTERVAL
    }
  }
}

// Singleton instance
const enhancedProcessingEngine = new EnhancedProcessingEngine()

export default enhancedProcessingEngine
export { 
  EnhancedProcessingEngine, 
  type TimeframeData, 
  type ProcessedData, 
  type MultiTimeframeIndicators,
  type KlineData,
  type IndicatorSuite,
  type PerformanceTargets,
  type DataRetentionPolicy
} 