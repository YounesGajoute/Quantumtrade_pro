import { createClient } from 'redis';
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
  private redis!: ReturnType<typeof createClient>;
  private timescale!: Pool;
  private config: CacheConfig;

  constructor(config: CacheConfig) {
    this.config = config;
    this.initializeConnections();
  }

  private async initializeConnections() {
    // Initialize Redis connection
    this.redis = createClient({
      socket: {
        host: this.config.redis.host,
        port: this.config.redis.port,
      },
      password: this.config.redis.password,
      database: this.config.redis.db,
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
      await this.redis.connect();
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
      await this.redis.setEx(key, finalTtl, serialized);

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
    await this.redis.flushDb();
    await this.timescale.query('DELETE FROM cache_data');
  }

  async getStats(): Promise<{
    l1Size: number;
    l2Size: number;
    l1HitRate: number;
    l2HitRate: number;
  }> {
    const l1Size = await this.redis.dbSize();
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