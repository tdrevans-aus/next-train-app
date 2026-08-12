import { tryClaimFounding } from "../lib/founding-counter.js";

const MAX = Number(process.env.FOUNDING_PRO_MAX ?? 200);

export default function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  res.setHeader("Cache-Control", "no-store");
  res.status(200).json(tryClaimFounding(MAX));
}
