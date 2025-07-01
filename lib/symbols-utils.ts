import { getAllUSDTPairs, getUSDTPairsWithVolume, getTopUSDTPairsByVolume } from "./binance-api"

export interface USDTPair {
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
  volume?: number
}

export class SymbolsUtils {
  // Get all USDT pairs
  static async getAllUSDTPairs(): Promise<USDTPair[]> {
    return getAllUSDTPairs()
  }

  // Get USDT pairs with minimum volume
  static async getUSDTPairsWithVolume(minVolume: number = 1000000): Promise<USDTPair[]> {
    return getUSDTPairsWithVolume(minVolume)
  }

  // Get top USDT pairs by volume
  static async getTopUSDTPairsByVolume(limit: number = 50): Promise<USDTPair[]> {
    return getTopUSDTPairsByVolume(limit)
  }

  // Search pairs by symbol or base asset
  static async searchUSDTPairs(searchTerm: string): Promise<USDTPair[]> {
    const allPairs = await this.getAllUSDTPairs()
    return allPairs.filter(pair =>
      pair.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
      pair.baseAsset.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }

  // Get pairs by base asset
  static async getPairsByBaseAsset(baseAsset: string): Promise<USDTPair[]> {
    const allPairs = await this.getAllUSDTPairs()
    return allPairs.filter(pair => 
      pair.baseAsset.toLowerCase() === baseAsset.toLowerCase()
    )
  }

  // Get pairs with specific status
  static async getPairsByStatus(status: string): Promise<USDTPair[]> {
    const allPairs = await this.getAllUSDTPairs()
    return allPairs.filter(pair => pair.status === status)
  }

  // Format volume for display
  static formatVolume(volume: number): string {
    if (volume >= 1e9) return `${(volume / 1e9).toFixed(2)}B`
    if (volume >= 1e6) return `${(volume / 1e6).toFixed(2)}M`
    if (volume >= 1e3) return `${(volume / 1e3).toFixed(2)}K`
    return volume.toFixed(0)
  }

  // Export pairs to CSV
  static exportToCSV(pairs: USDTPair[], filename: string = "usdt-pairs.csv"): void {
    const csvContent = [
      "Symbol,Base Asset,Quote Asset,Status,Price Precision,Quantity Precision,Min Qty,Max Qty,Step Size,Min Notional,Volume",
      ...pairs.map(pair => 
        `${pair.symbol},${pair.baseAsset},${pair.quoteAsset},${pair.status},${pair.pricePrecision},${pair.quantityPrecision},${pair.minQty},${pair.maxQty},${pair.stepSize},${pair.minNotional},${pair.volume || 0}`
      )
    ].join("\n")

    const blob = new Blob([csvContent], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = filename
    a.click()
    window.URL.revokeObjectURL(url)
  }

  // Get statistics about pairs
  static getPairsStatistics(pairs: USDTPair[]) {
    const totalPairs = pairs.length
    const tradingPairs = pairs.filter(pair => pair.status === "TRADING").length
    const totalVolume = pairs.reduce((sum, pair) => sum + (pair.volume || 0), 0)
    const avgVolume = totalVolume / totalPairs

    return {
      totalPairs,
      tradingPairs,
      totalVolume,
      avgVolume,
      volumeFormatted: this.formatVolume(totalVolume),
      avgVolumeFormatted: this.formatVolume(avgVolume)
    }
  }

  // Filter pairs by multiple criteria
  static filterPairs(pairs: USDTPair[], filters: {
    searchTerm?: string
    minVolume?: number
    status?: string
    baseAsset?: string
  }): USDTPair[] {
    return pairs.filter(pair => {
      // Search term filter
      if (filters.searchTerm) {
        const searchLower = filters.searchTerm.toLowerCase()
        if (!pair.symbol.toLowerCase().includes(searchLower) && 
            !pair.baseAsset.toLowerCase().includes(searchLower)) {
          return false
        }
      }

      // Volume filter
      if (filters.minVolume && (pair.volume || 0) < filters.minVolume) {
        return false
      }

      // Status filter
      if (filters.status && pair.status !== filters.status) {
        return false
      }

      // Base asset filter
      if (filters.baseAsset && pair.baseAsset.toLowerCase() !== filters.baseAsset.toLowerCase()) {
        return false
      }

      return true
    })
  }
} 