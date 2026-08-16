# Pin resolution fixtures (FB-26)

Shared JSON vectors for **web** (`pin-state.js`), **Android** (`JourneyPinHelper`, `WidgetPinResolver`), and **iOS** (`JourneyPinHelper`).

## Format

Each `*.json` file (except `schema.json`) is one scenario:

| Field | Meaning |
|-------|---------|
| `id` | Stable slug (`journey-preferred-default`) |
| `clock.perthDateKey` | Perth calendar day for override/dismiss fields |
| `clock.nowIso` | Fixed “now” for departed checks |
| `input` | Mode, payload, journey/nearby pin, skip index |
| `expected` | Contract outputs keyed by **departure ISO** |

Trips in `payload` should use absolute ISO timestamps on the fixture clock day. Keep departures **after** `clock.nowIso` unless testing departed override fallback.

## Validate

```bash
node qa/pin-resolution-fixtures.mjs --validate-only
```

## Run resolution (after `pin-state.js` lands)

```bash
IMPLEMENT_PIN_STATE=1 node qa/pin-resolution-fixtures.mjs
```

## Android

Fixtures are copied into `android/app/src/test/resources/pin-resolution/` by the `copyPinResolutionFixtures` Gradle task. Run:

```bash
cd android && ./gradlew :app:testDebugUnitTest --tests "com.tdrevans.nexttrain.PinResolutionFixtureTest"
```

## Adding a case

1. Copy an existing fixture; pick a new `id`.
2. Run `--validate-only`.
3. If behaviour differs between web and native, set `notes` and tag `native-parity` until aligned.
