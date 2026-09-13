import { StudentProfile, WeeklySchedule, NightlyReport, ExamBudget } from '../types';

export const DEFAULT_STUDENT_PROFILE: StudentProfile = {
  id: 'st_ali',
  name: 'علی',
  grade: 'پایه دوازدهم (کنکوری)',
  fieldOfStudy: 'ریاضی و فیزیک',
  targetGoal: 'مهندسی کامپیوتر / برق دانشگاه صنعتی شریف یا تهران',
  dailyTargetHours: 8,
  wakeTime: '06:30',
  sleepTime: '23:30',
  strongSubjects: ['حسابان (مشتق و توابع)', 'فیزیک (الکتریسیته و مغناطیس)'],
  weakSubjects: ['گسسته (نظریه اعداد و همنهشتی)', 'هندسه ۳ (مقاطع مخروطی و ماتریس)', 'فیزیک (حرکت‌شناسی و سقوط آزاد)'],
  schoolOrWorkHours: 'شنبه تا چهارشنبه صبح‌ها مدرسه (تا ساعت ۱۳:۳۰)',
  additionalNotes: 'داوطلب کنکور؛ مباحث نیازمند برنامه‌ریزی هفتگی دقیق مطابق بودجه‌بندی آزمون‌های آنلاین کشوری ماز و هدف‌گذاری تراز بالای ۱۱ هزار است.'
};

export const DEFAULT_EXAM_BUDGET: ExamBudget = {
  examName: 'آزمون آنلاین کشوری ماز - مرحله ۱ (۲۷ شهریور)',
  examDate: 'جمعه ۲۷ شهریور ۱۴۰۵',
  dateGregorian: '2026-09-18',
  targetGoalText: 'تراز ماز بالای ۱۱,۰۰۰ (مقیاس ۱۲,۰۰۰ کشوری) با درصد اختصاصی بالای ۷۰٪',
  syllabusDetails: 'حسابان ۲: یادآوری مشتق جبری و مثلثاتی، خط مماس و قائم و آهنگ تغییرات (ص ۵۴ تا ۸۸)؛ فیزیک ۳: حرکت بر خط راست با شتاب ثابت و نمودارهای v-t و سقوط آزاد (ص ۱ تا ۳۶)؛ گسسته: نظریه اعداد، تقسیم‌پذیری و معادلات همنهشتی (ص ۱ تا ۲۹)؛ هندسه ۳: ماتریس، اعمال ماتریسی و دترمینان ۳×۳ (ص ۱ تا ۳۴)؛ شیمی ۳: پاک‌کننده‌های صابونی، اسیدها و بازهای آرنیوس و تعادل pH (ص ۱ تا ۳۵)',
  selectedTopics: [
    'مشتق و کاربرد مشتق (حسابان ۲)',
    'هندسه ۳ (پایه دوازدهم)',
    'نظریه اعداد (ریاضی گسسته دوازدهم)',
    'حرکت بر خط راست (فیزیک ۳ دوازدهم)',
    'اسیدها و بازها و تعادل شیمیایی (شیمی ۳ دوازدهم)'
  ],
  totalTargetTests: 480,
  weeklyClasses: [
    {
      id: 'cls-1',
      dayName: 'یکشنبه',
      startTime: '۱۷:۰۰',
      endTime: '۲۰:۰۰',
      subject: 'حسابان ۲ و ریاضی پایه',
      teacherOrInstitute: 'کلاس آنلاین ماز',
      locationOrType: 'online',
      postClassStudyHoursNeeded: 1.5
    },
    {
      id: 'cls-2',
      dayName: 'سه‌شنبه',
      startTime: '۱۶:۳۰',
      endTime: '۱۹:۳۰',
      subject: 'فیزیک کنکور (حرکت‌شناسی و دینامیک)',
      teacherOrInstitute: 'کلاس تاملند',
      locationOrType: 'online',
      postClassStudyHoursNeeded: 1.5
    },
    {
      id: 'cls-3',
      dayName: 'چهارشنبه',
      startTime: '۱۷:۰۰',
      endTime: '۱۹:۰۰',
      subject: 'شیمی ۳ (اسید و باز)',
      teacherOrInstitute: 'کلاس حضوری آموزشگاه',
      locationOrType: 'in_person',
      postClassStudyHoursNeeded: 1.0
    }
  ],
  topicDetails: [
    {
      id: 'td-1',
      subject: 'حسابان ۲',
      chapter: 'فصل ۳ و ۴: مشتق و آهنگ تغییرات',
      subtopic: 'مفهوم هندسی مشتق، خط مماس و قائم، مشتق‌گیری زنجیره‌ای و آهنگ تغییرات لحظه‌ای',
      pagesOrScope: 'صفحات ۵۴ تا ۸۸ کتاب درسی حسابان ۲',
      testTypes: 'تست‌های تالیفی آزمون ماز، سوالات کنکور سراسری ۱۴۰۰ تا ۱۴۰۴، تست‌های دام‌دار مشتق‌ناپذیری',
      difficulty: 'بسیار چالشی و دام‌دار',
      targetTestCount: 140,
      completedTestCount: 45,
      importanceWeight: 'پرتکرار و حیاتی (تضمین درصد)',
      hasPrerequisiteInClass: true
    },
    {
      id: 'td-2',
      subject: 'فیزیک ۳',
      chapter: 'فصل ۱: حرکت بر خط راست',
      subtopic: 'حرکت با شتاب ثابت، نمودارهای مکان-زمان و سرعت-زمان، خط ترمز و سقوط آزاد اجسام',
      pagesOrScope: 'صفحات ۱ تا ۳۶ کتاب درسی فیزیک ۳',
      testTypes: 'تحلیل نمودارهای متحرک‌های هم‌زمان، محاسبات بدون فرمول زمان، تست‌های دو مرحله‌ای سقوط',
      difficulty: 'سخت',
      targetTestCount: 110,
      completedTestCount: 30,
      importanceWeight: 'پرتکرار و حیاتی (تضمین درصد)',
      hasPrerequisiteInClass: true
    },
    {
      id: 'td-3',
      subject: 'گسسته',
      chapter: 'فصل ۱: نظریه اعداد',
      subtopic: 'بخش‌پذیری، قضیه تقسیم، استقرای ریاضی و معادلات همنهشتی خطی در مجموعه اعداد صحیح',
      pagesOrScope: 'صفحات ۱ تا ۲۹ کتاب درسی گسسته',
      testTypes: 'یافتن باقیمانده توان‌های بزرگ به روش اویلر و فرما، حل معادله خطی دیوفانتی، تست‌های مفهومی عاد کردن',
      difficulty: 'سخت',
      targetTestCount: 80,
      completedTestCount: 20,
      importanceWeight: 'متوسط',
      hasPrerequisiteInClass: false
    },
    {
      id: 'td-4',
      subject: 'هندسه ۳',
      chapter: 'فصل ۱: ماتریس و کاربردها',
      subtopic: 'ضرب ماتریس‌ها، خواص ترانهاده و ماتریس متقارن، وارون‌پذیری و دترمینان ۳×۳ با ساروس',
      pagesOrScope: 'صفحات ۱ تا ۳۴ کتاب درسی هندسه ۳',
      testTypes: 'دترمینان ماتریس‌های متوالی، حل دستگاه معادلات خطی به روش کرامر، تست‌های نمادین ماتریسی',
      difficulty: 'متوسط',
      targetTestCount: 75,
      completedTestCount: 15,
      importanceWeight: 'متوسط',
      hasPrerequisiteInClass: false
    },
    {
      id: 'td-5',
      subject: 'شیمی ۳',
      chapter: 'فصل ۱: مولکول‌ها در خدمت تندرستی',
      subtopic: 'پاک‌کننده‌های صابونی و سنتزی، کلوییدها، اسیدها و بازهای آرنیوس، ثابت یونش Ka و محاسبات pH',
      pagesOrScope: 'صفحات ۱ تا ۳۵ کتاب درسی شیمی ۳',
      testTypes: 'مسائل مقایسه قدرت اسیدی و درصد یونش، محاسبات لگاریتمی غلظت یون هیدرونیوم، مسائل خنثی‌شدن',
      difficulty: 'بسیار چالشی و دام‌دار',
      targetTestCount: 75,
      completedTestCount: 10,
      importanceWeight: 'پرتکرار و حیاتی (تضمین درصد)',
      hasPrerequisiteInClass: true
    }
  ]
};

