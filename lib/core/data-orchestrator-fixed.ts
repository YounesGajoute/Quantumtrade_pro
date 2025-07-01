import { EventBus, EventType, MarketDataEvent, SystemEvent } from './event-bus'
import { filteringEngine } from './filtering-engine'
import { indicatorEngine } from './indicator-engine'
import { riskManager } from './risk-manager'
import { getKlines, get24hrTicker } from '../binance-api'
import { calculateAllIndicators, klineToOHLCV, type KlineData, type OHLCV, type TechnicalIndicatorsData } from '../technical-indicators'
import { Worker } from 'worker_threads'

// Enhanced interfaces for enterprise architecture
export interface MarketDataPoint {
  symbol: string
  timestamp: number
  price: number
  volume: number
  change24h: number
  indicators: TechnicalIndicatorsData
  klines: KlineData[]
  quality: 'HIGH' | 'MEDIUM' | 'LOW'
  confidence: number
  dataAge: number
  source: 'BINANCE' | 'CACHE' | 'FALLBACK'
}

export interface OrchestrationMetrics {
  totalSymbols: number
  symbolsWithIndicators: number
  averageCalculationTime: number
  lastUpdateTime: number
  errors: string[]
  marketRegime: string
  regimeConfidence: number
  workerPoolUtilization: number
  cacheHitRate: number
  apiEfficiency: number
  circuitBreakerStatus: 'CLOSED' | 'OPEN' | 'HALF_OPEN'
}

export interface MarketRegime {
  regime: 'TRENDING' | 'RANGING' | 'VOLATILE' | 'BREAKOUT'
  confidence: number
  volatilityLevel: 'LOW' | 'MEDIUM' | 'HIGH'
  correlationRegime: 'LOW' | 'MEDIUM' | 'HIGH'
  liquidityCondition: 'NORMAL' | 'STRESSED'
  timestamp: number
}

export interface WorkerPoolMetrics {
  activeWorkers: number
  totalWorkers: number
  queueDepth: number
  averageProcessingTime: number
  errorRate: number
  throughput: number
}

class DataOrchestrator {
  private eventBus: EventBus
  private filteringEngine: typeof filteringEngine
  private indicatorEngine: typeof indicatorEngine
  private riskManager: typeof riskManager
  
  // Enhanced caching with multi-tier support
  private l1Cache: Map<string, MarketDataPoint> = new Map() // Memory cache
  private l2Cache: Map<string, { data: MarketDataPoint; expiry: number }> = new Map() // Extended memory cache
  private workerPool: Map<string, Worker> = new Map()
  
  // Configuration and state
  private readonly CACHE_DURATION = 5 * 60 * 1000 // 5 minutes
  private readonly KLINES_LIMIT = 100
  private readonly UPDATE_INTERVAL = 30 * 1000 // 30 seconds
  private readonly MAX_WORKERS = 16
  private readonly CIRCUIT_BREAKER_THRESHOLD = 5
  private readonly CIRCUIT_BREAKER_TIMEOUT = 60 * 1000 // 1 minute
  
  // Metrics and monitoring
  private metrics: OrchestrationMetrics = {
    totalSymbols: 0,
    symbolsWithIndicators: 0,
    averageCalculationTime: 0,
    lastUpdateTime: 0,
    errors: [],
    marketRegime: 'RANGING',
    regimeConfidence: 0.5,
    workerPoolUtilization: 0,
    cacheHitRate: 0,
    apiEfficiency: 0,
    circuitBreakerStatus: 'CLOSED'
  }
  
  private circuitBreakerFailures = 0
  private circuitBreakerLastFailure = 0
  private isUpdating = false
  private updateTimer?: NodeJS.Timeout
  private marketRegime: MarketRegime = {
    regime: 'RANGING',
    confidence: 0.5,
    volatilityLevel: 'MEDIUM',
    correlationRegime: 'MEDIUM',
    liquidityCondition: 'NORMAL',
    timestamp: Date.now()
  }

  constructor() {
    this.eventBus = EventBus.getInstance()
    this.filteringEngine = filteringEngine
    this.indicatorEngine = indicatorEngine
    this.riskManager = riskManager
    
    this.initializeEventListeners()
    this.initializeWorkerPool()
  }

