import React, { useState, useMemo } from 'react';
import { 
  Grid, 
  CheckCircle, 
  AlertCircle, 
  Flame, 
  TrendingUp, 
  BookOpen, 
  Check, 
  Edit3, 
  Layers, 
  Filter,
  BarChart,
  ShieldCheck,
  Zap,
  Sparkles
} from 'lucide-react';
import { TopicMasteryRecord, StudentProfile } from '../types';
import { 
  getCurriculumByField, 
  normalizeStream, 
  STREAM_OPTIONS, 
  StreamType 
} from '../data/curriculumData';

interface TopicMasteryHeatmapViewProps {
  masteryRecords: TopicMasteryRecord[];
  onUpdateRecord: (record: TopicMasteryRecord) => void;
  profile?: StudentProfile;
}

interface CurriculumChapterDefinition {
  id: string;
  subject: string;
  chapter: string;
  grade: string;
  recommendedTests: {
    learning: number;
    timed: number;
    review: number;
    total: number;
  };
  konkurQuestionsApprox: number;
  difficulty?: string;
  subtopics?: string[];
}

export function TopicMasteryHeatmapView({
  masteryRecords,
  onUpdateRecord,
  profile,
}: TopicMasteryHeatmapViewProps) {
  const defaultStream = useMemo(() => normalizeStream(profile?.fieldOfStudy), [profile?.fieldOfStudy]);
  const [activeStream, setActiveStream] = useState<StreamType>(defaultStream);
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState<string>('all');
  const [editingChapter, setEditingChapter] = useState<CurriculumChapterDefinition | null>(null);

  // Quick edit form state
  const [learningTests, setLearningTests] = useState<number>(0);
  const [timedPracticeTests, setTimedPracticeTests] = useState<number>(0);
  const [reviewTests, setReviewTests] = useState<number>(0);
  const [confidenceScore, setConfidenceScore] = useState<number>(50);

  // Map of records by topicId
  const recordsMap = useMemo(() => {
    const map = new Map<string, TopicMasteryRecord>();
    (masteryRecords || []).forEach((r) => map.set(r.topicId, r));
    return map;
  }, [masteryRecords]);

  // Dynamic chapters based on active stream
  const currentCurriculum = useMemo(() => {
    return getCurriculumByField(activeStream);
  }, [activeStream]);

  const allChapters: CurriculumChapterDefinition[] = useMemo(() => {
    return (currentCurriculum || []).map((topic) => {
      const learning = topic.testVolume?.learningTests || 100;
      const timed = topic.testVolume?.timedPracticeTests || 140;
      const review = topic.testVolume?.reviewTests || 60;
      const total = topic.testVolume?.totalRecommendedTests || (topic.expectedTestBudget || (learning + timed + review));
      
      let approxQ = 3;
      const match = topic.conceptWeight?.match(/\d+/);
      if (match) {
        approxQ = parseInt(match[0], 10);
      }

      return {
        id: topic.id,
        subject: topic.subject || 'سایر',
        chapter: topic.chapter,
        grade: topic.grade,
        recommendedTests: {
          learning,
          timed,
          review,
          total,
        },
        konkurQuestionsApprox: approxQ,
        difficulty: topic.difficulty,
        subtopics: topic.subtopics,
      };
    });
  }, [currentCurriculum]);

  // Distinct subjects in current stream
  const subjects = useMemo(() => {
    const set = new Set<string>();
    allChapters.forEach((c) => set.add(c.subject));
    return ['all', ...Array.from(set)];
  }, [allChapters]);

  const filteredChapters = useMemo(() => {
    return allChapters.filter((chap) => {
      if (selectedSubjectFilter === 'all') return true;
      return chap.subject === selectedSubjectFilter;
    });
  }, [allChapters, selectedSubjectFilter]);

  // Calculate Overall Readiness
  const { totalTestsTargetSum, totalTestsDoneSum, overallReadinessPercent } = useMemo(() => {
    let targetSum = 0;
    let doneSum = 0;

    allChapters.forEach((chap) => {
      const record = recordsMap.get(chap.id);
      const target = chap.recommendedTests.total;
      const done = record ? (record.learningTestsDone + record.timedPracticeTestsDone + record.reviewTestsDone) : 0;
      targetSum += target;
      doneSum += Math.min(done, target);
    });

    const percent = targetSum > 0 ? Math.round((doneSum / targetSum) * 100) : 0;
    return {
      totalTestsTargetSum: targetSum,
      totalTestsDoneSum: doneSum,
      overallReadinessPercent: percent,
    };
  }, [allChapters, recordsMap]);

  const handleOpenEdit = (chap: CurriculumChapterDefinition) => {
    const existing = recordsMap.get(chap.id);
    setEditingChapter(chap);
    setLearningTests(existing?.learningTestsDone || 0);
    setTimedPracticeTests(existing?.timedPracticeTestsDone || 0);
    setReviewTests(existing?.reviewTestsDone || 0);
    setConfidenceScore(existing?.confidenceScore || 50);
  };

  const handleSaveProgress = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingChapter) return;

    const newRecord: TopicMasteryRecord = {
      topicId: editingChapter.id,
      chapter: editingChapter.chapter,
      learningTestsDone: Number(learningTests),
      timedPracticeTestsDone: Number(timedPracticeTests),
      reviewTestsDone: Number(reviewTests),
      confidenceScore: Number(confidenceScore),
      lastStudiedDate: new Date().toLocaleDateString('fa-IR'),
    };

    onUpdateRecord(newRecord);
    setEditingChapter(null);
  };

  const activeStreamObj = STREAM_OPTIONS.find((s) => s.id === activeStream) || STREAM_OPTIONS[0];

  return (
    <div className="space-y-6">
      {/* Top Banner & Stream Selector */}
      <div className="bg-white border border-stone-200 rounded-2xl p-6 shadow-xs">
        {/* Stream Switcher */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 mb-4 border-b border-stone-100">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-stone-700">رشته تحصیلی رادار:</span>
            <div className="flex items-center gap-1.5 bg-stone-100 p-1 rounded-xl">
              {STREAM_OPTIONS.map((st) => (
                <button
                  key={st.id}
                  onClick={() => {
                    setActiveStream(st.id);
                    setSelectedSubjectFilter('all');
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                    activeStream === st.id
                      ? 'bg-stone-900 text-white shadow-xs'
                      : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200'
                  }`}
                >
                  <span>{st.shortName}</span>
                  {activeStream === st.id && (
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className="text-[11px] text-stone-500 bg-stone-50 px-2.5 py-1 rounded-lg border border-stone-200">
            <span>تمرکز سرفصل‌ها: </span>
            <strong className="text-stone-800">{activeStreamObj.badge}</strong>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-stone-100">
          <div>
            <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold mb-2 border border-blue-200">
              <Grid className="w-3.5 h-3.5" />
              <span>نقشه حرارتی و رادار تسلط بر مباحث ({activeStreamObj.name})</span>
            </div>
            <h2 className="text-xl font-bold text-stone-900">
              ماتریس جامع سرفصل‌های تخصصی کنکور {activeStreamObj.name}
            </h2>
            <p className="text-xs text-stone-500 mt-1">
              شناسایی نقاط قوت (سبز)، فصول نیمه‌کاره (زرد) و فصول پرخطر یا رهاشده (قرمز) بر اساس حجم تست‌های استاندارد حل‌شده.
            </p>
          </div>

          <div className="bg-stone-50 border border-stone-200 p-3 rounded-xl flex items-center gap-4">
            <div>
              <span className="text-[11px] text-stone-500 block">شاخص کل آمادگی کنکور:</span>
              <span className="text-2xl font-black text-stone-900">{overallReadinessPercent}٪</span>
            </div>
            <div className="w-16 h-16 rounded-full border-4 border-stone-200 flex items-center justify-center relative">
              <div 
                className="absolute inset-0 rounded-full border-4 border-emerald-500 transition-all duration-700" 
                style={{ clipPath: `polygon(0 0, 100% 0, 100% ${overallReadinessPercent}%, 0 ${overallReadinessPercent}%)` }}
              />
              <ShieldCheck className="w-6 h-6 text-emerald-600 relative z-10" />
            </div>
          </div>
        </div>

        {/* Legend and Filter Bar */}
        <div className="mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          {/* Legend */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-emerald-500" />
              <span className="text-stone-600 font-medium">تسلط مطلوب (بالای ۷۵٪ تست‌ها)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-amber-400" />
              <span className="text-stone-600 font-medium">در حال تثبیت (۴۰ تا ۷۴٪)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-rose-400" />
              <span className="text-stone-600 font-medium">نیازمند کار فوری (زیر ۴۰٪)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-stone-200" />
              <span className="text-stone-600 font-medium">هنوز شروع نشده</span>
            </div>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
            {subjects.map((sub) => (
              <button
                key={sub}
                onClick={() => setSelectedSubjectFilter(sub)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                  selectedSubjectFilter === sub
                    ? 'bg-stone-900 text-white'
                    : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                }`}
              >
                {sub === 'all' ? 'همه دروس' : sub}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Grid of Heatmap Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredChapters.map((chap) => {
          const rec = recordsMap.get(chap.id);
          const totalDone = rec ? (rec.learningTestsDone + rec.timedPracticeTestsDone + rec.reviewTestsDone) : 0;
          const targetTotal = chap.recommendedTests.total;
          const progressPercent = Math.min(100, Math.round((totalDone / targetTotal) * 100));

          let statusColor = 'bg-stone-100 text-stone-600 border-stone-200';
          let barColor = 'bg-stone-300';
          if (progressPercent >= 75) {
            statusColor = 'bg-emerald-50 text-emerald-800 border-emerald-200';
            barColor = 'bg-emerald-500';
          } else if (progressPercent >= 40) {
            statusColor = 'bg-amber-50 text-amber-900 border-amber-200';
            barColor = 'bg-amber-400';
          } else if (progressPercent > 0) {
            statusColor = 'bg-rose-50 text-rose-800 border-rose-200';
            barColor = 'bg-rose-400';
          }

          return (
            <div
              key={chap.id}
              onClick={() => handleOpenEdit(chap)}
              className={`p-5 rounded-2xl border transition-all hover:shadow-sm cursor-pointer flex flex-col justify-between space-y-3 bg-white ${
                progressPercent >= 75 ? 'border-emerald-200' : progressPercent >= 40 ? 'border-amber-200' : 'border-stone-200'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-stone-100 text-stone-600">
                    {chap.subject} • {chap.grade}
                  </span>
                  <span className="text-[10px] text-stone-500">
                    ~ {chap.konkurQuestionsApprox} تست در کنکور
                  </span>
                </div>

                <h4 className="text-sm font-bold text-stone-900 leading-snug">
                  {chap.chapter}
                </h4>
              </div>

              {/* Progress Bar & Numbers */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-stone-500">تست‌های حل‌شده:</span>
                  <span className="font-bold text-stone-800">
                    {totalDone} از {targetTotal} تست ({progressPercent}٪)
                  </span>
                </div>

                <div className="w-full h-2 rounded-full bg-stone-100 overflow-hidden">
                  <div className={`h-full ${barColor} transition-all duration-500`} style={{ width: `${progressPercent}%` }} />
                </div>

                {/* Sub-breakdown */}
                <div className="flex items-center justify-between text-[10px] text-stone-400 pt-1">
                  <span>آموزشی: {rec?.learningTestsDone || 0}</span>
                  <span>زمان‌دار: {rec?.timedPracticeTestsDone || 0}</span>
                  <span>مروری: {rec?.reviewTestsDone || 0}</span>
                  <span className="font-semibold text-stone-600 flex items-center gap-0.5">
                    <Edit3 className="w-2.5 h-2.5" /> ویرایش
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Edit Modal */}
      {editingChapter && (
        <div className="fixed inset-0 z-50 bg-stone-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-stone-200 shadow-xl max-w-md w-full p-6 space-y-4 animate-fadeIn">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div>
                <span className="text-xs text-stone-500 block">{editingChapter.subject}</span>
                <h3 className="text-sm font-bold text-stone-900">{editingChapter.chapter}</h3>
              </div>
              <button
                onClick={() => setEditingChapter(null)}
                className="text-stone-400 hover:text-stone-600 text-xs cursor-pointer"
              >
                بستن
              </button>
            </div>

            <form onSubmit={handleSaveProgress} className="space-y-4 text-xs">
              <div className="bg-stone-50 p-3 rounded-xl text-stone-600">
                حجم تست هدف پیشنهادی برای این مبحث: <strong>{editingChapter.recommendedTests.total} تست</strong>
                <div className="text-[11px] text-stone-400 mt-0.5">
                  ({editingChapter.recommendedTests.learning} آموزشی + {editingChapter.recommendedTests.timed} زمان‌دار + {editingChapter.recommendedTests.review} مروری)
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-stone-700 font-semibold mb-1">تست آموزشی زده‌شده</label>
                  <input
                    type="number"
                    min="0"
                    value={learningTests}
                    onChange={(e) => setLearningTests(Number(e.target.value))}
                    className="w-full p-2 rounded-xl border border-stone-200 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-stone-700 font-semibold mb-1">تست زمان‌دار زده‌شده</label>
                  <input
                    type="number"
                    min="0"
                    value={timedPracticeTests}
                    onChange={(e) => setTimedPracticeTests(Number(e.target.value))}
                    className="w-full p-2 rounded-xl border border-stone-200 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-stone-700 font-semibold mb-1">تست مروری / آزمونی</label>
                  <input
                    type="number"
                    min="0"
                    value={reviewTests}
                    onChange={(e) => setReviewTests(Number(e.target.value))}
                    className="w-full p-2 rounded-xl border border-stone-200 bg-white"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-stone-700 font-semibold">میزان اعتماد به نفس در این فصل ({confidenceScore}٪):</label>
                </div>
                <input
                  type="range"
                  min="10"
                  max="100"
                  value={confidenceScore}
                  onChange={(e) => setConfidenceScore(Number(e.target.value))}
                  className="w-full accent-emerald-600"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setEditingChapter(null)}
                  className="px-4 py-2 rounded-xl text-stone-600 hover:bg-stone-100 cursor-pointer"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-semibold cursor-pointer"
                >
                  ذخیره پیشرفت
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
