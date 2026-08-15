# Release notes — 2.2.1 (12)

**Track:** Closed testing  
**Type:** Patch (reminders hotfix only)

## Play Console copy-paste

```
2.2.1 (12) — reminder fixes

- Remind me stays in sync when notification permission is denied or revoked
- Turning Remind me on while reminders are paused shows a resume prompt
- Opening a journey no longer clears global pause state
- Quick stability fixes around reminder permission healing
```

## Mark device checklist (~10 min)

| # | Flow | Expect |
|---|------|--------|
| 1 | New journey → Target train → Remind me on → grant permission | Remind me + Live countdown stay on |
| 2 | Remind me on while reminders paused | Resume prompt; Resume clears pause; Cancel leaves pause on |
| 3 | Open journey detail while globally paused | Pause state not cleared |
| 4 | Quick sanity | Pin still works (one train pin + widget face) |

## Tim smoke

Same four flows on your phone after Mark passes.

## AAB

Path: `android/app/build/outputs/bundle/release/app-release.aab`

**Note:** CLI build is unsigned without `android/keystore.properties`. Sign via Android Studio (**Build → Generate Signed App Bundle**) or add `keystore.properties` from `android/keystore.properties.example` and rebuild.
