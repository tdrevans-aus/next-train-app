export const DEFAULT_LEAVE_BEFORE_MINUTES = 10;
export const DEFAULT_REFRESH_SECONDS = 30;
export const DEFAULT_TIME_ZONE = "Australia/Perth";
// Cap on upcoming departures returned per direction by buildNextTrainResponse.
// Raised from 8 to 12 on 7 Sep 2026 (docs/jim-brief-upcoming-board-depth.md) — 8 was
// tuned against Australian headways and was too shallow for dense stops (e.g. Stratford
// Jubilee, London Overground's ~110-min-ahead feed).
export const UPCOMING_TRIP_LIMIT = 12;

const DESTINATION_ALIASES = {
  "Perth Underground": "Perth",
  "Perth Underground Stn": "Perth",
  "Perth Stn": "Perth",
  "Cockburn Central": "Cockburn",
  "Cockburn Central Stn": "Cockburn",
};

const LINE_DESTINATION_GROUPS = {
  Yanchep: ["Yanchep", "Whitfords", "Clarkson", "Butler"],
  Mandurah: ["Mandurah", "Cockburn"],
  Fremantle: ["Fremantle", "Claremont"],
  "Bakerloo Harrow and Wealdstone": ["Bakerloo Harrow and Wealdstone", "Bakerloo Queen's Park", "Bakerloo Stonebridge Park"],
  // Central line short workings (docs/jim-brief-london-catalog-coverage.md). North Acton, White
  // City and Ruislip Gardens are all on the West Ruislip branch; Grange Hill, Newbury Park and
  // Debden are all on the Epping/Hainault-loop branch (already folded to Epping via Loughton and
  // Hainault below). Leytonstone, Woodford and Marble Arch are excluded deliberately: they sit
  // before/at a branch fork, so which canonical terminus a short working "would have" reached
  // can't be told from the destination text alone.
  "Central Epping": ["Central Epping", "Central Loughton", "Central Hainault", "Central Grange Hill", "Central Newbury Park", "Central Debden"],
  "Central West Ruislip": ["Central West Ruislip", "Central Northolt", "Central North Acton", "Central White City", "Central Ruislip Gardens"],
  "District Upminster": ["District Upminster", "District Barking", "District Dagenham East", "District Tower Hill"],
  "District Ealing Broadway": ["District Ealing Broadway", "District Kensington (Olympia)"],
  "Piccadilly Heathrow Terminal 5": ["Piccadilly Heathrow Terminal 5", "Piccadilly Heathrow Terminals 2 and 3"],
  // Oakwood, Arnos Grove and Wood Green are all on the Cockfosters branch (well-documented
  // scheduled short workings, not just noise). Northfields and bare "Heathrow" are excluded:
  // Northfields sits before the Uxbridge/Heathrow fork and bare "Heathrow" doesn't say which
  // terminal, so neither can be resolved from the text alone.
  "Piccadilly Cockfosters": ["Piccadilly Cockfosters", "Piccadilly Oakwood", "Piccadilly Arnos Grove", "Piccadilly Wood Green"],
  "Piccadilly Uxbridge": ["Piccadilly Uxbridge", "Piccadilly Rayners Lane"],
  "Victoria Walthamstow Central": ["Victoria Walthamstow Central", "Victoria Seven Sisters", "Victoria Blackhorse Road"],
  "Hammersmith and City Barking": ["Hammersmith and City Barking", "Hammersmith & City Barking"],
  "Hammersmith and City Hammersmith": ["Hammersmith and City Hammersmith", "Hammersmith & City Hammersmith"],
  // The Circle line's canonical direction is the bare loop entry "Circle" (see the catalog
  // entry at Aldgate/Barbican etc.) — Edgware Road (Circle) and Hammersmith are the line's own
  // documented short-turn/self-terminating points on that loop.
  Circle: ["Circle", "Circle Edgware Road (Circle)", "Circle Hammersmith"],
  // Elizabeth line short workings: Gidea Park is a documented short-of-Shenfield turnback,
  // Maidenhead is a plain intermediate stop on the single-track Reading branch. Paddington,
  // Whitechapel, Liverpool Street (central-section turnbacks) and Hayes & Harlington (before the
  // Reading/Heathrow fork) are excluded — direction can't be told from the text alone.
  "Elizabeth Shenfield": ["Elizabeth Shenfield", "Elizabeth Gidea Park"],
  "Elizabeth Reading": ["Elizabeth Reading", "Elizabeth Maidenhead"],
  // Jubilee line has no branches, so every intermediate short working resolves unambiguously to
  // whichever end it's short of. Stanmore branch: Wembley Park, Willesden Green. Stratford
  // branch: North Greenwich, West Ham.
  "Jubilee Stanmore": ["Jubilee Stanmore", "Jubilee Wembley Park", "Jubilee Willesden Green"],
  "Jubilee Stratford": ["Jubilee Stratford", "Jubilee North Greenwich", "Jubilee West Ham"],
  // Metropolitan line: Baker Street sits between the suburban stations and the line's only City
  // terminus (Aldgate), so a short-of-Aldgate working there is unambiguous.
  "Metropolitan Aldgate": ["Metropolitan Aldgate", "Metropolitan Baker Street"],
  // Mildmay (London Overground) forks at Willesden Junction: the West London Line spur to
  // Clapham Junction runs via Shepherd's Bush, unambiguously. Willesden Junction, Camden Road and
  // Highbury & Islington sit on the shared Stratford<->Richmond trunk *before* that fork, so
  // whether a short working there is short-of-Stratford or short-of-Richmond can't be told from
  // the text alone — excluded deliberately.
  "Mildmay Clapham Junction": ["Mildmay Clapham Junction", "Mildmay Shepherds Bush"],
  // Windrush (London Overground, former East London Line): Dalston Junction is one stop short of
  // the Highbury & Islington extension: Battersea Park is a plain intermediate stop on the
  // unambiguous Clapham Junction (West London Line) spur; "New Cross ELL" is a legacy label for
  // the existing New Cross canonical, not a different destination. New Cross Gate is a genuine
  // separate branch terminus (not a short working) and Canary Wharf/All Saints/Canning
  // Town/Poplar (DLR) sit at multi-way junctions — none of those are foldable from the text
  // alone; see the PR description.
  "Windrush Highbury & Islington": ["Windrush Highbury & Islington", "Windrush Dalston Junction"],
  "Windrush Clapham Junction": ["Windrush Clapham Junction", "Windrush Battersea Park"],
  "Windrush New Cross": ["Windrush New Cross", "Windrush New Cross ELL"],
};

