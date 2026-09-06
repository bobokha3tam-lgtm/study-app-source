import React from 'react';
import { Sparkles, Calendar, Moon, MessageSquare, Bot, User, Share2, Brain, Target, RotateCcw, Search, Activity, ShieldCheck, Lock, Key } from 'lucide-react';
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
}) => {
  return (
    <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-stone-200/80 shadow-xs">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        {/* Top Tier: Logo, Title and Key Actions */}
        <div className="flex items-center justify-between h-15 sm:h-16 gap-3">
          {/* Logo & Title */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 via-teal-600 to-emerald-500 text-white flex items-center justify-center shadow-md shadow-emerald-500/20 shrink-0 ring-2 ring-emerald-500/20">
              <Sparkles className="w-5 h-5 text-emerald-100 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-black tracking-tight text-stone-900 whitespace-nowrap">
                  هرمس <span className="text-emerald-600 font-extrabold">·</span> مشاور کنکور
                </h1>
                <span className="hidden md:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-2xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                  نسخه تخصصی تجربی، ریاضی و انسانی
                </span>
              </div>
              <p className="text-[11px] text-stone-500 hidden lg:block font-medium">
                سامانه هوشمند برنامه‌ریزی درسی، تحلیل شبانه و پایش تراز کنکور
              </p>
            </div>
          </div>

          {/* Action Buttons: Search, Reset Data, Share & Student Profile */}
          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            {onOpenSearch && (
              <button
                onClick={onOpenSearch}
                className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white transition-all text-xs font-bold shadow-xs hover:shadow-md cursor-pointer whitespace-nowrap group"
                title="جستجوی پیشرفته در سرفصل‌ها، کتاب‌ها و منابع کنکور"
              >
                <Search className="w-3.5 h-3.5 text-emerald-400 group-hover:scale-110 transition-transform" />
                <span className="hidden md:inline">کاوشگر سرفصل‌ها</span>
                <span className="md:hidden">سرفصل‌ها</span>
              </button>
            )}

            {onOpenResetData && (
              <button
                onClick={onOpenResetData}
                className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1.5 rounded-xl border border-stone-200 hover:border-rose-300 hover:bg-rose-50 text-stone-600 hover:text-rose-700 transition-colors text-xs font-semibold cursor-pointer whitespace-nowrap"
                title="صفر کردن داده‌ها یا بازنشانی برنامه"
              >
                <RotateCcw className="w-3.5 h-3.5 text-stone-400 hover:text-rose-600 shrink-0" />
                <span className="hidden lg:inline">بازنشانی</span>
              </button>
            )}

            {onOpenShare && (
              <button
                onClick={onOpenShare}
                className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 transition-colors text-xs font-bold cursor-pointer whitespace-nowrap shadow-2xs"
                title="اشتراک‌گذاری سامانه یا ارسال لینک اختصاصی به دوستان"
              >
                <Share2 className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                <span className="inline">اشتراک</span>
              </button>
            )}

            {/* Counselor Login / Dedicated Portal Button */}
            {onOpenMasterAdmin && (
              <button
                onClick={onOpenMasterAdmin}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap shadow-xs ${
                  isAdminUnlocked
                    ? 'bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white shadow-emerald-600/30 ring-2 ring-emerald-500/30'
                    : 'bg-stone-900 hover:bg-stone-800 text-stone-100 hover:text-white border border-stone-800'
                }`}
                title={isAdminUnlocked ? "مشاهده پنل اختصاصی و رصد دانش‌آموزان" : "ورود با رمز و پسورد مشاور به پنل اختصاصی"}
              >
                <ShieldCheck className={`w-4 h-4 ${isAdminUnlocked ? 'text-emerald-300 animate-pulse' : 'text-amber-400'}`} />
                <span className="inline font-extrabold">{isAdminUnlocked ? 'پنل اختصاصی مشاور' : 'ورود مشاور'}</span>
              </button>
            )}

            {/* Student Profile Quick View */}
            <button
              onClick={onOpenProfile}
              className="flex items-center gap-2 p-1.5 pr-2 sm:px-3 sm:py-1.5 rounded-xl bg-stone-50 border border-stone-200/80 hover:border-emerald-500/40 hover:bg-emerald-50/30 transition-all text-right cursor-pointer whitespace-nowrap shadow-2xs"
              title="مشاهده و ویرایش مشخصات و اهداف تحصیلی"
            >
              <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shadow-xs shrink-0">
                {profile.name ? profile.name.charAt(0) : <User className="w-4 h-4" />}
              </div>
              <div className="hidden sm:block text-right">
                <div className="text-xs font-bold text-stone-900 leading-tight">{profile.name}</div>
                <div className="text-[10px] text-emerald-700 font-semibold truncate max-w-[100px]">{profile.fieldOfStudy}</div>
              </div>
            </button>
          </div>
        </div>

        {/* Bottom Tier: Responsive Accessible Tabs */}
        <div className="relative border-t border-stone-100/80 py-1.5">
          <nav className="flex flex-wrap items-center gap-1 sm:gap-1.5 py-0.5">
            <button
              onClick={() => setActiveTab('nightly')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'nightly'
                  ? 'bg-stone-900 text-white shadow-xs'
                  : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100/80'
              }`}
            >
              <Moon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400 shrink-0" />
              <span>تحلیل شبانه</span>
            </button>

            <button
              onClick={() => setActiveTab('schedule')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'schedule'
                  ? 'bg-stone-900 text-white shadow-xs'
                  : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100/80'
              }`}
            >
              <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-400 shrink-0" />
              <span>برنامه هفتگی</span>
            </button>

            <button
              onClick={() => setActiveTab('exam')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'exam'
                  ? 'bg-stone-900 text-white shadow-xs'
                  : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100/80'
              }`}
            >
              <Target className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-teal-400 shrink-0" />
              <span>بودجه‌بندی و اطلس</span>
            </button>

            <button
              onClick={() => setActiveTab('pro_tools')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'pro_tools'
                  ? 'bg-stone-900 text-white shadow-xs'
                  : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100/80'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400 shrink-0" />
              <span>ابزارهای حرفه‌ای</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                activeTab === 'pro_tools' ? 'bg-amber-400 text-stone-950' : 'bg-amber-100 text-amber-900'
              }`}>
                ۷ ابزار
              </span>
            </button>

            <button
              onClick={() => setActiveTab('psychology')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'psychology'
                  ? 'bg-stone-900 text-white shadow-xs'
                  : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100/80'
              }`}
            >
              <Brain className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-violet-400 shrink-0" />
              <span>روانشناسی و تمرکز</span>
            </button>

            <button
              onClick={() => setActiveTab('chat')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'chat'
                  ? 'bg-stone-900 text-white shadow-xs'
                  : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100/80'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-sky-400 shrink-0" />
              <span>گفت‌وگو با مشاور (وب)</span>
            </button>

            <button
              onClick={() => setActiveTab('hermes')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'hermes'
                  ? 'bg-emerald-700 text-white shadow-xs ring-2 ring-emerald-400/40'
                  : 'text-emerald-800 bg-emerald-50 hover:bg-emerald-100/80 border border-emerald-200/80'
              }`}
            >
              <Bot className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-600 shrink-0" />
              <span>🤖 ربات تلگرام</span>
            </button>
          </nav>
        </div>
      </div>
    </header>
  );
};

