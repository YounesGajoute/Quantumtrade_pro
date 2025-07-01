"use client"

import { BarChart3, Bot, TrendingUp, Wallet, AlertTriangle, MessageSquare, Activity } from "lucide-react"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { usePathname } from "next/navigation"

const menuItems = [
  {
    title: "Dashboard",
    icon: BarChart3,
    href: "/",
  },
  {
    title: "Trading Bot",
    icon: Bot,
    href: "/trading-bot",
    badge: "ACTIVE",
  },
  {
    title: "Signals",
    icon: TrendingUp,
    href: "/signals",
    badge: "12",
  },
  {
    title: "Portfolio",
    icon: Wallet,
    href: "/portfolio",
  },
  {
    title: "Risk Management",
    icon: AlertTriangle,
    href: "/risk-management",
  },
  {
    title: "Telegram Bot",
    icon: MessageSquare,
    href: "/telegram-bot",
  },
]

export function AppSidebar() {
  const pathname = usePathname()

  return (
    <Sidebar className="border-r border-slate-800">
      <SidebarHeader className="border-b border-slate-800 p-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
            <Activity className="w-4 h-4 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">QuantumTrade</h2>
            <p className="text-xs text-slate-400">Pro Trading Platform</p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-slate-400">Trading</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <Link href={item.href} className="w-full">
                    <SidebarMenuButton
                      isActive={pathname === item.href}
                      className="text-slate-300 hover:text-white hover:bg-slate-800 w-full"
                    >
                      <item.icon className="w-4 h-4" />
                      <span>{item.title}</span>
                      {item.badge && (
                        <Badge variant={item.badge === "ACTIVE" ? "default" : "secondary"} className="ml-auto text-xs">
                          {item.badge}
                        </Badge>
                      )}
                    </SidebarMenuButton>
                  </Link>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-slate-800 p-4">
        <div className="flex items-center gap-2 text-sm">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          <span className="text-slate-400">System Online</span>
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}
