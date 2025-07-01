import { Worker } from 'worker_threads'
import { eventBus, EventType } from './event-bus'

// Indicator Types
export enum IndicatorType {
  // Momentum Indicators
  RSI_5M = 'RSI_5M',
  RSI_15M = 'RSI_15M',
  RSI_1H = 'RSI_1H',
  STOCH_RSI = 'STOCH_RSI',
  WILLIAMS_R = 'WILLIAMS_R',
  CCI = 'CCI',
  
  // Trend Indicators
  ALMA = 'ALMA',
  VIDYA = 'VIDYA',
  T3 = 'T3',
  SUPERTREND = 'SUPERTREND',
  PARABOLIC_SAR = 'PARABOLIC_SAR',
  DMI = 'DMI',
  
  // Volatility Indicators
  BOLLINGER_BANDS = 'BOLLINGER_BANDS',
  KELTNER_CHANNELS = 'KELTNER_CHANNELS',
  ATR = 'ATR',
  VOLATILITY_INDEX = 'VOLATILITY_INDEX',
  
  // Volume Indicators
  VWAP = 'VWAP',
  VOLUME_PROFILE = 'VOLUME_PROFILE',
  ACCUMULATION_DISTRIBUTION = 'ACCUMULATION_DISTRIBUTION',
  CHAIKIN_MONEY_FLOW = 'CHAIKIN_MONEY_FLOW',
  
  // Custom Composite Indicators
  MARKET_STRUCTURE_INDEX = 'MARKET_STRUCTURE_INDEX',
  MOMENTUM_CONVERGENCE = 'MOMENTUM_CONVERGENCE',
  VOLATILITY_BREAKOUT_PROB = 'VOLATILITY_BREAKOUT_PROB',
  SMART_MONEY_INDEX = 'SMART_MONEY_INDEX'
}

// Indicator Result Interface
export interface IndicatorResult {
  symbol: string
  indicator: IndicatorType
  value: number
  signal: 'BUY' | 'SELL' | 'NEUTRAL'
  confidence: number
  timestamp: number
  metadata?: Record<string, any>
}

// Composite Signal Interface
export interface CompositeSignal {
  symbol: string
  momentumScore: number
  trendScore: number
  volatilityScore: number
  volumeScore: number
  overallScore: number
  signal: 'BUY' | 'SELL' | 'HOLD'
  confidence: number
  timestamp: number
  breakdown: Record<string, number>
}

// Worker Pool Configuration
interface WorkerConfig {
  maxWorkers: number
  workerTimeout: number
  batchSize: number
}

class IndicatorEngine {
  private workers: Worker[] = []
  private workerQueue: Array<{ symbol: string; data: any; resolve: Function; reject: Function }> = []
  private activeWorkers: Set<Worker> = new Set()
  private indicatorResults: Map<string, Map<IndicatorType, IndicatorResult>> = new Map()
  private compositeSignals: Map<string, CompositeSignal> = new Map()
  
  private config: WorkerConfig = {
    maxWorkers: 4, // Number of CPU cores to utilize
    workerTimeout: 30000, // 30 seconds timeout
    batchSize: 10 // Process symbols in batches
  }

  constructor() {
    this.initializeWorkers()
    this.startProcessingLoop()
  }

  private initializeWorkers(): void {
    for (let i = 0; i < this.config.maxWorkers; i++) {
      const worker = new Worker(`
        const { parentPort } = require('worker_threads');
        
        parentPort.on('message', async (data) => {
          try {
            const { symbol, klines, indicators } = data;
            const results = [];
            
            // Process indicators in parallel
            for (const indicator of indicators) {
              const result = await calculateIndicator(symbol, klines, indicator);
              results.push(result);
            }
            
            parentPort.postMessage({ success: true, results });
          } catch (error) {
            parentPort.postMessage({ success: false, error: error.message });
          }
        });
        
        async function calculateIndicator(symbol, klines, indicatorType) {
          // This would contain the actual indicator calculation logic
          // For now, returning mock data
          return {
            symbol,
            indicator: indicatorType,
            value: Math.random(),
            signal: Math.random() > 0.5 ? 'BUY' : 'SELL',
            confidence: Math.random(),
            timestamp: Date.now()
          };
        }
      `, { eval: true })
      
      this.workers.push(worker)
    }
  }

  private startProcessingLoop(): void {
    setInterval(() => {
      this.processQueue()
    }, 100) // Process queue every 100ms
  }

  private async processQueue(): Promise<void> {
    if (this.workerQueue.length === 0 || this.activeWorkers.size >= this.config.maxWorkers) {
      return
    }

    const availableWorker = this.workers.find(worker => !this.activeWorkers.has(worker))
    if (!availableWorker) return

    const batch = this.workerQueue.splice(0, this.config.batchSize)
    if (batch.length === 0) return

    this.activeWorkers.add(availableWorker)

    try {
      const promises = batch.map(({ symbol, data, resolve, reject }) => {
        return new Promise<void>((res, rej) => {
          const timeout = setTimeout(() => {
            rej(new Error('Worker timeout'))
          }, this.config.workerTimeout)

          availableWorker.once('message', (result) => {
            clearTimeout(timeout)
            if (result.success) {
              this.processIndicatorResults(result.results)
              resolve()
            } else {
              reject(new Error(result.error))
            }
            res()
          })

          availableWorker.postMessage({ symbol, ...data })
        })
      })

      await Promise.all(promises)
    } finally {
      this.activeWorkers.delete(availableWorker)
    }
  }

