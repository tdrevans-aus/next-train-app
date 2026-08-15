var NextTrainTimes = (() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // web-sources/train-times-client.mjs
  var train_times_client_exports = {};
  __export(train_times_client_exports, {
    getNextTrainData: () => getNextTrainData
  });

  // lib/train-times-core.js
  var DEFAULT_TIME_ZONE = "Australia/Perth";
  var DESTINATION_ALIASES = {
    "Perth Underground": "Perth",
    "Perth Underground Stn": "Perth",
    "Perth Stn": "Perth",
    "Cockburn Central": "Cockburn",
    "Cockburn Central Stn": "Cockburn"
  };
  var LINE_DESTINATION_GROUPS = {
    Yanchep: ["Yanchep", "Whitfords", "Clarkson", "Butler"],
    Mandurah: ["Mandurah", "Cockburn"],
    Fremantle: ["Fremantle", "Claremont"]
  };
  function applyDestinationAliases(destination) {
    const trimmed = destination.trim();
    if (DESTINATION_ALIASES[trimmed]) {
      return DESTINATION_ALIASES[trimmed];
    }
    const withoutStn = trimmed.replace(/ Stn$/i, "");
    if (DESTINATION_ALIASES[withoutStn]) {
      return DESTINATION_ALIASES[withoutStn];
    }
    return trimmed;
  }
  function normalizeDestination(destination) {
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
  function destinationMatchesFilter(tripDestination, filterDestination) {
    const trip = normalizeDestination(tripDestination);
    const filter = normalizeDestination(filterDestination);
    if (trip.toLowerCase() === filter.toLowerCase()) {
      return true;
    }
    for (const members of Object.values(LINE_DESTINATION_GROUPS)) {
      const memberSet = new Set(members.map((member) => member.toLowerCase()));
      if (memberSet.has(trip.toLowerCase()) && memberSet.has(filter.toLowerCase())) {
        return true;
      }
    }
    return false;
  }
  var PERTH_OFFSET = "+08:00";
  function pad2(value) {
    return String(value).padStart(2, "0");
  }
  function parsePerthDateTime(value) {
    const [datePart, timePart] = value.trim().split(" ");
    const [day, month, year] = datePart.split("/").map(Number);
    const [hour, minute, second] = timePart.split(":").map(Number);
    return /* @__PURE__ */ new Date(
      `${year}-${pad2(month)}-${pad2(day)}T${pad2(hour)}:${pad2(minute)}:${pad2(second ?? 0)}${PERTH_OFFSET}`
    );
  }
  function parsePerthIsoDateTime(value) {
    const trimmed = value.trim();
    if (!trimmed) {
      return null;
    }
    if (trimmed.endsWith("Z") || /[+-]\d{2}:\d{2}$/.test(trimmed)) {
      return new Date(trimmed);
    }
    return /* @__PURE__ */ new Date(`${trimmed}${PERTH_OFFSET}`);
  }
  function parseLiveBoardTimestamp(value) {
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
  var ON_TIME_TOLERANCE_MINUTES = 1;
  function timingOffsetMinutesBetween(scheduledDisplayTime, displayTime) {
    if (!scheduledDisplayTime || !displayTime || scheduledDisplayTime === displayTime) {
      return 0;
    }
    const [scheduledHour, scheduledMinute] = scheduledDisplayTime.split(":").map(Number);
    const [displayHour, displayMinute] = displayTime.split(":").map(Number);
    let diffMinutes = displayHour * 60 + displayMinute - (scheduledHour * 60 + scheduledMinute);
    if (diffMinutes < -12 * 60) {
      diffMinutes += 24 * 60;
    } else if (diffMinutes > 12 * 60) {
      diffMinutes -= 24 * 60;
    }
    return diffMinutes;
  }
  function resolveTripDisplayStatus(offsetMinutes, apiDisplayDelay = "") {
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
  function enrichTripTiming(trip, apiDisplayDelay = "") {
    const timingOffsetMinutes = timingOffsetMinutesBetween(
      trip.scheduledDisplayTime,
      trip.displayTime
    );
    return {
      ...trip,
      timingOffsetMinutes,
      delayMinutes: Math.max(0, timingOffsetMinutes),
      status: resolveTripDisplayStatus(timingOffsetMinutes, apiDisplayDelay)
    };
  }
  function providerTripToInternal(trip) {
    const scheduledDeparture = new Date(trip.scheduledDeparture);
    const liveDeparture = new Date(trip.liveDeparture);
    const internal = {
      scheduledDeparture,
      scheduledDisplayTime: trip.scheduledDisplayTime,
      liveDeparture,
      displayTime: trip.displayTime,
      platform: trip.platform ?? "",
      destination: trip.destination,
      cars: trip.cars
    };
    return enrichTripTiming(internal);
  }
  function pickUpcomingTrips(trips, destination, now = /* @__PURE__ */ new Date()) {
    return trips.filter((trip) => destinationMatchesFilter(trip.destination, destination)).filter((trip) => trip.liveDeparture > now).sort((a, b) => a.liveDeparture - b.liveDeparture);
  }
  function roundMinutes(ms) {
    return Math.round(ms / 6e4);
  }
  function getLeavePhase(minutesUntilLeave, minutesUntilArrival) {
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
    const leaveByMs = timing.liveDeparture.getTime() - leaveBeforeMinutes * 60 * 1e3;
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
      cars: timing.cars,
      leaveBy: new Date(leaveByMs).toISOString(),
      minutesUntilDeparture,
      minutesUntilArrival: minutesUntilDeparture,
      minutesUntilLeave,
      minutesLate: minutesUntilLeave < 0 ? Math.abs(minutesUntilLeave) : 0,
      leavePhase
    };
  }
  function slimTripSummary(trip) {
    return {
      displayTime: trip.displayTime,
      scheduledDisplayTime: trip.scheduledDisplayTime,
      platform: trip.platform,
      status: trip.status,
      departure: trip.departure,
      arrival: trip.arrival
    };
  }
  function buildNextTrainResponse({
    station,
    destination,
    destinationLabel,
    leaveBeforeMinutes,
    refreshSeconds,
    skipTrains = 0,
    now = /* @__PURE__ */ new Date(),
    lastUpdated = null,
    upcomingTrips,
    timeZone = DEFAULT_TIME_ZONE
  }) {
    const skip = Math.max(0, Math.floor(Number(skipTrains) || 0));
    const formatLastUpdated = lastUpdated instanceof Date ? lastUpdated.toLocaleString("en-AU", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
      timeZone
    }) : lastUpdated;
    const upcomingPayloads = upcomingTrips.slice(0, 8).map((trip) => buildTripPayload(trip, leaveBeforeMinutes, now));
    const nextPayload = upcomingPayloads[skip] ?? null;
    return {
      station,
      lastUpdated: formatLastUpdated,
      config: {
        station,
        destination,
        destinationLabel,
        leaveBeforeMinutes,
        refreshSeconds,
        skipTrains: skip
      },
      next: nextPayload,
      following: upcomingPayloads[skip + 1] ? slimTripSummary(upcomingPayloads[skip + 1]) : null,
      upcoming: upcomingPayloads
    };
  }

  // lib/providers/perth.js
  var LIVETIMES_URL = "https://livetimes.transperth.wa.gov.au/LiveTimes.asmx/GetTimesForStation";
  var PERTH_CLUSTER_STATIONS = ["Perth Underground Stn", "Perth Stn"];
  var PERTH_OFFSET2 = "+08:00";
  function pad22(value) {
    return String(value).padStart(2, "0");
  }
  function extractTag(block, tag) {
    const match = block.match(new RegExp(`<${tag}>([^<]*)</${tag}>`));
    return match ? match[1].trim() : "";
  }
  function formatTime24(date) {
    return date.toLocaleTimeString("en-AU", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: "Australia/Perth"
    });
  }
  function combineScheduleDeparture(tripStopSchedule, scheduleTime) {
    const [datePart] = tripStopSchedule.trim().split(" ");
    const [day, month, year] = datePart.split("/").map(Number);
    const [hour, minute, second] = scheduleTime.split(":").map(Number);
    return /* @__PURE__ */ new Date(
      `${year}-${pad22(month)}-${pad22(day)}T${pad22(hour)}:${pad22(minute)}:${pad22(second ?? 0)}${PERTH_OFFSET2}`
    );
  }
  function parseLiveTimesXml(xml) {
    const trips = [];
    const platformBlocks = xml.match(/<Platform>([\s\S]*?)<\/Platform>/g) ?? [];
    for (const platformBlock of platformBlocks) {
      const platform = extractTag(platformBlock, "Number");
      const tripBlocks = platformBlock.match(/<PlatformTrip>([\s\S]*?)<\/PlatformTrip>/g) ?? [];
      for (const tripBlock of tripBlocks) {
        if (extractTag(tripBlock, "Cancelled") === "True") {
          continue;
        }
        const scheduleText = extractTag(tripBlock, "TripStopSchedule");
        if (!scheduleText) {
          continue;
        }
        const scheduledDeparture = combineScheduleDeparture(scheduleText, extractTag(tripBlock, "Schedule"));
        const actualText = extractTag(tripBlock, "Actual");
        const liveDeparture = actualText ? parsePerthDateTime(actualText) : scheduledDeparture;
        const liveDisplayTime = extractTag(tripBlock, "actualDisplayTime24") || formatTime24(liveDeparture);
        const scheduledDisplayTime = formatTime24(scheduledDeparture);
        const displayDelay = extractTag(tripBlock, "DisplayDelayTime");
        trips.push(
          enrichTripTiming(
            {
              scheduledDeparture,
              scheduledDisplayTime,
              liveDeparture,
              displayTime: liveDisplayTime,
              platform,
              destination: normalizeDestination(extractTag(tripBlock, "Destination")),
              cars: extractTag(tripBlock, "Ncar")
            },
            displayDelay
          )
        );
      }
    }
    return trips;
  }
  async function fetchStationTrips(station) {
    const url = `${LIVETIMES_URL}?stationname=${encodeURIComponent(station)}`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Live times service returned ${response.status}`);
    }
    const xml = await response.text();
    if (xml.includes('xsi:nil="true"') && !xml.includes("<PlatformTrip>")) {
      return { stationName: station, lastUpdate: null, trips: [] };
    }
    const stationName = extractTag(xml, "Name") || station;
    const lastUpdate = extractTag(xml, "LastUpdate");
    const trips = parseLiveTimesXml(xml);
    return { stationName, lastUpdate, trips };
  }
  function isPerthCluster(station) {
    return PERTH_CLUSTER_STATIONS.includes(station);
  }
  function toProviderTrip(trip) {
    return {
      liveDeparture: trip.liveDeparture.toISOString(),
      scheduledDeparture: trip.scheduledDeparture.toISOString(),
      displayTime: trip.displayTime,
      scheduledDisplayTime: trip.scheduledDisplayTime,
      platform: trip.platform,
      destination: trip.destination,
      cars: trip.cars,
      status: trip.status,
      cancelled: false
    };
  }
  async function fetchStationBoard(stationName) {
    let board;
    if (!isPerthCluster(stationName)) {
      const result = await fetchStationTrips(stationName);
      board = result;
    } else {
      const allTrips = [];
      let lastUpdate = null;
      for (const clusterStation of PERTH_CLUSTER_STATIONS) {
        try {
          const result = await fetchStationTrips(clusterStation);
          allTrips.push(...result.trips);
          if (result.lastUpdate) {
            lastUpdate = result.lastUpdate;
          }
        } catch {
        }
      }
      if (allTrips.length === 0) {
        board = {
          stationName: "Perth Stn",
          lastUpdate: null,
          trips: []
        };
      } else {
        board = {
          stationName: "Perth Stn",
          lastUpdate,
          trips: allTrips
        };
      }
    }
    const lastUpdated = board.lastUpdate ? parsePerthIsoDateTime(board.lastUpdate)?.toISOString() ?? null : null;
    return {
      stationName: board.stationName,
      lastUpdate: board.lastUpdate ?? lastUpdated,
      trips: board.trips.map(toProviderTrip),
      scheduleSource: "live"
    };
  }
  async function fetchTripsForStation(stationName) {
    const board = await fetchStationBoard(stationName);
    const lastUpdateRaw = board.lastUpdate && !board.lastUpdate.includes("/") ? board.lastUpdate : board.lastUpdate;
    return {
      stationName: board.stationName,
      lastUpdate: lastUpdateRaw,
      trips: board.trips.map(providerTripToInternal)
    };
  }

  // lib/train-times.js
  async function getNextTrainData({
    station,
    destination,
    destinationLabel,
    leaveBeforeMinutes,
    refreshSeconds,
    skipTrains = 0,
    now = /* @__PURE__ */ new Date(),
    timeZone = DEFAULT_TIME_ZONE
  }) {
    const { stationName, lastUpdate, trips } = await fetchTripsForStation(station);
    const upcoming = pickUpcomingTrips(trips, destination, now);
    const lastUpdated = parseLiveBoardTimestamp(lastUpdate);
    return buildNextTrainResponse({
      station: stationName,
      destination,
      destinationLabel,
      leaveBeforeMinutes,
      refreshSeconds,
      skipTrains,
      now,
      lastUpdated,
      upcomingTrips: upcoming,
      timeZone
    });
  }
  return __toCommonJS(train_times_client_exports);
})();
