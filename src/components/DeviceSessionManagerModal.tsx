import React, { useState, useEffect } from 'react';
import {
  Smartphone,
  Laptop,
  Tablet,
  Shield,
  ShieldAlert,
  Trash2,
  RefreshCw,
  X,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Radio,
  Globe,
  Clock,
  Sparkles,
  Info
} from 'lucide-react';
import { BoundDevice, StudentProfile } from '../types';
import { getDeviceFingerprint, DeviceInfo } from '../utils/deviceFingerprint';

interface DeviceSessionManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: StudentProfile;
  onDevicesUpdated?: (updatedDevices: BoundDevice[]) => void;
  isCounselorView?: boolean;
}

export const DeviceSessionManagerModal: React.FC<DeviceSessionManagerModalProps> = ({
  isOpen,
  onClose,
  profile,
  onDevicesUpdated,
  isCounselorView = false,
}) => {
  const [devices, setDevices] = useState<BoundDevice[]>(profile.boundDevices || []);
  const [currentDeviceId, setCurrentDeviceId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [actionError, setActionError] = useState<string>('');
  const [actionSuccess, setActionSuccess] = useState<string>('');
  const [passwordConfirm, setPasswordConfirm] = useState<string>('');
  const [deviceToDelete, setDeviceToDelete] = useState<BoundDevice | null>(null);
  const [isResetAllConfirm, setIsResetAllConfirm] = useState(false);

  const maxAllowed = profile.maxAllowedDevices || 2;

  useEffect(() => {
    if (isOpen) {
      setActionError('');
      setActionSuccess('');
      setPasswordConfirm('');
      setDeviceToDelete(null);
      setIsResetAllConfirm(false);

      // Detect current device fingerprint
      getDeviceFingerprint().then((info) => {
        setCurrentDeviceId(info.deviceId);
      });

      // Refresh devices from server
      refreshDeviceList();
    }
  }, [isOpen, profile.id, profile.name]);

  const refreshDeviceList = async () => {
    setIsLoading(true);
    try {
      const devInfo = await getDeviceFingerprint();
      const res = await fetch('/api/students/check-device', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentKey: profile.id || profile.name,
          deviceInfo: devInfo,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success && Array.isArray(data.boundDevices)) {
        setDevices(data.boundDevices);
        if (onDevicesUpdated) {
          onDevicesUpdated(data.boundDevices);
        }
      }
    } catch (e) {
      // Use local prop fallback
      setDevices(profile.boundDevices || []);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRevokeSingleDevice = async () => {
    if (!deviceToDelete) return;
    setIsLoading(true);
    setActionError('');
    setActionSuccess('');

    try {
      const counselorToken = sessionStorage.getItem('study_advisor_counselor_token') || localStorage.getItem('study_advisor_counselor_token');
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (counselorToken) {
        headers['Authorization'] = `Bearer ${counselorToken}`;
      }

      const res = await fetch('/api/students/revoke-device', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          studentKey: profile.id || profile.name,
          deviceId: deviceToDelete.deviceId,
          password: passwordConfirm || undefined,
        }),
      });

      const data = await res.json();
      setIsLoading(false);

      if (res.ok && data.success) {
        setActionSuccess(data.message || 'دستگاه با موفقیت حذف گردید.');
        setDevices(data.boundDevices || []);
        if (onDevicesUpdated) {
          onDevicesUpdated(data.boundDevices || []);
        }
        setDeviceToDelete(null);
        setPasswordConfirm('');
      } else {
        setActionError(data.error || 'خطا در حذف دستگاه. لطفاً رمز عبور را بررسی نمایید.');
      }
    } catch (err: any) {
      setIsLoading(false);
      setActionError('خطا در ارتباط با سرور.');
    }
  };

  const handleResetAllDevices = async () => {
    setIsLoading(true);
    setActionError('');
    setActionSuccess('');

    try {
      const counselorToken = sessionStorage.getItem('study_advisor_counselor_token') || localStorage.getItem('study_advisor_counselor_token');
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (counselorToken) {
        headers['Authorization'] = `Bearer ${counselorToken}`;
      }

      const res = await fetch('/api/students/reset-devices', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          studentKey: profile.id || profile.name,
          password: passwordConfirm || undefined,
        }),
      });

      const data = await res.json();
      setIsLoading(false);

      if (res.ok && data.success) {
        setActionSuccess(data.message || 'تمام دستگاه‌ها با موفقیت ریست شدند.');
        setDevices([]);
        if (onDevicesUpdated) {
          onDevicesUpdated([]);
        }
        setIsResetAllConfirm(false);
        setPasswordConfirm('');
      } else {
        setActionError(data.error || 'خطا در ریست دستگاه‌ها.');
      }
    } catch (err: any) {
      setIsLoading(false);
      setActionError('خطا در ارتباط با سرور.');
    }
  };

  if (!isOpen) return null;

  const getDeviceIcon = (type: string) => {
    switch (type) {
      case 'mobile':
        return <Smartphone className="w-5 h-5 text-emerald-500" />;
      case 'tablet':
        return <Tablet className="w-5 h-5 text-sky-500" />;
      default:
        return <Laptop className="w-5 h-5 text-indigo-500" />;
    }
  };

  const formatPersianDate = (isoString?: string) => {
    if (!isoString) return 'نامشخص';
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString('fa-IR', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch (e) {
      return isoString;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/80 backdrop-blur-md animate-fadeIn">
      <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-7 border border-stone-200 shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-stone-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-black text-stone-900 flex items-center gap-2">
                <span>دستگاه‌ها و نشست‌های مجاز</span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold border border-emerald-200">
                  {devices.length} از {maxAllowed} دستگاه
                </span>
              </h3>
              <p className="text-xs text-stone-500 mt-0.5">
                حساب: <span className="font-bold text-stone-800">{profile.name}</span> • قفل سخت‌گیرانه ضد اشتراک‌گذاری
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Informative Security Banner */}
        <div className="mt-4 p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-200/80 text-xs text-emerald-950 flex items-start gap-2.5 leading-relaxed">
          <Info className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold">امنیت قفل سخت‌افزاری:</span> هر دانش‌آموز مجاز است حداکثر روی{' '}
            <strong className="text-emerald-800">{maxAllowed} دستگاه (مثلاً ۱ گوشی و ۱ لپ‌تاپ)</strong> از این لینک
            استفاده کند. دستگاه‌ها در اولین ورود به‌صورت خودکار قفل می‌شوند و افراد دیگر با لینک شما امکان ورود
            نخواهند داشت.
          </div>
        </div>

        {/* Alerts */}
        {actionError && (
          <div className="mt-3 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold flex items-center gap-2 animate-fadeIn">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{actionError}</span>
          </div>
        )}

        {actionSuccess && (
          <div className="mt-3 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold flex items-center gap-2 animate-fadeIn">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{actionSuccess}</span>
          </div>
        )}

        {/* Body / Devices List */}
        <div className="mt-4 overflow-y-auto space-y-3 flex-1 pr-1">
          {devices.length === 0 ? (
            <div className="text-center py-8 px-4 border-2 border-dashed border-stone-200 rounded-2xl">
              <Smartphone className="w-10 h-10 text-stone-300 mx-auto mb-2" />
              <p className="text-sm font-bold text-stone-600">هنوز هیچ دستگاهی ثبت و قفل نشده است</p>
              <p className="text-xs text-stone-400 mt-1">
                به محض اینکه با گوشی یا سیستم خود وارد شوید، دستگاه شما در جایگاه شماره ۱ ثبت می‌گردد.
              </p>
            </div>
          ) : (
            devices.map((device, idx) => {
              const isThisDevice = device.deviceId === currentDeviceId;
              return (
                <div
                  key={device.deviceId || idx}
                  className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
                    isThisDevice
                      ? 'bg-emerald-50/40 border-emerald-300 shadow-sm'
                      : 'bg-stone-50 border-stone-200'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
                        isThisDevice ? 'bg-emerald-200/60' : 'bg-white border border-stone-200 shadow-xs'
                      }`}
                    >
                      {getDeviceIcon(device.deviceType)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-black text-sm text-stone-900">{device.deviceName}</span>
                        {isThisDevice && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-600 text-white text-[10px] font-black shadow-xs">
                            <Radio className="w-2.5 h-2.5 animate-pulse" />
                            دستگاه فعلی شما
                          </span>
                        )}
                        <span className="text-[10px] text-stone-400 font-mono bg-white px-1.5 py-0.5 rounded border border-stone-200">
                          دستگاه #{idx + 1}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-stone-500 mt-1 flex-wrap">
                        <span className="flex items-center gap-1">
                          <Globe className="w-3 h-3 text-stone-400" />
                          {device.os} • {device.browser}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-stone-400" />
                          آخرین فعالیت: {formatPersianDate(device.lastActiveAt)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center">
                    <button
                      onClick={() => {
                        setDeviceToDelete(device);
                        setActionError('');
                        setActionSuccess('');
                        setPasswordConfirm('');
                      }}
                      className="px-3 py-1.5 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>حذف نشست</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Delete Confirmation Modal Overlay */}
        {deviceToDelete && (
          <div className="absolute inset-0 bg-stone-900/80 backdrop-blur-sm z-20 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl p-5 max-w-sm w-full space-y-4 shadow-2xl border border-stone-200 text-right animate-fadeIn">
              <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
                <Trash2 className="w-6 h-6" />
              </div>
              <div className="text-center space-y-1">
                <h4 className="text-base font-black text-stone-900">حذف نشست دستگاه</h4>
                <p className="text-xs text-stone-500">
                  آیا از حذف دستگاه <strong className="text-stone-800">{deviceToDelete.deviceName}</strong> اطمینان دارید؟
                  با حذف، ظرفیت یک دستگاه برای ورود جدید آزاد می‌شود.
                </p>
              </div>

              {!isCounselorView && (
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-stone-600">رمز عبور اختصاصی خود را وارد کنید:</label>
                  <input
                    type="password"
                    value={passwordConfirm}
                    onChange={(e) => setPasswordConfirm(e.target.value)}
                    placeholder="رمز ورود اکانت (پیش‌فرض: 1234)"
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 text-stone-800 text-sm focus:outline-emerald-500 font-mono text-center"
                    autoFocus
                  />
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setDeviceToDelete(null)}
                  className="flex-1 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold cursor-pointer"
                >
                  انصراف
                </button>
                <button
                  type="button"
                  disabled={isLoading}
                  onClick={handleRevokeSingleDevice}
                  className="flex-1 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold cursor-pointer disabled:opacity-60"
                >
                  {isLoading ? 'در حال حذف...' : 'تأیید و حذف دستگاه'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Reset All Confirmation Modal Overlay */}
        {isResetAllConfirm && (
          <div className="absolute inset-0 bg-stone-900/80 backdrop-blur-sm z-20 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl p-5 max-w-sm w-full space-y-4 shadow-2xl border border-stone-200 text-right animate-fadeIn">
              <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center mx-auto">
                <RefreshCw className="w-6 h-6" />
              </div>
              <div className="text-center space-y-1">
                <h4 className="text-base font-black text-stone-900">ریست تمام نشست‌ها</h4>
                <p className="text-xs text-stone-500">
                  تمام دستگاه‌های متصل به این اکانت خارج می‌شوند و هر دستگاهی که مجدد وارد شود ثبت خواهد شد.
                </p>
              </div>

              {!isCounselorView && (
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-stone-600">رمز عبور اکانت:</label>
                  <input
                    type="password"
                    value={passwordConfirm}
                    onChange={(e) => setPasswordConfirm(e.target.value)}
                    placeholder="رمز ورود اکانت"
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 text-stone-800 text-sm focus:outline-emerald-500 font-mono text-center"
                    autoFocus
                  />
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsResetAllConfirm(false)}
                  className="flex-1 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold cursor-pointer"
                >
                  انصراف
                </button>
                <button
                  type="button"
                  disabled={isLoading}
                  onClick={handleResetAllDevices}
                  className="flex-1 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold cursor-pointer disabled:opacity-60"
                >
                  {isLoading ? 'در حال ریست...' : 'ریست تمام دستگاه‌ها'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="mt-5 pt-4 border-t border-stone-100 flex items-center justify-between gap-3">
          <button
            onClick={() => {
              setIsResetAllConfirm(true);
              setPasswordConfirm('');
              setActionError('');
              setActionSuccess('');
            }}
            disabled={devices.length === 0}
            className="px-3.5 py-2 rounded-xl border border-amber-200 text-amber-700 hover:bg-amber-50 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 disabled:opacity-40"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>ریست تمام دستگاه‌ها</span>
          </button>

          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold transition-colors cursor-pointer"
          >
            بستن
          </button>
        </div>
      </div>
    </div>
  );
};
