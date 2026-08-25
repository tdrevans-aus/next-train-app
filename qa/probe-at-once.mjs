import { readFileSync } from "fs";

const text = readFileSync(".env.local", "utf8");
let best = "";
for (const line of text.split(/\r?\n/)) {
  const i = line.indexOf("=");
  if (i < 0) continue;
  const n = line.slice(0, i).trim();
  if (n !== "AT_API_KEY") continue;
  let v = line.slice(i + 1).trim().replace(/^["']|["']$/g, "");
  if (v === "[SENSITIVE]" || v === "SENSITIVE") continue;
  if (v.length > best.length) best = v;
}
if (!best) {
  console.log("NO_AT_ENV");
  process.exit(2);
}
console.log("env_len", best.length);

const headers = {
  "Ocp-Apim-Subscription-Key": best,
  Accept: "application/json",
};

const urls = [
  "https://api.at.govt.nz/gtfs/v3/routes",
  "https://api.at.govt.nz/realtime/legacy/tripupdates",
  "https://api.at.govt.nz/realtime/gtfsrt",
  "https://api.at.govt.nz/gtfs/v3/stops",
];

for (const url of urls) {
  try {
    const r = await fetch(url, { headers });
    const buf = await r.arrayBuffer();
    const ct = (r.headers.get("content-type") || "").split(";")[0];
    let extra = "";
    if (ct.includes("json") && buf.byteLength < 2_000_000) {
      try {
        const j = JSON.parse(Buffer.from(buf).toString("utf8"));
        extra = " keys=" + Object.keys(j).slice(0, 6).join(",");
        if (Array.isArray(j.data)) extra += " data=" + j.data.length;
      } catch {}
    }
    console.log(r.status, buf.byteLength, ct, url.replace("https://api.at.govt.nz", "") + extra);
  } catch (e) {
    console.log("ERR", url.replace("https://api.at.govt.nz", ""), e.message);
  }
}