function applyDestinationAliases(destination) {
  const trimmed = destination.trim();
  if (DESTINATION_ALIASES[trimmed]) {
    return DESTINATION_ALIASES[trimmed];
  }

  // London TfL normalization
  const cleaned = trimmed
    .replace(/\s+(Underground Station|DLR Station|Rail Station|Tram Stop|Station)$/i, "")
    // National-Rail-flavoured disambiguation suffix TfL passes through verbatim on
    // Overground/DLR/Elizabeth-line/tram destinationNames sourced from NR data, e.g.
    // "Richmond (London)", "Stratford (London)" (docs/jim-brief-london-overground-empty-direction.md).
    // Strip the whole class of trailing "(London)" qualifiers, not just one station name —
    // but leave other parentheticals (e.g. "Edgware Road (Circle)", "Kensington (Olympia)")
    // alone, since those are load-bearing parts of the destination/line-loop name.
    .replace(/\s+\(London\)$/i, "")
    .replace(/\s+(&|and)\s+/g, " and ")
    .replace(/\s+via\s+.*$/i, "")
    .replace(/check front of train/i, "")
    .trim();

  if (DESTINATION_ALIASES[cleaned]) {
    return DESTINATION_ALIASES[cleaned];
  }

  const withoutStn = cleaned.replace(/\s+Stn$/i, "");
  if (DESTINATION_ALIASES[withoutStn]) {
    return DESTINATION_ALIASES[withoutStn];
  }

  return cleaned;
}

