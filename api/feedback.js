/**
 * Tester feedback → email inbox via Formspree (or any compatible webhook).
 *
 * Set on Vercel: FEEDBACK_WEBHOOK_URL=https://formspree.io/f/xxxxxxxx
 * Optional: FEEDBACK_TO=EvansAppStudio@gmail.com (shown in mailto fallback only)
 *
 * Before production: bury Menu → Send feedback (see FB-18).
 *
 * Abuse control (D-04, docs/dwayne-security-review-play-3.0.0.md): a tighter,
 * named rate-limit bucket than the shared 60/min default, plus a hidden
 * honeypot field the client sends but no real user can see or fill.
 */
import { checkRateLimit } from "../lib/api-rate-limit.js";

const MAX_NOTE = 4000;
const MAX_EMAIL = 200;
const FEEDBACK_RATE_LIMIT = { bucket: "feedback", limit: 5, windowMs: 10 * 60_000 };

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

  if (!checkRateLimit(req, res, FEEDBACK_RATE_LIMIT)) {
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

  // Honeypot: a hidden field no human sees or fills (public/index.html,
  // off-screen + aria-hidden). A bot that fills every field trips this; give
  // it a normal-looking 200 so it gets no signal, but never call the webhook.
  const honeypot = String(body.website || "").trim();
  if (honeypot) {
    res.status(200).json({ ok: true });
    return;
  }

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
