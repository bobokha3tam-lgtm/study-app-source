import React, { useState } from 'react';
import { 
  FileUp, 
  Sparkles, 
  Calendar, 
  Target, 
  CheckCircle, 
  AlertCircle, 
  Clock, 
  Gauge, 
  Plus, 
  Trash2, 
  Download, 
  RefreshCw, 
  X, 
  Upload, 
  FileText, 
  ArrowRight,
  ChevronDown,
  Layers,
  Award,
  Zap
} from 'lucide-react';
import { StudentProfile, ExamBudget, ScheduledExam, TopicExamDetail, WeeklySchedule } from '../types';
import { StreamType } from '../data/curriculumData';
import { ScheduledExamsSection } from './ScheduledExamsSection';
import { getDefaultScheduledExams } from '../data/scheduledExamsData';
import { 
  calculateExamCountdown, 
  getPersianTodayInfo, 
  toPersianDigits 
} from '../utils/examCountdown';

interface ExamBudgetSectionProps {
  profile: StudentProfile;
  examBudget: ExamBudget;
  currentStream: StreamType;
  onUpdateExamBudget: (budget: ExamBudget) => void;
  onApplyNewSchedule: (schedule: WeeklySchedule) => void;
  onSwitchToScheduleTab: () => void;
  onSwitchToClassesTab?: () => void;
}

