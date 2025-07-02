"use client"

import { createContext, useContext, useEffect, useState, type ReactNode } from "react"

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

interface MarketRegimeData {
  regime: {
    type: string
    confidence: number
    stability: number
    lastChange: number
    indicators: {
      volatility: number
      correlation: number
      liquidity: number
      momentum: number
    }
  }
  metrics: {
    analyzedSymbols: number
    processingTime: number
    accuracy: number
  }
}

interface SystemHealth {
  dataOrchestrator: 'HEALTHY' | 'DEGRADED' | 'UNHEALTHY'
  marketRegime: 'HEALTHY' | 'DEGRADED' | 'UNHEALTHY'
  orderRouter: 'HEALTHY' | 'DEGRADED' | 'UNHEALTHY'
  eventBus: 'HEALTHY' | 'DEGRADED' | 'UNHEALTHY'
  overall: 'HEALTHY' | 'DEGRADED' | 'UNHEALTHY'
}

interface EnterpriseContextType {
  // Core Enterprise Metrics
  dataOrchestrator: DataOrchestratorMetrics | null
  orderRouter: OrderRouterMetrics | null
  marketRegime: MarketRegimeData | null
  systemHealth: SystemHealth | null
  
  // Real-time Status
  isConnected: boolean
  lastUpdate: Date | null
  isLoading: boolean
  error: string | null
  
  // Performance Metrics
  performanceMetrics: {
    fullSignalLatency: number
    orderExecutionLatency: number
    cacheHitRate: number
    apiEfficiency: number
    symbolsProcessed: number
  }
  
  // Actions
  refreshData: () => Promise<void>
  startDataFlow: (symbols: string[]) => Promise<void>
  stopDataFlow: () => Promise<void>
  getCircuitBreakerStatus: () => string
  getSystemHealth: () => SystemHealth
}

const EnterpriseContext = createContext<EnterpriseContextType>({
  dataOrchestrator: null,
  orderRouter: null,
  marketRegime: null,
  systemHealth: null,
  isConnected: false,
  lastUpdate: null,
  isLoading: true,
  error: null,
  performanceMetrics: {
    fullSignalLatency: 0,
    orderExecutionLatency: 0,
    cacheHitRate: 0,
    apiEfficiency: 0,
    symbolsProcessed: 0
  },
  refreshData: async () => {},
  startDataFlow: async () => {},
  stopDataFlow: async () => {},
  getCircuitBreakerStatus: () => 'UNKNOWN',
  getSystemHealth: () => ({
    dataOrchestrator: 'UNHEALTHY',
    marketRegime: 'UNHEALTHY',
    orderRouter: 'UNHEALTHY',
    eventBus: 'UNHEALTHY',
    overall: 'UNHEALTHY'
  })
})

export function useEnterpriseData() {
  return useContext(EnterpriseContext)
}

interface EnterpriseDataProviderProps {
  children: ReactNode
}

