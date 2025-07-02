"use client"

import { useState, useEffect, useMemo } from "react"
import { Badge } from "@/components/ui/badge"
import { Search, Filter, RefreshCw } from "lucide-react"

interface MarketData {
  symbol: string
  timestamp: number
  price: number
  volume: number
  change24h: number
  indicators: {
    rsi: number
    macd: {
      macd: number
      signal: number
      histogram: number
    }
    bollinger: {
      upper: number
      middle: number
      lower: number
      position: number
    }
    volume: {
      average: number
      ratio: number
      trend: number
    }
  }
  klines: Array<[number, string, string, string, string, string, number, string, number, string, string, string]>
}

interface CryptoPair {
  symbol: string
  value: number
  change24h: number
  volume: number
  signal: "bullish" | "bearish" | "neutral"
  price: number
}

interface LinearIndicatorChartProps {
  title: string
  type: "rsi" | "macd" | "bollinger" | "volume"
  description: string
}

export function LinearIndicatorChart({ title, type, description }: LinearIndicatorChartProps) {
  const [pairs, setPairs] = useState<CryptoPair[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [signalFilter, setSignalFilter] = useState<"all" | "bullish" | "bearish" | "neutral">("all")


  const [isLoading, setIsLoading] = useState(false)
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())

  // Fetch real market data from enhanced API
  const fetchMarketData = async () => {
    setIsLoading(true)
    try {
      console.log('Fetching enhanced market data...')
      const response = await fetch('/api/trading/enhanced-market-data')
      console.log('API response status:', response.status)
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const data = await response.json()
      console.log('API response data:', {
        success: data.success,
        count: data.count,
        hasData: !!data.data,
        dataLength: data.data?.length || 0,
        sampleItem: data.data?.[0],
        sampleIndicators: data.data?.[0]?.indicators
      })
      
      if (data.data && Array.isArray(data.data)) {
        console.log('Processing market data:', data.data.length, 'items')
        console.log('Sample data item:', data.data[0])
        const processedPairs: CryptoPair[] = data.data.map((item: any) => {
          let value: number
          let signal: "bullish" | "bearish" | "neutral"
          
          switch (type) {
            case "rsi":
              value = item.indicators?.rsi || 50
              signal = value > 65 ? "bearish" : value < 35 ? "bullish" : "neutral"
              break
            case "macd":
              value = item.indicators?.macd || 0
              signal = value > 0.05 ? "bullish" : value < -0.05 ? "bearish" : "neutral"
              break
            case "bollinger":
              // Handle both string and number position values
              const bollingerPos = item.indicators?.bollinger?.position
              if (typeof bollingerPos === 'string') {
                value = bollingerPos === 'UPPER' ? 85 : bollingerPos === 'LOWER' ? 15 : 50
              } else {
                value = bollingerPos || 50
              }
              signal = value > 75 ? "bearish" : value < 25 ? "bullish" : "neutral"
              break
            case "volume":
              value = item.indicators?.volume?.ratio || 1
              signal = value > 1.2 ? "bullish" : value < 0.8 ? "bearish" : "neutral"
              break
            default:
              value = 50
              signal = "neutral"
          }
          
          console.log(`Processing ${item.symbol} for ${type}:`, {
            rsi: item.indicators?.rsi,
            macd: item.indicators?.macd,
            bollinger: item.indicators?.bollinger?.position,
            volume: item.indicators?.volume?.ratio,
            calculatedValue: value,
            signal
          })
          
          return {
            symbol: item.symbol,
            value,
            change24h: item.change24h || 0,
            volume: item.volume || 0,
            signal,
            price: item.price || 0,
          }
        })
        
        console.log('Processed pairs:', processedPairs.length, 'items')
        setPairs(processedPairs)
        setLastUpdate(new Date())
      } else {
        console.log('No data received from API:', data)
      }
    } catch (error) {
      console.error('Error fetching market data:', error)
      // Keep existing data on error
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchMarketData()
    
    const interval = setInterval(() => {
      fetchMarketData()
    }, 30000) // Update every 30 seconds

    return () => clearInterval(interval)
  }, [type])

  // Filter and search logic
  const filteredPairs = useMemo(() => {
    let filtered = pairs

    if (searchTerm) {
      filtered = filtered.filter(pair => 
        pair.symbol.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    if (signalFilter !== "all") {
      filtered = filtered.filter(pair => pair.signal === signalFilter)
    }

    return filtered.sort((a, b) => {
      // Sort by signal strength, then by value
      if (a.signal !== b.signal) {
        const signalOrder = { bullish: 0, bearish: 1, neutral: 2 }
        return signalOrder[a.signal] - signalOrder[b.signal]
      }
      return Math.abs(b.value - 50) - Math.abs(a.value - 50)
    })
  }, [pairs, searchTerm, signalFilter])

  const displayPairs = filteredPairs // Show all filtered pairs

  const getSignalColor = (signal: string) => {
    switch (signal) {
      case "bullish":
        return "text-green-400 bg-green-400/20 border-green-400/30"
      case "bearish":
        return "text-red-400 bg-red-400/20 border-red-400/30"
      default:
        return "text-blue-400 bg-blue-400/20 border-blue-400/30"
    }
  }

  const getPositionStyle = (value: number, index: number) => {
    let percentage: number
    
    if (type === "macd") {
      // Normalize MACD values to 0-100 range
      percentage = Math.max(0, Math.min(100, ((value + 2) / 4) * 100))
    } else if (type === "volume") {
      // Normalize volume ratio to 0-100 range
      percentage = Math.max(0, Math.min(100, (value / 3) * 100))
    } else {
      percentage = Math.max(0, Math.min(100, value))
    }
    
    // Calculate position based on value (horizontal) and index (vertical)
    const horizontalPosition = Math.max(2, Math.min(98, percentage))
    
    // Distribute pairs vertically across the chart height
    const totalPairs = displayPairs.length
    const verticalSpacing = Math.max(20, (chartHeight - 40) / Math.min(totalPairs, 50)) // Max 50 pairs per column
    const verticalPosition = 10 + (index % 50) * verticalSpacing
    
    return {
      left: `${horizontalPosition}%`,
      top: `${verticalPosition}px`,
      transform: "translateX(-50%)",
    }
  }

  // Make chart much higher to accommodate all pairs
  const chartHeight = Math.max(400, Math.ceil(displayPairs.length / 10) * 25 + 60)

  const getValueDisplay = (value: number) => {
    switch (type) {
      case "rsi":
        return `${value.toFixed(1)}`
      case "macd":
        return `${value.toFixed(4)}`
      case "bollinger":
        return `${value.toFixed(1)}%`
      case "volume":
        return `${value.toFixed(2)}x`
      default:
        return `${value.toFixed(2)}`
    }
  }

  return (
    <div className="space-y-4">
      {/* Debug Info */}
      <div className="bg-red-900/20 border border-red-500 p-2 rounded text-xs">
        <div>Debug: {pairs.length} pairs loaded</div>
        <div>Filtered: {filteredPairs.length} pairs</div>
        <div>Displayed: {displayPairs.length} pairs</div>
        <div>Type: {type}</div>
        <div>Loading: {isLoading ? 'Yes' : 'No'}</div>

        <div>Sample Value: {displayPairs[0]?.value || 'N/A'}</div>
      </div>
      
      {/* Header with Controls */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium text-white">{title}</h3>
          <p className="text-xs text-slate-400">{description}</p>
        </div>
        <div className="flex gap-2">
          <Badge variant="outline" className="text-green-400 border-green-400/30">
            {filteredPairs.filter((p) => p.signal === "bullish").length} Bullish
          </Badge>
          <Badge variant="outline" className="text-red-400 border-red-400/30">
            {filteredPairs.filter((p) => p.signal === "bearish").length} Bearish
          </Badge>
          <Badge variant="outline" className="text-blue-400 border-blue-400/30">
            {filteredPairs.length} Total
          </Badge>
        </div>
      </div>

      {/* Search and Filter Controls */}
      <div className="flex gap-2 items-center">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2 top-2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search pairs..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 bg-slate-800 border border-slate-700 rounded text-sm text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        
        <select
          value={signalFilter}
          onChange={(e) => setSignalFilter(e.target.value as any)}
          className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="all">All Signals</option>
          <option value="bullish">Bullish Only</option>
          <option value="bearish">Bearish Only</option>
          <option value="neutral">Neutral Only</option>
        </select>



        <button
          onClick={fetchMarketData}
          disabled={isLoading}
          className="p-1.5 bg-slate-800 border border-slate-700 rounded text-slate-400 hover:text-white focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
          title="Refresh data"
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
        </button>


      </div>

      {/* Linear Chart Container */}
      <div 
        className="relative bg-slate-800/50 rounded-lg border border-slate-700 overflow-hidden"
        style={{ height: `${chartHeight}px` }}
      >
        {/* Background Grid */}
        <div className="absolute inset-0 flex">
          {[0, 25, 50, 75, 100].map((mark) => (
            <div key={mark} className="absolute top-0 bottom-0 w-px bg-slate-700" style={{ left: `${mark}%` }} />
          ))}
        </div>

        {/* Scale Labels */}
        <div className="absolute bottom-0 left-0 right-0 flex justify-between px-2 pb-1">
          {type === "rsi" &&
            ["0", "30", "50", "70", "100"].map((label) => (
              <span key={label} className="text-xs text-slate-500">
                {label}
              </span>
            ))}
          {type === "macd" &&
            ["-2", "-1", "0", "1", "2"].map((label) => (
              <span key={label} className="text-xs text-slate-500">
                {label}
              </span>
            ))}
          {type === "bollinger" &&
            ["Lower", "Mid-Low", "Middle", "Mid-High", "Upper"].map((label) => (
              <span key={label} className="text-xs text-slate-500">
                {label}
              </span>
            ))}
          {type === "volume" &&
            ["0x", "1x", "2x", "3x", "4x"].map((label) => (
              <span key={label} className="text-xs text-slate-500">
                {label}
              </span>
            ))}
        </div>

        {/* Crypto Pairs Positioned by Value */}
        <div className="absolute inset-0 pt-2">
          {displayPairs.map((pair, index) => (
            <div
              key={`${pair.symbol}-${index}`}
              className={`absolute transition-all duration-300 ease-in-out ${getSignalColor(pair.signal)} 
                         px-1.5 py-0.5 rounded text-xs font-medium cursor-pointer hover:scale-110 hover:z-20
                         border whitespace-nowrap`}
              style={{
                ...getPositionStyle(pair.value, index),
                animationDelay: `${(index % 50) * 20}ms`,
                zIndex: pair.signal !== "neutral" ? 10 : 5,
              }}
              title={`${pair.symbol}: ${getValueDisplay(pair.value)} | 24h: ${pair.change24h.toFixed(2)}% | Price: $${pair.price.toFixed(6)} | Signal: ${pair.signal}`}
            >
              {pair.symbol.replace("USDT", "").slice(0, 6)}
            </div>
          ))}
        </div>
      </div>



      {/* Enhanced Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
        <div className="bg-slate-800/30 p-3 rounded border border-slate-700">
          <div className="text-slate-400">Strong Signals</div>
          <div className="text-lg font-medium text-white">
            {filteredPairs.filter((p) => p.signal !== "neutral").length}
          </div>
        </div>
        <div className="bg-slate-800/30 p-3 rounded border border-slate-700">
          <div className="text-slate-400">Displayed</div>
          <div className="text-lg font-medium text-white">
            {displayPairs.length}
          </div>
        </div>
        <div className="bg-slate-800/30 p-3 rounded border border-slate-700">
          <div className="text-slate-400">Total Available</div>
          <div className="text-lg font-medium text-white">
            {pairs.length}
          </div>
        </div>
        <div className="bg-slate-800/30 p-3 rounded border border-slate-700">
          <div className="text-slate-400">Last Update</div>
          <div className="text-lg font-medium text-white">
            {lastUpdate.toLocaleTimeString()}
          </div>
        </div>
      </div>
    </div>
  )
}