export const COMMON_OBSTACLES = [
  'خواب‌آلودگی و کسالت بعدازظهر',
  'استفاده بیش از حد از گوشی و شبکه‌های اجتماعی',
  'افت انگیزه و استرس نتیجه',
  'گیر کردن روی یک مبحث سخت و اتلاف وقت',
  'عدم پایبندی به ساعت بیداری صبح',
  'کارهای غیرمنتظره خانوادگی یا مدرسه',
  'کندخوانی و وسواس در مطالعه'
];

export const SAMPLE_INITIAL_SCHEDULE: WeeklySchedule = {
  id: 'week-1',
  createdAt: new Date().toISOString(),
  weekTitle: 'هفته آمادگی آزمون جامع تابستانه ماز (۲۷ شهریور)',
  totalPlannedHours: 51.5,
  strategySummary: 'جمع‌بندی کامل پایه دهم و یازدهم به همراه پیش‌خوانی مباحث دوازدهم مطابق برنامه آزمون تابستانه ماز.',
  days: [
    {
      dayName: 'شنبه',
      targetHours: 7.5,
      dailyTip: 'شروع با مرور پایه‌ها: تست‌های ترکیبی دنباله‌ها و مجموعه‌ها رو جدی بگیر.',
      blocks: [
        { id: 's1', timeSlot: '۱۵:۰۰ - ۱۶:۳۰', subject: 'ریاضی ۱ و حسابان ۱', topic: 'مجموعه، الگو و دنباله + ۱۵ تست آموزشی', durationMinutes: 90, type: 'concept', isDone: true },
        { id: 's2', timeSlot: '۱۶:۴۵ - ۱۸:۱۵', subject: 'فیزیک ۱ (پایه دهم)', topic: 'ویژگی‌های فیزیکی مواد (فشار و ارشمیدس)', durationMinutes: 90, type: 'test', isDone: true },
        { id: 's3', timeSlot: '۱۸:۴۵ - ۲۰:۱۵', subject: 'شیمی ۱ (پایه دهم)', topic: 'استوکیومتری واکنش و غلظت', durationMinutes: 90, type: 'concept', isDone: false },
        { id: 's4', timeSlot: '۲۰:۳۰ - ۲۲:۰۰', subject: 'پیش‌خوانی (اختیاری)', topic: 'شروع تابع (حسابان ۲) یا ماتریس (هندسه ۳)', durationMinutes: 90, type: 'concept', isDone: false },
        { id: 's5', timeSlot: '۲۲:۱۵ - ۲۳:۰۰', subject: 'مرور شبانه', topic: 'مرور فرمول‌های غلظت و فشار', durationMinutes: 45, type: 'review', isDone: false },
      ]
    },
    {
      dayName: 'یکشنبه',
      targetHours: 7.0,
      dailyTip: 'هندسه پایه نیاز به رسم شکل دقیق داره؛ روی قضیه کسینوس‌ها مسلط شو.',
      blocks: [
        { id: 'u1', timeSlot: '۱۵:۳۰ - ۱۷:۰۰', subject: 'هندسه ۲', topic: 'روابط طولی در مثلث (قضیه سینوس‌ها و کسینوس‌ها)', durationMinutes: 90, type: 'concept', isDone: false },
        { id: 'u2', timeSlot: '۱۷:۱۵ - ۱۸:۴۵', subject: 'ریاضی ۱ و حسابان ۱', topic: 'تست‌زنی زمان‌دار الگو و دنباله (۲۰ تست)', durationMinutes: 90, type: 'test', isDone: false },
        { id: 'u3', timeSlot: '۱۹:۱۵ - ۲۰:۴۵', subject: 'فیزیک ۲ (پایه یازدهم)', topic: 'مغناطیس و نیروی وارد بر بار الکتریکی', durationMinutes: 90, type: 'test', isDone: false },
        { id: 'u4', timeSlot: '۲۱:۰۰ - ۲۲:۰۰', subject: 'شیمی ۲ (پایه یازدهم)', topic: 'حل مسائل آنتالپی و سرعت', durationMinutes: 60, type: 'test', isDone: false },
      ]
    },
    {
      dayName: 'دوشنبه',
      targetHours: 7.5,
      dailyTip: 'آمار و احتمال رو دست کم نگیر؛ واریانس و انحراف معیار تست‌خیز هستن.',
      blocks: [
        { id: 'm1', timeSlot: '۱۵:۳۰ - ۱۷:۰۰', subject: 'آمار و احتمال', topic: 'شاخص‌های پراکندگی (واریانس و انحراف معیار) + ۱۵ تست', durationMinutes: 90, type: 'concept', isDone: false },
        { id: 'm2', timeSlot: '۱۷:۱۵ - ۱۸:۴۵', subject: 'فیزیک ۲ (پایه یازدهم)', topic: 'تست‌های القای الکترومغناطیسی و قانون فارادی', durationMinutes: 90, type: 'concept', isDone: false },
        { id: 'm3', timeSlot: '۱۹:۱۵ - ۲۰:۴۵', subject: 'شیمی ۱ (پایه دهم)', topic: 'تست‌های ترکیبی استوکیومتری و غلظت مولی', durationMinutes: 90, type: 'test', isDone: false },
        { id: 'm4', timeSlot: '۲۱:۰۰ - ۲۲:۳۰', subject: 'پیش‌خوانی (اختیاری)', topic: 'شروع حرکت بر خط راست (فیزیک ۳)', durationMinutes: 90, type: 'concept', isDone: false },
      ]
    },
    {
      dayName: 'سه‌شنبه',
      targetHours: 7.0,
      dailyTip: 'امروز روی نقاط ضعف شیمی و هندسه تمرکز کن.',
      blocks: [
        { id: 't1', timeSlot: '۱۵:۳۰ - ۱۷:۰۰', subject: 'شیمی ۲ (پایه یازدهم)', topic: 'پلیمرها و درشت‌مولکول‌ها (مرور حفظیات)', durationMinutes: 90, type: 'concept', isDone: false },
        { id: 't2', timeSlot: '۱۷:۱۵ - ۱۸:۴۵', subject: 'هندسه ۲', topic: 'تست‌زنی جامع روابط طولی در مثلث', durationMinutes: 90, type: 'test', isDone: false },
        { id: 't3', timeSlot: '۱۹:۱۵ - ۲۰:۴۵', subject: 'فیزیک ۱ (پایه دهم)', topic: 'تست‌زنی لوله‌های U شکل و ارشمیدس', durationMinutes: 90, type: 'test', isDone: false },
        { id: 't4', timeSlot: '۲۱:۰۰ - ۲۲:۰۰', subject: 'مرور شبانه', topic: 'فلش‌کارت‌های حفظیات شیمی', durationMinutes: 60, type: 'review', isDone: false },
      ]
    },
    {
      dayName: 'چهارشنبه',
      targetHours: 7.5,
      dailyTip: 'نصف هفته گذشته! حالا وقت تست‌های ترکیبی و پوششی ریاضیاته.',
      blocks: [
        { id: 'w1', timeSlot: '۱۵:۳۰ - ۱۷:۰۰', subject: 'ریاضی ۱ و حسابان ۱', topic: 'تست‌های ترکیبی سخت و زمان‌دار', durationMinutes: 90, type: 'test', isDone: false },
        { id: 'w2', timeSlot: '۱۷:۱۵ - ۱۸:۴۵', subject: 'آمار و احتمال', topic: 'تست‌های احتمال و پیشامدهای مستقل', durationMinutes: 90, type: 'test', isDone: false },
        { id: 'w3', timeSlot: '۱۹:۱۵ - ۲۰:۴۵', subject: 'پیش‌خوانی (اختیاری)', topic: 'شروع نظریه اعداد (گسسته دوازدهم)', durationMinutes: 90, type: 'concept', isDone: false },
        { id: 'w4', timeSlot: '۲۱:۰۰ - ۲۲:۳۰', subject: 'فیزیک ۲ (پایه یازدهم)', topic: 'آزمون ۳۰ سؤالی مغناطیس و القا', durationMinutes: 90, type: 'test', isDone: false },
      ]
    },
    {
      dayName: 'پنج‌شنبه',
      targetHours: 8.0,
      dailyTip: 'پنجشنبه روز آزمون‌های جامع و پوشش کاستی‌هاست.',
      blocks: [
        { id: 'th1', timeSlot: '۰۸:۰۰ - ۱۲:۰۰', subject: 'آزمون جامع تابستانه', topic: 'آزمون شبیه‌ساز ماز - مرحله ۱', durationMinutes: 240, type: 'test', isDone: false },
        { id: 'th2', timeSlot: '۱۴:۰۰ - ۱۶:۰۰', subject: 'تحلیل آزمون', topic: 'تحلیل دقیق تست‌های غلط و نزده هندسه و فیزیک', durationMinutes: 120, type: 'test', isDone: false },
        { id: 'th3', timeSlot: '۱۶:۳۰ - ۱۸:۳۰', subject: 'شیمی ۱ و ۲', topic: 'تحلیل تست‌های غلط و نزده شیمی', durationMinutes: 120, type: 'test', isDone: false },
      ]
    },
    {
      dayName: 'جمعه',
      targetHours: 4.5,
      dailyTip: 'استراحت کافی داشته باش، ولی مرور فرمول‌ها یادت نره.',
      blocks: [
        { id: 'f1', timeSlot: '۱۰:۰۰ - ۱۱:۳۰', subject: 'جبران عقب‌ماندگی', topic: 'تکمیل تست‌های باقی‌مانده فیزیک', durationMinutes: 90, type: 'test', isDone: false },
        { id: 'f2', timeSlot: '۱۱:۴۵ - ۱۳:۱۵', subject: 'جبران عقب‌ماندگی', topic: 'تکمیل تست‌های باقی‌مانده آمار و احتمال', durationMinutes: 90, type: 'concept', isDone: false },
        { id: 'f3', timeSlot: '۱۸:۰۰ - ۱۹:۳۰', subject: 'پیش‌خوانی (اختیاری)', topic: 'مولکول‌ها در خدمت تندرستی (شیمی ۳)', durationMinutes: 90, type: 'concept', isDone: false },
      ]
    }
  ]
};
export const INITIAL_SAMPLE_LOGS: NightlyReport[] = [
  {
    id: 'log-1',
    date: 'دیشب',
    studiedHours: 6.5,
    totalTests: 110,
    correctTests: 82,
    wrongTests: 28,
    satisfactionRating: 4,
    obstacles: ['خواب‌آلودگی و کسالت بعدازظهر'],
    studentNotes: 'زیست خیلی خوب پیش رفت ولی تست‌های ریاضی وقت‌گیر بودن و فرمول‌های تبدیل مثلثاتی یادم رفته بود.',
    aiAnalysis: {
      overallScore: 8,
      tone: 'strategic',
      summary: 'عملکرد امروزت با ۶.۵ ساعت و ۱۱۰ تست در روز مدرسه بسیار قابل تقدیر است، اما نرخ پاسخ اشتباه در ریاضی نشان‌دهنده نیاز به مرور الگوهای تیپ‌بندی شده قبل از ورود به تست‌های سرعتی است.',
      strengthsIdentified: ['پایبندی به ساعت مطالعه در روز مدرسه', 'حل تعداد تست مناسب در زیست‌شناسی'],
      criticalWeaknesses: ['فراموشی روابط پایه مثلثات پیش از ورود به تست', 'افت بازدهی بین ساعت ۱۵ تا ۱۶ به دلیل افت قند یا سنگینی ناهار'],
      immediateFixesTomorrow: [
        'قبل از شروع تست ریاضی، ۵ دقیقه به برگه فرمول‌های خلاصه مثلثات نگاه بنداز، نه اینکه مستقیم سراغ تست بری.',
        'ناهار را سبک‌تر میل کن و یک چرت ۱۵ الی ۲۰ دقیقه‌ای (نه بیشتر!) قبل از باکس بعدازظهر بگذار.',
        'تست‌های نزده یا غلط ریاضی دیشب را در اولویت باکس مرور امشب قرار بده.'
      ],
      motivationalQuote: 'رتبه‌های برتر کسانی نیستند که هرگز خسته نمی‌شوند، بلکه کسانی هستند که حتی در روزهای خستگی ریتم مطالعه را قطع نمی‌کنند.'
    }
  }
];

