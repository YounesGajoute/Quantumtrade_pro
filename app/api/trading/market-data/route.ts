import { get24hrTicker } from "@/lib/binance-api"

export async function GET() {
  try {
    const tickerData = await get24hrTicker()
    
    // Filter for USDT pairs only
    const usdtPairs = tickerData.filter((item: any) => item.symbol.endsWith('USDT'))
    
    return Response.json({
      success: true,
      count: usdtPairs.length,
      data: usdtPairs,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error("Error fetching market data:", error)
    
    // Check if it's a rate limit error
    const isRateLimitError = error instanceof Error && error.message.includes('429')
    
    if (isRateLimitError) {
      return Response.json({
        success: false,
        error: "Rate limited",
        message: "Binance API rate limit exceeded. Please wait before retrying."
      }, { status: 429 })
    }
    
    return Response.json({
      success: false,
      error: "Failed to fetch market data",
      message: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
} 