import { NextRequest, NextResponse } from "next/server"
import { databaseService } from "@/lib/database-service"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const days = Number(searchParams.get("days")) || 30
    const type = searchParams.get("type") || "all"

    let data: any = {}

    switch (type) {
      case "trading":
        data = await databaseService.getTradingStatistics(days)
        break
      case "performance":
        data = await databaseService.getPerformanceMetrics(days)
        break
      case "activities":
        data = await databaseService.getActivities(undefined, 100)
        break
      case "health":
        data = await databaseService.healthCheck()
        break
      case "all":
      default:
        const [tradingStats, performanceMetrics, activities, health] = await Promise.all([
          databaseService.getTradingStatistics(days),
          databaseService.getPerformanceMetrics(days),
          databaseService.getActivities(undefined, 50),
          databaseService.healthCheck()
        ])

        data = {
          trading: tradingStats,
          performance: performanceMetrics,
          recentActivities: activities,
          health: health
        }
        break
    }

    return NextResponse.json({
      success: true,
      type,
      days,
      data
    })
  } catch (error) {
    console.error("Error fetching database stats:", error)
    return NextResponse.json(
      { error: "Failed to fetch database statistics", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    )
  }
} 