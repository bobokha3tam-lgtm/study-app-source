// Guards every localStorage write against QuotaExceededError.
//
// Root cause of the "app loads then goes white" bug: every persistence
// useEffect in App.tsx called localStorage.setItem(...) directly. Browsers
// cap localStorage at ~5-10MB per origin; once a long-running account's
// history (schedule, nightly reports, spaced-repetition cards, etc.) pushed
// past that limit, setItem started throwing on every render, and with no
// try/catch (and no ErrorBoundary) React unmounted the whole app.
//
// This helper never throws. On quota errors it first tries to make room by
// dropping this app's own oldest/largest cached entries, then retries once,
// and otherwise just logs a warning and gives up on that single write rather
// than crashing the whole page.

const APP_PREFIX = 'study_advisor_';

function isQuotaExceededError(err: unknown): boolean {
  if (!(err instanceof DOMException)) return false;
  return (
    err.name === 'QuotaExceededError' ||
    // Older Firefox
    err.name === 'NS_ERROR_DOM_QUOTA_REACHED'
  );
}

/**
 * Frees up space by removing this app's own least-recently-set large keys.
 * Never touches keys outside our own prefix.
 */
function tryFreeSpace() {
  try {
    const candidates = Object.keys(localStorage).filter((k) => k.startsWith(APP_PREFIX));
    // Prioritize dropping duplicate/legacy "global" keys first (the app also
    // keeps a per-student-keyed copy of the same data), then fall back to the
    // largest remaining values.
    const legacyGlobalKeys = candidates.filter((k) => !/_\S+$/.test(k) || [
      'study_advisor_schedule', 'study_advisor_exam_budget', 'study_advisor_reports',
      'study_advisor_spaced_cards', 'study_advisor_feynman', 'study_advisor_exam_errors',
      'study_advisor_focus_sessions', 'study_advisor_topic_mastery',
    ].includes(k));

    for (const key of legacyGlobalKeys) {
      localStorage.removeItem(key);
    }
  } catch (e) {
    // Best-effort only.
  }
}

/**
 * Safe replacement for localStorage.setItem. Never throws.
 * Returns true if the value was successfully stored.
 */
export function safeSetItem(key: string, value: string): boolean {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (err) {
    if (isQuotaExceededError(err)) {
      console.warn(`[safeStorage] Quota exceeded while saving "${key}" — attempting cleanup and retry.`);
      tryFreeSpace();
      try {
        localStorage.setItem(key, value);
        return true;
      } catch (retryErr) {
        console.error(`[safeStorage] Still over quota after cleanup; dropping this save for "${key}".`, retryErr);
        return false;
      }
    }
    console.error(`[safeStorage] Failed to save "${key}":`, err);
    return false;
  }
}

/**
 * Keeps only the most recent `limit` items of an array before persisting it,
 * so history-style lists (reports, spaced cards, etc.) can't grow forever and
 * re-trigger the quota error on every future save.
 */
export function capArray<T>(items: T[], limit: number): T[] {
  if (!Array.isArray(items) || items.length <= limit) return items;
  return items.slice(items.length - limit);
}
