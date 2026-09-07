import React, { useState } from 'react';
import { X, Check, BookOpen, Target, Clock, AlertCircle, RotateCcw, Trash2, Shield, Smartphone, KeyRound } from 'lucide-react';
import { StudentProfile } from '../types';
import { DeviceSessionManagerModal } from './DeviceSessionManagerModal';
import { ChangePasswordModal } from './ChangePasswordModal';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: StudentProfile;
  onSave: (updated: StudentProfile) => void;
  onOpenResetData?: () => void;
  onDeleteAccount?: (studentName: string) => void;
}

const PRESETS: { label: string; data: Partial<StudentProfile> }[] = [
  {
    label: 'کنکور تجربی (هدف پزشکی)',
    data: {
      grade: 'پایه دوازدهم / پشت کنکور',
      fieldOfStudy: 'علوم تجربی',
      targetGoal: 'پزشکی دانشگاه تهران / شهید بهشتی',
      dailyTargetHours: 8,
      strongSubjects: ['زیست‌شناسی', 'شیمی'],
      weakSubjects: ['ریاضی (مثلثات، کاربرد مشتق)', 'فیزیک (حرکت‌شناسی)'],
      schoolOrWorkHours: 'صبح‌ها مدرسه تا ساعت ۱۳:۳۰',
    }
  },
  {
    label: 'کنکور ریاضی (مهندسی)',
    data: {
      grade: 'پایه دوازدهم',
      fieldOfStudy: 'ریاضی و فیزیک',
      targetGoal: 'مهندسی کامپیوتر دانشگاه صنعتی شریف',
      dailyTargetHours: 8.5,
      strongSubjects: ['حسابان', 'هندسه'],
      weakSubjects: ['فیزیک مبحث الکتریسیته', 'شیمی آلی'],
      schoolOrWorkHours: 'شنبه تا چهارشنبه مدرسه',
    }
  },
  {
    label: 'کنکور انسانی (حقوق / روانشناسی)',
    data: {
      grade: 'پایه دوازدهم',
      fieldOfStudy: 'ادبیات و علوم انسانی',
      targetGoal: 'حقوق دانشگاه تهران',
      dailyTargetHours: 7.5,
      strongSubjects: ['فنون ادبی', 'عربی اختصاصی'],
      weakSubjects: ['فلسفه و منطق', 'ریاضی و آمار انسانی'],
      schoolOrWorkHours: 'شنبه تا چهارشنبه مدرسه',
    }
  },
  {
    label: 'دانشجو / آزمون ارشد و استخدامی',
    data: {
      grade: 'دانشجو / فارغ‌التحصیل',
      fieldOfStudy: 'مهندسی / علوم پایه / انسانی',
      targetGoal: 'قبولی در آزمون کارشناسی ارشد روزانه',
      dailyTargetHours: 6,
      strongSubjects: ['دروس پایه و تخصصی اصلی'],
      weakSubjects: ['زبان تخصصی', 'ریاضی مهندسی'],
      schoolOrWorkHours: 'شاغل پاره‌وقت / کلاس‌های دانشگاه',
    }
  }
];

