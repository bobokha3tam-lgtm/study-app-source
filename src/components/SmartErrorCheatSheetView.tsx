import React, { useState } from 'react';
import { BookOpen, Sparkles, AlertTriangle, CheckCircle, Volume2, Share2, Copy, FileText, Bookmark, Zap } from 'lucide-react';
import { ExamErrorLog, StudentProfile } from '../types';

interface SmartErrorCheatSheetViewProps {
  profile: StudentProfile;
  errors: ExamErrorLog[];
}

export const SmartErrorCheatSheetView: React.FC<SmartErrorCheatSheetViewProps> = ({ profile, errors }) => {
  const [activeFilter, setActiveFilter] = useState<'all' | 'conceptual' | 'careless' | 'time'>('all');
  const [copiedText, setCopiedText] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState<string | null>(null);

  const filteredErrors = errors.filter(e => {
    if (activeFilter === 'careless') return e.category === 'بی‌دقتی محاسباتی' || e.category === 'دیدن اشتباه گزینه';
    if (activeFilter === 'conceptual') return e.category === 'ضعف علمی یا عدم تسلط' || e.category === 'فراموشی فرمول/نکته';
    if (activeFilter === 'time') return e.category === 'کمبود زمان/استرس';
    return true;
  });

  // Calculate Readiness score
  const totalErrors = errors.length;
  const carelessnessCount = errors.filter(e => e.category === 'بی‌دقتی محاسباتی').length;
  const conceptCount = errors.filter(e => e.category === 'ضعف علمی یا عدم تسلط').length;
  
  // Readiness Score out of 100
  const estimatedReadiness = Math.max(35, Math.min(98, 100 - (totalErrors * 3) - (conceptCount * 4)));

  const handleCopyCheatSheet = () => {
    if (errors.length === 0) return;
    const text = `📓 دفترچه مرور ۵ دقیقه‌ای طلایی (قبل از آزمون) - دانش‌آموز ${profile.name}\n\n` +
      errors.map((e, i) => `${i + 1}. [${e.subject || e.topic}] نوع خطا: ${e.category}\n📌 نکته اصلاحی: ${e.remedialAction || e.notes || 'مرور دقیق فرمول و حل مجدد'}\n`).join('\n') +
      `\nساخته شده توسط مشاور هوشمند کنکور هرمس 🎓`;

    navigator.clipboard.writeText(text);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2500);
  };

  const handlePlayVoiceAdvice = (errorId: string, text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      if (isPlayingAudio === errorId) {
        setIsPlayingAudio(null);
        return;
      }
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'fa-IR';
      utterance.rate = 0.95;
      utterance.onend = () => setIsPlayingAudio(null);
      setIsPlayingAudio(errorId);
      window.speechSynthesis.speak(utterance);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-amber-900 via-stone-900 to-indigo-950 text-white rounded-2xl p-6 shadow-md border border-amber-800/40">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 text-xs font-semibold border border-amber-500/30">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>استخراج خودکار از تمام کالبدشکافی‌های آزمون</span>
            </div>
            <h2 className="text-2xl font-bold tracking-tight">
              دفترچه مرور ۵ دقیقه‌ای طلایی و دام‌های تستی 📓
            </h2>
            <p className="text-stone-300 text-xs sm:text-sm max-w-2xl leading-relaxed">
              این جزوه خلاصه شامل تمام بی‌دقتی‌ها، فرمول‌های فرار و دام‌های طراحان کنکور است که فقط ۵ دقیقه قبل از ورود به جلسه آزمون باید مرور شوند تا از تکرار اشتباهات جلوگیری شود.
            </p>
          </div>

          <div className="flex flex-col items-end gap-2 shrink-0">
            <div className="bg-white/10 backdrop-blur-md p-3 rounded-xl border border-white/10 text-center min-w-[140px]">
              <div className="text-[10px] text-amber-200 font-bold">نرخ آمادگی آزمون بعدی</div>
              <div className="text-2xl font-black text-amber-400 mt-0.5">{estimatedReadiness}٪</div>
              <div className="text-[10px] text-stone-300 mt-0.5">{totalErrors} خطا ثبت‌شده</div>
            </div>
            
            <button
              onClick={handleCopyCheatSheet}
              disabled={errors.length === 0}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-bold shadow-xs transition-colors disabled:opacity-50"
            >
              <Copy className="w-3.5 h-3.5" />
              {copiedText ? 'کپی شد!' : 'کپی دفترچه مرور'}
            </button>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {[
          { id: 'all', label: 'همه نکات و اشتباهات', count: errors.length },
          { id: 'careless', label: 'بی‌دقتی‌های محاسباتی', count: carelessnessCount },
          { id: 'conceptual', label: 'ضعف علمی و فرمول‌ها', count: conceptCount },
          { id: 'time', label: 'کمبود زمان و استرس', count: errors.filter(e => e.category === 'کمبود زمان/استرس').length },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveFilter(tab.id as any)}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
              activeFilter === tab.id
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-white text-stone-700 border border-stone-200 hover:bg-stone-50'
            }`}
          >
            <span>{tab.label}</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded font-bold ${activeFilter === tab.id ? 'bg-white/20' : 'bg-stone-100 text-stone-500'}`}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Error Cards Grid */}
      {filteredErrors.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-stone-200 space-y-3">
          <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
            <CheckCircle className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-stone-800 text-base">هنوز اشتباهی در این بخش ثبت نشده است</h3>
          <p className="text-xs text-stone-500 max-w-md mx-auto leading-relaxed">
            پس از شرکت در آزمون‌ها، پاسخ‌برگ خود را از بخش «کالبدشکافی آزمون» وارد کنید تا تمام بی‌دقتی‌ها و فرمول‌های فرار شما خودکار به این دفترچه اضافه شوند.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredErrors.map((err, idx) => (
            <div key={err.id || idx} className="bg-white rounded-2xl p-5 border border-amber-200/80 shadow-xs space-y-3 relative hover:border-amber-400 transition-all">
              <div className="flex items-center justify-between border-b border-stone-100 pb-2.5">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-amber-100 text-amber-800 font-bold text-xs flex items-center justify-center">
                    {idx + 1}
                  </span>
                  <div>
                    <span className="font-bold text-stone-900 text-xs sm:text-sm">{err.subject || err.topic || 'درس تخصصی'}</span>
                    <span className="text-[10px] text-stone-400 mr-2">آزمون: {err.examName || 'نامشخص'}</span>
                  </div>
                </div>

                <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                  {err.category}
                </span>
              </div>

              {/* Trap / Question detail */}
              <div className="bg-stone-50 rounded-xl p-3 text-xs text-stone-700 space-y-1.5 border border-stone-200/60">
                <div className="font-semibold text-stone-900 flex items-center gap-1 text-[11px] text-amber-800">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                  دام طراح یا علّت خطا:
                </div>
                <p className="leading-relaxed text-[11px]">{err.notes || err.questionText || 'ثبت نشده'}</p>
              </div>

              {/* Remedial advice */}
              <div className="bg-amber-50/70 border border-amber-200/60 rounded-xl p-3 text-xs text-amber-950 flex items-start justify-between gap-2">
                <div>
                  <div className="font-bold text-[11px] text-amber-900 mb-0.5 flex items-center gap-1">
                    <Zap className="w-3 h-3 text-amber-600" />
                    نکته طلایی و کلید جلوگیری:
                  </div>
                  <p className="text-[11px] leading-relaxed text-amber-900 font-medium">
                    {err.remedialAction || 'قبل از حل کامل، فرمول را چک کرده و یک بار عدد نهایی را کنترل کن.'}
                  </p>
                </div>

                <button
                  onClick={() => handlePlayVoiceAdvice(err.id, `${err.subject}. نکته طلایی: ${err.remedialAction || err.notes}`)}
                  className={`p-2 rounded-lg transition-colors shrink-0 ${
                    isPlayingAudio === err.id ? 'bg-amber-600 text-white animate-pulse' : 'bg-white text-amber-700 hover:bg-amber-100 border border-amber-200'
                  }`}
                  title="پخش صوتی نکته"
                >
                  <Volume2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
