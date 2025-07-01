"use client"
import { TradingDashboard } from "@/components/trading-dashboard"
import { SidebarProvider } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"

export default function Home() {
  return (
    <SidebarProvider defaultOpen={true}>
      <div className="flex min-h-screen bg-slate-950">
        <AppSidebar />
        <main className="flex-1 overflow-hidden">
          <TradingDashboard />
        </main>
      </div>
    </SidebarProvider>
  )
}
