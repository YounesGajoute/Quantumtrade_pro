import { startDataFlow, getMarketData, getDataFlowMetrics } from '@/lib/core/data-orchestrator'
import { getAllUSDTPairs, getTopUSDTPairsByVolume, getUSDTPairsWithVolume } from '@/lib/binance-api'
import CacheManager from '@/lib/core/cache-manager'
import RateLimiter from '@/lib/core/rate-limiter'
import RetentionManager from '@/lib/core/retention-manager'

// Initialize enhanced components
const cacheManager = new CacheManager({
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD,
    db: parseInt(process.env.REDIS_DB || '0'),
  },
  timescale: {
    host: process.env.TIMESCALE_HOST || 'localhost',
    port: parseInt(process.env.TIMESCALE_PORT || '5432'),
    database: process.env.TIMESCALE_DB || 'quantumtrade',
    user: process.env.TIMESCALE_USER || 'postgres',
    password: process.env.TIMESCALE_PASSWORD || '',
  },
  ttl: {
    l1: 300, // 5 minutes in Redis
    l2: 7,   // 7 days in TimescaleDB
  },
})

const rateLimiter = new RateLimiter({
  maxRequestsPerMinute: 100,
  maxRequestsPerHour: 1000,
  maxRequestsPerDay: 10000,
  burstLimit: 10,
  retryAfterSeconds: 60,
})

const retentionManager = new RetentionManager({
  dataRetentionDays: {
    marketData: 30,
    indicators: 90,
    signals: 180,
    logs: 365,
  },
  cleanupIntervalHours: 24, // Daily cleanup
  batchSize: 1000,
}, cacheManager)

export async function GET(request: Request) {
  try {
    // Rate limiting - get client identifier (IP or API key)
    const clientId = request.headers.get('x-api-key') || 
                    request.headers.get('x-forwarded-for') || 
                    'anonymous'
    
    // Check rate limits
    const isAllowed = await rateLimiter.checkLimit(clientId)
    if (!isAllowed) {
      return Response.json({
        success: false,
        error: 'Rate limit exceeded',
        message: 'Too many requests. Please try again later.',
        retryAfter: 60
      }, { status: 429 })
    }

    // Get query parameters
    const { searchParams } = new URL(request.url)
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined
    const minVolume = searchParams.get('minVolume') ? parseFloat(searchParams.get('minVolume')!) : undefined
    const useTopByVolume = searchParams.get('topByVolume') === 'true'
    
    // Build cache key based on request parameters
    const cacheKey = `enhanced-market-data:${JSON.stringify({
      limit,
      minVolume,
      useTopByVolume,
      timestamp: Math.floor(Date.now() / 60000) // Cache by minute
    })}`
    
    // Try to get data from cache first
    const cachedData = await cacheManager.get(cacheKey)
    if (cachedData) {
      console.log('✅ Returning cached enhanced market data')
      return Response.json({
        ...cachedData,
        cached: true,
        cacheHit: true
      })
    }
    
    // Get available USDT pairs based on parameters
    let usdtPairs
    let symbols: string[]
    
    if (useTopByVolume) {
      // Use top pairs by volume (default 100)
      const topPairs = await getTopUSDTPairsByVolume(limit || 100)
      symbols = topPairs.map((pair: any) => pair.symbol)
    } else if (minVolume) {
      // Use pairs with minimum volume
      usdtPairs = await getUSDTPairsWithVolume(minVolume)
      symbols = usdtPairs.map((pair: any) => pair.symbol)
      if (limit) {
        symbols = symbols.slice(0, limit)
      }
    } else {
      // Get all USDT pairs
      usdtPairs = await getAllUSDTPairs()
      symbols = usdtPairs.map((pair: any) => pair.symbol)
      if (limit) {
        symbols = symbols.slice(0, limit)
      }
    }
    
    // Start data flow if not already running
    await startDataFlow(symbols)
    
    // Wait for data flow to complete and get fresh data
    let marketData = getMarketData(symbols)
    let attempts = 0
    const maxAttempts = 15 // Increased max attempts
    
    // Keep trying until we get data or hit max attempts
    while (marketData.length === 0 && attempts < maxAttempts) {
      console.log(`Waiting for data flow to complete... attempt ${attempts + 1}/${maxAttempts}`)
      await new Promise(resolve => setTimeout(resolve, 2000)) // Increased wait time
      marketData = getMarketData(symbols)
      attempts++
    }
    
    if (marketData.length === 0) {
      console.warn('No market data available after waiting - returning empty array')
      marketData = []
    } else {
      console.log(`Successfully retrieved ${marketData.length} market data points`)
    }
    
    console.log('Enhanced market data API response:', {
      symbolsRequested: symbols.length,
      marketDataReturned: marketData.length,
      sampleData: marketData[0]
    })
    
    // Get data flow metrics
    const metrics = getDataFlowMetrics()
    
    // Prepare response data
    const responseData = {
      success: true,
      count: marketData.length,
      data: marketData.map(item => ({
        symbol: item.symbol,
        price: item.price,
        change24h: item.change24h,
        volume: item.volume,
        indicators: {
          rsi: item.indicators.rsi,
          macd: item.indicators.macd.macd,
          signal: item.indicators.macd.signal,
          histogram: item.indicators.macd.histogram,
          bollinger: {
            upper: item.indicators.bollinger.upper,
            middle: item.indicators.bollinger.middle,
            lower: item.indicators.bollinger.lower,
            position: item.indicators.bollinger.position === 'UPPER' ? 85 : 
                     item.indicators.bollinger.position === 'LOWER' ? 15 : 50
          },
          volume: {
            average: item.indicators.volume.average,
            current: item.indicators.volume.current,
            ratio: item.indicators.volume.ratio
          }
        },
        timestamp: item.timestamp
      })),
      metrics: {
        totalSymbols: metrics.totalSymbols,
        symbolsWithIndicators: metrics.symbolsWithIndicators,
        averageCalculationTime: metrics.averageCalculationTime,
        lastUpdateTime: metrics.lastUpdateTime,
        errors: metrics.errors
      },
      timestamp: new Date().toISOString(),
      cached: false,
      cacheHit: false
    }
    
    // Cache the response data
    await cacheManager.set(cacheKey, responseData, 300) // Cache for 5 minutes
    
    // Get enhanced system metrics
    const cacheStats = await cacheManager.getStats()
    const rateLimitStats = rateLimiter.getStats()
    const retentionStatus = retentionManager.getStatus()
    
    // Add enhanced metrics to response
    const enhancedMetrics = {
      ...responseData.metrics,
      cache: {
        l1Size: cacheStats.l1Size,
        l2Size: cacheStats.l2Size,
        l1HitRate: cacheStats.l1HitRate,
        l2HitRate: cacheStats.l2HitRate
      },
      rateLimiting: {
        activeIdentifiers: rateLimitStats.activeIdentifiers,
        queueLength: rateLimitStats.queueLength,
        isProcessingBurst: rateLimitStats.isProcessingBurst
      },
      retention: {
        isRunning: retentionStatus.isRunning,
        lastCleanup: retentionStatus.lastCleanup,
        nextCleanup: retentionStatus.nextCleanup
      }
    }
    
    responseData.metrics = enhancedMetrics as any
    
    return Response.json(responseData)
  } catch (error) {
    console.error("Error in enhanced market data API:", error)
    
    return Response.json({
      success: false,
      error: "Failed to fetch enhanced market data",
      message: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
} 