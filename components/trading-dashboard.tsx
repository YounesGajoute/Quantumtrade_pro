"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Skeleton } from "@/components/ui/skeleton"
import { useRealTimeData } from "@/components/real-time-data-provider"
import { TrendingUp, Activity, DollarSign, Target, AlertTriangle, Wifi, WifiOff, RefreshCw, Coins, AlertCircle } from "lucide-react"

import { LinearIndicatorChart } from "@/components/linear-indicator-chart"
import { TradingStats } from "@/components/trading-stats"
import { ActivePositions } from "@/components/active-positions"
import { RiskManagement } from "@/components/risk-management"
import { TopSignals } from "@/components/top-signals"
import { AdvancedTradingControls } from "@/components/advanced-trading-controls"
import { MarketHeatmap } from "@/components/market-heatmap"
import { DataFlowMonitor } from "@/components/data-flow-monitor"

export function TradingDashboard() {
  const { tradingStatus, isConnected, lastUpdate, isLoading, error, availablePairs } = useRealTimeData()
  const [activeTab, setActiveTab] = useState<"overview" | "controls">("overview")

  const formatCurrency = (value: number | undefined | null) => {
    if (value === undefined || value === null) return "$0.00"
    return `$${value.toFixed(2)}`
  }

  const formatNumber = (value: number | undefined | null) => {
    if (value === undefined || value === null) return "0"
    return value.toString()
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-8 w-64 mb-2" />
            <Skeleton className="h-4 w-48" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-8 w-24" />
            <Skeleton className="h-8 w-20" />
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="bg-slate-900 border-slate-800">
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-20 mb-2" />
                <Skeleton className="h-3 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950 p-6 space-y-6">
      {/* HEADER */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">Trading Dashboard</h1>
          <div className="flex items-center gap-4 text-slate-400 text-sm">
            <span>{new Date().toLocaleString()} UTC</span>
            <span className="flex items-center gap-1">
              {isConnected ? (
                <>
                  <Wifi className="w-4 h-4 text-green-500" />
                  <span className="text-green-500">Connected</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-4 h-4 text-red-500" />
                  <span className="text-red-500">Disconnected</span>
                </>
              )}
            </span>
            {lastUpdate && <span className="text-xs">Last update {lastUpdate.toLocaleTimeString()}</span>}
            <span className="flex items-center gap-1">
              <Coins className="w-4 h-4 text-blue-500" />
              <span className="text-blue-500">{availablePairs.length} USDT Pairs</span>
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant={tradingStatus?.isActive ? "default" : "secondary"} className="px-3 py-1">
            <Activity className="w-3 h-3 mr-1" />
            {tradingStatus?.isActive ? "TRADING ACTIVE" : "TRADING PAUSED"}
          </Badge>
          <Button
            size="sm"
            variant="outline"
            onClick={() => window.location.reload()}
            className="text-slate-400 hover:text-white"
          >
            <RefreshCw className="w-3 h-3 mr-1" />
            Refresh
          </Button>
          <Button
            size="sm"
            variant={activeTab === "overview" ? "default" : "outline"}
            onClick={() => setActiveTab("overview")}
          >
            Overview
          </Button>
          <Button
            size="sm"
            variant={activeTab === "controls" ? "default" : "outline"}
            onClick={() => setActiveTab("controls")}
          >
            Controls
          </Button>
        </div>
      </div>

      {/* ERROR ALERT */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            {error} Please check your connection and try refreshing.
          </AlertDescription>
        </Alert>
      )}

      {/* RATE LIMIT WARNING */}
      {error && error.includes('Rate limited') && (
        <Alert className="border-yellow-500 bg-yellow-950/20">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
            <span className="text-yellow-300 text-sm">
              ⚠️ Rate limited by Binance API. Using cached data. Updates will resume automatically.
            </span>
          </div>
        </Alert>
      )}

      {/* DATA STATUS */}
      {!error && availablePairs.length > 0 && (
        <Alert className="border-green-500 bg-green-950/20">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-green-300 text-sm">
              Connected to Binance API • {availablePairs.length} USDT pairs • Market data updates every 60s • Status updates every 30s
            </span>
          </div>
        </Alert>
      )}

      {/* METRICS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-slate-400">Total Balance</CardTitle>
            <DollarSign className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {formatCurrency(tradingStatus?.totalBalance)}
            </div>
            <p className="text-xs text-green-500">Real-time value</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-slate-400">Unrealized P&L</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold ${
                (tradingStatus?.unrealizedPnl ?? 0) >= 0 ? "text-green-500" : "text-red-500"
              }`}
            >
              {formatCurrency(tradingStatus?.unrealizedPnl)}
            </div>
            <p className="text-xs text-slate-400">Live P&L</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-slate-400">Active Positions</CardTitle>
            <Target className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {formatNumber(tradingStatus?.activePositions)}
            </div>
            <p className="text-xs text-slate-400">Open positions</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-slate-400">Available Balance</CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {formatCurrency(tradingStatus?.availableBalance)}
            </div>
            <p className="text-xs text-slate-400">Free margin</p>
          </CardContent>
        </Card>
      </div>

      {/* MAIN CONTENT */}
      {activeTab === "overview" ? (
        <>
          {/* Charts & Side Widgets */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Indicator Charts */}
            <div className="lg:col-span-2 space-y-4">
              <Card className="bg-slate-900 border-slate-800">
                <CardHeader>
                  <CardTitle className="text-white">Technical Indicators — Real-time Analysis</CardTitle>
                  <p className="text-sm text-slate-400">
                    Live positioning based on real market data across {availablePairs.length} USDT pairs
                  </p>
                </CardHeader>
                <CardContent className="space-y-6">
                  <LinearIndicatorChart title="RSI (14)" type="rsi" description="Relative Strength Index" />
                  <LinearIndicatorChart
                    title="MACD Signal"
                    type="macd"
                    description="Moving Average Convergence Divergence"
                  />
                  <LinearIndicatorChart
                    title="Bollinger Bands Position"
                    type="bollinger"
                    description="Price vs. Bollinger Bands"
                  />
                  <LinearIndicatorChart title="Volume Profile" type="volume" description="24h Volume Analysis" />
                </CardContent>
              </Card>
            </div>

            {/* Right Column Widgets */}
            <div className="space-y-4">
              <DataFlowMonitor />
              <TradingStats />
              <ActivePositions />
              <RiskManagement />
              <TopSignals />
            </div>
          </div>

          {/* Heatmap */}
          <MarketHeatmap />
        </>
      ) : (
        /* CONTROLS TAB */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <AdvancedTradingControls />
          </div>
          <div className="space-y-4">
            <RiskManagement />
            <TopSignals />
            <TradingStats />
          </div>
        </div>
      )}
    </div>
  )
}
