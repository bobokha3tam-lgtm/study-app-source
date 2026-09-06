import React, { useState } from 'react';
import { 
  FileText, 
  CheckCircle2, 
  CheckSquare, 
  Square, 
  Award, 
  Percent, 
  Layers, 
  Sliders, 
  Plus, 
  Calendar,
  Sparkles,
  BookOpen
} from 'lucide-react';
import { FinalExamItem } from '../types';

interface FinalExamBalanceViewProps {
  finalExamItems: FinalExamItem[];
  onUpdateItems: (items: FinalExamItem[]) => void;
  onInjectDescriptiveBlock?: (subject: string, chapter: string) => void;
}

export function FinalExamBalanceView({
  finalExamItems,
  onUpdateItems,
  onInjectDescriptiveBlock,
}: FinalExamBalanceViewProps) {
  const [descriptiveRatio, setDescriptiveRatio] = useState<number>(35); // 35% descriptive, 65% multiple-choice
  const [injectedSuccess, setInjectedSuccess] = useState<string | null>(null);

  const toggleItemCheckbox = (id: string, field: 'textbookExercisesDone' | 'theoremsProofsMastered') => {
    const updated = finalExamItems.map((item) => {
      if (item.id === id) {
        return { ...item, [field]: !item[field] };
      }
      return item;
    });
    onUpdateItems(updated);
  };

  const handleIncrementExams = (id: string, delta: number) => {
    const updated = finalExamItems.map((item) => {
      if (item.id === id) {
        return { ...item, sampleExamsSolvedCount: Math.max(0, item.sampleExamsSolvedCount + delta) };
      }
      return item;
    });
    onUpdateItems(updated);
  };

  const handleInjectDescriptive = (item: FinalExamItem) => {
    if (onInjectDescriptiveBlock) {
      onInjectDescriptiveBlock(item.subject, `حل تشریحی تمارین کتاب درسی و نمونه نهایی (${item.chapter})`);
      setInjectedSuccess(item.subject);
      setTimeout(() => setInjectedSuccess(null), 3000);
    }
  };

  // Calculate statistics
  const totalCompletedExercises = finalExamItems.filter((i) => i.textbookExercisesDone).length;
  const totalCompletedTheorems = finalExamItems.filter((i) => i.theoremsProofsMastered).length;
  const totalSampleExams = finalExamItems.reduce((acc, i) => acc + i.sampleExamsSolvedCount, 0);

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white border border-stone-200 rounded-2xl p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-stone-100">
          <div>
            <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-violet-50 text-violet-700 text-xs font-semibold mb-2 border border-violet-200">
              <FileText className="w-3.5 h-3.5" />
              <span>مدیریت تعادل امتحانات نهایی ۵۰٪ و تشریحی (Final Exam 50% Manager)</span>
            </div>
            <h2 className="text-xl font-bold text-stone-900">
              توازن تست کنکور و نگارش تشریحی نهایی
            </h2>
            <p className="text-xs text-stone-500 mt-1">
              امتحانات نهایی خرداد سهم قطعی ۵۰ درصدی در قبولی دانشگاه‌های برتر (شریف، تهران، امیرکبیر) دارند. تک‌تک تمارین کتاب درسی و بارم‌بندی مصحح را کنترل کن.
            </p>
          </div>

          <div className="bg-stone-50 border border-stone-200 p-3.5 rounded-xl text-xs space-y-1">
            <span className="font-bold text-stone-800 block">ضریب تاثیر سوابق تحصیلی:</span>
            <div className="text-emerald-700 font-black text-lg">۵۰٪ قطعی (ترازساز)</div>
          </div>
        </div>

        {/* Ratio Slider */}
        <div className="mt-5 p-4 bg-stone-50 rounded-xl border border-stone-200/80 space-y-3">
          <div className="flex items-center justify-between text-xs font-semibold">
            <span className="text-stone-700 flex items-center gap-1.5">
              <Sliders className="w-4 h-4 text-emerald-600" />
              <span>نسبت هفتگی مطالعه تشریحی نهایی در برابر تست‌زنی کنکور:</span>
            </span>
            <div className="flex items-center gap-3">
              <span className="text-violet-700 font-bold">{descriptiveRatio}٪ تشریحی نهایی</span>
              <span className="text-stone-400">|</span>
              <span className="text-emerald-700 font-bold">{100 - descriptiveRatio}٪ تست کنکور</span>
            </div>
          </div>

          <input
            type="range"
            min="15"
            max="60"
            value={descriptiveRatio}
            onChange={(e) => setDescriptiveRatio(Number(e.target.value))}
            className="w-full accent-violet-600"
          />

          <div className="flex justify-between text-[11px] text-stone-500">
            <span>حداقل تشریحی (۱۵٪ در پاییز)</span>
            <span className="text-violet-800 font-semibold">
              توصیه مشاور: در پایه دوازدهم، حداقل ۳۵٪ زمان هفتگی را به حل تمارین کتاب و دست‌به‌قلم شدن تشریحی اختصاص دهید.
            </span>
            <span>اوج تشریحی (۶۰٪ در اردیبهشت و خرداد)</span>
          </div>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white border border-stone-200 rounded-xl p-4 flex items-center gap-3 shadow-xs">
          <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
            {totalCompletedExercises}/{finalExamItems.length}
          </div>
          <div>
            <span className="text-xs font-bold text-stone-800 block">پوشش تمارین کتاب درسی</span>
            <span className="text-[11px] text-stone-500">مبنای اصلی ۷۰٪ سوالات نهایی</span>
          </div>
        </div>

        <div className="bg-white border border-stone-200 rounded-xl p-4 flex items-center gap-3 shadow-xs">
          <div className="w-10 h-10 rounded-lg bg-violet-50 text-violet-700 flex items-center justify-center font-bold">
            {totalCompletedTheorems}/{finalExamItems.length}
          </div>
          <div>
            <span className="text-xs font-bold text-stone-800 block">تسلط بر اثبات قضایا</span>
            <span className="text-[11px] text-stone-500">بارم ثابت قضایای حسابان و گسسته</span>
          </div>
        </div>

        <div className="bg-white border border-stone-200 rounded-xl p-4 flex items-center gap-3 shadow-xs">
          <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center font-bold">
            {totalSampleExams}
          </div>
          <div>
            <span className="text-xs font-bold text-stone-800 block">دوره امتحانات نهایی حل‌شده</span>
            <span className="text-[11px] text-stone-500">خرداد و شهریور سال‌های اخیر</span>
          </div>
        </div>
      </div>

      {injectedSuccess && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center gap-2 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>یک پارت مطالعه تشریحی برای درس {injectedSuccess} به برنامه هفتگی شما اضافه شد!</span>
        </div>
      )}

      {/* Checklist of Final Exam Subjects */}
      <div className="bg-white border border-stone-200 rounded-2xl p-6 shadow-xs space-y-4">
        <h3 className="text-sm font-bold text-stone-900 flex items-center justify-between">
          <span>سرفصل‌ها و دروس دارای بالاترین ضریب نهایی</span>
          <span className="text-xs text-stone-400 font-normal">
            تیک بزنید تا میزان آمادگی تشریحی به‌روز شود
          </span>
        </h3>

        <div className="divide-y divide-stone-100">
          {finalExamItems.map((item) => (
            <div key={item.id} className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs">
              <div className="space-y-1.5 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-stone-900 text-sm">{item.subject}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-md bg-violet-50 text-violet-700 font-bold border border-violet-200">
                    ضریب نهایی: {item.coefficient}
                  </span>
                  <span className="text-[10px] text-stone-400">نمره هدف: {item.targetScore}</span>
                </div>

                <p className="text-stone-600 text-xs">{item.chapter}</p>
                <p className="text-[11px] text-stone-400 italic">{item.notes}</p>
              </div>

              {/* Checkboxes & Counter */}
              <div className="flex flex-wrap items-center gap-4 shrink-0">
                {/* Textbook exercises checkbox */}
                <button
                  type="button"
                  onClick={() => toggleItemCheckbox(item.id, 'textbookExercisesDone')}
                  className={`px-3 py-1.5 rounded-lg border text-xs flex items-center gap-1.5 transition cursor-pointer ${
                    item.textbookExercisesDone
                      ? 'border-emerald-300 bg-emerald-50 text-emerald-800 font-bold'
                      : 'border-stone-200 bg-white text-stone-600 hover:bg-stone-50'
                  }`}
                >
                  {item.textbookExercisesDone ? <CheckSquare className="w-3.5 h-3.5 text-emerald-600" /> : <Square className="w-3.5 h-3.5 text-stone-400" />}
                  <span>تمرین‌های کتاب درسی</span>
                </button>

                {/* Theorems & Proofs checkbox */}
                <button
                  type="button"
                  onClick={() => toggleItemCheckbox(item.id, 'theoremsProofsMastered')}
                  className={`px-3 py-1.5 rounded-lg border text-xs flex items-center gap-1.5 transition cursor-pointer ${
                    item.theoremsProofsMastered
                      ? 'border-violet-300 bg-violet-50 text-violet-800 font-bold'
                      : 'border-stone-200 bg-white text-stone-600 hover:bg-stone-50'
                  }`}
                >
                  {item.theoremsProofsMastered ? <CheckSquare className="w-3.5 h-3.5 text-violet-600" /> : <Square className="w-3.5 h-3.5 text-stone-400" />}
                  <span>اثبات قضایا و تعاریف</span>
                </button>

                {/* Sample exams solved counter */}
                <div className="flex items-center gap-1.5 bg-stone-50 border border-stone-200 px-2 py-1 rounded-lg">
                  <span className="text-[11px] text-stone-500">دوره نمونه نهایی:</span>
                  <button
                    onClick={() => handleIncrementExams(item.id, -1)}
                    className="w-5 h-5 rounded bg-white border border-stone-200 flex items-center justify-center font-bold text-stone-600 hover:bg-stone-100 cursor-pointer"
                  >
                    -
                  </button>
                  <span className="font-bold text-stone-900 px-1">{item.sampleExamsSolvedCount}</span>
                  <button
                    onClick={() => handleIncrementExams(item.id, 1)}
                    className="w-5 h-5 rounded bg-white border border-stone-200 flex items-center justify-center font-bold text-stone-600 hover:bg-stone-100 cursor-pointer"
                  >
                    +
                  </button>
                </div>

                {/* Add to schedule button */}
                {onInjectDescriptiveBlock && (
                  <button
                    onClick={() => handleInjectDescriptive(item)}
                    className="px-3 py-1.5 rounded-lg bg-stone-900 hover:bg-stone-800 text-white text-[11px] font-semibold flex items-center gap-1 transition cursor-pointer"
                    title="افزودن یک پارت تشریحی به برنامه هفتگی"
                  >
                    <Plus className="w-3 h-3" />
                    <span>افزودن به برنامه</span>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
