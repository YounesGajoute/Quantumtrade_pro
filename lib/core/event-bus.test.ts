import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals'
import { EventBus, EventType } from './event-bus'

describe('EventBus', () => {
  let eventBus: EventBus

  beforeEach(() => {
    eventBus = EventBus.getInstance()
  })

  afterEach(() => {
    // Clear event history between tests
    eventBus.clearHistory()
  })

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = EventBus.getInstance()
      const instance2 = EventBus.getInstance()
      expect(instance1).toBe(instance2)
    })
  })

  describe('Event Publishing and Subscription', () => {
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
      expect(stats).toHaveProperty('memoryUsage')
    })
  })

  describe('Event Types', () => {
    it('should have all required event types', () => {
      expect(EventType.MARKET_DATA_UPDATE).toBe('market_data_update')
      expect(EventType.SIGNAL_GENERATED).toBe('signal_generated')
      expect(EventType.TRADE_SIGNAL).toBe('trade_signal')
      expect(EventType.RISK_LIMIT_BREACH).toBe('risk_limit_breach')
      expect(EventType.SYSTEM_HEALTH_UPDATE).toBe('system_health_update')
      expect(EventType.MARKET_REGIME_UPDATE).toBe('market_regime_update')
    })
  })

  describe('Wildcard Subscription', () => {
    it('should subscribe to all events', () => {
      const mockHandler = jest.fn()
      eventBus.subscribeToAll(mockHandler)

      eventBus.publish(EventType.MARKET_DATA_UPDATE, { test: 'data1' })
      eventBus.publish(EventType.SIGNAL_GENERATED, { test: 'data2' })

      expect(mockHandler).toHaveBeenCalledTimes(2)
    })
  })

  describe('Unsubscription', () => {
    it('should unsubscribe from events', () => {
      const mockHandler = jest.fn()
      eventBus.subscribe(EventType.MARKET_DATA_UPDATE, mockHandler)
      eventBus.unsubscribe(EventType.MARKET_DATA_UPDATE, mockHandler)

      eventBus.publish(EventType.MARKET_DATA_UPDATE, { test: 'data' })

      expect(mockHandler).not.toHaveBeenCalled()
    })
  })
}) 