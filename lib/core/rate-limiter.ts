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