"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { TrendingUp, TrendingDown, AlertCircle, RefreshCw } from "lucide-react"

interface MarketData {
  symbol: string
  price: number
  change24h: number
  volume: number
  marketCap: number
  indicators: {
    rsi: number
    macd: number
    bollinger: {
      position: number
    }
    volume: {
      ratio: number
    }
  }
}

export function MarketHeatmap() {
  const [marketData, setMarketData] = useState<MarketData[]>([])
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
        const processedData: MarketData[] = data.data.map((item: any) => ({
          symbol: item.symbol.replace("USDT", ""),
          price: item.price,
          change24h: item.change24h,
          volume: item.volume,
          marketCap: item.volume * item.price, // Approximate market cap
          indicators: {
            rsi: item.indicators?.rsi || 50,
            macd: item.indicators?.macd || 0,
            bollinger: {
              position: item.indicators?.bollinger?.position || 50
            },
            volume: {
              ratio: item.indicators?.volume?.ratio || 1
            }
          }
        }))
        
        setMarketData(processedData)
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
    }, 120000) // Update every 2 minutes

    return () => clearInterval(interval)
  }, [])

  const getChangeColor = (change: number) => {
    if (change > 10) return "bg-green-700 text-white border-green-600"
    if (change > 5) return "bg-green-600 text-white border-green-500"
    if (change > 2) return "bg-green-500 text-white border-green-400"
    if (change > 0) return "bg-green-400 text-white border-green-300"
    if (change > -2) return "bg-red-400 text-white border-red-300"
    if (change > -5) return "bg-red-500 text-white border-red-400"
    if (change > -10) return "bg-red-600 text-white border-red-500"
    return "bg-red-700 text-white border-red-600"
  }

  const getSize = (marketCap: number, maxCap: number) => {
    const ratio = marketCap / maxCap
    if (ratio > 0.8) return "w-28 h-20 text-sm"
    if (ratio > 0.6) return "w-24 h-16 text-sm"
    if (ratio > 0.4) return "w-20 h-14 text-xs"
    if (ratio > 0.2) return "w-16 h-12 text-xs"
    return "w-14 h-10 text-xs"
  }

  const getPerformanceLabel = (change: number) => {
    if (change > 10) return "🚀 Strong Bull"
    if (change > 5) return "📈 Bullish"
    if (change > 2) return "↗️ Slight Up"
    if (change > 0) return "↗️ Up"
    if (change > -2) return "↘️ Down"
    if (change > -5) return "📉 Bearish"
    if (change > -10) return "🔻 Strong Bear"
    return "💥 Crash"
  }

  if (error) {
    return (
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="text-white">Market Heatmap - 24h Performance</CardTitle>
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

  if (marketData.length === 0 && !isLoading) {
    return (
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="text-white">Market Heatmap - 24h Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-slate-400 py-8">
            No market data available
          </div>
        </CardContent>
      </Card>
    )
  }

  const maxMarketCap = Math.max(...marketData.map((d) => d.marketCap))
  const avgChange = marketData.reduce((sum, d) => sum + d.change24h, 0) / marketData.length
  const gainers = marketData.filter(d => d.change24h > 0).length
  const losers = marketData.filter(d => d.change24h < 0).length

  // Sort by market cap and limit to top 40 pairs
  const displayData = marketData
    .sort((a, b) => b.marketCap - a.marketCap)
    .slice(0, 40)

  return (
    <Card className="bg-slate-900 border-slate-800">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-white">Market Heatmap - 24h Performance</CardTitle>
            <p className="text-sm text-slate-400">
              Size = Market Cap • Color = 24h Change • {marketData.length} pairs analyzed
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
        
        {/* Market Summary */}
        <div className="grid grid-cols-4 gap-4 mt-4">
          <div className="bg-slate-800/50 p-3 rounded border border-slate-700">
            <div className="text-slate-400 text-xs">Avg Change</div>
            <div className={`text-lg font-medium ${avgChange >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              {avgChange.toFixed(2)}%
            </div>
          </div>
          <div className="bg-slate-800/50 p-3 rounded border border-slate-700">
            <div className="text-slate-400 text-xs">Gainers</div>
            <div className="text-lg font-medium text-green-500">
              {gainers}
            </div>
          </div>
          <div className="bg-slate-800/50 p-3 rounded border border-slate-700">
            <div className="text-slate-400 text-xs">Losers</div>
            <div className="text-lg font-medium text-red-500">
              {losers}
            </div>
          </div>
          <div className="bg-slate-800/50 p-3 rounded border border-slate-700">
            <div className="text-slate-400 text-xs">Displayed</div>
            <div className="text-lg font-medium text-white">
              {displayData.length}
            </div>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="flex flex-wrap gap-2 justify-center">
          {displayData.map((coin) => (
            <div
              key={coin.symbol}
              className={`
                ${getSize(coin.marketCap, maxMarketCap)}
                ${getChangeColor(coin.change24h)}
                rounded-lg flex flex-col items-center justify-center
                cursor-pointer hover:scale-110 transition-all duration-200
                border shadow-lg hover:shadow-xl
                relative group
              `}
              title={`
                ${coin.symbol}
                Price: $${coin.price.toFixed(6)}
                24h Change: ${coin.change24h.toFixed(2)}%
                Volume: ${(coin.volume / 1000000).toFixed(1)}M
                RSI: ${coin.indicators.rsi.toFixed(1)}
                MACD: ${coin.indicators.macd.toFixed(4)}
                Volume Ratio: ${coin.indicators.volume.ratio.toFixed(2)}x
              `}
            >
              <div className="font-bold truncate max-w-full px-1">{coin.symbol}</div>
              <div className="flex items-center gap-1">
                {coin.change24h >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                <span className="font-medium">{Math.abs(coin.change24h).toFixed(1)}%</span>
              </div>
              
              {/* Performance Label on Hover */}
              <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-slate-800 text-white px-2 py-1 rounded text-xs opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap">
                {getPerformanceLabel(coin.change24h)}
              </div>
            </div>
          ))}
        </div>

        {/* Legend */}
        <div className="mt-6 flex items-center justify-center gap-4 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-700 rounded border border-green-600"></div>
            <span>+10%+</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-600 rounded border border-green-500"></div>
            <span>+5-10%</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-500 rounded border border-green-400"></div>
            <span>+2-5%</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-400 rounded border border-green-300"></div>
            <span>0-2%</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-red-400 rounded border border-red-300"></div>
            <span>0-2%</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-red-500 rounded border border-red-400"></div>
            <span>-2-5%</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-red-600 rounded border border-red-500"></div>
            <span>-5-10%</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-red-700 rounded border border-red-600"></div>
            <span>-10%+</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
} 