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

interface ExchangeInfo {
  symbol: string
  status: string
  baseAsset: string
  quoteAsset: string
  pricePrecision: number
  quantityPrecision: number
  filters: any[]
}

interface USDTPair {
  symbol: string
  baseAsset: string
  quoteAsset: string
  status: string
  pricePrecision: number
  quantityPrecision: number
  minQty: string
  maxQty: string
  stepSize: string
  minNotional: string
}

interface OrderResponse {
  symbol: string
  orderId: number
  orderListId: number
  clientOrderId: string
  transactTime: number
  price: string
  origQty: string
  executedQty: string
  cummulativeQuoteQty: string
  status: string
  timeInForce: string
  type: string
  side: string
}

class BinanceAPI {
  private config: BinanceConfig
  private lastRequestTime = 0
  private requestCount = 0
  private requestWeightUsed = 0
  private lastWeightReset = Date.now()
  private cache = new Map<string, { data: any; timestamp: number }>()
  private readonly RATE_LIMIT_DELAY = 200 // Minimum 200ms between requests
  private readonly CACHE_DURATION = 30000 // 30 seconds cache
  private readonly MAX_REQUEST_WEIGHT = 6000 // Binance limit per minute

  constructor() {
    this.config = {
      apiKey: process.env.BINANCE_API_KEY || "",
      apiSecret: process.env.BINANCE_API_SECRET || "",
      baseURL: "https://api.binance.com/api/v3",
    }
  }

  private createSignature(queryString: string): string {
    return crypto.createHmac("sha256", this.config.apiSecret).update(queryString).digest("hex")
  }

  private estimateRequestWeight(endpoint: string, method: string): number {
    // Binance API request weight estimates
    const weights: Record<string, number> = {
      '/ticker/24hr': 40,
      '/depth': 1,
      '/klines': 1,
      '/account': 10,
      '/openOrders': 10,
      '/order': 1,
      '/exchangeInfo': 10,
      '/ping': 1,
      '/time': 1
    }
    
    return weights[endpoint] || 1
  }

  private async makeRequest(
    endpoint: string, 
    params: Record<string, any> = {}, 
    method: 'GET' | 'POST' | 'DELETE' = 'GET',
    signed = false
  ) {
    let url = `${this.config.baseURL}${endpoint}`
    let body: string | undefined

    // Prepare request data
    if (signed) {
      params.timestamp = Date.now()
      params.recvWindow = 5000 // 5 second receive window
    }

    const queryString = new URLSearchParams(params).toString()

    if (method === 'GET') {
      if (queryString) {
        url += `?${queryString}`
      }
      if (signed) {
        const signature = this.createSignature(queryString)
        url += `&signature=${signature}`
      }
    } else {
      // For POST/DELETE, params go in body
      body = queryString
      if (signed) {
        const signature = this.createSignature(queryString)
        body += `&signature=${signature}`
      }
    }

    // Reset request weight counter every minute
    const now = Date.now()
    if (now - this.lastWeightReset > 60000) {
      this.requestWeightUsed = 0
      this.lastWeightReset = now
    }

    // Check if we're approaching the rate limit
    const estimatedWeight = this.estimateRequestWeight(endpoint, method)
    if (this.requestWeightUsed + estimatedWeight > this.MAX_REQUEST_WEIGHT) {
      const waitTime = 60000 - (now - this.lastWeightReset) + 1000 // Wait until next minute + buffer
      console.warn(`Approaching rate limit, waiting ${Math.round(waitTime/1000)}s...`)
      await new Promise(resolve => setTimeout(resolve, waitTime))
      this.requestWeightUsed = 0
      this.lastWeightReset = Date.now()
    }

    // Check cache for GET requests only
    if (method === 'GET') {
      const cacheKey = url
      const cached = this.cache.get(cacheKey)
      if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
        return cached.data
      }
    }

    // Rate limiting
    const timeSinceLastRequest = now - this.lastRequestTime
    if (timeSinceLastRequest < this.RATE_LIMIT_DELAY) {
      await new Promise(resolve => setTimeout(resolve, this.RATE_LIMIT_DELAY - timeSinceLastRequest))
    }

    const headers: Record<string, string> = {
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": "QuantumTrade-Pro/1.0",
      "Accept": "application/json",
    }

    if (signed && this.config.apiKey) {
      headers["X-MBX-APIKEY"] = this.config.apiKey
    }

    const requestOptions: RequestInit = {
      method,
      headers,
    }

    if (body && (method === 'POST' || method === 'DELETE')) {
      requestOptions.body = body
    }

