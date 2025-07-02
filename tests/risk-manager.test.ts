import { describe, it, expect, beforeEach, jest } from '@jest/globals'
import { riskManager } from '../lib/core/risk-manager'

describe('RiskManager', () => {
  beforeEach(() => {
    // Reset risk manager state between tests
    jest.clearAllMocks()
  })

  describe('Data Point Assessment', () => {
    it('should assess data points correctly', () => {
      const dataPoint = {
        symbol: 'BTCUSDT',
        price: 50000,
        volume: 1000000,
        change24h: 5.2,
        volatility: 0.3
      }

      const assessment = riskManager.assessDataPoint(dataPoint)

      expect(assessment).toHaveProperty('riskLevel')
      expect(assessment).toHaveProperty('riskScore')
      expect(assessment).toHaveProperty('warnings')
      expect(assessment).toHaveProperty('recommendations')
      expect(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).toContain(assessment.riskLevel)
    })

    it('should detect high volatility risk', () => {
      const highVolatilityData = {
        symbol: 'ETHUSDT',
        price: 3000,
        volume: 500000,
        change24h: 15.5,
        volatility: 0.8 // High volatility
      }

      const assessment = riskManager.assessDataPoint(highVolatilityData)
      expect(['HIGH', 'CRITICAL']).toContain(assessment.riskLevel)
      expect(assessment.warnings).toEqual(
        expect.arrayContaining([expect.stringContaining('High volatility detected')])
      )
    })

    it('should detect low liquidity risk', () => {
      const lowLiquidityData = {
        symbol: 'RAREUSDT',
        price: 1.50,
        volume: 50000, // Low volume
        change24h: 2.1,
        volatility: 0.2
      }

      const assessment = riskManager.assessDataPoint(lowLiquidityData)
      expect(assessment.warnings).toContainEqual('Low liquidity detected')
    })
  })

  describe('Position Management', () => {
    it('should check if position can be opened', () => {
      const canOpen = riskManager.canOpenPosition('BTCUSDT', 1, 50000)
      expect(typeof canOpen).toBe('boolean')
    })

    it('should get recommended position size', () => {
      const recommendedSize = riskManager.getRecommendedPositionSize('BTCUSDT', 50000)
      expect(typeof recommendedSize).toBe('number')
      expect(recommendedSize).toBeGreaterThanOrEqual(0)
    })
  })

  describe('Circuit Breaker', () => {
    it('should check circuit breaker status', () => {
      const isActive = riskManager.isCircuitBreakerActive()
      expect(typeof isActive).toBe('boolean')
    })
  })

  describe('Statistics', () => {
    it('should provide risk statistics', () => {
      const stats = riskManager.getStats()
      expect(stats).toHaveProperty('totalPositions')
      expect(stats).toHaveProperty('totalExposure')
      expect(stats).toHaveProperty('currentDrawdown')
      expect(stats).toHaveProperty('circuitBreakerActive')
      expect(stats).toHaveProperty('riskAlerts')
    })
  })
}) 