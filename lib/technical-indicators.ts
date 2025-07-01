export interface OHLCV {
  open: number
  high: number
  low: number
  close: number
  volume: number
  timestamp: number
}

export interface KlineData {
  openTime: number
  open: string
  high: string
  low: string
  close: string
  volume: string
  closeTime: number
}

export interface TechnicalIndicatorsData {
  rsi: number
  macd: {
    macd: number
    signal: number
    histogram: number
  }
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

export interface MACDResult {
  macd: number[]
  signal: number[]
  histogram: number[]
}

export interface BollingerBandsResult {
  upper: number
  middle: number
  lower: number
}

export interface StochasticResult {
  k: number[]
  d: number[]
}

export class TechnicalIndicators {
  /**
   * Simple Moving Average
   */
  static sma(data: number[], period: number): number[] {
    if (data.length < period) {
      throw new Error(`Insufficient data: need at least ${period} points for SMA`)
    }

    const result: number[] = []
    for (let i = period - 1; i < data.length; i++) {
      const sum = data.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0)
      result.push(sum / period)
    }
    return result
  }

  /**
   * Exponential Moving Average
   */
  static ema(data: number[], period: number): number[] {
    if (data.length < period) {
      throw new Error(`Insufficient data: need at least ${period} points for EMA`)
    }

    const result: number[] = []
    const multiplier = 2 / (period + 1)

    // First EMA is SMA
    const firstSMA = data.slice(0, period).reduce((a, b) => a + b, 0) / period
    result.push(firstSMA)

    for (let i = period; i < data.length; i++) {
      const ema = (data[i] - result[result.length - 1]) * multiplier + result[result.length - 1]
      result.push(ema)
    }

    return result
  }

  /**
   * Relative Strength Index
   */
  static rsi(data: number[], period = 14): number[] {
    if (data.length < period + 1) {
      throw new Error(`Insufficient data: need at least ${period + 1} points for RSI`)
    }

    const gains: number[] = []
    const losses: number[] = []

    for (let i = 1; i < data.length; i++) {
      const change = data[i] - data[i - 1]
      gains.push(change > 0 ? change : 0)
      losses.push(change < 0 ? Math.abs(change) : 0)
    }

    // Use smoothed moving average (Wilder's smoothing)
    const avgGains: number[] = []
    const avgLosses: number[] = []

    // Initial averages
    let avgGain = gains.slice(0, period).reduce((a, b) => a + b, 0) / period
    let avgLoss = losses.slice(0, period).reduce((a, b) => a + b, 0) / period

    avgGains.push(avgGain)
    avgLosses.push(avgLoss)

    // Smoothed averages
    for (let i = period; i < gains.length; i++) {
      avgGain = (avgGain * (period - 1) + gains[i]) / period
      avgLoss = (avgLoss * (period - 1) + losses[i]) / period
      avgGains.push(avgGain)
      avgLosses.push(avgLoss)
    }

    return avgGains.map((gain, i) => {
      if (avgLosses[i] === 0) return 100
      const rs = gain / avgLosses[i]
      return 100 - 100 / (1 + rs)
    })
  }

  /**
   * MACD (Moving Average Convergence Divergence)
   */
  static macd(data: number[], fastPeriod = 12, slowPeriod = 26, signalPeriod = 9): MACDResult {
    if (data.length < slowPeriod + signalPeriod) {
      throw new Error(`Insufficient data: need at least ${slowPeriod + signalPeriod} points for MACD`)
    }

    const fastEMA = this.ema(data, fastPeriod)
    const slowEMA = this.ema(data, slowPeriod)

    // Align arrays (slowEMA is shorter, so we need to align from the start)
    const startIndex = fastEMA.length - slowEMA.length
    const alignedFastEMA = fastEMA.slice(startIndex)

    const macdLine = alignedFastEMA.map((fast, i) => fast - slowEMA[i])
    const signalLine = this.ema(macdLine, signalPeriod)
    
    // Align histogram with signal line
    const alignedMacdLine = macdLine.slice(macdLine.length - signalLine.length)
    const histogram = alignedMacdLine.map((macd, i) => macd - signalLine[i])

    return {
      macd: macdLine,
      signal: signalLine,
      histogram
    }
  }

