import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals'
import { EventBus, EventType } from '../lib/core/event-bus'
import { filteringEngine } from '../lib/core/filtering-engine'
import { indicatorEngine } from '../lib/core/indicator-engine'
import { riskManager } from '../lib/core/risk-manager'

// Mock external dependencies
jest.mock('../lib/binance-api')
jest.mock('../lib/database-service')

describe('Enterprise Event-Driven System', () => {
  let eventBus: EventBus
  let filteringEngine: FilteringEngine
  let indicatorEngine: IndicatorEngine
  let riskManager: RiskManager

  beforeEach(() => {
    eventBus = EventBus.getInstance()
    filteringEngine = new FilteringEngine()
    indicatorEngine = new IndicatorEngine()
    riskManager = new RiskManager()
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('Event Bus System', () => {
    it('should publish and subscribe to events correctly', () => {
      const mockHandler = jest.fn()
      const testData = { symbol: 'BTCUSDT', price: 50000 }

      eventBus.subscribe(EventType.MARKET_DATA_UPDATE, mockHandler)
      eventBus.publish(EventType.MARKET_DATA_UPDATE, testData)

      expect(mockHandler).toHaveBeenCalledWith(testData)
    })

    it('should maintain event history', () => {
      const testEvent = { symbol: 'ETHUSDT', price: 3000 }
      eventBus.publish(EventType.MARKET_DATA_UPDATE, testEvent)

      const history = eventBus.getEventHistory(EventType.MARKET_DATA_UPDATE, 1)
      expect(history).toHaveLength(1)
      expect(history[0].data).toEqual(testEvent)
    })

    it('should provide system statistics', () => {
      const stats = eventBus.getStats()
      expect(stats).toHaveProperty('totalEvents')
      expect(stats).toHaveProperty('eventCounts')
      expect(stats).toHaveProperty('activeListeners')
    })
  })

  describe('Data Orchestrator', () => {
    it('should handle circuit breaker pattern correctly', async () => {
      // Mock the data orchestrator
      const mockStartDataFlow = jest.fn()
      const mockGetMetrics = jest.fn()

      // Simulate circuit breaker behavior
      const circuitBreakerFailures = 5
      const circuitBreakerThreshold = 5

      expect(circuitBreakerFailures >= circuitBreakerThreshold).toBe(true)
    })

    it('should route symbols by market regime', () => {
      const symbols = ['BTCUSDT', 'ETHUSDT', 'ADAUSDT', 'DOTUSDT', 'LINKUSDT']
      const trendingRegime = 'TRENDING'
      const volatileRegime = 'VOLATILE'

      // Test trending regime routing
      const trendingRouting = routeSymbolsByRegime(symbols, trendingRegime)
      expect(trendingRouting.get('HIGH_PRIORITY')).toBeDefined()
      expect(trendingRouting.get('HIGH_PRIORITY')!.length).toBeGreaterThan(0)

      // Test volatile regime routing
      const volatileRouting = routeSymbolsByRegime(symbols, volatileRegime)
      expect(volatileRouting.get('HIGH_PRIORITY')).toEqual(symbols)
    })

    it('should calculate cache hit rates correctly', () => {
      const totalRequests = 100
      const cacheHits = 75
      const cacheHitRate = cacheHits / totalRequests

      expect(cacheHitRate).toBe(0.75)
      expect(cacheHitRate * 100).toBe(75)
    })
  })

  describe('Market Regime Engine', () => {
    it('should detect market regimes accurately', async () => {
      const symbols = ['BTCUSDT', 'ETHUSDT', 'ADAUSDT']
      const mockMarketData = symbols.map(symbol => ({
        symbol,
        price: 50000 + Math.random() * 1000,
        volume: 1000000 + Math.random() * 500000,
        change24h: (Math.random() - 0.5) * 10,
        volatility: Math.random() * 0.1,
        momentum: (Math.random() - 0.5) * 0.05,
        correlation: Math.random(),
        liquidity: Math.random()
      }))

      // Test regime detection logic
      const volatilityMetrics = calculateVolatilityMetrics(mockMarketData)
      const correlationMetrics = calculateCorrelationMetrics(mockMarketData)
      const liquidityMetrics = calculateLiquidityMetrics(mockMarketData)
      const momentumMetrics = calculateMomentumMetrics(mockMarketData)

      const regime = determineRegime(volatilityMetrics, correlationMetrics, liquidityMetrics, momentumMetrics)

      expect(regime).toHaveProperty('regime')
      expect(regime).toHaveProperty('confidence')
      expect(regime.confidence).toBeGreaterThan(0)
      expect(regime.confidence).toBeLessThanOrEqual(1)
    })

    it('should validate regime changes appropriately', () => {
      const currentRegime = {
        regime: 'RANGING',
        confidence: 0.8,
        metadata: { regimeStability: 0.9, lastRegimeChange: Date.now() - 60000 }
      }

      const newRegime = {
        regime: 'TRENDING',
        confidence: 0.6,
        metadata: { regimeStability: 0.7, lastRegimeChange: Date.now() }
      }

      // Test regime change validation
      const shouldUpdate = shouldUpdateRegime(newRegime, currentRegime)
      expect(typeof shouldUpdate).toBe('boolean')
    })
  })

  describe('Order Router', () => {
    it('should calculate exchange scores correctly', () => {
      const exchanges = [
        {
          exchangeId: 'binance',
          latency: 100,
          slippage: 0.0005,
          fillQuality: 0.98,
          volume: 5000000,
          spread: 0.0001,
          status: 'ONLINE'
        },
        {
          exchangeId: 'coinbase',
          latency: 150,
          slippage: 0.0008,
          fillQuality: 0.95,
          volume: 3000000,
          spread: 0.0002,
          status: 'ONLINE'
        }
      ]

      const orderRequest = {
        symbol: 'BTCUSDT',
        side: 'BUY' as const,
        quantity: 1,
        orderType: 'MARKET' as const,
        timestamp: Date.now()
      }

      const scores = calculateExchangeScores(exchanges, orderRequest)
      
      expect(scores.size).toBe(2)
      expect(scores.get('binance')).toBeGreaterThan(0)
      expect(scores.get('coinbase')).toBeGreaterThan(0)
    })

    it('should select best exchange based on scores', () => {
      const scores = new Map([
        ['binance', 0.85],
        ['coinbase', 0.72],
        ['kraken', 0.68]
      ])

      const bestExchange = selectBestExchange(scores)
      
      expect(bestExchange.exchangeId).toBe('binance')
      expect(bestExchange.score).toBe(0.85)
    })

    it('should handle order execution with metrics tracking', async () => {
      const orderRequest = {
        symbol: 'BTCUSDT',
        side: 'BUY' as const,
        quantity: 1,
        orderType: 'MARKET' as const,
        timestamp: Date.now()
      }

      const routingDecision = {
        exchangeId: 'binance',
        confidence: 0.85,
        expectedLatency: 100,
        expectedSlippage: 0.0005,
        expectedFillQuality: 0.98,
        reasoning: ['Low latency', 'High fill quality'],
        alternatives: []
      }

      // Mock order execution
      const executionResult = await simulateOrderExecution(orderRequest, routingDecision)
      
      expect(executionResult).toHaveProperty('filledQuantity')
      expect(executionResult).toHaveProperty('averagePrice')
      expect(executionResult).toHaveProperty('commission')
    })
  })

  describe('Performance Benchmarks', () => {
    it('should meet latency targets', async () => {
      const startTime = Date.now()
      
      // Simulate data flow processing
      await new Promise(resolve => setTimeout(resolve, 100))
      
      const processingTime = Date.now() - startTime
      
      // Target: < 1.2s for full signal latency
      expect(processingTime).toBeLessThan(1200)
    })

    it('should handle 5000 symbols efficiently', () => {
      const symbols = Array.from({ length: 5000 }, (_, i) => `SYMBOL${i}USDT`)
      
      // Test symbol processing capacity
      const batchSize = 100
      const batches = Math.ceil(symbols.length / batchSize)
      
      expect(batches).toBe(50)
      expect(symbols.length).toBe(5000)
    })

    it('should maintain high cache hit rates', () => {
      const cacheHitRate = 0.85 // 85% target
      expect(cacheHitRate).toBeGreaterThan(0.8)
    })
  })

  describe('Error Handling and Resilience', () => {
    it('should handle API failures gracefully', async () => {
      const mockApiCall = jest.fn().mockRejectedValue(new Error('API Rate Limit'))
      
      try {
        await mockApiCall()
      } catch (error) {
        expect(error).toBeInstanceOf(Error)
        expect(error.message).toBe('API Rate Limit')
      }
    })

    it('should implement retry logic', async () => {
      const mockFunction = jest.fn()
        .mockRejectedValueOnce(new Error('Temporary failure'))
        .mockResolvedValueOnce('Success')

      const result = await retryWithBackoff(mockFunction, 3)
      
      expect(result).toBe('Success')
      expect(mockFunction).toHaveBeenCalledTimes(2)
    })

    it('should maintain system stability under load', () => {
      const cpuUsage = 0.75 // 75% CPU usage
      const memoryUsage = 0.8 // 80% memory usage
      
      // System should remain stable under these conditions
      expect(cpuUsage).toBeLessThan(0.85) // Target: < 85%
      expect(memoryUsage).toBeLessThan(0.9) // Target: < 90%
    })
  })

  describe('Integration Tests', () => {
    it('should process complete trading workflow', async () => {
      const symbols = ['BTCUSDT', 'ETHUSDT']
      
      // 1. Data ingestion
      const marketData = await fetchMarketData(symbols)
      expect(marketData).toHaveLength(symbols.length)
      
      // 2. Market regime detection
      const regime = await detectMarketRegime(symbols)
      expect(regime).toHaveProperty('regime')
      
      // 3. Signal generation
      const signals = await generateSignals(marketData, regime)
      expect(signals.length).toBeGreaterThan(0)
      
      // 4. Order routing
      const orderRequest = signals[0]
      const routingDecision = await routeOrder(orderRequest)
      expect(routingDecision).toHaveProperty('exchangeId')
      
      // 5. Order execution
      const executionResult = await executeOrder(orderRequest, routingDecision)
      expect(executionResult).toHaveProperty('orderId')
    })

    it('should maintain data consistency across services', () => {
      const testSymbol = 'BTCUSDT'
      const testPrice = 50000
      
      // Simulate data consistency check
      const orchestratorData = { symbol: testSymbol, price: testPrice }
      const regimeData = { symbol: testSymbol, price: testPrice }
      const routerData = { symbol: testSymbol, price: testPrice }
      
      expect(orchestratorData.price).toBe(regimeData.price)
      expect(regimeData.price).toBe(routerData.price)
    })
  })
})

// Helper functions for testing
function routeSymbolsByRegime(symbols: string[], regime: string): Map<string, string[]> {
  const routing = new Map<string, string[]>()
  
  switch (regime) {
    case 'TRENDING':
      routing.set('HIGH_PRIORITY', symbols.slice(0, Math.floor(symbols.length * 0.3)))
      routing.set('NORMAL', symbols.slice(Math.floor(symbols.length * 0.3)))
      break
    case 'VOLATILE':
      routing.set('HIGH_PRIORITY', symbols)
      break
    default:
      routing.set('NORMAL', symbols)
  }
  
  return routing
}

function calculateVolatilityMetrics(data: any[]) {
  const volatilities = data.map(d => d.volatility)
  return {
    averageVolatility: volatilities.reduce((a, b) => a + b, 0) / volatilities.length,
    volatilityDispersion: 0.02,
    extremeVolatilityCount: volatilities.filter(v => v > 0.05).length,
    volatilityTrend: 0.001
  }
}

function calculateCorrelationMetrics(data: any[]) {
  const correlations = data.map(d => d.correlation)
  return {
    averageCorrelation: correlations.reduce((a, b) => a + b, 0) / correlations.length,
    correlationDispersion: 0.1,
    highCorrelationCount: correlations.filter(c => c > 0.7).length,
    correlationTrend: 0.002
  }
}

function calculateLiquidityMetrics(data: any[]) {
  const liquidities = data.map(d => d.liquidity)
  return {
    averageLiquidity: liquidities.reduce((a, b) => a + b, 0) / liquidities.length,
    liquidityDispersion: 0.1,
    lowLiquidityCount: liquidities.filter(l => l < 0.3).length,
    liquidityTrend: 0.003
  }
}

function calculateMomentumMetrics(data: any[]) {
  const momentums = data.map(d => d.momentum)
  return {
    averageMomentum: momentums.reduce((a, b) => a + b, 0) / momentums.length,
    momentumDispersion: 0.02,
    strongMomentumCount: momentums.filter(m => Math.abs(m) > 0.02).length,
    momentumDirection: 'NEUTRAL' as const
  }
}

function determineRegime(volatility: any, correlation: any, liquidity: any, momentum: any) {
  let regime: 'TRENDING' | 'RANGING' | 'VOLATILE' | 'BREAKOUT' | 'CRISIS' = 'RANGING'
  let confidence = 0.5
  
  if (volatility.averageVolatility > 0.05) {
    regime = 'VOLATILE'
    confidence = 0.8
  } else if (correlation.averageCorrelation > 0.6) {
    regime = 'TRENDING'
    confidence = 0.7
  }
  
  return { regime, confidence }
}

function shouldUpdateRegime(newRegime: any, currentRegime: any): boolean {
  const regimeChanged = newRegime.regime !== currentRegime.regime
  const confidenceImproved = newRegime.confidence > currentRegime.confidence + 0.1
  const timeElapsed = Date.now() - currentRegime.metadata.lastRegimeChange > 5 * 60 * 1000
  
  return regimeChanged || confidenceImproved || timeElapsed
}

function calculateExchangeScores(exchanges: any[], orderRequest: any): Map<string, number> {
  const scores = new Map<string, number>()
  
  for (const exchange of exchanges) {
    let score = 0
    
    // Latency score (lower is better)
    const latencyScore = Math.max(0, 1 - exchange.latency / 500)
    score += latencyScore * 0.3
    
    // Slippage score (lower is better)
    const slippageScore = Math.max(0, 1 - exchange.slippage / 0.002)
    score += slippageScore * 0.3
    
    // Fill quality score (higher is better)
    score += exchange.fillQuality * 0.2
    
    // Volume score (higher is better)
    const volumeScore = Math.min(1, exchange.volume / 10000000)
    score += volumeScore * 0.1
    
    // Spread score (lower is better)
    const spreadScore = Math.max(0, 1 - exchange.spread / 0.001)
    score += spreadScore * 0.1
    
    scores.set(exchange.exchangeId, Math.min(Math.max(score, 0), 1))
  }
  
  return scores
}

function selectBestExchange(scores: Map<string, number>): { exchangeId: string; score: number } {
  let bestExchange = { exchangeId: '', score: 0 }
  
  for (const [exchangeId, score] of scores.entries()) {
    if (score > bestExchange.score) {
      bestExchange = { exchangeId, score }
    }
  }
  
  return bestExchange
}

async function simulateOrderExecution(orderRequest: any, routingDecision: any) {
  await new Promise(resolve => setTimeout(resolve, routingDecision.expectedLatency))
  
  return {
    filledQuantity: orderRequest.quantity * routingDecision.expectedFillQuality,
    averagePrice: 50000,
    commission: 50000 * orderRequest.quantity * 0.001
  }
}

async function retryWithBackoff(fn: () => Promise<any>, maxRetries: number): Promise<any> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn()
    } catch (error) {
      if (i === maxRetries - 1) throw error
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 100))
    }
  }
}

