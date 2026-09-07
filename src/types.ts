export interface BoundDevice {
  deviceId: string; // digital fingerprint / hardware hash
  deviceType: 'mobile' | 'desktop' | 'tablet' | 'unknown';
  deviceName: string; // e.g., 'گوشی آیفون (Safari)', 'لپ‌تاپ ویندوز (Chrome)'
  browser: string;
  os: string;
  ip: string;
  firstBoundAt: string;
  lastActiveAt: string;
  userAgent?: string;
  isCurrentDevice?: boolean;
}

export interface StudentProfile {
  id?: string;
  name: string;
  grade: string; // e.g., 'دوازدهم / کنکور'
  fieldOfStudy: string; // e.g., 'علوم تجربی', 'ریاضی و فیزیک', 'ادبیات و علوم انسانی'
  targetGoal: string; // e.g., 'پزشکی دانشگاه تهران', 'مهندسی کامپیوتر شریف'
  dailyTargetHours: number; // e.g., 7
  wakeTime: string; // e.g., '06:30'
  sleepTime: string; // e.g., '23:30'
  strongSubjects: string[]; // e.g., ['زیست‌شناسی', 'شیمی']
  weakSubjects: string[]; // e.g., ['ریاضی', 'فیزیک مبحث حرکت‌شناسی']
  schoolOrWorkHours: string; // e.g., 'شنبه تا چهارشنبه ۷:۳۰ تا ۱۳:۳۰'
  additionalNotes?: string;
  password?: string; // رمز ورود اختصاصی این دانش‌آموز (Default: 1234)
  passwordHash?: string; // هش امنیتی سالت‌شده PBKDF2
  hasPassword?: boolean; // نشانگر وجود رمز بدون افشای متن آن
  accessStatus?: 'active' | 'suspended' | 'expired'; // وضعیت دسترسی دانش‌آموز
  accessExpiresAt?: string; // تاریخ انقضای دسترسی YYYY-MM-DD
  lockoutReason?: string; // پیام علت مسدودسازی یا انقضا
  telegramChatId?: string; // شناسه چت یا آیدی عددی تلگرام دانش‌آموز جهت اتصال به ربات مشاور
  telegramUsername?: string; // یوزرنیم تلگرام دانش‌آموز
  maxAllowedDevices?: number; // سقف تعداد دستگاه مجاز (پیش‌فرض: ۲ دستگاه)
  strictDeviceLock?: boolean; // فعال بودن قفل اثر انگشت دستگاه
  boundDevices?: BoundDevice[]; // لیست دستگاه‌های ثبت‌شده و مجاز
  isPendingInitialSync?: boolean; // نشانگر وضعیت اتصال اولیه به سرور
}

export interface SecurityAuditLog {
  id: string;
  timestamp: string;
  eventType: 'counselor_login_success' | 'counselor_login_failed' | 'password_changed' | 'brute_force_blocked' | 'student_login_success' | 'student_login_failed' | 'emergency_session_reset' | 'threat_blocked' | 'honeypot_trap' | 'counter_attack_executed' | 'ip_banned' | 'ip_unbanned' | string;
  severity: 'info' | 'warning' | 'critical';
  details: string;
  ip?: string;
  threatType?: 'sqli' | 'xss' | 'honeypot' | 'ddos' | 'brute_force' | 'rce' | 'nosql';
}

export interface BannedIpRecord {
  ip: string;
  bannedAt: string;
  expiresAt: string;
  reason: string;
  attackCount: number;
  threatType: string;
  counterMeasure: 'tarpit' | 'hard_drop' | 'honeypot_poison';
}

export interface SecurityMetrics {
  securityScore: number;
  activeSessionsCount: number;
  totalBlockedAttempts: number;
  passwordsHashed: boolean;
  dataMaskingActive: boolean;
  bruteForceProtection: boolean;
  wafActive: boolean;
  antiDDoSActive: boolean;
  defconLevel: 1 | 2 | 3 | 4 | 5; // 1 = Maximum lockdown / Active Counter-Defense, 5 = Normal
  tarpitActive: boolean;
  bannedIps: BannedIpRecord[];
  thwartedAttacksCount: number;
  recentAuditLogs: SecurityAuditLog[];
}

