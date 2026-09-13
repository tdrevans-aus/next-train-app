const DEFAULT_WINDOW_MS = 60_000;
const DEFAULT_LIMIT = 60;

// Named buckets so a caller (e.g. api/feedback.js) can have its own tighter
// window without touching the default bucket every other endpoint relies on.
// Keyed by `${bucketName}:${ip}` so different buckets never share counters.
const buckets = new Map();

export function getClientIp(req) {
  const forwarded = req.headers?.["x-forwarded-for"];
  if (forwarded) {
    return String(forwarded).split(",")[0].trim();
  }

  return req.socket?.remoteAddress ?? "unknown";
}

/**
 * @param {*} req
 * @param {*} res
 * @param {{ bucket?: string, limit?: number, windowMs?: number }} [options]
 *   `bucket` names an isolated counter (defaults to a shared "default"
 *   bucket, preserving today's 60/min-per-IP behaviour for every existing
 *   caller). `limit`/`windowMs` override the default 60 requests / 60s.
 */
export function checkRateLimit(req, res, options = {}) {
  if (req.method === "OPTIONS") {
    return true;
  }

  const bucketName = options.bucket || "default";
  const limit = options.limit ?? DEFAULT_LIMIT;
  const windowMs = options.windowMs ?? DEFAULT_WINDOW_MS;

  const ip = getClientIp(req);
  const key = `${bucketName}:${ip}`;
  const now = Date.now();
  let bucket = buckets.get(key);

  if (!bucket || now >= bucket.resetAt) {
    bucket = { count: 0, resetAt: now + windowMs };
    buckets.set(key, bucket);
  }

  bucket.count += 1;

  if (bucket.count > limit) {
    const retryAfterSeconds = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));
    res.setHeader("Retry-After", String(retryAfterSeconds));
    res.status(429).json({ error: "Too many requests" });
    return false;
  }

  return true;
}
