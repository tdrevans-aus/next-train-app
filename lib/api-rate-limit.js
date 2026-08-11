const WINDOW_MS = 60_000;
const LIMIT = 60;
const buckets = new Map();

export function getClientIp(req) {
  const forwarded = req.headers?.["x-forwarded-for"];
  if (forwarded) {
    return String(forwarded).split(",")[0].trim();
  }

  return req.socket?.remoteAddress ?? "unknown";
}

export function checkRateLimit(req, res) {
  if (req.method === "OPTIONS") {
    return true;
  }

  const ip = getClientIp(req);
  const now = Date.now();
  let bucket = buckets.get(ip);

  if (!bucket || now >= bucket.resetAt) {
    bucket = { count: 0, resetAt: now + WINDOW_MS };
    buckets.set(ip, bucket);
  }

  bucket.count += 1;

  if (bucket.count > LIMIT) {
    res.setHeader("Retry-After", "60");
    res.status(429).json({ error: "Too many requests" });
    return false;
  }

  return true;
}
