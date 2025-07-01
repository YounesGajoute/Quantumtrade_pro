"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Slider } from "@/components/ui/slider"
import { Badge } from "@/components/ui/badge"
import { AlertTriangle, Settings, Zap, Shield } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

export function AdvancedTradingControls() {
  const [config, setConfig] = useState({
    leverage: 5,
    riskPerTrade: 2,
    profitTarget: 30,
    stopLoss: 20,
    maxPositions: 3,
    autoTrading: false,
    riskManagement: true,
    telegramNotifications: true,
  })
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()

  const handleConfigUpdate = async () => {
    setIsLoading(true)
    try {
      // Simulate API call to update configuration
      await new Promise((resolve) => setTimeout(resolve, 1000))

      toast({
        title: "Configuration Updated",
        description: "Trading bot configuration has been successfully updated.",
      })
    } catch (error) {
      toast({
        title: "Update Failed",
        description: "Failed to update configuration. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleEmergencyStop = async () => {
    setIsLoading(true)
    try {
      const response = await fetch("/api/trading/emergency-stop", {
        method: "POST",
      })

      if (response.ok) {
        toast({
          title: "Emergency Stop Activated",
          description: "All positions have been closed and trading has been stopped.",
          variant: "destructive",
        })
        setConfig((prev) => ({ ...prev, autoTrading: false }))
      }
    } catch (error) {
      toast({
        title: "Emergency Stop Failed",
        description: "Failed to execute emergency stop. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleTradingToggle = async (enabled: boolean) => {
    setIsLoading(true)
    try {
      const endpoint = enabled ? "/api/trading/start" : "/api/trading/stop"
      const response = await fetch(endpoint, { method: "POST" })

      if (response.ok) {
        setConfig((prev) => ({ ...prev, autoTrading: enabled }))
        toast({
          title: enabled ? "Trading Started" : "Trading Stopped",
          description: `Automated trading has been ${enabled ? "activated" : "deactivated"}.`,
        })
      }
    } catch (error) {
      toast({
        title: "Toggle Failed",
        description: "Failed to toggle trading status. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Trading Controls */}
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Zap className="w-5 h-5" />
            Trading Controls
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label className="text-white">Automated Trading</Label>
              <p className="text-sm text-slate-400">Enable/disable automated trade execution</p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={config.autoTrading ? "default" : "secondary"}>
                {config.autoTrading ? "ACTIVE" : "INACTIVE"}
              </Badge>
              <Switch checked={config.autoTrading} onCheckedChange={handleTradingToggle} disabled={isLoading} />
            </div>
          </div>

          <div className="pt-4 border-t border-slate-800">
            <Button onClick={handleEmergencyStop} variant="destructive" className="w-full" disabled={isLoading}>
              <AlertTriangle className="w-4 h-4 mr-2" />
              Emergency Stop - Close All Positions
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Risk Management */}
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Risk Management
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label className="text-white">Leverage: {config.leverage}x</Label>
            <Slider
              value={[config.leverage]}
              onValueChange={(value) => setConfig((prev) => ({ ...prev, leverage: value[0] }))}
              max={20}
              min={1}
              step={1}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-slate-400">
              <span>1x</span>
              <span>20x</span>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-white">Risk Per Trade: {config.riskPerTrade}%</Label>
            <Slider
              value={[config.riskPerTrade]}
              onValueChange={(value) => setConfig((prev) => ({ ...prev, riskPerTrade: value[0] }))}
              max={10}
              min={0.5}
              step={0.5}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-slate-400">
              <span>0.5%</span>
              <span>10%</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-white">Profit Target ($)</Label>
              <Input
                type="number"
                value={config.profitTarget}
                onChange={(e) => setConfig((prev) => ({ ...prev, profitTarget: Number(e.target.value) }))}
                className="bg-slate-800 border-slate-700 text-white"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-white">Stop Loss (%)</Label>
              <Input
                type="number"
                value={config.stopLoss}
                onChange={(e) => setConfig((prev) => ({ ...prev, stopLoss: Number(e.target.value) }))}
                className="bg-slate-800 border-slate-700 text-white"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-white">Max Positions: {config.maxPositions}</Label>
            <Slider
              value={[config.maxPositions]}
              onValueChange={(value) => setConfig((prev) => ({ ...prev, maxPositions: value[0] }))}
              max={10}
              min={1}
              step={1}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-slate-400">
              <span>1</span>
              <span>10</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notification Settings */}
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Notification Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label className="text-white">Risk Management Alerts</Label>
              <p className="text-sm text-slate-400">Get notified of risk threshold breaches</p>
            </div>
            <Switch
              checked={config.riskManagement}
              onCheckedChange={(checked) => setConfig((prev) => ({ ...prev, riskManagement: checked }))}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label className="text-white">Telegram Notifications</Label>
              <p className="text-sm text-slate-400">Receive trade alerts via Telegram</p>
            </div>
            <Switch
              checked={config.telegramNotifications}
              onCheckedChange={(checked) => setConfig((prev) => ({ ...prev, telegramNotifications: checked }))}
            />
          </div>
        </CardContent>
      </Card>

      {/* Save Configuration */}
      <Button onClick={handleConfigUpdate} className="w-full" disabled={isLoading}>
        {isLoading ? "Updating..." : "Save Configuration"}
      </Button>
    </div>
  )
}
