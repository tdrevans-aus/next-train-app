import { buildNextTrainResponse } from "./train-times.js";

const PERTH_OFFSET = "+08:00";

function pad2(value) {
  return String(value).padStart(2, "0");
}

function formatDisplayTime(date) {
  return date.toLocaleTimeString("en-AU", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Australia/Perth",
  });
}

function makeTrip({
  now,
  minutesFromNow,
  delayMinutes = 0,
  minutesEarly = 0,
  platform,
  destination,
  cars = "6",
  printedDestination,
}) {
  const liveDeparture = new Date(now.getTime() + minutesFromNow * 60_000);
  const scheduledDeparture =
    minutesEarly > 0
      ? new Date(liveDeparture.getTime() + minutesEarly * 60_000)
      : new Date(liveDeparture.getTime() - delayMinutes * 60_000);

  return {
    liveDeparture,
    scheduledDeparture,
    displayTime: formatDisplayTime(liveDeparture),
    scheduledDisplayTime: formatDisplayTime(scheduledDeparture),
    platform,
    destination,
    cars,
    ...(printedDestination ? { printedDestination } : {}),
  };
}

function fixtureLastUpdated(now) {
  return new Date(
    `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}T${pad2(now.getHours())}:${pad2(now.getMinutes())}:${pad2(now.getSeconds())}${PERTH_OFFSET}`
  );
}

export const FIXTURE_CATALOG = {
  hub: {
    description:
      "Hub-anchored direction (FB-50) — chosen chip is a through hub, rows keep the printed terminus.",
    // Station/direction stay in the Perth test catalog so the page mounts; only the
    // per-trip printedDestination values are the West Midlands shape under test.
    directions: ["Perth", "Mandurah", "Joondalup"],
    build(config, now = new Date()) {
      const destination = config.destination ?? "Perth";
      const printed = ["Stratford-upon-Avon", "Whitlocks End", "Dorridge", "Stratford-upon-Avon", "Whitlocks End"];
      return buildNextTrainResponse({
        ...config,
        station: config.station ?? "Edgewater Stn",
        now,
        lastUpdated: fixtureLastUpdated(now),
        upcomingTrips: printed.map((printedDestination, i) =>
          makeTrip({ now, minutesFromNow: 18 + i * 15, platform: "1", destination, printedDestination })
        ),
      });
    },
  },
  normal: {
    description: "Calm state — train in 18 min, leave in 8 min, four upcoming trains.",
    directions: ["Perth", "Mandurah", "Joondalup"],
    build(config, now = new Date()) {
      const destination = config.destination ?? "Perth";
      return buildNextTrainResponse({
        ...config,
        station: config.station ?? "Edgewater Stn",
        now,
        lastUpdated: fixtureLastUpdated(now),
        upcomingTrips: [
          makeTrip({ now, minutesFromNow: 18, platform: "2", destination }),
          makeTrip({ now, minutesFromNow: 34, platform: "2", destination }),
          makeTrip({ now, minutesFromNow: 48, platform: "1", destination }),
          makeTrip({ now, minutesFromNow: 62, platform: "2", destination }),
          makeTrip({ now, minutesFromNow: 76, platform: "1", destination }),
          makeTrip({ now, minutesFromNow: 90, platform: "2", destination }),
        ],
      });
    },
  },
  urgent: {
    description: "Leave soon — train in 12 min, leave in 2 min (urgent leave card).",
    directions: ["Perth", "Mandurah"],
    build(config, now = new Date()) {
      const destination = config.destination ?? "Perth";
      return buildNextTrainResponse({
        ...config,
        station: config.station ?? "Edgewater Stn",
        now,
        lastUpdated: fixtureLastUpdated(now),
        upcomingTrips: [
          makeTrip({ now, minutesFromNow: 12, platform: "1", destination }),
          makeTrip({ now, minutesFromNow: 28, platform: "2", destination }),
          makeTrip({ now, minutesFromNow: 44, platform: "1", destination }),
        ],
      });
    },
  },
  late: {
    description: "Missed leave-by — train in 7 min, should have left 3 min ago.",
    directions: ["Perth"],
    build(config, now = new Date()) {
      const destination = config.destination ?? "Perth";
      return buildNextTrainResponse({
        ...config,
        station: config.station ?? "Edgewater Stn",
        now,
        lastUpdated: fixtureLastUpdated(now),
        upcomingTrips: [
          makeTrip({ now, minutesFromNow: 7, platform: "2", destination }),
          makeTrip({ now, minutesFromNow: 23, platform: "1", destination }),
        ],
      });
    },
  },
  delayed: {
    description: "Delayed train — scheduled line visible, status shows delay.",
    directions: ["Perth"],
    build(config, now = new Date()) {
      const destination = config.destination ?? "Perth";
      return buildNextTrainResponse({
        ...config,
        station: config.station ?? "Edgewater Stn",
        now,
        lastUpdated: fixtureLastUpdated(now),
        upcomingTrips: [
          makeTrip({
            now,
            minutesFromNow: 20,
            delayMinutes: 5,
            platform: "3",
            destination,
          }),
          makeTrip({ now, minutesFromNow: 36, platform: "2", destination }),
        ],
      });
    },
  },
  ahead: {
    description: "Live 1 min before schedule — On Time, no scheduled subline.",
    directions: ["Perth"],
    build(config, now = new Date()) {
      const destination = config.destination ?? "Perth";
      return buildNextTrainResponse({
        ...config,
        station: config.station ?? "Edgewater Stn",
        now,
        lastUpdated: fixtureLastUpdated(now),
        upcomingTrips: [
          makeTrip({ now, minutesFromNow: 18, minutesEarly: 1, platform: "1", destination }),
          makeTrip({ now, minutesFromNow: 34, platform: "2", destination }),
        ],
      });
    },
  },
  estimated: {
    description: "Live 2 min before schedule — Estimated status, no scheduled subline.",
    directions: ["Perth"],
    build(config, now = new Date()) {
      const destination = config.destination ?? "Perth";
      return buildNextTrainResponse({
        ...config,
        station: config.station ?? "Edgewater Stn",
        now,
        lastUpdated: fixtureLastUpdated(now),
        upcomingTrips: [
          makeTrip({ now, minutesFromNow: 18, minutesEarly: 2, platform: "1", destination }),
          makeTrip({ now, minutesFromNow: 34, platform: "2", destination }),
        ],
      });
    },
  },
  empty: {
    description: "No upcoming trains in this direction.",
    directions: ["Perth"],
    build(config, now = new Date()) {
      return buildNextTrainResponse({
        ...config,
        station: config.station ?? "Edgewater Stn",
        now,
        lastUpdated: fixtureLastUpdated(now),
        upcomingTrips: [],
      });
    },
  },
  error: {
    description: "API failure — dev server returns HTTP 500.",
    directions: ["Perth"],
    build() {
      throw new Error("Fixture error: simulated API failure");
    },
  },
  // docs/jim-brief-dublin-honest-empty-state.md — a live-only provider's honest empty state:
  // every direction empty because the real-time feed had nothing to say for this stop right
  // now, not because there's no service. qa/honest-empty-state.mjs drives this through
  // /api/board.
  "live-gap": {
    description:
      "Every direction empty via a live-feed gap (docs/jim-brief-dublin-honest-empty-state.md) — the honest empty state should render.",
    directions: ["Red + North", "Green + South"],
    build(config, now = new Date()) {
      return buildNextTrainResponse({
        ...config,
        station: config.station ?? "Abbey Street",
        now,
        lastUpdated: fixtureLastUpdated(now),
        upcomingTrips: [],
        emptyReason: "no-live-predictions",
      });
    },
  },
  // Same feed-gap shape, but only ONE of the two directions is actually gapped — the other has
  // a real upcoming trip. The honest empty state is a station-wide message, so it must NOT
  // render here (docs/jim-brief-dublin-honest-empty-state.md's "only the all-directions-empty
  // case").
  "live-gap-partial": {
    description:
      "One direction empty via a live-feed gap, the other has a train — honest empty state must NOT render.",
    directions: ["Red + North", "Green + South"],
    build(config, now = new Date()) {
      const destination = config.destination ?? "Red + North";
      if (destination === "Green + South") {
        return buildNextTrainResponse({
          ...config,
          station: config.station ?? "Abbey Street",
          now,
          lastUpdated: fixtureLastUpdated(now),
          upcomingTrips: [makeTrip({ now, minutesFromNow: 12, platform: "1", destination })],
        });
      }
      return buildNextTrainResponse({
        ...config,
        station: config.station ?? "Abbey Street",
        now,
        lastUpdated: fixtureLastUpdated(now),
        upcomingTrips: [],
        emptyReason: "no-live-predictions",
      });
    },
  },
  // docs/jim-brief-prague-line-c-closure.md — every direction empty NOT because of a feed gap but
  // because the static schedule itself expects nothing here today (a section closure, a station
  // under reconstruction). Distinct reason code from "live-gap" above: the honest empty state
  // still renders, but with the station-specific `emptyReasonMessage` verbatim rather than the
  // generic "feed has no times right now" copy — that message would be actively wrong here
  // (retrying/checking again in a minute cannot help; the fix is the replacement transport named
  // in the message).
  "not-served": {
    description:
      "Every direction empty because today's schedule has no service here at all (docs/jim-brief-prague-line-c-closure.md) — the honest empty state should render the station-specific replacement-transport message.",
    directions: ["Red + North", "Green + South"],
    build(config, now = new Date()) {
      return buildNextTrainResponse({
        ...config,
        station: config.station ?? "Abbey Street",
        now,
        lastUpdated: fixtureLastUpdated(now),
        upcomingTrips: [],
        emptyReason: "not-currently-served",
        emptyReasonMessage:
          "No metro service at this station at the moment — line closure for track repair; replacement bus XC runs.",
      });
    },
  },
};

