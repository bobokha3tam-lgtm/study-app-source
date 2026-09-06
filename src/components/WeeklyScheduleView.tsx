import React, { useState } from 'react';
import { 
  Calendar, 
  Sparkles, 
  Clock, 
  CheckCircle2, 
  Circle, 
  BookOpen, 
  RefreshCw, 
  Copy, 
  Check, 
  Printer, 
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  HelpCircle,
  Play,
  Plus,
  Edit2,
  Trash2,
  Filter,
  CheckCheck,
  RotateCcw,
  LayoutGrid,
  List,
  Target,
  Flame,
  Award,
  AlertCircle,
  School,
  GraduationCap,
  CalendarCheck2,
  BookmarkCheck,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  ShieldCheck,
  Hourglass,
  Archive,
  History,
  FolderArchive,
  Layers,
  ArrowUpRight
} from 'lucide-react';
import { StudentProfile, WeeklySchedule, DaySchedule, StudyBlock, ExamBudget } from '../types';
import { getSuggestedSubjectsForStream } from '../data/curriculumData';
import { LiveFocusRoom } from './LiveFocusRoom';

interface WeeklyScheduleViewProps {
  schedule: WeeklySchedule;
  profile: StudentProfile;
  onUpdateSchedule: (newSchedule: WeeklySchedule) => void;
  examBudget?: ExamBudget;
  onSwitchToExamTab?: () => void;
}

type BlockFilterType = 'all' | 'pending' | 'completed' | 'test' | 'concept' | 'class' | 'review';

