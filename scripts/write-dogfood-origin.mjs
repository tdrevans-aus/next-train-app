/**
 * Write LAN origin for debug APK dogfood (Tim's PC, npm run dev).
 * Usage: node scripts/write-dogfood-origin.mjs
 */
import { networkInterfaces } from "os";
import { writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const PORT = process.env.PORT || "3000";

function pickLanIpv4() {
  const forced = String(process.env.DOGFOOD_HOST ?? "").trim();
  if (forced) {
    return forced;
  }

  const nets = networkInterfaces();
  const candidates = [];
  for (const [name, addrs] of Object.entries(nets)) {
    if (/virtual|vmware|vbox|hyper-v|loopback|docker|wsl/i.test(name)) {
      continue;
    }
    for (const addr of addrs ?? []) {
      if (addr.family !== "IPv4" && addr.family !== 4) {
        continue;
      }
      if (addr.internal) {
        continue;
      }
      candidates.push(addr.address);
    }
  }

  const lan = candidates.find((ip) => ip.startsWith("192.168.") || ip.startsWith("10.") || ip.startsWith("172."));
  return lan ?? candidates[0] ?? "10.0.2.2";
}

const host = pickLanIpv4();
const origin = `http://${host}:${PORT}`;
const payload = {
  origin,
  emulatorOrigin: `http://10.0.2.2:${PORT}`,
  writtenAt: new Date().toISOString(),
  note: "Debug APK only. ALLOW_CITY_PROBES=1 on this PC. npm run dev must listen on 0.0.0.0.",
};

writeFileSync(join(ROOT, "public", "dogfood-origin.json"), JSON.stringify(payload, null, 2));
console.log(`dogfood origin: ${origin}`);
