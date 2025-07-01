import { NextResponse } from "next/server"
import { tradingBot } from "@/lib/trading-bot"
import { binanceAPI } from "@/lib/binance-api"

export async function GET() {
  try {
    const botStatus = await tradingBot.getStatus()
    const accountInfo = await binanceAPI.getAccountInfo()
    const positions = await binanceAPI.getPositions()

    return NextResponse.json({
      bot: botStatus,
      account: {
        totalBalance: Number.parseFloat(accountInfo.totalWalletBalance),
        availableBalance: Number.parseFloat(accountInfo.availableBalance),
        unrealizedPnl: Number.parseFloat(accountInfo.totalUnrealizedProfit),
      },
      positions: positions.filter((p: any) => Number.parseFloat(p.positionAmt) !== 0),
    })
  } catch (error) {
    console.error("Error getting trading status:", error)
    return NextResponse.json({ error: "Failed to get trading status" }, { status: 500 })
  }
}
