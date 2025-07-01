import { createClient } from "@supabase/supabase-js"

export interface Trade {
  id?: number
  symbol: string
  side: "BUY" | "SELL"
  quantity: string
  price: string
  confidence: number
  indicators: any
  timestamp: string
  created_at?: string
}

export interface BotActivity {
  id?: number
  type: string
  message: string
  timestamp: string
  created_at?: string
}

export interface MarketData {
  id?: number
  symbol: string
  price: number
  change_24h: number
  volume: number
  indicators: any
  timestamp: string
  created_at?: string
}

export interface UserSettings {
  id?: number
  user_id: string
  telegram_chat_id?: string
  trading_config: any
  notifications_enabled: boolean
  created_at?: string
  updated_at?: string
}

export interface RiskLog {
  id?: number
  event_type: string
  symbol?: string
  risk_level: string
  details: any
  timestamp: string
  created_at?: string
}

export interface PerformanceMetrics {
  id?: number
  date: string
  total_trades: number
  winning_trades: number
  total_pnl: number
  max_drawdown: number
  sharpe_ratio?: number
  profit_factor?: number
  created_at?: string
}

export class DatabaseService {
  private supabase

  constructor() {
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
  }

  // Trade Operations
  async logTrade(trade: Omit<Trade, "id" | "created_at">): Promise<Trade | null> {
    try {
      const { data, error } = await this.supabase
        .from("trades")
        .insert(trade)
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error("Error logging trade:", error)
      return null
    }
  }

  async getTrades(limit: number = 100, offset: number = 0): Promise<Trade[]> {
    try {
      const { data, error } = await this.supabase
        .from("trades")
        .select("*")
        .order("timestamp", { ascending: false })
        .range(offset, offset + limit - 1)

      if (error) throw error
      return data || []
    } catch (error) {
      console.error("Error fetching trades:", error)
      return []
    }
  }

  async getTradesBySymbol(symbol: string, limit: number = 50): Promise<Trade[]> {
    try {
      const { data, error } = await this.supabase
        .from("trades")
        .select("*")
        .eq("symbol", symbol)
        .order("timestamp", { ascending: false })
        .limit(limit)

      if (error) throw error
      return data || []
    } catch (error) {
      console.error("Error fetching trades by symbol:", error)
      return []
    }
  }

  // Bot Activity Operations
  async logActivity(activity: Omit<BotActivity, "id" | "created_at">): Promise<BotActivity | null> {
    try {
      const { data, error } = await this.supabase
        .from("bot_activities")
        .insert(activity)
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error("Error logging activity:", error)
      return null
    }
  }

  async getActivities(type?: string, limit: number = 100): Promise<BotActivity[]> {
    try {
      let query = this.supabase
        .from("bot_activities")
        .select("*")
        .order("timestamp", { ascending: false })
        .limit(limit)

      if (type) {
        query = query.eq("type", type)
      }

      const { data, error } = await query
      if (error) throw error
      return data || []
    } catch (error) {
      console.error("Error fetching activities:", error)
      return []
    }
  }

  // Market Data Operations
  async cacheMarketData(marketData: Omit<MarketData, "id" | "created_at">): Promise<MarketData | null> {
    try {
      const { data, error } = await this.supabase
        .from("market_data")
        .upsert(marketData, { onConflict: "symbol" })
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error("Error caching market data:", error)
      return null
    }
  }

  async getMarketData(symbol: string): Promise<MarketData | null> {
    try {
      const { data, error } = await this.supabase
        .from("market_data")
        .select("*")
        .eq("symbol", symbol)
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error("Error fetching market data:", error)
      return null
    }
  }

  // User Settings Operations
  async getUserSettings(userId: string): Promise<UserSettings | null> {
    try {
      const { data, error } = await this.supabase
        .from("user_settings")
        .select("*")
        .eq("user_id", userId)
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error("Error fetching user settings:", error)
      return null
    }
  }

  async updateUserSettings(userId: string, settings: Partial<UserSettings>): Promise<UserSettings | null> {
    try {
      const { data, error } = await this.supabase
        .from("user_settings")
        .upsert({ user_id: userId, ...settings })
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error("Error updating user settings:", error)
      return null
    }
  }

