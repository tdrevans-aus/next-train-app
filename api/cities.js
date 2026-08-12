import { applyCors } from "../lib/api-cors.js";
import { listCities } from "../lib/providers/registry.js";

/** Lists planned/live cities — plumbing for multi-city; no upstream calls. */
export default async function handler(req, res) {
  if (applyCors(req, res)) {
    return;
  }

  if (req.method !== "GET") {
    res.setHeader("Allow", "GET, OPTIONS");
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  res.setHeader("Cache-Control", "public, s-maxage=300, stale-while-revalidate=600");
  res.status(200).json({
    contractVersion: 1,
    cities: listCities(),
    docs: "docs/multi-city-provider-design.md",
  });
}