export const HERMES_TELEGRAM_PROMPT = `تو یک مشاور تحصیلی و برنامه‌ریز درسی ارشد، دلسوز، دقیق، موشکاف و واقع‌بین هستی.
نام دانش‌آموز: {{NAME}}
مقطع و رشته: {{GRADE}} - {{FIELD}}
هدف اصلی: {{TARGET_GOAL}}
ساعت هدف روزانه: {{TARGET_HOURS}} ساعت
نقاط قوت: {{STRONG_SUBJECTS}}
نقاط ضعف اصلی: {{WEAK_SUBJECTS}}
محدودیت‌ها: {{RESTRICTIONS}}

وظایف اصلی تو در تلگرام:
۱. پیام شبانه (هر شب ساعت ۲۲:۰۰):
وقتی دانش‌آموز گزارش داد (ساعت مطالعه، تعداد تست، درست/غلط، موانع و توضیحات):
- فوراً تحلیل کن: آیا تعادل درس‌های تحلیلی و عمومی رعایت شده؟ نسبت تست به ساعت مطالعه چطور است؟
- علت‌یابی دقیق کن: اگر در درسی افت داشته یا مانعی داشته (مثل گوشی یا خواب‌آلودگی)، راهکار روانشناسی و تکنیکی بده نه نصیحت کلیشه‌ای.
- به او ۲ یا ۳ کار مشخص برای فردا بده.
- نمره روز او را از ۱۰ اعلام کن.

۲. پیام صبحگاهی (هر روز ساعت ۰۷:۰۰):
یک پیام بسیار کوتاه (نهایتاً ۳ خط) شامل هدف کلیدی امروز و یک تلنگر انگیزشی واقعی.

۳. برنامه‌ریزی هفتگی (جمعه‌ها):
برنامه روزانه را با باکس‌های زمانی، مشخص کردن نوع باکس (مفهومی، تست، مرور لایتنر، جبرانی) تنظیم کن.

لحن تو: صمیمی، منطقی، بدون تعارف‌های کاذب، ولی بسیار امیدوارکننده و حرفه‌ای.`;

