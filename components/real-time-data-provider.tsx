"use client"

import { createContext, useContext, useEffect, useState, type ReactNode } from "react"

interface MarketData {
  symbol: string
  price: number
  change24h: number
  volume: number
  indicators: {
    rsi: number
    macd: number
    signal: number
    histogram: number
    bollinger: {
      upper: number
      middle: number
      lower: number
      position: 'UPPER' | 'MIDDLE' | 'LOWER'
    }
    volume: {
      average: number
      current: number
      ratio: number
    }
  }
  timestamp: number
}

interface TradingStatus {
  isActive: boolean
  activePositions: number
  totalBalance: number
  availableBalance: number
  unrealizedPnl: number
}

interface RealTimeContextType {
  marketData: MarketData[]
  tradingStatus: TradingStatus | null
  isConnected: boolean
  lastUpdate: Date | null
  isLoading: boolean
  error: string | null
  availablePairs: string[]
  refreshData: () => Promise<void>
}

const RealTimeContext = createContext<RealTimeContextType>({
  marketData: [],
  tradingStatus: null,
  isConnected: false,
  lastUpdate: null,
  isLoading: true,
  error: null,
  availablePairs: [],
  refreshData: async () => {},
})

export function useRealTimeData() {
  return useContext(RealTimeContext)
}

interface RealTimeDataProviderProps {
  children: ReactNode
}

