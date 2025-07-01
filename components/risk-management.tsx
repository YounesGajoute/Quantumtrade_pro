"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { AlertTriangle, Shield } from "lucide-react"
import { Badge } from "@/components/ui/badge"

export function RiskManagement() {
  const riskMetrics = {
    totalBalance: 12847.32,
    usedMargin: 1926.45,
    availableMargin: 10920.87,
    marginRatio: 15,
    maxDrawdown: 8.2,
    riskLevel: "Medium",
    stopLossActive: true,
    profitTarget: 30,
  }

  const getRiskColor = (level: string) => {
    switch (level.toLowerCase()) {
      case "low":
        return "text-green-400 bg-green-400/20"
      case "medium":
        return "text-yellow-400 bg-yellow-400/20"
      case "high":
        return "text-red-400 bg-red-400/20"
      default:
        return "text-slate-400 bg-slate-400/20"
    }
  }

  return (
    <Card className="bg-slate-900 border-slate-800">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <Shield className="w-4 h-4" />
          Risk Management
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Risk Level */}
        <div className="flex items-center justify-between">
          <span className="text-slate-400 text-sm">Risk Level</span>
          <Badge className={getRiskColor(riskMetrics.riskLevel)}>{riskMetrics.riskLevel}</Badge>
        </div>

        {/* Margin Usage */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-slate-400">Margin Usage</span>
            <span className="text-white">{riskMetrics.marginRatio}%</span>
          </div>
          <Progress value={riskMetrics.marginRatio} className="h-2" />
          <div className="flex justify-between text-xs text-slate-500">
            <span>Used: ${riskMetrics.usedMargin.toFixed(2)}</span>
            <span>Available: ${riskMetrics.availableMargin.toFixed(2)}</span>
          </div>
        </div>

        {/* Risk Controls */}
        <div className="space-y-3 pt-2 border-t border-slate-800">
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-400">Stop Loss</span>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${riskMetrics.stopLossActive ? "bg-green-500" : "bg-red-500"}`} />
              <span className="text-white">{riskMetrics.stopLossActive ? "Active" : "Inactive"}</span>
            </div>
          </div>

          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-400">Profit Target</span>
            <span className="text-green-400">+${riskMetrics.profitTarget} USDT</span>
          </div>

          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-400">Max Drawdown</span>
            <span className="text-red-400">{riskMetrics.maxDrawdown}%</span>
          </div>
        </div>

        {/* Emergency Controls */}
        <div className="pt-2 border-t border-slate-800">
          <div className="flex items-center gap-2 text-xs text-yellow-400">
            <AlertTriangle className="w-3 h-3" />
            <span>Emergency stop at 20% account loss</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
