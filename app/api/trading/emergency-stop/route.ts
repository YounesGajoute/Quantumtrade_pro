import { emergencyStopTradingBot } from "@/lib/trading-bot"

export async function POST() {
  try {
    await emergencyStopTradingBot()
    return Response.json({ message: "Emergency stop executed successfully" })
  } catch (error) {
    console.error("Error executing emergency stop:", error)
    return Response.json({ error: "Failed to execute emergency stop" }, { status: 500 })
  }
}