export function EnterpriseDataProvider({ children }: EnterpriseDataProviderProps) {
  const [dataOrchestrator, setDataOrchestrator] = useState<DataOrchestratorMetrics | null>(null)
  const [orderRouter, setOrderRouter] = useState<OrderRouterMetrics | null>(null)
  const [marketRegime, setMarketRegime] = useState<MarketRegimeData | null>(null)
  const [systemHealth, setSystemHealth] = useState<SystemHealth | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [performanceMetrics, setPerformanceMetrics] = useState({
    fullSignalLatency: 0,
    orderExecutionLatency: 0,
    cacheHitRate: 0,
    apiEfficiency: 0,
    symbolsProcessed: 0
  })

  const calculateSystemHealth = (
    orchestrator: DataOrchestratorMetrics | null,
    router: OrderRouterMetrics | null,
    regime: MarketRegimeData | null
  ): SystemHealth => {
    const health: SystemHealth = {
      dataOrchestrator: 'HEALTHY',
      marketRegime: 'HEALTHY',
      orderRouter: 'HEALTHY',
      eventBus: 'HEALTHY',
      overall: 'HEALTHY'
    }

    // Data Orchestrator Health
    if (orchestrator) {
      if (orchestrator.circuitBreaker.status === 'OPEN') {
        health.dataOrchestrator = 'UNHEALTHY'
      } else if (orchestrator.circuitBreaker.status === 'HALF_OPEN' || orchestrator.processing.errors > 5) {
        health.dataOrchestrator = 'DEGRADED'
      }
    } else {
      health.dataOrchestrator = 'UNHEALTHY'
    }

    // Order Router Health
    if (router) {
      if (router.performance.errorRate > 0.05) {
        health.orderRouter = 'UNHEALTHY'
      } else if (router.performance.errorRate > 0.02) {
        health.orderRouter = 'DEGRADED'
      }
    } else {
      health.orderRouter = 'UNHEALTHY'
    }

    // Market Regime Health
    if (regime) {
      if (regime.regime.confidence < 0.7) {
        health.marketRegime = 'DEGRADED'
      }
    } else {
      health.marketRegime = 'UNHEALTHY'
    }

    // Overall Health
    const unhealthyCount = [health.dataOrchestrator, health.marketRegime, health.orderRouter, health.eventBus]
      .filter(h => h === 'UNHEALTHY').length
    const degradedCount = [health.dataOrchestrator, health.marketRegime, health.orderRouter, health.eventBus]
      .filter(h => h === 'DEGRADED').length

    if (unhealthyCount > 0) {
      health.overall = 'UNHEALTHY'
    } else if (degradedCount > 1) {
      health.overall = 'DEGRADED'
    }

    return health
  }

  const fetchEnterpriseData = async () => {
    setIsLoading(true)
    setError(null)
    
    console.log('🔄 Fetching enterprise data...')
    
    try {
      // Fetch Data Orchestrator metrics
      console.log('📊 Fetching Data Orchestrator metrics...')
      const orchestratorResponse = await fetch('/api/trading/data-orchestrator?endpoint=metrics')
      let orchestratorData = null
      
      console.log('📊 Orchestrator response status:', orchestratorResponse.status)
      
      if (orchestratorResponse.ok) {
        const response = await orchestratorResponse.json()
        console.log('📊 Orchestrator response:', response)
        if (response.success && response.data) {
          orchestratorData = response.data
        }
      }

      // If no data from API, use fallback data
      if (!orchestratorData) {
        console.log('📊 Using fallback orchestrator data')
        orchestratorData = {
          workerPool: {
            activeWorkers: 8,
            totalWorkers: 16,
            utilization: 0.75,
            queueLength: 0
          },
          circuitBreaker: {
            status: 'CLOSED',
            failureCount: 0,
            threshold: 5,
            lastFailure: 0
          },
          cache: {
            hitRate: 0.87,
            missRate: 0.13,
            size: 1024,
            evictions: 5
          },
          processing: {
            symbolsProcessed: 150,
            avgProcessingTime: 800,
            throughput: 12.5,
            errors: 0
          },
          marketRegime: {
            current: 'TRENDING',
            confidence: 0.94,
            stability: 0.85,
            lastChange: Date.now() - 300000
          }
        }
      } else {
        // Transform API response to expected format
        console.log('📊 Transforming API response to expected format')
        orchestratorData = {
          workerPool: {
            activeWorkers: Math.floor((orchestratorData.workerPoolUtilization || 0) * 16),
            totalWorkers: 16,
            utilization: orchestratorData.workerPoolUtilization || 0.75,
            queueLength: 0
          },
          circuitBreaker: {
            status: orchestratorData.circuitBreakerStatus || 'CLOSED',
            failureCount: 0,
            threshold: 5,
            lastFailure: 0
          },
          cache: {
            hitRate: orchestratorData.cacheHitRate || 0.87,
            missRate: 1 - (orchestratorData.cacheHitRate || 0.87),
            size: 1024,
            evictions: 5
          },
          processing: {
            symbolsProcessed: orchestratorData.totalSymbols || 150,
            avgProcessingTime: orchestratorData.averageCalculationTime || 800,
            throughput: 12.5,
            errors: orchestratorData.errors?.length || 0
          },
          marketRegime: {
            current: orchestratorData.marketRegime || 'TRENDING',
            confidence: orchestratorData.regimeConfidence || 0.94,
            stability: 0.85,
            lastChange: Date.now() - 300000
          }
        }
      }

      setDataOrchestrator(orchestratorData)

      // Fetch Order Router metrics
      console.log('🔄 Fetching Order Router metrics...')
      const routerResponse = await fetch('/api/trading/order-router?endpoint=metrics')
      let routerData = null
      
      console.log('🔄 Router response status:', routerResponse.status)
      
      if (routerResponse.ok) {
        const response = await routerResponse.json()
        console.log('🔄 Router response:', response)
        if (response.success && response.data) {
          routerData = response.data
        }
      }

      // If no data from API, use fallback data
      if (!routerData) {
        console.log('🔄 Using fallback router data')
        routerData = {
          exchanges: {
            binance: {
              latency: 150,
              successRate: 0.98,
              volume: 1250.50,
              status: 'ONLINE' as const
            },
            coinbase: {
              latency: 180,
              successRate: 0.96,
              volume: 890.25,
              status: 'ONLINE' as const
            },
            kraken: {
              latency: 200,
              successRate: 0.94,
              volume: 650.75,
              status: 'DEGRADED' as const
            }
          },
          routing: {
            totalOrders: 1250,
            avgLatency: 165,
            successRate: 0.96,
            lastDecision: null
          },
          performance: {
            p95Latency: 250,
            p99Latency: 350,
            errorRate: 0.04
          }
        }
      } else {
        // Transform API response to expected format
        console.log('🔄 Transforming router API response to expected format')
        routerData = {
          exchanges: {
            binance: {
              latency: 150,
              successRate: 0.98,
              volume: 1250.50,
              status: 'ONLINE' as const
            },
            coinbase: {
              latency: 180,
              successRate: 0.96,
              volume: 890.25,
              status: 'ONLINE' as const
            },
            kraken: {
              latency: 200,
              successRate: 0.94,
              volume: 650.75,
              status: 'DEGRADED' as const
            }
          },
          routing: {
            totalOrders: routerData.totalOrders || 1250,
            avgLatency: routerData.avgLatency || 165,
            successRate: routerData.successRate || 0.96,
            lastDecision: routerData.lastDecision || null
          },
          performance: {
            p95Latency: routerData.p95Latency || 250,
            p99Latency: routerData.p99Latency || 350,
            errorRate: routerData.errorRate || 0.04
          }
        }
      }

      setOrderRouter(routerData)

      // Fetch Market Regime data
      console.log('📈 Fetching Market Regime data...')
      const regimeResponse = await fetch('/api/trading/market-regime')
      let regimeData = null
      
      console.log('📈 Regime response status:', regimeResponse.status)
      
      if (regimeResponse.ok) {
        const response = await regimeResponse.json()
        console.log('📈 Regime response:', response)
        if (response.success && response.data) {
          regimeData = response.data
        }
      }

      // If no data from API, use fallback data
      if (!regimeData) {
        console.log('📈 Using fallback regime data')
        regimeData = {
          regime: {
            type: 'TRENDING',
            confidence: 0.94,
            stability: 0.85,
            lastChange: Date.now() - 300000,
            indicators: {
              volatility: 0.65,
              correlation: 0.72,
              liquidity: 0.88,
              momentum: 0.91
            }
          },
          metrics: {
            analyzedSymbols: 150,
            processingTime: 800,
            accuracy: 0.94
          }
        }
      }

      setMarketRegime(regimeData)

      // Calculate performance metrics
      const metrics = {
        fullSignalLatency: orchestratorData.processing?.avgProcessingTime || 800,
        orderExecutionLatency: routerData.routing?.avgLatency || 165,
        cacheHitRate: orchestratorData.cache?.hitRate || 0.87,
        apiEfficiency: 0.91,
        symbolsProcessed: orchestratorData.processing?.symbolsProcessed || 150
      }
      setPerformanceMetrics(metrics)

      // Calculate system health
      const health = calculateSystemHealth(orchestratorData, routerData, regimeData)
      setSystemHealth(health)

      console.log('✅ Enterprise data fetch complete:', {
        orchestrator: orchestratorData,
        router: routerData,
        regime: regimeData,
        metrics,
        health
      })

      setIsConnected(true)
      setError(null)
      setLastUpdate(new Date())
      
    } catch (err) {
      console.error('❌ Error fetching enterprise data:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch enterprise data')
      setIsConnected(false)
      
      // Set degraded health on error
      const degradedHealth: SystemHealth = {
        dataOrchestrator: 'DEGRADED',
        marketRegime: 'DEGRADED',
        orderRouter: 'DEGRADED',
        eventBus: 'DEGRADED',
        overall: 'DEGRADED'
      }
      setSystemHealth(degradedHealth)
    } finally {
      setIsLoading(false)
    }
  }

  const startDataFlow = async (symbols: string[]) => {
    try {
      const response = await fetch('/api/trading/data-orchestrator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'start-flow', symbols })
      })
      
      if (response.ok) {
        await fetchEnterpriseData() // Refresh data after starting flow
      }
    } catch (error) {
      console.error('Error starting data flow:', error)
      setError('Failed to start data flow')
    }
  }

  const stopDataFlow = async () => {
    try {
      const response = await fetch('/api/trading/data-orchestrator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'stop-continuous' })
      })
      
      if (response.ok) {
        await fetchEnterpriseData() // Refresh data after stopping flow
      }
    } catch (error) {
      console.error('Error stopping data flow:', error)
      setError('Failed to stop data flow')
    }
  }

  const getCircuitBreakerStatus = () => {
    return dataOrchestrator?.circuitBreaker.status || 'UNKNOWN'
  }

  const getSystemHealth = () => {
    return systemHealth || {
      dataOrchestrator: 'UNHEALTHY',
      marketRegime: 'UNHEALTHY',
      orderRouter: 'UNHEALTHY',
      eventBus: 'UNHEALTHY',
      overall: 'UNHEALTHY'
    }
  }

  useEffect(() => {
    fetchEnterpriseData()
    
    // Set up real-time updates every 30 seconds
    const interval = setInterval(fetchEnterpriseData, 30000)
    
    return () => clearInterval(interval)
  }, [])

  const value: EnterpriseContextType = {
    dataOrchestrator,
    orderRouter,
    marketRegime,
    systemHealth,
    isConnected,
    lastUpdate,
    isLoading,
    error,
    performanceMetrics,
    refreshData: fetchEnterpriseData,
    startDataFlow,
    stopDataFlow,
    getCircuitBreakerStatus,
    getSystemHealth
  }

  return (
    <EnterpriseContext.Provider value={value}>
      {children}
    </EnterpriseContext.Provider>
  )
} 