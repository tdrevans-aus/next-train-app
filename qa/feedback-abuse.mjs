/**
 * D-04 (docs/dwayne-security-review-play-3.0.0.md,
 * docs/jim-brief-security-launch-fixes.md): /api/feedback must not be an open
 * relay. Exercises api/feedback.js's handler in-process with a stubbed
 * `fetch` — no real Formspree call is ever made, and nothing is POSTed to
 * production.
 *
 * Checks:
 *  1. The sixth POST from one IP inside the 10-minute window gets 429 with a
 *     Retry-After header, and does not call the webhook.
 *  2. A filled honeypot field gets 200 {ok:true} and makes zero webhook
 *     calls.
 *  3. A normal submit makes exactly one webhook call.
 *  4. OPTIONS preflight is never rate-limited, even after the bucket above
 *     is exhausted.
 *
 * Usage: node qa/feedback-abuse.mjs
 */
process.env.FEEDBACK_WEBHOOK_URL = "https://example.invalid/f/test-only";

let failures = 0;
function assert(condition, message) {
  if (!condition) {
    failures += 1;
    console.error(`FAIL: ${message}`);
  }
}

function mockRes() {
  return {
    statusCode: 0,
    body: null,
    headers: {},
    setHeader(name, value) {
      this.headers[name] = value;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
    end() {},
  };
}

function mockReq({ method = "POST", ip = "203.0.113.1", body = {} } = {}) {
  return {
    method,
    headers: { "x-forwarded-for": ip },
    socket: { remoteAddress: ip },
    body,
  };
}

let webhookCalls = 0;
const originalFetch = global.fetch;
function stubFetch(ok = true) {
  webhookCalls = 0;
  global.fetch = async (_url, _opts) => {
    webhookCalls += 1;
    return {
      ok,
      status: ok ? 200 : 502,
      text: async () => "",
      json: async () => ({}),
    };
  };
}

async function run() {
  const handler = (await import("../api/feedback.js")).default;

  // --- 1. Normal submit → exactly one webhook call, 200 ok ---
  stubFetch(true);
  const normalIp = "203.0.113.10";
  const res1 = mockRes();
  await handler(mockReq({ ip: normalIp, body: { note: "Great app, one small bug." } }), res1);
  assert(res1.statusCode === 200 && res1.body?.ok === true, `normal submit expected 200 ok, got ${res1.statusCode} ${JSON.stringify(res1.body)}`);
  assert(webhookCalls === 1, `normal submit expected exactly 1 webhook call, got ${webhookCalls}`);

  // --- 2. Honeypot filled → 200 ok, zero webhook calls ---
  stubFetch(true);
  const res2 = mockRes();
  await handler(
    mockReq({ ip: "203.0.113.20", body: { note: "cheap viagra", website: "http://spam.example" } }),
    res2
  );
  assert(res2.statusCode === 200 && res2.body?.ok === true, `honeypot expected 200 ok, got ${res2.statusCode} ${JSON.stringify(res2.body)}`);
  assert(webhookCalls === 0, `honeypot expected 0 webhook calls, got ${webhookCalls}`);

  // --- 3. Sixth POST from one IP within the window → 429 with Retry-After ---
  stubFetch(true);
  const rateIp = "203.0.113.30";
  const results = [];
  for (let i = 0; i < 6; i += 1) {
    const res = mockRes();
    // eslint-disable-next-line no-await-in-loop
    await handler(mockReq({ ip: rateIp, body: { note: `note #${i}` } }), res);
    results.push(res);
  }
  for (let i = 0; i < 5; i += 1) {
    assert(results[i].statusCode === 200, `POST #${i + 1} from same IP expected 200, got ${results[i].statusCode}`);
  }
  const sixth = results[5];
  assert(sixth.statusCode === 429, `6th POST from same IP expected 429, got ${sixth.statusCode}`);
  assert(!!sixth.headers["Retry-After"], "6th POST (429) expected a Retry-After header");
  assert(webhookCalls === 5, `expected exactly 5 webhook calls (429 short-circuits before fetch), got ${webhookCalls}`);

  // --- 4. OPTIONS is never rate-limited, even from the exhausted IP above ---
  stubFetch(true);
  const optRes = mockRes();
  await handler(mockReq({ method: "OPTIONS", ip: rateIp }), optRes);
  assert(optRes.statusCode === 204, `OPTIONS from a rate-limited IP expected 204, got ${optRes.statusCode}`);
  assert(webhookCalls === 0, "OPTIONS must never call the webhook");

  // --- 5. _replyto is only ever set from a validated email ---
  stubFetch(true);
  let capturedBody = null;
  global.fetch = async (_url, opts) => {
    webhookCalls += 1;
    capturedBody = JSON.parse(opts.body);
    return { ok: true, status: 200, text: async () => "", json: async () => ({}) };
  };
  const res5 = mockRes();
  await handler(
    mockReq({ ip: "203.0.113.40", body: { note: "no email given here" } }),
    res5
  );
  assert(capturedBody && capturedBody._replyto === undefined, `_replyto must be undefined with no email, got ${JSON.stringify(capturedBody?._replyto)}`);

  global.fetch = originalFetch;

  if (failures > 0) {
    console.error(`FAIL feedback-abuse: ${failures} check(s) failed`);
    process.exit(1);
  }
  console.log("PASS feedback-abuse: rate limit, honeypot and OPTIONS behaviour all correct");
}

run();
