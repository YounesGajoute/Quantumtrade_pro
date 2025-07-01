import { getAccountInfo, getPositions } from "./binance-api"
import { 
  getTradingBotStatus, 
  startTradingBot, 
  stopTradingBot, 
  emergencyStopTradingBot 
} from "./trading-bot"

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
  date: number
}

interface TelegramUpdate {
  update_id: number
  message?: TelegramMessage
  callback_query?: {
    id: string
    from: {
      id: number
      first_name: string
      username?: string
    }
    message: TelegramMessage
    data: string
  }
}

interface InlineKeyboard {
  inline_keyboard: InlineKeyboardButton[][]
}

interface InlineKeyboardButton {
  text: string
  callback_data?: string
  url?: string
}

interface BotConfig {
  maxMessageLength: number
  rateLimitWindow: number
  maxRequestsPerWindow: number
  retryAttempts: number
  retryDelay: number
  cacheTTL: number
}

interface UserSession {
  userId: number
  lastActivity: number
  requestCount: number
  windowStart: number
  isAuthorized: boolean
  currentMenu?: string
  pageIndex?: number
}

class TelegramBot {
  private botToken: string
  private authorizedChatIds: Set<string>
  private authorizedUserIds: Set<number>
  private baseURL: string
  private config: BotConfig
  private userSessions: Map<number, UserSession>
  private cache: Map<string, { data: any; timestamp: number }>

  constructor() {
    this.botToken = process.env.TELEGRAM_BOT_TOKEN || ""
    
    this.authorizedChatIds = new Set(
      (process.env.TELEGRAM_CHAT_IDS || "").split(",").filter(id => id.trim())
    )
    this.authorizedUserIds = new Set(
      (process.env.TELEGRAM_USER_IDS || "").split(",").map(id => parseInt(id.trim())).filter(id => !isNaN(id))
    )
    
    this.baseURL = `https://api.telegram.org/bot${this.botToken}`
    this.userSessions = new Map()
    this.cache = new Map()
    
    this.config = {
      maxMessageLength: 4096,
      rateLimitWindow: 60000,
      maxRequestsPerWindow: 20,
      retryAttempts: 3,
      retryDelay: 1000,
      cacheTTL: 30000
    }

    if (!this.botToken) {
      throw new Error("TELEGRAM_BOT_TOKEN environment variable is required")
    }
  }

  private isAuthorized(chatId: string, userId: number): boolean {
    return this.authorizedChatIds.has(chatId) || this.authorizedUserIds.has(userId)
  }

  private checkRateLimit(userId: number): boolean {
    const now = Date.now()
    const session = this.userSessions.get(userId)

    if (!session) {
      this.userSessions.set(userId, {
        userId,
        lastActivity: now,
        requestCount: 1,
        windowStart: now,
        isAuthorized: this.authorizedUserIds.has(userId)
      })
      return true
    }

    if (now - session.windowStart > this.config.rateLimitWindow) {
      session.requestCount = 1
      session.windowStart = now
    } else {
      session.requestCount++
    }

    session.lastActivity = now
    return session.requestCount <= this.config.maxRequestsPerWindow
  }

