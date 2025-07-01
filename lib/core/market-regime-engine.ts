import { EventBus, EventType, SystemEvent } from './event-bus'
import { getKlines, get24hrTicker } from '../binance-api'

// Market Regime Interfaces
export interface MarketRegime {
  regime: 'TRENDING' | 'RANGING' | 'VOLATILE' | 'BREAKOUT' | 'CRISIS'
  confidence: number
  volatilityLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'EXTREME'
  correlationRegime: 'LOW' | 'MEDIUM' | 'HIGH' | 'EXTREME'
  liquidityCondition: 'NORMAL' | 'STRESSED' | 'CRITICAL'
  momentumDirection: 'BULLISH' | 'BEARISH' | 'NEUTRAL'
  timestamp: number
  metadata: {
    volatilityScore: number
    correlationScore: number
    liquidityScore: number
    momentumScore: number
    regimeStability: number
    lastRegimeChange: number
  }
}

export interface RegimeAnalysis {
  symbol: string
  price: number
  volume: number
  change24h: number
  volatility: number
  momentum: number
  correlation: number
  liquidity: number
}

export interface RegimeMetrics {
  totalSymbols: number
  analyzedSymbols: number
  regimeDistribution: Record<string, number>
  averageConfidence: number
  regimeStability: number
  lastUpdateTime: number
  processingTime: number
  errors: string[]
}

class MarketRegimeEngine {
  private eventBus: EventBus
  private currentRegime: MarketRegime
  private regimeHistory: MarketRegime[] = []
  private symbolAnalysis: Map<string, RegimeAnalysis> = new Map()
  private readonly MAX_HISTORY = 1000
  private readonly ANALYSIS_INTERVAL = 60 * 1000 // 1 minute
  private readonly REGIME_STABILITY_THRESHOLD = 0.7
  private readonly CONFIDENCE_THRESHOLD = 0.6
  
  private metrics: RegimeMetrics = {
    totalSymbols: 0,
    analyzedSymbols: 0,
    regimeDistribution: {},
    averageConfidence: 0,
    regimeStability: 0,
    lastUpdateTime: 0,
    processingTime: 0,
    errors: []
  }
  
  private analysisTimer?: NodeJS.Timeout
  private isAnalyzing = false

  constructor() {
    this.eventBus = EventBus.getInstance()
    
    // Initialize with default regime
    this.currentRegime = {
      regime: 'RANGING',
      confidence: 0.5,
      volatilityLevel: 'MEDIUM',
      correlationRegime: 'MEDIUM',
      liquidityCondition: 'NORMAL',
      momentumDirection: 'NEUTRAL',
      timestamp: Date.now(),
      metadata: {
        volatilityScore: 0.5,
        correlationScore: 0.5,
        liquidityScore: 0.5,
        momentumScore: 0.5,
        regimeStability: 0.5,
        lastRegimeChange: Date.now()
      }
    }
    
    this.initializeEventListeners()
  }

  private initializeEventListeners(): void {
    // Listen for market data updates
    this.eventBus.subscribe<SystemEvent>(EventType.SYSTEM_HEALTH_UPDATE, (event) => {
      if (event.component === 'DataOrchestrator') {
        this.handleDataOrchestratorUpdate(event)
      }
    })
  }

  /**
   * Main regime detection method
   */
  async detectMarketRegime(symbols: string[]): Promise<MarketRegime> {
    if (this.isAnalyzing) {
      return this.currentRegime
    }

    this.isAnalyzing = true
    const startTime = Date.now()
    
    try {
      console.log(`Starting market regime detection for ${symbols.length} symbols`)
      
      // Step 1: Collect market data
      const marketData = await this.collectMarketData(symbols)
      
      // Step 2: Calculate market-wide metrics
      const volatilityMetrics = await this.calculateVolatilityMetrics(marketData)
      const correlationMetrics = await this.calculateCorrelationMetrics(marketData)
      const liquidityMetrics = await this.calculateLiquidityMetrics(marketData)
      const momentumMetrics = await this.calculateMomentumMetrics(marketData)
      
      // Step 3: Determine regime based on metrics
      const newRegime = this.determineRegime(
        volatilityMetrics,
        correlationMetrics,
        liquidityMetrics,
        momentumMetrics
      )
      
      // Step 4: Validate regime change
      const validatedRegime = this.validateRegimeChange(newRegime)
      
      // Step 5: Update regime if significant change detected
      if (this.shouldUpdateRegime(validatedRegime)) {
        this.updateRegime(validatedRegime)
      }
      
      // Step 6: Update metrics
      this.updateMetrics(startTime, marketData.length)
      
      console.log(`Market regime detection completed: ${this.currentRegime.regime} (confidence: ${this.currentRegime.confidence})`)
      
    } catch (error) {
      console.error('Market regime detection error:', error)
      this.metrics.errors.push(error instanceof Error ? error.message : 'Unknown error')
    } finally {
      this.isAnalyzing = false
    }
    
    return this.currentRegime
  }

