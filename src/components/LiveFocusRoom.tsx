import React, { useState, useEffect } from 'react';
import { Play, Pause, Square, CheckCircle, Clock, X, Flame } from 'lucide-react';
import { StudyBlock } from '../types';

interface LiveFocusRoomProps {
  block: StudyBlock;
  onClose: () => void;
  onComplete: (actualMinutes: number) => void;
}

export const LiveFocusRoom: React.FC<LiveFocusRoomProps> = ({ block, onClose, onComplete }) => {
  const [timeLeft, setTimeLeft] = useState(block.durationMinutes * 60);
  const [isActive, setIsActive] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((time) => time - 1);
        setElapsed((e) => e + 1);
      }, 1000);
    } else if (timeLeft === 0) {
      setIsActive(false);
    }
    return () => clearInterval(interval);
  }, [isActive, timeLeft]);

  const toggleTimer = () => setIsActive(!isActive);
  
  const handleFinish = () => {
    const actualMinutes = Math.round(elapsed / 60);
    onComplete(actualMinutes);
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const progressPercent = ((block.durationMinutes * 60 - timeLeft) / (block.durationMinutes * 60)) * 100;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-stone-900/90 backdrop-blur-md">
      <div className="bg-white rounded-3xl max-w-md w-full p-8 shadow-2xl space-y-8 relative overflow-hidden">
        {/* Background visual flair */}
        <div className="absolute top-0 left-0 w-full h-2 bg-stone-100">
          <div className="h-full bg-emerald-500 transition-all duration-1000" style={{ width: `${progressPercent}%` }} />
        </div>

        <button onClick={onClose} className="absolute top-6 right-6 text-stone-400 hover:text-stone-700">
          <X className="w-6 h-6" />
        </button>

        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-rose-100 text-rose-600 mb-2">
            <Flame className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-bold text-stone-900">اتاق تمرکز</h2>
          <p className="text-stone-500 font-medium">{block.subject} - {block.topic}</p>
        </div>

        <div className="flex flex-col items-center justify-center py-8">
          <div className="text-7xl font-black text-stone-800 tracking-tighter tabular-nums">
            {formatTime(timeLeft)}
          </div>
          <div className="text-stone-400 mt-2 font-medium flex items-center gap-1.5">
            <Clock className="w-4 h-4" />
            زمان برنامه‌ریزی شده: {block.durationMinutes} دقیقه
          </div>
        </div>

        <div className="flex items-center justify-center gap-4">
          <button
            onClick={toggleTimer}
            className={`w-20 h-20 rounded-full flex items-center justify-center shadow-lg transition-transform hover:scale-105 active:scale-95 text-white ${
              isActive ? 'bg-amber-500' : 'bg-emerald-600'
            }`}
          >
            {isActive ? <Pause className="w-10 h-10" /> : <Play className="w-10 h-10 ml-2" />}
          </button>
          
          <button
            onClick={handleFinish}
            className="w-16 h-16 rounded-full flex items-center justify-center bg-stone-100 text-stone-600 hover:bg-stone-200 hover:text-stone-900 transition-colors"
            title="پایان پارت"
          >
            <Square className="w-6 h-6" />
          </button>
        </div>

        {block.recommendedMethod && (
          <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 text-center">
            <div className="text-xs font-bold text-indigo-800 mb-1">متد پیشنهادی مشاور:</div>
            <div className="text-sm text-indigo-600 font-medium">{block.recommendedMethod}</div>
          </div>
        )}
      </div>
    </div>
  );
};
