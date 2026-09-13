import React, { useState } from 'react';
import {
  Lock,
  Key,
  ShieldCheck,
  Eye,
  EyeOff,
  User,
  Sparkles,
  Smartphone,
  Laptop,
  Tablet,
  AlertOctagon,
  RefreshCw,
  ShieldAlert,
  Trash2
} from 'lucide-react';
import { BoundDevice, StudentProfile } from '../types';
import { getDeviceFingerprint } from '../utils/deviceFingerprint';
import { DeviceSessionManagerModal } from './DeviceSessionManagerModal';

interface StudentLoginOverlayProps {
  profile: StudentProfile;
  adminPasscode: string;
  onAuthenticate: () => void;
  onOpenMasterAdmin: () => void;
  onSwitchProfile?: (newProfile: StudentProfile) => void;
}

export const StudentLoginOverlay: React.FC<StudentLoginOverlayProps> = ({
  profile,
  adminPasscode,
  onAuthenticate,
  onOpenMasterAdmin,
  onSwitchProfile,
}) => {
  const [passwordInput, setPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isCounselorLogin, setIsCounselorLogin] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [remainingAttempts, setRemainingAttempts] = useState<number | null>(null);

  // New Student Registration Mode
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [regName, setRegName] = useState('');
  const [regField, setRegField] = useState('علوم تجربی');
  const [regPassword, setRegPassword] = useState('1234');
  const [regInviteCode, setRegInviteCode] = useState('');

  // Device Lockout State
  const [isDeviceBlocked, setIsDeviceBlocked] = useState(false);
  const [blockedDevicesList, setBlockedDevicesList] = useState<BoundDevice[]>([]);
  const [maxDevicesQuota, setMaxDevicesQuota] = useState(2);
  const [isDeviceModalOpen, setIsDeviceModalOpen] = useState(false);

  const expectedStudentPassword = profile.password || '1234';

  // Quick Register Handler
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = regName.trim();
    const cleanInvite = regInviteCode.trim();

    if (!cleanName) {
      setErrorMsg('لطفاً نام دانش‌آموز را وارد فرمایید.');
      return;
    }

    if (!cleanInvite) {
      setErrorMsg('جهت جلوگیری از حملات و ثبت‌نام افراد غیرمجاز، ورود کد تایید یا دعوت‌نامه مشاور الزامی است.');
      return;
    }

    setIsVerifying(true);
    setErrorMsg('');

    try {
      const res = await fetch('/api/students/quick-register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: cleanName,
          fieldOfStudy: regField,
          password: regPassword.trim() || '1234',
          inviteCode: cleanInvite,
        }),
      });

      const data = await res.json();
      setIsVerifying(false);

      if (res.ok && data.success && data.student) {
        if (data.studentToken) {
          sessionStorage.setItem('study_advisor_student_token', data.studentToken);
          localStorage.setItem('study_advisor_student_token', data.studentToken);
        }
        if (onSwitchProfile) {
          onSwitchProfile(data.student);
        }
        onAuthenticate();
      } else {
        setErrorMsg(data.error || 'خطا در ثبت‌نام دانش‌آموز.');
      }
    } catch (err) {
      setIsVerifying(false);
      setErrorMsg('خطا در برقراری ارتباط با سرور.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = passwordInput.trim();
    if (!trimmed) return;

    if (isCounselorLogin) {
      setIsVerifying(true);
      setErrorMsg('');
      try {
        const res = await fetch('/api/counselor/verify-passcode', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ passcode: trimmed }),
        });
        const data = await res.json();
        setIsVerifying(false);
        if (res.ok && data.valid) {
          if (data.token) {
            sessionStorage.setItem('study_advisor_counselor_token', data.token);
            localStorage.setItem('study_advisor_counselor_token', data.token);
          }
          onAuthenticate();
          onOpenMasterAdmin();
          return;
        } else {
          setErrorMsg(data.error || 'رمز مدیریت مشاور اشتباه است.');
          return;
        }
      } catch (err) {
        setIsVerifying(false);
        setErrorMsg('خطا در ارتباط با سرور.');
        return;
      }
    }

    setIsVerifying(true);
    setErrorMsg('');
    setIsDeviceBlocked(false);

    // Collect device fingerprint
    let devInfo: any = null;
    try {
      devInfo = await getDeviceFingerprint();
    } catch (e) {
      // Fallback
    }

    // Attempt secure server-side verification with anti brute-force & device binding shield
    try {
      const res = await fetch('/api/students/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentKey: profile.id || profile.name,
          password: trimmed,
          deviceInfo: devInfo,
        }),
      });

      const contentType = res.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        // NOTE: we deliberately do NOT gate this on `res.ok`. A 401/403/etc.
        // is still a definitive, reachable-server answer and must be trusted
        // as-is — it must never fall through to the local fallback below,
        // which previously let ANY non-200 response (including "wrong
        // password") masquerade as "server unavailable".
        const data = await res.json();

        if (res.ok && data.success) {
          if (data.studentToken) {
            sessionStorage.setItem('study_advisor_student_token', data.studentToken);
            localStorage.setItem('study_advisor_student_token', data.studentToken);
          }
          setIsVerifying(false);
          setErrorMsg('');
          onAuthenticate();
          return;
        }

        // Check if blocked specifically due to device quota (e.g. 3rd device)
        if (res.status === 403 && data.deviceBlocked) {
          setIsVerifying(false);
          setIsDeviceBlocked(true);
          setMaxDevicesQuota(data.maxAllowedDevices || 2);
          setBlockedDevicesList(data.boundDevices || []);
          setErrorMsg(data.error || 'سقف تعداد دستگاه‌های فعال برای این حساب پر شده است.');
          return;
        }

        if (res.status === 429) {
          setIsVerifying(false);
          setErrorMsg(data.error || 'به دلیل تلاش‌های مکرر، ورود موقتاً مسدود گردید.');
          return;
        }

        if (data.remainingAttempts !== undefined) {
          setRemainingAttempts(data.remainingAttempts);
          setErrorMsg(`${data.error || 'رمز عبور نادرست است.'} (${data.remainingAttempts} فرصت باقی‌مانده)`);
          setIsVerifying(false);
          return;
        }

        // Any other definitive rejection from the server (e.g. a plain 401
        // with no extra fields) — trust it and stop here.
        setIsVerifying(false);
        setErrorMsg(data.error || 'رمز عبور وارد شده اشتباه است.');
        return;
      }
    } catch (e) {
      // Genuine network failure (server truly unreachable) — fall through
      // to the local offline fallback below. A reachable server that
      // answered with JSON (even a non-200 status) already returned above
      // and never reaches this point.
    }

    // Local fallback for student password — only reached when the server
    // could not be contacted at all. No universal override codes here:
    // only this student's actual (or default) password is accepted.
    const validStudentPasses = [expectedStudentPassword.trim().toLowerCase()];

    if (validStudentPasses.includes(trimmed.toLowerCase())) {
      setIsVerifying(false);
      setErrorMsg('');
      onAuthenticate();
    } else {
      setIsVerifying(false);
      setErrorMsg('رمز عبور وارد شده اشتباه است.');
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/85 backdrop-blur-xl animate-fadeIn">
        <div className="bg-stone-900 text-white rounded-3xl max-w-md w-full p-6 sm:p-8 border border-stone-800 shadow-2xl relative overflow-hidden text-center space-y-6">
          {/* Glow backdrop */}
          <div className="absolute top-0 right-0 w-60 h-60 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

          {/* Lock / Device Blocked Icon badge */}
          <div
            className={`w-16 h-16 rounded-3xl flex items-center justify-center mx-auto shadow-lg transition-all ${
              isDeviceBlocked
                ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
            }`}
          >
            {isDeviceBlocked ? <AlertOctagon className="w-8 h-8" /> : <Lock className="w-8 h-8" />}
          </div>

          {/* Student Profile Overview */}
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-300 text-xs font-bold border border-emerald-500/20">
              <User className="w-3.5 h-3.5 text-emerald-400" />
              <span>حساب کاربری اختصاصی</span>
            </div>

            {profile.isPendingInitialSync ? (
              <div className="py-4 space-y-3">
                <div className="flex items-center justify-center gap-2 text-emerald-400 font-bold text-xs">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>در حال دریافت و تایید اطلاعات حساب کاربری از سرور مشاور...</span>
                </div>
                <p className="text-[11px] text-stone-400">لطفاً چند لحظه صبر نمایید</p>
              </div>
            ) : (
              <h3 className="text-xl sm:text-2xl font-black text-white">
                دانش‌آموز: {profile.name}
              </h3>
            )}

            {!profile.isPendingInitialSync && (
              <p className="text-stone-300 text-xs leading-relaxed max-w-sm mx-auto">
                {profile.grade} • {profile.fieldOfStudy}
                {profile.targetGoal && <span className="block text-emerald-400 font-semibold mt-1">🎯 {profile.targetGoal}</span>}
              </p>
            )}
          </div>

          {/* Device Blocked View (Max 2 Devices Enforcement Notice) */}
          {isDeviceBlocked ? (
            <div className="space-y-4 text-right bg-stone-950/60 p-4 rounded-2xl border border-rose-900/60 animate-fadeIn">
              <div className="text-xs text-rose-300 font-bold flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
                <span>دسترسی مسدود شد: سقف مجاز دستگاه‌ها تکمیل است</span>
              </div>

              <p className="text-[11px] text-stone-300 leading-relaxed">
                این حساب کاربری قبلاً روی <strong className="text-white">{maxDevicesQuota} دستگاه مجاز</strong> قفل
                شده است. جهت جلوگیری از اشتراک‌گذاری لینک، ورود از دستگاه جدید امکان‌پذیر نیست.
              </p>

              {/* Show list of registered devices */}
              {blockedDevicesList.length > 0 && (
                <div className="space-y-1.5 pt-1">
                  <span className="text-[10px] text-stone-400 font-bold">دستگاه‌های ثبت‌شده فعلی شما:</span>
                  {blockedDevicesList.map((dev, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-2 rounded-xl bg-stone-900 border border-stone-800 text-xs text-stone-300"
                    >
                      <span className="font-bold flex items-center gap-1.5">
                        {dev.deviceType === 'mobile' ? (
                          <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
                        ) : dev.deviceType === 'tablet' ? (
                          <Tablet className="w-3.5 h-3.5 text-sky-400" />
                        ) : (
                          <Laptop className="w-3.5 h-3.5 text-indigo-400" />
                        )}
                        {dev.deviceName}
                      </span>
                      <span className="text-[10px] text-stone-500 font-mono">
                        {dev.os} • {dev.browser}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex flex-col gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsDeviceModalOpen(true)}
                  className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-md transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>مدیریت و آزادسازی نشست قبلی (با رمز عبور)</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsDeviceBlocked(false);
                    setErrorMsg('');
                  }}
                  className="w-full py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-bold transition-all cursor-pointer"
                >
                  تلاش مجدد
                </button>
              </div>
            </div>
          ) : isRegisterMode ? (
            /* Registration Form for New Students */
            <form onSubmit={handleRegisterSubmit} className="space-y-3.5 pt-1 text-right animate-fadeIn">
              <div className="flex items-center justify-between pb-1 border-b border-stone-800">
                <span className="text-xs font-bold text-emerald-400">ثبت‌نام دانش‌آموز جدید در سامانه</span>
                <button
                  type="button"
                  onClick={() => {
                    setIsRegisterMode(false);
                    setErrorMsg('');
                  }}
                  className="text-[11px] text-stone-400 hover:text-white cursor-pointer"
                >
                  بازگشت به ورود
                </button>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-stone-300">نام و نام خانوادگی:</label>
                <input
                  type="text"
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  placeholder="مثال: سارا محمدی"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-700 bg-stone-800 text-white text-xs focus:outline-emerald-500 focus:border-emerald-500 transition-all text-right"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-stone-300">رشته تحصیلی:</label>
                <select
                  value={regField}
                  onChange={(e) => setRegField(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-700 bg-stone-800 text-white text-xs focus:outline-emerald-500 focus:border-emerald-500 transition-all text-right"
                >
                  <option value="علوم تجربی">علوم تجربی</option>
                  <option value="ریاضی و فیزیک">ریاضی و فیزیک</option>
                  <option value="علوم انسانی">علوم انسانی</option>
                  <option value="هنر و زبان">هنر و منحصراً زبان</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-stone-300 flex items-center justify-between">
                  <span>رمز عبور دلخواه:</span>
                  <span className="text-[10px] text-stone-400 font-normal">پیش‌فرض: 1234</span>
                </label>
                <input
                  type="text"
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  placeholder="رمز ورود دلخواه (مثلاً 1234)"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-700 bg-stone-800 text-white text-xs font-mono text-center tracking-wider focus:outline-emerald-500 focus:border-emerald-500 transition-all"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-stone-300 flex items-center justify-between">
                  <span>کد تاییدیه یا دعوت مشاور:</span>
                  <span className="text-[10px] text-amber-400 font-semibold">الزامی (ضد دیداس و بات)</span>
                </label>
                <input
                  type="text"
                  value={regInviteCode}
                  onChange={(e) => setRegInviteCode(e.target.value)}
                  placeholder="کد دعوت ارائه‌شده توسط مشاور"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-700 bg-stone-800 text-white text-xs font-mono text-center tracking-wider focus:outline-emerald-500 focus:border-emerald-500 transition-all"
                  required
                />
              </div>

              {errorMsg && (
                <div className="text-xs font-bold text-rose-400 bg-rose-950/70 p-2 rounded-xl border border-rose-800 animate-fadeIn">
                  {errorMsg}
                </div>
              )}

              <button
                type="submit"
                disabled={isVerifying}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white font-bold text-xs shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-60"
              >
                <Sparkles className="w-4 h-4 text-emerald-200" />
                <span>{isVerifying ? 'در حال تایید و ثبت‌نام...' : 'ایجاد حساب و ورود امن'}</span>
              </button>
            </form>
          ) : (
            /* Standard Login Form */
            <form onSubmit={handleSubmit} className="space-y-3.5 pt-1">
              <div className="space-y-1.5 text-right">
                <label className="text-xs font-bold text-stone-300 flex items-center justify-between">
                  <span>{isCounselorLogin ? 'رمز مدیریت مشاور را وارد کنید:' : 'رمز ورود اختصاصی اکانت:'}</span>
                  <span className="text-[10px] text-stone-400 font-normal">
                    {isCounselorLogin ? 'رمز عمومی مدیریت' : 'پیش‌فرض: 1234'}
                  </span>
                </label>

                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={passwordInput}
                    onChange={(e) => {
                      setPasswordInput(e.target.value);
                      setErrorMsg('');
                    }}
                    placeholder={isCounselorLogin ? 'رمز مدیریت مشاور' : 'رمز عبور خود را وارد کنید'}
                    className="w-full pl-10 pr-4 py-3 rounded-2xl border border-stone-700 bg-stone-800 text-white font-mono text-center tracking-widest text-sm focus:outline-emerald-500 focus:border-emerald-500 transition-all"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-white p-1 cursor-pointer"
                    title={showPassword ? 'مخفی کردن رمز' : 'نمایش رمز'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {errorMsg && (
                <div className="text-xs font-bold text-rose-400 bg-rose-950/70 p-2.5 rounded-xl border border-rose-800 animate-fadeIn">
                  {errorMsg}
                </div>
              )}

              <button
                type="submit"
                disabled={isVerifying}
                className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-sm shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-60"
              >
                <ShieldCheck className="w-4 h-4 text-emerald-200" />
                <span>
                  {isVerifying
                    ? 'در حال اعتبارسنجی دستگاه و رمز...'
                    : isCounselorLogin
                    ? 'تأیید و ورود مشاور'
                    : 'ورود امن به پنل دانش‌آموز'}
                </span>
              </button>

              {/* Registration button for new students */}
              {!isCounselorLogin && (
                <div className="pt-2 flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsRegisterMode(true);
                      setErrorMsg('');
                    }}
                    className="w-full py-2 px-3 rounded-xl bg-stone-800/80 hover:bg-stone-800 border border-stone-700 text-stone-300 hover:text-white font-medium text-xs transition-all cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <User className="w-3.5 h-3.5 text-teal-400" />
                    <span>دانش‌آموز جدید هستید؟ ثبت‌نام با کد تایید مشاور</span>
                  </button>
                </div>
              )}
            </form>
          )}

          {/* Counselor Override Link */}
          <div className="pt-2 border-t border-stone-800/80 flex flex-col gap-2">
            <button
              type="button"
              onClick={() => {
                setIsCounselorLogin(!isCounselorLogin);
                setIsDeviceBlocked(false);
                setPasswordInput('');
                setErrorMsg('');
              }}
              className="text-xs text-stone-400 hover:text-emerald-400 font-medium transition-colors cursor-pointer flex items-center justify-center gap-1.5 mx-auto"
            >
              <Key className="w-3.5 h-3.5 text-amber-400" />
              <span>{isCounselorLogin ? 'ورود معمولی دانش‌آموز' : 'فراموشی رمز / ورود مشاور'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Device Management Modal from Login Screen */}
      <DeviceSessionManagerModal
        isOpen={isDeviceModalOpen}
        onClose={() => setIsDeviceModalOpen(false)}
        profile={profile}
        onDevicesUpdated={(updated) => {
          setBlockedDevicesList(updated);
          if (updated.length < maxDevicesQuota) {
            setIsDeviceBlocked(false);
            setIsDeviceModalOpen(false);
          }
        }}
      />
    </>
  );
};
