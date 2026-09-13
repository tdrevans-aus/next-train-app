# Jim brief — PR #376: scope the ad-consent sentence to Android and iOS

Mode: bug-fix / product. tim-review: yes (the PR already is). Lane lock: not required.
Written 13 Sep 2026 after Mark's QA note on PR #376.

## The one change

Mark's note (PR #376 comment, `docs/mark-note-privacy-copy-3.0.0.md` in his worktree) flags that
`public/privacy.html`'s Advertising section and its UK/EEA rights section say we ask for consent
"before requesting an ad at all", but that gate exists only in the native app
(`web-sources/ads-native.mjs`). The web AdSense path in `public/ads.js` has no consent gate; it is
harmless today only because AdSense is unconfigured. Tim chose to scope the sentence.

- On branch `jim/privacy-copy-3.0.0-v2`, edit only those sentences so they say the consent prompt
  applies in the Android and iOS apps (wording of your choice, plain English, consistent between
  the two sections). Nothing else in the copy changes.
- If `docs/play-data-safety-cheatsheet.md` repeats the claim, align it the same way.
- Re-run `node qa/no-hardcoded-qa-port.mjs` and the brief's named QA scripts (see
  `docs/jim-brief-privacy-copy-3.0.0.md`) in the foreground with a 600000 ms timeout; no smoke
  suite needed for a copy-only edit already smoke-tested by Mark.
- Push to the same branch, reply on Mark's PR comment thread saying it is addressed, mark the PR
  ready for review (not draft). Do not merge. Leave nothing running.
