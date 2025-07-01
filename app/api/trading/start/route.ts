import { NextResponse } from "next/server"
import { tradingBot } from "@/lib/trading-bot"

export async function POST() {
  try {
    await tradingBot.start()
    return NextResponse.json({ success: true, message: "Trading bot started" })
  } catch (error) {
    console.error("Error starting trading bot:", error)
    return NextResponse.json({ error: "Failed to start trading bot" }, { status: 500 })
  }
}