  private initializeEventListeners(): void {
    // Listen for market regime changes
    this.eventBus.subscribe<MarketRegime>(EventType.MARKET_REGIME_UPDATE, (regime) => {
      this.updateMarketRegime(regime)
    })

    // Listen for risk alerts
    this.eventBus.subscribe<SystemEvent>(EventType.SYSTEM_HEALTH_UPDATE, (event) => {
      this.handleSystemHealthUpdate(event)
    })

    // Listen for filtering results
    this.eventBus.subscribe<MarketDataEvent>(EventType.MARKET_DATA_UPDATE, (event) => {
      this.processMarketDataUpdate(event)
    })
  }

  private initializeWorkerPool(): void {
    // Initialize worker pool for parallel processing
    for (let i = 0; i < this.MAX_WORKERS; i++) {
      const worker = new Worker(`
        const { parentPort } = require('worker_threads')
        
        parentPort.on('message', async (data) => {
          try {
            // Process indicator calculations
            const result = await processIndicators(data)
            parentPort.postMessage({ success: true, data: result })
          } catch (error) {
            parentPort.postMessage({ success: false, error: error.message })
          }
        })
        
        async function processIndicators(data) {
          // Indicator calculation logic
          return { processed: true, symbol: data.symbol }
        }
      `)
      
      this.workerPool.set(`worker-${i}`, worker)
    }
  }

  /**
   * Main orchestration method - coordinates all data flow
   */
  async startDataFlow(symbols: string[]): Promise<void> {
    if (this.isUpdating || this.isCircuitBreakerOpen()) {
      console.log('Data flow blocked: updating or circuit breaker open')
      return
    }

    this.isUpdating = true
    this.metrics.totalSymbols = symbols.length
    this.metrics.symbolsWithIndicators = 0
    this.metrics.errors = []
    this.metrics.lastUpdateTime = Date.now()

    try {
      console.log(`Starting enterprise data flow for ${symbols.length} symbols`)
      
      // Step 1: Market regime detection and adaptation
      await this.detectAndAdaptToMarketRegime(symbols)
      
      // Step 2: Dynamic symbol routing based on regime
      const routedSymbols = this.routeSymbolsByRegime(symbols)
      
      // Step 3: Parallel data ingestion with worker pool
      const marketData = await this.fetchMarketDataParallel(routedSymbols)
      
      // Step 4: Enhanced filtering with regime-aware criteria
      const filteredData = await this.applyRegimeAwareFiltering(marketData)
      
      // Step 5: Parallel indicator computation
      const enrichedData = await this.computeIndicatorsParallel(filteredData)
      
      // Step 6: Risk assessment and validation
      const validatedData = await this.validateDataWithRiskManager(enrichedData)
      
      // Step 7: Multi-tier caching and persistence
      await this.cacheResultsMultiTier(validatedData)
      
      // Step 8: Publish events and update metrics
      await this.publishDataFlowEvents(validatedData)
      
      console.log(`Enterprise data flow completed: ${this.metrics.symbolsWithIndicators}/${this.metrics.totalSymbols} symbols processed`)
      
      // Reset circuit breaker on success
      this.resetCircuitBreaker()
      
    } catch (error) {
      console.error('Enterprise data flow error:', error)
      this.metrics.errors.push(error instanceof Error ? error.message : 'Unknown error')
      this.handleCircuitBreakerFailure()
    } finally {
      this.isUpdating = false
    }
  }

  private async detectAndAdaptToMarketRegime(symbols: string[]): Promise<void> {
    // Analyze market conditions to detect regime
    const volatilityData = await this.calculateMarketVolatility(symbols)
    const correlationData = await this.calculateMarketCorrelations(symbols)
    const liquidityData = await this.assessLiquidityConditions(symbols)
    
    // Determine market regime
    const newRegime = this.determineMarketRegime(volatilityData, correlationData, liquidityData)
    
    // Update regime if confidence is high enough
    if (newRegime.confidence > this.marketRegime.confidence || 
        Date.now() - this.marketRegime.timestamp > 5 * 60 * 1000) {
      this.updateMarketRegime(newRegime)
    }
  }

  private routeSymbolsByRegime(symbols: string[]): Map<string, string[]> {
    const routing = new Map<string, string[]>()
    
    switch (this.marketRegime.regime) {
      case 'TRENDING':
        // Route high-momentum symbols to priority queue
        routing.set('HIGH_PRIORITY', symbols.slice(0, Math.floor(symbols.length * 0.3)))
        routing.set('NORMAL', symbols.slice(Math.floor(symbols.length * 0.3)))
        break
      case 'VOLATILE':
        // Route all symbols to high-priority for rapid processing
        routing.set('HIGH_PRIORITY', symbols)
        break
      case 'RANGING':
        // Standard routing
        routing.set('NORMAL', symbols)
        break
      case 'BREAKOUT':
        // Route potential breakout candidates to priority
        routing.set('HIGH_PRIORITY', symbols.slice(0, Math.floor(symbols.length * 0.5)))
        routing.set('NORMAL', symbols.slice(Math.floor(symbols.length * 0.5)))
        break
    }
    
    return routing
  }

