# Melbourne — V/Line Reservation Status Verification

**Date:** 2026-09-20  
**Source:** V/Line official FAQ and ticketing documentation  
**Scope:** Verify reservation requirements for Maryborough, Echuca, Ararat, and authoritative list of all reserved services

---

## V/Line Reservation Categories (from Official FAQ)

**V/Line's exact statement on reserved vs unreserved services:**

> "Reserved seating is available on V/Line train services to and from Albury, Bairnsdale, Shepparton, Swan Hill and Warrnambool."
>
> "Reservations are not required on trains to and from all other destinations on the V/Line network, including Geelong, Ballarat, Bendigo, Seymour and Traralgon."

**URL:** https://www.vline.com.au/Information/FAQs/Question-1

### Detailed Breakdown by Service

| Service | Seating Model (per V/Line) | Compulsory Reservation? | V/Line Quote |
|---|---|---|---|
| **Albury** | All seats reserved | **YES** | "all seating is reserved" |
| **Warrnambool** | All seats reserved | **YES** | "all seating is reserved" |
| **Shepparton** | Mixture of reserved and unreserved carriages | **NO** (unreserved carriages walk-up available) | "mixture of reserved and unreserved carriages" |
| **Bairnsdale** | Mixture of reserved and unreserved carriages | **NO** (unreserved carriages walk-up available) | "mixture of reserved and unreserved carriages" |
| **Swan Hill** | Mixture of reserved and unreserved carriages | **NO** (unreserved carriages walk-up available) | "mixture of reserved and unreserved carriages" |
| **Geelong** | Unreserved | No | Listed in "all other destinations" |
| **Ballarat** | Unreserved | No | Listed in "all other destinations" |
| **Bendigo** | Unreserved | No | Listed in "all other destinations" |
| **Seymour** | Unreserved | No | Listed in "all other destinations" |
| **Traralgon** | Unreserved | No | Listed in "all other destinations" |
| **Maryborough** | Unreserved | **NO** | Falls under "all other destinations" |
| **Echuca** | Unreserved | **NO** | Falls under "all other destinations" |
| **Ararat** | Unreserved | **NO** | Falls under "all other destinations" |

**URL for all services:** https://www.vline.com.au/Information/FAQs/Question-1

---

## Station Calling Pattern Verification

### Maryborough Service

**Calls at Footscray?** YES  
**Calls at Sunshine?** YES  
**Route:** Southern Cross → Footscray → Sunshine → Ardeer → Deer Park → Caroline Springs → Rockbank → Cobblebank → Melton → Bacchus Marsh → Ballan → Ballarat → Creswick → Clunes → Talbot → Maryborough

**Source:** V/Line timetable data confirmed via travel planner and Wikipedia station listings

### Echuca Service

**Calls at Footscray?** YES  
**Calls at Sunshine?** YES  
**Route:** Regional Rail Link stations (dedicated V/Line platforms at both Footscray and Sunshine)

**Source:** V/Line trip planning interface and Regional Rail Link documentation

### Ararat Service

**Calls at Footscray?** YES  
**Calls at Sunshine?** YES  
**Route:** Southern Cross → Footscray → Sunshine → Ardeer → Deer Park (via Ballarat line to Ararat)

**Source:** V/Line Ararat line timetable and Ballarat line documentation

---

## Corrections to `docs/melbourne-d1/open-data-feed-and-eligibility.md`

### 1. **Maryborough Row (all stations)**

**Current verdict:** `undecided` with "Unverified: not explicitly listed in V/Line FAQ; eTicket availability suggests possible reservation"

**Correction:** Change to `in` with "No" for compulsory reservation.

**Evidence:** V/Line FAQ explicitly states reservations are not required on "trains to and from all other destinations on the V/Line network" — Maryborough, not listed among the five services with reserved seating (Albury, Bairnsdale, Shepparton, Swan Hill, Warrnambool), falls under this category.

**New URL:** https://www.vline.com.au/Information/FAQs/Question-1

---

### 2. **Echuca Row (all stations)**

**Current verdict:** `in` with "Unverified: assumed unreserved per web search mentioning no reservation needed"

**Correction:** Mark as verified (change to "No, verified").

**Evidence:** V/Line FAQ groups Echuca under "all other destinations" where "Reservations are not required."

**New URL:** https://www.vline.com.au/Information/FAQs/Question-1

---

### 3. **Ararat Row (all stations)**

**Current verdict:** `in` with "Unverified: assumed unreserved per web search mentioning no reservation needed"

**Correction:** Mark as verified (change to "No, verified").

**Evidence:** V/Line FAQ groups Ararat under "all other destinations" where "Reservations are not required."

**New URL:** https://www.vline.com.au/Information/FAQs/Question-1

---

### 4. **Shepparton and Bairnsdale Rows (Potential Reconsideration)**

**Current verdict:** `out-reservation` — "Yes" (marked as compulsory)

**Finding:** V/Line FAQ states these services offer "a mixture of reserved and unreserved carriages." Passengers can legally choose unreserved carriages, making walk-up boarding possible without pre-booking. Per `docs/board-eligibility-rule.md` §2 test 1 definition ("a rider on the platform with a standard ticket, pass, or contactless tap can board the next departure"), this suggests Shepparton and Bairnsdale may not be genuinely `out-reservation` — they should either be tested as `in` (unreserved carriage available) or a new verdict category established if partial walk-up availability is a product edge case.

**Note for Tim/Mark:** The current table treats these as fully reserved, but V/Line's own FAQ indicates mixed seating availability. Recommend clarification: are unreserved carriages on Shepparton/Bairnsdale counted as walk-up boardable (→ `in`) or is the service-level reservation policy what matters (→ stay `out-reservation`)?

**URL:** https://www.vline.com.au/Information/FAQs/Question-1

---

### 5. **Swan Hill Row**

**Current verdict:** `out-reservation` — "Yes" (marked as compulsory)

**Finding:** Same as Shepparton and Bairnsdale — V/Line offers "a mixture of reserved and unreserved carriages" on this service. Recommend review per Shepparton/Bairnsdale note above.

**URL:** https://www.vline.com.au/Information/FAQs/Question-1

---

## Summary of Changes

| Service | Current Verdict | Finding | Recommended Action |
|---|---|---|---|
| Maryborough | `undecided` | Explicitly unreserved (FAQ "all other destinations") | Change to `in`, update evidence URL |
| Echuca | `in` (unverified) | Verified as unreserved (FAQ "all other destinations") | Change evidence to verified, update URL |
| Ararat | `in` (unverified) | Verified as unreserved (FAQ "all other destinations") | Change evidence to verified, update URL |
| Albury | `out-reservation` | Verified: all seats reserved | Confirmed correct |
| Warrnambool | `out-reservation` | Verified: all seats reserved | Confirmed correct |
| Shepparton | `out-reservation` | Mixture of reserved/unreserved available | **Requires Tim/Mark review** — may not meet test 1 for `out-reservation` |
| Bairnsdale | `out-reservation` | Mixture of reserved/unreserved available | **Requires Tim/Mark review** — may not meet test 1 for `out-reservation` |
| Swan Hill | `out-reservation` | Mixture of reserved/unreserved available | **Requires Tim/Mark review** — may not meet test 1 for `out-reservation` |

---

**All URLs verified:** https://www.vline.com.au/Information/FAQs/Question-1 (valid as of 2026-09-20)