  // Risk Management Operations
  async logRiskEvent(riskLog: Omit<RiskLog, "id" | "created_at">): Promise<RiskLog | null> {
    try {
      const { data, error } = await this.supabase
        .from("risk_logs")
        .insert(riskLog)
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error("Error logging risk event:", error)
      return null
    }
  }

  async getRiskLogs(eventType?: string, limit: number = 100): Promise<RiskLog[]> {
    try {
      let query = this.supabase
        .from("risk_logs")
        .select("*")
        .order("timestamp", { ascending: false })
        .limit(limit)

      if (eventType) {
        query = query.eq("event_type", eventType)
      }

      const { data, error } = await query
      if (error) throw error
      return data || []
    } catch (error) {
      console.error("Error fetching risk logs:", error)
      return []
    }
  }

  // Performance Metrics Operations
  async updatePerformanceMetrics(metrics: Omit<PerformanceMetrics, "id" | "created_at">): Promise<PerformanceMetrics | null> {
    try {
      const { data, error } = await this.supabase
        .from("performance_metrics")
        .upsert(metrics, { onConflict: "date" })
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error("Error updating performance metrics:", error)
      return null
    }
  }

  async getPerformanceMetrics(days: number = 30): Promise<PerformanceMetrics[]> {
    try {
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - days)

      const { data, error } = await this.supabase
        .from("performance_metrics")
        .select("*")
        .gte("date", startDate.toISOString().split('T')[0])
        .order("date", { ascending: false })

      if (error) throw error
      return data || []
    } catch (error) {
      console.error("Error fetching performance metrics:", error)
      return []
    }
  }

  // Analytics and Statistics
  async getTradingStatistics(days: number = 30): Promise<any> {
    try {
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - days)

      const { data: trades, error: tradesError } = await this.supabase
        .from("trades")
        .select("*")
        .gte("timestamp", startDate.toISOString())

      if (tradesError) throw tradesError

      const stats = {
        totalTrades: trades?.length || 0,
        buyTrades: trades?.filter(t => t.side === "BUY").length || 0,
        sellTrades: trades?.filter(t => t.side === "SELL").length || 0,
        totalVolume: trades?.reduce((sum, t) => sum + parseFloat(t.quantity), 0) || 0,
        avgConfidence: trades?.reduce((sum, t) => sum + t.confidence, 0) / (trades?.length || 1) || 0,
        symbols: [...new Set(trades?.map(t => t.symbol) || [])]
      }

      return stats
    } catch (error) {
      console.error("Error calculating trading statistics:", error)
      return null
    }
  }

  // Database Health Check
  async healthCheck(): Promise<{ status: string; timestamp: string; error?: string }> {
    try {
      const { data, error } = await this.supabase
        .from("bot_activities")
        .select("count")
        .limit(1)

      if (error) throw error

      return {
        status: "healthy",
        timestamp: new Date().toISOString()
      }
    } catch (error) {
      return {
        status: "unhealthy",
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : "Unknown error"
      }
    }
  }

  // Data Cleanup
  async cleanupOldData(): Promise<{ deleted: number; error?: string }> {
    try {
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

      const { count: marketDataDeleted, error: marketDataError } = await this.supabase
        .from("market_data")
        .delete()
        .lt("timestamp", thirtyDaysAgo.toISOString())

      if (marketDataError) throw marketDataError

      const ninetyDaysAgo = new Date()
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)

      const { count: activitiesDeleted, error: activitiesError } = await this.supabase
        .from("bot_activities")
        .delete()
        .lt("timestamp", ninetyDaysAgo.toISOString())

      if (activitiesError) throw activitiesError

      return {
        deleted: (marketDataDeleted || 0) + (activitiesDeleted || 0)
      }
    } catch (error) {
      return {
        deleted: 0,
        error: error instanceof Error ? error.message : "Unknown error"
      }
    }
  }
}

// Export singleton instance
export const databaseService = new DatabaseService() 