  private async fetchMarketDataParallel(routedSymbols: Map<string, string[]>): Promise<Map<string, any>> {
    const marketDataMap = new Map<string, any>()
    const startTime = Date.now()
    
    try {
      // Check L1 cache first
      const cacheHits = this.checkL1Cache(Array.from(routedSymbols.values()).flat())
      this.metrics.cacheHitRate = cacheHits.length / routedSymbols.size
      
      // Fetch remaining data from API
      const symbolsToFetch = Array.from(routedSymbols.values()).flat().filter(
        symbol => !cacheHits.find(hit => hit.symbol === symbol)
      )
      
      if (symbolsToFetch.length > 0) {
        const tickerData = await get24hrTicker()
        
        for (const symbol of symbolsToFetch) {
          const ticker = tickerData.find((item: any) => item.symbol === symbol)
          if (ticker) {
            const tickerAny = ticker as any
            const price = parseFloat(tickerAny.lastPrice || tickerAny.price || '0')
            const volume = parseFloat(ticker.volume)
            const change24h = parseFloat(ticker.priceChangePercent)
            
            marketDataMap.set(symbol, {
              symbol: ticker.symbol,
              price,
              volume,
              change24h,
              timestamp: Date.now(),
              source: 'BINANCE' as const
            })
          }
        }
      }
      
      // Merge with cache hits
      cacheHits.forEach(hit => {
        marketDataMap.set(hit.symbol, {
          ...hit,
          source: 'CACHE' as const
        })
      })
      
      this.metrics.apiEfficiency = marketDataMap.size / symbolsToFetch.length
      console.log(`Fetched market data for ${marketDataMap.size} symbols in ${Date.now() - startTime}ms`)
      
    } catch (error) {
      console.error('Error fetching market data:', error)
      throw error
    }
    
    return marketDataMap
  }

  private async applyRegimeAwareFiltering(marketData: Map<string, any>): Promise<Map<string, any>> {
    // Apply filtering based on current market regime
    const filteredData = new Map<string, any>()
    
    for (const [symbol, data] of marketData) {
      // Enrich with historical data for filtering
      try {
        const klines = await getKlines(symbol, '1h', this.KLINES_LIMIT)
        const enrichedData = {
          ...data,
          klines,
          regime: this.marketRegime.regime
        }
        
        // Apply regime-specific filtering criteria
        const passesFilter = this.applyRegimeSpecificFilters(enrichedData)
        
        if (passesFilter) {
          filteredData.set(symbol, enrichedData)
        }
        
      } catch (error) {
        console.warn(`Failed to filter ${symbol}:`, error)
      }
    }
    
    return filteredData
  }

  private applyRegimeSpecificFilters(data: any): boolean {
    switch (this.marketRegime.regime) {
      case 'TRENDING':
        // Focus on high-momentum symbols
        return Math.abs(data.change24h) > 2.0 && data.volume > 1000000
      case 'VOLATILE':
        // Focus on high-volume, stable symbols
        return data.volume > 5000000 && Math.abs(data.change24h) < 10.0
      case 'RANGING':
        // Standard filtering
        return data.volume > 1000000
      case 'BREAKOUT':
        // Focus on potential breakout candidates
        return data.volume > 2000000 && Math.abs(data.change24h) > 1.0
      default:
        return true
    }
  }

  private async computeIndicatorsParallel(filteredData: Map<string, any>): Promise<MarketDataPoint[]> {
    const results: MarketDataPoint[] = []
    const symbols = Array.from(filteredData.keys())
    const batchSize = Math.ceil(symbols.length / this.MAX_WORKERS)
    
    // Process in parallel batches
    const batches = []
    for (let i = 0; i < symbols.length; i += batchSize) {
      batches.push(symbols.slice(i, i + batchSize))
    }
    
    const batchPromises = batches.map(async (batch, batchIndex) => {
      const worker = this.workerPool.get(`worker-${batchIndex % this.MAX_WORKERS}`)
      if (!worker) return []
      
      return new Promise<MarketDataPoint[]>((resolve) => {
        worker.postMessage({ batch, data: filteredData })
        
        worker.onmessage = (event) => {
          const result = event.data
          if (result.success) {
            resolve(result.data)
          } else {
            console.error('Worker error:', result.error)
            resolve([])
          }
        }
      })
    })
    
    const batchResults = await Promise.all(batchPromises)
    
    // Aggregate results
    for (const batchResult of batchResults) {
      results.push(...batchResult)
    }
    
    this.metrics.symbolsWithIndicators = results.length
    return results
  }