export const WeeklyScheduleView: React.FC<WeeklyScheduleViewProps> = ({
  schedule,
  profile,
  onUpdateSchedule,
  examBudget: propExamBudget,
  onSwitchToExamTab,
}) => {
  const [activeDayIndex, setActiveDayIndex] = useState<number>(0);
  const [viewMode, setViewMode] = useState<'daily' | 'weekly_grid'>('daily');
  const [blockFilter, setBlockFilter] = useState<BlockFilterType>('all');
  
  // AI Generation State
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [showGenerateModal, setShowGenerateModal] = useState<boolean>(false);
  const [focusNotes, setFocusNotes] = useState<string>('تمرکز ویژه روی تست‌زنی مباحث ضعیف و آزمون پایان هفته');
  const [reasoningMode, setReasoningMode] = useState<'deep_thinking' | 'fast_standard'>('deep_thinking');
  const [planningStrategy, setPlanningStrategy] = useState<'balanced' | 'turbo_tests' | 'concept_deep' | 'exam_prep'>('balanced');
  const [spacedReviewEnabled, setSpacedReviewEnabled] = useState<boolean>(true);
  const [copied, setCopied] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Focus Room State
  const [activeFocusBlock, setActiveFocusBlock] = useState<StudyBlock | null>(null);

  // Block Modal (Add / Edit)
  const [isBlockModalOpen, setIsBlockModalOpen] = useState<boolean>(false);
  const [editingBlock, setEditingBlock] = useState<{ block: StudyBlock; dayIdx: number } | null>(null);
  
  // Form State for Block Modal
  const [formSubject, setFormSubject] = useState<string>('');
  const [formTopic, setFormTopic] = useState<string>('');
  const [formTimeSlot, setFormTimeSlot] = useState<string>('۱۶:۰۰ - ۱۷:۳۰');
  const [formDuration, setFormDuration] = useState<number>(90);
  const [formType, setFormType] = useState<StudyBlock['type']>('concept');
  const [formTargetTests, setFormTargetTests] = useState<number>(25);
  const [formDifficulty, setFormDifficulty] = useState<string>('متوسط');
  const [formMethod, setFormMethod] = useState<string>('پومودورو (۲۵-۵)');
  const [formTargetDayIdx, setFormTargetDayIdx] = useState<number>(activeDayIndex);

  const [showExamTopicsList, setShowExamTopicsList] = useState<boolean>(true);
  const [showClearModal, setShowClearModal] = useState<boolean>(false);

  // Two-week cadence state
  const [examCycleWeek, setExamCycleWeek] = useState<'week_1' | 'week_2' | 'standalone'>('week_1');

  // Archive & Historical Progress State
  const [showArchiveModal, setShowArchiveModal] = useState<boolean>(false);
  const [scheduleArchive, setScheduleArchive] = useState<WeeklySchedule[]>(() => {
    try {
      const saved = localStorage.getItem('study_advisor_schedule_archive');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Load ExamBudget from prop or fallback to localStorage
  const activeExamBudget: ExamBudget | null = React.useMemo(() => {
    if (propExamBudget && (propExamBudget.examName || propExamBudget.examDate || propExamBudget.selectedTopics?.length)) {
      return propExamBudget;
    }
    try {
      const saved = localStorage.getItem('study_advisor_exam_budget');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.examName || parsed.examDate || parsed.selectedTopics?.length) {
          return parsed;
        }
      }
    } catch {
      // ignore
    }
    return propExamBudget || null;
  }, [propExamBudget]);

  // Calculate Countdown and Timeline to Exam
  const examTimelineInfo = React.useMemo(() => {
    if (!activeExamBudget || !activeExamBudget.examDate) {
      return null;
    }
    const examDateStr = activeExamBudget.examDate.trim();
    
    // Parse possible date strings (e.g., ISO, Jalali date, or textual like 'جمعه ۱۸ آبان')
    let daysLeft: number | null = null;
    const parsedTimestamp = Date.parse(examDateStr);
    if (!isNaN(parsedTimestamp)) {
      const diffMs = parsedTimestamp - Date.now();
      daysLeft = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
    } else {
      // Extract numbers if string contains day of month (e.g., ۱۸ آبان)
      // Default to realistic days if text specifies an upcoming Friday
      if (examDateStr.includes('جمعه') || examDateStr.includes('آزمون')) {
        daysLeft = 5; // Default close target for upcoming weekend
      } else {
        daysLeft = 6;
      }
    }

    return {
      examName: activeExamBudget.examName || 'آزمون آزمایشی پیش‌رو',
      examDate: examDateStr,
      daysLeft,
      targetGoal: activeExamBudget.targetGoalText || 'تراز و درصد بالا در آزمون هدف',
      selectedTopics: activeExamBudget.selectedTopics || [],
      topicDetails: activeExamBudget.topicDetails || [],
      totalTargetTests: activeExamBudget.totalTargetTests || 450,
    };
  }, [activeExamBudget]);

  // Helper to check if a study block topic or subject matches any exam budget syllabus topic
  const isBlockMatchingExamTopic = (block: StudyBlock): boolean => {
    if (!activeExamBudget?.selectedTopics || activeExamBudget.selectedTopics.length === 0) return false;
    const textToMatch = `${block.subject || ''} ${block.topic || ''}`.toLowerCase();
    return activeExamBudget.selectedTopics.some(topic => {
      const cleanTopic = topic.replace(/\(.*\)/, '').trim().toLowerCase();
      return textToMatch.includes(cleanTopic) || cleanTopic.includes(block.subject.toLowerCase());
    });
  };

  // Helper to compute coverage for an exam topic in the weekly schedule
  const getExamTopicWeeklyCoverage = (topicName: string) => {
    const cleanTopic = topicName.replace(/\(.*\)/, '').trim().toLowerCase();
    const matchingBlocks = allBlocks.filter(b => {
      const text = `${b.subject || ''} ${b.topic || ''}`.toLowerCase();
      return text.includes(cleanTopic);
    });
    const totalMinutes = matchingBlocks.reduce((acc, b) => acc + (b.durationMinutes || 0), 0);
    const targetTests = matchingBlocks.reduce((acc, b) => acc + (b.targetTests || 0), 0);
    const completedBlocksCount = matchingBlocks.filter(b => b.isDone).length;
    return {
      blockCount: matchingBlocks.length,
      completedBlocksCount,
      totalHours: (totalMinutes / 60).toFixed(1),
      targetTests,
      isCovered: matchingBlocks.length > 0,
      isFullyDone: matchingBlocks.length > 0 && completedBlocksCount === matchingBlocks.length
    };
  };

  // Show quick toast notification
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Ensure schedule is valid
  const safeDays = schedule?.days && schedule.days.length > 0 ? schedule.days : [];
  const safeActiveDayIndex = Math.min(Math.max(0, activeDayIndex), Math.max(0, safeDays.length - 1));
  const activeDay: DaySchedule = safeDays[safeActiveDayIndex] || {
    dayName: 'شنبه',
    targetHours: 7,
    blocks: [],
    dailyTip: 'امروز مطالعه را با انرژی شروع کن'
  };

  // Calculate Overall Completion
  const allBlocks = safeDays.flatMap(d => d.blocks || []);
  const completedBlocks = allBlocks.filter(b => b.isDone).length;
  const progressPercent = allBlocks.length > 0 ? Math.round((completedBlocks / allBlocks.length) * 100) : 0;
  const totalActualMinutes = allBlocks.reduce((acc, b) => acc + (b.actualDurationMinutes || 0), 0);
  const totalActualHours = (totalActualMinutes / 60).toFixed(1);
  const totalTargetTestsAll = allBlocks.reduce((acc, b) => acc + (b.targetTests || 0), 0);
  const completedTargetTestsAll = allBlocks.filter(b => b.isDone).reduce((acc, b) => acc + (b.targetTests || 0), 0);

  // Active Day Stats
  const activeDayBlocks = activeDay.blocks || [];
  const activeDayDoneBlocks = activeDayBlocks.filter(b => b.isDone).length;
  const activeDayTargetTests = activeDayBlocks.reduce((acc, b) => acc + (b.targetTests || 0), 0);
  const activeDayCompletedTests = activeDayBlocks.filter(b => b.isDone).reduce((acc, b) => acc + (b.targetTests || 0), 0);
  const activeDayPlannedMinutes = activeDayBlocks.reduce((acc, b) => acc + (b.durationMinutes || 0), 0);
  const activeDayActualMinutes = activeDayBlocks.reduce((acc, b) => acc + (b.actualDurationMinutes || 0), 0);

  // Filter Active Day Blocks
  const filteredBlocks = activeDayBlocks.filter(block => {
    if (blockFilter === 'all') return true;
    if (blockFilter === 'pending') return !block.isDone;
    if (blockFilter === 'completed') return block.isDone;
    if (blockFilter === 'test') return block.type === 'test';
    if (blockFilter === 'concept') return block.type === 'concept';
    if (blockFilter === 'class') return block.type === 'class' || block.type === 'class_homework';
    if (blockFilter === 'review') return block.type === 'review' || block.type === 'compensatory';
    return true;
  });

  // Toggle single block
  const handleToggleBlock = (dayIndex: number, blockId: string) => {
    const newDays = [...safeDays];
    const targetDay = { ...newDays[dayIndex] };
    targetDay.blocks = targetDay.blocks.map(b => 
      b.id === blockId ? { ...b, isDone: !b.isDone } : b
    );
    newDays[dayIndex] = targetDay;
    onUpdateSchedule({ ...schedule, days: newDays });
  };

  // Mark all blocks in active day done / reset
  const handleMarkAllDayDone = (done: boolean) => {
    const newDays = [...safeDays];
    const targetDay = { ...newDays[safeActiveDayIndex] };
    targetDay.blocks = targetDay.blocks.map(b => ({ ...b, isDone: done }));
    newDays[safeActiveDayIndex] = targetDay;
    onUpdateSchedule({ ...schedule, days: newDays });
    showToast(done ? `تمام پارت‌های ${activeDay.dayName} تیک خوردند ✅` : `وضعیت پارت‌های ${activeDay.dayName} بازنشانی شد 🔄`);
  };

  const handleRecoverMissedBlocks = () => {
    let missedBlocks: StudyBlock[] = [];
    const newDays = [...schedule.days].map(day => {
      if (day.dayName === 'جمعه' || day.dayName === 'پنج‌شنبه') {
        return { ...day };
      }
      const doneBlocks = day.blocks.filter(b => b.isDone);
      const notDoneBlocks = day.blocks.filter(b => !b.isDone);
      missedBlocks = [...missedBlocks, ...notDoneBlocks.map(b => ({ ...b, id: `recovered-${Date.now()}-${Math.random()}` }))];
      return { ...day, blocks: doneBlocks };
    });

    if (missedBlocks.length === 0) {
      showToast('پارت عقب‌افتاده‌ای از شنبه تا چهارشنبه برای انتقال وجود ندارد! 🌟');
      return;
    }

    const fridayIndex = newDays.findIndex(d => d.dayName === 'جمعه');
    if (fridayIndex !== -1) {
      newDays[fridayIndex].blocks = [...newDays[fridayIndex].blocks, ...missedBlocks];
    } else {
      newDays[newDays.length - 1].blocks = [...newDays[newDays.length - 1].blocks, ...missedBlocks];
    }

    onUpdateSchedule({ ...schedule, days: newDays });
    showToast(`${missedBlocks.length} پارت عقب‌افتاده به ایستگاه جبرانی (جمعه) منتقل شد! 🚑`);
  };

  // Archive the current week schedule to permanent archive
  const handleArchiveCurrentSchedule = () => {
    const totalCount = allBlocks.length;
    const doneCount = completedBlocks;
    const rate = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;

    const archivedItem: WeeklySchedule = {
      ...schedule,
      archivedAt: new Date().toISOString(),
      completionRate: rate,
      completedBlocksCount: doneCount,
      totalBlocksCount: totalCount,
      cycleWeek: examCycleWeek,
      examCycleTarget: activeExamBudget?.examName || 'آزمون آزمایشی'
    };

    const newArchive = [archivedItem, ...scheduleArchive.filter(item => item.id !== schedule.id)];
    setScheduleArchive(newArchive);
    try {
      localStorage.setItem('study_advisor_schedule_archive', JSON.stringify(newArchive));
    } catch {
      // ignore
    }

    showToast(`برنامه «${schedule.weekTitle}» با موفقیت در آرشیو هفتگی ذخیره شد! 📦`);
  };

  // Restore a week from archive
  const handleRestoreFromArchive = (archivedWeek: WeeklySchedule) => {
    onUpdateSchedule(archivedWeek);
    setShowArchiveModal(false);
    showToast(`برنامه «${archivedWeek.weekTitle}» از آرشیو بازیابی شد 🔄`);
  };

  // Delete an item from archive
  const handleDeleteArchivedItem = (id: string) => {
    const updated = scheduleArchive.filter(item => item.id !== id);
    setScheduleArchive(updated);
    try {
      localStorage.setItem('study_advisor_schedule_archive', JSON.stringify(updated));
    } catch {
      // ignore
    }
    showToast('برنامه انتخاب‌شده از آرشیو حذف شد 🗑️');
  };

  // Delete/Clear entire schedule (all blocks from all days)
  const handleClearEntireSchedule = () => {
    const dayNames = ['شنبه', 'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنج‌شنبه', 'جمعه'];
    const clearedDays: DaySchedule[] = (safeDays.length > 0 ? safeDays : dayNames.map(name => ({ dayName: name, targetHours: profile.dailyTargetHours || 7, blocks: [] }))).map(day => ({
      ...day,
      blocks: []
    }));

    const clearedSchedule: WeeklySchedule = {
      ...schedule,
      id: `sched_cleared_${Date.now()}`,
      createdAt: new Date().toISOString(),
      weekTitle: schedule.weekTitle || 'برنامه هفتگی شخصی',
      totalPlannedHours: 0,
      strategySummary: 'جدول برنامه هفتگی پاکسازی شد. می‌توانید از دکمه «افزودن پارت درسی» یا «بازتولید با AI» برنامه جدید تنظیم کنید.',
      days: clearedDays
    };

    onUpdateSchedule(clearedSchedule);
    setShowClearModal(false);
    showToast('کل پارت‌های برنامه هفتگی با موفقیت حذف شدند 🗑️');
  };

  // Open modal for Adding new block
  const handleOpenAddBlockModal = () => {
    setEditingBlock(null);
    setFormSubject(profile.weakSubjects?.[0] || 'حسابان');
    setFormTopic('یادگیری مفهومی و حل تست‌های آموزشی');
    setFormTimeSlot('۱۶:۰۰ - ۱۷:۳۰');
    setFormDuration(90);
    setFormType('concept');
    setFormTargetTests(25);
    setFormDifficulty('متوسط');
    setFormMethod('پومودورو (۲۵-۵)');
    setFormTargetDayIdx(safeActiveDayIndex);
    setIsBlockModalOpen(true);
  };

  // Open modal for Editing existing block
  const handleOpenEditBlockModal = (dayIdx: number, block: StudyBlock, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingBlock({ block, dayIdx });
    setFormSubject(block.subject);
    setFormTopic(block.topic);
    setFormTimeSlot(block.timeSlot);
    setFormDuration(block.durationMinutes || 90);
    setFormType(block.type);
    setFormTargetTests(block.targetTests || 0);
    setFormDifficulty(block.difficultyLevel || 'متوسط');
    setFormMethod(block.recommendedMethod || 'پومودورو (۲۵-۵)');
    setFormTargetDayIdx(dayIdx);
    setIsBlockModalOpen(true);
  };

  // Save Block (Create or Edit)
  const handleSaveBlock = () => {
    if (!formSubject.trim() || !formTopic.trim()) {
      alert('لطفاً عنوان درس و مبحث را وارد کنید.');
      return;
    }

    const newDays = [...safeDays];

    if (editingBlock) {
      // If day was changed, remove from old day and add to new day
      const oldDayIdx = editingBlock.dayIdx;
      const targetBlockId = editingBlock.block.id;
      
      const updatedBlock: StudyBlock = {
        ...editingBlock.block,
        subject: formSubject.trim(),
        topic: formTopic.trim(),
        timeSlot: formTimeSlot.trim(),
        durationMinutes: Number(formDuration) || 90,
        type: formType,
        targetTests: Number(formTargetTests) || 0,
        difficultyLevel: formDifficulty,
        recommendedMethod: formMethod,
      };

      if (oldDayIdx === formTargetDayIdx) {
        newDays[oldDayIdx].blocks = newDays[oldDayIdx].blocks.map(b => b.id === targetBlockId ? updatedBlock : b);
      } else {
        newDays[oldDayIdx].blocks = newDays[oldDayIdx].blocks.filter(b => b.id !== targetBlockId);
        newDays[formTargetDayIdx].blocks.push(updatedBlock);
      }

      showToast('پارت درسی با موفقیت ویرایش شد.');
    } else {
      // Add new block
      const newBlock: StudyBlock = {
        id: `blk-custom-${Date.now()}`,
        subject: formSubject.trim(),
        topic: formTopic.trim(),
        timeSlot: formTimeSlot.trim(),
        durationMinutes: Number(formDuration) || 90,
        type: formType,
        targetTests: Number(formTargetTests) || 0,
        difficultyLevel: formDifficulty,
        recommendedMethod: formMethod,
        isDone: false,
      };

      newDays[formTargetDayIdx].blocks.push(newBlock);
      showToast(`پارت جدید به روز ${newDays[formTargetDayIdx].dayName} افزوده شد.`);
    }

    // Recalculate total planned hours
    const totalMinutes = newDays.flatMap(d => d.blocks).reduce((acc, b) => acc + (b.durationMinutes || 0), 0);
    const updatedSchedule: WeeklySchedule = {
      ...schedule,
      days: newDays,
      totalPlannedHours: Number((totalMinutes / 60).toFixed(1)),
    };

    onUpdateSchedule(updatedSchedule);
    setIsBlockModalOpen(false);
    setEditingBlock(null);
  };

  // Delete Block
  const handleDeleteBlock = (dayIdx: number, blockId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('آیا از حذف این پارت درسی اطمینان دارید؟')) return;

    const newDays = [...safeDays];
    newDays[dayIdx].blocks = newDays[dayIdx].blocks.filter(b => b.id !== blockId);
    
    const totalMinutes = newDays.flatMap(d => d.blocks).reduce((acc, b) => acc + (b.durationMinutes || 0), 0);
    const updatedSchedule: WeeklySchedule = {
      ...schedule,
      days: newDays,
      totalPlannedHours: Number((totalMinutes / 60).toFixed(1)),
    };

    onUpdateSchedule(updatedSchedule);
    showToast('پارت درسی با موفقیت حذف شد.');
  };

  // Focus Complete handler
  const handleFocusComplete = (actualMinutes: number) => {
    if (!activeFocusBlock) return;
    
    const newDays = [...safeDays];
    const dayIndex = newDays.findIndex(d => d.blocks.some(b => b.id === activeFocusBlock.id));
    if (dayIndex !== -1) {
      const targetDay = { ...newDays[dayIndex] };
      targetDay.blocks = targetDay.blocks.map(b => 
        b.id === activeFocusBlock.id 
          ? { ...b, isDone: true, actualDurationMinutes: actualMinutes } 
          : b
      );
      newDays[dayIndex] = targetDay;
      onUpdateSchedule({ ...schedule, days: newDays });
      showToast(`🎉 پارت مطالعه تکمیل و ${actualMinutes} دقیقه ثبت گردید!`);
    }
    setActiveFocusBlock(null);
  };

  // Print schedule
  const handlePrintSchedule = () => {
    window.print();
  };

  // AI Schedule Generator
  const handleGenerateSchedule = async () => {
    setIsGenerating(true);
    try {
      let examBudget = undefined;
      let examErrors = [];
      let recentReports = [];

      try {
        const savedBudget = localStorage.getItem('study_advisor_exam_budget');
        if (savedBudget) examBudget = JSON.parse(savedBudget);

        const savedErrors = localStorage.getItem('study_advisor_error_logs');
        if (savedErrors) examErrors = JSON.parse(savedErrors);

        const savedReports = localStorage.getItem('study_advisor_reports');
        if (savedReports) recentReports = JSON.parse(savedReports);
      } catch (e) {
        // ignore
      }

      const response = await fetch('/api/advisor/generate-schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          profile, 
          focusNotes, 
          examBudget, 
          reasoningMode, 
          examErrors, 
          recentReports,
          planningStrategy,
          spacedReviewEnabled,
          examCycleWeek
        }),
      });

      if (!response.ok) {
        throw new Error('خطا در دریافت برنامه جدید از مشاور');
      }

      const data = await response.json();
      if (data.schedule && data.schedule.days) {
        const fullSchedule: WeeklySchedule = {
          ...data.schedule,
          id: `week-${Date.now()}`,
          createdAt: new Date().toISOString(),
          cycleWeek: examCycleWeek,
          examCycleTarget: activeExamBudget?.examName || 'آزمون آزمایشی'
        };
        onUpdateSchedule(fullSchedule);
        setShowGenerateModal(false);
        showToast('برنامه هفتگی جدید با موفقیت تولید و جایگزین شد! 🚀');
      }
    } catch (err) {
      console.error('Error generating schedule:', err);
      alert('خطا در تولید برنامه با هوش مصنوعی. لطفاً اتصال اینترنت یا کلید Gemini را بررسی کنید.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyScheduleText = () => {
    let text = `📅 *${schedule.weekTitle}*\n`;
    text += `🎯 استراتژی هفته: ${schedule.strategySummary}\n`;
    text += `⏱ مجموع ساعات: ${schedule.totalPlannedHours} ساعت | 🎯 کل تست‌های هدف: ${totalTargetTestsAll} تست\n\n`;

    safeDays.forEach(d => {
      text += `━━━━━━━━━━━━━━\n`;
      text += `📌 *${d.dayName}* (هدف: ${d.targetHours} ساعت)\n`;
      if (d.dailyTip) text += `💡 نکته روز: ${d.dailyTip}\n`;
      d.blocks.forEach(b => {
        const status = b.isDone ? '✅' : '⏳';
        const tests = b.targetTests ? ` | 🎯 ${b.targetTests} تست` : '';
        text += `${status} [${b.timeSlot}] ${b.subject}: ${b.topic} (${b.durationMinutes} دقیقه${tests})\n`;
      });
      text += `\n`;
    });

    navigator.clipboard.writeText(text);
    setCopied(true);
    showToast('متن کامل برنامه هفتگی کپی شد 📋');
    setTimeout(() => setCopied(false), 2500);
  };

  const getBadgeStyle = (type: StudyBlock['type']) => {
    switch (type) {
      case 'concept':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'test':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'review':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'compensatory':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'class':
        return 'bg-rose-50 text-rose-700 border-rose-200 font-bold';
      case 'class_homework':
        return 'bg-indigo-50 text-indigo-700 border-indigo-200 font-bold';
      default:
        return 'bg-stone-50 text-stone-700 border-stone-200';
    }
  };

  const getTypeName = (type: StudyBlock['type']) => {
    switch (type) {
      case 'concept': return '📘 یادگیری و مفهومی';
      case 'test': return '🎯 تست و تمرین';
      case 'review': return '🔄 مرور و بازیابی';
      case 'compensatory': return '🩹 باکس جبرانی';
      case 'class': return '🏫 کلاس ثابت هفتگی';
      case 'class_homework': return '✍️ تکلیف و مرور کلاس';
      default: return 'مطالعه';
    }
  };

  const commonSubjectSuggestions = getSuggestedSubjectsForStream(profile.fieldOfStudy);

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-stone-900 text-white px-4 py-2.5 rounded-xl shadow-2xl text-xs font-bold border border-stone-700 flex items-center gap-2 animate-slideUp">
          <Sparkles className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Banner & Control */}
      <div className="bg-gradient-to-r from-stone-900 via-stone-800 to-emerald-950 text-white rounded-3xl p-6 sm:p-7 shadow-lg border border-emerald-900/40 relative overflow-hidden">
        {/* Background Radial Accent Glow */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-60 h-60 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold border border-emerald-500/30 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                برنامه هوشمند حجمی-زمانی کنکور
              </span>
              <span className="text-xs text-stone-300 bg-white/10 px-2.5 py-1 rounded-full border border-white/10 font-semibold">
                هدف کل هفته: {schedule.totalPlannedHours} ساعت
              </span>
              {totalTargetTestsAll > 0 && (
                <span className="text-xs text-amber-300 bg-amber-500/20 px-2.5 py-1 rounded-full border border-amber-500/30 font-semibold flex items-center gap-1">
                  <Target className="w-3 h-3" />
                  {completedTargetTestsAll} از {totalTargetTestsAll} تست زده شده
                </span>
              )}
              {schedule.cycleWeek && (
                <span className="text-xs text-indigo-300 bg-indigo-500/20 px-2.5 py-1 rounded-full border border-indigo-500/30 font-semibold flex items-center gap-1">
                  <Layers className="w-3 h-3 text-indigo-400" />
                  {schedule.cycleWeek === 'week_1' ? 'چرخه ۲ هفته‌ای: هفته ۱ (آموزش و تکالیف)' : 'چرخه ۲ هفته‌ای: هفته ۲ (تست و آزمون)'}
                </span>
              )}
            </div>

            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white">{schedule.weekTitle}</h2>
            <p className="text-xs sm:text-sm text-stone-300 leading-relaxed font-normal">
              {schedule.strategySummary}
            </p>

            {/* Overall Progress Meter */}
            <div className="pt-2 flex items-center gap-4">
              <div className="flex-1 bg-stone-800/80 rounded-full h-2.5 overflow-hidden border border-white/10 p-0.5">
                <div
                  className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full rounded-full transition-all duration-500 shadow-xs"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <span className="text-xs font-black text-emerald-400 shrink-0">
                {progressPercent}٪ تحقق برنامه ({completedBlocks} از {allBlocks.length} پارت)
              </span>
            </div>
          </div>

          <div className="flex flex-col md:items-end gap-3 shrink-0 w-full md:w-auto mt-4 md:mt-0">
            {/* Primary Actions */}
            <div className="flex flex-wrap items-center gap-2 md:justify-end w-full md:w-auto">
              {/* View Mode Toggle (Daily vs Weekly Grid) */}
              <div className="bg-stone-800/80 p-1 rounded-xl border border-white/10 flex items-center gap-1 w-full sm:w-auto">
                <button
                  onClick={() => setViewMode('daily')}
                  className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    viewMode === 'daily'
                      ? 'bg-emerald-500 text-stone-950 shadow-xs'
                      : 'text-stone-300 hover:text-white hover:bg-white/5'
                  }`}
                  title="نمای تفکیکی روزانه"
                >
                  <List className="w-3.5 h-3.5" />
                  <span>نمای روزانه</span>
                </button>
                <button
                  onClick={() => setViewMode('weekly_grid')}
                  className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    viewMode === 'weekly_grid'
                      ? 'bg-emerald-500 text-stone-950 shadow-xs'
                      : 'text-stone-300 hover:text-white hover:bg-white/5'
                  }`}
                  title="نمای جدول کامل هفتگی و چاپ"
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                  <span>جدول کل هفته</span>
                </button>
              </div>

              <button
                onClick={() => setShowGenerateModal(true)}
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-stone-950 text-xs font-black shadow-md hover:shadow-lg transition-all cursor-pointer group"
              >
                <RefreshCw className="w-4 h-4 group-hover:rotate-180 transition-transform duration-500" />
                <span>بازتولید با AI</span>
              </button>

              <button
                onClick={handleRecoverMissedBlocks}
                className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-orange-500/20 hover:bg-orange-500/30 text-orange-200 text-xs font-bold border border-orange-500/30 transition-all cursor-pointer"
                title="انتقال تمام پارت‌های عقب‌افتاده به روز جمعه"
              >
                <RotateCcw className="w-4 h-4 text-orange-400" />
                <span className="hidden sm:inline">ایستگاه جبرانی</span>
                <span className="sm:hidden">جبرانی</span>
              </button>
            </div>

            {/* Secondary Actions */}
            <div className="flex flex-wrap items-center gap-2 md:justify-end w-full md:w-auto">
              <div className="flex-1 sm:flex-none flex items-center gap-1 bg-stone-800/80 p-1 rounded-xl border border-white/10">
                <button
                  onClick={handleArchiveCurrentSchedule}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-stone-900 text-xs font-black transition-all shadow-md cursor-pointer"
                  title="ذخیره وضعیت این هفته در آرشیو هفتگی"
                >
                  <FolderArchive className="w-4 h-4" />
                  <span>ذخیره در آرشیو</span>
                </button>
                <button
                  onClick={() => setShowArchiveModal(true)}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-500 hover:bg-indigo-400 text-white text-xs font-black transition-all shadow-md cursor-pointer relative"
                  title="مشاهده آرشیو هفته‌های گذشته"
                >
                  <History className="w-4 h-4" />
                  <span>آرشیو هفته‌ها ({scheduleArchive.length})</span>
                </button>
              </div>

              <div className="flex-1 sm:flex-none flex items-center gap-1 bg-stone-800/80 p-1 rounded-xl border border-white/10">
                <button
                  onClick={handlePrintSchedule}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-white/10 text-white text-xs font-bold transition-all cursor-pointer"
                  title="چاپ برنامه یا ذخیره به عنوان PDF"
                >
                  <Printer className="w-3.5 h-3.5 text-sky-400" />
                  <span className="hidden sm:inline">چاپ (PDF)</span>
                </button>
                <button
                  onClick={handleCopyScheduleText}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-white/10 text-white text-xs font-bold transition-all cursor-pointer"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span className="hidden sm:inline">{copied ? 'کپی شد' : 'اشتراک'}</span>
                </button>
              </div>

              <button
                onClick={() => setShowClearModal(true)}
                className="flex items-center justify-center p-2 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 hover:text-rose-200 border border-rose-500/30 transition-all cursor-pointer"
                title="حذف کامل تمام پارت‌های برنامه هفتگی"
              >
                <Trash2 className="w-4 h-4 text-rose-400" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Exam Budget Guidance & Countdown Card */}
      {examTimelineInfo && (
        <div className="bg-gradient-to-br from-amber-950/90 via-stone-900 to-stone-900 text-white rounded-3xl p-5 sm:p-6 border border-amber-500/30 shadow-md relative overflow-hidden">
          <div className="absolute top-0 right-0 w-72 h-72 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10 space-y-4">
            {/* Top Bar: Exam Name, Target Date, Countdown Badge & Action */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3.5 border-b border-white/10">
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 text-xs font-black border border-amber-500/30 flex items-center gap-1.5">
                    <CalendarCheck2 className="w-3.5 h-3.5 text-amber-400" />
                    هدف‌گذاری آزمون پیش‌رو
                  </span>
                  <span className="text-xs bg-white/10 text-stone-200 px-2.5 py-1 rounded-full border border-white/10 font-bold flex items-center gap-1">
                    <Clock className="w-3 h-3 text-amber-300" />
                    تاریخ آزمون: {examTimelineInfo.examDate}
                  </span>
                  {examTimelineInfo.daysLeft !== null && (
                    <span className={`text-xs px-3 py-1 rounded-full font-black flex items-center gap-1.5 ${
                      examTimelineInfo.daysLeft <= 3 
                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse' 
                        : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    }`}>
                      <Hourglass className="w-3.5 h-3.5" />
                      {examTimelineInfo.daysLeft === 0 
                        ? 'امروز روز آزمون است!' 
                        : `${examTimelineInfo.daysLeft} روز تا آزمون باقی مانده`}
                    </span>
                  )}
                </div>
                <h3 className="text-lg sm:text-xl font-black text-white flex items-center gap-2 pt-1">
                  <span>{examTimelineInfo.examName}</span>
                </h3>
                <p className="text-xs text-stone-300">
                  <strong className="text-amber-300">هدف‌گذاری داوطلب:</strong> {examTimelineInfo.targetGoal}
                </p>
              </div>

              <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
                <button
                  type="button"
                  onClick={() => setShowExamTopicsList(!showExamTopicsList)}
                  className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-bold border border-white/15 flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <BookmarkCheck className="w-3.5 h-3.5 text-amber-400" />
                  <span>{showExamTopicsList ? 'بستن سرفصل‌ها' : 'مشاهده سرفصل‌های آزمون'}</span>
                  {showExamTopicsList ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>
                {onSwitchToExamTab && (
                  <button
                    type="button"
                    onClick={onSwitchToExamTab}
                    className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-black flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                  >
                    <span>تنظیمات بودجه‌بندی</span>
                    <ArrowRight className="w-3.5 h-3.5 rotate-180" />
                  </button>
                )}
              </div>
            </div>

            {/* List of Syllabus Topics with Status & Weekly Coverage */}
            {showExamTopicsList && (
              <div className="space-y-3 pt-1 animate-fadeIn">
                <div className="flex items-center justify-between text-xs text-stone-300">
                  <span className="font-bold flex items-center gap-1.5 text-amber-200">
                    <ShieldCheck className="w-4 h-4 text-amber-400" />
                    مباحثی که باید برای این آزمون مطالعه و تست‌زنی شوند ({examTimelineInfo.selectedTopics.length} مبحث بودجه‌بندی):
                  </span>
                  <span className="text-[11px] text-stone-400">
                    تارگت کل تست آزمون: {examTimelineInfo.totalTargetTests} تست
                  </span>
                </div>

                {examTimelineInfo.selectedTopics.length === 0 ? (
                  <div className="text-center py-4 bg-white/5 rounded-2xl border border-white/10 text-xs text-stone-300">
                    <span>هنوز مبحثی برای آزمون تیک نخورده است. از بخش «بودجه‌بندی آزمون» مباحث را مشخص کنید.</span>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
                    {examTimelineInfo.selectedTopics.map((topicName) => {
                      const coverage = getExamTopicWeeklyCoverage(topicName);
                      const detail = examTimelineInfo.topicDetails.find(td => td.chapter === topicName || topicName.includes(td.chapter));
                      return (
                        <div
                          key={topicName}
                          className={`p-3 rounded-2xl border transition-all text-xs flex flex-col justify-between gap-2 ${
                            coverage.isCovered
                              ? coverage.isFullyDone
                                ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-100'
                                : 'bg-stone-900/90 border-amber-500/40 text-stone-100 shadow-xs'
                              : 'bg-stone-900/60 border-rose-500/30 text-stone-300'
                          }`}
                        >
                          <div>
                            <div className="flex items-center justify-between gap-1.5 mb-1">
                              <span className="font-black text-white text-[13px] leading-tight">
                                {topicName}
                              </span>
                              {coverage.isCovered ? (
                                <span className={`text-[10px] px-2 py-0.5 rounded-md font-black shrink-0 ${
                                  coverage.isFullyDone 
                                    ? 'bg-emerald-500 text-stone-950' 
                                    : 'bg-amber-400 text-stone-950'
                                }`}>
                                  {coverage.isFullyDone ? 'تکمیل شده ✅' : `${coverage.completedBlocksCount}/${coverage.blockCount} پارت`}
                                </span>
                              ) : (
                                <span className="text-[10px] px-2 py-0.5 rounded-md bg-rose-500/20 text-rose-300 font-bold border border-rose-500/30 shrink-0">
                                  نیاز به پارت در جدول
                                </span>
                              )}
                            </div>

                            {detail && (
                              <div className="flex items-center gap-2 text-[11px] text-stone-400 flex-wrap">
                                <span className="text-amber-300">سختی: {detail.difficulty}</span>
                                <span>•</span>
                                <span>هدف تست: {detail.targetTestCount} تست</span>
                              </div>
                            )}
                          </div>

                          <div className="flex items-center justify-between text-[11px] pt-2 border-t border-white/10 text-stone-400">
                            <span>
                              {coverage.isCovered 
                                ? `${coverage.totalHours} ساعت در هفته (${coverage.targetTests} تست)` 
                                : 'در برنامه هفته قرار نگرفته'}
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                setFormSubject(detail?.subject || topicName.split('(')[0]?.trim() || topicName);
                                setFormTopic(topicName);
                                setFormTargetTests(detail?.targetTestCount ? Math.min(detail.targetTestCount, 35) : 30);
                                setIsBlockModalOpen(true);
                              }}
                              className="text-amber-300 hover:text-amber-200 font-bold flex items-center gap-0.5 cursor-pointer"
                              title="افزودن پارت برای این مبحث آزمونی"
                            >
                              <Plus className="w-3 h-3" />
                              <span>افزودن پارت</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* VIEW 1: WEEKLY FULL GRID (Table & Desk Print View) */}
      {viewMode === 'weekly_grid' ? (
        <div className="bg-white rounded-3xl p-6 border border-stone-200 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-stone-200">
            <div>
              <h3 className="text-base font-black text-stone-900 flex items-center gap-2">
                <LayoutGrid className="w-4 h-4 text-emerald-600" />
                جدول برنامه هفتگی اختصاصی (آماده پرینت و نصب روی میز مطالعه)
              </h3>
              <p className="text-xs text-stone-500 mt-0.5">
                نمای کلی تمام روزهای هفته با تفکیک ساعات، مباحث و تعداد تست‌ها
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handlePrintSchedule}
                className="flex items-center gap-1.5 px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5 text-emerald-400" />
                <span>پرینت استاندارد A4</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {safeDays.map((day, dIdx) => {
              const dayDone = day.blocks.filter(b => b.isDone).length;
              const dayTests = day.blocks.reduce((acc, b) => acc + (b.targetTests || 0), 0);
              return (
                <div 
                  key={dIdx} 
                  className={`rounded-2xl border p-4 flex flex-col justify-between transition-all ${
                    dayDone === day.blocks.length && day.blocks.length > 0
                      ? 'bg-emerald-50/40 border-emerald-300'
                      : 'bg-stone-50/70 border-stone-200 hover:border-stone-300'
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between border-b border-stone-200/80 pb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-black text-sm text-stone-900">{day.dayName}</span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-stone-200 text-stone-700">
                          {day.targetHours} ساعت
                        </span>
                      </div>
                      <span className="text-[11px] font-bold text-emerald-700">
                        {dayDone}/{day.blocks.length} پارت
                      </span>
                    </div>

                    {day.dailyTip && (
                      <div className="text-[11px] text-emerald-900 bg-white/90 p-2 rounded-lg border border-emerald-100 leading-tight">
                        💡 {day.dailyTip}
                      </div>
                    )}

                    <div className="space-y-2">
                      {day.blocks.length === 0 ? (
                        <div className="py-6 text-center border border-dashed border-stone-200 rounded-xl text-[11px] text-stone-400">
                          <span>پارتی تعریف نشده</span>
                        </div>
                      ) : (
                        day.blocks.map((b) => (
                          <div
                            key={b.id}
                            onClick={() => handleToggleBlock(dIdx, b.id)}
                            className={`p-2.5 rounded-xl border text-xs cursor-pointer transition-all ${
                              b.isDone
                                ? 'bg-stone-100 border-stone-200 text-stone-400 line-through opacity-70'
                                : 'bg-white border-stone-200 hover:border-emerald-300 shadow-2xs'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-1 mb-1">
                              <span className="font-bold text-stone-800">{b.subject}</span>
                              <span className="text-[10px] text-stone-500">{b.timeSlot}</span>
                            </div>
                            <p className="text-[11px] text-stone-600 leading-tight mb-1.5">{b.topic}</p>
                            {isBlockMatchingExamTopic(b) && (
                              <div className="mb-1.5 inline-flex items-center gap-1 text-[9px] font-bold text-amber-900 bg-amber-100/90 border border-amber-300 px-1.5 py-0.5 rounded">
                                <span>🎯 سرفصل آزمون</span>
                              </div>
                            )}
                            <div className="flex items-center justify-between text-[10px]">
                              <span className={`px-1.5 py-0.5 rounded border ${getBadgeStyle(b.type)}`}>
                                {getTypeName(b.type)}
                              </span>
                              {b.targetTests ? (
                                <span className="font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                                  🎯 {b.targetTests} تست
                                </span>
                              ) : (
                                <span className="text-stone-400">{b.durationMinutes} دقیقه</span>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  <div className="pt-3 mt-3 border-t border-stone-200/60 flex items-center justify-between text-[11px] text-stone-500">
                    <span>مجموع تست: {dayTests} تست</span>
                    <button
                      onClick={() => {
                        setActiveDayIndex(dIdx);
                        setViewMode('daily');
                      }}
                      className="text-emerald-700 hover:text-emerald-800 font-bold hover:underline cursor-pointer"
                    >
                      ویرایش در نمای روزانه ←
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* VIEW 2: INTERACTIVE DAILY VIEW */
        <div className="space-y-6">
          {/* Days Navigation Tabs */}
          <div className="flex overflow-x-auto gap-2 pb-1 scrollbar-none">
            {safeDays.map((day, idx) => {
              const isSelected = idx === safeActiveDayIndex;
              const dayDoneCount = day.blocks.filter(b => b.isDone).length;
              const isAllDone = day.blocks.length > 0 && dayDoneCount === day.blocks.length;
              return (
                <button
                  key={idx}
                  onClick={() => setActiveDayIndex(idx)}
                  className={`flex-1 min-w-[110px] p-3 rounded-2xl border text-right transition-all shrink-0 cursor-pointer ${
                    isSelected
                      ? 'bg-stone-900 text-white border-stone-900 shadow-md ring-2 ring-emerald-500/50'
                      : isAllDone
                      ? 'bg-emerald-50 text-emerald-900 border-emerald-200 hover:bg-emerald-100'
                      : 'bg-white text-stone-700 border-stone-200 hover:border-stone-300 hover:bg-stone-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black">{day.dayName}</span>
                    {isAllDone && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />}
                  </div>
                  <div className={`text-[11px] mt-1.5 flex items-center justify-between ${isSelected ? 'text-stone-300' : 'text-stone-400'}`}>
                    <span>{day.targetHours} ساعت</span>
                    <span className={`font-bold ${isSelected ? 'text-emerald-300' : 'text-stone-600'}`}>
                      {dayDoneCount}/{day.blocks.length} پارت
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Active Day Detail Card */}
          <div className="bg-white rounded-3xl p-6 sm:p-7 border border-stone-200 shadow-xs space-y-6">
            {/* Header of Active Day */}
            <div className="flex flex-col md:flex-row md:items-center justify-between pb-5 border-b border-stone-100 gap-4">
              <div className="space-y-1.5">
                <div className="flex items-center gap-3 flex-wrap">
                  <h3 className="text-xl font-black text-stone-900">{activeDay.dayName}</h3>
                  <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-stone-100 text-stone-700 border border-stone-200">
                    ساعت هدف: {activeDay.targetHours} ساعت
                  </span>
                  {activeDayTargetTests > 0 && (
                    <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-1">
                      <Target className="w-3.5 h-3.5" />
                      {activeDayCompletedTests} از {activeDayTargetTests} تست تکمیل شده
                    </span>
                  )}
                </div>
                {activeDay.dailyTip && (
                  <p className="text-xs text-emerald-900 bg-emerald-50/90 border border-emerald-200/80 px-3.5 py-2 rounded-xl inline-flex items-center gap-2 leading-relaxed">
                    <span>💡</span>
                    <span>{activeDay.dailyTip}</span>
                  </p>
                )}
              </div>

              {/* Navigation & Action Buttons */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={handleOpenAddBlockModal}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-xs hover:shadow-md transition-all cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>افزودن پارت درسی</span>
                </button>

                {activeDayDoneBlocks < activeDayBlocks.length ? (
                  <button
                    onClick={() => handleMarkAllDayDone(true)}
                    className="flex items-center gap-1.5 px-3 py-2 bg-stone-100 hover:bg-emerald-50 hover:text-emerald-700 border border-stone-200 rounded-xl text-xs font-bold text-stone-700 transition-all cursor-pointer"
                    title="علامت‌گذاری تمام پارت‌های این روز به عنوان انجام‌شده"
                  >
                    <CheckCheck className="w-4 h-4 text-emerald-600" />
                    <span>تکمیل همه</span>
                  </button>
                ) : (
                  <button
                    onClick={() => handleMarkAllDayDone(false)}
                    className="flex items-center gap-1.5 px-3 py-2 bg-stone-100 hover:bg-amber-50 hover:text-amber-700 border border-stone-200 rounded-xl text-xs font-bold text-stone-700 transition-all cursor-pointer"
                    title="بازنشانی تیک‌های این روز"
                  >
                    <RotateCcw className="w-4 h-4 text-amber-600" />
                    <span>بازنشانی پارت‌ها</span>
                  </button>
                )}

                <div className="flex items-center gap-1 border-r border-stone-200 pr-2 mr-1">
                  <button
                    onClick={() => setActiveDayIndex((prev) => (prev > 0 ? prev - 1 : safeDays.length - 1))}
                    className="p-2 rounded-xl border border-stone-200 hover:bg-stone-100 text-stone-700 transition-all cursor-pointer"
                    title="روز قبل"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setActiveDayIndex((prev) => (prev < safeDays.length - 1 ? prev + 1 : 0))}
                    className="p-2 rounded-xl border border-stone-200 hover:bg-stone-100 text-stone-700 transition-all cursor-pointer"
                    title="روز بعد"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Filter Chips Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-xs font-bold text-stone-500 ml-1 flex items-center gap-1">
                  <Filter className="w-3.5 h-3.5" />
                  فیلتر:
                </span>
                {[
                  { id: 'all', label: 'همه پارت‌ها' },
                  { id: 'pending', label: '⏳ انجام‌نشده‌ها' },
                  { id: 'completed', label: '✅ انجام‌شده‌ها' },
                  { id: 'concept', label: '📘 مفهومی' },
                  { id: 'test', label: '🎯 تستی' },
                  { id: 'class', label: '🏫 کلاس‌ها' },
                  { id: 'review', label: '🔄 مرور/جبرانی' },
                ].map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setBlockFilter(f.id as BlockFilterType)}
                    className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      blockFilter === f.id
                        ? 'bg-stone-900 text-white shadow-xs'
                        : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              {/* Day Progress Stat */}
              <div className="text-xs font-bold text-stone-600 bg-stone-50 px-3 py-1.5 rounded-xl border border-stone-200">
                <span>{activeDayDoneBlocks} از {activeDayBlocks.length} پارت تکمیل شده ({activeDayBlocks.length > 0 ? Math.round((activeDayDoneBlocks / activeDayBlocks.length) * 100) : 0}٪)</span>
              </div>
            </div>

            {/* Study Blocks List */}
            {filteredBlocks.length === 0 ? (
              <div className="text-center py-12 bg-stone-50 rounded-2xl border border-dashed border-stone-200 space-y-3 px-4">
                <BookOpen className="w-10 h-10 text-stone-300 mx-auto" />
                <div className="text-sm font-bold text-stone-700">
                  {allBlocks.length === 0 
                    ? `برنامه هفتگی در حال حاضر خالی است.`
                    : `هیچ پارت درسی برای ${activeDay.dayName} مطابق با این فیلتر یافت نشد.`}
                </div>
                <p className="text-xs text-stone-500 max-w-md mx-auto">
                  {allBlocks.length === 0 
                    ? 'می‌توانید به صورت دستی پارت‌های درسی مد نظرتان را اضافه کنید یا با هوش مصنوعی برنامه علمی هفتگی بسازید.'
                    : 'می‌توانید پارت جدید اضافه کنید یا فیلتر را به «همه پارت‌ها» تغییر دهید.'}
                </p>
                <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                  <button
                    onClick={handleOpenAddBlockModal}
                    className="px-4 py-2 bg-emerald-600 text-white text-xs font-bold rounded-xl hover:bg-emerald-500 transition-all cursor-pointer inline-flex items-center gap-1.5 shadow-xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>افزودن پارت درسی به {activeDay.dayName}</span>
                  </button>
                  {allBlocks.length === 0 && (
                    <button
                      onClick={() => setShowGenerateModal(true)}
                      className="px-4 py-2 bg-stone-900 text-white text-xs font-bold rounded-xl hover:bg-stone-800 transition-all cursor-pointer inline-flex items-center gap-1.5 shadow-xs"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                      <span>تولید خودکار برنامه با AI</span>
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredBlocks.map((block) => (
                  <div
                    key={block.id}
                    onClick={() => handleToggleBlock(safeActiveDayIndex, block.id)}
                    className={`p-4 sm:p-5 rounded-2xl border transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                      block.isDone
                        ? 'bg-stone-50/80 border-stone-200 text-stone-400 opacity-75 shadow-2xs'
                        : 'bg-white border-stone-200/90 hover:border-emerald-400 hover:shadow-md'
                    }`}
                  >
                    <div className="flex items-start sm:items-center gap-3.5">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleBlock(safeActiveDayIndex, block.id);
                        }}
                        className="text-stone-400 hover:text-emerald-600 transition-colors mt-0.5 sm:mt-0"
                      >
                        {block.isDone ? (
                          <CheckCircle2 className="w-6 h-6 text-emerald-600 fill-emerald-50" />
                        ) : (
                          <Circle className="w-6 h-6 text-stone-300 hover:text-emerald-500" />
                        )}
                      </button>

                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`text-base font-black ${block.isDone ? 'line-through text-stone-500' : 'text-stone-900'}`}>
                            {block.subject}
                          </span>
                          <span className={`text-[11px] px-2.5 py-0.5 rounded-lg border font-bold ${getBadgeStyle(block.type)}`}>
                            {getTypeName(block.type)}
                          </span>
                          {block.difficultyLevel && (
                            <span className="text-[10px] px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200 font-bold">
                              {block.difficultyLevel}
                            </span>
                          )}
                          {block.targetTests && block.targetTests > 0 ? (
                            <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-black border border-emerald-300 flex items-center gap-1">
                              <Target className="w-3 h-3" />
                              {block.targetTests} تست
                            </span>
                          ) : null}
                          {isBlockMatchingExamTopic(block) && (
                            <span className="text-[10px] px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 font-black border border-amber-300 flex items-center gap-1">
                              <BookmarkCheck className="w-3 h-3 text-amber-600" />
                              منطبق با بودجه آزمون
                            </span>
                          )}
                        </div>

                        <div className={`text-xs leading-relaxed ${block.isDone ? 'line-through text-stone-400' : 'text-stone-700'}`}>
                          {block.topic}
                        </div>

                        {block.recommendedMethod && (
                          <div className="flex items-center gap-1.5 text-[11px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 rounded-lg px-2.5 py-1 w-max mt-1">
                            <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                            <span>تکنیک: {block.recommendedMethod}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-stone-100">
                      <div className="text-right sm:text-left">
                        <div className="text-xs font-black text-stone-800 flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-stone-400" />
                          <span>{block.timeSlot}</span>
                        </div>
                        <div className="text-[11px] text-stone-400 mt-0.5">
                          {block.actualDurationMinutes ? (
                            <span className="text-emerald-600 font-bold">{block.actualDurationMinutes} دقیقه ثبت شد</span>
                          ) : (
                            `${block.durationMinutes} دقیقه`
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {!block.isDone && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveFocusBlock(block);
                            }}
                            className="flex items-center gap-1 text-xs font-black bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white px-3 py-2 rounded-xl shadow-xs transition-all cursor-pointer"
                            title="ورود به اتاق تمرکز و تایمر"
                          >
                            <Play className="w-3.5 h-3.5 fill-white" />
                            <span>شروع پارت</span>
                          </button>
                        )}

                        <button
                          onClick={(e) => handleOpenEditBlockModal(safeActiveDayIndex, block, e)}
                          className="p-2 text-stone-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all cursor-pointer border border-transparent hover:border-indigo-200"
                          title="ویرایش این پارت درسی"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>

                        <button
                          onClick={(e) => handleDeleteBlock(safeActiveDayIndex, block.id, e)}
                          className="p-2 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all cursor-pointer border border-transparent hover:border-rose-200"
                          title="حذف این پارت درسی"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Focus Room Modal */}
      {activeFocusBlock && (
        <LiveFocusRoom
          block={activeFocusBlock}
          onClose={() => setActiveFocusBlock(null)}
          onComplete={handleFocusComplete}
        />
      )}

      {/* Manual Add / Edit Study Block Modal */}
      {isBlockModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-stone-200 space-y-5 animate-scaleUp">
            <div className="flex justify-between items-center pb-3 border-b border-stone-100">
              <h3 className="font-black text-stone-900 text-base flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-emerald-600" />
                <span>{editingBlock ? 'ویرایش پارت درسی' : 'افزودن پارت درسی جدید'}</span>
              </h3>
              <button
                onClick={() => setIsBlockModalOpen(false)}
                className="text-stone-400 hover:text-stone-700 text-base font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs text-stone-700">
              {/* Target Day Selector */}
              <div>
                <label className="block text-xs font-bold text-stone-800 mb-1">
                  روز مدنظر در هفته:
                </label>
                <div className="grid grid-cols-4 sm:grid-cols-7 gap-1.5">
                  {safeDays.map((d, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setFormTargetDayIdx(i)}
                      className={`py-1.5 px-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                        formTargetDayIdx === i
                          ? 'bg-stone-900 text-white border-stone-900'
                          : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
                      }`}
                    >
                      {d.dayName}
                    </button>
                  ))}
                </div>
              </div>

              {/* Subject Input with Quick Suggestions */}
              <div>
                <label className="block text-xs font-bold text-stone-800 mb-1">
                  نام درس:
                </label>
                <input
                  type="text"
                  value={formSubject}
                  onChange={(e) => setFormSubject(e.target.value)}
                  placeholder="مثال: حسابان ۲ / زیست‌شناسی / شیمی"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-xs font-bold focus:outline-emerald-600 focus:border-emerald-600"
                />
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {commonSubjectSuggestions.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setFormSubject(s)}
                      className="px-2 py-0.5 rounded-lg bg-stone-100 hover:bg-emerald-50 hover:text-emerald-700 text-[10px] font-bold text-stone-600 transition-all cursor-pointer"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              {/* Topic Input */}
              <div>
                <label className="block text-xs font-bold text-stone-800 mb-1">
                  سرفصل و مبحث دقیق مطالعه:
                </label>
                <textarea
                  rows={2}
                  value={formTopic}
                  onChange={(e) => setFormTopic(e.target.value)}
                  placeholder="مثال: حل مسائل مشتق توابع کسری و رسم نمودار + تست‌های کنکور سراسری ۹۸ تا ۱۴۰۲"
                  className="w-full px-3.5 py-2 rounded-xl border border-stone-300 text-xs focus:outline-emerald-600 focus:border-emerald-600"
                />
              </div>

              {/* Time Slot & Duration */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-stone-800 mb-1">
                    بازه زمانی (تایم‌اسلات):
                  </label>
                  <input
                    type="text"
                    value={formTimeSlot}
                    onChange={(e) => setFormTimeSlot(e.target.value)}
                    placeholder="مثال: ۱۶:۰۰ - ۱۷:۳۰"
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs focus:outline-emerald-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-800 mb-1">
                    مدت زمان (دقیقه):
                  </label>
                  <input
                    type="number"
                    min={15}
                    max={240}
                    step={15}
                    value={formDuration}
                    onChange={(e) => setFormDuration(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs focus:outline-emerald-600"
                  />
                </div>
              </div>

              {/* Block Type & Target Tests */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-stone-800 mb-1">
                    نوع پارت درسی:
                  </label>
                  <select
                    value={formType}
                    onChange={(e) => setFormType(e.target.value as StudyBlock['type'])}
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs font-bold focus:outline-emerald-600 bg-white"
                  >
                    <option value="concept">📘 یادگیری و مفهومی</option>
                    <option value="test">🎯 تست و تمرین</option>
                    <option value="review">🔄 مرور و بازیابی</option>
                    <option value="compensatory">🩹 باکس جبرانی</option>
                    <option value="class">🏫 کلاس ثابت هفتگی</option>
                    <option value="class_homework">✍️ تکلیف و مرور کلاس</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-800 mb-1">
                    تعداد تست هدف:
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={150}
                    value={formTargetTests}
                    onChange={(e) => setFormTargetTests(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs focus:outline-emerald-600"
                    placeholder="مثلاً ۳۰"
                  />
                </div>
              </div>

              {/* Difficulty & Method */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-stone-800 mb-1">
                    درجه سختی مبحث:
                  </label>
                  <select
                    value={formDifficulty}
                    onChange={(e) => setFormDifficulty(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs focus:outline-emerald-600 bg-white"
                  >
                    <option value="آسان">آسان</option>
                    <option value="متوسط">متوسط</option>
                    <option value="سخت">سخت</option>
                    <option value="بسیار چالشی و دام‌دار">بسیار چالشی و دام‌دار</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-800 mb-1">
                    تکنیک پیشنهادی مطالعه:
                  </label>
                  <select
                    value={formMethod}
                    onChange={(e) => setFormMethod(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs focus:outline-emerald-600 bg-white"
                  >
                    <option value="پومودورو (۲۵-۵)">پومودورو (۲۵-۵)</option>
                    <option value="تکنیک فاینمن">تکنیک فاینمن</option>
                    <option value="بازیابی فعال (Active Recall)">بازیابی فعال (Active Recall)</option>
                    <option value="تست‌زنی زمان‌دار">تست‌زنی زمان‌دار</option>
                    <option value="مرور فاصله‌دار ابینگهاوس">مرور فاصله‌دار ابینگهاوس</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-4 border-t border-stone-100">
              <button
                type="button"
                onClick={() => setIsBlockModalOpen(false)}
                className="px-4 py-2 text-xs font-bold text-stone-600 hover:text-stone-800 cursor-pointer"
              >
                انصراف
              </button>
              <button
                type="button"
                onClick={handleSaveBlock}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black shadow-md transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                <span>{editingBlock ? 'ذخیره تغییرات پارت' : 'افزودن پارت به برنامه'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AI Schedule Generation Modal */}
      {showGenerateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-stone-200 space-y-5 animate-scaleUp">
            <div className="flex justify-between items-center pb-3 border-b border-stone-100">
              <h3 className="font-black text-stone-900 text-base flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-emerald-600" />
                <span>طراحی برنامه هفتگی اختصاصی با هوش مصنوعی</span>
              </h3>
              <button
                onClick={() => setShowGenerateModal(false)}
                className="text-stone-400 hover:text-stone-700 font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs text-stone-600 max-h-[75vh] overflow-y-auto pr-1">
              {/* Stream Badge with coefficients */}
              <div className="bg-emerald-50/80 p-3 rounded-2xl border border-emerald-200/80 flex items-start gap-2.5">
                <div className="p-1.5 bg-emerald-600 text-white rounded-xl shrink-0 mt-0.5">
                  <GraduationCap className="w-4 h-4" />
                </div>
                <div className="space-y-1 text-[11px] text-emerald-950">
                  <div className="flex items-center gap-2">
                    <span className="font-black text-xs text-emerald-900">رشته تحصیلی: {profile.fieldOfStudy}</span>
                    <span className="bg-emerald-200/80 text-emerald-900 font-bold px-2 py-0.5 rounded-md text-[10px]">تخصصی</span>
                  </div>
                  <p className="text-stone-600 leading-tight">
                    برنامه‌ریزی دقیقاً بر پایه ضرایب رسمی سازمان سنجش، اولویت دروس هدف و چیدمان پارت‌های تست متناسب با رشته {profile.fieldOfStudy} انجام می‌شود.
                  </p>
                </div>
              </div>

              {/* Planning Strategy Selector */}
              <div className="bg-stone-50 p-3 rounded-2xl border border-stone-200 space-y-2">
                <label className="block text-xs font-bold text-stone-800">
                  سبک و استراتژی برنامه‌ریزی:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'balanced', title: '⚖️ متوازن و راهبردی', desc: 'آموزش مفهومی + تست آموزشی + تست زمان‌دار' },
                    { id: 'turbo_tests', title: '⚡ توربو تست‌محور', desc: '۸۰٪ تست زمان‌دار و سرعتی با تکنیک ضربدر منها' },
                    { id: 'concept_deep', title: '📖 تسلط عمیق مفهومی', desc: 'متن‌خوانی دقیق، شکل‌خوانی و تست‌های خط‌به‌خط' },
                    { id: 'exam_prep', title: '🎯 جمع‌بندی آزمون', desc: 'شبیه‌سازی دفترچه‌ها و رفع اشکال فوری' },
                  ].map(s => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setPlanningStrategy(s.id as any)}
                      className={`p-2.5 rounded-xl border text-right transition-all flex flex-col gap-0.5 cursor-pointer ${
                        planningStrategy === s.id
                          ? 'border-emerald-600 bg-emerald-50 text-emerald-950 shadow-xs'
                          : 'border-stone-200 bg-white text-stone-700 hover:border-stone-300'
                      }`}
                    >
                      <span className="font-bold text-[11px] text-stone-900">{s.title}</span>
                      <span className="text-[10px] text-stone-500 leading-tight">{s.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Spaced Repetition Toggle */}
              <div className="bg-stone-50 p-3 rounded-2xl border border-stone-200 flex items-center justify-between">
                <div className="space-y-0.5">
                  <span className="font-bold text-xs text-stone-900 flex items-center gap-1.5">
                    🧠 سیستم مرور فواصل زمانی ابینگهاوس (Spaced Repetition)
                  </span>
                  <p className="text-[11px] text-stone-500">
                    تولید پارت‌های مرور ۲۴ ساعته، ۳ روزه و هفتگی برای تثبیت حافظه بلندمدت
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSpacedReviewEnabled(!spacedReviewEnabled)}
                  className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer ${
                    spacedReviewEnabled ? 'bg-emerald-600 justify-end' : 'bg-stone-300 justify-start'
                  }`}
                >
                  <div className="bg-white w-4 h-4 rounded-full shadow-md transform transition-transform" />
                </button>
              </div>

              {/* Two-Week Exam Cadence Selector */}
              <div className="bg-stone-50 p-3 rounded-2xl border border-stone-200 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-stone-800 flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-indigo-600" />
                    <span>چرخه ۲ هفته‌ای آزمون آزمایشی:</span>
                  </label>
                  <span className="text-[10px] bg-indigo-100 text-indigo-800 font-bold px-2 py-0.5 rounded-md">
                    قلم‌چی / ماز / سنجش
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setExamCycleWeek('week_1')}
                    className={`p-2.5 rounded-xl border text-right transition-all flex flex-col gap-1 cursor-pointer ${
                      examCycleWeek === 'week_1'
                        ? 'border-indigo-600 bg-indigo-50/80 text-indigo-950 shadow-xs'
                        : 'border-stone-200 bg-white text-stone-700 hover:border-stone-300'
                    }`}
                  >
                    <span className="font-bold text-xs text-indigo-950">🌱 هفته اول (پیش‌روی و تکالیف)</span>
                    <span className="text-[10px] text-stone-500 leading-tight">
                      ۷۰٪ یادگیری مفهومی، پیش‌روی بودجه، تکالیف معلم و مرور روزانه کلاس‌ها
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setExamCycleWeek('week_2')}
                    className={`p-2.5 rounded-xl border text-right transition-all flex flex-col gap-1 cursor-pointer ${
                      examCycleWeek === 'week_2'
                        ? 'border-indigo-600 bg-indigo-50/80 text-indigo-950 shadow-xs'
                        : 'border-stone-200 bg-white text-stone-700 hover:border-stone-300'
                    }`}
                  >
                    <span className="font-bold text-xs text-indigo-950">🎯 هفته دوم (تست زمان‌دار و آزمون)</span>
                    <span className="text-[10px] text-stone-500 leading-tight">
                      تست‌های سرعتی و زمان‌دار، جمع‌بندی نکات، رفع اشکال و آمادگی آزمون جمعه
                    </span>
                  </button>
                </div>
              </div>

              {/* AI Engine Selection */}
              <div className="bg-stone-50 p-3 rounded-2xl border border-stone-200 space-y-2">
                <label className="block text-xs font-bold text-stone-800">
                  موتور هوش مصنوعی برای برنامه‌ریزی:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setReasoningMode('deep_thinking')}
                    className={`p-2.5 rounded-xl border text-right transition-all flex flex-col gap-1 cursor-pointer ${
                      reasoningMode === 'deep_thinking'
                        ? 'border-indigo-600 bg-indigo-50/80 text-indigo-950 shadow-xs'
                        : 'border-stone-200 bg-white text-stone-700 hover:border-stone-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs flex items-center gap-1.5 text-indigo-900">
                        🧠 تفکر عمیق و استراتژیست
                      </span>
                      {reasoningMode === 'deep_thinking' && (
                        <span className="text-[10px] bg-indigo-600 text-white px-1.5 py-0.5 rounded-md font-bold">
                          فعال
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-stone-500 leading-tight">
                      موازنه افت انرژی، فواصل لایتنر و چیدمان ضدشکنندگی
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setReasoningMode('fast_standard')}
                    className={`p-2.5 rounded-xl border text-right transition-all flex flex-col gap-1 cursor-pointer ${
                      reasoningMode === 'fast_standard'
                        ? 'border-emerald-600 bg-emerald-50/80 text-emerald-950 shadow-xs'
                        : 'border-stone-200 bg-white text-stone-700 hover:border-stone-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs flex items-center gap-1.5 text-emerald-900">
                        ⚡ سریع و استاندارد
                      </span>
                      {reasoningMode === 'fast_standard' && (
                        <span className="text-[10px] bg-emerald-600 text-white px-1.5 py-0.5 rounded-md font-bold">
                          فعال
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-stone-500 leading-tight">
                      تولید پرسرعت با توزیع پیش‌فرض مباحث هفتگی
                    </span>
                  </button>
                </div>
              </div>

              {/* Auto-Feedback Status Badge */}
              <div className="bg-gradient-to-r from-amber-50 to-orange-50 p-3.5 rounded-2xl border border-amber-200/80 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-amber-900 flex items-center gap-1.5">
                    🔄 داده‌های چرخه بازخورد هوشمند (Auto-Feedback)
                  </span>
                  <span className="text-[10px] bg-amber-200/80 text-amber-900 font-bold px-2 py-0.5 rounded-md">
                    تلفیق خودکار
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px] text-amber-900/80">
                  <div className="bg-white/80 p-2 rounded-xl border border-amber-200/50 flex items-center gap-1.5">
                    <span>🩺 خطاهای آزمون:</span>
                    <span className="font-bold text-amber-950">
                      {(() => {
                        try {
                          const e = localStorage.getItem('study_advisor_error_logs');
                          return e ? JSON.parse(e).length : 0;
                        } catch { return 0; }
                      })()} مورد
                    </span>
                  </div>
                  <div className="bg-white/80 p-2 rounded-xl border border-amber-200/50 flex items-center gap-1.5">
                    <span>📊 گزارش‌کارهای اخیر:</span>
                    <span className="font-bold text-amber-950">
                      {(() => {
                        try {
                          const r = localStorage.getItem('study_advisor_reports');
                          return r ? JSON.parse(r).length : 0;
                        } catch { return 0; }
                      })()} ثبت‌شده
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-800 mb-1">
                  اولویت یا خواسته ویژه برای این هفته:
                </label>
                <textarea
                  rows={3}
                  value={focusNotes}
                  onChange={e => setFocusNotes(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-stone-300 text-xs focus:outline-emerald-600"
                  placeholder="مثلاً: این هفته آزمون قلم‌چی/گاج دارم، می‌خوام تست‌های شیمی و فیزیک بیشتر باشه..."
                />
              </div>

              <div className="flex flex-wrap gap-1.5 pt-1">
                {[
                  'تخصیص زمان ویژه برای تکالیف مدرسه و مرور روزانه کلاس‌ها',
                  'هفته اول چرخه: پیش‌روی مباحث و تست‌های آموزشی',
                  'هفته دوم چرخه: تست‌های زمان‌دار و جمع‌بندی آزمون جمعه',
                  'تمرکز ویژه روی تست دروس ضعیف',
                  'جبران عقب‌افتادگی‌های مباحث پایه'
                ].map((preset, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setFocusNotes(preset)}
                    className="px-2.5 py-1 rounded-lg bg-stone-100 hover:bg-emerald-50 hover:text-emerald-700 text-[11px] text-stone-700 transition-all cursor-pointer"
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-stone-100">
              <button
                type="button"
                onClick={() => setShowGenerateModal(false)}
                className="px-4 py-2 text-xs font-bold text-stone-600 hover:text-stone-800 cursor-pointer"
              >
                انصراف
              </button>
              <button
                type="button"
                disabled={isGenerating}
                onClick={handleGenerateSchedule}
                className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black shadow-md disabled:opacity-60 transition-all cursor-pointer"
              >
                {isGenerating ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>در حال چیدمان علمی برنامه...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>تولید برنامه ۷ روزه</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Weekly Archive & Progress Tracker Modal */}
      {showArchiveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-7 shadow-2xl border border-stone-200 space-y-5 text-right max-h-[85vh] flex flex-col">
            <div className="flex justify-between items-center pb-3 border-b border-stone-100 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-indigo-100 text-indigo-700 rounded-2xl">
                  <FolderArchive className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-stone-900 text-base">
                    آرشیو هفتگی و پایش روند پیشرفت
                  </h3>
                  <p className="text-[11px] text-stone-500">
                    ثبت و ذخیره برنامه‌های سپری‌شده برای مشاهده درصد تحقق، استمرار و بازیابی آسان
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowArchiveModal(false)}
                className="text-stone-400 hover:text-stone-700 font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Quick Archive Action for Current Week */}
            <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/80 p-4 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shrink-0">
              <div>
                <span className="font-bold text-xs text-amber-950 block">
                  ذخیره برنامه هفته جاری در آرشیو
                </span>
                <span className="text-[11px] text-amber-900/80">
                  وضعیت فعلی: {completedBlocks} از {allBlocks.length} پارت انجام شده ({progressPercent}٪ پیشرفت)
                </span>
              </div>
              <button
                onClick={handleArchiveCurrentSchedule}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-black shadow-xs transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
              >
                <Archive className="w-4 h-4" />
                <span>ذخیره نسخه فعلی</span>
              </button>
            </div>

            {/* Archive List */}
            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {scheduleArchive.length === 0 ? (
                <div className="py-12 text-center space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-stone-100 text-stone-400 flex items-center justify-center mx-auto">
                    <History className="w-6 h-6" />
                  </div>
                  <h4 className="font-black text-stone-700 text-sm">هنوز برنامه‌ای آرشیو نشده است</h4>
                  <p className="text-xs text-stone-500 max-w-sm mx-auto">
                    در پایان هر هفته، با زدن دکمه «ذخیره در آرشیو»، عملکرد، میزان پیشرفت و جدول هفتگی خود را ذخیره کنید تا تاریخچه پیشرفت شما کامل شود.
                  </p>
                </div>
              ) : (
                scheduleArchive.map((item) => {
                  const rate = item.completionRate ?? 0;
                  return (
                    <div
                      key={item.id}
                      className="bg-stone-50 hover:bg-stone-100/80 p-4 rounded-2xl border border-stone-200 transition-all space-y-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-black text-sm text-stone-900">
                              {item.weekTitle || 'برنامه هفتگی'}
                            </span>
                            {item.cycleWeek && (
                              <span className="text-[10px] bg-indigo-100 text-indigo-800 font-bold px-2 py-0.5 rounded-md">
                                {item.cycleWeek === 'week_1' ? 'هفته ۱ (آموزش و تکالیف)' : item.cycleWeek === 'week_2' ? 'هفته ۲ (تست و آزمون)' : 'هفتگی'}
                              </span>
                            )}
                            {item.examCycleTarget && (
                              <span className="text-[10px] bg-stone-200 text-stone-700 px-2 py-0.5 rounded-md font-medium">
                                🎯 {item.examCycleTarget}
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-stone-500 line-clamp-1">
                            {item.strategySummary}
                          </p>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            onClick={() => handleRestoreFromArchive(item)}
                            className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-black shadow-xs transition-all cursor-pointer"
                            title="بارگذاری و استفاده از این برنامه در جدول هفتگی"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>بازیابی</span>
                          </button>
                          <button
                            onClick={() => handleDeleteArchivedItem(item.id)}
                            className="p-1.5 text-stone-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                            title="حذف از آرشیو"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Progress Bar & Stats */}
                      <div className="space-y-1.5 bg-white p-3 rounded-xl border border-stone-200/60">
                        <div className="flex justify-between text-xs">
                          <span className="text-stone-600 flex items-center gap-1">
                            <span>پیشرفت پارت‌ها:</span>
                            <span className="font-black text-stone-900">
                              {item.completedBlocksCount ?? 0} از {item.totalBlocksCount ?? item.days?.reduce((acc, d) => acc + (d.blocks?.length || 0), 0) ?? 0} پارت
                            </span>
                          </span>
                          <span className={`font-black ${rate >= 75 ? 'text-emerald-600' : rate >= 50 ? 'text-amber-600' : 'text-stone-700'}`}>
                            {rate}٪ محقق‌شده
                          </span>
                        </div>
                        <div className="w-full h-2 bg-stone-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              rate >= 75 ? 'bg-emerald-500' : rate >= 50 ? 'bg-amber-500' : 'bg-indigo-500'
                            }`}
                            style={{ width: `${rate}%` }}
                          />
                        </div>
                        <div className="flex justify-between items-center text-[10px] text-stone-400 pt-1">
                          <span>کل ساعات برنامه‌ریزی: {item.totalPlannedHours} ساعت</span>
                          <span>تاریخ آرشیو: {item.archivedAt ? new Date(item.archivedAt).toLocaleDateString('fa-IR') : 'نامشخص'}</span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="pt-3 border-t border-stone-100 flex justify-end shrink-0">
              <button
                type="button"
                onClick={() => setShowArchiveModal(false)}
                className="px-5 py-2 text-xs font-bold text-stone-600 hover:text-stone-800 bg-stone-100 hover:bg-stone-200 rounded-xl cursor-pointer"
              >
                بستن پنجره
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Deleting Entire Schedule */}
      {showClearModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-stone-200 space-y-5 text-right">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="text-center space-y-2">
              <h3 className="text-base font-black text-stone-900">
                آیا از حذف کامل کل برنامه هفتگی اطمینان دارید؟
              </h3>
              <p className="text-xs text-stone-600 leading-relaxed">
                با تایید این عملیات، تمامی {allBlocks.length} پارت درسی در تمام روزهای هفته (شنبه تا جمعه) به طور کامل حذف خواهند شد و جدول هفتگی شما خالی خواهد شد.
              </p>
              <div className="text-[11px] bg-amber-50 border border-amber-200 text-amber-900 p-2.5 rounded-xl font-medium mt-2">
                ⚠️ این اقدام غیرقابل بازگشت است، اما پس از پاکسازی می‌توانید مجدداً از دکمه‌های «افزودن پارت درسی» یا «بازتولید با AI» برنامه جدید ایجاد کنید.
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-stone-100">
              <button
                type="button"
                onClick={() => setShowClearModal(false)}
                className="flex-1 py-2.5 text-xs font-bold text-stone-600 hover:text-stone-800 bg-stone-100 hover:bg-stone-200 rounded-xl transition-all cursor-pointer"
              >
                انصراف و بازگشت
              </button>
              <button
                type="button"
                onClick={handleClearEntireSchedule}
                className="flex-1 py-2.5 text-xs font-black text-white bg-rose-600 hover:bg-rose-500 rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>حذف کامل برنامه</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