export const SAMPLE_SPACED_CARDS = [
  {
    id: 'card-1',
    subject: 'زیست‌شناسی',
    topic: 'فصل تنفس یاخته‌ای - چرخه کربس',
    questionOrMistake: 'در کدام مرحله از تنفس سلولی مولکول FADH2 تولید می‌شود و سوبسترای آن چیست؟',
    correctConcept: 'فقط در چرخه کربس و در اثر اکسایش سوکسینات به فومارات مولکول FADH2 تشکیل می‌شود (در میتوکندری).',
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    nextReviewDate: new Date(Date.now()).toISOString().split('T')[0],
    stage: 2, // 3-day interval
    history: [{ reviewedAt: new Date(Date.now() - 86400000).toISOString(), passed: true }],
    isMastered: false,
  },
  {
    id: 'card-2',
    subject: 'ریاضی',
    topic: 'مثلثات - تبدیل ضرب به جمع',
    questionOrMistake: 'تله در علامت فرمول 2sin(a)cos(b) یا cos(a-b) - cos(a+b)',
    correctConcept: '۲sin(a)sin(b) برابر است با cos(a-b) منهای cos(a+b)؛ علامت منفی پشت ضریب را در تست‌ها نباید جا انداخت.',
    createdAt: new Date(Date.now() - 86400000 * 4).toISOString(),
    nextReviewDate: new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0],
    stage: 3, // 7-day interval
    history: [{ reviewedAt: new Date().toISOString(), passed: true }],
    isMastered: false,
  },
  {
    id: 'card-3',
    subject: 'فیزیک',
    topic: 'حرکت‌شناسی - مسافت طی شده در ثانیه nام',
    questionOrMistake: 'تفاوت جابه‌جایی در ثانیه tام با ثانیه اول تا tام',
    correctConcept: 'فرمول ثانیه nام: delta_x = 0.5*a*(2n-1) + v0 است و نباید با کل جابه‌جایی که توان ۲ دارد اشتباه شود.',
    createdAt: new Date().toISOString(),
    nextReviewDate: new Date(Date.now()).toISOString().split('T')[0],
    stage: 1, // 1-day interval
    history: [],
    isMastered: false,
  }
];