  private async validateDataWithRiskManager(dataPoints: MarketDataPoint[]): Promise<MarketDataPoint[]> {
    const validatedData: MarketDataPoint[] = []
    
    for (const dataPoint of dataPoints) {
      // Apply risk validation
      const riskAssessment = await this.riskManager.assessDataPoint(dataPoint)
      
      if (riskAssessment.isValid) {
        validatedData.push({
          ...dataPoint,
          quality: riskAssessment.quality,
          confidence: riskAssessment.confidence
        })
      } else {
        console.warn(`Data point ${dataPoint.symbol} failed risk validation`)
      }
    }
    
    return validatedData
  }

  private async cacheResultsMultiTier(validatedData: MarketDataPoint[]): Promise<void> {
    const now = Date.now()
    const expiry = now + this.CACHE_DURATION
    
    for (const dataPoint of validatedData) {
      // L1 cache (fastest)
      this.l1Cache.set(dataPoint.symbol, dataPoint)
      
      // L2 cache (extended)
      this.l2Cache.set(dataPoint.symbol, {
        data: dataPoint,
        expiry
      })
    }
    
    // Clean expired entries
    this.cleanExpiredCache()
  }

  private async publishDataFlowEvents(validatedData: MarketDataPoint[]): Promise<void> {
    // Publish market data updates
    for (const dataPoint of validatedData) {
      this.eventBus.publish(EventType.MARKET_DATA_UPDATE, {
        symbol: dataPoint.symbol,
        price: dataPoint.price,
        volume: dataPoint.volume,
        timestamp: dataPoint.timestamp,
        change24h: dataPoint.change24h
      })
    }
    
    // Publish system health update
    this.eventBus.publish(EventType.SYSTEM_HEALTH_UPDATE, {
      component: 'DataOrchestrator',
      status: 'HEALTHY',
      metrics: {
        processedSymbols: validatedData.length,
        cacheHitRate: this.metrics.cacheHitRate,
        apiEfficiency: this.metrics.apiEfficiency,
        workerPoolUtilization: this.metrics.workerPoolUtilization
      },
      timestamp: Date.now()
    })
  }

  // Circuit breaker implementation
  private isCircuitBreakerOpen(): boolean {
    if (this.metrics.circuitBreakerStatus === 'OPEN') {
      const timeSinceFailure = Date.now() - this.circuitBreakerLastFailure
      if (timeSinceFailure > this.CIRCUIT_BREAKER_TIMEOUT) {
        this.metrics.circuitBreakerStatus = 'HALF_OPEN'
      }
    }
    return this.metrics.circuitBreakerStatus === 'OPEN'
  }

  private handleCircuitBreakerFailure(): void {
    this.circuitBreakerFailures++
    this.circuitBreakerLastFailure = Date.now()
    
    if (this.circuitBreakerFailures >= this.CIRCUIT_BREAKER_THRESHOLD) {
      this.metrics.circuitBreakerStatus = 'OPEN'
      console.warn('Circuit breaker opened due to repeated failures')
    }
  }

  private resetCircuitBreaker(): void {
    this.circuitBreakerFailures = 0
    this.metrics.circuitBreakerStatus = 'CLOSED'
  }

  // Helper methods
  private checkL1Cache(symbols: string[]): MarketDataPoint[] {
    const hits: MarketDataPoint[] = []
    const now = Date.now()
    
    for (const symbol of symbols) {
      const cached = this.l1Cache.get(symbol)
      if (cached && now - cached.timestamp < this.CACHE_DURATION) {
        hits.push(cached)
      }
    }
    
    return hits
  }

  private cleanExpiredCache(): void {
    const now = Date.now()
    
    // Clean L2 cache
    for (const [symbol, entry] of this.l2Cache.entries()) {
      if (now >= entry.expiry) {
        this.l2Cache.delete(symbol)
      }
    }
  }

