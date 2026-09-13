import React, { useState } from 'react';
import { 
  Trash2, 
  RotateCcw, 
  AlertTriangle, 
  CheckCircle2, 
  X, 
  Layers, 
  FileText, 
  Clock, 
  Calendar,
  ShieldAlert
} from 'lucide-react';

interface DataResetModalProps {
  isOpen: boolean;
  onClose: () => void;
  stats: {
    reportsCount: number;
    scheduleBlocksCount: number;
    errorsCount: number;
    focusSessionsCount: number;
    cardsCount: number;
    feynmanCount: number;
  };
  onClearToZero: () => void;
  onRestoreDefaults: () => void;
}

export function DataResetModal({
  isOpen,
  onClose,
  stats,
  onClearToZero,
  onRestoreDefaults,
}: DataResetModalProps) {
  const [confirmMode, setConfirmMode] = useState<'none' | 'zero' | 'default'>('none');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleExecuteZero = () => {
    onClearToZero();
    setSuccessMessage('تمام داده‌ها، گزارش‌ها و پارت‌های برنامه با موفقیت صفر و پاکسازی شدند.');
    setConfirmMode('none');
    setTimeout(() => {
      setSuccessMessage(null);
      onClose();
    }, 1800);
  };

  const handleExecuteDefault = () => {
    onRestoreDefaults();
    setSuccessMessage('اطلاعات پیش‌فرض نمونه (کنکور ریاضی و فیزیک) بازیابی شدند.');
    setConfirmMode('none');
    setTimeout(() => {
      setSuccessMessage(null);
      onClose();
    }, 1800);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs animate-fadeIn">
      <div 
        className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-stone-200 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 border-b border-stone-100 bg-stone-50/80">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-stone-900">مدیریت و صفر کردن داده‌ها</h2>
              <p className="text-xs text-stone-500">پاکسازی کامل تاریخچه‌ها یا بازنشانی به نقطه صفر</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-200/60 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6 text-right">
          {successMessage ? (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-center gap-2.5 animate-fadeIn font-semibold">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>{successMessage}</span>
            </div>
          ) : (
            <>
              {/* Current Storage Snapshot */}
              <div>
                <span className="text-xs font-bold text-stone-700 block mb-2.5">
                  خلاصه وضعیت داده‌های فعلی ذخیره‌شده در مرورگر:
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
                  <div className="p-2.5 bg-stone-50 rounded-xl border border-stone-200">
                    <span className="text-stone-500 text-[11px] block">گزارش‌های شبانه:</span>
                    <span className="font-bold text-stone-900 text-sm">{stats.reportsCount} مورد</span>
                  </div>
                  <div className="p-2.5 bg-stone-50 rounded-xl border border-stone-200">
                    <span className="text-stone-500 text-[11px] block">پارت‌های هفتگی:</span>
                    <span className="font-bold text-stone-900 text-sm">{stats.scheduleBlocksCount} پارت</span>
                  </div>
                  <div className="p-2.5 bg-stone-50 rounded-xl border border-stone-200">
                    <span className="text-stone-500 text-[11px] block">خطاهای آزمون:</span>
                    <span className="font-bold text-stone-900 text-sm">{stats.errorsCount} خطا</span>
                  </div>
                  <div className="p-2.5 bg-stone-50 rounded-xl border border-stone-200">
                    <span className="text-stone-500 text-[11px] block">تست سرعتی:</span>
                    <span className="font-bold text-stone-900 text-sm">{stats.focusSessionsCount} جلسه</span>
                  </div>
                  <div className="p-2.5 bg-stone-50 rounded-xl border border-stone-200">
                    <span className="text-stone-500 text-[11px] block">کارت‌های مرور:</span>
                    <span className="font-bold text-stone-900 text-sm">{stats.cardsCount} فلش‌کارت</span>
                  </div>
                  <div className="p-2.5 bg-stone-50 rounded-xl border border-stone-200">
                    <span className="text-stone-500 text-[11px] block">تکنیک فاینمن:</span>
                    <span className="font-bold text-stone-900 text-sm">{stats.feynmanCount} جلسه</span>
                  </div>
                </div>
              </div>

              {/* Action Choices */}
              {confirmMode === 'none' && (
                <div className="space-y-3 pt-2">
                  {/* Option 1: Zero Out Everything */}
                  <div className="p-4 rounded-xl border border-rose-200 bg-rose-50/40 hover:bg-rose-50/70 transition space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center shrink-0 mt-0.5">
                        <Trash2 className="w-4 h-4" />
                      </div>
                      <div className="flex-1">
                        <h4 className="text-sm font-bold text-rose-950">صفر کردن و شروع از اول (شروع کاملاً سفید)</h4>
                        <p className="text-xs text-rose-700 mt-1 leading-relaxed">
                          تمام گزارش‌های شبانه، جلسات تست‌زنی، خطاهای آزمون و پارت‌های برنامه هفتگی کاملاً پاک و صفر می‌شوند تا جدول برنامه و آمارها خالی شده و بتوانید با اطلاعات واقعی خودتان آن را پر کنید.
                        </p>
                      </div>
                    </div>
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() => setConfirmMode('zero')}
                        className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-xs transition cursor-pointer flex items-center gap-1.5"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>صفر کردن تمام اطلاعات</span>
                      </button>
                    </div>
                  </div>

                  {/* Option 2: Reset to Defaults */}
                  <div className="p-4 rounded-xl border border-stone-200 bg-stone-50/70 hover:bg-stone-100/70 transition space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-stone-200 text-stone-700 flex items-center justify-center shrink-0 mt-0.5">
                        <RotateCcw className="w-4 h-4" />
                      </div>
                      <div className="flex-1">
                        <h4 className="text-sm font-bold text-stone-900">بازنشانی به داده‌های اولیه دمو</h4>
                        <p className="text-xs text-stone-600 mt-1 leading-relaxed">
                          اطلاعات نمونه اولیه (برنامه هفتگی رشته ریاضی، نمونه تست‌های سرعتی، تحلیل آزمون و گزارش‌ها) را مجدداً بارگذاری می‌کند.
                        </p>
                      </div>
                    </div>
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() => setConfirmMode('default')}
                        className="px-4 py-2 rounded-lg bg-stone-800 hover:bg-stone-900 text-white text-xs font-semibold shadow-xs transition cursor-pointer flex items-center gap-1.5"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>بازنشانی به داده‌های نمونه</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Confirmation Prompt: Zero */}
              {confirmMode === 'zero' && (
                <div className="p-4 rounded-xl border-2 border-rose-500 bg-rose-50 text-right space-y-3 animate-fadeIn">
                  <div className="flex items-center gap-2 text-rose-800 font-bold text-xs">
                    <ShieldAlert className="w-4 h-4 text-rose-600" />
                    <span>تایید نهایی: آیا کاملاً مطمئن هستید؟</span>
                  </div>
                  <p className="text-xs text-rose-700 leading-relaxed">
                    با تایید این مرحله، کلیه گزارش‌ها و پارت‌های برنامه صفر خواهند شد و اطلاعات قابل بازگشت نخواهد بود.
                  </p>
                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-rose-200">
                    <button
                      type="button"
                      onClick={() => setConfirmMode('none')}
                      className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-stone-600 hover:bg-rose-100 transition cursor-pointer"
                    >
                      انصراف
                    </button>
                    <button
                      type="button"
                      onClick={handleExecuteZero}
                      className="px-4 py-2 rounded-lg bg-rose-700 hover:bg-rose-800 text-white text-xs font-bold shadow-sm transition cursor-pointer flex items-center gap-1.5"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>بله، همه داده‌ها صفر شود</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Confirmation Prompt: Defaults */}
              {confirmMode === 'default' && (
                <div className="p-4 rounded-xl border-2 border-amber-500 bg-amber-50 text-right space-y-3 animate-fadeIn">
                  <div className="flex items-center gap-2 text-amber-900 font-bold text-xs">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    <span>تایید بازنشانی به حالت پیش‌فرض</span>
                  </div>
                  <p className="text-xs text-amber-800 leading-relaxed">
                    برنامه و تاریخچه‌ها با داده‌های نمونه اولیه کنکور ریاضی جایگزین می‌شوند.
                  </p>
                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-amber-200">
                    <button
                      type="button"
                      onClick={() => setConfirmMode('none')}
                      className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-stone-600 hover:bg-amber-100 transition cursor-pointer"
                    >
                      انصراف
                    </button>
                    <button
                      type="button"
                      onClick={handleExecuteDefault}
                      className="px-4 py-2 rounded-lg bg-stone-900 hover:bg-black text-white text-xs font-bold shadow-sm transition cursor-pointer flex items-center gap-1.5"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>بازگردانی داده‌های پیش‌فرض</span>
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
