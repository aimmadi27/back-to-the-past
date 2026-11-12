/**
 * Shared caps used by both extractFeatures (to truncate at extraction time)
 * and narrateBodySchema (to validate at API boundary time).
 *
 * Keeping them in one place ensures the two layers stay in sync.
 */
export const MAX_STRING = 200;
export const MAX_ARRAY = 20;
