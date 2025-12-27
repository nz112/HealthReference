/**
 * Simple in-memory cache for API responses
 * Cache expires after 1 hour (3600000ms)
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresIn: number;
}

class SimpleCache {
  private cache: Map<string, CacheEntry<any>> = new Map();
  private defaultTTL = 60 * 60 * 1000; // 1 hour in milliseconds

  /**
   * Generate cache key from query
   */
  private getKey(service: string, query: string): string {
    return `${service}:${query.toLowerCase().trim()}`;
  }

  /**
   * Get cached data if available and not expired
   */
  get<T>(service: string, query: string): T | null {
    const key = this.getKey(service, query);
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    const now = Date.now();
    if (now - entry.timestamp > entry.expiresIn) {
      // Expired, remove from cache
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  /**
   * Store data in cache
   */
  set<T>(service: string, query: string, data: T, ttl?: number): void {
    const key = this.getKey(service, query);
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      expiresIn: ttl || this.defaultTTL,
    });
  }

  /**
   * Clear cache for a specific service/query or all cache
   */
  clear(service?: string, query?: string): void {
    if (service && query) {
      const key = this.getKey(service, query);
      this.cache.delete(key);
    } else {
      this.cache.clear();
    }
  }

  /**
   * Get cache statistics
   */
  getStats() {
    return {
      size: this.cache.size,
      entries: Array.from(this.cache.keys()),
    };
  }
}

export const cache = new SimpleCache();

