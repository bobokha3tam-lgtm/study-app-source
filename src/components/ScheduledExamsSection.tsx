import React, { useState } from 'react';
import { 
  Calendar, 
  Clock, 
  Target, 
  CheckCircle2, 
  Sparkles, 
  Plus, 
  Trash2, 
  Layers, 
  Flame, 
  Award, 
  BookOpen, 
  ChevronDown, 
  ChevronUp, 
  Check, 
  Tag, 
  ArrowRight,
  Filter,
  AlertCircle
} from 'lucide-react';
import { ScheduledExam, ExamBudget, StudentProfile, TopicExamDetail } from '../types';
import { StreamType } from '../data/curriculumData';
import { 
  getPersianTodayInfo, 
  calculateExamCountdown, 
  toPersianDigits 
} from '../utils/examCountdown';
import { 
  MAZE_TARAZ_BENCHMARKS, 
  MazeTarazBenchmark 
} from '../data/scheduledExamsData';

interface ScheduledExamsSectionProps {
  exams: ScheduledExam[];
  activeExamBudget: ExamBudget;
  profile: StudentProfile;
  currentStream: StreamType;
  onSelectActiveExam: (exam: ScheduledExam) => void;
  onAddCustomExam: (newExam: ScheduledExam) => void;
  onDeleteCustomExam?: (examId: string) => void;
  onGenerateScheduleForExam: () => void;
  onUpdateExamBudget?: (updated: ExamBudget) => void;
  isGeneratingSchedule?: boolean;
}

