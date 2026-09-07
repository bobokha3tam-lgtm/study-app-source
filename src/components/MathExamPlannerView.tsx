import React, { useState, useRef } from 'react';
import { Download,     
  Target, 
  Calendar, 
  BookOpen, 
  CheckCircle, 
  Plus, 
  Sparkles, 
  Search, 
  AlertCircle,
  Clock,
  Zap,
  TrendingUp,
  Layers,
  Check,
  Upload,
  FileText,
  Image as ImageIcon,
  Calculator,
  Library,
  Flame,
  Award,
  RefreshCw,
  X,
  FileUp,
  ChevronDown,
  ChevronUp,
  School,
  Trash2,
  ListOrdered,
  Gauge,
  MessageSquare,
  Send
, ListTree , Rocket } from 'lucide-react';
import {  StudentProfile, WeeklySchedule, ExamBudget, WeeklyClass, TopicExamDetail, ScheduledExam } from '../types';
import {  
  getCurriculumByField, 
  getMasterBooksByField, 
  STREAM_OPTIONS, 
  normalizeStream, 
  StreamType 
} from '../data/curriculumData';
import {  KonkurAdvancedSearchModal } from './KonkurAdvancedSearchModal';
import {  
  getLiveDaysUntilExam, 
  getPersianTodayInfo, 
  calculateExamCountdown, 
  toPersianDigits,
  sanitizeAndAdvanceExamBudget 
} from '../utils/examCountdown';
import {  ScheduledExamsSection } from './ScheduledExamsSection';
import {  getDefaultScheduledExams } from '../data/scheduledExamsData';
import {  ExamBudgetSection } from './ExamBudgetSection';
import {  WeeklyClassesSection } from './WeeklyClassesSection';

interface MathExamPlannerViewProps {
  profile: StudentProfile;
  examBudget: ExamBudget;
  onUpdateExamBudget: (budget: ExamBudget) => void;
  onApplyNewSchedule: (schedule: WeeklySchedule) => void;
  onSwitchToScheduleTab: () => void;
  onSwitchToProToolsTab?: (subTab?: 'postmortem' | 'focus_speed' | 'heatmap' | 'trap_quizzer' | 'final_exam') => void;
  defaultSubTab?: 'calendar' | 'classes' | 'atlas' | 'sources' | 'calculator';
}

