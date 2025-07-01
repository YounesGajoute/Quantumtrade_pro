import { NextResponse } from "next/server"
import { tradingBot } from "@/lib/trading-bot"

export async function POST() {
  try {
    await tradingBot.stop()
    return NextResponse.json({ success: true, message: "Trading bot stopped" })
  } catch (error) {
    console.error("Error stopping trading bot:", error)
    return NextResponse.json({ error: "Failed to stop trading bot" }, { status: 500 })
  }
}
