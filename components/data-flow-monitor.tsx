"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { 
  Activity, 
  Clock, 
  Database, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle,
  RefreshCw
} from "lucide-react"

interface DataFlowMetrics {
  totalSymbols: number
  symbolsWithIndicators: number
  averageCalculationTime: number
  lastUpdateTime: number
  errors: string[]
}

export function DataFlowMonitor() {
  const [metrics, setMetrics] = useState<DataFlowMetrics | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date())

  const fetchMetrics = async () => {
    try {
      setIsLoading(true)
      const response = await fetch("/api/trading/enhanced-market-data")
      if (response.ok) {
        const result = await response.json()
        if (result.success && result.metrics) {
          setMetrics(result.metrics)
          setLastRefresh(new Date())
        }
      }
    } catch (error) {
      console.error("Error fetching data flow metrics:", error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchMetrics()
    const interval = setInterval(fetchMetrics, 30000) // Update every 30 seconds
    return () => clearInterval(interval)
  }, [])

  if (!metrics) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Data Flow Monitor
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground py-4">
            Loading data flow metrics...
          </div>
        </CardContent>
      </Card>
    )
  }

  const successRate = metrics.totalSymbols > 0 
    ? (metrics.symbolsWithIndicators / metrics.totalSymbols) * 100 
    : 0

  const timeSinceUpdate = Date.now() - metrics.lastUpdateTime
  const isStale = timeSinceUpdate > 5 * 60 * 1000 // 5 minutes

  const getStatusColor = () => {
    if (metrics.errors.length > 0) return "destructive"
    if (isStale) return "destructive"
    if (successRate < 80) return "secondary"
    return "default"
  }

  const getStatusIcon = () => {
    if (metrics.errors.length > 0) return <AlertTriangle className="h-4 w-4" />
    if (isStale) return <AlertTriangle className="h-4 w-4" />
    if (successRate < 80) return <AlertTriangle className="h-4 w-4" />
    return <CheckCircle className="h-4 w-4" />
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Data Flow Monitor
          </div>
          <button
            onClick={fetchMetrics}
            disabled={isLoading}
            className="p-1 hover:bg-muted rounded transition-colors"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Real-time technical analysis pipeline status
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status Overview */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {getStatusIcon()}
            <span className="font-medium">System Status</span>
          </div>
          <Badge variant={getStatusColor()}>
            {metrics.errors.length > 0 ? "Error" : isStale ? "Stale" : successRate < 80 ? "Warning" : "Healthy"}
          </Badge>
        </div>

        {/* Success Rate */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span>Processing Success Rate</span>
            <span className="font-medium">{successRate.toFixed(1)}%</span>
          </div>
          <Progress value={successRate} className="h-2" />
          <div className="text-xs text-muted-foreground">
            {metrics.symbolsWithIndicators} of {metrics.totalSymbols} symbols processed
          </div>
        </div>

        {/* Performance Metrics */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4" />
              <span>Avg Calculation Time</span>
            </div>
            <div className="text-lg font-semibold">
              {metrics.averageCalculationTime.toFixed(0)}ms
            </div>
          </div>
          
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm">
              <Activity className="h-4 w-4" />
              <span>Last Update</span>
            </div>
            <div className="text-lg font-semibold">
              {Math.round(timeSinceUpdate / 1000)}s ago
            </div>
          </div>
        </div>

        {/* Error Display */}
        {metrics.errors.length > 0 && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-1">
                <div className="font-medium">Recent Errors ({metrics.errors.length})</div>
                <div className="text-xs space-y-1">
                  {metrics.errors.slice(-3).map((error, index) => (
                    <div key={index} className="truncate">
                      {error}
                    </div>
                  ))}
                  {metrics.errors.length > 3 && (
                    <div className="text-muted-foreground">
                      ... and {metrics.errors.length - 3} more
                    </div>
                  )}
                </div>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Last Refresh */}
        <div className="text-xs text-muted-foreground text-center">
          Last refreshed: {lastRefresh.toLocaleTimeString()}
        </div>
      </CardContent>
    </Card>
  )
} 