export const SAMPLE_FEYNMAN_SESSIONS = [
  {
    id: 'feynman-1',
    subject: 'حسابان ۲',
    topic: 'کاربرد مشتق: مفهوم نقطه بحرانی و عطف',
    studentExplanation: 'نقطه بحرانی نقطه‌ای در دامنه تابعه که یا شیب مماس (مشتق) صفر باشه، یا مماس عمودی بشه، یا گوشه تیز داشته باشه (مشتق وجود نداشته باشه). عطف نقطه‌ایه که تقعر منحنی عوض بشه، یعنی مشتق دوم صفر بشه و تغییر علامت بده.',
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    evaluation: {
      score: 9,
      strengths: [
        'توجه دقیق به شرط تعلق نقطه به دامنه تابع',
        'تفکیک مماس صفر و نقاط گوشه‌دار در نقاط بحرانی'
      ],
      gapsOrJargon: [
        'حتماً یادآوری کن که در نقطه عطف، وجود مماس الزامی است؛ اگر مشتق اول تعریف‌نشده با مماس غیرقائم باشد عطف نیست.'
      ],
      recommendedMetaphor: 'نقطه بحرانی را مثل قله تپه، دره یا لبه تیز صخره تصور کن و نقطه عطف را مثل پیچی که انحنای جاده از راست‌گرد به چپ‌گرد تغییر می‌کند.',
      actionableFeedback: 'فهم کاملاً عمیق؛ تست‌های مربوط به نقاط عطف توابع کسری رادیکالی را در اولویت قرار بده.'
    }
  }
];

