"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { X } from "lucide-react"

export function ActivePositions() {
  const positions = [
    {
      symbol: "BTCUSDT",
      side: "LONG",
      size: 0.5,
      entryPrice: 43250,
      currentPrice: 43890,
      pnl: 320,
      pnlPercent: 1.48,
      leverage: 5,
    },
    {
      symbol: "ETHUSDT",
      side: "SHORT",
      size: 2.1,
      entryPrice: 2650,
      currentPrice: 2598,
      pnl: 109.2,
      pnlPercent: 1.96,
      leverage: 5,
    },
    {
      symbol: "SOLUSDT",
      side: "LONG",
      size: 15,
      entryPrice: 98.5,
      currentPrice: 96.2,
      pnl: -34.5,
      pnlPercent: -2.34,
      leverage: 5,
    },
  ]

  return (
    <Card className="bg-slate-900 border-slate-800">
      <CardHeader>
        <CardTitle className="text-white">Active Positions</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {positions.map((position, index) => (
          <div key={index} className="p-3 bg-slate-800/50 rounded-lg border border-slate-700">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-white font-medium">{position.symbol}</span>
                <Badge variant={position.side === "LONG" ? "default" : "destructive"} className="text-xs">
                  {position.side} {position.leverage}x
                </Badge>
              </div>
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-slate-400 hover:text-white">
                <X className="w-3 h-3" />
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <p className="text-slate-400">Size</p>
                <p className="text-white">{position.size}</p>
              </div>
              <div>
                <p className="text-slate-400">Entry</p>
                <p className="text-white">${position.entryPrice}</p>
              </div>
              <div>
                <p className="text-slate-400">Current</p>
                <p className="text-white">${position.currentPrice}</p>
              </div>
              <div>
                <p className="text-slate-400">P&L</p>
                <p className={position.pnl >= 0 ? "text-green-400" : "text-red-400"}>
                  ${position.pnl} ({position.pnlPercent}%)
                </p>
              </div>
            </div>
          </div>
        ))}

        <Button className="w-full bg-transparent" variant="outline" size="sm">
          Close All Positions
        </Button>
      </CardContent>
    </Card>
  )
}
