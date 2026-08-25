const { readFileSync } = require("fs");
const text = readFileSync(".env.local", "utf8");
let key = "";
for (const line of text.split(/\r?\n/)) {
  const i = line.indexOf("=");
  if (i < 0) continue;
  const n = line.slice(0, i).trim();
  if (n !== "x-api-key" && n !== "METLINK_API_KEY") continue;
  key = line.slice(i + 1).trim().replace(/^["']|["']$/g, "");
}
if (!key || key === "[SENSITIVE]") {
  console.log("NO_METLINK_ENV");
  process.exit(2);
}
console.log("env_len", key.length, "name_ok");
const urls = [
  "https://api.opendata.metlink.org.nz/v1/gtfs/routes",
  "https://api.opendata.metlink.org.nz/v1/gtfs-rt/tripupdates",
  "https://api.opendata.metlink.org.nz/v1/stop-predictions?stop_id=WELL",
];
(async () => {
  for (const url of urls) {
    try {
      const r = await fetch(url, { headers: { "x-api-key": key, Accept: "application/json" } });
      const buf = await r.arrayBuffer();
      const ct = (r.headers.get("content-type") || "").split(";")[0];
      let extra = "";
      if (ct.includes("json") && buf.byteLength < 2_000_000) {
        try {
          const j = JSON.parse(Buffer.from(buf).toString("utf8"));
          if (Array.isArray(j)) extra = " n=" + j.length;
          else extra = " keys=" + Object.keys(j).slice(0, 6).join(",");
        } catch {}
      }
      console.log(r.status, buf.byteLength, ct, url.replace("https://api.opendata.metlink.org.nz", "") + extra);
    } catch (e) {
      console.log("ERR", e.message);
    }
  }
})();
