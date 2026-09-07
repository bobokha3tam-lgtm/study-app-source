/**
 * Utility for gradual sleep schedule adjustment
 */

export interface SleepCheckIn {
  date: string; // YYYY-MM-DD
  success: boolean;
  actualWakeTime?: string;
}

export interface SleepAdjustmentPlan {
  id?: string;
  currentWakeTime: string; // e.g. "10:00"
  currentSleepTime: string; // e.g. "02:00"
  targetWakeTime: string; // e.g. "06:30"
  targetSleepTime: string; // e.g. "23:00"
  stepMinutes: number; // e.g. 15, 30, 45
  startDate?: string;
  checkIns: SleepCheckIn[];
}

export interface SleepPacePreset {
  id: string;
  label: string;
  stepMinutes: number;
  note: string;
}

export const SLEEP_PACE_PRESETS: SleepPacePreset[] = [
  { id: 'gentle', label: 'آرام و پیوسته (۱۵ دقیقه)', stepMinutes: 15, note: 'راحت‌ترین حالت، بدون خستگی و شوک بدنی' },
  { id: 'moderate', label: 'متعادل (۳۰ دقیقه)', stepMinutes: 30, note: 'سرعت خوب برای اهداف نزدیک' },
  { id: 'fast', label: 'سریع (۴۵ دقیقه)', stepMinutes: 45, note: 'پیشنهاد فقط در صورت ضرورت و اراده بالا' },
];

export interface TodaysSleepTarget {
  wakeTime: string;
  sleepTime: string;
  stepsSoFar: number;
  totalStepsNeeded: number;
  currentStreak: number;
  isComplete: boolean;
  hasCheckedInToday: boolean;
}

function timeToMinutes(t: string): number {
  if (!t) return 0;
  const parts = t.split(':').map(Number);
  const hours = parts[0] || 0;
  const mins = parts[1] || 0;
  return hours * 60 + mins;
}

function minutesToTime(mins: number): string {
  const normalized = ((mins % 1440) + 1440) % 1440;
  const h = Math.floor(normalized / 60);
  const m = normalized % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function getTodayStr(): string {
  const now = new Date();
  return now.toISOString().split('T')[0];
}

export function computeTodaysSleepTarget(plan: SleepAdjustmentPlan): TodaysSleepTarget {
  const currentWake = timeToMinutes(plan.currentWakeTime || '10:00');
  const targetWake = timeToMinutes(plan.targetWakeTime || '06:30');
  const currentSleep = timeToMinutes(plan.currentSleepTime || '02:00');
  const targetSleep = timeToMinutes(plan.targetSleepTime || '23:00');
  const step = Math.max(5, plan.stepMinutes || 15);

  // Calculate total difference in minutes for wake adjustment
  let diffWake = (currentWake - targetWake + 1440) % 1440;
  if (diffWake > 720) {
    // Target is later than current or alternative direction
    diffWake = (targetWake - currentWake + 1440) % 1440;
  }

  const totalStepsNeeded = Math.max(1, Math.ceil(diffWake / step));
  const checkIns = plan.checkIns || [];
  const successfulCount = checkIns.filter((c) => c.success).length;
  const stepsSoFar = Math.min(successfulCount, totalStepsNeeded);
  const isComplete = stepsSoFar >= totalStepsNeeded;

  const todayStr = getTodayStr();
  const hasCheckedInToday = checkIns.some((c) => c.date === todayStr);

  // Calculate streak from most recent backwards
  let currentStreak = 0;
  const sortedCheckIns = [...checkIns].sort((a, b) => b.date.localeCompare(a.date));
  for (const c of sortedCheckIns) {
    if (c.success) {
      currentStreak++;
    } else {
      break;
    }
  }

  if (isComplete) {
    return {
      wakeTime: plan.targetWakeTime,
      sleepTime: plan.targetSleepTime,
      stepsSoFar: totalStepsNeeded,
      totalStepsNeeded,
      currentStreak,
      isComplete: true,
      hasCheckedInToday,
    };
  }

  // Adjust wake and sleep earlier step by step
  const calculatedWakeMinutes = currentWake - stepsSoFar * step;
  const calculatedSleepMinutes = currentSleep - stepsSoFar * step;

  return {
    wakeTime: minutesToTime(calculatedWakeMinutes),
    sleepTime: minutesToTime(calculatedSleepMinutes),
    stepsSoFar,
    totalStepsNeeded,
    currentStreak,
    isComplete: false,
    hasCheckedInToday,
  };
}

export function recordCheckIn(
  plan: SleepAdjustmentPlan,
  success: boolean,
  actualWakeTime?: string
): SleepAdjustmentPlan {
  const todayStr = getTodayStr();
  const existingCheckIns = plan.checkIns || [];
  const filtered = existingCheckIns.filter((c) => c.date !== todayStr);

  const newCheckIn: SleepCheckIn = {
    date: todayStr,
    success,
    actualWakeTime,
  };

  return {
    ...plan,
    checkIns: [...filtered, newCheckIn],
  };
}
