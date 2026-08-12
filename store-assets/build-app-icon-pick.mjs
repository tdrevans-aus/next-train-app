/**
 * Build public/design/app-icon-pick.html from C1–C10 SVGs.
 * Usage: node store-assets/build-app-icon-pick.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const root = path.dirname(fileURLToPath(import.meta.url));
const dir = path.join(root, "icon-concepts-v2");
const out = path.join(root, "..", "public", "design", "app-icon-pick.html");

const meta = [
  ["E1-horizon.svg", "E1 — Horizon", "Tapered rails, perspective sleeper spacing, open sky."],
  ["E2-headlight.svg", "E2 — Headlight", "Rails stop short; the arriving train fills the gap."],
  ["E3-band.svg", "E3 — Band", "Track running clean through the tile, edge to edge."],
  ["E4-dial-track.svg", "E4 — Dial track", "Clock face as a window onto the line."],
  ["E5-curve-horizon.svg", "E5 — Curved horizon", "Rails bend as they run out of sight."],
  ["E6-sweep.svg", "E6 — Sweep", "Track turning out of the corner like a minute hand."],
  ["E7-sideline.svg", "E7 — Sideline", "The line runs off to the right."],
  ["E8-deep.svg", "E8 — Deep", "Cinematic perspective; track runs off the bottom edge."],
  ["E9-horizon-line.svg", "E9 — Horizon line", "Track meets a distant horizon, never itself."],
  ["E10-platform.svg", "E10 — Platform", "You at the edge, line running out."],
];

function card([file, title, blurb]) {
  const svg = fs
    .readFileSync(path.join(dir, file), "utf8")
    .replace(/\s*<!--[\s\S]*?-->/g, "")
    .trim();
  return `<article class="card">
  <h3>${title}</h3>
  <p>${blurb}</p>
  <div class="sizes">
    <div class="tile">${svg}</div>
    <div class="wall">
      <div class="on-light"><div class="tile sm">${svg}</div></div>
      <div class="on-dark"><div class="tile sm">${svg}</div></div>
    </div>
  </div>
</article>`;
}

const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>App icon — round 3 (C1–C10)</title>
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Figtree:wght@400;600;700&family=Syne:wght@700;800&display=swap" rel="stylesheet" />
<style>
:root{--mist:#eef3f2;--mist-mid:#e2ece9;--accent:#0b6e6a;--ink:#132523;--muted:#5c726d;--surface:#fff}
*{box-sizing:border-box}
body{margin:0;font-family:Figtree,system-ui,sans-serif;color:var(--ink);background:linear-gradient(180deg,#f5f8f7 0%,var(--mist) 45%,var(--mist-mid) 100%);min-height:100vh;padding:2rem 1.25rem 4rem}
main{max-width:1100px;margin:0 auto}
h1{font-family:Syne,sans-serif;font-size:1.75rem;margin:0 0 .35rem}
.lede{color:var(--muted);max-width:44rem;line-height:1.45;margin:0 0 1.25rem}
.callout{background:var(--surface);border-radius:12px;padding:1rem 1.15rem;margin-bottom:1.5rem;border:1px solid rgba(19,37,35,.08);font-size:.9rem;color:var(--muted);line-height:1.45}
.callout strong{color:var(--ink)}
h2{font-family:Syne,sans-serif;font-size:1.15rem;margin:0 0 .75rem}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:1rem;margin-bottom:1.5rem}
.card{background:var(--surface);border-radius:16px;padding:1rem;border:1px solid rgba(19,37,35,.08)}
.card h3{font-family:Syne,sans-serif;font-size:.95rem;margin:0 0 .35rem}
.card p{margin:0 0 .85rem;font-size:.8rem;color:var(--muted);line-height:1.35;min-height:2.6em}
.sizes{display:flex;align-items:flex-end;gap:.75rem}
.tile{width:112px;height:112px;border-radius:28px;overflow:hidden;flex-shrink:0;box-shadow:0 0 0 1px rgba(19,37,35,.06)}
.tile svg{display:block;width:100%;height:100%}
.tile.sm{width:48px;height:48px;border-radius:12px}
.wall{display:flex;gap:.5rem}
.wall .on-dark{background:#1a2422;padding:.4rem;border-radius:10px}
.wall .on-light{background:#f0f0f0;padding:.4rem;border-radius:10px}
.note{font-size:.85rem;color:var(--muted);line-height:1.45}
code{font-size:.85em}
</style>
</head>
<body>
<main>
<h1>App icon — round 5 (E1–E10)</h1>
<p class="lede">Same track theme, rebuilt for craft: tapered rails, real perspective spacing, every mark checked as a render rather than as code. Mist ground, teal glyph.</p>
<div class="callout"><strong>Simon's shortlist:</strong> E8, E4, E3, E2.<br /><strong>Prior rounds:</strong> B and C sets retired.</div>
<h2>Ten concepts</h2>
<div class="grid">
${meta.map(card).join("\n")}
</div>
<p class="note">Reply with a code (or mashup notes). Sources: <code>store-assets/icon-concepts-v2/D*.svg</code></p>
</main>
</body>
</html>
`;

fs.writeFileSync(out, html);
console.log("wrote", out);
