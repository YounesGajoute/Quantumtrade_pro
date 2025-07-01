"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useRealTimeData } from "@/components/real-time-data-provider"
import { TrendingUp, Activity, DollarSign, Target, AlertTriangle, Wifi, WifiOff } from "lucide-react"

import { LinearIndicatorChart } from "@/components/linear-indicator-chart"
import { TradingStats } from "@/components/trading-stats"
import { ActivePositions } from "@/components/active-positions"
import { RiskManagement } from "@/components/risk-management"
import { AdvancedTradingControls } from "@/components/advanced-trading-controls"
import { MarketHeatmap } from "@/components/market-heatmap"

export function TradingDashboard() {
  const { tradingStatus, isConnected, lastUpdate } = useRealTimeData()
  const [activeTab, setActiveTab] = useState<"overview" | "controls">("overview")

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
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant={tradingStatus?.isActive ? "default" : "secondary"} className="px-3 py-1">
            <Activity className="w-3 h-3 mr-1" />
            {tradingStatus?.isActive ? "TRADING ACTIVE" : "TRADING PAUSED"}
          </Badge>
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

      {/* METRICS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-slate-400">Total Balance</CardTitle>
            <DollarSign className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">${tradingStatus?.totalBalance?.toFixed(2) ?? "0.00"}</div>
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
              ${tradingStatus?.unrealizedPnl?.toFixed(2) ?? "0.00"}
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
            <div className="text-2xl font-bold text-white">{tradingStatus?.activePositions ?? 0}</div>
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
              ${tradingStatus?.availableBalance?.toFixed(2) ?? "0.00"}
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
                  <p className="text-sm text-slate-400">Live positioning based on multiple indicator values</p>
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
              <TradingStats />
              <ActivePositions />
              <RiskManagement />
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
            <TradingStats />
          </div>
        </div>
      )}
    </div>
  )
}
