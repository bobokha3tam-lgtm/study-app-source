// Gradual sleep-schedule adjustment.
//
// The idea: a student who currently wakes up too late (or sleeps too late)
// sets their CURRENT routine and a TARGET routine. Instead of jumping
// straight to the target (which rarely sticks), the wake/sleep time shifts
// by a small step every few days until the target is reached.

export interface SleepAdjustmentPlan {
  currentWakeTime: string; // "HH:mm", where the student actually wakes up today
  currentSleepTime: string; // "HH:mm", where the student actually falls asleep today
  targetWakeTime: string; // "HH:mm", the goal wake time
  targetSleepTime: string; // "HH:mm", the goal sleep time
  startDate: string; // "YYYY-MM-DD", the day the plan started
  stepMinutes: number; // how many minutes to shift per interval
  intervalDays: number; // how many days between each shift
}

export interface SleepAdjustmentToday {
  wakeTime: string;
  sleepTime: string;
  dayNumber: number; // 1-indexed day of the plan
  totalDaysEstimate: number; // rough total days until target is reached
  isComplete: boolean;
  wakeMinutesShiftedSoFar: number;
  wakeMinutesRemaining: number;
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

// Moves `start` toward `target` by at most `shiftAmount` minutes, never overshooting.
function moveToward(start: number, target: number, shiftAmount: number): number {
  if (start === target) return target;
  const diff = target - start;
  const dir = diff > 0 ? 1 : -1;
  const applied = Math.min(Math.abs(diff), Math.max(0, shiftAmount));
  return start + dir * applied;
}

function daysBetween(fromISO: string, toDate: Date): number {
  const from = new Date(fromISO + 'T00:00:00');
  const to = new Date(toDate.getFullYear(), toDate.getMonth(), toDate.getDate());
  return Math.floor((to.getTime() - from.getTime()) / 86400000);
}

export function computeTodaysSleepTarget(
  plan: SleepAdjustmentPlan,
  today: Date = new Date()
): SleepAdjustmentToday {
  const daysElapsed = Math.max(0, daysBetween(plan.startDate, today));
  const stepsElapsed = Math.floor(daysElapsed / Math.max(1, plan.intervalDays));
  const totalShift = stepsElapsed * plan.stepMinutes;

  const wakeStart = timeToMinutes(plan.currentWakeTime);
  const wakeTarget = timeToMinutes(plan.targetWakeTime);
  const sleepStart = timeToMinutes(plan.currentSleepTime);
  const sleepTarget = timeToMinutes(plan.targetSleepTime);

  const todayWakeMins = moveToward(wakeStart, wakeTarget, totalShift);
  const todaySleepMins = moveToward(sleepStart, sleepTarget, totalShift);

  const wakeReached = todayWakeMins === wakeTarget;
  const sleepReached = todaySleepMins === sleepTarget;

  const maxDiff = Math.max(Math.abs(wakeTarget - wakeStart), Math.abs(sleepTarget - sleepStart));
  const totalDaysEstimate = Math.max(1, Math.ceil(maxDiff / Math.max(1, plan.stepMinutes)) * plan.intervalDays);

  return {
    wakeTime: minutesToTime(todayWakeMins),
    sleepTime: minutesToTime(todaySleepMins),
    dayNumber: daysElapsed + 1,
    totalDaysEstimate,
    isComplete: wakeReached && sleepReached,
    wakeMinutesShiftedSoFar: Math.abs(todayWakeMins - wakeStart),
    wakeMinutesRemaining: Math.abs(wakeTarget - todayWakeMins),
  };
}

export const SLEEP_PACE_PRESETS: { id: string; label: string; stepMinutes: number; intervalDays: number; note: string }[] = [
  { id: 'gentle', label: 'آروم و پایدار', stepMinutes: 10, intervalDays: 3, note: 'هر ۳ روز، ۱۰ دقیقه' },
  { id: 'medium', label: 'متوسط', stepMinutes: 15, intervalDays: 2, note: 'هر ۲ روز، ۱۵ دقیقه' },
  { id: 'fast', label: 'سریع', stepMinutes: 20, intervalDays: 1, note: 'هر روز، ۲۰ دقیقه' },
];
