import { EventEmitter } from 'events'

// Event Types
export enum EventType {
  // Market Data Events
  MARKET_DATA_UPDATE = 'market_data_update',
  VOLUME_SURGE = 'volume_surge',
  PRICE_BREAKOUT = 'price_breakout',
  
  // Signal Events
  SIGNAL_GENERATED = 'signal_generated',
  SIGNAL_RANKING_UPDATE = 'signal_ranking_update',
  SIGNAL_CONFIRMED = 'signal_confirmed',
  
  // Trade Events
  TRADE_SIGNAL = 'trade_signal',
  ORDER_PLACED = 'order_placed',
  ORDER_FILLED = 'order_filled',
  ORDER_CANCELLED = 'order_cancelled',
  
  // Risk Events
  RISK_LIMIT_BREACH = 'risk_limit_breach',
  MARGIN_CALL = 'margin_call',
  VOLATILITY_ALERT = 'volatility_alert',
  
  // System Events
  SYSTEM_HEALTH_UPDATE = 'system_health_update',
  CONFIGURATION_UPDATE = 'configuration_update',
  PERFORMANCE_METRIC = 'performance_metric',
  
  // Market Regime Events
  MARKET_REGIME_UPDATE = 'market_regime_update'
}

// Event Interfaces
export interface MarketDataEvent {
  symbol: string
  price: number
  volume: number
  timestamp: number
  change24h: number
  bidAskSpread?: number
}

export interface SignalEvent {
  symbol: string
  signalType: 'BUY' | 'SELL' | 'HOLD'
  confidence: number
  score: number
  indicators: Record<string, number>
  timestamp: number
}

export interface TradeEvent {
  symbol: string
  side: 'BUY' | 'SELL'
  quantity: number
  price: number
  orderId?: string
  timestamp: number
}

export interface RiskEvent {
  type: 'LIMIT_BREACH' | 'MARGIN_CALL' | 'VOLATILITY_ALERT'
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  message: string
  data: any
  timestamp: number
}

export interface SystemEvent {
  component: string
  status: 'HEALTHY' | 'WARNING' | 'ERROR'
  metrics: Record<string, number>
  timestamp: number
}

// Event Bus Class
export class EventBus extends EventEmitter {
  private static instance: EventBus
  private eventHistory: Array<{ type: string; data: any; timestamp: number }> = []
  private readonly MAX_HISTORY = 1000

  private constructor() {
    super()
    this.setMaxListeners(100) // Allow many listeners
  }

  static getInstance(): EventBus {
    if (!EventBus.instance) {
      EventBus.instance = new EventBus()
    }
    return EventBus.instance
  }

  // Publish event with history tracking
  publish<T>(eventType: EventType, data: T): void {
    const event = {
      type: eventType,
      data,
      timestamp: Date.now()
    }

    // Store in history
    this.eventHistory.push(event)
    if (this.eventHistory.length > this.MAX_HISTORY) {
      this.eventHistory.shift()
    }

    // Emit event
    this.emit(eventType, data)
    this.emit('*', event) // Wildcard listener for all events
  }

  // Subscribe to specific event type
  subscribe<T>(eventType: EventType, handler: (data: T) => void): void {
    this.on(eventType, handler)
  }

  // Subscribe to all events
  subscribeToAll(handler: (event: { type: string; data: any; timestamp: number }) => void): void {
    this.on('*', handler)
  }

  // Unsubscribe from event
  unsubscribe<T>(eventType: EventType, handler: (data: T) => void): void {
    this.off(eventType, handler)
  }

  // Get recent event history
  getEventHistory(eventType?: EventType, limit: number = 100): Array<{ type: string; data: any; timestamp: number }> {
    let history = this.eventHistory
    
    if (eventType) {
      history = history.filter(event => event.type === eventType)
    }
    
    return history.slice(-limit)
  }

  // Get system statistics
  getStats(): {
    totalEvents: number
    eventCounts: Record<string, number>
    activeListeners: number
    memoryUsage: number
  } {
    const eventCounts: Record<string, number> = {}
    this.eventHistory.forEach(event => {
      eventCounts[event.type] = (eventCounts[event.type] || 0) + 1
    })

    return {
      totalEvents: this.eventHistory.length,
      eventCounts,
      activeListeners: this.listenerCount('*'),
      memoryUsage: process.memoryUsage().heapUsed
    }
  }

  // Clear event history
  clearHistory(): void {
    this.eventHistory = []
  }
}

// Export singleton instance
export const eventBus = EventBus.getInstance() 