export function normalizeDestination(destination) {
  if (!destination) {
    return destination;
  }

  const aliased = applyDestinationAliases(destination);
  for (const [canonical, members] of Object.entries(LINE_DESTINATION_GROUPS)) {
    if (members.some((member) => member.toLowerCase() === aliased.toLowerCase())) {
      return canonical;
    }
  }

  return aliased;
}

function destinationMatchesFilter(tripDestination, filterDestination, tripLine = "") {
  const trip = normalizeDestination(tripDestination);
  const filter = normalizeDestination(filterDestination);
  if (!trip || !filter) {
    return false;
  }
  if (trip.toLowerCase() === filter.toLowerCase()) {
    return true;
  }
  const line = normalizeDestination(tripLine);
  if (line && line.toLowerCase() === filter.toLowerCase()) {
    return true;
  }

  const groupMatches = (can, m) => {
    const normCan = normalizeDestination(can).toLowerCase();
    const members = LINE_DESTINATION_GROUPS[can] || [];
    return normCan === m.toLowerCase() || members.some(mem => normalizeDestination(mem).toLowerCase() === m.toLowerCase());
  };

  for (const canonical of Object.keys(LINE_DESTINATION_GROUPS)) {
    const t = trip.toLowerCase();
    const f = filter.toLowerCase();
    if (groupMatches(canonical, t) && groupMatches(canonical, f)) {
      return true;
    }
  }

  return false;
}

const PERTH_OFFSET = "+08:00";

function pad2(value) {
  return String(value).padStart(2, "0");
}

export function parsePerthDateTime(value) {
  const [datePart, timePart] = value.trim().split(" ");
  const [day, month, year] = datePart.split("/").map(Number);
  const [hour, minute, second] = timePart.split(":").map(Number);
  return new Date(
    `${year}-${pad2(month)}-${pad2(day)}T${pad2(hour)}:${pad2(minute)}:${pad2(second ?? 0)}${PERTH_OFFSET}`
  );
}

export function parsePerthIsoDateTime(value) {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  if (trimmed.endsWith("Z") || /[+-]\d{2}:\d{2}$/.test(trimmed)) {
    return new Date(trimmed);
  }
  return new Date(`${trimmed}${PERTH_OFFSET}`);
}

/** Live board LastUpdate — always interpret bare ISO timestamps as Perth local. */
export function parseLiveBoardTimestamp(value) {
  if (!value) {
    return null;
  }
  const trimmed = String(value).trim();
  if (!trimmed) {
    return null;
  }
  if (trimmed.includes("/")) {
    return parsePerthDateTime(trimmed);
  }
  return parsePerthIsoDateTime(trimmed);
}

const ON_TIME_TOLERANCE_MINUTES = 1;

function timingOffsetMinutesBetween(scheduledDisplayTime, displayTime) {
  if (!scheduledDisplayTime || !displayTime || scheduledDisplayTime === displayTime) {
    return 0;
  }

  const [scheduledHour, scheduledMinute] = scheduledDisplayTime.split(":").map(Number);
  const [displayHour, displayMinute] = displayTime.split(":").map(Number);
  let diffMinutes =
    displayHour * 60 + displayMinute - (scheduledHour * 60 + scheduledMinute);

  if (diffMinutes < -12 * 60) {
    diffMinutes += 24 * 60;
  } else if (diffMinutes > 12 * 60) {
    diffMinutes -= 24 * 60;
  }

  return diffMinutes;
}

export function resolveTripDisplayStatus(offsetMinutes, apiDisplayDelay = "") {
  if (offsetMinutes >= 2) {
    return `${offsetMinutes} min late`;
  }
  if (offsetMinutes === 1) {
    return "1 min late";
  }
  if (offsetMinutes <= -2) {
    return "Estimated";
  }
  if (Math.abs(offsetMinutes) <= ON_TIME_TOLERANCE_MINUTES) {
    return "On Time";
  }

  const cleaned = String(apiDisplayDelay).replace(/[()]/g, "").trim();
  return cleaned || "On Time";
}