export interface WeeklyClass {
  id: string;
  dayName: 'شنبه' | 'یکشنبه' | 'دوشنبه' | 'سه‌شنبه' | 'چهارشنبه' | 'پنج‌شنبه' | 'جمعه' | string;
  startTime: string; // e.g. '16:00'
  endTime: string; // e.g. '18:30'
  subject: string; // e.g. 'حسابان ۲ استاد فلانی'
  teacherOrInstitute?: string; // e.g. 'ماز / تاملند / کلاس‌نو'
  locationOrType: 'online' | 'in_person'; // آنلاین یا حضوری
  postClassStudyHoursNeeded?: number; // ساعت مرور و حل تکلیف بعد از کلاس (e.g. 1.5)
}

export interface TopicExamDetail {
  id: string;
  subject: string;
  chapter: string;
  subtopic: string;
  difficulty: 'آسان' | 'متوسط' | 'سخت' | 'بسیار چالشی و دام‌دار';
  targetTestCount: number; // تعداد تست هدف
  completedTestCount?: number;
  importanceWeight: 'کم' | 'متوسط' | 'پرتکرار و حیاتی (تضمین درصد)';
  hasPrerequisiteInClass?: boolean; // آیا منوط به تدریس کلاس هفتگی است؟
  pagesOrScope?: string; // صفحات دقیق کتاب درسی یا جزوه
  testTypes?: string; // تیپ تست‌ها مثل تالیفی ماز، کنکور سراسری، مسائل دام‌دار
}

export interface StudyBlock {
  id: string;
  timeSlot: string; // e.g., '08:00 - 09:30'
  subject: string;
  topic: string;
  durationMinutes: number;
  type: 'concept' | 'test' | 'review' | 'compensatory' | 'class' | 'class_homework';
  targetTests?: number; // تعداد تست مشخص شده برای این پارت
  difficultyLevel?: string; // درجه سختی
  recommendedMethod?: string; // متد پیشنهادی مطالعه
  isDone?: boolean;
  actualDurationMinutes?: number; // دقایق واقعی مطالعه شده در اتاق تمرکز
}

export interface DaySchedule {
  dayName: string; // 'شنبه', 'یکشنبه', ...
  date?: string;
  targetHours: number;
  blocks: StudyBlock[];
  dailyTip?: string;
}

export interface WeeklySchedule {
  id: string;
  createdAt: string;
  weekTitle: string;
  totalPlannedHours: number;
  strategySummary: string;
  days: DaySchedule[];
  archivedAt?: string; // تاریخ آرشیو شدن
  completionRate?: number; // درصد پایانی تحقق برنامه
  completedBlocksCount?: number;
  totalBlocksCount?: number;
  cycleWeek?: 'week_1' | 'week_2' | 'standalone'; // آیا هفته اول است یا دوم از چرخه دو هفته‌ای آزمون
  examCycleTarget?: string; // نام آزمونی که این هفته در چرخه آن قرار دارد
}

export interface NightlyReport {
  id: string;
  date: string; // YYYY-MM-DD or Solar Hijri
  studiedHours: number;
  totalTests: number;
  correctTests: number;
  wrongTests: number;
  satisfactionRating: number; // 1 to 5
  obstacles: string[]; // e.g., ['خواب‌آلودگی', 'استفاده زیاد از گوشی', 'عدم تمرکز']
  studentNotes: string;
  aiAnalysis?: {
    overallScore: number; // 1 to 10
    tone: 'encouraging' | 'firm' | 'strategic';
    summary: string;
    strengthsIdentified: string[];
    criticalWeaknesses: string[];
    immediateFixesTomorrow: string[];
    motivationalQuote: string;
  };
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  sources?: { title: string; uri: string }[];
}

export interface SpacedRepetitionCard {
  id: string;
  subject: string;
  topic: string;
  questionOrMistake: string;
  correctConcept: string;
  createdAt: string;
  nextReviewDate: string;
  stage: number; // 1 (1 day), 2 (3 days), 3 (7 days), 4 (16 days), 5 (30 days - Mastered)
  history: { reviewedAt: string; passed: boolean }[];
  isMastered: boolean;
}