  /**
   * Bollinger Bands
   */
  static bollingerBands(data: number[], period = 20, stdDev = 2): BollingerBandsResult[] {
    if (data.length < period) {
      throw new Error(`Insufficient data: need at least ${period} points for Bollinger Bands`)
    }

    const sma = this.sma(data, period)
    const bands: BollingerBandsResult[] = []

    for (let i = 0; i < sma.length; i++) {
      const dataIndex = i + period - 1
      const slice = data.slice(dataIndex - period + 1, dataIndex + 1)
      const avg = sma[i]
      
      const variance = slice.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / period
      const standardDeviation = Math.sqrt(variance)

      bands.push({
        upper: avg + standardDeviation * stdDev,
        middle: avg,
        lower: avg - standardDeviation * stdDev
      })
    }

    return bands
  }

  /**
   * Average True Range
   */
  static atr(ohlcv: OHLCV[], period = 14): number[] {
    if (ohlcv.length < period + 1) {
      throw new Error(`Insufficient data: need at least ${period + 1} points for ATR`)
    }

    const trueRanges: number[] = []

    for (let i = 1; i < ohlcv.length; i++) {
      const current = ohlcv[i]
      const previous = ohlcv[i - 1]

      const tr1 = current.high - current.low
      const tr2 = Math.abs(current.high - previous.close)
      const tr3 = Math.abs(current.low - previous.close)

      trueRanges.push(Math.max(tr1, tr2, tr3))
    }

    return this.sma(trueRanges, period)
  }

  /**
   * Stochastic Oscillator
   */
  static stochastic(ohlcv: OHLCV[], kPeriod = 14, dPeriod = 3): StochasticResult {
    if (ohlcv.length < kPeriod + dPeriod - 1) {
      throw new Error(`Insufficient data: need at least ${kPeriod + dPeriod - 1} points for Stochastic`)
    }

    const kValues: number[] = []

    for (let i = kPeriod - 1; i < ohlcv.length; i++) {
      const slice = ohlcv.slice(i - kPeriod + 1, i + 1)
      const highest = Math.max(...slice.map(candle => candle.high))
      const lowest = Math.min(...slice.map(candle => candle.low))
      const current = ohlcv[i].close

      const k = ((current - lowest) / (highest - lowest)) * 100
      kValues.push(isNaN(k) ? 50 : k) // Handle division by zero
    }

    const dValues = this.sma(kValues, dPeriod)

    return {
      k: kValues,
      d: dValues
    }
  }

  /**
   * Volume Weighted Average Price
   */
  static vwap(ohlcv: OHLCV[]): number[] {
    const vwapValues: number[] = []
    let cumulativeVolume = 0
    let cumulativeVolumePrice = 0

    for (const candle of ohlcv) {
      const typicalPrice = (candle.high + candle.low + candle.close) / 3
      cumulativeVolumePrice += typicalPrice * candle.volume
      cumulativeVolume += candle.volume

      vwapValues.push(cumulativeVolume > 0 ? cumulativeVolumePrice / cumulativeVolume : typicalPrice)
    }

    return vwapValues
  }

  /**
   * Williams %R
   */
  static williamsR(ohlcv: OHLCV[], period = 14): number[] {
    if (ohlcv.length < period) {
      throw new Error(`Insufficient data: need at least ${period} points for Williams %R`)
    }

    const result: number[] = []

    for (let i = period - 1; i < ohlcv.length; i++) {
      const slice = ohlcv.slice(i - period + 1, i + 1)
      const highest = Math.max(...slice.map(candle => candle.high))
      const lowest = Math.min(...slice.map(candle => candle.low))
      const close = ohlcv[i].close

      const wr = ((highest - close) / (highest - lowest)) * -100
      result.push(isNaN(wr) ? -50 : wr)
    }

    return result
  }
}

/**
 * Calculate RSI for the most recent value
 */
