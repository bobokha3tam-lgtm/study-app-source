import React, { useState, useMemo, useEffect } from 'react';
import {
  Search,
  X,
  BookOpen,
  Sparkles,
  Layers,
  Filter,
  CheckCircle,
  TrendingUp,
  Calculator,
  ChevronDown,
  ChevronUp,
  Plus,
  ExternalLink,
  HelpCircle,
  GraduationCap,
  Award,
  Clock,
  Send,
  RefreshCw,
  Copy,
  SlidersHorizontal,
  BookmarkPlus
} from 'lucide-react';
import { 
  getCurriculumByField, 
  getMasterBooksByField, 
  STREAM_OPTIONS, 
  StreamType, 
  normalizeStream 
} from '../data/curriculumData';
import { MathTopicInfo, RecommendedBookSource, ExamBudget } from '../types';

interface KonkurAdvancedSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  examBudget?: ExamBudget;
  defaultStream?: string;
  onSelectTopicForBudget?: (topicChapter: string) => void;
  onAddCustomTopicDetail?: (topic: Partial<MathTopicInfo>) => void;
}

export const KonkurAdvancedSearchModal: React.FC<KonkurAdvancedSearchModalProps> = ({
  isOpen,
  onClose,
  examBudget,
  defaultStream = 'experimental',
  onSelectTopicForBudget,
  onAddCustomTopicDetail,
}) => {
  const [selectedStream, setSelectedStream] = useState<StreamType>(() => normalizeStream(defaultStream));
  const [activeTab, setActiveTab] = useState<'topics_books' | 'books_bank' | 'ai_advisor'>('topics_books');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedSubject, setSelectedSubject] = useState<string>('all');
  const [selectedGrade, setSelectedGrade] = useState<string>('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('all');
  const [selectedPublisher, setSelectedPublisher] = useState<string>('all');
  const [selectedTier, setSelectedTier] = useState<string>('all');
  const [expandedTopicId, setExpandedTopicId] = useState<string | null>(null);
  const [copiedTipId, setCopiedTipId] = useState<string | null>(null);
  const [addedTopicToast, setAddedTopicToast] = useState<string | null>(null);

  // Sync defaultStream changes
  useEffect(() => {
    if (defaultStream) {
      setSelectedStream(normalizeStream(defaultStream));
    }
  }, [defaultStream]);

  // AI Advisor State
  const [aiQuery, setAiQuery] = useState<string>('');
  const [isAiSearching, setIsAiSearching] = useState<boolean>(false);
  const [aiResult, setAiResult] = useState<{
    answer: string;
    recommendedTopics?: string[];
    recommendedBooks: Array<{ title: string; publisher: string; tier: string; reason: string }>;
    studyPlanTip: string;
  } | null>(null);

  // Quick preset questions for AI Advisor based on stream
  const quickAiPrompts = useMemo(() => {
    if (selectedStream === 'experimental') {
      return [
        'برای درصد بالای ۸۰ زیست کنکور تجربی از چه کتاب‌هایی استفاده کنم؟',
        'تفاوت زیست پینوکیو خیلی سبز با IQ گاج و پنوکیو جامع در چیه؟',
        'برای مسائل استوکیومتری و اسید-باز شیمی تجربی چه کتابی تست بهتری داره؟',
        'شیمی مبتکران بهتره یا شیمی تک‌پایه و جامع خیلی سبز؟',
        'برای ریاضیات تجربی و مشتق و کاربرد مشتق چه منبعی پیشنهاد میشه؟',
        'بهترین کتاب تست فیزیک تجربی برای کسب تراز بالا چیه؟',
      ];
    }
    if (selectedStream === 'humanities') {
      return [
        'برای علوم و فنون ادبی و عروض و قافیه چه منبعی مناسبه؟',
        'بهترین کتاب تست عربی تخصصی انسانی چیه؟',
        'برای ریاضی و آمار انسانی چطور از صفر درصد به بالای ۵۰ برسیم؟',
        'تفاوت فلسفه و منطق خیلی سبز با مشاوران آموزش چیه؟',
        'بهترین منبع برای اقتصاد و روانشناسی کنکور انسانی چیه؟',
        'چگونه جامعه‌شناسی کنکور را به ۱۰۰ درصد برسانیم؟',
      ];
    }
    return [
      'برای درصد بالای ۷۰ حسابان از چه کتاب‌هایی استفاده کنم؟',
      'تفاوت حسابان نشر الگو با خیلی سبز و IQ گاج در چیه؟',
      'برای هندسه ۳ دوازدهم و مقاطع مخروطی چه منبعی مناسبه؟',
      'بهترین کتاب تست برای مسائل استوکیومتری و اسید-باز شیمی چیه؟',
      'ترمودینامیک فیزیک ۱ رشته ریاضی چه بودجه‌بندی‌ای داره و منبعش چیه؟',
      'بهترین منبع برای نظریه اعداد و گراف گسسته دوازدهم چیه؟',
    ];
  }, [selectedStream]);

  const currentCurriculum = useMemo(() => getCurriculumByField(selectedStream), [selectedStream]);
  const currentMasterBooksData = useMemo(() => getMasterBooksByField(selectedStream), [selectedStream]);

  // Distinct subjects for stream
  const distinctSubjects = useMemo(() => {
    const set = new Set<string>();
    currentCurriculum.forEach((t) => set.add(t.subject));
    return Array.from(set);
  }, [currentCurriculum]);

  // Flattened Books for Books Bank Tab
  const allMasterBooks = useMemo(() => {
    const list: Array<{
      subject: string;
      tier: string;
      tierName: string;
      title: string;
      authorOrPublisher: string;
      description: string;
      studyMethod: string;
    }> = [];

    (currentMasterBooksData || []).forEach((sub) => {
      (sub.bestBooks || []).forEach((book) => {
        list.push({
          subject: sub.subject || '',
          tier: book.tier || '',
          tierName: book.tierName || '',
          title: book.title || '',
          authorOrPublisher: book.authorOrPublisher || (book as any).publisher || (book as any).author || '',
          description: book.description || '',
          studyMethod: book.studyMethod || '',
        });
      });
    });

    return list;
  }, [currentMasterBooksData]);

  // Filtered Topics with multi-dimensional match
  const filteredTopics = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    return (currentCurriculum || []).filter((topic) => {
      // Subject Filter
      if (selectedSubject !== 'all' && topic.subject !== selectedSubject) {
        return false;
      }

      // Grade Filter
      if (selectedGrade !== 'all') {
        if (!topic.grade || !topic.grade.includes(selectedGrade)) return false;
      }

      // Difficulty Filter
      if (selectedDifficulty !== 'all') {
        if (topic.difficulty !== selectedDifficulty) return false;
      }

      // Publisher & Tier Filters inside books
      if (selectedPublisher !== 'all' || selectedTier !== 'all') {
        const hasMatchingBook = topic.recommendedBooks?.some((b) => {
          const pub = (b.publisher || '').toLowerCase();
          const tit = (b.title || '').toLowerCase();
          const matchPub = selectedPublisher === 'all' || pub.includes(selectedPublisher.toLowerCase()) || tit.includes(selectedPublisher.toLowerCase());
          const matchTier = selectedTier === 'all' || b.tier === selectedTier;
          return matchPub && matchTier;
        });
        if (!hasMatchingBook) return false;
      }

      // Text Query Match (Search across Chapter, Subtopics, Books, Challenges, Tips, Weight)
      if (q) {
        const matchChapter = (topic.chapter || '').toLowerCase().includes(q);
        const matchSubject = (topic.subject || '').toLowerCase().includes(q);
        const matchSubtopics = (topic.subtopics || []).some((s) => s.toLowerCase().includes(q));
        const matchChallenges = (topic.keyChallenges || []).some((c) => c.toLowerCase().includes(q));
        const matchTips = (topic.masteryTips || []).some((t) => t.toLowerCase().includes(q));
        const matchBooks = (topic.recommendedBooks || []).some((b) => 
          (b.title || '').toLowerCase().includes(q) || 
          (b.publisher || '').toLowerCase().includes(q) || 
          (b.description || '').toLowerCase().includes(q) ||
          (b.recommendedFor || '').toLowerCase().includes(q)
        );
        const matchWeight = (topic.conceptWeight || '').toLowerCase().includes(q);

        return matchChapter || matchSubject || matchSubtopics || matchChallenges || matchTips || matchBooks || matchWeight;
      }

      return true;
    });
  }, [currentCurriculum, searchQuery, selectedSubject, selectedGrade, selectedDifficulty, selectedPublisher, selectedTier]);

  // Filtered Master Books
  const filteredMasterBooks = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return allMasterBooks.filter((book) => {
      if (selectedSubject !== 'all' && !book.subject.includes(selectedSubject)) return false;
      if (selectedTier !== 'all' && book.tier !== selectedTier) return false;
      if (selectedPublisher !== 'all') {
        const authPub = (book.authorOrPublisher || '').toLowerCase();
        const tit = (book.title || '').toLowerCase();
        const pubFilter = selectedPublisher.toLowerCase();
        if (!authPub.includes(pubFilter) && !tit.includes(pubFilter)) {
          return false;
        }
      }
      if (q) {
        const matchTitle = (book.title || '').toLowerCase().includes(q);
        const matchAuthor = (book.authorOrPublisher || '').toLowerCase().includes(q);
        const matchDesc = (book.description || '').toLowerCase().includes(q);
        const matchMethod = (book.studyMethod || '').toLowerCase().includes(q);
        const matchSubject = (book.subject || '').toLowerCase().includes(q);
        return matchTitle || matchAuthor || matchDesc || matchMethod || matchSubject;
      }
      return true;
    });
  }, [allMasterBooks, searchQuery, selectedSubject, selectedTier, selectedPublisher]);

  // AI Advisor Search Handler
  const handleAiSearch = async (customPrompt?: string) => {
    const queryToSend = customPrompt || aiQuery;
    if (!queryToSend.trim() || isAiSearching) return;

    setIsAiSearching(true);
    try {
      const res = await fetch('/api/advisor/smart-resource-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: queryToSend,
          subjectFilter: selectedSubject !== 'all' ? selectedSubject : undefined,
          targetGrade: selectedGrade !== 'all' ? selectedGrade : undefined,
        }),
      });

      if (!res.ok) throw new Error('خطا در ارتباط با سرور');
      const data = await res.json();
      setAiResult(data);
    } catch (err) {
      console.warn("AI Resource search error:", err);
      setAiResult({
        answer: 'متأسفانه در پردازش هوش مصنوعی مشکلی رخ داد، اما می‌توانید از لیست منابع و سرفصل‌های زیر استفاده نمایید.',
        recommendedBooks: [
          {
            title: 'حسابان و فیزیک جامع خیلی سبز / نشر الگو',
            publisher: 'خیلی سبز / نشر الگو',
            tier: 'سطح ۱ و ۲',
            reason: 'پوشش کامل و تست‌های ترکیبی استاندارد برای داوطلبان ریاضی'
          }
        ],
        studyPlanTip: 'ابتدا درسنامه و تست‌های آموزشی حل شود، سپس تست‌های زمان‌دار و نشانه‌گذاری غلط‌ها.'
      });
    } finally {
      setIsAiSearching(false);
    }
  };

  const handleAddToBudget = (topicChapter: string) => {
    if (onSelectTopicForBudget) {
      onSelectTopicForBudget(topicChapter);
      setAddedTopicToast(`مبحث «${topicChapter}» به بودجه‌بندی آزمون شما افزوده شد!`);
      setTimeout(() => setAddedTopicToast(null), 3000);
    }
  };

  const handleCopyTip = (text: string, id: string) => {
    navigator.clipboard?.writeText(text);
    setCopiedTipId(id);
    setTimeout(() => setCopiedTipId(null), 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-stone-900/60 backdrop-blur-sm animate-fadeIn">
      <div 
        className="bg-white w-full max-w-5xl max-h-[92vh] rounded-2xl shadow-2xl border border-stone-200 flex flex-col overflow-hidden animate-scaleUp"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Top Header */}
        <div className="px-5 py-4 bg-stone-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0">
              <Search className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-bold">
                  جستجو و کاوشگر پیشرفته منابع و سرفصل‌های کنکور
                </h2>
                <span className="text-[10px] bg-emerald-500 text-stone-950 px-2 py-0.5 rounded-full font-black">
                  {STREAM_OPTIONS.find(s => s.id === selectedStream)?.name || 'کنکور'}
                </span>
              </div>
              <p className="text-[11px] text-stone-400">
                جستجوی جامع در تمام مباحث، کتاب‌های خیلی سبز، پینوکیو، نشر الگو، گاج IQ، مبتکران، موج آزمون، حجم تست و مشاوره با هوش مصنوعی
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Stream Switcher Buttons inside modal */}
            <div className="flex items-center bg-stone-800/80 p-0.5 rounded-xl border border-stone-700">
              {STREAM_OPTIONS.map((st) => (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => {
                    setSelectedStream(st.id);
                    setSelectedSubject('all');
                  }}
                  className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all cursor-pointer ${
                    selectedStream === st.id
                      ? 'bg-emerald-500 text-stone-950 shadow-xs'
                      : 'text-stone-300 hover:text-white'
                  }`}
                >
                  {st.badge}
                </button>
              ))}
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-stone-400 hover:text-white hover:bg-stone-800 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="px-5 pt-3 bg-stone-50 border-b border-stone-200 flex items-center justify-between gap-2 overflow-x-auto shrink-0">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('topics_books')}
              className={`flex items-center gap-2 px-3.5 py-2 text-xs sm:text-sm font-bold border-b-2 transition cursor-pointer ${
                activeTab === 'topics_books'
                  ? 'border-emerald-600 text-emerald-900 bg-white rounded-t-lg'
                  : 'border-transparent text-stone-600 hover:text-stone-900'
              }`}
            >
              <Layers className="w-4 h-4 text-emerald-600" />
              <span>کاوشگر سرفصل‌ها و تست‌های لازم ({filteredTopics.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('books_bank')}
              className={`flex items-center gap-2 px-3.5 py-2 text-xs sm:text-sm font-bold border-b-2 transition cursor-pointer ${
                activeTab === 'books_bank'
                  ? 'border-emerald-600 text-emerald-900 bg-white rounded-t-lg'
                  : 'border-transparent text-stone-600 hover:text-stone-900'
              }`}
            >
              <BookOpen className="w-4 h-4 text-blue-600" />
              <span>بانک تخصصی کتاب‌های کنکور ({filteredMasterBooks.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('ai_advisor')}
              className={`flex items-center gap-2 px-3.5 py-2 text-xs sm:text-sm font-bold border-b-2 transition cursor-pointer ${
                activeTab === 'ai_advisor'
                  ? 'border-violet-600 text-violet-900 bg-white rounded-t-lg'
                  : 'border-transparent text-stone-600 hover:text-stone-900'
              }`}
            >
              <Sparkles className="w-4 h-4 text-violet-600" />
              <span>مشاور هوشمند منابع با AI</span>
              <span className="text-[9px] bg-violet-100 text-violet-800 px-1.5 py-0.5 rounded-full font-bold">هوشمند</span>
            </button>
          </div>

          {addedTopicToast && (
            <div className="text-[11px] font-bold text-emerald-800 bg-emerald-100/90 border border-emerald-300 px-3 py-1 rounded-full animate-bounce flex items-center gap-1.5 shrink-0">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
              <span>{addedTopicToast}</span>
            </div>
          )}
        </div>

        {/* Global Search Bar & Filters Bar (for topics and books) */}
        {activeTab !== 'ai_advisor' && (
          <div className="p-4 bg-white border-b border-stone-200 space-y-3 shrink-0">
            {/* Main Search Input */}
            <div className="relative">
              <Search className="w-5 h-5 absolute right-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="جستجوی سریع هر مبحث، نویسنده، انتشارات، یا موضوع (مثلاً: مشتق، خیلی سبز، استوکیومتری، نشر الگو، موج آزمون، تالس، نظریه اعداد)..."
                className="w-full pr-11 pl-10 py-2.5 text-xs sm:text-sm rounded-xl border border-stone-200 bg-stone-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition shadow-2xs font-medium"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute left-3 top-1/2 -translate-y-1/2 p-1 text-stone-400 hover:text-stone-700"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Filter Pills / Selectors */}
            <div className="flex flex-wrap items-center gap-2 text-xs">
              {/* Subject Filter */}
              <div className="flex items-center gap-1 bg-stone-50 border border-stone-200 rounded-lg px-2 py-1">
                <span className="text-stone-400 text-[11px]">درس:</span>
                <select
                  value={selectedSubject}
                  onChange={(e) => setSelectedSubject(e.target.value)}
                  className="bg-transparent font-bold text-stone-800 focus:outline-none cursor-pointer"
                >
                  <option value="all">همه دروس</option>
                  {distinctSubjects.map((sub) => (
                    <option key={sub} value={sub}>{sub}</option>
                  ))}
                </select>
              </div>

              {/* Grade Filter */}
              <div className="flex items-center gap-1 bg-stone-50 border border-stone-200 rounded-lg px-2 py-1">
                <span className="text-stone-400 text-[11px]">پایه:</span>
                <select
                  value={selectedGrade}
                  onChange={(e) => setSelectedGrade(e.target.value)}
                  className="bg-transparent font-bold text-stone-800 focus:outline-none cursor-pointer"
                >
                  <option value="all">همه پایه‌ها</option>
                  <option value="دوازدهم">پایه دوازدهم</option>
                  <option value="یازدهم">پایه یازدهم</option>
                  <option value="دهم">پایه دهم</option>
                  <option value="پایه">پایه و جامع</option>
                </select>
              </div>

              {/* Difficulty Filter (only for topics) */}
              {activeTab === 'topics_books' && (
                <div className="flex items-center gap-1 bg-stone-50 border border-stone-200 rounded-lg px-2 py-1">
                  <span className="text-stone-400 text-[11px]">سختی:</span>
                  <select
                    value={selectedDifficulty}
                    onChange={(e) => setSelectedDifficulty(e.target.value)}
                    className="bg-transparent font-bold text-stone-800 focus:outline-none cursor-pointer"
                  >
                    <option value="all">همه سطوح</option>
                    <option value="متوسط">متوسط</option>
                    <option value="سخت">سخت</option>
                    <option value="بسیار چالش‌برانگیز">بسیار چالش‌برانگیز</option>
                  </select>
                </div>
              )}

              {/* Publisher Filter */}
              <div className="flex items-center gap-1 bg-stone-50 border border-stone-200 rounded-lg px-2 py-1">
                <span className="text-stone-400 text-[11px]">ناشر:</span>
                <select
                  value={selectedPublisher}
                  onChange={(e) => setSelectedPublisher(e.target.value)}
                  className="bg-transparent font-bold text-stone-800 focus:outline-none cursor-pointer"
                >
                  <option value="all">همه انتشارات</option>
                  <option value="خیلی سبز">خیلی سبز</option>
                  <option value="نشر الگو">نشر الگو</option>
                  <option value="گاج">گاج (IQ و میکرو)</option>
                  <option value="مبتکران">مبتکران</option>
                  <option value="قلم‌چی">کانون قلم‌چی (سه‌سطحی)</option>
                  <option value="مهروماه">مهروماه</option>
                  <option value="خوشخوان">خوشخوان</option>
                </select>
              </div>

              {/* Resource Tier Filter */}
              <div className="flex items-center gap-1 bg-stone-50 border border-stone-200 rounded-lg px-2 py-1">
                <span className="text-stone-400 text-[11px]">سطح منبع:</span>
                <select
                  value={selectedTier}
                  onChange={(e) => setSelectedTier(e.target.value)}
                  className="bg-transparent font-bold text-stone-800 focus:outline-none cursor-pointer"
                >
                  <option value="all">همه سطوح منابع</option>
                  <option value="tier1_learning">سطح ۱: آموزش و شروع</option>
                  <option value="tier2_mastery">سطح ۲: تسلط و تست ایده‌دار</option>
                  <option value="tier3_speed_exam">سطح ۳: آزمونی و سرعتی</option>
                </select>
              </div>

              {(selectedSubject !== 'all' || selectedGrade !== 'all' || selectedDifficulty !== 'all' || selectedPublisher !== 'all' || selectedTier !== 'all' || searchQuery) && (
                <button
                  onClick={() => {
                    setSelectedSubject('all');
                    setSelectedGrade('all');
                    setSelectedDifficulty('all');
                    setSelectedPublisher('all');
                    setSelectedTier('all');
                    setSearchQuery('');
                  }}
                  className="text-[11px] text-rose-600 hover:text-rose-800 font-semibold px-2 py-1 transition cursor-pointer"
                >
                  پاکسازی فیلترها
                </button>
              )}
            </div>
          </div>
        )}

        {/* Modal Body - Scrollable Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 bg-stone-100/50">
          {/* TAB 1: TOPICS & RECOMMENDED BOOKS */}
          {activeTab === 'topics_books' && (
            <div className="space-y-4">
              {filteredTopics.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-2xl border border-stone-200 p-6">
                  <div className="w-12 h-12 rounded-full bg-stone-100 text-stone-400 flex items-center justify-center mx-auto mb-3">
                    <Search className="w-6 h-6" />
                  </div>
                  <h3 className="font-bold text-stone-800 text-sm mb-1">مبحثی مطابق با این فیلترها پیدا نشد</h3>
                  <p className="text-xs text-stone-500 mb-3">
                    لطفاً عبارت جستجو را تغییر دهید یا فیلترها را ریست کنید.
                  </p>
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setSelectedSubject('all');
                      setSelectedGrade('all');
                      setSelectedDifficulty('all');
                    }}
                    className="px-4 py-2 bg-stone-900 text-white rounded-xl text-xs font-semibold hover:bg-stone-800 cursor-pointer"
                  >
                    نمایش تمام سرفصل‌های کنکور ریاضی
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredTopics.map((topic) => {
                    const isSelectedInBudget = examBudget?.selectedTopics.includes(topic.chapter);
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
                        className={`bg-white rounded-2xl p-4 sm:p-5 border transition-all shadow-xs flex flex-col justify-between ${
                          isSelectedInBudget
                            ? 'border-emerald-500 ring-2 ring-emerald-500/10'
                            : 'border-stone-200 hover:border-stone-300'
                        }`}
                      >
                        <div>
                          {/* Header */}
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div>
                              <div className="flex items-center gap-1.5 mb-1">
                                <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
                                  {topic.subject}
                                </span>
                                <span className="text-[10px] text-stone-500 bg-stone-100 px-1.5 py-0.5 rounded-md">
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
                          <div className="flex items-center gap-1.5 text-xs text-stone-600 mb-3 bg-stone-50 px-2.5 py-1 rounded-lg border border-stone-100">
                            <TrendingUp className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            <span>بودجه‌بندی کنکور: <strong className="text-stone-800 font-bold">{topic.conceptWeight}</strong></span>
                          </div>

                          {/* Test Volume Box */}
                          {topic.testVolume && (
                            <div className="mb-3 bg-emerald-50/60 border border-emerald-200/80 rounded-xl p-3">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-[11px] font-bold text-emerald-950 flex items-center gap-1">
                                  <Calculator className="w-3.5 h-3.5 text-emerald-700" />
                                  <span>تارگت تسلط کامل:</span>
                                </span>
                                <span className="text-xs font-black text-emerald-900 bg-white px-2 py-0.5 rounded-md border border-emerald-100 shadow-2xs">
                                  {topic.testVolume.totalRecommendedTests} تست ({topic.testVolume.estimatedStudyHours} ساعت)
                                </span>
                              </div>

                              <div className="grid grid-cols-3 gap-1.5 text-center text-[10px]">
                                <div className="bg-white p-1 rounded-md border border-emerald-100">
                                  <span className="text-stone-400 block text-[9px]">آموزشی</span>
                                  <strong className="text-stone-800 font-bold">{topic.testVolume.learningTests}</strong>
                                </div>
                                <div className="bg-white p-1 rounded-md border border-emerald-100">
                                  <span className="text-stone-400 block text-[9px]">زمان‌دار</span>
                                  <strong className="text-emerald-800 font-bold">{topic.testVolume.timedPracticeTests}</strong>
                                </div>
                                <div className="bg-white p-1 rounded-md border border-emerald-100">
                                  <span className="text-stone-400 block text-[9px]">مروری</span>
                                  <strong className="text-stone-800 font-bold">{topic.testVolume.reviewTests}</strong>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Subtopics */}
                          {topic.subtopics && topic.subtopics.length > 0 && (
                            <div className="mb-3">
                              <span className="text-[11px] font-bold text-stone-700 block mb-1">زیربخش‌های این فصل:</span>
                              <div className="flex flex-wrap gap-1">
                                {topic.subtopics.map((sub, sIdx) => (
                                  <span
                                    key={sIdx}
                                    className="text-[10px] bg-stone-100 hover:bg-stone-200 text-stone-700 px-2 py-0.5 rounded-md transition"
                                  >
                                    {sub}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Books Accordion */}
                          {topic.recommendedBooks && topic.recommendedBooks.length > 0 && (
                            <div className="mb-3">
                              <button
                                type="button"
                                onClick={() => setExpandedTopicId(isExpanded ? null : topic.id)}
                                className="w-full flex items-center justify-between p-2 rounded-xl bg-stone-50 hover:bg-stone-100 text-xs font-semibold text-stone-800 transition cursor-pointer border border-stone-200"
                              >
                                <span className="flex items-center gap-1.5">
                                  <BookOpen className="w-3.5 h-3.5 text-emerald-700" />
                                  <span>کتاب‌ها و منابع پیشنهادی ({topic.recommendedBooks.length} منبع)</span>
                                </span>
                                {isExpanded ? <ChevronUp className="w-4 h-4 text-stone-500" /> : <ChevronDown className="w-4 h-4 text-stone-500" />}
                              </button>

                              {isExpanded && (
                                <div className="mt-2 space-y-2">
                                  {topic.recommendedBooks.map((b, bIdx) => (
                                    <div key={bIdx} className="bg-stone-50/80 p-2.5 rounded-xl border border-stone-200 text-xs space-y-1">
                                      <div className="flex items-center justify-between gap-1">
                                        <strong className="text-stone-900 font-bold">{b.title}</strong>
                                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                                          b.tier === 'tier1_learning'
                                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                            : b.tier === 'tier2_mastery'
                                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                            : 'bg-purple-50 text-purple-700 border border-purple-200'
                                        }`}>
                                          {b.tierLabel}
                                        </span>
                                      </div>
                                      <p className="text-[11px] text-stone-600">{b.description}</p>
                                      <div className="text-[10px] text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded">
                                        مناسب برای: {b.recommendedFor}
                                      </div>
                                    </div>
                                  ))}

                                  {/* Mastery Tip */}
                                  {topic.masteryTips && topic.masteryTips.length > 0 && (
                                    <div className="p-2.5 bg-amber-50/70 border border-amber-200 rounded-xl text-xs mt-2">
                                      <div className="flex items-center justify-between mb-1">
                                        <span className="font-bold text-amber-950 text-[11px]">توصیه طلایی تسلط:</span>
                                        <button
                                          onClick={() => handleCopyTip(topic.masteryTips![0], topic.id)}
                                          className="text-[10px] text-amber-800 hover:text-amber-950 flex items-center gap-1 font-semibold"
                                        >
                                          <Copy className="w-3 h-3" />
                                          <span>{copiedTipId === topic.id ? 'کپی شد' : 'کپی نکته'}</span>
                                        </button>
                                      </div>
                                      <p className="text-[11px] text-amber-900 leading-relaxed">
                                        {topic.masteryTips[0]}
                                      </p>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Action Buttons */}
                        <div className="pt-3 border-t border-stone-100 flex items-center justify-between gap-2 mt-auto">
                          {isSelectedInBudget ? (
                            <span className="text-xs font-bold text-emerald-700 flex items-center gap-1 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                              <CheckCircle className="w-3.5 h-3.5" />
                              <span>در بودجه‌بندی آزمون انتخاب شده</span>
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleAddToBudget(topic.chapter)}
                              className="w-full py-2 px-3 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer shadow-xs"
                            >
                              <Plus className="w-4 h-4" />
                              <span>افزودن این سرفصل به برنامه بودجه‌بندی</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: BOOKS BANK (Master References) */}
          {activeTab === 'books_bank' && (
            <div className="space-y-4">
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Award className="w-4 h-4 text-blue-600 shrink-0" />
                  <span>
                    دسته‌بندی استاندارد ۳ سطحی منابع کنکور: <strong>سطح ۱ (آموزش)</strong> ← <strong>سطح ۲ (تسلط و تست ایده‌دار)</strong> ← <strong>سطح ۳ (آزمونی و سرعتی)</strong>
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredMasterBooks.map((book, idx) => {
                  const tierBadgeColor =
                    book.tier === 'tier1_learning'
                      ? 'bg-blue-50 text-blue-700 border-blue-200'
                      : book.tier === 'tier2_mastery'
                      ? 'bg-amber-50 text-amber-800 border-amber-200'
                      : 'bg-purple-50 text-purple-700 border-purple-200';

                  return (
                    <div
                      key={idx}
                      className="bg-white rounded-2xl p-4 sm:p-5 border border-stone-200 hover:border-stone-300 transition shadow-xs flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div>
                            <span className="text-[10px] font-bold text-stone-500 bg-stone-100 px-2 py-0.5 rounded-md mb-1 inline-block">
                              {book.subject}
                            </span>
                            <h3 className="font-bold text-stone-900 text-sm sm:text-base">
                              {book.title}
                            </h3>
                          </div>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border whitespace-nowrap ${tierBadgeColor}`}>
                            {book.tierName}
                          </span>
                        </div>

                        <div className="text-xs text-emerald-800 font-semibold mb-2.5">
                          ناشر و مولف: {book.authorOrPublisher}
                        </div>

                        <p className="text-xs text-stone-600 leading-relaxed mb-3">
                          {book.description}
                        </p>

                        <div className="p-3 bg-stone-50 rounded-xl border border-stone-100 text-xs mb-3">
                          <span className="font-bold text-stone-800 block mb-1">نحوه بهینه مطالعه و تست‌زنی:</span>
                          <p className="text-[11px] text-stone-600 leading-relaxed">
                            {book.studyMethod}
                          </p>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-stone-100 flex items-center justify-between text-[11px] text-stone-500">
                        <span>پوشش کنکور سراسری و نهایی</span>
                        <button
                          onClick={() => handleCopyTip(`${book.title} (${book.authorOrPublisher}) - روش مطالعه: ${book.studyMethod}`, `b-${idx}`)}
                          className="text-stone-700 hover:text-emerald-700 font-semibold flex items-center gap-1 cursor-pointer"
                        >
                          <Copy className="w-3 h-3" />
                          <span>{copiedTipId === `b-${idx}` ? 'کپی شد' : 'کپی مشخصات'}</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 3: AI SMART RESOURCE & TOPIC ADVISOR */}
          {activeTab === 'ai_advisor' && (
            <div className="space-y-4 max-w-3xl mx-auto">
              {/* Question Input Box */}
              <div className="bg-white rounded-2xl p-5 border border-violet-200 shadow-sm space-y-3">
                <div className="flex items-center gap-2 text-violet-900 font-bold text-sm">
                  <Sparkles className="w-4 h-4 text-violet-600" />
                  <span>پرسش و مشاوره منابع کنکور از هوش مصنوعی</span>
                </div>
                <p className="text-xs text-stone-500 leading-relaxed">
                  هر سوالی درباره انتخاب منبع مناسب، مقایسه کتاب‌ها، ترتیب مطالعه، پیش‌نیازها و بودجه‌بندی دارید بپرسید تا با هوش مصنوعی راهنمایی شوید.
                </p>

                {/* Input Area */}
                <div className="flex gap-2">
                  <textarea
                    rows={2}
                    value={aiQuery}
                    onChange={(e) => setAiQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleAiSearch();
                      }
                    }}
                    placeholder="مثال: برای داوطلبی که هندسه رو ۳۰ درصد می‌زنه چه کتابی اول و چه کتابی دوم پیشنهاد می‌کنی؟"
                    className="flex-1 text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-stone-200 bg-stone-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                  />
                  <button
                    type="button"
                    onClick={() => handleAiSearch()}
                    disabled={!aiQuery.trim() || isAiSearching}
                    className="px-5 py-2.5 rounded-xl bg-violet-700 hover:bg-violet-800 text-white text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition disabled:opacity-50 cursor-pointer shadow-xs self-end"
                  >
                    {isAiSearching ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>در حال تحلیل...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        <span>جستجوی هوشمند</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Quick Prompts */}
                <div className="space-y-1.5 pt-2 border-t border-stone-100">
                  <span className="text-[11px] font-bold text-stone-600 block">سوالات پرتکرار و پیشنهادی:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {quickAiPrompts.map((q, qIdx) => (
                      <button
                        key={qIdx}
                        onClick={() => {
                          setAiQuery(q);
                          handleAiSearch(q);
                        }}
                        className="text-[11px] px-2.5 py-1 rounded-lg bg-violet-50 hover:bg-violet-100 text-violet-800 border border-violet-200 transition cursor-pointer text-right"
                      >
                        💡 {q}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* AI Result Card */}
              {aiResult && (
                <div className="bg-white rounded-2xl p-5 border border-emerald-200 shadow-sm space-y-4 animate-fadeIn">
                  <div className="flex items-center justify-between pb-2 border-b border-stone-100">
                    <div className="flex items-center gap-2 text-xs font-bold text-emerald-900">
                      <GraduationCap className="w-4 h-4 text-emerald-700" />
                      <span>تحلیل تخصصی مشاور هوشمند کنکور</span>
                    </div>
                    <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold">
                      تحلیل متناسب با کنکور ریاضی
                    </span>
                  </div>

                  {/* Main Answer */}
                  <div className="text-xs sm:text-sm text-stone-800 leading-relaxed bg-stone-50 p-3.5 rounded-xl border border-stone-200/80">
                    {aiResult.answer}
                  </div>

                  {/* Recommended Books Box */}
                  {aiResult.recommendedBooks && aiResult.recommendedBooks.length > 0 && (
                    <div className="space-y-2">
                      <span className="text-xs font-bold text-stone-900 block">کتاب‌های پیشنهادی برای این هدف:</span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {aiResult.recommendedBooks.map((b, bIdx) => (
                          <div key={bIdx} className="bg-emerald-50/50 p-3 rounded-xl border border-emerald-200 text-xs">
                            <div className="flex items-center justify-between gap-1 mb-1">
                              <strong className="text-emerald-950 font-bold">{b.title}</strong>
                              <span className="text-[9px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.5 rounded">
                                {b.tier}
                              </span>
                            </div>
                            <span className="text-[10px] text-stone-500 block mb-1">ناشر: {b.publisher}</span>
                            <p className="text-[11px] text-stone-700 leading-relaxed">{b.reason}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Golden Study Tip */}
                  {aiResult.studyPlanTip && (
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900">
                      <strong className="block mb-1 font-bold text-amber-950">توصیه طلایی روش تست‌زنی:</strong>
                      <p className="text-[11px] leading-relaxed">{aiResult.studyPlanTip}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 bg-stone-50 border-t border-stone-200 flex items-center justify-between text-xs text-stone-500 shrink-0">
          <span>
            بانک جامع سرفصل‌ها و منابع کنکور ریاضی و فیزیک
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-semibold cursor-pointer transition"
          >
            بستن پنجره
          </button>
        </div>
      </div>
    </div>
  );
};
