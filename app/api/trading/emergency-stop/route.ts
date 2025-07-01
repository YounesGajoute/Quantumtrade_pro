import { NextResponse } from "next/server"
import { tradingBot } from "@/lib/trading-bot"
import { telegramBot } from "@/lib/telegram-bot"

export async function POST() {
  try {
    await tradingBot.emergencyStop()
    await telegramBot.notifyRiskAlert("Emergency stop activated via API")

    return NextResponse.json({ success: true, message: "Emergency stop executed" })
  } catch (error) {
    console.error("Error executing emergency stop:", error)
    return NextResponse.json({ error: "Failed to execute emergency stop" }, { status: 500 })
  }
}
