'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Activity, 
  TrendingUp, 
  TrendingDown, 
  Clock, 
  Zap, 
  Shield, 
  Database,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  XCircle
} from 'lucide-react'

interface SystemMetrics {
  dataOrchestrator: {
    totalSymbols: number
    symbolsWithIndicators: number
    averageCalculationTime: number
    cacheHitRate: number
    apiEfficiency: number
    circuitBreakerStatus: 'CLOSED' | 'OPEN' | 'HALF_OPEN'
    errors: string[]
  }
  marketRegime: {
    regime: string
    confidence: number
    regimeStability: number
    analyzedSymbols: number
    processingTime: number
    errors: string[]
  }
  orderRouter: {
    totalOrders: number
    successfulOrders: number
    averageLatency: number
    averageSlippage: number
    averageFillQuality: number
    routingAccuracy: number
    errors: string[]
  }
  overall: {
    systemHealth: 'HEALTHY' | 'WARNING' | 'ERROR'
    uptime: number
    responseTime: number
    errorRate: number
    lastUpdate: number
  }
}

export default function EnterpriseMonitoring() {
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date())

  const fetchMetrics = async () => {
    try {
      setLoading(true)
      setError(null)

      // Fetch metrics from all microservices
      const [orchestratorRes, regimeRes, routerRes] = await Promise.all([
        fetch('/api/trading/data-orchestrator?endpoint=metrics'),
        fetch('/api/trading/market-regime?endpoint=metrics'),
        fetch('/api/trading/order-router?endpoint=metrics')
      ])

      const [orchestratorData, regimeData, routerData] = await Promise.all([
        orchestratorRes.json(),
        regimeRes.json(),
        routerRes.json()
      ])

      if (!orchestratorData.success || !regimeData.success || !routerData.success) {
        throw new Error('Failed to fetch metrics from one or more services')
      }

      // Calculate overall system health
      const overall = calculateOverallHealth(orchestratorData.data, regimeData.data, routerData.data)

      setMetrics({
        dataOrchestrator: orchestratorData.data,
        marketRegime: regimeData.data,
        orderRouter: routerData.data,
        overall
      })

      setLastRefresh(new Date())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch metrics')
    } finally {
      setLoading(false)
    }
  }

  const calculateOverallHealth = (orchestrator: any, regime: any, router: any): any => {
    const errorCount = (orchestrator.errors?.length || 0) + 
                      (regime.errors?.length || 0) + 
                      (router.errors?.length || 0)
    
    let systemHealth: 'HEALTHY' | 'WARNING' | 'ERROR' = 'HEALTHY'
    
    if (errorCount > 5) {
      systemHealth = 'ERROR'
    } else if (errorCount > 2) {
      systemHealth = 'WARNING'
    }

    return {
      systemHealth,
      uptime: 99.9, // Placeholder
      responseTime: Math.max(orchestrator.averageCalculationTime || 0, router.averageLatency || 0),
      errorRate: errorCount / 3, // Average error rate
      lastUpdate: Date.now()
    }
  }

  useEffect(() => {
    fetchMetrics()
    const interval = setInterval(fetchMetrics, 30000) // Refresh every 30 seconds
    return () => clearInterval(interval)
  }, [])

  const getHealthIcon = (status: string) => {
    switch (status) {
      case 'HEALTHY':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'WARNING':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />
      case 'ERROR':
        return <XCircle className="h-4 w-4 text-red-500" />
      default:
        return <Activity className="h-4 w-4 text-gray-500" />
    }
  }

  const getHealthColor = (status: string) => {
    switch (status) {
      case 'HEALTHY':
        return 'text-green-600'
      case 'WARNING':
        return 'text-yellow-600'
      case 'ERROR':
        return 'text-red-600'
      default:
        return 'text-gray-600'
    }
  }

  if (loading && !metrics) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading enterprise metrics...</span>
      </div>
    )
  }

  if (error) {
    return (
      <Alert className="mb-4">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          {error}
          <Button variant="outline" size="sm" className="ml-2" onClick={fetchMetrics}>
            Retry
          </Button>
        </AlertDescription>
      </Alert>
    )
  }

  if (!metrics) return null

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Enterprise System Monitoring</h2>
          <p className="text-muted-foreground">
            Real-time metrics for the event-driven trading infrastructure
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant={metrics.overall.systemHealth === 'HEALTHY' ? 'default' : 'destructive'}>
            {getHealthIcon(metrics.overall.systemHealth)}
            <span className="ml-1">{metrics.overall.systemHealth}</span>
          </Badge>
          <Button variant="outline" size="sm" onClick={fetchMetrics}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      <div className="text-sm text-muted-foreground">
        Last updated: {lastRefresh.toLocaleTimeString()}
      </div>

      {/* System Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Activity className="h-5 w-5 mr-2" />
            System Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold">{metrics.overall.uptime}%</div>
              <div className="text-sm text-muted-foreground">Uptime</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{metrics.overall.responseTime.toFixed(0)}ms</div>
              <div className="text-sm text-muted-foreground">Avg Response Time</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{(metrics.overall.errorRate * 100).toFixed(1)}%</div>
              <div className="text-sm text-muted-foreground">Error Rate</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{metrics.dataOrchestrator.cacheHitRate * 100}%</div>
              <div className="text-sm text-muted-foreground">Cache Hit Rate</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Detailed Metrics */}
      <Tabs defaultValue="orchestrator" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="orchestrator">Data Orchestrator</TabsTrigger>
          <TabsTrigger value="regime">Market Regime</TabsTrigger>
          <TabsTrigger value="router">Order Router</TabsTrigger>
        </TabsList>

        <TabsContent value="orchestrator" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Data Processing</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Symbols Processed</span>
                    <span>{metrics.dataOrchestrator.symbolsWithIndicators}/{metrics.dataOrchestrator.totalSymbols}</span>
                  </div>
                  <Progress value={(metrics.dataOrchestrator.symbolsWithIndicators / metrics.dataOrchestrator.totalSymbols) * 100} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Avg Calc Time</span>
                    <span>{metrics.dataOrchestrator.averageCalculationTime.toFixed(0)}ms</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>API Efficiency</span>
                    <span>{(metrics.dataOrchestrator.apiEfficiency * 100).toFixed(1)}%</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Circuit Breaker</CardTitle>
              </CardHeader>
              <CardContent>
                <Badge variant={
                  metrics.dataOrchestrator.circuitBreakerStatus === 'CLOSED' ? 'default' :
                  metrics.dataOrchestrator.circuitBreakerStatus === 'HALF_OPEN' ? 'secondary' : 'destructive'
                }>
                  {metrics.dataOrchestrator.circuitBreakerStatus}
                </Badge>
              </CardContent>
            </Card>
          </div>

          {metrics.dataOrchestrator.errors.length > 0 && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Errors:</strong> {metrics.dataOrchestrator.errors.join(', ')}
              </AlertDescription>
            </Alert>
          )}
        </TabsContent>

        <TabsContent value="regime" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Current Regime</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Regime</span>
                    <Badge>{metrics.marketRegime.regime}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Confidence</span>
                    <span className="text-sm">{(metrics.marketRegime.confidence * 100).toFixed(1)}%</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Stability</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Regime Stability</span>
                    <span>{(metrics.marketRegime.regimeStability * 100).toFixed(1)}%</span>
                  </div>
                  <Progress value={metrics.marketRegime.regimeStability * 100} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Processing</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Symbols Analyzed</span>
                    <span>{metrics.marketRegime.analyzedSymbols}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Processing Time</span>
                    <span>{metrics.marketRegime.processingTime}ms</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {metrics.marketRegime.errors.length > 0 && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Errors:</strong> {metrics.marketRegime.errors.join(', ')}
              </AlertDescription>
            </Alert>
          )}
        </TabsContent>

        <TabsContent value="router" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Order Execution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Success Rate</span>
                    <span>{((metrics.orderRouter.successfulOrders / metrics.orderRouter.totalOrders) * 100).toFixed(1)}%</span>
                  </div>
                  <Progress value={(metrics.orderRouter.successfulOrders / metrics.orderRouter.totalOrders) * 100} />
                  <div className="text-xs text-muted-foreground">
                    {metrics.orderRouter.successfulOrders}/{metrics.orderRouter.totalOrders} orders
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Avg Latency</span>
                    <span>{metrics.orderRouter.averageLatency.toFixed(0)}ms</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Avg Slippage</span>
                    <span>{(metrics.orderRouter.averageSlippage * 100).toFixed(3)}%</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Fill Quality</span>
                    <span>{(metrics.orderRouter.averageFillQuality * 100).toFixed(1)}%</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Routing</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Routing Accuracy</span>
                    <span>{(metrics.orderRouter.routingAccuracy * 100).toFixed(1)}%</span>
                  </div>
                  <Progress value={metrics.orderRouter.routingAccuracy * 100} />
                </div>
              </CardContent>
            </Card>
          </div>

          {metrics.orderRouter.errors.length > 0 && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Errors:</strong> {metrics.orderRouter.errors.join(', ')}
              </AlertDescription>
            </Alert>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
} 