import { StudentProfile, NightlyReport, WeeklySchedule, FocusTestSession, SpacedRepetitionCard, ExamErrorLog } from '../types';

export interface StudentUsageStats {
  studentKey: string;
  studentName: string;
  totalStudiedHours: number;
  recentWeekHours: number;
  dailyAverageHours: number;
  targetDailyHours: number;
  targetAchievementPercentage: number;
  totalTests: number;
  correctTests: number;
  wrongTests: number;
  testAccuracyPercentage: number;
  reportsCount: number;
  latestReportDate: string | null;
  latestReportSatisfaction: number | null;
  latestReportObstacles: string[];
  focusSessionsCount: number;
  totalFocusMinutes: number;
  leitnerTotalCards: number;
  leitnerMasteredCards: number;
  examErrorsCount: number;
  lastActiveTimestamp: string | null;
  activityStatus: 'active_today' | 'active_recent' | 'needs_followup' | 'dormant';
  aiUsageCount: number;
}

export function calculateStudentUsage(student: StudentProfile): StudentUsageStats {
  const key = student.id || student.name;
  let reports: NightlyReport[] = [];
  let schedule: WeeklySchedule | null = null;
  let focusSessions: FocusTestSession[] = [];
  let spacedCards: SpacedRepetitionCard[] = [];
  let examErrors: ExamErrorLog[] = [];
  let lastActiveTimestamp: string | null = null;

  if (typeof window !== 'undefined') {
    try {
      const savedReports = localStorage.getItem(`study_advisor_reports_${key}`) || (key === 'st_ali' || key === 'علی' ? localStorage.getItem('study_advisor_reports') : null);
      if (savedReports) reports = JSON.parse(savedReports);
    } catch (e) {
      console.error(e);
    }

    try {
      const savedSchedule = localStorage.getItem(`study_advisor_schedule_${key}`) || (key === 'st_ali' || key === 'علی' ? localStorage.getItem('study_advisor_schedule') : null);
      if (savedSchedule) schedule = JSON.parse(savedSchedule);
    } catch (e) {
      console.error(e);
    }

    try {
      const savedFocus = localStorage.getItem(`study_advisor_focus_sessions_${key}`) || (key === 'st_ali' || key === 'علی' ? localStorage.getItem('study_advisor_focus_sessions') : null);
      if (savedFocus) focusSessions = JSON.parse(savedFocus);
    } catch (e) {
      console.error(e);
    }

    try {
      const savedCards = localStorage.getItem(`study_advisor_spaced_cards_${key}`) || (key === 'st_ali' || key === 'علی' ? localStorage.getItem('study_advisor_spaced_cards') : null);
      if (savedCards) spacedCards = JSON.parse(savedCards);
    } catch (e) {
      console.error(e);
    }

    try {
      const savedErrors = localStorage.getItem(`study_advisor_errors_${key}`) || (key === 'st_ali' || key === 'علی' ? localStorage.getItem('study_advisor_errors') : null);
      if (savedErrors) examErrors = JSON.parse(savedErrors);
    } catch (e) {
      console.error(e);
    }

    try {
      lastActiveTimestamp = localStorage.getItem(`study_advisor_last_active_${key}`);
    } catch (e) {
      console.error(e);
    }
  }

  // Calculate Studied Hours
  const reportHoursSum = reports.reduce((acc, r) => acc + (Number(r.studiedHours) || 0), 0);
  let scheduleCompletedHours = 0;
  if (schedule && Array.isArray(schedule.days)) {
    schedule.days.forEach((d) => {
      if (Array.isArray(d.blocks)) {
        d.blocks.forEach((b) => {
          if (b.isDone) {
            scheduleCompletedHours += (b.actualDurationMinutes || b.durationMinutes || 0) / 60;
          }
        });
      }
    });
  }

  const totalStudiedHours = Math.round((reportHoursSum > 0 ? reportHoursSum : scheduleCompletedHours) * 10) / 10;
  const daysCount = reports.length > 0 ? reports.length : 1;
  const dailyAverageHours = Math.round((totalStudiedHours / daysCount) * 10) / 10;
  const targetDailyHours = student.dailyTargetHours || 8;
  const targetAchievementPercentage = Math.min(100, Math.round((dailyAverageHours / (targetDailyHours || 8)) * 100));

  // Tests
  const reportTestsSum = reports.reduce((acc, r) => acc + (Number(r.totalTests) || 0), 0);
  const reportCorrectSum = reports.reduce((acc, r) => acc + (Number(r.correctTests) || 0), 0);
  const reportWrongSum = reports.reduce((acc, r) => acc + (Number(r.wrongTests) || 0), 0);

  const focusTestsSum = focusSessions.reduce((acc, f) => acc + (Number(f.completedCount) || 0), 0);
  const focusCorrectSum = focusSessions.reduce((acc, f) => acc + (Number(f.correctCount) || 0), 0);
  const focusWrongSum = focusSessions.reduce((acc, f) => acc + (Number(f.wrongCount) || 0), 0);

  const totalTests = reportTestsSum + focusTestsSum;
  const correctTests = reportCorrectSum + focusCorrectSum;
  const wrongTests = reportWrongSum + focusWrongSum;
  const testAccuracyPercentage = totalTests > 0 ? Math.round((correctTests / totalTests) * 100) : 0;

  // Latest report
  const sortedReports = [...reports].sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  const latestReport = sortedReports[0] || null;

  // Focus
  const totalFocusMinutes = focusSessions.reduce((acc, f) => acc + Math.round((f.timeSpentSeconds || 0) / 60), 0);

  // Leitner
  const leitnerTotalCards = spacedCards.length;
  const leitnerMasteredCards = spacedCards.filter((c) => c.isMastered || (c.stage && c.stage >= 5)).length;

  // Activity Status
  let activityStatus: 'active_today' | 'active_recent' | 'needs_followup' | 'dormant' = 'dormant';
  if (latestReport) {
    activityStatus = 'active_recent';
  }
  if (dailyAverageHours < 4 && reports.length > 0) {
    activityStatus = 'needs_followup';
  } else if (reports.length > 0 || focusSessions.length > 0) {
    activityStatus = 'active_recent';
  }

  return {
    studentKey: key,
    studentName: student.name,
    totalStudiedHours,
    recentWeekHours: totalStudiedHours,
    dailyAverageHours,
    targetDailyHours,
    targetAchievementPercentage,
    totalTests,
    correctTests,
    wrongTests,
    testAccuracyPercentage,
    reportsCount: reports.length,
    latestReportDate: latestReport ? latestReport.date : null,
    latestReportSatisfaction: latestReport ? latestReport.satisfactionRating : null,
    latestReportObstacles: latestReport && Array.isArray(latestReport.obstacles) ? latestReport.obstacles : [],
    focusSessionsCount: focusSessions.length,
    totalFocusMinutes,
    leitnerTotalCards,
    leitnerMasteredCards,
    examErrorsCount: examErrors.length,
    lastActiveTimestamp,
    activityStatus,
    aiUsageCount: 0,
  };
}