export function enrichTripTiming(trip, apiDisplayDelay = "") {
  const timingOffsetMinutes = timingOffsetMinutesBetween(
    trip.scheduledDisplayTime,
    trip.displayTime
  );

  return {
    ...trip,
    timingOffsetMinutes,
    delayMinutes: Math.max(0, timingOffsetMinutes),
    status: resolveTripDisplayStatus(timingOffsetMinutes, apiDisplayDelay),
  };
}

export function providerTripToInternal(trip) {
  const scheduledDeparture = new Date(trip.scheduledDeparture);
  const liveDeparture = new Date(trip.liveDeparture);
  const internal = {
    scheduledDeparture,
    scheduledDisplayTime: trip.scheduledDisplayTime,
    liveDeparture,
    displayTime: trip.displayTime,
    platform: trip.platform ?? "",
    destination: trip.destination,
    // Additive, optional field (docs/jim-brief-uk-west-midlands-hub-anchoring.md):
    // the Darwin-printed destination before any hub/exact-chip remap, so a
    // row can show a secondary "to <printedDestination>" label when it
    // differs from the chosen direction. Undefined/omitted for every
    // provider that doesn't set it.
    printedDestination: trip.printedDestination,
    cars: trip.cars,
    line: trip.line,
    id: trip.id,
  };
  return enrichTripTiming(internal);
}

export function pickUpcomingTrips(trips, destination, now = new Date()) {
  return trips
    .filter((trip) => destinationMatchesFilter(trip.destination, destination, trip.line))
    .filter((trip) => trip.liveDeparture > now)
    .sort((a, b) => a.liveDeparture - b.liveDeparture);
}

export function pickUpcomingProviderTrips(trips, destination, now = new Date()) {
  const internal = trips.map(providerTripToInternal);
  return pickUpcomingTrips(internal, destination, now);
}

export function uniqueDestinations(trips) {
  const seen = new Set();
  const directions = [];

  for (const trip of trips) {
    const direction = normalizeDestination(trip.destination);
    if (!direction) {
      continue;
    }

    const key = direction.toLowerCase();
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    directions.push(direction);
  }

  return directions.sort();
}

function roundMinutes(ms) {
  return Math.round(ms / 60000);
}

export function getLeavePhase(minutesUntilLeave, minutesUntilArrival) {
  if (minutesUntilArrival <= 0) {
    return "missed";
  }
  if (minutesUntilLeave < 0) {
    return "late";
  }
  if (minutesUntilLeave <= 0) {
    return "now";
  }
  if (minutesUntilLeave <= 2) {
    return "urgent";
  }
  if (minutesUntilLeave <= 5) {
    return "soon";
  }
  return "calm";
}

function buildTripPayload(trip, leaveBeforeMinutes, now) {
  const timing = enrichTripTiming(trip);
  const leaveByMs = timing.liveDeparture.getTime() - leaveBeforeMinutes * 60 * 1000;
  const minutesUntilDeparture = roundMinutes(timing.liveDeparture - now);
  const minutesUntilLeave = roundMinutes(leaveByMs - now);
  const leavePhase = getLeavePhase(minutesUntilLeave, minutesUntilDeparture);
  const isDelayed = timing.timingOffsetMinutes >= 2;
  const departureIso = timing.liveDeparture.toISOString();

  return {
    departure: departureIso,
    arrival: departureIso,
    scheduledDeparture: timing.scheduledDeparture.toISOString(),
    scheduledArrival: timing.scheduledDeparture.toISOString(),
    displayTime: timing.displayTime,
    scheduledDisplayTime: timing.scheduledDisplayTime,
    timingOffsetMinutes: timing.timingOffsetMinutes,
    isDelayed,
    platform: timing.platform,
    status: timing.status,
    destination: timing.destination,
    printedDestination: timing.printedDestination ?? null,
    cars: timing.cars,
    line: timing.line,
    leaveBy: new Date(leaveByMs).toISOString(),
    minutesUntilDeparture,
    minutesUntilArrival: minutesUntilDeparture,
    minutesUntilLeave,
    minutesLate: minutesUntilLeave < 0 ? Math.abs(minutesUntilLeave) : 0,
    leavePhase,
  };
}

