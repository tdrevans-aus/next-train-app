/**
 * Seed a pre-fix-style `nextTrainCountryStations:<country>` localStorage
 * cache plus the matching `savedCity`/`savedCountry` settings.
 *
 * Extracted from qa/country-wide-picker.mjs case 5
 * (docs/jim-brief-country-list-hides-no-live-feed-stops.md) so the seeding
 * shape lives in one place — reused by qa/no-live-feed-stops-gate.mjs's
 * country-wide coverage rather than duplicated.
 *
 * Caller is responsible for navigation: `page.goto(BASE + "/?reset=1&test=1&fixture=normal")`
 * before calling this, then `page.goto(BASE + "/?fixture=normal")` after, so
 * runInit() re-reads exactly what was seeded instead of clearing it again
 * (same two-navigation shape case 4/5 already use).
 */
export async function seedCountryStationsCache(
  page,
  { savedCity, savedCountry, countryId, regions, stations, refreshSeconds = 60 }
) {
  await page.evaluate(
    ({ savedCity, savedCountry, countryId, regions, stations, refreshSeconds }) => {
      localStorage.setItem(
        "nextTrainSettings",
        JSON.stringify({
          settingsSchemaVersion: 2,
          savedCity,
          savedCountry,
          regionExplicit: false,
          refreshSeconds,
        })
      );
      localStorage.setItem(
        `nextTrainCountryStations:${countryId}`,
        JSON.stringify({
          countryId,
          fetchedAt: Date.now(),
          regions,
          stations,
        })
      );
    },
    { savedCity, savedCountry, countryId, regions, stations, refreshSeconds }
  );
}