  private async collectMarketData(symbols: string[]): Promise<RegimeAnalysis[]> {
    const marketData: RegimeAnalysis[] = []
    
    try {
      // Fetch 24hr ticker data
      const tickerData = await get24hrTicker()
      
      // Process each symbol
      for (const symbol of symbols) {
        const ticker = tickerData.find((item: any) => item.symbol === symbol)
        if (ticker) {
          const tickerAny = ticker as any
          const price = parseFloat(tickerAny.lastPrice || tickerAny.price || '0')
          const volume = parseFloat(ticker.volume)
          const change24h = parseFloat(ticker.priceChangePercent)
          
          // Calculate basic metrics
          const volatility = Math.abs(change24h) / 100
          const momentum = change24h / 100
          const correlation = 0.5 // Placeholder - would need historical data
          const liquidity = Math.log10(volume) / 10 // Normalized liquidity
          
          const analysis: RegimeAnalysis = {
            symbol,
            price,
            volume,
            change24h,
            volatility,
            momentum,
            correlation,
            liquidity
          }
          
          marketData.push(analysis)
          this.symbolAnalysis.set(symbol, analysis)
        }
      }
      
    } catch (error) {
      console.error('Error collecting market data:', error)
      throw error
    }
    
    return marketData
  }

  private async calculateVolatilityMetrics(marketData: RegimeAnalysis[]): Promise<{
    averageVolatility: number
    volatilityDispersion: number
    extremeVolatilityCount: number
    volatilityTrend: number
  }> {
    const volatilities = marketData.map(d => d.volatility)
    const averageVolatility = volatilities.reduce((a, b) => a + b, 0) / volatilities.length
    const volatilityDispersion = Math.sqrt(
      volatilities.reduce((sum, v) => sum + Math.pow(v - averageVolatility, 2), 0) / volatilities.length
    )
    const extremeVolatilityCount = volatilities.filter(v => v > 0.05).length
    const volatilityTrend = this.calculateTrend(volatilities)
    
    return {
      averageVolatility,
      volatilityDispersion,
      extremeVolatilityCount,
      volatilityTrend
    }
  }

  private async calculateCorrelationMetrics(marketData: RegimeAnalysis[]): Promise<{
    averageCorrelation: number
    correlationDispersion: number
    highCorrelationCount: number
    correlationTrend: number
  }> {
    const correlations = marketData.map(d => d.correlation)
    const averageCorrelation = correlations.reduce((a, b) => a + b, 0) / correlations.length
    const correlationDispersion = Math.sqrt(
      correlations.reduce((sum, c) => sum + Math.pow(c - averageCorrelation, 2), 0) / correlations.length
    )
    const highCorrelationCount = correlations.filter(c => c > 0.7).length
    const correlationTrend = this.calculateTrend(correlations)
    
    return {
      averageCorrelation,
      correlationDispersion,
      highCorrelationCount,
      correlationTrend
    }
  }

  private async calculateLiquidityMetrics(marketData: RegimeAnalysis[]): Promise<{
    averageLiquidity: number
    liquidityDispersion: number
    lowLiquidityCount: number
    liquidityTrend: number
  }> {
    const liquidities = marketData.map(d => d.liquidity)
    const averageLiquidity = liquidities.reduce((a, b) => a + b, 0) / liquidities.length
    const liquidityDispersion = Math.sqrt(
      liquidities.reduce((sum, l) => sum + Math.pow(l - averageLiquidity, 2), 0) / liquidities.length
    )
    const lowLiquidityCount = liquidities.filter(l => l < 0.3).length
    const liquidityTrend = this.calculateTrend(liquidities)
    
    return {
      averageLiquidity,
      liquidityDispersion,
      lowLiquidityCount,
      liquidityTrend
    }
  }

