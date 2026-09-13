import { ScheduledExam, TopicExamDetail } from '../types';
import { StreamType } from './curriculumData';

export interface MazeTarazBenchmark {
  tierName: string;
  minTaraz: number;
  maxTaraz: number;
  colorClass: string;
  badgeBg: string;
  expectedRank: string;
  targetMajor: string;
  description: string;
  recommendedWeeklyHours: number;
  recommendedWeeklyTests: number;
}

/**
 * مقیاس ۱۲۰۰۰ تراز ماز (برگرفته از مدل استاندارد هم‌ترازی کنکور سراسری سازمان سنجش)
 * در آزمون‌های ماز بر خلاف قلم‌چی (که سقف آن حدود ۸۰۰۰ است)، تراز تا ۱۲۰۰۰ و حتی ۱۳۰۰۰ محاسبه می‌شود.
 */
export const MAZE_TARAZ_BENCHMARKS: MazeTarazBenchmark[] = [
  {
    tierName: 'الماس فوق ممتاز (تک‌رقمی و دورقمی)',
    minTaraz: 11500,
    maxTaraz: 13000,
    colorClass: 'text-emerald-800 border-emerald-300',
    badgeBg: 'bg-emerald-500 text-stone-950',
    expectedRank: 'رتبه ۱ تا ۱۰۰ کشوری',
    targetMajor: 'پزشکی و دندان‌پزشکی تهران و شهید بهشتی / مهندسی برق و کامپیوتر شریف / حقوق دانشگاه تهران',
    description: 'تسلط صددرصدی بر تمام تیپ‌های تستی، دقت بالای ۹۲ درصد در محاسبات و آزمون‌های زمان‌دار بدون افتادن در دام‌های آموزشی.',
    recommendedWeeklyHours: 55,
    recommendedWeeklyTests: 650
  },
  {
    tierName: 'ممتاز طلایی (رتبه ۳ رقمی برتر)',
    minTaraz: 10500,
    maxTaraz: 11499,
    colorClass: 'text-teal-800 border-teal-300',
    badgeBg: 'bg-teal-600 text-white',
    expectedRank: 'رتبه ۱۰۰ تا ۱۰۰۰ کشوری',
    targetMajor: 'پزشکی، دندان، داروسازی سراسری / مهندسی مکانیک، عمران، صنایع شریف، تهران و امیرکبیر / روانشناسی تهران',
    description: 'تسلط عمیق بر مباحث پرتکرار و رتبه‌ساز، درصدهای بالای ۷۰ تا ۷۵ درصد در دروس تخصصی ماز.',
    recommendedWeeklyHours: 48,
    recommendedWeeklyTests: 550
  },
  {
    tierName: 'نقره‌ای بسیار خوب (رتبه ۴ رقمی برتر)',
    minTaraz: 9500,
    maxTaraz: 10499,
    colorClass: 'text-blue-800 border-blue-300',
    badgeBg: 'bg-blue-600 text-white',
    expectedRank: 'رتبه ۱۰۰۰ تا ۳۰۰۰ کشوری',
    targetMajor: 'فیزیوتراپی، رادیولوژی، علوم تغذیه / مهندسی‌های دانشگاه‌های سراسری برتر استان‌ها / حسابداری و مدیریت',
    description: 'پایه مفهومی قوی، نیاز به افزایش سرعت عمل، مدیریت دفترچه آزمون ماز و کاهش غلط‌های ناشی از بی‌دقتی.',
    recommendedWeeklyHours: 42,
    recommendedWeeklyTests: 450
  },
  {
    tierName: 'برنزی متوسط به بالا',
    minTaraz: 8000,
    maxTaraz: 9499,
    colorClass: 'text-amber-800 border-amber-300',
    badgeBg: 'bg-amber-600 text-white',
    expectedRank: 'رتبه ۳۰۰۰ تا ۸۰۰۰ کشوری',
    targetMajor: 'پیراپزشکی‌های دولتی و آزاد / مهندسی‌های مراکز استان / دانشگاه فرهنگیان و دبیری',
    description: 'نیاز به تبدیل یادگیری تشریحی به مهارت تست‌زنی سرعتی و حل تست‌های طبقه‌بندی‌شده بیشتر در باکس‌های مطالعاتی.',
    recommendedWeeklyHours: 35,
    recommendedWeeklyTests: 350
  },
  {
    tierName: 'پایه و در حال رشد',
    minTaraz: 0,
    maxTaraz: 7999,
    colorClass: 'text-rose-800 border-rose-300',
    badgeBg: 'bg-rose-600 text-white',
    expectedRank: 'رتبه بالای ۸۰۰۰',
    targetMajor: 'نیاز به تقویت پایه برای ارتقا به ترازهای بالاتر',
    description: 'نیازمند مطالعه عمیق کتاب درسی، حل تمرین‌های متن و تست‌های آموزشی خط‌به‌خط.',
    recommendedWeeklyHours: 30,
    recommendedWeeklyTests: 250
  }
];

