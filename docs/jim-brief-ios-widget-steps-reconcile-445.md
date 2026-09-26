# Jim brief: land PR #445 (numbered iOS widget steps) on top of #459 for iOS 3.0.4 (29)

Written 26 Sep 2026 by the Mac session (Bob). Tim wants #445 in the 3.0.4 (29) build.
tim-review: no further review needed on copy — Tim approved both #459's and #445's widget-help
changes; the top-level session merges on his "merge".

## Situation

Two independent changes to the same widget-help dialog now collide:

- **#459 (merged, master 611c0aa3)** — `public/widget.js` `configureWidgetHelpCopy()` switches the
  `#widget-help-manual` text by platform: iOS gets a one-paragraph "How to add on iPhone or
  iPad: …" plus tip "Works on the Home Screen and Today View…", and relabels the
  `#widget-help-pin-btn` / `#widget-help-add-another-btn` to "Show steps"; Android gets
  "Or add manually…" / "Long-press to resize…" / "Add widget" / "Add another". `index.html`'s
  `#widget-help-manual` is now an empty `<p>` filled from JS.
- **#445 (open, branch `cursor/ipad-widget-show-steps-cb1a`, based on a61b297f, by a Cursor agent)**
  — adds a numbered `<ol id="widget-help-steps">` (hold Home Screen → tap + → search Next Train →
  choose size, Add Widget → Done), a separate `#widget-help-show-steps-btn` that hides once the
  list is open and resets when the dialog reopens (`syncWidgetHelpShowStepsButton`,
  `showWidgetHelpSteps`), CSS in `public/styles/journey-detail.css`, and
  `qa/widget-help-ios-steps.mjs` (registered in `run-all.mjs`).

A trial merge of #445 onto master conflicts in `public/index.html` and `public/widget.js`.

## Required result

One coherent dialog:
- **iOS**: the numbered 5-step list from #445 is *the* iOS instructions (replace #459's iOS
  paragraph — don't show both). "Show steps" behaves per #445 (reveals the list, then hides;
  resets on reopen). Keep #459's iOS tip text. No leftover second "Show steps" control: pick one
  mechanism (#445's dedicated button, or #459's relabelled pin/add-another buttons) and make the
  other not render on iOS.
- **Android**: exactly #459's behaviour and copy; the numbered list and show-steps button never
  appear.
- **Web**: unchanged from master.

## How

Branch from `origin/master`, bring in #445's commits (cherry-pick or merge
`origin/cursor/ipad-widget-show-steps-cb1a`), resolve per above. Open a **new** PR that supersedes
#445 (say so in the body: "Supersedes #445"); don't push to the Cursor branch.

## Acceptance criteria

- `node qa/widget-help-ios-steps.mjs` passes (update it if the reconciled mechanism differs, but
  keep its intent: numbered steps visible after Show steps, button hidden while open, reset on
  reopen) and add/extend an assertion that Android shows no numbered list and keeps "Add widget".
- `qa/button-visibility.mjs` passes.
- `node qa/run-all.mjs --smoke` green.
- Don't touch the ad-free/banner files another Jim is changing right now
  (`public/ad-free-purchase.js`, `web-sources/ads-native.mjs`, the ad-free sections of
  `index.html`, `ios/App/App.xcodeproj/project.pbxproj`).
- Commit, push, open the PR against master linking this brief. Don't merge.
