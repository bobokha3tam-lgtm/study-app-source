import React, { useState } from 'react';
import { X, KeyRound, Check, AlertCircle, Loader2 } from 'lucide-react';
import { StudentProfile } from '../types';

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: StudentProfile;
  onPasswordChanged: (newPassword: string) => void;
}

export const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({
  isOpen,
  onClose,
  profile,
  onPasswordChanged,
}) => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const resetAndClose = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setError(null);
    setSuccess(false);
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!currentPassword.trim() || !newPassword.trim()) {
      setError('لطفاً رمز فعلی و رمز جدید را وارد کنید.');
      return;
    }
    if (newPassword.trim().length < 4) {
      setError('رمز جدید باید حداقل ۴ کاراکتر باشد.');
      return;
    }
    if (newPassword.trim() !== confirmPassword.trim()) {
      setError('تکرار رمز جدید با رمز وارد شده مطابقت ندارد.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/students/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentKey: profile.id || profile.name,
          currentPassword: currentPassword.trim(),
          newPassword: newPassword.trim(),
        }),
      });
      const data = await res.json();

      if (data.success) {
        setSuccess(true);
        onPasswordChanged(newPassword.trim());
        setTimeout(resetAndClose, 1500);
      } else {
        setError(data.error || 'تغییر رمز عبور با خطا مواجه شد.');
      }
    } catch (err) {
      setError('ارتباط با سرور برقرار نشد. اتصال اینترنت خود را بررسی کنید.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" dir="rtl">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-stone-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <KeyRound className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-stone-900">تغییر رمز عبور</h3>
          </div>
          <button onClick={resetAndClose} className="text-stone-400 hover:text-stone-600 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {success ? (
          <div className="p-6 flex flex-col items-center text-center gap-2">
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
              <Check className="w-6 h-6" />
            </div>
            <p className="text-sm font-semibold text-stone-800">رمز عبور شما با موفقیت تغییر کرد.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-4 space-y-3">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">رمز عبور فعلی</label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm focus:outline-emerald-600"
                placeholder="رمز فعلی خود را وارد کنید"
                autoFocus
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">رمز عبور جدید</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm focus:outline-emerald-600"
                placeholder="حداقل ۴ کاراکتر"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">تکرار رمز عبور جدید</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm focus:outline-emerald-600"
                placeholder="رمز جدید را دوباره وارد کنید"
              />
            </div>

            {error && (
              <div className="flex items-start gap-2 p-2.5 rounded-lg bg-red-50 border border-red-100 text-red-700 text-xs">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white rounded-xl text-sm font-semibold transition-all cursor-pointer"
            >
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
              {isSubmitting ? 'در حال ثبت...' : 'تغییر رمز عبور'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default ChangePasswordModal;
