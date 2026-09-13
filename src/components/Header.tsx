import React from 'react';
import { 
  Sparkles, 
  Calendar, 
  Moon, 
  Bot, 
  User, 
  Share2, 
  RotateCcw, 
  Search, 
  ShieldCheck, 
  Target, 
  Flame, 
  Compass, 
  BarChart3,
  HelpCircle
} from 'lucide-react';
import { StudentProfile } from '../types';

interface HeaderProps {
  activeTab: 'nightly' | 'schedule' | 'exam' | 'pro_tools' | 'psychology' | 'chat' | 'hermes';
  setActiveTab: (tab: 'nightly' | 'schedule' | 'exam' | 'pro_tools' | 'psychology' | 'chat' | 'hermes') => void;
  profile: StudentProfile;
  onOpenProfile: () => void;
  onOpenShare?: () => void;
  onOpenResetData?: () => void;
  onOpenSearch?: () => void;
  onOpenMasterAdmin?: () => void;
  isAdminUnlocked?: boolean;
  onToggleFocusMode?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  profile,
  onOpenProfile,
  onOpenShare,
  onOpenResetData,
  onOpenSearch,
  onOpenMasterAdmin,
  isAdminUnlocked = false,
  onToggleFocusMode,
}) => {
  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-stone-200/80 shadow-2xs">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        {/* Top Tier: Logo & Core Actions */}
        <div className="flex items-center justify-between h-15 sm:h-16 gap-3">
          {/* Brand & Identity */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-700 via-teal-700 to-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-700/20 shrink-0 ring-2 ring-emerald-500/20">
              <Sparkles className="w-5 h-5 text-emerald-200" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-black tracking-tight text-stone-900 whitespace-nowrap">
                  هرمس <span className="text-emerald-600 font-black">·</span> دستیار هوشمند کنکور
                </h1>
                <span className="hidden md:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-50 text-emerald-800 border border-emerald-200">
                  {profile.fieldOfStudy === 'experimental' ? 'تجربی' : profile.fieldOfStudy === 'humanities' ? 'علوم انسانی' : 'ریاضی فیزیک'}
                </span>
              </div>
              <p className="text-[11px] text-stone-500 hidden lg:block font-medium">
                میز کار یکپارچه برنامه‌ریزی، بودجه‌بندی آزمون‌ها و پایش پیشرفت تحصیلی
              </p>
            </div>
          </div>

          {/* Quick Action Tools */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Quick Zen Focus Mode Button */}
            {onToggleFocusMode && (
              <button
                onClick={onToggleFocusMode}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-stone-950 font-black text-xs shadow-xs transition-all cursor-pointer whitespace-nowrap"
                title="ورود به حالت فوکوس مطالعه (پنهان‌سازی حواشی)"
              >
                <Flame className="w-3.5 h-3.5 text-stone-950 fill-current animate-pulse" />
                <span className="hidden sm:inline">حالت تمرکز (Zen)</span>
                <span className="sm:hidden">تمرکز</span>
              </button>
            )}

            {/* Curriculum & Resources Search */}
            {onOpenSearch && (
              <button
                onClick={onOpenSearch}
                className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white transition-all text-xs font-bold shadow-xs cursor-pointer whitespace-nowrap"
                title="کاوشگر سرفصل‌ها و منابع کنکور"
              >
                <Search className="w-3.5 h-3.5 text-emerald-400" />
                <span className="hidden md:inline">بانک سرفصل‌ها</span>
              </button>
            )}

            {/* Share System */}
            {onOpenShare && (
              <button
                onClick={onOpenShare}
                className="p-2 sm:px-2.5 sm:py-1.5 rounded-xl border border-stone-200 bg-stone-50 hover:bg-stone-100 text-stone-700 transition-colors text-xs font-semibold cursor-pointer whitespace-nowrap"
                title="اشتراک‌گذاری"
              >
                <Share2 className="w-3.5 h-3.5 text-stone-600 shrink-0" />
              </button>
            )}

            {/* Counselor Portal Gateway */}
            {onOpenMasterAdmin && (
              <button
                onClick={onOpenMasterAdmin}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  isAdminUnlocked
                    ? 'bg-emerald-700 text-white shadow-xs'
                    : 'bg-stone-100 hover:bg-stone-200 text-stone-800 border border-stone-200'
                }`}
                title={isAdminUnlocked ? "پنل اختصاصی مشاور" : "ورود مشاور"}
              >
                <ShieldCheck className={`w-4 h-4 ${isAdminUnlocked ? 'text-emerald-300' : 'text-stone-600'}`} />
                <span className="hidden sm:inline">{isAdminUnlocked ? 'پنل مشاور' : 'ورود مشاور'}</span>
              </button>
            )}

            {/* Student Profile Quick View */}
            <button
              onClick={onOpenProfile}
              className="flex items-center gap-2 p-1.5 pr-2 sm:px-3 sm:py-1.5 rounded-xl bg-stone-100 border border-stone-200 hover:border-emerald-500/50 hover:bg-emerald-50/40 transition-all text-right cursor-pointer whitespace-nowrap"
              title="مشخصات و هدف تحصیلی"
            >
              <div className="w-7 h-7 rounded-lg bg-emerald-700 text-white flex items-center justify-center font-bold text-xs shrink-0">
                {profile.name ? profile.name.charAt(0) : <User className="w-4 h-4" />}
              </div>
              <div className="hidden sm:block text-right">
                <div className="text-xs font-bold text-stone-900 leading-tight">{profile.name}</div>
                <div className="text-[10px] text-emerald-800 font-semibold truncate max-w-[90px]">{profile.targetGoal || 'هدف کنکور'}</div>
              </div>
            </button>
          </div>
        </div>

        {/* Bottom Tier: Streamlined 3-Pillar Navigation */}
        <div className="relative border-t border-stone-100 py-1.5">
          <nav className="flex items-center justify-between gap-1 sm:gap-2">
            {/* 3 Core Primary Pillars */}
            <div className="flex items-center gap-1 sm:gap-2 flex-1 overflow-x-auto scrollbar-none py-0.5">
              {/* Pillar 1: Schedule & Daily Execution */}
              <button
                onClick={() => setActiveTab('schedule')}
                className={`flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-black transition-all whitespace-nowrap cursor-pointer ${
                  activeTab === 'schedule'
                    ? 'bg-stone-900 text-white shadow-xs ring-2 ring-emerald-500/40'
                    : 'text-stone-700 hover:text-stone-900 hover:bg-stone-100'
                }`}
              >
                <Calendar className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>برنامه و میز کار مطالعه</span>
              </button>

              {/* Pillar 2: Exam Budget & Classes */}
              <button
                onClick={() => setActiveTab('exam')}
                className={`flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-black transition-all whitespace-nowrap cursor-pointer ${
                  activeTab === 'exam'
                    ? 'bg-stone-900 text-white shadow-xs ring-2 ring-emerald-500/40'
                    : 'text-stone-700 hover:text-stone-900 hover:bg-stone-100'
                }`}
              >
                <Compass className="w-4 h-4 text-teal-400 shrink-0" />
                <span>بودجه آزمون و کلاس‌ها</span>
              </button>

              {/* Pillar 3: Nightly Analysis & Progress */}
              <button
                onClick={() => setActiveTab('nightly')}
                className={`flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-black transition-all whitespace-nowrap cursor-pointer ${
                  activeTab === 'nightly'
                    ? 'bg-stone-900 text-white shadow-xs ring-2 ring-emerald-500/40'
                    : 'text-stone-700 hover:text-stone-900 hover:bg-stone-100'
                }`}
              >
                <Moon className="w-4 h-4 text-amber-400 shrink-0" />
                <span>تحلیل و گزارش شبانه</span>
              </button>
            </div>

            {/* Secondary Utilities (Pro Tools, Chat, Telegram) */}
            <div className="flex items-center gap-1 shrink-0 border-r border-stone-200 pr-2 mr-1">
              <button
                onClick={() => setActiveTab('pro_tools')}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                  activeTab === 'pro_tools'
                    ? 'bg-stone-900 text-white'
                    : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
                }`}
                title="جعبه‌ابزار تحلیلی، کارنامه و دام‌های تستی"
              >
                <BarChart3 className="w-3.5 h-3.5 text-amber-500" />
                <span className="hidden md:inline">جعبه‌ابزار تحلیل</span>
              </button>

              <button
                onClick={() => setActiveTab('chat')}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                  activeTab === 'chat'
                    ? 'bg-stone-900 text-white'
                    : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
                }`}
                title="گفت‌وگوی آنلاین با مشاور"
              >
                <Sparkles className="w-3.5 h-3.5 text-sky-500" />
                <span className="hidden md:inline">مشاوره هوشمند</span>
              </button>

              <button
                onClick={() => setActiveTab('hermes')}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                  activeTab === 'hermes'
                    ? 'bg-emerald-800 text-white'
                    : 'text-emerald-800 bg-emerald-50 hover:bg-emerald-100/80 border border-emerald-200'
                }`}
                title="راهنمای اتصال به ربات تلگرام"
              >
                <Bot className="w-3.5 h-3.5 text-emerald-600" />
                <span className="hidden lg:inline">ربات تلگرام</span>
              </button>
            </div>
          </nav>
        </div>
      </div>
    </header>
  );
};
