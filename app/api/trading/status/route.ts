import { getTradingBotStatus } from "@/lib/trading-bot"
import { getAccountInfo, getPositions } from "@/lib/binance-api"

// Cache for trading status data
let statusCache: {
  data: any
  timestamp: number
  isRateLimited: boolean
} | null = null

const CACHE_DURATION = 30000 // 30 seconds
const RATE_LIMIT_COOLDOWN = 60000 // 1 minute cooldown after rate limit

export async function GET() {
  try {
    // Check if we have recent cached data
    const now = Date.now()
    if (statusCache && (now - statusCache.timestamp) < CACHE_DURATION) {
      return Response.json({
        success: true,
        data: statusCache.data,
        timestamp: new Date(statusCache.timestamp).toISOString(),
        cached: true,
        message: "Using cached data"
      })
    }

    // If we were recently rate limited, return error
    if (statusCache?.isRateLimited && (now - statusCache.timestamp) < RATE_LIMIT_COOLDOWN) {
      return Response.json({
        success: false,
        error: "Rate limited",
        message: "API is currently rate limited. Please wait before retrying."
      }, { status: 429 })
    }

    // Add delay between requests to respect rate limits
    await new Promise(resolve => setTimeout(resolve, 200))

    const botStatus = await getTradingBotStatus()
    
    // Add delay between API calls
    await new Promise(resolve => setTimeout(resolve, 200))
    
    const accountInfo = await getAccountInfo()
    
    // Add delay between API calls
    await new Promise(resolve => setTimeout(resolve, 200))
    
    const positions = await getPositions()

    const statusData = {
      bot: botStatus,
      account: {
        totalBalance: Number.parseFloat(accountInfo.totalWalletBalance),
        availableBalance: Number.parseFloat(accountInfo.availableBalance),
        unrealizedPnl: Number.parseFloat(accountInfo.totalUnrealizedProfit),
      },
      positions: positions.filter((p: any) => Number.parseFloat(p.positionAmt) !== 0),
    }

    // Cache the successful response
    statusCache = {
      data: statusData,
      timestamp: now,
      isRateLimited: false
    }

    return Response.json({
      success: true,
      data: statusData,
      timestamp: new Date().toISOString(),
      cached: false
    })

  } catch (error) {
    console.error("Error getting trading status:", error)
    
    // Check if it's a rate limit error
    const isRateLimitError = error instanceof Error && error.message.includes('429')
    
    if (isRateLimitError) {
      // Mark as rate limited
      statusCache = {
        data: null,
        timestamp: Date.now(),
        isRateLimited: true
      }
      
      return Response.json({
        success: false,
        error: "Rate limited",
        message: "Binance API rate limit exceeded. Please wait before retrying."
      }, { status: 429 })
    }
    
    // For other errors, try to return cached data if available
    if (statusCache && !statusCache.isRateLimited) {
      return Response.json({
        success: true,
        data: statusCache.data,
        timestamp: new Date(statusCache.timestamp).toISOString(),
        cached: true,
        message: "Using cached data due to API error"
      })
    }
    
    // Return error response
    return Response.json({
      success: false,
      error: "Failed to get trading status",
      message: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}
