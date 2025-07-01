"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { 
  Bot, 
  Play, 
  Pause, 
  Square, 
  Settings, 
  Activity, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle, 
  XCircle,
  RefreshCw,
  DollarSign,
  Target,
  Zap
} from "lucide-react"

interface BotStatus {
  isActive: boolean
  isRunning: boolean
  lastTrade: string
  totalTrades: number
  successRate: number
  totalProfit: number
  currentPositions: number
  riskLevel: "low" | "medium" | "high"
  strategy: string
  maxPositions: number
  stopLoss: number
  takeProfit: number
}

export default function TradingBotPage() {
  const [botStatus, setBotStatus] = useState<BotStatus>({
    isActive: false,
    isRunning: false,
    lastTrade: "Never",
    totalTrades: 0,
    successRate: 0,
    totalProfit: 0,
    currentPositions: 0,
    riskLevel: "medium",
    strategy: "RSI + MACD",
    maxPositions: 5,
    stopLoss: 2.0,
    takeProfit: 5.0
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchBotStatus = async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      const response = await fetch('/api/trading/status')
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const data = await response.json()
      if (data.bot) {
        setBotStatus(prev => ({
          ...prev,
          ...data.bot
        }))
      }
    } catch (err) {
      console.error('Error fetching bot status:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch bot status')
    } finally {
      setIsLoading(false)
    }
  }

  const startBot = async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      const response = await fetch('/api/trading/start', { method: 'POST' })
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      await fetchBotStatus()
    } catch (err) {
      console.error('Error starting bot:', err)
      setError(err instanceof Error ? err.message : 'Failed to start bot')
    } finally {
      setIsLoading(false)
    }
  }

  const stopBot = async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      const response = await fetch('/api/trading/stop', { method: 'POST' })
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      await fetchBotStatus()
    } catch (err) {
      console.error('Error stopping bot:', err)
      setError(err instanceof Error ? err.message : 'Failed to stop bot')
    } finally {
      setIsLoading(false)
    }
  }

  const emergencyStop = async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      const response = await fetch('/api/trading/emergency-stop', { method: 'POST' })
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      await fetchBotStatus()
    } catch (err) {
      console.error('Error emergency stopping bot:', err)
      setError(err instanceof Error ? err.message : 'Failed to emergency stop bot')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchBotStatus()
    
    const interval = setInterval(() => {
      fetchBotStatus()
    }, 30000) // Update every 30 seconds

    return () => clearInterval(interval)
  }, [])

  const formatCurrency = (value: number) => {
    return `$${value.toFixed(2)}`
  }

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`
  }

  return (
    <div className="min-h-screen bg-slate-950 p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Bot className="w-8 h-8 text-blue-500" />
            Trading Bot
          </h1>
          <p className="text-slate-400 mt-2">
            Automated cryptocurrency trading with advanced risk management
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <Button
            onClick={fetchBotStatus}
            disabled={isLoading}
            variant="outline"
            size="sm"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Bot Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-slate-400">Bot Status</CardTitle>
            {botStatus.isActive ? (
              <CheckCircle className="h-4 w-4 text-green-500" />
            ) : (
              <XCircle className="h-4 w-4 text-red-500" />
            )}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {botStatus.isActive ? "ACTIVE" : "INACTIVE"}
            </div>
            <p className="text-xs text-slate-400">
              {botStatus.isRunning ? "Running" : "Stopped"}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-slate-400">Total Profit</CardTitle>
            <DollarSign className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${botStatus.totalProfit >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              {formatCurrency(botStatus.totalProfit)}
            </div>
            <p className="text-xs text-slate-400">
              {formatPercentage(botStatus.successRate)} success rate
            </p>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-slate-400">Total Trades</CardTitle>
            <Activity className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {botStatus.totalTrades}
            </div>
            <p className="text-xs text-slate-400">
              Last: {botStatus.lastTrade}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-slate-400">Positions</CardTitle>
            <Target className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {botStatus.currentPositions}/{botStatus.maxPositions}
            </div>
            <p className="text-xs text-slate-400">
              Active positions
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Bot Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Controls */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Zap className="w-5 h-5 text-yellow-500" />
                Bot Controls
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-slate-800/50 rounded-lg">
                <div>
                  <h3 className="font-medium text-white">Bot Status</h3>
                  <p className="text-sm text-slate-400">
                    {botStatus.isActive ? "Bot is active and ready to trade" : "Bot is inactive"}
                  </p>
                </div>
                <Switch checked={botStatus.isActive} disabled />
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={startBot}
                  disabled={isLoading || botStatus.isActive}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                >
                  <Play className="w-4 h-4 mr-2" />
                  Start Bot
                </Button>
                <Button
                  onClick={stopBot}
                  disabled={isLoading || !botStatus.isActive}
                  variant="outline"
                  className="flex-1"
                >
                  <Pause className="w-4 h-4 mr-2" />
                  Stop Bot
                </Button>
                <Button
                  onClick={emergencyStop}
                  disabled={isLoading}
                  variant="destructive"
                  className="flex-1"
                >
                  <Square className="w-4 h-4 mr-2" />
                  Emergency Stop
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Trading Strategy */}
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Settings className="w-5 h-5 text-blue-500" />
                Trading Strategy
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-slate-300">Strategy</Label>
                  <Select value={botStatus.strategy} disabled>
                    <SelectTrigger className="bg-slate-800 border-slate-700">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="RSI + MACD">RSI + MACD</SelectItem>
                      <SelectItem value="Bollinger Bands">Bollinger Bands</SelectItem>
                      <SelectItem value="Volume Profile">Volume Profile</SelectItem>
                      <SelectItem value="Multi-Indicator">Multi-Indicator</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-slate-300">Risk Level</Label>
                  <Select value={botStatus.riskLevel} disabled>
                    <SelectTrigger className="bg-slate-800 border-slate-700">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label className="text-slate-300">Max Positions</Label>
                  <Input
                    type="number"
                    value={botStatus.maxPositions}
                    disabled
                    className="bg-slate-800 border-slate-700"
                  />
                </div>
                <div>
                  <Label className="text-slate-300">Stop Loss (%)</Label>
                  <Input
                    type="number"
                    value={botStatus.stopLoss}
                    disabled
                    className="bg-slate-800 border-slate-700"
                  />
                </div>
                <div>
                  <Label className="text-slate-300">Take Profit (%)</Label>
                  <Input
                    type="number"
                    value={botStatus.takeProfit}
                    disabled
                    className="bg-slate-800 border-slate-700"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader>
              <CardTitle className="text-white">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button variant="outline" className="w-full justify-start">
                <Settings className="w-4 h-4 mr-2" />
                Configure Bot
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <TrendingUp className="w-4 h-4 mr-2" />
                View History
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <AlertTriangle className="w-4 h-4 mr-2" />
                Risk Settings
              </Button>
            </CardContent>
          </Card>

          <Card className="bg-slate-900 border-slate-800">
            <CardHeader>
              <CardTitle className="text-white">System Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">API Connection</span>
                <Badge variant="default" className="bg-green-500">Connected</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Market Data</span>
                <Badge variant="default" className="bg-green-500">Live</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Risk Management</span>
                <Badge variant="default" className="bg-green-500">Active</Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
} 