  // Calculate indicators for a symbol
  async calculateIndicators(symbol: string, klines: any[], indicators: IndicatorType[]): Promise<void> {
    return new Promise((resolve, reject) => {
      this.workerQueue.push({
        symbol,
        data: { klines, indicators },
        resolve,
        reject
      })
    })
  }

  // Process indicator results from workers
  private processIndicatorResults(results: IndicatorResult[]): void {
    for (const result of results) {
      // Store individual indicator result
      if (!this.indicatorResults.has(result.symbol)) {
        this.indicatorResults.set(result.symbol, new Map())
      }
      this.indicatorResults.get(result.symbol)!.set(result.indicator, result)

      // Publish indicator event
      eventBus.publish(EventType.SIGNAL_GENERATED, {
        symbol: result.symbol,
        indicator: result.indicator,
        value: result.value,
        signal: result.signal,
        confidence: result.confidence
      })
    }

    // Calculate composite signals
    this.calculateCompositeSignals()
  }

  // Calculate composite signals from individual indicators
  private calculateCompositeSignals(): void {
    for (const [symbol, indicators] of this.indicatorResults) {
      const compositeSignal = this.computeCompositeSignal(symbol, indicators)
      this.compositeSignals.set(symbol, compositeSignal)

      // Publish composite signal event
      eventBus.publish(EventType.SIGNAL_RANKING_UPDATE, compositeSignal)
    }
  }

  // Compute composite signal from individual indicators
  private computeCompositeSignal(symbol: string, indicators: Map<IndicatorType, IndicatorResult>): CompositeSignal {
    let momentumScore = 0
    let trendScore = 0
    let volatilityScore = 0
    let volumeScore = 0
    const breakdown: Record<string, number> = {}

    // Categorize and weight indicators
    for (const [indicatorType, result] of indicators) {
      const weight = this.getIndicatorWeight(indicatorType)
      const category = this.getIndicatorCategory(indicatorType)
      
      breakdown[indicatorType] = result.value

      switch (category) {
        case 'MOMENTUM':
          momentumScore += result.value * weight
          break
        case 'TREND':
          trendScore += result.value * weight
          break
        case 'VOLATILITY':
          volatilityScore += result.value * weight
          break
        case 'VOLUME':
          volumeScore += result.value * weight
          break
      }
    }

    // Normalize scores
    momentumScore = Math.min(Math.max(momentumScore, 0), 1)
    trendScore = Math.min(Math.max(trendScore, 0), 1)
    volatilityScore = Math.min(Math.max(volatilityScore, 0), 1)
    volumeScore = Math.min(Math.max(volumeScore, 0), 1)

    // Calculate overall score
    const overallScore = (
      momentumScore * 0.3 +
      trendScore * 0.3 +
      volatilityScore * 0.2 +
      volumeScore * 0.2
    )

    // Determine signal
    let signal: 'BUY' | 'SELL' | 'HOLD' = 'HOLD'
    if (overallScore > 0.7) {
      signal = 'BUY'
    } else if (overallScore < 0.3) {
      signal = 'SELL'
    }

    // Calculate confidence
    const confidence = this.calculateConfidence(indicators)

    return {
      symbol,
      momentumScore,
      trendScore,
      volatilityScore,
      volumeScore,
      overallScore,
      signal,
      confidence,
      timestamp: Date.now(),
      breakdown
    }
  }

  // Get indicator weight based on type
  private getIndicatorWeight(indicator: IndicatorType): number {
    const weights: Record<IndicatorType, number> = {
      // Momentum indicators
      [IndicatorType.RSI_5M]: 0.1,
      [IndicatorType.RSI_15M]: 0.15,
      [IndicatorType.RSI_1H]: 0.2,
      [IndicatorType.STOCH_RSI]: 0.1,
      [IndicatorType.WILLIAMS_R]: 0.1,
      [IndicatorType.CCI]: 0.1,
      
      // Trend indicators
      [IndicatorType.ALMA]: 0.15,
      [IndicatorType.VIDYA]: 0.15,
      [IndicatorType.T3]: 0.1,
      [IndicatorType.SUPERTREND]: 0.2,
      [IndicatorType.PARABOLIC_SAR]: 0.1,
      [IndicatorType.DMI]: 0.15,
      
      // Volatility indicators
      [IndicatorType.BOLLINGER_BANDS]: 0.2,
      [IndicatorType.KELTNER_CHANNELS]: 0.15,
      [IndicatorType.ATR]: 0.15,
      [IndicatorType.VOLATILITY_INDEX]: 0.1,
      
      // Volume indicators
      [IndicatorType.VWAP]: 0.2,
      [IndicatorType.VOLUME_PROFILE]: 0.15,
      [IndicatorType.ACCUMULATION_DISTRIBUTION]: 0.1,
      [IndicatorType.CHAIKIN_MONEY_FLOW]: 0.1,
      
      // Custom indicators
      [IndicatorType.MARKET_STRUCTURE_INDEX]: 0.25,
      [IndicatorType.MOMENTUM_CONVERGENCE]: 0.2,
      [IndicatorType.VOLATILITY_BREAKOUT_PROB]: 0.15,
      [IndicatorType.SMART_MONEY_INDEX]: 0.2
    }

    return weights[indicator] || 0.1
  }