export interface FeynmanSession {
  id: string;
  subject: string;
  topic: string;
  studentExplanation: string;
  createdAt: string;
  evaluation?: {
    score: number; // 1-10
    strengths: string[];
    gapsOrJargon: string[];
    recommendedMetaphor: string;
    actionableFeedback: string;
  };
}

export interface AppBackupData {
  version: string;
  exportedAt: string;
  profile: StudentProfile;
  schedule: WeeklySchedule;
  reports: NightlyReport[];
  spacedCards: SpacedRepetitionCard[];
  feynmanSessions: FeynmanSession[];
  examBudget?: ExamBudget;
}

export interface RecommendedBookSource {
  title: string;
  publisher: string;
  author?: string;
  tier: 'tier1_learning' | 'tier2_mastery' | 'tier3_speed_exam' | 'tier3_speed' | string;
  tierLabel?: string;
  description: string;
  recommendedFor: string;
}

export interface MasterBookTierItem {
  tier: 'tier1_learning' | 'tier2_mastery' | 'tier3_speed_exam' | 'tier3_speed' | string;
  tierName: string;
  title: string;
  authorOrPublisher?: string;
  publisher?: string;
  author?: string;
  description: string;
  studyMethod?: string;
  recommendedFor?: string;
}

export interface ComprehensiveSubjectResource {
  subject: string;
  bestBooks: MasterBookTierItem[];
  overallStudyStrategy?: string[];
}

export interface TestVolumeGuideline {
  learningTests: number; // تست آموزشی (بدون زمان برای یادگیری و تثبیت الگوها)
  timedPracticeTests: number; // تست تسلط و زمان‌دار (برای سرعت عمل و دقت)
  reviewTests: number; // تست پوششی و مروری (برای بازیابی در ایستگاه‌های مرور)
  totalRecommendedTests: number; // مجموع تست هدف برای درصد بالای ۷۰٪
  estimatedStudyHours?: number; // ساعت مطالعه و تحلیل تخمینی
}

export interface MathTopicInfo {
  id: string;
  subject: string;
  chapter: string;
  grade: string;
  subtopics: string[];
  difficulty: 'متوسط' | 'سخت' | 'بسیار چالش‌برانگیز' | 'بسیار سخت' | 'ساده' | string;
  conceptWeight?: string;
  keyChallenges?: string[];
  prerequisites?: string[];
  expectedTestBudget?: number;
  recommendedWeeklyHours?: number;
  estimatedTotalHours?: number;
  konkurFrequencyTier?: string;
  priority?: 'high' | 'medium' | 'low' | string;
  suggestedBook?: string;
  isFoundational?: boolean;
  recommendedBooks?: RecommendedBookSource[];
  testVolume?: TestVolumeGuideline;
  masteryTips?: string[];
}

export interface ScheduledExam {
  id: string;
  examName: string;
  organization: 'قلم‌چی' | 'ماز' | 'سنجش' | 'گزینه دو' | 'مدرسه' | 'سایر';
  stageTitle: string; // عنوان مرحله آزمون مثلاً "مرحله ۱ - شروع سال تحصیلی"
  examDate: string; // تاریخ آزمون به فارسی مثل "جمعه ۲۱ شهریور ۱۴۰۵"
  dateGregorian?: string; // تاریخ میلادی/ایزو برای محاسبه دقیق روزهای باقیمانده مثل "2026-09-11"
  daysRemaining?: number; // تعداد روز باقیمانده زنده
  syllabusSummary: string; // متن خلاصه بودجه‌بندی
  targetGoalText?: string; // هدف تراز یا درصد
  selectedTopics: string[]; // سرفصل‌های دروس هدف
  topicDetails?: TopicExamDetail[]; // تفکیک فصول با درجه سختی و تست هدف
  totalTargetTests?: number;
  isCompleted?: boolean;
}