  private async calculateMomentumMetrics(marketData: RegimeAnalysis[]): Promise<{
    averageMomentum: number
    momentumDispersion: number
    strongMomentumCount: number
    momentumDirection: 'BULLISH' | 'BEARISH' | 'NEUTRAL'
  }> {
    const momentums = marketData.map(d => d.momentum)
    const averageMomentum = momentums.reduce((a, b) => a + b, 0) / momentums.length
    const momentumDispersion = Math.sqrt(
      momentums.reduce((sum, m) => sum + Math.pow(m - averageMomentum, 2), 0) / momentums.length
    )
    const strongMomentumCount = momentums.filter(m => Math.abs(m) > 0.02).length
    
    let momentumDirection: 'BULLISH' | 'BEARISH' | 'NEUTRAL' = 'NEUTRAL'
    if (averageMomentum > 0.01) {
      momentumDirection = 'BULLISH'
    } else if (averageMomentum < -0.01) {
      momentumDirection = 'BEARISH'
    }
    
    return {
      averageMomentum,
      momentumDispersion,
      strongMomentumCount,
      momentumDirection
    }
  }

  private determineRegime(
    volatility: any,
    correlation: any,
    liquidity: any,
    momentum: any
  ): MarketRegime {
    // Calculate regime scores
    const volatilityScore = this.calculateVolatilityScore(volatility)
    const correlationScore = this.calculateCorrelationScore(correlation)
    const liquidityScore = this.calculateLiquidityScore(liquidity)
    const momentumScore = this.calculateMomentumScore(momentum)
    
    // Determine regime based on scores
    let regime: 'TRENDING' | 'RANGING' | 'VOLATILE' | 'BREAKOUT' | 'CRISIS' = 'RANGING'
    let confidence = 0.5
    
    // Crisis detection (highest priority)
    if (volatilityScore > 0.8 && liquidityScore < 0.2) {
      regime = 'CRISIS'
      confidence = 0.9
    }
    // Volatile regime
    else if (volatilityScore > 0.7) {
      regime = 'VOLATILE'
      confidence = 0.8
    }
    // Trending regime
    else if (correlationScore > 0.6 && Math.abs(momentumScore) > 0.6) {
      regime = 'TRENDING'
      confidence = 0.7
    }
    // Breakout regime
    else if (momentumScore > 0.7 && volatilityScore > 0.5) {
      regime = 'BREAKOUT'
      confidence = 0.6
    }
    // Ranging regime (default)
    else {
      regime = 'RANGING'
      confidence = 0.5
    }
    
    // Determine volatility level
    let volatilityLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'EXTREME' = 'MEDIUM'
    if (volatilityScore > 0.8) volatilityLevel = 'EXTREME'
    else if (volatilityScore > 0.6) volatilityLevel = 'HIGH'
    else if (volatilityScore < 0.3) volatilityLevel = 'LOW'
    
    // Determine correlation regime
    let correlationRegime: 'LOW' | 'MEDIUM' | 'HIGH' | 'EXTREME' = 'MEDIUM'
    if (correlationScore > 0.8) correlationRegime = 'EXTREME'
    else if (correlationScore > 0.6) correlationRegime = 'HIGH'
    else if (correlationScore < 0.3) correlationRegime = 'LOW'
    
    // Determine liquidity condition
    let liquidityCondition: 'NORMAL' | 'STRESSED' | 'CRITICAL' = 'NORMAL'
    if (liquidityScore < 0.2) liquidityCondition = 'CRITICAL'
    else if (liquidityScore < 0.4) liquidityCondition = 'STRESSED'
    
    return {
      regime,
      confidence,
      volatilityLevel,
      correlationRegime,
      liquidityCondition,
      momentumDirection: momentum.momentumDirection,
      timestamp: Date.now(),
      metadata: {
        volatilityScore,
        correlationScore,
        liquidityScore,
        momentumScore,
        regimeStability: this.calculateRegimeStability(),
        lastRegimeChange: this.currentRegime.metadata.lastRegimeChange
      }
    }
  }