export const MATH_SCHEDULED_EXAMS: ScheduledExam[] = [
  {
    id: 'math-exam-1',
    examName: 'آزمون آنلاین کشوری ماز (رشته ریاضی) - مرحله ۱ (۲۷ شهریور)',
    organization: 'ماز',
    stageTitle: 'آزمون تابستانه ۲۷ شهریور ماز (مرور پایه دهم و یازدهم + پیش‌خوانی دوازدهم)',
    examDate: 'جمعه ۲۷ شهریور ۱۴۰۵',
    dateGregorian: '2026-09-18',
    targetGoalText: 'تراز ماز بالای ۱۰,۸۰۰ (مقیاس ۱۲,۰۰۰ کشوری) با درصد اختصاصی بالای ۷۰٪',
    syllabusSummary: 'ریاضی پایه: مجموعه الگو و دنباله؛ هندسه ۲: روابط طولی مثلث؛ آمار و احتمال: آمار توصیفی و استنباطی؛ فیزیک: ویژگی‌های فیزیکی مواد (دهم) + مغناطیس و القا (یازدهم)؛ شیمی: استوکیومتری و غلظت (دهم) + فصل ۲ و ۳ (یازدهم)؛ دروس دوازدهم (اختیاری): تابع، ماتریس، نظریه اعداد، حرکت بر خط راست، مولکول‌ها در خدمت تندرستی',
    selectedTopics: [
      'ریاضی ۱ و حسابان ۱ (پایه)',
      'هندسه ۲ و آمار و احتمال (پایه)',
      'فیزیک ۱ و فیزیک ۲ (پایه)',
      'شیمی ۱ و شیمی ۲ (پایه)',
      'پیش‌خوانی دوازدهم (اختیاری)'
    ],
    totalTargetTests: 480,
    topicDetails: [
      {
        id: 'm1-td1',
        subject: 'ریاضی ۱ و حسابان ۱',
        chapter: 'مجموعه، الگو و دنباله',
        subtopic: 'ریاضی ۱: صفحه‌های ۱ تا ۲۷ | حسابان ۱: صفحه‌های ۱ تا ۶',
        pagesOrScope: 'صفحه‌های ۱ تا ۲۷ ریاضی ۱، صفحه‌های ۱ تا ۶ حسابان ۱',
        testTypes: 'تست‌های ترکیبی مجموعه و الگو، دنباله‌های حسابی و هندسی',
        difficulty: 'متوسط',
        targetTestCount: 50,
        completedTestCount: 0,
        importanceWeight: 'متوسط',
        hasPrerequisiteInClass: false
      },
      {
        id: 'm1-td2',
        subject: 'هندسه ۲',
        chapter: 'روابط طولی در مثلث (فصل ۳)',
        subtopic: 'روابط طولی در مثلث، قضیه کسینوس‌ها و سینوس‌ها و نیمساز',
        pagesOrScope: 'صفحه‌های ۵۹ تا ۷۴ هندسه ۲',
        testTypes: 'تست‌های هندسی قضیه سینوس‌ها و کسینوس‌ها',
        difficulty: 'متوسط',
        targetTestCount: 40,
        completedTestCount: 0,
        importanceWeight: 'متوسط',
        hasPrerequisiteInClass: false
      },
      {
        id: 'm1-td3',
        subject: 'آمار و احتمال',
        chapter: 'آمار توصیفی + آمار استنباطی',
        subtopic: 'فصل ۳ و ۴: شاخص‌های گرایش به مرکز و پراکندگی، احتمال',
        pagesOrScope: 'صفحه‌های ۶۹ تا ۱۲۱ آمار و احتمال',
        testTypes: 'تست‌های واریانس، انحراف معیار و مفاهیم استنباطی',
        difficulty: 'متوسط',
        targetTestCount: 40,
        completedTestCount: 0,
        importanceWeight: 'متوسط',
        hasPrerequisiteInClass: false
      },
      {
        id: 'm1-td4',
        subject: 'فیزیک ۱ (یادگیری عمیق)',
        chapter: 'فیزیک ۱: ویژگی‌های فیزیکی مواد',
        subtopic: 'فصل ۲ دهم: فشار، چگالی، اصل ارشمیدس و شاره‌ها',
        pagesOrScope: 'صفحه‌های ۲۳ تا ۵۱ فیزیک ۱',
        testTypes: 'محاسبات فشار در مایعات، لوله‌های U شکل',
        difficulty: 'سخت',
        targetTestCount: 60,
        completedTestCount: 0,
        importanceWeight: 'پرتکرار و حیاتی (تضمین درصد)',
        hasPrerequisiteInClass: true
      },
      {
        id: 'm1-td5',
        subject: 'فیزیک ۲ (مرور و جمع‌بندی)',
        chapter: 'مغناطیس + القای الکترومغناطیسی و جریان متناوب',
        subtopic: 'فصل ۳ و ۴ یازدهم: نیروی مغناطیسی، قانون فارادی، لنز',
        pagesOrScope: 'صفحه‌های ۸۳ تا ۱۳۰ فیزیک ۲',
        testTypes: 'تست‌های القا و جهت جریان القایی، شار مغناطیسی',
        difficulty: 'بسیار چالشی و دام‌دار',
        targetTestCount: 80,
        completedTestCount: 0,
        importanceWeight: 'پرتکرار و حیاتی (تضمین درصد)',
        hasPrerequisiteInClass: true
      },
      {
        id: 'm1-td6',
        subject: 'شیمی ۱ (یادگیری عمیق)',
        chapter: 'رفتار گازها، استوکیومتری واکنش، محلول‌ها',
        subtopic: 'فصل ۲ و ۳ دهم: گازها (۷۶-۷۹)، استوکیومتری (۷۹-۸۰)، یون چنداتمی (۸۹-۹۲)، غلظت (۹۳-۱۰۰)',
        pagesOrScope: 'صفحه‌های ۷۶-۸۰ و ۸۹-۱۰۰ شیمی ۱',
        testTypes: 'محاسبات استوکیومتری، درصد جرمی و غلظت مولی',
        difficulty: 'بسیار چالشی و دام‌دار',
        targetTestCount: 70,
        completedTestCount: 0,
        importanceWeight: 'پرتکرار و حیاتی (تضمین درصد)',
        hasPrerequisiteInClass: true
      },
      {
        id: 'm1-td7',
        subject: 'شیمی ۲ (مرور و جمع‌بندی)',
        chapter: 'فصل ۲ و ۳ یازدهم',
        subtopic: 'سینتیک شیمیایی، آنتالپی، پلیمرها',
        pagesOrScope: 'صفحه‌های ۷۷ تا ۱۲۳ شیمی ۲',
        testTypes: 'آنتالپی واکنش‌ها، مسائل سرعت',
        difficulty: 'سخت',
        targetTestCount: 70,
        completedTestCount: 0,
        importanceWeight: 'پرتکرار و حیاتی (تضمین درصد)',
        hasPrerequisiteInClass: true
      },
      {
        id: 'm1-td8',
        subject: 'پیش‌خوانی دوازدهم (اختیاری)',
        chapter: 'دروس پایه دوازدهم',
        subtopic: 'حسابان ۲ (تابع: ۱ تا ۱۸) | هندسه ۳ (ماتریس: ۹ تا ۲۳) | گسسته (نظریه اعداد: ۱ تا ۱۲) | فیزیک ۳ (حرکت بر خط راست: ۱ تا ۲۱) | شیمی ۳ (مولکول‌ها در خدمت تندرستی: ۱ تا ۱۵)',
        pagesOrScope: 'مباحث ابتدایی دروس دوازدهم (اختیاری)',
        testTypes: 'تست‌های مقدماتی و آشنایی با دوازدهم',
        difficulty: 'آسان',
        targetTestCount: 70,
        completedTestCount: 0,
        importanceWeight: 'متوسط',
        hasPrerequisiteInClass: false
      }
    ]
  },
  {
    id: 'math-exam-2',
    examName: 'آزمون آنلاین مرحله‌ای ماز (رشته ریاضی) - مرحله ۲',
    organization: 'ماز',
    stageTitle: 'مرحله ۲ کشوری ماز - کاربرد مشتق و دینامیک نیوتونی',
    examDate: 'جمعه ۴ مهر ۱۴۰۵',
    dateGregorian: '2026-09-25',
    targetGoalText: 'تراز ماز بالای ۱۱,۲۰۰ (مقیاس ۱۲,۰۰۰ کشوری) با درصد فیزیک بالای ۷۵٪ و هندسه بالای ۶۵٪',
    syllabusSummary: 'حسابان ۲: کاربرد مشتق (نقاط بحرانی و اکسترمم‌های نسبی)؛ فیزیک ۳: دینامیک و قوانین حرکت نیوتون؛ هندسه ۳: بردارها در فضای سه‌بعدی؛ گسسته: گراف و مدل‌سازی؛ شیمی ۳: اسیدها و بازها و محاسبات pH',
    selectedTopics: [
      'کاربرد مشتق (اکسترمم و بهینه‌سازی)',
      'دینامیک و قوانین نیوتون (فیزیک ۳)',
      'بردارها در فضای سه‌بعدی (هندسه ۳)',
      'گراف و مدل‌سازی (گسسته دوازدهم)',
      'اسیدها و بازها و محاسبات pH (شیمی ۳)'
    ],
    totalTargetTests: 460,
    topicDetails: [
      {
        id: 'm2-td1',
        subject: 'حسابان ۲',
        chapter: 'کاربرد مشتق',
        subtopic: 'بهینه‌سازی هندسی و جبری و نقاط عطف',
        difficulty: 'بسیار چالشی و دام‌دار',
        targetTestCount: 140,
        completedTestCount: 0,
        importanceWeight: 'پرتکرار و حیاتی (تضمین درصد)',
        hasPrerequisiteInClass: true
      },
      {
        id: 'm2-td2',
        subject: 'فیزیک ۳',
        chapter: 'دینامیک و تکانه',
        subtopic: 'نیروهای اصطکاک، کشش طناب و آسانسور',
        difficulty: 'سخت',
        targetTestCount: 110,
        completedTestCount: 0,
        importanceWeight: 'پرتکرار و حیاتی (تضمین درصد)',
        hasPrerequisiteInClass: true
      },
      {
        id: 'm2-td3',
        subject: 'گسسته',
        chapter: 'گراف و درخت',
        subtopic: 'مرتبه، درجه رأس‌ها و دور و مسیر',
        difficulty: 'متوسط',
        targetTestCount: 80,
        completedTestCount: 0,
        importanceWeight: 'متوسط',
        hasPrerequisiteInClass: false
      },
      {
        id: 'm2-td4',
        subject: 'هندسه ۳',
        chapter: 'بردارها',
        subtopic: 'ضرب داخلی و ضرب خارجی بردارها',
        difficulty: 'متوسط',
        targetTestCount: 65,
        completedTestCount: 0,
        importanceWeight: 'متوسط',
        hasPrerequisiteInClass: false
      },
      {
        id: 'm2-td5',
        subject: 'شیمی ۳',
        chapter: 'اسیدها و بازها',
        subtopic: 'ثابت یونش اسیدی و بازی و شناساگرها',
        difficulty: 'سخت',
        targetTestCount: 65,
        completedTestCount: 0,
        importanceWeight: 'پرتکرار و حیاتی (تضمین درصد)',
        hasPrerequisiteInClass: true
      }
    ]
  },
  {
    id: 'math-exam-3',
    examName: 'آزمون سنجش کشوری (تعاونی سنجش) - مرحله ۳',
    organization: 'سنجش',
    stageTitle: 'مرحله ۳ - جمع‌بندی نیم‌فصل اول دوازدهم + پایه‌های دهم و یازدهم',
    examDate: 'جمعه ۱۸ مهر ۱۴۰۵',
    dateGregorian: '2026-10-09',
    targetGoalText: 'تراز سنجش بالای ۷۲۰۰ و رتبه کل زیر ۵۰۰ منطقه',
    syllabusSummary: 'حسابان جامع: مثلثات یازدهم و دوازدهم + تابع؛ فیزیک: نوسان و موج + ترمودینامیک پایه دهم؛ هندسه: مقاطع مخروطی دایره و بیضی؛ گسسته: ترکیبیات و اصل شمول؛ شیمی: الکتروشیمی و سلول‌های گالوانی',
    selectedTopics: [
      'مثلثات جامع (حسابان ۱ و ۲)',
      'نوسان و امواج مکانیکی (فیزیک ۳)',
      'مقاطع مخروطی دایره و بیضی (هندسه ۳)',
      'ترکیبیات و شمارش بدون شمردن (گسسته و آمار)',
      'الکتروشیمی و اکسایش-کاهش (شیمی ۳)'
    ],
    totalTargetTests: 520,
    topicDetails: [
      {
        id: 'm3-td1',
        subject: 'حسابان جامع',
        chapter: 'مثلثات و معادلات مثلثاتی',
        subtopic: 'روابط مجموع و تفاضل کمان‌ها و دایره مثلثاتی',
        difficulty: 'بسیار چالشی و دام‌دار',
        targetTestCount: 140,
        completedTestCount: 0,
        importanceWeight: 'پرتکرار و حیاتی (تضمین درصد)',
        hasPrerequisiteInClass: true
      },
      {
        id: 'm3-td2',
        subject: 'فیزیک ۳',
        chapter: 'نوسان و موج',
        subtopic: 'حرکت هماهنگ ساده فنر و آونگ و معادله نوسان',
        difficulty: 'سخت',
        targetTestCount: 120,
        completedTestCount: 0,
        importanceWeight: 'پرتکرار و حیاتی (تضمین درصد)',
        hasPrerequisiteInClass: true
      },
      {
        id: 'm3-td3',
        subject: 'شیمی ۳',
        chapter: 'الکتروشیمی',
        subtopic: 'جدول پتانسیل کاهش استاندارد و سلول دانیا',
        difficulty: 'سخت',
        targetTestCount: 100,
        completedTestCount: 0,
        importanceWeight: 'پرتکرار و حیاتی (تضمین درصد)',
        hasPrerequisiteInClass: true
      },
      {
        id: 'm3-td4',
        subject: 'گسسته',
        chapter: 'ترکیبیات و اصل لانه کبوتری',
        subtopic: 'جایگشت‌ها، ترکیب و مسائل پیشرفته لانه‌کبوتری',
        difficulty: 'متوسط',
        targetTestCount: 80,
        completedTestCount: 0,
        importanceWeight: 'متوسط',
        hasPrerequisiteInClass: false
      },
      {
        id: 'm3-td5',
        subject: 'هندسه ۳',
        chapter: 'مقاطع مخروطی',
        subtopic: 'معادله کانون‌ها و خروج از مرکز بیضی',
        difficulty: 'متوسط',
        targetTestCount: 80,
        completedTestCount: 0,
        importanceWeight: 'متوسط',
        hasPrerequisiteInClass: false
      }
    ]
  },
  {
    id: 'math-exam-4',
    examName: 'آزمون آزمایشی گزینه دو - مرحله ۴',
    organization: 'گزینه دو',
    stageTitle: 'مرحله ۴ - شبیه‌سازی پیشرفته و مرور نیم‌سال اول',
    examDate: 'جمعه ۲ آبان ۱۴۰۵',
    dateGregorian: '2026-10-23',
    targetGoalText: 'تراز بالای ۷۰۰۰ با پوشش کامل تست‌های زمان‌دار',
    syllabusSummary: 'حسابان: حد نامتناهی و حد در بی‌نهایت؛ فیزیک: صوت و بازتاب امواج؛ شیمی: انرژی فعال‌سازی و سینتیک؛ گسسته: اصل طرد و شمول؛ هندسه: دوران و بازتاب',
    selectedTopics: [
      'حد در بی‌نهایت و مجانب‌ها (حسابان ۲)',
      'امواج صوتی و اثر دوپلر (فیزیک ۳)',
      'سرعت واکنش و کاتالیزورها (شیمی ۳)',
      'اصل شمول و عدم شمول (گسسته دوازدهم)'
    ],
    totalTargetTests: 450
  }
];

