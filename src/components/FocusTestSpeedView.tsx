import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  Check, 
  X, 
  HelpCircle, 
  Minus, 
  Timer, 
  Zap, 
  Award, 
  Flame, 
  Clock, 
  CheckCircle, 
  ChevronRight,
  Sparkles,
  BarChart2
} from 'lucide-react';
import { FocusTestSession } from '../types';

interface FocusTestSpeedViewProps {
  sessions: FocusTestSession[];
  onSaveSession: (session: FocusTestSession) => void;
}

const STANDARD_PACING: Record<string, number> = {
  'حسابان و ریاضیات پایه': 85,
  'هندسه ۱، ۲ و ۳': 90,
  'گسسته و آمار و احتمال': 90,
  'فیزیک رشته ریاضی': 75,
  'شیمی کنکور': 60,
};

export function FocusTestSpeedView({
  sessions,
  onSaveSession,
}: FocusTestSpeedViewProps) {
  // Session Configuration
  const [subject, setSubject] = useState<string>('حسابان و ریاضیات پایه');
  const [topic, setTopic] = useState<string>('مشتق و کاربرد مشتق');
  const [targetCount, setTargetCount] = useState<number>(15);

  // Active Session Running State
  const [isActive, setIsActive] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [seconds, setSeconds] = useState<number>(0);

  // Counters for "ضربدر و منها"
  const [correctCount, setCorrectCount] = useState<number>(0);
  const [wrongCount, setWrongCount] = useState<number>(0);
  const [unansweredCount, setUnansweredCount] = useState<number>(0);
  const [markedForLaterCount, setMarkedForLaterCount] = useState<number>(0);

  const [sessionSavedSuccess, setSessionSavedSuccess] = useState<boolean>(false);

  const timerRef = useRef<any>(null);

  // Pacing standard for chosen subject
  const standardPacing = STANDARD_PACING[subject] || 85;

  useEffect(() => {
    if (isActive && !isPaused) {
      timerRef.current = setInterval(() => {
        setSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [isActive, isPaused]);

  const totalAnswered = correctCount + wrongCount + unansweredCount;
  const averageSeconds = totalAnswered > 0 ? Math.round(seconds / totalAnswered) : 0;

  // Konkur Percentage: ((3 * correct - wrong) / (3 * totalAnswered)) * 100
  const calculatedPercentage = totalAnswered > 0 
    ? Math.max(0, Math.round(((correctCount * 3 - wrongCount) / (Math.max(totalAnswered, targetCount) * 3)) * 100 * 10) / 10)
    : 0;

  let pacingRating: 'fast' | 'optimal' | 'slow' = 'optimal';
  if (averageSeconds > 0) {
    if (averageSeconds < standardPacing * 0.85) pacingRating = 'fast';
    else if (averageSeconds > standardPacing * 1.2) pacingRating = 'slow';
    else pacingRating = 'optimal';
  }

  const formatTime = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const remainingSecs = sec % 60;
    return `${mins.toString().padStart(2, '0')}:${remainingSecs.toString().padStart(2, '0')}`;
  };

  const handleStartSession = () => {
    setIsActive(true);
    setIsPaused(false);
    setSeconds(0);
    setCorrectCount(0);
    setWrongCount(0);
    setUnansweredCount(0);
    setMarkedForLaterCount(0);
    setSessionSavedSuccess(false);
  };

  const handlePauseResume = () => {
    setIsPaused(!isPaused);
  };

  const handleFinishAndSave = () => {
    if (totalAnswered === 0 && seconds < 10) {
      setIsActive(false);
      return;
    }

    const newSession: FocusTestSession = {
      id: `foc-${Date.now()}`,
      date: new Date().toLocaleDateString('fa-IR'),
      subject,
      topic: topic.trim() || subject,
      targetCount,
      completedCount: totalAnswered,
      correctCount,
      wrongCount,
      unansweredCount,
      markedForLaterCount,
      timeSpentSeconds: seconds,
      averageSecondsPerTest: averageSeconds,
      standardTargetSeconds: standardPacing,
      pacingRating,
      percentage: calculatedPercentage,
      notes: `سرعت میانگین: ${averageSeconds} ثانیه بر تست (استاندارد: ${standardPacing} ثانیه)`,
    };

    onSaveSession(newSession);
    setIsActive(false);
    setIsPaused(false);
    setSessionSavedSuccess(true);
    setTimeout(() => setSessionSavedSuccess(false), 4000);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white border border-stone-200 rounded-2xl p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold mb-2 border border-emerald-200">
              <Timer className="w-3.5 h-3.5" />
              <span>اتاق تمرکز و استاپ‌واچ تست‌زنی سرعتی (Focus Test Mode)</span>
            </div>
            <h2 className="text-xl font-bold text-stone-900">
              تمرین ضرب‌آهنگ تست‌زنی و تکنیک «ضربدر-منها»
            </h2>
            <p className="text-xs text-stone-500 mt-1">
              زمان کنکور برای هر درس محدود است؛ سرعت پردازش هر تست را ثانیه‌ای اندازه بگیر تا زیر فشار آزمون زمان کم نیاوری.
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs bg-stone-50 p-2.5 rounded-xl border border-stone-200">
            <Clock className="w-4 h-4 text-emerald-600" />
            <span>زمان استاندارد کنکور برای {subject}: <strong className="font-bold text-emerald-800">{standardPacing} ثانیه</strong></span>
          </div>
        </div>
      </div>

      {/* Main Focus Arena */}
      {!isActive ? (
        /* Configuration State */
        <div className="bg-white border border-stone-200 rounded-2xl p-6 shadow-xs space-y-6">
          <h3 className="text-sm font-bold text-stone-900 flex items-center gap-2">
            <Zap className="w-4 h-4 text-emerald-600" />
            <span>تنظیم باکس تست‌زنی امروز</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="block text-stone-700 font-semibold mb-1">درس هدف</label>
              <select
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-stone-200 bg-stone-50 font-medium"
              >
                <option value="حسابان و ریاضیات پایه">حسابان و ریاضیات پایه (۸۵ ثانیه)</option>
                <option value="هندسه ۱، ۲ و ۳">هندسه ۱، ۲ و ۳ (۹۰ ثانیه)</option>
                <option value="گسسته و آمار و احتمال">گسسته و آمار و احتمال (۹۰ ثانیه)</option>
                <option value="فیزیک رشته ریاضی">فیزیک رشته ریاضی (۷۵ ثانیه)</option>
                <option value="شیمی کنکور">شیمی کنکور (۶۰ ثانیه)</option>
              </select>
            </div>

            <div>
              <label className="block text-stone-700 font-semibold mb-1">مبحث یا منبع</label>
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="مثال: مشتق توابع کسری / نشر الگو تست‌های فرد"
                className="w-full p-2.5 rounded-xl border border-stone-200 bg-stone-50"
              />
            </div>

            <div>
              <label className="block text-stone-700 font-semibold mb-1">تعداد تست هدف</label>
              <div className="flex items-center gap-2">
                {[10, 15, 20, 30].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => setTargetCount(num)}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                      targetCount === num
                        ? 'bg-stone-900 text-white'
                        : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                    }`}
                  >
                    {num} تست
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-xl text-xs text-emerald-950 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div>
              <strong className="block font-bold mb-0.5">آماده شروع تست‌زنی هستی؟</strong>
              <span className="text-emerald-800 text-[11px]">
                کتاب و چک‌نویس را آماده کن، گوشی را روی حالت پرواز بگذار و دکمه شروع را بزن.
              </span>
            </div>
            <button
              onClick={handleStartSession}
              className="px-6 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs flex items-center gap-2 shadow-xs transition cursor-pointer shrink-0"
            >
              <Play className="w-4 h-4 fill-white" />
              <span>شروع تست‌زنی سرعتی ({targetCount} تست)</span>
            </button>
          </div>
        </div>
      ) : (
        /* Live Timer & Interactive Counters Arena */
        <div className="bg-stone-900 text-white rounded-2xl p-6 sm:p-8 shadow-md space-y-6">
          {/* Top Bar inside active session */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-stone-800">
            <div>
              <span className="text-xs text-stone-400 block">{subject}</span>
              <h3 className="text-base font-bold text-white">{topic}</h3>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-xs text-stone-400">
                پوشش: <strong className="text-emerald-400">{totalAnswered}</strong> از {targetCount} تست
              </span>
              <button
                onClick={handlePauseResume}
                className="px-3 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-semibold flex items-center gap-1.5 border border-stone-700 cursor-pointer"
              >
                {isPaused ? <Play className="w-3.5 h-3.5 fill-white" /> : <Pause className="w-3.5 h-3.5" />}
                <span>{isPaused ? 'ادامه' : 'مکث کوتاه'}</span>
              </button>
            </div>
          </div>

          {/* Huge Timer Display */}
          <div className="flex flex-col items-center justify-center py-4">
            <div className="text-5xl sm:text-7xl font-mono font-bold tracking-tight text-white mb-2">
              {formatTime(seconds)}
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="text-stone-400">میانگین زمان هر تست:</span>
              <span className={`font-mono font-bold px-2 py-0.5 rounded ${
                pacingRating === 'fast' 
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : pacingRating === 'slow'
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                  : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
              }`}>
                {averageSeconds} ثانیه (استاندارد: {standardPacing} ثانیه)
              </span>
            </div>
          </div>

          {/* Quick Cross & Minus Buttons */}
          <div className="space-y-2">
            <span className="text-xs text-stone-400 block text-center">
              هم‌زمان با حل هر تست، نتیجه را بلافاصله ثبت کن (تکنیک ضربدر و منها):
            </span>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {/* Correct */}
              <button
                onClick={() => setCorrectCount((c) => c + 1)}
                className="p-4 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 text-center transition cursor-pointer"
              >
                <div className="flex items-center justify-center mb-1">
                  <Check className="w-6 h-6 text-emerald-400" />
                </div>
                <strong className="block text-sm font-bold">تست درست (+۱)</strong>
                <span className="text-xs opacity-75">{correctCount} تست</span>
              </button>

              {/* Wrong */}
              <button
                onClick={() => setWrongCount((w) => w + 1)}
                className="p-4 rounded-xl bg-rose-600/20 hover:bg-rose-600/30 border border-rose-500/40 text-rose-300 text-center transition cursor-pointer"
              >
                <div className="flex items-center justify-center mb-1">
                  <X className="w-6 h-6 text-rose-400" />
                </div>
                <strong className="block text-sm font-bold">تست اشتباه (+۱)</strong>
                <span className="text-xs opacity-75">{wrongCount} تست</span>
              </button>

              {/* Marked for later (ضربدر) */}
              <button
                onClick={() => setMarkedForLaterCount((m) => m + 1)}
                className="p-4 rounded-xl bg-amber-600/20 hover:bg-amber-600/30 border border-amber-500/40 text-amber-300 text-center transition cursor-pointer"
              >
                <div className="flex items-center justify-center mb-1">
                  <HelpCircle className="w-6 h-6 text-amber-400" />
                </div>
                <strong className="block text-sm font-bold">شک‌دار یا زمان‌بر (×)</strong>
                <span className="text-xs opacity-75">{markedForLaterCount} تست دور دوم</span>
              </button>

              {/* Skipped (منها) */}
              <button
                onClick={() => setUnansweredCount((u) => u + 1)}
                className="p-4 rounded-xl bg-stone-700/40 hover:bg-stone-700/60 border border-stone-600 text-stone-300 text-center transition cursor-pointer"
              >
                <div className="flex items-center justify-center mb-1">
                  <Minus className="w-6 h-6 text-stone-400" />
                </div>
                <strong className="block text-sm font-bold">بلد نبودم / رد شدم (-)</strong>
                <span className="text-xs opacity-75">{unansweredCount} تست نزده</span>
              </button>
            </div>
          </div>

          {/* Finish & Exit Controls */}
          <div className="pt-4 border-t border-stone-800 flex items-center justify-between">
            <div className="text-xs text-stone-400">
              درصد تخمینی این باکس: <strong className="text-emerald-400 font-bold">{calculatedPercentage}٪</strong>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsActive(false)}
                className="px-4 py-2 rounded-xl text-xs text-stone-400 hover:text-white transition cursor-pointer"
              >
                انصراف بدون ذخیره
              </button>
              <button
                onClick={handleFinishAndSave}
                className="px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-stone-950 font-bold text-xs flex items-center gap-1.5 shadow-sm transition cursor-pointer"
              >
                <CheckCircle className="w-4 h-4" />
                <span>پایان باکس و ذخیره نتایج</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {sessionSavedSuccess && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-medium flex items-center gap-2 animate-fadeIn">
          <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>جلسه تست‌زنی با موفقیت ثبت و به سوابق اضافه گردید!</span>
        </div>
      )}

      {/* History of Focus Sessions */}
      <div className="bg-white border border-stone-200 rounded-2xl p-6 shadow-xs space-y-4">
        <h3 className="text-sm font-bold text-stone-900 flex items-center justify-between">
          <span className="flex items-center gap-2">
            <BarChart2 className="w-4 h-4 text-emerald-700" />
            <span>سوابق تست‌زنی سرعتی اخیر ({sessions.length} جلسه)</span>
          </span>
          <span className="text-xs text-stone-400 font-normal">
            میانگین سرعت ایده‌آل رشته ریاضی: زیر ۸۵ ثانیه در هر تست
          </span>
        </h3>

        {sessions.length === 0 ? (
          <p className="text-xs text-stone-500 text-center py-6">
            هنوز جلسه‌ای ثبت نشده است. با کلیک بر روی دکمه شروع، اولین باکس تست خود را زمان‌گیری کنید.
          </p>
        ) : (
          <div className="divide-y divide-stone-100">
            {sessions.map((sess) => (
              <div key={sess.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-bold text-stone-900">{sess.subject}</span>
                    <span className="text-stone-500">({sess.topic})</span>
                    <span className="text-[10px] text-stone-400">{sess.date}</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-[11px] text-stone-600">
                    <span>تست‌ها: {sess.completedCount} از {sess.targetCount}</span>
                    <span className="text-emerald-700 font-bold">✓ {sess.correctCount} درست</span>
                    <span className="text-rose-600 font-bold">✗ {sess.wrongCount} غلط</span>
                    <span className="text-amber-700">× {sess.markedForLaterCount || 0} شک‌دار</span>
                    <span>- {sess.unansweredCount} نزده</span>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-left">
                    <span className="text-xs font-black text-stone-900 block">{sess.percentage}٪</span>
                    <span className="text-[10px] text-stone-500">
                      میانگین: <strong>{sess.averageSecondsPerTest}s</strong> بر تست
                    </span>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                    sess.pacingRating === 'fast'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : sess.pacingRating === 'slow'
                      ? 'bg-rose-50 text-rose-700 border-rose-200'
                      : 'bg-amber-50 text-amber-800 border-amber-200'
                  }`}>
                    {sess.pacingRating === 'fast' ? 'عالی و سریع' : sess.pacingRating === 'slow' ? 'کندتر از کنکور' : 'استاندارد'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