export function calculateRSI(prices: number[], period = 14): number {
  if (prices.length < period + 1) {
    throw new Error(`Insufficient data: need at least ${period + 1} points for RSI`)
  }

  const rsiArray = TechnicalIndicators.rsi(prices, period)
  return Math.round(rsiArray[rsiArray.length - 1] * 100) / 100
}

/**
 * Calculate MACD for the most recent values
 */
export function calculateMACD(
  prices: number[], 
  fastPeriod = 12, 
  slowPeriod = 26, 
  signalPeriod = 9
): {
  macd: number
  signal: number
  histogram: number
} {
  if (prices.length < slowPeriod + signalPeriod) {
    return { macd: 0, signal: 0, histogram: 0 }
  }

  const macdResult = TechnicalIndicators.macd(prices, fastPeriod, slowPeriod, signalPeriod)
  
  return {
    macd: Math.round(macdResult.macd[macdResult.macd.length - 1] * 1000) / 1000,
    signal: Math.round(macdResult.signal[macdResult.signal.length - 1] * 1000) / 1000,
    histogram: Math.round(macdResult.histogram[macdResult.histogram.length - 1] * 1000) / 1000
  }
}

/**
 * Calculate Bollinger Bands for the most recent values
 */
export function calculateBollingerBands(
  prices: number[], 
  period = 20, 
  stdDev = 2
): {
  upper: number
  middle: number
  lower: number
  position: 'UPPER' | 'MIDDLE' | 'LOWER'
} {
  if (prices.length < period) {
    const currentPrice = prices[prices.length - 1]
    return {
      upper: currentPrice * 1.02,
      middle: currentPrice,
      lower: currentPrice * 0.98,
      position: 'MIDDLE'
    }
  }

  const bands = TechnicalIndicators.bollingerBands(prices, period, stdDev)
  const lastBand = bands[bands.length - 1]
  const currentPrice = prices[prices.length - 1]

  let position: 'UPPER' | 'MIDDLE' | 'LOWER'
  if (currentPrice >= lastBand.upper) {
    position = 'UPPER'
  } else if (currentPrice <= lastBand.lower) {
    position = 'LOWER'
  } else {
    position = 'MIDDLE'
  }

  return {
    upper: Math.round(lastBand.upper * 100) / 100,
    middle: Math.round(lastBand.middle * 100) / 100,
    lower: Math.round(lastBand.lower * 100) / 100,
    position
  }
}

/**
 * Calculate Volume Analysis
 */
export function calculateVolumeAnalysis(
  volumes: number[], 
  period = 20
): {
  average: number
  current: number
  ratio: number
} {
  if (volumes.length < 1) {
    return { average: 0, current: 0, ratio: 1 }
  }

  const current = volumes[volumes.length - 1]
  
  if (volumes.length < period) {
    return {
      average: current,
      current: current,
      ratio: 1
    }
  }

  const recentVolumes = volumes.slice(-period)
  const average = recentVolumes.reduce((sum, vol) => sum + vol, 0) / period
  const ratio = average > 0 ? current / average : 1

  return {
    average: Math.round(average * 100) / 100,
    current: Math.round(current * 100) / 100,
    ratio: Math.round(ratio * 100) / 100
  }
}

/**
 * Convert KlineData to OHLCV format
 */
export function klineToOHLCV(klines: KlineData[]): OHLCV[] {
  return klines.map(kline => ({
    open: parseFloat(kline.open),
    high: parseFloat(kline.high),
    low: parseFloat(kline.low),
    close: parseFloat(kline.close),
    volume: parseFloat(kline.volume),
    timestamp: kline.openTime
  }))
}

/**
 * Main function to calculate all technical indicators
 */
export function calculateAllIndicators(klines: KlineData[]): TechnicalIndicatorsData {
  if (klines.length < 30) {
    throw new Error(`Insufficient data: need at least 30 klines for technical indicators`)
  }

  // Extract closing prices and volumes
  const prices = klines.map(k => parseFloat(k.close))
  const volumes = klines.map(k => parseFloat(k.volume))

  // Calculate indicators
  const rsi = calculateRSI(prices)
  const macd = calculateMACD(prices)
  const bollinger = calculateBollingerBands(prices)
  const volume = calculateVolumeAnalysis(volumes)

  return {
    rsi,
    macd,
    bollinger,
    volume
  }
}

