import React, { useState } from 'react';
import { 
  AlertTriangle, 
  Plus, 
  Sparkles, 
  Trash2, 
  CheckCircle2, 
  Clock, 
  Target, 
  BookOpen, 
  TrendingUp, 
  Layers,
  ArrowRight,
  Calculator,
  Eye,
  Check,
  Calendar,
  Zap
} from 'lucide-react';
import { ExamErrorLog, ExamErrorCategory, StudentProfile, WeeklySchedule } from '../types';

interface ExamPostMortemViewProps {
  profile: StudentProfile;
  errors: ExamErrorLog[];
  onUpdateErrors: (errors: ExamErrorLog[]) => void;
  onApplyRemedialBlocks?: (remedialBlocks: any[]) => void;
}

const CATEGORY_MAP: Record<ExamErrorCategory, { label: string; color: string; desc: string }> = {
  calculation: {
    label: 'بی‌دقتی محاسباتی',
    color: 'bg-rose-50 text-rose-700 border-rose-200',
    desc: 'اشتباه در جمع، ضرب، تفریق یا علامت‌های مثبت و منفی',
  },
  trap: {
    label: 'دام تستی طراح',
    color: 'bg-amber-50 text-amber-800 border-amber-200',
    desc: 'فریب خوردن با گزینه‌های اغواکننده یا ندیدن قیدهای خاص',
  },
  time: {
    label: 'کمبود زمان',
    color: 'bg-orange-50 text-orange-700 border-orange-200',
    desc: 'گیر کردن روی سوالات طولانی و عدم اجرای تکنیک ضربدر-منها',
  },
  concept_gap: {
    label: 'نقص علمی و مفهومی',
    color: 'bg-purple-50 text-purple-700 border-purple-200',
    desc: 'عدم درک عمیق مفهوم، لم یا رابطه ریاضی',
  },
  misread: {
    label: 'بد خواندن صورت سؤال',
    color: 'bg-blue-50 text-blue-700 border-blue-200',
    desc: 'ندیدن کلمات کلیدی (کدام نادرست است، تندی به جای سرعت و ...)',
  },
  formula_forgotten: {
    label: 'فراموشی فرمول',
    color: 'bg-stone-100 text-stone-700 border-stone-300',
    desc: 'عدم بازیابی دقیق فرمول در حافظه فعال حین آزمون',
  },
};

