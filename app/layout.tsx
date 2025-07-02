import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { EnterpriseDataProvider } from "@/components/enterprise-data-provider"
import { Toaster } from "@/components/ui/toaster"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "QuantumTrade Pro - Advanced Cryptocurrency Trading Platform",
  description:
    "Professional-grade cryptocurrency trading ecosystem with intelligent market analysis, automated trading execution, and comprehensive risk management.",
    generator: 'v0.dev'
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <body className={inter.className}>
        <EnterpriseDataProvider>
          {children}
          <Toaster />
        </EnterpriseDataProvider>
      </body>
    </html>
  )
}
