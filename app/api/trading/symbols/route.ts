import { getAllUSDTPairs } from "@/lib/binance-api"

export async function GET() {
  try {
    const pairs = await getAllUSDTPairs()
    
    return Response.json({
      success: true,
      count: pairs.length,
      symbols: pairs,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error("Error fetching USDT pairs:", error)
    
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
      error: "Failed to fetch USDT pairs",
      message: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
} 