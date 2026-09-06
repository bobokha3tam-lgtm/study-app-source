import React, { useState } from 'react';
import { 
  Moon, 
  Send, 
  Sparkles, 
  CheckCircle2, 
  AlertTriangle, 
  TrendingUp, 
  Copy, 
  Check, 
  Clock, 
  CheckSquare, 
  Smile, 
  Calendar,
  ChevronDown,
  ChevronUp,
  History
} from 'lucide-react';
import { StudentProfile, NightlyReport } from '../types';
import { COMMON_OBSTACLES } from '../data/defaults';

interface NightlyCheckinViewProps {
  profile: StudentProfile;
  reports: NightlyReport[];
  onAddReport: (report: NightlyReport) => void;
}

export const NightlyCheckinView: React.FC<NightlyCheckinViewProps> = ({
  profile,
  reports,
  onAddReport,
}) => {
  const [studiedHours, setStudiedHours] = useState<number>(profile.dailyTargetHours || 7);
  const [totalTests, setTotalTests] = useState<number>(80);
  const [correctTests, setCorrectTests] = useState<number>(65);
  const [wrongTests, setWrongTests] = useState<number>(15);
  const [satisfactionRating, setSatisfactionRating] = useState<number>(4);
  const [selectedObstacles, setSelectedObstacles] = useState<string[]>([]);
  const [customObstacle, setCustomObstacle] = useState<string>('');
  const [studentNotes, setStudentNotes] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [currentAnalysis, setCurrentAnalysis] = useState<NightlyReport['aiAnalysis'] | null>(
    reports[0]?.aiAnalysis || null
  );
  const [copied, setCopied] = useState<boolean>(false);
  const [showHistory, setShowHistory] = useState<boolean>(false);

  const toggleObstacle = (obs: string) => {
    if (selectedObstacles.includes(obs)) {
      setSelectedObstacles(selectedObstacles.filter(o => o !== obs));
    } else {
      setSelectedObstacles([...selectedObstacles, obs]);
    }
  };

  const handleAddCustomObstacle = () => {
    if (customObstacle.trim() && !selectedObstacles.includes(customObstacle.trim())) {
      setSelectedObstacles([...selectedObstacles, customObstacle.trim()]);
      setCustomObstacle('');
    }
  };

  const handleSubmitAnalysis = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const newReport: NightlyReport = {
      id: `report-${Date.now()}`,
      date: new Date().toLocaleDateString('fa-IR', { weekday: 'long', month: 'long', day: 'numeric' }),
      studiedHours,
      totalTests,
      correctTests,
      wrongTests,
      satisfactionRating,
      obstacles: selectedObstacles,
      studentNotes,
    };

    try {
      const response = await fetch('/api/advisor/analyze-nightly', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ report: newReport, profile }),
      });

      if (!response.ok) {
        throw new Error('مشکل در دریافت پاسخ از سرور');
      }

      const data = await response.json();
      const analysis = data.analysis;
      newReport.aiAnalysis = analysis;
      setCurrentAnalysis(analysis);
      onAddReport(newReport);
    } catch (err: any) {
      console.error('Error analyzing nightly report:', err);
      // Fallback analysis if offline or error
      const score = Math.min(10, Math.max(5, Math.round((studiedHours / profile.dailyTargetHours) * 8 + satisfactionRating * 0.4)));
      const fallbackAnalysis = {
        overallScore: score,
        tone: 'strategic' as const,
        summary: `گزارش امروز دریافت شد: مجموعاً ${studiedHours} ساعت مطالعه و ${totalTests} تست با درصد پاسخگویی حدود ${totalTests > 0 ? Math.round((correctTests / totalTests) * 100) : 0}٪ داشتی. بزرگترین چالش ثبت شده: ${selectedObstacles.join(' و ') || 'هیچ مانع خاصی'}.`,
        strengthsIdentified: [
          `تثبیت زمان مطالعه در حدود ${studiedHours} ساعت`,
          totalTests >= 50 ? `تعداد تست فعال و مناسب (${totalTests} تست)` : `پیوستگی در شروع مجدد زنجیره یادگیری`
        ],
        criticalWeaknesses: [
          selectedObstacles[0] ? `افت انرژی ناشی از «${selectedObstacles[0]}»` : `نیاز به حل تست‌های سرعتی بیشتر`,
          wrongTests > 20 ? `نسبت پاسخ غلط بالا در تست‌ها (نیاز به بازخوانی درسنامه قبل از تست)` : `نیاز به ارزیابی دقیق زمان هدررفته بین پارت‌ها`
        ],
        immediateFixesTomorrow: [
          `فردا اولین پارت صبح را با مهم‌ترین مبحث درسی از نقاط ضعفت (${profile.weakSubjects[0] || 'ریاضی'}) شروع کن.`,
          `زمان استراحت بین پارت‌ها را با آلارم گوشی روی حداکثر ۱۵ دقیقه قفل کن.`,
          `تست‌های اشتباه امروز را قبل از شروع مبحث جدید فردا حتماً یکبار دیگر حل کن.`
        ],
        motivationalQuote: 'موفقیت یعنی تکرار همین تصمیم‌های کوچک روزانه، حتی در شب‌هایی که حس و حال مطالعه نداشتی.'
      };
      newReport.aiAnalysis = fallbackAnalysis;
      setCurrentAnalysis(fallbackAnalysis);
      onAddReport(newReport);
    } finally {
      setIsLoading(false);
    }
  };

  const generateTelegramMessage = () => {
    if (!currentAnalysis) return '';
    return `📝 *گزارش شبانه مطالعه - ${profile.name}*
📅 تاریخ: ${new Date().toLocaleDateString('fa-IR')}
⏱ ساعت مطالعه: ${studiedHours} ساعت (هدف: ${profile.dailyTargetHours}h)
📊 تعداد تست: ${totalTests} (✅ درست: ${correctTests} | ❌ غلط: ${wrongTests})
⭐️ میزان رضایت: ${satisfactionRating} از ۵
⚠️ موانع: ${selectedObstacles.join('، ') || 'نداشتم'}
💬 یادداشت: ${studentNotes || 'ندارد'}

------------------------
🤖 *تحلیل موشکافانه مشاور Gemini:*
🎖 نمره امروز: ${currentAnalysis.overallScore} از ۱۰
💡 ${currentAnalysis.summary}

✅ *نقاط مثبت:*
${currentAnalysis.strengthsIdentified.map(s => `• ${s}`).join('\n')}

⚠️ *نقاط ضعف و علت‌یابی:*
${currentAnalysis.criticalWeaknesses.map(w => `• ${w}`).join('\n')}

🎯 *۳ اقدام فوری فردا:*
${currentAnalysis.immediateFixesTomorrow.map((fix, idx) => `${idx + 1}. ${fix}`).join('\n')}

✨ "${currentAnalysis.motivationalQuote}"`;
  };

  const handleCopyForTelegram = () => {
    const text = generateTelegramMessage();
    if (text) {
      navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-stone-900 via-stone-800 to-indigo-950 text-white rounded-3xl p-6 sm:p-8 shadow-md border border-stone-800 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-72 h-72 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-bold border border-indigo-500/30">
              <Moon className="w-3.5 h-3.5 text-indigo-400" />
              <span>پایش و تحلیل هوشمند عملکرد شبانه</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              گزارش روزانه و تحلیل ریشه‌ای مشاور کنکور 🌙
            </h2>
            <p className="text-stone-300 text-xs sm:text-sm max-w-2xl leading-relaxed">
              هر شب ساعت مطالعه، تست‌ها و چالش‌هایت را ثبت کن؛ هوش مصنوعی عمیقاً علت‌ها را تحلیل کرده و ۳ راهکار اصلاحی مستقیم برای فردایت ارائه می‌دهد.
            </p>
          </div>
          <div className="bg-white/10 backdrop-blur-md border border-white/10 rounded-2xl p-4 shrink-0 text-center min-w-[180px]">
            <div className="text-[10px] text-stone-300 font-bold uppercase tracking-wider">ساعت هدف روزانه</div>
            <div className="text-3xl font-black text-amber-400 mt-1">{profile.dailyTargetHours} ساعت</div>
            <div className="text-[10px] text-emerald-300 mt-1.5 font-bold flex items-center justify-center gap-1 bg-emerald-500/20 py-0.5 px-2 rounded-md">
              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
              <span>{profile.targetGoal}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Form + Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left/Main Column: Input Form */}
        <div className="lg:col-span-6 bg-white rounded-2xl p-6 border border-stone-200 shadow-xs space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-stone-100">
            <h3 className="font-bold text-stone-900 flex items-center gap-2 text-base">
              <Calendar className="w-4 h-4 text-emerald-600" />
              فرم ثبت گزارش امشب
            </h3>
            <span className="text-xs text-stone-500">
              {new Date().toLocaleDateString('fa-IR', { weekday: 'long', day: 'numeric', month: 'long' })}
            </span>
          </div>

          <form onSubmit={handleSubmitAnalysis} className="space-y-5">
            {/* Studied Hours */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-xs font-semibold text-stone-700 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-stone-500" />
                  ساعت مطالعه مفید امروز
                </label>
                <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">
                  {studiedHours} ساعت (از هدف {profile.dailyTargetHours} ساعته)
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="16"
                step="0.5"
                value={studiedHours}
                onChange={e => setStudiedHours(parseFloat(e.target.value))}
                className="w-full h-2 bg-stone-100 rounded-lg appearance-none cursor-pointer accent-emerald-600"
              />
              <div className="flex justify-between text-[11px] text-stone-400 mt-1">
                <span>۰ ساعت</span>
                <span>۵ ساعت</span>
                <span>۱۰ ساعت</span>
                <span>۱۶ ساعت</span>
              </div>
            </div>

            {/* Test statistics */}
            <div className="p-4 rounded-xl bg-stone-50 border border-stone-200/80 space-y-3">
              <label className="block text-xs font-semibold text-stone-700">
                آمار تست‌زنی امروز
              </label>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <span className="text-[11px] text-stone-500 block mb-1">کل تست‌ها</span>
                  <input
                    type="number"
                    min="0"
                    value={totalTests}
                    onChange={e => setTotalTests(parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-1.5 rounded-lg border border-stone-300 text-sm font-semibold bg-white focus:outline-emerald-600"
                  />
                </div>
                <div>
                  <span className="text-[11px] text-emerald-700 block mb-1">پاسخ درست</span>
                  <input
                    type="number"
                    min="0"
                    value={correctTests}
                    onChange={e => setCorrectTests(parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-1.5 rounded-lg border border-emerald-300 text-sm font-semibold text-emerald-800 bg-white focus:outline-emerald-600"
                  />
                </div>
                <div>
                  <span className="text-[11px] text-red-700 block mb-1">غلط / نزده</span>
                  <input
                    type="number"
                    min="0"
                    value={wrongTests}
                    onChange={e => setWrongTests(parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-1.5 rounded-lg border border-red-300 text-sm font-semibold text-red-800 bg-white focus:outline-emerald-600"
                  />
                </div>
              </div>
            </div>

            {/* Satisfaction Rating */}
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-2">
                میزان رضایت روحی و تمرکزی خودت از امروز (از ۵)
              </label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map(star => (
                  <button
                    type="button"
                    key={star}
                    onClick={() => setSatisfactionRating(star)}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all flex flex-col items-center justify-center gap-1 ${
                      satisfactionRating === star
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                        : 'bg-stone-50 text-stone-600 border-stone-200 hover:bg-stone-100'
                    }`}
                  >
                    <span>{star}</span>
                    <span className="text-[10px] font-normal">
                      {star === 1 ? 'خیلی ضعیف' : star === 3 ? 'معمولی' : star === 5 ? 'فوق‌العاده' : ''}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Obstacles / Challenges */}
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-2">
                موانع و چالش‌های امروز (برای کشف علت افت بازدهی):
              </label>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {COMMON_OBSTACLES.map((obs, idx) => {
                  const isSelected = selectedObstacles.includes(obs);
                  return (
                    <button
                      type="button"
                      key={idx}
                      onClick={() => toggleObstacle(obs)}
                      className={`text-xs px-2.5 py-1.5 rounded-lg border transition-all ${
                        isSelected
                          ? 'bg-red-50 border-red-300 text-red-700 font-medium'
                          : 'bg-white border-stone-200 text-stone-600 hover:bg-stone-50'
                      }`}
                    >
                      {isSelected ? '✓ ' : ''}{obs}
                    </button>
                  );
                })}
              </div>

              {/* Custom obstacle input */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={customObstacle}
                  onChange={e => setCustomObstacle(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddCustomObstacle(); } }}
                  placeholder="مانع یا اتفاق خاص دیگری رخ داده؟"
                  className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-stone-300 focus:outline-emerald-600"
                />
                <button
                  type="button"
                  onClick={handleAddCustomObstacle}
                  className="px-3 py-1.5 bg-stone-100 text-stone-700 rounded-lg text-xs hover:bg-stone-200"
                >
                  ثبت
                </button>
              </div>
            </div>

            {/* Student Note */}
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                توضیحات و احساس دانش‌آموز (آزادانه بنویس)
              </label>
              <textarea
                rows={3}
                value={studentNotes}
                onChange={e => setStudentNotes(e.target.value)}
                placeholder="مثلاً: در ریاضی فرمول‌ها رو یادم رفته بود، بعدازظهر افت انرژی داشتم ولی زیست رو کامل طبق برنامه خوندم..."
                className="w-full px-3 py-2 text-xs rounded-lg border border-stone-300 focus:outline-emerald-600"
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-sm transition-all disabled:opacity-60"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  مشاور در حال کالبدشکافی و تحلیل علمی گزارش...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  تحلیل موشکافانه امشب با هوش مصنوعی
                </>
              )}
            </button>
          </form>
        </div>

        {/* Right Column: AI Analysis Result */}
        <div className="lg:col-span-6 space-y-6">
          {currentAnalysis ? (
            <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
              {/* Card Header */}
              <div className="p-6 border-b border-stone-100 bg-stone-50/70">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold text-sm">
                      AI
                    </div>
                    <div>
                      <h3 className="font-bold text-stone-900 text-base">نتیجه تحلیل مشاور درسی</h3>
                      <p className="text-xs text-stone-500">تحلیل موشکافانه نقاط ضعف و ارائه نقشه راه فردا</p>
                    </div>
                  </div>

                  {/* Score Pill */}
                  <div className="flex items-center gap-2">
                    <div className="text-right">
                      <span className="text-[10px] text-stone-400 block">نمره عملکرد</span>
                      <span className="text-lg font-black text-emerald-700">
                        {currentAnalysis.overallScore} <span className="text-xs font-normal text-stone-400">/ ۱۰</span>
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Card Body */}
              <div className="p-6 space-y-6 text-right">
                {/* Summary / Diagnosis */}
                <div>
                  <h4 className="text-xs font-bold text-stone-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <TrendingUp className="w-3.5 h-3.5 text-stone-600" />
                    ارزیابی و کالبدشکافی مشاور
                  </h4>
                  <p className="text-sm text-stone-800 leading-relaxed bg-stone-50 p-4 rounded-xl border border-stone-200/60">
                    {currentAnalysis.summary}
                  </p>
                </div>

                {/* Strengths & Weaknesses 2-Column */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Strengths */}
                  <div className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-100 space-y-2">
                    <h5 className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                      نقاط قوت و دستاورد امروز
                    </h5>
                    <ul className="text-xs text-emerald-950 space-y-1.5">
                      {currentAnalysis.strengthsIdentified.map((s, idx) => (
                        <li key={idx} className="flex items-start gap-1.5">
                          <span className="text-emerald-500 font-bold">•</span>
                          <span>{s}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Critical Weaknesses */}
                  <div className="p-4 rounded-xl bg-red-50/60 border border-red-100 space-y-2">
                    <h5 className="text-xs font-bold text-red-900 flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-red-700" />
                      نقاط ضعف و علت‌های افت
                    </h5>
                    <ul className="text-xs text-red-950 space-y-1.5">
                      {currentAnalysis.criticalWeaknesses.map((w, idx) => (
                        <li key={idx} className="flex items-start gap-1.5">
                          <span className="text-red-500 font-bold">•</span>
                          <span>{w}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* 3 Immediate Fixes for Tomorrow */}
                <div className="p-4 rounded-xl bg-amber-50/60 border border-amber-200/80 space-y-2.5">
                  <h5 className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
                    <CheckSquare className="w-3.5 h-3.5 text-amber-700" />
                    ۳ اقدام اصلاحی فوری برای فردای تو
                  </h5>
                  <div className="space-y-2">
                    {currentAnalysis.immediateFixesTomorrow.map((fix, idx) => (
                      <div key={idx} className="flex items-start gap-2 text-xs text-amber-950 bg-white/80 p-2 rounded-lg border border-amber-100">
                        <span className="w-5 h-5 rounded-full bg-amber-200 text-amber-900 font-bold text-[10px] flex items-center justify-center shrink-0">
                          {idx + 1}
                        </span>
                        <span className="leading-relaxed">{fix}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Motivational Quote */}
                <div className="text-center py-2 px-4 rounded-xl bg-stone-100 text-stone-700 text-xs italic">
                  "{currentAnalysis.motivationalQuote}"
                </div>

                {/* Copy for Telegram Button */}
                <div className="pt-2 border-t border-stone-100 flex flex-col sm:flex-row gap-3">
                  <button
                    type="button"
                    onClick={handleCopyForTelegram}
                    className="flex-1 py-2.5 px-4 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
                  >
                    {copied ? (
                      <>
                        <Check className="w-4 h-4 text-emerald-400" />
                        متن گزارش و تحلیل کپی شد!
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        کپی کامل گزارش و تحلیل برای تلگرام / هرمس
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-stone-200 p-8 text-center text-stone-500 space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-stone-100 text-stone-400 flex items-center justify-center mx-auto">
                <Moon className="w-6 h-6" />
              </div>
              <h4 className="font-bold text-stone-700 text-sm">منتظر ثبت گزارش شبانه</h4>
              <p className="text-xs max-w-sm mx-auto text-stone-400 leading-relaxed">
                فرم سمت راست را پر کرده و دکمه «تحلیل موشکافانه امشب» را بزنید تا هوش مصنوعی با الگوریتم‌های مشاوره‌ای، نقاط افت و ۳ دستورکار فردایت را بازگو کند.
              </p>
            </div>
          )}

          {/* Past History Accordion */}
          {reports.length > 0 && (
            <div className="bg-white rounded-2xl border border-stone-200 p-5 space-y-3">
              <button
                type="button"
                onClick={() => setShowHistory(!showHistory)}
                className="w-full flex items-center justify-between text-xs font-bold text-stone-700"
              >
                <span className="flex items-center gap-1.5">
                  <History className="w-4 h-4 text-stone-500" />
                  تاریخچه گزارش‌های ثبت شده ({reports.length} مورد)
                </span>
                {showHistory ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>

              {showHistory && (
                <div className="space-y-3 pt-2">
                  {reports.map((r, i) => (
                    <div key={r.id || i} className="p-3 rounded-xl bg-stone-50 border border-stone-200/70 text-xs space-y-1.5">
                      <div className="flex justify-between items-center font-semibold text-stone-800">
                        <span>{r.date}</span>
                        <span className="text-emerald-700 font-bold">
                          {r.studiedHours} ساعت | {r.totalTests} تست
                        </span>
                      </div>
                      {r.aiAnalysis && (
                        <p className="text-stone-600 line-clamp-2 text-[11px] leading-relaxed">
                          {r.aiAnalysis.summary}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
