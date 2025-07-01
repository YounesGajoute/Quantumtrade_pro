import { startDataFlow, getMarketData, getDataFlowMetrics } from '@/lib/data-service'
import { getAllUSDTPairs, getTopUSDTPairsByVolume, getUSDTPairsWithVolume } from '@/lib/binance-api'

export async function GET(request: Request) {
  try {
    // Get query parameters
    const { searchParams } = new URL(request.url)
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined
    const minVolume = searchParams.get('minVolume') ? parseFloat(searchParams.get('minVolume')!) : undefined
    const useTopByVolume = searchParams.get('topByVolume') === 'true'
    
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
    
    return Response.json({
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
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error("Error in enhanced market data API:", error)
    
    return Response.json({
      success: false,
      error: "Failed to fetch enhanced market data",
      message: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
} 