export const ExamBudgetSection: React.FC<ExamBudgetSectionProps> = ({
  profile,
  examBudget,
  currentStream,
  onUpdateExamBudget,
  onApplyNewSchedule,
  onSwitchToScheduleTab,
  onSwitchToClassesTab,
}) => {
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [isExtracting, setIsExtracting] = useState<boolean>(false);
  const [extractError, setExtractError] = useState<string | null>(null);
  const [extractSuccess, setExtractSuccess] = useState<string | null>(null);
  const [uploadedFile, setUploadedFile] = useState<{
    name: string;
    size: string;
    type: string;
    base64?: string;
    previewUrl?: string;
  } | null>(null);

  // Scheduled exams list
  const [scheduledExams, setScheduledExams] = useState<ScheduledExam[]>(() => {
    if (examBudget.scheduledExams && examBudget.scheduledExams.length > 0) {
      return examBudget.scheduledExams;
    }
    return getDefaultScheduledExams(currentStream);
  });

  // Topic Details Management
  const [showAddTopicDetailForm, setShowAddTopicDetailForm] = useState<boolean>(false);
  const [newTdSubject, setNewTdSubject] = useState<string>('حسابان ۲');
  const [newTdChapter, setNewTdChapter] = useState<string>('کاربرد مشتق');
  const [newTdSubtopic, setNewTdSubtopic] = useState<string>('اکسترمم‌ها و بهینه‌سازی');
  const [newTdPagesOrScope, setNewTdPagesOrScope] = useState<string>('صفحات ۵۴ تا ۸۸ کتاب درسی');
  const [newTdTestTypes, setNewTdTestTypes] = useState<string>('تست‌های تالیفی ماز + تست‌های سراسری ۱۴۰۰ تا ۱۴۰۴');
  const [newTdDifficulty, setNewTdDifficulty] = useState<'آسان و روان' | 'متوسط' | 'سخت' | 'بسیار چالشی و دام‌دار'>('بسیار چالشی و دام‌دار');
  const [newTdTargetTests, setNewTdTargetTests] = useState<number>(120);
  const [newTdImportance, setNewTdImportance] = useState<'پرتکرار و حیاتی (تضمین درصد)' | 'متوسط' | 'کم‌تکرار اما رتبه‌ساز'>('پرتکرار و حیاتی (تضمین درصد)');

  // Generation state
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const todayInfo = getPersianTodayInfo();
  const activeExamCountdown = calculateExamCountdown(examBudget);

  const handleSelectActiveExam = (exam: ScheduledExam) => {
    const countdown = calculateExamCountdown({
      examName: exam.examName,
      examDate: exam.examDate,
      dateGregorian: exam.dateGregorian,
    });

    const daysLeftVal = countdown.daysLeft !== null ? Math.max(0, countdown.daysLeft) : undefined;

    const updatedBudget: ExamBudget = {
      ...examBudget,
      activeExamId: exam.id,
      examName: exam.examName,
      examDate: exam.examDate,
      dateGregorian: exam.dateGregorian,
      daysUntilExam: daysLeftVal,
      daysUntilExamSetAt: new Date().toISOString(),
      targetGoalText: exam.targetGoalText || examBudget.targetGoalText || 'تراز بالای ۶۸۰۰',
      syllabusDetails: exam.syllabusSummary || examBudget.syllabusDetails,
      selectedTopics: exam.selectedTopics?.length ? exam.selectedTopics : examBudget.selectedTopics,
      topicDetails: exam.topicDetails?.length ? exam.topicDetails : examBudget.topicDetails,
      totalTargetTests: exam.totalTargetTests || examBudget.totalTargetTests || 450,
      scheduledExams: scheduledExams,
    };

    onUpdateExamBudget(updatedBudget);
    setExtractSuccess(`آزمون «${exam.examName}» به عنوان آزمون هدف انتخاب شد. اطلاعات و مباحث آن برای چیدمان برنامه اعمال گردید!`);
  };

  const handleAddCustomExam = (newExam: ScheduledExam) => {
    const updated = [newExam, ...scheduledExams];
    setScheduledExams(updated);
    onUpdateExamBudget({
      ...examBudget,
      scheduledExams: updated,
    });
    setExtractSuccess(`آزمون جدید «${newExam.examName}» به تقویم آزمون‌ها افزوده شد.`);
  };

  const handleDeleteCustomExam = (examId: string) => {
    const updated = scheduledExams.filter(e => e.id !== examId);
    setScheduledExams(updated);
    onUpdateExamBudget({
      ...examBudget,
      scheduledExams: updated,
    });
  };

  const handleFileChange = (file: File) => {
    setExtractError(null);
    setExtractSuccess(null);

    const sizeInKB = Math.round(file.size / 1024);
    const sizeStr = sizeInKB > 1024 ? `${(sizeInKB / 1024).toFixed(1)} مگابایت` : `${sizeInKB} کیلوبایت`;
    const isImage = file.type.startsWith('image/');
    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');

    if (isImage || isPdf) {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result as string;
        setUploadedFile({
          name: file.name,
          size: sizeStr,
          type: isPdf ? 'application/pdf' : file.type,
          base64,
          previewUrl: isImage ? base64 : undefined,
        });
      };
      reader.readAsDataURL(file);
    } else {
      const reader = new FileReader();
      reader.onload = () => {
        const text = reader.result as string;
        setUploadedFile({
          name: file.name,
          size: sizeStr,
          type: file.type,
        });
        onUpdateExamBudget({
          ...examBudget,
          syllabusDetails: (examBudget.syllabusDetails ? examBudget.syllabusDetails + '\n' : '') + text.slice(0, 4000),
        });
        setExtractSuccess('متن فایل با موفقیت در بخش بودجه‌بندی قرار گرفت.');
      };
      reader.readAsText(file);
    }
  };

  const handleExtractWithAI = async () => {
    if (!uploadedFile || !uploadedFile.base64) {
      setExtractError('لطفاً ابتدا یک فایل تصویر یا پی‌دی‌اف انتخاب کنید.');
      return;
    }

    setIsExtracting(true);
    setExtractError(null);
    setExtractSuccess(null);

    try {
      const response = await fetch('/api/advisor/extract-exam-syllabus', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profile: {
            id: profile.id,
            name: profile.name,
            grade: profile.grade,
            fieldOfStudy: profile.fieldOfStudy,
          },
          fileBase64: uploadedFile.base64,
          mimeType: uploadedFile.type,
          fileName: uploadedFile.name,
        }),
      });

      if (!response.ok) {
        throw new Error('خطا در ارتباط با سرور هوش مصنوعی');
      }

      const data = await response.json();

      onUpdateExamBudget({
        ...examBudget,
        examName: data.examName || examBudget.examName || 'آزمون آزمایشی کنکور',
        examDate: data.examDate || examBudget.examDate || 'جمعه هفته دوم',
        daysUntilExam: typeof data.daysUntilExam === 'number' ? data.daysUntilExam : (examBudget.daysUntilExam || 12),
        daysUntilExamSetAt: new Date().toISOString(),
        targetGoalText: data.targetGoalText || examBudget.targetGoalText,
        syllabusDetails: data.syllabusDetails || examBudget.syllabusDetails,
        selectedTopics: Array.isArray(data.selectedTopics) && data.selectedTopics.length > 0 
          ? data.selectedTopics 
          : examBudget.selectedTopics,
        topicDetails: Array.isArray(data.topicDetails) && data.topicDetails.length > 0
          ? data.topicDetails
          : examBudget.topicDetails,
        totalTargetTests: typeof data.totalTargetTests === 'number'
          ? data.totalTargetTests
          : examBudget.totalTargetTests,
      });

      setExtractSuccess(`بودجه‌بندی آزمون با موفقیت توسط هوش مصنوعی استخراج شد! (${data.selectedTopics?.length || 0} مبحث تفکیک گردید)`);
    } catch (err: any) {
      console.warn("Extraction error:", err);
      setExtractError('استخراج با مشکل مواجه شد. لطفاً سرفصل‌ها را دستی در کادر پایین وارد کنید.');
    } finally {
      setIsExtracting(false);
    }
  };

  const handleAddTopicDetail = () => {
    if (!newTdSubject.trim() || !newTdChapter.trim()) return;
    const newTd: TopicExamDetail = {
      id: 'td-' + Date.now(),
      subject: newTdSubject,
      chapter: newTdChapter,
      subtopic: newTdSubtopic,
      pagesOrScope: newTdPagesOrScope.trim() || undefined,
      testTypes: newTdTestTypes.trim() || undefined,
      difficulty: newTdDifficulty,
      targetTestCount: newTdTargetTests,
      completedTestCount: 0,
      importanceWeight: newTdImportance,
      hasPrerequisiteInClass: true
    };
    const currentTds = examBudget.topicDetails || [];
    const updatedTds = [...currentTds, newTd];
    const totalTests = updatedTds.reduce((sum, item) => sum + item.targetTestCount, 0);

    onUpdateExamBudget({
      ...examBudget,
      topicDetails: updatedTds,
      totalTargetTests: totalTests
    });
    setShowAddTopicDetailForm(false);
  };

  const handleRemoveTopicDetail = (tdId: string) => {
    const currentTds = examBudget.topicDetails || [];
    const updatedTds = currentTds.filter(td => td.id !== tdId);
    const totalTests = updatedTds.reduce((sum, item) => sum + item.targetTestCount, 0);
    onUpdateExamBudget({
      ...examBudget,
      topicDetails: updatedTds,
      totalTargetTests: totalTests
    });
  };

  const handleGenerateExamSchedule = async () => {
    setIsGenerating(true);
    setGenerateError(null);
    setSuccessMessage(null);

    try {
      const response = await fetch('/api/advisor/generate-exam-schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profile,
          examBudget,
          stream: currentStream,
        }),
      });

      if (!response.ok) {
        throw new Error('خطا در تولید برنامه هفتگی آزمون');
      }

      const data = await response.json();
      if (data.schedule) {
        onApplyNewSchedule(data.schedule);
        setSuccessMessage('برنامه هفتگی اختصاصی بر اساس بودجه‌بندی آزمون با موفقیت تولید شد!');
        setTimeout(() => {
          onSwitchToScheduleTab();
        }, 1200);
      } else {
        throw new Error('قالب برنامه دریافت شده معتبر نیست.');
      }
    } catch (err: any) {
      console.error(err);
      setGenerateError(err.message || 'خطا در طراحی برنامه. لطفاً دوباره تلاش کنید.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* 1. Scheduled Exams Calendar & Targets */}
      <ScheduledExamsSection
        exams={scheduledExams}
        activeExamBudget={examBudget}
        profile={profile}
        currentStream={currentStream}
        onSelectActiveExam={handleSelectActiveExam}
        onAddCustomExam={handleAddCustomExam}
        onDeleteCustomExam={handleDeleteCustomExam}
        onGenerateScheduleForExam={handleGenerateExamSchedule}
        onUpdateExamBudget={onUpdateExamBudget}
        isGeneratingSchedule={isGenerating}
      />

      {/* 2. Upload & AI Scanner for Active Target Exam */}
      <div className="bg-white border border-stone-200 rounded-3xl p-5 sm:p-7 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-stone-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
              <FileUp className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-stone-900 flex items-center gap-2">
                <span>اسکن هوشمند بودجه‌بندی آزمون هدف</span>
                <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                  پردازش با AI
                </span>
              </h3>
              <p className="text-xs text-stone-500 mt-0.5">
                عکس جدول بودجه‌بندی ماز، قلم‌چی یا سنجش را آپلود کنید تا سرفصل‌ها و تست‌ها خودکار استخراج شوند.
              </p>
            </div>
          </div>
        </div>

        {/* Drag and Drop Zone */}
        <div className="mt-5">
          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragging(false);
              if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                handleFileChange(e.dataTransfer.files[0]);
              }
            }}
            className={`border-2 border-dashed rounded-2xl p-6 text-center transition-all cursor-pointer ${
              isDragging
                ? 'border-emerald-500 bg-emerald-50/50'
                : uploadedFile
                ? 'border-emerald-300 bg-stone-50/60'
                : 'border-stone-200 hover:border-emerald-400 bg-stone-50/30'
            }`}
          >
            {uploadedFile ? (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-stone-200 shadow-2xs">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold text-stone-900 truncate max-w-[220px]">
                      {uploadedFile.name}
                    </p>
                    <p className="text-[10px] text-stone-500">
                      حجم: {uploadedFile.size} • فرمت: {uploadedFile.type}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleExtractWithAI();
                    }}
                    disabled={isExtracting}
                    className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold flex items-center gap-1.5 transition disabled:opacity-50 cursor-pointer shadow-xs"
                  >
                    {isExtracting ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>در حال استخراج هوشمند...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>شروع استخراج هوشمند سرفصل‌ها</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setUploadedFile(null);
                    }}
                    className="p-2 text-stone-400 hover:text-rose-600 transition"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center mb-2.5">
                  <Upload className="w-6 h-6" />
                </div>
                <p className="text-xs sm:text-sm font-black text-stone-800 mb-1">
                  عکس یا فایل پی‌دی‌اف بودجه‌بندی آزمون را اینجا رها کنید یا کلیک نمایید
                </p>
                <p className="text-[11px] text-stone-500">
                  پشتیبانی از اسکرین‌شات جدول آزمون ماز، قلم‌چی و سنجش، فایل‌های PDF و متنی
                </p>
              </div>
            )}
          </div>
        </div>

        {extractSuccess && (
          <div className="mt-4 p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-medium flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{extractSuccess}</span>
          </div>
        )}

        {extractError && (
          <div className="mt-4 p-3.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-medium flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{extractError}</span>
          </div>
        )}

        {/* Target Exam Details Input */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-5 pt-5 border-t border-stone-100">
          <div>
            <label className="block text-xs font-bold text-stone-700 mb-1">نام آزمون آزمایشی:</label>
            <input
              type="text"
              value={examBudget.examName}
              onChange={(e) => onUpdateExamBudget({ ...examBudget, examName: e.target.value })}
              placeholder="مثال: آزمون آنلاین کشوری ماز"
              className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-stone-200 bg-stone-50 font-medium focus:bg-white"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-700 mb-1">تاریخ برگزاری آزمون:</label>
            <input
              type="text"
              value={examBudget.examDate}
              onChange={(e) => onUpdateExamBudget({ ...examBudget, examDate: e.target.value })}
              placeholder="مثال: جمعه ۲۷ شهریور ۱۴۰۵"
              className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-stone-200 bg-stone-50 font-medium focus:bg-white"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-700 mb-1">روزشمار زنده تا آزمون:</label>
            <input
              type="number"
              min={0}
              max={365}
              value={examBudget.daysUntilExam ?? (activeExamCountdown.daysLeft !== null ? activeExamCountdown.daysLeft : '')}
              onChange={(e) => {
                const raw = e.target.value;
                const parsed = raw === '' ? undefined : Math.max(0, parseInt(raw, 10) || 0);
                onUpdateExamBudget({
                  ...examBudget,
                  daysUntilExam: parsed,
                  daysUntilExamSetAt: parsed === undefined ? undefined : new Date().toISOString(),
                });
              }}
              className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-stone-200 bg-stone-50 font-black text-emerald-800 focus:bg-white"
            />
          </div>
        </div>

        <div className="mt-4">
          <label className="block text-xs font-bold text-stone-700 mb-1">
            خلاصه و جزئیات بودجه‌بندی استخراج‌شده یا دست‌نویس:
          </label>
          <textarea
            rows={2}
            value={examBudget.syllabusDetails}
            onChange={(e) => onUpdateExamBudget({ ...examBudget, syllabusDetails: e.target.value })}
            placeholder="مثال: زیست: گفتار ۱ و ۲ فصل ۱ دوازدهم؛ شیمی: ساختار اتم و جدول تناوبی دهم؛ ریاضی: تابع و نمودارها..."
            className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-stone-200 bg-stone-50 font-medium focus:bg-white"
          />
        </div>
      </div>

      {/* 3. TOPIC DIFFICULTY & TARGET TESTS BREAKDOWN */}
      <div className="bg-white rounded-3xl p-5 sm:p-7 border border-stone-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-stone-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
              <Gauge className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-black text-stone-900 flex items-center gap-2">
                <span>سرفصل‌ها، درجه سختی و تارگت تست مباحث آزمون</span>
                <span className="text-[11px] bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full font-bold">
                  {(examBudget.topicDetails || []).length} سرفصل • {examBudget.totalTargetTests || 450} تست
                </span>
              </h3>
              <p className="text-xs text-stone-500 mt-0.5">
                توزیع تست‌ها بر پایه درجه سختی برای تنظیم پارت‌های آموزشی، تست زمان‌دار و مرور فواصل ابینگهاوس.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowAddTopicDetailForm(!showAddTopicDetailForm)}
              className="px-3.5 py-2 rounded-xl bg-stone-900 text-white hover:bg-stone-800 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-xs"
            >
              <Plus className="w-3.5 h-3.5 text-emerald-400" />
              <span>{showAddTopicDetailForm ? 'بستن فرم' : 'افزودن مبحث جدید'}</span>
            </button>
          </div>
        </div>

        {/* Add Topic Detail Form */}
        {showAddTopicDetailForm && (
          <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200 space-y-3 animate-fadeIn">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-stone-700 mb-1">نام درس:</label>
                <input
                  type="text"
                  value={newTdSubject}
                  onChange={e => setNewTdSubject(e.target.value)}
                  placeholder="مثال: حسابان ۲ / زیست‌شناسی"
                  className="w-full text-xs px-3 py-2 rounded-xl border border-stone-200 bg-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-stone-700 mb-1">فصل کتاب:</label>
                <input
                  type="text"
                  value={newTdChapter}
                  onChange={e => setNewTdChapter(e.target.value)}
                  placeholder="مثال: کاربرد مشتق / گوارش"
                  className="w-full text-xs px-3 py-2 rounded-xl border border-stone-200 bg-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-stone-700 mb-1">زیرمبحث دقیق:</label>
                <input
                  type="text"
                  value={newTdSubtopic}
                  onChange={e => setNewTdSubtopic(e.target.value)}
                  placeholder="مثال: اکسترمم‌های نسبی و بهینه‌سازی"
                  className="w-full text-xs px-3 py-2 rounded-xl border border-stone-200 bg-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-stone-700 mb-1">درجه سختی:</label>
                <select
                  value={newTdDifficulty}
                  onChange={e => setNewTdDifficulty(e.target.value as any)}
                  className="w-full text-xs px-3 py-2 rounded-xl border border-stone-200 bg-white font-bold"
                >
                  <option value="بسیار چالشی و دام‌دار">بسیار چالشی و دام‌دار</option>
                  <option value="سخت">سخت</option>
                  <option value="متوسط">متوسط</option>
                  <option value="آسان و روان">آسان و روان</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-stone-700 mb-1">تعداد تست هدف هفته:</label>
                <input
                  type="number"
                  min="10"
                  max="300"
                  step="5"
                  value={newTdTargetTests}
                  onChange={e => setNewTdTargetTests(parseInt(e.target.value) || 100)}
                  className="w-full text-xs px-3 py-2 rounded-xl border border-stone-200 bg-white font-bold"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-stone-700 mb-1">اهمیت و ضریب آزمونی:</label>
                <select
                  value={newTdImportance}
                  onChange={e => setNewTdImportance(e.target.value as any)}
                  className="w-full text-xs px-3 py-2 rounded-xl border border-stone-200 bg-white font-bold"
                >
                  <option value="پرتکرار و حیاتی (تضمین درصد)">پرتکرار و حیاتی (تضمین درصد)</option>
                  <option value="متوسط">متوسط</option>
                  <option value="کم‌تکرار اما رتبه‌ساز">کم‌تکرار اما رتبه‌ساز</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={handleAddTopicDetail}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition shadow-xs"
              >
                ثبت سرفصل و سختی
              </button>
            </div>
          </div>
        )}

        {/* Topic Details List */}
        <div className="space-y-2.5">
          {(examBudget.topicDetails && examBudget.topicDetails.length > 0) ? (
            examBudget.topicDetails.map(td => {
              const diffColor = 
                td.difficulty === 'بسیار چالشی و دام‌دار' 
                  ? 'bg-rose-50 text-rose-700 border-rose-200' 
                  : td.difficulty === 'سخت'
                  ? 'bg-amber-50 text-amber-700 border-amber-200'
                  : 'bg-emerald-50 text-emerald-700 border-emerald-200';

              return (
                <div
                  key={td.id}
                  className="p-3.5 bg-stone-50/80 rounded-2xl border border-stone-200 text-xs space-y-2 hover:border-emerald-300 hover:bg-white transition-all shadow-2xs"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <strong className="text-stone-900 text-sm font-black">{td.subject} - {td.chapter}</strong>
                      <span className={`text-[10px] px-2 py-0.5 rounded-md border font-bold ${diffColor}`}>
                        {td.difficulty}
                      </span>
                      {td.importanceWeight && (
                        <span className="text-[10px] px-2 py-0.5 rounded-md bg-stone-100 text-stone-600 font-medium border border-stone-200">
                          {td.importanceWeight}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-auto">
                      <span className="font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                        🎯 {toPersianDigits(td.targetTestCount)} تست هدف
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveTopicDetail(td.id)}
                        className="text-stone-400 hover:text-rose-600 transition p-1"
                        title="حذف مبحث"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {td.subtopic && (
                    <div className="text-[11px] text-stone-700">
                      <strong className="text-emerald-900 font-bold">ریز مباحث:</strong> {td.subtopic}
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <p className="text-xs text-stone-400 py-4 text-center">
              سرفصلی با درجه سختی ثبت نشده است. می‌توانید با زدن دکمه «افزودن مبحث جدید» یا بارگذاری آزمون‌های آماده بالا، مباحث را وارد کنید.
            </p>
          )}
        </div>
      </div>

      {/* 4. Generation CTA Banner */}
      <div className="bg-gradient-to-r from-emerald-950 via-stone-900 to-emerald-950 text-white rounded-3xl p-6 sm:p-7 shadow-lg flex flex-col sm:flex-row items-center justify-between gap-5">
        <div className="space-y-1.5 text-right">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
            <h4 className="text-base font-black text-white">
              طراحی هوشمند برنامه مطالعاتی ۷ روزه بر پایه بودجه این آزمون
            </h4>
          </div>
          <p className="text-xs text-stone-300 max-w-xl leading-relaxed">
            هوش مصنوعی پارت‌های مطالعه، تست‌های آموزشی، تست‌های زمان‌دار و باکس‌های جبرانی را متناسب با درجه سختی هر درس و روزشمار آزمون در جدول هفتگی می‌چیند.
          </p>
        </div>

        <button
          onClick={handleGenerateExamSchedule}
          disabled={isGenerating}
          className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-stone-950 font-black text-xs sm:text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 whitespace-nowrap shrink-0"
        >
          {isGenerating ? (
            <>
              <div className="w-4 h-4 border-2 border-stone-950/30 border-t-stone-950 rounded-full animate-spin" />
              <span>در حال مهندسی برنامه علمی هفتگی...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              <span>تولید برنامه هفتگی متناسب با این بودجه‌بندی</span>
            </>
          )}
        </button>
      </div>

      {successMessage && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs font-bold flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {generateError && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl text-xs font-bold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{generateError}</span>
        </div>
      )}
    </div>
  );
};