export function RealTimeDataProvider({ children }: RealTimeDataProviderProps) {
  const [marketData, setMarketData] = useState<MarketData[]>([])
  const [tradingStatus, setTradingStatus] = useState<TradingStatus | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [availablePairs, setAvailablePairs] = useState<string[]>([])

  const refreshData = async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      // Fetch trading status
      const statusResponse = await fetch("/api/trading/status")
      if (statusResponse.ok) {
        const statusData = await statusResponse.json()
        if (statusData.success) {
          setTradingStatus({
            isActive: statusData.data.bot?.isActive ?? false,
            activePositions: statusData.data.positions?.length ?? 0,
            totalBalance: statusData.data.account?.totalBalance ?? 0,
            availableBalance: statusData.data.account?.availableBalance ?? 0,
            unrealizedPnl: statusData.data.account?.unrealizedPnl ?? 0,
          })
          setError(null)
          setIsConnected(true)
          setLastUpdate(new Date())
        } else {
          throw new Error(statusData.message || "Failed to fetch trading status")
        }
      } else {
        throw new Error(`HTTP error! status: ${statusResponse.status}`)
      }

      // Fetch enhanced market data if we have pairs
      if (availablePairs.length > 0) {
        const marketResponse = await fetch("/api/trading/enhanced-market-data")
        if (marketResponse.ok) {
          const result = await marketResponse.json()
          if (result.success) {
            const transformedData: MarketData[] = result.data.map((item: any) => ({
              symbol: item.symbol,
              price: item.price,
              change24h: item.change24h,
              volume: item.volume,
              indicators: {
                rsi: item.indicators.rsi,
                macd: item.indicators.macd,
                signal: item.indicators.signal,
                histogram: item.indicators.histogram,
                bollinger: item.indicators.bollinger,
                volume: item.indicators.volume,
              },
              timestamp: item.timestamp
            }))
            setMarketData(transformedData)
          } else {
            throw new Error(result.message || "Failed to fetch enhanced market data")
          }
        } else {
          throw new Error(`HTTP error! status: ${marketResponse.status}`)
        }
      }
    } catch (err) {
      console.error("Error refreshing data:", err)
      setError(err instanceof Error ? err.message : "Failed to refresh data")
      setIsConnected(false)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    let isMounted = true

    const fetchTradingStatus = async () => {
      try {
        const response = await fetch("/api/trading/status")
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }
        
        const data = await response.json()
        
        if (!isMounted) return

        if (!data.success) {
          throw new Error(data.message || "Failed to fetch trading status")
        }

        // Map API response to expected format
        setTradingStatus({
          isActive: data.data.bot?.isActive ?? false,
          activePositions: data.data.positions?.length ?? 0,
          totalBalance: data.data.account?.totalBalance ?? 0,
          availableBalance: data.data.account?.availableBalance ?? 0,
          unrealizedPnl: data.data.account?.unrealizedPnl ?? 0,
        })
        
        setError(null)
        setIsConnected(true)
        setLastUpdate(new Date())
      } catch (err) {
        if (!isMounted) return
        
        console.error("Error fetching trading status:", err)
        setError(err instanceof Error ? err.message : "Failed to fetch trading status")
        setIsConnected(false)
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    const fetchAvailablePairs = async () => {
      try {
        const response = await fetch("/api/trading/symbols")
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }
        
        const data = await response.json()
        
        if (!isMounted) return

        if (!data.success) {
          throw new Error(data.message || "Failed to fetch available pairs")
        }

        // Extract symbols from the response
        const symbols = data.symbols?.map((symbol: any) => symbol.symbol) ?? []
        setAvailablePairs(symbols)
        
        // Fetch real market data for all pairs
        await fetchRealMarketData(symbols)
      } catch (err) {
        if (!isMounted) return
        
        console.error("Error fetching available pairs:", err)
        setError(err instanceof Error ? err.message : "Failed to fetch available pairs")
      }
    }

    const fetchRealMarketData = async (symbols: string[]) => {
      try {
        // Fetch enhanced market data for all symbols
        const response = await fetch("/api/trading/enhanced-market-data")
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }
        
        const result = await response.json()
        
        if (!isMounted) return

        if (!result.success) {
          throw new Error(result.message || "Failed to fetch enhanced market data")
        }

        // Transform the data to our format
        const transformedData: MarketData[] = result.data.map((item: any) => ({
          symbol: item.symbol,
          price: item.price,
          change24h: item.change24h,
          volume: item.volume,
          indicators: {
            rsi: item.indicators.rsi,
            macd: item.indicators.macd,
            signal: item.indicators.signal,
            histogram: item.indicators.histogram,
            bollinger: item.indicators.bollinger,
            volume: item.indicators.volume,
          },
          timestamp: item.timestamp
        }))

        console.log('Enhanced market data received:', {
          count: result.data.length,
          sample: result.data[0],
          metrics: result.metrics
        })

        setMarketData(transformedData)
        setError(null) // Clear any previous errors
      } catch (err) {
        if (!isMounted) return
        
        console.error("Error fetching enhanced market data:", err)
        setError(err instanceof Error ? err.message : "Failed to fetch enhanced market data")
      }
    }

    // Initial fetches
    fetchTradingStatus()
    fetchAvailablePairs()

    // Update data periodically
    const connectWebSocket = () => {
      setIsConnected(true)

      // Update market data every 120 seconds (reduced to minimize API calls)
      const marketDataInterval = setInterval(() => {
        if (!isMounted || availablePairs.length === 0) return
        fetchRealMarketData(availablePairs)
      }, 120000) // 120 seconds (2 minutes)

      // Update trading status every 60 seconds (reduced to minimize API calls)
      const statusInterval = setInterval(() => {
        fetchTradingStatus()
      }, 60000) // 60 seconds (1 minute)

      return () => {
        clearInterval(marketDataInterval)
        clearInterval(statusInterval)
      }
    }

    const cleanup = connectWebSocket()

    // Cleanup on unmount
    return () => {
      isMounted = false
      setIsConnected(false)
      if (cleanup) cleanup()
    }
  }, [availablePairs])

  const value = {
    marketData,
    tradingStatus,
    isConnected,
    lastUpdate,
    isLoading,
    error,
    availablePairs,
    refreshData,
  }

  return <RealTimeContext.Provider value={value}>{children}</RealTimeContext.Provider>
}
