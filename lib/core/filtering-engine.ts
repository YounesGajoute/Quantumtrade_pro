import { eventBus, EventType, MarketDataEvent } from './event-bus'

// Filtering Criteria Interfaces
export interface FilterCriteria {
  // Stage 1: Universe Screening
  minVolume: number // Minimum 24h volume in USDT
  maxSpread: number // Maximum bid-ask spread percentage
  minMarketCap: number // Minimum market cap in USDT
  tradingStatus: 'TRADING' | 'BREAK' | 'AUCTION_MATCH' | 'AUCTION_NO_MATCH'
  
  // Stage 2: Volatility & Momentum
  minATR: number // Minimum Average True Range
  minPriceVelocity: number // Minimum price velocity
  volumeSurgeThreshold: number // Volume surge detection threshold
  breakoutProximity: number // Price proximity to key levels
  
  // Stage 3: Scoring Weights
  volatilityWeight: number
  momentumWeight: number
  volumeWeight: number
  trendWeight: number
}

export interface FilteredSymbol {
  symbol: string
  score: number
  stage1Passed: boolean
  stage2Passed: boolean
  stage3Score: number
  metrics: {
    volume: number
    spread: number
    marketCap: number
    atr: number
    priceVelocity: number
    volumeSurge: number
    breakoutProximity: number
  }
  timestamp: number
}

export interface UniverseData {
  symbol: string
  price: number
  volume24h: number
  marketCap: number
  bidAskSpread: number
  atr: number
  priceVelocity: number
  volumeSurge: number
  breakoutProximity: number
  tradingStatus: string
}

class FilteringEngine {
  private criteria: FilterCriteria
  private filteredSymbols: Map<string, FilteredSymbol> = new Map()
  private correlationMatrix: Map<string, Map<string, number>> = new Map()
  private recentlyTraded: Set<string> = new Set()
  private marketRegime: 'TRENDING' | 'RANGING' | 'VOLATILE' = 'RANGING'
  
  constructor() {
    this.criteria = {
      // Stage 1: Universe Screening
      minVolume: 50000000, // $50M USDT
      maxSpread: 0.05, // 0.05%
      minMarketCap: 100000000, // $100M USDT
      tradingStatus: 'TRADING',
      
      // Stage 2: Volatility & Momentum
      minATR: 0.001, // 0.1%
      minPriceVelocity: 0.0001, // 0.01%
      volumeSurgeThreshold: 2.0, // 200% of average
      breakoutProximity: 0.02, // 2% from key levels
      
      // Stage 3: Scoring Weights
      volatilityWeight: 0.25,
      momentumWeight: 0.30,
      volumeWeight: 0.20,
      trendWeight: 0.25
    }
    
    this.initializeEventListeners()
  }

  private initializeEventListeners(): void {
    // Listen for market data updates
    eventBus.subscribe<MarketDataEvent>(EventType.MARKET_DATA_UPDATE, (data) => {
      this.processMarketData(data)
    })
  }

  // Stage 1: Universe Screening
  private stage1Screening(data: UniverseData): boolean {
    return (
      data.volume24h >= this.criteria.minVolume &&
      data.bidAskSpread <= this.criteria.maxSpread &&
      data.marketCap >= this.criteria.minMarketCap &&
      data.tradingStatus === this.criteria.tradingStatus
    )
  }

  // Stage 2: Volatility & Momentum Analysis
  private stage2Analysis(data: UniverseData): boolean {
    return (
      data.atr >= this.criteria.minATR &&
      Math.abs(data.priceVelocity) >= this.criteria.minPriceVelocity &&
      data.volumeSurge >= this.criteria.volumeSurgeThreshold &&
      data.breakoutProximity <= this.criteria.breakoutProximity
    )
  }

  // Stage 3: Quantitative Scoring Matrix
  private stage3Scoring(data: UniverseData): number {
    // Normalize metrics to 0-1 scale
    const volatilityScore = Math.min(data.atr / 0.01, 1) // Normalize ATR
    const momentumScore = Math.min(Math.abs(data.priceVelocity) / 0.001, 1) // Normalize velocity
    const volumeScore = Math.min(data.volumeSurge / 5, 1) // Normalize volume surge
    const trendScore = Math.max(0, 1 - data.breakoutProximity / 0.05) // Inverse proximity

    // Apply decay function for recently traded pairs
    const decayFactor = this.recentlyTraded.has(data.symbol) ? 0.5 : 1.0

    // Calculate final score
    const finalScore = (
      volatilityScore * this.criteria.volatilityWeight +
      momentumScore * this.criteria.momentumWeight +
      volumeScore * this.criteria.volumeWeight +
      trendScore * this.criteria.trendWeight
    ) * decayFactor

    return Math.min(Math.max(finalScore, 0), 1) // Clamp between 0 and 1
  }

