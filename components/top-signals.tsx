"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { TrendingUp, TrendingDown, AlertCircle, RefreshCw, Zap, Target, Star } from "lucide-react"

interface SignalData {
  symbol: string
  price: number
  change24h: number
  signals: {
    rsi: "bullish" | "bearish" | "neutral"
    macd: "bullish" | "bearish" | "neutral"
    bollinger: "bullish" | "bearish" | "neutral"
    volume: "bullish" | "bearish" | "neutral"
  }
  signalCount: number
  overallSignal: "bullish" | "bearish" | "neutral"
  strength: number
  indicators: {
    rsi: number
    macd: number
    bollinger: number
    volume: number
  }
}

export function TopSignals() {
  const [signalData, setSignalData] = useState<SignalData[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchMarketData = async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      const response = await fetch('/api/trading/enhanced-market-data')
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const data = await response.json()
      
      if (data.data && Array.isArray(data.data)) {
        const processedData: SignalData[] = data.data.map((item: any) => {
          // Calculate signals for each indicator
          const rsi = item.indicators?.rsi || 50
          const macd = item.indicators?.macd || 0
          const bollinger = item.indicators?.bollinger?.position || 50
          const volume = item.indicators?.volume?.ratio || 1

          const signals = {
            rsi: rsi > 65 ? "bearish" : rsi < 35 ? "bullish" : "neutral",
            macd: macd > 0.05 ? "bullish" : macd < -0.05 ? "bearish" : "neutral",
            bollinger: bollinger > 75 ? "bearish" : bollinger < 25 ? "bullish" : "neutral",
            volume: volume > 1.2 ? "bullish" : volume < 0.8 ? "bearish" : "neutral"
          }

          // Count strong signals
          const signalCount = Object.values(signals).filter(s => s !== "neutral").length

          // Determine overall signal
          const bullishCount = Object.values(signals).filter(s => s === "bullish").length
          const bearishCount = Object.values(signals).filter(s => s === "bearish").length
          
          let overallSignal: "bullish" | "bearish" | "neutral"
          if (bullishCount > bearishCount && signalCount >= 2) {
            overallSignal = "bullish"
          } else if (bearishCount > bullishCount && signalCount >= 2) {
            overallSignal = "bearish"
          } else {
            overallSignal = "neutral"
          }

          // Calculate signal strength (0-100)
          const strength = Math.min(100, signalCount * 25 + (signalCount >= 3 ? 25 : 0))

          return {
            symbol: item.symbol.replace("USDT", ""),
            price: item.price,
            change24h: item.change24h,
            signals,
            signalCount,
            overallSignal,
            strength,
            indicators: {
              rsi,
              macd,
              bollinger,
              volume
            }
          }
        })

        // Filter and sort by signal strength
        const strongSignals = processedData
          .filter(item => item.signalCount >= 2) // At least 2 strong signals
          .sort((a, b) => {
            // Sort by signal count first, then by strength
            if (a.signalCount !== b.signalCount) {
              return b.signalCount - a.signalCount
            }
            return b.strength - a.strength
          })
          .slice(0, 10) // Top 10

        setSignalData(strongSignals)
      } else {
        setError('No market data received')
      }
    } catch (err) {
      console.error('Error fetching market data:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch market data')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchMarketData()
    
    const interval = setInterval(() => {
      fetchMarketData()
    }, 30000) // Update every 30 seconds instead of 2 minutes

    return () => clearInterval(interval)
  }, [])

  const getSignalColor = (signal: "bullish" | "bearish" | "neutral") => {
    switch (signal) {
      case "bullish":
        return "text-green-400 bg-green-400/20 border-green-400/30"
      case "bearish":
        return "text-red-400 bg-red-400/20 border-red-400/30"
      default:
        return "text-slate-400 bg-slate-400/20 border-slate-400/30"
    }
  }

  const getSignalIcon = (signal: "bullish" | "bearish" | "neutral") => {
    switch (signal) {
      case "bullish":
        return <TrendingUp className="w-3 h-3" />
      case "bearish":
        return <TrendingDown className="w-3 h-3" />
      default:
        return <Target className="w-3 h-3" />
    }
  }

  const getStrengthColor = (strength: number) => {
    if (strength >= 75) return "text-yellow-400"
    if (strength >= 50) return "text-orange-400"
    return "text-blue-400"
  }

  if (error) {
    return (
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="text-white">Top Signals</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>
              {error} Please check your connection and try refreshing.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  if (signalData.length === 0 && !isLoading) {
    return (
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="text-white">Top Signals</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-slate-400 py-8">
            No strong signals detected
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-slate-900 border-slate-800">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-white flex items-center gap-2">
              <Zap className="w-5 h-5 text-yellow-500" />
              Top Signals
            </CardTitle>
            <p className="text-sm text-slate-400">
              Symbols with strong signals across multiple indicators
            </p>
          </div>
          <button
            onClick={fetchMarketData}
            disabled={isLoading}
            className="p-2 bg-slate-800 border border-slate-700 rounded text-slate-400 hover:text-white focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
            title="Refresh data"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-3">
        {signalData.map((item, index) => (
          <div
            key={item.symbol}
            className="bg-slate-800/50 p-3 rounded border border-slate-700 hover:bg-slate-800 transition-colors"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                {index < 3 && <Star className={`w-4 h-4 ${index === 0 ? 'text-yellow-500' : index === 1 ? 'text-slate-400' : 'text-orange-600'}`} />}
                <span className="font-bold text-white">{item.symbol}</span>
                <Badge 
                  variant="outline" 
                  className={`${getSignalColor(item.overallSignal)} text-xs`}
                >
                  {getSignalIcon(item.overallSignal)}
                  {item.overallSignal.toUpperCase()}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-sm font-medium ${getStrengthColor(item.strength)}`}>
                  {item.strength}%
                </span>
                <span className="text-xs text-slate-400">
                  {item.signalCount}/4 signals
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Price:</span>
                <span className="text-white">${item.price.toFixed(6)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">24h:</span>
                <span className={`${item.change24h >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {item.change24h >= 0 ? '+' : ''}{item.change24h.toFixed(2)}%
                </span>
              </div>
            </div>

            {/* Signal Indicators */}
            <div className="flex gap-1 mt-2">
              <Badge 
                variant="outline" 
                className={`${getSignalColor(item.signals.rsi)} text-xs px-1 py-0`}
                title={`RSI: ${item.indicators.rsi.toFixed(1)}`}
              >
                RSI
              </Badge>
              <Badge 
                variant="outline" 
                className={`${getSignalColor(item.signals.macd)} text-xs px-1 py-0`}
                title={`MACD: ${item.indicators.macd.toFixed(4)}`}
              >
                MACD
              </Badge>
              <Badge 
                variant="outline" 
                className={`${getSignalColor(item.signals.bollinger)} text-xs px-1 py-0`}
                title={`BB: ${item.indicators.bollinger.toFixed(1)}%`}
              >
                BB
              </Badge>
              <Badge 
                variant="outline" 
                className={`${getSignalColor(item.signals.volume)} text-xs px-1 py-0`}
                title={`Vol: ${item.indicators.volume.toFixed(2)}x`}
              >
                VOL
              </Badge>
            </div>
          </div>
        ))}

        {signalData.length === 0 && !isLoading && (
          <div className="text-center text-slate-400 py-4">
            <Target className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No symbols with strong signals</p>
            <p className="text-xs">Check back later for updates</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
} 