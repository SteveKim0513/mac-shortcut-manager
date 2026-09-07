/**
 * Pure predicate: should auto-update run for this app identity? Kept
 * dependency-free (no electron import) so it stays trivially testable —
 * `electron/updater.ts` wires it to the live `app.*` values. Mirrors
 * mind-map's src/shared/updateGate.ts, minus the "Dev build" name check
 * (this project has no separate dev-identity build yet).
 */
export function shouldEnableUpdates(o: { packaged: boolean; feedOverride?: boolean }): boolean {
  if (o.feedOverride) return true; // MSM_UPDATE_URL test/override hook
  return o.packaged; // never in `npm run dev`
}
