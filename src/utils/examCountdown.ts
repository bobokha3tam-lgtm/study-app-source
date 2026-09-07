// Computes how many days are actually left until the exam.
//
// examDate is stored as free Persian text (e.g. "جمعه ۱۸ آبان") with no year
// and no machine-parseable format, so `Date.parse()` on it basically never
// succeeds. Previously two different screens each guessed a fake day count
// (hardcoded 5/6/whatever) whenever parsing failed — meaning the "days left"
// shown had nothing to do with what the student actually typed.
//
// The reliable source of truth is now `daysUntilExam`, a number the student
// enters directly, combined with `daysUntilExamSetAt` (the moment it was set)
// so the count correctly ticks down day by day instead of staying frozen at
// whatever number was typed in a week ago.

interface ExamCountdownInput {
  daysUntilExam?: number;
  daysUntilExamSetAt?: string;
}

/**
 * Returns the current, live number of days left, or null if the student
 * hasn't entered a day count yet (better to show nothing than a fake guess).
 */
export function getLiveDaysUntilExam(examBudget: ExamCountdownInput | null | undefined): number | null {
  if (!examBudget || !examBudget.daysUntilExam || examBudget.daysUntilExam <= 0) {
    return null;
  }

  if (!examBudget.daysUntilExamSetAt) {
    // Set this session, no anchor recorded yet — trust the raw value as-is.
    return examBudget.daysUntilExam;
  }

  const anchorMs = Date.parse(examBudget.daysUntilExamSetAt);
  if (isNaN(anchorMs)) {
    return examBudget.daysUntilExam;
  }

  const elapsedDays = Math.floor((Date.now() - anchorMs) / (1000 * 60 * 60 * 24));
  return Math.max(0, examBudget.daysUntilExam - elapsedDays);
}