export interface ExamBudget {
  examName: string;
  examDate: string;
  dateGregorian?: string; // تاریخ میلادی YYYY-MM-DD آزمون برای محاسبه خودکار و دقیق روزها
  daysUntilExam?: number; // تعداد روز باقی‌مانده تا آزمون
  daysUntilExamSetAt?: string; // زمان ثبت/آخرین ویرایش daysUntilExam (ISO) — مبنای محاسبه شمارش معکوس واقعی
  targetGoalText: string;
  syllabusDetails: string;
  selectedTopics: string[];
  topicDetails?: TopicExamDetail[]; // جزئیات بخش‌ها، درجه سختی و تعداد تست هر مبحث
  weeklyClasses?: WeeklyClass[]; // کلاس‌های هفتگی ثابت
  totalTargetTests?: number; // مجموع تست هدف برای رسیدن به آزمون
  uploadedFileName?: string;
  uploadedFilePreview?: string;
  extractedAt?: string;
  activeExamId?: string; // شناسه آزمون فعال انتخاب‌شده از تقویم
  scheduledExams?: ScheduledExam[]; // لیست کلیه آزمون‌های برنامه‌ریزی‌شده
}

export type ExamErrorCategory = 
  | 'calculation' // بی‌دقتی محاسباتی در ضرب، تقسیم و علامت
  | 'trap' // فریب خوردن در دام تستی طراح
  | 'time' // کمبود وقت و عدم مدیریت زمان
  | 'concept_gap' // ضعف علمی و نفهمیدن دقیق مفهوم
  | 'misread' // غلط خواندن صورت سؤال یا گزینه‌ها
  | 'formula_forgotten'; // فراموشی فرمول یا رابطه

export interface ExamErrorLog {
  id: string;
  examName: string;
  date: string;
  subject: string;
  topic: string;
  questionNumber?: string;
  errorCategory: ExamErrorCategory;
  description: string;
  learnedLesson: string;
  actionPlan: string;
  isResolved?: boolean;
}

export interface FocusTestSession {
  id: string;
  date: string;
  subject: string;
  topic: string;
  targetCount: number;
  completedCount: number;
  correctCount: number;
  wrongCount: number;
  unansweredCount: number;
  markedForLaterCount: number; // تست‌های ضربدر دار
  timeSpentSeconds: number;
  averageSecondsPerTest: number;
  standardTargetSeconds: number;
  pacingRating: 'fast' | 'optimal' | 'slow';
  percentage: number;
  notes?: string;
}

export interface TopicMasteryRecord {
  topicId: string;
  chapter: string;
  learningTestsDone: number;
  timedPracticeTestsDone: number;
  reviewTestsDone: number;
  confidenceScore: number; // 0 to 100
  lastStudiedDate?: string;
}

export interface TrapQuestion {
  id: string;
  subject: string;
  topic: string;
  questionText: string;
  options: string[]; // 4 گزینه‌
  correctIndex: number; // 0, 1, 2, 3
  trapIndex: number; // گزینه‌ای که دام طراح است
  trapExplanation: string; // چرا بچه‌ها فریب خوردند و دام طراح چی بود
  conceptLesson: string; // نکته طلایی درسنامه
  difficulty: 'متوسط' | 'سخت' | 'دام‌دار کنکور';
}

export interface FinalExamItem {
  id: string;
  subject: string;
  chapter: string;
  grade: string;
  coefficient: number; // ضریب نهایی
  textbookExercisesDone: boolean;
  theoremsProofsMastered: boolean;
  sampleExamsSolvedCount: number;
  targetScore: number; // e.g. 20
  notes: string;
}

export interface MazeWrongQuestion {
  id: string;
  questionNumber: string | number;
  subject: string;
  topic: string;
  studentAnswer?: string;
  correctAnswer?: string;
  errorCategory: ExamErrorCategory;
  questionSummary: string; // خلاصه صورت سوال آزمون ماز
  trapExplanation: string; // دامی که طراح ماز پهن کرده بود
  lessonConcept: string; // مفهوم کتاب که باید دوباره مرور شود
}

export interface MazeSubjectStat {
  subject: string;
  percentage: number;
  correctCount: number;
  wrongCount: number;
  unansweredCount: number;
  targetPercentage?: number;
}

