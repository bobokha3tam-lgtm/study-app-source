import { getDefaultScheduledExams } from "../data/scheduledExamsData";
import { normalizeStream } from "../data/curriculumData";
import { ExamBudget, TopicExamDetail } from '../types';

// Computes how many days are actually left until the exam, with full Persian calendar awareness.

export function toEnglishDigits(str: string): string {
  if (!str) return '';
  return str
    .replace(/[۰-۹]/g, (d) => String.fromCharCode(d.charCodeAt(0) - 1728))
    .replace(/[٠-٩]/g, (d) => String.fromCharCode(d.charCodeAt(0) - 1584));
}

export function toPersianDigits(num: number | string): string {
  if (num === undefined || num === null) return '';
  const str = String(num);
  return str.replace(/[0-9]/g, (d) => String.fromCharCode(d.charCodeAt(0) + 1728));
}

export const PERSIAN_MONTH_NAMES = [
  'فروردین',
  'اردیبهشت',
  'خرداد',
  'تیر',
  'مرداد',
  'شهریور',
  'مهر',
  'آبان',
  'آذر',
  'دی',
  'بهمن',
  'اسفند',
];

export interface PersianTodayInfo {
  dayOfWeek: string; // e.g. "دوشنبه"
  dayOfWeekNumber: number; // 0 for Saturday in Iran, or JS getDay()
  persianDateOnly: string; // e.g. "۱۶ شهریور ۱۴۰۵"
  formattedFullDate: string; // e.g. "دوشنبه، ۱۶ شهریور ۱۴۰۵"
  year: number; // e.g. 1405
  month: number; // 1 to 12
  monthName: string; // e.g. "شهریور"
  day: number; // 1 to 31
  daysUntilThisFriday: number; // 0 to 6
  nextFridayPersianDate: string; // e.g. "جمعه ۲۱ شهریور ۱۴۰۵"
}

/**
 * Returns exact, live information about today in the Persian (Solar Hijri) calendar.
 */
