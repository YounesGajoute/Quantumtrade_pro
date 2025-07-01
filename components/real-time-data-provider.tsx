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
    bollinger: string
    volume: number
  }
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
}

const RealTimeContext = createContext<RealTimeContextType>({
  marketData: [],
  tradingStatus: null,
  isConnected: false,
  lastUpdate: null,
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

  useEffect(() => {
    // Simulate WebSocket connection for real-time data
    const connectWebSocket = () => {
      setIsConnected(true)

      // Simulate market data updates
      const marketDataInterval = setInterval(() => {
        const symbols = [
          "BTCUSDT",
          "ETHUSDT",
          "BNBUSDT",
          "ADAUSDT",
          "SOLUSDT",
          "XRPUSDT",
          "DOTUSDT",
          "DOGEUSDT",
          "AVAXUSDT",
          "MATICUSDT",
        ]

        const newMarketData = symbols.map((symbol) => ({
          symbol,
          price: Math.random() * 50000 + 1000,
          change24h: (Math.random() - 0.5) * 10,
          volume: Math.random() * 1000000000,
          indicators: {
            rsi: Math.random() * 100,
            macd: (Math.random() - 0.5) * 2,
            bollinger: Math.random() > 0.5 ? "UPPER" : Math.random() > 0.5 ? "LOWER" : "MIDDLE",
            volume: Math.random() * 100,
          },
        }))

        setMarketData(newMarketData)
        setLastUpdate(new Date())
      }, 2000)

      // Simulate trading status updates
      const statusInterval = setInterval(async () => {
        try {
          const response = await fetch("/api/trading/status")
          if (response.ok) {
            const data = await response.json()
            setTradingStatus({
              isActive: data.bot.isActive,
              activePositions: data.bot.activePositions,
              totalBalance: data.account.totalBalance,
              availableBalance: data.account.availableBalance,
              unrealizedPnl: data.account.unrealizedPnl,
            })
          }
        } catch (error) {
          console.error("Error fetching trading status:", error)
          // Fallback to mock data
          setTradingStatus({
            isActive: Math.random() > 0.5,
            activePositions: Math.floor(Math.random() * 5),
            totalBalance: 12847.32 + (Math.random() - 0.5) * 1000,
            availableBalance: 10920.87 + (Math.random() - 0.5) * 500,
            unrealizedPnl: (Math.random() - 0.5) * 200,
          })
        }
      }, 5000)

      return () => {
        clearInterval(marketDataInterval)
        clearInterval(statusInterval)
      }
    }

    const cleanup = connectWebSocket()

    // Cleanup on unmount
    return () => {
      setIsConnected(false)
      if (cleanup) cleanup()
    }
  }, [])

  const value = {
    marketData,
    tradingStatus,
    isConnected,
    lastUpdate,
  }

  return <RealTimeContext.Provider value={value}>{children}</RealTimeContext.Provider>
}
