"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Skeleton } from "@/components/ui/skeleton"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useEnterpriseData } from "@/components/enterprise-data-provider"
import { 
  TrendingUp, 
  Activity, 
  DollarSign, 
  Target, 
  AlertTriangle, 
  Wifi, 
  WifiOff, 
  RefreshCw, 
  Coins, 
  AlertCircle,
  Cpu,
  Database,
  Zap,
  Shield,
  Gauge,
  BarChart3,
  Network,
  Clock,
  CheckCircle,
  XCircle,
  Minus,
  ArrowUpRight,
  ArrowDownRight,
  Settings,
  Monitor,
  BarChart,
  PieChart,
  Activity as ActivityIcon
} from "lucide-react"

import { LinearIndicatorChart } from "@/components/linear-indicator-chart"
import { TradingStats } from "@/components/trading-stats"
import { ActivePositions } from "@/components/active-positions"
import { RiskManagement } from "@/components/risk-management"
import { TopSignals } from "@/components/top-signals"
import { AdvancedTradingControls } from "@/components/advanced-trading-controls"
import { MarketHeatmap } from "@/components/market-heatmap"
import { DataFlowMonitor } from "@/components/data-flow-monitor"
import EnterpriseMonitoring from "@/components/enterprise-monitoring"

// Enterprise Data Interfaces
interface DataOrchestratorMetrics {
  workerPool: {
    activeWorkers: number
    totalWorkers: number
    utilization: number
    queueLength: number
  }
  circuitBreaker: {
    status: 'CLOSED' | 'OPEN' | 'HALF_OPEN' | 'UNKNOWN'
    failureCount: number
    threshold: number
    lastFailure: number
  }
  cache: {
    hitRate: number
    missRate: number
    size: number
    evictions: number
  }
  processing: {
    symbolsProcessed: number
    avgProcessingTime: number
    throughput: number
    errors: number
  }
  marketRegime: {
    current: string
    confidence: number
    stability: number
    lastChange: number
  }
}

interface OrderRouterMetrics {
  exchanges: {
    [exchangeId: string]: {
      latency: number
      successRate: number
      volume: number
      status: 'ONLINE' | 'OFFLINE' | 'DEGRADED'
    }
  }
  routing: {
    totalOrders: number
    avgLatency: number
    successRate: number
    lastDecision: any
  }
  performance: {
    p95Latency: number
    p99Latency: number
    errorRate: number
  }
}

interface SystemHealth {
  dataOrchestrator: 'HEALTHY' | 'DEGRADED' | 'UNHEALTHY'
  marketRegime: 'HEALTHY' | 'DEGRADED' | 'UNHEALTHY'
  orderRouter: 'HEALTHY' | 'DEGRADED' | 'UNHEALTHY'
  eventBus: 'HEALTHY' | 'DEGRADED' | 'UNHEALTHY'
  overall: 'HEALTHY' | 'DEGRADED' | 'UNHEALTHY'
}