export function getPersianTodayInfo(): PersianTodayInfo {
  const now = new Date();
  const dayOfWeek = new Intl.DateTimeFormat('fa-IR', { weekday: 'long' }).format(now);
  const formattedFullDate = new Intl.DateTimeFormat('fa-IR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(now);

  const persianDateOnly = new Intl.DateTimeFormat('fa-IR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(now);

  const parts = new Intl.DateTimeFormat('fa-IR-u-nu-latn', {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  }).formatToParts(now);

  const year = parseInt(parts.find((p) => p.type === 'year')?.value || '1405', 10);
  const month = parseInt(parts.find((p) => p.type === 'month')?.value || '6', 10);
  const day = parseInt(parts.find((p) => p.type === 'day')?.value || '16', 10);

  const jsDay = now.getDay(); // 0 is Sunday, 5 is Friday, 6 is Saturday
  const daysUntilThisFriday = (5 - jsDay + 7) % 7;

  // Next Friday date in Persian
  const nextFriday = new Date(now);
  nextFriday.setDate(now.getDate() + (daysUntilThisFriday === 0 ? 7 : daysUntilThisFriday));
  const nextFridayPersianDate = new Intl.DateTimeFormat('fa-IR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(nextFriday);

  return {
    dayOfWeek,
    dayOfWeekNumber: jsDay,
    persianDateOnly,
    formattedFullDate,
    year,
    month,
    monthName: PERSIAN_MONTH_NAMES[month - 1] || 'شهریور',
    day,
    daysUntilThisFriday,
    nextFridayPersianDate,
  };
}

/**
 * Calculates day of the Persian year (1 to 365/366)
 */
export function getPersianDayOfYear(month: number, day: number): number {
  let total = 0;
  for (let m = 1; m < month; m++) {
    total += m <= 6 ? 31 : 30;
  }
  return total + day;
}

/**
 * Parses free Persian date text e.g. "جمعه ۲۱ شهریور" or "۱۸ آبان ۱۴۰۵"
 */
export function parsePersianDateString(text: string): { day: number; month: number; year?: number; monthName: string } | null {
  if (!text) return null;
  const normalized = toEnglishDigits(text);
  const match = normalized.match(/(\d{1,2})\s+(فروردین|اردیبهشت|خرداد|تیر|مرداد|شهریور|مهر|آبان|آذر|دی|بهمن|اسفند)/);
  if (!match) return null;

  const day = parseInt(match[1], 10);
  const monthIdx = PERSIAN_MONTH_NAMES.indexOf(match[2]);
  if (monthIdx === -1) return null;

  const yearMatch = normalized.match(/(14\d\d)/);
  const year = yearMatch ? parseInt(yearMatch[1], 10) : undefined;

  return {
    day,
    month: monthIdx + 1,
    monthName: match[2],
    year,
  };
}

export interface ExamCountdownInput {
  examName?: string;
  examDate?: string;
  dateGregorian?: string;
  daysUntilExam?: number;
  daysUntilExamSetAt?: string;
}

export interface ExamCountdownResult {
  daysLeft: number | null;
  isToday: boolean;
  isPast: boolean;
  daysPast?: number;
  label: string;
  badgeColor: string;
}

export const NEXT_UPCOMING_EXAM_DEFAULT = {
  examName: 'آزمون آنلاین کشوری ماز - مرحله ۱ (۲۷ شهریور)',
  examDate: 'جمعه ۲۷ شهریور ۱۴۰۵',
  dateGregorian: '2026-09-18',
  stageTitle: 'مرحله ۱ کشوری ماز - آزمون ۲۷ شهریور (فصول آغازین دوازدهم + پایه)',
  organization: 'ماز' as const,
  targetGoalText: 'تراز ماز بالای ۱۱,۰۰۰ (مقیاس ۱۲,۰۰۰ کشوری) با درصد اختصاصی بالای ۷۰٪',
};

/**
 * Calculates the live, accurate number of days remaining until the exam.
 * Combines Gregorian dates, Persian date parsing, standard Friday cycles, and user overrides.
 */
export function calculateExamCountdown(input: ExamCountdownInput | null | undefined): ExamCountdownResult {
  if (!input) {
    return { daysLeft: null, isToday: false, isPast: false, label: 'تاریخ نامشخص', badgeColor: 'stone' };
  }

  const today = getPersianTodayInfo();
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  // 1. If dateGregorian is provided (e.g. "2026-09-11")
  if (input.dateGregorian) {
    const target = new Date(input.dateGregorian);
    if (!isNaN(target.getTime())) {
      target.setHours(0, 0, 0, 0);
      const diffDays = Math.round((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays === 0) {
        return { daysLeft: 0, isToday: true, isPast: false, label: '📍 امروز روز برگزاری آزمون است!', badgeColor: 'emerald' };
      } else if (diffDays < 0) {
        const pastDays = Math.abs(diffDays);
        return { 
          daysLeft: 0, 
          isToday: false, 
          isPast: true, 
          daysPast: pastDays,
          label: `⚠️ تاریخ این آزمون (${toPersianDigits(pastDays)} روز پیش) برگزار شده و گذشته است`, 
          badgeColor: 'rose' 
        };
      } else {
        return {
          daysLeft: diffDays,
          isToday: false,
          isPast: false,
          label: `${toPersianDigits(diffDays)} روز مانده تا آزمون`,
          badgeColor: diffDays <= 2 ? 'rose' : diffDays <= 6 ? 'amber' : 'emerald',
        };
      }
    }
  }

  // 2. Parse Persian date text in examDate (e.g. "جمعه ۲۱ شهریور", "۶ شهریور", "۱۸ آبان")
  const dateText = (input.examDate || '').trim();
  if (dateText) {
    // Relative keywords
    if (dateText.includes('پیش‌رو') || dateText.includes('این هفته') || dateText.includes('جمعه این هفته')) {
      const d = Math.max(1, today.daysUntilThisFriday);
      return {
        daysLeft: d,
        isToday: d === 0,
        isPast: false,
        label: d === 0 ? '📍 امروز روز آزمون است!' : `${toPersianDigits(d)} روز مانده تا جمعه این هفته`,
        badgeColor: d <= 2 ? 'rose' : 'amber',
      };
    }
    if (dateText.includes('هفته آینده') || dateText.includes('جمعه آینده')) {
      const d = today.daysUntilThisFriday + 7;
      return {
        daysLeft: d,
        isToday: false,
        isPast: false,
        label: `${toPersianDigits(d)} روز مانده تا جمعه آینده`,
        badgeColor: 'emerald',
      };
    }

    const parsedPersian = parsePersianDateString(dateText);
    if (parsedPersian) {
      const currentDayOfYear = getPersianDayOfYear(today.month, today.day);
      const targetDayOfYear = getPersianDayOfYear(parsedPersian.month, parsedPersian.day);
      let diff = targetDayOfYear - currentDayOfYear;

      // If next year
      if (parsedPersian.year && parsedPersian.year > today.year) {
        diff += 365;
      }

      if (diff === 0) {
        return { daysLeft: 0, isToday: true, isPast: false, label: '📍 امروز روز آزمون است!', badgeColor: 'emerald' };
      } else if (diff < 0) {
        const pastDays = Math.abs(diff);
        return { 
          daysLeft: 0, 
          isToday: false, 
          isPast: true, 
          daysPast: pastDays,
          label: `⚠️ تاریخ این آزمون (${toPersianDigits(pastDays)} روز پیش) گذشته است`, 
          badgeColor: 'rose' 
        };
      } else {
        return {
          daysLeft: diff,
          isToday: false,
          isPast: false,
          label: `${toPersianDigits(diff)} روز مانده تا آزمون (${dateText})`,
          badgeColor: diff <= 2 ? 'rose' : diff <= 6 ? 'amber' : 'emerald',
        };
      }
    }

    // Try standard ISO parse
    const parsedTs = Date.parse(dateText);
    if (!isNaN(parsedTs)) {
      const diff = Math.round((parsedTs - now.getTime()) / (1000 * 60 * 60 * 24));
      if (diff > 0) {
        return {
          daysLeft: diff,
          isToday: false,
          isPast: false,
          label: `${toPersianDigits(diff)} روز مانده تا آزمون`,
          badgeColor: diff <= 2 ? 'rose' : diff <= 6 ? 'amber' : 'emerald',
        };
      } else if (diff === 0) {
        return { daysLeft: 0, isToday: true, isPast: false, label: '📍 امروز روز آزمون است!', badgeColor: 'emerald' };
      } else {
        const pastDays = Math.abs(diff);
        return {
          daysLeft: 0,
          isToday: false,
          isPast: true,
          daysPast: pastDays,
          label: `⚠️ تاریخ این آزمون (${toPersianDigits(pastDays)} روز پیش) گذشته است`,
          badgeColor: 'rose',
        };
      }
    }
  }

  // 3. If daysUntilExam was set explicitly with timestamp
  if (input.daysUntilExam && input.daysUntilExam > 0) {
    let days = input.daysUntilExam;
    if (input.daysUntilExamSetAt) {
      const anchorMs = Date.parse(input.daysUntilExamSetAt);
      if (!isNaN(anchorMs)) {
        const elapsed = Math.floor((Date.now() - anchorMs) / (1000 * 60 * 60 * 24));
        days = Math.max(0, input.daysUntilExam - elapsed);
      }
    }
    if (days === 0) {
      return { daysLeft: 0, isToday: true, isPast: false, label: '📍 امروز روز آزمون است!', badgeColor: 'emerald' };
    }
    return {
      daysLeft: days,
      isToday: false,
      isPast: false,
      label: `${toPersianDigits(days)} روز مانده تا آزمون`,
      badgeColor: days <= 2 ? 'rose' : days <= 6 ? 'amber' : 'emerald',
    };
  }

  // Fallback default: upcoming Friday
  const defaultDays = Math.max(1, today.daysUntilThisFriday);
  return {
    daysLeft: defaultDays,
    isToday: defaultDays === 0,
    isPast: false,
    label: defaultDays === 0 ? '📍 امروز روز آزمون است!' : `${toPersianDigits(defaultDays)} روز مانده تا آزمون جمعه پیش‌رو`,
    badgeColor: defaultDays <= 2 ? 'rose' : 'amber',
  };
}

/**
 * Legacy compatibility wrapper: returns number of days left or null
 */
export function getLiveDaysUntilExam(examBudget: ExamCountdownInput | null | undefined): number | null {
  const res = calculateExamCountdown(examBudget);
  return res.daysLeft;
}

/**
 * Checks whether an exam date is past relative to today (16 Shahrivar 1405).
 */
export function isExamPast(examDate?: string, dateGregorian?: string): boolean {
  if (!examDate && !dateGregorian) return false;
  const res = calculateExamCountdown({ examDate, dateGregorian });
  return res.isPast;
}

/**
 * Ensures an ExamBudget object is up to date:
 * If the current exam date is expired/past (e.g. contains "۶ شهریور" or past timestamp)
 * or set to the incorrect earlier date ("۲۱ شهریور"), it advances it automatically
 * to the user's actual upcoming Maz exam date (جمعه ۲۷ شهریور ۱۴۰۵).
 */
export function sanitizeAndAdvanceExamBudget(budget: ExamBudget | null | undefined, _fieldOfStudy?: string): ExamBudget {
  const stream = normalizeStream(_fieldOfStudy);
  const stage1Exam = getDefaultScheduledExams(stream)[0];
  
  const defaultFallback: ExamBudget = {
    examName: stage1Exam.examName,
    examDate: stage1Exam.examDate,
    dateGregorian: stage1Exam.dateGregorian,
    targetGoalText: stage1Exam.targetGoalText || 'تراز ماز بالای ۱۱,۰۰۰ (مقیاس ۱۲,۰۰۰ کشوری) با درصد اختصاصی بالای ۷۰٪',
    syllabusDetails: stage1Exam.syllabusSummary,
    selectedTopics: stage1Exam.selectedTopics,
    topicDetails: stage1Exam.topicDetails,
    totalTargetTests: stage1Exam.totalTargetTests || 480,
    daysUntilExam: 11,
    daysUntilExamSetAt: new Date().toISOString()
  };

  if (!budget) {
    return defaultFallback;
  }

  const res = calculateExamCountdown(budget);
  const normalizedDate = toEnglishDigits(budget.examDate || '');
  const needsAdvance = res.isPast || 
    normalizedDate.includes('6 شهریور') || 
    normalizedDate.includes('۶ شهریور') ||
    normalizedDate.includes('21 شهریور') ||
    normalizedDate.includes('۲۱ شهریور') ||
    budget.dateGregorian === '2026-09-11';

  if (needsAdvance) {
    return {
      ...budget,
      examName: defaultFallback.examName,
      examDate: defaultFallback.examDate,
      dateGregorian: defaultFallback.dateGregorian,
      daysUntilExam: 11,
      daysUntilExamSetAt: new Date().toISOString(),
      targetGoalText: budget.targetGoalText?.includes('۱۲') || budget.targetGoalText?.includes('12') || budget.targetGoalText?.includes('ماز')
        ? budget.targetGoalText
        : defaultFallback.targetGoalText,
      syllabusDetails: defaultFallback.syllabusDetails,
      selectedTopics: defaultFallback.selectedTopics,
      topicDetails: defaultFallback.topicDetails,
      totalTargetTests: defaultFallback.totalTargetTests
    };
  }

  return budget;
}


