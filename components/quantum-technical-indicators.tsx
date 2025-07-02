'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { RefreshCw, TrendingUp, TrendingDown, Minus, Zap, Activity, BarChart3 } from 'lucide-react'

interface QuantumIndicator {
  symbol: string
  rank: number
  score: number
  signals: {
    primary: 'bullish' | 'bearish' | 'neutral'
    strength: number
    confidence: number
  }
  indicators: {
    rsi: {
      rsi7: number
      rsi14: number
      rsi21: number
      divergence: 'bullish' | 'bearish' | 'none'
    }
    atr: {
      current: number
      percentile: number
      rank: number
    }
    vwap: {
      value: number
      deviation: number
      volumeSurge: boolean
    }
    velocity: {
      priceVelocity: number
      acceleration: number
      momentumIndex: number
    }
    bollinger: {
      upper: number
      middle: number
      lower: number
      squeeze: boolean
      expansion: number
      percentile: number
    }
    macd: {
      macd: number
      signal: number
      histogram: number
      divergence: 'bullish' | 'bearish' | 'none'
    }
    williams: {
      percentR: number
      stochastic: number
      convergence: number
    }
    orderFlow: {
      imbalance: number
      institutionalActivity: number
      retailActivity: number
    }
    score: {
      momentum: number
      volatility: number
      volume: number
      overall: number
    }
  }
}

interface QuantumMetrics {
  totalProcessed: number
  averageLatency: number
  cacheHitRate: number
  errorRate: number
  lastUpdate: number
}

