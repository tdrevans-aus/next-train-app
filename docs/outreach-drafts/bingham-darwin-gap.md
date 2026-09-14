# Bingham and Parton missing from Darwin OpenLDBWS

**To:** [Rail Data Marketplace support — verify via raildata.org.uk/contact or similar]  
**Cc:** [National Rail Enquiries data team, if listed on RDM product page]  
**Subject:** Data coverage: Bingham and Parton CRS codes return 404 on OpenLDBWS

---

## Before sending

- Check that your RDM contact address is correct (raildata.org.uk should have a support route for Live Departure Board queries).
- **Do not include the `DARWIN_LDB_TOKEN` value itself** in this email — reference only that you're a registered Live Departure Board subscriber.

---

## Draft message

Hello,

I'm Tim, developer of **Next Train**, an app that displays live departure boards for UK rail stations. We currently integrate with the Darwin Live Departure Board Webservice (LDB) via Rail Data Marketplace to show real-time departures across Great Britain.

During a recent coverage audit of the LDB API (13–14 September 2026), I probed every Great Britain station code in our catalog to verify coverage. Two stations returned HTTP 404 ("not found") on repeated probes:

1. **Bingham, Nottinghamshire (CRS: BIN)** — East Midlands Railway, Nottingham–Skegness line
2. **Parton, Cumbria (CRS: PRN)** — Northern, Cumbrian Coast line

Both are open, staffed or unstaffed passenger stations with NaPTAN entries. Every neighbouring station (e.g. Radcliffe, Aslockton, Whitehaven, Harrington) resolved successfully with live Darwin data, so this appears to be specific to these two CRS codes.

I'd like to confirm two things:

1. **Are BIN and PRN expected to be absent from OpenLDBWS?** If so, is this due to feed scope, a CRS code change we've missed, or a known data gap?

2. **If this is an unintended gap, can these stations be added to Darwin's coverage?** If so, is there a timeline?

Our app currently excludes these stations rather than showing no live times, since we only display real-time data we can verify live. Confirmation of their status will help us plan whether they're truly out-of-scope or worth flagging for a future update.

Thank you for your time.

Best regards,  
Tim Evans  
Next Train

---

## Context for Tim

This addresses the Bingham/Parton exclusion flagged in `docs/uk-station-fill/unverified.md` during the September 2026 UK station fill audit. Both stations are open and carry rail service, but Darwin returned 404 on every probe (initial sweep + isolated retry with cache bypass for BIN). The probe was made against the production LDB Webservice endpoint using your Live Departure Board subscription (subscription reference is in the RDM dashboard; do not paste it or the token into the email).

**Possible outcomes:**

- RDM confirms they're out-of-scope (e.g. a TOC code mismatch, or the operator doesn't participate) → document as expected and leave excluded.
- RDM confirms it's a gap and can add them in a future update → note the timeline and plan a re-check.
- RDM has no information → escalate to National Rail Enquiries (CRS maintainer) directly, or mark as unresolved and revisit post-launch.
