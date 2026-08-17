/**
 * Leave card auto-dismisses when GPS shows travel (same as I've left).
 * Usage: node qa/late-leave-auto-ack.mjs
 */
import { chromium } from "playwright";

const BASE = "http://localhost:3000";
const EDGEWATER = { latitude: -31.7872, longitude: 115.7723 };
const JOONDALUP = { latitude: -31.7444, longitude: 115.7656 };

function buildLateLeaveNext(departureOffsetMin = 8) {
  const now = Date.now();
  return {
    displayTime: "5:00 pm",
    departure: new Date(now + departureOffsetMin * 60_000).toISOString(),
    arrival: new Date(now + departureOffsetMin * 60_000).toISOString(),
    leaveBy: new Date(now - 2 * 60_000).toISOString(),
    platform: "1",
    status: "On Time",
  };
}

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    geolocation: EDGEWATER,
    permissions: ["geolocation"],
  });
  const page = await context.newPage();

  await page.addInitScript(() => {
    window.__geoCoords = { latitude: -31.7872, longitude: 115.7723, speed: 0 };
    navigator.geolocation.getCurrentPosition = (success) => {
      success({
        coords: {
          latitude: window.__geoCoords.latitude,
          longitude: window.__geoCoords.longitude,
          accuracy: 10,
          speed: window.__geoCoords.speed,
        },
        timestamp: Date.now(),
      });
    };
  });

  await page.goto(`${BASE}/?reset=1&test=1`);
  await page.waitForFunction(
    () => typeof window.nextTrainApp?.maybeAutoAcknowledgeLeave === "function"
  );

  const movementOk = await page.evaluate(async () => {
    window.__geoCoords = { latitude: -31.7872, longitude: 115.7723, speed: 3 };
    const leaveNext = {
      displayTime: "5:00 pm",
      departure: new Date(Date.now() + 8 * 60_000).toISOString(),
      arrival: new Date(Date.now() + 8 * 60_000).toISOString(),
      leaveBy: new Date(Date.now() - 2 * 60_000).toISOString(),
      platform: "1",
      status: "On Time",
    };
    const acked = await window.nextTrainApp.maybeAutoAcknowledgeLeave(leaveNext, {
      station: "Edgewater Stn",
    });
    return acked === true && window.nextTrainApp.isLeaveAcknowledged(leaveNext);
  });

  await page.goto(`${BASE}/?reset=1&test=1`);
  await page.waitForFunction(
    () => typeof window.nextTrainApp?.maybeAutoAcknowledgeLeave === "function"
  );

  const throttleOk = await page.evaluate(async () => {
    window.__geoCoords = { latitude: -31.7444, longitude: 115.7656, speed: 0 };
    const leaveNext = {
      displayTime: "5:05 pm",
      departure: new Date(Date.now() + 9 * 60_000).toISOString(),
      arrival: new Date(Date.now() + 9 * 60_000).toISOString(),
      leaveBy: new Date(Date.now() - 2 * 60_000).toISOString(),
      platform: "1",
      status: "On Time",
    };
    const first = await window.nextTrainApp.maybeAutoAcknowledgeLeave(leaveNext, {
      station: "Edgewater Stn",
    });
    window.__geoCoords.speed = 3;
    const second = await window.nextTrainApp.maybeAutoAcknowledgeLeave(leaveNext, {
      station: "Edgewater Stn",
    });
    return first === false && second === false;
  });

  await page.goto(`${BASE}/?reset=1&test=1`);
  await page.waitForFunction(
    () => typeof window.nextTrainApp?.maybeAutoAcknowledgeLeave === "function"
  );

  const retryOk = await page.evaluate(async () => {
    window.__geoCoords = { latitude: -31.7444, longitude: 115.7656, speed: 0 };
    const leaveNext = {
      displayTime: "5:10 pm",
      departure: new Date(Date.now() + 10 * 60_000).toISOString(),
      arrival: new Date(Date.now() + 10 * 60_000).toISOString(),
      leaveBy: new Date(Date.now() - 2 * 60_000).toISOString(),
      platform: "1",
      status: "On Time",
    };
    await window.nextTrainApp.maybeAutoAcknowledgeLeave(leaveNext, {
      station: "Edgewater Stn",
    });
    await new Promise((resolve) => setTimeout(resolve, 31_000));
    window.__geoCoords.speed = 3;
    const acked = await window.nextTrainApp.maybeAutoAcknowledgeLeave(leaveNext, {
      station: "Edgewater Stn",
    });
    return acked === true;
  });

  await page.goto(`${BASE}/?reset=1&test=1`);
  await page.waitForFunction(
    () => typeof window.nextTrainApp?.maybeAutoAcknowledgeLeave === "function"
  );

  const nowPhaseOk = await page.evaluate(async () => {
    window.__geoCoords = { latitude: -31.7872, longitude: 115.7723, speed: 3 };
    const leaveNext = {
      displayTime: "5:00 pm",
      departure: new Date(Date.now() + 8 * 60_000).toISOString(),
      arrival: new Date(Date.now() + 8 * 60_000).toISOString(),
      leaveBy: new Date(Date.now() - 30_000).toISOString(),
      platform: "1",
      status: "On Time",
    };
    const acked = await window.nextTrainApp.maybeAutoAcknowledgeLeave(leaveNext, {
      station: "Edgewater Stn",
    });
    return acked === true && window.nextTrainApp.isLeaveAcknowledged(leaveNext);
  });

  if (movementOk && throttleOk && retryOk && nowPhaseOk) {
    console.log("PASS — leave auto-ack on travel (late + now); 30s re-check throttle");
  } else {
    console.error("FAIL — late-leave-auto-ack", { movementOk, throttleOk, retryOk, nowPhaseOk });
    process.exitCode = 1;
  }

  await browser.close();
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
