import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Cache utility for API responses
export class APICache {
  private cache = new Map<string, { data: any; timestamp: number; ttl: number }>()

  set(key: string, data: any, ttl: number = 30000) {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    })
  }

  get(key: string): any | null {
    const item = this.cache.get(key)
    if (!item) return null

    const isExpired = Date.now() - item.timestamp > item.ttl
    if (isExpired) {
      this.cache.delete(key)
      return null
    }

    return item.data
  }

  clear() {
    this.cache.clear()
  }

  size() {
    return this.cache.size
  }
}

// Rate limiting utility
export class RateLimiter {
  private lastRequestTime = 0
  private requestCount = 0
  private readonly minDelay: number

  constructor(minDelay: number = 100) {
    this.minDelay = minDelay
  }

  async waitForNextRequest(): Promise<void> {
    const now = Date.now()
    const timeSinceLastRequest = now - this.lastRequestTime
    
    if (timeSinceLastRequest < this.minDelay) {
      await new Promise(resolve => 
        setTimeout(resolve, this.minDelay - timeSinceLastRequest)
      )
    }
    
    this.lastRequestTime = Date.now()
    this.requestCount++
  }

  getRequestCount(): number {
    return this.requestCount
  }

  reset(): void {
    this.requestCount = 0
    this.lastRequestTime = 0
  }
}