export default function QuantumTechnicalIndicators() {
  const [indicators, setIndicators] = useState<QuantumIndicator[]>([])
  const [metrics, setMetrics] = useState<QuantumMetrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())

  const fetchQuantumIndicators = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch('/api/trading/quantum-indicators?limit=10')
      const data = await response.json()
      
      if (data.success) {
        setIndicators(data.data.indicators)
        setMetrics(data.data.metrics)
        setLastUpdate(new Date())
      } else {
        setError(data.error || 'Failed to fetch quantum indicators')
      }
    } catch (err) {
      setError('Network error while fetching quantum indicators')
      console.error('Quantum indicators fetch error:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchQuantumIndicators()
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchQuantumIndicators, 30000)
    
    return () => clearInterval(interval)
  }, [])

  const getSignalIcon = (signal: string) => {
    switch (signal) {
      case 'bullish':
        return <TrendingUp className="h-4 w-4 text-green-500" />
      case 'bearish':
        return <TrendingDown className="h-4 w-4 text-red-500" />
      default:
        return <Minus className="h-4 w-4 text-gray-500" />
    }
  }

  const getSignalColor = (signal: string) => {
    switch (signal) {
      case 'bullish':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'bearish':
        return 'bg-red-100 text-red-800 border-red-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getRSIColor = (rsi: number) => {
    if (rsi > 70) return 'text-red-600'
    if (rsi < 30) return 'text-green-600'
    return 'text-gray-600'
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600'
    if (score >= 60) return 'text-yellow-600'
    if (score >= 40) return 'text-orange-600'
    return 'text-red-600'
  }

  if (loading && indicators.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Quantum Technical Indicators
          </CardTitle>
          <CardDescription>
            High-performance prioritized indicators with real-time analysis
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32">
            <RefreshCw className="h-6 w-6 animate-spin text-blue-500" />
            <span className="ml-2">Processing quantum indicators...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-blue-500" />
              Quantum Technical Indicators
            </CardTitle>
            <CardDescription>
              High-performance prioritized indicators with real-time analysis
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchQuantumIndicators}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
        
        {metrics && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{metrics.totalProcessed}</div>
              <div className="text-sm text-gray-600">Symbols Processed</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{metrics.averageLatency.toFixed(1)}ms</div>
              <div className="text-sm text-gray-600">Avg Latency</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{metrics.cacheHitRate.toFixed(1)}%</div>
              <div className="text-sm text-gray-600">Cache Hit Rate</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">{lastUpdate.toLocaleTimeString()}</div>
              <div className="text-sm text-gray-600">Last Update</div>
            </div>
          </div>
        )}
      </CardHeader>

      <CardContent>
        {error && (
          <Alert className="mb-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Tabs defaultValue="top-signals" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="top-signals">Top Signals</TabsTrigger>
            <TabsTrigger value="tier1">Tier 1 Core</TabsTrigger>
            <TabsTrigger value="tier2">Tier 2 Advanced</TabsTrigger>
          </TabsList>

          <TabsContent value="top-signals" className="space-y-4">
            <div className="grid gap-4">
              {indicators.slice(0, 5).map((indicator, index) => (
                <Card key={indicator.symbol} className="border-l-4 border-l-blue-500">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <Badge variant="outline" className="font-mono">
                          #{indicator.rank}
                        </Badge>
                        <h3 className="font-bold text-lg">{indicator.symbol}</h3>
                        <Badge className={getSignalColor(indicator.signals.primary)}>
                          {getSignalIcon(indicator.signals.primary)}
                          <span className="ml-1 capitalize">{indicator.signals.primary}</span>
                        </Badge>
                      </div>
                      <div className="text-right">
                        <div className={`text-xl font-bold ${getScoreColor(indicator.score)}`}>
                          {indicator.score.toFixed(1)}
                        </div>
                        <div className="text-sm text-gray-600">Score</div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <div className="text-sm text-gray-600">Momentum</div>
                        <div className="font-semibold">{indicator.indicators.score.momentum.toFixed(1)}</div>
                        <Progress value={indicator.indicators.score.momentum} className="h-1 mt-1" />
                      </div>
                      <div>
                        <div className="text-sm text-gray-600">Volatility</div>
                        <div className="font-semibold">{indicator.indicators.score.volatility.toFixed(1)}</div>
                        <Progress value={indicator.indicators.score.volatility} className="h-1 mt-1" />
                      </div>
                      <div>
                        <div className="text-sm text-gray-600">Volume</div>
                        <div className="font-semibold">{indicator.indicators.score.volume.toFixed(1)}</div>
                        <Progress value={indicator.indicators.score.volume} className="h-1 mt-1" />
                      </div>
                      <div>
                        <div className="text-sm text-gray-600">Confidence</div>
                        <div className="font-semibold">{(indicator.signals.confidence * 100).toFixed(0)}%</div>
                        <Progress value={indicator.signals.confidence * 100} className="h-1 mt-1" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="tier1" className="space-y-4">
            <div className="grid gap-4">
              {indicators.map((indicator) => (
                <Card key={indicator.symbol}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-bold">{indicator.symbol}</h3>
                      <Badge className={getSignalColor(indicator.signals.primary)}>
                        {indicator.signals.primary}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <div className="text-sm text-gray-600">RSI (14)</div>
                        <div className={`font-semibold ${getRSIColor(indicator.indicators.rsi.rsi14)}`}>
                          {indicator.indicators.rsi.rsi14.toFixed(1)}
                        </div>
                        {indicator.indicators.rsi.divergence !== 'none' && (
                          <Badge variant="outline" className="text-xs mt-1">
                            {indicator.indicators.rsi.divergence} divergence
                          </Badge>
                        )}
                      </div>
                      <div>
                        <div className="text-sm text-gray-600">ATR Percentile</div>
                        <div className="font-semibold">{indicator.indicators.atr.percentile.toFixed(1)}%</div>
                        <Progress value={indicator.indicators.atr.percentile} className="h-1 mt-1" />
                      </div>
                      <div>
                        <div className="text-sm text-gray-600">VWAP Dev</div>
                        <div className="font-semibold">{indicator.indicators.vwap.deviation.toFixed(2)}%</div>
                        {indicator.indicators.vwap.volumeSurge && (
                          <Badge variant="outline" className="text-xs mt-1 bg-orange-50">
                            Volume Surge
                          </Badge>
                        )}
                      </div>
                      <div>
                        <div className="text-sm text-gray-600">Momentum Index</div>
                        <div className="font-semibold">{indicator.indicators.velocity.momentumIndex.toFixed(2)}</div>
                        <div className="text-xs text-gray-500">
                          Vel: {indicator.indicators.velocity.priceVelocity.toFixed(2)}%
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="tier2" className="space-y-4">
            <div className="grid gap-4">
              {indicators.map((indicator) => (
                <Card key={indicator.symbol}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-bold">{indicator.symbol}</h3>
                      <Badge className={getSignalColor(indicator.signals.primary)}>
                        {indicator.signals.primary}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <div className="text-sm text-gray-600">Bollinger %</div>
                        <div className="font-semibold">{indicator.indicators.bollinger.percentile.toFixed(1)}%</div>
                        {indicator.indicators.bollinger.squeeze && (
                          <Badge variant="outline" className="text-xs mt-1 bg-purple-50">
                            Squeeze
                          </Badge>
                        )}
                      </div>
                      <div>
                        <div className="text-sm text-gray-600">MACD Histogram</div>
                        <div className="font-semibold">{indicator.indicators.macd.histogram.toFixed(4)}</div>
                        {indicator.indicators.macd.divergence !== 'none' && (
                          <Badge variant="outline" className="text-xs mt-1">
                            {indicator.indicators.macd.divergence} div
                          </Badge>
                        )}
                      </div>
                      <div>
                        <div className="text-sm text-gray-600">Williams %R</div>
                        <div className="font-semibold">{indicator.indicators.williams.percentR.toFixed(1)}</div>
                        {indicator.indicators.williams.convergence > 0 && (
                          <Badge variant="outline" className="text-xs mt-1 bg-green-50">
                            Convergence
                          </Badge>
                        )}
                      </div>
                      <div>
                        <div className="text-sm text-gray-600">Order Flow</div>
                        <div className="font-semibold">{indicator.indicators.orderFlow.imbalance}</div>
                        {indicator.indicators.orderFlow.institutionalActivity > 0 && (
                          <Badge variant="outline" className="text-xs mt-1 bg-blue-50">
                            Institutional
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
} 