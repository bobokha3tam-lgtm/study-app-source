import React, { useState } from 'react';
import { Moon, Sunrise, ChevronRight, Sparkles, RotateCcw, Check } from 'lucide-react';
import {
  SleepAdjustmentPlan,
  computeTodaysSleepTarget,
  SLEEP_PACE_PRESETS,
} from '../utils/sleepAdjustment';

interface SleepAdjustmentCardProps {
  plan: SleepAdjustmentPlan | null;
  onSavePlan: (plan: SleepAdjustmentPlan | null) => void;
}

const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export const SleepAdjustmentCard: React.FC<SleepAdjustmentCardProps> = ({ plan, onSavePlan }) => {
  const [isEditing, setIsEditing] = useState(!plan);
  const [currentWake, setCurrentWake] = useState(plan?.currentWakeTime || '10:00');
  const [currentSleep, setCurrentSleep] = useState(plan?.currentSleepTime || '02:00');
  const [targetWake, setTargetWake] = useState(plan?.targetWakeTime || '06:30');
  const [targetSleep, setTargetSleep] = useState(plan?.targetSleepTime || '23:00');
  const [paceId, setPaceId] = useState('gentle');

  const handleStart = () => {
    const pace = SLEEP_PACE_PRESETS.find((p) => p.id === paceId) || SLEEP_PACE_PRESETS[0];
    onSavePlan({
      currentWakeTime: currentWake,
      currentSleepTime: currentSleep,
      targetWakeTime: targetWake,
      targetSleepTime: targetSleep,
      startDate: todayISO(),
      stepMinutes: pace.stepMinutes,
      intervalDays: pace.intervalDays,
    });
    setIsEditing(false);
  };

  const handleReset = () => {
    onSavePlan(null);
    setIsEditing(true);
  };

  if (isEditing) {
    return (
      <div className="bg-gradient-to-br from-indigo-950 via-stone-900 to-stone-900 text-white rounded-3xl p-5 sm:p-6 border border-indigo-500/30 shadow-md">
        <div className="flex items-center gap-2 mb-1">
          <Moon size={18} className="text-indigo-300" />
          <h3 className="font-bold text-sm sm:text-base">تنظیم تدریجی ساعت خواب</h3>
        </div>
        <p className="text-xs text-indigo-200/80 mb-5">
          به‌جای تغییر یک‌دفعه‌ای، ساعت بیداری و خوابت رو کم‌کم و آروم به سمت هدف می‌بریم تا واقعاً جا بیفته.
        </p>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <div>
            <label className="text-[11px] text-indigo-200/70 block mb-1">الان معمولاً کی بیدار می‌شی؟</label>
            <input
              type="time"
              value={currentWake}
              onChange={(e) => setCurrentWake(e.target.value)}
              className="w-full bg-stone-800/80 border border-white/10 rounded-xl px-3 py-2 text-sm text-white"
            />
          </div>
          <div>
            <label className="text-[11px] text-indigo-200/70 block mb-1">الان معمولاً کی می‌خوابی؟</label>
            <input
              type="time"
              value={currentSleep}
              onChange={(e) => setCurrentSleep(e.target.value)}
              className="w-full bg-stone-800/80 border border-white/10 rounded-xl px-3 py-2 text-sm text-white"
            />
          </div>
          <div>
            <label className="text-[11px] text-emerald-300/80 block mb-1">می‌خوای کی بیدار شی؟ (هدف)</label>
            <input
              type="time"
              value={targetWake}
              onChange={(e) => setTargetWake(e.target.value)}
              className="w-full bg-stone-800/80 border border-emerald-500/30 rounded-xl px-3 py-2 text-sm text-white"
            />
          </div>
          <div>
            <label className="text-[11px] text-emerald-300/80 block mb-1">می‌خوای کی بخوابی؟ (هدف)</label>
            <input
              type="time"
              value={targetSleep}
              onChange={(e) => setTargetSleep(e.target.value)}
              className="w-full bg-stone-800/80 border border-emerald-500/30 rounded-xl px-3 py-2 text-sm text-white"
            />
          </div>
        </div>

        <div className="mb-5">
          <label className="text-[11px] text-indigo-200/70 block mb-2">با چه سرعتی جلو بریم؟</label>
          <div className="grid grid-cols-3 gap-2">
            {SLEEP_PACE_PRESETS.map((p) => (
              <button
                key={p.id}
                onClick={() => setPaceId(p.id)}
                className={`p-2.5 rounded-xl border text-xs font-bold transition-all ${
                  paceId === p.id
                    ? 'bg-emerald-500/20 border-emerald-400 text-emerald-200'
                    : 'bg-stone-800/60 border-white/10 text-stone-300'
                }`}
              >
                <div>{p.label}</div>
                <div className="text-[10px] font-normal opacity-70 mt-0.5">{p.note}</div>
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={handleStart}
          className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-400 text-stone-950 font-bold text-sm py-2.5 rounded-xl hover:opacity-90 transition-opacity"
        >
          <Sparkles size={16} />
          شروع برنامه تدریجی
        </button>
      </div>
    );
  }

  const todayTarget = computeTodaysSleepTarget(plan!);
  const progressPct = Math.min(100, Math.round((todayTarget.dayNumber / todayTarget.totalDaysEstimate) * 100));

  return (
    <div className="bg-gradient-to-br from-indigo-950 via-stone-900 to-stone-900 text-white rounded-3xl p-5 sm:p-6 border border-indigo-500/30 shadow-md">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-2">
          <Moon size={18} className="text-indigo-300" />
          <h3 className="font-bold text-sm sm:text-base">برنامه تدریجی خواب</h3>
        </div>
        <button
          onClick={handleReset}
          className="text-[11px] text-stone-400 hover:text-stone-200 flex items-center gap-1"
        >
          <RotateCcw size={12} />
          تنظیم مجدد
        </button>
      </div>

      {todayTarget.isComplete ? (
        <div className="flex items-center gap-3 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-4">
          <Check size={20} className="text-emerald-400 shrink-0" />
          <p className="text-sm text-emerald-200">
            به هدفت رسیدی 🎉 حالا ساعت بیداری‌ت <b>{todayTarget.wakeTime}</b> و خوابت <b>{todayTarget.sleepTime}</b> هست. سعی کن نگهش داری.
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="bg-stone-800/80 rounded-2xl p-3 border border-white/10 text-center">
              <Sunrise size={16} className="text-amber-300 mx-auto mb-1" />
              <div className="text-[11px] text-stone-400 mb-0.5">امروز بیدار شو</div>
              <div className="text-lg font-black">{todayTarget.wakeTime}</div>
            </div>
            <div className="bg-stone-800/80 rounded-2xl p-3 border border-white/10 text-center">
              <Moon size={16} className="text-indigo-300 mx-auto mb-1" />
              <div className="text-[11px] text-stone-400 mb-0.5">امروز بخواب</div>
              <div className="text-lg font-black">{todayTarget.sleepTime}</div>
            </div>
          </div>

          <div className="mb-2 flex items-center justify-between text-[11px] text-stone-400">
            <span>روز {todayTarget.dayNumber} از حدود {todayTarget.totalDaysEstimate}</span>
            <span>هدف نهایی: {plan!.targetWakeTime}</span>
          </div>
          <div className="bg-stone-800/80 rounded-full h-2 overflow-hidden border border-white/10">
            <div
              className="bg-gradient-to-r from-indigo-500 to-emerald-400 h-full rounded-full transition-all duration-500"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <p className="text-[11px] text-stone-400 mt-3 flex items-center gap-1">
            <ChevronRight size={12} />
            هر {plan!.intervalDays} روز، {plan!.stepMinutes} دقیقه زودتر — بدون فشار، قدم به قدم.
          </p>
        </>
      )}
    </div>
  );
};