function slimTripSummary(trip) {
  return {
    displayTime: trip.displayTime,
    scheduledDisplayTime: trip.scheduledDisplayTime,
    platform: trip.platform,
    status: trip.status,
    line: trip.line,
    departure: trip.departure,
    arrival: trip.arrival,
  };
}

export function buildNextTrainResponse({
  station,
  destination,
  destinationLabel,
  leaveBeforeMinutes,
  refreshSeconds,
  skipTrains = 0,
  now = new Date(),
  lastUpdated = null,
  upcomingTrips,
  timeZone = DEFAULT_TIME_ZONE,
  // Additive/optional (docs/jim-brief-terminus-no-published-departures.md): trips terminating
  // at this station on the selected direction's line, which pickUpcomingTrips correctly
  // excludes from `upcoming` because their destination is this station, not the chosen
  // direction. Every existing caller omits this and gets byte-identical output — it is only
  // consulted when upcomingTrips resolves empty, and never reshapes upcoming/next/following.
  terminatingTrips = [],
  // Additive/optional (docs/jim-brief-malmo-planned-closure-empty-board.md): the earliest
  // date (YYYY-MM-DD, city-local) service resumes at this station, when the static feed can
  // tell us and the board is genuinely empty (e.g. a planned line closure). Every existing
  // caller omits this and gets byte-identical output — it only ever adds `nextServiceDate` to
  // the response, and only when `upcoming` is empty.
  nextServiceDate = null,
}) {
  const skip = Math.max(0, Math.floor(Number(skipTrains) || 0));
  const formatLastUpdated =
    lastUpdated instanceof Date
      ? lastUpdated.toLocaleString("en-AU", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: false,
          timeZone,
        })
      : lastUpdated;

  const upcomingPayloads = upcomingTrips
    .slice(0, UPCOMING_TRIP_LIMIT)
    .map((trip) => buildTripPayload(trip, leaveBeforeMinutes, now));
  const nextPayload = upcomingPayloads[skip] ?? null;

  const response = {
    station,
    lastUpdated: formatLastUpdated,
    config: {
      station,
      destination,
      destinationLabel,
      leaveBeforeMinutes,
      refreshSeconds,
      skipTrains: skip,
    },
    next: nextPayload,
    following: upcomingPayloads[skip + 1] ? slimTripSummary(upcomingPayloads[skip + 1]) : null,
    upcoming: upcomingPayloads,
  };

  if (upcomingPayloads.length === 0 && nextServiceDate) {
    response.nextServiceDate = nextServiceDate;
  }

  // Additive/optional field, only populated on the genuine terminus-with-no-published-departures
  // signature: nothing in `upcoming` and at least one real trip terminating here on this line.
  // Never derives or estimates a departure time — these are the trip's real (arrival) times,
  // labelled as arrivals by the caller. A genuinely empty board (terminatingTrips also empty)
  // leaves this field absent, so "No upcoming trains" is unaffected.
  if (upcomingPayloads.length === 0 && Array.isArray(terminatingTrips) && terminatingTrips.length > 0) {
    const arrivals = terminatingTrips
      .filter((trip) => trip.liveDeparture > now)
      .sort((a, b) => a.liveDeparture - b.liveDeparture)
      .slice(0, UPCOMING_TRIP_LIMIT)
      .map((trip) => buildTripPayload(trip, leaveBeforeMinutes, now));
    if (arrivals.length > 0) {
      response.arrivalsOnly = {
        reason: "terminus-no-published-departures",
        message:
          "Trains terminate here. Departure times aren't published — these are arrivals.",
        arrivals,
      };
    }
  }

  return response;
}
