import { EventBus, EventType, TradeEvent, SystemEvent } from './event-bus'

// Order Routing Interfaces
export interface ExchangeMetrics {
  exchangeId: string
  latency: number // Average latency in ms
  slippage: number // Average slippage percentage
  fillQuality: number // Fill rate percentage
  volume: number // 24h volume
  spread: number // Average bid-ask spread
  lastUpdate: number
  status: 'ONLINE' | 'DEGRADED' | 'OFFLINE'
  successRate: number
}

export interface OrderRequest {
  symbol: string
  side: 'BUY' | 'SELL'
  quantity: number
  price?: number // Market order if not specified
  orderType: 'MARKET' | 'LIMIT' | 'STOP_LOSS' | 'TAKE_PROFIT'
  timeInForce?: 'GTC' | 'IOC' | 'FOK'
  clientOrderId?: string
  timestamp: number
}

export interface OrderResponse {
  orderId: string
  exchangeId: string
  symbol: string
  side: 'BUY' | 'SELL'
  quantity: number
  price: number
  status: 'PENDING' | 'FILLED' | 'PARTIALLY_FILLED' | 'CANCELLED' | 'REJECTED'
  filledQuantity: number
  averagePrice: number
  commission: number
  slippage: number
  latency: number
  timestamp: number
}

export interface RoutingDecision {
  exchangeId: string
  confidence: number
  expectedLatency: number
  expectedSlippage: number
  expectedFillQuality: number
  reasoning: string[]
  alternatives: Array<{
    exchangeId: string
    score: number
    reason: string
  }>
}

export interface RouterMetrics {
  totalOrders: number
  successfulOrders: number
  averageLatency: number
  averageSlippage: number
  averageFillQuality: number
  routingAccuracy: number
  lastUpdateTime: number
  errors: string[]
  exchangePerformance: Record<string, ExchangeMetrics>
  exchanges: Record<string, ExchangeMetrics>
  routing: {
    totalOrders: number
    avgLatency: number
    successRate: number
    lastDecision: any
  }
  performance: {
    p95Latency: number
    p99Latency: number
    errorRate: number
  }
}

class OrderRouter {
  private eventBus: EventBus
  private exchangeMetrics: Map<string, ExchangeMetrics> = new Map()
  private orderHistory: OrderResponse[] = []
  private routingDecisions: RoutingDecision[] = []
  
  private readonly MAX_HISTORY = 1000
  private readonly METRICS_UPDATE_INTERVAL = 30 * 1000 // 30 seconds
  private readonly PERFORMANCE_WINDOW = 24 * 60 * 60 * 1000 // 24 hours
  private readonly MIN_CONFIDENCE_THRESHOLD = 0.6
  private readonly MAX_LATENCY_THRESHOLD = 500 // 500ms
  private readonly MAX_SLIPPAGE_THRESHOLD = 0.002 // 0.2%
  
  private metrics: RouterMetrics = {
    totalOrders: 0,
    successfulOrders: 0,
    averageLatency: 0,
    averageSlippage: 0,
    averageFillQuality: 0,
    routingAccuracy: 0,
    lastUpdateTime: 0,
    errors: [],
    exchangePerformance: {},
    exchanges: {},
    routing: {
      totalOrders: 0,
      avgLatency: 0,
      successRate: 0,
      lastDecision: null
    },
    performance: {
      p95Latency: 0,
      p99Latency: 0,
      errorRate: 0
    }
  }
  
  private metricsTimer?: NodeJS.Timeout

  constructor() {
    this.eventBus = EventBus.getInstance()
    this.initializeExchanges()
    this.initializeEventListeners()
    this.startMetricsUpdates()
  }

  private initializeExchanges(): void {
    // Initialize exchange metrics for major exchanges
    const exchanges = [
      { id: 'binance', name: 'Binance' },
      { id: 'coinbase', name: 'Coinbase Pro' },
      { id: 'kraken', name: 'Kraken' },
      { id: 'kucoin', name: 'KuCoin' },
      { id: 'okx', name: 'OKX' }
    ]
    
    for (const exchange of exchanges) {
      this.exchangeMetrics.set(exchange.id, {
        exchangeId: exchange.id,
        latency: 100 + Math.random() * 200, // Simulated latency
        slippage: 0.0005 + Math.random() * 0.001, // Simulated slippage
        fillQuality: 0.95 + Math.random() * 0.04, // Simulated fill quality
        volume: 1000000 + Math.random() * 9000000, // Simulated volume
        spread: 0.0001 + Math.random() * 0.0002, // Simulated spread
        lastUpdate: Date.now(),
        status: 'ONLINE',
        successRate: 0.98
      })
    }
  }

