import { eventBus, EventType, RiskEvent } from './event-bus'

// Risk Configuration
export interface RiskConfig {
  // Position Limits
  maxPositionSize: number // Maximum position size as % of portfolio
  maxTotalExposure: number // Maximum total exposure as % of portfolio
  maxSymbolExposure: number // Maximum exposure per symbol as % of portfolio
  
  // Drawdown Limits
  maxDailyDrawdown: number // Maximum daily drawdown as %
  maxTotalDrawdown: number // Maximum total drawdown as %
  
  // Volatility Limits
  maxVolatility: number // Maximum allowed volatility
  volatilityThreshold: number // Volatility alert threshold
  
  // Correlation Limits
  maxCorrelation: number // Maximum correlation between positions
  
  // Leverage Limits
  maxLeverage: number // Maximum allowed leverage
  leverageDecay: number // Leverage reduction factor
  
  // Circuit Breakers
  circuitBreakerThreshold: number // Loss threshold to trigger circuit breaker
  circuitBreakerDuration: number // Duration of circuit breaker in minutes
}

// Position Data
export interface PositionData {
  symbol: string
  side: 'LONG' | 'SHORT'
  size: number
  entryPrice: number
  currentPrice: number
  unrealizedPnl: number
  unrealizedPnlPercent: number
  leverage: number
  timestamp: number
}

// Portfolio Data
export interface PortfolioData {
  totalBalance: number
  availableBalance: number
  totalEquity: number
  totalExposure: number
  dailyPnL: number
  totalPnL: number
  maxDrawdown: number
  currentDrawdown: number
  volatility: number
  correlation: number
  timestamp: number
}

// Risk Metrics
export interface RiskMetrics {
  var95: number // 95% Value at Risk
  var99: number // 99% Value at Risk
  expectedShortfall: number
  sharpeRatio: number
  sortinoRatio: number
  calmarRatio: number
  maxDrawdown: number
  correlationRisk: number
  liquidityRisk: number
  concentrationRisk: number
}

class RiskManager {
  private config: RiskConfig
  private positions: Map<string, PositionData> = new Map()
  private portfolio: PortfolioData | null = null
  private riskMetrics: RiskMetrics | null = null
  private circuitBreakerActive = false
  private circuitBreakerStartTime = 0
  private riskHistory: Array<{ timestamp: number; metrics: RiskMetrics }> = []
  
  constructor() {
    this.config = {
      // Position Limits
      maxPositionSize: 0.05, // 5% per position
      maxTotalExposure: 0.8, // 80% total exposure
      maxSymbolExposure: 0.1, // 10% per symbol
      
      // Drawdown Limits
      maxDailyDrawdown: 0.05, // 5% daily drawdown
      maxTotalDrawdown: 0.15, // 15% total drawdown
      
      // Volatility Limits
      maxVolatility: 0.5, // 50% volatility
      volatilityThreshold: 0.3, // 30% volatility alert
      
      // Correlation Limits
      maxCorrelation: 0.7, // 70% correlation
      
      // Leverage Limits
      maxLeverage: 10, // 10x leverage
      leverageDecay: 0.8, // 20% leverage reduction
      
      // Circuit Breakers
      circuitBreakerThreshold: 0.1, // 10% loss threshold
      circuitBreakerDuration: 30 // 30 minutes
    }
    
    this.initializeEventListeners()
  }

  private initializeEventListeners(): void {
    // Listen for trade events
    eventBus.subscribe(EventType.ORDER_FILLED, (data: any) => {
      this.updatePosition(data)
    })
    
    // Listen for market data updates
    eventBus.subscribe(EventType.MARKET_DATA_UPDATE, (data: any) => {
      this.updatePositionPrices(data)
    })
  }

  // Update position data
  private updatePosition(tradeData: any): void {
    const { symbol, side, quantity, price } = tradeData
    
    if (this.positions.has(symbol)) {
      // Update existing position
      const position = this.positions.get(symbol)!
      if (position.side === side) {
        // Increase position
        const totalSize = position.size + quantity
        const avgPrice = ((position.entryPrice * position.size) + (price * quantity)) / totalSize
        position.size = totalSize
        position.entryPrice = avgPrice
      } else {
        // Reduce or reverse position
        if (quantity >= position.size) {
          // Close position
          this.positions.delete(symbol)
        } else {
          // Reduce position
          position.size -= quantity
        }
      }
    } else {
      // Create new position
      this.positions.set(symbol, {
        symbol,
        side: side === 'BUY' ? 'LONG' : 'SHORT',
        size: quantity,
        entryPrice: price,
        currentPrice: price,
        unrealizedPnl: 0,
        unrealizedPnlPercent: 0,
        leverage: 1,
        timestamp: Date.now()
      })
    }
    
    this.calculateRiskMetrics()
  }