    try {
      const response = await fetch(url, requestOptions)
      this.lastRequestTime = Date.now()
      this.requestCount++
      this.requestWeightUsed += estimatedWeight

      if (!response.ok) {
        const errorText = await response.text()
        let errorMessage: string

        try {
          const errorJson = JSON.parse(errorText)
          errorMessage = `Binance API error: ${response.status} - ${errorJson.msg || errorJson.message || response.statusText}`
        } catch {
          errorMessage = `Binance API error: ${response.status} ${response.statusText} - ${errorText}`
        }

        if (response.status === 429) {
          // Rate limited - wait and retry once
          console.warn("Rate limited by Binance API, waiting 10 seconds...")
          await new Promise(resolve => setTimeout(resolve, 10000))
          
          const retryResponse = await fetch(url, requestOptions)
          if (!retryResponse.ok) {
            throw new Error(errorMessage)
          }
          const retryData = await retryResponse.json()
          
          // Cache only GET responses
          if (method === 'GET') {
            this.cache.set(url, { data: retryData, timestamp: Date.now() })
          }
          return retryData
        }
        
        throw new Error(errorMessage)
      }
      
      const data = await response.json()
      
      // Cache only GET responses
      if (method === 'GET') {
        this.cache.set(url, { data, timestamp: Date.now() })
      }
      
      return data
    } catch (error) {
      console.error("Binance API request failed:", error)
      throw error
    }
  }

  // Get 24hr ticker statistics for all symbols
  async get24hrTicker(): Promise<MarketData[]> {
    return this.makeRequest("/ticker/24hr", {}, 'GET', false)
  }

  // Get order book for a symbol
  async getOrderBook(symbol: string, limit = 100): Promise<OrderBookData> {
    const validLimits = [5, 10, 20, 50, 100, 500, 1000, 5000]
    if (!validLimits.includes(limit)) {
      throw new Error(`Invalid limit. Must be one of: ${validLimits.join(', ')}`)
    }
    return this.makeRequest("/depth", { symbol, limit }, 'GET', false)
  }

  // Get kline/candlestick data
  async getKlines(symbol: string, interval: string, limit = 500): Promise<KlineData[]> {
    const validIntervals = ['1s', '1m', '3m', '5m', '15m', '30m', '1h', '2h', '4h', '6h', '8h', '12h', '1d', '3d', '1w', '1M']
    if (!validIntervals.includes(interval)) {
      throw new Error(`Invalid interval. Must be one of: ${validIntervals.join(', ')}`)
    }
    
    if (limit > 1000) {
      throw new Error('Limit cannot exceed 1000')
    }

    const data = await this.makeRequest("/klines", { symbol, interval, limit }, 'GET', false)
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
    if (!this.config.apiKey || !this.config.apiSecret) {
      throw new Error('API key and secret are required for account operations')
    }
    return this.makeRequest("/account", {}, 'GET', true)
  }

  // Place a new order
  async placeOrder(params: {
    symbol: string
    side: "BUY" | "SELL"
    type: "MARKET" | "LIMIT" | "STOP_LOSS" | "STOP_LOSS_LIMIT" | "TAKE_PROFIT" | "TAKE_PROFIT_LIMIT" | "LIMIT_MAKER"
    quantity?: string
    quoteOrderQty?: string // For market orders, can specify quote quantity instead
    price?: string
    stopPrice?: string
    timeInForce?: "GTC" | "IOC" | "FOK"
    newClientOrderId?: string
    icebergQty?: string
    newOrderRespType?: "ACK" | "RESULT" | "FULL"
  }): Promise<OrderResponse> {
    if (!this.config.apiKey || !this.config.apiSecret) {
      throw new Error('API key and secret are required for trading operations')
    }

    // Validate required parameters
    if (!params.quantity && !params.quoteOrderQty) {
      throw new Error('Either quantity or quoteOrderQty must be specified')
    }

    if (params.type === 'LIMIT' && !params.price) {
      throw new Error('Price is required for LIMIT orders')
    }

    if (params.type === 'LIMIT' && !params.timeInForce) {
      params.timeInForce = 'GTC' // Default time in force for limit orders
    }

    return this.makeRequest("/order", params, 'POST', true)
  }

  // Cancel an order
  async cancelOrder(symbol: string, orderId?: number, origClientOrderId?: string) {
    if (!this.config.apiKey || !this.config.apiSecret) {
      throw new Error('API key and secret are required for trading operations')
    }

    if (!orderId && !origClientOrderId) {
      throw new Error('Either orderId or origClientOrderId must be provided')
    }

    const params: any = { symbol }
    if (orderId) params.orderId = orderId
    if (origClientOrderId) params.origClientOrderId = origClientOrderId

    return this.makeRequest("/order", params, 'DELETE', true)
  }

  // Get open orders
  async getOpenOrders(symbol?: string) {
    if (!this.config.apiKey || !this.config.apiSecret) {
      throw new Error('API key and secret are required for account operations')
    }

    const params = symbol ? { symbol } : {}
    return this.makeRequest("/openOrders", params, 'GET', true)
  }

  // Get order status
  async getOrder(symbol: string, orderId?: number, origClientOrderId?: string) {
    if (!this.config.apiKey || !this.config.apiSecret) {
      throw new Error('API key and secret are required for account operations')
    }

    if (!orderId && !origClientOrderId) {
      throw new Error('Either orderId or origClientOrderId must be provided')
    }

    const params: any = { symbol }
    if (orderId) params.orderId = orderId
    if (origClientOrderId) params.origClientOrderId = origClientOrderId

    return this.makeRequest("/order", params, 'GET', true)
  }

  // Get account balances (non-zero only)
  async getPositions() {
    const accountInfo = await this.getAccountInfo()
    return accountInfo.balances.filter((balance: any) => 
      parseFloat(balance.free) > 0 || parseFloat(balance.locked) > 0
    )
  }

  // Close position by selling all available balance
  async closePosition(symbol: string): Promise<OrderResponse> {
    const accountInfo = await this.getAccountInfo()
    const baseAsset = symbol.replace('USDT', '').replace('BTC', '').replace('ETH', '').replace('BNB', '')
    const balance = accountInfo.balances.find((b: any) => b.asset === baseAsset)
    
    if (!balance || parseFloat(balance.free) <= 0) {
      throw new Error(`No available balance found for ${baseAsset}`)
    }

    // Get symbol info to format quantity properly
    const exchangeInfo = await this.getExchangeInfo()
    const symbolInfo = exchangeInfo.symbols.find((s: any) => s.symbol === symbol)
    
    if (!symbolInfo) {
      throw new Error(`Symbol ${symbol} not found`)
    }

    // Format quantity according to symbol precision
    const precision = symbolInfo.quantityPrecision
    const quantity = parseFloat(balance.free).toFixed(precision)

    return this.placeOrder({
      symbol,
      side: "SELL",
      type: "MARKET",
      quantity,
    })
  }

  // Get exchange information
  async getExchangeInfo(): Promise<{ symbols: ExchangeInfo[] }> {
    return this.makeRequest("/exchangeInfo", {}, 'GET', false)
  }

  // Get all USDT pairs
  async getAllUSDTPairs(): Promise<USDTPair[]> {
    try {
      const exchangeInfo = await this.getExchangeInfo()
      
      const usdtPairs = exchangeInfo.symbols
        .filter((symbol) => 
          symbol.quoteAsset === "USDT" && 
          symbol.status === "TRADING"
        )
        .map((symbol) => {
          // Extract lot size filter for quantity constraints
          const lotSizeFilter = symbol.filters.find((filter: any) => filter.filterType === "LOT_SIZE")
          const minNotionalFilter = symbol.filters.find((filter: any) => filter.filterType === "MIN_NOTIONAL")
          
          return {
            symbol: symbol.symbol,
            baseAsset: symbol.baseAsset,
            quoteAsset: symbol.quoteAsset,
            status: symbol.status,
            pricePrecision: symbol.pricePrecision,
            quantityPrecision: symbol.quantityPrecision,
            minQty: lotSizeFilter?.minQty || "0",
            maxQty: lotSizeFilter?.maxQty || "0",
            stepSize: lotSizeFilter?.stepSize || "0",
            minNotional: minNotionalFilter?.notional || "0"
          }
        })

      return usdtPairs
    } catch (error) {
      console.error("Error fetching USDT pairs:", error)
      throw error
    }
  }

  // Get USDT pairs with volume filter
  async getUSDTPairsWithVolume(minVolume: number = 1000000): Promise<USDTPair[]> {
    try {
      const [usdtPairs, tickerData] = await Promise.all([
        this.getAllUSDTPairs(),
        this.get24hrTicker()
      ])

      // Create a map of symbol to volume for quick lookup
      const volumeMap = new Map<string, number>()
      tickerData.forEach((ticker) => {
        volumeMap.set(ticker.symbol, Number.parseFloat(ticker.volume))
      })

      // Filter pairs by volume
      return usdtPairs.filter((pair) => {
        const volume = volumeMap.get(pair.symbol) || 0
        return volume >= minVolume
      })
    } catch (error) {
      console.error("Error fetching USDT pairs with volume:", error)
      throw error
    }
  }

  // Get top USDT pairs by volume
  async getTopUSDTPairsByVolume(limit: number = 50): Promise<(USDTPair & { volume: number })[]> {
    try {
      const [usdtPairs, tickerData] = await Promise.all([
        this.getAllUSDTPairs(),
        this.get24hrTicker()
      ])

      // Create a map of symbol to volume for quick lookup
      const volumeMap = new Map<string, number>()
      tickerData.forEach((ticker) => {
        volumeMap.set(ticker.symbol, parseFloat(ticker.volume))
      })

      // Sort pairs by volume and return top N
      return usdtPairs
        .map((pair) => ({
          ...pair,
          volume: volumeMap.get(pair.symbol) || 0
        }))
        .sort((a, b) => b.volume - a.volume)
        .slice(0, limit)
    } catch (error) {
      console.error("Error fetching top USDT pairs by volume:", error)
      throw error
    }
  }

  // Test connectivity
  async ping(): Promise<{}> {
    return this.makeRequest("/ping", {}, 'GET', false)
  }

  // Get server time
  async getServerTime(): Promise<{ serverTime: number }> {
    return this.makeRequest("/time", {}, 'GET', false)
  }
}

