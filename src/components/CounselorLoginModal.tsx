import React, { useState } from 'react';
import { ShieldCheck, Lock, User, Key, Eye, EyeOff, AlertCircle, Sparkles, X } from 'lucide-react';

interface CounselorLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  adminPasscode: string;
  onSuccessfulLogin: () => void;
}

export const CounselorLoginModal: React.FC<CounselorLoginModalProps> = ({
  isOpen,
  onClose,
  adminPasscode,
  onSuccessfulLogin,
}) => {
  const [username, setUsername] = useState('مشاور');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const [remainingAttempts, setRemainingAttempts] = useState<number | null>(null);
  const [lockoutTimer, setLockoutTimer] = useState<number | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg('');

    const trimmedUser = username.trim().toLowerCase();
    const trimmedPass = password.trim();

    try {
      // First attempt server validation with rate limiting & PBKDF2
      let res = await fetch('/api/counselor/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: trimmedUser || 'مشاور', password: trimmedPass }),
      });

      // If login by username failed, attempt direct passcode verification
      if (!res.ok) {
        const verifyRes = await fetch('/api/counselor/verify-passcode', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ passcode: trimmedPass }),
        });
        if (verifyRes.ok) {
          res = verifyRes;
        }
      }

      // Read whatever the server actually said, success or failure, and
      // trust it. NOTE: this is deliberately NOT gated on `res.ok` — a
      // reachable server answering "401 wrong password" is a definitive
      // answer and must never be treated the same as "server unavailable"
      // (which previously let it fall through to the hardcoded passcodes
      // below).
      const contentType = res.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const data = await res.json();
        if (res.ok && (data.success || data.valid)) {
          if (data.token) {
            sessionStorage.setItem('study_advisor_counselor_token', data.token);
            localStorage.setItem('study_advisor_counselor_token', data.token);
          }
          setIsLoading(false);
          onSuccessfulLogin();
          return;
        }
        if (res.status === 429) {
          setIsLoading(false);
          setLockoutTimer(data.lockoutMinutes || 15);
          setErrorMsg(data.error || 'به علت تلاش‌های ناموفق مکرر، ورود به پنل موقتاً مسدود شد.');
          return;
        }
        if (data.remainingAttempts !== undefined) {
          setRemainingAttempts(data.remainingAttempts);
          setErrorMsg(`${data.error || 'رمز نادرست است.'} (${data.remainingAttempts} فرصت باقی‌مانده)`);
          setIsLoading(false);
          return;
        }

        // Any other definitive rejection (e.g. a plain 401) — trust the
        // server and stop here instead of falling through below.
        setIsLoading(false);
        setErrorMsg(data.error || 'رمز عبور یا نام کاربری مشاور نادرست است.');
        return;
      }
    } catch (err) {
      console.warn('Server offline or static deployment, using local fallback authentication', err);
    }

    // Local static fallback authentication (for Vercel static deployments or
    // offline use) — only reached when the server could not be contacted at
    // all (network exception above, or a non-JSON/no response). No universal
    // override codes here: only the real admin passcode is accepted.
    const validLocalPasscodes = [adminPasscode.trim().toLowerCase()];

    if (validLocalPasscodes.includes(trimmedPass.toLowerCase())) {
      sessionStorage.setItem('study_advisor_counselor_token', 'local_static_counselor_token');
      localStorage.setItem('study_advisor_counselor_token', 'local_static_counselor_token');
      setIsLoading(false);
      onSuccessfulLogin();
      return;
    }

    setIsLoading(false);
    setErrorMsg('رمز عبور یا نام کاربری مشاور نادرست است.');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/80 backdrop-blur-md animate-fadeIn">
      <div className="bg-stone-900 text-white rounded-3xl max-w-md w-full p-6 sm:p-8 border border-stone-800 shadow-2xl relative overflow-hidden space-y-6">
        {/* Glow decoration */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 left-5 p-2 rounded-full text-stone-400 hover:text-white hover:bg-stone-800 transition-colors cursor-pointer"
          title="بستن"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header Badge */}
        <div className="text-center space-y-2">
          <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-emerald-600 to-teal-600 text-white flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20 border border-emerald-400/20">
            <ShieldCheck className="w-8 h-8 text-white" />
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-300 text-xs font-bold border border-emerald-500/25">
            <Sparkles className="w-3.5 h-3.5" />
            <span>پرتال مدیریت ارشد مشاور</span>
          </div>
          <h3 className="text-xl sm:text-2xl font-black text-white">ورود اختصاصی مشاور</h3>
          <p className="text-stone-300 text-xs leading-relaxed max-w-xs mx-auto">
            جهت مشاهده آمار استفاده و فعالیت دانش‌آموزان، مدیریت برنامه‌ها و تنظیمات، وارد شوید.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5 text-right">
            <label className="text-xs font-bold text-stone-300 flex items-center justify-between">
              <span>نام کاربری مشاور:</span>
              <span className="text-[10px] text-stone-400 font-normal">پیش‌فرض: مشاور</span>
            </label>
            <div className="relative">
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="مشاور یا نام کاربری"
                className="w-full px-4 py-3 rounded-2xl border border-stone-700 bg-stone-800/90 text-white text-sm focus:outline-emerald-500 focus:border-emerald-500 transition-all text-right"
                required
              />
              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
            </div>
          </div>

          <div className="space-y-1.5 text-right">
            <label className="text-xs font-bold text-stone-300 flex items-center justify-between">
              <span>رمز عبور مشاور:</span>
              <span className="text-[10px] text-stone-400 font-normal">پیش‌فرض: 1234</span>
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setErrorMsg('');
                }}
                placeholder="رمز عبور مدیریت"
                className="w-full pl-11 pr-4 py-3 rounded-2xl border border-stone-700 bg-stone-800/90 text-white font-mono text-center tracking-widest text-sm focus:outline-emerald-500 focus:border-emerald-500 transition-all"
                autoFocus
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-white p-1 cursor-pointer"
                title={showPassword ? 'مخفی کردن' : 'نمایش'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {errorMsg && (
            <div className="text-xs font-bold text-rose-300 bg-rose-950/70 p-3 rounded-2xl border border-rose-800 flex items-center gap-2 animate-fadeIn">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-sm shadow-lg shadow-emerald-900/30 transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-60"
          >
            <Lock className="w-4 h-4 text-emerald-200" />
            <span>{isLoading ? 'در حال ورود...' : 'ورود به پنل اختصاصی مشاور'}</span>
          </button>
        </form>

        {/* Security Note */}
        <div className="text-center pt-2 border-t border-stone-800 text-[11px] text-stone-400 flex flex-col items-center gap-1">
          <div className="flex items-center gap-1.5 text-emerald-400 font-semibold">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>محافظت چندلایه سرور با هش PBKDF2 و قفل خودکار Brute-Force</span>
          </div>
          <span>این بخش فقط برای مشاور آموزشگاه و ناظر تحصیلی در دسترس است.</span>
        </div>
      </div>
    </div>
  );
};