export interface MazeExamReport {
  id: string;
  examTitle: string; // e.g., 'آزمون مرحله‌ای جامع ماز'
  examDate: string;
  totalPercent: number;
  subjectsSummary: MazeSubjectStat[];
  wrongQuestions: MazeWrongQuestion[];
  overallDiagnosis: string;
  keyActionPlan: string[];
}

export interface MazeTwinQuestion {
  id: string;
  originalMazeQuestionNumber?: string | number;
  subject: string;
  topic: string;
  conceptTrapIdea: string; // ایده‌ای که در سوال ماز اشتباه شده بود
  questionText: string;
  options: string[]; // ۴ گزینه
  correctIndex: number;
  trapIndex?: number;
  detailedSolution: string; // حل تشریحی گام‌به‌گام
  keyTakeaway: string; // نکته کنکوری برای جلوگیری از تکرار
  difficulty: 'متوسط' | 'مشابه ماز' | 'بسیار چالش‌برانگیز';
  userSelectedOption?: number;
  isAnsweredCorrectly?: boolean;
}

// ==========================================
// Konkur Major Selection (انتخاب رشته هوشمند)
// ==========================================

export type MajorFieldStream = 'تجربی' | 'ریاضی' | 'انسانی' | 'هنر' | 'زبان';

export type AdmissionCycle = 
  | 'روزانه' 
  | 'نوبت دوم' 
  | 'پردیس خودگردان' 
  | 'فرهنگیان و تربیت دبیر' 
  | 'پیام نور' 
  | 'غیرانتفاعی' 
  | 'دانشگاه آزاد';

export type AdmissionChanceCategory = 'optimistic' | 'realistic' | 'safe';

export type QuotaType = 'منطقه ۱' | 'منطقه ۲' | 'منطقه ۳' | 'ایثارگران ۵ درصد' | 'ایثارگران ۲۵ درصد';

export interface UniversityAdmissionData {
  id: string;
  universityName: string;
  city: string;
  province: string;
  cycle: AdmissionCycle;
  hasDormitory: 'دارد' | 'ندارد' | 'خودگردان' | 'تعهد ندارد';
  minRankRegion1: number;
  maxRankRegion1: number;
  minRankRegion2: number;
  maxRankRegion2: number;
  minRankRegion3: number;
  maxRankRegion3: number;
  minTzar: number;
  capacity: number;
  genderQuota?: 'مختلط' | 'پسر' | 'دختر';
  tuitionStatus?: 'رایگان' | 'شهریه‌پرداز' | 'بورسیه ماهانه';
  notes?: string;
}

export interface MajorKnowledgeItem {
  id: string;
  title: string; // e.g. "پزشکی", "مهندسی کامپیوتر", "حقوق"
  stream: MajorFieldStream;
  subdiscipline: string; // e.g. "دکتری پیوسته پزشکی", "فنی و مهندسی", "علوم انسانی و حقوق"
  degree: 'کارشناسی' | 'دکتری عمومی' | 'کاردانی' | 'کارشناسی ارشد پیوسته';
  durationYears: number;
  overview: string;
  keyCourses: string[];
  careerOpportunities: string[];
  averageIncomeLevel: 'بسیار بالا' | 'بالا' | 'متوسط به بالا' | 'متوسط';
  emigrationScore: number; // 1 to 10
  mbtiTypes: string[];
  hollandType: string;
  universities: UniversityAdmissionData[];
}

export interface UserMajorChoice {
  id: string;
  priorityNumber: number; // 1 to 150
  majorTitle: string;
  universityName: string;
  city: string;
  province: string;
  cycle: AdmissionCycle;
  stream: MajorFieldStream;
  chanceCategory: AdmissionChanceCategory;
  predictedChancePercent: number; // 0 to 100
  notes?: string;
  hasWarning?: boolean;
  warningText?: string;
  tuitionStatus?: string;
  hasDormitory?: string;
}

export interface MajorSelectionFilterState {
  stream: MajorFieldStream;
  rankInQuota: number;
  quotaType: QuotaType;
  totalKonkurTzar: number;
  finalExamTzar: number;
  compositeTzar: number;
  nativeProvince: string;
  gender: 'مرد' | 'زن';
  allowedCycles: AdmissionCycle[];
  selectedProvinces: string[];
  searchQuery: string;
}


