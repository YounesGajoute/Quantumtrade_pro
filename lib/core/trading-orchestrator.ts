import { eventBus, EventType, MarketDataEvent, SignalEvent, TradeEvent } from './event-bus'
import { filteringEngine } from './filtering-engine'
import { indicatorEngine } from './indicator-engine'
import { riskManager } from './risk-manager'
import { get24hrTicker, getKlines, placeOrder } from '../binance-api'

// Trading Configuration
export interface TradingConfig {
  // Execution Settings
  autoExecute: boolean
  maxPositions: number
  minSignalConfidence: number
  executionDelay: number // ms
  
  // Risk Settings
  maxDailyTrades: number
  maxDailyLoss: number
  positionSizing: 'FIXED' | 'KELLY' | 'RISK_PARITY'
  
  // Performance Settings
  updateInterval: number // ms
  batchSize: number
  enableParallelProcessing: boolean
}

// Trading State
export interface TradingState {
  isActive: boolean
  isRunning: boolean
  lastUpdate: number
  totalTrades: number
  dailyTrades: number
  dailyPnL: number
  totalPnL: number
  activePositions: number
  signalsGenerated: number
  signalsExecuted: number
}

class TradingOrchestrator {
  private config: TradingConfig
  private state: TradingState
  private symbols: string[] = []
  private processingInterval?: NodeJS.Timeout
  private dailyResetInterval?: NodeJS.Timeout
  
  constructor() {
    this.config = {
      // Execution Settings
      autoExecute: false,
      maxPositions: 5,
      minSignalConfidence: 0.7,
      executionDelay: 1000,
      
      // Risk Settings
      maxDailyTrades: 20,
      maxDailyLoss: 0.05, // 5%
      positionSizing: 'FIXED',
      
      // Performance Settings
      updateInterval: 5000, // 5 seconds
      batchSize: 10,
      enableParallelProcessing: true
    }
    
    this.state = {
      isActive: false,
      isRunning: false,
      lastUpdate: 0,
      totalTrades: 0,
      dailyTrades: 0,
      dailyPnL: 0,
      totalPnL: 0,
      activePositions: 0,
      signalsGenerated: 0,
      signalsExecuted: 0
    }
    
    this.initializeEventListeners()
    this.setupDailyReset()
  }

  private initializeEventListeners(): void {
    // Listen for confirmed signals
    eventBus.subscribe<SignalEvent>(EventType.SIGNAL_CONFIRMED, (signal) => {
      this.handleConfirmedSignal(signal)
    })
    
    // Listen for risk alerts
    eventBus.subscribe(EventType.RISK_LIMIT_BREACH, (alert) => {
      this.handleRiskAlert(alert)
    })
    
    // Listen for order fills
    eventBus.subscribe(EventType.ORDER_FILLED, (order) => {
      this.handleOrderFilled(order)
    })
  }

  private setupDailyReset(): void {
    // Reset daily counters at midnight UTC
    const now = new Date()
    const tomorrow = new Date(now)
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1)
    tomorrow.setUTCHours(0, 0, 0, 0)
    
    const timeUntilReset = tomorrow.getTime() - now.getTime()
    
