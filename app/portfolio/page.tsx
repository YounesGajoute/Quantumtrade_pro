"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { 
  Wallet, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Target, 
  Activity, 
  RefreshCw, 
  AlertCircle,
  CheckCircle,
  XCircle,
  BarChart3,
  PieChart,
  Clock,
  Zap
} from "lucide-react"

interface PortfolioData {
  totalBalance: number
  availableBalance: number
  totalEquity: number
  unrealizedPnl: number
  realizedPnl: number
  totalPositions: number
  activePositions: number
  closedPositions: number
  winRate: number
  totalTrades: number
  profitableTrades: number
  losingTrades: number
  averageWin: number
  averageLoss: number
  largestWin: number
  largestLoss: number
  dailyPnL: number
  weeklyPnL: number
  monthlyPnL: number
  positions: Position[]
}

interface Position {
  symbol: string
  side: "long" | "short"
  size: number
  entryPrice: number
  currentPrice: number
  unrealizedPnl: number
  unrealizedPnlPercent: number
  margin: number
  leverage: number
  openTime: string
  stopLoss: number
  takeProfit: number
}

export default function PortfolioPage() {
  const [portfolio, setPortfolio] = useState<PortfolioData>({
    totalBalance: 0,
    availableBalance: 0,
    totalEquity: 0,
    unrealizedPnl: 0,
    realizedPnl: 0,
    totalPositions: 0,
    activePositions: 0,
    closedPositions: 0,
    winRate: 0,
    totalTrades: 0,
    profitableTrades: 0,
    losingTrades: 0,
    averageWin: 0,
    averageLoss: 0,
    largestWin: 0,
    largestLoss: 0,
    dailyPnL: 0,
    weeklyPnL: 0,
    monthlyPnL: 0,
    positions: []
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchPortfolio = async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      const response = await fetch('/api/trading/status')
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const data = await response.json()
      if (data.tradingStatus) {
        setPortfolio(prev => ({
          ...prev,
          totalBalance: data.tradingStatus.totalBalance || 0,
          availableBalance: data.tradingStatus.availableBalance || 0,
          totalEquity: data.tradingStatus.totalEquity || 0,
          unrealizedPnl: data.tradingStatus.unrealizedPnl || 0,
          activePositions: data.tradingStatus.activePositions || 0
        }))
      }
    } catch (err) {
      console.error('Error fetching portfolio:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch portfolio data')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchPortfolio()
    
    const interval = setInterval(() => {
      fetchPortfolio()
    }, 30000) // Update every 30 seconds

    return () => clearInterval(interval)
  }, [])

  const formatCurrency = (value: number) => {
    return `$${value.toFixed(2)}`
  }

  const formatPercentage = (value: number) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`
  }

  const getPnlColor = (value: number) => {
    return value >= 0 ? "text-green-500" : "text-red-500"
  }

  const getPnlBgColor = (value: number) => {
    return value >= 0 ? "bg-green-500/20 border-green-500/30" : "bg-red-500/20 border-red-500/30"
  }

  return (
    <div className="min-h-screen bg-slate-950 p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Wallet className="w-8 h-8 text-blue-500" />
            Portfolio
          </h1>
          <p className="text-slate-400 mt-2">
            Your trading positions, balance, and performance metrics
          </p>
        </div>
        
        <Button
          onClick={fetchPortfolio}
          disabled={isLoading}
          className="bg-blue-600 hover:bg-blue-700"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
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

      {/* Portfolio Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-slate-400">Total Balance</CardTitle>
            <DollarSign className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {formatCurrency(portfolio.totalBalance)}
            </div>
            <p className="text-xs text-slate-400">Total account value</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-slate-400">Available Balance</CardTitle>
            <Wallet className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {formatCurrency(portfolio.availableBalance)}
            </div>
            <p className="text-xs text-slate-400">Free margin</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-slate-400">Unrealized P&L</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getPnlColor(portfolio.unrealizedPnl)}`}>
              {formatCurrency(portfolio.unrealizedPnl)}
            </div>
            <p className="text-xs text-slate-400">Open positions</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-slate-400">Active Positions</CardTitle>
            <Target className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {portfolio.activePositions}
            </div>
            <p className="text-xs text-slate-400">Open trades</p>
          </CardContent>
        </Card>
      </div>

      {/* Performance Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Trading Performance */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-blue-500" />
                Trading Performance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-slate-800/50 rounded-lg">
                  <div className="text-2xl font-bold text-white">{portfolio.totalTrades}</div>
                  <div className="text-sm text-slate-400">Total Trades</div>
                </div>
                <div className="text-center p-4 bg-slate-800/50 rounded-lg">
                  <div className="text-2xl font-bold text-green-500">{portfolio.profitableTrades}</div>
                  <div className="text-sm text-slate-400">Winning Trades</div>
                </div>
                <div className="text-center p-4 bg-slate-800/50 rounded-lg">
                  <div className="text-2xl font-bold text-red-500">{portfolio.losingTrades}</div>
                  <div className="text-sm text-slate-400">Losing Trades</div>
                </div>
                <div className="text-center p-4 bg-slate-800/50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-500">{portfolio.winRate.toFixed(1)}%</div>
                  <div className="text-sm text-slate-400">Win Rate</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* P&L Analysis */}
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-green-500" />
                Profit & Loss Analysis
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-slate-800/50 rounded-lg">
                  <div className={`text-xl font-bold ${getPnlColor(portfolio.realizedPnl)}`}>
                    {formatCurrency(portfolio.realizedPnl)}
                  </div>
                  <div className="text-sm text-slate-400">Realized P&L</div>
                </div>
                <div className="text-center p-4 bg-slate-800/50 rounded-lg">
                  <div className={`text-xl font-bold ${getPnlColor(portfolio.averageWin)}`}>
                    {formatCurrency(portfolio.averageWin)}
                  </div>
                  <div className="text-sm text-slate-400">Avg Win</div>
                </div>
                <div className="text-center p-4 bg-slate-800/50 rounded-lg">
                  <div className={`text-xl font-bold ${getPnlColor(portfolio.averageLoss)}`}>
                    {formatCurrency(portfolio.averageLoss)}
                  </div>
                  <div className="text-sm text-slate-400">Avg Loss</div>
                </div>
                <div className="text-center p-4 bg-slate-800/50 rounded-lg">
                  <div className={`text-xl font-bold ${getPnlColor(portfolio.largestWin)}`}>
                    {formatCurrency(portfolio.largestWin)}
                  </div>
                  <div className="text-sm text-slate-400">Largest Win</div>
                </div>
                <div className="text-center p-4 bg-slate-800/50 rounded-lg">
                  <div className={`text-xl font-bold ${getPnlColor(portfolio.largestLoss)}`}>
                    {formatCurrency(portfolio.largestLoss)}
                  </div>
                  <div className="text-sm text-slate-400">Largest Loss</div>
                </div>
                <div className="text-center p-4 bg-slate-800/50 rounded-lg">
                  <div className="text-xl font-bold text-blue-500">
                    {portfolio.totalPositions}
                  </div>
                  <div className="text-sm text-slate-400">Total Positions</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Active Positions */}
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Activity className="w-5 h-5 text-yellow-500" />
                Active Positions ({portfolio.activePositions})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {portfolio.positions.length > 0 ? (
                <div className="space-y-3">
                  {portfolio.positions.map((position, index) => (
                    <div
                      key={index}
                      className="bg-slate-800/50 p-4 rounded-lg border border-slate-700"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <Badge 
                            variant="outline" 
                            className={position.side === "long" ? "text-green-400 bg-green-400/20" : "text-red-400 bg-red-400/20"}
                          >
                            {position.side.toUpperCase()}
                          </Badge>
                          <span className="font-bold text-white">{position.symbol}</span>
                        </div>
                        <div className="text-right">
                          <div className={`text-lg font-bold ${getPnlColor(position.unrealizedPnl)}`}>
                            {formatCurrency(position.unrealizedPnl)}
                          </div>
                          <div className={`text-sm ${getPnlColor(position.unrealizedPnlPercent)}`}>
                            {formatPercentage(position.unrealizedPnlPercent)}
                          </div>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-slate-400">Size:</span>
                          <div className="text-white">{position.size}</div>
                        </div>
                        <div>
                          <span className="text-slate-400">Entry Price:</span>
                          <div className="text-white">${position.entryPrice.toFixed(6)}</div>
                        </div>
                        <div>
                          <span className="text-slate-400">Current Price:</span>
                          <div className="text-white">${position.currentPrice.toFixed(6)}</div>
                        </div>
                        <div>
                          <span className="text-slate-400">Leverage:</span>
                          <div className="text-white">{position.leverage}x</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-slate-400 py-8">
                  <Target className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg">No active positions</p>
                  <p className="text-sm">Start trading to see your positions here</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Time-based P&L */}
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader>
              <CardTitle className="text-white">Time-based P&L</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-blue-500" />
                  <span className="text-slate-300">Daily</span>
                </div>
                <span className={`font-bold ${getPnlColor(portfolio.dailyPnL)}`}>
                  {formatCurrency(portfolio.dailyPnL)}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded">
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-green-500" />
                  <span className="text-slate-300">Weekly</span>
                </div>
                <span className={`font-bold ${getPnlColor(portfolio.weeklyPnL)}`}>
                  {formatCurrency(portfolio.weeklyPnL)}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-yellow-500" />
                  <span className="text-slate-300">Monthly</span>
                </div>
                <span className={`font-bold ${getPnlColor(portfolio.monthlyPnL)}`}>
                  {formatCurrency(portfolio.monthlyPnL)}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Account Summary */}
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader>
              <CardTitle className="text-white">Account Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Total Equity</span>
                <span className="text-white font-bold">{formatCurrency(portfolio.totalEquity)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Used Margin</span>
                <span className="text-white font-bold">
                  {formatCurrency(portfolio.totalBalance - portfolio.availableBalance)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Margin Ratio</span>
                <span className="text-white font-bold">
                  {portfolio.totalBalance > 0 ? ((portfolio.totalBalance - portfolio.availableBalance) / portfolio.totalBalance * 100).toFixed(1) : 0}%
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Closed Positions</span>
                <span className="text-white font-bold">{portfolio.closedPositions}</span>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader>
              <CardTitle className="text-white">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button variant="outline" className="w-full justify-start">
                <TrendingUp className="w-4 h-4 mr-2" />
                View Trade History
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <PieChart className="w-4 h-4 mr-2" />
                Performance Charts
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <Zap className="w-4 h-4 mr-2" />
                Export Data
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
} 