  private updateMarketRegime(newRegime: MarketRegime): void {
    this.marketRegime = newRegime
    this.metrics.marketRegime = newRegime.regime
    this.metrics.regimeConfidence = newRegime.confidence
    
    // Publish regime update event
    this.eventBus.publish(EventType.MARKET_REGIME_UPDATE, newRegime)
  }

  private async calculateMarketVolatility(symbols: string[]): Promise<number> {
    // Calculate market-wide volatility
    return 0.5 // Placeholder
  }

  private async calculateMarketCorrelations(symbols: string[]): Promise<number> {
    // Calculate market-wide correlations
    return 0.3 // Placeholder
  }

  private async assessLiquidityConditions(symbols: string[]): Promise<string> {
    // Assess market liquidity conditions
    return 'NORMAL' // Placeholder
  }

  private determineMarketRegime(volatility: number, correlation: number, liquidity: string): MarketRegime {
    // Determine market regime based on metrics
    let regime: 'TRENDING' | 'RANGING' | 'VOLATILE' | 'BREAKOUT' = 'RANGING'
    let confidence = 0.5
    
    if (volatility > 0.7) {
      regime = 'VOLATILE'
      confidence = 0.8
    } else if (correlation > 0.6) {
      regime = 'TRENDING'
      confidence = 0.7
    } else if (liquidity === 'STRESSED') {
      regime = 'BREAKOUT'
      confidence = 0.6
    }
    
    return {
      regime,
      confidence,
      volatilityLevel: volatility > 0.6 ? 'HIGH' : volatility > 0.3 ? 'MEDIUM' : 'LOW',
      correlationRegime: correlation > 0.5 ? 'HIGH' : correlation > 0.2 ? 'MEDIUM' : 'LOW',
      liquidityCondition: liquidity as 'NORMAL' | 'STRESSED',
      timestamp: Date.now()
    }
  }

  // Public API methods
  getMarketData(symbols?: string[]): MarketDataPoint[] {
    const results: MarketDataPoint[] = []
    const targetSymbols = symbols || Array.from(this.l1Cache.keys())
    
    for (const symbol of targetSymbols) {
      const cached = this.l1Cache.get(symbol)
      if (cached) {
        results.push(cached)
      }
    }
    
    return results.sort((a, b) => b.volume - a.volume)
  }

  getSymbolData(symbol: string): MarketDataPoint | null {
    return this.l1Cache.get(symbol) || null
  }

  getMetrics(): OrchestrationMetrics {
    return { ...this.metrics }
  }

  getMarketRegime(): MarketRegime {
    return { ...this.marketRegime }
  }

  startContinuousUpdates(symbols: string[]): void {
    if (this.updateTimer) {
      clearInterval(this.updateTimer)
    }
    
    this.startDataFlow(symbols)
    
    this.updateTimer = setInterval(() => {
      this.startDataFlow(symbols)
    }, this.UPDATE_INTERVAL)
    
    console.log(`Started continuous enterprise updates every ${this.UPDATE_INTERVAL / 1000}s`)
  }

  stopContinuousUpdates(): void {
    if (this.updateTimer) {
      clearInterval(this.updateTimer)
      this.updateTimer = undefined
      console.log('Stopped continuous enterprise updates')
    }
  }

  private processMarketDataUpdate(event: MarketDataEvent): void {
    // Process incoming market data updates
    console.log(`Processing market data update for ${event.symbol}`)
  }

  private handleSystemHealthUpdate(event: SystemEvent): void {
    // Handle system health updates
    console.log(`System health update: ${event.component} - ${event.status}`)
  }
}

// Singleton instance
const dataOrchestrator = new DataOrchestrator()

// Export functions for backward compatibility
export async function startDataFlow(symbols: string[]): Promise<void> {
  return dataOrchestrator.startDataFlow(symbols)
}

export function getMarketData(symbols?: string[]): MarketDataPoint[] {
  return dataOrchestrator.getMarketData(symbols)
}

export function getSymbolData(symbol: string): MarketDataPoint | null {
  return dataOrchestrator.getSymbolData(symbol)
}

export function getDataFlowMetrics(): OrchestrationMetrics {
  return dataOrchestrator.getMetrics()
}

export function getMarketRegime(): MarketRegime {
  return dataOrchestrator.getMarketRegime()
}

export function startContinuousUpdates(symbols: string[]): void {
  dataOrchestrator.startContinuousUpdates(symbols)
}

export function stopContinuousUpdates(): void {
  dataOrchestrator.stopContinuousUpdates()
}

export default dataOrchestrator 