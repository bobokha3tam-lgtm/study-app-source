// Gradual, check-in-driven sleep-schedule adjustment.
//
// Instead of blindly advancing the target every N days (which keeps pushing
// the goal further away if the student doesn't actually manage to wake up
// on time), the target only moves one step closer once the student confirms
// they actually hit today's target. A missed or unconfirmed day simply holds
// the target where it is — no growing gap, no guilt spiral, just another
// shot at the same (already-reachable) time tomorrow.

export interface SleepCheckIn {
  date: string; // "YYYY-MM-DD"
  success: boolean;
}

export interface SleepAdjustmentPlan {
  currentWakeTime: string; // "HH:mm", starting point
  currentSleepTime: string; // "HH:mm", starting point
  targetWakeTime: string; // "HH:mm", the goal
  targetSleepTime: string; // "HH:mm", the goal
  stepMinutes: number; // how many minutes closer to move per confirmed success
  confirmedSteps: number; // how many successful steps have been earned so far
  history: SleepCheckIn[]; // most recent first, kept short
}

function timeToMinutes(t: string): number {
  const [h, m] = t.split(':').map((n) => parseInt(n, 10) || 0);
  return h * 60 + m;
}

function minutesToTime(mins: number): string {
  const clamped = Math.max(0, Math.min(23 * 60 + 59, Math.round(mins)));
  const h = Math.floor(clamped / 60);
  const m = clamped % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function moveToward(start: number, target: number, shiftAmount: number): number {
  if (start === target) return target;
  const diff = target - start;
  const dir = diff > 0 ? 1 : -1;
  const applied = Math.min(Math.abs(diff), Math.max(0, shiftAmount));
  return start + dir * applied;
}

export function todayISO(d: Date = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export interface SleepAdjustmentToday {
  wakeTime: string;
  sleepTime: string;
  stepsSoFar: number;
  totalStepsNeeded: number;
  isComplete: boolean;
  hasCheckedInToday: boolean;
  currentStreak: number; // consecutive successful check-ins, most recent first
}

function totalStepsNeeded(plan: SleepAdjustmentPlan): number {
  const wakeDiff = Math.abs(timeToMinutes(plan.targetWakeTime) - timeToMinutes(plan.currentWakeTime));
  const sleepDiff = Math.abs(timeToMinutes(plan.targetSleepTime) - timeToMinutes(plan.currentSleepTime));
  const maxDiff = Math.max(wakeDiff, sleepDiff);
  return Math.max(1, Math.ceil(maxDiff / Math.max(1, plan.stepMinutes)));
}

export function computeTodaysSleepTarget(
  plan: SleepAdjustmentPlan,
  today: Date = new Date()
): SleepAdjustmentToday {
  const needed = totalStepsNeeded(plan);
  const steps = Math.min(plan.confirmedSteps, needed);
  const shiftAmount = steps * plan.stepMinutes;

  const wakeMins = moveToward(timeToMinutes(plan.currentWakeTime), timeToMinutes(plan.targetWakeTime), shiftAmount);
  const sleepMins = moveToward(timeToMinutes(plan.currentSleepTime), timeToMinutes(plan.targetSleepTime), shiftAmount);

  const todayStr = todayISO(today);
  const hasCheckedInToday = plan.history.some((h) => h.date === todayStr);

  let currentStreak = 0;
  for (const h of plan.history) {
    if (h.success) currentStreak++;
    else break;
  }

  return {
    wakeTime: minutesToTime(wakeMins),
    sleepTime: minutesToTime(sleepMins),
    stepsSoFar: steps,
    totalStepsNeeded: needed,
    isComplete: steps >= needed,
    hasCheckedInToday,
    currentStreak,
  };
}

// Records today's check-in. On success, advances one step (capped at the
// total needed). On failure, the step count is untouched — tomorrow's
// target will be exactly the same as today's, giving another shot at it.
export function recordCheckIn(
  plan: SleepAdjustmentPlan,
  success: boolean,
  today: Date = new Date()
): SleepAdjustmentPlan {
  const todayStr = todayISO(today);
  const existing = plan.history.find((h) => h.date === todayStr);
  const history = existing
    ? plan.history.map((h) => (h.date === todayStr ? { date: todayStr, success } : h))
    : [{ date: todayStr, success }, ...plan.history].slice(0, 60);

  const needed = totalStepsNeeded(plan);
  let confirmedSteps = plan.confirmedSteps;
  if (success && !existing?.success) {
    confirmedSteps = Math.min(needed, confirmedSteps + 1);
  } else if (!success && existing?.success) {
    // Correcting an earlier accidental "success" tap back to "missed".
    confirmedSteps = Math.max(0, confirmedSteps - 1);
  }

  return { ...plan, history, confirmedSteps };
}

export const SLEEP_PACE_PRESETS: { id: string; label: string; stepMinutes: number; note: string }[] = [
  { id: 'gentle', label: 'آروم و پایدار', stepMinutes: 10, note: '۱۰ دقیقه به ازای هر روز موفق' },
  { id: 'medium', label: 'متوسط', stepMinutes: 15, note: '۱۵ دقیقه به ازای هر روز موفق' },
  { id: 'fast', label: 'سریع', stepMinutes: 20, note: '۲۰ دقیقه به ازای هر روز موفق' },
];