export function TradingDashboard() {
  const { 
    dataOrchestrator, 
    orderRouter, 
    marketRegime, 
    systemHealth, 
    isConnected, 
    lastUpdate, 
    isLoading, 
    error, 
    performanceMetrics,
    refreshData,
    startDataFlow,
    stopDataFlow,
    getCircuitBreakerStatus,
    getSystemHealth
  } = useEnterpriseData()
  const [activeTab, setActiveTab] = useState<"overview" | "enterprise" | "controls" | "monitoring">("overview")

  const formatCurrency = (value: number | undefined | null) => {
    if (value === undefined || value === null) return "$0.00"
    return `$${value.toFixed(2)}`
  }

  const formatNumber = (value: number | undefined | null) => {
    if (value === undefined || value === null) return "0"
    return value.toString()
  }

  const formatPercentage = (value: number) => {
    return `${(value * 100).toFixed(1)}%`
  }

  const formatLatency = (value: number) => {
    if (value < 1000) return `${value.toFixed(0)}ms`
    return `${(value / 1000).toFixed(1)}s`
  }

  const getHealthColor = (status: string) => {
    switch (status) {
      case 'HEALTHY': return 'text-green-500'
      case 'DEGRADED': return 'text-yellow-500'
      case 'UNHEALTHY': return 'text-red-500'
      default: return 'text-slate-400'
    }
  }

  const getHealthIcon = (status: string) => {
    switch (status) {
      case 'HEALTHY': return <CheckCircle className="w-4 h-4 text-green-500" />
      case 'DEGRADED': return <AlertTriangle className="w-4 h-4 text-yellow-500" />
      case 'UNHEALTHY': return <XCircle className="w-4 h-4 text-red-500" />
      default: return <Minus className="w-4 h-4 text-slate-400" />
    }
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
          <h1 className="text-3xl font-bold text-white">QuantumTrade Pro Enterprise</h1>
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
              <span className="text-blue-500">{performanceMetrics.symbolsProcessed} Symbols Processed</span>
            </span>
            {systemHealth && (
              <span className="flex items-center gap-1">
                {getHealthIcon(systemHealth.overall)}
                <span className={getHealthColor(systemHealth.overall)}>
                  System {systemHealth.overall}
                </span>
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant={isConnected ? "default" : "secondary"} className="px-3 py-1">
            <Activity className="w-3 h-3 mr-1" />
            {isConnected ? "ENTERPRISE ACTIVE" : "SYSTEM OFFLINE"}
          </Badge>
          <Button
            size="sm"
            variant="outline"
            onClick={() => refreshData()}
            className="text-slate-400 hover:text-white"
          >
            <RefreshCw className="w-3 h-3 mr-1" />
            Refresh Data
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
            variant={activeTab === "enterprise" ? "default" : "outline"}
            onClick={() => setActiveTab("enterprise")}
          >
            Enterprise
          </Button>
          <Button
            size="sm"
            variant={activeTab === "monitoring" ? "default" : "outline"}
            onClick={() => setActiveTab("monitoring")}
          >
            Monitoring
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
      {!error && isConnected && (
        <Alert className="border-green-500 bg-green-950/20">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-green-300 text-sm">
              Enterprise System Connected • {performanceMetrics.symbolsProcessed} symbols processed • Cache hit rate: {formatPercentage(performanceMetrics.cacheHitRate)} • Latency: {formatLatency(performanceMetrics.fullSignalLatency)}
            </span>
          </div>
        </Alert>
      )}

      {/* MAIN CONTENT */}
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)} className="space-y-6">
        <TabsContent value="overview" className="space-y-6">
          {/* ENTERPRISE PERFORMANCE METRICS */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="bg-slate-900 border-slate-800">
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-sm font-medium text-slate-400">Signal Latency</CardTitle>
                <Zap className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">
                  {formatLatency(performanceMetrics.fullSignalLatency)}
                </div>
                <p className="text-xs text-green-500">Target: &lt;1.2s</p>
              </CardContent>
            </Card>

            <Card className="bg-slate-900 border-slate-800">
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-sm font-medium text-slate-400">Cache Hit Rate</CardTitle>
                <Database className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">
                  {formatPercentage(performanceMetrics.cacheHitRate)}
                </div>
                <p className="text-xs text-slate-400">Target: &gt;80%</p>
              </CardContent>
            </Card>

            <Card className="bg-slate-900 border-slate-800">
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-sm font-medium text-slate-400">API Efficiency</CardTitle>
                <Gauge className="h-4 w-4 text-purple-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">
                  {formatPercentage(performanceMetrics.apiEfficiency)}
                </div>
                <p className="text-xs text-slate-400">Target: &gt;85%</p>
              </CardContent>
            </Card>

            <Card className="bg-slate-900 border-slate-800">
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-sm font-medium text-slate-400">Symbols Processed</CardTitle>
                <Activity className="h-4 w-4 text-yellow-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">
                  {performanceMetrics.symbolsProcessed}
                </div>
                <p className="text-xs text-slate-400">Real-time processing</p>
              </CardContent>
            </Card>
          </div>

          {/* Charts & Side Widgets */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Indicator Charts */}
            <div className="lg:col-span-2 space-y-4">
              <Card className="bg-slate-900 border-slate-800">
                <CardHeader>
                  <CardTitle className="text-white">Technical Indicators — Real-time Analysis</CardTitle>
                  <p className="text-sm text-slate-400">
                    Live positioning based on real market data across {performanceMetrics.symbolsProcessed} symbols
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
        </TabsContent>

        <TabsContent value="enterprise" className="space-y-6">
          {/* ENTERPRISE METRICS */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Data Orchestrator */}
            <Card className="bg-slate-900 border-slate-800">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Database className="w-5 h-5 text-blue-500" />
                  Data Orchestrator
                </CardTitle>
                <p className="text-sm text-slate-400">Event-driven data processing pipeline</p>
              </CardHeader>
                            <CardContent className="space-y-4">
                {isLoading ? (
                  <div className="space-y-3">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                  </div>
                ) : dataOrchestrator ? (
                   <>
                     {/* Worker Pool */}
                     <div className="space-y-2">
                       <div className="flex justify-between text-sm">
                         <span className="text-slate-400">Worker Pool</span>
                         <span className="text-white">
                           {dataOrchestrator.workerPool?.activeWorkers || 0}/{dataOrchestrator.workerPool?.totalWorkers || 0}
                         </span>
                       </div>
                       <Progress 
                         value={(dataOrchestrator.workerPool?.utilization || 0) * 100} 
                         className="h-2"
                       />
                       <div className="flex justify-between text-xs text-slate-500">
                         <span>Utilization: {formatPercentage(dataOrchestrator.workerPool?.utilization || 0)}</span>
                         <span>Queue: {dataOrchestrator.workerPool?.queueLength || 0}</span>
                       </div>
                     </div>

                     {/* Circuit Breaker */}
                     <div className="space-y-2">
                       <div className="flex justify-between text-sm">
                         <span className="text-slate-400">Circuit Breaker</span>
                         <Badge 
                           variant={
                             dataOrchestrator.circuitBreaker?.status === 'CLOSED' ? 'default' :
                             dataOrchestrator.circuitBreaker?.status === 'HALF_OPEN' ? 'secondary' : 'destructive'
                           }
                           className="text-xs"
                         >
                           {dataOrchestrator.circuitBreaker?.status || 'UNKNOWN'}
                         </Badge>
                       </div>
                       <div className="text-xs text-slate-500">
                         Failures: {dataOrchestrator.circuitBreaker?.failureCount || 0}/{dataOrchestrator.circuitBreaker?.threshold || 0}
                       </div>
                     </div>

                     {/* Cache Performance */}
                     <div className="space-y-2">
                       <div className="flex justify-between text-sm">
                         <span className="text-slate-400">Cache Hit Rate</span>
                         <span className="text-white">{formatPercentage(dataOrchestrator.cache?.hitRate || 0)}</span>
                       </div>
                       <Progress 
                         value={(dataOrchestrator.cache?.hitRate || 0) * 100} 
                         className="h-2"
                       />
                       <div className="flex justify-between text-xs text-slate-500">
                         <span>Size: {dataOrchestrator.cache?.size || 0}</span>
                         <span>Evictions: {dataOrchestrator.cache?.evictions || 0}</span>
                       </div>
                     </div>

                     {/* Processing Metrics */}
                     <div className="space-y-2">
                       <div className="flex justify-between text-sm">
                         <span className="text-slate-400">Processing</span>
                         <span className="text-white">{dataOrchestrator.processing?.symbolsProcessed || 0} symbols</span>
                       </div>
                       <div className="text-xs text-slate-500">
                         Avg Time: {formatLatency(dataOrchestrator.processing?.avgProcessingTime || 0)} • 
                         Throughput: {(dataOrchestrator.processing?.throughput || 0).toFixed(1)}/s
                       </div>
                     </div>
                   </>
                ) : (
                  <div className="text-slate-400 text-sm">No data available</div>
                )}
              </CardContent>
            </Card>

            {/* Market Regime Engine */}
            <Card className="bg-slate-900 border-slate-800">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-purple-500" />
                  Market Regime Engine
                </CardTitle>
                <p className="text-sm text-slate-400">Real-time market condition analysis</p>
              </CardHeader>
              <CardContent className="space-y-4">
                {isLoading ? (
                  <div className="space-y-3">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                  </div>
                                 ) : dataOrchestrator?.marketRegime ? (
                   <>
                     {/* Current Regime */}
                     <div className="space-y-2">
                       <div className="flex justify-between text-sm">
                         <span className="text-slate-400">Current Regime</span>
                         <Badge variant="outline" className="text-xs">
                           {dataOrchestrator.marketRegime?.current || 'UNKNOWN'}
                         </Badge>
                       </div>
                     </div>

                     {/* Confidence Level */}
                     <div className="space-y-2">
                       <div className="flex justify-between text-sm">
                         <span className="text-slate-400">Confidence</span>
                         <span className="text-white">{formatPercentage(dataOrchestrator.marketRegime?.confidence || 0)}</span>
                       </div>
                       <Progress 
                         value={(dataOrchestrator.marketRegime?.confidence || 0) * 100} 
                         className="h-2"
                       />
                     </div>

                     {/* Stability */}
                     <div className="space-y-2">
                       <div className="flex justify-between text-sm">
                         <span className="text-slate-400">Stability</span>
                         <span className="text-white">{formatPercentage(dataOrchestrator.marketRegime?.stability || 0)}</span>
                       </div>
                       <Progress 
                         value={(dataOrchestrator.marketRegime?.stability || 0) * 100} 
                         className="h-2"
                       />
                     </div>

                     {/* Last Change */}
                     <div className="text-xs text-slate-500">
                       Last change: {dataOrchestrator.marketRegime?.lastChange > 0 ? 
                         new Date(dataOrchestrator.marketRegime.lastChange).toLocaleTimeString() : 
                         'N/A'
                       }
                     </div>
                   </>
                ) : (
                  <div className="text-slate-400 text-sm">No data available</div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Order Router Metrics */}
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Network className="w-5 h-5 text-green-500" />
                Order Router
              </CardTitle>
              <p className="text-sm text-slate-400">Multi-exchange order routing and execution</p>
            </CardHeader>
            <CardContent>
                            {isLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              ) : orderRouter ? (
                 <div className="space-y-6">
                   {/* Exchange Performance */}
                   <div>
                     <h4 className="text-sm font-medium text-slate-400 mb-3">Exchange Performance</h4>
                     <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                       {orderRouter.exchanges && Object.entries(orderRouter.exchanges).map(([exchangeId, metrics]) => (
                         <div key={exchangeId} className="bg-slate-800 rounded-lg p-3">
                           <div className="flex justify-between items-center mb-2">
                             <span className="text-sm font-medium text-white">{exchangeId.toUpperCase()}</span>
                             <Badge 
                               variant={
                                 metrics?.status === 'ONLINE' ? 'default' :
                                 metrics?.status === 'DEGRADED' ? 'secondary' : 'destructive'
                               }
                               className="text-xs"
                             >
                               {metrics?.status || 'UNKNOWN'}
                             </Badge>
                           </div>
                           <div className="space-y-1 text-xs">
                             <div className="flex justify-between">
                               <span className="text-slate-400">Latency:</span>
                               <span className="text-white">{formatLatency(metrics?.latency || 0)}</span>
                             </div>
                             <div className="flex justify-between">
                               <span className="text-slate-400">Success Rate:</span>
                               <span className="text-white">{formatPercentage(metrics?.successRate || 0)}</span>
                             </div>
                             <div className="flex justify-between">
                               <span className="text-slate-400">Volume:</span>
                               <span className="text-white">{(metrics?.volume || 0).toFixed(2)}</span>
                             </div>
                           </div>
                         </div>
                       ))}
                     </div>
                   </div>

                   {/* Routing Metrics */}
                   <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                     <div className="bg-slate-800 rounded-lg p-3">
                       <div className="text-sm font-medium text-slate-400 mb-1">Total Orders</div>
                       <div className="text-2xl font-bold text-white">{orderRouter.routing?.totalOrders || 0}</div>
                     </div>
                     <div className="bg-slate-800 rounded-lg p-3">
                       <div className="text-sm font-medium text-slate-400 mb-1">Avg Latency</div>
                       <div className="text-2xl font-bold text-white">{formatLatency(orderRouter.routing?.avgLatency || 0)}</div>
                     </div>
                     <div className="bg-slate-800 rounded-lg p-3">
                       <div className="text-sm font-medium text-slate-400 mb-1">Success Rate</div>
                       <div className="text-2xl font-bold text-white">{formatPercentage(orderRouter.routing?.successRate || 0)}</div>
                     </div>
                   </div>

                   {/* Performance Metrics */}
                   <div>
                     <h4 className="text-sm font-medium text-slate-400 mb-3">Performance Metrics</h4>
                     <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                       <div className="bg-slate-800 rounded-lg p-3">
                         <div className="text-sm font-medium text-slate-400 mb-1">P95 Latency</div>
                         <div className="text-lg font-bold text-white">{formatLatency(orderRouter.performance?.p95Latency || 0)}</div>
                       </div>
                       <div className="bg-slate-800 rounded-lg p-3">
                         <div className="text-sm font-medium text-slate-400 mb-1">P99 Latency</div>
                         <div className="text-lg font-bold text-white">{formatLatency(orderRouter.performance?.p99Latency || 0)}</div>
                       </div>
                       <div className="bg-slate-800 rounded-lg p-3">
                         <div className="text-sm font-medium text-slate-400 mb-1">Error Rate</div>
                         <div className="text-lg font-bold text-white">{formatPercentage(orderRouter.performance?.errorRate || 0)}</div>
                       </div>
                     </div>
                   </div>
                 </div>
              ) : (
                <div className="text-slate-400 text-sm">No data available</div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="monitoring" className="space-y-6">
          <EnterpriseMonitoring />
        </TabsContent>

        <TabsContent value="controls" className="space-y-6">
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
        </TabsContent>
      </Tabs>
    </div>
  )
}
