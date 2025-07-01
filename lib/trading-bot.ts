import { 
  get24hrTicker, 
  getKlines, 
  getAccountInfo, 
  placeOrder, 
  getPositions, 
  closePosition 
} from "./binance-api"
import { TechnicalIndicators, type OHLCV } from "./technical-indicators"
import { createClient } from "@supabase/supabase-js"

interface TradingSignal {
  symbol: string
  action: "BUY" | "SELL" | "HOLD"
  confidence: number
  indicators: {
    rsi: number
    macd: number
    bollinger: "UPPER" | "MIDDLE" | "LOWER"
    volume: number
  }
  timestamp: number
}

interface TradingConfig {
  leverage: number
  riskPerTrade: number
  profitTarget: number
  stopLoss: number
  maxPositions: number
  minVolume: number
  symbols: string[]
}

class TradingBot {
  private config: TradingConfig
  private isActive = false
  private positions: Map<string, any> = new Map()
  private supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

  constructor() {
    this.config = {
      leverage: 5,
      riskPerTrade: 0.02, // 2% of account balance
      profitTarget: 30, // $30 USDT
      stopLoss: 0.2, // 20% of account balance
      maxPositions: 3,
      minVolume: 1000000, // Minimum 24h volume
      symbols: [
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
      ],
    }
  }

  async start() {
    this.isActive = true
    console.log("Trading bot started")

    // Log bot start
    await this.logActivity("BOT_STARTED", "Trading bot activated")

    // Main trading loop
    this.tradingLoop()
  }

  async stop() {
    this.isActive = false
    console.log("Trading bot stopped")

    // Log bot stop
    await this.logActivity("BOT_STOPPED", "Trading bot deactivated")
  }

  private async tradingLoop() {
    while (this.isActive) {
      try {
        await this.scanMarkets()
        await this.managePositions()

        // Wait 30 seconds before next scan
        await new Promise((resolve) => setTimeout(resolve, 30000))
      } catch (error) {
        console.error("Trading loop error:", error)
        await this.logActivity("ERROR", `Trading loop error: ${error}`)

        // Wait 60 seconds on error
        await new Promise((resolve) => setTimeout(resolve, 60000))
      }
    }
  }

  private async scanMarkets() {
    const marketData = await get24hrTicker()
    const filteredSymbols = marketData
      .filter(
        (ticker: any) =>
          this.config.symbols.includes(ticker.symbol) && Number.parseFloat(ticker.volume) > this.config.minVolume,
      )
      .map((ticker: any) => ticker.symbol)

    for (const symbol of filteredSymbols) {
      if (this.positions.size >= this.config.maxPositions) break
      if (this.positions.has(symbol)) continue

      const signal = await this.generateSignal(symbol)

      if (signal.action !== "HOLD" && signal.confidence > 0.7) {
        await this.executeSignal(signal)
      }
    }
  }

  private async generateSignal(symbol: string): Promise<TradingSignal> {
    try {
      // Get 1-hour klines for analysis
      const klines = await getKlines(symbol, "1h", 100)
      const ohlcv: OHLCV[] = klines.map((k: any) => ({
        open: Number.parseFloat(k.open),
        high: Number.parseFloat(k.high),
        low: Number.parseFloat(k.low),
        close: Number.parseFloat(k.close),
        volume: Number.parseFloat(k.volume),
        timestamp: k.openTime,
      }))

      const closes = ohlcv.map((candle) => candle.close)

      // Calculate indicators
      const rsi = TechnicalIndicators.rsi(closes, 14)
      const macd = TechnicalIndicators.macd(closes)
      const bollinger = TechnicalIndicators.bollingerBands(closes, 20, 2)
      const vwap = TechnicalIndicators.vwap(ohlcv)

      const currentRSI = rsi[rsi.length - 1]
      const currentMACD = macd.macd[macd.macd.length - 1]
      const currentPrice = closes[closes.length - 1]
      const currentBollinger = bollinger[bollinger.length - 1]
      const currentVWAP = vwap[vwap.length - 1]

      // Determine Bollinger position
      let bollingerPosition: "UPPER" | "MIDDLE" | "LOWER" = "MIDDLE"
      if (currentPrice > currentBollinger.upper) bollingerPosition = "UPPER"
      else if (currentPrice < currentBollinger.lower) bollingerPosition = "LOWER"

      // Generate signal
      let action: "BUY" | "SELL" | "HOLD" = "HOLD"
      let confidence = 0

      // Buy conditions
      if (
        currentRSI < 30 && // Oversold
        currentMACD > 0 && // MACD positive
        currentPrice < currentBollinger.lower && // Below lower Bollinger
        currentPrice < currentVWAP // Below VWAP
      ) {
        action = "BUY"
        confidence = 0.8
      }

      // Sell conditions
      else if (
        currentRSI > 70 && // Overbought
        currentMACD < 0 && // MACD negative
        currentPrice > currentBollinger.upper && // Above upper Bollinger
        currentPrice > currentVWAP // Above VWAP
      ) {
        action = "SELL"
        confidence = 0.8
      }

      return {
        symbol,
        action,
        confidence,
        indicators: {
          rsi: currentRSI,
          macd: currentMACD,
          bollinger: bollingerPosition,
          volume: ohlcv[ohlcv.length - 1].volume,
        },
        timestamp: Date.now(),
      }
    } catch (error) {
      console.error(`Error generating signal for ${symbol}:`, error)
      return {
        symbol,
        action: "HOLD",
        confidence: 0,
        indicators: { rsi: 50, macd: 0, bollinger: "MIDDLE", volume: 0 },
        timestamp: Date.now(),
      }
    }
  }