  private calculateVolatilityScore(volatility: any): number {
    const baseScore = Math.min(volatility.averageVolatility * 20, 1)
    const dispersionPenalty = Math.max(0, volatility.volatilityDispersion - 0.02) * 5
    const extremeBonus = Math.min(volatility.extremeVolatilityCount / 10, 0.3)
    
    return Math.min(Math.max(baseScore - dispersionPenalty + extremeBonus, 0), 1)
  }

  private calculateCorrelationScore(correlation: any): number {
    const baseScore = correlation.averageCorrelation
    const dispersionPenalty = Math.max(0, correlation.correlationDispersion - 0.1) * 2
    const highCorrelationBonus = Math.min(correlation.highCorrelationCount / 20, 0.2)
    
    return Math.min(Math.max(baseScore - dispersionPenalty + highCorrelationBonus, 0), 1)
  }

  private calculateLiquidityScore(liquidity: any): number {
    const baseScore = liquidity.averageLiquidity
    const dispersionPenalty = Math.max(0, liquidity.liquidityDispersion - 0.1) * 2
    const lowLiquidityPenalty = Math.min(liquidity.lowLiquidityCount / 10, 0.3)
    
    return Math.min(Math.max(baseScore - dispersionPenalty - lowLiquidityPenalty, 0), 1)
  }

  private calculateMomentumScore(momentum: any): number {
    const baseScore = Math.abs(momentum.averageMomentum) * 10
    const strongMomentumBonus = Math.min(momentum.strongMomentumCount / 20, 0.2)
    
    return Math.min(Math.max(baseScore + strongMomentumBonus, 0), 1)
  }