  private initializeEventListeners(): void {
    // Listen for trade events
    this.eventBus.subscribe<TradeEvent>(EventType.TRADE_SIGNAL, (event) => {
      this.handleTradeSignal(event)
    })
    
    // Listen for system health updates
    this.eventBus.subscribe<SystemEvent>(EventType.SYSTEM_HEALTH_UPDATE, (event) => {
      this.handleSystemHealthUpdate(event)
    })
  }

  /**
   * Main order routing method
   */
  async routeOrder(orderRequest: OrderRequest): Promise<RoutingDecision> {
    console.log(`Routing order: ${orderRequest.symbol} ${orderRequest.side} ${orderRequest.quantity}`)
    
    try {
      // Step 1: Validate order request
      this.validateOrderRequest(orderRequest)
      
      // Step 2: Get available exchanges for symbol
      const availableExchanges = await this.getAvailableExchanges(orderRequest.symbol)
      
      // Step 3: Calculate exchange scores
      const exchangeScores = this.calculateExchangeScores(availableExchanges, orderRequest)
      
      // Step 4: Select best exchange
      const bestExchange = this.selectBestExchange(exchangeScores)
      
      // Step 5: Create routing decision
      const routingDecision = this.createRoutingDecision(bestExchange, exchangeScores, orderRequest)
      
      // Step 6: Update metrics
      this.updateRoutingMetrics(routingDecision)
      
      console.log(`Order routed to ${routingDecision.exchangeId} with confidence ${routingDecision.confidence}`)
      
      return routingDecision
      
    } catch (error) {
      console.error('Order routing error:', error)
      this.metrics.errors.push(error instanceof Error ? error.message : 'Unknown error')
      throw error
    }
  }