export const ProfileModal: React.FC<ProfileModalProps> = ({
  isOpen,
  onClose,
  profile,
  onSave,
  onOpenResetData,
  onDeleteAccount,
}) => {
  const [formData, setFormData] = useState<StudentProfile>(profile);
  const [weakInput, setWeakInput] = useState('');
  const [strongInput, setStrongInput] = useState('');
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [isDeviceModalOpen, setIsDeviceModalOpen] = useState(false);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);

  if (!isOpen) return null;

  const handlePresetSelect = (preset: Partial<StudentProfile>) => {
    setFormData(prev => ({
      ...prev,
      ...preset,
      strongSubjects: preset.strongSubjects || prev.strongSubjects,
      weakSubjects: preset.weakSubjects || prev.weakSubjects,
    }));
  };

  const handleAddWeak = () => {
    if (weakInput.trim() && !formData.weakSubjects.includes(weakInput.trim())) {
      setFormData(prev => ({ ...prev, weakSubjects: [...prev.weakSubjects, weakInput.trim()] }));
      setWeakInput('');
    }
  };

  const handleRemoveWeak = (item: string) => {
    setFormData(prev => ({ ...prev, weakSubjects: prev.weakSubjects.filter(s => s !== item) }));
  };

  const handleAddStrong = () => {
    if (strongInput.trim() && !formData.strongSubjects.includes(strongInput.trim())) {
      setFormData(prev => ({ ...prev, strongSubjects: [...prev.strongSubjects, strongInput.trim()] }));
      setStrongInput('');
    }
  };

  const handleRemoveStrong = (item: string) => {
    setFormData(prev => ({ ...prev, strongSubjects: prev.strongSubjects.filter(s => s !== item) }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-stone-200">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-stone-100 sticky top-0 bg-white z-10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
              <Target className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-stone-900">پروفایل و مشخصات تحصیلی</h2>
              <p className="text-xs text-stone-500">این اطلاعات در تنظیم برنامه هفتگی و تحلیل شبانه توسط مشاور استفاده می‌شود</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Quick presets */}
          <div>
            <label className="block text-xs font-semibold text-stone-600 mb-2">
              الگوهای آماده برای شروع سریع:
            </label>
            <div className="flex flex-wrap gap-2">
              {PRESETS.map((p, idx) => (
                <button
                  type="button"
                  key={idx}
                  onClick={() => handlePresetSelect(p.data)}
                  className="px-3 py-1.5 rounded-lg text-xs border border-stone-200 hover:border-emerald-500 hover:bg-emerald-50/60 text-stone-700 transition-all text-right"
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">نام یا نام‌مستعار</label>
              <input
                type="text"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm focus:outline-emerald-600"
                placeholder="مثلاً: علی، مریم..."
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">مقطع و وضعیت تحصیلی</label>
              <input
                type="text"
                value={formData.grade}
                onChange={e => setFormData({ ...formData, grade: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm focus:outline-emerald-600"
                placeholder="مثلاً: دوازدهم، پشت کنکور، یازدهم..."
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">رشته تحصیلی</label>
              <div className="flex gap-1.5 mb-1.5 flex-wrap">
                {['علوم تجربی', 'ریاضی و فیزیک', 'ادبیات و علوم انسانی'].map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setFormData({ ...formData, fieldOfStudy: f })}
                    className={`px-2 py-0.5 rounded text-[11px] font-bold border transition-all cursor-pointer ${
                      formData.fieldOfStudy === f
                        ? 'bg-emerald-600 text-white border-emerald-600'
                        : 'bg-stone-100 text-stone-600 border-stone-200 hover:bg-stone-200'
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
              <input
                type="text"
                value={formData.fieldOfStudy}
                onChange={e => setFormData({ ...formData, fieldOfStudy: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm focus:outline-emerald-600"
                placeholder="مثلاً: علوم تجربی، ریاضی و فیزیک، ادبیات و علوم انسانی..."
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">هدف اصلی یا رشته/دانشگاه هدف</label>
              <input
                type="text"
                value={formData.targetGoal}
                onChange={e => setFormData({ ...formData, targetGoal: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm focus:outline-emerald-600"
                placeholder="مثلاً: پزشکی تهران، مهندسی مکانیک..."
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">رمز ورود اختصاصی به این اکانت</label>
              <div className="flex items-center gap-2">
                <input
                  type="password"
                  value="••••••••"
                  disabled
                  className="w-full px-3 py-2 rounded-lg border border-stone-200 text-sm font-mono bg-stone-100 text-stone-400 cursor-not-allowed"
                />
                <button
                  type="button"
                  onClick={() => setIsChangePasswordOpen(true)}
                  className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-bold transition-all cursor-pointer whitespace-nowrap"
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>تغییر رمز</span>
                </button>
              </div>
              <p className="text-[11px] text-stone-400 mt-1">
                برای تغییر رمز، باید رمز فعلی خود را بدانید. تغییر رمز از همین‌جا مستقیماً روی سرور اعمال می‌شود.
              </p>
            </div>
          </div>

          {/* Device & Multi-Session Protection Card */}
          <div className="p-4 rounded-xl bg-gradient-to-r from-stone-50 to-emerald-50/30 border border-emerald-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                <Smartphone className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-stone-900 flex items-center gap-2">
                  <span>قفل سخت‌افزاری و دستگاه‌های متصل</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold">
                    حداکثر {formData.maxAllowedDevices || 2} دستگاه
                  </span>
                </h4>
                <p className="text-[11px] text-stone-500 mt-0.5">
                  دستگاه‌های اولیه ورود به‌صورت خودکار قفل می‌شوند تا افراد دیگر با لینک شما دسترسی نداشته باشند.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsDeviceModalOpen(true)}
              className="px-3 py-1.5 rounded-lg bg-white hover:bg-stone-50 text-emerald-700 border border-emerald-300 text-xs font-bold transition-all cursor-pointer shadow-2xs self-end sm:self-center shrink-0 flex items-center gap-1.5"
            >
              <Shield className="w-3.5 h-3.5" />
              <span>مدیریت و حذف نشست‌ها</span>
            </button>
          </div>

          {/* Time & Study Hours */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 rounded-xl bg-stone-50 border border-stone-200">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">ساعت هدف روزانه (ساعت)</label>
              <input
                type="number"
                step="0.5"
                min="2"
                max="16"
                value={formData.dailyTargetHours}
                onChange={e => setFormData({ ...formData, dailyTargetHours: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm bg-white focus:outline-emerald-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">ساعت بیداری صبح</label>
              <input
                type="text"
                value={formData.wakeTime}
                onChange={e => setFormData({ ...formData, wakeTime: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm bg-white focus:outline-emerald-600"
                placeholder="۰۶:۳۰"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">ساعت خاموشی شب</label>
              <input
                type="text"
                value={formData.sleepTime}
                onChange={e => setFormData({ ...formData, sleepTime: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm bg-white focus:outline-emerald-600"
                placeholder="۲۳:۳۰"
              />
            </div>
          </div>

          {/* Weak & Strong Subjects */}
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                نقاط ضعف و مباحث نیازمند تمرکز (جهت اولویت در برنامه)
              </label>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={weakInput}
                  onChange={e => setWeakInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddWeak(); } }}
                  placeholder="مبحث یا درس ضعیف (مثلاً: ریاضی مثلثات)..."
                  className="flex-1 px-3 py-1.5 rounded-lg border border-stone-300 text-sm focus:outline-emerald-600"
                />
                <button
                  type="button"
                  onClick={handleAddWeak}
                  className="px-3 py-1.5 bg-stone-800 text-white rounded-lg text-xs font-medium hover:bg-stone-900"
                >
                  افزودن
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {formData.weakSubjects.map((s, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-red-50 text-red-700 border border-red-200"
                  >
                    {s}
                    <button type="button" onClick={() => handleRemoveWeak(s)} className="hover:text-red-900">×</button>
                  </span>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                نقاط قوت (دروسی که در آن‌ها مسلط هستی)
              </label>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={strongInput}
                  onChange={e => setStrongInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddStrong(); } }}
                  placeholder="درس یا مبحث قوی (مثلاً: زیست دوازدهم)..."
                  className="flex-1 px-3 py-1.5 rounded-lg border border-stone-300 text-sm focus:outline-emerald-600"
                />
                <button
                  type="button"
                  onClick={handleAddStrong}
                  className="px-3 py-1.5 bg-stone-800 text-white rounded-lg text-xs font-medium hover:bg-stone-900"
                >
                  افزودن
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {formData.strongSubjects.map((s, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200"
                  >
                    {s}
                    <button type="button" onClick={() => handleRemoveStrong(s)} className="hover:text-emerald-900">×</button>
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* School & Notes */}
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">ساعات کلاس، مدرسه یا کار</label>
            <input
              type="text"
              value={formData.schoolOrWorkHours}
              onChange={e => setFormData({ ...formData, schoolOrWorkHours: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm focus:outline-emerald-600"
              placeholder="مثلاً: شنبه تا چهارشنبه تا ۱۳:۳۰ مدرسه"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">توضیحات تکمیلی یا روحیات فردی</label>
            <textarea
              rows={2}
              value={formData.additionalNotes || ''}
              onChange={e => setFormData({ ...formData, additionalNotes: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm focus:outline-emerald-600"
              placeholder="مثلاً: در محاسبات کند هستم، بعدازظهرها کسل می‌شوم، در خانه سر و صدا هست..."
            />
          </div>

          {/* Footer Actions */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-stone-100">
            <div className="flex items-center gap-2">
              {onDeleteAccount && (
                isConfirmingDelete ? (
                  <div className="flex items-center gap-1.5 bg-rose-50 border border-rose-300 p-1.5 rounded-xl animate-fadeIn">
                    <span className="text-xs font-bold text-rose-900">پاکسازی کامل اکانت؟</span>
                    <button
                      type="button"
                      onClick={() => {
                        onDeleteAccount(profile.name);
                        setIsConfirmingDelete(false);
                        onClose();
                      }}
                      className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white text-xs font-black rounded-lg cursor-pointer transition-all shadow-2xs"
                    >
                      بله، حذف
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsConfirmingDelete(false)}
                      className="px-2 py-1 bg-stone-200 hover:bg-stone-300 text-stone-800 text-xs font-bold rounded-lg cursor-pointer transition-all"
                    >
                      انصراف
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsConfirmingDelete(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-rose-700 hover:text-white hover:bg-rose-600 bg-rose-50 border border-rose-200 rounded-lg transition-all font-bold cursor-pointer"
                    title="حذف کامل این اکانت"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>حذف اکانت</span>
                  </button>
                )
              )}

              {onOpenResetData && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenResetData();
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-stone-600 hover:text-stone-900 hover:bg-stone-100 rounded-lg transition cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>بازنشانی اطلاعات</span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm text-stone-600 hover:text-stone-800 cursor-pointer"
              >
                انصراف
              </button>
              <button
                type="submit"
                className="flex items-center gap-1.5 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold shadow-sm transition-all cursor-pointer"
              >
                <Check className="w-4 h-4" />
                ذخیره پروفایل
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Active Device & Session Management Modal */}
      <DeviceSessionManagerModal
        isOpen={isDeviceModalOpen}
        onClose={() => setIsDeviceModalOpen(false)}
        profile={formData}
        onDevicesUpdated={(updated) => {
          setFormData((prev) => ({ ...prev, boundDevices: updated }));
          onSave({ ...formData, boundDevices: updated });
        }}
      />

      {/* Self-Service Password Change Modal */}
      <ChangePasswordModal
        isOpen={isChangePasswordOpen}
        onClose={() => setIsChangePasswordOpen(false)}
        profile={formData}
        onPasswordChanged={(newPassword) => {
          const updated = { ...formData, password: newPassword };
          setFormData(updated);
          onSave(updated);
        }}
      />
    </div>
  );
};
