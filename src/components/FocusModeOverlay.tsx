import React, { useState, useEffect } from 'react';
import { 
  Maximize2, 
  Minimize2, 
  Play, 
  Pause, 
  RotateCcw, 
  CheckCircle2, 
  Volume2, 
  VolumeX, 
  Sparkles, 
  Clock, 
  X, 
  Flame, 
  Coffee,
  Brain
} from 'lucide-react';
import { StudyBlock } from '../types';

interface FocusModeOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  currentBlock?: StudyBlock | null;
  onBlockComplete?: (blockId: string) => void;
}

export const FocusModeOverlay: React.FC<FocusModeOverlayProps> = ({
  isOpen,
  onClose,
  currentBlock,
  onBlockComplete
}) => {
  const initialSeconds = currentBlock ? (currentBlock.durationMinutes || 45) * 60 : 25 * 60;
  const [timeLeft, setTimeLeft] = useState<number>(initialSeconds);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [mode, setMode] = useState<'study' | 'short_break'>('study');
  const [ambientSound, setAmbientSound] = useState<boolean>(false);
  const [testsDone, setTestsDone] = useState<number>(0);

  useEffect(() => {
    if (currentBlock) {
      setTimeLeft((currentBlock.durationMinutes || 45) * 60);
    }
  }, [currentBlock]);

  useEffect(() => {
    let timer: any = null;
    if (isRunning && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0 && isRunning) {
      setIsRunning(false);
      // Play ding sound
      try {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
        osc.frequency.setValueAtTime(880, audioCtx.currentTime + 0.15); // A5
        gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.8);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.8);
      } catch (e) {
        // ignore
      }
    }
    return () => clearInterval(timer);
  }, [isRunning, timeLeft]);

  if (!isOpen) return null;

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const totalSecs = mode === 'study' 
    ? ((currentBlock?.durationMinutes || 45) * 60) 
    : 5 * 60;
  const progressPercent = Math.min(100, Math.max(0, ((totalSecs - timeLeft) / totalSecs) * 100));

  const handleFinish = () => {
    if (currentBlock && onBlockComplete) {
      onBlockComplete(currentBlock.id);
    }
    setIsRunning(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-stone-950/95 backdrop-blur-xl flex flex-col justify-between text-white p-6 sm:p-12 animate-fadeIn font-sans selection:bg-emerald-500 selection:text-black">
      {/* Top Bar */}
      <div className="flex items-center justify-between max-w-4xl w-full mx-auto">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
            <Flame className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h2 className="text-sm sm:text-base font-black tracking-tight text-stone-100 flex items-center gap-2">
              <span>حالت فوکوس عمیق کنکور</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Zen Mode
              </span>
            </h2>
            <p className="text-xs text-stone-400">تمام حواشی و صفحات فرعی موقتاً پنهان شدند</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Ambient Noise / Zen */}
          <button
            onClick={() => setAmbientSound(!ambientSound)}
            className={`p-2.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              ambientSound
                ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                : 'bg-stone-900 border-stone-800 text-stone-400 hover:text-white'
            }`}
            title="صدای امواج آلفا / وایت نویز"
          >
            {ambientSound ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            <span className="hidden sm:inline">{ambientSound ? 'نویز فعال' : 'نویز تمرکز'}</span>
          </button>

          {/* Close button */}
          <button
            onClick={onClose}
            className="p-2.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-stone-400 hover:text-white border border-stone-800 transition-all cursor-pointer"
            title="خروج از حالت فوکوس"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Focus Center */}
      <div className="max-w-xl w-full mx-auto text-center my-auto space-y-8">
        {/* Active Block Info */}
        <div className="space-y-2">
          {currentBlock ? (
            <>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-stone-900 border border-stone-800 text-emerald-400 text-xs font-bold">
                <Brain className="w-3.5 h-3.5" />
                <span>{currentBlock.subject}</span>
                <span className="text-stone-600">•</span>
                <span className="text-stone-300">{currentBlock.timeSlot}</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-white leading-snug">
                {currentBlock.topic}
              </h1>
            </>
          ) : (
            <>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-stone-900 border border-stone-800 text-emerald-400 text-xs font-bold">
                <span>پارت آزاد مطالعه و تست‌زنی</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-white leading-snug">
                تمرکز روی مبحث جاری
              </h1>
            </>
          )}
        </div>

        {/* Big Circular / Bold Digital Clock */}
        <div className="relative flex flex-col items-center justify-center">
          <div className="text-7xl sm:text-9xl font-black tracking-tighter text-white tabular-nums select-none drop-shadow-2xl">
            {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
          </div>

          {/* Progress bar */}
          <div className="w-64 sm:w-80 h-2 bg-stone-800 rounded-full mt-6 overflow-hidden p-0.5 border border-white/5">
            <div 
              className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Controls: Play/Pause, Reset, Modes */}
        <div className="flex items-center justify-center gap-3 flex-wrap">
          <button
            onClick={() => setIsRunning(!isRunning)}
            className={`px-8 py-3.5 rounded-2xl text-base font-black flex items-center gap-2 shadow-xl transition-all transform hover:scale-105 cursor-pointer ${
              isRunning
                ? 'bg-amber-500 hover:bg-amber-400 text-stone-950'
                : 'bg-emerald-500 hover:bg-emerald-400 text-stone-950'
            }`}
          >
            {isRunning ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current" />}
            <span>{isRunning ? 'توقف موقت' : 'شروع تمرکز'}</span>
          </button>

          <button
            onClick={() => {
              setIsRunning(false);
              setTimeLeft(initialSeconds);
            }}
            className="p-3.5 rounded-2xl bg-stone-900 hover:bg-stone-800 text-stone-400 hover:text-white border border-stone-800 transition-all cursor-pointer"
            title="شروع مجدد تایمر"
          >
            <RotateCcw className="w-5 h-5" />
          </button>

          <button
            onClick={handleFinish}
            className="px-5 py-3.5 rounded-2xl bg-stone-900 hover:bg-emerald-950/80 text-emerald-400 hover:text-emerald-300 border border-stone-800 hover:border-emerald-700 transition-all text-xs font-bold flex items-center gap-1.5 cursor-pointer"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>تکمیل و ثبت پارت</span>
          </button>
        </div>

        {/* Quick Test Counter (In-session) */}
        {currentBlock && currentBlock.targetTests && currentBlock.targetTests > 0 && (
          <div className="bg-stone-900/80 border border-stone-800 rounded-2xl p-4 max-w-sm mx-auto flex items-center justify-between">
            <div className="text-right">
              <div className="text-xs font-bold text-stone-300">شمارنده تست‌های زده‌شده</div>
              <div className="text-[11px] text-stone-500">هدف این پارت: {currentBlock.targetTests} تست</div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setTestsDone(Math.max(0, testsDone - 1))}
                className="w-8 h-8 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 font-black text-sm flex items-center justify-center cursor-pointer"
              >
                -
              </button>
              <span className="w-10 text-center font-black text-emerald-400 text-lg tabular-nums">
                {testsDone}
              </span>
              <button
                onClick={() => setTestsDone(testsDone + 1)}
                className="w-8 h-8 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-black text-sm flex items-center justify-center cursor-pointer"
              >
                +
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Motivational Quote & Shortcuts */}
      <div className="text-center text-xs text-stone-500 max-w-md mx-auto">
        <p className="leading-relaxed">
          «موفقیت در کنکور حاصل تکرار کارهای کوچک روزمره با تمرکز ۱۰۰٪ است.»
        </p>
      </div>
    </div>
  );
};
