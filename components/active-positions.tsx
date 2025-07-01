"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { X, AlertCircle } from "lucide-react"
import { useRealTimeData } from "@/components/real-time-data-provider"

interface Position {
  symbol: string
  side: "LONG" | "SHORT"
  size: number
  entryPrice: number
  currentPrice: number
  pnl: number
  pnlPercent: number
  leverage: number
}

export function ActivePositions() {
  const [positions, setPositions] = useState<Position[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { tradingStatus } = useRealTimeData()

  useEffect(() => {
    const fetchPositions = async () => {
      try {
        setIsLoading(true)
        const response = await fetch("/api/trading/status")
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }
        
        const data = await response.json()
        
        // Transform API data to component format
        const transformedPositions: Position[] = data.positions?.map((pos: any) => {
          const positionAmt = Number.parseFloat(pos.positionAmt)
          const entryPrice = Number.parseFloat(pos.entryPrice)
          const markPrice = Number.parseFloat(pos.markPrice)
          const unrealizedPnl = Number.parseFloat(pos.unrealizedPnl)
          const leverage = Number.parseFloat(pos.leverage)
          
          return {
            symbol: pos.symbol,
            side: positionAmt > 0 ? "LONG" : "SHORT",
            size: Math.abs(positionAmt),
            entryPrice,
            currentPrice: markPrice,
            pnl: unrealizedPnl,
            pnlPercent: entryPrice > 0 ? ((markPrice - entryPrice) / entryPrice) * 100 * (positionAmt > 0 ? 1 : -1) : 0,
            leverage,
          }
        }) ?? []

        setPositions(transformedPositions)
        setError(null)
      } catch (err) {
        console.error("Error fetching positions:", err)
        setError(err instanceof Error ? err.message : "Failed to fetch positions")
        

      } finally {
        setIsLoading(false)
      }
    }

    fetchPositions()
    
    // Refresh positions every 10 seconds
    const interval = setInterval(fetchPositions, 10000)
    
    return () => clearInterval(interval)
  }, [])

  const handleClosePosition = async (symbol: string) => {
    try {
      // This would call the API to close the specific position
      console.log(`Closing position for ${symbol}`)
      // TODO: Implement actual position closing API call
    } catch (error) {
      console.error("Error closing position:", error)
    }
  }

  const handleCloseAllPositions = async () => {
    try {
      const response = await fetch("/api/trading/emergency-stop", {
        method: "POST",
      })
      
      if (response.ok) {
        setPositions([])
      }
    } catch (error) {
      console.error("Error closing all positions:", error)
    }
  }

  if (isLoading) {
    return (
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="text-white">Active Positions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-slate-400">Loading positions...</div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-slate-900 border-slate-800">
      <CardHeader>
        <CardTitle className="text-white">Active Positions</CardTitle>

      </CardHeader>
      <CardContent className="space-y-3">
        {positions.length === 0 ? (
          <div className="text-center text-slate-400 py-4">
            No active positions
          </div>
        ) : (
          positions.map((position, index) => (
            <div key={index} className="p-3 bg-slate-800/50 rounded-lg border border-slate-700">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-white font-medium">{position.symbol}</span>
                  <Badge variant={position.side === "LONG" ? "default" : "destructive"} className="text-xs">
                    {position.side} {position.leverage}x
                  </Badge>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-6 w-6 p-0 text-slate-400 hover:text-white"
                  onClick={() => handleClosePosition(position.symbol)}
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <p className="text-slate-400">Size</p>
                  <p className="text-white">{position.size.toFixed(4)}</p>
                </div>
                <div>
                  <p className="text-slate-400">Entry</p>
                  <p className="text-white">${position.entryPrice.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-slate-400">Current</p>
                  <p className="text-white">${position.currentPrice.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-slate-400">P&L</p>
                  <p className={position.pnl >= 0 ? "text-green-400" : "text-red-400"}>
                    ${position.pnl.toFixed(2)} ({position.pnlPercent.toFixed(2)}%)
                  </p>
                </div>
              </div>
            </div>
          ))
        )}

        {positions.length > 0 && (
          <Button 
            className="w-full bg-transparent" 
            variant="outline" 
            size="sm"
            onClick={handleCloseAllPositions}
          >
            Close All Positions
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
