import React, { useState, useRef } from 'react';
import { 
  School, 
  Plus, 
  Trash2, 
  FileUp, 
  MessageSquare, 
  Sparkles, 
  Clock, 
  Calendar, 
  BookOpen, 
  CheckCircle, 
  AlertCircle, 
  RefreshCw, 
  X, 
  Upload, 
  FileText, 
  Send, 
  Layers, 
  Check,
  ChevronRight,
  ArrowRight,
  Info
} from 'lucide-react';
import { StudentProfile, ExamBudget, WeeklyClass } from '../types';

interface WeeklyClassesSectionProps {
  profile: StudentProfile;
  examBudget: ExamBudget;
  onUpdateExamBudget: (budget: ExamBudget) => void;
  onSwitchToScheduleTab?: () => void;
}

const WEEK_DAYS = ['شنبه', 'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنج‌شنبه', 'جمعه'];

export const WeeklyClassesSection: React.FC<WeeklyClassesSectionProps> = ({
  profile,
  examBudget,
  onUpdateExamBudget,
  onSwitchToScheduleTab,
}) => {
  const [activeDayFilter, setActiveDayFilter] = useState<string>('all');
  const [showAddClassForm, setShowAddClassForm] = useState<boolean>(false);
  const [showClassUploadZone, setShowClassUploadZone] = useState<boolean>(false);
  const [showClassChatAssistant, setShowClassChatAssistant] = useState<boolean>(false);

  // Manual Class Form State
  const [newClassDay, setNewClassDay] = useState<string>('شنبه');
  const [newClassSubject, setNewClassSubject] = useState<string>('');
  const [newClassTeacher, setNewClassTeacher] = useState<string>('');
  const [newClassStart, setNewClassStart] = useState<string>('۱۷:۰۰');
  const [newClassEnd, setNewClassEnd] = useState<string>('۱۹:۳۰');
  const [newClassType, setNewClassType] = useState<'online' | 'in_person'>('online');
  const [newClassPostHours, setNewClassPostHours] = useState<number>(1.5);

  // File Upload State
  const [isExtractingClasses, setIsExtractingClasses] = useState<boolean>(false);
  const [classesExtractError, setClassesExtractError] = useState<string | null>(null);
  const [classesExtractSuccess, setClassesExtractSuccess] = useState<string | null>(null);
  const [uploadedClassFile, setUploadedClassFile] = useState<{
    name: string;
    size: string;
    type: string;
    base64?: string;
    previewUrl?: string;
    rawText?: string;
  } | null>(null);
  const [isDraggingClassFile, setIsDraggingClassFile] = useState<boolean>(false);
  const [pastedClassText, setPastedClassText] = useState<string>('');
  const classFileInputRef = useRef<HTMLInputElement>(null);

  // AI Chat Assistant State
  const [classChatPrompt, setClassChatPrompt] = useState<string>('');
  const [isClassChatting, setIsClassChatting] = useState<boolean>(false);
  const [classChatHistory, setClassChatHistory] = useState<Array<{ sender: 'user' | 'ai'; text: string; time: string }>>([
    {
      sender: 'ai',
      text: 'سلام! می‌توانید به زبان خودمانی بگویید چه کلاسی اضافه، حذف، یا ساعت آن جابجا شود (مثلاً: «کلاس فیزیک سه‌شنبه‌ها رو بکن ۱۸ تا ۲۰» یا «یکشنبه‌ها کلاس حسابان آنلاین با ۱.۵ ساعت تکلیف اضافه کن»).',
      time: 'اکنون'
    }
  ]);

  const weeklyClasses = examBudget.weeklyClasses || [];

  // Calculation of class statistics
  const totalClassesCount = weeklyClasses.length;
  const totalWeeklyClassHours = weeklyClasses.reduce((acc, c) => {
    try {
      const [sh, sm] = c.startTime.split(':').map(Number);
      const [eh, em] = c.endTime.split(':').map(Number);
      if (!isNaN(sh) && !isNaN(eh)) {
        const startMin = sh * 60 + (sm || 0);
        const endMin = eh * 60 + (em || 0);
        const diff = Math.max(0, endMin - startMin) / 60;
        return acc + diff;
      }
    } catch {}
    return acc + 2; // fallback 2 hours
  }, 0);

  const totalHomeworkHours = weeklyClasses.reduce((acc, c) => acc + (c.postClassStudyHoursNeeded || 1.5), 0);

  const handleAddWeeklyClass = () => {
    if (!newClassSubject.trim()) return;
    const newClass: WeeklyClass = {
      id: 'cls-' + Date.now(),
      dayName: newClassDay,
      startTime: newClassStart,
      endTime: newClassEnd,
      subject: newClassSubject.trim(),
      teacherOrInstitute: newClassTeacher.trim() || 'نامشخص',
      locationOrType: newClassType,
      postClassStudyHoursNeeded: newClassPostHours
    };
    const updated = [...weeklyClasses, newClass];
    onUpdateExamBudget({
      ...examBudget,
      weeklyClasses: updated
    });
    setNewClassSubject('');
    setNewClassTeacher('');
    setShowAddClassForm(false);
  };

  const handleRemoveWeeklyClass = (classId: string) => {
    const updated = weeklyClasses.filter(c => c.id !== classId);
    onUpdateExamBudget({
      ...examBudget,
      weeklyClasses: updated
    });
  };

  // Handle Class PDF/Image Upload
  const handleClassFileSelect = (file: File) => {
    setClassesExtractError(null);
    setClassesExtractSuccess(null);

    const sizeInKB = Math.round(file.size / 1024);
    const sizeStr = sizeInKB > 1024 ? `${(sizeInKB / 1024).toFixed(1)} مگابایت` : `${sizeInKB} کیلوبایت`;

    const isImage = file.type.startsWith('image/');
    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');

    if (isImage || isPdf) {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result as string;
        setUploadedClassFile({
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
        setUploadedClassFile({
          name: file.name,
          size: sizeStr,
          type: file.type,
          rawText: typeof text === 'string' ? text.slice(0, 5000) : '',
        });
      };
      reader.readAsText(file);
    }
  };

  // Process and Extract Classes from PDF / Image / Text via AI
  const handleProcessUploadedClasses = async (overrideText?: string) => {
    const textToProcess = overrideText !== undefined ? overrideText : pastedClassText;
    if (!uploadedClassFile && !textToProcess.trim()) {
      setClassesExtractError('لطفاً ابتدا فایل PDF، عکس یا متن برنامه کلاسی را وارد کنید.');
      return;
    }

    setIsExtractingClasses(true);
    setClassesExtractError(null);
    setClassesExtractSuccess(null);

    try {
      const response = await fetch('/api/advisor/extract-weekly-classes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profile: { id: profile.id, name: profile.name },
          fileBase64: uploadedClassFile?.base64,
          mimeType: uploadedClassFile?.type,
          fileName: uploadedClassFile?.name,
          textContent: textToProcess || uploadedClassFile?.rawText || uploadedClassFile?.name,
        }),
      });

      if (!response.ok) {
        throw new Error('خطا در پردازش برنامه کلاسی');
      }

      const data = await response.json();
      const extractedClasses: WeeklyClass[] = Array.isArray(data.classes) ? data.classes : [];

      if (extractedClasses.length === 0) {
        setClassesExtractError('کلاسی در فایل شناسایی نشد. لطفاً متن را چک کرده یا دستی وارد کنید.');
        return;
      }

      onUpdateExamBudget({
        ...examBudget,
        weeklyClasses: extractedClasses,
      });

      setClassesExtractSuccess(`تعداد ${extractedClasses.length} کلاس هفتگی با موفقیت از فایل استخراج و در برنامه تثبیت شد! ${data.summaryNotes || ''}`);
      setShowClassUploadZone(false);
      setPastedClassText('');
      setUploadedClassFile(null);
    } catch (err: any) {
      console.warn("Class extraction error:", err);
      setClassesExtractError('خطا در استخراج هوشمند. لطفاً کلاس‌ها را دستی وارد نمایید.');
    } finally {
      setIsExtractingClasses(false);
    }
  };

  // Chat with AI to adjust, add, or remove classes conversationally
  const handleClassChatSendMessage = async () => {
    if (!classChatPrompt.trim() || isClassChatting) return;

    const userText = classChatPrompt.trim();
    setClassChatPrompt('');
    setIsClassChatting(true);

    const newHistory = [
      ...classChatHistory,
      { sender: 'user' as const, text: userText, time: new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' }) }
    ];
    setClassChatHistory(newHistory);

    try {
      const response = await fetch('/api/advisor/modify-classes-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profile: { id: profile.id, name: profile.name },
          userMessage: userText,
          currentClasses: weeklyClasses
        })
      });

      if (!response.ok) throw new Error('خطا در پاسخ هوش مصنوعی');

      const data = await response.json();
      const updatedClasses: WeeklyClass[] = Array.isArray(data.updatedClasses) ? data.updatedClasses : weeklyClasses;

      onUpdateExamBudget({
        ...examBudget,
        weeklyClasses: updatedClasses
      });

      setClassChatHistory([
        ...newHistory,
        {
          sender: 'ai',
          text: data.replyMessage || 'تغییرات مورد نظر شما با موفقیت در لیست کلاس‌ها اعمال شد.',
          time: new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } catch (err) {
      console.warn("Class chat error:", err);
      setClassChatHistory([
        ...newHistory,
        {
          sender: 'ai',
          text: 'متأسفانه در اعمال تغییر مشکلی پیش آمد. لطفاً دوباره تلاش کنید یا کلاس را دستی اضافه کنید.',
          time: new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } finally {
      setIsClassChatting(false);
    }
  };

  const filteredClasses = activeDayFilter === 'all'
    ? weeklyClasses
    : weeklyClasses.filter(c => c.dayName === activeDayFilter);

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Top Banner Card */}
      <div className="bg-white border border-stone-200 rounded-3xl p-5 sm:p-7 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-stone-100">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-700 flex items-center justify-center font-bold shadow-xs">
              <School className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-stone-900">
                  مدیریت کلاس‌های هفتگی و ساعات مدرسه
                </h2>
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-800 border border-rose-200">
                  {totalClassesCount} کلاس ثبت‌شده
                </span>
              </div>
              <p className="text-xs text-stone-500 mt-0.5">
                کلاس‌های ثابت مدرسه، کنکور، اساتید آنلاین (ماز، تاملند، کلاسینو) و آموزشگاه‌ها را اینجا وارد کنید تا در ساعات خالی هوشمندانه برنامه‌ریزی شود.
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setShowClassChatAssistant(!showClassChatAssistant);
                if (showClassUploadZone) setShowClassUploadZone(false);
                if (showAddClassForm) setShowAddClassForm(false);
              }}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-xs ${
                showClassChatAssistant 
                  ? 'bg-violet-800 text-white' 
                  : 'bg-violet-50 text-violet-800 hover:bg-violet-100 border border-violet-200'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5 text-violet-600" />
              <span>{showClassChatAssistant ? 'بستن چت هوشمند' : 'دستیار گفتگوی AI'}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setShowClassUploadZone(!showClassUploadZone);
                if (showAddClassForm) setShowAddClassForm(false);
                if (showClassChatAssistant) setShowClassChatAssistant(false);
              }}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-xs ${
                showClassUploadZone 
                  ? 'bg-emerald-800 text-white' 
                  : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200'
              }`}
            >
              <FileUp className="w-3.5 h-3.5 text-emerald-600" />
              <span>{showClassUploadZone ? 'بستن اسکنر' : 'آپلود PDF / عکس برنامه'}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setShowAddClassForm(!showAddClassForm);
                if (showClassUploadZone) setShowClassUploadZone(false);
                if (showClassChatAssistant) setShowClassChatAssistant(false);
              }}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-xs ${
                showAddClassForm
                  ? 'bg-stone-800 text-white'
                  : 'bg-stone-900 text-white hover:bg-stone-800'
              }`}
            >
              <Plus className="w-3.5 h-3.5 text-emerald-400" />
              <span>{showAddClassForm ? 'بستن فرم' : 'افزودن کلاس جدید'}</span>
            </button>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
          <div className="bg-stone-50 p-3 rounded-2xl border border-stone-200/80">
            <span className="text-[11px] text-stone-500 font-semibold block">تعداد کلاس‌های هفتگی</span>
            <span className="text-base font-black text-stone-900 mt-0.5 block">{totalClassesCount} پارت کلاسی</span>
          </div>

          <div className="bg-stone-50 p-3 rounded-2xl border border-stone-200/80">
            <span className="text-[11px] text-stone-500 font-semibold block">مجموع ساعات کلاس‌ها</span>
            <span className="text-base font-black text-rose-700 mt-0.5 block">حدود {totalWeeklyClassHours.toFixed(1)} ساعت</span>
          </div>

          <div className="bg-stone-50 p-3 rounded-2xl border border-stone-200/80">
            <span className="text-[11px] text-stone-500 font-semibold block">زمان تکالیف و مرور کلاس</span>
            <span className="text-base font-black text-indigo-700 mt-0.5 block">حدود {totalHomeworkHours.toFixed(1)} ساعت</span>
          </div>

          <div className="bg-emerald-50/80 p-3 rounded-2xl border border-emerald-200/80 flex flex-col justify-between">
            <span className="text-[11px] text-emerald-900 font-semibold block">هماهنگی با جدول هفتگی</span>
            <span className="text-xs font-bold text-emerald-700 mt-0.5 flex items-center gap-1">
              <CheckCircle className="w-3.5 h-3.5" />
              کلاس‌ها خودکار لحاظ می‌شوند
            </span>
          </div>
        </div>
      </div>

      {/* AI Chat Assistant Accordion */}
      {showClassChatAssistant && (
        <div className="bg-white rounded-3xl border border-violet-200 p-5 shadow-sm space-y-4 animate-fadeIn">
          <div className="flex items-center justify-between pb-3 border-b border-violet-100">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-violet-100 text-violet-700 flex items-center justify-center font-bold">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs sm:text-sm font-black text-violet-950">
                  دستیار صوتی و متنی هوش مصنوعی برای تنظیم کلاس‌ها
                </h3>
                <p className="text-[11px] text-violet-700">
                  هر دستوری درباره کلاس‌های خود دارید بگویید تا هوش مصنوعی فوراً جدول را به‌روزرسانی کند.
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowClassChatAssistant(false)}
              className="text-stone-400 hover:text-stone-700 p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Chat History View */}
          <div className="max-h-60 overflow-y-auto space-y-2.5 p-3 bg-stone-50 rounded-2xl border border-stone-200/80 text-xs">
            {classChatHistory.map((msg, idx) => (
              <div
                key={idx}
                className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[85%] p-3 rounded-2xl text-xs ${
                    msg.sender === 'user'
                      ? 'bg-violet-700 text-white rounded-br-none shadow-xs'
                      : 'bg-white text-stone-800 border border-stone-200 rounded-bl-none shadow-2xs'
                  }`}
                >
                  <p className="leading-relaxed">{msg.text}</p>
                </div>
                <span className="text-[9px] text-stone-400 mt-1 px-1">{msg.time}</span>
              </div>
            ))}
            {isClassChatting && (
              <div className="flex items-center gap-2 text-stone-500 text-xs p-2">
                <RefreshCw className="w-4 h-4 animate-spin text-violet-600" />
                <span>هوش مصنوعی در حال تحلیل و اعمال تغییرات در برنامه کلاس‌هاست...</span>
              </div>
            )}
          </div>

          {/* Quick Prompts */}
          <div className="flex flex-wrap gap-1.5">
            {[
              'دوشنبه‌ها ساعت ۱۷ تا ۱۹:۳۰ کلاس شیمی ماز اضافه کن',
              'کلاس‌های سه‌شنبه رو حذف کن',
              'برای هر کلاس ۲ ساعت وقت تکلیف بگذار',
              'کلاس فیزیک آنلاین یکشنبه ساعت ۱۶ تا ۱۹ اضافه کن'
            ].map((preset, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setClassChatPrompt(preset)}
                className="px-2.5 py-1 rounded-xl bg-violet-50 hover:bg-violet-100 text-violet-800 text-[11px] font-medium transition cursor-pointer border border-violet-100"
              >
                {preset}
              </button>
            ))}
          </div>

          {/* Input Box */}
          <div className="flex gap-2">
            <input
              type="text"
              value={classChatPrompt}
              onChange={(e) => setClassChatPrompt(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleClassChatSendMessage()}
              placeholder="دستور خود را بنویسید (مثلاً: چهارشنبه ساعت ۱۸ کلاس آنلاین زیست ماز دارم...)"
              className="flex-1 text-xs px-3.5 py-2.5 rounded-xl border border-stone-300 bg-white focus:outline-violet-600 font-medium"
            />
            <button
              type="button"
              onClick={handleClassChatSendMessage}
              disabled={!classChatPrompt.trim() || isClassChatting}
              className="px-4 py-2.5 bg-violet-700 hover:bg-violet-600 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition disabled:opacity-50 cursor-pointer shadow-xs"
            >
              <Send className="w-3.5 h-3.5" />
              <span>ارسال</span>
            </button>
          </div>
        </div>
      )}

      {/* Upload Zone Accordion */}
      {showClassUploadZone && (
        <div className="bg-white rounded-3xl border border-emerald-200 p-5 sm:p-6 shadow-sm space-y-4 animate-fadeIn">
          <div className="flex items-center justify-between pb-3 border-b border-emerald-100">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                <FileUp className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs sm:text-sm font-black text-stone-900">
                  اسکن هوشمند فایل PDF یا تصویر برنامه هفتگی
                </h3>
                <p className="text-[11px] text-stone-500">
                  پشتیبانی از عکس جدول کلاسی مدرسه، برنامه‌های هفتگی ماز، تاملند، کلاسینو و فایل‌های متنی
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowClassUploadZone(false)}
              className="text-stone-400 hover:text-stone-700 p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div
            onDragOver={(e) => { e.preventDefault(); setIsDraggingClassFile(true); }}
            onDragLeave={() => setIsDraggingClassFile(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDraggingClassFile(false);
              if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                handleClassFileSelect(e.dataTransfer.files[0]);
              }
            }}
            className={`border-2 border-dashed rounded-2xl p-6 text-center transition-all cursor-pointer ${
              isDraggingClassFile
                ? 'border-emerald-500 bg-emerald-50/60'
                : uploadedClassFile
                ? 'border-emerald-300 bg-emerald-50/20'
                : 'border-stone-200 hover:border-emerald-400 bg-stone-50/50'
            }`}
            onClick={() => classFileInputRef.current?.click()}
          >
            <input
              ref={classFileInputRef}
              type="file"
              accept="image/*,.pdf,.txt,.doc,.docx"
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  handleClassFileSelect(e.target.files[0]);
                }
              }}
            />

            {uploadedClassFile ? (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-stone-200 shadow-2xs">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold text-stone-900 truncate max-w-[220px]">
                      {uploadedClassFile.name}
                    </p>
                    <p className="text-[10px] text-stone-500">
                      حجم: {uploadedClassFile.size} • فرمت: {uploadedClassFile.type}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleProcessUploadedClasses();
                    }}
                    disabled={isExtractingClasses}
                    className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold flex items-center gap-1.5 transition disabled:opacity-50 cursor-pointer shadow-xs"
                  >
                    {isExtractingClasses ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>در حال استخراج هوشمند کلاس‌ها...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>استخراج خودکار با AI</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setUploadedClassFile(null);
                    }}
                    className="p-2 text-stone-400 hover:text-rose-600 transition"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center mx-auto mb-2.5">
                  <Upload className="w-6 h-6" />
                </div>
                <p className="text-xs sm:text-sm font-black text-stone-800 mb-1">
                  عکس یا فایل PDF برنامه کلاس‌ها را اینجا رها کنید یا کلیک نمایید
                </p>
                <p className="text-[11px] text-stone-500">
                  سیستم به صورت خودکار روزهای هفته، اساتید، ساعات شروع و پایان را استخراج و در جدول قرار می‌دهد.
                </p>
              </div>
            )}
          </div>

          {/* Paste Option */}
          <div className="pt-2 border-t border-stone-100">
            <label className="block text-[11px] font-bold text-stone-700 mb-1">
              یا متن پیامک، تلگرام یا لیست کلاس‌ها را مستقیماً اینجا وارد کنید:
            </label>
            <div className="flex gap-2">
              <textarea
                rows={2}
                value={pastedClassText}
                onChange={(e) => setPastedClassText(e.target.value)}
                placeholder="مثال: شنبه‌ها ۱۷ تا ۲۰ حسابان ۲ ماز، دوشنبه‌ها ۱۶ تا ۱۹ فیزیک کنکور تاملند، چهارشنبه‌ها ۱۷ تا ۱۹ شیمی آموزشگاه"
                className="flex-1 text-xs px-3.5 py-2 rounded-xl border border-stone-200 bg-stone-50 focus:bg-white focus:outline-emerald-600"
              />
              {pastedClassText.trim() && (
                <button
                  type="button"
                  onClick={() => handleProcessUploadedClasses(pastedClassText)}
                  disabled={isExtractingClasses}
                  className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold flex items-center gap-1.5 transition self-end disabled:opacity-50 cursor-pointer shadow-xs"
                >
                  {isExtractingClasses ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="w-3.5 h-3.5" />
                  )}
                  <span>استخراج</span>
                </button>
              )}
            </div>
          </div>

          {classesExtractSuccess && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-medium flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{classesExtractSuccess}</span>
            </div>
          )}

          {classesExtractError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-medium flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{classesExtractError}</span>
            </div>
          )}
        </div>
      )}

      {/* Manual Class Form Accordion */}
      {showAddClassForm && (
        <div className="bg-white rounded-3xl border border-stone-200 p-5 sm:p-6 shadow-sm space-y-4 animate-fadeIn">
          <div className="flex items-center justify-between pb-3 border-b border-stone-100">
            <h3 className="text-xs sm:text-sm font-black text-stone-900 flex items-center gap-2">
              <Plus className="w-4 h-4 text-emerald-600" />
              <span>افزودن دستی پارت کلاسی</span>
            </h3>
            <button
              onClick={() => setShowAddClassForm(false)}
              className="text-stone-400 hover:text-stone-700 p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1">روز برگزاری:</label>
              <select
                value={newClassDay}
                onChange={e => setNewClassDay(e.target.value)}
                className="w-full text-xs px-3 py-2.5 rounded-xl border border-stone-200 bg-stone-50 font-bold"
              >
                {WEEK_DAYS.map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1">نام درس / مبحث:</label>
              <input
                type="text"
                value={newClassSubject}
                onChange={e => setNewClassSubject(e.target.value)}
                placeholder="مثال: حسابان ۲ جامع / زیست شناسی کنکور"
                className="w-full text-xs px-3 py-2.5 rounded-xl border border-stone-200 bg-stone-50 font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1">استاد / موسسه:</label>
              <input
                type="text"
                value={newClassTeacher}
                onChange={e => setNewClassTeacher(e.target.value)}
                placeholder="مثال: ماز / تاملند / کلاسینو / مدرسه"
                className="w-full text-xs px-3 py-2.5 rounded-xl border border-stone-200 bg-stone-50 font-medium"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <label className="block text-xs font-bold text-stone-700 mb-1">ساعت شروع:</label>
                <input
                  type="text"
                  value={newClassStart}
                  onChange={e => setNewClassStart(e.target.value)}
                  placeholder="۱۷:۰۰"
                  className="w-full text-xs px-3 py-2 rounded-xl border border-stone-200 bg-stone-50 font-bold"
                />
              </div>
              <div className="flex-1">
                <label className="block text-xs font-bold text-stone-700 mb-1">ساعت پایان:</label>
                <input
                  type="text"
                  value={newClassEnd}
                  onChange={e => setNewClassEnd(e.target.value)}
                  placeholder="۱۹:۳۰"
                  className="w-full text-xs px-3 py-2 rounded-xl border border-stone-200 bg-stone-50 font-bold"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1">نوع برگزاری:</label>
              <select
                value={newClassType}
                onChange={e => setNewClassType(e.target.value as any)}
                className="w-full text-xs px-3 py-2 rounded-xl border border-stone-200 bg-stone-50 font-bold"
              >
                <option value="online">🌐 آنلاین (اسکای‌روم / ماز / تاملند)</option>
                <option value="in_person">🏫 حضوری (مدرسه / آموزشگاه)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1">ساعت تکلیف و مرور موردنیاز:</label>
              <input
                type="number"
                step="0.5"
                min="0.5"
                max="6"
                value={newClassPostHours}
                onChange={e => setNewClassPostHours(parseFloat(e.target.value) || 1.5)}
                className="w-full text-xs px-3 py-2 rounded-xl border border-stone-200 bg-stone-50 font-bold"
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="button"
              onClick={handleAddWeeklyClass}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black transition cursor-pointer shadow-xs flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              <span>ثبت و ذخیره در جدول کلاس‌ها</span>
            </button>
          </div>
        </div>
      )}

      {/* Filter by Day Tabs */}
      <div className="flex flex-wrap items-center gap-1.5 bg-stone-100/80 p-1.5 rounded-2xl border border-stone-200/80">
        <button
          onClick={() => setActiveDayFilter('all')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
            activeDayFilter === 'all'
              ? 'bg-stone-900 text-white shadow-xs'
              : 'text-stone-600 hover:text-stone-900'
          }`}
        >
          همه روزها ({weeklyClasses.length})
        </button>

        {WEEK_DAYS.map(day => {
          const count = weeklyClasses.filter(c => c.dayName === day).length;
          return (
            <button
              key={day}
              onClick={() => setActiveDayFilter(day)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                activeDayFilter === day
                  ? 'bg-stone-900 text-white shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <span>{day}</span>
              {count > 0 && (
                <span className={`text-[10px] px-1.5 py-0.2 rounded-md font-black ${
                  activeDayFilter === day ? 'bg-emerald-500 text-stone-950' : 'bg-stone-200 text-stone-700'
                }`}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Classes List View */}
      <div className="space-y-3">
        {filteredClasses.length === 0 ? (
          <div className="bg-white rounded-3xl p-10 border border-stone-200 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-stone-100 text-stone-400 flex items-center justify-center mx-auto">
              <School className="w-6 h-6" />
            </div>
            <h4 className="font-black text-stone-800 text-sm">
              {activeDayFilter === 'all' 
                ? 'هنوز کلاسی در این بخش ثبت نشده است' 
                : `در روز «${activeDayFilter}» هیچ کلاسی ثبت نشده است`}
            </h4>
            <p className="text-xs text-stone-500 max-w-md mx-auto">
              با دکمه «افزودن کلاس جدید» یا «آپلود PDF / عکس برنامه»، ساعات درگیر کلاس‌های خود را مشخص کنید تا برنامه مطالعاتی آزمون شما دقیق‌تر تنظیم گردد.
            </p>
            <div className="pt-2 flex justify-center gap-2">
              <button
                type="button"
                onClick={() => setShowAddClassForm(true)}
                className="px-4 py-2 bg-stone-900 text-white rounded-xl text-xs font-bold hover:bg-stone-800 transition cursor-pointer shadow-xs"
              >
                + افزودن اولین کلاس
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {filteredClasses.map((cls) => (
              <div
                key={cls.id}
                className="bg-white p-4 sm:p-5 rounded-2xl border border-stone-200 hover:border-emerald-300 hover:shadow-sm transition-all space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2.5 py-0.5 rounded-lg bg-rose-50 text-rose-800 font-black border border-rose-200 text-xs">
                        {cls.dayName}
                      </span>
                      <h4 className="font-black text-sm text-stone-900">
                        {cls.subject}
                      </h4>
                      <span className="text-[11px] px-2 py-0.5 rounded-md bg-stone-100 text-stone-600 font-semibold">
                        {cls.locationOrType === 'online' ? '🌐 آنلاین' : '🏫 حضوری'}
                      </span>
                    </div>

                    <div className="text-xs text-stone-500 flex items-center gap-2 pt-0.5">
                      <span>استاد/آموزشگاه: <strong className="text-stone-800">{cls.teacherOrInstitute || 'نامشخص'}</strong></span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleRemoveWeeklyClass(cls.id)}
                    className="p-1.5 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition cursor-pointer"
                    title="حذف این کلاس"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-2.5 border-t border-stone-100 text-xs text-stone-600">
                  <div className="flex items-center gap-1.5 font-bold text-stone-800">
                    <Clock className="w-3.5 h-3.5 text-rose-500" />
                    <span>ساعت: {cls.startTime} تا {cls.endTime}</span>
                  </div>

                  <div className="flex items-center gap-1.5 text-indigo-700 bg-indigo-50 border border-indigo-100 px-2.5 py-1 rounded-lg text-[11px] font-bold">
                    <BookOpen className="w-3 h-3 text-indigo-500" />
                    <span>{cls.postClassStudyHoursNeeded || 1.5} ساعت مرور و تکالیف</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Navigation Helper CTA */}
      {onSwitchToScheduleTab && (
        <div className="bg-stone-900 text-white p-5 rounded-3xl flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
          <div className="space-y-1 text-right">
            <span className="text-sm font-black text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              اعمال این کلاس‌ها در جدول هفتگی مطالعاتی
            </span>
            <p className="text-xs text-stone-400">
              با مراجعه به بخش «برنامه هفتگی»، ساعات این کلاس‌ها به عنوان پارت‌های فیکس لحاظ می‌شوند.
            </p>
          </div>

          <button
            type="button"
            onClick={onSwitchToScheduleTab}
            className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-stone-950 font-black rounded-xl text-xs transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap"
          >
            <span>مشاهده جدول برنامه هفتگی</span>
            <ArrowRight className="w-4 h-4 rotate-180" />
          </button>
        </div>
      )}
    </div>
  );
};
