"use client"

import { useState, useEffect } from "react"
import { Badge } from "@/components/ui/badge"

interface CryptoPair {
  symbol: string
  value: number
  change24h: number
  volume: number
  signal: "bullish" | "bearish" | "neutral"
}

interface LinearIndicatorChartProps {
  title: string
  type: "rsi" | "macd" | "bollinger" | "volume"
  description: string
}

export function LinearIndicatorChart({ title, type, description }: LinearIndicatorChartProps) {
  const [pairs, setPairs] = useState<CryptoPair[]>([])

  // Generate mock data for different indicator types
  const generateMockData = (indicatorType: string): CryptoPair[] => {
    const symbols = [
      "BTCUSDT",
      "ETHUSDT",
      "BNBUSDT",
      "ADAUSDT",
      "SOLUSDT",
      "XRPUSDT",
      "DOTUSDT",
      "DOGEUSDT",
      "AVAXUSDT",
      "MATICUSDT",
      "LINKUSDT",
      "UNIUSDT",
      "LTCUSDT",
      "BCHUSDT",
      "XLMUSDT",
      "VETUSDT",
      "FILUSDT",
      "TRXUSDT",
    ]

    return symbols.map((symbol) => {
      let value: number
      let signal: "bullish" | "bearish" | "neutral"

      switch (indicatorType) {
        case "rsi":
          value = Math.random() * 100
          signal = value > 70 ? "bearish" : value < 30 ? "bullish" : "neutral"
          break
        case "macd":
          value = (Math.random() - 0.5) * 2
          signal = value > 0.1 ? "bullish" : value < -0.1 ? "bearish" : "neutral"
          break
        case "bollinger":
          value = Math.random() * 100
          signal = value > 80 ? "bearish" : value < 20 ? "bullish" : "neutral"
          break
        case "volume":
          value = Math.random() * 100
          signal = value > 60 ? "bullish" : "neutral"
          break
        default:
          value = Math.random() * 100
          signal = "neutral"
      }

      return {
        symbol,
        value,
        change24h: (Math.random() - 0.5) * 10,
        volume: Math.random() * 1000000,
        signal,
      }
    })
  }

  useEffect(() => {
    const updateData = () => {
      setPairs(generateMockData(type))
    }

    updateData()
    const interval = setInterval(updateData, 3000) // Update every 3 seconds

    return () => clearInterval(interval)
  }, [type])

  const getSignalColor = (signal: string) => {
    switch (signal) {
      case "bullish":
        return "text-green-400 bg-green-400/20"
      case "bearish":
        return "text-red-400 bg-red-400/20"
      default:
        return "text-blue-400 bg-blue-400/20"
    }
  }

  const getPositionStyle = (value: number, maxValue = 100) => {
    const percentage = (value / maxValue) * 100
    return {
      left: `${Math.max(0, Math.min(95, percentage))}%`,
      transform: "translateX(-50%)",
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium text-white">{title}</h3>
          <p className="text-xs text-slate-400">{description}</p>
        </div>
        <div className="flex gap-2">
          <Badge variant="outline" className="text-green-400 border-green-400/30">
            {pairs.filter((p) => p.signal === "bullish").length} Bullish
          </Badge>
          <Badge variant="outline" className="text-red-400 border-red-400/30">
            {pairs.filter((p) => p.signal === "bearish").length} Bearish
          </Badge>
        </div>
      </div>

      {/* Linear Chart Container */}
      <div className="relative h-16 bg-slate-800/50 rounded-lg border border-slate-700 overflow-hidden">
        {/* Background Grid */}
        <div className="absolute inset-0 flex">
          {[0, 25, 50, 75, 100].map((mark) => (
            <div key={mark} className="absolute top-0 bottom-0 w-px bg-slate-700" style={{ left: `${mark}%` }} />
          ))}
        </div>

        {/* Scale Labels */}
        <div className="absolute bottom-0 left-0 right-0 flex justify-between px-2 pb-1">
          {type === "rsi" &&
            ["0", "30", "50", "70", "100"].map((label, i) => (
              <span key={label} className="text-xs text-slate-500">
                {label}
              </span>
            ))}
          {type === "macd" &&
            ["-2", "-1", "0", "1", "2"].map((label, i) => (
              <span key={label} className="text-xs text-slate-500">
                {label}
              </span>
            ))}
          {type === "bollinger" &&
            ["Lower", "Mid-Low", "Middle", "Mid-High", "Upper"].map((label, i) => (
              <span key={label} className="text-xs text-slate-500">
                {label}
              </span>
            ))}
          {type === "volume" &&
            ["Low", "Below Avg", "Average", "Above Avg", "High"].map((label, i) => (
              <span key={label} className="text-xs text-slate-500">
                {label}
              </span>
            ))}
        </div>

        {/* Crypto Pairs Positioned by Value */}
        <div className="absolute inset-0 pt-2">
          {pairs.map((pair, index) => (
            <div
              key={pair.symbol}
              className={`absolute transition-all duration-500 ease-in-out ${getSignalColor(pair.signal)} 
                         px-2 py-1 rounded text-xs font-medium cursor-pointer hover:scale-110 hover:z-10
                         border border-current/30`}
              style={{
                ...getPositionStyle(type === "macd" ? (pair.value + 2) * 25 : pair.value, type === "macd" ? 100 : 100),
                top: `${2 + (index % 3) * 12}px`,
                animationDelay: `${index * 50}ms`,
              }}
              title={`${pair.symbol}: ${pair.value.toFixed(2)} | 24h: ${pair.change24h.toFixed(2)}%`}
            >
              {pair.symbol.replace("USDT", "")}
            </div>
          ))}
        </div>
      </div>

      {/* Signal Summary */}
      <div className="flex items-center justify-between text-xs">
        <div className="flex gap-4">
          <span className="text-slate-400">Strong Signals: {pairs.filter((p) => p.signal !== "neutral").length}</span>
          <span className="text-slate-400">Total Pairs: {pairs.length}</span>
        </div>
        <div className="text-slate-500">Last Update: {new Date().toLocaleTimeString()}</div>
      </div>
    </div>
  )
}
