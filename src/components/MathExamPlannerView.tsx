import React, { useState, useRef } from 'react';
import { 
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
} from 'lucide-react';
import { StudentProfile, WeeklySchedule, ExamBudget, WeeklyClass, TopicExamDetail } from '../types';
import { 
  getCurriculumByField, 
  getMasterBooksByField, 
  STREAM_OPTIONS, 
  normalizeStream, 
  StreamType 
} from '../data/curriculumData';
import { KonkurAdvancedSearchModal } from './KonkurAdvancedSearchModal';
import { getLiveDaysUntilExam } from '../utils/examCountdown';

interface MathExamPlannerViewProps {
  profile: StudentProfile;
  examBudget: ExamBudget;
  onUpdateExamBudget: (budget: ExamBudget) => void;
  onApplyNewSchedule: (schedule: WeeklySchedule) => void;
  onSwitchToScheduleTab: () => void;
  onSwitchToProToolsTab?: (subTab?: 'postmortem' | 'focus_speed' | 'heatmap' | 'trap_quizzer' | 'final_exam') => void;
}

export function MathExamPlannerView({
  profile,
  examBudget,
  onUpdateExamBudget,
  onApplyNewSchedule,
  onSwitchToScheduleTab,
  onSwitchToProToolsTab,
}: MathExamPlannerViewProps) {
  // Navigation sub-tabs inside curriculum view
  const [activeSubTab, setActiveSubTab] = useState<'atlas' | 'sources' | 'calculator'>('atlas');
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [expandedTopicId, setExpandedTopicId] = useState<string | null>('calc-func');
  const [isAdvSearchModalOpen, setIsAdvSearchModalOpen] = useState<boolean>(false);

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

  // Stream selector state
  const [currentStream, setCurrentStream] = useState<StreamType>(() => normalizeStream(profile.fieldOfStudy));

  // Sync stream if profile field of study changes externally
  React.useEffect(() => {
    if (profile.fieldOfStudy) {
      const normalized = normalizeStream(profile.fieldOfStudy);
      setCurrentStream(normalized);
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
    const q = searchQuery.trim().toLowerCase();
    if (!q) return matchesSubject;

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
    return matchesSubject && matchesQuery;
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
        examName: 'آزمون کانون فرهنگی آموزش (قلم‌چی) - مرحله ۵',
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
            <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[11px] font-bold border border-amber-500/30">
              رشته فعال: {activeStreamOption.name}
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white mb-2">
            اطلس سرفصل‌ها، بانک منابع و آپلود برنامه آزمون
          </h1>
          <p className="text-stone-300 text-sm leading-relaxed">
            بهترین منابع کنکور (خیلی سبز، پینوکیو، نشر الگو، آی‌کیو گاج، مبتکران، مهروماه و موج آزمون) را برای تک‌تک مباحث {activeStreamOption.name} پیدا کن، به روش مطالعه آن‌ها مسلط شو، تعداد تست‌های لازم را حساب کن و برنامه هوشمند آزمونت را دریافت نما.
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

      {/* SECTION 1: EXAM SCHEDULE UPLOAD & SYLLABUS SCANNER */}
      <div className="bg-white border border-stone-200 rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-stone-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
              <FileUp className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-stone-900 flex items-center gap-2">
                <span>بخش آپلود و اسکن هوشمند برنامه آزمون</span>
                <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  پردازش با هوش مصنوعی
                </span>
              </h2>
              <p className="text-xs text-stone-500">
                عکس دفترچه آزمون (قلم‌چی، ماز، سنجش، گزینه دو یا مدرسه) یا فایل متنی‌ات را آپلود کن تا سرفصل‌ها و تست‌های مورد نیاز خودکار استخراج شوند.
              </p>
            </div>
          </div>

          {/* Preset Buttons */}
          <div className="flex items-center gap-2 text-xs">
            <span className="text-stone-400 text-[11px]">یا بارگذاری نمونه:</span>
            <button
              onClick={() => handleLoadSamplePreset('ghalamchi')}
              className="px-2.5 py-1 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 text-[11px] font-medium transition cursor-pointer"
            >
              قلم‌چی
            </button>
            <button
              onClick={() => handleLoadSamplePreset('maze')}
              className="px-2.5 py-1 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 text-[11px] font-medium transition cursor-pointer"
            >
              ماز
            </button>
            <button
              onClick={() => handleLoadSamplePreset('sanjesh')}
              className="px-2.5 py-1 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 text-[11px] font-medium transition cursor-pointer"
            >
              سنجش
            </button>
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
            className={`border-2 border-dashed rounded-2xl p-6 sm:p-8 text-center transition-all cursor-pointer ${
              isDragging
                ? 'border-emerald-500 bg-emerald-50/50'
                : uploadedFile
                ? 'border-emerald-300 bg-stone-50/60'
                : 'border-stone-200 hover:border-emerald-400 bg-stone-50/30'
            }`}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,.pdf,.txt,.doc,.docx"
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  handleFileChange(e.target.files[0]);
                }
              }}
            />

            {uploadedFile ? (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 max-w-xl mx-auto bg-white p-4 rounded-xl border border-stone-200 shadow-xs">
                <div className="flex items-center gap-3">
                  {uploadedFile.previewUrl ? (
                    <img 
                      src={uploadedFile.previewUrl} 
                      alt="Exam preview" 
                      className="w-14 h-14 object-cover rounded-lg border border-stone-200 shadow-xs shrink-0" 
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
                      <FileText className="w-6 h-6" />
                    </div>
                  )}
                  <div className="text-right">
                    <p className="text-xs font-bold text-stone-900 truncate max-w-[200px] sm:max-w-xs">
                      {uploadedFile.name}
                    </p>
                    <p className="text-[11px] text-stone-500">
                      حجم فایل: {uploadedFile.size}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleProcessUploadedSyllabus();
                    }}
                    disabled={isExtractingSyllabus}
                    className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-all disabled:opacity-50 cursor-pointer"
                  >
                    {isExtractingSyllabus ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>در حال اسکن و استخراج هوشمند...</span>
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
                      setExtractError(null);
                      setExtractSuccess(null);
                    }}
                    className="p-2 rounded-lg text-stone-400 hover:text-rose-600 transition cursor-pointer"
                    title="حذف فایل"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center mb-3">
                  <Upload className="w-6 h-6" />
                </div>
                <p className="text-sm font-bold text-stone-800 mb-1">
                  عکس یا فایل پی‌دی‌اف بودجه‌بندی آزمون را اینجا بکشید یا کلیک کنید
                </p>
                <p className="text-xs text-stone-500 max-w-md">
                  پشتیبانی از فرمت‌های تصویری (اسکرین‌شات جدول آزمون قلم‌چی، ماز و سنجش)، فایل‌های PDF و متنی
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Feedback messages */}
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

        {/* Exam Budget Form Fields */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-5 pt-5 border-t border-stone-100">
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              نام آزمون آزمایشی
            </label>
            <input
              type="text"
              value={examBudget.examName}
              onChange={(e) => onUpdateExamBudget({ ...examBudget, examName: e.target.value })}
              placeholder="مثال: قلم‌چی / ماز / سنجش / گزینه دو / مدرسه"
              className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-stone-200 bg-stone-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 text-stone-800"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              تاریخ برگزاری آزمون
            </label>
            <input
              type="text"
              value={examBudget.examDate}
              onChange={(e) => onUpdateExamBudget({ ...examBudget, examDate: e.target.value })}
              placeholder="مثال: جمعه هفته آینده / ۱۸ آبان"
              className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-stone-200 bg-stone-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 text-stone-800"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              چند روز تا آزمون فرصت دارید؟
            </label>
            <input
              type="number"
              min={1}
              max={365}
              value={examBudget.daysUntilExam ?? ''}
              onChange={(e) => {
                const raw = e.target.value;
                const parsed = raw === '' ? undefined : Math.max(1, Math.min(365, parseInt(raw, 10) || 1));
                onUpdateExamBudget({
                  ...examBudget,
                  daysUntilExam: parsed,
                  daysUntilExamSetAt: parsed === undefined ? undefined : new Date().toISOString(),
                });
              }}
              placeholder="مثال: ۶"
              className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-stone-200 bg-stone-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 text-stone-800"
            />
            <p className="text-[10px] text-stone-400 mt-1">
              {(() => {
                const live = getLiveDaysUntilExam(examBudget);
                if (live === null) return 'این عدد مبنای محاسبه‌ی تعداد تست و ساعت مطالعه روزانه است.';
                if (live === 0) return '📍 امروز روز آزمون است!';
                return `📍 در حال حاضر ${live} روز واقعی تا آزمون باقی مانده.`;
              })()}
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              هدف‌گذاری تراز یا درصد مدنظر
            </label>
            <input
              type="text"
              value={examBudget.targetGoalText}
              onChange={(e) => onUpdateExamBudget({ ...examBudget, targetGoalText: e.target.value })}
              placeholder="مثال: تراز بالای ۶۵۰۰ یا درصد حسابان بالای ۶۰٪"
              className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-stone-200 bg-stone-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 text-stone-800"
            />
          </div>
        </div>

        {/* Text area for syllabus details */}
        <div className="mt-4">
          <label className="block text-xs font-semibold text-stone-700 mb-1">
            خلاصه و جزئیات بودجه‌بندی استخراج‌شده یا دست‌نویس:
          </label>
          <textarea
            rows={2}
            value={examBudget.syllabusDetails}
            onChange={(e) => onUpdateExamBudget({ ...examBudget, syllabusDetails: e.target.value })}
            placeholder="مثال: حسابان: از صفحه ۴۵ تا ۷۰ کاربرد مشتق؛ فیزیک: حرکت با شتاب ثابت و سقوط آزاد؛ گسسته: همنهشتی؛ هندسه: مقاطع مخروطی بیضی"
            className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-stone-200 bg-stone-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 text-stone-800"
          />
        </div>

        {/* Selected Topics Badges */}
        {examBudget.selectedTopics.length > 0 && (
          <div className="mt-4 pt-4 border-t border-stone-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-stone-700 flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5 text-emerald-600" />
                <span>مباحث انتخاب‌شده برای این آزمون ({examBudget.selectedTopics.length} مبحث):</span>
              </span>
              <button
                onClick={() => onUpdateExamBudget({ ...examBudget, selectedTopics: [] })}
                className="text-[11px] text-stone-400 hover:text-rose-600 transition cursor-pointer"
              >
                پاک کردن همه
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {examBudget.selectedTopics.map((topic) => (
                <span
                  key={topic}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-medium"
                >
                  <span>{topic}</span>
                  <button
                    onClick={() => handleToggleTopic(topic)}
                    className="hover:text-rose-600 font-bold ml-1 cursor-pointer"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* SECTION: WEEKLY FIXED CLASSES & TOPIC DIFFICULTY TARGETS */}
        <div className="mt-6 pt-5 border-t border-stone-100 space-y-6">
          {/* 1. WEEKLY CLASSES SECTION */}
          <div className="bg-stone-50/80 rounded-2xl p-4 sm:p-5 border border-stone-200">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-stone-200">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-700 flex items-center justify-center font-bold">
                  <School className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-stone-900 flex items-center gap-2">
                    <span>کلاس‌های هفتگی ثابت داوطلب</span>
                    <span className="text-[10px] bg-rose-100 text-rose-800 px-2 py-0.5 rounded-full font-bold">
                      {(examBudget.weeklyClasses || []).length} کلاس فیکس
                    </span>
                  </h3>
                  <p className="text-[11px] text-stone-500">
                    می‌توانید فایل PDF یا تصویر برنامه کلاس‌های مدرسه/آموزشگاه/تاملند/ماز را آپلود کنید تا خودکار استخراج شوند.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => {
                    setShowClassChatAssistant(!showClassChatAssistant);
                    if (showClassUploadZone) setShowClassUploadZone(false);
                    if (showAddClassForm) setShowAddClassForm(false);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-violet-700 hover:bg-violet-800 text-white text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shadow-xs"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>{showClassChatAssistant ? 'بستن چت' : 'صحبت با AI (افزودن/حذف کلاس)'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowClassUploadZone(!showClassUploadZone);
                    if (showAddClassForm) setShowAddClassForm(false);
                    if (showClassChatAssistant) setShowClassChatAssistant(false);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shadow-xs"
                >
                  <FileUp className="w-3.5 h-3.5" />
                  <span>{showClassUploadZone ? 'بستن آپلود' : 'ارسال PDF / عکس کلاس‌ها'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowAddClassForm(!showAddClassForm);
                    if (showClassUploadZone) setShowClassUploadZone(false);
                    if (showClassChatAssistant) setShowClassChatAssistant(false);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-stone-900 text-white hover:bg-stone-800 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{showAddClassForm ? 'بستن فرم' : 'افزودن دستی'}</span>
                </button>
              </div>
            </div>

            {/* Conversational AI Class Adjustment Box */}
            {showClassChatAssistant && (
              <div className="mt-4 p-4 bg-white rounded-xl border border-violet-200 shadow-xs space-y-3 animate-fadeIn">
                <div className="flex items-center justify-between pb-2 border-b border-violet-100">
                  <div className="flex items-center gap-2 text-xs font-bold text-violet-900">
                    <Sparkles className="w-4 h-4 text-violet-600" />
                    <span>دستیار هوشمند چت برای مدیریت و ویرایش کلاس‌های هفتگی</span>
                  </div>
                  <span className="text-[10px] bg-violet-100 text-violet-800 px-2 py-0.5 rounded-md font-semibold">
                    گفتگوی زنده با هوش مصنوعی
                  </span>
                </div>

                {/* Chat Stream View */}
                <div className="max-h-48 overflow-y-auto space-y-2.5 p-2 bg-stone-50 rounded-lg border border-stone-100 text-xs">
                  {classChatHistory.map((msg, idx) => (
                    <div
                      key={idx}
                      className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
                    >
                      <div
                        className={`max-w-[85%] p-2.5 rounded-xl text-xs ${
                          msg.sender === 'user'
                            ? 'bg-violet-700 text-white rounded-br-none'
                            : 'bg-white text-stone-800 border border-stone-200 rounded-bl-none shadow-2xs'
                        }`}
                      >
                        <p className="leading-relaxed">{msg.text}</p>
                      </div>
                      <span className="text-[9px] text-stone-400 mt-0.5 px-1">{msg.time}</span>
                    </div>
                  ))}
                  {isClassChatting && (
                    <div className="flex items-center gap-2 text-stone-500 text-xs p-2">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin text-violet-600" />
                      <span>هوش مصنوعی در حال تحلیل و اعمال تغییرات در برنامه کلاس‌هاست...</span>
                    </div>
                  )}
                </div>

                {/* Quick Suggestion Chips */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {[
                    'یکشنبه‌ها ساعت ۱۸ تا ۲۰ کلاس ریاضی ماز اضافه کن',
                    'کلاس فیزیک رو حذف کن',
                    'پنج‌شنبه‌ها از ۱۶ تا ۱۹ کلاس آزمون حضوری بذار',
                    'ساعت کلاس حسابان رو بکن ۱۷ تا ۱۹'
                  ].map((quickText, qIdx) => (
                    <button
                      key={qIdx}
                      type="button"
                      onClick={() => setClassChatPrompt(quickText)}
                      className="text-[10px] px-2.5 py-1 rounded-md bg-violet-50 hover:bg-violet-100 text-violet-800 border border-violet-200 transition cursor-pointer"
                    >
                      💡 {quickText}
                    </button>
                  ))}
                </div>

                {/* Input Field */}
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="text"
                    value={classChatPrompt}
                    onChange={(e) => setClassChatPrompt(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleClassChatSendMessage();
                      }
                    }}
                    placeholder="به زبان ساده بنویسید؛ مثلاً: کلاس شیمی دوشنبه‌ها ساعت ۱۷ تا ۱۹ رو اضافه کن..."
                    className="flex-1 text-xs px-3 py-2 rounded-lg border border-stone-200 bg-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                    disabled={isClassChatting}
                  />
                  <button
                    type="button"
                    onClick={handleClassChatSendMessage}
                    disabled={!classChatPrompt.trim() || isClassChatting}
                    className="px-4 py-2 rounded-lg bg-violet-700 hover:bg-violet-800 text-white text-xs font-semibold flex items-center gap-1.5 transition disabled:opacity-50 cursor-pointer"
                  >
                    {isClassChatting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                    <span>ارسال</span>
                  </button>
                </div>
              </div>
            )}

            {/* Class PDF/Image Upload Dropzone & AI Processing */}
            {showClassUploadZone && (
              <div className="mt-4 p-4 bg-white rounded-xl border border-emerald-200 shadow-xs space-y-3 animate-fadeIn">
                <div className="flex items-center justify-between pb-2 border-b border-stone-100">
                  <div className="flex items-center gap-2 text-xs font-bold text-emerald-800">
                    <Sparkles className="w-4 h-4 text-emerald-600" />
                    <span>آپلود فایل PDF، عکس یا متن برنامه کلاس‌های هفتگی</span>
                  </div>
                  <span className="text-[10px] text-stone-400">
                    پشتیبانی از PDF، عکس (JPG, PNG)، فایل متنی و کپی متن
                  </span>
                </div>

                {/* Dropzone */}
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
                  className={`border-2 border-dashed rounded-xl p-5 text-center transition-all cursor-pointer ${
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
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 rounded-lg border border-stone-200">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                          <FileText className="w-4 h-4" />
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-bold text-stone-900 truncate max-w-[220px]">
                            {uploadedClassFile.name}
                          </p>
                          <p className="text-[10px] text-stone-500">
                            حجم فایل: {uploadedClassFile.size} • فرمت: {uploadedClassFile.type}
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
                          className="px-3.5 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold flex items-center gap-1.5 transition disabled:opacity-50 cursor-pointer shadow-xs"
                        >
                          {isExtractingClasses ? (
                            <>
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                              <span>در حال استخراج هوشمند کلاس‌ها...</span>
                            </>
                          ) : (
                            <>
                              <Sparkles className="w-3.5 h-3.5" />
                              <span>استخراج هوشمند کلاس‌ها با AI</span>
                            </>
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setUploadedClassFile(null);
                          }}
                          className="p-1.5 text-stone-400 hover:text-rose-600 transition"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center mx-auto mb-2">
                        <Upload className="w-5 h-5" />
                      </div>
                      <p className="text-xs font-bold text-stone-800 mb-1">
                        فایل PDF یا تصویر برنامه کلاس‌های هفتگی را اینجا بکشید یا کلیک کنید
                      </p>
                      <p className="text-[11px] text-stone-500">
                        هوش مصنوعی ساعت شروع و پایان، نام درس‌ها، روزهای برگزاری و استاد هر کلاس را خودکار استخراج می‌کند.
                      </p>
                    </div>
                  )}
                </div>

                {/* Paste Option */}
                <div className="pt-2 border-t border-stone-100">
                  <label className="block text-[11px] font-semibold text-stone-700 mb-1">
                    یا متن پیامک / تلگرام / پرتال برنامه هفتگی را اینجا کپی و جای‌گذاری کنید:
                  </label>
                  <div className="flex gap-2">
                    <textarea
                      rows={2}
                      value={pastedClassText}
                      onChange={(e) => setPastedClassText(e.target.value)}
                      placeholder="مثال: شنبه‌ها ۱۷ تا ۲۰ حسابان ۲ ماز، دوشنبه‌ها ۱۶ تا ۱۹ فیزیک کنکور تاملند، چهارشنبه‌ها ۱۷ تا ۱۹ شیمی آموزشگاه"
                      className="flex-1 text-xs px-3 py-2 rounded-lg border border-stone-200 bg-stone-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                    {pastedClassText.trim() && (
                      <button
                        type="button"
                        onClick={() => handleProcessUploadedClasses(pastedClassText)}
                        disabled={isExtractingClasses}
                        className="px-3 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold flex items-center gap-1 transition self-end disabled:opacity-50"
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

                {/* Status Messages */}
                {classesExtractSuccess && (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs font-medium flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{classesExtractSuccess}</span>
                  </div>
                )}

                {classesExtractError && (
                  <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg text-xs font-medium flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>{classesExtractError}</span>
                  </div>
                )}
              </div>
            )}

            {/* Add Class Form */}
            {showAddClassForm && (
              <div className="mt-4 p-4 bg-white rounded-xl border border-stone-200 shadow-xs space-y-3 animate-fadeIn">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-stone-700 mb-1">روز برگزاری:</label>
                    <select
                      value={newClassDay}
                      onChange={e => setNewClassDay(e.target.value)}
                      className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-stone-200 bg-stone-50"
                    >
                      {['شنبه', 'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنج‌شنبه', 'جمعه'].map(d => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-stone-700 mb-1">نام درس / مبحث:</label>
                    <input
                      type="text"
                      value={newClassSubject}
                      onChange={e => setNewClassSubject(e.target.value)}
                      placeholder="مثال: حسابان ۲ جامع / فیزیک دوازدهم"
                      className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-stone-200 bg-stone-50"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-stone-700 mb-1">استاد / موسسه:</label>
                    <input
                      type="text"
                      value={newClassTeacher}
                      onChange={e => setNewClassTeacher(e.target.value)}
                      placeholder="مثال: ماز / تاملند / آموزشگاه هدف"
                      className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-stone-200 bg-stone-50"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="flex items-center gap-2">
                    <div className="flex-1">
                      <label className="block text-[11px] font-semibold text-stone-700 mb-1">ساعت شروع:</label>
                      <input
                        type="text"
                        value={newClassStart}
                        onChange={e => setNewClassStart(e.target.value)}
                        placeholder="۱۷:۰۰"
                        className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-stone-200 bg-stone-50"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="block text-[11px] font-semibold text-stone-700 mb-1">ساعت پایان:</label>
                      <input
                        type="text"
                        value={newClassEnd}
                        onChange={e => setNewClassEnd(e.target.value)}
                        placeholder="۱۹:۳۰"
                        className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-stone-200 bg-stone-50"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-stone-700 mb-1">نوع برگزاری:</label>
                    <select
                      value={newClassType}
                      onChange={e => setNewClassType(e.target.value as any)}
                      className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-stone-200 bg-stone-50"
                    >
                      <option value="online">آنلاین (وبینار / اسکای‌روم)</option>
                      <option value="in_person">حضوری (آموزشگاه / مدرسه)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-stone-700 mb-1">ساعت مرور و تکلیف موردنیاز:</label>
                    <input
                      type="number"
                      step="0.5"
                      min="0.5"
                      max="5"
                      value={newClassPostHours}
                      onChange={e => setNewClassPostHours(parseFloat(e.target.value) || 1.5)}
                      className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-stone-200 bg-stone-50"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="button"
                    onClick={handleAddWeeklyClass}
                    className="px-4 py-1.5 rounded-lg bg-emerald-700 text-white text-xs font-semibold hover:bg-emerald-800 transition"
                  >
                    ثبت و ذخیره کلاس
                  </button>
                </div>
              </div>
            )}

            {/* Classes List */}
            <div className="mt-3 space-y-2">
              {(examBudget.weeklyClasses && examBudget.weeklyClasses.length > 0) ? (
                examBudget.weeklyClasses.map(cls => (
                  <div
                    key={cls.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 sm:p-3 bg-white rounded-xl border border-stone-200 text-xs"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="px-2 py-0.5 rounded-md bg-rose-50 text-rose-800 font-bold border border-rose-200 text-[11px]">
                        {cls.dayName}
                      </span>
                      <strong className="text-stone-900">{cls.subject}</strong>
                      <span className="text-stone-500 text-[11px]">({cls.teacherOrInstitute})</span>
                      <span className="text-[10px] text-stone-400">
                        {cls.locationOrType === 'online' ? '🌐 آنلاین' : '🏫 حضوری'}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 self-end sm:self-auto">
                      <span className="font-semibold text-stone-700">
                        {cls.startTime} تا {cls.endTime}
                      </span>
                      <span className="text-[10px] bg-stone-100 text-stone-600 px-2 py-0.5 rounded-md">
                        {cls.postClassStudyHoursNeeded || 1.5}h تکلیف و مرور
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveWeeklyClass(cls.id)}
                        className="text-stone-400 hover:text-rose-600 transition"
                        title="حذف کلاس"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-[11px] text-stone-400 py-2 text-center">
                  کلاسی ثبت نشده است. در صورت داشتن کلاس‌های هفتگی، آن‌ها را اضافه کنید تا هوش مصنوعی ساعات خالی را به مطالعه آزمون اختصاص دهد.
                </p>
              )}
            </div>
          </div>

          {/* 2. TOPIC DIFFICULTY & TARGET TESTS BREAKDOWN */}
          <div className="bg-stone-50/80 rounded-2xl p-4 sm:p-5 border border-stone-200">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-stone-200">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
                  <Gauge className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-stone-900 flex items-center gap-2">
                    <span>تشخیص خودکار سرفصل‌ها، درجه سختی و تارگت تست</span>
                    <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold">
                      {(examBudget.topicDetails || []).length} سرفصل • {examBudget.totalTargetTests || 450} تست
                    </span>
                  </h3>
                  <p className="text-[11px] text-stone-500">
                    با آپلود بودجه‌بندی آزمون، ربات هوشمند خودش درجه سختی مباحث (چالشی، سخت، متوسط) و تعداد تست را استخراج می‌کند و نیاز به ورود دستی نیست.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddTopicDetailForm(!showAddTopicDetailForm)}
                  className="px-3 py-1.5 rounded-xl bg-stone-900 text-white hover:bg-stone-800 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer self-start sm:self-auto"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{showAddTopicDetailForm ? 'بستن فرم' : 'افزودن دستی (اختیاری)'}</span>
                </button>
              </div>
            </div>

            {/* Add Topic Detail Form */}
            {showAddTopicDetailForm && (
              <div className="mt-4 p-4 bg-white rounded-xl border border-stone-200 shadow-xs space-y-3 animate-fadeIn">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-stone-700 mb-1">نام درس:</label>
                    <input
                      type="text"
                      value={newTdSubject}
                      onChange={e => setNewTdSubject(e.target.value)}
                      placeholder="مثال: حسابان ۲ / فیزیک ۳"
                      className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-stone-200 bg-stone-50"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-stone-700 mb-1">فصل کتاب:</label>
                    <input
                      type="text"
                      value={newTdChapter}
                      onChange={e => setNewTdChapter(e.target.value)}
                      placeholder="مثال: کاربرد مشتق / سقوط آزاد"
                      className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-stone-200 bg-stone-50"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-stone-700 mb-1">زیرمبحث دقیق:</label>
                    <input
                      type="text"
                      value={newTdSubtopic}
                      onChange={e => setNewTdSubtopic(e.target.value)}
                      placeholder="مثال: اکسترمم‌های نسبی و بهینه‌سازی"
                      className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-stone-200 bg-stone-50"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-stone-700 mb-1">درجه سختی:</label>
                    <select
                      value={newTdDifficulty}
                      onChange={e => setNewTdDifficulty(e.target.value as any)}
                      className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-stone-200 bg-stone-50"
                    >
                      <option value="بسیار چالشی و دام‌دار">بسیار چالشی و دام‌دار</option>
                      <option value="سخت">سخت</option>
                      <option value="متوسط">متوسط</option>
                      <option value="آسان و روان">آسان و روان</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-stone-700 mb-1">تعداد تست هدف هفته:</label>
                    <input
                      type="number"
                      min="10"
                      max="300"
                      step="5"
                      value={newTdTargetTests}
                      onChange={e => setNewTdTargetTests(parseInt(e.target.value) || 100)}
                      className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-stone-200 bg-stone-50"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-stone-700 mb-1">اهمیت و ضریب آزمونی:</label>
                    <select
                      value={newTdImportance}
                      onChange={e => setNewTdImportance(e.target.value as any)}
                      className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-stone-200 bg-stone-50"
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
                    className="px-4 py-1.5 rounded-lg bg-emerald-700 text-white text-xs font-semibold hover:bg-emerald-800 transition"
                  >
                    ثبت سرفصل و سختی
                  </button>
                </div>
              </div>
            )}

            {/* Topic Details List */}
            <div className="mt-3 space-y-2">
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
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 sm:p-3 bg-white rounded-xl border border-stone-200 text-xs"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <strong className="text-stone-900">{td.subject} - {td.chapter}</strong>
                          <span className={`text-[10px] px-2 py-0.5 rounded-md border font-bold ${diffColor}`}>
                            {td.difficulty}
                          </span>
                        </div>
                        <div className="text-[11px] text-stone-500 mt-0.5">
                          {td.subtopic} • {td.importanceWeight}
                        </div>
                      </div>

                      <div className="flex items-center gap-3 self-end sm:self-auto">
                        <span className="font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                          🎯 {td.targetTestCount} تست هدف
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveTopicDetail(td.id)}
                          className="text-stone-400 hover:text-rose-600 transition"
                          title="حذف مبحث"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="text-[11px] text-stone-400 py-2 text-center">
                  سرفصل با درجه سختی ثبت نشده است. می‌توانید دکمه بالا را بزنید یا از بارگذاری نمونه‌های قلم‌چی/ماز استفاده کنید.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Quick Action Button for Schedule Generation */}
        <div className="mt-6 pt-5 border-t border-stone-100 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-xs text-stone-500">
            {examBudget.selectedTopics.length === 0 ? (
              <span>نکته: برای گرفتن بهترین نتیجه، حداقل ۱ یا ۲ مبحث را از جدول پایین یا با آپلود عکس اضافه کنید.</span>
            ) : (
              <span>
                مجموع تست استاندارد برآورد شده برای این آزمون: <strong className="text-emerald-700 font-bold">{grandTotalTests} تست</strong> ({dailyTestTarget} تست در روز)
              </span>
            )}
          </div>

          <button
            onClick={handleGenerateExamSchedule}
            disabled={isGenerating}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs sm:text-sm shadow-sm transition-all disabled:opacity-50 cursor-pointer"
          >
            {isGenerating ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>در حال مهندسی برنامه هفتگی آزمون...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>طراحی برنامه هفتگی متناسب با این بودجه‌بندی</span>
              </>
            )}
          </button>
        </div>

        {successMessage && (
          <div className="mt-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-medium flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {generateError && (
          <div className="mt-4 p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-medium flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{generateError}</span>
          </div>
        )}
      </div>

      {/* SUB-VIEW 1: CURRICULUM ATLAS & TOPIC CARDS */}
      {activeSubTab === 'atlas' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-stone-900 flex items-center gap-2">
                <Layers className="w-5 h-5 text-emerald-700" />
                <span>اطلس سرفصل‌های کنکور ریاضی، تعداد تست‌های لازم و منابع</span>
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

          {/* Subject Filter Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 text-xs scrollbar-none">
            {availableSubjectFilters.map((item) => (
              <button
                key={item.id}
                onClick={() => setSelectedSubjectFilter(item.id)}
                className={`px-3 py-1.5 rounded-lg whitespace-nowrap font-medium transition-all cursor-pointer ${
                  selectedSubjectFilter === item.id
                    ? 'bg-stone-900 text-white shadow-xs'
                    : 'bg-white text-stone-600 border border-stone-200 hover:bg-stone-100'
                }`}
              >
                {item.label}
              </button>
            ))}
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
                        <span className="text-[11px] font-bold text-stone-700 block mb-1">
                          زیربخش‌های کلیدی فصل:
                        </span>
                        {topic.subtopics.map((sub, i) => (
                          <div key={i} className="flex items-start gap-1.5 text-xs text-stone-600 leading-relaxed">
                            <div className="w-1.5 h-1.5 rounded-full bg-stone-400 mt-1.5 shrink-0" />
                            <span>{sub}</span>
                          </div>
                        ))}
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
