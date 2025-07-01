export interface OHLCV {
  open: number
  high: number
  low: number
  close: number
  volume: number
  timestamp: number
}

export class TechnicalIndicators {
  // Simple Moving Average
  static sma(data: number[], period: number): number[] {
    const result: number[] = []
    for (let i = period - 1; i < data.length; i++) {
      const sum = data.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0)
      result.push(sum / period)
    }
    return result
  }

  // Exponential Moving Average
  static ema(data: number[], period: number): number[] {
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

  // Relative Strength Index
  static rsi(data: number[], period = 14): number[] {
    const gains: number[] = []
    const losses: number[] = []

    for (let i = 1; i < data.length; i++) {
      const change = data[i] - data[i - 1]
      gains.push(change > 0 ? change : 0)
      losses.push(change < 0 ? Math.abs(change) : 0)
    }

    const avgGains = this.sma(gains, period)
    const avgLosses = this.sma(losses, period)

    return avgGains.map((gain, i) => {
      const rs = gain / avgLosses[i]
      return 100 - 100 / (1 + rs)
    })
  }

  // MACD (Moving Average Convergence Divergence)
  static macd(data: number[], fastPeriod = 12, slowPeriod = 26, signalPeriod = 9) {
    const fastEMA = this.ema(data, fastPeriod)
    const slowEMA = this.ema(data, slowPeriod)

    // Align arrays (slowEMA is shorter)
    const alignedFastEMA = fastEMA.slice(fastEMA.length - slowEMA.length)

    const macdLine = alignedFastEMA.map((fast, i) => fast - slowEMA[i])
    const signalLine = this.ema(macdLine, signalPeriod)
    const histogram = macdLine.slice(macdLine.length - signalLine.length).map((macd, i) => macd - signalLine[i])

    return {
      macd: macdLine,
      signal: signalLine,
      histogram,
    }
  }

  // Bollinger Bands
  static bollingerBands(data: number[], period = 20, stdDev = 2) {
    const sma = this.sma(data, period)
    const bands = sma.map((avg, i) => {
      const slice = data.slice(i, i + period)
      const variance = slice.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / period
      const standardDeviation = Math.sqrt(variance)

      return {
        upper: avg + standardDeviation * stdDev,
        middle: avg,
        lower: avg - standardDeviation * stdDev,
      }
    })

    return bands
  }

  // Average True Range
  static atr(ohlcv: OHLCV[], period = 14): number[] {
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

  // Stochastic Oscillator
  static stochastic(ohlcv: OHLCV[], kPeriod = 14, dPeriod = 3) {
    const kValues: number[] = []

    for (let i = kPeriod - 1; i < ohlcv.length; i++) {
      const slice = ohlcv.slice(i - kPeriod + 1, i + 1)
      const highest = Math.max(...slice.map((candle) => candle.high))
      const lowest = Math.min(...slice.map((candle) => candle.low))
      const current = ohlcv[i].close

      const k = ((current - lowest) / (highest - lowest)) * 100
      kValues.push(k)
    }

    const dValues = this.sma(kValues, dPeriod)

    return {
      k: kValues,
      d: dValues,
    }
  }

  // Volume Weighted Average Price
  static vwap(ohlcv: OHLCV[]): number[] {
    let cumulativeVolume = 0
    let cumulativeVolumePrice = 0
    const vwapValues: number[] = []

    for (const candle of ohlcv) {
      const typicalPrice = (candle.high + candle.low + candle.close) / 3
      cumulativeVolumePrice += typicalPrice * candle.volume
      cumulativeVolume += candle.volume

      vwapValues.push(cumulativeVolumePrice / cumulativeVolume)
    }

    return vwapValues
  }
}