export function ExamPostMortemView({
  profile,
  errors,
  onUpdateErrors,
  onApplyRemedialBlocks,
}: ExamPostMortemViewProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<any>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [remedialApplied, setRemedialApplied] = useState(false);

  // Form states
  const [examName, setExamName] = useState('قلم‌چی');
  const [subject, setSubject] = useState('حسابان ۲');
  const [topic, setTopic] = useState('');
  const [questionNumber, setQuestionNumber] = useState('');
  const [errorCategory, setErrorCategory] = useState<ExamErrorCategory>('calculation');
  const [description, setDescription] = useState('');
  const [learnedLesson, setLearnedLesson] = useState('');
  const [actionPlan, setActionPlan] = useState('');

  // Stats calculation
  const totalErrors = errors.length;
  const categoryCounts = errors.reduce((acc, curr) => {
    acc[curr.errorCategory] = (acc[curr.errorCategory] || 0) + 1;
    return acc;
  }, {} as Record<ExamErrorCategory, number>);

  const handleAddError = (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim() || !learnedLesson.trim()) return;

    const newError: ExamErrorLog = {
      id: `err-${Date.now()}`,
      examName: examName.trim() || 'آزمون آزمایشی',
      date: new Date().toLocaleDateString('fa-IR'),
      subject: subject.trim(),
      topic: topic.trim() || subject,
      questionNumber: questionNumber.trim() || undefined,
      errorCategory,
      description: description.trim(),
      learnedLesson: learnedLesson.trim(),
      actionPlan: actionPlan.trim() || 'حل ۱۰ تست مشابه برای تثبیت الگو',
      isResolved: false,
    };

    onUpdateErrors([newError, ...errors]);
    setDescription('');
    setLearnedLesson('');
    setActionPlan('');
    setQuestionNumber('');
    setShowAddForm(false);
  };

  const handleToggleResolved = (id: string) => {
    const updated = errors.map((err) =>
      err.id === id ? { ...err, isResolved: !err.isResolved } : err
    );
    onUpdateErrors(updated);
  };

  const handleDeleteError = (id: string) => {
    onUpdateErrors(errors.filter((err) => err.id !== id));
  };

  const handleAnalyzeWithAI = async () => {
    if (errors.length === 0) return;
    setIsAnalyzing(true);
    setAnalysisError(null);
    setRemedialApplied(false);

    try {
      const res = await fetch('/api/advisor/analyze-error-bank', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ errors, profile }),
      });

      if (!res.ok) throw new Error('خطا در تحلیل');
      const data = await res.json();
      setAiAnalysis(data.analysis);
    } catch (err) {
      setAnalysisError('مشکلی در برقراری ارتباط با هوش مصنوعی رخ داد؛ لطفاً مجدداً امتحان کنید.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white border border-stone-200 rounded-2xl p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-stone-100">
          <div>
            <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 text-xs font-semibold mb-2 border border-rose-200">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>دفترچه تحلیل آزمون و بانک اشتباهات (Post-Mortem)</span>
            </div>
            <h2 className="text-xl font-bold text-stone-900">
              کالبدشکافی تست‌های غلط و نزده آزمون
            </h2>
            <p className="text-xs text-stone-500 mt-1">
              رتبه‌های برتر آزمون را برای غلط‌هایشان تحلیل می‌کنند. ریشه هر خطا را ثبت کن تا سیستم باکسی جبرانی برای هفته آینده طراحی کند.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="px-4 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>ثبت تست غلط یا نزده جدید</span>
            </button>

            <button
              onClick={handleAnalyzeWithAI}
              disabled={isAnalyzing || errors.length === 0}
              className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs transition disabled:opacity-50 cursor-pointer"
            >
              {isAnalyzing ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>در حال تحلیل ریشه‌ای...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>تحلیل هوشمند ریشه خطاها</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Maze Exam Integration Callout */}
        <div className="mt-4 p-3 bg-emerald-50/80 border border-emerald-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-emerald-950">
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-emerald-600 text-white rounded-lg shrink-0">
              <Zap className="w-3.5 h-3.5" />
            </span>
            <div>
              <span className="font-bold">اتصال به پنل آزمون‌های ماز (Biomaze):</span>
              <span className="text-emerald-800 mr-1">می‌توانید سوالات اشتباه آزمون ماز را به صورت خودکار استخراج کرده و تست‌های مشابه و دوقلوی آن‌ها را حل کنید.</span>
            </div>
          </div>
          <span className="text-[11px] font-semibold text-emerald-700 bg-white px-2.5 py-1 rounded-lg border border-emerald-200 shrink-0 text-center">
            در دسترس از تب «اتصال به آزمون‌های ماز و تست مشابه»
          </span>
        </div>

        {/* Error Breakdown Badges */}
        <div className="mt-5 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 text-center text-xs">
          {(Object.keys(CATEGORY_MAP) as ExamErrorCategory[]).map((catKey) => {
            const count = categoryCounts[catKey] || 0;
            const pct = totalErrors > 0 ? Math.round((count / totalErrors) * 100) : 0;
            const meta = CATEGORY_MAP[catKey];
            return (
              <div key={catKey} className={`p-3 rounded-xl border ${meta.color} bg-opacity-40 flex flex-col justify-between`}>
                <span className="text-[11px] font-bold block mb-1">{meta.label}</span>
                <div className="flex items-baseline justify-center gap-1">
                  <span className="text-lg font-black">{count}</span>
                  <span className="text-[10px] opacity-75">({pct}٪)</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Add Form */}
      {showAddForm && (
        <form onSubmit={handleAddError} className="bg-stone-50 border border-stone-200 rounded-2xl p-5 shadow-xs animate-fadeIn space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-stone-900 flex items-center gap-1.5">
              <Plus className="w-4 h-4 text-emerald-600" />
              <span>ثبت مورد جدید برای کالبدشکافی</span>
            </h3>
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="text-xs text-stone-400 hover:text-stone-600 cursor-pointer"
            >
              بستن
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
            <div>
              <label className="block text-stone-700 font-semibold mb-1">نام آزمون</label>
              <input
                type="text"
                value={examName}
                onChange={(e) => setExamName(e.target.value)}
                placeholder="قلم‌چی / ماز / سنجش"
                className="w-full p-2.5 rounded-xl border border-stone-200 bg-white"
              />
            </div>
            <div>
              <label className="block text-stone-700 font-semibold mb-1">درس</label>
              <select
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-stone-200 bg-white font-medium"
              >
                <option value="حسابان ۲">حسابان ۲</option>
                <option value="حسابان ۱ و پایه">حسابان ۱ و ریاضی پایه</option>
                <option value="هندسه ۳">هندسه ۳</option>
                <option value="هندسه ۱ و ۲">هندسه پایه (۱ و ۲)</option>
                <option value="گسسته">ریاضی گسسته</option>
                <option value="آمار و احتمال">آمار و احتمال یازدهم</option>
                <option value="فیزیک ۳">فیزیک ۳ دوازدهم</option>
                <option value="فیزیک ۱ و ۲">فیزیک پایه</option>
                <option value="شیمی ۳">شیمی ۳ دوازدهم</option>
                <option value="شیمی ۱ و ۲">شیمی پایه</option>
              </select>
            </div>
            <div>
              <label className="block text-stone-700 font-semibold mb-1">فصل یا مبحث دقیق</label>
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="مثال: نقاط بحرانی مشتق / سقوط آزاد"
                className="w-full p-2.5 rounded-xl border border-stone-200 bg-white"
              />
            </div>
            <div>
              <label className="block text-stone-700 font-semibold mb-1">شماره یا آدرس تست</label>
              <input
                type="text"
                value={questionNumber}
                onChange={(e) => setQuestionNumber(e.target.value)}
                placeholder="تست ۱۰۵ دفترچه اختصاصی"
                className="w-full p-2.5 rounded-xl border border-stone-200 bg-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1.5">
              علت و ریشه اصلی اشتباه (دسته‌بندی خطا):
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {(Object.keys(CATEGORY_MAP) as ExamErrorCategory[]).map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setErrorCategory(cat)}
                  className={`p-2 rounded-xl text-xs text-right border transition cursor-pointer ${
                    errorCategory === cat
                      ? 'border-stone-900 bg-stone-900 text-white shadow-xs'
                      : 'border-stone-200 bg-white text-stone-700 hover:bg-stone-100'
                  }`}
                >
                  <strong className="block text-[11px]">{CATEGORY_MAP[cat].label}</strong>
                  <span className={`text-[10px] ${errorCategory === cat ? 'text-stone-300' : 'text-stone-400'}`}>
                    {CATEGORY_MAP[cat].desc}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
            <div>
              <label className="block text-stone-700 font-semibold mb-1">چه اتفاقی در تست افتاد؟ (شرح اشتباه)</label>
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="در محاسبه ریشه‌ها منفی را ضرب نکردم..."
                className="w-full p-2.5 rounded-xl border border-stone-200 bg-white"
                required
              />
            </div>
            <div>
              <label className="block text-stone-700 font-semibold mb-1">درس عبرت و نکته طلایی برای آزمون بعد</label>
              <textarea
                rows={2}
                value={learnedLesson}
                onChange={(e) => setLearnedLesson(e.target.value)}
                placeholder="دور علامت منفی خط قرمز بکشم..."
                className="w-full p-2.5 rounded-xl border border-stone-200 bg-white"
                required
              />
            </div>
            <div>
              <label className="block text-stone-700 font-semibold mb-1">اقدام عملی جبرانی در طول هفته</label>
              <textarea
                rows={2}
                value={actionPlan}
                onChange={(e) => setActionPlan(e.target.value)}
                placeholder="حل ۱۰ تست از کتاب نشر الگو در روز یکشنبه..."
                className="w-full p-2.5 rounded-xl border border-stone-200 bg-white"
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs transition cursor-pointer"
            >
              افزودن تست به دفترچه تحلیل
            </button>
          </div>
        </form>
      )}

      {/* AI Analysis Result */}
      {aiAnalysis && (
        <div className="bg-gradient-to-l from-emerald-50 to-stone-50 border border-emerald-200 rounded-2xl p-5 sm:p-6 shadow-xs animate-fadeIn space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-emerald-700" />
              <h3 className="font-bold text-stone-900 text-sm sm:text-base">
                تحلیل ریشه‌ای مشاور هوشمند بر مبنای دفترچه آزمون
              </h3>
            </div>
            <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 font-bold border border-emerald-200">
              الگوی غالب: {aiAnalysis.dominantWeakness}
            </span>
          </div>

          <p className="text-xs text-stone-700 leading-relaxed bg-white/70 p-3.5 rounded-xl border border-emerald-100">
            {aiAnalysis.rootCauseSummary}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white p-3.5 rounded-xl border border-stone-200/80">
              <span className="text-xs font-bold text-stone-800 block mb-2">
                اقدامات تکنیکی ملموس برای رفع خطاها:
              </span>
              <ul className="space-y-1.5 text-xs text-stone-600">
                {aiAnalysis.recommendedRemedialActions?.map((act: string, i: number) => (
                  <li key={i} className="flex items-start gap-1.5">
                    <span className="text-emerald-600 font-bold">•</span>
                    <span>{act}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-stone-200/80">
              <span className="text-xs font-bold text-emerald-900 block mb-2">
                باکس‌های مطالعاتی جبرانی پیشنهادی برای شنبه و یکشنبه:
              </span>
              <div className="space-y-2">
                {aiAnalysis.remedialScheduleSuggestion?.map((box: any, i: number) => (
                  <div key={i} className="p-2.5 rounded-lg bg-emerald-50/70 border border-emerald-100 text-xs flex items-center justify-between">
                    <div>
                      <span className="font-bold text-emerald-950 block">{box.day}: {box.subject}</span>
                      <span className="text-[11px] text-stone-600">{box.topic}</span>
                    </div>
                    <span className="text-[11px] font-semibold text-emerald-800 bg-white px-2 py-0.5 rounded shadow-2xs">
                      {box.durationMinutes} دقیقه
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="pt-2 flex items-center justify-between text-xs">
            <div className="text-emerald-800 font-medium italic">
              «{aiAnalysis.coachVerdict}»
            </div>
            {onApplyRemedialBlocks && aiAnalysis.remedialScheduleSuggestion && (
              <button
                onClick={() => {
                  onApplyRemedialBlocks(aiAnalysis.remedialScheduleSuggestion);
                  setRemedialApplied(true);
                }}
                disabled={remedialApplied}
                className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-semibold flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50"
              >
                {remedialApplied ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>به برنامه هفتگی اضافه شد</span>
                  </>
                ) : (
                  <>
                    <Calendar className="w-3.5 h-3.5" />
                    <span>افزودن خودکار به برنامه هفته بعد</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Error Logs List */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-stone-900 flex items-center justify-between">
          <span>لیست اشتباهات و تحلیل‌های ثبت‌شده ({errors.length} مورد)</span>
          <span className="text-xs text-stone-400 font-normal">
            تیک سبز = نکته را یاد گرفتم و در تست‌های بعدی دیگر تکرار نشد
          </span>
        </h3>

        {errors.length === 0 ? (
          <div className="p-8 text-center bg-stone-50 rounded-2xl border border-stone-200">
            <p className="text-xs text-stone-500">
              هنوز هیچ اشتباهی ثبت نکرده‌ای. بعد از هر آزمون یا حل یک باکس تست، تست‌های غلطت را ثبت کن تا تحلیل شوند.
            </p>
          </div>
        ) : (
          errors.map((err) => {
            const catMeta = CATEGORY_MAP[err.errorCategory] || CATEGORY_MAP.calculation;
            return (
              <div
                key={err.id}
                className={`bg-white border rounded-2xl p-4 sm:p-5 transition-all shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                  err.isResolved ? 'border-emerald-200 bg-emerald-50/10' : 'border-stone-200'
                }`}
              >
                <div className="space-y-2 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${catMeta.color}`}>
                      {catMeta.label}
                    </span>
                    <span className="text-xs font-bold text-stone-900">
                      {err.subject} - {err.topic}
                    </span>
                    {err.questionNumber && (
                      <span className="text-[11px] text-stone-500 bg-stone-100 px-2 py-0.5 rounded">
                        {err.questionNumber}
                      </span>
                    )}
                    <span className="text-[10px] text-stone-400 mr-auto">
                      {err.examName} ({err.date})
                    </span>
                  </div>

                  <div className="text-xs text-stone-700 leading-relaxed">
                    <span className="font-semibold text-stone-800">شرح اشتباه: </span>
                    {err.description}
                  </div>

                  <div className="text-xs text-amber-900 bg-amber-50/80 p-2 rounded-lg border border-amber-200/60 leading-relaxed">
                    <span className="font-bold">درس عبرت: </span>
                    {err.learnedLesson}
                  </div>

                  {err.actionPlan && (
                    <div className="text-[11px] text-stone-500 flex items-center gap-1.5">
                      <Target className="w-3 h-3 text-emerald-600 shrink-0" />
                      <span>اقدام جبرانی: {err.actionPlan}</span>
                    </div>
                  )}
                </div>

                <div className="flex md:flex-col items-center gap-2 justify-end pt-2 md:pt-0 border-t md:border-t-0 md:border-r border-stone-100 md:pr-4">
                  <button
                    onClick={() => handleToggleResolved(err.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1 transition cursor-pointer ${
                      err.isResolved
                        ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                        : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                    }`}
                  >
                    <CheckCircle2 className={`w-3.5 h-3.5 ${err.isResolved ? 'text-emerald-700' : 'text-stone-400'}`} />
                    <span>{err.isResolved ? 'رفع شده' : 'نیاز به تمرین'}</span>
                  </button>

                  <button
                    onClick={() => handleDeleteError(err.id)}
                    className="p-1.5 rounded-lg text-stone-400 hover:text-rose-600 transition cursor-pointer"
                    title="حذف"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