// Create a singleton instance
const binanceAPIInstance = new BinanceAPI()

// Export async functions that use the singleton instance
export async function get24hrTicker(): Promise<MarketData[]> {
  return binanceAPIInstance.get24hrTicker()
}

export async function getOrderBook(symbol: string, limit = 100): Promise<OrderBookData> {
  return binanceAPIInstance.getOrderBook(symbol, limit)
}

export async function getKlines(symbol: string, interval: string, limit = 500): Promise<KlineData[]> {
  return binanceAPIInstance.getKlines(symbol, interval, limit)
}

export async function getAccountInfo() {
  return binanceAPIInstance.getAccountInfo()
}

export async function placeOrder(params: {
  symbol: string
  side: "BUY" | "SELL"
  type: "MARKET" | "LIMIT" | "STOP_LOSS" | "STOP_LOSS_LIMIT" | "TAKE_PROFIT" | "TAKE_PROFIT_LIMIT" | "LIMIT_MAKER"
  quantity?: string
  quoteOrderQty?: string
  price?: string
  stopPrice?: string
  timeInForce?: "GTC" | "IOC" | "FOK"
  newClientOrderId?: string
  icebergQty?: string
  newOrderRespType?: "ACK" | "RESULT" | "FULL"
}): Promise<OrderResponse> {
  return binanceAPIInstance.placeOrder(params)
}