  // Update position prices
  private updatePositionPrices(marketData: any): void {
    const { symbol, price } = marketData
    
    if (this.positions.has(symbol)) {
      const position = this.positions.get(symbol)!
      position.currentPrice = price
      
      // Calculate unrealized P&L
      if (position.side === 'LONG') {
        position.unrealizedPnl = (price - position.entryPrice) * position.size
        position.unrealizedPnlPercent = (price - position.entryPrice) / position.entryPrice
      } else {
        position.unrealizedPnl = (position.entryPrice - price) * position.size
        position.unrealizedPnlPercent = (position.entryPrice - price) / position.entryPrice
      }
    }
    
    this.calculateRiskMetrics()
  }

  // Calculate comprehensive risk metrics
  private calculateRiskMetrics(): void {
    if (this.positions.size === 0) {
      this.riskMetrics = null
      return
    }

    const positions = Array.from(this.positions.values())
    const totalExposure = positions.reduce((sum, pos) => sum + (pos.size * pos.currentPrice), 0)
    const totalPnL = positions.reduce((sum, pos) => sum + pos.unrealizedPnl, 0)
    
    // Calculate Value at Risk (simplified)
    const returns = this.calculateHistoricalReturns()
    const var95 = this.calculateVaR(returns, 0.95)
    const var99 = this.calculateVaR(returns, 0.99)
    
    // Calculate Expected Shortfall
    const expectedShortfall = this.calculateExpectedShortfall(returns, 0.95)
    
    // Calculate Sharpe Ratio (simplified)
    const sharpeRatio = this.calculateSharpeRatio(returns)
    
    // Calculate Sortino Ratio
    const sortinoRatio = this.calculateSortinoRatio(returns)
    
    // Calculate Calmar Ratio
    const calmarRatio = this.calculateCalmarRatio(returns)
    
    // Calculate correlation risk
    const correlationRisk = this.calculateCorrelationRisk(positions)
    
    // Calculate liquidity risk
    const liquidityRisk = this.calculateLiquidityRisk(positions)
    
    // Calculate concentration risk
    const concentrationRisk = this.calculateConcentrationRisk(positions)
    
    this.riskMetrics = {
      var95,
      var99,
      expectedShortfall,
      sharpeRatio,
      sortinoRatio,
      calmarRatio,
      maxDrawdown: this.calculateMaxDrawdown(returns),
      correlationRisk,
      liquidityRisk,
      concentrationRisk
    }
    
    // Store in history
    this.riskHistory.push({
      timestamp: Date.now(),
      metrics: this.riskMetrics
    })
    
    // Keep only last 1000 entries
    if (this.riskHistory.length > 1000) {
      this.riskHistory.shift()
    }
    
    // Check risk limits
    this.checkRiskLimits()
  }

  // Calculate historical returns (simplified)
  private calculateHistoricalReturns(): number[] {
    // This would use actual historical data
    // For now, return mock data
    return Array.from({ length: 100 }, () => (Math.random() - 0.5) * 0.1)
  }

  // Calculate Value at Risk
  private calculateVaR(returns: number[], confidence: number): number {
    const sortedReturns = returns.sort((a, b) => a - b)
    const index = Math.floor((1 - confidence) * sortedReturns.length)
    return Math.abs(sortedReturns[index] || 0)
  }

  // Calculate Expected Shortfall
  private calculateExpectedShortfall(returns: number[], confidence: number): number {
    const varValue = this.calculateVaR(returns, confidence)
    const tailReturns = returns.filter(r => r <= -varValue)
    return tailReturns.length > 0 ? Math.abs(tailReturns.reduce((sum, r) => sum + r, 0) / tailReturns.length) : 0
  }

  // Calculate Sharpe Ratio
  private calculateSharpeRatio(returns: number[]): number {
    const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length
    const stdDev = Math.sqrt(variance)
    return stdDev > 0 ? mean / stdDev : 0
  }

  // Calculate Sortino Ratio
  private calculateSortinoRatio(returns: number[]): number {
    const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length
    const negativeReturns = returns.filter(r => r < 0)
    const downsideVariance = negativeReturns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length
    const downsideDeviation = Math.sqrt(downsideVariance)
    return downsideDeviation > 0 ? mean / downsideDeviation : 0
  }