  /**
   * Execute order on selected exchange
   */
  async executeOrder(orderRequest: OrderRequest, routingDecision: RoutingDecision): Promise<OrderResponse> {
    console.log(`Executing order on ${routingDecision.exchangeId}`)
    
    const startTime = Date.now()
    
    try {
      // Simulate order execution
      const executionResult = await this.simulateOrderExecution(orderRequest, routingDecision)
      
      // Calculate actual metrics
      const actualLatency = Date.now() - startTime
      const actualSlippage = this.calculateActualSlippage(orderRequest, executionResult)
      const actualFillQuality = executionResult.filledQuantity / orderRequest.quantity
      
      // Create order response
      const orderResponse: OrderResponse = {
        orderId: `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        exchangeId: routingDecision.exchangeId,
        symbol: orderRequest.symbol,
        side: orderRequest.side,
        quantity: orderRequest.quantity,
        price: executionResult.averagePrice,
        status: actualFillQuality === 1 ? 'FILLED' : 'PARTIALLY_FILLED',
        filledQuantity: executionResult.filledQuantity,
        averagePrice: executionResult.averagePrice,
        commission: executionResult.commission,
        slippage: actualSlippage,
        latency: actualLatency,
        timestamp: Date.now()
      }
      
      // Update exchange metrics based on actual performance
      this.updateExchangeMetrics(routingDecision.exchangeId, {
        latency: actualLatency,
        slippage: actualSlippage,
        fillQuality: actualFillQuality
      })
      
      // Store order history
      this.orderHistory.push(orderResponse)
      if (this.orderHistory.length > this.MAX_HISTORY) {
        this.orderHistory.shift()
      }
      
      // Update metrics
      this.updateExecutionMetrics(orderResponse)
      
      // Publish order events
      this.eventBus.publish(EventType.ORDER_PLACED, orderResponse)
      
      if (orderResponse.status === 'FILLED') {
        this.eventBus.publish(EventType.ORDER_FILLED, orderResponse)
      }
      
      console.log(`Order executed: ${orderResponse.orderId} on ${orderResponse.exchangeId}`)
      
      return orderResponse
      
    } catch (error) {
      console.error('Order execution error:', error)
      this.metrics.errors.push(error instanceof Error ? error.message : 'Unknown error')
      throw error
    }
  }

  private validateOrderRequest(orderRequest: OrderRequest): void {
    if (!orderRequest.symbol || !orderRequest.side || !orderRequest.quantity) {
      throw new Error('Invalid order request: missing required fields')
    }
    
    if (orderRequest.quantity <= 0) {
      throw new Error('Invalid order request: quantity must be positive')
    }
    
    if (orderRequest.price && orderRequest.price <= 0) {
      throw new Error('Invalid order request: price must be positive')
    }
  }

  private async getAvailableExchanges(symbol: string): Promise<ExchangeMetrics[]> {
    const availableExchanges: ExchangeMetrics[] = []
    
    for (const [exchangeId, metrics] of this.exchangeMetrics.entries()) {
      // Check if exchange is online and supports the symbol
      if (metrics.status === 'ONLINE' && await this.supportsSymbol(exchangeId, symbol)) {
        availableExchanges.push(metrics)
      }
    }
    
    if (availableExchanges.length === 0) {
      throw new Error(`No available exchanges for symbol ${symbol}`)
    }
    
    return availableExchanges
  }

  private async supportsSymbol(exchangeId: string, symbol: string): Promise<boolean> {
    // Simulate symbol support check
    const supportedSymbols = {
      binance: ['BTCUSDT', 'ETHUSDT', 'ADAUSDT', 'DOTUSDT', 'LINKUSDT'],
      coinbase: ['BTC-USDT', 'ETH-USDT', 'ADA-USDT'],
      kraken: ['BTCUSDT', 'ETHUSDT', 'ADAUSDT'],
      kucoin: ['BTC-USDT', 'ETH-USDT', 'ADA-USDT'],
      okx: ['BTC-USDT', 'ETH-USDT', 'ADA-USDT']
    }
    
    return supportedSymbols[exchangeId as keyof typeof supportedSymbols]?.includes(symbol) || false
  }

  private calculateExchangeScores(exchanges: ExchangeMetrics[], orderRequest: OrderRequest): Map<string, number> {
    const scores = new Map<string, number>()
    
    for (const exchange of exchanges) {
      let score = 0
      const reasoning: string[] = []
      
      // Latency score (lower is better)
      const latencyScore = Math.max(0, 1 - exchange.latency / this.MAX_LATENCY_THRESHOLD)
      score += latencyScore * 0.3
      reasoning.push(`Latency: ${exchange.latency}ms (score: ${latencyScore.toFixed(3)})`)
      
      // Slippage score (lower is better)
      const slippageScore = Math.max(0, 1 - exchange.slippage / this.MAX_SLIPPAGE_THRESHOLD)
      score += slippageScore * 0.3
      reasoning.push(`Slippage: ${(exchange.slippage * 100).toFixed(3)}% (score: ${slippageScore.toFixed(3)})`)
      
      // Fill quality score (higher is better)
      const fillQualityScore = exchange.fillQuality
      score += fillQualityScore * 0.2
      reasoning.push(`Fill quality: ${(fillQualityScore * 100).toFixed(1)}% (score: ${fillQualityScore.toFixed(3)})`)
      
      // Volume score (higher is better for liquidity)
      const volumeScore = Math.min(1, exchange.volume / 10000000) // Normalize to 10M volume
      score += volumeScore * 0.1
      reasoning.push(`Volume: $${(exchange.volume / 1000000).toFixed(1)}M (score: ${volumeScore.toFixed(3)})`)
      
      // Spread score (lower is better)
      const spreadScore = Math.max(0, 1 - exchange.spread / 0.001) // Normalize to 0.1% spread
      score += spreadScore * 0.1
      reasoning.push(`Spread: ${(exchange.spread * 100).toFixed(4)}% (score: ${spreadScore.toFixed(3)})`)
      
      // Apply order type adjustments
      if (orderRequest.orderType === 'MARKET') {
        // Market orders prioritize low latency and high fill quality
        score = score * 0.8 + (latencyScore * 0.1) + (fillQualityScore * 0.1)
        reasoning.push('Market order adjustment applied')
      } else if (orderRequest.orderType === 'LIMIT') {
        // Limit orders prioritize low slippage and tight spreads
        score = score * 0.8 + (slippageScore * 0.1) + (spreadScore * 0.1)
        reasoning.push('Limit order adjustment applied')
      }
      
      scores.set(exchange.exchangeId, Math.min(Math.max(score, 0), 1))
      console.log(`Exchange ${exchange.exchangeId} score: ${score.toFixed(3)} - ${reasoning.join(', ')}`)
    }
    
    return scores
  }

  private selectBestExchange(scores: Map<string, number>): { exchangeId: string; score: number } {
    let bestExchange = { exchangeId: '', score: 0 }
    
    for (const [exchangeId, score] of scores.entries()) {
      if (score > bestExchange.score) {
        bestExchange = { exchangeId, score }
      }
    }
    
    if (bestExchange.score < this.MIN_CONFIDENCE_THRESHOLD) {
      throw new Error(`No exchange meets minimum confidence threshold (${this.MIN_CONFIDENCE_THRESHOLD})`)
    }
    
    return bestExchange
  }

  private createRoutingDecision(
    bestExchange: { exchangeId: string; score: number },
    allScores: Map<string, number>,
    orderRequest: OrderRequest
  ): RoutingDecision {
    const exchange = this.exchangeMetrics.get(bestExchange.exchangeId)!
    
    // Create alternatives list
    const alternatives = Array.from(allScores.entries())
      .filter(([id]) => id !== bestExchange.exchangeId)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([id, score]) => ({
        exchangeId: id,
        score,
        reason: `Alternative with ${(score * 100).toFixed(1)}% confidence`
      }))
    
    return {
      exchangeId: bestExchange.exchangeId,
      confidence: bestExchange.score,
      expectedLatency: exchange.latency,
      expectedSlippage: exchange.slippage,
      expectedFillQuality: exchange.fillQuality,
      reasoning: [
        `Selected ${bestExchange.exchangeId} with ${(bestExchange.score * 100).toFixed(1)}% confidence`,
        `Expected latency: ${exchange.latency}ms`,
        `Expected slippage: ${(exchange.slippage * 100).toFixed(3)}%`,
        `Expected fill quality: ${(exchange.fillQuality * 100).toFixed(1)}%`
      ],
      alternatives
    }
  }

  private async simulateOrderExecution(orderRequest: OrderRequest, routingDecision: RoutingDecision): Promise<{
    filledQuantity: number
    averagePrice: number
    commission: number
  }> {
    // Simulate order execution with realistic delays and outcomes
    await new Promise(resolve => setTimeout(resolve, routingDecision.expectedLatency))
    
    const basePrice = 50000 // Simulated base price
    const priceVariation = (Math.random() - 0.5) * 0.002 // ±0.1% price variation
    const averagePrice = basePrice * (1 + priceVariation)
    
    // Simulate partial fills for large orders
    const fillRate = routingDecision.expectedFillQuality
    const filledQuantity = orderRequest.quantity * fillRate
    
    // Simulate commission (0.1% typical rate)
    const commission = averagePrice * filledQuantity * 0.001
    
    return {
      filledQuantity,
      averagePrice,
      commission
    }
  }

  private calculateActualSlippage(orderRequest: OrderRequest, executionResult: any): number {
    if (orderRequest.price) {
      return Math.abs(executionResult.averagePrice - orderRequest.price) / orderRequest.price
    }
    return 0.0005 // Default slippage for market orders
  }

  private updateExchangeMetrics(exchangeId: string, performance: {
    latency: number
    slippage: number
    fillQuality: number
  }): void {
    const exchange = this.exchangeMetrics.get(exchangeId)
    if (!exchange) return
    
    // Update with exponential moving average
    const alpha = 0.1 // Smoothing factor
    exchange.latency = exchange.latency * (1 - alpha) + performance.latency * alpha
    exchange.slippage = exchange.slippage * (1 - alpha) + performance.slippage * alpha
    exchange.fillQuality = exchange.fillQuality * (1 - alpha) + performance.fillQuality * alpha
    exchange.lastUpdate = Date.now()
    
    // Update status based on performance
    if (exchange.latency > this.MAX_LATENCY_THRESHOLD * 2) {
      exchange.status = 'DEGRADED'
    } else if (exchange.latency > this.MAX_LATENCY_THRESHOLD) {
      exchange.status = 'DEGRADED'
    } else {
      exchange.status = 'ONLINE'
    }
  }

  private updateRoutingMetrics(routingDecision: RoutingDecision): void {
    this.routingDecisions.push(routingDecision)
    if (this.routingDecisions.length > this.MAX_HISTORY) {
      this.routingDecisions.shift()
    }
  }

  private updateExecutionMetrics(orderResponse: OrderResponse): void {
    this.metrics.totalOrders++
    
    if (orderResponse.status === 'FILLED' || orderResponse.status === 'PARTIALLY_FILLED') {
      this.metrics.successfulOrders++
    }
    
    // Update averages
    const recentOrders = this.orderHistory.slice(-100)
    if (recentOrders.length > 0) {
      this.metrics.averageLatency = recentOrders.reduce((sum, order) => sum + order.latency, 0) / recentOrders.length
      this.metrics.averageSlippage = recentOrders.reduce((sum, order) => sum + order.slippage, 0) / recentOrders.length
      this.metrics.averageFillQuality = recentOrders.reduce((sum, order) => sum + (order.filledQuantity / order.quantity), 0) / recentOrders.length
    }
    
    this.metrics.lastUpdateTime = Date.now()
  }

  private startMetricsUpdates(): void {
    this.metricsTimer = setInterval(() => {
      this.updateMetrics()
    }, this.METRICS_UPDATE_INTERVAL)
  }

  private updateMetrics(): void {
    // Update exchange performance metrics
    this.metrics.exchangePerformance = {}
    for (const [exchangeId, metrics] of this.exchangeMetrics.entries()) {
      this.metrics.exchangePerformance[exchangeId] = { ...metrics }
    }
    
    // Calculate routing accuracy
    const recentDecisions = this.routingDecisions.slice(-50)
    if (recentDecisions.length > 0) {
      this.metrics.routingAccuracy = recentDecisions.reduce((sum, decision) => sum + decision.confidence, 0) / recentDecisions.length
    }
  }

  private handleTradeSignal(event: TradeEvent): void {
    console.log(`Received trade signal: ${event.symbol} ${event.side} ${event.quantity}`)
  }

  private handleSystemHealthUpdate(event: SystemEvent): void {
    console.log(`System health update: ${event.component} - ${event.status}`)
  }

  // Public API methods
  getMetrics(): RouterMetrics {
    return { ...this.metrics }
  }

  getExchangeMetrics(exchangeId: string): ExchangeMetrics | null {
    return this.exchangeMetrics.get(exchangeId) || null
  }

  getAllExchangeMetrics(): ExchangeMetrics[] {
    return Array.from(this.exchangeMetrics.values())
  }

  getOrderHistory(limit: number = 100): OrderResponse[] {
    return this.orderHistory.slice(-limit)
  }

  getRoutingDecisions(limit: number = 100): RoutingDecision[] {
    return this.routingDecisions.slice(-limit)
  }

  // API endpoints for microservice
  async routeOrderEndpoint(orderRequest: OrderRequest): Promise<{ decision: RoutingDecision; status: string }> {
    try {
      const decision = await this.routeOrder(orderRequest)
      return { decision, status: 'success' }
    } catch (error) {
      return { decision: null as any, status: 'error' }
    }
  }

  async executeOrderEndpoint(orderRequest: OrderRequest, routingDecision: RoutingDecision): Promise<{ response: OrderResponse; status: string }> {
    try {
      const response = await this.executeOrder(orderRequest, routingDecision)
      return { response, status: 'success' }
    } catch (error) {
      return { response: null as any, status: 'error' }
    }
  }

  async getMetricsEndpoint(): Promise<{ metrics: RouterMetrics; status: string }> {
    return { metrics: this.getMetrics(), status: 'success' }
  }
}

// Singleton instance
const orderRouter = new OrderRouter()

// Export functions for external use
export async function routeOrder(orderRequest: OrderRequest): Promise<RoutingDecision> {
  return orderRouter.routeOrder(orderRequest)
}

export async function executeOrder(orderRequest: OrderRequest, routingDecision: RoutingDecision): Promise<OrderResponse> {
  return orderRouter.executeOrder(orderRequest, routingDecision)
}

export function getRouterMetrics(): RouterMetrics {
  return orderRouter.getMetrics()
}

export function getExchangeMetrics(exchangeId: string): ExchangeMetrics | null {
  return orderRouter.getExchangeMetrics(exchangeId)
}

export default orderRouter 