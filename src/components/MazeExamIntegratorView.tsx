import React, { useState } from 'react';
import { 
  Sparkles, 
  CheckCircle2, 
  AlertTriangle, 
  Brain, 
  Layers, 
  RefreshCw, 
  Send, 
  Zap, 
  HelpCircle, 
  BookOpen, 
  Target, 
  Plus, 
  Check, 
  RotateCcw, 
  ChevronRight, 
  Award, 
  FileText, 
  Upload, 
  ShieldCheck, 
  ExternalLink,
  Flame,
  ArrowLeft,
  Info,
  Trash2,
  ListFilter
} from 'lucide-react';
import { 
  StudentProfile, 
  MazeExamReport, 
  MazeWrongQuestion, 
  MazeTwinQuestion, 
  ExamErrorLog 
} from '../types';

interface MazeExamIntegratorViewProps {
  profile: StudentProfile;
  onAddErrorsToPostMortem: (errors: ExamErrorLog[]) => void;
  onAddRemedialBlockToSchedule?: (subject: string, topic: string) => void;
}

interface SubjectEntry {
  name: string;
  percent: number | '';
  wrongQuestions: string;
  unansweredQuestions?: string;
}

export const MazeExamIntegratorView: React.FC<MazeExamIntegratorViewProps> = ({
  profile,
  onAddErrorsToPostMortem,
  onAddRemedialBlockToSchedule,
}) => {
  const [activeTab, setActiveTab] = useState<'sync' | 'analysis' | 'twins'>('sync');
  const [entryMethod, setEntryMethod] = useState<'form' | 'upload' | 'paste'>('form');

  // Form Entry States
  const [customExamTitle, setCustomExamTitle] = useState('آزمون مرحله‌ای ماز');
  const [customExamDate, setCustomExamDate] = useState('۱۴۰۳/۱۲/۱۵');
  const [subjectsList, setSubjectsList] = useState<SubjectEntry[]>([
    { name: 'حسابان و ریاضیات', percent: 52, wrongQuestions: '14, 22, 28', unansweredQuestions: '3' },
    { name: 'فیزیک کنکور', percent: 64, wrongQuestions: '43, 56', unansweredQuestions: '2' },
    { name: 'شیمی کنکور', percent: 48, wrongQuestions: '74, 82', unansweredQuestions: '4' },
    { name: 'هندسه و گسسته', percent: 58, wrongQuestions: '91, 102', unansweredQuestions: '2' },
  ]);

  // Upload States
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [uploadedFileBase64, setUploadedFileBase64] = useState<string | null>(null);
  const [uploadedMimeType, setUploadedMimeType] = useState<string | null>(null);

  // Paste Text State
  const [rawExamText, setRawExamText] = useState('');

  // Processing & Results
  const [isLoadingReport, setIsLoadingReport] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);
  const [mazeReport, setMazeReport] = useState<MazeExamReport | null>(null);

  // Twin Questions States
  const [isGeneratingTwins, setIsGeneratingTwins] = useState(false);
  const [twinQuestions, setTwinQuestions] = useState<MazeTwinQuestion[]>([]);
  const [selectedOptions, setSelectedOptions] = useState<Record<string, number>>({});
  const [revealedSolutions, setRevealedSolutions] = useState<Record<string, boolean>>({});
  const [addedErrorsSuccess, setAddedErrorsSuccess] = useState(false);

  // Handle File Upload
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadedFileName(file.name);
    setUploadedMimeType(file.type || 'application/pdf');

    const reader = new FileReader();
    reader.onload = () => {
      setUploadedFileBase64(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Submit Exam for Deep Analysis
  const handleAnalyzeExam = async () => {
    setIsLoadingReport(true);
    setReportError(null);

    let payload: any = {
      examTitle: customExamTitle || 'آزمون ماز',
      profile,
    };

    if (entryMethod === 'form') {
      payload.structuredInputs = {
        examName: customExamTitle,
        examDate: customExamDate,
        subjects: subjectsList.map((s) => ({
          name: s.name,
          percent: Number(s.percent) || 0,
          wrongQuestions: s.wrongQuestions,
          unansweredQuestions: s.unansweredQuestions,
        })),
      };
    } else if (entryMethod === 'upload') {
      if (!uploadedFileBase64) {
        setReportError('لطفاً ابتدا فایل کارنامه ماز (PDF یا عکس) را انتخاب کنید.');
        setIsLoadingReport(false);
        return;
      }
      payload.fileBase64 = uploadedFileBase64;
      payload.mimeType = uploadedMimeType;
      payload.fileName = uploadedFileName;
    } else if (entryMethod === 'paste') {
      if (!rawExamText.trim()) {
        setReportError('لطفاً متن کارنامه یا شماره سوالات اشتباه ماز را وارد کنید.');
        setIsLoadingReport(false);
        return;
      }
      payload.examText = rawExamText;
    }

    try {
      const res = await fetch('/api/maze/analyze-exam', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.success && data.report) {
        setMazeReport(data.report);
        setActiveTab('analysis');
      } else {
        setReportError('خطا در دریافت یا پردازش کارنامه آزمون.');
      }
    } catch (err: any) {
      setReportError(`خطای ارتباط با سرور: ${err?.message || 'مشکل شبکه'}`);
    } finally {
      setIsLoadingReport(false);
    }
  };

  // 2. Generate Twin Questions based on Maze wrong questions
  const handleGenerateTwins = async (targetSubject?: string) => {
    if (!mazeReport || mazeReport.wrongQuestions.length === 0) {
      alert('ابتدا باید کارنامه آزمون را کالبدشکافی کنید.');
      return;
    }

    setIsGeneratingTwins(true);
    setActiveTab('twins');

    try {
      const questionsToUse = targetSubject
        ? mazeReport.wrongQuestions.filter((q) => q.subject.includes(targetSubject))
        : mazeReport.wrongQuestions;

      const res = await fetch('/api/maze/generate-twins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wrongQuestions: questionsToUse.length > 0 ? questionsToUse : mazeReport.wrongQuestions,
          subject: targetSubject,
          profile,
        }),
      });

      const data = await res.json();
      if (data.success && data.twinQuestions) {
        setTwinQuestions(data.twinQuestions);
        setSelectedOptions({});
        setRevealedSolutions({});
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsGeneratingTwins(false);
    }
  };

  // 3. Transfer all wrong questions to Exam Post-Mortem Notebook
  const handleTransferAllToPostMortem = () => {
    if (!mazeReport || mazeReport.wrongQuestions.length === 0) return;

    const newErrors: ExamErrorLog[] = mazeReport.wrongQuestions.map((wq) => ({
      id: `err-maze-${Date.now()}-${wq.id}`,
      examName: mazeReport.examTitle,
      date: mazeReport.examDate,
      subject: wq.subject,
      topic: wq.topic,
      questionNumber: String(wq.questionNumber),
      errorCategory: wq.errorCategory,
      description: `سوال آزمون ماز: ${wq.questionSummary}\nپاسخ داوطلب: ${wq.studentAnswer || 'غلط'} | پاسخ درست: ${wq.correctAnswer || 'گزینه درست'}`,
      learnedLesson: `دام طراح ماز: ${wq.trapExplanation}`,
      actionPlan: `مرور مفهومی کتاب: ${wq.lessonConcept}`,
      isResolved: false,
    }));

    onAddErrorsToPostMortem(newErrors);
    setAddedErrorsSuccess(true);
    setTimeout(() => setAddedErrorsSuccess(false), 3000);
  };

  const handleOptionSelect = (qId: string, optIndex: number) => {
    setSelectedOptions((prev) => ({ ...prev, [qId]: optIndex }));
    setRevealedSolutions((prev) => ({ ...prev, [qId]: true }));
  };

  // Add new subject row in form
  const handleAddSubjectRow = () => {
    setSubjectsList((prev) => [
      ...prev,
      { name: 'درس جدید', percent: 50, wrongQuestions: '', unansweredQuestions: '' },
    ]);
  };

  const handleRemoveSubjectRow = (idx: number) => {
    setSubjectsList((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSubjectChange = (idx: number, field: keyof SubjectEntry, val: any) => {
    setSubjectsList((prev) => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], [field]: val };
      return copy;
    });
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-l from-emerald-950 via-stone-900 to-stone-900 text-white rounded-3xl p-6 sm:p-7 shadow-xs border border-emerald-900/40">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold border border-emerald-500/30">
              <Zap className="w-3.5 h-3.5 text-emerald-400" />
              کالبدشکافی آزمون‌های ماز (Biomaze) و آزمون آنلاین تست‌های مشابه
            </div>
            <h2 className="text-lg sm:text-xl font-bold tracking-tight">
              تحلیل دقیق آزمون واقعی شما در ماز و تولید سوالات دوقلو
            </h2>
            <p className="text-stone-300 text-xs sm:text-sm leading-relaxed">
              کارنامه و درصدها یا فایل کارنامه آزمون ماز خود را ثبت کنید تا هوش مصنوعی تک‌تک سوالات اشتباه، دام‌های مفهومی طراحان ماز و مباحث نیازمند مرور را استخراج کرده و <strong>«تست‌های مشابه و دوقلو»</strong> برای تثبیت به شما ارائه دهد.
            </p>
          </div>

          <div className="flex flex-col gap-2 shrink-0">
            {mazeReport ? (
              <div className="bg-emerald-900/40 border border-emerald-600/50 p-3.5 rounded-2xl text-xs space-y-1">
                <div className="text-emerald-300 font-bold flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  کارنامه ماز تحلیل شد
                </div>
                <div className="text-[11px] text-stone-300">{mazeReport.examTitle}</div>
                <div className="text-xs font-bold text-white pt-1">
                  میانگین کل: {mazeReport.totalPercent}٪ ({mazeReport.wrongQuestions.length} سوال اشتباه شناسایی شد)
                </div>
              </div>
            ) : (
              <div className="bg-stone-800/80 border border-stone-700 p-3.5 rounded-2xl text-xs space-y-1 text-stone-300">
                <div className="text-amber-400 font-semibold flex items-center gap-1.5">
                  <Info className="w-4 h-4 text-amber-400" />
                  در انتظار ثبت آزمون شما
                </div>
                <div className="text-[11px] text-stone-400">آزمون خود را از فرم زیر وارد یا آپلود کنید</div>
              </div>
            )}
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex flex-wrap gap-2 mt-5 pt-4 border-t border-stone-800">
          <button
            onClick={() => setActiveTab('sync')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
              activeTab === 'sync'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-stone-800 hover:bg-stone-700 text-stone-300'
            }`}
          >
            <FileText className="w-3.5 h-3.5 text-amber-400" />
            <span>۱. ثبت کارنامه آزمون ماز شما</span>
          </button>

          <button
            onClick={() => setActiveTab('analysis')}
            disabled={!mazeReport}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer disabled:opacity-40 ${
              activeTab === 'analysis'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-stone-800 hover:bg-stone-700 text-stone-300'
            }`}
          >
            <Brain className="w-3.5 h-3.5 text-emerald-400" />
            <span>۲. کالبدشکافی غلط‌ها و دام‌های ماز</span>
            {mazeReport && (
              <span className="bg-emerald-500/30 text-emerald-200 px-1.5 py-0.5 rounded-md text-[10px]">
                {mazeReport.wrongQuestions.length} غلط
              </span>
            )}
          </button>

          <button
            onClick={() => {
              if (twinQuestions.length === 0 && mazeReport) {
                handleGenerateTwins();
              } else {
                setActiveTab('twins');
              }
            }}
            disabled={!mazeReport}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer disabled:opacity-40 ${
              activeTab === 'twins'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-stone-800 hover:bg-stone-700 text-stone-300'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>۳. آزمون آنلاین سوالات مشابه و دوقلو</span>
            {twinQuestions.length > 0 && (
              <span className="bg-amber-400/20 text-amber-200 px-1.5 py-0.5 rounded-md text-[10px]">
                {twinQuestions.length} تست آماده
              </span>
            )}
          </button>
        </div>
      </div>

      {/* TAB 1: ENTER REAL MAZE EXAM */}
      {activeTab === 'sync' && (
        <div className="space-y-6">
          {/* Transparency Callout about Biomaze Auth */}
          <div className="bg-amber-50/90 border border-amber-200/80 rounded-2xl p-4 sm:p-5 text-xs text-amber-950 leading-relaxed flex flex-col sm:flex-row sm:items-start gap-3.5">
            <div className="w-8 h-8 rounded-xl bg-amber-200 text-amber-900 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-4 h-4 text-amber-800" />
            </div>
            <div className="space-y-1">
              <span className="font-bold text-amber-900 block text-xs sm:text-sm">
                نحوه ارتباط و دریافت کارنامه ماز (biomaze.ir):
              </span>
              <p className="text-amber-900/90 text-xs">
                سامانه ماز به دلیل نیاز به پیامک رمز یک‌بارمصرف (SMS OTP) به شماره همراه شخصی شما، امکان ورود مستقیم و بی‌واسطه ربات از راه دور را ندارد. برای اینکه دقیقاً <strong>آزمون واقعی شما</strong> تحلیل شود و اطلاعات ساختگی نبینید، یکی از سه روش آسان زیر را انتخاب کنید:
              </p>
            </div>
          </div>

          {/* Selection of input methods */}
          <div className="flex flex-wrap gap-2 border-b border-stone-200 pb-3">
            <button
              onClick={() => setEntryMethod('form')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                entryMethod === 'form'
                  ? 'bg-stone-900 text-white shadow-xs'
                  : 'bg-stone-100 hover:bg-stone-200 text-stone-700'
              }`}
            >
              <ListFilter className="w-3.5 h-3.5" />
              <span>روش ۱: ثبت سریع درصدها و شماره سوالات غلط (پیشنهادی)</span>
            </button>

            <button
              onClick={() => setEntryMethod('upload')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                entryMethod === 'upload'
                  ? 'bg-stone-900 text-white shadow-xs'
                  : 'bg-stone-100 hover:bg-stone-200 text-stone-700'
              }`}
            >
              <Upload className="w-3.5 h-3.5" />
              <span>روش ۲: آپلود فایل کارنامه ماز (PDF یا اسکرین‌شات)</span>
            </button>

            <button
              onClick={() => setEntryMethod('paste')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                entryMethod === 'paste'
                  ? 'bg-stone-900 text-white shadow-xs'
                  : 'bg-stone-100 hover:bg-stone-200 text-stone-700'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>روش ۳: الصاق (Paste) متن کارنامه یا کلید آزمون</span>
            </button>
          </div>

          {/* METHOD 1: FORM INPUT */}
          {entryMethod === 'form' && (
            <div className="bg-white rounded-3xl p-6 border border-stone-200 shadow-xs space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-4 border-b border-stone-100">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-stone-800">
                    نام آزمونی که در ماز شرکت کردید:
                  </label>
                  <input
                    type="text"
                    value={customExamTitle}
                    onChange={(e) => setCustomExamTitle(e.target.value)}
                    placeholder="مثال: آزمون مرحله ۱۵ ماز یا آزمون جامع ۲۴ اسفند"
                    className="w-full px-3 py-2 text-xs bg-stone-50 border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-stone-800">
                    تاریخ آزمون:
                  </label>
                  <input
                    type="text"
                    value={customExamDate}
                    onChange={(e) => setCustomExamDate(e.target.value)}
                    placeholder="۱۴۰۳/۱۲/۱۵"
                    className="w-full px-3 py-2 text-xs bg-stone-50 border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                  />
                </div>
              </div>

              {/* Table of subjects & wrong questions */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-stone-900">
                    درصدها و شماره سوالات اشتباه در هر درس:
                  </span>
                  <button
                    type="button"
                    onClick={handleAddSubjectRow}
                    className="text-xs text-emerald-700 hover:text-emerald-800 font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>افزودن درس دیگر</span>
                  </button>
                </div>

                <div className="space-y-2.5">
                  {subjectsList.map((sub, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200 grid grid-cols-1 sm:grid-cols-12 gap-3 items-center"
                    >
                      <div className="sm:col-span-3">
                        <label className="block text-[10px] text-stone-500 font-bold mb-1">نام درس</label>
                        <input
                          type="text"
                          value={sub.name}
                          onChange={(e) => handleSubjectChange(idx, 'name', e.target.value)}
                          className="w-full px-2.5 py-1.5 text-xs bg-white border border-stone-300 rounded-lg font-bold text-stone-900"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <label className="block text-[10px] text-stone-500 font-bold mb-1">درصد (٪)</label>
                        <input
                          type="number"
                          value={sub.percent}
                          onChange={(e) => handleSubjectChange(idx, 'percent', e.target.value)}
                          className="w-full px-2.5 py-1.5 text-xs bg-white border border-stone-300 rounded-lg font-mono text-center font-bold text-emerald-700"
                          placeholder="مثلاً ۵۲"
                        />
                      </div>

                      <div className="sm:col-span-5">
                        <label className="block text-[10px] text-stone-500 font-bold mb-1">
                          شماره سوالات غلط در ماز (با کاما جدا کنید):
                        </label>
                        <input
                          type="text"
                          value={sub.wrongQuestions}
                          onChange={(e) => handleSubjectChange(idx, 'wrongQuestions', e.target.value)}
                          placeholder="مثال: ۱۴، ۲۲، ۲۹"
                          className="w-full px-2.5 py-1.5 text-xs bg-white border border-stone-300 rounded-lg text-stone-800 font-mono"
                        />
                      </div>

                      <div className="sm:col-span-2 flex items-center justify-end gap-2 pt-2 sm:pt-4">
                        <button
                          type="button"
                          onClick={() => handleRemoveSubjectRow(idx)}
                          className="p-1.5 text-stone-400 hover:text-rose-600 rounded-lg transition cursor-pointer"
                          title="حذف درس"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <button
                onClick={handleAnalyzeExam}
                disabled={isLoadingReport}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-xs transition flex items-center justify-center gap-2 cursor-pointer mt-4"
              >
                {isLoadingReport ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>در حال کالبدشکافی سوالات اشتباه و دام‌های ماز با هوش مصنوعی...</span>
                  </>
                ) : (
                  <>
                    <Brain className="w-4 h-4" />
                    <span>کالبدشکافی این آزمون ماز و استخراج دام‌های تستی</span>
                  </>
                )}
              </button>
            </div>
          )}

          {/* METHOD 2: UPLOAD FILE */}
          {entryMethod === 'upload' && (
            <div className="bg-white rounded-3xl p-6 border border-stone-200 shadow-xs space-y-5">
              <div className="space-y-2">
                <h3 className="font-bold text-stone-900 text-sm">آپلود مستقیم فایل کارنامه ماز (PDF یا عکس)</h3>
                <p className="text-xs text-stone-500 leading-relaxed">
                  می‌توانید فایل PDF کارنامه، اسکرین‌شات جدول درصدها یا تصویر پاسخ‌برگ آزمون ماز خود را آپلود کنید. هوش مصنوعی مستقیماً متن و درصدهای کارنامه را می‌خواند.
                </p>
              </div>

              <div className="border-2 border-dashed border-stone-300 hover:border-emerald-500 rounded-2xl p-8 text-center bg-stone-50/60 transition cursor-pointer">
                <input
                  type="file"
                  id="maze-file-upload"
                  accept="application/pdf,image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <label htmlFor="maze-file-upload" className="cursor-pointer block space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
                    <Upload className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-stone-900 block">
                      برای انتخاب فایل کارنامه کلیک کنید یا فایل را اینجا رها کنید
                    </span>
                    <span className="text-[11px] text-stone-500">پشتیبانی از فایل‌های PDF، اسکرین‌شات و عکس (JPG, PNG)</span>
                  </div>
                  {uploadedFileName && (
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 border border-emerald-300 rounded-xl text-xs text-emerald-800 font-bold">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      فایل انتخاب شد: {uploadedFileName}
                    </div>
                  )}
                </label>
              </div>

              <button
                onClick={handleAnalyzeExam}
                disabled={isLoadingReport || !uploadedFileBase64}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-xs transition flex items-center justify-center gap-2 cursor-pointer"
              >
                {isLoadingReport ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>در حال خواندن فایل کارنامه و استخراج دام‌های ماز...</span>
                  </>
                ) : (
                  <>
                    <Brain className="w-4 h-4" />
                    <span>پردازش و کالبدشکافی این فایل کارنامه ماز</span>
                  </>
                )}
              </button>
            </div>
          )}

          {/* METHOD 3: PASTE TEXT */}
          {entryMethod === 'paste' && (
            <div className="bg-white rounded-3xl p-6 border border-stone-200 shadow-xs space-y-5">
              <div className="space-y-2">
                <h3 className="font-bold text-stone-900 text-sm">الصاق متن کارنامه یا شماره سوالات اشتباه</h3>
                <p className="text-xs text-stone-500">
                  متن گزارش کارنامه ماز، پیامک نتایج، یا شماره سوالات غلط خود را در کادر زیر قرار دهید:
                </p>
              </div>

              <textarea
                rows={6}
                value={rawExamText}
                onChange={(e) => setRawExamText(e.target.value)}
                placeholder="مثال:&#10;آزمون جامع ماز ۲۴ اسفند:&#10;حسابان: درصد ۵۵٪ - سوالات غلط: ۱۲، ۱۸، ۲۴&#10;فیزیک: درصد ۶۰٪ - سوالات غلط: ۳۸، ۴۴&#10;شیمی: درصد ۵۰٪ - سوالات غلط: ۶۵، ۷۱"
                className="w-full p-3.5 text-xs bg-stone-50 border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 leading-relaxed font-mono"
              />

              <button
                onClick={handleAnalyzeExam}
                disabled={isLoadingReport || !rawExamText.trim()}
                className="w-full py-3 bg-stone-900 hover:bg-stone-800 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer"
              >
                {isLoadingReport ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>در حال پردازش گزارش آزمون...</span>
                  </>
                ) : (
                  <>
                    <Brain className="w-4 h-4" />
                    <span>کالبدشکافی متن کارنامه با هوش مصنوعی</span>
                  </>
                )}
              </button>
            </div>
          )}

          {reportError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{reportError}</span>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: EXAM WRONG QUESTIONS ANALYSIS */}
      {activeTab === 'analysis' && mazeReport && (
        <div className="space-y-6">
          {/* Top Diagnostics Overview */}
          <div className="bg-white rounded-3xl p-6 border border-stone-200 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-stone-100">
              <div>
                <h3 className="font-bold text-stone-900 text-base">{mazeReport.examTitle}</h3>
                <p className="text-xs text-stone-500">تاریخ آزمون: {mazeReport.examDate} • میانگین درصد: {mazeReport.totalPercent}٪</p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleTransferAllToPostMortem}
                  className="px-3.5 py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                  title="انتقال همه این اشتباهات به دفترچه کالبدشکافی آزمون"
                >
                  {addedErrorsSuccess ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Plus className="w-3.5 h-3.5" />}
                  <span>{addedErrorsSuccess ? 'انتقال یافت ✓' : 'انتقال به دفترچه کالبدشکافی'}</span>
                </button>

                <button
                  onClick={() => handleGenerateTwins()}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-xs"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>تولید سوالات مشابه از روی این غلط‌ها</span>
                </button>
              </div>
            </div>

            {/* Subject Percentage Chips */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {mazeReport.subjectsSummary.map((sub, i) => (
                <div key={i} className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-stone-800">{sub.subject}</span>
                    <span className="text-xs font-bold text-emerald-700">{sub.percentage}٪</span>
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-stone-500">
                    <span>درست: {sub.correctCount}</span>
                    <span className="text-rose-600 font-bold">غلط: {sub.wrongCount}</span>
                    <span>نزده: {sub.unansweredCount}</span>
                  </div>
                  <div className="w-full bg-stone-200 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-emerald-600 h-1.5 rounded-full"
                      style={{ width: `${Math.min(100, Math.max(0, sub.percentage))}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* AI Diagnosis Summary */}
            <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200 text-xs text-amber-950 leading-relaxed space-y-1.5">
              <div className="font-bold flex items-center gap-2 text-amber-900">
                <Brain className="w-4 h-4 text-amber-700" />
                تحلیل جامع مشاور از نتایج آزمون ماز:
              </div>
              <p>{mazeReport.overallDiagnosis}</p>
            </div>
          </div>

          {/* List of Wrong Questions with Deep Maze Traps */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-stone-900 text-sm flex items-center gap-2">
                <span>لیست سوالات اشتباه شما در آزمون و کالبدشکافی دام‌ها:</span>
                <span className="text-xs bg-rose-100 text-rose-800 font-semibold px-2 py-0.5 rounded-full">
                  {mazeReport.wrongQuestions.length} سوال
                </span>
              </h4>
              <span className="text-xs text-stone-500 hidden sm:inline">
                روی «تولید تست مشابه» کلیک کنید تا سوال دوقلوی همان مبحث را حل کنید
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {mazeReport.wrongQuestions.map((wq) => (
                <div
                  key={wq.id}
                  className="bg-white rounded-3xl p-5 border border-stone-200 shadow-xs flex flex-col justify-between space-y-3"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-lg bg-stone-900 text-white text-[11px] font-bold flex items-center justify-center">
                          {wq.questionNumber}
                        </span>
                        <span className="text-xs font-bold text-stone-900">{wq.subject}</span>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 font-semibold">
                        {wq.topic}
                      </span>
                    </div>

                    {/* Question summary */}
                    <p className="text-xs text-stone-700 leading-normal font-medium bg-stone-50 p-2.5 rounded-xl border border-stone-150">
                      {wq.questionSummary}
                    </p>

                    {/* The Maze Trap Explained */}
                    <div className="space-y-1 text-xs text-stone-600">
                      <div className="text-[11px] font-bold text-amber-800 flex items-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                        دامی که طراح ماز گذاشته بود:
                      </div>
                      <p className="text-[11px] leading-relaxed text-stone-600 pr-4">
                        {wq.trapExplanation}
                      </p>
                    </div>

                    {/* Scientific Remedial Concept */}
                    <div className="space-y-1 text-xs text-stone-600">
                      <div className="text-[11px] font-bold text-emerald-800 flex items-center gap-1">
                        <BookOpen className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        مفهوم و راهکار کتاب درسی برای رفع مشکل:
                      </div>
                      <p className="text-[11px] leading-relaxed text-stone-600 pr-4">
                        {wq.lessonConcept}
                      </p>
                    </div>
                  </div>

                  {/* Actions for this specific wrong question */}
                  <div className="pt-2 border-t border-stone-100 flex items-center justify-between gap-2">
                    <button
                      onClick={() => handleGenerateTwins(wq.subject)}
                      className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg text-xs font-bold flex items-center gap-1 transition cursor-pointer"
                    >
                      <Sparkles className="w-3 h-3 text-emerald-600" />
                      <span>تولید تست مشابه این سوال</span>
                    </button>

                    {onAddRemedialBlockToSchedule && (
                      <button
                        onClick={() => {
                          onAddRemedialBlockToSchedule(wq.subject, wq.topic);
                          alert(`پارت جبرانی مبحث «${wq.topic}» به برنامه هفتگی اضافه شد.`);
                        }}
                        className="text-[11px] text-stone-500 hover:text-stone-800 font-semibold cursor-pointer underline"
                      >
                        + پارت جبرانی در برنامه
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: TWIN QUESTIONS QUIZ */}
      {activeTab === 'twins' && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl p-6 border border-stone-200 shadow-xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-bold text-stone-900 text-base flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-emerald-600" />
                  آزمون آنلاین تست‌های مشابه و دوقلو (الهام‌گرفته از دام‌های آزمون ماز)
                </h3>
                <p className="text-xs text-stone-500">
                  این تست‌ها بر پایه دقیقاً همان مباحثی که در آزمون اشتباه کردید طراحی شده‌اند تا نقطه‌ضعف‌تان برای کنکور کاملاً ریشه‌کن شود.
                </p>
              </div>

              <button
                onClick={() => handleGenerateTwins()}
                disabled={isGeneratingTwins}
                className="px-4 py-2 bg-stone-900 hover:bg-stone-800 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shrink-0"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isGeneratingTwins ? 'animate-spin' : ''}`} />
                <span>تولید تست‌های مشابه جدید</span>
              </button>
            </div>
          </div>

          {/* Loading Indicator */}
          {isGeneratingTwins && (
            <div className="bg-white rounded-3xl p-12 text-center border border-stone-200 shadow-xs space-y-3">
              <div className="w-10 h-10 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto" />
              <div className="text-sm font-bold text-stone-800">طراح هوش مصنوعی در حال ساخت سوالات مشابه و دوقلو است...</div>
              <p className="text-xs text-stone-500">استخراج ایده‌های دام‌دار آزمون ماز و تبدیل به تست‌های تالیفی استاندارد کنکور</p>
            </div>
          )}

          {/* Twin Questions Cards */}
          {!isGeneratingTwins && twinQuestions.length > 0 && (
            <div className="space-y-5">
              {twinQuestions.map((tq, qIdx) => {
                const userSelected = selectedOptions[tq.id];
                const isRevealed = revealedSolutions[tq.id];
                const isCorrect = userSelected === tq.correctIndex;
                const isTrapSelected = tq.trapIndex !== undefined && userSelected === tq.trapIndex;

                return (
                  <div
                    key={tq.id}
                    className="bg-white rounded-3xl p-6 border border-stone-200 shadow-xs space-y-4"
                  >
                    {/* Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-stone-100">
                      <div className="flex items-center gap-2">
                        <span className="w-7 h-7 rounded-xl bg-emerald-600 text-white text-xs font-black flex items-center justify-center">
                          {qIdx + 1}
                        </span>
                        <span className="text-xs font-bold text-stone-900">{tq.subject}</span>
                        <span className="text-stone-300">•</span>
                        <span className="text-xs text-stone-600">{tq.topic}</span>
                      </div>

                      {tq.originalMazeQuestionNumber && (
                        <span className="text-[11px] bg-amber-50 text-amber-800 border border-amber-200 px-2.5 py-0.5 rounded-full font-semibold">
                          مشابه سوال {tq.originalMazeQuestionNumber} آزمون ماز
                        </span>
                      )}
                    </div>

                    {/* Question Text */}
                    <p className="text-xs sm:text-sm font-semibold text-stone-900 leading-relaxed bg-stone-50/70 p-4 rounded-2xl border border-stone-200">
                      {tq.questionText}
                    </p>

                    {/* Options Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {tq.options.map((opt, optIndex) => {
                        let btnStyle = 'border-stone-200 bg-white hover:bg-stone-50 text-stone-800';

                        if (isRevealed) {
                          if (optIndex === tq.correctIndex) {
                            btnStyle = 'border-emerald-500 bg-emerald-50 text-emerald-900 font-bold ring-2 ring-emerald-500/20';
                          } else if (optIndex === userSelected) {
                            btnStyle = 'border-rose-500 bg-rose-50 text-rose-900 font-bold';
                          }
                        } else if (userSelected === optIndex) {
                          btnStyle = 'border-stone-900 bg-stone-900 text-white font-bold';
                        }

                        return (
                          <button
                            key={optIndex}
                            type="button"
                            onClick={() => handleOptionSelect(tq.id, optIndex)}
                            className={`p-3 rounded-xl border text-right text-xs transition cursor-pointer flex items-center justify-between ${btnStyle}`}
                          >
                            <span className="flex items-center gap-2">
                              <span className="font-mono font-bold text-[11px] opacity-70">
                                {optIndex + 1})
                              </span>
                              <span>{opt}</span>
                            </span>

                            {isRevealed && optIndex === tq.correctIndex && (
                              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                            )}
                          </button>
                        );
                      })}
                    </div>

                    {/* Immediate Trap or Success Feedback */}
                    {isRevealed && (
                      <div className="space-y-3 pt-2">
                        {isCorrect ? (
                          <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 font-semibold flex items-center gap-2">
                            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                            <span>آفرین! پاسخ صحیح است. دامی که در آزمون ماز افتاده بودید را با موفقیت پشت سر گذاشتید! 🎉</span>
                          </div>
                        ) : isTrapSelected ? (
                          <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-300 text-xs text-amber-950 font-semibold flex items-center gap-2">
                            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                            <span>دام آزمون ماز دوباره تکرار شد! شما گزینه‌ای را انتخاب کردید که دقیقاً دام طراح است. پاسخنامه زیر را به دقت مطالعه کنید:</span>
                          </div>
                        ) : (
                          <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-900 font-semibold flex items-center gap-2">
                            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
                            <span>پاسخ اشتباه بود. گزینه {tq.correctIndex + 1} پاسخ صحیح است. حل تشریحی زیر را بخوانید:</span>
                          </div>
                        )}

                        {/* Detailed Solution */}
                        <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 space-y-2 text-xs leading-relaxed text-stone-800">
                          <div className="font-bold text-stone-900 flex items-center gap-1.5">
                            <BookOpen className="w-4 h-4 text-emerald-600" />
                            <span>حل تشریحی گام‌به‌گام و دلیل رد سایر گزینه‌ها:</span>
                          </div>
                          <div className="whitespace-pre-wrap font-sans text-stone-700 pr-3">
                            {tq.detailedSolution}
                          </div>

                          {tq.keyTakeaway && (
                            <div className="mt-2 p-2.5 bg-emerald-50/80 rounded-xl border border-emerald-200 text-emerald-950 font-bold flex items-center gap-2">
                              <Award className="w-4 h-4 text-emerald-700 shrink-0" />
                              <span>نکته طلایی برای کنکور: {tq.keyTakeaway}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {!isGeneratingTwins && twinQuestions.length === 0 && (
            <div className="bg-white rounded-3xl p-8 text-center border border-stone-200 shadow-xs space-y-3">
              <Sparkles className="w-8 h-8 text-stone-400 mx-auto" />
              <div className="text-sm font-bold text-stone-800">هنوز سوال مشابه‌ای تولید نشده است</div>
              <p className="text-xs text-stone-500">روی دکمه زیر کلیک کنید تا هوش مصنوعی از روی غلط‌های آزمون برای شما تست بسازد</p>
              <button
                onClick={() => handleGenerateTwins()}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold cursor-pointer"
              >
                تولید مجموعه سوالات مشابه
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
