import { startDataFlow, getMarketData, getDataFlowMetrics, getCacheStats } from '@/lib/data-service'

export async function GET() {
  try {
    // Test with a few symbols
    const testSymbols = ['BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'ADAUSDT', 'SOLUSDT']
    
    console.log('Test data flow starting...')
    
    // Start data flow
    await startDataFlow(testSymbols)
    
    // Wait for completion
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    // Get data
    const marketData = getMarketData(testSymbols)
    const metrics = getDataFlowMetrics()
    const cacheStats = getCacheStats()
    
    console.log('Test data flow results:', {
      marketDataLength: marketData.length,
      sampleData: marketData[0],
      metrics,
      cacheStats
    })
    
    return Response.json({
      success: true,
      testSymbols,
      marketData: marketData.map(item => ({
        symbol: item.symbol,
        price: item.price,
        indicators: {
          rsi: item.indicators.rsi,
          macd: item.indicators.macd.macd,
          bollinger: item.indicators.bollinger.position
        }
      })),
      metrics,
      cacheStats
    })
  } catch (error) {
    console.error("Test data flow error:", error)
    
    return Response.json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
} 