  // Get indicator category
  private getIndicatorCategory(indicator: IndicatorType): 'MOMENTUM' | 'TREND' | 'VOLATILITY' | 'VOLUME' {
    const categories: Record<IndicatorType, 'MOMENTUM' | 'TREND' | 'VOLATILITY' | 'VOLUME'> = {
      // Momentum
      [IndicatorType.RSI_5M]: 'MOMENTUM',
      [IndicatorType.RSI_15M]: 'MOMENTUM',
      [IndicatorType.RSI_1H]: 'MOMENTUM',
      [IndicatorType.STOCH_RSI]: 'MOMENTUM',
      [IndicatorType.WILLIAMS_R]: 'MOMENTUM',
      [IndicatorType.CCI]: 'MOMENTUM',
      
      // Trend
      [IndicatorType.ALMA]: 'TREND',
      [IndicatorType.VIDYA]: 'TREND',
      [IndicatorType.T3]: 'TREND',
      [IndicatorType.SUPERTREND]: 'TREND',
      [IndicatorType.PARABOLIC_SAR]: 'TREND',
      [IndicatorType.DMI]: 'TREND',
      
      // Volatility
      [IndicatorType.BOLLINGER_BANDS]: 'VOLATILITY',
      [IndicatorType.KELTNER_CHANNELS]: 'VOLATILITY',
      [IndicatorType.ATR]: 'VOLATILITY',
      [IndicatorType.VOLATILITY_INDEX]: 'VOLATILITY',
      
      // Volume
      [IndicatorType.VWAP]: 'VOLUME',
      [IndicatorType.VOLUME_PROFILE]: 'VOLUME',
      [IndicatorType.ACCUMULATION_DISTRIBUTION]: 'VOLUME',
      [IndicatorType.CHAIKIN_MONEY_FLOW]: 'VOLUME',
      
      // Custom (trend-based)
      [IndicatorType.MARKET_STRUCTURE_INDEX]: 'TREND',
      [IndicatorType.MOMENTUM_CONVERGENCE]: 'MOMENTUM',
      [IndicatorType.VOLATILITY_BREAKOUT_PROB]: 'VOLATILITY',
      [IndicatorType.SMART_MONEY_INDEX]: 'VOLUME'
    }

    return categories[indicator] || 'MOMENTUM'
  }

  // Calculate confidence based on indicator agreement
  private calculateConfidence(indicators: Map<IndicatorType, IndicatorResult>): number {
    if (indicators.size === 0) return 0

    let buySignals = 0
    let sellSignals = 0
    let totalConfidence = 0

    for (const result of indicators.values()) {
      totalConfidence += result.confidence
      
      if (result.signal === 'BUY') {
        buySignals++
      } else if (result.signal === 'SELL') {
        sellSignals++
      }
    }

    // Calculate agreement ratio
    const totalSignals = buySignals + sellSignals
    const agreementRatio = totalSignals > 0 ? Math.max(buySignals, sellSignals) / totalSignals : 0
    
    // Average confidence
    const avgConfidence = totalConfidence / indicators.size

    // Final confidence is combination of agreement and average confidence
    return (agreementRatio * 0.7) + (avgConfidence * 0.3)
  }

  // Get composite signals
  getCompositeSignals(): CompositeSignal[] {
    return Array.from(this.compositeSignals.values())
  }

  // Get top signals
  getTopSignals(limit: number = 5): CompositeSignal[] {
    return this.getCompositeSignals()
      .filter(signal => signal.confidence > 0.6)
      .sort((a, b) => b.overallScore - a.overallScore)
      .slice(0, limit)
  }

  // Get indicator results for a symbol
  getIndicatorResults(symbol: string): Map<IndicatorType, IndicatorResult> | undefined {
    return this.indicatorResults.get(symbol)
  }

  // Get engine statistics
  getStats(): {
    totalSymbols: number
    totalIndicators: number
    activeWorkers: number
    queueLength: number
    averageProcessingTime: number
  } {
    return {
      totalSymbols: this.indicatorResults.size,
      totalIndicators: Array.from(this.indicatorResults.values())
        .reduce((sum, indicators) => sum + indicators.size, 0),
      activeWorkers: this.activeWorkers.size,
      queueLength: this.workerQueue.length,
      averageProcessingTime: 0 // Would need to track actual processing times
    }
  }

  // Cleanup
  destroy(): void {
    this.workers.forEach(worker => worker.terminate())
    this.workers = []
    this.indicatorResults.clear()
    this.compositeSignals.clear()
  }
}

// Export singleton instance
export const indicatorEngine = new IndicatorEngine() 