  // Calculate Calmar Ratio
  private calculateCalmarRatio(returns: number[]): number {
    const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length
    const maxDrawdown = this.calculateMaxDrawdown(returns)
    return maxDrawdown > 0 ? mean / maxDrawdown : 0
  }

  // Calculate Maximum Drawdown
  private calculateMaxDrawdown(returns: number[]): number {
    let peak = 1
    let maxDrawdown = 0
    let cumulative = 1
    
    for (const ret of returns) {
      cumulative *= (1 + ret)
      if (cumulative > peak) {
        peak = cumulative
      }
      const drawdown = (peak - cumulative) / peak
      if (drawdown > maxDrawdown) {
        maxDrawdown = drawdown
      }
    }
    
    return maxDrawdown
  }

  // Calculate correlation risk
  private calculateCorrelationRisk(positions: PositionData[]): number {
    // Simplified correlation calculation
    // In practice, this would use actual price correlation data
    return Math.random() * 0.5 // Mock value
  }

  // Calculate liquidity risk
  private calculateLiquidityRisk(positions: PositionData[]): number {
    // Simplified liquidity risk calculation
    // Based on position sizes and market liquidity
    const totalExposure = positions.reduce((sum, pos) => sum + (pos.size * pos.currentPrice), 0)
    return Math.min(totalExposure / 1000000, 1) // Normalized to 0-1
  }

  // Calculate concentration risk
  private calculateConcentrationRisk(positions: PositionData[]): number {
    if (positions.length === 0) return 0
    
    const totalExposure = positions.reduce((sum, pos) => sum + (pos.size * pos.currentPrice), 0)
    const maxPositionExposure = Math.max(...positions.map(pos => pos.size * pos.currentPrice))
    
    return maxPositionExposure / totalExposure
  }

  // Check risk limits and trigger alerts
  private checkRiskLimits(): void {
    if (!this.riskMetrics || !this.portfolio) return

    // Check drawdown limits
    if (this.portfolio.currentDrawdown > this.config.maxDailyDrawdown) {
      this.triggerRiskAlert('LIMIT_BREACH', 'HIGH', 
        `Daily drawdown limit exceeded: ${(this.portfolio.currentDrawdown * 100).toFixed(2)}%`)
    }

    if (this.portfolio.maxDrawdown > this.config.maxTotalDrawdown) {
      this.triggerRiskAlert('LIMIT_BREACH', 'CRITICAL', 
        `Total drawdown limit exceeded: ${(this.portfolio.maxDrawdown * 100).toFixed(2)}%`)
    }

    // Check volatility limits
    if (this.portfolio.volatility > this.config.maxVolatility) {
      this.triggerRiskAlert('VOLATILITY_ALERT', 'HIGH', 
        `Volatility limit exceeded: ${(this.portfolio.volatility * 100).toFixed(2)}%`)
    }

    // Check correlation limits
    if (this.riskMetrics.correlationRisk > this.config.maxCorrelation) {
      this.triggerRiskAlert('LIMIT_BREACH', 'MEDIUM', 
        `Correlation limit exceeded: ${(this.riskMetrics.correlationRisk * 100).toFixed(2)}%`)
    }

    // Check circuit breaker
    if (this.portfolio.totalPnL < -(this.portfolio.totalBalance * this.config.circuitBreakerThreshold)) {
      this.activateCircuitBreaker()
    }
  }

  // Trigger risk alert
  private triggerRiskAlert(type: 'LIMIT_BREACH' | 'MARGIN_CALL' | 'VOLATILITY_ALERT', 
                          severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL', 
                          message: string): void {
    const riskEvent: RiskEvent = {
      type,
      severity,
      message,
      data: {
        portfolio: this.portfolio,
        riskMetrics: this.riskMetrics,
        positions: Array.from(this.positions.values())
      },
      timestamp: Date.now()
    }

    eventBus.publish(EventType.RISK_LIMIT_BREACH, riskEvent)
  }

  // Activate circuit breaker
  private activateCircuitBreaker(): void {
    if (this.circuitBreakerActive) return

    this.circuitBreakerActive = true
    this.circuitBreakerStartTime = Date.now()

    this.triggerRiskAlert('LIMIT_BREACH', 'CRITICAL', 
      'Circuit breaker activated - trading halted')

    // Auto-deactivate after duration
    setTimeout(() => {
      this.circuitBreakerActive = false
      this.triggerRiskAlert('LIMIT_BREACH', 'LOW', 
        'Circuit breaker deactivated - trading resumed')
    }, this.config.circuitBreakerDuration * 60 * 1000)
  }

