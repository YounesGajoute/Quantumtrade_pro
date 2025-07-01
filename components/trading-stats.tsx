"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Target } from "lucide-react"

export function TradingStats() {
  const stats = {
    winRate: 78.5,
    totalTrades: 156,
    avgProfit: 24.3,
    maxDrawdown: 8.2,
    sharpeRatio: 2.14,
    profitFactor: 1.85,
  }

  return (
    <Card className="bg-slate-900 border-slate-800">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <Target className="w-4 h-4" />
          Trading Performance
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-slate-400">Win Rate</span>
            <span className="text-green-400 font-medium">{stats.winRate}%</span>
          </div>
          <Progress value={stats.winRate} className="h-2" />
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-slate-400">Total Trades</p>
            <p className="text-white font-medium">{stats.totalTrades}</p>
          </div>
          <div>
            <p className="text-slate-400">Avg Profit</p>
            <p className="text-green-400 font-medium">${stats.avgProfit}</p>
          </div>
          <div>
            <p className="text-slate-400">Max Drawdown</p>
            <p className="text-red-400 font-medium">{stats.maxDrawdown}%</p>
          </div>
          <div>
            <p className="text-slate-400">Sharpe Ratio</p>
            <p className="text-blue-400 font-medium">{stats.sharpeRatio}</p>
          </div>
        </div>

        <div className="pt-2 border-t border-slate-800">
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-400">Profit Factor</span>
            <span className="text-green-400 font-medium">{stats.profitFactor}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