  private calculateTrend(values: number[]): number {
    if (values.length < 2) return 0
    
    const n = values.length
    const sumX = (n * (n - 1)) / 2
    const sumY = values.reduce((a, b) => a + b, 0)
    const sumXY = values.reduce((sum, y, i) => sum + i * y, 0)
    const sumX2 = values.reduce((sum, _, i) => sum + i * i, 0)
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX)
    return slope
  }

  private calculateRegimeStability(): number {
    if (this.regimeHistory.length < 2) return 0.5
    
    const recentRegimes = this.regimeHistory.slice(-10)
    const regimeChanges = recentRegimes.reduce((changes, regime, i) => {
      if (i > 0 && regime.regime !== recentRegimes[i - 1].regime) {
        changes++
      }
      return changes
    }, 0)
    
    return Math.max(0, 1 - regimeChanges / recentRegimes.length)
  }

  private validateRegimeChange(newRegime: MarketRegime): MarketRegime {
    // Check if regime change is significant enough
    const regimeChanged = newRegime.regime !== this.currentRegime.regime
    const confidenceImproved = newRegime.confidence > this.currentRegime.confidence
    const stabilityThreshold = this.currentRegime.metadata.regimeStability > this.REGIME_STABILITY_THRESHOLD
    
    // Only allow regime change if confidence is high and current regime is stable
    if (regimeChanged && (!confidenceImproved || !stabilityThreshold)) {
      return {
        ...newRegime,
        regime: this.currentRegime.regime,
        confidence: Math.max(newRegime.confidence, this.currentRegime.confidence * 0.8)
      }
    }
    
    return newRegime
  }

  private shouldUpdateRegime(newRegime: MarketRegime): boolean {
    // Update if regime changed or confidence improved significantly
    const regimeChanged = newRegime.regime !== this.currentRegime.regime
    const confidenceImproved = newRegime.confidence > this.currentRegime.confidence + 0.1
    const timeElapsed = Date.now() - this.currentRegime.timestamp > 5 * 60 * 1000 // 5 minutes
    
    return regimeChanged || confidenceImproved || timeElapsed
  }

  private updateRegime(newRegime: MarketRegime): void {
    const regimeChanged = newRegime.regime !== this.currentRegime.regime
    
    // Update regime history
    this.regimeHistory.push(this.currentRegime)
    if (this.regimeHistory.length > this.MAX_HISTORY) {
      this.regimeHistory.shift()
    }
    
    // Update current regime
    this.currentRegime = {
      ...newRegime,
      metadata: {
        ...newRegime.metadata,
        lastRegimeChange: regimeChanged ? Date.now() : this.currentRegime.metadata.lastRegimeChange
      }
    }
    
    // Publish regime update event
    this.eventBus.publish(EventType.MARKET_REGIME_UPDATE, this.currentRegime)
    
    if (regimeChanged) {
      console.log(`Market regime changed: ${this.currentRegime.regime} (confidence: ${this.currentRegime.confidence})`)
    }
  }

  private updateMetrics(startTime: number, symbolCount: number): void {
    this.metrics.analyzedSymbols = symbolCount
    this.metrics.processingTime = Date.now() - startTime
    this.metrics.lastUpdateTime = Date.now()
    this.metrics.averageConfidence = this.currentRegime.confidence
    this.metrics.regimeStability = this.currentRegime.metadata.regimeStability
    
    // Update regime distribution
    this.metrics.regimeDistribution[this.currentRegime.regime] = 
      (this.metrics.regimeDistribution[this.currentRegime.regime] || 0) + 1
  }

  private handleDataOrchestratorUpdate(event: SystemEvent): void {
    // Handle updates from data orchestrator
    if (event.metrics && event.metrics.processedSymbols) {
      this.metrics.totalSymbols = event.metrics.processedSymbols
    }
  }

  // Public API methods
  getCurrentRegime(): MarketRegime {
    return { ...this.currentRegime }
  }

  getRegimeConfidence(): number {
    return this.currentRegime.confidence
  }

  getMetrics(): RegimeMetrics {
    return { ...this.metrics }
  }

  getRegimeHistory(limit: number = 100): MarketRegime[] {
    return this.regimeHistory.slice(-limit)
  }

  getSymbolAnalysis(symbol: string): RegimeAnalysis | null {
    return this.symbolAnalysis.get(symbol) || null
  }

  startContinuousAnalysis(symbols: string[]): void {
    if (this.analysisTimer) {
      clearInterval(this.analysisTimer)
    }
    
    this.detectMarketRegime(symbols)
    
    this.analysisTimer = setInterval(() => {
      this.detectMarketRegime(symbols)
    }, this.ANALYSIS_INTERVAL)
    
    console.log(`Started continuous market regime analysis every ${this.ANALYSIS_INTERVAL / 1000}s`)
  }

  stopContinuousAnalysis(): void {
    if (this.analysisTimer) {
      clearInterval(this.analysisTimer)
      this.analysisTimer = undefined
      console.log('Stopped continuous market regime analysis')
    }
  }

  // API endpoints for microservice
  async getCurrentRegimeEndpoint(): Promise<{ regime: MarketRegime; status: string }> {
    return {
      regime: this.getCurrentRegime(),
      status: 'success'
    }
  }

  async getRegimeConfidenceEndpoint(): Promise<{ confidence: number; status: string }> {
    return {
      confidence: this.getRegimeConfidence(),
      status: 'success'
    }
  }

  async getRegimeMetricsEndpoint(): Promise<{ metrics: RegimeMetrics; status: string }> {
    return {
      metrics: this.getMetrics(),
      status: 'success'
    }
  }
}

// Singleton instance
const marketRegimeEngine = new MarketRegimeEngine()

// Export functions for external use
export async function detectMarketRegime(symbols: string[]): Promise<MarketRegime> {
  return marketRegimeEngine.detectMarketRegime(symbols)
}

export function getCurrentRegime(): MarketRegime {
  return marketRegimeEngine.getCurrentRegime()
}

export function getRegimeConfidence(): number {
  return marketRegimeEngine.getRegimeConfidence()
}

export function getRegimeMetrics(): RegimeMetrics {
  return marketRegimeEngine.getMetrics()
}

export function startContinuousAnalysis(symbols: string[]): void {
  marketRegimeEngine.startContinuousAnalysis(symbols)
}

export function stopContinuousAnalysis(): void {
  marketRegimeEngine.stopContinuousAnalysis()
}

export default marketRegimeEngine 