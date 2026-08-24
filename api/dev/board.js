import { applyCors } from "../../lib/api-cors.js";

/**
 * Vercel / production: never serve planned-city probes.
 * Local dogfood is `dev-server.js` GET /api/dev/board with ALLOW_CITY_PROBES=1.
 */
export default async function handler(req, res) {
  if (applyCors(req, res)) {
    return;
  }

  res.status(404).json({ error: "Not found" });
}