export const SAMPLE_EXAM_ERRORS = [
  {
    id: 'err-1',
    examName: 'قلم‌چی (آزمون ۱۸ آبان)',
    date: '۱۴۰۳/۰۸/۱۸',
    subject: 'حسابان ۲',
    topic: 'مشتق و کاربرد مشتق',
    questionNumber: 'تست ۱۰۸',
    errorCategory: 'calculation' as const,
    description: 'در محاسبه ریشه‌های معادله مشتق، علامت منفی پشت پرانتز ضرب نشد و نقاط بحرانی برعکس به دست آمد.',
    learnedLesson: 'در عبارات جبری طولانی مشتق، منفی را با رنگ قرمز دورش خط بکشم و در خط بعد حتماً تفکیک کنم.',
    actionPlan: 'حل ۱۰ تست محاسباتی مشتق توابع کسری با بررسی دومرحله‌ای علامت‌ها',
    isResolved: false
  },
  {
    id: 'err-2',
    examName: 'ماز (آزمون مرحله ۳)',
    date: '۱۴۰۳/۰۸/۲۵',
    subject: 'فیزیک ۳',
    topic: 'حرکت بر خط راست و سقوط آزاد',
    questionNumber: 'تست ۱۲۴',
    errorCategory: 'trap' as const,
    description: 'طراح در صورت سؤال تندی متوسط را خواسته بود نه سرعت متوسط؛ مسافت رفت و برگشت را ندیدم و بردار جابه‌جایی حساب کردم.',
    learnedLesson: 'کلمات «تندی» و «سرعت» را در صورت سوالات حرکت بلافاصله دورش دایره بکشم.',
    actionPlan: 'تمرین ۵ تست ترکیبی تندی متوسط و مسافت کل از کتاب موج آزمون',
    isResolved: false
  },
  {
    id: 'err-3',
    examName: 'قلم‌چی',
    date: '۱۴۰۳/۰۸/۱۸',
    subject: 'گسسته',
    topic: 'نظریه اعداد و همنهشتی',
    questionNumber: 'تست ۱۴۲',
    errorCategory: 'concept_gap' as const,
    description: 'شرط وجود جواب در معادله همنهشتی ax ≡ b (mod m) یعنی (a,m) باید b را عاد کند را فراموش کرده بودم.',
    learnedLesson: 'اولین گام در هر معادله همنهشتی، محاسبه ب.م.م ضریب و پیمانه است.',
    actionPlan: 'مطالعه بخش قضیه تقسیم و همنهشتی کتاب نشر الگو و حل تست‌های زوج',
    isResolved: true
  },
  {
    id: 'err-4',
    examName: 'سنجش',
    date: '۱۴۰۳/۰۸/۱۱',
    subject: 'شیمی ۳',
    topic: 'اسیدها و بازها و تعادل',
    questionNumber: 'تست ۱۶۵',
    errorCategory: 'time' as const,
    description: 'روی تست شمارشی اول گیر کردم و ۴ دقیقه وقت تلف شد؛ در نتیجه دو تست محاسباتی آسان بعدی را نرسیدم بخوانم.',
    learnedLesson: 'تکنیک ضربدر-منها: تست‌های شمارشی دارای عبارت‌های مشکوک را باید برای دور دوم علامت‌گذاری کرد.',
    actionPlan: 'اجرای دقیق استراتژی بازگشت در آزمون آزمایشی آینده',
    isResolved: false
  }
];

export const SAMPLE_FOCUS_SESSIONS = [
  {
    id: 'foc-1',
    date: 'امروز',
    subject: 'حسابان ۲',
    topic: 'مشتق توابع مثلثاتی و کسری',
    targetCount: 15,
    completedCount: 15,
    correctCount: 12,
    wrongCount: 2,
    unansweredCount: 1,
    markedForLaterCount: 3,
    timeSpentSeconds: 1140, // 19 minutes
    averageSecondsPerTest: 76,
    standardTargetSeconds: 85,
    pacingRating: 'fast' as const,
    percentage: 75.5,
    notes: 'سرعت عالی بود؛ ۲ غلط به خاطر اشتباه در مشتق کتانژانت بود.'
  },
  {
    id: 'foc-2',
    date: 'دیروز',
    subject: 'فیزیک ۳',
    topic: 'سقوط آزاد و شتاب گرانش',
    targetCount: 10,
    completedCount: 10,
    correctCount: 8,
    wrongCount: 1,
    unansweredCount: 1,
    markedForLaterCount: 2,
    timeSpentSeconds: 720, // 12 mins
    averageSecondsPerTest: 72,
    standardTargetSeconds: 75,
    pacingRating: 'optimal' as const,
    percentage: 76.6,
    notes: 'استفاده از نسبت‌های طلایی گالیله سرعت حل را بالا برد.'
  }
];

