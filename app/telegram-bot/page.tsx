"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { 
  MessageSquare, 
  Bot, 
  Send, 
  Settings, 
  Activity, 
  Users, 
  Bell, 
  RefreshCw, 
  AlertCircle,
  CheckCircle,
  XCircle,
  Zap,
  Shield,
  BarChart3,
  Clock,
  TrendingUp,
  TrendingDown
} from "lucide-react"

interface TelegramBotStatus {
  isActive: boolean
  isConnected: boolean
  botUsername: string
  chatId: string
  subscribers: number
  messagesSent: number
  messagesReceived: number
  lastMessage: string
  uptime: string
  webhookUrl: string
  notifications: {
    trades: boolean
    signals: boolean
    alerts: boolean
    daily: boolean
  }
  settings: {
    autoReply: boolean
    commandPrefix: string
    maxMessageLength: number
    rateLimit: number
  }
}

interface Message {
  id: string
  type: "incoming" | "outgoing"
  content: string
  timestamp: string
  user: string
  status: "sent" | "delivered" | "read" | "failed"
}

export default function TelegramBotPage() {
  const [botStatus, setBotStatus] = useState<TelegramBotStatus>({
    isActive: false,
    isConnected: false,
    botUsername: "@QuantumTradeBot",
    chatId: "",
    subscribers: 0,
    messagesSent: 0,
    messagesReceived: 0,
    lastMessage: "Never",
    uptime: "0h 0m",
    webhookUrl: "https://yourdomain.com/api/telegram/webhook",
    notifications: {
      trades: true,
      signals: true,
      alerts: true,
      daily: false
    },
    settings: {
      autoReply: true,
      commandPrefix: "/",
      maxMessageLength: 4096,
      rateLimit: 30
    }
  })

  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      type: "outgoing",
      content: "🚀 BTC/USDT: Strong bullish signal detected! RSI: 25, MACD: 0.08, Volume: 1.5x",
      timestamp: "2024-01-15 14:30:25",
      user: "Bot",
      status: "read"
    },
    {
      id: "2",
      type: "incoming",
      content: "/status",
      timestamp: "2024-01-15 14:29:15",
      user: "User123",
      status: "read"
    },
    {
      id: "3",
      type: "outgoing",
      content: "📊 Portfolio Status:\n💰 Total Balance: $10,250.00\n📈 Daily P&L: +$125.50 (+1.24%)\n🎯 Active Positions: 3\n⚠️ Risk Level: Medium",
      timestamp: "2024-01-15 14:29:20",
      user: "Bot",
      status: "read"
    },
    {
      id: "4",
      type: "incoming",
      content: "/signals",
      timestamp: "2024-01-15 14:28:45",
      user: "User456",
      status: "read"
    },
    {
      id: "5",
      type: "outgoing",
      content: "🔥 Top Signals:\n1. ETH/USDT - Bullish (85%)\n2. ADA/USDT - Bullish (78%)\n3. DOT/USDT - Bearish (72%)\n\nUse /trade <symbol> to execute",
      timestamp: "2024-01-15 14:28:50",
      user: "Bot",
      status: "read"
    }
  ])

  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [testMessage, setTestMessage] = useState("")

  const fetchBotStatus = async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      // Simulate API call - replace with actual endpoint
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // Update bot status
      setBotStatus(prev => ({
        ...prev,
        isConnected: Math.random() > 0.1,
        messagesSent: prev.messagesSent + Math.floor(Math.random() * 5),
        messagesReceived: prev.messagesReceived + Math.floor(Math.random() * 3),
        uptime: `${Math.floor(Math.random() * 24)}h ${Math.floor(Math.random() * 60)}m`
      }))
    } catch (err) {
      console.error('Error fetching bot status:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch bot status')
    } finally {
      setIsLoading(false)
    }
  }

  const sendTestMessage = async () => {
    if (!testMessage.trim()) return
    
    const newMessage: Message = {
      id: Date.now().toString(),
      type: "outgoing",
      content: testMessage,
      timestamp: new Date().toLocaleString(),
      user: "Bot",
      status: "sent"
    }
    
    setMessages(prev => [newMessage, ...prev])
    setTestMessage("")
    
    // Simulate message delivery
    setTimeout(() => {
      setMessages(prev => 
        prev.map(msg => 
          msg.id === newMessage.id 
            ? { ...msg, status: "delivered" as const }
            : msg
        )
      )
    }, 1000)
    
    setTimeout(() => {
      setMessages(prev => 
        prev.map(msg => 
          msg.id === newMessage.id 
            ? { ...msg, status: "read" as const }
            : msg
        )
      )
    }, 3000)
  }

  useEffect(() => {
    fetchBotStatus()
    
    const interval = setInterval(() => {
      fetchBotStatus()
    }, 30000) // Update every 30 seconds

    return () => clearInterval(interval)
  }, [])

  const getStatusColor = (status: string) => {
    switch (status) {
      case "sent":
        return "text-blue-500"
      case "delivered":
        return "text-yellow-500"
      case "read":
        return "text-green-500"
      case "failed":
        return "text-red-500"
      default:
        return "text-slate-400"
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "sent":
        return <Send className="w-3 h-3" />
      case "delivered":
        return <CheckCircle className="w-3 h-3" />
      case "read":
        return <CheckCircle className="w-3 h-3" />
      case "failed":
        return <XCircle className="w-3 h-3" />
      default:
        return <Clock className="w-3 h-3" />
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <MessageSquare className="w-8 h-8 text-blue-500" />
            Telegram Bot
          </h1>
          <p className="text-slate-400 mt-2">
            Manage your trading bot's Telegram integration and notifications
          </p>
        </div>
        
        <Button
          onClick={fetchBotStatus}
          disabled={isLoading}
          className="bg-blue-600 hover:bg-blue-700"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh Status
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

      {/* Bot Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-slate-400">Bot Status</CardTitle>
            {botStatus.isConnected ? (
              <CheckCircle className="h-4 w-4 text-green-500" />
            ) : (
              <XCircle className="h-4 w-4 text-red-500" />
            )}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {botStatus.isConnected ? "CONNECTED" : "DISCONNECTED"}
            </div>
            <p className="text-xs text-slate-400">
              {botStatus.isActive ? "Active" : "Inactive"}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-slate-400">Subscribers</CardTitle>
            <Users className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {botStatus.subscribers}
            </div>
            <p className="text-xs text-slate-400">Active users</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-slate-400">Messages Sent</CardTitle>
            <Send className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {botStatus.messagesSent}
            </div>
            <p className="text-xs text-slate-400">Total sent</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-slate-400">Uptime</CardTitle>
            <Activity className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {botStatus.uptime}
            </div>
            <p className="text-xs text-slate-400">Bot runtime</p>
          </CardContent>
        </Card>
      </div>

      {/* Bot Configuration */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Configuration */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Settings className="w-5 h-5 text-blue-500" />
                Bot Configuration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-slate-300">Bot Username</Label>
                  <Input
                    value={botStatus.botUsername}
                    onChange={(e) => setBotStatus(prev => ({ ...prev, botUsername: e.target.value }))}
                    className="bg-slate-800 border-slate-700"
                  />
                </div>
                <div>
                  <Label className="text-slate-300">Chat ID</Label>
                  <Input
                    value={botStatus.chatId}
                    onChange={(e) => setBotStatus(prev => ({ ...prev, chatId: e.target.value }))}
                    placeholder="Enter chat ID"
                    className="bg-slate-800 border-slate-700"
                  />
                </div>
              </div>

              <div>
                <Label className="text-slate-300">Webhook URL</Label>
                <Input
                  value={botStatus.webhookUrl}
                  onChange={(e) => setBotStatus(prev => ({ ...prev, webhookUrl: e.target.value }))}
                  className="bg-slate-800 border-slate-700"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-slate-300">Command Prefix</Label>
                  <Input
                    value={botStatus.settings.commandPrefix}
                    onChange={(e) => setBotStatus(prev => ({ 
                      ...prev, 
                      settings: { ...prev.settings, commandPrefix: e.target.value }
                    }))}
                    className="bg-slate-800 border-slate-700"
                  />
                </div>
                <div>
                  <Label className="text-slate-300">Rate Limit (msgs/min)</Label>
                  <Input
                    type="number"
                    value={botStatus.settings.rateLimit}
                    onChange={(e) => setBotStatus(prev => ({ 
                      ...prev, 
                      settings: { ...prev.settings, rateLimit: parseInt(e.target.value) }
                    }))}
                    className="bg-slate-800 border-slate-700"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Notification Settings */}
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Bell className="w-5 h-5 text-yellow-500" />
                Notification Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-slate-300">Trade Notifications</Label>
                  <p className="text-xs text-slate-400">Notify on trade execution</p>
                </div>
                <Switch 
                  checked={botStatus.notifications.trades}
                  onCheckedChange={(checked) => setBotStatus(prev => ({ 
                    ...prev, 
                    notifications: { ...prev.notifications, trades: checked }
                  }))}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-slate-300">Signal Alerts</Label>
                  <p className="text-xs text-slate-400">Notify on strong signals</p>
                </div>
                <Switch 
                  checked={botStatus.notifications.signals}
                  onCheckedChange={(checked) => setBotStatus(prev => ({ 
                    ...prev, 
                    notifications: { ...prev.notifications, signals: checked }
                  }))}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-slate-300">Risk Alerts</Label>
                  <p className="text-xs text-slate-400">Notify on risk events</p>
                </div>
                <Switch 
                  checked={botStatus.notifications.alerts}
                  onCheckedChange={(checked) => setBotStatus(prev => ({ 
                    ...prev, 
                    notifications: { ...prev.notifications, alerts: checked }
                  }))}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-slate-300">Daily Reports</Label>
                  <p className="text-xs text-slate-400">Send daily summary</p>
                </div>
                <Switch 
                  checked={botStatus.notifications.daily}
                  onCheckedChange={(checked) => setBotStatus(prev => ({ 
                    ...prev, 
                    notifications: { ...prev.notifications, daily: checked }
                  }))}
                />
              </div>
            </CardContent>
          </Card>

          {/* Test Message */}
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Send className="w-5 h-5 text-green-500" />
                Send Test Message
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                placeholder="Enter your test message..."
                value={testMessage}
                onChange={(e) => setTestMessage(e.target.value)}
                className="bg-slate-800 border-slate-700 min-h-[100px]"
              />
              <Button 
                onClick={sendTestMessage}
                disabled={!testMessage.trim()}
                className="bg-green-600 hover:bg-green-700"
              >
                <Send className="w-4 h-4 mr-2" />
                Send Message
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Bot Controls */}
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader>
              <CardTitle className="text-white">Bot Controls</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button 
                variant={botStatus.isActive ? "destructive" : "default"}
                className="w-full justify-start"
              >
                <Bot className="w-4 h-4 mr-2" />
                {botStatus.isActive ? "Stop Bot" : "Start Bot"}
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <Shield className="w-4 h-4 mr-2" />
                Set Webhook
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <BarChart3 className="w-4 h-4 mr-2" />
                View Analytics
              </Button>
            </CardContent>
          </Card>

          {/* Message Statistics */}
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader>
              <CardTitle className="text-white">Message Stats</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Messages Sent</span>
                <span className="text-white font-bold">{botStatus.messagesSent}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Messages Received</span>
                <span className="text-white font-bold">{botStatus.messagesReceived}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Delivery Rate</span>
                <span className="text-white font-bold">98.5%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Response Time</span>
                <span className="text-white font-bold">1.2s</span>
              </div>
            </CardContent>
          </Card>

          {/* Quick Commands */}
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader>
              <CardTitle className="text-white">Quick Commands</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="text-xs text-slate-400 space-y-1">
                <div><code className="bg-slate-800 px-1 rounded">/start</code> - Start bot</div>
                <div><code className="bg-slate-800 px-1 rounded">/status</code> - Portfolio status</div>
                <div><code className="bg-slate-800 px-1 rounded">/signals</code> - View signals</div>
                <div><code className="bg-slate-800 px-1 rounded">/positions</code> - Active positions</div>
                <div><code className="bg-slate-800 px-1 rounded">/trade</code> - Execute trade</div>
                <div><code className="bg-slate-800 px-1 rounded">/help</code> - Show commands</div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Message History */}
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="text-white">Recent Messages</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`p-3 rounded-lg border ${
                  message.type === "incoming" 
                    ? "bg-blue-500/20 border-blue-500/30" 
                    : "bg-slate-800/50 border-slate-700"
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-medium ${
                      message.type === "incoming" ? "text-blue-400" : "text-green-400"
                    }`}>
                      {message.user}
                    </span>
                    <Badge variant="outline" className="text-xs">
                      {message.type}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400">{message.timestamp}</span>
                    <div className={`${getStatusColor(message.status)}`}>
                      {getStatusIcon(message.status)}
                    </div>
                  </div>
                </div>
                <p className="text-sm text-slate-300 whitespace-pre-wrap">
                  {message.content}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 