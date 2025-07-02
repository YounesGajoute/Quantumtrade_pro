# Enhanced Processing Engine Implementation Guide

## Overview

This document outlines the step-by-step implementation of the enhanced processing engine for QuantumTrade Pro Enterprise, featuring parallel processing, multi-tier caching, intelligent rate limiting, and comprehensive monitoring.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Step 1: Processing Engine Refactoring](#step-1-processing-engine-refactoring)
3. [Step 2: Redis and TimescaleDB Integration](#step-2-redis-and-timescaledb-integration)
4. [Step 3: Rate Limiter and Data Retention](#step-3-rate-limiter-and-data-retention)
5. [Step 4: API Endpoint Updates](#step-4-api-endpoint-updates)
6. [Step 5: Monitoring and Metrics](#step-5-monitoring-and-metrics)
7. [Performance Targets](#performance-targets)
8. [Deployment Guide](#deployment-guide)
9. [Troubleshooting](#troubleshooting)

## Architecture Overview

The enhanced processing engine implements a multi-layered architecture:

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend Dashboard                       │
├─────────────────────────────────────────────────────────────┤
│                    API Gateway Layer                        │
├─────────────────────────────────────────────────────────────┤
│              Enhanced Processing Engine                     │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐          │
│  │   Worker    │ │   Worker    │ │   Worker    │          │
│  │   Pool 1    │ │   Pool 2    │ │   Pool N    │          │
│  └─────────────┘ └─────────────┘ └─────────────┘          │
├─────────────────────────────────────────────────────────────┤
│                    Cache Layer                              │
│  ┌─────────────┐ ┌─────────────┐                          │
│  │   Redis     │ │ TimescaleDB │                          │
│  │   (L1)      │ │    (L2)     │                          │
│  └─────────────┘ └─────────────┘                          │
├─────────────────────────────────────────────────────────────┤
│                    External APIs                            │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐          │
│  │   Binance   │ │   Coinbase  │ │   Kraken    │          │
│  │     API     │ │     API     │ │     API     │          │
│  └─────────────┘ └─────────────┘ └─────────────┘          │
└─────────────────────────────────────────────────────────────┘
```

## Step 1: Processing Engine Refactoring

### Status
- ✅ `lib/core/enhanced-processing-engine.ts` already implements parallel batch processing
- ✅ Multi-timeframe support (1m, 5m, 15m, 1h, 4h, 1d)
- ✅ In-memory caching and processing

### Next Steps
- 🔄 Integrate real Redis and TimescaleDB for L1/L2 cache
- 🔄 Refactor cache logic to use external storage
- 🔄 Implement data persistence and retention

### Current Engine Features
```typescript
// Key features already implemented:
- Parallel batch processing with configurable worker pools
- Multi-timeframe data aggregation (1m, 5m, 15m, 1h, 4h, 1d)
- In-memory caching with TTL management
- Real-time processing metrics
- Adaptive resource allocation
- Error handling and retry logic
```

## Step 2: Redis and TimescaleDB Integration

### 2.1 Install Dependencies

```bash
# Install Redis client
npm install ioredis

# Install PostgreSQL/TimescaleDB client
npm install pg @types/pg

# Install additional utilities
npm install node-cron @types/node-cron
```

### 2.2 Create Cache Manager

**File: `lib/core/cache-manager.ts`**

```typescript
import Redis from 'ioredis';
import { Pool } from 'pg';

interface CacheConfig {
  redis: {
    host: string;
    port: number;
    password?: string;
    db: number;
  };
  timescale: {
    host: string;
    port: number;
    database: string;
    user: string;
    password: string;
  };
  ttl: {
    l1: number; // Redis TTL in seconds
    l2: number; // TimescaleDB retention in days
  };
}

class CacheManager {
  private redis: Redis;
  private timescale: Pool;
  private config: CacheConfig;

  constructor(config: CacheConfig) {
    this.config = config;
    this.initializeConnections();
  }

  private async initializeConnections() {
    // Initialize Redis connection
    this.redis = new Redis({
      host: this.config.redis.host,
      port: this.config.redis.port,
      password: this.config.redis.password,
      db: this.config.redis.db,
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3,
    });

    // Initialize TimescaleDB connection
    this.timescale = new Pool({
      host: this.config.timescale.host,
      port: this.config.timescale.port,
      database: this.config.timescale.database,
      user: this.config.timescale.user,
      password: this.config.timescale.password,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    // Test connections
    await this.testConnections();
  }

  private async testConnections() {
    try {
      await this.redis.ping();
      await this.timescale.query('SELECT NOW()');
      console.log('✅ Cache connections established');
    } catch (error) {
      console.error('❌ Cache connection failed:', error);
      throw error;
    }
  }

  async get(key: string): Promise<any> {
    try {
      // Try L1 cache (Redis) first
      const l1Data = await this.redis.get(key);
      if (l1Data) {
        return JSON.parse(l1Data);
      }

      // Fall back to L2 cache (TimescaleDB)
      const l2Data = await this.getFromTimescale(key);
      if (l2Data) {
        // Promote to L1 cache
        await this.set(key, l2Data, this.config.ttl.l1);
        return l2Data;
      }

      return null;
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  }

  async set(key: string, value: any, ttl?: number): Promise<void> {
    try {
      const serialized = JSON.stringify(value);
      const finalTtl = ttl || this.config.ttl.l1;

      // Set in L1 cache
      await this.redis.setex(key, finalTtl, serialized);

      // Store in L2 cache for persistence
      await this.setInTimescale(key, value);
    } catch (error) {
      console.error('Cache set error:', error);
    }
  }

  private async getFromTimescale(key: string): Promise<any> {
    const query = 'SELECT data FROM cache_data WHERE key = $1 AND expires_at > NOW()';
    const result = await this.timescale.query(query, [key]);
    return result.rows[0]?.data || null;
  }

  private async setInTimescale(key: string, value: any): Promise<void> {
    const query = `
      INSERT INTO cache_data (key, data, created_at, expires_at)
      VALUES ($1, $2, NOW(), NOW() + INTERVAL '${this.config.ttl.l2} days')
      ON CONFLICT (key) DO UPDATE SET
        data = EXCLUDED.data,
        expires_at = EXCLUDED.expires_at
    `;
    await this.timescale.query(query, [key, JSON.stringify(value)]);
  }

  async clear(): Promise<void> {
    await this.redis.flushdb();
    await this.timescale.query('DELETE FROM cache_data');
  }

  async getStats(): Promise<{
    l1Size: number;
    l2Size: number;
    l1HitRate: number;
    l2HitRate: number;
  }> {
    const l1Size = await this.redis.dbsize();
    const l2Result = await this.timescale.query('SELECT COUNT(*) FROM cache_data');
    const l2Size = parseInt(l2Result.rows[0].count);

    return {
      l1Size,
      l2Size,
      l1HitRate: 0, // TODO: Implement hit rate tracking
      l2HitRate: 0,
    };
  }
}

export default CacheManager;
```

### 2.3 Database Schema Setup

**File: `scripts/setup-cache-schema.sql`**

```sql
-- Create cache_data table in TimescaleDB
CREATE TABLE IF NOT EXISTS cache_data (
    key VARCHAR(255) PRIMARY KEY,
    data JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL
);

-- Create hypertable for time-series data
SELECT create_hypertable('cache_data', 'created_at', if_not_exists => TRUE);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_cache_data_expires ON cache_data (expires_at);
CREATE INDEX IF NOT EXISTS idx_cache_data_created ON cache_data (created_at);

-- Create function for automatic cleanup
CREATE OR REPLACE FUNCTION cleanup_expired_cache()
RETURNS void AS $$
BEGIN
    DELETE FROM cache_data WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Create scheduled job for cleanup (runs every hour)
SELECT cron.schedule('cleanup-cache', '0 * * * *', 'SELECT cleanup_expired_cache();');
```

## Step 3: Rate Limiter and Data Retention

### 3.1 Intelligent Rate Limiter

**File: `lib/core/rate-limiter.ts`**

```typescript
interface RateLimitConfig {
  maxRequestsPerMinute: number;
  maxRequestsPerHour: number;
  maxRequestsPerDay: number;
  burstLimit: number;
  retryAfterSeconds: number;
}

class RateLimiter {
  private config: RateLimitConfig;
  private requestCounts: Map<string, number[]> = new Map();
  private burstQueue: Array<() => void> = [];
  private isProcessingBurst = false;

  constructor(config: RateLimitConfig) {
    this.config = config;
    this.startCleanupInterval();
  }

  async checkLimit(identifier: string): Promise<boolean> {
    const now = Date.now();
    const minute = Math.floor(now / 60000);
    const hour = Math.floor(now / 3600000);
    const day = Math.floor(now / 86400000);

    // Get or initialize request counts
    if (!this.requestCounts.has(identifier)) {
      this.requestCounts.set(identifier, [0, 0, 0]); // [minute, hour, day]
    }

    const counts = this.requestCounts.get(identifier)!;

    // Check limits
    if (counts[0] >= this.config.maxRequestsPerMinute ||
        counts[1] >= this.config.maxRequestsPerHour ||
        counts[2] >= this.config.maxRequestsPerDay) {
      return false;
    }

    // Increment counters
    counts[0]++;
    counts[1]++;
    counts[2]++;

    return true;
  }

  async waitForSlot(identifier: string): Promise<void> {
    return new Promise((resolve) => {
      this.burstQueue.push(() => {
        this.checkLimit(identifier).then((allowed) => {
          if (allowed) {
            resolve();
          } else {
            setTimeout(() => this.waitForSlot(identifier), this.config.retryAfterSeconds * 1000);
          }
        });
      });

      if (!this.isProcessingBurst) {
        this.processBurstQueue();
      }
    });
  }

  private async processBurstQueue(): Promise<void> {
    this.isProcessingBurst = true;

    while (this.burstQueue.length > 0) {
      const batch = this.burstQueue.splice(0, this.config.burstLimit);
      
      await Promise.all(batch.map(fn => fn()));
      
      // Small delay between batches
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    this.isProcessingBurst = false;
  }

  private startCleanupInterval(): void {
    setInterval(() => {
      const now = Date.now();
      const currentMinute = Math.floor(now / 60000);
      const currentHour = Math.floor(now / 3600000);
      const currentDay = Math.floor(now / 86400000);

      for (const [identifier, counts] of this.requestCounts.entries()) {
        // Reset counters based on time windows
        if (Math.floor(now / 60000) > currentMinute) counts[0] = 0;
        if (Math.floor(now / 3600000) > currentHour) counts[1] = 0;
        if (Math.floor(now / 86400000) > currentDay) counts[2] = 0;
      }
    }, 60000); // Check every minute
  }

  getStats(): {
    activeIdentifiers: number;
    queueLength: number;
    isProcessingBurst: boolean;
  } {
    return {
      activeIdentifiers: this.requestCounts.size,
      queueLength: this.burstQueue.length,
      isProcessingBurst: this.isProcessingBurst,
    };
  }
}

export default RateLimiter;
```

### 3.2 Data Retention Manager

**File: `lib/core/retention-manager.ts`**

```typescript
import cron from 'node-cron';
import CacheManager from './cache-manager';

interface RetentionConfig {
  dataRetentionDays: {
    marketData: number;
    indicators: number;
    signals: number;
    logs: number;
  };
  cleanupSchedule: string; // Cron expression
  batchSize: number;
}

class RetentionManager {
  private config: RetentionConfig;
  private cacheManager: CacheManager;
  private isRunning = false;

  constructor(config: RetentionConfig, cacheManager: CacheManager) {
    this.config = config;
    this.cacheManager = cacheManager;
    this.startScheduledCleanup();
  }

  private startScheduledCleanup(): void {
    cron.schedule(this.config.cleanupSchedule, () => {
      this.performCleanup();
    });
  }

  async performCleanup(): Promise<void> {
    if (this.isRunning) {
      console.log('Cleanup already in progress, skipping...');
      return;
    }

    this.isRunning = true;
    console.log('Starting data retention cleanup...');

    try {
      const startTime = Date.now();
      let totalCleaned = 0;

      // Clean market data
      totalCleaned += await this.cleanupMarketData();
      
      // Clean indicators
      totalCleaned += await this.cleanupIndicators();
      
      // Clean signals
      totalCleaned += await this.cleanupSignals();
      
      // Clean logs
      totalCleaned += await this.cleanupLogs();

      const duration = Date.now() - startTime;
      console.log(`✅ Cleanup completed: ${totalCleaned} records cleaned in ${duration}ms`);
    } catch (error) {
      console.error('❌ Cleanup failed:', error);
    } finally {
      this.isRunning = false;
    }
  }

  private async cleanupMarketData(): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.config.dataRetentionDays.marketData);

    // Implementation depends on your data structure
    // This is a placeholder for the actual cleanup logic
    return 0;
  }

  private async cleanupIndicators(): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.config.dataRetentionDays.indicators);

    // Implementation depends on your data structure
    return 0;
  }

  private async cleanupSignals(): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.config.dataRetentionDays.signals);

    // Implementation depends on your data structure
    return 0;
  }

  private async cleanupLogs(): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.config.dataRetentionDays.logs);

    // Implementation depends on your data structure
    return 0;
  }

  getStatus(): {
    isRunning: boolean;
    lastCleanup: Date | null;
    nextCleanup: Date | null;
  } {
    return {
      isRunning: this.isRunning,
      lastCleanup: null, // TODO: Track last cleanup time
      nextCleanup: null, // TODO: Calculate next cleanup time
    };
  }
}

export default RetentionManager;
```

## Step 4: API Endpoint Updates

### 4.1 Enhanced Market Data API

**File: `app/api/trading/enhanced-market-data/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import EnhancedProcessingEngine from '@/lib/core/enhanced-processing-engine';
import CacheManager from '@/lib/core/cache-manager';
import RateLimiter from '@/lib/core/rate-limiter';

// Initialize components
const cacheManager = new CacheManager({
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD,
    db: 0,
  },
  timescale: {
    host: process.env.TIMESCALE_HOST || 'localhost',
    port: parseInt(process.env.TIMESCALE_PORT || '5432'),
    database: process.env.TIMESCALE_DB || 'quantumtrade',
    user: process.env.TIMESCALE_USER || 'postgres',
    password: process.env.TIMESCALE_PASSWORD || '',
  },
  ttl: {
    l1: 300, // 5 minutes
    l2: 30,  // 30 days
  },
});

const rateLimiter = new RateLimiter({
  maxRequestsPerMinute: 100,
  maxRequestsPerHour: 1000,
  maxRequestsPerDay: 10000,
  burstLimit: 10,
  retryAfterSeconds: 60,
});

const engine = new EnhancedProcessingEngine({
  cacheManager,
  rateLimiter,
  maxWorkers: 4,
  batchSize: 50,
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const symbols = searchParams.get('symbols')?.split(',') || [];
    const timeframes = searchParams.get('timeframes')?.split(',') || ['1m', '5m', '15m'];
    const includeIndicators = searchParams.get('indicators') === 'true';

    // Rate limiting
    const clientId = request.headers.get('x-client-id') || 'default';
    await rateLimiter.waitForSlot(clientId);

    // Process request
    const result = await engine.processBatch({
      symbols,
      timeframes,
      includeIndicators,
      priority: 'high',
    });

    return NextResponse.json({
      success: true,
      data: result,
      metadata: {
        processedAt: new Date().toISOString(),
        symbolsProcessed: symbols.length,
        timeframesProcessed: timeframes.length,
        cacheHitRate: result.cacheHitRate,
        processingTime: result.processingTime,
      },
    });
  } catch (error) {
    console.error('Enhanced market data API error:', error);
    return NextResponse.json(
      { success: false, error: 'Processing failed' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { symbols, timeframes, includeIndicators, priority } = body;

    // Rate limiting
    const clientId = request.headers.get('x-client-id') || 'default';
    await rateLimiter.waitForSlot(clientId);

    // Process request
    const result = await engine.processBatch({
      symbols: symbols || [],
      timeframes: timeframes || ['1m', '5m', '15m'],
      includeIndicators: includeIndicators || false,
      priority: priority || 'normal',
    });

    return NextResponse.json({
      success: true,
      data: result,
      metadata: {
        processedAt: new Date().toISOString(),
        symbolsProcessed: symbols?.length || 0,
        timeframesProcessed: timeframes?.length || 0,
        cacheHitRate: result.cacheHitRate,
        processingTime: result.processingTime,
      },
    });
  } catch (error) {
    console.error('Enhanced market data API error:', error);
    return NextResponse.json(
      { success: false, error: 'Processing failed' },
      { status: 500 }
    );
  }
}
```

## Step 5: Monitoring and Metrics

### 5.1 Enhanced Dashboard Component

**File: `components/enhanced-processing-monitor.tsx`**

```typescript
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface ProcessingMetrics {
  symbolsPerSecond: number;
  cacheHitRate: number;
  memoryUsage: number;
  apiQuotaUsed: number;
  apiQuotaLimit: number;
  activeWorkers: number;
  queueLength: number;
  processingTime: number;
  errorRate: number;
}

interface CacheMetrics {
  l1Size: number;
  l2Size: number;
  l1HitRate: number;
  l2HitRate: number;
  totalRequests: number;
}

interface RateLimitMetrics {
  activeIdentifiers: number;
  queueLength: number;
  isProcessingBurst: boolean;
  requestsPerMinute: number;
  requestsPerHour: number;
}

export default function EnhancedProcessingMonitor() {
  const [processingMetrics, setProcessingMetrics] = useState<ProcessingMetrics | null>(null);
  const [cacheMetrics, setCacheMetrics] = useState<CacheMetrics | null>(null);
  const [rateLimitMetrics, setRateLimitMetrics] = useState<RateLimitMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const [processingRes, cacheRes, rateLimitRes] = await Promise.all([
          fetch('/api/trading/enhanced-market-data/metrics'),
          fetch('/api/trading/enhanced-market-data/cache-stats'),
          fetch('/api/trading/enhanced-market-data/rate-limit-stats'),
        ]);

        if (processingRes.ok) {
          const processingData = await processingRes.json();
          setProcessingMetrics(processingData);
        }

        if (cacheRes.ok) {
          const cacheData = await cacheRes.json();
          setCacheMetrics(cacheData);
        }

        if (rateLimitRes.ok) {
          const rateLimitData = await rateLimitRes.json();
          setRateLimitMetrics(rateLimitData);
        }
      } catch (error) {
        console.error('Failed to fetch metrics:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMetrics();
    const interval = setInterval(fetchMetrics, 30000); // Update every 30 seconds

    return () => clearInterval(interval);
  }, []);

  if (isLoading) {
    return <div>Loading enhanced processing metrics...</div>;
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="processing" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="processing">Processing</TabsTrigger>
          <TabsTrigger value="cache">Cache</TabsTrigger>
          <TabsTrigger value="rate-limit">Rate Limiting</TabsTrigger>
        </TabsList>

        <TabsContent value="processing" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Symbols/sec</CardTitle>
                <Badge variant="secondary">
                  {processingMetrics?.symbolsPerSecond.toFixed(2) || '0'}
                </Badge>
              </CardHeader>
              <CardContent>
                <Progress 
                  value={Math.min((processingMetrics?.symbolsPerSecond || 0) / 100 * 100, 100)} 
                  className="w-full" 
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Cache Hit Rate</CardTitle>
                <Badge variant="secondary">
                  {(processingMetrics?.cacheHitRate || 0).toFixed(1)}%
                </Badge>
              </CardHeader>
              <CardContent>
                <Progress 
                  value={processingMetrics?.cacheHitRate || 0} 
                  className="w-full" 
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Memory Usage</CardTitle>
                <Badge variant="secondary">
                  {(processingMetrics?.memoryUsage || 0).toFixed(1)}%
                </Badge>
              </CardHeader>
              <CardContent>
                <Progress 
                  value={processingMetrics?.memoryUsage || 0} 
                  className="w-full" 
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">API Quota</CardTitle>
                <Badge variant="secondary">
                  {processingMetrics?.apiQuotaUsed || 0}/{processingMetrics?.apiQuotaLimit || 0}
                </Badge>
              </CardHeader>
              <CardContent>
                <Progress 
                  value={((processingMetrics?.apiQuotaUsed || 0) / (processingMetrics?.apiQuotaLimit || 1)) * 100} 
                  className="w-full" 
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Workers</CardTitle>
                <Badge variant="secondary">
                  {processingMetrics?.activeWorkers || 0}
                </Badge>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {processingMetrics?.activeWorkers || 0}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Error Rate</CardTitle>
                <Badge variant="secondary">
                  {(processingMetrics?.errorRate || 0).toFixed(2)}%
                </Badge>
              </CardHeader>
              <CardContent>
                <Progress 
                  value={processingMetrics?.errorRate || 0} 
                  className="w-full" 
                />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="cache" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>L1 Cache (Redis)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between">
                  <span>Size:</span>
                  <span>{cacheMetrics?.l1Size || 0} entries</span>
                </div>
                <div className="flex justify-between">
                  <span>Hit Rate:</span>
                  <span>{(cacheMetrics?.l1HitRate || 0).toFixed(1)}%</span>
                </div>
                <Progress value={cacheMetrics?.l1HitRate || 0} className="w-full" />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>L2 Cache (TimescaleDB)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between">
                  <span>Size:</span>
                  <span>{cacheMetrics?.l2Size || 0} entries</span>
                </div>
                <div className="flex justify-between">
                  <span>Hit Rate:</span>
                  <span>{(cacheMetrics?.l2HitRate || 0).toFixed(1)}%</span>
                </div>
                <Progress value={cacheMetrics?.l2HitRate || 0} className="w-full" />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="rate-limit" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Rate Limiting Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between">
                  <span>Active Identifiers:</span>
                  <span>{rateLimitMetrics?.activeIdentifiers || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span>Queue Length:</span>
                  <span>{rateLimitMetrics?.queueLength || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span>Burst Processing:</span>
                  <Badge variant={rateLimitMetrics?.isProcessingBurst ? "destructive" : "secondary"}>
                    {rateLimitMetrics?.isProcessingBurst ? "Active" : "Idle"}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Request Rates</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between">
                  <span>Per Minute:</span>
                  <span>{rateLimitMetrics?.requestsPerMinute || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span>Per Hour:</span>
                  <span>{rateLimitMetrics?.requestsPerHour || 0}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
```

## Performance Targets

### Processing Performance
- **Symbols per second**: 100+ symbols processed concurrently
- **Cache hit rate**: 85%+ for frequently accessed data
- **Memory usage**: <80% of available memory
- **API efficiency**: 90%+ quota utilization
- **Error rate**: <1% processing errors

### Scalability Targets
- **Concurrent workers**: 4-8 worker processes
- **Queue management**: <100 requests in queue
- **Response time**: <500ms for cached data, <2s for fresh data
- **Throughput**: 10,000+ requests per hour

### Cache Performance
- **L1 hit rate**: 70%+ for hot data
- **L2 hit rate**: 95%+ for warm data
- **Cache size**: L1 <1GB, L2 <10GB
- **TTL optimization**: Adaptive based on access patterns

## Deployment Guide

### 1. Environment Setup

```bash
# Install dependencies
npm install ioredis pg @types/pg node-cron @types/node-cron

# Set environment variables
export REDIS_HOST=localhost
export REDIS_PORT=6379
export REDIS_PASSWORD=your_redis_password
export TIMESCALE_HOST=localhost
export TIMESCALE_PORT=5432
export TIMESCALE_DB=quantumtrade
export TIMESCALE_USER=postgres
export TIMESCALE_PASSWORD=your_timescale_password
```

### 2. Database Setup

```bash
# Run schema setup
psql -h localhost -U postgres -d quantumtrade -f scripts/setup-cache-schema.sql
```

### 3. Service Configuration

```bash
# Start Redis
redis-server --port 6379

# Start TimescaleDB
docker run -d --name timescaledb \
  -p 5432:5432 \
  -e POSTGRES_PASSWORD=your_password \
  -e POSTGRES_DB=quantumtrade \
  timescale/timescaledb:latest-pg14
```

### 4. Application Startup

```bash
# Start the application
npm run dev

# Monitor logs
tail -f logs/application.log
```

## Troubleshooting

### Common Issues

1. **Redis Connection Failed**
   - Check Redis service status
   - Verify connection parameters
   - Check firewall settings

2. **TimescaleDB Connection Failed**
   - Verify database credentials
   - Check TimescaleDB extension installation
   - Ensure proper permissions

3. **High Memory Usage**
   - Monitor cache sizes
   - Adjust TTL settings
   - Implement cache eviction policies

4. **Rate Limiting Issues**
   - Check API quotas
   - Monitor request patterns
   - Adjust rate limit configuration

### Monitoring Commands

```bash
# Check Redis status
redis-cli ping
redis-cli info memory

# Check TimescaleDB status
psql -h localhost -U postgres -d quantumtrade -c "SELECT NOW();"

# Monitor application logs
tail -f logs/application.log | grep -E "(ERROR|WARN|INFO)"

# Check system resources
htop
df -h
free -h
```

### Performance Tuning

1. **Cache Optimization**
   - Monitor hit rates
   - Adjust TTL values
   - Implement cache warming

2. **Worker Pool Tuning**
   - Monitor worker utilization
   - Adjust pool sizes
   - Balance load distribution

3. **Rate Limiting Optimization**
   - Analyze request patterns
   - Adjust burst limits
   - Implement priority queues

This comprehensive documentation provides a complete guide for implementing the enhanced processing engine with all the necessary components for enterprise-scale trading operations. 