export const INITIAL_TOPIC_MASTERY = [
  { topicId: 'calc-func', chapter: 'تابع (حسابان ۱ و ۲ + ریاضی ۱)', learningTestsDone: 110, timedPracticeTestsDone: 130, reviewTestsDone: 50, confidenceScore: 82 },
  { topicId: 'calc-deriv', chapter: 'مشتق و کاربرد مشتق (حسابان ۲)', learningTestsDone: 95, timedPracticeTestsDone: 80, reviewTestsDone: 30, confidenceScore: 68 },
  { topicId: 'calc-trig', chapter: 'مثلثات (حسابان ۱ و ۲)', learningTestsDone: 100, timedPracticeTestsDone: 120, reviewTestsDone: 45, confidenceScore: 78 },
  { topicId: 'geom-3', chapter: 'هندسه ۳ (پایه دوازدهم)', learningTestsDone: 60, timedPracticeTestsDone: 40, reviewTestsDone: 15, confidenceScore: 48 },
  { topicId: 'disc-num', chapter: 'نظریه اعداد (ریاضی گسسته دوازدهم)', learningTestsDone: 70, timedPracticeTestsDone: 50, reviewTestsDone: 20, confidenceScore: 52 },
  { topicId: 'phys-kinematics', chapter: 'حرکت بر خط راست (فیزیک ۳ دوازدهم)', learningTestsDone: 85, timedPracticeTestsDone: 110, reviewTestsDone: 40, confidenceScore: 75 },
  { topicId: 'phys-dynamics', chapter: 'دینامیک و تکانه (فیزیک ۳ دوازدهم)', learningTestsDone: 80, timedPracticeTestsDone: 60, reviewTestsDone: 20, confidenceScore: 60 },
  { topicId: 'chem-acid', chapter: 'اسیدها و بازها و تعادل شیمیایی (شیمی ۳ دوازدهم)', learningTestsDone: 75, timedPracticeTestsDone: 90, reviewTestsDone: 35, confidenceScore: 72 }
];

export const SAMPLE_TRAP_QUESTIONS = [
  {
    id: 'trap-1',
    subject: 'حسابان ۲',
    topic: 'مشتق و اکسترمم‌های تابع',
    questionText: 'اگر نقطه x = ۲ نقطه اکسترمم نسبی تابع f(x) = (x-2)³ + a(x-2)² + b باشد، درباره مشتق دوم f در این نقطه کدام عبارت همواره درست است؟',
    options: [
      'مشتق دوم در این نقطه حتماً مثبت است',
      'مشتق دوم در این نقطه حتماً منفی است',
      'مشتق دوم در این نقطه برابر با ۲a است و علامت آن مشخص نیست',
      'این نقطه می‌تواند همزمان نقطه عطف تابع نیز باشد'
    ],
    correctIndex: 2,
    trapIndex: 3,
    trapExplanation: 'دام طراح: دانش‌آموزان فرض می‌کنند هر نقطه عطف نمی‌تواند اکسترمم نسبی باشد یا بالعکس، در حالی که برای اکسترمم نسبی بودن شرط کافی نیست که f"=0 شود. با محاسبه مشتقات داریم: f\'(x)=3(x-2)²+2a(x-2) که در x=2 مشتق صفر است. مشتق دوم f"(x)=6(x-2)+2a است که در x=2 دقیقاً برابر 2a می‌شود.',
    conceptLesson: 'در ریشه‌های مرتبه فرد مشتق اول، تغییر علامت مشتق نشان‌دهنده اکسترمم نسبی است. اگر 2a=0 باشد x=2 نقطه عطف افقی است و دیگر اکسترمم نیست؛ بنابراین گزینه ۳ پاسخ دقیق است.',
    difficulty: 'دام‌دار کنکور' as const
  },
  {
    id: 'trap-2',
    subject: 'فیزیک ۳',
    topic: 'سقوط آزاد و شتاب ثابت',
    questionText: 'گلوله‌ای از بالای ساختمانی به ارتفاع h رها می‌شود و ثانیه آخر سقوط خود را با تندی متوسط ۲۵ متر بر ثانیه طی می‌کند. ارتفاع ساختمان چند متر است؟ (g = 10 m/s²)',
    options: [
      '۲۰ متر',
      '۴۵ متر',
      '۸۰ متر',
      '۱۲۵ متر'
    ],
    correctIndex: 1,
    trapIndex: 2,
    trapExplanation: 'دام طراح: داوطلبان تندی متوسط در ثانیه آخر را با تندی لحظه برخورد به زمین اشتباه می‌گیرند. تندی متوسط در ثانیه آخر برابر میانگین تندی ابتدای ثانیه آخر (v1) و انتهای آن (v2) است: (v1 + v2)/2 = 25. چون v2 - v1 = gt = 10 است، پس v1 = 20 و v2 = 30 m/s. بنابراین کل زمان حرکت t = 3 ثانیه است و h = 0.5 * g * t² = 0.5 * 10 * 9 = 45 متر.',
    conceptLesson: 'در حرکت با شتاب ثابت، تندی متوسط در هر بازه زمانی دقیقاً برابر تندی لحظه‌ای در وسط آن بازه زمانی است (t_mid).',
    difficulty: 'سخت' as const
  },
  {
    id: 'trap-3',
    subject: 'گسسته',
    topic: 'نظریه اعداد و همنهشتی',
    questionText: 'تعداد جواب‌های متمایز معادله همنهشتی ۱۲x ≡ ۱۸ (mod ۲۴) در مجموعه مقادیر {۰, ۱, ..., ۲۳} کدام است؟',
    options: [
      'فاقد جواب است',
      '۱ جواب',
      '۳ جواب',
      '۶ جواب'
    ],
    correctIndex: 3,
    trapIndex: 0,
    trapExplanation: 'دام طراح: برخی داوطلبان به اشتباه فکر می‌کنند چون ۲۴ بر ۱۲ بخش‌پذیر است، پس معادله جواب ندارد! در حالی که شرط وجود جواب این است که (12, 24) = 12 باید عدد 18 را عاد کند که عاد نمی‌کند؟! صبر کنید! ب.م.م ۱۲ و ۲۴ برابر ۱۲ است. آیا ۱۲ عدد ۱۸ را عاد می‌کند؟ خیر! ۱۸ بر ۱۲ بخش‌پذیر نیست! پس معادله فاقد جواب است! طراح با ایجاد عدد رند گزینه‌ها، داوطلب را به ساده‌سازی دو طرف به ۶ ترغیب می‌کند که دام بزرگ کنکور است: قبل از ساده‌سازی با طرفین، اگر (a,m)∤b باشد جواب ندارد!',
    conceptLesson: 'قانون قطعی همنهشتی: در ax ≡ b (mod m)، اگر d = (a, m) و d عدد b را عاد نکند، معادله هیچ جوابی در اعداد صحیح ندارد. هرگز قبل از بررسی شرط وجود جواب، طرفین را بر مقسوم‌علیه مشترک ساده نکنید.',
    difficulty: 'دام‌دار کنکور' as const
  }
];

