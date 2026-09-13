import React, { useState, useEffect, useRef } from 'react';
import { 
  Brain, 
  Repeat, 
  Sparkles, 
  Timer, 
  HeartHandshake, 
  Database, 
  Plus, 
  Check, 
  RotateCcw, 
  Play, 
  Pause, 
  Download, 
  Upload, 
  AlertCircle, 
  ShieldCheck, 
  BookOpen, 
  Zap, 
  Clock, 
  CheckCircle2, 
  HelpCircle,
  Wind,
  Volume2,
  VolumeX,
  Flame,
  Activity,
  MessageSquare,
  Send,
  Lightbulb,
  Sliders,
  Smile,
  Frown,
  Meh
} from 'lucide-react';
import { 
  StudentProfile, 
  WeeklySchedule, 
  NightlyReport, 
  SpacedRepetitionCard, 
  FeynmanSession, 
  AppBackupData 
} from '../types';

interface CognitivePsychologyViewProps {
  profile: StudentProfile;
  schedule: WeeklySchedule;
  reports: NightlyReport[];
  spacedCards: SpacedRepetitionCard[];
  feynmanSessions: FeynmanSession[];
  onUpdateSpacedCards: (cards: SpacedRepetitionCard[]) => void;
  onAddFeynmanSession: (session: FeynmanSession) => void;
  onRestoreBackup: (backup: AppBackupData) => void;
}

