"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Slider } from "@/components/ui/slider"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { 
  AlertTriangle, 
  Shield, 
  Target, 
  DollarSign, 
  TrendingDown, 
  TrendingUp, 
  Settings, 
  RefreshCw, 
  AlertCircle,
  CheckCircle,
  XCircle,
  Activity,
  Zap,
  BarChart3
} from "lucide-react"

interface RiskSettings {
  maxPositionSize: number
  maxDailyLoss: number
  maxDrawdown: number
  stopLossPercentage: number
  takeProfitPercentage: number
  maxPositions: number
  leverageLimit: number
  riskPerTrade: number
  emergencyStopEnabled: boolean
  autoRebalance: boolean
  volatilityFilter: boolean
  correlationLimit: number
  maxDailyTrades: number
  coolingPeriod: number
}

interface RiskMetrics {
  currentDrawdown: number
  dailyPnL: number
  weeklyPnL: number
  totalRisk: number
  positionRisk: number
  marketRisk: number
  volatilityIndex: number
  correlationScore: number
  riskScore: number
  safetyLevel: "low" | "medium" | "high" | "critical"
}

export default function RiskManagementPage() {
  const [riskSettings, setRiskSettings] = useState<RiskSettings>({
    maxPositionSize: 10,
    maxDailyLoss: 5,
    maxDrawdown: 15,
    stopLossPercentage: 2,
    takeProfitPercentage: 5,
    maxPositions: 5,
    leverageLimit: 10,
    riskPerTrade: 2,
    emergencyStopEnabled: true,
    autoRebalance: true,
    volatilityFilter: true,
    correlationLimit: 0.7,
    maxDailyTrades: 20,
    coolingPeriod: 30
  })

  const [riskMetrics, setRiskMetrics] = useState<RiskMetrics>({
    currentDrawdown: 2.5,
    dailyPnL: -1.2,
    weeklyPnL: 3.8,
    totalRisk: 45,
    positionRisk: 25,
    marketRisk: 20,
    volatilityIndex: 65,
    correlationScore: 0.3,
    riskScore: 35,
    safetyLevel: "medium"
  })

  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchRiskData = async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      // Simulate API call - replace with actual endpoint
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // Update metrics based on current market conditions
      setRiskMetrics(prev => ({
        ...prev,
        currentDrawdown: Math.random() * 5,
        dailyPnL: (Math.random() - 0.5) * 10,
        riskScore: Math.random() * 100,
        safetyLevel: Math.random() > 0.7 ? "high" : Math.random() > 0.4 ? "medium" : "low"
      }))
    } catch (err) {
      console.error('Error fetching risk data:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch risk data')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchRiskData()
    
    const interval = setInterval(() => {
      fetchRiskData()
    }, 60000) // Update every minute

    return () => clearInterval(interval)
  }, [])

  const getSafetyColor = (level: string) => {
    switch (level) {
      case "low":
        return "text-green-500"
      case "medium":
        return "text-yellow-500"
      case "high":
        return "text-orange-500"
      case "critical":
        return "text-red-500"
      default:
        return "text-slate-400"
    }
  }

  const getSafetyBgColor = (level: string) => {
    switch (level) {
      case "low":
        return "bg-green-500/20 border-green-500/30"
      case "medium":
        return "bg-yellow-500/20 border-yellow-500/30"
      case "high":
        return "bg-orange-500/20 border-orange-500/30"
      case "critical":
        return "bg-red-500/20 border-red-500/30"
      default:
        return "bg-slate-500/20 border-slate-500/30"
    }
  }

  const formatCurrency = (value: number) => {
    return `$${value.toFixed(2)}`
  }

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`
  }

  const getPnlColor = (value: number) => {
    return value >= 0 ? "text-green-500" : "text-red-500"
  }

  return (
    <div className="min-h-screen bg-slate-950 p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Shield className="w-8 h-8 text-red-500" />
            Risk Management
          </h1>
          <p className="text-slate-400 mt-2">
            Protect your capital with advanced risk controls and monitoring
          </p>
        </div>
        
        <Button
          onClick={fetchRiskData}
          disabled={isLoading}
          className="bg-red-600 hover:bg-red-700"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Update Risk Data
        </Button>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Risk Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-slate-400">Risk Score</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {riskMetrics.riskScore.toFixed(0)}/100
            </div>
            <p className="text-xs text-slate-400">Current risk level</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-slate-400">Safety Level</CardTitle>
            <Shield className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getSafetyColor(riskMetrics.safetyLevel)}`}>
              {riskMetrics.safetyLevel.toUpperCase()}
            </div>
            <p className="text-xs text-slate-400">Account safety</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-slate-400">Current Drawdown</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getPnlColor(-riskMetrics.currentDrawdown)}`}>
              {formatPercentage(riskMetrics.currentDrawdown)}
            </div>
            <p className="text-xs text-slate-400">Max: {formatPercentage(riskSettings.maxDrawdown)}</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-slate-400">Daily P&L</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getPnlColor(riskMetrics.dailyPnL)}`}>
              {formatCurrency(riskMetrics.dailyPnL)}
            </div>
            <p className="text-xs text-slate-400">Limit: {formatPercentage(riskSettings.maxDailyLoss)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Risk Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Position Risk Controls */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Target className="w-5 h-5 text-blue-500" />
                Position Risk Controls
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-slate-300">Max Position Size (%)</Label>
                  <div className="flex items-center gap-3 mt-2">
                    <Slider
                      value={[riskSettings.maxPositionSize]}
                      onValueChange={(value) => setRiskSettings(prev => ({ ...prev, maxPositionSize: value[0] }))}
                      max={50}
                      min={1}
                      step={1}
                      className="flex-1"
                    />
                    <span className="text-white font-bold w-12">{riskSettings.maxPositionSize}%</span>
                  </div>
                </div>
                
                <div>
                  <Label className="text-slate-300">Risk Per Trade (%)</Label>
                  <div className="flex items-center gap-3 mt-2">
                    <Slider
                      value={[riskSettings.riskPerTrade]}
                      onValueChange={(value) => setRiskSettings(prev => ({ ...prev, riskPerTrade: value[0] }))}
                      max={10}
                      min={0.5}
                      step={0.5}
                      className="flex-1"
                    />
                    <span className="text-white font-bold w-12">{riskSettings.riskPerTrade}%</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-slate-300">Stop Loss (%)</Label>
                  <Input
                    type="number"
                    value={riskSettings.stopLossPercentage}
                    onChange={(e) => setRiskSettings(prev => ({ ...prev, stopLossPercentage: parseFloat(e.target.value) }))}
                    className="bg-slate-800 border-slate-700"
                  />
                </div>
                <div>
                  <Label className="text-slate-300">Take Profit (%)</Label>
                  <Input
                    type="number"
                    value={riskSettings.takeProfitPercentage}
                    onChange={(e) => setRiskSettings(prev => ({ ...prev, takeProfitPercentage: parseFloat(e.target.value) }))}
                    className="bg-slate-800 border-slate-700"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-slate-300">Max Positions</Label>
                  <Input
                    type="number"
                    value={riskSettings.maxPositions}
                    onChange={(e) => setRiskSettings(prev => ({ ...prev, maxPositions: parseInt(e.target.value) }))}
                    className="bg-slate-800 border-slate-700"
                  />
                </div>
                <div>
                  <Label className="text-slate-300">Leverage Limit</Label>
                  <Input
                    type="number"
                    value={riskSettings.leverageLimit}
                    onChange={(e) => setRiskSettings(prev => ({ ...prev, leverageLimit: parseInt(e.target.value) }))}
                    className="bg-slate-800 border-slate-700"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Account Risk Controls */}
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-green-500" />
                Account Risk Controls
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-slate-300">Max Daily Loss (%)</Label>
                  <div className="flex items-center gap-3 mt-2">
                    <Slider
                      value={[riskSettings.maxDailyLoss]}
                      onValueChange={(value) => setRiskSettings(prev => ({ ...prev, maxDailyLoss: value[0] }))}
                      max={20}
                      min={1}
                      step={1}
                      className="flex-1"
                    />
                    <span className="text-white font-bold w-12">{riskSettings.maxDailyLoss}%</span>
                  </div>
                </div>
                
                <div>
                  <Label className="text-slate-300">Max Drawdown (%)</Label>
                  <div className="flex items-center gap-3 mt-2">
                    <Slider
                      value={[riskSettings.maxDrawdown]}
                      onValueChange={(value) => setRiskSettings(prev => ({ ...prev, maxDrawdown: value[0] }))}
                      max={50}
                      min={5}
                      step={5}
                      className="flex-1"
                    />
                    <span className="text-white font-bold w-12">{riskSettings.maxDrawdown}%</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-slate-300">Max Daily Trades</Label>
                  <Input
                    type="number"
                    value={riskSettings.maxDailyTrades}
                    onChange={(e) => setRiskSettings(prev => ({ ...prev, maxDailyTrades: parseInt(e.target.value) }))}
                    className="bg-slate-800 border-slate-700"
                  />
                </div>
                <div>
                  <Label className="text-slate-300">Cooling Period (min)</Label>
                  <Input
                    type="number"
                    value={riskSettings.coolingPeriod}
                    onChange={(e) => setRiskSettings(prev => ({ ...prev, coolingPeriod: parseInt(e.target.value) }))}
                    className="bg-slate-800 border-slate-700"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Risk Alerts */}
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-500" />
                Risk Alerts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-red-500/20 border border-red-500/30 rounded">
                  <div className="flex items-center gap-2">
                    <XCircle className="w-4 h-4 text-red-500" />
                    <span className="text-red-300">Daily loss limit approaching</span>
                  </div>
                  <Badge variant="destructive">Warning</Badge>
                </div>
                
                <div className="flex items-center justify-between p-3 bg-yellow-500/20 border border-yellow-500/30 rounded">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-yellow-500" />
                    <span className="text-yellow-300">High correlation detected</span>
                  </div>
                  <Badge variant="secondary">Monitor</Badge>
                </div>
                
                <div className="flex items-center justify-between p-3 bg-green-500/20 border border-green-500/30 rounded">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span className="text-green-300">Risk levels within limits</span>
                  </div>
                  <Badge variant="default" className="bg-green-500">Safe</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Safety Features */}
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader>
              <CardTitle className="text-white">Safety Features</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-slate-300">Emergency Stop</Label>
                  <p className="text-xs text-slate-400">Auto-stop on critical loss</p>
                </div>
                <Switch 
                  checked={riskSettings.emergencyStopEnabled}
                  onCheckedChange={(checked) => setRiskSettings(prev => ({ ...prev, emergencyStopEnabled: checked }))}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-slate-300">Auto Rebalance</Label>
                  <p className="text-xs text-slate-400">Maintain position limits</p>
                </div>
                <Switch 
                  checked={riskSettings.autoRebalance}
                  onCheckedChange={(checked) => setRiskSettings(prev => ({ ...prev, autoRebalance: checked }))}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-slate-300">Volatility Filter</Label>
                  <p className="text-xs text-slate-400">Skip high volatility</p>
                </div>
                <Switch 
                  checked={riskSettings.volatilityFilter}
                  onCheckedChange={(checked) => setRiskSettings(prev => ({ ...prev, volatilityFilter: checked }))}
                />
              </div>
            </CardContent>
          </Card>

          {/* Risk Metrics */}
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader>
              <CardTitle className="text-white">Risk Metrics</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Position Risk</span>
                <span className="text-white font-bold">{formatPercentage(riskMetrics.positionRisk)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Market Risk</span>
                <span className="text-white font-bold">{formatPercentage(riskMetrics.marketRisk)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Volatility Index</span>
                <span className="text-white font-bold">{riskMetrics.volatilityIndex.toFixed(0)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Correlation Score</span>
                <span className="text-white font-bold">{riskMetrics.correlationScore.toFixed(2)}</span>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader>
              <CardTitle className="text-white">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button variant="destructive" className="w-full justify-start">
                <Zap className="w-4 h-4 mr-2" />
                Emergency Stop All
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <Settings className="w-4 h-4 mr-2" />
                Reset to Defaults
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <BarChart3 className="w-4 h-4 mr-2" />
                Risk Report
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
} 