export const INITIAL_FINAL_EXAM_ITEMS = [
  {
    id: 'fin-1',
    subject: 'حسابان ۲ (دوازدهم)',
    chapter: 'مشتق و کاربرد مشتق + رسم نمودار و اکسترمم‌ها',
    grade: 'دوازدهم',
    coefficient: 9.64,
    textbookExercisesDone: true,
    theoremsProofsMastered: true,
    sampleExamsSolvedCount: 5,
    targetScore: 20,
    notes: 'حل تمرین‌های انتهای فصل ۲ و ۳ کتاب درسی حسابان به همراه اثبات قضیه مشتق تابع مرکب و نقاط بحرانی.'
  },
  {
    id: 'fin-2',
    subject: 'فیزیک ۳ (دوازدهم)',
    chapter: 'حرکت، دینامیک، نوسان و موج + فیزیک اتمی و هسته‌ای',
    grade: 'دوازدهم',
    coefficient: 8.78,
    textbookExercisesDone: true,
    theoremsProofsMastered: false,
    sampleExamsSolvedCount: 4,
    targetScore: 19.75,
    notes: 'اثبات روابط تکانه و آزمایش‌های کتاب درسی؛ پرسش‌ها و تمرین‌های دوره فصول.'
  },
  {
    id: 'fin-3',
    subject: 'هندسه ۳ (دوازدهم)',
    chapter: 'ماتریس و کاربردها، مقاطع مخروطی، بردارها در فضای سه‌بعدی',
    grade: 'دوازدهم',
    coefficient: 4.82,
    textbookExercisesDone: false,
    theoremsProofsMastered: true,
    sampleExamsSolvedCount: 3,
    targetScore: 20,
    notes: 'اثبات ویژگی‌های ضرب ماتریس‌ها و دترمینان و تعریف کانون‌ها در بیضی.'
  },
  {
    id: 'fin-4',
    subject: 'گسسته (دوازدهم)',
    chapter: 'نظریه اعداد، گراف و مدل‌سازی، ترکیبیات و احتمال',
    grade: 'دوازدهم',
    coefficient: 4.82,
    textbookExercisesDone: false,
    theoremsProofsMastered: false,
    sampleExamsSolvedCount: 2,
    targetScore: 19.5,
    notes: 'اثبات قضایای بخش‌پذیری و گراف منتظم در امتحانات نهایی خرداد بسیار بارم‌دار هستند.'
  },
  {
    id: 'fin-5',
    subject: 'شیمی ۳ (دوازدهم)',
    chapter: 'مولکول‌ها در خدمت تندرستی، آسایش، پاکیزگی و فناوری',
    grade: 'دوازدهم',
    coefficient: 7.21,
    textbookExercisesDone: true,
    theoremsProofsMastered: true,
    sampleExamsSolvedCount: 4,
    targetScore: 20,
    notes: 'حفظ دقیق تعاریف صابون‌ها، سلول‌های الکتروشیمیایی و بازهای ضعیف و واکنش‌ها.'
  }
];