export function ScheduledExamsSection({
  exams,
  activeExamBudget,
  profile,
  currentStream,
  onSelectActiveExam,
  onAddCustomExam,
  onDeleteCustomExam,
  onGenerateScheduleForExam,
  onUpdateExamBudget,
  isGeneratingSchedule = false,
}: ScheduledExamsSectionProps) {
  const todayInfo = getPersianTodayInfo();
  // Default filter to Maze
  const [selectedOrgFilter, setSelectedOrgFilter] = useState<string>('ماز');
  const [expandedExamId, setExpandedExamId] = useState<string | null>(exams[0]?.id || null);
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [showTarazGuide, setShowTarazGuide] = useState<boolean>(true);
  const [customMazeTaraz, setCustomMazeTaraz] = useState<number>(11000);
  const [tarazAppliedMsg, setTarazAppliedMsg] = useState<string | null>(null);

  // New custom exam form state - Defaults to Maze!
  const [newExamName, setNewExamName] = useState<string>('آزمون آنلاین کشوری ماز - مرحله جدید');
  const [newOrg, setNewOrg] = useState<'قلم‌چی' | 'ماز' | 'سنجش' | 'گزینه دو' | 'مدرسه' | 'سایر'>('ماز');
  const [newStage, setNewStage] = useState<string>('مرحله کشوری ماز');
  const [newDate, setNewDate] = useState<string>('جمعه ۱۸ مهر ۱۴۰۵');
  const [newTargetGoal, setNewTargetGoal] = useState<string>('تراز ماز بالای ۱۱,۰۰۰ (مقیاس ۱۲,۰۰۰ کشوری)');
  const [newSyllabus, setNewSyllabus] = useState<string>('');
  const [newSelectedTopicsStr, setNewSelectedTopicsStr] = useState<string>('');
  const [newTargetTests, setNewTargetTests] = useState<number>(480);

  // Live countdown for the currently active exam in budget
  const activeCountdown = calculateExamCountdown(activeExamBudget);

  // Handle instant applying of Maze Taraz goal into activeExamBudget
  const handleApplyMazeTaraz = (tarazNum: number, tierTitle?: string) => {
    if (!onUpdateExamBudget) return;
    const goalStr = `تراز ماز بالای ${toPersianDigits(tarazNum)} (مقیاس ۱۲,۰۰۰ کشوری)${tierTitle ? ` - ${tierTitle}` : ''}`;
    onUpdateExamBudget({
      ...activeExamBudget,
      targetGoalText: goalStr,
      examName: activeExamBudget.examName.includes('ماز') ? activeExamBudget.examName : 'آزمون آنلاین کشوری ماز'
    });
    setTarazAppliedMsg(`هدف تراز با موفقیت روی ${toPersianDigits(tarazNum)} ماز تنظیم شد.`);
    setTimeout(() => setTarazAppliedMsg(null), 3500);
  };

  // Find corresponding benchmark for customMazeTaraz
  const currentTarazBenchmark = MAZE_TARAZ_BENCHMARKS.find(
    b => customMazeTaraz >= b.minTaraz && customMazeTaraz <= b.maxTaraz
  ) || MAZE_TARAZ_BENCHMARKS[MAZE_TARAZ_BENCHMARKS.length - 1];

  // Filter exams by organization
  const filteredExams = exams.filter(exam => {
    if (selectedOrgFilter === 'all') return true;
    return exam.organization === selectedOrgFilter;
  });

  const handleCreateExam = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newExamName.trim()) return;

    const topics = newSelectedTopicsStr
      .split(/[\n،,]+/)
      .map(t => t.trim())
      .filter(Boolean);

    const customExam: ScheduledExam = {
      id: 'custom-exam-' + Date.now(),
      examName: newExamName.trim(),
      organization: newOrg,
      stageTitle: newStage.trim(),
      examDate: newDate.trim(),
      syllabusSummary: newSyllabus.trim() || 'سرفصل‌های اختصاصی آزمون ماز',
      targetGoalText: newTargetGoal.trim(),
      selectedTopics: topics.length > 0 ? topics : ['مباحث آزمون'],
      totalTargetTests: newTargetTests || 450,
    };

    onAddCustomExam(customExam);
    setShowAddModal(false);
  };

  const getOrgColor = (org: string) => {
    switch (org) {
      case 'قلم‌چی':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'ماز':
        return 'bg-emerald-50 text-emerald-800 border-emerald-300 font-bold';
      case 'سنجش':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'گزینه دو':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'مدرسه':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      default:
        return 'bg-stone-100 text-stone-700 border-stone-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Master Time & Next Exam Live Bar */}
      <div className="bg-gradient-to-r from-stone-900 via-stone-800 to-emerald-950 text-white rounded-2xl p-5 sm:p-6 shadow-md border border-stone-700/60">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          {/* Today info */}
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-semibold border border-emerald-500/30">
              <Calendar className="w-3.5 h-3.5 text-emerald-400" />
              <span>تقویم و زمان زنده</span>
            </div>
            <div>
              <div className="text-xs text-stone-400 font-medium">امروز چه روزی هستیم؟</div>
              <div className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                <span>{todayInfo.formattedFullDate}</span>
                <span className="text-xs font-normal px-2 py-0.5 rounded-md bg-stone-800 text-stone-300 border border-stone-700">
                  (روز {todayInfo.day} از {todayInfo.monthName})
                </span>
              </div>
            </div>
          </div>

          {/* Active Next Exam & Countdown */}
          <div className="bg-stone-900/80 border border-emerald-500/40 rounded-xl p-4 sm:p-5 flex-1 max-w-xl">
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                <Target className="w-4 h-4" />
                آزمون بعدی هدف (مبنای چیدن برنامه):
              </span>
              <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold border ${
                activeCountdown.isToday 
                  ? 'bg-emerald-500 text-stone-950 border-emerald-400 animate-pulse'
                  : activeCountdown.daysLeft !== null && activeCountdown.daysLeft <= 2
                  ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                  : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
              }`}>
                {activeCountdown.isToday ? 'امروز روز آزمون است!' : `⏳ ${toPersianDigits(activeCountdown.daysLeft ?? todayInfo.daysUntilThisFriday)} روز مانده`}
              </span>
            </div>

            <div className="text-base sm:text-lg font-bold text-white mb-1">
              {activeExamBudget.examName || 'آزمون آزمایشی پیش‌رو'}
            </div>
            
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-stone-300 mb-3">
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-stone-400" />
                تاریخ: <strong className="text-emerald-300">{activeExamBudget.examDate || 'جمعه پیش‌رو'}</strong>
              </span>
              <span>
                هدف: <span className="text-stone-300">{activeExamBudget.targetGoalText || 'تراز برتر'}</span>
              </span>
              <span>
                تارگت تست: <strong className="text-white">{toPersianDigits(activeExamBudget.totalTargetTests || 450)} تست</strong>
              </span>
            </div>

            {/* Direct Action: Generate Schedule for this next exam */}
            <div className="pt-3 border-t border-stone-800 flex flex-wrap items-center justify-between gap-3">
              <p className="text-[11px] text-stone-400 leading-snug">
                سرفصل‌های این آزمون مستقیماً در تولید برنامه هفتگی دانش‌آموز اعمال می‌شوند.
              </p>
              <button
                type="button"
                onClick={onGenerateScheduleForExam}
                disabled={isGeneratingSchedule}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-stone-950 font-bold text-xs shadow transition-all cursor-pointer disabled:opacity-50"
              >
                <Sparkles className="w-4 h-4" />
                <span>{isGeneratingSchedule ? 'در حال تولید برنامه...' : 'چیدن برنامه با مباحث این آزمون'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Section Header & Organization Filters */}
      <div className="bg-white rounded-2xl p-5 border border-stone-200 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-stone-100">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-stone-900 flex items-center gap-2">
              <Layers className="w-5 h-5 text-emerald-600" />
              <span>لیست آزمون‌ها و بودجه‌بندی مباحث</span>
              <span className="text-xs font-normal text-stone-500 px-2 py-0.5 rounded-full bg-stone-100">
                {toPersianDigits(filteredExams.length)} آزمون
              </span>
            </h2>
            <p className="text-xs text-stone-500 mt-1">
              آزمون مورد نظرتان را انتخاب کنید تا مباحث و تاریخ آن به عنوان آزمون بعدی قرار گرفته و برنامه هفتگی بر مبنای آن چیده شود.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-stone-900 text-white hover:bg-stone-800 text-xs font-bold transition-colors cursor-pointer shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>افزودن آزمون جدید</span>
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2 mt-4">
          <span className="text-xs text-stone-500 font-medium flex items-center gap-1 ml-1">
            <Filter className="w-3.5 h-3.5 text-stone-400" />
            فیلتر سازمان:
          </span>
          {[
            { id: 'ماز', label: '⚡ آزمون‌های کشوری ماز (اصلی • مقیاس ۱۲۰۰۰)' },
            { id: 'all', label: 'همه آزمون‌ها' },
            { id: 'سنجش', label: 'سنجش' },
            { id: 'گزینه دو', label: 'گزینه دو' },
            { id: 'قلم‌چی', label: 'قلم‌چی' },
            { id: 'مدرسه', label: 'مدرسه' }
          ].map((orgItem) => {
            const isSelected = selectedOrgFilter === orgItem.id;
            return (
              <button
                key={orgItem.id}
                type="button"
                onClick={() => setSelectedOrgFilter(orgItem.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  isSelected
                    ? orgItem.id === 'ماز'
                      ? 'bg-emerald-600 text-white shadow-md ring-2 ring-emerald-300'
                      : 'bg-stone-900 text-white shadow-sm'
                    : orgItem.id === 'ماز'
                    ? 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200 font-semibold'
                    : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                }`}
              >
                {orgItem.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* 2.5 MAZE 12,000 TARAZ BENCHMARK & ANALYSIS GUIDE */}
      <div className="bg-gradient-to-br from-emerald-50/90 via-teal-50/50 to-white rounded-2xl p-5 border border-emerald-200/80 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-emerald-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-sm shadow-sm">
              ۱۲k
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-stone-900 flex items-center gap-2">
                <span>سامانه تخصصی تراز ۱۲,۰۰۰ آزمون‌های ماز (Biomaze) و هم‌ترازی با کنکور</span>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-medium">
                  مقیاس رسمی ماز و سازمان سنجش
                </span>
              </h3>
              <p className="text-xs text-stone-600 mt-0.5">
                تراز در آزمون‌های ماز بر خلاف قلم‌چی (که سقف آن حدود ۸,۰۰۰ است)، مشابه کنکور سراسری روی مقیاس <strong>۱۲,۰۰۰</strong> محاسبه می‌شود.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowTarazGuide(!showTarazGuide)}
            className="inline-flex items-center gap-1 text-xs font-bold text-emerald-800 hover:text-emerald-950 px-2.5 py-1 rounded-lg bg-emerald-100/60 hover:bg-emerald-100 cursor-pointer self-start sm:self-center transition-colors"
          >
            <span>{showTarazGuide ? 'بستن راهنما' : 'مشاهده جدول و هدف‌گذاری تراز'}</span>
            {showTarazGuide ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>

        {showTarazGuide && (
          <div className="mt-4 space-y-4">
            {/* Explanatory note */}
            <div className="p-3.5 bg-white/80 rounded-xl border border-emerald-200/60 text-xs text-stone-700 leading-relaxed space-y-1.5 shadow-2xs">
              <div className="font-bold text-emerald-900 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-emerald-600" />
                <span>چرا تراز آزمون ماز با قلم‌چی تفاوت دارد؟</span>
              </div>
              <p>
                کانون قلم‌چی از مقیاس تراز با میانگین ۵۰۰۰ و سقف تجربی حدود ۸۳۰۰ استفاده می‌کند. اما <strong>آزمون‌های آنلاین ماز</strong> برای شبیه‌سازی دقیق رتبه کنکور سراسری، از مدل آماری <strong>سازمان سنجش با سقف ۱۲۰۰۰ تا ۱۳۰۰۰</strong> بهره می‌برند. به همین دلیل در ماز ترازهای بالای ۱۰۵۰۰ ترازهای تک‌رقمی و دورقمی و قبولی قطعی پزشکی تهران و مهندسی شریف هستند.
              </p>
            </div>

            {/* Interactive Maze Taraz Goal Setter */}
            <div className="bg-white rounded-xl p-4 border border-emerald-200 shadow-2xs">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="space-y-2 flex-1">
                  <label className="text-xs font-bold text-stone-800 flex items-center gap-2">
                    <Target className="w-4 h-4 text-emerald-600" />
                    <span>تنظیم تراز هدف آزمون ماز (مقیاس ۱۲,۰۰۰):</span>
                  </label>
                  
                  <div className="flex items-center gap-3">
                    <div className="relative w-44">
                      <input
                        type="number"
                        min={5000}
                        max={13000}
                        step={100}
                        value={customMazeTaraz}
                        onChange={(e) => setCustomMazeTaraz(Number(e.target.value))}
                        className="w-full text-center text-lg font-black text-emerald-800 bg-stone-50 border-2 border-emerald-400 rounded-xl px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white tracking-wider"
                      />
                      <span className="absolute left-2.5 top-2.5 text-xs text-stone-400 font-medium">از ۱۲,۰۰۰</span>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5">
                      {[
                        { label: '۱۱,۸۰۰ (پزشکی تهران / برق شریف)', val: 11800 },
                        { label: '۱۱,۲۰۰ (پزشکی و دندان سراسری)', val: 11200 },
                        { label: '۱۰,۵۰۰ (پزشکی، دارو و مهندسی برتر)', val: 10500 },
                        { label: '۹,۸۰۰ (پیراپزشکی / مهندسی دولتی)', val: 9800 }
                      ].map((preset) => (
                        <button
                          key={preset.val}
                          type="button"
                          onClick={() => setCustomMazeTaraz(preset.val)}
                          className={`text-[11px] px-2.5 py-1 rounded-lg border font-semibold transition-all cursor-pointer ${
                            customMazeTaraz === preset.val
                              ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                              : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
                          }`}
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Apply Button & Feedback */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-2 lg:pt-0 lg:border-r lg:pr-4 border-stone-200">
                  <button
                    type="button"
                    onClick={() => handleApplyMazeTaraz(customMazeTaraz, currentTarazBenchmark.tierName)}
                    className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition-all cursor-pointer whitespace-nowrap"
                  >
                    <Check className="w-4 h-4" />
                    <span>اعمال تراز {toPersianDigits(customMazeTaraz)} به آزمون هدف ماز</span>
                  </button>
                </div>
              </div>

              {tarazAppliedMsg && (
                <div className="mt-2.5 p-2 bg-emerald-100 text-emerald-900 rounded-lg text-xs font-semibold flex items-center gap-1.5 animate-fadeIn">
                  <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                  <span>{tarazAppliedMsg}</span>
                </div>
              )}

              {/* Dynamic Taraz Feedback Box */}
              <div className="mt-3 p-3 bg-stone-50 rounded-xl border border-stone-200 text-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-stone-900">سطح در مقیاس ۱۲۰۰۰ ماز:</span>
                    <span className={`px-2 py-0.5 rounded-md text-xs font-bold ${currentTarazBenchmark.badgeBg}`}>
                      {currentTarazBenchmark.tierName}
                    </span>
                    <span className="text-stone-500 font-medium">({currentTarazBenchmark.expectedRank})</span>
                  </div>
                  <div className="text-stone-600">
                    <strong>قبولی‌های متناظر:</strong> {currentTarazBenchmark.targetMajor}
                  </div>
                </div>

                <div className="flex items-center gap-4 text-stone-700 font-medium text-[11px] bg-white px-3 py-2 rounded-lg border border-stone-200 shrink-0">
                  <span>مطالعه هفتگی: <strong className="text-emerald-700">{toPersianDigits(currentTarazBenchmark.recommendedWeeklyHours)} ساعت</strong></span>
                  <span>|</span>
                  <span>تارگت تست: <strong className="text-emerald-700">{toPersianDigits(currentTarazBenchmark.recommendedWeeklyTests)} تست</strong></span>
                </div>
              </div>
            </div>

            {/* 5-Tier Maze Taraz Breakdown Table */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
              {MAZE_TARAZ_BENCHMARKS.map((benchmark, idx) => {
                const isSelected = customMazeTaraz >= benchmark.minTaraz && customMazeTaraz <= benchmark.maxTaraz;
                return (
                  <div
                    key={idx}
                    onClick={() => {
                      setCustomMazeTaraz(Math.min(benchmark.minTaraz + 300, benchmark.maxTaraz));
                    }}
                    className={`p-3 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? 'bg-white border-emerald-500 shadow-sm ring-2 ring-emerald-400'
                        : 'bg-white/70 border-stone-200 hover:bg-white hover:border-emerald-300'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${benchmark.badgeBg}`}>
                          {benchmark.tierName.split(' ')[0]}
                        </span>
                        <span className="text-[10px] font-bold text-stone-700">
                          {benchmark.minTaraz === 0 ? 'زیر ۸۰۰۰' : `${toPersianDigits(benchmark.minTaraz)}+`}
                        </span>
                      </div>
                      <div className="text-xs font-bold text-stone-900 mt-1">
                        {benchmark.expectedRank}
                      </div>
                      <p className="text-[10px] text-stone-500 mt-1 line-clamp-2">
                        {benchmark.targetMajor}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setCustomMazeTaraz(Math.min(benchmark.minTaraz + 300, benchmark.maxTaraz));
                        handleApplyMazeTaraz(Math.min(benchmark.minTaraz + 300, benchmark.maxTaraz), benchmark.tierName);
                      }}
                      className="mt-2 text-[10px] font-bold text-emerald-700 hover:text-emerald-900 text-center py-1 rounded bg-emerald-50 hover:bg-emerald-100 transition-colors w-full"
                    >
                      انتخاب این سطح
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* 3. Exam Cards with Detailed Syllabi */}
      <div className="space-y-4">
        {filteredExams.map((exam) => {
          const isExpanded = expandedExamId === exam.id;
          const isActive = activeExamBudget.examName === exam.examName || 
                           activeExamBudget.activeExamId === exam.id ||
                           (activeExamBudget.examDate === exam.examDate && activeExamBudget.examName.includes(exam.organization));
          
          const countdown = calculateExamCountdown({
            examName: exam.examName,
            examDate: exam.examDate,
            dateGregorian: exam.dateGregorian,
          });

          return (
            <div
              key={exam.id}
              className={`bg-white rounded-2xl border transition-all overflow-hidden ${
                isActive
                  ? 'border-emerald-500 shadow-md ring-2 ring-emerald-500/20'
                  : 'border-stone-200 hover:border-stone-300 shadow-sm'
              }`}
            >
              {/* Card Header Bar */}
              <div className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-stone-50/50">
                <div className="space-y-1 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${getOrgColor(exam.organization)}`}>
                      {exam.organization}
                    </span>
                    <span className="text-xs text-stone-500 font-medium">
                      {exam.stageTitle}
                    </span>
                    {isActive && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold border border-emerald-300">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        آزمون بعدی فعال
                      </span>
                    )}
                  </div>
                  <h3 className="text-base font-bold text-stone-900 flex items-center gap-2">
                    <span>{exam.examName}</span>
                  </h3>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-stone-500">
                    <span className="flex items-center gap-1 text-stone-700 font-semibold">
                      <Calendar className="w-3.5 h-3.5 text-stone-400" />
                      {exam.examDate}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-stone-400" />
                      وضعیت زمان:
                      <strong className={countdown.isPast ? 'text-rose-600 font-bold' : countdown.isToday ? 'text-emerald-600 font-bold' : 'text-amber-600 font-bold'}>
                        {countdown.isPast ? 'برگزار شده (گذشته)' : countdown.isToday ? 'امروز روز آزمون است!' : `${toPersianDigits(countdown.daysLeft ?? '')} روز مانده`}
                      </strong>
                    </span>
                    {exam.targetGoalText && (
                      <span className="text-stone-600">
                        هدف: {exam.targetGoalText}
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  {!isActive ? (
                    <button
                      type="button"
                      onClick={() => onSelectActiveExam(exam)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm transition-colors cursor-pointer"
                    >
                      <Check className="w-4 h-4" />
                      <span>انتخاب به عنوان آزمون بعدی</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={onGenerateScheduleForExam}
                      disabled={isGeneratingSchedule}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-300 font-bold text-xs hover:bg-emerald-100 transition-colors cursor-pointer"
                    >
                      <Sparkles className="w-4 h-4 text-emerald-600" />
                      <span>چیدن برنامه این آزمون</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => setExpandedExamId(isExpanded ? null : exam.id)}
                    className="p-2 rounded-xl text-stone-500 hover:text-stone-800 hover:bg-stone-100 transition-colors cursor-pointer"
                    title={isExpanded ? 'بستن جزئیات مباحث' : 'مشاهده مباحث و سرفصل‌ها'}
                  >
                    {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                  </button>

                  {exam.id.startsWith('custom-') && onDeleteCustomExam && (
                    <button
                      type="button"
                      onClick={() => onDeleteCustomExam(exam.id)}
                      className="p-2 rounded-xl text-stone-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                      title="حذف این آزمون"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Collapsible Syllabus & Topics Body */}
              {isExpanded && (
                <div className="p-4 sm:p-6 border-t border-stone-100 space-y-4 bg-white">
                  {/* Summary Text */}
                  <div>
                    <h4 className="text-xs font-bold text-stone-700 mb-1 flex items-center gap-1.5">
                      <BookOpen className="w-4 h-4 text-emerald-600" />
                      خلاصه سرفصل و بودجه‌بندی آزمون:
                    </h4>
                    <p className="text-xs text-stone-600 leading-relaxed bg-stone-50 p-3 rounded-xl border border-stone-200">
                      {exam.syllabusSummary}
                    </p>
                  </div>

                  {/* Selected Topic Pills */}
                  {exam.selectedTopics && exam.selectedTopics.length > 0 && (
                    <div>
                      <h4 className="text-xs font-bold text-stone-700 mb-2 flex items-center gap-1.5">
                        <Tag className="w-4 h-4 text-emerald-600" />
                        سرفصل‌های هدف در برنامه هفتگی:
                      </h4>
                      <div className="flex flex-wrap gap-1.5">
                        {exam.selectedTopics.map((topic, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-emerald-50 text-emerald-900 border border-emerald-200 text-xs font-medium"
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                            {topic}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Detailed Topic Breakdown with difficulty & tests */}
                  {exam.topicDetails && exam.topicDetails.length > 0 && (
                    <div>
                      <h4 className="text-xs font-bold text-stone-700 mb-2 flex items-center gap-1.5">
                        <Layers className="w-4 h-4 text-emerald-600" />
                        ریز مباحث و تست هدف پیشنهادی برای هر درس:
                      </h4>
                      <div className="overflow-x-auto rounded-xl border border-stone-200">
                        <table className="w-full text-xs text-right">
                          <thead className="bg-stone-50 border-b border-stone-200 text-stone-600 font-bold">
                            <tr>
                              <th className="p-2.5">درس</th>
                              <th className="p-2.5">فصل و مبحث</th>
                              <th className="p-2.5">مباحث دقیق و صفحات کتاب</th>
                              <th className="p-2.5">درجه سختی</th>
                              <th className="p-2.5">اهمیت</th>
                              <th className="p-2.5">تست هدف</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-stone-100 text-stone-700">
                            {exam.topicDetails.map((td) => (
                              <tr key={td.id} className="hover:bg-stone-50/60">
                                <td className="p-2.5 font-bold text-stone-900 whitespace-nowrap">{td.subject}</td>
                                <td className="p-2.5 font-medium">{td.chapter}</td>
                                <td className="p-2.5">
                                  <div className="text-stone-800 font-medium">{td.subtopic || td.chapter}</div>
                                  {td.pagesOrScope && (
                                    <div className="text-[10px] text-amber-700 font-semibold mt-0.5">
                                      📖 {td.pagesOrScope}
                                    </div>
                                  )}
                                  {td.testTypes && (
                                    <div className="text-[10px] text-stone-500 mt-0.5">
                                      🎯 {td.testTypes}
                                    </div>
                                  )}
                                </td>
                                <td className="p-2.5 whitespace-nowrap">
                                  <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                                    td.difficulty === 'بسیار چالشی و دام‌دار'
                                      ? 'bg-rose-50 text-rose-700'
                                      : td.difficulty === 'سخت'
                                      ? 'bg-amber-50 text-amber-700'
                                      : 'bg-stone-100 text-stone-700'
                                  }`}>
                                    {td.difficulty}
                                  </span>
                                </td>
                                <td className="p-2.5 text-stone-500 whitespace-nowrap">{td.importanceWeight || 'متوسط'}</td>
                                <td className="p-2.5 font-bold text-emerald-700 whitespace-nowrap">
                                  {toPersianDigits(td.targetTestCount)} تست
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Apply Exam to Schedule Action Button */}
                  <div className="pt-2 flex items-center justify-end">
                    <button
                      type="button"
                      onClick={() => onSelectActiveExam(exam)}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold transition-all cursor-pointer"
                    >
                      <span>{isActive ? 'همگام‌سازی مجدد با بودجه‌بندی' : 'انتخاب این آزمون و انتقال به فرم برنامه'}</span>
                      <ArrowRight className="w-4 h-4 rotate-180" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* 4. Add Custom Exam Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-stone-200">
              <h3 className="text-base font-bold text-stone-900 flex items-center gap-2">
                <Plus className="w-5 h-5 text-emerald-600" />
                تعریف آزمون آزمایشی جدید
              </h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-stone-400 hover:text-stone-700 text-xs font-bold cursor-pointer"
              >
                انصراف
              </button>
            </div>

            <form onSubmit={handleCreateExam} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-stone-700 mb-1">نام آزمون</label>
                <input
                  type="text"
                  required
                  value={newExamName}
                  onChange={(e) => setNewExamName(e.target.value)}
                  placeholder="مثال: آزمون مرحله اول مدرسه / آزمون سنجش مهر"
                  className="w-full px-3 py-2 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">سازمان / مجری</label>
                  <select
                    value={newOrg}
                    onChange={(e) => setNewOrg(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="قلم‌چی">قلم‌چی</option>
                    <option value="ماز">ماز</option>
                    <option value="سنجش">سنجش</option>
                    <option value="گزینه دو">گزینه دو</option>
                    <option value="مدرسه">مدرسه</option>
                    <option value="سایر">سایر</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">عنوان مرحله</label>
                  <input
                    type="text"
                    value={newStage}
                    onChange={(e) => setNewStage(e.target.value)}
                    placeholder="مثال: مرحله ۱"
                    className="w-full px-3 py-2 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">تاریخ برگزاری</label>
                  <input
                    type="text"
                    required
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                    placeholder="مثال: جمعه ۲۸ شهریور ۱۴۰۵"
                    className="w-full px-3 py-2 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">تارگت کل تست‌ها</label>
                  <input
                    type="number"
                    value={newTargetTests}
                    onChange={(e) => setNewTargetTests(Number(e.target.value))}
                    placeholder="۴۵۰"
                    className="w-full px-3 py-2 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">هدف‌گذاری تراز یا درصد</label>
                <input
                  type="text"
                  value={newTargetGoal}
                  onChange={(e) => setNewTargetGoal(e.target.value)}
                  placeholder="مثال: تراز بالای ۶۸۰۰ با درصد فیزیک بالای ۶۰٪"
                  className="w-full px-3 py-2 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">خلاصه مباحث و بودجه‌بندی</label>
                <textarea
                  rows={2}
                  value={newSyllabus}
                  onChange={(e) => setNewSyllabus(e.target.value)}
                  placeholder="مثال: فیزیک: حرکت با شتاب ثابت؛ حسابان: کاربرد مشتق؛ شیمی: اسید و باز"
                  className="w-full px-3 py-2 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">سرفصل‌های هدف (با کاما یا ویرگول جدا کنید)</label>
                <input
                  type="text"
                  value={newSelectedTopicsStr}
                  onChange={(e) => setNewSelectedTopicsStr(e.target.value)}
                  placeholder="مثال: کاربرد مشتق، حرکت‌شناسی، اسیدها و بازها"
                  className="w-full px-3 py-2 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-stone-200">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl border border-stone-200 text-stone-600 font-bold hover:bg-stone-50 cursor-pointer"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold cursor-pointer shadow-sm"
                >
                  ثبت آزمون جدید
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