export const EXPERIMENTAL_SCHEDULED_EXAMS: ScheduledExam[] = [
  {
    id: 'exp-exam-1',
    examName: 'آزمون آنلاین کشوری ماز (علوم تجربی) - مرحله ۱ (۲۷ شهریور)',
    organization: 'ماز',
    stageTitle: 'آزمون تابستانه ۲۷ شهریور ماز (مرور پایه دهم و یازدهم + پیش‌خوانی دوازدهم)',
    examDate: 'جمعه ۲۷ شهریور ۱۴۰۵',
    dateGregorian: '2026-09-18',
    targetGoalText: 'تراز ماز بالای ۱۰,۸۰۰ (مقیاس ۱۲,۰۰۰ کشوری) با درصد زیست بالای ۸۰٪',
    syllabusSummary: 'زیست پایه: گوارش، گردش مواد، تبادلات گازی و تولیدمثل؛ شیمی پایه: ساختار اتم، استوکیومتری و ترموشیمی؛ فیزیک پایه: اندازه‌گیری، فشار، کار و گرما + الکتریسیته و مغناطیس؛ ریاضی پایه: تابع، معادلات و مثلثات مقدماتی؛ پیش‌خوانی دوازدهم (اختیاری): مولکول‌های اطلاعاتی زیست ۳ و اسید-باز شیمی ۳',
    selectedTopics: [
      'زیست‌شناسی دهم و یازدهم (پایه جامع)',
      'شیمی ۱ و ۲ (استوکیومتری و ساختار لوویس)',
      'فیزیک ۱ و ۲ (فشار و شاره‌ها + مدار)',
      'ریاضیات تجربی پایه (تابع و مثلثات)',
      'پیش‌خوانی دوازدهم (اختیاری)'
    ],
    totalTargetTests: 520,
    topicDetails: [
      {
        id: 'e1-td1',
        subject: 'زیست‌شناسی',
        chapter: 'زیست دهم و یازدهم پایه',
        subtopic: 'گردش مواد و قلب (دهم) + تنظیم عصبی و ایمنی (یازدهم)',
        pagesOrScope: 'فصل ۴ دهم + فصل ۱ و ۵ یازدهم',
        testTypes: 'تست‌های خط‌به‌خط و شکل‌دار ترکیبی',
        difficulty: 'بسیار چالشی و دام‌دار',
        targetTestCount: 160,
        completedTestCount: 0,
        importanceWeight: 'پرتکرار و حیاتی (تضمین درصد)',
        hasPrerequisiteInClass: true
      },
      {
        id: 'e1-td2',
        subject: 'شیمی تجربی',
        chapter: 'شیمی دهم و یازدهم پایه',
        subtopic: 'استوکیومتری فرمولی و واکنشی + گرماشیمی و آنتالپی',
        pagesOrScope: 'فصل ۱ و ۲ دهم + فصل ۲ یازدهم',
        testTypes: 'مسائل سرعتی موازنه‌دار و کسرهای تبدیل',
        difficulty: 'سخت',
        targetTestCount: 120,
        completedTestCount: 0,
        importanceWeight: 'پرتکرار و حیاتی (تضمین درصد)',
        hasPrerequisiteInClass: true
      },
      {
        id: 'e1-td3',
        subject: 'فیزیک تجربی',
        chapter: 'فیزیک دهم و یازدهم پایه',
        subtopic: 'شاره‌ها، لوله‌های Uشکل و بالابر هیدرولیکی + مدارهای الکتریکی',
        pagesOrScope: 'فصل ۲ دهم + فصل ۲ یازدهم',
        testTypes: 'تست‌های مفهومی و محاسباتی مدار با قواعد کیرشه‌هف',
        difficulty: 'سخت',
        targetTestCount: 110,
        completedTestCount: 0,
        importanceWeight: 'پرتکرار و حیاتی (تضمین درصد)',
        hasPrerequisiteInClass: true
      },
      {
        id: 'e1-td4',
        subject: 'ریاضیات تجربی',
        chapter: 'ریاضی پایه جامع',
        subtopic: 'دامنه و برد تابع، ترکیب توابع و معادلات درجه دوم',
        pagesOrScope: 'فصل ۳ دهم + فصل ۱ و ۳ یازدهم',
        testTypes: 'تست‌های تعیین ریشه و تحلیل نمودار',
        difficulty: 'متوسط',
        targetTestCount: 90,
        completedTestCount: 0,
        importanceWeight: 'متوسط',
        hasPrerequisiteInClass: false
      },
      {
        id: 'e1-td5',
        subject: 'پیش‌خوانی دوازدهم (اختیاری)',
        chapter: 'زیست ۳ و شیمی ۳',
        subtopic: 'ساختار DNA و همانندسازی + پاک‌کننده‌ها و صابون‌ها',
        pagesOrScope: 'فصل ۱ زیست ۳ + فصل ۱ شیمی ۳',
        testTypes: 'تست‌های مقدماتی مفهومی',
        difficulty: 'آسان',
        targetTestCount: 40,
        completedTestCount: 0,
        importanceWeight: 'متوسط',
        hasPrerequisiteInClass: false
      }
    ]
  },
  {
    id: 'exp-exam-2',
    examName: 'آزمون آنلاین ماز (علوم تجربی) - مرحله ۲',
    organization: 'ماز',
    stageTitle: 'مرحله ۲ کشوری ماز - ژنتیک پیشرفته، اسید-باز و دینامیک',
    examDate: 'جمعه ۴ مهر ۱۴۰۵',
    dateGregorian: '2026-09-25',
    targetGoalText: 'تراز ماز بالای ۱۱,۴۰۰ (مقیاس ۱۲,۰۰۰ کشوری) با درصد زیست بالای ۸۵٪ و شیمی بالای ۷۵٪',
    syllabusSummary: 'زیست ۳: انتقال اطلاعات در نسل‌ها (وراثت، الگوهای توارثی مندلی، دودمانه و صفات وابسته به جنس)؛ شیمی ۳: اسیدها و بازها، تعادل و محاسبات pH و شناساگرها؛ فیزیک ۳: دینامیک و قوانین حرکت نیوتون؛ ریاضی تجربی: مثلثات جامع و معادلات مثلثاتی',
    selectedTopics: [
      'انتقال اطلاعات در نسل‌ها و ژنتیک (زیست ۳)',
      'اسیدها و بازها و محاسبات pH (شیمی ۳)',
      'دینامیک و قوانین نیوتون (فیزیک ۳ تجربی)',
      'مثلثات جامع کنکور (ریاضیات تجربی)'
    ],
    totalTargetTests: 490,
    topicDetails: [
      {
        id: 'e2-td1',
        subject: 'زیست‌شناسی ۳',
        chapter: 'ژنتیک و وراثت',
        subtopic: 'دودمانه‌ها (شجره‌نامه)، صفات وابسته به جنس، الل‌های چندگانه و هم‌توانی',
        pagesOrScope: 'فصل ۳ زیست دوازدهم کامل',
        testTypes: 'تست‌های شجره‌نامه احتمالی و تیپ‌بندی ژنوتیپ',
        difficulty: 'بسیار چالشی و دام‌دار',
        targetTestCount: 170,
        completedTestCount: 0,
        importanceWeight: 'پرتکرار و حیاتی (تضمین درصد)',
        hasPrerequisiteInClass: true
      },
      {
        id: 'e2-td2',
        subject: 'شیمی ۳',
        chapter: 'اسید و باز',
        subtopic: 'ثابت یونش Ka، درصد یونش و مسائل دشوار مخلوط اسید و باز',
        pagesOrScope: 'فصل ۱ شیمی دوازدهم',
        testTypes: 'مسائل لگاریتمی pH و غلظت تعادلی یون هیدرونیوم',
        difficulty: 'بسیار چالشی و دام‌دار',
        targetTestCount: 110,
        completedTestCount: 0,
        importanceWeight: 'پرتکرار و حیاتی (تضمین درصد)',
        hasPrerequisiteInClass: true
      },
      {
        id: 'e2-td3',
        subject: 'فیزیک ۳',
        chapter: 'دینامیک و تکانه',
        subtopic: 'قوانین نیوتون، آسانسور، سطوح شیب‌دار و اصطکاک',
        pagesOrScope: 'فصل ۲ فیزیک دوازدهم',
        testTypes: 'رسم نمودار جسم آزاد و معادلات حرکت شتاب‌دار',
        difficulty: 'سخت',
        targetTestCount: 110,
        completedTestCount: 0,
        importanceWeight: 'پرتکرار و حیاتی (تضمین درصد)',
        hasPrerequisiteInClass: true
      },
      {
        id: 'e2-td4',
        subject: 'ریاضی تجربی',
        chapter: 'مثلثات جامع',
        subtopic: 'معادلات مثلثاتی، دوره‌های تناوب و مقادیر ماکزیمم/مینیمم توابع مثلثاتی',
        pagesOrScope: 'فصل ۲ دوازدهم + فصل ۴ یازدهم',
        testTypes: 'تست‌های حل معادله مثلثاتی به فرم sin(x)=sin(a)',
        difficulty: 'سخت',
        targetTestCount: 100,
        completedTestCount: 0,
        importanceWeight: 'پرتکرار و حیاتی (تضمین درصد)',
        hasPrerequisiteInClass: false
      }
    ]
  },
  {
    id: 'exp-exam-3',
    examName: 'آزمون جامع سنجش تجربی - مرحله ۳',
    organization: 'سنجش',
    stageTitle: 'مرحله ۳ - فتوسنتز، تنفس یاخته‌ای، الکتروشیمی و نوسان',
    examDate: 'جمعه ۱۸ مهر ۱۴۰۵',
    dateGregorian: '2026-10-09',
    targetGoalText: 'رتبه زیر ۴۰۰ منطقه و تراز کشوری بالای ۷۱۰۰',
    syllabusSummary: 'زیست ۳: از انرژی به ماده (فتوسنتز، فتوسیستم‌ها و چرخه کالوین) + جریان اطلاعات در یاخته؛ شیمی ۳: الکتروشیمی، سلول گالوانی و الکترولیتی؛ فیزیک ۳: نوسان و امواج مکانیکی؛ ریاضی تجربی: حد و پیوستگی',
    selectedTopics: [
      'فتوسنتز و تنفس یاخته‌ای (زیست ۳)',
      'الکتروشیمی و سلول‌های گالوانی (شیمی ۳)',
      'حرکت هماهنگ ساده و موج (فیزیک ۳)',
      'حد و پیوستگی (ریاضیات تجربی)'
    ],
    totalTargetTests: 510,
    topicDetails: [
      {
        id: 'e3-td1',
        subject: 'زیست‌شناسی ۳',
        chapter: 'فتوسنتز و تنفس یاخته‌ای',
        subtopic: 'واکنش‌های نوری، چرخه کالوین، گیاهان C3/C4/CAM و گلیکولیز',
        difficulty: 'بسیار چالشی و دام‌دار',
        targetTestCount: 160,
        completedTestCount: 0,
        importanceWeight: 'پرتکرار و حیاتی (تضمین درصد)',
        hasPrerequisiteInClass: true
      },
      {
        id: 'e3-td2',
        subject: 'شیمی ۳',
        chapter: 'الکتروشیمی',
        subtopic: 'جدول E0، عدد اکسایش، خوردگی آهن و سلول سوختی هیدروژن',
        difficulty: 'سخت',
        targetTestCount: 120,
        completedTestCount: 0,
        importanceWeight: 'پرتکرار و حیاتی (تضمین درصد)',
        hasPrerequisiteInClass: true
      },
      {
        id: 'e3-td3',
        subject: 'فیزیک ۳',
        chapter: 'نوسان و موج',
        subtopic: 'معادله نوسانگر، انرژی مکانیکی فنر و تشدید',
        difficulty: 'سخت',
        targetTestCount: 120,
        completedTestCount: 0,
        importanceWeight: 'پرتکرار و حیاتی (تضمین درصد)',
        hasPrerequisiteInClass: true
      },
      {
        id: 'e3-td4',
        subject: 'ریاضیات تجربی',
        chapter: 'حد و پیوستگی',
        subtopic: 'رفع ابهام صفر صفرم جبری، مثلثاتی و پیوستگی روی بازه',
        difficulty: 'متوسط',
        targetTestCount: 110,
        completedTestCount: 0,
        importanceWeight: 'متوسط',
        hasPrerequisiteInClass: false
      }
    ]
  },
  {
    id: 'exp-exam-4',
    examName: 'آزمون قلم‌چی (کانون فرهنگی آموزش) - مرحله ۴',
    organization: 'قلم‌چی',
    stageTitle: 'مرحله ۴ کانون - جمع‌بندی نیم‌سال اول دوازدهم + زیست گیاهی دهم',
    examDate: 'جمعه ۲ آبان ۱۴۰۵',
    dateGregorian: '2026-10-23',
    targetGoalText: 'تراز قلم‌چی بالای ۶۸۰۰ با تراز زیست بالای ۷۰۰۰',
    syllabusSummary: 'زیست دوازدهم: فصول ۱ تا ۴ + زیست دهم: فصل ۶ و ۷ گیاهی؛ شیمی دوازدهم: فصول ۱ و ۲؛ فیزیک دوازدهم: حرکت‌شناسی و دینامیک؛ ریاضی تجربی: مشتق و کاربرد مشتق',
    selectedTopics: [
      'جمع‌بندی نیم‌فصل اول زیست ۳ + گیاهی دهم',
      'مشتق‌پذیری و آهنگ تغییرات (ریاضی تجربی)',
      'حرکت بر خط راست و سقوط آزاد (فیزیک ۳)',
      'الکتروشیمی و تعادل‌های شیمیایی (شیمی ۳)'
    ],
    totalTargetTests: 550
  }
];

