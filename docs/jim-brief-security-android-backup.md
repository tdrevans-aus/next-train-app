# Jim brief: Security — Android backup off (S-04)

**For:** Jim (implement)  
**From:** Simon (design) / Tim (product)  
**Status:** Ready to code — **P1 pre-ship**  
**Related:** `docs/simon-brief-security-hardening.md` **S-04**; `android/app/src/main/AndroidManifest.xml`  
**Out of scope:** Custom backup rules (Option B); UX copy; changing what prefs we store

---

## 1. Decision (locked)

**Option A:** set `android:allowBackup="false"` on the `<application>` element.

Rationale: journeys, leave-reminder, and widget prefs are personal commute data; cloud/ADB backup isn’t a product need for v1.

---

## 2. Implementation

In `AndroidManifest.xml`:

```xml
android:allowBackup="false"
```

Remove or avoid adding `fullBackupContent` / `dataExtractionRules` unless required by the toolchain after the flag change — simplest manifest wins.

No Java/JS changes. No user-facing copy.

---

## 3. Acceptance

| Check | Pass |
|-------|------|
| Manifest shows `allowBackup="false"` | Yes |
| App installs and runs (journeys, widget, reminders) | Unchanged |
| `adb backup` / Auto Backup | Not offered / empty for this app (best-effort verify) |

---

## 4. Note for Tim

Users who uninstall lose local journeys unless they re-enter them (same as today without relying on backup). Purchases remain on the Play account (restore).
