"use server"

import crypto from "crypto"

interface BinanceConfig {
  apiKey: string
  apiSecret: string
  baseURL: string
}

interface MarketData {
  symbol: string
  price: string
  priceChangePercent: string
  volume: string
  count: number
}

interface OrderBookData {
  symbol: string
  bids: [string, string][]
  asks: [string, string][]
}

interface KlineData {
  openTime: number
  open: string
  high: string
  low: string
  close: string
  volume: string
  closeTime: number
}

class BinanceAPI {
  private config: BinanceConfig

  constructor() {
    this.config = {
      apiKey: process.env.BINANCE_API_KEY || "",
      apiSecret: process.env.BINANCE_API_SECRET || "",
      baseURL: "https://fapi.binance.com",
    }
  }

  private createSignature(queryString: string): string {
    return crypto.createHmac("sha256", this.config.apiSecret).update(queryString).digest("hex")
  }

  private async makeRequest(endpoint: string, params: Record<string, any> = {}, signed = false) {
    const queryString = new URLSearchParams(params).toString()
    let url = `${this.config.baseURL}${endpoint}`

    if (signed) {
      const timestamp = Date.now()
      const signedParams = { ...params, timestamp }
      const signedQuery = new URLSearchParams(signedParams).toString()
      const signature = this.createSignature(signedQuery)
      url += `?${signedQuery}&signature=${signature}`
    } else if (queryString) {
      url += `?${queryString}`
    }

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    }

    if (signed) {
      headers["X-MBX-APIKEY"] = this.config.apiKey
    }

    try {
      const response = await fetch(url, { headers })
      if (!response.ok) {
        throw new Error(`Binance API error: ${response.status} ${response.statusText}`)
      }
      return await response.json()
    } catch (error) {
      console.error("Binance API request failed:", error)
      throw error
    }
  }

  // Get 24hr ticker statistics for all symbols
  async get24hrTicker(): Promise<MarketData[]> {
    return this.makeRequest("/fapi/v1/ticker/24hr")
  }

  // Get order book for a symbol
  async getOrderBook(symbol: string, limit = 100): Promise<OrderBookData> {
    return this.makeRequest("/fapi/v1/depth", { symbol, limit })
  }

  // Get kline/candlestick data
  async getKlines(symbol: string, interval: string, limit = 500): Promise<KlineData[]> {
    const data = await this.makeRequest("/fapi/v1/klines", { symbol, interval, limit })
    return data.map((kline: any[]) => ({
      openTime: kline[0],
      open: kline[1],
      high: kline[2],
      low: kline[3],
      close: kline[4],
      volume: kline[5],
      closeTime: kline[6],
    }))
  }

  // Get account information
  async getAccountInfo() {
    return this.makeRequest("/fapi/v2/account", {}, true)
  }

  // Place a new order
  async placeOrder(params: {
    symbol: string
    side: "BUY" | "SELL"
    type: "MARKET" | "LIMIT"
    quantity: string
    price?: string
    timeInForce?: "GTC" | "IOC" | "FOK"
  }) {
    return this.makeRequest("/fapi/v1/order", params, true)
  }

  // Get open positions
  async getPositions() {
    return this.makeRequest("/fapi/v2/positionRisk", {}, true)
  }

  // Close position
  async closePosition(symbol: string) {
    const positions = await this.getPositions()
    const position = positions.find((p: any) => p.symbol === symbol && Number.parseFloat(p.positionAmt) !== 0)

    if (position) {
      const side = Number.parseFloat(position.positionAmt) > 0 ? "SELL" : "BUY"
      const quantity = Math.abs(Number.parseFloat(position.positionAmt)).toString()

      return this.placeOrder({
        symbol,
        side,
        type: "MARKET",
        quantity,
      })
    }

    throw new Error("No open position found for symbol")
  }
}

export const binanceAPI = new BinanceAPI()