  private async executeSignal(signal: TradingSignal) {
    try {
      const accountInfo = await getAccountInfo()
      const availableBalance = Number.parseFloat(accountInfo.availableBalance)

      // Calculate position size
      const riskAmount = availableBalance * this.config.riskPerTrade
      const positionSize = (riskAmount * this.config.leverage).toFixed(6)

      // Place order
      const order = await placeOrder({
        symbol: signal.symbol,
        side: signal.action as "BUY" | "SELL",
        type: "MARKET",
        quantity: positionSize,
      })

      // Store position
      this.positions.set(signal.symbol, {
        ...order,
        signal,
        entryTime: Date.now(),
        profitTarget: this.config.profitTarget,
        stopLoss: availableBalance * this.config.stopLoss,
      })

      // Log trade
      await this.logTrade({
        symbol: signal.symbol,
        side: signal.action,
        quantity: positionSize,
        price: order.price || "MARKET",
        confidence: signal.confidence,
        indicators: signal.indicators,
      })

      console.log(`Executed ${signal.action} order for ${signal.symbol}`)
    } catch (error) {
      console.error(`Error executing signal for ${signal.symbol}:`, error)
      await this.logActivity("TRADE_ERROR", `Failed to execute ${signal.action} for ${signal.symbol}: ${error}`)
    }
  }

  private async managePositions() {
    const currentPositions = await getPositions()

    for (const [symbol, position] of this.positions) {
      const currentPosition = currentPositions.find((p: any) => p.symbol === symbol)

      if (!currentPosition || Number.parseFloat(currentPosition.positionAmt) === 0) {
        // Position closed externally
        this.positions.delete(symbol)
        continue
      }

      const unrealizedPnl = Number.parseFloat(currentPosition.unrealizedPnl)

      // Check profit target
      if (unrealizedPnl >= this.config.profitTarget) {
        await this.closePosition(symbol, "PROFIT_TARGET")
      }

      // Check stop loss
      else if (unrealizedPnl <= -position.stopLoss) {
        await this.closePosition(symbol, "STOP_LOSS")
      }
    }
  }

  private async closePosition(symbol: string, reason: string) {
    try {
      await closePosition(symbol)
      this.positions.delete(symbol)

      await this.logActivity("POSITION_CLOSED", `Closed position for ${symbol} - Reason: ${reason}`)
      console.log(`Closed position for ${symbol} - ${reason}`)
    } catch (error) {
      console.error(`Error closing position for ${symbol}:`, error)
      await this.logActivity("CLOSE_ERROR", `Failed to close position for ${symbol}: ${error}`)
    }
  }

  private async logTrade(trade: any) {
    try {
      await this.supabase.from("trades").insert({
        symbol: trade.symbol,
        side: trade.side,
        quantity: trade.quantity,
        price: trade.price,
        confidence: trade.confidence,
        indicators: trade.indicators,
        timestamp: new Date().toISOString(),
      })
    } catch (error) {
      console.error("Error logging trade:", error)
    }
  }

  private async logActivity(type: string, message: string) {
    try {
      await this.supabase.from("bot_activities").insert({
        type,
        message,
        timestamp: new Date().toISOString(),
      })
    } catch (error) {
      console.error("Error logging activity:", error)
    }
  }

  // Public methods for external control
  async getStatus() {
    return {
      isActive: this.isActive,
      activePositions: this.positions.size,
      config: this.config,
    }
  }

  async updateConfig(newConfig: Partial<TradingConfig>) {
    this.config = { ...this.config, ...newConfig }
    await this.logActivity("CONFIG_UPDATED", `Bot configuration updated: ${JSON.stringify(newConfig)}`)
  }

  async emergencyStop() {
    this.isActive = false

    // Close all positions
    for (const symbol of this.positions.keys()) {
      await this.closePosition(symbol, "EMERGENCY_STOP")
    }

    await this.logActivity("EMERGENCY_STOP", "Emergency stop activated - All positions closed")
  }
}

// Singleton instance
let tradingBotInstance: TradingBot | null = null

// Async functions to manage the trading bot
export async function getTradingBot(): Promise<TradingBot> {
  if (!tradingBotInstance) {
    tradingBotInstance = new TradingBot()
  }
  return tradingBotInstance
}

export async function startTradingBot(): Promise<void> {
  const bot = await getTradingBot()
  await bot.start()
}

export async function stopTradingBot(): Promise<void> {
  const bot = await getTradingBot()
  await bot.stop()
}

export async function getTradingBotStatus(): Promise<any> {
  const bot = await getTradingBot()
  return await bot.getStatus()
}

export async function updateTradingBotConfig(newConfig: Partial<TradingConfig>): Promise<void> {
  const bot = await getTradingBot()
  await bot.updateConfig(newConfig)
}

export async function emergencyStopTradingBot(): Promise<void> {
  const bot = await getTradingBot()
  await bot.emergencyStop()
}