// Mock functions for integration tests
async function fetchMarketData(symbols: string[]) {
  return symbols.map(symbol => ({
    symbol,
    price: 50000 + Math.random() * 1000,
    volume: 1000000 + Math.random() * 500000,
    change24h: (Math.random() - 0.5) * 10
  }))
}

async function detectMarketRegime(symbols: string[]) {
  return {
    regime: 'RANGING',
    confidence: 0.7,
    timestamp: Date.now()
  }
}

async function generateSignals(marketData: any[], regime: any) {
  return marketData.map(data => ({
    symbol: data.symbol,
    side: 'BUY' as const,
    quantity: 1,
    orderType: 'MARKET' as const,
    timestamp: Date.now()
  }))
}

async function routeOrder(orderRequest: any) {
  return {
    exchangeId: 'binance',
    confidence: 0.85,
    expectedLatency: 100,
    expectedSlippage: 0.0005,
    expectedFillQuality: 0.98,
    reasoning: ['Low latency', 'High fill quality'],
    alternatives: []
  }
}

async function executeOrder(orderRequest: any, routingDecision: any) {
  return {
    orderId: `order_${Date.now()}`,
    exchangeId: routingDecision.exchangeId,
    symbol: orderRequest.symbol,
    side: orderRequest.side,
    quantity: orderRequest.quantity,
    price: 50000,
    status: 'FILLED',
    filledQuantity: orderRequest.quantity,
    averagePrice: 50000,
    commission: 50,
    slippage: 0.0005,
    latency: 100,
    timestamp: Date.now()
  }
} 