  // Process market data through filtering pipeline
  private processMarketData(marketData: MarketDataEvent): void {
    // Convert to UniverseData format (you'll need to enrich this with additional data)
    const universeData: UniverseData = {
      symbol: marketData.symbol,
      price: marketData.price,
      volume24h: marketData.volume,
      marketCap: 0, // Need to fetch from API
      bidAskSpread: marketData.bidAskSpread || 0,
      atr: 0, // Need to calculate
      priceVelocity: 0, // Need to calculate
      volumeSurge: 0, // Need to calculate
      breakoutProximity: 0, // Need to calculate
      tradingStatus: 'TRADING'
    }

    // Run through filtering stages
    const stage1Passed = this.stage1Screening(universeData)
    const stage2Passed = stage1Passed && this.stage2Analysis(universeData)
    const stage3Score = stage2Passed ? this.stage3Scoring(universeData) : 0

    // Create filtered symbol result
    const filteredSymbol: FilteredSymbol = {
      symbol: marketData.symbol,
      score: stage3Score,
      stage1Passed,
      stage2Passed,
      stage3Score,
      metrics: {
        volume: universeData.volume24h,
        spread: universeData.bidAskSpread,
        marketCap: universeData.marketCap,
        atr: universeData.atr,
        priceVelocity: universeData.priceVelocity,
        volumeSurge: universeData.volumeSurge,
        breakoutProximity: universeData.breakoutProximity
      },
      timestamp: Date.now()
    }

    // Update filtered symbols
    this.filteredSymbols.set(marketData.symbol, filteredSymbol)

    // Publish filtering events
    if (stage1Passed) {
      eventBus.publish(EventType.SIGNAL_GENERATED, {
        symbol: marketData.symbol,
        stage: 'STAGE1_PASSED',
        data: filteredSymbol
      })
    }

    if (stage2Passed) {
      eventBus.publish(EventType.SIGNAL_GENERATED, {
        symbol: marketData.symbol,
        stage: 'STAGE2_PASSED',
        data: filteredSymbol
      })
    }

    if (stage3Score > 0.7) { // High confidence signals
      eventBus.publish(EventType.SIGNAL_CONFIRMED, {
        symbol: marketData.symbol,
        score: stage3Score,
        data: filteredSymbol
      })
    }
  }

  // Get top filtered symbols
  getTopSymbols(limit: number = 5): FilteredSymbol[] {
    return Array.from(this.filteredSymbols.values())
      .filter(symbol => symbol.stage2Passed && symbol.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
  }

  // Update correlation matrix
  updateCorrelationMatrix(symbols: string[], correlations: number[][]): void {
    for (let i = 0; i < symbols.length; i++) {
      if (!this.correlationMatrix.has(symbols[i])) {
        this.correlationMatrix.set(symbols[i], new Map())
      }
      
      for (let j = 0; j < symbols.length; j++) {
        if (i !== j) {
          this.correlationMatrix.get(symbols[i])!.set(symbols[j], correlations[i][j])
        }
      }
    }
  }

  // Check correlation constraints
  checkCorrelationConstraints(symbol: string, selectedSymbols: string[]): boolean {
    const symbolCorrelations = this.correlationMatrix.get(symbol)
    if (!symbolCorrelations) return true

    for (const selectedSymbol of selectedSymbols) {
      const correlation = symbolCorrelations.get(selectedSymbol)
      if (correlation && Math.abs(correlation) > 0.7) {
        return false // Too correlated
      }
    }
    return true
  }

  // Mark symbol as recently traded
  markRecentlyTraded(symbol: string): void {
    this.recentlyTraded.add(symbol)
    
    // Remove from recently traded after 1 hour
    setTimeout(() => {
      this.recentlyTraded.delete(symbol)
    }, 60 * 60 * 1000)
  }

  // Update market regime
  updateMarketRegime(regime: 'TRENDING' | 'RANGING' | 'VOLATILE'): void {
    this.marketRegime = regime
    
    // Adjust criteria based on market regime
    switch (regime) {
      case 'TRENDING':
        this.criteria.momentumWeight = 0.35
        this.criteria.volatilityWeight = 0.20
        break
      case 'RANGING':
        this.criteria.volatilityWeight = 0.30
        this.criteria.momentumWeight = 0.25
        break
      case 'VOLATILE':
        this.criteria.volatilityWeight = 0.40
        this.criteria.momentumWeight = 0.15
        break
    }
  }

  // Update filtering criteria
  updateCriteria(newCriteria: Partial<FilterCriteria>): void {
    this.criteria = { ...this.criteria, ...newCriteria }
  }

  // Get filtering statistics
  getStats(): {
    totalSymbols: number
    stage1Passed: number
    stage2Passed: number
    highConfidenceSignals: number
    averageScore: number
  } {
    const symbols = Array.from(this.filteredSymbols.values())
    const stage1Passed = symbols.filter(s => s.stage1Passed).length
    const stage2Passed = symbols.filter(s => s.stage2Passed).length
    const highConfidence = symbols.filter(s => s.score > 0.7).length
    const averageScore = symbols.length > 0 
      ? symbols.reduce((sum, s) => sum + s.score, 0) / symbols.length 
      : 0

    return {
      totalSymbols: symbols.length,
      stage1Passed,
      stage2Passed,
      highConfidenceSignals: highConfidence,
      averageScore
    }
  }

  // Clear filtered symbols
  clear(): void {
    this.filteredSymbols.clear()
  }
}

// Export singleton instance
export const filteringEngine = new FilteringEngine() 