  // Check if new position is allowed
  canOpenPosition(symbol: string, size: number, price: number): boolean {
    if (this.circuitBreakerActive) return false

    const positionValue = size * price
    const totalExposure = this.portfolio?.totalExposure || 0
    const totalBalance = this.portfolio?.totalBalance || 1

    // Check position size limit
    if (positionValue / totalBalance > this.config.maxPositionSize) {
      return false
    }

    // Check total exposure limit
    if ((totalExposure + positionValue) / totalBalance > this.config.maxTotalExposure) {
      return false
    }

    // Check symbol exposure limit
    const currentSymbolExposure = this.positions.get(symbol)?.size || 0
    if ((currentSymbolExposure + positionValue) / totalBalance > this.config.maxSymbolExposure) {
      return false
    }

    return true
  }

  // Get recommended position size
  getRecommendedPositionSize(symbol: string, price: number): number {
    if (!this.portfolio) return 0

    const totalBalance = this.portfolio.totalBalance
    const maxPositionValue = totalBalance * this.config.maxPositionSize
    const currentSymbolExposure = this.positions.get(symbol)?.size || 0
    const remainingSymbolCapacity = (totalBalance * this.config.maxSymbolExposure) - currentSymbolExposure

    return Math.min(maxPositionValue, remainingSymbolCapacity) / price
  }

  // Update portfolio data
  updatePortfolio(portfolio: PortfolioData): void {
    this.portfolio = portfolio
    this.calculateRiskMetrics()
  }

  // Get risk metrics
  getRiskMetrics(): RiskMetrics | null {
    return this.riskMetrics
  }

  // Get positions
  getPositions(): PositionData[] {
    return Array.from(this.positions.values())
  }

  // Get portfolio
  getPortfolio(): PortfolioData | null {
    return this.portfolio
  }

  // Check if circuit breaker is active
  isCircuitBreakerActive(): boolean {
    return this.circuitBreakerActive
  }

  // Update risk configuration
  updateConfig(newConfig: Partial<RiskConfig>): void {
    this.config = { ...this.config, ...newConfig }
  }

  // Assess individual data point for risk
  assessDataPoint(dataPoint: any): {
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
    riskScore: number
    warnings: string[]
    recommendations: string[]
  } {
    const warnings: string[] = []
    const recommendations: string[] = []
    let riskScore = 0

    // Check price volatility
    if (dataPoint.volatility && dataPoint.volatility > this.config.maxVolatility) {
      warnings.push(`High volatility detected: ${(dataPoint.volatility * 100).toFixed(2)}%`)
      riskScore += 0.3
      recommendations.push('Consider reducing position size or implementing tighter stops')
    }

    // Check volume anomalies
    if (dataPoint.volume && dataPoint.volume < 100000) {
      warnings.push('Low liquidity detected')
      riskScore += 0.2
      recommendations.push('Consider alternative symbols with higher volume')
    }

    // Check price movement
    if (dataPoint.change24h && Math.abs(dataPoint.change24h) > 10) {
      warnings.push(`Extreme price movement: ${dataPoint.change24h.toFixed(2)}%`)
      riskScore += 0.4
      recommendations.push('Monitor closely and consider reducing exposure')
    }

    // Determine risk level
    let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'LOW'
    if (riskScore >= 0.7) riskLevel = 'CRITICAL'
    else if (riskScore >= 0.5) riskLevel = 'HIGH'
    else if (riskScore >= 0.3) riskLevel = 'MEDIUM'

    return {
      riskLevel,
      riskScore,
      warnings,
      recommendations
    }
  }

  // Get risk statistics
  getStats(): {
    totalPositions: number
    totalExposure: number
    currentDrawdown: number
    circuitBreakerActive: boolean
    riskAlerts: number
  } {
    return {
      totalPositions: this.positions.size,
      totalExposure: this.portfolio?.totalExposure || 0,
      currentDrawdown: this.portfolio?.currentDrawdown || 0,
      circuitBreakerActive: this.circuitBreakerActive,
      riskAlerts: this.riskHistory.length
    }
  }
}

// Export singleton instance
export const riskManager = new RiskManager() 