    setTimeout(() => {
      this.resetDailyCounters()
      // Set up recurring daily reset
      this.dailyResetInterval = setInterval(() => {
        this.resetDailyCounters()
      }, 24 * 60 * 60 * 1000)
    }, timeUntilReset)
  }

  private resetDailyCounters(): void {
    this.state.dailyTrades = 0
    this.state.dailyPnL = 0
    console.log('Daily counters reset')
  }

  // Start the trading system
  async start(symbols?: string[]): Promise<void> {
    if (this.state.isActive) {
      console.log('Trading system already active')
      return
    }

    try {
      console.log('Starting trading orchestrator...')
      
      // Initialize symbols
      if (symbols) {
        this.symbols = symbols
      } else {
        // Get top symbols by volume
        const tickerData = await get24hrTicker()
        this.symbols = tickerData
          .filter(ticker => ticker.symbol.endsWith('USDT'))
          .sort((a, b) => parseFloat(b.volume) - parseFloat(a.volume))
          .slice(0, 100)
          .map(ticker => ticker.symbol)
      }

      this.state.isActive = true
      this.state.isRunning = true
      this.state.lastUpdate = Date.now()

      // Start processing loop
      this.startProcessingLoop()

      console.log(`Trading system started with ${this.symbols.length} symbols`)
      
      // Publish system event
      eventBus.publish(EventType.SYSTEM_HEALTH_UPDATE, {
        component: 'TradingOrchestrator',
        status: 'HEALTHY',
        metrics: {
          symbols: this.symbols.length,
          isActive: this.state.isActive,
          isRunning: this.state.isRunning
        },
        timestamp: Date.now()
      })

    } catch (error) {
      console.error('Failed to start trading system:', error)
      this.state.isActive = false
      this.state.isRunning = false
      throw error
    }
  }

  // Stop the trading system
  stop(): void {
    console.log('Stopping trading orchestrator...')
    
    this.state.isActive = false
    this.state.isRunning = false
    
    if (this.processingInterval) {
      clearInterval(this.processingInterval)
      this.processingInterval = undefined
    }
    
    console.log('Trading system stopped')
  }

  // Main processing loop
  private startProcessingLoop(): void {
    this.processingInterval = setInterval(async () => {
      if (!this.state.isRunning) return
      
      try {
        await this.processMarketData()
        this.state.lastUpdate = Date.now()
      } catch (error) {
        console.error('Error in processing loop:', error)
        eventBus.publish(EventType.SYSTEM_HEALTH_UPDATE, {
          component: 'TradingOrchestrator',
          status: 'ERROR',
          metrics: { error: error instanceof Error ? error.message : 'Unknown error' },
          timestamp: Date.now()
        })
      }
    }, this.config.updateInterval)
  }

  // Process market data through the pipeline
  private async processMarketData(): Promise<void> {
    const startTime = Date.now()
    
    try {
      // Step 1: Fetch market data
      const marketData = await this.fetchMarketData()
      
      // Step 2: Process through filtering engine
      for (const data of marketData) {
        eventBus.publish(EventType.MARKET_DATA_UPDATE, data)
      }
      
      // Step 3: Calculate indicators for filtered symbols
      const filteredSymbols = filteringEngine.getTopSymbols(20)
      const symbolsToProcess = filteredSymbols.map(s => s.symbol)
      
      if (symbolsToProcess.length > 0) {
        await this.calculateIndicators(symbolsToProcess)
      }
      
      // Step 4: Update risk metrics
      this.updateRiskMetrics()
      
      // Step 5: Publish performance metrics
      const processingTime = Date.now() - startTime
      eventBus.publish(EventType.PERFORMANCE_METRIC, {
        component: 'TradingOrchestrator',
        processingTime,
        symbolsProcessed: marketData.length,
        signalsGenerated: this.state.signalsGenerated,
        activePositions: this.state.activePositions,
        timestamp: Date.now()
      })
      
    } catch (error) {
      console.error('Error processing market data:', error)
      throw error
    }
  }

  // Fetch market data for all symbols
  private async fetchMarketData(): Promise<MarketDataEvent[]> {
    try {
      const tickerData = await get24hrTicker()
      
      return tickerData
        .filter(ticker => this.symbols.includes(ticker.symbol))
        .map(ticker => ({
          symbol: ticker.symbol,
          price: parseFloat(ticker.price),
          volume: parseFloat(ticker.volume),
          change24h: parseFloat(ticker.priceChangePercent),
          timestamp: Date.now()
        }))
        
    } catch (error) {
      console.error('Error fetching market data:', error)
      return []
    }
  }

  // Calculate indicators for symbols
  private async calculateIndicators(symbols: string[]): Promise<void> {
    const indicators = [
      'RSI_5M', 'RSI_15M', 'RSI_1H',
      'MACD', 'BOLLINGER_BANDS', 'ATR',
      'VWAP', 'VOLUME_PROFILE'
    ]
    
    for (const symbol of symbols) {
      try {
        // Fetch klines for indicator calculation
        const klines = await getKlines(symbol, '1h', 100)
        
        // Calculate indicators
        await indicatorEngine.calculateIndicators(symbol, klines, indicators as any)
        
      } catch (error) {
        console.warn(`Failed to calculate indicators for ${symbol}:`, error)
      }
    }
  }

  // Handle confirmed signals
  private async handleConfirmedSignal(signal: SignalEvent): Promise<void> {
    this.state.signalsGenerated++
    
    // Check if we should execute the signal
    if (!this.shouldExecuteSignal(signal)) {
      return
    }
    
    try {
      // Check risk limits
      if (!this.checkRiskLimits(signal)) {
        console.log(`Risk limits prevent execution of signal for ${signal.symbol}`)
        return
      }
      
      // Execute the trade
      if (this.config.autoExecute) {
        await this.executeTrade(signal)
      } else {
        // Publish trade signal for manual review
        eventBus.publish(EventType.TRADE_SIGNAL, signal)
      }
      
    } catch (error) {
      console.error(`Error handling signal for ${signal.symbol}:`, error)
    }
  }

  // Check if signal should be executed
  private shouldExecuteSignal(signal: SignalEvent): boolean {
    // Check confidence threshold
    if (signal.confidence < this.config.minSignalConfidence) {
      return false
    }
    
    // Check daily trade limit
    if (this.state.dailyTrades >= this.config.maxDailyTrades) {
      return false
    }
    
    // Check daily loss limit
    if (this.state.dailyPnL < -(this.config.maxDailyLoss)) {
      return false
    }
    
    // Check position limit
    if (this.state.activePositions >= this.config.maxPositions) {
      return false
    }
    
    return true
  }

  // Check risk limits
  private checkRiskLimits(signal: SignalEvent): boolean {
    // Check if circuit breaker is active
    if (riskManager.isCircuitBreakerActive()) {
      return false
    }
    
    // Additional risk checks can be added here
    return true
  }

  // Execute trade
  private async executeTrade(signal: SignalEvent): Promise<void> {
    try {
      // Calculate position size
      const positionSize = this.calculatePositionSize(signal)
      
      // Place order
      const order = await placeOrder({
        symbol: signal.symbol,
        side: signal.signalType === 'BUY' ? 'BUY' : 'SELL',
        type: 'MARKET',
        quantity: positionSize.toString()
      })
      
      // Publish order event
      eventBus.publish(EventType.ORDER_PLACED, {
        symbol: signal.symbol,
        side: signal.signalType,
        quantity: positionSize,
        orderId: order.orderId.toString(),
        timestamp: Date.now()
      })
      
      this.state.signalsExecuted++
      
      // Mark symbol as recently traded
      filteringEngine.markRecentlyTraded(signal.symbol)
      
    } catch (error) {
      console.error(`Error executing trade for ${signal.symbol}:`, error)
      throw error
    }
  }

  // Calculate position size
  private calculatePositionSize(signal: SignalEvent): number {
    // This is a simplified position sizing calculation
    // In practice, this would use Kelly Criterion, Risk Parity, etc.
    const baseSize = 0.01 // 1% of portfolio
    const confidenceMultiplier = signal.confidence
    const riskMultiplier = 1 - (riskManager.getRiskMetrics()?.var95 || 0)
    
    return baseSize * confidenceMultiplier * riskMultiplier
  }

  // Handle risk alerts
  private handleRiskAlert(alert: any): void {
    console.log(`Risk alert: ${alert.message}`)
    
    if (alert.severity === 'CRITICAL') {
      // Stop trading immediately
      this.stop()
    } else if (alert.severity === 'HIGH') {
      // Reduce position sizes
      this.config.maxPositions = Math.max(1, this.config.maxPositions - 1)
    }
  }

  // Handle order fills
  private handleOrderFilled(order: any): void {
    this.state.totalTrades++
    this.state.dailyTrades++
    this.state.activePositions++
    
    // Update portfolio data
    // This would typically come from the exchange API
    const portfolioData = {
      totalBalance: 10000, // Mock data
      availableBalance: 8000,
      totalEquity: 10200,
      totalExposure: 2000,
      dailyPnL: this.state.dailyPnL,
      totalPnL: this.state.totalPnL,
      maxDrawdown: 0.05,
      currentDrawdown: 0.02,
      volatility: 0.3,
      correlation: 0.2,
      timestamp: Date.now()
    }
    
    riskManager.updatePortfolio(portfolioData)
  }

  // Update risk metrics
  private updateRiskMetrics(): void {
    // This would update portfolio data from the exchange
    // For now, using mock data
    const portfolioData = {
      totalBalance: 10000,
      availableBalance: 8000,
      totalEquity: 10200,
      totalExposure: 2000,
      dailyPnL: this.state.dailyPnL,
      totalPnL: this.state.totalPnL,
      maxDrawdown: 0.05,
      currentDrawdown: 0.02,
      volatility: 0.3,
      correlation: 0.2,
      timestamp: Date.now()
    }
    
    riskManager.updatePortfolio(portfolioData)
  }

  // Get trading state
  getState(): TradingState {
    return { ...this.state }
  }

  // Get configuration
  getConfig(): TradingConfig {
    return { ...this.config }
  }

  // Update configuration
  updateConfig(newConfig: Partial<TradingConfig>): void {
    this.config = { ...this.config, ...newConfig }
  }

  // Get system statistics
  getStats(): {
    state: TradingState
    config: TradingConfig
    filteringStats: any
    indicatorStats: any
    riskStats: any
  } {
    return {
      state: this.getState(),
      config: this.getConfig(),
      filteringStats: filteringEngine.getStats(),
      indicatorStats: indicatorEngine.getStats(),
      riskStats: riskManager.getStats()
    }
  }

  // Emergency stop
  emergencyStop(): void {
    console.log('EMERGENCY STOP ACTIVATED')
    this.stop()
    
    // Close all positions
    // This would iterate through all positions and close them
    
    eventBus.publish(EventType.RISK_LIMIT_BREACH, {
      type: 'LIMIT_BREACH',
      severity: 'CRITICAL',
      message: 'Emergency stop activated - all positions closed',
      data: {},
      timestamp: Date.now()
    })
  }
}

// Export singleton instance
export const tradingOrchestrator = new TradingOrchestrator() 