  private async makeRequest(endpoint: string, data: any, retryCount = 0): Promise<any> {
    try {
      const response = await fetch(`${this.baseURL}${endpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(`Telegram API error: ${result.description || response.statusText}`)
      }

      return result
    } catch (error) {
      if (retryCount < this.config.retryAttempts) {
        console.warn(`Telegram API request failed, retrying in ${this.config.retryDelay}ms...`, error)
        await new Promise(resolve => setTimeout(resolve, this.config.retryDelay))
        return this.makeRequest(endpoint, data, retryCount + 1)
      }
      
      console.error("Error making Telegram API request:", error)
      throw error
    }
  }

  private splitMessage(text: string): string[] {
    if (text.length <= this.config.maxMessageLength) {
      return [text]
    }

    const chunks: string[] = []
    let currentChunk = ""
    const lines = text.split("\n")

    for (const line of lines) {
      if ((currentChunk + line + "\n").length > this.config.maxMessageLength) {
        if (currentChunk) {
          chunks.push(currentChunk.trim())
          currentChunk = ""
        }
        
        if (line.length > this.config.maxMessageLength) {
          const lineChunks = line.match(new RegExp(`.{1,${this.config.maxMessageLength - 100}}`, 'g')) || []
          chunks.push(...lineChunks)
        } else {
          currentChunk = line + "\n"
        }
      } else {
        currentChunk += line + "\n"
      }
    }

    if (currentChunk.trim()) {
      chunks.push(currentChunk.trim())
    }

    return chunks
  }

  async sendMessage(
    text: string, 
    parseMode: "HTML" | "Markdown" = "HTML", 
    chatId?: string,
    replyMarkup?: InlineKeyboard
  ): Promise<void> {
    const targetChatId = chatId || Array.from(this.authorizedChatIds)[0]
    
    if (!targetChatId) {
      console.error("No chat ID available for sending message")
      return
    }

    const chunks = this.splitMessage(text)

    for (let i = 0; i < chunks.length; i++) {
      const messageData: any = {
        chat_id: targetChatId,
        text: chunks[i],
        parse_mode: parseMode,
      }

      if (replyMarkup && i === chunks.length - 1) {
        messageData.reply_markup = replyMarkup
      }

      await this.makeRequest("/sendMessage", messageData)
      
      if (i < chunks.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 100))
      }
    }
  }

  async editMessage(
    messageId: number,
    text: string,
    chatId: string,
    replyMarkup?: InlineKeyboard
  ): Promise<void> {
    const messageData: any = {
      chat_id: chatId,
      message_id: messageId,
      text,
      parse_mode: "HTML"
    }

    if (replyMarkup) {
      messageData.reply_markup = replyMarkup
    }

    await this.makeRequest("/editMessageText", messageData)
  }

  async answerCallbackQuery(callbackQueryId: string, text?: string, showAlert = false): Promise<void> {
    await this.makeRequest("/answerCallbackQuery", {
      callback_query_id: callbackQueryId,
      text: text || "✅ Command executed",
      show_alert: showAlert
    })
  }

  async handleWebhook(body: TelegramUpdate): Promise<void> {
    try {
      if (body.message) {
        await this.handleMessage(body.message)
      } else if (body.callback_query) {
        await this.handleCallbackQuery(body.callback_query)
      }
    } catch (error) {
      console.error("Error handling webhook:", error)
    }
  }

  private async handleMessage(message: TelegramMessage): Promise<void> {
    if (!message || !message.text) return

    const userId = message.from.id
    const chatId = message.chat.id.toString()

    if (!this.isAuthorized(chatId, userId)) {
      await this.sendMessage("❌ Unauthorized access", "HTML", chatId)
      return
    }

    if (!this.checkRateLimit(userId)) {
      await this.sendMessage("🚫 Rate limit exceeded. Please wait before sending more commands.", "HTML", chatId)
      return
    }

    const command = message.text.toLowerCase().trim()

    try {
      await this.processCommand(command, chatId, userId)
    } catch (error) {
      console.error("Error handling Telegram command:", error)
      await this.sendMessage("❌ An error occurred while processing your command.", "HTML", chatId)
    }
  }

  private async handleCallbackQuery(callbackQuery: any): Promise<void> {
    const userId = callbackQuery.from.id
    const chatId = callbackQuery.message.chat.id.toString()
    const messageId = callbackQuery.message.message_id
    const data = callbackQuery.data

    if (!this.isAuthorized(chatId, userId)) {
      await this.answerCallbackQuery(callbackQuery.id, "❌ Unauthorized", true)
      return
    }

    if (!this.checkRateLimit(userId)) {
      await this.answerCallbackQuery(callbackQuery.id, "🚫 Rate limit exceeded", true)
      return
    }

    try {
      await this.processCallbackQuery(data, chatId, callbackQuery.id, messageId, userId)
    } catch (error) {
      console.error("Error handling callback query:", error)
      await this.answerCallbackQuery(callbackQuery.id, "❌ Error occurred", true)
    }
  }

  private async processCommand(command: string, chatId: string, userId: number): Promise<void> {
    const [cmd, ...params] = command.split(" ")

    // Update user session menu context
    const session = this.userSessions.get(userId)
    if (session) {
      session.currentMenu = "main"
    }

    switch (cmd) {
      case "/start":
        await this.showMainMenu(chatId)
        break
      case "/menu":
        await this.showMainMenu(chatId)
        break
      default:
        await this.showMainMenu(chatId)
        await this.sendMessage("💡 <i>Tip: Use the buttons below for easier navigation!</i>", "HTML", chatId)
    }
  }

  private async processCallbackQuery(
    data: string, 
    chatId: string, 
    callbackQueryId: string, 
    messageId: number, 
    userId: number
  ): Promise<void> {
    const [action, ...params] = data.split(":")
    const session = this.userSessions.get(userId)

    switch (action) {
      case "main_menu":
        await this.showMainMenu(chatId, messageId)
        await this.answerCallbackQuery(callbackQueryId, "🏠 Main Menu")
        break

      case "status":
        await this.showStatusMenu(chatId, messageId)
        await this.answerCallbackQuery(callbackQueryId, "📊 Status")
        break

      case "trading":
        await this.showTradingMenu(chatId, messageId)
        await this.answerCallbackQuery(callbackQueryId, "🎮 Trading")
        break

      case "portfolio":
        await this.showPortfolioMenu(chatId, messageId)
        await this.answerCallbackQuery(callbackQueryId, "💰 Portfolio")
        break

      case "positions":
        await this.showPositionsMenu(chatId, messageId)
        await this.answerCallbackQuery(callbackQueryId, "📈 Positions")
        break

      case "alerts":
        await this.showAlertsMenu(chatId, messageId)
        await this.answerCallbackQuery(callbackQueryId, "🚨 Alerts")
        break

      case "settings":
        await this.showSettingsMenu(chatId, messageId)
        await this.answerCallbackQuery(callbackQueryId, "⚙️ Settings")
        break

      case "analytics":
        await this.showAnalyticsMenu(chatId, messageId)
        await this.answerCallbackQuery(callbackQueryId, "📊 Analytics")
        break

      case "tools":
        await this.showToolsMenu(chatId, messageId)
        await this.answerCallbackQuery(callbackQueryId, "🛠️ Tools")
        break

      case "help":
        await this.showHelpMenu(chatId, messageId)
        await this.answerCallbackQuery(callbackQueryId, "❓ Help")
        break

      // Status actions
      case "refresh_status":
        await this.showStatusMenu(chatId, messageId)
        await this.answerCallbackQuery(callbackQueryId, "🔄 Refreshed")
        break

      case "quick_status":
        await this.showQuickStatus(chatId, messageId)
        await this.answerCallbackQuery(callbackQueryId, "⚡ Quick Status")
        break

      // Trading actions
      case "start_trading":
        await this.confirmAction(chatId, messageId, "start_trading_confirm", "🚀 Start Trading", "Are you sure you want to start automated trading?")
        await this.answerCallbackQuery(callbackQueryId, "🚀 Starting...")
        break

      case "start_trading_confirm":
        await this.executeStartTrading(chatId, messageId)
        await this.answerCallbackQuery(callbackQueryId, "✅ Trading Started")
        break

      case "stop_trading":
        await this.confirmAction(chatId, messageId, "stop_trading_confirm", "⏹️ Stop Trading", "Are you sure you want to stop automated trading?")
        await this.answerCallbackQuery(callbackQueryId, "⏹️ Stopping...")
        break

      case "stop_trading_confirm":
        await this.executeStopTrading(chatId, messageId)
        await this.answerCallbackQuery(callbackQueryId, "✅ Trading Stopped")
        break

      case "emergency_stop":
        await this.confirmAction(chatId, messageId, "emergency_stop_confirm", "🚨 Emergency Stop", "⚠️ This will close ALL positions and stop trading!\n\nAre you absolutely sure?")
        await this.answerCallbackQuery(callbackQueryId, "🚨 Emergency Stop")
        break

      case "emergency_stop_confirm":
        await this.executeEmergencyStop(chatId, messageId)
        await this.answerCallbackQuery(callbackQueryId, "🚨 Emergency Stop Executed")
        break

      case "trading_status":
        await this.showTradingStatus(chatId, messageId)
        await this.answerCallbackQuery(callbackQueryId, "📊 Trading Status")
        break

      // Portfolio actions
      case "balance":
        await this.showBalance(chatId, messageId)
        await this.answerCallbackQuery(callbackQueryId, "💰 Balance")
        break

      case "pnl":
        await this.showPnL(chatId, messageId)
        await this.answerCallbackQuery(callbackQueryId, "📊 P&L")
        break

      case "refresh_portfolio":
        await this.showPortfolioMenu(chatId, messageId)
        await this.answerCallbackQuery(callbackQueryId, "🔄 Portfolio Refreshed")
        break

      // Position actions
      case "refresh_positions":
        await this.showPositionsMenu(chatId, messageId)
        await this.answerCallbackQuery(callbackQueryId, "🔄 Positions Refreshed")
        break

      case "positions_page":
        const page = parseInt(params[0] || "0")
        if (session) session.pageIndex = page
        await this.showPositionsList(chatId, messageId, page)
        await this.answerCallbackQuery(callbackQueryId, `📄 Page ${page + 1}`)
        break

      case "position_detail":
        const symbol = params[0]
        await this.showPositionDetail(chatId, messageId, symbol)
        await this.answerCallbackQuery(callbackQueryId, `📊 ${symbol}`)
        break

      case "close_position":
        const closeSymbol = params[0]
        await this.confirmAction(chatId, messageId, `close_position_confirm:${closeSymbol}`, "⏹️ Close Position", `Are you sure you want to close position for ${closeSymbol}?`)
        await this.answerCallbackQuery(callbackQueryId, "⏹️ Closing...")
        break

      case "close_position_confirm":
        const confirmSymbol = params[0]
        await this.executeClosePosition(chatId, messageId, confirmSymbol)
        await this.answerCallbackQuery(callbackQueryId, "✅ Position Closed")
        break

      // Alert actions
      case "price_alerts":
        await this.showPriceAlerts(chatId, messageId)
        await this.answerCallbackQuery(callbackQueryId, "💲 Price Alerts")
        break

      case "pnl_alerts":
        await this.showPnLAlerts(chatId, messageId)
        await this.answerCallbackQuery(callbackQueryId, "📊 P&L Alerts")
        break

      case "system_alerts":
        await this.showSystemAlerts(chatId, messageId)
        await this.answerCallbackQuery(callbackQueryId, "🔔 System Alerts")
        break

      // Settings actions
      case "risk_settings":
        await this.showRiskSettings(chatId, messageId)
        await this.answerCallbackQuery(callbackQueryId, "🛡️ Risk Settings")
        break

      case "notification_settings":
        await this.showNotificationSettings(chatId, messageId)
        await this.answerCallbackQuery(callbackQueryId, "🔔 Notifications")
        break

      case "api_settings":
        await this.showApiSettings(chatId, messageId)
        await this.answerCallbackQuery(callbackQueryId, "🔑 API Settings")
        break

      // Analytics actions
      case "performance":
        await this.showPerformance(chatId, messageId)
        await this.answerCallbackQuery(callbackQueryId, "📈 Performance")
        break

      case "statistics":
        await this.showStatistics(chatId, messageId)
        await this.answerCallbackQuery(callbackQueryId, "📊 Statistics")
        break

      case "reports":
        await this.showReports(chatId, messageId)
        await this.answerCallbackQuery(callbackQueryId, "📋 Reports")
        break

      // Tools actions
      case "calculator":
        await this.showCalculator(chatId, messageId)
        await this.answerCallbackQuery(callbackQueryId, "🧮 Calculator")
        break

      case "market_scanner":
        await this.showMarketScanner(chatId, messageId)
        await this.answerCallbackQuery(callbackQueryId, "🔍 Market Scanner")
        break

      case "signal_analyzer":
        await this.showSignalAnalyzer(chatId, messageId)
        await this.answerCallbackQuery(callbackQueryId, "📊 Signal Analyzer")
        break

      // Cancel action
      case "cancel":
        await this.showMainMenu(chatId, messageId)
        await this.answerCallbackQuery(callbackQueryId, "❌ Cancelled")
        break

      default:
        await this.answerCallbackQuery(callbackQueryId, "❓ Unknown action")
    }
  }

  private async getCachedData<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
    const cached = this.cache.get(key)
    
    if (cached && Date.now() - cached.timestamp < this.config.cacheTTL) {
      return cached.data
    }

    const data = await fetcher()
    this.cache.set(key, { data, timestamp: Date.now() })
    return data
  }

  // =======================
  // MENU DISPLAY METHODS
  // =======================

  private async showMainMenu(chatId: string, messageId?: number): Promise<void> {
    const keyboard: InlineKeyboard = {
      inline_keyboard: [
        [
          { text: "📊 Status", callback_data: "status" },
          { text: "🎮 Trading", callback_data: "trading" }
        ],
        [
          { text: "💰 Portfolio", callback_data: "portfolio" },
          { text: "📈 Positions", callback_data: "positions" }
        ],
        [
          { text: "🚨 Alerts", callback_data: "alerts" },
          { text: "⚙️ Settings", callback_data: "settings" }
        ],
        [
          { text: "📊 Analytics", callback_data: "analytics" },
          { text: "🛠️ Tools", callback_data: "tools" }
        ],
        [
          { text: "❓ Help", callback_data: "help" }
        ]
      ]
    }

    const message = `
🚀 <b>QuantumTrade Pro</b>

Welcome to your advanced trading command center!

🎯 <b>Quick Access:</b>
• Monitor your portfolio and positions
• Control automated trading
• Set up alerts and notifications
• Analyze performance and markets
• Access powerful trading tools

Choose an option below to get started:
    `

    if (messageId) {
      await this.editMessage(messageId, message, chatId, keyboard)
    } else {
      await this.sendMessage(message, "HTML", chatId, keyboard)
    }
  }

  private async showStatusMenu(chatId: string, messageId?: number): Promise<void> {
    try {
      const [botStatus, accountInfo] = await Promise.all([
        this.getCachedData("bot_status", () => getTradingBotStatus()),
        this.getCachedData("account_info", () => getAccountInfo())
      ])

      const keyboard: InlineKeyboard = {
        inline_keyboard: [
          [
            { text: "⚡ Quick Status", callback_data: "quick_status" },
            { text: "🔄 Refresh", callback_data: "refresh_status" }
          ],
          [
            { text: "📊 Trading Status", callback_data: "trading_status" },
            { text: "💰 Portfolio", callback_data: "portfolio" }
          ],
          [
            { text: "🏠 Main Menu", callback_data: "main_menu" }
          ]
        ]
      }

      const totalBalance = parseFloat(accountInfo.totalWalletBalance || "0")
      const availableBalance = parseFloat(accountInfo.availableBalance || "0")
      const unrealizedPnl = parseFloat(accountInfo.totalUnrealizedProfit || "0")
      const usedMargin = totalBalance - availableBalance
      const marginRatio = totalBalance > 0 ? (usedMargin / totalBalance) * 100 : 0

      const statusIcon = botStatus.isActive ? "🟢" : "🔴"
      const pnlIcon = unrealizedPnl >= 0 ? "🟢" : "🔴"

      const message = `
📊 <b>System Status Overview</b>

🤖 <b>Bot Status:</b> ${statusIcon} ${botStatus.isActive ? "ACTIVE" : "INACTIVE"}
📈 <b>Active Positions:</b> ${botStatus.activePositions || 0}
💰 <b>Total Balance:</b> $${totalBalance.toFixed(2)}
⚡ <b>Available:</b> $${availableBalance.toFixed(2)}
📊 <b>Unrealized P&L:</b> ${pnlIcon} $${unrealizedPnl.toFixed(2)}
📈 <b>Margin Usage:</b> ${marginRatio.toFixed(1)}%

⚙️ <b>Configuration:</b>
🎯 Leverage: ${botStatus.config?.leverage || "N/A"}x
💎 Profit Target: $${botStatus.config?.profitTarget || "N/A"}
🛡️ Stop Loss: ${((botStatus.config?.stopLoss || 0) * 100).toFixed(1)}%
📊 Max Positions: ${botStatus.config?.maxPositions || "N/A"}

⏰ <i>Last updated: ${new Date().toLocaleTimeString()}</i>
      `

      if (messageId) {
        await this.editMessage(messageId, message, chatId, keyboard)
      } else {
        await this.sendMessage(message, "HTML", chatId, keyboard)
      }
    } catch (error) {
      const errorMessage = "❌ Failed to fetch status information"
      const keyboard: InlineKeyboard = {
        inline_keyboard: [
          [
            { text: "🔄 Retry", callback_data: "refresh_status" },
            { text: "🏠 Main Menu", callback_data: "main_menu" }
          ]
        ]
      }
      
      if (messageId) {
        await this.editMessage(messageId, errorMessage, chatId, keyboard)
      } else {
        await this.sendMessage(errorMessage, "HTML", chatId, keyboard)
      }
    }
  }

  private async showTradingMenu(chatId: string, messageId?: number): Promise<void> {
    try {
      const botStatus = await this.getCachedData("bot_status", () => getTradingBotStatus())
      
      const keyboard: InlineKeyboard = {
        inline_keyboard: [
          [
            { 
              text: botStatus.isActive ? "⏹️ Stop Trading" : "🚀 Start Trading", 
              callback_data: botStatus.isActive ? "stop_trading" : "start_trading" 
            }
          ],
          [
            { text: "📊 Trading Status", callback_data: "trading_status" },
            { text: "📈 View Positions", callback_data: "positions" }
          ],
          [
            { text: "🚨 Emergency Stop", callback_data: "emergency_stop" }
          ],
          [
            { text: "⚙️ Trading Settings", callback_data: "risk_settings" },
            { text: "🔔 Alerts", callback_data: "alerts" }
          ],
          [
            { text: "🏠 Main Menu", callback_data: "main_menu" }
          ]
        ]
      }

      const statusIcon = botStatus.isActive ? "🟢" : "🔴"
      const statusText = botStatus.isActive ? "ACTIVE" : "INACTIVE"

      const message = `
🎮 <b>Trading Control Center</b>

🤖 <b>Current Status:</b> ${statusIcon} ${statusText}
📈 <b>Active Positions:</b> ${botStatus.activePositions || 0}
🎯 <b>Success Rate:</b> ${botStatus.successRate || "N/A"}%
💰 <b>Today's P&L:</b> ${botStatus.todayPnL || "N/A"}

⚙️ <b>Quick Settings:</b>
🎯 Leverage: ${botStatus.config?.leverage || "N/A"}x
🛡️ Stop Loss: ${((botStatus.config?.stopLoss || 0) * 100).toFixed(1)}%
💎 Take Profit: ${((botStatus.config?.takeProfit || 0) * 100).toFixed(1)}%

${botStatus.isActive ? 
  "🟢 <b>Trading is currently active</b>\n🔍 Monitoring markets for opportunities..." : 
  "🔴 <b>Trading is currently paused</b>\n⏸️ No new positions will be opened"}

<i>Choose an action below:</i>
      `

      if (messageId) {
        await this.editMessage(messageId, message, chatId, keyboard)
      } else {
        await this.sendMessage(message, "HTML", chatId, keyboard)
      }
    } catch (error) {
      const errorMessage = "❌ Failed to load trading information"
      const keyboard: InlineKeyboard = {
        inline_keyboard: [
          [
            { text: "🔄 Retry", callback_data: "trading" },
            { text: "🏠 Main Menu", callback_data: "main_menu" }
          ]
        ]
      }
      
      if (messageId) {
        await this.editMessage(messageId, errorMessage, chatId, keyboard)
      } else {
        await this.sendMessage(errorMessage, "HTML", chatId, keyboard)
      }
    }
  }

  private async showPortfolioMenu(chatId: string, messageId?: number): Promise<void> {
    try {
      const accountInfo = await this.getCachedData("account_info", () => getAccountInfo())
      
      const keyboard: InlineKeyboard = {
        inline_keyboard: [
          [
            { text: "💰 Balance Details", callback_data: "balance" },
            { text: "📊 P&L Analysis", callback_data: "pnl" }
          ],
          [
            { text: "📈 Active Positions", callback_data: "positions" },
            { text: "📋 Trade History", callback_data: "reports" }
          ],
          [
            { text: "🔄 Refresh", callback_data: "refresh_portfolio" },
            { text: "📊 Analytics", callback_data: "analytics" }
          ],
          [
            { text: "🏠 Main Menu", callback_data: "main_menu" }
          ]
        ]
      }

      const totalBalance = parseFloat(accountInfo.totalWalletBalance || "0")
      const availableBalance = parseFloat(accountInfo.availableBalance || "0")
      const unrealizedPnl = parseFloat(accountInfo.totalUnrealizedProfit || "0")
      const usedMargin = totalBalance - availableBalance
      const marginRatio = totalBalance > 0 ? (usedMargin / totalBalance) * 100 : 0

      const pnlIcon = unrealizedPnl >= 0 ? "🟢" : "🔴"
      const marginIcon = marginRatio > 80 ? "🚨" : marginRatio > 60 ? "⚠️" : "✅"

      const message = `
💰 <b>Portfolio Overview</b>

💎 <b>Total Balance:</b> $${totalBalance.toFixed(2)}
⚡ <b>Available:</b> $${availableBalance.toFixed(2)}
📊 <b>Unrealized P&L:</b> ${pnlIcon} $${unrealizedPnl.toFixed(2)}
🔒 <b>Used Margin:</b> $${usedMargin.toFixed(2)}

📈 <b>Margin Status:</b> ${marginIcon} ${marginRatio.toFixed(1)}%
${marginRatio > 90 ? "🚨 <i>Critical - Risk of liquidation</i>" :
  marginRatio > 80 ? "⚠️ <i>High - Consider reducing exposure</i>" :
  marginRatio > 60 ? "⚠️ <i>Moderate - Monitor closely</i>" :
  "✅ <i>Safe - Good margin health</i>"}

💹 <b>Portfolio Metrics:</b>
📊 Total Equity: $${totalBalance.toFixed(2)}
⚖️ Leverage Used: ${(usedMargin > 0 ? totalBalance / availableBalance : 1).toFixed(2)}x
📈 Buying Power: $${(availableBalance * (accountInfo.maxLeverage || 1)).toFixed(2)}

⏰ <i>Last updated: ${new Date().toLocaleTimeString()}</i>
      `

      if (messageId) {
        await this.editMessage(messageId, message, chatId, keyboard)
      } else {
        await this.sendMessage(message, "HTML", chatId, keyboard)
      }
    } catch (error) {
      const errorMessage = "❌ Failed to load portfolio information"
      const keyboard: InlineKeyboard = {
        inline_keyboard: [
          [
            { text: "🔄 Retry", callback_data: "refresh_portfolio" },
            { text: "🏠 Main Menu", callback_data: "main_menu" }
          ]
        ]
      }
      
      if (messageId) {
        await this.editMessage(messageId, errorMessage, chatId, keyboard)
      } else {
        await this.sendMessage(errorMessage, "HTML", chatId, keyboard)
      }
    }
  }

  private async showPositionsMenu(chatId: string, messageId?: number): Promise<void> {
    try {
      const positions = await this.getCachedData("positions", () => getPositions())
      const openPositions = positions.filter((p: any) => parseFloat(p.positionAmt || "0") !== 0)

      const keyboard: InlineKeyboard = {
        inline_keyboard: [
          [
            { text: "📋 View All", callback_data: "positions_page:0" },
            { text: "🔄 Refresh", callback_data: "refresh_positions" }
          ],
          [
            { text: "📊 P&L Summary", callback_data: "pnl" },
            { text: "📈 Performance", callback_data: "performance" }
          ],
          [
            { text: "🏠 Main Menu", callback_data: "main_menu" }
          ]
        ]
      }

      if (openPositions.length === 0) {
        const message = `
📊 <b>Position Manager</b>

📈 <b>Open Positions:</b> 0
💰 <b>Total P&L:</b> $0.00

🎯 <i>No active positions</i>
✨ Ready for new opportunities!

Use the trading panel to start automated trading or manually open positions.
        `

        if (messageId) {
          await this.editMessage(messageId, message, chatId, keyboard)
        } else {
          await this.sendMessage(message, "HTML", chatId, keyboard)
        }
        return
      }

      let totalPnl = 0
      let winningPositions = 0
      let losingPositions = 0

      for (const position of openPositions) {
        const pnl = parseFloat(position.unrealizedPnl || "0")
        totalPnl += pnl
        if (pnl > 0) winningPositions++
        else if (pnl < 0) losingPositions++
      }

      const totalPnlIcon = totalPnl >= 0 ? "🟢" : "🔴"
      const winRate = openPositions.length > 0 ? (winningPositions / openPositions.length * 100).toFixed(1) : "0"

      const message = `
📊 <b>Position Manager</b>

📈 <b>Open Positions:</b> ${openPositions.length}
💰 <b>Total Unrealized P&L:</b> ${totalPnlIcon} $${totalPnl.toFixed(2)}

📊 <b>Position Breakdown:</b>
🟢 Winning: ${winningPositions}
🔴 Losing: ${losingPositions}
⚖️ Breakeven: ${openPositions.length - winningPositions - losingPositions}

📈 <b>Win Rate:</b> ${winRate}%

<i>Select an option to manage your positions:</i>
      `

      if (messageId) {
        await this.editMessage(messageId, message, chatId, keyboard)
      } else {
        await this.sendMessage(message, "HTML", chatId, keyboard)
      }
    } catch (error) {
      const errorMessage = "❌ Failed to load positions"
      const keyboard: InlineKeyboard = {
        inline_keyboard: [
          [
            { text: "🔄 Retry", callback_data: "refresh_positions" },
            { text: "🏠 Main Menu", callback_data: "main_menu" }
          ]
        ]
      }
      
      if (messageId) {
        await this.editMessage(messageId, errorMessage, chatId, keyboard)
      } else {
        await this.sendMessage(errorMessage, "HTML", chatId, keyboard)
      }
    }
  }

  private async showAlertsMenu(chatId: string, messageId?: number): Promise<void> {
    const keyboard: InlineKeyboard = {
      inline_keyboard: [
        [
          { text: "💲 Price Alerts", callback_data: "price_alerts" },
          { text: "📊 P&L Alerts", callback_data: "pnl_alerts" }
        ],
        [
          { text: "🔔 System Alerts", callback_data: "system_alerts" },
          { text: "⚠️ Risk Alerts", callback_data: "risk_settings" }
        ],
        [
          { text: "🔔 Notification Settings", callback_data: "notification_settings" }
        ],
        [
          { text: "🏠 Main Menu", callback_data: "main_menu" }
        ]
      ]
    }

    const message = `
🚨 <b>Alert Management Center</b>

🎯 <b>Available Alert Types:</b>

💲 <b>Price Alerts</b>
Set alerts for specific price levels

📊 <b>P&L Alerts</b>
Get notified about profit/loss thresholds

🔔 <b>System Alerts</b>
Bot status and system notifications

⚠️ <b>Risk Alerts</b>
Margin and risk management warnings

🔧 <b>Features:</b>
• Real-time notifications
• Customizable thresholds
• Multiple alert types
• Smart filtering

<i>Choose an alert type to configure:</i>
    `

    if (messageId) {
      await this.editMessage(messageId, message, chatId, keyboard)
    } else {
      await this.sendMessage(message, "HTML", chatId, keyboard)
    }
  }

  private async showSettingsMenu(chatId: string, messageId?: number): Promise<void> {
    const keyboard: InlineKeyboard = {
      inline_keyboard: [
        [
          { text: "🛡️ Risk Management", callback_data: "risk_settings" },
          { text: "🔔 Notifications", callback_data: "notification_settings" }
        ],
        [
          { text: "🔑 API Settings", callback_data: "api_settings" },
          { text: "🎮 Trading Config", callback_data: "trading_config" }
        ],
        [
          { text: "🔒 Security", callback_data: "security_settings" },
          { text: "🎨 Interface", callback_data: "interface_settings" }
        ],
        [
          { text: "🏠 Main Menu", callback_data: "main_menu" }
        ]
      ]
    }

    const message = `
⚙️ <b>Settings & Configuration</b>

🎛️ <b>Configuration Options:</b>

🛡️ <b>Risk Management</b>
Stop loss, take profit, position sizing

🔔 <b>Notifications</b>
Alert preferences and delivery settings

🔑 <b>API Settings</b>
Exchange connections and permissions

🎮 <b>Trading Configuration</b>
Strategy parameters and automation

🔒 <b>Security</b>
Access control and safety features

🎨 <b>Interface</b>
Display preferences and customization

<i>Select a category to configure:</i>
    `

    if (messageId) {
      await this.editMessage(messageId, message, chatId, keyboard)
    } else {
      await this.sendMessage(message, "HTML", chatId, keyboard)
    }
  }

  private async showAnalyticsMenu(chatId: string, messageId?: number): Promise<void> {
    const keyboard: InlineKeyboard = {
      inline_keyboard: [
        [
          { text: "📈 Performance", callback_data: "performance" },
          { text: "📊 Statistics", callback_data: "statistics" }
        ],
        [
          { text: "📋 Reports", callback_data: "reports" },
          { text: "🎯 Strategy Analysis", callback_data: "strategy_analysis" }
        ],
        [
          { text: "📊 Market Analysis", callback_data: "market_analysis" },
          { text: "🔍 Risk Analysis", callback_data: "risk_analysis" }
        ],
        [
          { text: "🏠 Main Menu", callback_data: "main_menu" }
        ]
      ]
    }

    const message = `
📊 <b>Analytics & Performance</b>

📈 <b>Available Analytics:</b>

📈 <b>Performance Metrics</b>
Returns, Sharpe ratio, drawdown analysis

📊 <b>Trading Statistics</b>
Win rate, profit factor, trade analysis

📋 <b>Detailed Reports</b>
Daily, weekly, monthly summaries

🎯 <b>Strategy Analysis</b>
Strategy performance and optimization

📊 <b>Market Analysis</b>
Market trends and opportunities

🔍 <b>Risk Analysis</b>
Risk metrics and exposure analysis

<i>Select an analytics category:</i>
    `

    if (messageId) {
      await this.editMessage(messageId, message, chatId, keyboard)
    } else {
      await this.sendMessage(message, "HTML", chatId, keyboard)
    }
  }

  private async showToolsMenu(chatId: string, messageId?: number): Promise<void> {
    const keyboard: InlineKeyboard = {
      inline_keyboard: [
        [
          { text: "🧮 Position Calculator", callback_data: "calculator" },
          { text: "🔍 Market Scanner", callback_data: "market_scanner" }
        ],
        [
          { text: "📊 Signal Analyzer", callback_data: "signal_analyzer" },
          { text: "📈 Chart Tools", callback_data: "chart_tools" }
        ],
        [
          { text: "💱 Currency Converter", callback_data: "currency_converter" },
          { text: "📋 Trade Planner", callback_data: "trade_planner" }
        ],
        [
          { text: "🏠 Main Menu", callback_data: "main_menu" }
        ]
      ]
    }

    const message = `
🛠️ <b>Trading Tools & Utilities</b>

🔧 <b>Available Tools:</b>

🧮 <b>Position Calculator</b>
Calculate position sizes and risk

🔍 <b>Market Scanner</b>
Find trading opportunities

📊 <b>Signal Analyzer</b>
Technical analysis and signals

📈 <b>Chart Tools</b>
Advanced charting features

💱 <b>Currency Converter</b>
Multi-currency calculations

📋 <b>Trade Planner</b>
Plan and analyze trades

🎯 <b>Features:</b>
• Real-time calculations
• Risk assessment tools
• Market opportunity detection
• Technical analysis

<i>Select a tool to use:</i>
    `

    if (messageId) {
      await this.editMessage(messageId, message, chatId, keyboard)
    } else {
      await this.sendMessage(message, "HTML", chatId, keyboard)
    }
  }

  private async showHelpMenu(chatId: string, messageId?: number): Promise<void> {
    const keyboard: InlineKeyboard = {
      inline_keyboard: [
        [
          { text: "🚀 Getting Started", callback_data: "help_getting_started" },
          { text: "🎮 Trading Guide", callback_data: "help_trading" }
        ],
        [
          { text: "🔧 Features Overview", callback_data: "help_features" },
          { text: "❓ FAQ", callback_data: "help_faq" }
        ],
        [
          { text: "🆘 Support", callback_data: "help_support" },
          { text: "📖 Documentation", callback_data: "help_docs" }
        ],
        [
          { text: "🏠 Main Menu", callback_data: "main_menu" }
        ]
      ]
    }

    const message = `
❓ <b>Help & Support Center</b>

📚 <b>Available Resources:</b>

🚀 <b>Getting Started</b>
Quick setup and first steps

🎮 <b>Trading Guide</b>
How to use trading features

🔧 <b>Features Overview</b>
Complete feature walkthrough

❓ <b>Frequently Asked Questions</b>
Common questions and answers

🆘 <b>Support</b>
Get help with issues

📖 <b>Documentation</b>
Detailed user manual

🎯 <b>Quick Tips:</b>
• Use buttons for easier navigation
• Check status regularly
• Set up alerts for important events
• Review settings periodically

<i>Choose a help topic:</i>
    `

    if (messageId) {
      await this.editMessage(messageId, message, chatId, keyboard)
    } else {
      await this.sendMessage(message, "HTML", chatId, keyboard)
    }
  }

  // =======================
  // ACTION METHODS
  // =======================

  private async confirmAction(
    chatId: string, 
    messageId: number, 
    confirmCallback: string, 
    actionTitle: string, 
    confirmText: string
  ): Promise<void> {
    const keyboard: InlineKeyboard = {
      inline_keyboard: [
        [
          { text: "✅ Confirm", callback_data: confirmCallback },
          { text: "❌ Cancel", callback_data: "cancel" }
        ]
      ]
    }

    const message = `
⚠️ <b>${actionTitle}</b>

${confirmText}

<i>This action cannot be undone.</i>
    `

    await this.editMessage(messageId, message, chatId, keyboard)
  }

  private async executeStartTrading(chatId: string, messageId: number): Promise<void> {
    try {
      await startTradingBot()
      const message = `
🚀 <b>Trading Started Successfully</b>

✅ Automated trading is now active
🔍 Monitoring markets for opportunities
📊 Strategy: Multi-indicator analysis
⚡ Real-time signal processing enabled

The bot will now analyze market conditions and execute trades based on your configured strategy.
      `
      
      const keyboard: InlineKeyboard = {
        inline_keyboard: [
          [
            { text: "📊 View Status", callback_data: "trading_status" },
            { text: "📈 Monitor Positions", callback_data: "positions" }
          ],
          [
            { text: "🏠 Main Menu", callback_data: "main_menu" }
          ]
        ]
      }

      await this.editMessage(messageId, message, chatId, keyboard)
    } catch (error) {
      const errorMessage = "❌ Failed to start trading bot"
      const keyboard: InlineKeyboard = {
        inline_keyboard: [
          [
            { text: "🔄 Retry", callback_data: "start_trading" },
            { text: "🏠 Main Menu", callback_data: "main_menu" }
          ]
        ]
      }
      await this.editMessage(messageId, errorMessage, chatId, keyboard)
    }
  }

  private async executeStopTrading(chatId: string, messageId: number): Promise<void> {
    try {
      await stopTradingBot()
      const message = `
⏹️ <b>Trading Stopped Successfully</b>

✅ Automated trading has been paused
📊 Existing positions remain open
🔒 No new positions will be opened
⏸️ Signal monitoring paused

You can restart trading at any time from the trading panel.
      `
      
      const keyboard: InlineKeyboard = {
        inline_keyboard: [
          [
            { text: "🚀 Restart Trading", callback_data: "start_trading" },
            { text: "📈 View Positions", callback_data: "positions" }
          ],
          [
            { text: "🏠 Main Menu", callback_data: "main_menu" }
          ]
        ]
      }

      await this.editMessage(messageId, message, chatId, keyboard)
    } catch (error) {
      const errorMessage = "❌ Failed to stop trading bot"
      const keyboard: InlineKeyboard = {
        inline_keyboard: [
          [
            { text: "🔄 Retry", callback_data: "stop_trading" },
            { text: "🏠 Main Menu", callback_data: "main_menu" }
          ]
        ]
      }
      await this.editMessage(messageId, errorMessage, chatId, keyboard)
    }
  }

  private async executeEmergencyStop(chatId: string, messageId: number): Promise<void> {
    try {
      await emergencyStopTradingBot()
      const message = `
🚨 <b>EMERGENCY STOP EXECUTED</b>

🛑 All systems halted immediately
❌ All positions have been closed
⏹️ Trading bot stopped
🔒 System locked for safety

📋 <b>Next Steps:</b>
1. Review your account status
2. Check position closure confirmations
3. Analyze what triggered the emergency stop
4. Adjust settings before restarting

<b>Important:</b> Please review your account before restarting automated trading.
      `
      
      const keyboard: InlineKeyboard = {
        inline_keyboard: [
          [
            { text: "📊 Check Status", callback_data: "status" },
            { text: "💰 View Portfolio", callback_data: "portfolio" }
          ],
          [
            { text: "🏠 Main Menu", callback_data: "main_menu" }
          ]
        ]
      }

      await this.editMessage(messageId, message, chatId, keyboard)
    } catch (error) {
      const errorMessage = "❌ Failed to execute emergency stop"
      const keyboard: InlineKeyboard = {
        inline_keyboard: [
          [
            { text: "🔄 Retry", callback_data: "emergency_stop" },
            { text: "🏠 Main Menu", callback_data: "main_menu" }
          ]
        ]
      }
      await this.editMessage(messageId, errorMessage, chatId, keyboard)
    }
  }

  // =======================
  // PLACEHOLDER METHODS (to be implemented)
  // =======================

  private async showQuickStatus(chatId: string, messageId: number): Promise<void> {
    const message = "⚡ <b>Quick Status</b>\n\n<i>Feature coming soon...</i>"
    const keyboard: InlineKeyboard = {
      inline_keyboard: [
        [{ text: "🏠 Main Menu", callback_data: "main_menu" }]
      ]
    }
    await this.editMessage(messageId, message, chatId, keyboard)
  }

  private async showTradingStatus(chatId: string, messageId: number): Promise<void> {
    const message = "📊 <b>Trading Status</b>\n\n<i>Feature coming soon...</i>"
    const keyboard: InlineKeyboard = {
      inline_keyboard: [
        [{ text: "🏠 Main Menu", callback_data: "main_menu" }]
      ]
    }
    await this.editMessage(messageId, message, chatId, keyboard)
  }

  private async showBalance(chatId: string, messageId: number): Promise<void> {
    const message = "💰 <b>Balance Details</b>\n\n<i>Feature coming soon...</i>"
    const keyboard: InlineKeyboard = {
      inline_keyboard: [
        [{ text: "🏠 Main Menu", callback_data: "main_menu" }]
      ]
    }
    await this.editMessage(messageId, message, chatId, keyboard)
  }

  private async showPnL(chatId: string, messageId: number): Promise<void> {
    const message = "📊 <b>P&L Analysis</b>\n\n<i>Feature coming soon...</i>"
    const keyboard: InlineKeyboard = {
      inline_keyboard: [
        [{ text: "🏠 Main Menu", callback_data: "main_menu" }]
      ]
    }
    await this.editMessage(messageId, message, chatId, keyboard)
  }

  private async showPositionsList(chatId: string, messageId: number, page: number): Promise<void> {
    const message = `📋 <b>Positions List - Page ${page + 1}</b>\n\n<i>Feature coming soon...</i>`
    const keyboard: InlineKeyboard = {
      inline_keyboard: [
        [{ text: "🏠 Main Menu", callback_data: "main_menu" }]
      ]
    }
    await this.editMessage(messageId, message, chatId, keyboard)
  }

  private async showPositionDetail(chatId: string, messageId: number, symbol: string): Promise<void> {
    const message = `📊 <b>Position: ${symbol}</b>\n\n<i>Feature coming soon...</i>`
    const keyboard: InlineKeyboard = {
      inline_keyboard: [
        [{ text: "🏠 Main Menu", callback_data: "main_menu" }]
      ]
    }
    await this.editMessage(messageId, message, chatId, keyboard)
  }

  private async executeClosePosition(chatId: string, messageId: number, symbol: string): Promise<void> {
    const message = `⏹️ <b>Closing Position: ${symbol}</b>\n\n<i>Feature coming soon...</i>`
    const keyboard: InlineKeyboard = {
      inline_keyboard: [
        [{ text: "🏠 Main Menu", callback_data: "main_menu" }]
      ]
    }
    await this.editMessage(messageId, message, chatId, keyboard)
  }

  private async showPriceAlerts(chatId: string, messageId: number): Promise<void> {
    const message = "💲 <b>Price Alerts</b>\n\n<i>Feature coming soon...</i>"
    const keyboard: InlineKeyboard = {
      inline_keyboard: [
        [{ text: "🏠 Main Menu", callback_data: "main_menu" }]
      ]
    }
    await this.editMessage(messageId, message, chatId, keyboard)
  }

  private async showPnLAlerts(chatId: string, messageId: number): Promise<void> {
    const message = "📊 <b>P&L Alerts</b>\n\n<i>Feature coming soon...</i>"
    const keyboard: InlineKeyboard = {
      inline_keyboard: [
        [{ text: "🏠 Main Menu", callback_data: "main_menu" }]
      ]
    }
    await this.editMessage(messageId, message, chatId, keyboard)
  }

  private async showSystemAlerts(chatId: string, messageId: number): Promise<void> {
    const message = "🔔 <b>System Alerts</b>\n\n<i>Feature coming soon...</i>"
    const keyboard: InlineKeyboard = {
      inline_keyboard: [
        [{ text: "🏠 Main Menu", callback_data: "main_menu" }]
      ]
    }
    await this.editMessage(messageId, message, chatId, keyboard)
  }

  private async showRiskSettings(chatId: string, messageId: number): Promise<void> {
    const message = "🛡️ <b>Risk Settings</b>\n\n<i>Feature coming soon...</i>"
    const keyboard: InlineKeyboard = {
      inline_keyboard: [
        [{ text: "🏠 Main Menu", callback_data: "main_menu" }]
      ]
    }
    await this.editMessage(messageId, message, chatId, keyboard)
  }

  private async showNotificationSettings(chatId: string, messageId: number): Promise<void> {
    const message = "🔔 <b>Notification Settings</b>\n\n<i>Feature coming soon...</i>"
    const keyboard: InlineKeyboard = {
      inline_keyboard: [
        [{ text: "🏠 Main Menu", callback_data: "main_menu" }]
      ]
    }
    await this.editMessage(messageId, message, chatId, keyboard)
  }

  private async showApiSettings(chatId: string, messageId: number): Promise<void> {
    const message = "🔑 <b>API Settings</b>\n\n<i>Feature coming soon...</i>"
    const keyboard: InlineKeyboard = {
      inline_keyboard: [
        [{ text: "🏠 Main Menu", callback_data: "main_menu" }]
      ]
    }
    await this.editMessage(messageId, message, chatId, keyboard)
  }

  private async showPerformance(chatId: string, messageId: number): Promise<void> {
    const message = "📈 <b>Performance</b>\n\n<i>Feature coming soon...</i>"
    const keyboard: InlineKeyboard = {
      inline_keyboard: [
        [{ text: "🏠 Main Menu", callback_data: "main_menu" }]
      ]
    }
    await this.editMessage(messageId, message, chatId, keyboard)
  }

  private async showStatistics(chatId: string, messageId: number): Promise<void> {
    const message = "📊 <b>Statistics</b>\n\n<i>Feature coming soon...</i>"
    const keyboard: InlineKeyboard = {
      inline_keyboard: [
        [{ text: "🏠 Main Menu", callback_data: "main_menu" }]
      ]
    }
    await this.editMessage(messageId, message, chatId, keyboard)
  }

  private async showReports(chatId: string, messageId: number): Promise<void> {
    const message = "📋 <b>Reports</b>\n\n<i>Feature coming soon...</i>"
    const keyboard: InlineKeyboard = {
      inline_keyboard: [
        [{ text: "🏠 Main Menu", callback_data: "main_menu" }]
      ]
    }
    await this.editMessage(messageId, message, chatId, keyboard)
  }

  private async showCalculator(chatId: string, messageId: number): Promise<void> {
    const message = "🧮 <b>Position Calculator</b>\n\n<i>Feature coming soon...</i>"
    const keyboard: InlineKeyboard = {
      inline_keyboard: [
        [{ text: "🏠 Main Menu", callback_data: "main_menu" }]
      ]
    }
    await this.editMessage(messageId, message, chatId, keyboard)
  }

  private async showMarketScanner(chatId: string, messageId: number): Promise<void> {
    const message = "🔍 <b>Market Scanner</b>\n\n<i>Feature coming soon...</i>"
    const keyboard: InlineKeyboard = {
      inline_keyboard: [
        [{ text: "🏠 Main Menu", callback_data: "main_menu" }]
      ]
    }
    await this.editMessage(messageId, message, chatId, keyboard)
  }

  private async showSignalAnalyzer(chatId: string, messageId: number): Promise<void> {
    const message = "📊 <b>Signal Analyzer</b>\n\n<i>Feature coming soon...</i>"
    const keyboard: InlineKeyboard = {
      inline_keyboard: [
        [{ text: "🏠 Main Menu", callback_data: "main_menu" }]
      ]
    }
    await this.editMessage(messageId, message, chatId, keyboard)
  }

  // =======================
  // NOTIFICATION METHODS
  // =======================

  async notifyTradeExecuted(trade: {
    symbol: string
    side: string
    quantity: string
    price: string
    confidence: number
    indicators: {
      rsi: number
      macd: number
      bollinger: string
      volume: number
    }
  }): Promise<void> {
    const emoji = trade.side === "BUY" ? "🟢" : "🔴"
    const confidenceEmoji = trade.confidence > 0.8 ? "🔥" : trade.confidence > 0.6 ? "✅" : "⚠️"
    
    const keyboard: InlineKeyboard = {
      inline_keyboard: [
        [
          { text: "📊 View Status", callback_data: "status" },
          { text: "📈 Positions", callback_data: "positions" }
        ],
        [
          { text: "🏠 Main Menu", callback_data: "main_menu" }
        ]
      ]
    }
    
    const message = `
${emoji} <b>Trade Executed</b> ${confidenceEmoji}

📊 <b>${trade.symbol}</b>
📍 Side: <b>${trade.side}</b>
📈 Quantity: <b>${trade.quantity}</b>
💰 Price: <b>$${trade.price}</b>
🎯 Confidence: <b>${(trade.confidence * 100).toFixed(1)}%</b>

📊 <b>Technical Indicators:</b>
RSI: <b>${trade.indicators.rsi.toFixed(2)}</b>
MACD: <b>${trade.indicators.macd.toFixed(4)}</b>
Bollinger: <b>${trade.indicators.bollinger}</b>
Volume: <b>${trade.indicators.volume.toLocaleString()}</b>

⏰ <i>${new Date().toLocaleString()}</i>
    `
    
    for (const chatId of this.authorizedChatIds) {
      await this.sendMessage(message, "HTML", chatId, keyboard)
    }
  }

  async notifyPositionClosed(symbol: string, pnl: number, reason: string): Promise<void> {
    const emoji = pnl >= 0 ? "🟢" : "🔴"
    const pnlEmoji = pnl >= 0 ? "💰" : "💸"
    
    const keyboard: InlineKeyboard = {
      inline_keyboard: [
        [
          { text: "📊 Portfolio", callback_data: "portfolio" },
          { text: "📈 Performance", callback_data: "performance" }
        ],
        [
          { text: "🏠 Main Menu", callback_data: "main_menu" }
        ]
      ]
    }
    
    const message = `
⏹️ <b>Position Closed</b> ${pnlEmoji}

📊 Symbol: <b>${symbol}</b>
💎 P&L: ${emoji} <b>$${pnl.toFixed(2)}</b>
📝 Reason: <b>${reason}</b>

⏰ <i>${new Date().toLocaleString()}</i>
    `
    
    for (const chatId of this.authorizedChatIds) {
      await this.sendMessage(message, "HTML", chatId, keyboard)
    }
  }

  async notifyRiskAlert(alertMessage: string, severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'MEDIUM'): Promise<void> {
    const emojis = {
      LOW: "ℹ️",
      MEDIUM: "⚠️",
      HIGH: "🚨",
      CRITICAL: "🆘"
    }
    
    const keyboard: InlineKeyboard = {
      inline_keyboard: [
        [
          { text: "📊 Check Status", callback_data: "status" },
          { text: "🛡️ Risk Settings", callback_data: "risk_settings" }
        ],
        [
          { text: "🏠 Main Menu", callback_data: "main_menu" }
        ]
      ]
    }
    
    const message = `
${emojis[severity]} <b>Risk Alert - ${severity}</b>

${alertMessage}

⏰ <i>${new Date().toLocaleString()}</i>
    `
    
    for (const chatId of this.authorizedChatIds) {
      await this.sendMessage(message, "HTML", chatId, keyboard)
    }
  }

  async notifySystemEvent(event: string, details?: string): Promise<void> {
    const keyboard: InlineKeyboard = {
      inline_keyboard: [
        [
          { text: "📊 Status", callback_data: "status" },
          { text: "🏠 Main Menu", callback_data: "main_menu" }
        ]
      ]
    }
    
    const message = `
🔔 <b>System Event</b>

📋 Event: <b>${event}</b>
${details ? `📝 Details: ${details}` : ""}

⏰ <i>${new Date().toLocaleString()}</i>
    `
    
    for (const chatId of this.authorizedChatIds) {
      await this.sendMessage(message, "HTML", chatId, keyboard)
    }
  }

  // Cleanup method for maintenance
  cleanupSessions(): void {
    const now = Date.now()
    const thirtyMinutes = 30 * 60 * 1000
    
    for (const [userId, session] of this.userSessions.entries()) {
      if (now - session.lastActivity > thirtyMinutes) {
        this.userSessions.delete(userId)
      }
    }
    
    // Cleanup cache
    for (const [key, cached] of this.cache.entries()) {
      if (now - cached.timestamp > this.config.cacheTTL) {
        this.cache.delete(key)
      }
    }
  }
}

export const telegramBot = new TelegramBot()

// Cleanup sessions every 30 minutes
setInterval(() => telegramBot.cleanupSessions(), 30 * 60 * 1000)