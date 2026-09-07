/**
 * Utility for safely interacting with localStorage, handling quota errors and array capping.
 */

export function safeSetItem(key: string, value: string): boolean {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (error: any) {
    if (
      error?.name === 'QuotaExceededError' ||
      error?.code === 22 ||
      error?.code === 1014 ||
      error?.number === -2147024882
    ) {
      console.warn(`[safeStorage] QuotaExceededError for key "${key}". Attempting cleanup...`);
      try {
        // Clear non-essential cached keys
        const keysToEvict = [
          'study_advisor_reports',
          'study_advisor_focus_sessions',
          'study_advisor_spaced_cards',
          'study_advisor_feynman',
          'study_advisor_exam_errors'
        ];

        for (const k of keysToEvict) {
          if (k !== key) {
            const raw = localStorage.getItem(k);
            if (raw) {
              try {
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed) && parsed.length > 50) {
                  localStorage.setItem(k, JSON.stringify(parsed.slice(-30)));
                }
              } catch {
                // ignore
              }
            }
          }
        }

        localStorage.setItem(key, value);
        return true;
      } catch (retryError) {
        console.error(`[safeStorage] Failed to save key "${key}" even after cleanup:`, retryError);
        return false;
      }
    }
    console.error(`[safeStorage] Error saving key "${key}":`, error);
    return false;
  }
}

export function safeGetItem(key: string, defaultValue: string | null = null): string | null {
  try {
    const item = localStorage.getItem(key);
    return item !== null ? item : defaultValue;
  } catch (e) {
    console.warn(`[safeStorage] Error reading key "${key}":`, e);
    return defaultValue;
  }
}

export function safeRemoveItem(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch (e) {
    console.warn(`[safeStorage] Error removing key "${key}":`, e);
  }
}

export function capArray<T>(arr: T[] | null | undefined, limit: number): T[] {
  if (!Array.isArray(arr)) return [];
  if (arr.length <= limit) return arr;
  return arr.slice(-limit);
}
