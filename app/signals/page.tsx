"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  TrendingUp, 
  TrendingDown, 
  Search, 
  Filter, 
  RefreshCw, 
  Zap, 
  Target, 
  Star,
  AlertCircle,
  CheckCircle,
  XCircle,
  BarChart3,
  Activity,
  Cpu,
  Gauge
} from "lucide-react"
import QuantumTechnicalIndicators from "@/components/quantum-technical-indicators"

interface SignalData {
  symbol: string
  price: number
  change24h: number
  volume24h: number
  marketCap: number
  signals: {
    rsi: "bullish" | "bearish" | "neutral"
    macd: "bullish" | "bearish" | "neutral"
    bollinger: "bullish" | "bearish" | "neutral"
    volume: "bullish" | "bearish" | "neutral"
  }
  indicators: {
    rsi: number
    macd: number
    bollinger: number
    volume: number
  }
  signalCount: number
  overallSignal: "bullish" | "bearish" | "neutral"
  strength: number
  confidence: number
  lastUpdate: string
}

export default function SignalsPage() {
  const [signals, setSignals] = useState<SignalData[]>([])
  const [filteredSignals, setFilteredSignals] = useState<SignalData[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [signalFilter, setSignalFilter] = useState<"all" | "bullish" | "bearish">("all")
  const [strengthFilter, setStrengthFilter] = useState<"all" | "high" | "medium" | "low">("all")

  const fetchSignals = async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      const response = await fetch('/api/trading/enhanced-market-data')
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const data = await response.json()
      
      if (data.data && Array.isArray(data.data)) {
        const processedSignals: SignalData[] = data.data.map((item: any) => {
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

          const signalCount = Object.values(signals).filter(s => s !== "neutral").length
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

          const strength = Math.min(100, signalCount * 25 + (signalCount >= 3 ? 25 : 0))
          const confidence = Math.min(100, (signalCount / 4) * 100 + (signalCount >= 3 ? 20 : 0))

          return {
            symbol: item.symbol.replace("USDT", ""),
            price: item.price,
            change24h: item.change24h,
            volume24h: item.volume24h || 0,
            marketCap: item.marketCap || 0,
            signals,
            indicators: { rsi, macd, bollinger, volume },
            signalCount,
            overallSignal,
            strength,
            confidence,
            lastUpdate: new Date().toLocaleTimeString()
          }
        })

        setSignals(processedSignals)
        setFilteredSignals(processedSignals)
      } else {
        setError('No signal data received')
      }
    } catch (err) {
      console.error('Error fetching signals:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch signals')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchSignals()
    
    const interval = setInterval(() => {
      fetchSignals()
    }, 120000) // Update every 2 minutes

    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    let filtered = signals

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(signal => 
        signal.symbol.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Signal type filter
    if (signalFilter !== "all") {
      filtered = filtered.filter(signal => signal.overallSignal === signalFilter)
    }

    // Strength filter
    if (strengthFilter !== "all") {
      filtered = filtered.filter(signal => {
        switch (strengthFilter) {
          case "high":
            return signal.strength >= 75
          case "medium":
            return signal.strength >= 50 && signal.strength < 75
          case "low":
            return signal.strength < 50
          default:
            return true
        }
      })
    }

    setFilteredSignals(filtered)
  }, [signals, searchTerm, signalFilter, strengthFilter])

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

  const formatCurrency = (value: number) => {
    if (value >= 1e9) return `$${(value / 1e9).toFixed(1)}B`
    if (value >= 1e6) return `$${(value / 1e6).toFixed(1)}M`
    if (value >= 1e3) return `$${(value / 1e3).toFixed(1)}K`
    return `$${value.toFixed(0)}`
  }

  const formatVolume = (value: number) => {
    if (value >= 1e9) return `${(value / 1e9).toFixed(1)}B`
    if (value >= 1e6) return `${(value / 1e6).toFixed(1)}M`
    if (value >= 1e3) return `${(value / 1e3).toFixed(1)}K`
    return value.toFixed(0)
  }

  const stats = {
    total: signals.length,
    bullish: signals.filter(s => s.overallSignal === "bullish").length,
    bearish: signals.filter(s => s.overallSignal === "bearish").length,
    strong: signals.filter(s => s.strength >= 75).length
  }

  return (
    <div className="min-h-screen bg-slate-950 p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Zap className="w-8 h-8 text-blue-500" />
            Trading Signals & Technical Analysis
          </h1>
          <p className="text-slate-400 mt-2">
            Enterprise-grade technical analysis with quantum-powered indicators and real-time signals
          </p>
        </div>
        
        <Button
          onClick={fetchSignals}
          disabled={isLoading}
          className="bg-blue-600 hover:bg-blue-700"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="quantum" className="w-full">
        <TabsList className="grid w-full grid-cols-3 bg-slate-900 border-slate-700">
          <TabsTrigger value="quantum" className="flex items-center gap-2 data-[state=active]:bg-blue-600">
            <Zap className="h-4 w-4" />
            Quantum Indicators
          </TabsTrigger>
          <TabsTrigger value="signals" className="flex items-center gap-2 data-[state=active]:bg-blue-600">
            <Target className="h-4 w-4" />
            Trading Signals
          </TabsTrigger>
          <TabsTrigger value="analysis" className="flex items-center gap-2 data-[state=active]:bg-blue-600">
            <BarChart3 className="h-4 w-4" />
            Market Analysis
          </TabsTrigger>
        </TabsList>

        <TabsContent value="quantum" className="space-y-6">
          <div className="grid gap-6">
            <Card className="bg-slate-900 border-slate-800">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  <Cpu className="h-5 w-5 text-blue-500" />
                  Quantum Performance Metrics
                </CardTitle>
                <p className="text-sm text-slate-400">
                  High-performance computing metrics for the quantum indicator engine
                </p>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-4 bg-blue-900/50 rounded-lg border border-blue-800">
                    <div className="text-2xl font-bold text-blue-400">~150ms</div>
                    <div className="text-sm text-slate-400">Target Latency</div>
                  </div>
                  <div className="text-center p-4 bg-green-900/50 rounded-lg border border-green-800">
                    <div className="text-2xl font-bold text-green-400">&gt;2000</div>
                    <div className="text-sm text-slate-400">Symbols/sec</div>
                  </div>
                  <div className="text-center p-4 bg-purple-900/50 rounded-lg border border-purple-800">
                    <div className="text-2xl font-bold text-purple-400">&gt;10000</div>
                    <div className="text-sm text-slate-400">Calculations/sec</div>
                  </div>
                  <div className="text-center p-4 bg-orange-900/50 rounded-lg border border-orange-800">
                    <div className="text-2xl font-bold text-orange-400">99.9%</div>
                    <div className="text-sm text-slate-400">Uptime</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
              <QuantumTechnicalIndicators />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="signals" className="space-y-6">
          {/* Stats Overview */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="bg-slate-900 border-slate-800">
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-sm font-medium text-slate-400">Total Signals</CardTitle>
                <BarChart3 className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">{stats.total}</div>
                <p className="text-xs text-slate-400">Active pairs</p>
              </CardContent>
            </Card>

            <Card className="bg-slate-900 border-slate-800">
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-sm font-medium text-slate-400">Bullish</CardTitle>
                <TrendingUp className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-500">{stats.bullish}</div>
                <p className="text-xs text-slate-400">Buy signals</p>
              </CardContent>
            </Card>

            <Card className="bg-slate-900 border-slate-800">
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-sm font-medium text-slate-400">Bearish</CardTitle>
                <TrendingDown className="h-4 w-4 text-red-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-500">{stats.bearish}</div>
                <p className="text-xs text-slate-400">Sell signals</p>
              </CardContent>
            </Card>

            <Card className="bg-slate-900 border-slate-800">
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-sm font-medium text-slate-400">Strong Signals</CardTitle>
                <Zap className="h-4 w-4 text-yellow-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-500">{stats.strong}</div>
                <p className="text-xs text-slate-400">≥75% strength</p>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Filter className="w-5 h-5 text-blue-500" />
                Filters
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="text-sm text-slate-300 mb-2 block">Search Symbol</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                      placeholder="BTC, ETH, ADA..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 bg-slate-800 border-slate-700"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="text-sm text-slate-300 mb-2 block">Signal Type</label>
                  <Select value={signalFilter} onValueChange={(value: any) => setSignalFilter(value)}>
                    <SelectTrigger className="bg-slate-800 border-slate-700">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Signals</SelectItem>
                      <SelectItem value="bullish">Bullish Only</SelectItem>
                      <SelectItem value="bearish">Bearish Only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <label className="text-sm text-slate-300 mb-2 block">Signal Strength</label>
                  <Select value={strengthFilter} onValueChange={(value: any) => setStrengthFilter(value)}>
                    <SelectTrigger className="bg-slate-800 border-slate-700">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Strengths</SelectItem>
                      <SelectItem value="high">High (≥75%)</SelectItem>
                      <SelectItem value="medium">Medium (50-74%)</SelectItem>
                      <SelectItem value="low">Low (&lt;50%)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="flex items-end">
                  <Button variant="outline" className="w-full">
                    Clear Filters
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Signals List */}
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader>
              <CardTitle className="text-white">
                Signal Analysis ({filteredSignals.length} results)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {filteredSignals.map((signal, index) => (
                  <div
                    key={signal.symbol}
                    className="bg-slate-800/50 p-4 rounded-lg border border-slate-700 hover:bg-slate-800 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        {index < 3 && (
                          <Star className={`w-5 h-5 ${index === 0 ? 'text-yellow-500' : index === 1 ? 'text-slate-400' : 'text-orange-600'}`} />
                        )}
                        <div>
                          <h3 className="font-bold text-white text-lg">{signal.symbol}</h3>
                          <p className="text-sm text-slate-400">
                            ${signal.price.toFixed(6)} • {signal.change24h >= 0 ? '+' : ''}{signal.change24h.toFixed(2)}%
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        <Badge 
                          variant="outline" 
                          className={`${getSignalColor(signal.overallSignal)} text-sm`}
                        >
                          {getSignalIcon(signal.overallSignal)}
                          {signal.overallSignal.toUpperCase()}
                        </Badge>
                        
                        <div className="text-right">
                          <div className={`text-lg font-bold ${getStrengthColor(signal.strength)}`}>
                            {signal.strength}%
                          </div>
                          <div className="text-xs text-slate-400">
                            {signal.signalCount}/4 signals
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-slate-400">Volume 24h:</span>
                        <div className="text-white">{formatVolume(signal.volume24h)}</div>
                      </div>
                      <div>
                        <span className="text-slate-400">Market Cap:</span>
                        <div className="text-white">{formatCurrency(signal.marketCap)}</div>
                      </div>
                      <div>
                        <span className="text-slate-400">Confidence:</span>
                        <div className="text-white">{signal.confidence.toFixed(0)}%</div>
                      </div>
                      <div>
                        <span className="text-slate-400">Updated:</span>
                        <div className="text-white">{signal.lastUpdate}</div>
                      </div>
                    </div>

                    {/* Indicator Badges */}
                    <div className="flex gap-2 mt-3">
                      <Badge 
                        variant="outline" 
                        className={`${getSignalColor(signal.signals.rsi)} text-xs`}
                        title={`RSI: ${signal.indicators.rsi.toFixed(1)}`}
                      >
                        RSI
                      </Badge>
                      <Badge 
                        variant="outline" 
                        className={`${getSignalColor(signal.signals.macd)} text-xs`}
                        title={`MACD: ${signal.indicators.macd.toFixed(4)}`}
                      >
                        MACD
                      </Badge>
                      <Badge 
                        variant="outline" 
                        className={`${getSignalColor(signal.signals.bollinger)} text-xs`}
                        title={`BB: ${signal.indicators.bollinger.toFixed(1)}%`}
                      >
                        BB
                      </Badge>
                      <Badge 
                        variant="outline" 
                        className={`${getSignalColor(signal.signals.volume)} text-xs`}
                        title={`Vol: ${signal.indicators.volume.toFixed(2)}x`}
                      >
                        VOL
                      </Badge>
                    </div>
                  </div>
                ))}

                {filteredSignals.length === 0 && !isLoading && (
                  <div className="text-center text-slate-400 py-12">
                    <Target className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p className="text-lg">No signals match your filters</p>
                    <p className="text-sm">Try adjusting your search criteria</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analysis" className="space-y-6">
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <Gauge className="h-5 w-5 text-purple-500" />
                Market Analysis Dashboard
              </CardTitle>
              <p className="text-sm text-slate-400">
                Comprehensive market analysis and trend identification
              </p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="p-4 border border-slate-700 rounded-lg bg-slate-800/50">
                  <h4 className="font-semibold mb-2 text-white">Tier 1: Core Indicators</h4>
                  <ul className="text-sm text-slate-400 space-y-1">
                    <li>• RSI Multi-Timeframe (7, 14, 21)</li>
                    <li>• ATR Percentile Ranking</li>
                    <li>• VWAP Deviation Analysis</li>
                    <li>• Price Velocity & Acceleration</li>
                  </ul>
                </div>
                <div className="p-4 border border-slate-700 rounded-lg bg-slate-800/50">
                  <h4 className="font-semibold mb-2 text-white">Tier 2: Advanced Signals</h4>
                  <ul className="text-sm text-slate-400 space-y-1">
                    <li>• Bollinger Band Squeeze</li>
                    <li>• MACD Histogram Divergence</li>
                    <li>• Williams %R + Stochastic</li>
                    <li>• Volume-Weighted Analysis</li>
                  </ul>
                </div>
                <div className="p-4 border border-slate-700 rounded-lg bg-slate-800/50">
                  <h4 className="font-semibold mb-2 text-white">Tier 3: Microstructure</h4>
                  <ul className="text-sm text-slate-400 space-y-1">
                    <li>• Order Flow Imbalance</li>
                    <li>• Institutional Activity</li>
                    <li>• Retail vs Smart Money</li>
                    <li>• Real-time Processing</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
} 