export async function getPositions() {
  return binanceAPIInstance.getPositions()
}

export async function cancelOrder(symbol: string, orderId?: number, origClientOrderId?: string) {
  return binanceAPIInstance.cancelOrder(symbol, orderId, origClientOrderId)
}

export async function getOpenOrders(symbol?: string) {
  return binanceAPIInstance.getOpenOrders(symbol)
}

export async function getOrder(symbol: string, orderId?: number, origClientOrderId?: string) {
  return binanceAPIInstance.getOrder(symbol, orderId, origClientOrderId)
}

export async function closePosition(symbol: string): Promise<OrderResponse> {
  return binanceAPIInstance.closePosition(symbol)
}

export async function getExchangeInfo(): Promise<{ symbols: ExchangeInfo[] }> {
  return binanceAPIInstance.getExchangeInfo()
}

export async function getAllUSDTPairs(): Promise<USDTPair[]> {
  return binanceAPIInstance.getAllUSDTPairs()
}

export async function getUSDTPairsWithVolume(minVolume: number = 1000000): Promise<USDTPair[]> {
  return binanceAPIInstance.getUSDTPairsWithVolume(minVolume)
}

export async function getTopUSDTPairsByVolume(limit: number = 50): Promise<(USDTPair & { volume: number })[]> {
  return binanceAPIInstance.getTopUSDTPairsByVolume(limit)
}

export async function ping(): Promise<{}> {
  return binanceAPIInstance.ping()
}

export async function getServerTime(): Promise<{ serverTime: number }> {
  return binanceAPIInstance.getServerTime()
}

// Export types for use in other files
export type { MarketData, OrderBookData, KlineData, ExchangeInfo, USDTPair, OrderResponse }