/**
 * Fixture-only extra /api/cities manifest entries (dev server only —
 * docs/jim-brief-registry-driven-client.md scenario a). `?fixture=testville` on
 * GET /api/cities layers this in ahead of the real registry-derived cities, so
 * qa/registry-driven-client.mjs can assert the client picks up a brand-new live
 * city with zero code change, the way a real flip would land it. Production never
 * honours `fixture` on any endpoint (TESTING.md) — see dev-server.js's own /api/cities route.
 */
export const CITY_MANIFEST_FIXTURES = {
  testville: {
    id: "testville",
    displayName: "Testville",
    status: "live",
    country: { id: "zz", name: "Testland" },
    timeZone: "UTC",
    bounds: { minLat: -1, maxLat: 1, minLng: -1, maxLng: 1 },
    modes: ["train"],
    nearbyEligible: false,
    directionsVersion: "fixture0",
  },
};

export function listFixtures() {
  return Object.entries(FIXTURE_CATALOG).map(([id, fixture]) => ({
    id,
    description: fixture.description,
  }));
}

export function getFixtureDirections(fixtureId) {
  return FIXTURE_CATALOG[fixtureId]?.directions ?? ["Perth", "Mandurah"];
}

export function getFixtureNextTrainData(fixtureId, config, now = new Date()) {
  const fixture = FIXTURE_CATALOG[fixtureId];
  if (!fixture) {
    throw new Error(`Unknown fixture: ${fixtureId}`);
  }

  return fixture.build(config, now);
}