/**
 * Calculate indicators from limited ticker data (deterministic approximation)
 */
export function calculateIndicatorsFromTicker(tickerData: {
  priceChangePercent: string
  volume: string
  lastPrice: string
}): {
  rsi: number
  macd: number
  bollinger: 'UPPER' | 'MIDDLE' | 'LOWER'
  volume: number
} {
  const priceChange = parseFloat(tickerData.priceChangePercent)
  const volume = parseFloat(tickerData.volume)
  const price = parseFloat(tickerData.lastPrice)

  // RSI approximation based on price change (deterministic)
  let rsi = 50
  if (priceChange > 10) rsi = 85
  else if (priceChange > 5) rsi = 75
  else if (priceChange > 2) rsi = 65
  else if (priceChange > 0) rsi = 55
  else if (priceChange > -2) rsi = 45
  else if (priceChange > -5) rsi = 35
  else if (priceChange > -10) rsi = 25
  else rsi = 15

  // MACD approximation (deterministic)
  const macd = priceChange * 0.1

  // Bollinger position approximation
  let bollinger: 'UPPER' | 'MIDDLE' | 'LOWER'
  if (priceChange > 3) bollinger = 'UPPER'
  else if (priceChange < -3) bollinger = 'LOWER'
  else bollinger = 'MIDDLE'

  // Volume ratio (normalized to reasonable scale)
  const volumeRatio = Math.min(Math.max(volume / 1000000, 0.1), 10)

  return {
    rsi: Math.round(rsi * 10) / 10,
    macd: Math.round(macd * 1000) / 1000,
    bollinger,
    volume: Math.round(volumeRatio * 10) / 10
  }
}

/**
 * Utility function to determine trend based on multiple indicators
 */
export function determineTrend(indicators: TechnicalIndicatorsData): {
  trend: 'BULLISH' | 'BEARISH' | 'NEUTRAL'
  strength: 'STRONG' | 'MODERATE' | 'WEAK'
  signals: string[]
} {
  const signals: string[] = []
  let bullishSignals = 0
  let bearishSignals = 0

  // RSI analysis
  if (indicators.rsi > 70) {
    signals.push('RSI Overbought')
    bearishSignals++
  } else if (indicators.rsi < 30) {
    signals.push('RSI Oversold')
    bullishSignals++
  } else if (indicators.rsi > 50) {
    bullishSignals += 0.5
  } else {
    bearishSignals += 0.5
  }

  // MACD analysis
  if (indicators.macd.macd > indicators.macd.signal && indicators.macd.histogram > 0) {
    signals.push('MACD Bullish')
    bullishSignals++
  } else if (indicators.macd.macd < indicators.macd.signal && indicators.macd.histogram < 0) {
    signals.push('MACD Bearish')
    bearishSignals++
  }

  // Bollinger Bands analysis
  if (indicators.bollinger.position === 'UPPER') {
    signals.push('Price at Upper Bollinger Band')
    bearishSignals += 0.5 // Could indicate overbought
  } else if (indicators.bollinger.position === 'LOWER') {
    signals.push('Price at Lower Bollinger Band')
    bullishSignals += 0.5 // Could indicate oversold
  }

  // Volume analysis
  if (indicators.volume.ratio > 1.5) {
    signals.push('High Volume')
  } else if (indicators.volume.ratio < 0.5) {
    signals.push('Low Volume')
  }

  // Determine overall trend
  let trend: 'BULLISH' | 'BEARISH' | 'NEUTRAL'
  let strength: 'STRONG' | 'MODERATE' | 'WEAK'

  const netSignals = bullishSignals - bearishSignals
  
  if (netSignals > 1) {
    trend = 'BULLISH'
    strength = netSignals > 2 ? 'STRONG' : 'MODERATE'
  } else if (netSignals < -1) {
    trend = 'BEARISH'
    strength = netSignals < -2 ? 'STRONG' : 'MODERATE'
  } else {
    trend = 'NEUTRAL'
    strength = 'WEAK'
  }

  return { trend, strength, signals }
}



