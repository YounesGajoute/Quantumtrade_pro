"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TrendingUp, TrendingDown } from "lucide-react"

interface MarketData {
  symbol: string
  price: number
  change24h: number
  volume: number
  marketCap: number
}

export function MarketHeatmap() {
  const [marketData, setMarketData] = useState<MarketData[]>([])

  useEffect(() => {
    const generateMarketData = (): MarketData[] => {
      const symbols = [
        "BTC",
        "ETH",
        "BNB",
        "ADA",
        "SOL",
        "XRP",
        "DOT",
        "DOGE",
        "AVAX",
        "MATIC",
        "LINK",
        "UNI",
        "LTC",
        "BCH",
        "XLM",
        "VET",
        "FIL",
        "TRX",
        "ETC",
        "ATOM",
        "NEAR",
        "ALGO",
        "MANA",
        "SAND",
      ]

      return symbols.map((symbol) => ({
        symbol,
        price: Math.random() * 1000 + 10,
        change24h: (Math.random() - 0.5) * 20,
        volume: Math.random() * 1000000000,
        marketCap: Math.random() * 100000000000,
      }))
    }

    const updateData = () => {
      setMarketData(generateMarketData())
    }

    updateData()
    const interval = setInterval(updateData, 5000)

    return () => clearInterval(interval)
  }, [])

  const getChangeColor = (change: number) => {
    if (change > 5) return "bg-green-600 text-white"
    if (change > 0) return "bg-green-500 text-white"
    if (change > -5) return "bg-red-500 text-white"
    return "bg-red-600 text-white"
  }

  const getSize = (marketCap: number, maxCap: number) => {
    const ratio = marketCap / maxCap
    if (ratio > 0.8) return "w-24 h-16"
    if (ratio > 0.6) return "w-20 h-14"
    if (ratio > 0.4) return "w-16 h-12"
    if (ratio > 0.2) return "w-14 h-10"
    return "w-12 h-8"
  }

  const maxMarketCap = Math.max(...marketData.map((d) => d.marketCap))

  return (
    <Card className="bg-slate-900 border-slate-800">
      <CardHeader>
        <CardTitle className="text-white">Market Heatmap - 24h Performance</CardTitle>
        <p className="text-sm text-slate-400">Size represents market cap, color represents 24h price change</p>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2 justify-center">
          {marketData.map((coin) => (
            <div
              key={coin.symbol}
              className={`
                ${getSize(coin.marketCap, maxMarketCap)}
                ${getChangeColor(coin.change24h)}
                rounded-lg flex flex-col items-center justify-center
                cursor-pointer hover:scale-105 transition-all duration-200
                border border-slate-700 hover:border-slate-500
              `}
              title={`${coin.symbol}: $${coin.price.toFixed(2)} (${coin.change24h.toFixed(2)}%)`}
            >
              <div className="text-xs font-bold">{coin.symbol}</div>
              <div className="text-xs flex items-center gap-1">
                {coin.change24h >= 0 ? <TrendingUp className="w-2 h-2" /> : <TrendingDown className="w-2 h-2" />}
                {Math.abs(coin.change24h).toFixed(1)}%
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 flex items-center justify-center gap-6 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-600 rounded"></div>
            <span>Strong Gain (+5%)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-500 rounded"></div>
            <span>Gain (0-5%)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-red-500 rounded"></div>
            <span>Loss (0-5%)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-red-600 rounded"></div>
            <span>Strong Loss (-5%)</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
