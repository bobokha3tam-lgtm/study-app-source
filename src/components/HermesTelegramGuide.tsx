import React, { useState, useEffect } from 'react';
import { 
  Bot, 
  Send, 
  Key, 
  Settings, 
  Clock, 
  Sparkles, 
  CheckCircle2, 
  Smartphone, 
  Cpu, 
  HelpCircle, 
  AlertCircle, 
  Eye, 
  EyeOff, 
  BellRing, 
  Flame, 
  Zap, 
  Timer, 
  ShieldAlert, 
  Target, 
  RotateCcw,
  Check,
  Compass,
  Activity,
  BookOpen,
  ExternalLink,
  RefreshCw,
  ShieldCheck,
  UserCheck
} from 'lucide-react';
import { StudentProfile } from '../types';
import { TelegramBotLiveHub } from './TelegramBotLiveHub';

interface HermesTelegramGuideProps {
  profile: StudentProfile;
}

interface SimMessage {
  id: string;
  sender: 'user' | 'bot';
  text: string;
  time: string;
}

export const HermesTelegramGuide: React.FC<HermesTelegramGuideProps> = ({ profile }) => {
  const [activeSubTab, setActiveSubTab] = useState<'student-link' | 'bot-hub' | 'anti-procrastination' | 'telegram-simulator' | 'concept-guide'>('student-link');

  // Master Bot info from server (managed by counselor)
  const [masterBotInfo, setMasterBotInfo] = useState<{
    isConfigured: boolean;
    botUsername: string | null;
    isPollingActive: boolean;
  }>({
    isConfigured: false,
    botUsername: null,
    isPollingActive: false,
  });
  const [isLoadingMasterInfo, setIsLoadingMasterInfo] = useState(false);

  // Student's own ID configuration
  const [chatId, setChatId] = useState<string>(() => {
    return profile.telegramChatId || localStorage.getItem('konkur_student_chat_id') || '';
  });
  const [telegramUsername, setTelegramUsername] = useState<string>(() => {
    return profile.telegramUsername || localStorage.getItem('konkur_student_telegram_user') || '';
  });

  const [isLinking, setIsLinking] = useState(false);
  const [linkResult, setLinkResult] = useState<{ success: boolean; message: string; warning?: string } | null>(null);

  const [isTestingPing, setIsTestingPing] = useState(false);
  const [pingResult, setPingResult] = useState<{ success: boolean; message: string; warning?: string } | null>(null);

  // Anti-procrastination launcher state
  const [activeLauncher, setActiveLauncher] = useState<boolean>(false);
  const [launcherSeconds, setLauncherSeconds] = useState<number>(120);
  const [selectedAvoidanceReason, setSelectedAvoidanceReason] = useState<string | null>(null);
  const [commitmentText, setCommitmentText] = useState<string>('');
  const [commitmentSaved, setCommitmentSaved] = useState<boolean>(false);

  // Simulator state
  const [simInput, setSimInput] = useState('');
  const [isSimLoading, setIsSimLoading] = useState(false);
  const [simMessages, setSimMessages] = useState<SimMessage[]>([
    {
      id: '1',
      sender: 'bot',
      text: `سلام ${profile.name} جان! 🎓\nمشاور تحصیلی تو هستم. اهداف و بودجه‌بندی ${profile.fieldOfStudy} در حافظه من بارگذاری شده است.\nهر شب گزارش مطالعه‌ات را بفرست تا با متد رتبه‌برترها بررسی‌اش کنیم.`,
      time: '22:00',
    },
  ]);

  // Fetch counselor master bot status on mount
  const fetchMasterBotInfo = async () => {
    setIsLoadingMasterInfo(true);
    try {
      const res = await fetch('/api/telegram/public-info');
      if (!res.ok) return;
      const contentType = res.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) return;
      const data = await res.json();
      if (data) {
        setMasterBotInfo({
          isConfigured: Boolean(data.isConfigured),
          botUsername: data.botUsername || null,
          isPollingActive: Boolean(data.isPollingActive),
        });
      }
    } catch (err) {
      console.error('Failed to fetch master bot info:', err);
    } finally {
      setIsLoadingMasterInfo(false);
    }
  };

  useEffect(() => {
    fetchMasterBotInfo();
    const timer = setInterval(fetchMasterBotInfo, 10000);
    return () => clearInterval(timer);
  }, []);

  // Sync with profile if updated
  useEffect(() => {
    if (profile.telegramChatId && !chatId) {
      setChatId(profile.telegramChatId);
    }
    if (profile.telegramUsername && !telegramUsername) {
      setTelegramUsername(profile.telegramUsername);
    }
  }, [profile]);

  // Timer for 2-minute micro-commitment
  useEffect(() => {
    let interval: any = null;
    if (activeLauncher && launcherSeconds > 0) {
      interval = setInterval(() => {
        setLauncherSeconds((prev) => prev - 1);
      }, 1000);
    } else if (launcherSeconds === 0) {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [activeLauncher, launcherSeconds]);

  // Student Links their Telegram Chat ID
  const handleSaveStudentChatId = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatId.trim()) {
      setLinkResult({
        success: false,
        message: 'لطفاً شناسه چت عددی خود (Chat ID) را وارد کنید.',
      });
      return;
    }

    setIsLinking(true);
    setLinkResult(null);

    try {
      // Save locally
      localStorage.setItem('konkur_student_chat_id', chatId.trim());
      if (telegramUsername) {
        localStorage.setItem('konkur_student_telegram_user', telegramUsername.trim());
      }

      const res = await fetch('/api/students/telegram-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentName: profile.name,
          studentId: profile.id,
          chatId: chatId.trim(),
          telegramUsername: telegramUsername.trim(),
          password: profile.password,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setLinkResult({
          success: true,
          message: data.message || 'شناسه تلگرام شما با موفقیت به ربات متصل گردید!',
        });
      } else {
        setLinkResult({
          success: false,
          message: data.error || 'خطا در ثبت شناسه تلگرام.',
        });
      }
    } catch (err: any) {
      setLinkResult({
        success: false,
        message: `خطای اتصال به سرور: ${err?.message || err}`,
      });
    } finally {
      setIsLinking(false);
    }
  };

  // Test Ping from Master Bot to this Student's Chat ID
  const handleTestStudentPing = async () => {
    if (!chatId.trim()) {
      setPingResult({
        success: false,
        message: 'لطفاً ابتدا شناسه چت تلگرام خود را وارد و ذخیره کنید.',
      });
      return;
    }

    setIsTestingPing(true);
    setPingResult(null);

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
        setPingResult({
          success: true,
          message: data.message || 'پیام آزمایشی با موفقیت به تلگرام شما ارسال شد! اکنون پیام‌های ربات را چک کنید.',
        });
      } else {
        setPingResult({
          success: false,
          message: data.error || 'خطا در ارسال پیام تست. اطمینان حاصل کنید ربات را در تلگرام استارت کرده‌اید.',
        });
      }
    } catch (err: any) {
      setPingResult({
        success: false,
        message: `خطای شبکه: ${err?.message || err}`,
      });
    } finally {
      setIsTestingPing(false);
    }
  };

  const handleSimSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!simInput.trim() || isSimLoading) return;

    const userText = simInput.trim();
    const userMsg: SimMessage = {
      id: Date.now().toString(),
      sender: 'user',
      text: userText,
      time: new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' }),
    };

    setSimMessages((prev) => [...prev, userMsg]);
    setSimInput('');
    setIsSimLoading(true);

    try {
      const res = await fetch('/api/telegram/webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          update_id: Date.now(),
          message: {
            message_id: Date.now(),
            from: {
              id: Number(chatId) || 12345678,
              first_name: profile.name,
              username: telegramUsername.replace('@', '') || 'student',
            },
            chat: {
              id: Number(chatId) || 12345678,
              first_name: profile.name,
              type: 'private',
            },
            date: Math.floor(Date.now() / 1000),
            text: userText,
          },
        }),
      });

      const data = await res.json();
      const botReplyText = data.botReply || 'گزارش شما دریافت شد و در پرونده مشاوره‌ات ثبت گردید! 🎯';

      const botMsg: SimMessage = {
        id: (Date.now() + 1).toString(),
        sender: 'bot',
        text: botReplyText,
        time: new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' }),
      };
      setSimMessages((prev) => [...prev, botMsg]);
    } catch {
      const botFallbackMsg: SimMessage = {
        id: (Date.now() + 1).toString(),
        sender: 'bot',
        text: `دریافت شد ${profile.name} عزیز! 🌟\nگزارش با متد رتبه‌برترها پردازش و در داشبورد مشاور ثبت شد.`,
        time: new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' }),
      };
      setSimMessages((prev) => [...prev, botFallbackMsg]);
    } finally {
      setIsSimLoading(false);
    }
  };

  const isStudentLinked = Boolean(chatId && profile.telegramChatId === chatId);

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-stone-900 text-white rounded-3xl p-6 sm:p-8 border border-stone-800 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-teal-500/10 rounded-full blur-3xl pointer-events-none -ml-20 -mb-20" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2.5 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold border border-emerald-500/30">
              <Bot className="w-4 h-4 text-emerald-400" />
              ربات تلگرام دستیار مشاور کنکور (Hermes Advisor)
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              اتصال تلگرام دانش‌آموز به ربات اختصاصی مشاور
            </h2>
            <p className="text-stone-300 text-xs sm:text-sm leading-relaxed">
              توکن و هسته ربات توسط مشاور مدیریت می‌شود. برای دریافت گزارش‌ها، کوئیزهای تله‌های کنکور و یادآورهای مطالعه، فقط کافیست شناسه عددی تلگرام (Chat ID) خود را در کادر زیر ثبت کنید.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 shrink-0">
            {/* Master Bot Status Indicator */}
            <div className="p-3.5 rounded-2xl bg-stone-950/80 border border-stone-800 text-xs space-y-1">
              <div className="text-stone-400 text-[11px] flex items-center justify-between gap-2">
                <span>ربات اصلی مشاور:</span>
                <button
                  onClick={fetchMasterBotInfo}
                  className="text-stone-500 hover:text-stone-300 cursor-pointer"
                  title="تازه‌سازی وضعیت"
                >
                  <RefreshCw className={`w-3 h-3 ${isLoadingMasterInfo ? 'animate-spin' : ''}`} />
                </button>
              </div>
              {masterBotInfo.isConfigured && masterBotInfo.botUsername ? (
                <a
                  href={`https://t.me/${masterBotInfo.botUsername}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 text-emerald-400 font-black hover:text-emerald-300 transition-colors"
                >
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>@{masterBotInfo.botUsername}</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              ) : (
                <div className="text-amber-400 font-bold flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-400" />
                  <span>در انتظار اتصال توکن توسط مشاور</span>
                </div>
              )}
            </div>

            {/* Student Link Status */}
            <div className="p-3.5 rounded-2xl bg-stone-950/80 border border-stone-800 text-xs space-y-1">
              <div className="text-stone-400 text-[11px]">وضعیت اتصال شما:</div>
              {chatId ? (
                <div className="flex items-center gap-1.5 text-emerald-400 font-black">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>شناسه ثبت شده ({chatId})</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 text-stone-400 font-medium">
                  <AlertCircle className="w-4 h-4 text-stone-500" />
                  <span>شناسه ثبت نشده</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sub Navigation */}
        <div className="flex flex-wrap gap-2 mt-5 pt-4 border-t border-stone-700/80">
          <button
            onClick={() => setActiveSubTab('student-link')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeSubTab === 'student-link'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                : 'bg-stone-800 hover:bg-stone-700 text-stone-300'
            }`}
          >
            <UserCheck className="w-4 h-4 text-emerald-400" />
            <span>۱. اتصال شناسه من به ربات مشاور</span>
          </button>

          <button
            onClick={() => setActiveSubTab('bot-hub')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeSubTab === 'bot-hub'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                : 'bg-stone-800 hover:bg-stone-700 text-stone-300'
            }`}
          >
            <Activity className="w-4 h-4 text-emerald-400" />
            <span>۲. دستورات و قابلیت‌های هوشمند ربات</span>
          </button>

          <button
            onClick={() => setActiveSubTab('anti-procrastination')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeSubTab === 'anti-procrastination'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                : 'bg-stone-800 hover:bg-stone-700 text-stone-300'
            }`}
          >
            <Flame className="w-4 h-4 text-rose-400" />
            <span>۳. زرادخانه ضد-پشت‌گوش‌انداختن</span>
          </button>

          <button
            onClick={() => setActiveSubTab('telegram-simulator')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeSubTab === 'telegram-simulator'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                : 'bg-stone-800 hover:bg-stone-700 text-stone-300'
            }`}
          >
            <Smartphone className="w-4 h-4 text-emerald-400" />
            <span>۴. شبیه‌ساز چت ربات در مرورگر</span>
          </button>

          <button
            onClick={() => setActiveSubTab('concept-guide')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeSubTab === 'concept-guide'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                : 'bg-stone-800 hover:bg-stone-700 text-stone-300'
            }`}
          >
            <HelpCircle className="w-4 h-4" />
            <span>۵. راهنمای تصویری دریافت شناسه</span>
          </button>
        </div>
      </div>

      {/* SUBTAB 1: STUDENT LINK CHAT ID */}
      {activeSubTab === 'student-link' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fadeIn">
          {/* Main ID Form */}
          <div className="lg:col-span-7 bg-white rounded-3xl p-6 sm:p-7 border border-stone-200 shadow-sm space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-stone-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
                  <UserCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-stone-900 text-sm">ثبت شناسه اختصاصی شما برای دریافت پیام‌ها</h3>
                  <p className="text-xs text-stone-500">فقط کافیست شناسه عددی تلگرام خود را وارد کنید</p>
                </div>
              </div>

              {chatId && (
                <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  ثبت شده
                </span>
              )}
            </div>

            {/* Counselor Master Bot Callout */}
            <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-stone-800 flex items-center gap-1.5">
                  <Bot className="w-4 h-4 text-emerald-600" />
                  ربات تلگرام فعال مشاور:
                </span>
                {masterBotInfo.botUsername ? (
                  <a
                    href={`https://t.me/${masterBotInfo.botUsername}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 font-mono font-bold text-emerald-700 hover:underline bg-emerald-100/70 px-2.5 py-1 rounded-lg"
                  >
                    @{masterBotInfo.botUsername}
                    <ExternalLink className="w-3 h-3" />
                  </a>
                ) : (
                  <span className="text-amber-700 font-bold bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-200">
                    مشاور هنوز ربات را فعال نکرده است
                  </span>
                )}
              </div>
              <p className="text-stone-500 text-[11px] leading-relaxed">
                تمام امور مدیریتی توکن و اتصال به سرور توسط مشاور انجام شده است. شما نیازی به ساخت ربات یا توکن ندارید.
              </p>
            </div>

            <form onSubmit={handleSaveStudentChatId} className="space-y-4">
              {/* Input: Chat ID */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-stone-800">
                  شناسه چت عددی شما در تلگرام (Chat ID) <span className="text-rose-600">*</span>:
                </label>
                <input
                  type="text"
                  dir="ltr"
                  required
                  value={chatId}
                  onChange={(e) => setChatId(e.target.value)}
                  placeholder="مثال: 987654321"
                  className="w-full px-3.5 py-2.5 text-xs font-mono bg-stone-50 border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-stone-900 placeholder:text-stone-400 text-left"
                />
                <p className="text-[11px] text-stone-500 leading-normal">
                  💡 <strong>نحوه دریافت:</strong> در تلگرام به ربات <strong>@userinfobot</strong> یا به ربات مشاور <strong>{masterBotInfo.botUsername ? `@${masterBotInfo.botUsername}` : 'مشاور'}</strong> دکمه Start بزنید تا شناسه عددی شما را نمایش دهد.
                </p>
              </div>

              {/* Input: Optional Telegram Username */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-stone-800">
                  آیدی تلگرام شما (اختیاری):
                </label>
                <input
                  type="text"
                  dir="ltr"
                  value={telegramUsername}
                  onChange={(e) => setTelegramUsername(e.target.value)}
                  placeholder="@student_username"
                  className="w-full px-3.5 py-2.5 text-xs font-mono bg-stone-50 border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-stone-900 placeholder:text-stone-400 text-left"
                />
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex flex-wrap gap-3">
                <button
                  type="submit"
                  disabled={isLinking || !chatId.trim()}
                  className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-sm transition-all cursor-pointer"
                >
                  {isLinking ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>در حال ثبت شناسه...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>ثبت و فعال‌سازی دسترسی تلگرام</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleTestStudentPing}
                  disabled={isTestingPing || !chatId.trim() || !masterBotInfo.botUsername}
                  className="flex items-center gap-2 px-4 py-2.5 border border-stone-300 hover:bg-stone-100 disabled:opacity-50 text-stone-800 text-xs font-bold rounded-xl transition-all cursor-pointer"
                >
                  {isTestingPing ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-stone-600 border-t-transparent rounded-full animate-spin" />
                      <span>در حال ارسال پیام تست...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5 text-emerald-600" />
                      <span>ارسال پیام تست به تلگرام من</span>
                    </>
                  )}
                </button>
              </div>

              {/* Link Feedback */}
              {linkResult && (
                <div
                  className={`p-4 rounded-2xl border text-xs leading-relaxed space-y-1 ${
                    linkResult.success
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                      : 'bg-rose-50 border-rose-200 text-rose-900'
                  }`}
                >
                  <div className="font-bold flex items-center gap-2">
                    {linkResult.success ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> : <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />}
                    <span>{linkResult.message}</span>
                  </div>
                </div>
              )}

              {/* Ping Feedback */}
              {pingResult && (
                <div
                  className={`p-4 rounded-2xl border text-xs leading-relaxed space-y-1 ${
                    pingResult.success
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                      : 'bg-rose-50 border-rose-200 text-rose-900'
                  }`}
                >
                  <div className="font-bold flex items-center gap-2">
                    {pingResult.success ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> : <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />}
                    <span>{pingResult.message}</span>
                  </div>
                </div>
              )}
            </form>
          </div>

          {/* Instructions and Quick Start Card */}
          <div className="lg:col-span-5 bg-gradient-to-br from-stone-900 to-stone-950 text-white rounded-3xl p-6 sm:p-7 border border-stone-800 shadow-sm space-y-5">
            <div className="flex items-center gap-2.5 pb-3 border-b border-stone-800">
              <div className="p-2 rounded-xl bg-emerald-950 border border-emerald-800 text-emerald-400">
                <Smartphone className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">۳ مرحله آسان تا اتصال به ربات مشاور</h3>
                <p className="text-[11px] text-stone-400">کمتر از ۳۰ ثانیه بدون نیاز به تنظیمات پیچیده</p>
              </div>
            </div>

            <div className="space-y-4 text-xs">
              <div className="flex items-start gap-3 p-3 rounded-2xl bg-stone-900/80 border border-stone-800">
                <span className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                  ۱
                </span>
                <div className="space-y-1 flex-1">
                  <strong className="text-white block">استارت ربات در تلگرام:</strong>
                  <p className="text-stone-300 text-[11px] leading-relaxed">
                    {masterBotInfo.botUsername ? (
                      <>
                        روی آیدی{' '}
                        <a
                          href={`https://t.me/${masterBotInfo.botUsername}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-emerald-400 font-bold underline"
                        >
                          @{masterBotInfo.botUsername}
                        </a>{' '}
                        کلیک کنید و دکمه Start را بزنید.
                      </>
                    ) : (
                      'آیدی ربات توسط مشاور اعلام خواهد شد.'
                    )}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-2xl bg-stone-900/80 border border-stone-800">
                <span className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                  ۲
                </span>
                <div className="space-y-1 flex-1">
                  <strong className="text-white block">کپی شناسه عددی:</strong>
                  <p className="text-stone-300 text-[11px] leading-relaxed">
                    ربات شناسه عددی شما (Chat ID) را به شما اعلام می‌کند. آن را کپی کنید.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-2xl bg-stone-900/80 border border-stone-800">
                <span className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                  ۳
                </span>
                <div className="space-y-1 flex-1">
                  <strong className="text-white block">ثبت در کادر و دریافت گزارش‌ها:</strong>
                  <p className="text-stone-300 text-[11px] leading-relaxed">
                    شناسه را در کادر فرم سمت راست قرار داده و روی «ثبت و فعال‌سازی» کلیک کنید.
                  </p>
                </div>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-emerald-950/40 border border-emerald-800 text-[11px] text-emerald-200 leading-relaxed flex items-start gap-2">
              <Sparkles className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>
                <strong>مزایای اتصال:</strong> بعد از اتصال، گزارش‌های روزانه شما به طور خودکار به پنل مشاور ارسال شده و مشاور از طریق تلگرام تحلیل‌های اختصاصی برایتان می‌فرستد.
              </span>
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB 2: BOT COMMANDS & LIVE HUB */}
      {activeSubTab === 'bot-hub' && (
        <TelegramBotLiveHub
          profile={profile}
          botToken=""
          chatId={chatId}
          botUsername={masterBotInfo.botUsername || undefined}
          isVerified={Boolean(chatId)}
        />
      )}

      {/* SUBTAB 3: ANTI-PROCRASTINATION ARSENAL */}
      {activeSubTab === 'anti-procrastination' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fadeIn">
          {/* 2-Minute Micro-Commitment Launcher */}
          <div className="lg:col-span-7 bg-white rounded-3xl p-6 sm:p-7 border border-stone-200 shadow-sm space-y-6">
            <div className="flex items-center gap-2.5 pb-4 border-b border-stone-100">
              <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-700 flex items-center justify-center font-bold">
                <Flame className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-stone-900 text-sm">لانچر پرتاب ۲ دقیقه‌ای (قانون غلبه بر اینرسی مغز)</h3>
                <p className="text-xs text-stone-500">تنها با ۲ دقیقه شروع متمرکز، ۹۰٪ مقاومت ذهنی شکسته می‌شود</p>
              </div>
            </div>

            <div className="bg-stone-900 text-white rounded-2xl p-6 text-center space-y-4">
              <div className="text-xs text-stone-400">تایمر پرتاب میکروبازه شروع:</div>
              <div className="font-mono text-4xl sm:text-5xl font-black text-emerald-400 tracking-wider">
                {Math.floor(launcherSeconds / 60)
                  .toString()
                  .padStart(2, '0')}
                :
                {(launcherSeconds % 60).toString().padStart(2, '0')}
              </div>

              <div className="flex items-center justify-center gap-3 pt-2">
                {!activeLauncher ? (
                  <button
                    type="button"
                    onClick={() => {
                      setActiveLauncher(true);
                      setCommitmentSaved(false);
                    }}
                    className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs rounded-xl transition-all shadow-md cursor-pointer flex items-center gap-2"
                  >
                    <Zap className="w-4 h-4" />
                    <span>شروع ۲ دقیقه تعهد شروع پارت</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setActiveLauncher(false);
                      setLauncherSeconds(120);
                    }}
                    className="px-5 py-2 bg-stone-800 hover:bg-stone-700 text-stone-300 font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center gap-2"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>توقف و تنظیم مجدد</span>
                  </button>
                )}
              </div>
            </div>

            <div className="space-y-3">
              <label className="block text-xs font-bold text-stone-800">
                قورباغه امروز من (سخت‌ترین یا مهم‌ترین پارت درسی):
              </label>
              <input
                type="text"
                value={commitmentText}
                onChange={(e) => setCommitmentText(e.target.value)}
                placeholder="مثال: تست‌های سخت فصل حرکت‌شناسی فیزیک (۳۰ تست)..."
                className="w-full px-3.5 py-2.5 text-xs bg-stone-50 border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-stone-900 placeholder:text-stone-400"
              />
              <button
                type="button"
                onClick={() => setCommitmentSaved(true)}
                disabled={!commitmentText.trim()}
                className="px-4 py-2 bg-stone-800 hover:bg-stone-900 disabled:opacity-40 text-white text-xs font-bold rounded-xl transition-all cursor-pointer"
              >
                {commitmentSaved ? '✅ در حافظه پارت ذخیره شد' : 'ثبت قورباغه پارت'}
              </button>
            </div>
          </div>

          {/* Psychology of Avoidance Checklist */}
          <div className="lg:col-span-5 bg-white rounded-3xl p-6 sm:p-7 border border-stone-200 shadow-sm space-y-4">
            <div className="flex items-center gap-2.5 pb-3 border-b border-stone-100">
              <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center font-bold">
                <Target className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-stone-900 text-sm">ریشه‌یابی و خنثی‌سازی فرار ذهنی</h3>
                <p className="text-xs text-stone-500">دلیل حس مقاومت را انتخاب کنید تا پادزهر علمی ارائه شود</p>
              </div>
            </div>

            <div className="space-y-2 text-xs">
              {[
                { id: 'hard', title: '۱. مبحث خیلی سخت یا گنگ است', cure: 'پادزهر: فقط ۲ مثال حل‌شده را از روی پاسخنامه رونویسی کنید بدون الزام به حل ذهنی.' },
                { id: 'huge', title: '۲. حجم کار خیلی زیاد و ترسناک است', cure: 'پادزهر: تکه‌تکه کنید. فقط ۵ تست اول را هدف‌گذاری کنید نه کل ۵۰ تست.' },
                { id: 'perfection', title: '۳. کمال‌گرایی (می‌ترسم غلط زیاد بزنم)', cure: 'پادزهر: هدف مرحله یادگیری تست‌زنی، پیدا کردن غلط‌هاست نه درصد ۱۰۰.' },
                { id: 'tired', title: '۴. افت انرژی و بی‌حوصلگی', cure: 'پادزهر: ۵ دقیقه راه رفتن + نوشیدن یک لیوان آب خنک + عوض کردن درس به درس جذاب‌تر.' },
              ].map((item) => (
                <div
                  key={item.id}
                  onClick={() => setSelectedAvoidanceReason(selectedAvoidanceReason === item.id ? null : item.id)}
                  className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
                    selectedAvoidanceReason === item.id
                      ? 'bg-amber-50/80 border-amber-300 text-amber-950'
                      : 'bg-stone-50 border-stone-200 text-stone-700 hover:bg-stone-100/70'
                  }`}
                >
                  <div className="font-bold flex items-center justify-between">
                    <span>{item.title}</span>
                    <span className="text-[10px] text-stone-400">
                      {selectedAvoidanceReason === item.id ? 'بستن' : 'مشاهده پادزهر'}
                    </span>
                  </div>
                  {selectedAvoidanceReason === item.id && (
                    <p className="text-[11px] mt-2 pt-2 border-t border-amber-200 text-amber-900 font-medium leading-relaxed">
                      💡 {item.cure}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB 4: IN-BROWSER TELEGRAM SIMULATOR */}
      {activeSubTab === 'telegram-simulator' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fadeIn">
          {/* Chat Simulator Window */}
          <div className="lg:col-span-8 bg-stone-950 rounded-3xl p-4 sm:p-6 border border-stone-800 shadow-xl flex flex-col h-[520px]">
            <div className="flex items-center justify-between pb-3 border-b border-stone-800 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs">
                  <Bot className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-black text-white">ربات هوشمند مشاور کنکور</div>
                  <div className="text-[10px] text-emerald-400">پاسخگویی برخط هوش مصنوعی</div>
                </div>
              </div>

              <div className="text-[11px] text-stone-500 font-mono">
                شبیه‌ساز مرورگر
              </div>
            </div>

            {/* Message Stream */}
            <div className="flex-1 overflow-y-auto py-4 space-y-3 px-1 no-scrollbar">
              {simMessages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-xs leading-relaxed ${
                      msg.sender === 'user'
                        ? 'bg-emerald-600 text-white rounded-br-none'
                        : 'bg-stone-900 border border-stone-800 text-stone-200 rounded-bl-none whitespace-pre-wrap'
                    }`}
                  >
                    <p>{msg.text}</p>
                    <div className={`text-[9px] mt-1 ${msg.sender === 'user' ? 'text-emerald-200' : 'text-stone-500'} text-left ltr`}>
                      {msg.time}
                    </div>
                  </div>
                </div>
              ))}
              {isSimLoading && (
                <div className="flex justify-start">
                  <div className="bg-stone-900 border border-stone-800 text-stone-400 rounded-2xl px-4 py-2 text-xs flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-bounce" />
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-bounce delay-100" />
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-bounce delay-200" />
                    <span>مشاور در حال نوشتن پاسخ...</span>
                  </div>
                </div>
              )}
            </div>

            {/* Sim Form */}
            <form onSubmit={handleSimSend} className="pt-3 border-t border-stone-800 shrink-0 flex items-center gap-2">
              <input
                type="text"
                value={simInput}
                onChange={(e) => setSimInput(e.target.value)}
                placeholder="یک پیام بنویسید (مثلاً: /report یا ۵ ساعت زیست خواندم)..."
                className="flex-1 px-3.5 py-2.5 rounded-xl bg-stone-900 border border-stone-800 text-white text-xs focus:border-emerald-500 focus:outline-none placeholder:text-stone-500"
              />
              <button
                type="submit"
                disabled={!simInput.trim() || isSimLoading}
                className="p-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white cursor-pointer transition-all shrink-0"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>

          {/* Quick Click Commands */}
          <div className="lg:col-span-4 bg-white rounded-3xl p-6 border border-stone-200 shadow-sm space-y-3">
            <h4 className="text-xs font-bold text-stone-900 pb-2 border-b border-stone-100">
              دستورات سریع جهت تست در شبیه‌ساز:
            </h4>
            <div className="space-y-2 text-xs">
              {[
                { cmd: '/start', desc: 'شروع و دریافت منوی شیشه‌ای' },
                { cmd: '/quiz', desc: 'کوئیز تله‌های کنکور' },
                { cmd: '/report', desc: 'الگوی ارسال کارنامه شبانه' },
                { cmd: 'امروز ۶ ساعت خوندم با ۱۲۰ تست فیزیک و شیمی', desc: 'گزارش مطالعه واقعی' },
                { cmd: '/frog', desc: 'زرادخانه ضد اهمال‌کاری' },
                { cmd: '/plan', desc: 'استراتژی و برنامه فردا' },
              ].map((item, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setSimInput(item.cmd)}
                  className="w-full text-right p-2.5 rounded-xl border border-stone-200 hover:border-emerald-400 hover:bg-emerald-50/50 transition-all cursor-pointer group"
                >
                  <div className="font-mono text-[11px] font-bold text-emerald-700 group-hover:text-emerald-800">
                    {item.cmd}
                  </div>
                  <div className="text-[10px] text-stone-500 mt-0.5">
                    {item.desc}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB 5: STEP-BY-STEP CONCEPT GUIDE */}
      {activeSubTab === 'concept-guide' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-stone-200 shadow-sm space-y-6 animate-fadeIn">
          <div className="flex items-center gap-3 pb-4 border-b border-stone-100">
            <div className="w-10 h-10 rounded-2xl bg-teal-50 text-teal-700 flex items-center justify-center font-bold">
              <HelpCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-stone-900 text-base">راهنمای تصویری پیدا کردن شناسه عددی تلگرام (Chat ID)</h3>
              <p className="text-xs text-stone-500">شناسه عددی چیست و چگونه در چند ثانیه آن را به دست آوریم؟</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="p-5 rounded-2xl bg-stone-50 border border-stone-200 space-y-3">
              <div className="w-7 h-7 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs">
                ۱
              </div>
              <h4 className="font-bold text-xs text-stone-900">ربات UserInfoBot</h4>
              <p className="text-stone-600 text-xs leading-relaxed">
                در تلگرام عبارت <strong>@userinfobot</strong> را جستجو کرده و پیام Start بفرستید.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-stone-50 border border-stone-200 space-y-3">
              <div className="w-7 h-7 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs">
                ۲
              </div>
              <h4 className="font-bold text-xs text-stone-900">کپی فیلد Id</h4>
              <p className="text-stone-600 text-xs leading-relaxed">
                ربات پاسخی حاوی نام، آیدی و یک عدد چند رقمی به نام <strong>Id</strong> برای شما می‌فرستد.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-stone-50 border border-stone-200 space-y-3">
              <div className="w-7 h-7 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs">
                ۳
              </div>
              <h4 className="font-bold text-xs text-stone-900">ثبت در سامانه کنکور</h4>
              <p className="text-stone-600 text-xs leading-relaxed">
                عدد کپی‌شده را در زبانه «۱. اتصال شناسه من به ربات مشاور» قرار دهید و دکمه تایید را بزنید.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