export const CognitivePsychologyView: React.FC<CognitivePsychologyViewProps> = ({
  profile,
  schedule,
  reports,
  spacedCards,
  feynmanSessions,
  onUpdateSpacedCards,
  onAddFeynmanSession,
  onRestoreBackup,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'spaced' | 'feynman' | 'flow' | 'cbt' | 'backup'>('spaced');

  // Spaced Repetition New Card State
  const [newSubject, setNewSubject] = useState(profile.weakSubjects?.[0] || 'زیست‌شناسی');
  const [newTopic, setNewTopic] = useState('');
  const [newQuestion, setNewQuestion] = useState('');
  const [newCorrect, setNewCorrect] = useState('');
  const [isAddingCard, setIsAddingCard] = useState(false);

  // Feynman State
  const [feynmanSubject, setFeynmanSubject] = useState(profile.weakSubjects?.[0] || 'فیزیک');
  const [feynmanTopic, setFeynmanTopic] = useState('');
  const [feynmanExplanation, setFeynmanExplanation] = useState('');
  const [isEvaluatingFeynman, setIsEvaluatingFeynman] = useState(false);
  const [currentFeynmanResult, setCurrentFeynmanResult] = useState<FeynmanSession['evaluation'] | null>(null);

  // Flow State / Ultradian Timer
  const [timerMode, setTimerMode] = useState<'pomodoro' | 'ultradian' | 'break'>('pomodoro');
  const [timerSeconds, setTimerSeconds] = useState(50 * 60);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [breathPhase, setBreathPhase] = useState<'inhale' | 'hold' | 'exhale'>('inhale');
  const [breathTimer, setBreathTimer] = useState(4);

  // Backup & Storage
  const [backupSuccessMsg, setBackupSuccessMsg] = useState('');
  const [restoreErrorMsg, setRestoreErrorMsg] = useState('');

  // CBT Reframer State
  const [toxicThought, setToxicThought] = useState('');
  const [cbtContext, setCbtContext] = useState('');
  const [isReframing, setIsReframing] = useState(false);
  const [cbtResult, setCbtResult] = useState<{
    distortionType: string;
    distortionExplanation: string;
    realityCheck: string;
    reframedThought: string;
    microAction: string;
    calmGuidance: string;
  } | null>(null);

  // Konkur Burnout Diagnostic State
  const [burnoutScores, setBurnoutScores] = useState({
    energy: 3,
    resistance: 3,
    sleepDebt: 3,
    screenDistraction: 3,
    pessimism: 3,
  });
  const [isEvaluatingBurnout, setIsEvaluatingBurnout] = useState(false);
  const [burnoutResult, setBurnoutResult] = useState<{
    burnoutPercentage: number;
    severity: string;
    diagnosis: string;
    biochemicalTips: string[];
    actionProtocol: string[];
  } | null>(null);

  // Ambient Sound Generator (Web Audio API)
  const [ambientType, setAmbientType] = useState<'off' | 'brown' | 'white' | 'rain' | 'alpha'>('off');
  const [ambientVolume, setAmbientVolume] = useState<number>(0.3);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const soundNodesRef = useRef<{ source?: any; gain?: GainNode; filter?: BiquadFilterNode; timerId?: any }>({});

  const stopAmbientSound = () => {
    try {
      if (soundNodesRef.current.source) {
        soundNodesRef.current.source.stop?.();
        soundNodesRef.current.source.disconnect?.();
      }
      if (soundNodesRef.current.timerId) {
        clearInterval(soundNodesRef.current.timerId);
      }
      soundNodesRef.current = {};
    } catch (e) {
      console.warn('Error stopping audio:', e);
    }
  };

  const playAmbientSound = (type: 'brown' | 'white' | 'rain' | 'alpha' | 'off') => {
    stopAmbientSound();
    if (type === 'off') return;

    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!audioCtxRef.current) {
        audioCtxRef.current = new AudioCtx();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      const gainNode = ctx.createGain();
      gainNode.gain.setValueAtTime(ambientVolume, ctx.currentTime);
      gainNode.connect(ctx.destination);

      if (type === 'alpha') {
        // 10Hz Binaural / Isochronic beat simulation (Alpha waves for flow state)
        const osc = ctx.createOscillator();
        const lfo = ctx.createOscillator();
        const lfoGain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(210, ctx.currentTime); // Carrier 210Hz

        lfo.type = 'sine';
        lfo.frequency.setValueAtTime(10, ctx.currentTime); // Alpha 10Hz
        lfoGain.gain.setValueAtTime(0.5, ctx.currentTime);

        lfo.connect(osc.frequency);
        osc.connect(gainNode);

        lfo.start();
        osc.start();
        soundNodesRef.current = { source: osc, gain: gainNode };
      } else {
        // Noise buffer generation
        const bufferSize = ctx.sampleRate * 2;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);

        let lastOut = 0.0;
        for (let i = 0; i < bufferSize; i++) {
          const white = Math.random() * 2 - 1;
          if (type === 'brown' || type === 'rain') {
            // Brown noise (integrated white noise)
            lastOut = (lastOut + 0.02 * white) / 1.02;
            data[i] = lastOut * 3.5;
          } else {
            // White noise
            data[i] = white * 0.3;
          }
        }

        const noiseSource = ctx.createBufferSource();
        noiseSource.buffer = buffer;
        noiseSource.loop = true;

        if (type === 'rain') {
          // Rain filter (lowpass + slight resonant band)
          const filter = ctx.createBiquadFilter();
          filter.type = 'lowpass';
          filter.frequency.setValueAtTime(900, ctx.currentTime);
          noiseSource.connect(filter);
          filter.connect(gainNode);
          soundNodesRef.current = { source: noiseSource, gain: gainNode, filter };
        } else if (type === 'brown') {
          const filter = ctx.createBiquadFilter();
          filter.type = 'lowpass';
          filter.frequency.setValueAtTime(450, ctx.currentTime);
          noiseSource.connect(filter);
          filter.connect(gainNode);
          soundNodesRef.current = { source: noiseSource, gain: gainNode, filter };
        } else {
          noiseSource.connect(gainNode);
          soundNodesRef.current = { source: noiseSource, gain: gainNode };
        }

        noiseSource.start();
      }
    } catch (err) {
      console.warn('Ambient sound play error:', err);
    }
  };

  const handleToggleAmbient = (type: 'off' | 'brown' | 'white' | 'rain' | 'alpha') => {
    if (ambientType === type || type === 'off') {
      setAmbientType('off');
      stopAmbientSound();
    } else {
      setAmbientType(type);
      playAmbientSound(type);
    }
  };

  useEffect(() => {
    if (soundNodesRef.current.gain && audioCtxRef.current) {
      soundNodesRef.current.gain.gain.setValueAtTime(ambientVolume, audioCtxRef.current.currentTime);
    }
  }, [ambientVolume]);

  useEffect(() => {
    return () => {
      stopAmbientSound();
    };
  }, []);

  // CBT Reframer Request
  const handleCbtReframe = async () => {
    if (!toxicThought.trim()) return;
    setIsReframing(true);
    try {
      const res = await fetch('/api/advisor/cbt-reframe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ toxicThought, context: cbtContext, profile }),
      });
      const data = await res.json();
      if (data.result) {
        setCbtResult(data.result);
      }
    } catch (e) {
      console.error('CBT error:', e);
    } finally {
      setIsReframing(false);
    }
  };

  // Konkur Burnout Diagnostic Request
  const handleEvaluateBurnout = async () => {
    setIsEvaluatingBurnout(true);
    try {
      const res = await fetch('/api/advisor/burnout-diagnostic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scores: burnoutScores, profile }),
      });
      const data = await res.json();
      if (data.diagnostic) {
        setBurnoutResult(data.diagnostic);
      }
    } catch (e) {
      console.error('Burnout diagnostic error:', e);
    } finally {
      setIsEvaluatingBurnout(false);
    }
  };

  // Timer Tick
  useEffect(() => {
    let interval: any = null;
    if (isTimerRunning && timerSeconds > 0) {
      interval = setInterval(() => {
        setTimerSeconds((prev) => prev - 1);
      }, 1000);
    } else if (timerSeconds === 0 && isTimerRunning) {
      setIsTimerRunning(false);
      // Auto switch to break if study finished
      if (timerMode !== 'break') {
        setTimerMode('break');
        setTimerSeconds(10 * 60);
      }
    }
    return () => clearInterval(interval);
  }, [isTimerRunning, timerSeconds, timerMode]);

  // Breathing Box Tick (4-7-8 method)
  useEffect(() => {
    let bInterval: any = null;
    if (timerMode === 'break' && isTimerRunning) {
      bInterval = setInterval(() => {
        setBreathTimer((prev) => {
          if (prev <= 1) {
            setBreathPhase((curr) => {
              if (curr === 'inhale') return 'hold';
              if (curr === 'hold') return 'exhale';
              return 'inhale';
            });
            return breathPhase === 'inhale' ? 7 : breathPhase === 'hold' ? 8 : 4;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(bInterval);
  }, [timerMode, isTimerRunning, breathPhase]);

  const handleSelectTimerMode = (mode: 'pomodoro' | 'ultradian' | 'break') => {
    setIsTimerRunning(false);
    setTimerMode(mode);
    if (mode === 'pomodoro') setTimerSeconds(50 * 60);
    else if (mode === 'ultradian') setTimerSeconds(90 * 60);
    else setTimerSeconds(10 * 60);
  };

  const formatTimer = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  // Add Spaced Repetition Card
  const handleAddCard = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTopic.trim() || !newQuestion.trim() || !newCorrect.trim()) return;

    const todayStr = new Date().toISOString().split('T')[0];
    const newCard: SpacedRepetitionCard = {
      id: `card-${Date.now()}`,
      subject: newSubject,
      topic: newTopic,
      questionOrMistake: newQuestion,
      correctConcept: newCorrect,
      createdAt: new Date().toISOString(),
      nextReviewDate: todayStr,
      stage: 1,
      history: [],
      isMastered: false,
    };

    onUpdateSpacedCards([newCard, ...spacedCards]);
    setNewTopic('');
    setNewQuestion('');
    setNewCorrect('');
    setIsAddingCard(false);
  };

  // Process Card Review
  const handleCardReview = (cardId: string, remembered: boolean) => {
    const intervalsByStage = [1, 3, 7, 16, 30]; // Days for stages 1 to 5
    const updated = spacedCards.map((card) => {
      if (card.id !== cardId) return card;

      let nextStage = remembered ? card.stage + 1 : 1;
      let isMastered = nextStage > 5;
      if (isMastered) nextStage = 5;

      const daysToAdd = remembered ? intervalsByStage[nextStage - 1] || 1 : 1;
      const nextDate = new Date();
      nextDate.setDate(nextDate.getDate() + daysToAdd);

      return {
        ...card,
        stage: nextStage,
        isMastered,
        nextReviewDate: nextDate.toISOString().split('T')[0],
        history: [
          ...card.history,
          { reviewedAt: new Date().toISOString(), passed: remembered },
        ],
      };
    });

    onUpdateSpacedCards(updated);
  };

  // Submit Feynman
  const handleEvaluateFeynman = async () => {
    if (!feynmanTopic.trim() || !feynmanExplanation.trim()) return;
    setIsEvaluatingFeynman(true);
    setCurrentFeynmanResult(null);

    try {
      const res = await fetch('/api/advisor/evaluate-feynman', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: feynmanSubject,
          topic: feynmanTopic,
          explanation: feynmanExplanation,
        }),
      });

      const data = await res.json();
      if (data.evaluation) {
        setCurrentFeynmanResult(data.evaluation);
        const newSession: FeynmanSession = {
          id: `feynman-${Date.now()}`,
          subject: feynmanSubject,
          topic: feynmanTopic,
          studentExplanation: feynmanExplanation,
          createdAt: new Date().toISOString(),
          evaluation: data.evaluation,
        };
        onAddFeynmanSession(newSession);
      }
    } catch (err) {
      console.error('Feynman eval error:', err);
    } finally {
      setIsEvaluatingFeynman(false);
    }
  };

  // Export JSON Backup
  const handleExportBackup = () => {
    const backup: AppBackupData = {
      version: '2.0.0',
      exportedAt: new Date().toISOString(),
      profile,
      schedule,
      reports,
      spacedCards,
      feynmanSessions,
    };

    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `study_advisor_backup_${profile.name || 'student'}_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setBackupSuccessMsg('فایل پشتیبان با موفقیت دانلود شد.');
    setTimeout(() => setBackupSuccessMsg(''), 4000);
  };

  // Import JSON Backup
  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const parsed = JSON.parse(evt.target?.result as string) as AppBackupData;
        if (!parsed.profile || !parsed.schedule) {
          throw new Error('فرمت فایل نامعتبر است.');
        }
        onRestoreBackup(parsed);
        setBackupSuccessMsg('اطلاعات با موفقیت بازیابی شد!');
        setTimeout(() => setBackupSuccessMsg(''), 4000);
      } catch (err) {
        setRestoreErrorMsg('خطا در خواندن فایل پشتیبان. لطفاً مطمئن شوید فایل خروجی همین سامانه است.');
        setTimeout(() => setRestoreErrorMsg(''), 4000);
      }
    };
    reader.readAsText(file);
  };

  const todayStr = new Date().toISOString().split('T')[0];
  const cardsDueToday = spacedCards.filter((c) => !c.isMastered && c.nextReviewDate <= todayStr);
  const masteredCards = spacedCards.filter((c) => c.isMastered);

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header & Science Philosophy */}
      <div className="bg-gradient-to-r from-stone-900 via-stone-800 to-violet-950 text-white p-6 sm:p-7 rounded-3xl shadow-md border border-violet-900/40 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-violet-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-500/20 text-violet-300 text-xs font-bold border border-violet-500/30">
              <Brain className="w-3.5 h-3.5 text-violet-400" />
              <span>جعبه ابزار علوم شناختی و روانشناسی یادگیری</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              متدهای علمی یادگیری عمیق، فاز آلفا و تمرکز حداکثری 🧠
            </h2>
            <p className="text-stone-300 text-xs sm:text-sm max-w-2xl leading-relaxed">
              بر اساس پژوهش‌های نوروساینس: غلبه بر منحنی فراموشی ابینگهاوس، تکنیک فاینمن، ریتم‌های ۹۰ دقیقه‌ای مغز (Ultradian) و بازسازی شناختی اضطراب آزمون (CBT).
            </p>
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto bg-white/10 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-white/10 text-xs font-semibold shrink-0">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="text-stone-200">
              داده‌ها: <strong className="text-white">ذخیره‌سازی ایمن و آفلاین</strong>
            </span>
          </div>
        </div>

        {/* Sub-Navigation Tabs */}
        <div className="flex flex-wrap gap-2 mt-6 pt-4 border-t border-stone-800">
          <button
            onClick={() => setActiveSubTab('spaced')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
              activeSubTab === 'spaced'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-stone-800/70 text-stone-300 hover:bg-stone-800 hover:text-white'
            }`}
          >
            <Repeat className="w-3.5 h-3.5" />
            <span>منحنی فراموشی و لایتنر ({cardsDueToday.length} کارت امروز)</span>
          </button>

          <button
            onClick={() => setActiveSubTab('feynman')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
              activeSubTab === 'feynman'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-stone-800/70 text-stone-300 hover:bg-stone-800 hover:text-white'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>تکنیک فاینمن (Active Recall)</span>
          </button>

          <button
            onClick={() => setActiveSubTab('flow')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
              activeSubTab === 'flow'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-stone-800/70 text-stone-300 hover:bg-stone-800 hover:text-white'
            }`}
          >
            <Timer className="w-3.5 h-3.5" />
            <span>تایمر غرقگی اولترادین و تنفس ۴-۷-۸</span>
          </button>

          <button
            onClick={() => setActiveSubTab('cbt')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
              activeSubTab === 'cbt'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-stone-800/70 text-stone-300 hover:bg-stone-800 hover:text-white'
            }`}
          >
            <HeartHandshake className="w-3.5 h-3.5" />
            <span>مدیریت اضطراب و اهمال‌کاری (CBT)</span>
          </button>

          <button
            onClick={() => setActiveSubTab('backup')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
              activeSubTab === 'backup'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-stone-800/70 text-stone-300 hover:bg-stone-800 hover:text-white'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            <span>ایمنی و پشتیبان‌گیری داده‌ها</span>
          </button>
        </div>
      </div>

      {/* 1. Spaced Repetition (Ebbinghaus & Leitner) */}
      {activeSubTab === 'spaced' && (
        <div className="space-y-6 animate-fade-in">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left: Summary & Add Card */}
            <div className="lg:col-span-1 space-y-4">
              <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs">
                <h3 className="font-bold text-stone-900 text-sm flex items-center gap-2 mb-2">
                  <Repeat className="w-4 h-4 text-emerald-600" />
                  <span>منحنی فراموشی ابینگهاوس چیست؟</span>
                </h3>
                <p className="text-xs text-stone-600 leading-relaxed mb-4">
                  مغز انسان بیش از ۷۰٪ اطلاعات جدید را در ۲۴ ساعت اول فراموش می‌کند. تنها راه تثبیت دائم، مرور در فواصل زمانی تصاعدی است: <strong>روز ۱، ۳، ۷، ۱۶ و ۳۰</strong>.
                </p>

                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between p-2 rounded-lg bg-emerald-50 text-emerald-900 font-medium">
                    <span>کارت‌های نیازمند مرور امروز:</span>
                    <span className="bg-emerald-600 text-white px-2 py-0.5 rounded-full font-bold">
                      {cardsDueToday.length}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-lg bg-stone-50 text-stone-700">
                    <span>تثبیت‌شده در حافظه بلندمدت:</span>
                    <span className="font-bold text-stone-900">{masteredCards.length}</span>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-lg bg-stone-50 text-stone-700">
                    <span>کل کارت‌ها و تست‌های نشانه‌دار:</span>
                    <span className="font-bold text-stone-900">{spacedCards.length}</span>
                  </div>
                </div>

                <button
                  onClick={() => setIsAddingCard(!isAddingCard)}
                  className="w-full mt-4 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  <span>افزودن تست غلط / نکته فرار جدید</span>
                </button>
              </div>

              {/* Add Card Form */}
              {isAddingCard && (
                <form onSubmit={handleAddCard} className="bg-white p-5 rounded-2xl border border-emerald-300 shadow-sm space-y-3">
                  <h4 className="font-bold text-stone-900 text-xs">ثبت تست غلط یا نکته فرار</h4>

                  <div>
                    <label className="block text-[11px] font-semibold text-stone-700 mb-1">درس:</label>
                    <input
                      type="text"
                      value={newSubject}
                      onChange={(e) => setNewSubject(e.target.value)}
                      placeholder="مثلاً: زیست‌شناسی، ریاضی، فیزیک..."
                      className="w-full px-3 py-1.5 text-xs rounded-lg border border-stone-300 focus:outline-none focus:border-emerald-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-stone-700 mb-1">مبحث:</label>
                    <input
                      type="text"
                      value={newTopic}
                      onChange={(e) => setNewTopic(e.target.value)}
                      placeholder="مثلاً: فصل ۲ - چرخه سلولی یا مثلثات"
                      className="w-full px-3 py-1.5 text-xs rounded-lg border border-stone-300 focus:outline-none focus:border-emerald-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-stone-700 mb-1">صورت سوال / تله‌ای که افتادی:</label>
                    <textarea
                      rows={2}
                      value={newQuestion}
                      onChange={(e) => setNewQuestion(e.target.value)}
                      placeholder="چه تله‌ای در این تست بود که باعث اشتباه شد؟"
                      className="w-full px-3 py-1.5 text-xs rounded-lg border border-stone-300 focus:outline-none focus:border-emerald-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-stone-700 mb-1">نکته کلیدی / فرمول صحیح:</label>
                    <textarea
                      rows={2}
                      value={newCorrect}
                      onChange={(e) => setNewCorrect(e.target.value)}
                      placeholder="راهکار درست و نکته طلایی برای تکرار نشدن اشتباه"
                      className="w-full px-3 py-1.5 text-xs rounded-lg border border-stone-300 focus:outline-none focus:border-emerald-500"
                      required
                    />
                  </div>

                  <div className="flex gap-2 pt-1">
                    <button
                      type="submit"
                      className="flex-1 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-colors"
                    >
                      ذخیره در جعبه لایتنر
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsAddingCard(false)}
                      className="px-3 py-2 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-medium"
                    >
                      انصراف
                    </button>
                  </div>
                </form>
              )}
            </div>

            {/* Right: Cards List */}
            <div className="lg:col-span-2 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-stone-900 text-sm flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-stone-700" />
                  <span>کارت‌های نیازمند مرور امروز ({cardsDueToday.length})</span>
                </h3>
                <span className="text-xs text-stone-500">هر تست غلط، گنجینه‌ای برای جلوگیری از تکرار اشتباه در کنکور است.</span>
              </div>

              {cardsDueToday.length === 0 ? (
                <div className="bg-white p-8 rounded-2xl border border-stone-200 text-center space-y-2">
                  <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
                  <p className="font-bold text-stone-800 text-sm">تمام مرورهای امروزت را با موفقیت انجام دادی!</p>
                  <p className="text-xs text-stone-500">
                    می‌توانی تست‌های غلط امروزت را به جعبه لایتنر اضافه کنی تا بر اساس منحنی ابینگهاوس در فواصل علمی برایت برنامه‌ریزی شوند.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {cardsDueToday.map((card) => (
                    <div
                      key={card.id}
                      className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs hover:border-emerald-300 transition-colors"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            {card.subject}
                          </span>
                          <span className="text-xs font-semibold text-stone-800">{card.topic}</span>
                        </div>
                        <span className="text-[11px] px-2 py-0.5 rounded bg-stone-100 text-stone-600">
                          مرحله {card.stage} از ۵
                        </span>
                      </div>

                      <div className="bg-stone-50 p-3 rounded-xl border border-stone-200 mb-2">
                        <p className="text-xs text-stone-500 font-semibold mb-1">صورت تله یا سوال:</p>
                        <p className="text-xs text-stone-800 font-medium leading-relaxed">{card.questionOrMistake}</p>
                      </div>

                      <div className="bg-emerald-50/70 p-3 rounded-xl border border-emerald-100 mb-4">
                        <p className="text-xs text-emerald-800 font-semibold mb-1">مفهوم و پاسخ کلیدی:</p>
                        <p className="text-xs text-emerald-950 font-medium leading-relaxed">{card.correctConcept}</p>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-stone-100">
                        <span className="text-[11px] text-stone-400">
                          افزوده شده: {new Date(card.createdAt).toLocaleDateString('fa-IR')}
                        </span>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleCardReview(card.id, false)}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-rose-200 bg-rose-50 text-rose-700 text-xs font-semibold hover:bg-rose-100 transition-colors"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>فراموش کرده بودم (شروع مجدد)</span>
                          </button>
                          <button
                            onClick={() => handleCardReview(card.id, true)}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 transition-colors shadow-xs"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>تسلط داشتم (انتقال به مرحله بعد)</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Other Active Cards */}
              {spacedCards.filter((c) => !c.isMastered && c.nextReviewDate > todayStr).length > 0 && (
                <div className="pt-4">
                  <h4 className="font-semibold text-xs text-stone-600 mb-2">کارت‌های برنامه‌ریزی شده برای روزهای آینده:</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {spacedCards
                      .filter((c) => !c.isMastered && c.nextReviewDate > todayStr)
                      .map((c) => (
                        <div key={c.id} className="p-3 bg-stone-50 rounded-xl border border-stone-200 text-xs flex justify-between items-center">
                          <div>
                            <span className="font-semibold text-stone-800">{c.subject}</span>: {c.topic}
                          </div>
                          <span className="text-[11px] text-stone-500 bg-white px-2 py-0.5 rounded border border-stone-200">
                            موعد: {c.nextReviewDate}
                          </span>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 2. Feynman Technique (Active Recall) */}
      {activeSubTab === 'feynman' && (
        <div className="space-y-6 animate-fade-in">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Guide & Rules */}
            <div className="lg:col-span-1 space-y-4">
              <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs space-y-3">
                <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold text-sm">
                  RF
                </div>
                <h3 className="font-bold text-stone-900 text-sm">تکنیک ریچارد فاینمن چیست؟</h3>
                <p className="text-xs text-stone-600 leading-relaxed">
                  برنده نوبل فیزیک، ریچارد فاینمن، معتقد بود: <em>«اگر نمی‌توانی موضوعی را به زبان ساده برای یک کودک ۱۰ ساله توضیح دهی، خودت هم آن را عمیقاً نفهمیده‌ای!»</em>
                </p>
                <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900 space-y-1.5">
                  <p className="font-bold">۴ گام طلایی تکنیک فاینمن:</p>
                  <p>۱. انتخاب یک مبحث سخت یا مبهم</p>
                  <p>۲. بازگویی آن بدون نگاه کردن به جزوه</p>
                  <p>۳. شناسایی گپ‌ها، اصطلاحات قلمبه‌سلمبه و ناتوانی در تشریح علت</p>
                  <p>۴. ساده‌سازی با مثال و تمثیل روزمره</p>
                </div>
              </div>

              {/* Past Feynman History */}
              {feynmanSessions.length > 0 && (
                <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs">
                  <h4 className="font-bold text-stone-800 text-xs mb-3">تمرین‌های قبلی فاینمن</h4>
                  <div className="space-y-2 max-h-56 overflow-y-auto">
                    {feynmanSessions.map((s) => (
                      <div key={s.id} className="p-2.5 rounded-lg bg-stone-50 border border-stone-200 text-xs">
                        <div className="flex items-center justify-between font-semibold text-stone-800">
                          <span>{s.topic}</span>
                          <span className="text-emerald-700 font-bold">{s.evaluation?.score || 8}/۱۰</span>
                        </div>
                        <div className="text-[11px] text-stone-500 mt-1 truncate">{s.studentExplanation}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Feynman Test Workbench */}
            <div className="lg:col-span-2 space-y-4">
              <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-stone-900 text-base">کارگاه بازگویی و سنجش عمق فهم</h3>
                  <span className="text-xs bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full font-medium border border-emerald-200">
                    آنالیز هوشمند با هوش مصنوعی
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">درس:</label>
                    <input
                      type="text"
                      value={feynmanSubject}
                      onChange={(e) => setFeynmanSubject(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300 focus:outline-none focus:border-emerald-500"
                      placeholder="مثلاً زیست، فیزیک، شیمی..."
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">موضوع یا قضیه دقیق:</label>
                    <input
                      type="text"
                      value={feynmanTopic}
                      onChange={(e) => setFeynmanTopic(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300 focus:outline-none focus:border-emerald-500"
                      placeholder="مثلاً: پمپ سدیم پتاسیم، مشتق تابع، اصل لوشاتلیه..."
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    توضیحات تو (طوری بنویس که یک کودک ۱۰ ساله یا کسی که تا حالا این درس را ندیده بفهمد):
                  </label>
                  <textarea
                    rows={4}
                    value={feynmanExplanation}
                    onChange={(e) => setFeynmanExplanation(e.target.value)}
                    className="w-full p-3 text-xs rounded-xl border border-stone-300 focus:outline-none focus:border-emerald-500 leading-relaxed"
                    placeholder="بدون نگاه کردن به جزوه، این موضوع چطور کار می‌کند؟ چرا این فرمول یا اتفاق می‌افتد؟..."
                  />
                </div>

                <div className="flex justify-end">
                  <button
                    onClick={handleEvaluateFeynman}
                    disabled={isEvaluatingFeynman || !feynmanTopic.trim() || !feynmanExplanation.trim()}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold transition-colors shadow-sm"
                  >
                    {isEvaluatingFeynman ? (
                      <>
                        <RotateCcw className="w-4 h-4 animate-spin" />
                        <span>در حال تحلیل عمق یادگیری...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        <span>ارزیابی فهم مفهومی با فاینمن</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Live Result */}
                {currentFeynmanResult && (
                  <div className="p-5 rounded-2xl bg-stone-50 border border-emerald-200 mt-4 space-y-3 animate-fade-in">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-stone-800">امتیاز سادگی و عمق فهم:</span>
                        <span className="px-2.5 py-0.5 rounded-full bg-emerald-600 text-white text-xs font-bold">
                          {currentFeynmanResult.score} از ۱۰
                        </span>
                      </div>
                      <span className="text-xs text-stone-500">تحلیل شناختی اختصاصی</span>
                    </div>

                    <div className="space-y-2 text-xs">
                      <div className="p-3 bg-white rounded-xl border border-stone-200">
                        <p className="font-bold text-emerald-800 mb-1">نقاط قوتی که خوب فهمیده‌ای:</p>
                        <ul className="list-disc list-inside space-y-1 text-stone-700">
                          {currentFeynmanResult.strengths.map((str, i) => (
                            <li key={i}>{str}</li>
                          ))}
                        </ul>
                      </div>

                      <div className="p-3 bg-white rounded-xl border border-stone-200">
                        <p className="font-bold text-rose-700 mb-1">حفره‌های شناختی یا اصطلاحات مبهم (Blind Spots):</p>
                        <ul className="list-disc list-inside space-y-1 text-stone-700">
                          {currentFeynmanResult.gapsOrJargon.map((gap, i) => (
                            <li key={i}>{gap}</li>
                          ))}
                        </ul>
                      </div>

                      <div className="p-3 bg-amber-50/70 rounded-xl border border-amber-200">
                        <p className="font-bold text-amber-900 mb-1">تمثیل پیشنهادی برای ثبت در حافظه بلندمدت:</p>
                        <p className="text-amber-950 leading-relaxed">{currentFeynmanResult.recommendedMetaphor}</p>
                      </div>

                      <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-200">
                        <p className="font-bold text-emerald-900 mb-1">توصیه پایانی مشاور:</p>
                        <p className="text-emerald-950 leading-relaxed">{currentFeynmanResult.actionableFeedback}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. Flow State & Ultradian Timer */}
      {activeSubTab === 'flow' && (
        <div className="space-y-6 animate-fade-in">
          <div className="max-w-3xl mx-auto bg-white p-6 sm:p-8 rounded-2xl border border-stone-200 shadow-sm text-center space-y-6">
            <div>
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 inline-block mb-2">
                ریتم اولترادین (Ultradian Rhythm) و پومودورو
              </span>
              <h3 className="text-xl font-bold text-stone-900">حالت غرقگی کامل (Flow State)</h3>
              <p className="text-xs text-stone-500 max-w-lg mx-auto mt-1 leading-relaxed">
                مغز انسان بر اساس امواج اولترادین، حداکثر می‌تواند ۹۰ دقیقه تمرکز لیزری داشته باشد. بعد از ۹۰ دقیقه، سطح دوپامین و استیل‌کولین افت می‌کند و نیاز به ۲۰ دقیقه استراحت دارد.
              </p>
            </div>

            {/* Mode Switcher */}
            <div className="flex justify-center gap-2 flex-wrap">
              <button
                onClick={() => handleSelectTimerMode('pomodoro')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  timerMode === 'pomodoro'
                    ? 'bg-stone-900 text-white shadow-sm'
                    : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                }`}
              >
                پومودوروی استاندارد (۵۰ دقیقه)
              </button>

              <button
                onClick={() => handleSelectTimerMode('ultradian')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  timerMode === 'ultradian'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                }`}
              >
                ریتم عمیق اولترادین (۹۰ دقیقه)
              </button>

              <button
                onClick={() => handleSelectTimerMode('break')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  timerMode === 'break'
                    ? 'bg-sky-600 text-white shadow-sm'
                    : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                }`}
              >
                استراحت و تنفس آرامش (۱۰ دقیقه)
              </button>
            </div>

            {/* Ambient Sound Focus Generator */}
            <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 text-right space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-stone-800">
                  <Volume2 className="w-4 h-4 text-emerald-600" />
                  <span>مولد صوت تمرکز و امواج مغزی ضدحواس‌پرتی (Web Audio):</span>
                </div>
                {ambientType !== 'off' && (
                  <span className="text-[11px] text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md font-bold animate-pulse">
                    در حال پخش
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => handleToggleAmbient('brown')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                    ambientType === 'brown'
                      ? 'bg-amber-700 text-white shadow-xs'
                      : 'bg-white border border-stone-200 text-stone-700 hover:bg-stone-100'
                  }`}
                >
                  🎧 نویز قهوه‌ای (عمیق - مهار ADHD)
                </button>

                <button
                  onClick={() => handleToggleAmbient('rain')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                    ambientType === 'rain'
                      ? 'bg-sky-600 text-white shadow-xs'
                      : 'bg-white border border-stone-200 text-stone-700 hover:bg-stone-100'
                  }`}
                >
                  🌧️ باران آرامش‌بخش
                </button>

                <button
                  onClick={() => handleToggleAmbient('alpha')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                    ambientType === 'alpha'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-white border border-stone-200 text-stone-700 hover:bg-stone-100'
                  }`}
                >
                  🧠 امواج آلفا (۱۰Hz برای غرقگی)
                </button>

                <button
                  onClick={() => handleToggleAmbient('white')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                    ambientType === 'white'
                      ? 'bg-stone-800 text-white shadow-xs'
                      : 'bg-white border border-stone-200 text-stone-700 hover:bg-stone-100'
                  }`}
                >
                  ⚪ نویز سفید (حذف صدای محیط)
                </button>

                {ambientType !== 'off' && (
                  <button
                    onClick={() => handleToggleAmbient('off')}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold text-rose-600 bg-rose-50 border border-rose-200 hover:bg-rose-100"
                  >
                    قطع صدا
                  </button>
                )}
              </div>

              {ambientType !== 'off' && (
                <div className="flex items-center gap-3 pt-1">
                  <span className="text-[11px] text-stone-500 font-medium">بلندی صدا:</span>
                  <input
                    type="range"
                    min="0.05"
                    max="0.9"
                    step="0.05"
                    value={ambientVolume}
                    onChange={(e) => setAmbientVolume(parseFloat(e.target.value))}
                    className="w-36 accent-emerald-600 cursor-pointer"
                  />
                  <span className="text-[11px] text-stone-600 font-mono">{Math.round(ambientVolume * 100)}٪</span>
                </div>
              )}
            </div>

            {/* Digital Clock Display */}
            <div className="py-6">
              <div className="inline-block p-8 rounded-3xl bg-stone-950 text-white shadow-inner font-mono text-5xl sm:text-7xl font-extrabold tracking-wider dir-ltr">
                {formatTimer(timerSeconds)}
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={() => setIsTimerRunning(!isTimerRunning)}
                className={`flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold text-white shadow-sm transition-transform active:scale-95 ${
                  isTimerRunning ? 'bg-amber-600 hover:bg-amber-700' : 'bg-emerald-600 hover:bg-emerald-700'
                }`}
              >
                {isTimerRunning ? (
                  <>
                    <Pause className="w-5 h-5" />
                    <span>توقف موقت</span>
                  </>
                ) : (
                  <>
                    <Play className="w-5 h-5" />
                    <span>شروع تمرکز عمیق</span>
                  </>
                )}
              </button>

              <button
                onClick={() => handleSelectTimerMode(timerMode)}
                className="p-3 rounded-xl border border-stone-200 hover:bg-stone-100 text-stone-600 transition-colors"
                title="ریست تایمر"
              >
                <RotateCcw className="w-5 h-5" />
              </button>
            </div>

            {/* 4-7-8 Breathing Guide during break */}
            {timerMode === 'break' && (
              <div className="p-5 rounded-2xl bg-sky-50 border border-sky-200 text-right space-y-2 mt-4 animate-fade-in">
                <div className="flex items-center gap-2 text-sky-900 font-bold text-xs">
                  <Wind className="w-4 h-4 text-sky-600" />
                  <span>تکنیک تنفس ۴-۷-۸ برای کاهش فوری هورمون کورتیزول و رفع خستگی چشم:</span>
                </div>
                <div className="flex items-center justify-center py-4">
                  <div className={`w-28 h-28 rounded-full flex flex-col items-center justify-center text-white font-bold transition-all duration-1000 ${
                    breathPhase === 'inhale' ? 'bg-emerald-500 scale-110' : breathPhase === 'hold' ? 'bg-amber-500 scale-100' : 'bg-sky-500 scale-90'
                  }`}>
                    <span className="text-xs">
                      {breathPhase === 'inhale' ? 'دَم عمیق (از بینی)' : breathPhase === 'hold' ? 'حبس نفس' : 'بازدم آرام (از دهان)'}
                    </span>
                    <span className="text-2xl font-mono mt-1">{breathTimer} ثانیه</span>
                  </div>
                </div>
                <p className="text-center text-xs text-sky-800">
                  این چرخه باعث اکسیژن‌رسانی به قشر پیش‌پیشانی مغز و آماده‌سازی برای پارت بعدی می‌شود.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 4. CBT Mental Resilience & Anti-Procrastination */}
      {activeSubTab === 'cbt' && (
        <div className="space-y-6 animate-fade-in">
          {/* Section 1: AI CBT Reframing Clinic */}
          <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <div className="flex items-center gap-2 text-indigo-700 text-xs font-bold mb-1">
                  <HeartHandshake className="w-4 h-4" />
                  <span>کلینیک مهار افکار مسموم و فاجعه‌ساز کنکور (CBT Reframing Clinic)</span>
                </div>
                <h3 className="font-bold text-stone-950 text-base">کالبدشکافی و بازسازی خطاهای شناختی با هوش مصنوعی</h3>
              </div>
              <span className="text-[11px] bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full font-bold border border-indigo-200 self-start">
                روانشناسی شناختی-رفتاری
              </span>
            </div>

            <p className="text-xs text-stone-600 leading-relaxed">
              هر زمان که افکاری مثل «اگه فلان مبحث رو نزنم همه چی تمومه»، «ترازم افت کرد بدبخت شدم»، یا «همه رقبام از من جلوترن» ذهنت را فلج کرد، آن را اینجا بنویس تا هوش مصنوعی خطای شناختی را کالبدشکافی و با شواهد علمی خنثی کند:
            </p>

            {/* Presets */}
            <div className="space-y-1.5">
              <span className="text-[11px] text-stone-500 font-medium">نمونه افکار متداول کنکوری‌ها:</span>
              <div className="flex flex-wrap gap-1.5">
                {[
                  'اگر درصدهای ریاضی و فیزیکم بالا نره تمام زحماتم باد هوا میشه.',
                  'ترازم توی آزمون این هفته ۵۰۰ تا افت کرد، من هیچی نمیشم.',
                  'امروز به جای ۶ صبح ساعت ۹ بیدار شدم، کل امروزم سوخت و نخوندم.',
                  'همه دارن روزی ۱۲ ساعت می‌خونن و من خیلی از بقیه عقب‌ترم.',
                ].map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setToxicThought(preset)}
                    className="text-[11px] bg-stone-100 hover:bg-indigo-50 hover:text-indigo-800 text-stone-700 px-2.5 py-1 rounded-lg border border-stone-200 transition-colors text-right"
                  >
                    «{preset}»
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-stone-800 mb-1">
                  فکر منفی، ترس یا نشخوار ذهنی فعلی‌ات را بنویس:
                </label>
                <textarea
                  rows={3}
                  value={toxicThought}
                  onChange={(e) => setToxicThought(e.target.value)}
                  placeholder="مثال: حس می‌کنم وقت برای جمع‌بندی مباحث پایه ندارم و کنکور رو خراب می‌کنم..."
                  className="w-full p-3 text-xs rounded-xl border border-stone-300 focus:outline-none focus:border-indigo-600 leading-relaxed text-stone-800"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-600 mb-1">
                  زمینه بروز فکر (اختیاری):
                </label>
                <input
                  type="text"
                  value={cbtContext}
                  onChange={(e) => setCbtContext(e.target.value)}
                  placeholder="مثلاً: بعد از آزمون قلمچی / بعد از دیدن کارنامه دوستم / ساعت ۱۲ شب..."
                  className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200 focus:outline-none focus:border-indigo-600"
                />
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleCbtReframe}
                  disabled={isReframing || !toxicThought.trim()}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold transition-colors shadow-xs"
                >
                  {isReframing ? (
                    <>
                      <RotateCcw className="w-4 h-4 animate-spin" />
                      <span>در حال کالبدشکافی شناختی و خنثی‌سازی...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>بازسازی شناختی فکر مسموم (AI CBT Reframe)</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* CBT Live Result */}
            {cbtResult && (
              <div className="p-5 rounded-2xl bg-indigo-50/60 border border-indigo-200 space-y-3 animate-fade-in mt-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-indigo-950 font-bold text-xs">
                    <Brain className="w-4 h-4 text-indigo-700" />
                    <span>تشخیص خطای شناختی: <span className="text-rose-700">{cbtResult.distortionType}</span></span>
                  </div>
                  <span className="text-[10px] bg-white px-2 py-0.5 rounded-md border border-indigo-200 text-indigo-800 font-bold">
                    پادزهر شناختی
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  <div className="p-3 bg-white rounded-xl border border-stone-200 space-y-1">
                    <p className="font-bold text-stone-800 text-[11px]">🧠 چرا ذهن این حقه را می‌زند؟</p>
                    <p className="text-stone-600 leading-relaxed">{cbtResult.distortionExplanation}</p>
                  </div>

                  <div className="p-3 bg-white rounded-xl border border-stone-200 space-y-1">
                    <p className="font-bold text-emerald-800 text-[11px]">📊 حقیقت‌سنجی آماری کنکور (Reality Check):</p>
                    <p className="text-stone-700 leading-relaxed">{cbtResult.realityCheck}</p>
                  </div>
                </div>

                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-300 space-y-1">
                  <p className="font-bold text-emerald-950 text-xs">✨ باور جایگزین و آرامش‌بخش جدید:</p>
                  <p className="text-emerald-900 font-bold text-xs leading-relaxed">{cbtResult.reframedThought}</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  <div className="p-3 bg-amber-50 rounded-xl border border-amber-200">
                    <p className="font-bold text-amber-900 text-[11px] mb-1">⚡ میکرو-اکشن ۳ دقیقه‌ای برای خروج از قفل عصبی:</p>
                    <p className="text-amber-950 leading-relaxed">{cbtResult.microAction}</p>
                  </div>

                  <div className="p-3 bg-indigo-50 rounded-xl border border-indigo-200">
                    <p className="font-bold text-indigo-900 text-[11px] mb-1">🌿 پیام مربی‌گری و ثبات قدم:</p>
                    <p className="text-indigo-950 leading-relaxed">{cbtResult.calmGuidance}</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Section 2: Konkur Burnout Diagnostic & Reset */}
          <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <div className="flex items-center gap-2 text-rose-700 text-xs font-bold mb-1">
                  <Flame className="w-4 h-4" />
                  <span>چکاپ و نسخه درمان فرسودگی تحصیلی (Konkur Burnout Diagnostic)</span>
                </div>
                <h3 className="font-bold text-stone-950 text-base">سنجش اورلود عصبی و پروتکل ریکاوری دوپامین</h3>
              </div>
              <span className="text-[11px] bg-rose-50 text-rose-700 px-3 py-1 rounded-full font-bold border border-rose-200 self-start">
                نوروساینس استرس کنکور
              </span>
            </div>

            <p className="text-xs text-stone-600 leading-relaxed">
              اگر احساس می‌کنی هرچقدر پشت میز می‌نشینی بازدهی نداری و مغزت قفل شده، نمرات ۵ سنجه زیر را از ۱ (خیلی خوب) تا ۵ (خیلی شدید) مشخص کن:
            </p>

            {/* Sliders */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
              <div className="p-3.5 bg-stone-50 rounded-xl border border-stone-200 space-y-2">
                <div className="flex justify-between font-bold text-stone-800">
                  <span>خستگی هنگام بیدار شدن:</span>
                  <span className="text-indigo-700 font-mono">{burnoutScores.energy} از ۵</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="5"
                  value={burnoutScores.energy}
                  onChange={(e) => setBurnoutScores({ ...burnoutScores, energy: parseInt(e.target.value) })}
                  className="w-full accent-rose-600"
                />
                <div className="flex justify-between text-[10px] text-stone-400">
                  <span>باانرژی</span>
                  <span>کاملاً کوفته</span>
                </div>
              </div>

              <div className="p-3.5 bg-stone-50 rounded-xl border border-stone-200 space-y-2">
                <div className="flex justify-between font-bold text-stone-800">
                  <span>مقاومت در شروع پارت ۱:</span>
                  <span className="text-indigo-700 font-mono">{burnoutScores.resistance} از ۵</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="5"
                  value={burnoutScores.resistance}
                  onChange={(e) => setBurnoutScores({ ...burnoutScores, resistance: parseInt(e.target.value) })}
                  className="w-full accent-rose-600"
                />
                <div className="flex justify-between text-[10px] text-stone-400">
                  <span>سریع شروع می‌کنم</span>
                  <span>ساعت‌ها به تعویق می‌افتد</span>
                </div>
              </div>

              <div className="p-3.5 bg-stone-50 rounded-xl border border-stone-200 space-y-2">
                <div className="flex justify-between font-bold text-stone-800">
                  <span>بدهی خواب و سردرد:</span>
                  <span className="text-indigo-700 font-mono">{burnoutScores.sleepDebt} از ۵</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="5"
                  value={burnoutScores.sleepDebt}
                  onChange={(e) => setBurnoutScores({ ...burnoutScores, sleepDebt: parseInt(e.target.value) })}
                  className="w-full accent-rose-600"
                />
                <div className="flex justify-between text-[10px] text-stone-400">
                  <span>خواب منظم</span>
                  <span>کمبود خواب شدید</span>
                </div>
              </div>

              <div className="p-3.5 bg-stone-50 rounded-xl border border-stone-200 space-y-2">
                <div className="flex justify-between font-bold text-stone-800">
                  <span>وسوسه اسکرول گوشی حین درس:</span>
                  <span className="text-indigo-700 font-mono">{burnoutScores.screenDistraction} از ۵</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="5"
                  value={burnoutScores.screenDistraction}
                  onChange={(e) => setBurnoutScores({ ...burnoutScores, screenDistraction: parseInt(e.target.value) })}
                  className="w-full accent-rose-600"
                />
                <div className="flex justify-between text-[10px] text-stone-400">
                  <span>گوشی دور است</span>
                  <span>دائم دستم می‌رود</span>
                </div>
              </div>

              <div className="p-3.5 bg-stone-50 rounded-xl border border-stone-200 space-y-2 sm:col-span-2 lg:col-span-2">
                <div className="flex justify-between font-bold text-stone-800">
                  <span>حس بیهودگی و ناامیدی به نتیجه:</span>
                  <span className="text-indigo-700 font-mono">{burnoutScores.pessimism} از ۵</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="5"
                  value={burnoutScores.pessimism}
                  onChange={(e) => setBurnoutScores({ ...burnoutScores, pessimism: parseInt(e.target.value) })}
                  className="w-full accent-rose-600"
                />
                <div className="flex justify-between text-[10px] text-stone-400">
                  <span>امیدوار و پرانگیزه</span>
                  <span>حس بیهودگی تمام زحمات</span>
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleEvaluateBurnout}
                disabled={isEvaluatingBurnout}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-xs font-bold transition-colors shadow-xs"
              >
                {isEvaluatingBurnout ? (
                  <>
                    <RotateCcw className="w-4 h-4 animate-spin" />
                    <span>در حال تحلیل سیستم عصبی و تجویز نسخه ریکاوری...</span>
                  </>
                ) : (
                  <>
                    <Activity className="w-4 h-4" />
                    <span>تحلیل سطح فرسودگی و دریافت پروتکل ریکاوری</span>
                  </>
                )}
              </button>
            </div>

            {/* Burnout Diagnostic Live Result */}
            {burnoutResult && (
              <div className="p-5 rounded-2xl bg-rose-50/60 border border-rose-200 space-y-4 animate-fade-in mt-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl font-black text-rose-700 font-mono">
                      {burnoutResult.burnoutPercentage}٪
                    </span>
                    <div>
                      <span className="text-xs font-bold text-stone-800 block">شاخص خستگی و فرسودگی مغز</span>
                      <span className="text-[11px] text-rose-800 font-semibold">وضعیت: {burnoutResult.severity}</span>
                    </div>
                  </div>
                  <span className="text-[10px] bg-white px-2.5 py-1 rounded-md border border-rose-200 font-bold text-rose-900">
                    نسخه بازسازی دوپامین
                  </span>
                </div>

                <div className="p-3.5 bg-white rounded-xl border border-stone-200 text-xs leading-relaxed text-stone-700">
                  <strong className="text-stone-900 block mb-1">کالبدشکافی وضعیت بیولوژیک:</strong>
                  {burnoutResult.diagnosis}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  <div className="p-3.5 bg-white rounded-xl border border-stone-200 space-y-2">
                    <span className="font-bold text-amber-800 text-[11px] block">
                      🔬 نکات بیوشیمیایی و فیزیولوژی (خواب و هورمون‌ها):
                    </span>
                    <ul className="list-disc list-inside space-y-1.5 text-stone-700">
                      {burnoutResult.biochemicalTips?.map((tip, i) => (
                        <li key={i}>{tip}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="p-3.5 bg-white rounded-xl border border-stone-200 space-y-2">
                    <span className="font-bold text-emerald-800 text-[11px] block">
                      📋 پروتکل اقدام ۲۴ ساعته برای بازگشت شاداب به درس:
                    </span>
                    <ul className="list-disc list-inside space-y-1.5 text-stone-700">
                      {burnoutResult.actionProtocol?.map((act, i) => (
                        <li key={i}>{act}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Section 3: Static Clinical CBT Protocols */}
          <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-xs">
            <h3 className="font-bold text-stone-900 text-base mb-1">پروتکل‌های دائمی روانشناسی بالینی کنکور</h3>
            <p className="text-xs text-stone-500 mb-4">
              اصول طلایی تثبیت شده توسط مشاوران ارشد رتبه‌های تک‌رقمی:
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Card 1 */}
              <div className="p-4 rounded-xl border border-stone-200 bg-stone-50 space-y-1.5">
                <div className="flex items-center gap-2 text-amber-700 font-bold text-xs">
                  <Zap className="w-4 h-4" />
                  <span>۱. غلبه بر اهمال‌کاری با «قانون ۲ دقیقه»</span>
                </div>
                <p className="text-xs text-stone-700 leading-relaxed">
                  مغز هنگام مواجهه با یک مبحث سنگین احساس تهدید کرده و به سمت گوشی سوق می‌دهد. با خودت قرار بگذار فقط ۲ دقیقه پشت میز بنشینی و فقط ۱ تست بزنی تا مقاومت اولیه شکسته شود.
                </p>
              </div>

              {/* Card 2 */}
              <div className="p-4 rounded-xl border border-stone-200 bg-stone-50 space-y-1.5">
                <div className="flex items-center gap-2 text-emerald-700 font-bold text-xs">
                  <ShieldCheck className="w-4 h-4" />
                  <span>۲. مهار کمال‌گرایی سمی (قانون تفکر طیفی)</span>
                </div>
                <p className="text-xs text-stone-700 leading-relaxed">
                  یک روز ۶۰ درصدی بسیار بهتر از روز صفر درصدی است. ثبات و پیوستگی روزهای معمولی عامل رتبه زیر ۱۰۰ است، نه دو روز انفجاری و چهار روز تعطیلی کامل.
                </p>
              </div>

              {/* Card 3 */}
              <div className="p-4 rounded-xl border border-stone-200 bg-stone-50 space-y-1.5">
                <div className="flex items-center gap-2 text-sky-700 font-bold text-xs">
                  <HeartHandshake className="w-4 h-4" />
                  <span>۳. مهار تپش قلب و اضطراب آزمون (تکنیک ۵-۴-۳-۲-۱)</span>
                </div>
                <p className="text-xs text-stone-700 leading-relaxed">
                  هنگام شروع استرس، برای قطع حلقه اضطراب در آمیگدال: ۵ شیء اطراف را نام ببر، ۴ چیز را لمس کن، به ۳ صدا گوش کن، ۲ بو را حس کن، و ۱ نفس عمیق بکش.
                </p>
              </div>

              {/* Card 4 */}
              <div className="p-4 rounded-xl border border-stone-200 bg-stone-50 space-y-1.5">
                <div className="flex items-center gap-2 text-indigo-700 font-bold text-xs">
                  <Clock className="w-4 h-4" />
                  <span>۴. مدیریت افت انرژی ساعت ۱۵ تا ۱۷</span>
                </div>
                <p className="text-xs text-stone-700 leading-relaxed">
                  افت بعدازظهر یک پدیده بیولوژیک طبیعی است. ناهار کم‌کربوهیدرات، چرت ۲۰ دقیقه‌ای، و شروع با تست‌های زمان‌دار به جای متون طولانی خسته‌کننده.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 5. Data Storage & Safety */}
      {activeSubTab === 'backup' && (
        <div className="space-y-6 animate-fade-in">
          <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-xs space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                <Database className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-stone-900 text-base">امنیت و ذخیره‌سازی داده‌های تحصیلی</h3>
                <p className="text-xs text-stone-500">پاسخ به این سوال که آیا اطلاعات من ذخیره می‌شود و چطور محافظت کنم؟</p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-950 leading-relaxed space-y-2">
              <div className="flex items-center gap-2 font-bold text-emerald-900">
                <ShieldCheck className="w-4 h-4 text-emerald-700" />
                <span>پاسخ صریح: بله! تمام اطلاعات به طور خودکار در مرورگر ذخیره می‌شود.</span>
              </div>
              <p>
                تمام مشخصات پروفایل، جدول برنامه هفتگی، تیک‌های پارت‌ها، گزارش‌های شبانه، کارت‌های لایتنر و جلسات فاینمن بلافاصله در حافظه محلی مرورگر شما (Local Storage) ذخیره می‌شوند. حتی اگر مرورگر یا لپ‌تاپ را ببندید، دفعه بعد که برگردید تمام اطلاعاتتان سر جای خود هستند.
              </p>
            </div>

            {/* Backup Action Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div className="p-4 rounded-xl border border-stone-200 bg-stone-50 space-y-3">
                <div className="flex items-center gap-2 text-stone-800 font-bold text-xs">
                  <Download className="w-4 h-4 text-emerald-600" />
                  <span>دانلود فایل پشتیبان کامل (JSON)</span>
                </div>
                <p className="text-xs text-stone-500 leading-relaxed">
                  توصیه می‌شود هر هفته یک نسخه پشتیبان دانلود کنی تا اگر ویندوزت را عوض کردی یا خواستی روی گوشی ادامه دهی، هیچ داده‌ای را از دست ندهی.
                </p>
                <button
                  onClick={handleExportBackup}
                  className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>دانلود بکاپ (.json)</span>
                </button>
              </div>

              <div className="p-4 rounded-xl border border-stone-200 bg-stone-50 space-y-3">
                <div className="flex items-center gap-2 text-stone-800 font-bold text-xs">
                  <Upload className="w-4 h-4 text-sky-600" />
                  <span>بازیابی اطلاعات از فایل پشتیبان</span>
                </div>
                <p className="text-xs text-stone-500 leading-relaxed">
                  اگر قبلاً فایل پشتیبان دانلود کرده‌ای یا می‌خواهی اطلاعات را به کامپیوتر یا مرورگر جدید منتقل کنی، فایل را انتخاب کن:
                </p>
                <label className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-xl border border-stone-300 hover:bg-stone-100 text-stone-800 text-xs font-semibold cursor-pointer transition-colors">
                  <Upload className="w-3.5 h-3.5" />
                  <span>انتخاب فایل بکاپ</span>
                  <input type="file" accept=".json" onChange={handleImportBackup} className="hidden" />
                </label>
              </div>
            </div>

            {backupSuccessMsg && (
              <div className="p-3 rounded-xl bg-emerald-100 border border-emerald-300 text-emerald-900 text-xs font-semibold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                <span>{backupSuccessMsg}</span>
              </div>
            )}

            {restoreErrorMsg && (
              <div className="p-3 rounded-xl bg-rose-100 border border-rose-300 text-rose-900 text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-700" />
                <span>{restoreErrorMsg}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
