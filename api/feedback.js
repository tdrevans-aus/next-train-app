/**
 * Tester feedback → email inbox via Formspree (or any compatible webhook).
 *
 * Set on Vercel: FEEDBACK_WEBHOOK_URL=https://formspree.io/f/xxxxxxxx
 * Optional: FEEDBACK_TO=EvansAppStudio@gmail.com (shown in mailto fallback only)
 *
 * Before production: bury Menu → Send feedback (see FB-18).
 */
const MAX_NOTE = 4000;
const MAX_EMAIL = 200;

function readBody(req) {
  if (req.body && typeof req.body === "object") {
    return req.body;
  }
  if (typeof req.body === "string") {
    try {
      return JSON.parse(req.body);
    } catch {
      return {};
    }
  }
  return {};
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  // Capacitor WebView origin is https://localhost → cross-origin POST needs
  // a successful OPTIONS preflight before the real request runs.
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Accept");

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const webhook = String(process.env.FEEDBACK_WEBHOOK_URL || "").trim();
  const mailtoFallback = String(
    process.env.FEEDBACK_TO || "EvansAppStudio@gmail.com"
  ).trim();

  if (!webhook) {
    res.status(503).json({
      error: "Feedback webhook not configured",
      mailto: mailtoFallback,
    });
    return;
  }

  const body = readBody(req);
  const note = String(body.note || "").trim();
  const email = String(body.email || "").trim();
  const version = String(body.version || "").trim().slice(0, 80);
  const platform = String(body.platform || "").trim().slice(0, 40);

  if (!note || note.length > MAX_NOTE) {
    res.status(400).json({ error: "Note required (max 4000 characters)" });
    return;
  }
  if (email && (email.length > MAX_EMAIL || !email.includes("@"))) {
    res.status(400).json({ error: "Invalid email" });
    return;
  }

  try {
    const upstream = await fetch(webhook, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        message: note,
        email: email || undefined,
        _replyto: email || undefined,
        _subject: `Next Train feedback${version ? ` · ${version}` : ""}`,
        version: version || undefined,
        platform: platform || undefined,
      }),
    });

    if (!upstream.ok) {
      const text = await upstream.text().catch(() => "");
      console.warn("Feedback webhook failed", upstream.status, text.slice(0, 200));
      res.status(502).json({
        error: "Could not send feedback",
        mailto: mailtoFallback,
      });
      return;
    }

    res.status(200).json({ ok: true });
  } catch (error) {
    console.warn("Feedback webhook error", error);
    res.status(502).json({
      error: "Could not send feedback",
      mailto: mailtoFallback,
    });
  }
}