export function MathExamPlannerView({
  profile,
  examBudget,
  onUpdateExamBudget,
  onApplyNewSchedule,
  onSwitchToScheduleTab,
  onSwitchToProToolsTab,
  defaultSubTab = 'calendar',
}: MathExamPlannerViewProps) {
  // Navigation sub-tabs inside curriculum view: 'calendar' (برنامه و بودجه آزمون) | 'classes' (کلاس‌های هفتگی) | 'atlas' | 'sources' | 'calculator'
  const [activeSubTab, setActiveSubTab] = useState<'calendar' | 'classes' | 'atlas' | 'sources' | 'calculator'>(defaultSubTab);
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState<string>('all');
  const [selectedGradeFilter, setSelectedGradeFilter] = useState<string>('all');
  const [selectedDifficultyFilter, setSelectedDifficultyFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [expandedTopicId, setExpandedTopicId] = useState<string | null>('calc-func');
  const [isAdvSearchModalOpen, setIsAdvSearchModalOpen] = useState<boolean>(false);
  const [completedSubtopics, setCompletedSubtopics] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem('advisor_completed_subtopics');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const toggleSubtopicCompleted = (subtopicKey: string) => {
    setCompletedSubtopics(prev => {
      const updated = { ...prev, [subtopicKey]: !prev[subtopicKey] };
      try {
        localStorage.setItem('advisor_completed_subtopics', JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  // Live Today Information & Exam Countdown
  const todayInfo = getPersianTodayInfo();
  const activeExamCountdown = calculateExamCountdown(examBudget);

  // Stream detection
  const detectedStream = normalizeStream(profile?.fieldOfStudy);
  const [currentStream, setCurrentStream] = useState<StreamType>(detectedStream);

  // Scheduled exams list (persisted in examBudget or loaded defaults)
  const [scheduledExams, setScheduledExams] = useState<ScheduledExam[]>(() => {
    if (examBudget.scheduledExams && examBudget.scheduledExams.length > 0) {
      return examBudget.scheduledExams;
    }
    return getDefaultScheduledExams(detectedStream);
  });

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
    setExtractSuccess(`آزمون «${exam.examName}» به عنوان آزمون هدف بعدی انتخاب شد. اطلاعات و مباحث آن برای چیدن برنامه اعمال گردید!`);
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

  // Generation state
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Upload state
  const [uploadedFile, setUploadedFile] = useState<{
    name: string;
    size: string;
    type: string;
    base64?: string;
    previewUrl?: string;
    rawText?: string;
  } | null>(null);
  const [isExtractingSyllabus, setIsExtractingSyllabus] = useState<boolean>(false);
  const [extractError, setExtractError] = useState<string | null>(null);
  const [extractSuccess, setExtractSuccess] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Weekly Classes & Topic Details Management
  const [newClassDay, setNewClassDay] = useState<string>('یکشنبه');
  const [newClassStart, setNewClassStart] = useState<string>('۱۷:۰۰');
  const [newClassEnd, setNewClassEnd] = useState<string>('۱۹:۳۰');
  const [newClassSubject, setNewClassSubject] = useState<string>('حسابان ۲');
  const [newClassTeacher, setNewClassTeacher] = useState<string>('کلاس آنلاین');
  const [newClassType, setNewClassType] = useState<'online' | 'in_person'>('online');
  const [newClassPostHours, setNewClassPostHours] = useState<number>(1.5);
  const [showAddClassForm, setShowAddClassForm] = useState<boolean>(false);

  // Weekly Classes PDF / Image Upload State
  const [showClassUploadZone, setShowClassUploadZone] = useState<boolean>(false);
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

  // AI Conversational Class Modifier State
  const [showClassChatAssistant, setShowClassChatAssistant] = useState<boolean>(false);
  const [classChatPrompt, setClassChatPrompt] = useState<string>('');
  const [isClassChatting, setIsClassChatting] = useState<boolean>(false);
  const [classChatHistory, setClassChatHistory] = useState<Array<{ sender: 'user' | 'ai'; text: string; time: string }>>([
    {
      sender: 'ai',
      text: 'سلام! بعد از آپلود برنامه یا در هر زمان، می‌توانید به زبان خودمانی بگویید چه کلاسی اضافه، حذف، یا ساعت آن جابجا شود (مثلاً: «کلاس فیزیک سه‌شنبه‌ها رو بکن ۱۸ تا ۲۰» یا «یکشنبه‌ها کلاس حسابان آنلاین با ۱.۵ ساعت تکلیف اضافه کن»).',
      time: 'اکنون'
    }
  ]);

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

  const handleAddWeeklyClass = () => {
    if (!newClassSubject.trim()) return;
    const newClass: WeeklyClass = {
      id: 'cls-' + Date.now(),
      dayName: newClassDay,
      startTime: newClassStart,
      endTime: newClassEnd,
      subject: newClassSubject,
      teacherOrInstitute: newClassTeacher,
      locationOrType: newClassType,
      postClassStudyHoursNeeded: newClassPostHours
    };
    const currentClasses = examBudget.weeklyClasses || [];
    onUpdateExamBudget({
      ...examBudget,
      weeklyClasses: [...currentClasses, newClass]
    });
    setNewClassSubject('');
    setShowAddClassForm(false);
  };

  const handleRemoveWeeklyClass = (classId: string) => {
    const currentClasses = examBudget.weeklyClasses || [];
    onUpdateExamBudget({
      ...examBudget,
      weeklyClasses: currentClasses.filter(c => c.id !== classId)
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
          currentClasses: examBudget.weeklyClasses || []
        })
      });

      if (!response.ok) throw new Error('خطا در پاسخ هوش مصنوعی');

      const data = await response.json();
      const updatedClasses: WeeklyClass[] = Array.isArray(data.updatedClasses) ? data.updatedClasses : (examBudget.weeklyClasses || []);

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

  // Sync stream if profile field of study changes externally
  React.useEffect(() => {
    if (profile.fieldOfStudy) {
      const normalized = normalizeStream(profile.fieldOfStudy);
      setCurrentStream(normalized);
      if (!examBudget.scheduledExams || examBudget.scheduledExams.length === 0) {
        setScheduledExams(getDefaultScheduledExams(normalized));
      }
    }
  }, [profile.fieldOfStudy]);

  const activeCurriculum = React.useMemo(() => getCurriculumByField(currentStream), [currentStream]);
  const activeMasterBooks = React.useMemo(() => getMasterBooksByField(currentStream), [currentStream]);

  const availableSubjectFilters = React.useMemo(() => {
    const list: Array<{ id: string; label: string }> = [
      { 
        id: 'all', 
        label: currentStream === 'experimental' 
          ? 'همه دروس کنکور تجربی' 
          : currentStream === 'humanities' 
          ? 'همه دروس کنکور انسانی' 
          : 'همه دروس کنکور ریاضی' 
      }
    ];
    const set = new Set<string>();
    activeCurriculum.forEach(t => set.add(t.subject));
    set.forEach(sub => {
      list.push({ id: sub, label: sub });
    });
    return list;
  }, [activeCurriculum, currentStream]);

  // Filtered curriculum topics with multi-dimensional search
  const filteredTopics = activeCurriculum.filter((topic) => {
    const matchesSubject = selectedSubjectFilter === 'all' || topic.subject === selectedSubjectFilter;
    const matchesGrade = selectedGradeFilter === 'all' || topic.grade.includes(selectedGradeFilter);
    const matchesDifficulty = selectedDifficultyFilter === 'all' || topic.difficulty.includes(selectedDifficultyFilter);

    if (!matchesSubject || !matchesGrade || !matchesDifficulty) return false;

    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;

    const matchesQuery = 
      (topic.chapter || '').toLowerCase().includes(q) ||
      (topic.grade || '').toLowerCase().includes(q) ||
      (topic.difficulty || '').toLowerCase().includes(q) ||
      (topic.subtopics || []).some(sub => (sub || '').toLowerCase().includes(q)) ||
      (topic.keyChallenges && topic.keyChallenges.some(ch => (ch || '').toLowerCase().includes(q))) ||
      (topic.masteryTips && topic.masteryTips.some(tip => (tip || '').toLowerCase().includes(q))) ||
      (topic.recommendedBooks && topic.recommendedBooks.some(b => 
        (b.title || '').toLowerCase().includes(q) || 
        (b.publisher || '').toLowerCase().includes(q) ||
        (b.description || '').toLowerCase().includes(q) ||
        (b.recommendedFor || '').toLowerCase().includes(q)
      ));
    return matchesQuery;
  });

  // Calculate aggregated test volume for selected topics in exam budget
  const selectedTopicObjects = activeCurriculum.filter(t => 
    (examBudget.selectedTopics || []).includes(t.chapter)
  );

  const totalLearningTests = selectedTopicObjects.reduce((acc, t) => acc + (t.testVolume?.learningTests || 100), 0);
  const totalTimedPracticeTests = selectedTopicObjects.reduce((acc, t) => acc + (t.testVolume?.timedPracticeTests || 140), 0);
  const totalReviewTests = selectedTopicObjects.reduce((acc, t) => acc + (t.testVolume?.reviewTests || 60), 0);
  const grandTotalTests = totalLearningTests + totalTimedPracticeTests + totalReviewTests;
  const totalEstimatedHours = selectedTopicObjects.reduce((acc, t) => acc + (t.testVolume?.estimatedStudyHours || 15), 0);

  // Daily test pacing calculation, based on the days the student actually
  // has left until the exam (ticks down correctly day by day — see
  // src/utils/examCountdown.ts). Previously this was hardcoded to 6
  // regardless of how many days were really left, so the daily pace shown
  // was wrong for anyone whose exam wasn't exactly 6 days away. Falls back
  // to 6 only if the student hasn't entered a value yet.
  const daysUntilExam = Math.max(1, getLiveDaysUntilExam(examBudget) ?? 6);
  const dailyTestTarget = Math.ceil(grandTotalTests / daysUntilExam);
  const dailyHoursTarget = (totalEstimatedHours / daysUntilExam).toFixed(1);

  const handleToggleTopic = (topicName: string) => {
    const isSelected = (examBudget.selectedTopics || []).includes(topicName);
    let updatedTopics: string[];
    let updatedDetails = [...(examBudget.topicDetails || [])];

    if (isSelected) {
      updatedTopics = (examBudget.selectedTopics || []).filter(t => t !== topicName);
      updatedDetails = updatedDetails.filter(td => td.chapter !== topicName && !(td.subtopic && td.subtopic.includes(topicName)));
    } else {
      updatedTopics = [...(examBudget.selectedTopics || []), topicName];
      const matchedCurriculum = activeCurriculum.find(t => t.chapter === topicName);
      if (matchedCurriculum) {
        const diffMapping: 'آسان و روان' | 'متوسط' | 'سخت' | 'بسیار چالشی و دام‌دار' = 
          matchedCurriculum.difficulty === 'بسیار چالش‌برانگیز' || matchedCurriculum.difficulty === 'بسیار سخت' ? 'بسیار چالشی و دام‌دار' :
          matchedCurriculum.difficulty === 'سخت' ? 'سخت' : 'متوسط';

        const newDetail: TopicExamDetail = {
          id: 'td-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
          subject: matchedCurriculum.subject,
          chapter: matchedCurriculum.chapter,
          subtopic: (matchedCurriculum.subtopics || [])[0] || matchedCurriculum.chapter,
          difficulty: diffMapping,
          targetTestCount: matchedCurriculum.testVolume?.totalRecommendedTests || matchedCurriculum.expectedTestBudget || 100,
          completedTestCount: 0,
          importanceWeight: 'پرتکرار و حیاتی (تضمین درصد)',
          hasPrerequisiteInClass: true
        };
        updatedDetails.push(newDetail);
      }
    }

    const totalTests = updatedDetails.reduce((sum, item) => sum + item.targetTestCount, 0);

    onUpdateExamBudget({
      ...examBudget,
      selectedTopics: updatedTopics,
      topicDetails: updatedDetails,
      totalTargetTests: totalTests > 0 ? totalTests : examBudget.totalTargetTests
    });
  };

  // Handle File Upload and Extraction
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
      // Text or Document
      const reader = new FileReader();
      reader.onload = () => {
        const text = reader.result as string;
        setUploadedFile({
          name: file.name,
          size: sizeStr,
          type: file.type,
          rawText: typeof text === 'string' ? text.slice(0, 5000) : '',
        });
      };
      reader.readAsText(file);
    }
  };

  const handleProcessUploadedSyllabus = async () => {
    if (!uploadedFile) return;

    setIsExtractingSyllabus(true);
    setExtractError(null);
    setExtractSuccess(null);

    try {
      const response = await fetch('/api/advisor/extract-exam-syllabus', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profile: { id: profile.id, name: profile.name },
          fileBase64: uploadedFile.base64,
          mimeType: uploadedFile.type,
          fileName: uploadedFile.name,
          textContent: uploadedFile.rawText || uploadedFile.name,
        }),
      });

      if (!response.ok) {
        throw new Error('خطا در برقراری ارتباط با سرور');
      }

      const data = await response.json();

      // Merge matched topics with current ones
      const newTopics = Array.isArray(data.matchedTopics) ? data.matchedTopics : [];
      const mergedTopics = Array.from(new Set([...examBudget.selectedTopics, ...newTopics]));

      // Auto-populate topic details and difficulties from AI so the user doesn't have to enter them manually
      let autoTopicDetails: TopicExamDetail[] = examBudget.topicDetails || [];
      if (Array.isArray(data.topicDetails) && data.topicDetails.length > 0) {
        autoTopicDetails = data.topicDetails.map((td: any, idx: number) => ({
          id: `td-auto-${Date.now()}-${idx}`,
          subject: td.subject || 'حسابان ۲',
          chapter: td.chapter || 'فصل آزمون',
          subtopic: td.subtopic || td.chapter || 'سرفصل کنکور',
          difficulty: td.difficulty || 'سخت',
          targetTestCount: Number(td.targetTestCount) || 100,
          completedTestCount: 0,
          importanceWeight: td.importanceWeight || 'پرتکرار و حیاتی (تضمین درصد)',
          hasPrerequisiteInClass: true,
        }));
      } else if (newTopics.length > 0 && autoTopicDetails.length === 0) {
        // Fallback auto-generation from detected topics
        autoTopicDetails = newTopics.map((topName: string, idx: number) => {
          let diff: any = 'سخت';
          if (topName.includes('مشتق') || topName.includes('نظریه اعداد') || topName.includes('حرکت')) {
            diff = 'بسیار چالشی و دام‌دار';
          } else if (topName.includes('حد') || topName.includes('استوکیومتری')) {
            diff = 'متوسط';
          }
          return {
            id: `td-gen-${Date.now()}-${idx}`,
            subject: topName.split('(')[0]?.trim() || topName,
            chapter: topName.split('(')[1]?.replace(')', '')?.trim() || topName,
            subtopic: 'پوشش کامل مباحث و تست‌های آزمونی',
            difficulty: diff,
            targetTestCount: diff === 'بسیار چالشی و دام‌دار' ? 140 : 100,
            completedTestCount: 0,
            importanceWeight: 'پرتکرار و حیاتی (تضمین درصد)',
            hasPrerequisiteInClass: true,
          };
        });
      }

      onUpdateExamBudget({
        ...examBudget,
        examName: data.examName || examBudget.examName || 'آزمون آزمایشی',
        examDate: data.examDate || examBudget.examDate || 'جمعه پیش‌رو',
        targetGoalText: data.targetGoalText || examBudget.targetGoalText || 'تراز بالای ۶۵۰۰',
        syllabusDetails: data.syllabusDetails || examBudget.syllabusDetails,
        selectedTopics: mergedTopics,
        topicDetails: autoTopicDetails,
        totalTargetTests: data.recommendedTotalTests || autoTopicDetails.reduce((acc, t) => acc + t.targetTestCount, 0) || 450,
        uploadedFileName: uploadedFile.name,
        uploadedFilePreview: uploadedFile.previewUrl,
        extractedAt: new Date().toLocaleTimeString('fa-IR'),
      });

      setExtractSuccess(`بودجه‌بندی و تمام سرفصل‌ها به همراه درجه سختی و تارگت تست خودکار استخراج شدند! نیازی به ورود دستی اطلاعات نیست.`);
    } catch (err: any) {
      console.warn("Extraction error:", err);
      setExtractError('استخراج با مشکلی مواجه شد؛ با این حال می‌توانید مباحث را از لیست زیر مستقیماً تیک بزنید.');
    } finally {
      setIsExtractingSyllabus(false);
    }
  };

  const handleLoadSamplePreset = (presetType: 'ghalamchi' | 'maze' | 'sanjesh') => {
    if (presetType === 'ghalamchi') {
      onUpdateExamBudget({
        examName: 'آزمون آنلاین کشوری ماز - مرحله ۱',
        examDate: 'جمعه ۱۸ آبان',
        targetGoalText: 'تراز بالای ۶۸۰۰ با درصد حسابان بالای ۶۵٪',
        syllabusDetails: 'حسابان دوازدهم: مشتق توابع تا سر کاربرد مشتق؛ فیزیک دوازدهم: حرکت با شتاب ثابت و سقوط آزاد؛ هندسه دوازدهم: ماتریس و دترمینان؛ گسسته: نظریه اعداد و همنهشتی؛ شیمی: استوکیومتری و واکنش‌های شیمیایی',
        selectedTopics: [
          'مشتق و کاربرد مشتق (حسابان ۲)',
          'حرکت بر خط راست (فیزیک ۳ دوازدهم)',
          'هندسه ۳ (پایه دوازدهم)',
          'نظریه اعداد (ریاضی گسسته دوازدهم)',
          'استوکیومتری و محاسبات کمی (شیمی ۱ و ۲)'
        ],
        totalTargetTests: 480,
        weeklyClasses: [
          {
            id: 'cls-1',
            dayName: 'یکشنبه',
            startTime: '۱۷:۰۰',
            endTime: '۲۰:۰۰',
            subject: 'حسابان ۲ و ریاضی پایه',
            teacherOrInstitute: 'کلاس آنلاین ماز',
            locationOrType: 'online',
            postClassStudyHoursNeeded: 1.5
          },
          {
            id: 'cls-2',
            dayName: 'سه‌شنبه',
            startTime: '۱۶:۳۰',
            endTime: '۱۹:۳۰',
            subject: 'فیزیک کنکور (حرکت‌شناسی)',
            teacherOrInstitute: 'کلاس تاملند',
            locationOrType: 'online',
            postClassStudyHoursNeeded: 1.5
          },
          {
            id: 'cls-3',
            dayName: 'چهارشنبه',
            startTime: '۱۷:۰۰',
            endTime: '۱۹:۰۰',
            subject: 'شیمی ۳ (استوکیومتری)',
            teacherOrInstitute: 'کلاس حضوری آموزشگاه',
            locationOrType: 'in_person',
            postClassStudyHoursNeeded: 1.0
          }
        ],
        topicDetails: [
          {
            id: 'td-1',
            subject: 'حسابان ۲',
            chapter: 'کاربرد مشتق',
            subtopic: 'اکسترمم‌های نسبی و بهینه‌سازی',
            difficulty: 'بسیار چالشی و دام‌دار',
            targetTestCount: 140,
            completedTestCount: 0,
            importanceWeight: 'پرتکرار و حیاتی (تضمین درصد)',
            hasPrerequisiteInClass: true
          },
          {
            id: 'td-2',
            subject: 'فیزیک ۳',
            chapter: 'حرکت بر خط راست',
            subtopic: 'سقوط آزاد و شتاب ثابت',
            difficulty: 'سخت',
            targetTestCount: 120,
            completedTestCount: 0,
            importanceWeight: 'پرتکرار و حیاتی (تضمین درصد)',
            hasPrerequisiteInClass: true
          },
          {
            id: 'td-3',
            subject: 'گسسته',
            chapter: 'نظریه اعداد',
            subtopic: 'معادلات همنهشتی خطی',
            difficulty: 'سخت',
            targetTestCount: 80,
            completedTestCount: 0,
            importanceWeight: 'متوسط',
            hasPrerequisiteInClass: false
          },
          {
            id: 'td-4',
            subject: 'هندسه ۳',
            chapter: 'ماتریس و دترمینان',
            subtopic: 'دستگاه معادلات خطی و معکوس ماتریس',
            difficulty: 'متوسط',
            targetTestCount: 70,
            completedTestCount: 0,
            importanceWeight: 'متوسط',
            hasPrerequisiteInClass: false
          },
          {
            id: 'td-5',
            subject: 'شیمی ۳',
            chapter: 'استوکیومتری و محاسبات',
            subtopic: 'درصد خلوص و بازده درصدی واکنش',
            difficulty: 'متوسط',
            targetTestCount: 70,
            completedTestCount: 0,
            importanceWeight: 'پرتکرار و حیاتی (تضمین درصد)',
            hasPrerequisiteInClass: true
          }
        ]
      });
      setExtractSuccess('بودجه‌بندی آزمون قلم‌چی به همراه کلاس‌های هفتگی و تفکیک سختی مباحث بارگذاری شد!');
    } else if (presetType === 'maze') {
      onUpdateExamBudget({
        examName: 'آزمون جامع مرحله‌ای ماز (رشته ریاضی)',
        examDate: 'جمعه ۲۵ آبان',
        targetGoalText: 'درصد فیزیک بالای ۷۰٪ و هندسه بالای ۶۰٪',
        syllabusDetails: 'حسابان: مثلثات و حد و پیوستگی؛ هندسه: دایره و تبدیلات هندسی؛ فیزیک: ترمودینامیک و الکتریسیته ساکن؛ گسسته: گراف و آمار؛ شیمی: اسیدها و بازها',
        selectedTopics: [
          'مثلثات (حسابان ۱ و ۲)',
          'حد و پیوستگی (حسابان ۱ و ۲)',
          'ترمودینامیک (فیزیک ۱ دهم - اختصاصی رشته ریاضی)',
          'گراف و مدل‌سازی (ریاضی گسسته دوازدهم)',
          'اسیدها و بازها و تعادل شیمیایی (شیمی ۳ دوازدهم)'
        ],
        totalTargetTests: 450,
        weeklyClasses: [
          {
            id: 'cls-m1',
            dayName: 'دوشنبه',
            startTime: '۱۶:۰۰',
            endTime: '۱۹:۰۰',
            subject: 'حسابان (مثلثات و حد)',
            teacherOrInstitute: 'استاد ماز',
            locationOrType: 'online',
            postClassStudyHoursNeeded: 1.5
          },
          {
            id: 'cls-m2',
            dayName: 'پنج‌شنبه',
            startTime: '۱۰:۰۰',
            endTime: '۱۳:۰۰',
            subject: 'فیزیک ترمودینامیک و الکتریسیته',
            teacherOrInstitute: 'کلاس آنلاین',
            locationOrType: 'online',
            postClassStudyHoursNeeded: 1.5
          }
        ],
        topicDetails: [
          {
            id: 'td-m1',
            subject: 'حسابان',
            chapter: 'مثلثات و معادلات مثلثاتی',
            subtopic: 'فرمول‌های تبدیل و حل معادلات',
            difficulty: 'بسیار چالشی و دام‌دار',
            targetTestCount: 130,
            completedTestCount: 0,
            importanceWeight: 'پرتکرار و حیاتی (تضمین درصد)',
            hasPrerequisiteInClass: true
          },
          {
            id: 'td-m2',
            subject: 'فیزیک',
            chapter: 'ترمودینامیک دهم',
            subtopic: 'چرخه‌های ترمودینامیکی و ماشین گرمایی',
            difficulty: 'سخت',
            targetTestCount: 110,
            completedTestCount: 0,
            importanceWeight: 'پرتکرار و حیاتی (تضمین درصد)',
            hasPrerequisiteInClass: true
          },
          {
            id: 'td-m3',
            subject: 'شیمی ۳',
            chapter: 'اسید و باز',
            subtopic: 'محاسبات pH و بافرها',
            difficulty: 'بسیار چالشی و دام‌دار',
            targetTestCount: 90,
            completedTestCount: 0,
            importanceWeight: 'پرتکرار و حیاتی (تضمین درصد)',
            hasPrerequisiteInClass: false
          },
          {
            id: 'td-m4',
            subject: 'گسسته',
            chapter: 'گراف و مدل‌سازی',
            subtopic: 'مرتبه و درجه، مسیر و دور، درخت',
            difficulty: 'متوسط',
            targetTestCount: 65,
            completedTestCount: 0,
            importanceWeight: 'متوسط',
            hasPrerequisiteInClass: false
          },
          {
            id: 'td-m5',
            subject: 'هندسه',
            chapter: 'دایره و تبدیلات',
            subtopic: 'طول مماس و تجانس هندسی',
            difficulty: 'متوسط',
            targetTestCount: 55,
            completedTestCount: 0,
            importanceWeight: 'متوسط',
            hasPrerequisiteInClass: false
          }
        ]
      });
      setExtractSuccess('بودجه‌بندی آزمون ماز به همراه کلاس‌ها و سرفصل‌ها بارگذاری شد!');
    } else {
      onUpdateExamBudget({
        examName: 'آزمون جامع سنجش ریاضی',
        examDate: 'جمعه ۲ آذر',
        targetGoalText: 'رتبه زیر ۵۰۰ منطقه و تراز بالای ۷۲۰۰',
        syllabusDetails: 'پوشش کامل مباحث نیم‌سال اول دوازدهم + پایه‌های دهم و یازدهم',
        selectedTopics: [
          'تابع (حسابان ۱ و ۲ + ریاضی ۱)',
          'مشتق و کاربرد مشتق (حسابان ۲)',
          'دینامیک و تکانه (فیزیک ۳ دوازدهم)',
          'هندسه ۳ (پایه دوازدهم)',
          'ترکیبیات و شمارش (گسسته دوازدهم + آمار یازدهم)'
        ],
        totalTargetTests: 520,
        weeklyClasses: [
          {
            id: 'cls-s1',
            dayName: 'شنبه',
            startTime: '۱۷:۰۰',
            endTime: '۲۰:۰۰',
            subject: 'دینامیک و فیزیک دوازدهم',
            teacherOrInstitute: 'کلاس آنلاین',
            locationOrType: 'online',
            postClassStudyHoursNeeded: 1.5
          },
          {
            id: 'cls-s2',
            dayName: 'سه‌شنبه',
            startTime: '۱۶:۳۰',
            endTime: '۱۹:۳۰',
            subject: 'حسابان ۲ و تست مشتق',
            teacherOrInstitute: 'کلاس آنلاین',
            locationOrType: 'online',
            postClassStudyHoursNeeded: 1.5
          }
        ],
        topicDetails: [
          {
            id: 'td-s1',
            subject: 'حسابان ۲',
            chapter: 'مشتق و کاربرد مشتق',
            subtopic: 'آزمون‌های مشتق اول و دوم',
            difficulty: 'بسیار چالشی و دام‌دار',
            targetTestCount: 150,
            completedTestCount: 0,
            importanceWeight: 'پرتکرار و حیاتی (تضمین درصد)',
            hasPrerequisiteInClass: true
          },
          {
            id: 'td-s2',
            subject: 'فیزیک ۳',
            chapter: 'دینامیک و تکانه',
            subtopic: 'تکانه، نیروی اصطکاک و قرقره‌ها',
            difficulty: 'سخت',
            targetTestCount: 130,
            completedTestCount: 0,
            importanceWeight: 'پرتکرار و حیاتی (تضمین درصد)',
            hasPrerequisiteInClass: true
          },
          {
            id: 'td-s3',
            subject: 'گسسته',
            chapter: 'ترکیبیات و شمارش',
            subtopic: 'اصل شمول و عدم شمول و لانه کبوتری',
            difficulty: 'سخت',
            targetTestCount: 90,
            completedTestCount: 0,
            importanceWeight: 'متوسط',
            hasPrerequisiteInClass: false
          },
          {
            id: 'td-s4',
            subject: 'هندسه ۳',
            chapter: 'هندسه تحلیلی و مقاطع',
            subtopic: 'وضعیت خط و دایره و خروج از مرکز بیضی',
            difficulty: 'متوسط',
            targetTestCount: 80,
            completedTestCount: 0,
            importanceWeight: 'متوسط',
            hasPrerequisiteInClass: false
          },
          {
            id: 'td-s5',
            subject: 'ریاضی پایه',
            chapter: 'تابع',
            subtopic: 'ترکیب توابع و تابع یک‌به‌یک وارون',
            difficulty: 'متوسط',
            targetTestCount: 70,
            completedTestCount: 0,
            importanceWeight: 'پرتکرار و حیاتی (تضمین درصد)',
            hasPrerequisiteInClass: false
          }
        ]
      });
      setExtractSuccess('بودجه‌بندی آزمون جامع سنجش با کلاس‌ها و سرفصل‌ها بارگذاری شد!');
    }
  };

  const handleGenerateExamSchedule = async () => {
    setIsGenerating(true);
    setGenerateError(null);
    setSuccessMessage(null);

    try {
      const response = await fetch('/api/advisor/generate-schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profile,
          focusNotes: `برنامه فشرده ویژه آمادگی آزمون ${examBudget.examName} (${examBudget.examDate}). مباحث هدف: ${examBudget.selectedTopics.join('، ') || examBudget.syllabusDetails}`,
          examBudget
        }),
      });

      if (!response.ok) {
        throw new Error('خطا در تولید برنامه در سرور');
      }

      const data = await response.json();
      if (data.schedule) {
        onApplyNewSchedule(data.schedule);
        setSuccessMessage('برنامه هفتگی اختصاصی آزمون با موفقیت ساخته شد و در تب برنامه هفتگی اعمال گردید!');
        setTimeout(() => {
          onSwitchToScheduleTab();
        }, 1200);
      }
    } catch (err: any) {
      setGenerateError('مشکلی در ساخت برنامه پیش آمد؛ لطفاً مجدداً امتحان کنید.');
    } finally {
      setIsGenerating(false);
    }
  };

  const activeStreamOption = STREAM_OPTIONS.find(s => s.id === currentStream) || STREAM_OPTIONS[0];

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header Banner */}
      <div className="bg-gradient-to-l from-stone-900 via-stone-800 to-emerald-950 text-white rounded-2xl p-6 sm:p-8 shadow-sm">
        <div className="max-w-4xl">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-semibold border border-emerald-500/30">
              <Sparkles className="w-3.5 h-3.5" />
              <span>مرکز تخصصی منابع، بانک تست و بودجه‌بندی کنکور سراسری</span>
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-stone-800 text-emerald-300 text-xs font-bold border border-stone-700">
              <Calendar className="w-3.5 h-3.5 text-emerald-400" />
              <span>امروز: {todayInfo.formattedFullDate}</span>
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 text-xs font-bold border border-amber-500/30">
              <Target className="w-3.5 h-3.5 text-amber-400" />
              <span>آزمون بعدی: {examBudget.examName || 'پیش‌رو'} ({activeExamCountdown.isToday ? 'امروز روز آزمون است!' : `⏳ ${toPersianDigits(activeExamCountdown.daysLeft ?? todayInfo.daysUntilThisFriday)} روز مانده`})</span>
            </div>
            <span className="px-2.5 py-0.5 rounded-full bg-stone-800 text-stone-300 text-[11px] font-bold border border-stone-700">
              رشته فعال: {activeStreamOption.name}
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white mb-2">
            تقویم آزمون‌ها، اطلس سرفصل‌ها و چیدن برنامه هوشمند
          </h1>
          <p className="text-stone-300 text-sm leading-relaxed">
            بودجه‌بندی آزمون‌های آزمایشی سراسری (قلم‌چی، ماز، سنجش و گزینه دو) را مشاهده کنید، مباحث آزمون هدف بعدیتان را تعیین نمایید و با یک کلیک برنامه هفتگی و روزانه کاملاً شخصی‌سازی‌شده تحویل بگیرید.
          </p>

          {/* Stream Selector Pill Buttons */}
          <div className="mt-5 flex flex-wrap items-center gap-2">
            <span className="text-xs text-stone-400 font-medium ml-1">انتخاب رشته کنکور:</span>
            {STREAM_OPTIONS.map((stream) => {
              const isSelected = currentStream === stream.id;
              return (
                <button
                  key={stream.id}
                  type="button"
                  onClick={() => {
                    setCurrentStream(stream.id);
                    setSelectedSubjectFilter('all');
                  }}
                  className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-emerald-500 text-stone-950 shadow-md ring-2 ring-emerald-400/40'
                      : 'bg-stone-800/90 text-stone-300 hover:bg-stone-700/80 border border-stone-700'
                  }`}
                >
                  <span>{stream.name}</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-medium ${
                    isSelected ? 'bg-stone-950/20 text-stone-950' : 'bg-stone-700 text-stone-400'
                  }`}>
                    {stream.badge}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* View Switcher Pills */}
        <div className="flex flex-wrap items-center gap-2 mt-6 pt-5 border-t border-stone-700/60">
          <button
            onClick={() => setActiveSubTab('calendar')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeSubTab === 'calendar'
                ? 'bg-emerald-500 text-stone-950 shadow-sm font-bold'
                : 'bg-stone-800/80 hover:bg-stone-800 text-stone-300 border border-stone-700'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>برنامه و بودجه‌بندی آزمون</span>
          </button>

          <button
            onClick={() => setActiveSubTab('classes')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeSubTab === 'classes'
                ? 'bg-emerald-500 text-stone-950 shadow-sm font-bold'
                : 'bg-stone-800/80 hover:bg-stone-800 text-stone-300 border border-stone-700'
            }`}
          >
            <School className="w-4 h-4" />
            <span>کلاس‌های هفتگی و مدرسه ({(examBudget.weeklyClasses || []).length})</span>
          </button>

          <button
            onClick={() => setActiveSubTab('atlas')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeSubTab === 'atlas'
                ? 'bg-emerald-500 text-stone-950 shadow-sm'
                : 'bg-stone-800/80 hover:bg-stone-800 text-stone-300 border border-stone-700'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>اطلس سرفصل‌ها و تست‌های لازم</span>
          </button>

          <button
            onClick={() => setActiveSubTab('sources')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeSubTab === 'sources'
                ? 'bg-emerald-500 text-stone-950 shadow-sm'
                : 'bg-stone-800/80 hover:bg-stone-800 text-stone-300 border border-stone-700'
            }`}
          >
            <Library className="w-4 h-4" />
            <span>بانک منابع و روش تسلط رتبه‌برترها</span>
          </button>

          <button
            onClick={() => setActiveSubTab('calculator')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeSubTab === 'calculator'
                ? 'bg-emerald-500 text-stone-950 shadow-sm'
                : 'bg-stone-800/80 hover:bg-stone-800 text-stone-300 border border-stone-700'
            }`}
          >
            <Calculator className="w-4 h-4" />
            <span>محاسبه‌گر حجم تست بودجه‌بندی ({examBudget.selectedTopics.length} مبحث)</span>
          </button>
        </div>

        {/* Quick Launch Pro Tools Row */}
        {onSwitchToProToolsTab && (
          <div className="mt-4 pt-3 border-t border-stone-700/40 flex flex-wrap items-center gap-2 text-xs">
            <span className="text-stone-400 text-[11px] font-semibold">دسترسی سریع به ابزارهای تکمیلی کنکور:</span>
            <button
              onClick={() => onSwitchToProToolsTab('postmortem')}
              className="px-2.5 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 text-[11px] font-medium transition cursor-pointer"
            >
              کالبدشکافی اشتباهات آزمون
            </button>
            <button
              onClick={() => onSwitchToProToolsTab('focus_speed')}
              className="px-2.5 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 text-[11px] font-medium transition cursor-pointer"
            >
              استاپ‌واچ تست‌زنی سرعتی
            </button>
            <button
              onClick={() => onSwitchToProToolsTab('heatmap')}
              className="px-2.5 py-1 rounded-lg bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 border border-blue-500/30 text-[11px] font-medium transition cursor-pointer"
            >
              نقشه حرارتی سرفصل‌ها
            </button>
            <button
              onClick={() => onSwitchToProToolsTab('trap_quizzer')}
              className="px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 text-[11px] font-medium transition cursor-pointer"
            >
              تله‌یاب هوشمند کنکور
            </button>
            <button
              onClick={() => onSwitchToProToolsTab('final_exam')}
              className="px-2.5 py-1 rounded-lg bg-violet-500/20 hover:bg-violet-500/30 text-violet-300 border border-violet-500/30 text-[11px] font-medium transition cursor-pointer"
            >
              تعادل امتحانات نهایی ۵۰٪
            </button>
          </div>
        )}
      </div>

      {/* SUB-VIEW 0: EXAM SCHEDULE & SYLLABUS BUDGET */}
      {activeSubTab === 'calendar' && (
        <ExamBudgetSection
          profile={profile}
          examBudget={examBudget}
          currentStream={currentStream}
          onUpdateExamBudget={onUpdateExamBudget}
          onApplyNewSchedule={onApplyNewSchedule}
          onSwitchToScheduleTab={onSwitchToScheduleTab}
          onSwitchToClassesTab={() => setActiveSubTab('classes')}
        />
      )}

      {/* SUB-VIEW 1: WEEKLY CLASSES & SCHOOL SCHEDULE */}
      {activeSubTab === 'classes' && (
        <WeeklyClassesSection
          profile={profile}
          examBudget={examBudget}
          onUpdateExamBudget={onUpdateExamBudget}
          onSwitchToScheduleTab={onSwitchToScheduleTab}
        />
      )}

      {/* SUB-VIEW 1: CURRICULUM ATLAS & TOPIC CARDS */}
      {activeSubTab === 'atlas' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-stone-900 flex items-center gap-2">
                <Layers className="w-5 h-5 text-emerald-700" />
                <span>
                  اطلس سرفصل‌های کنکور {currentStream === 'experimental' ? 'تجربی' : currentStream === 'humanities' ? 'علوم انسانی' : 'ریاضی'}، تعداد تست‌های لازم و منابع
                </span>
              </h2>
              <p className="text-xs text-stone-500">
                تعداد تست‌های لازم برای تسلط (آموزشی، زمان‌دار و مروری) و کتاب‌های برتر هر فصل را بررسی کن و به برنامه اضافه کن.
              </p>
            </div>

            {/* Search bar & Advanced Search Trigger */}
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-64">
                <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-stone-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="جستجوی سریع مبحث، منبع یا ناشر..."
                  className="w-full pr-9 pl-3 py-2 text-xs rounded-xl border border-stone-200 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <button
                type="button"
                onClick={() => setIsAdvSearchModalOpen(true)}
                className="px-3.5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-2xs whitespace-nowrap"
                title="باز کردن کاوشگر پیشرفته و مشاور هوشمند منابع"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>کاوشگر و مشاوره هوشمند منابع</span>
              </button>
            </div>
          </div>

          {/* Stream Switcher Bar inside Atlas */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-stone-900 text-stone-100 p-3 rounded-2xl shadow-xs">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-emerald-400">رشته تحصیلی اطلس:</span>
              <div className="flex items-center gap-1.5">
                {STREAM_OPTIONS.map((st) => (
                  <button
                    key={st.id}
                    onClick={() => {
                      setCurrentStream(st.id);
                      setSelectedSubjectFilter('all');
                      setSelectedGradeFilter('all');
                      setSelectedDifficultyFilter('all');
                    }}
                    className={`px-3 py-1 rounded-xl text-xs font-bold transition cursor-pointer ${
                      currentStream === st.id
                        ? 'bg-emerald-500 text-stone-950 shadow-sm'
                        : 'bg-stone-800 text-stone-300 hover:bg-stone-700'
                    }`}
                  >
                    {st.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Quick Action: Select All / Clear All Filtered */}
            <div className="flex items-center gap-2 text-xs">
              <span className="text-stone-400 text-[11px]">
                {filteredTopics.length} سرفصل یافت شد ({examBudget.selectedTopics.length} مورد در بودجه‌بندی آزمون)
              </span>
              <button
                onClick={() => {
                  const toAdd = filteredTopics.map(t => t.chapter).filter(c => !examBudget.selectedTopics.includes(c));
                  if (toAdd.length > 0) {
                    onUpdateExamBudget({
                      ...examBudget,
                      selectedTopics: [...examBudget.selectedTopics, ...toAdd]
                    });
                  }
                }}
                className="px-2.5 py-1 rounded-lg bg-emerald-600/30 hover:bg-emerald-600/40 text-emerald-300 border border-emerald-500/30 text-[11px] font-semibold transition cursor-pointer"
                title="افزودن همه مباحث فیلتر شده فعلی به بودجه‌بندی آزمون"
              >
                + افزودن همه مباحث این بخش
              </button>
              {examBudget.selectedTopics.length > 0 && (
                <button
                  onClick={() => {
                    const filteredChapters = new Set(filteredTopics.map(t => t.chapter));
                    onUpdateExamBudget({
                      ...examBudget,
                      selectedTopics: examBudget.selectedTopics.filter(c => !filteredChapters.has(c))
                    });
                  }}
                  className="px-2.5 py-1 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-400 hover:text-rose-300 text-[11px] transition cursor-pointer"
                  title="حذف موارد فیلتر شده از بودجه‌بندی آزمون"
                >
                  حذف از بودجه‌بندی
                </button>
              )}
            </div>
          </div>

          {/* Filter Bar: Subject, Grade, and Difficulty */}
          <div className="space-y-2 bg-stone-50 p-3 rounded-2xl border border-stone-200">
            {/* Subject Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs scrollbar-none">
              <span className="text-[11px] font-bold text-stone-500 shrink-0 ml-1">درس:</span>
              {availableSubjectFilters.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setSelectedSubjectFilter(item.id)}
                  className={`px-3 py-1 rounded-lg whitespace-nowrap font-medium transition-all cursor-pointer ${
                    selectedSubjectFilter === item.id
                      ? 'bg-stone-900 text-white shadow-xs'
                      : 'bg-white text-stone-600 border border-stone-200 hover:bg-stone-100'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>

            {/* Grade & Difficulty Pills */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-stone-200/60">
              <div className="flex items-center gap-1.5 overflow-x-auto text-xs">
                <span className="text-[11px] font-bold text-stone-500 shrink-0 ml-1">پایه:</span>
                {[
                  { id: 'all', label: 'همه پایه‌ها' },
                  { id: 'دهم', label: 'پایه دهم' },
                  { id: 'یازدهم', label: 'پایه یازدهم' },
                  { id: 'دوازدهم', label: 'پایه دوازدهم' }
                ].map((g) => (
                  <button
                    key={g.id}
                    onClick={() => setSelectedGradeFilter(g.id)}
                    className={`px-2.5 py-0.5 rounded-md text-[11px] font-medium transition cursor-pointer ${
                      selectedGradeFilter === g.id
                        ? 'bg-emerald-700 text-white shadow-2xs font-bold'
                        : 'bg-white text-stone-600 border border-stone-200 hover:bg-stone-100'
                    }`}
                  >
                    {g.label}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-1.5 overflow-x-auto text-xs">
                <span className="text-[11px] font-bold text-stone-500 shrink-0 ml-1">سختی:</span>
                {[
                  { id: 'all', label: 'همه سطوح' },
                  { id: 'آسان', label: 'روان و آسان' },
                  { id: 'متوسط', label: 'متوسط' },
                  { id: 'سخت', label: 'سخت' },
                  { id: 'چالش', label: 'بسیار چالشی' }
                ].map((d) => (
                  <button
                    key={d.id}
                    onClick={() => setSelectedDifficultyFilter(d.id)}
                    className={`px-2.5 py-0.5 rounded-md text-[11px] font-medium transition cursor-pointer ${
                      selectedDifficultyFilter === d.id
                        ? 'bg-amber-700 text-white shadow-2xs font-bold'
                        : 'bg-white text-stone-600 border border-stone-200 hover:bg-stone-100'
                    }`}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Topics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredTopics.map((topic) => {
              const isSelected = examBudget.selectedTopics.includes(topic.chapter);
              const isExpanded = expandedTopicId === topic.id;
              const difficultyBadge =
                topic.difficulty === 'بسیار چالش‌برانگیز'
                  ? 'bg-rose-50 text-rose-700 border-rose-200'
                  : topic.difficulty === 'سخت'
                  ? 'bg-amber-50 text-amber-700 border-amber-200'
                  : 'bg-emerald-50 text-emerald-700 border-emerald-200';

              return (
                <div
                  key={topic.id}
                  className={`bg-white border rounded-2xl p-5 transition-all shadow-xs flex flex-col justify-between ${
                    isSelected ? 'border-emerald-500 ring-2 ring-emerald-500/10' : 'border-stone-200'
                  }`}
                >
                  <div>
                    {/* Top Bar */}
                    <div className="flex items-start justify-between gap-3 mb-2.5">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md">
                            {topic.subject}
                          </span>
                          <span className="text-[11px] text-stone-500">
                            {topic.grade}
                          </span>
                        </div>
                        <h3 className="font-bold text-stone-900 text-sm sm:text-base">
                          {topic.chapter}
                        </h3>
                      </div>

                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border whitespace-nowrap ${difficultyBadge}`}>
                        سختی: {topic.difficulty}
                      </span>
                    </div>

                    {/* Weight in Konkur */}
                    <div className="flex items-center gap-1.5 text-xs text-stone-500 mb-3">
                      <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                      <span>بودجه‌بندی کنکور: <strong className="text-stone-700 font-semibold">{topic.conceptWeight}</strong></span>
                    </div>

                    {/* TEST VOLUME HIGHLIGHT BOX */}
                    {topic.testVolume && (
                      <div className="mb-3.5 bg-emerald-50/70 border border-emerald-200/80 rounded-xl p-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
                            <Calculator className="w-3.5 h-3.5 text-emerald-700" />
                            <span>تعداد تست‌های لازم برای تسلط کامل:</span>
                          </span>
                          <span className="text-xs font-black text-emerald-800 bg-white px-2 py-0.5 rounded-md shadow-2xs border border-emerald-100">
                            مجموع {topic.testVolume.totalRecommendedTests} تست
                          </span>
                        </div>

                        <div className="grid grid-cols-3 gap-2 text-center text-[11px]">
                          <div className="bg-white/80 rounded-lg p-1.5 border border-emerald-100">
                            <span className="text-stone-500 block text-[10px]">تست آموزشی</span>
                            <strong className="text-stone-800 font-bold">{topic.testVolume.learningTests} تست</strong>
                          </div>
                          <div className="bg-white/80 rounded-lg p-1.5 border border-emerald-100">
                            <span className="text-stone-500 block text-[10px]">تست زمان‌دار</span>
                            <strong className="text-emerald-800 font-bold">{topic.testVolume.timedPracticeTests} تست</strong>
                          </div>
                          <div className="bg-white/80 rounded-lg p-1.5 border border-emerald-100">
                            <span className="text-stone-500 block text-[10px]">تست مروری</span>
                            <strong className="text-stone-800 font-bold">{topic.testVolume.reviewTests} تست</strong>
                          </div>
                        </div>
                        <div className="mt-2 text-[10px] text-stone-500 text-left">
                          زمان تخمینی مطالعه و تحلیل: <strong>{topic.testVolume.estimatedStudyHours} ساعت</strong>
                        </div>
                      </div>
                    )}

                    {/* Subtopics Checklist */}
                    {topic.subtopics && topic.subtopics.length > 0 && (
                      <div className="space-y-1.5 mb-3 bg-stone-50 rounded-xl p-3 border border-stone-100">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[11px] font-bold text-stone-700">
                            زیربخش‌های کلیدی فصل:
                          </span>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-stone-500 font-medium">
                              {topic.subtopics.filter(sub => completedSubtopics[`${topic.id}-${sub}`]).length} از {topic.subtopics.length} خوانده شده
                            </span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                const allDone = topic.subtopics.every(sub => completedSubtopics[`${topic.id}-${sub}`]);
                                setCompletedSubtopics(prev => {
                                  const updated = { ...prev };
                                  topic.subtopics.forEach(sub => {
                                    updated[`${topic.id}-${sub}`] = !allDone;
                                  });
                                  try {
                                    localStorage.setItem('advisor_completed_subtopics', JSON.stringify(updated));
                                  } catch {}
                                  return updated;
                                });
                              }}
                              className="text-[10px] text-emerald-700 hover:text-emerald-900 font-bold underline cursor-pointer"
                            >
                              {topic.subtopics.every(sub => completedSubtopics[`${topic.id}-${sub}`]) ? 'لغو همه' : 'تیک همه'}
                            </button>
                          </div>
                        </div>
                        {topic.subtopics.map((sub, i) => {
                          const subKey = `${topic.id}-${sub}`;
                          const isDone = !!completedSubtopics[subKey];
                          return (
                            <div 
                              key={i} 
                              onClick={() => toggleSubtopicCompleted(subKey)}
                              className={`flex items-start gap-2 text-xs leading-relaxed p-1.5 rounded-lg cursor-pointer transition select-none ${
                                isDone 
                                  ? 'bg-emerald-50/80 text-emerald-900 line-through decoration-emerald-500/60' 
                                  : 'text-stone-700 hover:bg-stone-100/70'
                              }`}
                            >
                              <div className={`w-3.5 h-3.5 rounded mt-0.5 shrink-0 flex items-center justify-center border transition ${
                                isDone ? 'bg-emerald-600 border-emerald-600 text-white' : 'border-stone-300 bg-white'
                              }`}>
                                {isDone && <CheckCircle className="w-3 h-3 text-white" />}
                              </div>
                              <span className={isDone ? 'opacity-80' : ''}>{sub}</span>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* RECOMMENDED BOOKS ACCORDION TOGGLE */}
                    {topic.recommendedBooks && topic.recommendedBooks.length > 0 && (
                      <div className="mb-3">
                        <button
                          type="button"
                          onClick={() => setExpandedTopicId(isExpanded ? null : topic.id)}
                          className="w-full flex items-center justify-between p-2.5 rounded-xl bg-stone-100/80 hover:bg-stone-100 text-xs font-semibold text-stone-800 transition cursor-pointer"
                        >
                          <span className="flex items-center gap-1.5">
                            <BookOpen className="w-3.5 h-3.5 text-emerald-700" />
                            <span>مشاهده کتاب‌ها و منابع تستی پیشنهادی ({topic.recommendedBooks.length} منبع)</span>
                          </span>
                          {isExpanded ? <ChevronUp className="w-4 h-4 text-stone-500" /> : <ChevronDown className="w-4 h-4 text-stone-500" />}
                        </button>

                        {isExpanded && (
                          <div className="mt-2 space-y-2 pt-1">
                            {topic.recommendedBooks.map((book, idx) => (
                              <div key={idx} className="bg-stone-50 border border-stone-200/80 rounded-xl p-3 text-xs">
                                <div className="flex items-start justify-between gap-2 mb-1">
                                  <strong className="text-stone-900 font-bold">{book.title}</strong>
                                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md whitespace-nowrap ${
                                    book.tier === 'tier1_learning' 
                                      ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                      : book.tier === 'tier2_mastery'
                                      ? 'bg-amber-50 text-amber-800 border border-amber-200'
                                      : 'bg-purple-50 text-purple-700 border border-purple-200'
                                  }`}>
                                    {book.tierLabel}
                                  </span>
                                </div>
                                <p className="text-[11px] text-stone-600 leading-relaxed mb-1.5">
                                  {book.description}
                                </p>
                                <div className="text-[10px] text-emerald-800 font-medium bg-emerald-50/80 px-2 py-1 rounded-md">
                                  هدف: {book.recommendedFor}
                                </div>
                              </div>
                            ))}

                            {topic.masteryTips && topic.masteryTips.length > 0 && (
                              <div className="bg-stone-100/90 rounded-xl p-3 border border-stone-200 text-xs mt-2">
                                <span className="font-bold text-stone-800 block mb-1">توصیه طلایی تسلط بر این فصل:</span>
                                <ul className="space-y-1 text-[11px] text-stone-700">
                                  {topic.masteryTips.map((tip, tIdx) => (
                                    <li key={tIdx} className="flex items-start gap-1">
                                      <span className="text-emerald-600 font-bold">✓</span>
                                      <span>{tip}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Key Challenges / Trap Warnings */}
                    {topic.keyChallenges && topic.keyChallenges.length > 0 && (
                      <div className="mb-4 bg-amber-50/60 rounded-xl p-3 border border-amber-100/70">
                        <span className="text-[11px] font-bold text-amber-900 flex items-center gap-1 mb-1">
                          <AlertCircle className="w-3 h-3 text-amber-600" />
                          تله‌های تستی و سختی‌های این بخش:
                        </span>
                        <ul className="space-y-1 text-[11px] text-amber-800/90 leading-relaxed">
                          {topic.keyChallenges.map((ch, idx) => (
                            <li key={idx} className="flex items-start gap-1.5">
                              <span className="text-amber-500 font-bold">•</span>
                              <span>{ch}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  {/* Card Action Button */}
                  <button
                    onClick={() => handleToggleTopic(topic.chapter)}
                    className={`w-full py-2.5 px-4 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300 hover:bg-emerald-200'
                        : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                    }`}
                  >
                    {isSelected ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-700" />
                        <span>در بودجه‌بندی آزمون ثبت شد (حذف)</span>
                      </>
                    ) : (
                      <>
                        <Plus className="w-3.5 h-3.5 text-stone-500" />
                        <span>+ افزودن به بودجه‌بندی آزمون این هفته</span>
                      </>
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SUB-VIEW 2: COMPREHENSIVE TEXTBOOK GUIDE (بانک منابع و روش تسلط) */}
      {activeSubTab === 'sources' && (
        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-bold text-stone-900 flex items-center gap-2">
              <Library className="w-5 h-5 text-emerald-700" />
              <span>راهنمای جامع منابع و روش تسلط رتبه‌برترهای {activeStreamOption.name}</span>
            </h2>
            <p className="text-xs text-stone-500">
              منابع کنکور بر مبنای ۳ سطح تخصصی (آموزش پایه و درسنامه، تسلط تست‌های ایده‌دار و آزمون‌های سرعتی و جامع) دسته‌بندی شده‌اند.
            </p>
          </div>

          <div className="space-y-6">
            {activeMasterBooks.map((resource, rIdx) => (
              <div key={rIdx} className="bg-white border border-stone-200 rounded-2xl p-6 shadow-xs">
                <div className="flex items-center justify-between gap-3 pb-4 border-b border-stone-100 mb-4">
                  <h3 className="text-base font-bold text-stone-900 flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-emerald-600" />
                    <span>{resource.subject}</span>
                  </h3>
                  <span className="text-xs text-stone-500 font-medium">
                    رشته {activeStreamOption.name}
                  </span>
                </div>

                {/* 3 Tier Books */}
                {resource.bestBooks && resource.bestBooks.length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
                    {resource.bestBooks.map((book, bIdx) => (
                      <div
                        key={bIdx}
                        className="rounded-xl p-4 border flex flex-col justify-between bg-stone-50/50 border-stone-200"
                      >
                        <div>
                          <div className="mb-2">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full inline-block mb-1.5 ${
                              book.tier === 'tier1_learning'
                                ? 'bg-blue-100 text-blue-800'
                                : book.tier === 'tier2_mastery'
                                ? 'bg-amber-100 text-amber-900'
                                : 'bg-purple-100 text-purple-900'
                            }`}>
                              {book.tierName}
                            </span>
                            <h4 className="font-bold text-stone-900 text-xs sm:text-sm">
                              {book.title}
                            </h4>
                            <span className="text-[11px] text-stone-500 block">
                              {book.authorOrPublisher}
                            </span>
                          </div>

                          <p className="text-xs text-stone-600 leading-relaxed mb-3">
                            {book.description}
                          </p>
                        </div>

                        <div className="bg-white p-2.5 rounded-lg border border-stone-200/70 text-[11px] text-stone-700">
                          <strong className="text-emerald-800 font-bold block mb-1">شیوه استفاده و تسلط:</strong>
                          <span>{book.studyMethod}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Overall Study Strategy for this subject */}
                {resource.overallStudyStrategy && resource.overallStudyStrategy.length > 0 && (
                  <div className="bg-emerald-50/50 border border-emerald-200/60 rounded-xl p-4">
                    <h5 className="text-xs font-bold text-emerald-950 flex items-center gap-1.5 mb-2">
                      <Flame className="w-3.5 h-3.5 text-emerald-700" />
                      <span>قوانین طلایی برای درصد بالای ۷۰٪ در {resource.subject}:</span>
                    </h5>
                    <ul className="space-y-1.5 text-xs text-emerald-900">
                      {resource.overallStudyStrategy.map((strat, sIdx) => (
                        <li key={sIdx} className="flex items-start gap-2">
                          <span className="text-emerald-600 font-bold">•</span>
                          <span>{strat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SUB-VIEW 3: DYNAMIC TEST VOLUME CALCULATOR (محاسبه‌گر حجم تست و بودجه‌بندی) */}
      {activeSubTab === 'calculator' && (
        <div className="space-y-6">
          <div className="bg-white border border-stone-200 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center gap-3 pb-5 border-b border-stone-100">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
                <Calculator className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-stone-900">
                  محاسبه‌گر حجم تست و زمان مطالعه بودجه‌بندی آزمون
                </h2>
                <p className="text-xs text-stone-500">
                  این محاسبه‌گر بر اساس مباحث انتخابی شما، حجم تست استاندارد و سرعت روزانه را تخمین می‌زند.
                </p>
              </div>
            </div>

            {selectedTopicObjects.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-12 h-12 rounded-full bg-stone-100 text-stone-400 flex items-center justify-center mx-auto mb-3">
                  <Target className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-bold text-stone-700 mb-1">
                  هنوز مبحثی برای آزمون انتخاب نکرده‌اید!
                </h3>
                <p className="text-xs text-stone-500 max-w-sm mx-auto mb-4">
                  به بخش «اطلس سرفصل‌ها» بروید یا از بخش آپلود، عکس بودجه‌بندی آزمون خود را اسکن نمایید.
                </p>
                <button
                  onClick={() => setActiveSubTab('atlas')}
                  className="px-4 py-2 rounded-xl bg-emerald-700 text-white text-xs font-semibold hover:bg-emerald-800 transition cursor-pointer"
                >
                  مشاهده و انتخاب مباحث
                </button>
              </div>
            ) : (
              <div className="space-y-6 mt-5">
                {/* Metrics 4-Box Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-4 text-center">
                    <span className="text-[11px] text-emerald-800 font-semibold block mb-1">مجموع تست هدف</span>
                    <strong className="text-2xl font-black text-emerald-950">{grandTotalTests}</strong>
                    <span className="text-[10px] text-emerald-700 block mt-0.5">تست برای درصد بالا</span>
                  </div>

                  <div className="bg-stone-50 border border-stone-200 rounded-xl p-4 text-center">
                    <span className="text-[11px] text-stone-600 font-semibold block mb-1">تست آموزشی (پایه)</span>
                    <strong className="text-2xl font-black text-stone-800">{totalLearningTests}</strong>
                    <span className="text-[10px] text-stone-500 block mt-0.5">حل بدون زمان</span>
                  </div>

                  <div className="bg-stone-50 border border-stone-200 rounded-xl p-4 text-center">
                    <span className="text-[11px] text-stone-600 font-semibold block mb-1">تست تسلط زمان‌دار</span>
                    <strong className="text-2xl font-black text-stone-800">{totalTimedPracticeTests}</strong>
                    <span className="text-[10px] text-stone-500 block mt-0.5">شبیه‌ساز سرعت کنکور</span>
                  </div>

                  <div className="bg-stone-50 border border-stone-200 rounded-xl p-4 text-center">
                    <span className="text-[11px] text-stone-600 font-semibold block mb-1">تست مروری و پوششی</span>
                    <strong className="text-2xl font-black text-stone-800">{totalReviewTests}</strong>
                    <span className="text-[10px] text-stone-500 block mt-0.5">ایستگاه‌های تثبیت</span>
                  </div>
                </div>

                {/* Daily Pace Recommendation */}
                <div className="bg-gradient-to-r from-emerald-900 to-stone-900 text-white rounded-2xl p-5 shadow-xs">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <span className="text-xs text-emerald-300 font-semibold mb-1 block">
                        ضرب‌آهنگ تستی پیشنهادی تا روز آزمون (در بازه ۶ روز کاری):
                      </span>
                      <h4 className="text-lg font-bold text-white">
                        روزانه حداقل <span className="text-emerald-400 font-black text-xl">{dailyTestTarget} تست</span> و <span className="text-emerald-400 font-black text-xl">{dailyHoursTarget} ساعت</span> مطالعه تحلیلی
                      </h4>
                      <p className="text-xs text-stone-300 mt-1">
                        با احتساب ساعت مطالعه هدف شما ({profile.dailyTargetHours} ساعت در روز)، این بودجه‌بندی کاملاً قابل اجرا و منطقی است.
                      </p>
                    </div>

                    <button
                      onClick={handleGenerateExamSchedule}
                      disabled={isGenerating}
                      className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-stone-950 font-bold text-xs shadow-sm transition whitespace-nowrap cursor-pointer"
                    >
                      طراحی جدول برنامه با این ضرایب
                    </button>
                  </div>
                </div>

                {/* Breakdown by Selected Chapter */}
                <div>
                  <h4 className="text-xs font-bold text-stone-800 mb-3">
                    تفکیک حجم تست به ازای هر فصل انتخابی:
                  </h4>
                  <div className="space-y-2">
                    {selectedTopicObjects.map((topic) => (
                      <div
                        key={topic.id}
                        className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-xl bg-stone-50 border border-stone-200/80 text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-emerald-600 shrink-0" />
                          <strong className="text-stone-900 font-bold">{topic.chapter}</strong>
                          <span className="text-stone-400 text-[11px]">({topic.subject})</span>
                        </div>

                        <div className="flex items-center gap-3 text-stone-600">
                          <span>آموزشی: <strong>{topic.testVolume?.learningTests || 100}</strong></span>
                          <span>زمان‌دار: <strong>{topic.testVolume?.timedPracticeTests || 140}</strong></span>
                          <span>مروری: <strong>{topic.testVolume?.reviewTests || 60}</strong></span>
                          <span className="font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                            کل: {topic.testVolume?.totalRecommendedTests || 300} تست
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SECTION 3: Konkur Math Strategy Guidelines */}
      <div className="bg-stone-100 border border-stone-200 rounded-2xl p-6">
        <h3 className="font-bold text-stone-900 text-sm mb-3 flex items-center gap-2">
          <Zap className="w-4 h-4 text-emerald-600" />
          <span>استراتژی‌های طلایی رتبه‌برترهای کنکور ریاضی در چیدمان هفتگی و تست‌زنی:</span>
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-stone-600 leading-relaxed">
          <div className="bg-white p-4 rounded-xl border border-stone-200/80">
            <strong className="text-stone-900 block mb-1">۱. اصل تست‌زنی مضربی (Odd/Even):</strong>
            در منبع اول، همه تست‌ها را یکجا حل نکنید! بار اول تست‌های شماره فرد را بزنید تا کل فصل یک دور خوانده شود. در دور دوم و مرورهای هفتگی، تست‌های زوج را برای بازیابی حافظه بزنید.
          </div>
          <div className="bg-white p-4 rounded-xl border border-stone-200/80">
            <strong className="text-stone-900 block mb-1">۲. تحلیل پاسخنامه تشریحی:</strong>
            حتی تست‌هایی که درست زده‌اید را سریع در پاسخنامه چک کنید؛ ممکن است مولف راه حل تستی یا ایده‌ای سریع‌تر از روش شما به کار برده باشد.
          </div>
          <div className="bg-white p-4 rounded-xl border border-stone-200/80">
            <strong className="text-stone-900 block mb-1">۳. پنج‌شنبه‌های قبل از آزمون:</strong>
            روز پنج‌شنبه مخصوص یادگیری مبحث جدید نیست! فقط مرور فرمول‌های مثلثات، مشتق و فیزیک و حل یک آزمون جامع ۲۰ سؤالی زمان‌دار برای آماده‌باش سرعت عمل.
          </div>
        </div>
      </div>

      {/* Advanced Konkur Resource & Curriculum Search Modal */}
      <KonkurAdvancedSearchModal
        isOpen={isAdvSearchModalOpen}
        onClose={() => setIsAdvSearchModalOpen(false)}
        examBudget={examBudget}
        onSelectTopicForBudget={(chapterName) => {
          if (!examBudget.selectedTopics.includes(chapterName)) {
            handleToggleTopic(chapterName);
          }
        }}
      />
    </div>
  );
}
