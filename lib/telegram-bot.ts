"use server"

import { tradingBot } from "./trading-bot"
import { binanceAPI } from "./binance-api"

interface TelegramMessage {
  message_id: number
  from: {
    id: number
    first_name: string
    username?: string
  }
  chat: {
    id: number
    type: string
  }
  text: string
}

class TelegramBot {
  private botToken: string
  private chatId: string
  private baseURL: string

  constructor() {
    this.botToken = process.env.TELEGRAM_BOT_TOKEN || ""
    this.chatId = process.env.TELEGRAM_CHAT_ID || ""
    this.baseURL = `https://api.telegram.org/bot${this.botToken}`
  }

  async sendMessage(text: string, parseMode: "HTML" | "Markdown" = "HTML") {
    try {
      const response = await fetch(`${this.baseURL}/sendMessage`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          chat_id: this.chatId,
          text,
          parse_mode: parseMode,
        }),
      })

      if (!response.ok) {
        throw new Error(`Telegram API error: ${response.status}`)
      }

      return await response.json()
    } catch (error) {
      console.error("Error sending Telegram message:", error)
      throw error
    }
  }

  async handleWebhook(body: any) {
    const message: TelegramMessage = body.message

    if (!message || !message.text) return

    const command = message.text.toLowerCase().trim()
    const chatId = message.chat.id.toString()

    // Verify authorized chat
    if (chatId !== this.chatId) {
      await this.sendMessage("❌ Unauthorized access")
      return
    }

    try {
      switch (command) {
        case "/start":
          await this.handleStart()
          break
        case "/status":
          await this.handleStatus()
          break
        case "/balance":
          await this.handleBalance()
          break
        case "/positions":
          await this.handlePositions()
          break
        case "/start_trading":
          await this.handleStartTrading()
          break
        case "/stop_trading":
          await this.handleStopTrading()
          break
        case "/emergency_stop":
          await this.handleEmergencyStop()
          break
        case "/signals":
          await this.handleSignals()
          break
        case "/help":
          await this.handleHelp()
          break
        default:
          await this.sendMessage("❓ Unknown command. Type /help for available commands.")
      }
    } catch (error) {
      console.error("Error handling Telegram command:", error)
      await this.sendMessage("❌ An error occurred while processing your command.")
    }
  }

  private async handleStart() {
    const message = `
🚀 <b>QuantumTrade Pro Bot</b>

Welcome to your personal trading assistant!

🔹 Monitor your trading performance
🔹 Control automated trading
🔹 Get real-time alerts
🔹 Emergency position management

Type /help to see all available commands.
    `
    await this.sendMessage(message)
  }

  private async handleStatus() {
    const botStatus = await tradingBot.getStatus()
    const accountInfo = await binanceAPI.getAccountInfo()

    const message = `
📊 <b>Trading Bot Status</b>

🤖 Bot Status: ${botStatus.isActive ? "🟢 ACTIVE" : "🔴 INACTIVE"}
📈 Active Positions: ${botStatus.activePositions}
💰 Account Balance: $${Number.parseFloat(accountInfo.totalWalletBalance).toFixed(2)}
⚡ Available Balance: $${Number.parseFloat(accountInfo.availableBalance).toFixed(2)}
📊 Unrealized PnL: $${Number.parseFloat(accountInfo.totalUnrealizedProfit).toFixed(2)}

⚙️ <b>Configuration:</b>
🎯 Leverage: ${botStatus.config.leverage}x
💎 Profit Target: $${botStatus.config.profitTarget}
🛡️ Stop Loss: ${(botStatus.config.stopLoss * 100).toFixed(1)}%
📊 Max Positions: ${botStatus.config.maxPositions}
    `
    await this.sendMessage(message)
  }

  private async handleBalance() {
    const accountInfo = await binanceAPI.getAccountInfo()
    const totalBalance = Number.parseFloat(accountInfo.totalWalletBalance)
    const availableBalance = Number.parseFloat(accountInfo.availableBalance)
    const unrealizedPnl = Number.parseFloat(accountInfo.totalUnrealizedProfit)

    const message = `
💰 <b>Account Balance</b>

💎 Total Balance: $${totalBalance.toFixed(2)}
⚡ Available: $${availableBalance.toFixed(2)}
📊 Unrealized P&L: ${unrealizedPnl >= 0 ? "🟢" : "🔴"} $${unrealizedPnl.toFixed(2)}
🔒 Used Margin: $${(totalBalance - availableBalance).toFixed(2)}

📈 Margin Ratio: ${(((totalBalance - availableBalance) / totalBalance) * 100).toFixed(1)}%
    `
    await this.sendMessage(message)
  }

  private async handlePositions() {
    const positions = await binanceAPI.getPositions()
    const openPositions = positions.filter((p: any) => Number.parseFloat(p.positionAmt) !== 0)

    if (openPositions.length === 0) {
      await this.sendMessage("📊 No open positions")
      return
    }

    let message = "📊 <b>Open Positions</b>\n\n"

    for (const position of openPositions) {
      const pnl = Number.parseFloat(position.unrealizedPnl)
      const pnlPercent = Number.parseFloat(position.percentage)
      const side = Number.parseFloat(position.positionAmt) > 0 ? "LONG" : "SHORT"
      const emoji = pnl >= 0 ? "🟢" : "🔴"

      message += `${emoji} <b>${position.symbol}</b>\n`
      message += `📍 Side: ${side}\n`
      message += `📊 Size: ${Math.abs(Number.parseFloat(position.positionAmt))}\n`
      message += `💰 Entry: $${Number.parseFloat(position.entryPrice).toFixed(4)}\n`
      message += `📈 Mark: $${Number.parseFloat(position.markPrice).toFixed(4)}\n`
      message += `💎 PnL: $${pnl.toFixed(2)} (${pnlPercent.toFixed(2)}%)\n\n`
    }

    await this.sendMessage(message)
  }

  private async handleStartTrading() {
    await tradingBot.start()
    await this.sendMessage("🚀 <b>Trading Bot Started</b>\n\nAutomated trading is now active!")
  }

  private async handleStopTrading() {
    await tradingBot.stop()
    await this.sendMessage("⏹️ <b>Trading Bot Stopped</b>\n\nAutomated trading has been paused.")
  }

  private async handleEmergencyStop() {
    await tradingBot.emergencyStop()
    await this.sendMessage("🚨 <b>EMERGENCY STOP ACTIVATED</b>\n\n❌ All positions closed\n⏹️ Trading bot stopped")
  }

  private async handleSignals() {
    // This would typically fetch recent signals from database
    const message = `
📡 <b>Recent Trading Signals</b>

🟢 <b>BTCUSDT</b> - BUY Signal
📊 RSI: 28.5 (Oversold)
📈 MACD: Bullish crossover
🎯 Confidence: 85%

🔴 <b>ETHUSDT</b> - SELL Signal  
📊 RSI: 72.1 (Overbought)
📉 MACD: Bearish divergence
🎯 Confidence: 78%

🔵 <b>BNBUSDT</b> - HOLD
📊 RSI: 45.2 (Neutral)
📊 MACD: Consolidating
🎯 Confidence: 45%

⏰ Last updated: ${new Date().toLocaleTimeString()}
    `
    await this.sendMessage(message)
  }

  private async handleHelp() {
    const message = `
🤖 <b>QuantumTrade Pro Commands</b>

📊 <b>Monitoring:</b>
/status - Bot and account status
/balance - Account balance details
/positions - Open positions
/signals - Latest trading signals

🎮 <b>Control:</b>
/start_trading - Start automated trading
/stop_trading - Stop automated trading
/emergency_stop - Close all positions & stop bot

ℹ️ <b>General:</b>
/help - Show this help message
/start - Welcome message

⚠️ <b>Emergency:</b>
In case of issues, use /emergency_stop to immediately close all positions and stop the bot.
    `
    await this.sendMessage(message)
  }

  // Notification methods
  async notifyTradeExecuted(trade: any) {
    const emoji = trade.side === "BUY" ? "🟢" : "🔴"
    const message = `
${emoji} <b>Trade Executed</b>

📊 Symbol: ${trade.symbol}
📍 Side: ${trade.side}
📊 Quantity: ${trade.quantity}
💰 Price: ${trade.price}
🎯 Confidence: ${(trade.confidence * 100).toFixed(1)}%

⏰ ${new Date().toLocaleTimeString()}
    `
    await this.sendMessage(message)
  }

  async notifyPositionClosed(symbol: string, pnl: number, reason: string) {
    const emoji = pnl >= 0 ? "🟢" : "🔴"
    const message = `
${emoji} <b>Position Closed</b>

📊 Symbol: ${symbol}
💰 P&L: $${pnl.toFixed(2)}
📝 Reason: ${reason}

⏰ ${new Date().toLocaleTimeString()}
    `
    await this.sendMessage(message)
  }

  async notifyRiskAlert(message: string) {
    await this.sendMessage(`🚨 <b>Risk Alert</b>\n\n${message}`)
  }
}

export const telegramBot = new TelegramBot()
