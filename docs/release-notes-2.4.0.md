# Release notes — 2.4.0 (14)

**Track:** Closed testing  
**Type:** Minor (Routes + Journeys split)

## Play Console copy-paste

**Release name:**
```
2.4.0 (14) — Routes and journeys
```

**Release notes:**
```
2.4.0 (14) — Routes and journeys

Important: saved journeys were cleared on this update — please set up again.

My Routes · My Journeys
• Add a route — station and direction only, for a quick departure board
• Add a journey — morning/evening templates with Target train, active hours, and reminders
• Routes and journeys show a type badge in the list

Journeys
• Reminders, pin, leave-by, and active hours apply to journeys only
• Upgrade a route to a journey when you want the full leave-by setup

Widget
• Can show a saved route when you don't have an active journey

Please try: create one route and one journey, check the widget, and confirm reminders only apply to journeys.
```

## Shorter variant

```
2.4.0 — Routes and journeys

Saved journeys were cleared — set up again with Routes or Journeys.

• Routes: quick saved departure board (station + direction)
• Journeys: Target train, active hours, reminders, and leave-by
• Widget can show a route when no journey is active
```

## What changed (product)

| Before (internal) | Now (user-facing) |
|-------------------|-------------------|
| Route vs “commute” kind | **Route** vs **Journey** |
| `kind: "commute"` in storage | `kind: "journey"` (legacy `"commute"` still reads correctly) |
| Commutes tab (never shipped) | **My Journeys** chrome tab |

## AAB

Path: `android/app/build/outputs/bundle/release/app-release.aab`

Sign via Android Studio (**Build → Generate Signed App Bundle**) or `android/keystore.properties` + `gradlew :app:bundleRelease`.
