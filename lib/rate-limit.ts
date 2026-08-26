interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const store = new Map<string, RateLimitEntry>();

// Clean up old entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store.entries()) {
    if (now > entry.resetTime) {
      store.delete(key);
    }
  }
}, 60000);

export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
}

const CONFIGS: Record<string, RateLimitConfig> = {
  auth: { windowMs: 15 * 60 * 1000, maxRequests: 10 },       // 10 per 15min
  "get-env": { windowMs: 60 * 1000, maxRequests: 30 },        // 30 per minute
  default: { windowMs: 60 * 1000, maxRequests: 60 },           // 60 per minute
};

export function rateLimit(
  key: string,
  type: string = "default"
): { success: boolean; remaining: number } {
  const config = CONFIGS[type] || CONFIGS.default;
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || now > entry.resetTime) {
    store.set(key, { count: 1, resetTime: now + config.windowMs });
    return { success: true, remaining: config.maxRequests - 1 };
  }

  if (entry.count >= config.maxRequests) {
    return { success: false, remaining: 0 };
  }

  entry.count++;
  return { success: true, remaining: config.maxRequests - entry.count };
}

export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  return "unknown";
}
