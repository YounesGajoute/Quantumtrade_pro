import { type NextRequest, NextResponse } from "next/server"
import { telegramBot } from "@/lib/telegram-bot"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    await telegramBot.handleWebhook(body)

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("Telegram webhook error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