export const HUMANITIES_SCHEDULED_EXAMS: ScheduledExam[] = [
  {
    id: 'hum-exam-1',
    examName: 'آزمون آنلاین کشوری ماز (ادبیات و علوم انسانی) - مرحله ۱ (۲۷ شهریور)',
    organization: 'ماز',
    stageTitle: 'آزمون تابستانه ۲۷ شهریور ماز (مرور پایه دهم و یازدهم + پیش‌خوانی دوازدهم)',
    examDate: 'جمعه ۲۷ شهریور ۱۴۰۵',
    dateGregorian: '2026-09-18',
    targetGoalText: 'تراز ماز بالای ۱۰,۸۰۰ (مقیاس ۱۲,۰۰۰ کشوری) با درصد علوم و فنون بالای ۸۰٪',
    syllabusSummary: 'علوم و فنون: تاریخ ادبیات خراسانی و عراقی، تقطیع هجایی و اوزان همسان، آرایه‌های واژگانی و معنوی؛ عربی تخصصی: صرف پایه، افعال مزید، نواسخ و ادوات شرط؛ ریاضی و آمار: معادلات درجه اول و دوم، استدلال و آمار تحلیلی؛ فلسفه و منطق: تعاریف، نسبت‌های چهارگانه و قضایای حملی؛ اقتصاد و روانشناسی پایه',
    selectedTopics: [
      'علوم و فنون ادبی دهم و یازدهم',
      'عربی تخصصی انسانی پایه (۱۰ و ۱۱)',
      'ریاضی و آمار ۱ و ۲ پایه',
      'منطق دهم و فلسفه یازدهم',
      'اقتصاد دهم (مفاهیم و مسائل)'
    ],
    totalTargetTests: 500,
    topicDetails: [
      {
        id: 'h1-td1',
        subject: 'علوم و فنون ادبی',
        chapter: 'عروض، قافیه و آرایه‌ها',
        subtopic: 'تقطیع هجایی، اختیارات شاعری زبانی + اوزان همسان دولختی و ایهام',
        pagesOrScope: 'فنون ۱ و ۲ کامل پایه',
        testTypes: 'تست‌های اوزان سماعی و تحلیل آرایه‌های چندگزینه‌ای',
        difficulty: 'بسیار چالشی و دام‌دار',
        targetTestCount: 150,
        completedTestCount: 0,
        importanceWeight: 'پرتکرار و حیاتی (تضمین درصد)',
        hasPrerequisiteInClass: true
      },
      {
        id: 'h1-td2',
        subject: 'عربی تخصصی',
        chapter: 'قواعد صرف و نحو پایه',
        subtopic: 'باب‌های ثلاثی مزید، حروف ناصبه و جازمه، نواسخ و لای نفی جنس',
        pagesOrScope: 'عربی دهم و یازدهم تخصصی',
        testTypes: 'تست‌های ترجمه فعل و تعریب و نقش کلمات',
        difficulty: 'سخت',
        targetTestCount: 110,
        completedTestCount: 0,
        importanceWeight: 'پرتکرار و حیاتی (تضمین درصد)',
        hasPrerequisiteInClass: true
      },
      {
        id: 'h1-td3',
        subject: 'فلسفه و منطق',
        chapter: 'منطق دهم و فلسفه یازدهم',
        subtopic: 'عکس مستوی، قیاس اقترانی شکل اول و مکتب مشاء ابن‌سینا',
        pagesOrScope: 'درس ۱ تا ۸ منطق + درس ۱ تا ۵ فلسفه ۱۱',
        testTypes: 'تست‌های مفهومی استدلال و نمودار ون',
        difficulty: 'بسیار چالشی و دام‌دار',
        targetTestCount: 110,
        completedTestCount: 0,
        importanceWeight: 'پرتکرار و حیاتی (تضمین درصد)',
        hasPrerequisiteInClass: true
      },
      {
        id: 'h1-td4',
        subject: 'اقتصاد پایه دهم',
        chapter: 'مفاهیم و مسائل محاسباتی اقتصاد',
        subtopic: 'مسائل دهک‌ها و ضریب جینی، مالیات تصاعدی و سود و زیان بنگاه',
        pagesOrScope: 'بخش ۱ تا ۳ اقتصاد دهم',
        testTypes: 'مسائل عددی بدون ماشین حساب با تله‌های آماری',
        difficulty: 'متوسط',
        targetTestCount: 70,
        completedTestCount: 0,
        importanceWeight: 'پرتکرار و حیاتی (تضمین درصد)',
        hasPrerequisiteInClass: true
      },
      {
        id: 'h1-td5',
        subject: 'ریاضی و آمار',
        chapter: 'معادلات و گزاره‌ها',
        subtopic: 'حل معادلات درجه دوم، جدول ارزش گزاره‌ها و شاخص‌های پراکندگی',
        pagesOrScope: 'ریاضی ۱ و ۲ انسانی',
        testTypes: 'تست‌های مدل‌سازی و واریانس',
        difficulty: 'متوسط',
        targetTestCount: 60,
        completedTestCount: 0,
        importanceWeight: 'متوسط',
        hasPrerequisiteInClass: false
      }
    ]
  },
  {
    id: 'hum-exam-2',
    examName: 'آزمون آنلاین ماز (ادبیات و علوم انسانی) - مرحله ۲',
    organization: 'ماز',
    stageTitle: 'مرحله ۲ کشوری ماز - اختیارات وزنی، حکمت متعالیه و منصوبات عربی',
    examDate: 'جمعه ۴ مهر ۱۴۰۵',
    dateGregorian: '2026-09-25',
    targetGoalText: 'تراز ماز بالای ۱۱,۲۰۰ (مقیاس ۱۲,۰۰۰ کشوری) با درصد فلسفه و منطق بالای ۷۵٪',
    syllabusSummary: 'علوم و فنون ۳: اوزان دوری و اختیارات شاعری وزنی (تسکین، قلب، ابدال) + اسلوب معادله در سبک هندی؛ عربی ۳: مفعول‌مطلق، حال و تمییز؛ فلسفه ۲: هستی‌شناسی و حرکت جوهری ملاصدرا؛ جامعه‌شناسی ۳: ذخیره دانشی و رویکردهای تفسیری؛ روانشناسی: حافظه و تفکر',
    selectedTopics: [
      'اختیارات شاعری وزنی و سبک هندی (فنون ۳)',
      'منصوبات و تحلیل صرفی (عربی ۳ تخصصی)',
      'حکمت متعالیه ملاصدرا و وجودشناسی (فلسفه ۲)',
      'حافظه، فراشناخت و حل مسئله (روانشناسی ۱۱)'
    ],
    totalTargetTests: 470,
    topicDetails: [
      {
        id: 'h2-td1',
        subject: 'علوم و فنون ۳',
        chapter: 'عروض پیشرفته و سبک‌شناسی',
        subtopic: 'اختیار وزنی تسکین و قلب + ویژگی‌های سبک هندی و صائب تبریزی',
        difficulty: 'بسیار چالشی و دام‌دار',
        targetTestCount: 140,
        completedTestCount: 0,
        importanceWeight: 'پرتکرار و حیاتی (تضمین درصد)',
        hasPrerequisiteInClass: true
      },
      {
        id: 'h2-td2',
        subject: 'عربی ۳ تخصصی',
        chapter: 'منصوبات در عربی',
        subtopic: 'مفعول مطلق تأکیدی/نوعی، حال مفرد و جمله و تمییز نسبتی',
        difficulty: 'سخت',
        targetTestCount: 110,
        completedTestCount: 0,
        importanceWeight: 'پرتکرار و حیاتی (تضمین درصد)',
        hasPrerequisiteInClass: true
      },
      {
        id: 'h2-td3',
        subject: 'فلسفه ۲ دوازدهم',
        chapter: 'هستی‌شناسی و حکمت متعالیه',
        subtopic: 'اصالت وجود، حرکت جوهری و برهان صدیقین ملاصدرا',
        difficulty: 'بسیار چالشی و دام‌دار',
        targetTestCount: 120,
        completedTestCount: 0,
        importanceWeight: 'پرتکرار و حیاتی (تضمین درصد)',
        hasPrerequisiteInClass: true
      },
      {
        id: 'h2-td4',
        subject: 'روانشناسی یازدهم',
        chapter: 'حافظه و تفکر',
        subtopic: 'انواع بازیابی، خطاهای ادراکی، تثبیت کارکردی و استدلال قیاسی',
        difficulty: 'متوسط',
        targetTestCount: 100,
        completedTestCount: 0,
        importanceWeight: 'پرتکرار و حیاتی (تضمین درصد)',
        hasPrerequisiteInClass: false
      }
    ]
  },
  {
    id: 'hum-exam-3',
    examName: 'آزمون جامع سنجش انسانی - مرحله ۳',
    organization: 'سنجش',
    stageTitle: 'مرحله ۳ - تشبیه و استعاره، فلسفه دکارت و کانت، شمارش و احتمال',
    examDate: 'جمعه ۱۸ مهر ۱۴۰۵',
    dateGregorian: '2026-10-09',
    targetGoalText: 'رتبه کل زیر ۳۰۰ کشوری در گروه ادبیات و علوم انسانی',
    syllabusSummary: 'علوم و فنون: تشبیه، استعاره مصرحه و مکنیه، مجاز و قرابت؛ عربی: مستثنی و منادی؛ فلسفه: فلسفه غرب (دکارت و کانت)؛ ریاضی و آمار: اصل ضرب، جایگشت و احتمال؛ جامعه‌شناسی: انضباط اجتماعی و اقتدار',
    selectedTopics: [
      'آرایه‌های بیانی (تشبیه، استعاره، مجاز)',
      'فلسفه غرب (اصالت عقل و حس)',
      'شمارش و احتمال (ریاضی ۳ انسانی)',
      'اسلوب استثناء و حصر (عربی ۳)'
    ],
    totalTargetTests: 490
  }
];

export function getDefaultScheduledExams(stream: StreamType): ScheduledExam[] {
  switch (stream) {
    case 'experimental':
      return EXPERIMENTAL_SCHEDULED_EXAMS;
    case 'humanities':
      return HUMANITIES_SCHEDULED_EXAMS;
    case 'mathematics':
    default:
      return MATH_SCHEDULED_EXAMS;
  }
}

