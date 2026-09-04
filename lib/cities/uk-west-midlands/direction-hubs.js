/**
 * Direction hub anchoring — West Midlands (FB-50).
 *
 * Thin re-export of the shared UK helper (lib/cities/uk/direction-hubs.js,
 * FB-51) bound to regionId "uk-west-midlands", so nothing in West Midlands
 * changes: same functions, same signatures, same behaviour, just lifted so
 * other regions can share the mechanism.
 *
 * Design: docs/direction-hub-anchoring-issue.md, briefs:
 * docs/jim-brief-uk-west-midlands-hub-anchoring.md (FB-50, this region),
 * docs/jim-brief-fb51-uk-hub-rollout.md (FB-51, the lift).
 */
import {
  chipDestinationPart as sharedChipDestinationPart,
  loadDirectionHubs as sharedLoadDirectionHubs,
  findHubForStation as sharedFindHubForStation,
  applyDirectionHubs as sharedApplyDirectionHubs,
} from "../uk/direction-hubs.js";

export const chipDestinationPart = sharedChipDestinationPart;

/** @param {string} [regionId] */
export function loadDirectionHubs(regionId = "uk-west-midlands") {
  return sharedLoadDirectionHubs(regionId);
}

export const findHubForStation = sharedFindHubForStation;
export const applyDirectionHubs = sharedApplyDirectionHubs;
