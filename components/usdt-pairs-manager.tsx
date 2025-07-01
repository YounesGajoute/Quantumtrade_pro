"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Search, RefreshCw, Download, Filter } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

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
  volume?: number
}

export function USDTPairsManager() {
  const [pairs, setPairs] = useState<USDTPair[]>([])
  const [filteredPairs, setFilteredPairs] = useState<USDTPair[]>([])
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [filterType, setFilterType] = useState<"all" | "volume" | "top">("all")
  const [minVolume, setMinVolume] = useState(1000000)
  const [limit, setLimit] = useState(50)
  const [selectedPairs, setSelectedPairs] = useState<string[]>([])
  const { toast } = useToast()

  const fetchPairs = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        type: filterType,
        minVolume: minVolume.toString(),
        limit: limit.toString()
      })

      const response = await fetch(`/api/trading/symbols?${params}`)
      if (!response.ok) {
        throw new Error("Failed to fetch pairs")
      }

      const data = await response.json()
      setPairs(data.symbols)
      setFilteredPairs(data.symbols)
      
      toast({
        title: "Pairs Loaded",
        description: `Successfully loaded ${data.count} USDT pairs.`,
      })
    } catch (error) {
      console.error("Error fetching pairs:", error)
      toast({
        title: "Error",
        description: "Failed to fetch USDT pairs. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPairs()
  }, [filterType, minVolume, limit])

  useEffect(() => {
    const filtered = pairs.filter(pair =>
      pair.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
      pair.baseAsset.toLowerCase().includes(searchTerm.toLowerCase())
    )
    setFilteredPairs(filtered)
  }, [searchTerm, pairs])

  const handleSelectPair = (symbol: string) => {
    setSelectedPairs(prev => 
      prev.includes(symbol) 
        ? prev.filter(s => s !== symbol)
        : [...prev, symbol]
    )
  }

  const handleSelectAll = () => {
    setSelectedPairs(filteredPairs.map(pair => pair.symbol))
  }

  const handleDeselectAll = () => {
    setSelectedPairs([])
  }

  const exportSelectedPairs = () => {
    if (selectedPairs.length === 0) {
      toast({
        title: "No Selection",
        description: "Please select pairs to export.",
        variant: "destructive",
      })
      return
    }

    const selectedData = pairs.filter(pair => selectedPairs.includes(pair.symbol))
    const csvContent = [
      "Symbol,Base Asset,Status,Min Qty,Step Size,Min Notional,Volume",
      ...selectedData.map(pair => 
        `${pair.symbol},${pair.baseAsset},${pair.status},${pair.minQty},${pair.stepSize},${pair.minNotional},${pair.volume || 0}`
      )
    ].join("\n")

    const blob = new Blob([csvContent], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `usdt-pairs-${new Date().toISOString().split("T")[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)

    toast({
      title: "Export Successful",
      description: `Exported ${selectedPairs.length} pairs to CSV.`,
    })
  }

  const formatVolume = (volume: number) => {
    if (volume >= 1e9) return `${(volume / 1e9).toFixed(2)}B`
    if (volume >= 1e6) return `${(volume / 1e6).toFixed(2)}M`
    if (volume >= 1e3) return `${(volume / 1e3).toFixed(2)}K`
    return volume.toFixed(0)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">USDT Pairs Manager</h2>
          <p className="text-slate-400">Manage and filter Binance USDT trading pairs</p>
        </div>
        <Button onClick={fetchPairs} disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Filters */}
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Filters & Search
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label className="text-white">Filter Type</Label>
              <Select value={filterType} onValueChange={(value: "all" | "volume" | "top") => setFilterType(value)}>
                <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Pairs</SelectItem>
                  <SelectItem value="volume">By Volume</SelectItem>
                  <SelectItem value="top">Top by Volume</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-white">Min Volume (USDT)</Label>
              <Input
                type="number"
                value={minVolume}
                onChange={(e) => setMinVolume(Number(e.target.value))}
                className="bg-slate-800 border-slate-700 text-white"
                placeholder="1000000"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-white">Limit</Label>
              <Input
                type="number"
                value={limit}
                onChange={(e) => setLimit(Number(e.target.value))}
                className="bg-slate-800 border-slate-700 text-white"
                placeholder="50"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-white">Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="bg-slate-800 border-slate-700 text-white pl-10"
                  placeholder="Search symbols..."
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Badge variant="outline" className="text-white">
            {filteredPairs.length} pairs
          </Badge>
          <Badge variant="outline" className="text-green-400">
            {selectedPairs.length} selected
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleSelectAll} size="sm">
            Select All
          </Button>
          <Button variant="outline" onClick={handleDeselectAll} size="sm">
            Deselect All
          </Button>
          <Button onClick={exportSelectedPairs} disabled={selectedPairs.length === 0}>
            <Download className="w-4 h-4 mr-2" />
            Export Selected
          </Button>
        </div>
      </div>

      {/* Pairs Table */}
      <Card className="bg-slate-900 border-slate-800">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-slate-800">
                  <TableHead className="text-white">Select</TableHead>
                  <TableHead className="text-white">Symbol</TableHead>
                  <TableHead className="text-white">Base Asset</TableHead>
                  <TableHead className="text-white">Status</TableHead>
                  <TableHead className="text-white">Min Qty</TableHead>
                  <TableHead className="text-white">Step Size</TableHead>
                  <TableHead className="text-white">Min Notional</TableHead>
                  <TableHead className="text-white">Volume (24h)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPairs.map((pair) => (
                  <TableRow key={pair.symbol} className="border-slate-800 hover:bg-slate-800/50">
                    <TableCell>
                      <input
                        type="checkbox"
                        checked={selectedPairs.includes(pair.symbol)}
                        onChange={() => handleSelectPair(pair.symbol)}
                        className="rounded border-slate-600 bg-slate-800 text-blue-500"
                      />
                    </TableCell>
                    <TableCell className="text-white font-medium">{pair.symbol}</TableCell>
                    <TableCell className="text-slate-300">{pair.baseAsset}</TableCell>
                    <TableCell>
                      <Badge variant={pair.status === "TRADING" ? "default" : "secondary"}>
                        {pair.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-slate-300">{pair.minQty}</TableCell>
                    <TableCell className="text-slate-300">{pair.stepSize}</TableCell>
                    <TableCell className="text-slate-300">{pair.minNotional}</TableCell>
                    <TableCell className="text-slate-300">
                      {pair.volume ? formatVolume(pair.volume) : "N/A"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {loading && (
        <div className="flex items-center justify-center py-8">
          <RefreshCw className="w-6 h-6 animate-spin text-blue-500" />
          <span className="ml-2 text-slate-400">Loading pairs...</span>
        </div>
      )}
    </div>
  )
} 