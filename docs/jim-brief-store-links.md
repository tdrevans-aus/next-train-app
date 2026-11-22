# Jim brief — store links on the About page + "Get the app" banner on mobile web

tim-review: yes (copy + IA change)
Mode: bug-fix / product mode (CLAUDE.md "Bug-fix lane"). Touches shared UI in `public/`.

## Why

As of 22 Nov 2026 Next Train is live on both stores. Nothing in the repo links to either
listing, so people who find the website have no route to the native apps. Tim chose to upgrade
the existing About page instead of building a separate landing site.

## Store URLs

- App Store: `https://apps.apple.com/app/id6803145625` (from Tim, 22 Nov 2026)
- Google Play: `https://play.google.com/store/apps/details?id=com.tdrevans.nexttrain`
  (built from `applicationId` in `android/app/build.gradle`. Check it returns HTTP 200
  before you hard-code it. If it doesn't, stop and say so in the PR.)

Keep both URLs in one place, e.g. `storeLinks: { ios, android }` in `public/site-config.json`
or a small shared constant. Don't scatter literals across pages.

## Part 1 — About page (`public/about.html`)

1. Near the top, under the intro paragraphs, add a **"Get the app"** section with two link
   buttons: "Download on the App Store" and "Get it on Google Play". Each opens its store URL.
   Style them from the page's existing button/pill styles in both light and dark themes. Don't
   download Apple's or Google's badge artwork. Text buttons are enough for this PR, and
   official badges can follow later.
2. **Inside the native apps** (Capacitor: `window.Capacitor?.isNativePlatform?.()`), hide the
   whole section. The About page is also opened from the in-app Menu, and a store button there
   is pointless.
3. Copy fixes in the same file, since the page now advertises iOS:
   - "Ads & remove ads": it currently says remove-ads is "in the Android app" and that "Google
     Play handles payment". Only change this if iOS really has no purchase. Check
     `public/ad-free-purchase.js` and record the answer in the PR. Don't invent iOS behaviour.
   - Don't touch any other copy.
4. Add `<link rel="canonical">` and basic Open Graph tags (`og:title`, `og:description`,
   `og:url`) so a shared link previews properly. Leave out `og:image` unless a suitable icon
   already exists in `public/`.

## Part 2 — "Get the app" banner on mobile web (`public/index.html` / `public/app.js`)

- Show a slim, dismissible banner only when **all** of these hold: it isn't a native
  Capacitor platform, the viewport is a phone (UA or width < 768), and the user hasn't
  dismissed it before (localStorage flag in try/catch, hidden if storage throws).
- Choose the store by UA: iOS → App Store link, Android → Play link, anything else → no banner.
- It must not cover the board, the bottom ad slot or the Near me controls, and must not shift
  layout after first paint more than a small, one-time amount.
- Desktop web and native apps render exactly as today.

## Acceptance criteria

1. About page on desktop/mobile web shows both store buttons with the correct URLs, in light
   and dark themes.
2. About page with Capacitor stubbed as native shows no store section.
3. Mobile-web index with an iPhone UA shows the banner pointing at the App Store, an Android UA
   points at Play, and a desktop UA shows no banner. Once dismissed, it stays gone after reload.
4. Native (Capacitor stubbed) index shows no banner.
5. No other copy changes. The remove-ads wording reflects what the code actually does.

## QA

- New script `qa/store-links.mjs` covering criteria 1–4 (Playwright, like the other browser
  scripts). Register it in `qa/run-all.mjs` in the smoke tier.
- Run `node qa/store-links.mjs` and `node qa/run-all.mjs --smoke`, both green.
- Dev server: set `PORT=<free port>` **and** a matching `QA_BASE`. Never kill a process you
  didn't start. Run long commands with timeout 600000 in the foreground. Leave no background
  sleep or poll loops behind.

## Deliverable

Commit on your worktree branch (include this brief file in the commit), push, and open a PR
titled "Store links: About page buttons + mobile-web Get the app banner" that links this brief
and carries the `tim-review` note. Don't merge.
