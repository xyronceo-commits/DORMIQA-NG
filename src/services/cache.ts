/**
 * Dormiqa In-Memory Client Cache & Request Deduplication Engine
 *
 * Provides high-performance client-side caching for public data (listings,
 * universities, route calculations) with TTL support, automatic cache
 * invalidation on data mutations, and concurrent request deduplication.
 *
 * STRICT SECURITY: Private user-specific data (user profiles, saved items,
 * notifications, inspections, agent/admin dashboards) are EXCLUDED from cache.
 */

export interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

class ClientCacheEngine {
  private cache = new Map<string, CacheEntry<any>>();
  private inFlightPromises = new Map<string, Promise<any>>();

  private isDev(): boolean {
    return typeof process !== 'undefined' && process.env.NODE_ENV !== 'production';
  }

  private log(type: 'HIT' | 'MISS' | 'FETCH' | 'INVALIDATE' | 'DEDUPE', key: string, detail?: string) {
    if (this.isDev()) {
      const timestamp = new Date().toLocaleTimeString();
      console.log(`[CACHE ${type}] ${key}${detail ? ` (${detail})` : ''} - ${timestamp}`);
    }
  }

  /**
   * Get cached data if present and not expired
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) {
      this.log('MISS', key);
      return null;
    }

    if (Date.now() > entry.expiresAt) {
      this.log('MISS', key, 'Expired');
      this.cache.delete(key);
      return null;
    }

    this.log('HIT', key);
    return entry.data as T;
  }

  /**
   * Set cached data with a specified TTL in milliseconds
   */
  set<T>(key: string, data: T, ttlMs: number): T {
    const expiresAt = Date.now() + ttlMs;
    this.cache.set(key, { data, expiresAt });
    this.log('FETCH', key, `Cached for ${Math.round(ttlMs / 1000)}s`);
    return data;
  }

  /**
   * Deduplicate concurrent in-flight async requests for the exact same key.
   * If an identical request is already pending, returns that same promise.
   */
  async dedupe<T>(key: string, fetchFn: () => Promise<T>): Promise<T> {
    // 1. Check cache first
    const cached = this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    // 2. Check if identical request is already in-flight
    if (this.inFlightPromises.has(key)) {
      this.log('DEDUPE', key, 'Reusing in-flight promise');
      return this.inFlightPromises.get(key) as Promise<T>;
    }

    // 3. Initiate new request
    const promise = (async () => {
      try {
        const result = await fetchFn();
        return result;
      } finally {
        this.inFlightPromises.delete(key);
      }
    })();

    this.inFlightPromises.set(key, promise);
    return promise;
  }

  /**
   * Invalidate specific key or keys matching pattern/prefix
   */
  invalidate(keyOrPrefixPattern?: string | RegExp): void {
    if (!keyOrPrefixPattern) {
      this.cache.clear();
      this.log('INVALIDATE', 'ALL', 'Cleared all client caches');
      return;
    }

    if (typeof keyOrPrefixPattern === 'string') {
      let count = 0;
      for (const k of Array.from(this.cache.keys())) {
        if (k === keyOrPrefixPattern || k.startsWith(keyOrPrefixPattern)) {
          this.cache.delete(k);
          count++;
        }
      }
      this.log('INVALIDATE', keyOrPrefixPattern, `Purged ${count} key(s)`);
    } else if (keyOrPrefixPattern instanceof RegExp) {
      let count = 0;
      for (const k of Array.from(this.cache.keys())) {
        if (keyOrPrefixPattern.test(k)) {
          this.cache.delete(k);
          count++;
        }
      }
      this.log('INVALIDATE', keyOrPrefixPattern.toString(), `Purged ${count} key(s)`);
    }
  }
}

export const clientCache = new ClientCacheEngine();

// Cache Duration Constants (TTLs in milliseconds)
export const CACHE_TTL = {
  UNIVERSITIES: 60 * 60 * 1000,    // 60 minutes for static campus list
  LISTINGS: 2 * 60 * 1000,         // 2 minutes for public hostel search & filters
  LISTING_DETAIL: 3 * 60 * 1000,   // 3 minutes for public hostel details
  FEATURED_LISTINGS: 5 * 60 * 1000 // 5 minutes for featured discovery listings
};
