import { startTradingBot } from "@/lib/trading-bot"

export async function POST() {
  try {
    await startTradingBot()
    return Response.json({ message: "Trading bot started successfully" })
  } catch (error) {
    console.error("Error starting trading bot:", error)
    return Response.json({ error: "Failed to start trading bot" }, { status: 500 })
  }
}
