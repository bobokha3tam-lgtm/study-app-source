import React, { useState, useEffect } from 'react';
import {
  Bot,
  Send,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Play,
  Square,
  Activity,
  BookOpen,
  HelpCircle,
  Copy,
  Check,
  Zap,
  Flame,
  FileText,
  Target,
  Clock,
  Compass,
  ChevronLeft,
  Trash2,
  RefreshCw,
  ExternalLink
} from 'lucide-react';
import { StudentProfile } from '../types';

interface TelegramBotLiveHubProps {
  profile: StudentProfile;
  botToken?: string;
  chatId: string;
  botUsername?: string;
  isVerified: boolean;
}

interface TelegramActivityLog {
  id: string;
  time: string;
  type: 'incoming' | 'outgoing' | 'error' | 'system';
  text: string;
  user?: string;
}

export const TelegramBotLiveHub: React.FC<TelegramBotLiveHubProps> = ({
  profile,
  chatId,
  botUsername,
  isVerified,
}) => {
  const [isPollingActive, setIsPollingActive] = useState(false);
  const [logs, setLogs] = useState<TelegramActivityLog[]>([]);
  const [isSendingGuide, setIsSendingGuide] = useState(false);
  const [guideSendSuccess, setGuideSendSuccess] = useState<string | null>(null);
  const [guideSendError, setGuideSendError] = useState<string | null>(null);
  const [copiedCmd, setCopiedCmd] = useState<string | null>(null);

  // Fetch polling status and logs periodically
  const fetchPollingStatus = async () => {
    try {
      const res = await fetch('/api/telegram/activity-logs');
      const data = await res.json();
      if (data) {
        setIsPollingActive(Boolean(data.isActive));
        if (Array.isArray(data.logs)) {
          setLogs(data.logs);
        }
      }
    } catch (err) {
      console.error('Failed to fetch telegram logs:', err);
    }
  };

  useEffect(() => {
    fetchPollingStatus();
    const interval = setInterval(fetchPollingStatus, 3500);
    return () => clearInterval(interval);
  }, []);

  const handleSendGuideToTelegram = async () => {
    if (!chatId.trim()) {
      setGuideSendError('برای ارسال مستقیم راهنما به تلگرام، ابتدا شناسه چت خود را در زبانه ۱ ثبت کنید.');
      return;
    }

    setIsSendingGuide(true);
    setGuideSendSuccess(null);
    setGuideSendError(null);

    try {
      const res = await fetch('/api/telegram/test-student-ping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentName: profile.name,
          chatId: chatId.trim(),
        }),
      });

      const data = await res.json();
      if (data.success) {
        setGuideSendSuccess('پیام آزمایشی و معرفی قابلیت‌ها با موفقیت به تلگرام شما ارسال شد! تلگرام خود را چک کنید.');
      } else {
        setGuideSendError(data.error || 'خطا در ارسال پیام به تلگرام.');
      }
    } catch (err: any) {
      setGuideSendError(`خطا در ارتباط با سرور: ${err?.message || err}`);
    } finally {
      setIsSendingGuide(false);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCmd(id);
    setTimeout(() => setCopiedCmd(null), 2000);
  };

  const botCommands = [
    {
      id: 'start',
      command: '/start',
      persianTitle: 'راه‌اندازی و خوش‌آمدگویی',
      description: 'فعال‌سازی منوی دکمه‌های شیشه‌ای، معرفی اهداف و شروع کار با ربات مشاور.',
      sampleInput: '/start',
      icon: <Sparkles className="w-4 h-4 text-amber-500" />,
    },
    {
      id: 'help',
      command: '/help',
      persianTitle: 'راهنمای جامع کار با ربات',
      description: 'نمایش آموزش کامل دستورات، الگوهای ارسال گزارش و لیست قابلیت‌های هوشمند.',
      sampleInput: '/help',
      icon: <BookOpen className="w-4 h-4 text-emerald-500" />,
    },
    {
      id: 'report',
      command: '/report',
      persianTitle: 'ثبت و تحلیل کارنامه شبانه',
      description: 'ارسال ساعت مطالعه و تعداد تست با تحلیل الگوریتمی و هوش مصنوعی (نمره ۱ تا ۱۰ و ۳ اقدام فردا).',
      sampleInput: 'گزارش: ۶.۵ ساعت، ۱۱۰ تست، ۸۵ درست، ۲۵ غلط',
      icon: <Activity className="w-4 h-4 text-blue-500" />,
    },
    {
      id: 'quiz',
      command: '/quiz یا /trap',
      persianTitle: 'کوئیز تله‌های کنکور (دکمه‌های شیشه‌ای)',
      description: 'ارسال تست‌های ۴ گزینه‌ای دام‌دار کنکور به همراه کلیدهای شیشه‌ای لمسی و تحلیل دام طراح.',
      sampleInput: '/quiz',
      icon: <Zap className="w-4 h-4 text-purple-500" />,
    },
    {
      id: 'frog',
      command: '/frog یا /jump',
      persianTitle: 'زرادخانه ضد-تنبلی و اهمال‌کاری',
      description: 'لانچر پرتاب ۲ دقیقه‌ای، قانون فاصله فیزیکی و شکستن حس مقاومت ذهنی قبل از شروع پارت.',
      sampleInput: '/frog',
      icon: <Flame className="w-4 h-4 text-rose-500" />,
    },
    {
      id: 'plan',
      command: '/plan',
      persianTitle: 'برنامه و استراتژی روزانه',
      description: 'اعلام قورباغه روز (سخت‌ترین کار صبح)، بازه‌های زمانی بهینه و تعداد تست هدف فردا.',
      sampleInput: '/plan',
      icon: <Target className="w-4 h-4 text-indigo-500" />,
    },
    {
      id: 'search',
      command: '/book [مبحث]',
      persianTitle: 'جستجوی تخصصی منابع و کتاب‌ها',
      description: 'معرفی بهترین کتاب‌های سطح ۱ (آموزش)، سطح ۲ (ایده‌دار) و سطح ۳ (آزمونی) همراه روش مطالعه.',
      sampleInput: '/book حسابان خیلی سبز',
      icon: <Compass className="w-4 h-4 text-teal-500" />,
    },
    {
      id: 'morning',
      command: '/morning',
      persianTitle: 'شارژ و بیدارباش صبحگاهی',
      description: 'جمله شوک انگیزشی، تعیین هدف روزانه و شروع پرانرژی پارت اول مطالعه.',
      sampleInput: '/morning',
      icon: <Clock className="w-4 h-4 text-amber-500" />,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Live Engine Status Banner */}
      <div className="bg-stone-900 text-white rounded-3xl p-6 sm:p-7 border border-stone-800 shadow-xl space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5 max-w-2xl">
            <div className="flex items-center gap-2">
              <span
                className={`w-3 h-3 rounded-full ${
                  isPollingActive ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
                }`}
              />
              <span className="text-xs font-bold uppercase tracking-wider text-stone-300">
                {isPollingActive ? 'سرویس زنده ربات تلگرام: فعال و آماده دریافت' : 'سرویس ربات تلگرام: در انتظار اتصال مشاور'}
              </span>
            </div>
            <h3 className="text-base sm:text-lg font-bold">
              موتور هوشمند تعاملی تلگرام (Telegram Interactive Live Engine)
            </h3>
            <p className="text-xs sm:text-sm text-stone-300 leading-relaxed">
              با فعال بودن این سرویس، پیام‌ها، کوئیزها و گزارش‌های فرستاده‌شده در تلگرام بلافاصله توسط هوش مصنوعی پردازش شده و در پنل مشاور ثبت می‌گردد.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            {botUsername && (
              <a
                href={`https://t.me/${botUsername}`}
                target="_blank"
                rel="noreferrer"
                className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition cursor-pointer shadow-md shadow-emerald-950/40"
              >
                <Bot className="w-4 h-4" />
                <span>باز کردن @{botUsername} در تلگرام</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}

            <button
              onClick={handleSendGuideToTelegram}
              disabled={isSendingGuide || !chatId.trim() || !botUsername}
              className="px-4 py-2.5 bg-stone-800 hover:bg-stone-700 disabled:opacity-50 text-stone-200 rounded-xl text-xs font-bold border border-stone-700 flex items-center gap-2 transition cursor-pointer"
            >
              {isSendingGuide ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>در حال ارسال...</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5 text-emerald-400" />
                  <span>ارسال پیام تست به تلگرام من</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Feedback alerts */}
        {guideSendSuccess && (
          <div className="p-3.5 rounded-xl bg-emerald-950/80 border border-emerald-800/80 text-emerald-300 text-xs font-medium flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{guideSendSuccess}</span>
          </div>
        )}
        {guideSendError && (
          <div className="p-3.5 rounded-xl bg-rose-950/80 border border-rose-800/80 text-rose-300 text-xs font-medium flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{guideSendError}</span>
          </div>
        )}
      </div>

      {/* Bot Commands Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bot className="w-5 h-5 text-emerald-600" />
            <h3 className="font-bold text-stone-900 text-base">لیست دستورات تعاملی ربات تلگرام</h3>
          </div>
          <span className="text-xs text-stone-500">روی هر دستور کلیک کنید تا کپی شود</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {botCommands.map((cmd) => (
            <div
              key={cmd.id}
              className="bg-white rounded-2xl p-4 sm:p-5 border border-stone-200 hover:border-emerald-300 hover:shadow-md transition-all space-y-3 flex flex-col justify-between"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-xl bg-stone-50 border border-stone-100">
                      {cmd.icon}
                    </div>
                    <div>
                      <h4 className="font-bold text-stone-900 text-xs">{cmd.persianTitle}</h4>
                      <code className="text-[11px] font-mono font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                        {cmd.command}
                      </code>
                    </div>
                  </div>

                  <button
                    onClick={() => copyToClipboard(cmd.command.split(' ')[0], cmd.id)}
                    className="p-1.5 text-stone-400 hover:text-stone-700 rounded-lg hover:bg-stone-100 transition cursor-pointer"
                    title="کپی دستور"
                  >
                    {copiedCmd === cmd.id ? (
                      <Check className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                </div>

                <p className="text-stone-600 text-xs leading-relaxed">{cmd.description}</p>
              </div>

              <div className="pt-2 border-t border-stone-100">
                <div className="text-[10px] text-stone-400 mb-1">نمونه پیام ورودی:</div>
                <div className="text-[11px] text-stone-700 font-mono bg-stone-50 px-2.5 py-1.5 rounded-lg border border-stone-200/70 truncate">
                  {cmd.sampleInput}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
