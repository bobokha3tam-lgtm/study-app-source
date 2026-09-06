import React, { useState } from 'react';
import { ShieldAlert, Lock, Key, Clock, AlertCircle, Phone, Sparkles } from 'lucide-react';
import { StudentProfile } from '../types';

interface AccountLockoutOverlayProps {
  profile: StudentProfile;
  adminPasscode: string;
  onAdminUnlock: () => void;
  onOpenMasterAdmin: () => void;
}

export const AccountLockoutOverlay: React.FC<AccountLockoutOverlayProps> = ({
  profile,
  adminPasscode,
  onAdminUnlock,
  onOpenMasterAdmin,
}) => {
  const [passcodeInput, setPasscodeInput] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [showAdminLogin, setShowAdminLogin] = useState(false);

  // Check if profile is suspended or expired
  const isSuspended = profile.accessStatus === 'suspended';
  const isExpired = profile.accessStatus === 'expired';

  // Check date expiry if set
  const todayStr = new Date().toISOString().split('T')[0];
  const isDateExpired = profile.accessExpiresAt && profile.accessExpiresAt < todayStr;

  const isLocked = isSuspended || isExpired || isDateExpired;

  if (profile.isPendingInitialSync || !isLocked) return null;

  const handleUnlockSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const input = passcodeInput.trim();
    if (!input) return;

    try {
      const res = await fetch('/api/counselor/verify-passcode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passcode: input }),
      });
      const contentType = res.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        // Trust whatever the server says, success or failure. A "wrong
        // passcode" answer (data.valid === false) is definitive and must
        // never fall through to the local fallback below.
        const data = await res.json();
        if (res.ok && data.valid) {
          if (data.token) {
            sessionStorage.setItem('study_advisor_counselor_token', data.token);
            localStorage.setItem('study_advisor_counselor_token', data.token);
          }
          onAdminUnlock();
          onOpenMasterAdmin();
          return;
        }
        setErrorMsg(data.error || 'رمز مدیریت اشتباه است.');
        return;
      }
    } catch (err) {
      console.warn('Server offline or static host, using local fallback', err);
    }

    // Local static fallback — only reached when the server could not be
    // contacted at all (genuine network/offline failure). No universal
    // override codes here: only the real admin passcode is accepted.
    const validPasses = [adminPasscode.trim().toLowerCase()];

    if (validPasses.includes(input.toLowerCase())) {
      sessionStorage.setItem('study_advisor_counselor_token', 'local_static_counselor_token');
      localStorage.setItem('study_advisor_counselor_token', 'local_static_counselor_token');
      onAdminUnlock();
      onOpenMasterAdmin();
    } else {
      setErrorMsg('رمز مدیریت اشتباه است.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/80 backdrop-blur-xl animate-fadeIn">
      <div className="bg-stone-900 text-white rounded-3xl max-w-lg w-full p-6 sm:p-8 border border-stone-800 shadow-2xl relative overflow-hidden text-center space-y-6">
        {/* Glow */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Lock Icon */}
        <div className="w-16 h-16 rounded-3xl bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center mx-auto shadow-lg">
          <ShieldAlert className="w-8 h-8 animate-bounce" />
        </div>

        {/* Lockout Notice */}
        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/20 text-rose-300 text-xs font-bold border border-rose-500/30">
            <Lock className="w-3.5 h-3.5 text-rose-400" />
            <span>{isSuspended ? 'دسترسی حساب مسدود شده است' : 'اعتبار اشتراک به پایان رسیده است'}</span>
          </div>

          <h3 className="text-xl sm:text-2xl font-black text-white">
            دانش‌آموز گرامی ({profile.name})
          </h3>

          <p className="text-stone-300 text-xs sm:text-sm leading-relaxed max-w-md mx-auto">
            {profile.lockoutReason || (
              isSuspended
                ? 'دسترسی شما به پنل هوشمند هرمس توسط مشاور تعلیق شده است.'
                : 'تاریخ اعتبار استفاده شما از سامانه به اتمام رسیده است. جهت تمدید اشتراک یا باز کردن قفل با مشاور خود تماس بگیرید.'
            )}
          </p>
        </div>

        {/* Expiry Details Chip */}
        {profile.accessExpiresAt && (
          <div className="inline-flex items-center gap-2 bg-stone-800/80 px-4 py-2 rounded-2xl border border-stone-700/60 text-xs font-medium text-stone-300">
            <Clock className="w-4 h-4 text-amber-400 shrink-0" />
            <span>تاریخ انقضای ثبت‌شده: <strong className="text-white">{profile.accessExpiresAt}</strong></span>
          </div>
        )}

        {/* Counselor Login Toggle */}
        {!showAdminLogin ? (
          <div className="space-y-3 pt-2">
            <button
              onClick={() => setShowAdminLogin(true)}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <Key className="w-4 h-4 text-amber-300" />
              <span>ورود مشاور برای تمدید اشتراک و رفع مسدودی</span>
            </button>
          </div>
        ) : (
          <form onSubmit={handleUnlockSubmit} className="space-y-3 pt-2 animate-fadeIn max-w-xs mx-auto">
            <div className="text-xs font-bold text-stone-300 text-right">رمز مدیریت مشاور را وارد کنید:</div>
            <input
              type="password"
              value={passcodeInput}
              onChange={(e) => setPasscodeInput(e.target.value)}
              placeholder="رمز عبور مدیریت"
              className="w-full px-4 py-2.5 text-center font-mono text-sm tracking-widest rounded-xl border border-stone-700 focus:outline-emerald-500 bg-stone-800 text-white"
              autoFocus
            />

            {errorMsg && (
              <div className="text-xs font-bold text-rose-400 bg-rose-950/60 p-2 rounded-lg border border-rose-800">
                {errorMsg}
              </div>
            )}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowAdminLogin(false)}
                className="flex-1 py-2 px-3 rounded-xl bg-stone-800 text-stone-300 hover:bg-stone-700 text-xs font-bold"
              >
                انصراف
              </button>
              <button
                type="submit"
                className="flex-1 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-xs"
              >
                رفع قفل
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
