'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { 
  Activity, 
  Database, 
  Clock, 
  Shield, 
  TrendingUp, 
  AlertTriangle,
  CheckCircle,
  XCircle,
  RefreshCw,
  Zap,
  HardDrive,
  Gauge
} from 'lucide-react'

interface CacheStats {
  l1Size: number
  l2Size: number
  l1HitRate: number
  l2HitRate: number
}

interface RateLimitStats {
  activeIdentifiers: number
  queueLength: number
  isProcessingBurst: boolean
}

interface RetentionStatus {
  isRunning: boolean
  lastCleanup: Date | null
  nextCleanup: Date | null
}

interface ProcessingMetrics {
  totalSymbols: number
  symbolsWithIndicators: number
  averageCalculationTime: number
  lastUpdateTime: number
  errors: string[]
  cache: CacheStats
  rateLimiting: RateLimitStats
  retention: RetentionStatus
}

export default function EnhancedProcessingMonitor() {
  const [metrics, setMetrics] = useState<ProcessingMetrics | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())
  const [autoRefresh, setAutoRefresh] = useState(true)

  const fetchMetrics = async () => {
    try {
      const response = await fetch('/api/trading/enhanced-market-data?limit=10')
      const data = await response.json()
      
      if (data.success && data.metrics) {
        setMetrics(data.metrics)
        setLastUpdate(new Date())
      }
    } catch (error) {
      console.error('Failed to fetch metrics:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchMetrics()
    
    if (autoRefresh) {
      const interval = setInterval(fetchMetrics, 30000) // Update every 30 seconds
      return () => clearInterval(interval)
    }
  }, [autoRefresh])

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'healthy':
      case 'active':
        return 'bg-green-500'
      case 'warning':
        return 'bg-yellow-500'
      case 'error':
      case 'inactive':
        return 'bg-red-500'
      default:
        return 'bg-gray-500'
    }
  }

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString()
  }

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`
    return `${(ms / 1000).toFixed(2)}s`
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading enhanced processing metrics...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Activity className="h-6 w-6" />
            Enhanced Processing Monitor
          </h2>
          <p className="text-muted-foreground">
            Real-time monitoring of cache, rate limiting, retention, and processing performance
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchMetrics}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            <span className="ml-2">Refresh</span>
          </Button>
          <Button
            variant={autoRefresh ? "default" : "outline"}
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            <Clock className="h-4 w-4" />
            <span className="ml-2">Auto</span>
          </Button>
        </div>
      </div>

      {!metrics && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Unable to fetch processing metrics. Please check the system status.
          </AlertDescription>
        </Alert>
      )}

      {metrics && (
        <>
          {/* System Status Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Cache Status</CardTitle>
                <Database className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-2">
                  <div className={`w-2 h-2 rounded-full ${getStatusColor('healthy')}`} />
                  <span className="text-sm">Healthy</span>
                </div>
                <div className="text-2xl font-bold">{metrics.cache.l1Size + metrics.cache.l2Size}</div>
                <p className="text-xs text-muted-foreground">
                  Total cached entries
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Rate Limiting</CardTitle>
                <Shield className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-2">
                  <div className={`w-2 h-2 rounded-full ${getStatusColor(metrics.rateLimiting.isProcessingBurst ? 'warning' : 'healthy')}`} />
                  <span className="text-sm">
                    {metrics.rateLimiting.isProcessingBurst ? 'Burst Mode' : 'Normal'}
                  </span>
                </div>
                <div className="text-2xl font-bold">{metrics.rateLimiting.activeIdentifiers}</div>
                <p className="text-xs text-muted-foreground">
                  Active clients
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Processing</CardTitle>
                <Zap className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-2">
                  <div className={`w-2 h-2 rounded-full ${getStatusColor(metrics.errors.length > 0 ? 'warning' : 'healthy')}`} />
                  <span className="text-sm">
                    {metrics.errors.length > 0 ? 'Warnings' : 'Healthy'}
                  </span>
                </div>
                <div className="text-2xl font-bold">{metrics.symbolsWithIndicators}</div>
                <p className="text-xs text-muted-foreground">
                  Symbols processed
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Retention</CardTitle>
                <HardDrive className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-2">
                  <div className={`w-2 h-2 rounded-full ${getStatusColor(metrics.retention.isRunning ? 'warning' : 'healthy')}`} />
                  <span className="text-sm">
                    {metrics.retention.isRunning ? 'Cleaning' : 'Idle'}
                  </span>
                </div>
                <div className="text-2xl font-bold">
                  {metrics.retention.lastCleanup ? '✓' : '—'}
                </div>
                <p className="text-xs text-muted-foreground">
                  Last cleanup
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Detailed Metrics */}
          <Tabs defaultValue="cache" className="space-y-4">
            <TabsList>
              <TabsTrigger value="cache">Cache Performance</TabsTrigger>
              <TabsTrigger value="rate-limiting">Rate Limiting</TabsTrigger>
              <TabsTrigger value="processing">Processing Engine</TabsTrigger>
              <TabsTrigger value="retention">Data Retention</TabsTrigger>
            </TabsList>

            <TabsContent value="cache" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Cache Hit Rates</CardTitle>
                    <CardDescription>Performance of L1 and L2 cache layers</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span>L1 Cache (Redis)</span>
                        <span>{(metrics.cache.l1HitRate * 100).toFixed(1)}%</span>
                      </div>
                      <Progress value={metrics.cache.l1HitRate * 100} className="h-2" />
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span>L2 Cache (TimescaleDB)</span>
                        <span>{(metrics.cache.l2HitRate * 100).toFixed(1)}%</span>
                      </div>
                      <Progress value={metrics.cache.l2HitRate * 100} className="h-2" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Cache Sizes</CardTitle>
                    <CardDescription>Current cache utilization</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">L1 Cache Entries</span>
                      <Badge variant="secondary">{metrics.cache.l1Size}</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">L2 Cache Entries</span>
                      <Badge variant="secondary">{metrics.cache.l2Size}</Badge>
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between font-medium">
                      <span>Total Entries</span>
                      <Badge>{metrics.cache.l1Size + metrics.cache.l2Size}</Badge>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="rate-limiting" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Rate Limiting Status</CardTitle>
                    <CardDescription>Current rate limiting activity</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Active Clients</span>
                      <Badge variant="outline">{metrics.rateLimiting.activeIdentifiers}</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Queue Length</span>
                      <Badge variant={metrics.rateLimiting.queueLength > 0 ? "destructive" : "secondary"}>
                        {metrics.rateLimiting.queueLength}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Burst Processing</span>
                      <Badge variant={metrics.rateLimiting.isProcessingBurst ? "default" : "secondary"}>
                        {metrics.rateLimiting.isProcessingBurst ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Rate Limit Configuration</CardTitle>
                    <CardDescription>Current rate limiting settings</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Per Minute</span>
                      <span>100 requests</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Per Hour</span>
                      <span>1,000 requests</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Per Day</span>
                      <span>10,000 requests</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between text-sm">
                      <span>Burst Limit</span>
                      <span>10 concurrent</span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="processing" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Processing Performance</CardTitle>
                    <CardDescription>Real-time processing metrics</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Total Symbols</span>
                      <Badge variant="outline">{metrics.totalSymbols}</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">With Indicators</span>
                      <Badge variant="secondary">{metrics.symbolsWithIndicators}</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Success Rate</span>
                      <Badge variant="default">
                        {metrics.totalSymbols > 0 
                          ? `${((metrics.symbolsWithIndicators / metrics.totalSymbols) * 100).toFixed(1)}%`
                          : '0%'
                        }
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Avg Calculation Time</span>
                      <span className="text-sm font-mono">
                        {formatDuration(metrics.averageCalculationTime)}
                      </span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">System Health</CardTitle>
                    <CardDescription>Processing engine status</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Last Update</span>
                      <span className="text-sm font-mono">
                        {formatTime(metrics.lastUpdateTime)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Error Count</span>
                      <Badge variant={metrics.errors.length > 0 ? "destructive" : "secondary"}>
                        {metrics.errors.length}
                      </Badge>
                    </div>
                    {metrics.errors.length > 0 && (
                      <div className="space-y-2">
                        <span className="text-sm font-medium">Recent Errors:</span>
                        <div className="max-h-32 overflow-y-auto space-y-1">
                          {metrics.errors.slice(0, 3).map((error, index) => (
                            <div key={index} className="text-xs text-red-600 bg-red-50 p-2 rounded">
                              {error}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="retention" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Retention Status</CardTitle>
                    <CardDescription>Data retention management</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Cleanup Status</span>
                      <Badge variant={metrics.retention.isRunning ? "default" : "secondary"}>
                        {metrics.retention.isRunning ? "Running" : "Idle"}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Last Cleanup</span>
                      <span className="text-sm">
                        {metrics.retention.lastCleanup 
                          ? formatTime(metrics.retention.lastCleanup.getTime())
                          : 'Never'
                        }
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Next Cleanup</span>
                      <span className="text-sm">
                        {metrics.retention.nextCleanup 
                          ? formatTime(metrics.retention.nextCleanup.getTime())
                          : 'Scheduled'
                        }
                      </span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Retention Policies</CardTitle>
                    <CardDescription>Data retention configuration</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Market Data</span>
                      <span>30 days</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Indicators</span>
                      <span>90 days</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Signals</span>
                      <span>180 days</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Logs</span>
                      <span>365 days</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between text-sm">
                      <span>Cleanup Interval</span>
                      <span>24 hours</span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>

          {/* Last Update */}
          <div className="text-center text-sm text-muted-foreground">
            Last updated: {lastUpdate.toLocaleString()}
          </div>
        </>
      )}
    </div>
  )
} 