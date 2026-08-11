# Jim brief: Security — stop DOM XSS (S-01)

**For:** Jim (implement)  
**From:** Simon (design) / Tim (product)  
**Status:** Ready to code — **P0 pre-ship**  
**Related:** `docs/simon-brief-security-hardening.md` **S-01**; `public/app.js` (`readUrlSettings`, journey switcher, direction/station selects)  
**Out of scope:** CSP headers (S-07a); redesigning share UX; widget HTML; inventing new share formats

---

## 1. Decisions (locked)

| Topic | Lock |
|-------|------|
| Share / deep URL `?station=` + `?direction=` | **Keep** auto-create + persist journey when valid |
| Station validation | Station must resolve to an entry in **`stations.json`** (use existing normalize / `PERTH_STATIONS` / list helpers — exact match after normalize) |
| Invalid URL params | **Do not** call `persistSettings` from URL; fall through to normal cold start (same as no params) |
| Direction from URL | Allowed as string once station is allowlisted (live directions vary); still **never** inject as HTML |
| Rendering | **Never** put user, journey, station, direction, or API/error strings through `innerHTML`. Use `textContent` + `createElement` (or escape only if HTML is unavoidable — prefer DOM) |

---

## 2. Code targets (minimum)

### 2.1 Share URL — `readUrlSettings()` / `init()`

Today any `station` + `direction` creates a journey and `persistSettings` on load (~6613).

**Required:**

1. Load station list (or use already-cached list) before accepting URL settings.  
2. If station is **not** in the catalog → return `null` (ignore URL pair).  
3. Optional harden: reject absurdly long station/direction strings (e.g. > 120 chars) even if somehow listed.  
4. Do **not** invent a toast for bad share links (silent ignore is fine).

### 2.2 Journey switcher (~1855)

Replace:

```js
button.innerHTML = `${journey.name}<span …>${formatJourneyRoute(journey)}</span>`;
```

With DOM nodes: name `textContent`, route span `textContent`. Clearing the menu with `innerHTML = ""` is OK.

### 2.3 Direction `<select>` (~4597–4609)

Build `<option>` via `createElement` / `new Option(label, value)` so `dir` and `error.message` are never concatenated into HTML.

### 2.4 Station `<option>` HTML (~4193–4199)

Same — do not interpolate station names into HTML strings (attributes break on quotes; treat catalog as trusted-but-still-safe).

### 2.5 Sweep

Grep `innerHTML` in `public/app.js` (and any path that paints journey name / route / direction / API errors). Fixed spinner HTML and empty clears are fine. Wizard bodies that already use `escapeTemplateHtml` may stay **or** move to DOM — either OK if names cannot break out.

`public/widget.js` `showMenuChromeHintToast(messageHtml)` — only pass **literal** developer HTML, never journey/API strings. If any caller passes dynamic text, switch to `textContent`.

---

## 3. Acceptance

| Check | Pass |
|-------|------|
| `/?station=%3Cimg%20src=x%20onerror=alert(1)%3E&direction=Perth` | No script; no junk journey persisted |
| `/?station=Edgewater%20Stn&direction=Perth` | Still creates / shows journey (existing behaviour) |
| Journey renamed to `<img…>` or `<script>…` | Switcher + lists show **plain text**, no execution |
| Hostile direction string from API mock | Options / labels are text-safe |

Add a small Playwright check under `qa/` (e.g. `qa/security-xss-share.mjs`) that loads the crafted station URL and asserts no persisted journey with that station name / no `img` in DOM from the attack string.

---

## 4. After web changes

`npm run cap:sync` so the Android WebView assets pick this up.
