import { stopTradingBot } from "@/lib/trading-bot"

export async function POST() {
  try {
    await stopTradingBot()
    return Response.json({ message: "Trading bot stopped successfully" })
  } catch (error) {
    console.error("Error stopping trading bot:", error)
    return Response.json({ error: "Failed to stop trading bot" }, { status: 500 })
  }
}
