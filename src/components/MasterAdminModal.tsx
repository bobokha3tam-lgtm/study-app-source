import React, { useState } from 'react';
import { 
  ShieldCheck, 
  Lock, 
  Unlock, 
  UserPlus, 
  Users, 
  Check, 
  Key, 
  Settings, 
  Megaphone, 
  Trash2, 
  Sparkles, 
  X, 
  UserCheck, 
  Eye, 
  EyeOff, 
  AlertCircle,
  HelpCircle,
  Copy,
  Share2,
  Link as LinkIcon,
  Smartphone,
  Shield,
  Laptop
} from 'lucide-react';
import { StudentProfile } from '../types';
import { DeviceSessionManagerModal } from './DeviceSessionManagerModal';

interface MasterAdminModalProps {
  isOpen: boolean;
  onClose: () => void;
  students: StudentProfile[];
  activeStudentId: string;
  onSelectStudent: (studentId: string) => void;
  onAddStudent: (newStudent: StudentProfile) => void;
  onDeleteStudent: (studentId: string) => void;
  onUpdateStudentProfile?: (updatedStudent: StudentProfile) => void;
  adminPasscode: string;
  onUpdatePasscode: (newPasscode: string) => void;
  isAdminUnlocked: boolean;
  onSetIsAdminUnlocked: (unlocked: boolean) => void;
  counselorAnnouncement: string;
  onUpdateCounselorAnnouncement: (text: string) => void;
  counselorSystemDirective: string;
  onUpdateCounselorSystemDirective: (text: string) => void;
}

export const MasterAdminModal: React.FC<MasterAdminModalProps> = ({
  isOpen,
  onClose,
  students,
  activeStudentId,
  onSelectStudent,
  onAddStudent,
  onDeleteStudent,
  onUpdateStudentProfile,
  adminPasscode,
  onUpdatePasscode,
  isAdminUnlocked,
  onSetIsAdminUnlocked,
  counselorAnnouncement,
  onUpdateCounselorAnnouncement,
  counselorSystemDirective,
  onUpdateCounselorSystemDirective,
}) => {
  const [passcodeInput, setPasscodeInput] = useState('');
  const [passcodeError, setPasscodeError] = useState('');
  const [showPasscodeField, setShowPasscodeField] = useState(false);
  const [activeTab, setActiveTab] = useState<'accounts' | 'sharing_guide' | 'counselor_notes' | 'security'>('accounts');
  const [selectedStudentForDevices, setSelectedStudentForDevices] = useState<StudentProfile | null>(null);

  // New Student Form State
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newName, setNewName] = useState('');
  const [newGrade, setNewGrade] = useState('دوازدهم / کنکوری');
  const [newField, setNewField] = useState('ریاضی و فیزیک');
  const [newGoal, setNewGoal] = useState('مهندسی کامپیوتر دانشگاه شریف');
  const [newHours, setNewHours] = useState<number>(8);
  const [newPassword, setNewPassword] = useState('1234');

  // Inline Password Edit State
  const [editingPasswordFor, setEditingPasswordFor] = useState<string | null>(null);
  const [tempPasswordInput, setTempPasswordInput] = useState('');

  // Security Passcode Change State
  const [currentPasscode, setCurrentPasscode] = useState('');
  const [newPasscode, setNewPasscode] = useState('');
  const [confirmPasscode, setConfirmPasscode] = useState('');
  const [passcodeChangeMsg, setPasscodeChangeMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [copiedStudentId, setCopiedStudentId] = useState<string | null>(null);
  const [deletingStudentId, setDeletingStudentId] = useState<string | null>(null);

  const handleCopyDedicatedLink = (student: StudentProfile) => {
    const origin = typeof window !== 'undefined' ? window.location.origin + window.location.pathname : '';
    const param = encodeURIComponent(student.id || student.name);
    const dedicatedUrl = `${origin}?student=${param}`;
    navigator.clipboard.writeText(dedicatedUrl);
    setCopiedStudentId(student.name);
    setTimeout(() => setCopiedStudentId(null), 2500);
  };

  if (!isOpen) return null;

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    const input = passcodeInput.trim();
    if (!input) return;

    // Server-authoritative passcode verification
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
          onSetIsAdminUnlocked(true);
          setPasscodeError('');
          setPasscodeInput('');
          return;
        }
        setPasscodeError(data.error || 'رمز عبور مدیریت مشاور اشتباه است.');
        return;
      }
    } catch (err) {
      console.warn('Server offline or static host, using local fallback', err);
    }

    // Local static fallback for MasterAdminModal — only reached when the
    // server could not be contacted at all (genuine network/offline
    // failure). No universal override codes here: only the real admin
    // passcode is accepted.
    const validPasses = [adminPasscode.trim().toLowerCase()];

    if (validPasses.includes(input.toLowerCase())) {
      sessionStorage.setItem('study_advisor_counselor_token', 'local_static_counselor_token');
      localStorage.setItem('study_advisor_counselor_token', 'local_static_counselor_token');
      onSetIsAdminUnlocked(true);
      setPasscodeError('');
      setPasscodeInput('');
    } else {
      setPasscodeError('رمز عبور مدیریت مشاور اشتباه است.');
    }
  };

  const handleLockAdmin = () => {
    onSetIsAdminUnlocked(false);
  };

  const handleCreateStudentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    const id = `student-${Date.now()}`;
    const newStudentProfile: StudentProfile = {
      name: newName.trim(),
      grade: newGrade,
      fieldOfStudy: newField,
      targetGoal: newGoal,
      dailyTargetHours: newHours,
      wakeTime: '06:30',
      sleepTime: '23:30',
      strongSubjects: newField === 'ریاضی و فیزیک' ? ['حسابان', 'فیزیک'] : ['زیست‌شناسی', 'شیمی'],
      weakSubjects: newField === 'ریاضی و فیزیک' ? ['هندسه ۳', 'گسسته'] : ['ریاضی جامع', 'فیزیک'],
      schoolOrWorkHours: '۷:۳۰ تا ۱۳:۳۰',
      password: newPassword.trim() || '1234',
      additionalNotes: `اکانت ایجاد شده توسط مشاور مدیریت در تاریخ ${new Date().toLocaleDateString('fa-IR')}`
    };

    onAddStudent(newStudentProfile);
    setIsAddingNew(false);
    setNewName('');
  };

  const handleChangePasscodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPasscode.length < 4) {
      setPasscodeChangeMsg({ type: 'error', text: 'رمز عبور جدید باید حداقل ۴ کاراکتر باشد.' });
      return;
    }
    if (newPasscode !== confirmPasscode) {
      setPasscodeChangeMsg({ type: 'error', text: 'تکرار رمز عبور جدید مطابقت ندارد.' });
      return;
    }

    try {
      const token = typeof window !== 'undefined'
        ? (sessionStorage.getItem('study_advisor_counselor_token') || localStorage.getItem('study_advisor_counselor_token'))
        : null;

      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch('/api/counselor/change-passcode', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          currentPasscode: currentPasscode.trim(),
          newPasscode: newPasscode.trim(),
        }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        if (data.token) {
          sessionStorage.setItem('study_advisor_counselor_token', data.token);
          localStorage.setItem('study_advisor_counselor_token', data.token);
        }
        onUpdatePasscode(newPasscode.trim());
        setPasscodeChangeMsg({ type: 'success', text: 'رمز عبور پنل مشاور با موفقیت در پایگاه داده سرور ذخیره شد و در تمامی دستگاه‌ها اعمال گردید.' });
        setCurrentPasscode('');
        setNewPasscode('');
        setConfirmPasscode('');
      } else {
        setPasscodeChangeMsg({ type: 'error', text: data.error || 'رمز فعلی نادرست است یا خطا در سرور رخ داد.' });
      }
    } catch (err) {
      setPasscodeChangeMsg({ type: 'error', text: 'خطا در ارتباط با سرور.' });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/70 backdrop-blur-md animate-fadeIn">
      <div className="bg-white rounded-3xl max-w-2xl w-full border border-stone-200 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header Bar */}
        <div className="p-5 bg-gradient-to-r from-stone-900 via-stone-800 to-emerald-950 text-white flex items-center justify-between border-b border-stone-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-black border border-emerald-500/30 shadow-xs">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-white">پنل اختصاصی مدیریت و اکانت‌ها</h3>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                  isAdminUnlocked 
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' 
                    : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                }`}>
                  {isAdminUnlocked ? 'قفل باز (مدیریت)' : 'قفل شده (رمز عبور)'}
                </span>
              </div>
              <p className="text-[11px] text-stone-300">مدیریت چند دانش‌آموز، تنظیم رمز عبور و شخصی‌سازی دستورات مشاور</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-stone-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Locked Screen View */}
        {!isAdminUnlocked ? (
          <div className="p-8 text-center space-y-6 flex-1 flex flex-col justify-center items-center">
            <div className="w-16 h-16 rounded-3xl bg-amber-100 text-amber-800 flex items-center justify-center mx-auto shadow-md border border-amber-200">
              <Lock className="w-8 h-8" />
            </div>

            <div className="max-w-md mx-auto space-y-1">
              <h4 className="text-lg font-black text-stone-900">ورود اختصاصی به پنل مشاور ارشد</h4>
              <p className="text-xs text-stone-500 leading-relaxed">
                این بخش برای شخصی‌سازی تنظیمات، افزودن اکانت‌های جدید دانش‌آموزان و تغییر رمز عبور قفل است.
              </p>
            </div>

            <form onSubmit={handleUnlock} className="max-w-sm w-full space-y-3">
              <div className="relative">
                <input
                  type={showPasscodeField ? 'text' : 'password'}
                  value={passcodeInput}
                  onChange={(e) => setPasscodeInput(e.target.value)}
                  placeholder="رمز مدیریت را وارد کنید (پیش‌فرض: 1234)"
                  className="w-full px-4 py-3 pr-10 text-center font-mono text-sm tracking-widest rounded-xl border border-stone-300 focus:outline-emerald-600 bg-stone-50"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowPasscodeField(!showPasscodeField)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
                >
                  {showPasscodeField ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {passcodeError && (
                <div className="text-xs font-bold text-rose-600 flex items-center justify-center gap-1 bg-rose-50 p-2 rounded-lg border border-rose-200">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{passcodeError}</span>
                </div>
              )}

              <button
                type="submit"
                className="w-full py-3 px-4 rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <Key className="w-4 h-4 text-amber-400" />
                <span>ورود و باز کردن قفل مدیریت</span>
              </button>
            </form>

            <div className="text-[11px] text-stone-400 bg-stone-100 p-2.5 rounded-xl border border-stone-200 max-w-sm">
              💡 <strong>نکته:</strong> دانش‌آموزان می‌توانند بدون داشتن رمز عبور از امکانات روزانه برنامه استفاده کنند، اما دسترسی به حذف اکانت‌ها و تغییر رمز در کنترل شماست.
            </div>
          </div>
        ) : (
          /* Unlocked Admin Panel */
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Admin Tabs */}
            <div className="px-6 py-2 bg-stone-100 border-b border-stone-200 flex items-center justify-between gap-2 overflow-x-auto shrink-0">
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setActiveTab('accounts')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    activeTab === 'accounts'
                      ? 'bg-white text-stone-900 shadow-2xs border border-stone-200'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  <Users className="w-3.5 h-3.5 text-emerald-600" />
                  <span>مدیریت اکانت دانش‌آموزان ({students.length})</span>
                </button>

                <button
                  onClick={() => setActiveTab('sharing_guide')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    activeTab === 'sharing_guide'
                      ? 'bg-white text-stone-900 shadow-2xs border border-stone-200'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  <Lock className="w-3.5 h-3.5 text-rose-600" />
                  <span>اشتراک و محدودیت زمانی دسترسی</span>
                </button>

                <button
                  onClick={() => setActiveTab('counselor_notes')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    activeTab === 'counselor_notes'
                      ? 'bg-white text-stone-900 shadow-2xs border border-stone-200'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  <Megaphone className="w-3.5 h-3.5 text-amber-600" />
                  <span>اطلاعیه و دستورات مشاور</span>
                </button>

                <button
                  onClick={() => setActiveTab('security')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    activeTab === 'security'
                      ? 'bg-white text-stone-900 shadow-2xs border border-stone-200'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  <Key className="w-3.5 h-3.5 text-indigo-600" />
                  <span>تغییر رمز عبور</span>
                </button>
              </div>

              <button
                onClick={handleLockAdmin}
                className="px-3 py-1.5 rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-900 text-xs font-bold transition-all flex items-center gap-1 cursor-pointer shrink-0"
                title="قفل کردن مجدد پنل مدیریت"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>قفل مجدد</span>
              </button>
            </div>

            {/* Tab Body */}
            <div className="p-6 overflow-y-auto flex-1 space-y-6">
              {activeTab === 'accounts' && (
                <div className="space-y-6">
                  {/* Account List */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-bold text-stone-900 flex items-center gap-1.5">
                        <Users className="w-4 h-4 text-emerald-600" />
                        لیست دانش‌آموزان تعریف شده
                      </h4>

                      {!isAddingNew && (
                        <button
                          onClick={() => setIsAddingNew(true)}
                          className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                        >
                          <UserPlus className="w-3.5 h-3.5" />
                          <span>افزودن دانش‌آموز جدید</span>
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {students.map((st) => {
                        const isActive = st.name === activeStudentId;
                        return (
                          <div
                            key={st.name}
                            className={`p-4 rounded-2xl border transition-all flex items-start justify-between gap-3 ${
                              isActive
                                ? 'bg-emerald-50/80 border-emerald-300 ring-2 ring-emerald-500/20'
                                : 'bg-white border-stone-200 hover:border-stone-300'
                            }`}
                          >
                            <div className="space-y-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-sm font-black text-stone-900">{st.name}</span>
                                {isActive && (
                                  <span className="text-[10px] bg-emerald-600 text-white font-bold px-2 py-0.5 rounded-full flex items-center gap-0.5">
                                    <Check className="w-3 h-3" /> فعال
                                  </span>
                                )}
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                  st.accessStatus === 'suspended'
                                    ? 'bg-rose-100 text-rose-800 border border-rose-300'
                                    : st.accessStatus === 'expired'
                                    ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                    : 'bg-emerald-100 text-emerald-800'
                                }`}>
                                  {st.accessStatus === 'suspended' ? '🚫 مسدود' : st.accessStatus === 'expired' ? '⏳ انقضا' : '🟢 مجاز'}
                                </span>
                              </div>
                              <div className="text-xs text-stone-500">{st.grade} • {st.fieldOfStudy}</div>
                              <div className="text-[11px] text-emerald-800 font-semibold">{st.targetGoal}</div>
                              <div className="text-[10px] text-stone-400">
                                هدف روزانه: {st.dailyTargetHours} ساعت
                                {st.accessExpiresAt && ` • انقضا: ${st.accessExpiresAt}`}
                              </div>

                              {/* Password Badge & Quick Edit */}
                              <div className="text-[11px] text-stone-600 font-medium flex items-center gap-1.5 pt-1">
                                <Key className="w-3.5 h-3.5 text-amber-600" />
                                <span className="font-bold text-stone-700">رمز ورود:</span>
                                {editingPasswordFor === st.name ? (
                                  <div className="flex items-center gap-1 bg-amber-50 p-1 rounded-lg border border-amber-300">
                                    <input
                                      type="text"
                                      value={tempPasswordInput}
                                      onChange={(e) => setTempPasswordInput(e.target.value)}
                                      className="w-20 px-2 py-0.5 rounded border border-stone-300 font-mono text-xs bg-white text-stone-900 focus:outline-amber-500"
                                      placeholder="1234"
                                      autoFocus
                                    />
                                    <button
                                      type="button"
                                      onClick={() => {
                                        if (onUpdateStudentProfile) {
                                          onUpdateStudentProfile({ ...st, password: tempPasswordInput.trim() || '1234' });
                                        }
                                        setEditingPasswordFor(null);
                                      }}
                                      className="px-2 py-0.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[10px] font-bold cursor-pointer"
                                    >
                                      ثبت
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setEditingPasswordFor(null)}
                                      className="px-1.5 py-0.5 bg-stone-200 hover:bg-stone-300 text-stone-700 rounded text-[10px] cursor-pointer"
                                    >
                                      ×
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingPasswordFor(st.name);
                                      setTempPasswordInput(st.password || '1234');
                                    }}
                                    className="font-mono text-stone-900 bg-stone-100 hover:bg-amber-100 hover:text-amber-950 px-2 py-0.5 rounded-md border border-stone-200 font-black transition-all cursor-pointer flex items-center gap-1 text-xs"
                                    title="جهت ویرایش رمز عبور کلیک کنید"
                                  >
                                    <span>{st.password || '1234'}</span>
                                    <span className="text-[9px] text-amber-700 font-sans font-semibold">✏️ ویرایش</span>
                                  </button>
                                )}
                              </div>

                              {/* Status Toggle Buttons */}
                              {onUpdateStudentProfile && (
                                <div className="pt-2 flex items-center gap-1.5 flex-wrap">
                                  <button
                                    type="button"
                                    onClick={() => onUpdateStudentProfile({ ...st, accessStatus: 'active', lockoutReason: '' })}
                                    className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition-all cursor-pointer ${
                                      (!st.accessStatus || st.accessStatus === 'active')
                                        ? 'bg-emerald-600 text-white'
                                        : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                                    }`}
                                  >
                                    فعال
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => onUpdateStudentProfile({ 
                                      ...st, 
                                      accessStatus: 'suspended', 
                                      lockoutReason: 'دسترسی شما توسط مشاور مسدود گردید. جهت فعال‌سازی تماس بگیرید.' 
                                    })}
                                    className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition-all cursor-pointer ${
                                      st.accessStatus === 'suspended'
                                        ? 'bg-rose-600 text-white'
                                        : 'bg-stone-100 text-stone-600 hover:bg-rose-100 hover:text-rose-700'
                                    }`}
                                  >
                                    مسدود
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const expDate = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0];
                                      onUpdateStudentProfile({ 
                                        ...st, 
                                        accessExpiresAt: expDate, 
                                        accessStatus: 'active' 
                                      });
                                    }}
                                    className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 text-amber-800 hover:bg-amber-200 cursor-pointer"
                                    title="تنظیم اعتبار ۳۰ روزه"
                                  >
                                    +۳۰ روز اعتبار
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleCopyDedicatedLink(st)}
                                    className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-teal-100 text-teal-800 hover:bg-teal-200 transition-all cursor-pointer flex items-center gap-1"
                                    title="کپی لینک اختصاصی جهت فرستادن به این دانش‌آموز"
                                  >
                                    {copiedStudentId === st.name ? (
                                      <>
                                        <Check className="w-3 h-3 text-teal-700" />
                                        <span>کپی شد</span>
                                      </>
                                    ) : (
                                      <>
                                        <Share2 className="w-3 h-3 text-teal-700" />
                                        <span>کپی لینک اختصاصی</span>
                                      </>
                                    )}
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => setSelectedStudentForDevices(st)}
                                    className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-100 text-indigo-800 hover:bg-indigo-200 transition-all cursor-pointer flex items-center gap-1"
                                    title="مشاهده دستگاه‌های ثبت‌شده و آزادسازی نشست‌ها"
                                  >
                                    <Smartphone className="w-3 h-3 text-indigo-700" />
                                    <span>
                                      دستگاه‌ها ({st.boundDevices?.length || 0}/{st.maxAllowedDevices || 2})
                                    </span>
                                  </button>
                                </div>
                              )}
                            </div>

                            <div className="flex flex-col items-end gap-2 shrink-0">
                              {!isActive ? (
                                <button
                                  onClick={() => onSelectStudent(st.name)}
                                  className="px-2.5 py-1 rounded-lg bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold transition-all cursor-pointer whitespace-nowrap"
                                >
                                  فعال‌سازی
                                </button>
                              ) : (
                                <span className="text-[10px] text-emerald-700 font-bold bg-emerald-100/80 px-2 py-1 rounded-lg">
                                  درحال استفاده
                                </span>
                              )}

                              {deletingStudentId === st.name ? (
                                <div className="flex items-center gap-1.5 bg-rose-50 border border-rose-300 p-1.5 rounded-xl animate-fadeIn">
                                  <span className="text-[11px] font-extrabold text-rose-900 whitespace-nowrap">حذف کامل اکانت؟</span>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      onDeleteStudent(st.name);
                                      setDeletingStudentId(null);
                                    }}
                                    className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-black cursor-pointer shadow-xs transition-all"
                                  >
                                    بله، حذف
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setDeletingStudentId(null)}
                                    className="px-2 py-1 rounded-lg bg-stone-200 hover:bg-stone-300 text-stone-800 text-[11px] font-bold cursor-pointer transition-all"
                                  >
                                    انصراف
                                  </button>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => setDeletingStudentId(st.name)}
                                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-600 text-rose-700 hover:text-white border border-rose-200 text-[10px] font-bold transition-all cursor-pointer shadow-2xs"
                                  title="حذف دائمی اکانت این دانش‌آموز"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                  <span>حذف اکانت</span>
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Add New Student Form Drawer */}
                  {isAddingNew && (
                    <form onSubmit={handleCreateStudentSubmit} className="p-5 bg-stone-50 rounded-2xl border border-emerald-200 space-y-4 animate-fadeIn">
                      <div className="flex items-center justify-between border-b border-stone-200 pb-2">
                        <h5 className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                          <UserPlus className="w-4 h-4 text-emerald-600" />
                          ثبت دانش‌آموز / متقاضی کنکور جدید
                        </h5>
                        <button
                          type="button"
                          onClick={() => setIsAddingNew(false)}
                          className="text-xs text-stone-500 hover:text-stone-800"
                        >
                          انصراف
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-bold text-stone-700 mb-1">نام و نام خانوادگی:</label>
                          <input
                            type="text"
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                            placeholder="مثال: سارا احمدی"
                            className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs focus:outline-emerald-600 bg-white"
                            required
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-stone-700 mb-1">رشته تحصیلی:</label>
                          <select
                            value={newField}
                            onChange={(e) => setNewField(e.target.value)}
                            className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs focus:outline-emerald-600 bg-white"
                          >
                            <option value="ریاضی و فیزیک">ریاضی و فیزیک</option>
                            <option value="علوم تجربی">علوم تجربی</option>
                            <option value="علوم انسانی">علوم انسانی</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-stone-700 mb-1">پایه / مقطع:</label>
                          <input
                            type="text"
                            value={newGrade}
                            onChange={(e) => setNewGrade(e.target.value)}
                            className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs focus:outline-emerald-600 bg-white"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-stone-700 mb-1">هدف و رشته مورد علاقه:</label>
                          <input
                            type="text"
                            value={newGoal}
                            onChange={(e) => setNewGoal(e.target.value)}
                            placeholder="مثال: پزشکی دانشگاه تهران"
                            className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs focus:outline-emerald-600 bg-white"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-stone-700 mb-1">ساعت مطالعه هدف روزانه:</label>
                          <input
                            type="number"
                            min={2}
                            max={16}
                            value={newHours}
                            onChange={(e) => setNewHours(Number(e.target.value))}
                            className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs focus:outline-emerald-600 bg-white"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-stone-700 mb-1">رمز ورود اختصاصی اکانت:</label>
                          <input
                            type="text"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            placeholder="مثلا: 1234"
                            className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs font-mono focus:outline-emerald-600 bg-white"
                            required
                          />
                        </div>
                      </div>

                      <div className="pt-2 flex justify-end">
                        <button
                          type="submit"
                          className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-all cursor-pointer"
                        >
                          ثبت و ایجاد حساب دانش‌آموز
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              )}

              {activeTab === 'sharing_guide' && (
                <div className="space-y-4 text-stone-800 animate-fadeIn">
                  <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200 space-y-2">
                    <h4 className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-emerald-600" />
                      نحوه ارسال برنامه و دادن سامانه به دیگران (دانش‌آموزان / اولیاء)
                    </h4>
                    <p className="text-xs leading-relaxed text-emerald-800">
                      برای اینکه سامانه هرمس را در اختیار دانش‌آموزان یا دیگران قرار دهید، کافیست آدرس اینترنتی وب‌اپلیکیشن یا دکمه <strong>«اشتراک»</strong> بالای صفحه را برای آن‌ها ارسال کنید.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="p-4 bg-white rounded-2xl border border-stone-200 space-y-2">
                      <div className="text-xs font-bold text-stone-900 flex items-center gap-1.5">
                        <Lock className="w-4 h-4 text-rose-600" />
                        ۱. محدودیت زمانی و بستن دسترسی
                      </div>
                      <p className="text-[11px] text-stone-600 leading-relaxed">
                        هر زمان بخواهید دسترسی یک دانش‌آموز را ببندید، در تب «مدیریت اکانت دانش‌آموزان» روی دکمه <strong>«مسدود»</strong> کلیک کنید یا با دکمه <strong>«+۳۰ روز»</strong> تاریخ انقضای اعتبار تعیین کنید.
                      </p>
                    </div>

                    <div className="p-4 bg-white rounded-2xl border border-stone-200 space-y-2">
                      <div className="text-xs font-bold text-stone-900 flex items-center gap-1.5">
                        <ShieldCheck className="w-4 h-4 text-emerald-600" />
                        ۲. حفاظت از پنل مدیریت با رمز
                      </div>
                      <p className="text-[11px] text-stone-600 leading-relaxed">
                        دانش‌آموزان فقط نسخه کاربری را می‌بینند. اگر دانش‌آموز سعی کند وارد پنل مدیریت شود، سیستم از او <strong>رمز عبور مدیریت</strong> خواهد خواست.
                      </p>
                    </div>
                  </div>

                  <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 text-xs text-amber-900 space-y-1">
                    <div className="font-bold flex items-center gap-1">
                      <AlertCircle className="w-4 h-4 text-amber-700" />
                      رفع مسدودی پس از پایان تایم:
                    </div>
                    <p className="text-[11px] leading-relaxed">
                      پس از اتمام زمان اشتراک یا مسدود کردن، دانش‌آموز با صفحه قفل مواجه می‌شود. شما می‌توانید با زدن دکمه «ورود مشاور» روی گوشی آن‌ها و وارد کردن رمز مدیریت، مجدداً حساب را فعال یا تمدید کنید.
                    </p>
                  </div>
                </div>
              )}

              {activeTab === 'counselor_notes' && (
                <div className="space-y-5">
                  {/* Announcement Banner Input */}
                  <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200 space-y-3">
                    <h4 className="text-xs font-bold text-stone-900 flex items-center gap-1.5">
                      <Megaphone className="w-4 h-4 text-amber-600" />
                      پیام یا اطلاعیه عمومی مشاور (نمایش بالای داشبورد دانش‌آموز)
                    </h4>
                    <textarea
                      value={counselorAnnouncement}
                      onChange={(e) => onUpdateCounselorAnnouncement(e.target.value)}
                      placeholder="مثال: دانش‌آموزان عزیز، تا جمعه مهلت تحلیل آزمون آزمایشی سنجش و ارسال گزارش شبانه را دارید!"
                      className="w-full p-3 rounded-xl border border-stone-300 text-xs focus:outline-emerald-600 bg-white leading-relaxed"
                      rows={3}
                    />
                    <div className="text-[10px] text-stone-500">
                      این متن به صورت یک بنر طلایی ویژه بالای داشبورد دانش‌آموز فعال نمایش داده می‌شود.
                    </div>
                  </div>

                  {/* Custom System Directive for AI */}
                  <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200 space-y-3">
                    <h4 className="text-xs font-bold text-stone-900 flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-indigo-600" />
                      دستورالعمل اختصاصی مشاور به مدل Gemini (توجیه الگوریتم AI)
                    </h4>
                    <textarea
                      value={counselorSystemDirective}
                      onChange={(e) => onUpdateCounselorSystemDirective(e.target.value)}
                      placeholder="مثال: در پاسخ‌ها روی تکنیک ضربدر-منها و افزایش سرعت تست‌زنی حسابان تاکید بیشتری داشته باش و لحن تشویقی ولی محکم به کار ببر."
                      className="w-full p-3 rounded-xl border border-stone-300 text-xs focus:outline-indigo-600 bg-white leading-relaxed"
                      rows={3}
                    />
                    <div className="text-[10px] text-stone-500">
                      این دستور به تمام تحلیل‌های شبانه و گفت‌وگوهای هوشمند مشاور اضافه می‌شود تا الگوریتم پاسخ‌دهی کاملاً مطابق با نظرات مشاوره شما عمل کند.
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'security' && (
                <form onSubmit={handleChangePasscodeSubmit} className="max-w-md space-y-4">
                  <h4 className="text-xs font-bold text-stone-900 flex items-center gap-1.5">
                    <Key className="w-4 h-4 text-indigo-600" />
                    تغییر رمز عبور پنل مدیریت مشاور
                  </h4>

                  {passcodeChangeMsg && (
                    <div className={`p-3 rounded-xl text-xs font-bold ${
                      passcodeChangeMsg.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'
                    }`}>
                      {passcodeChangeMsg.text}
                    </div>
                  )}

                  <div>
                    <label className="block text-[11px] font-bold text-stone-700 mb-1">رمز عبور فعلی:</label>
                    <input
                      type="password"
                      value={currentPasscode}
                      onChange={(e) => setCurrentPasscode(e.target.value)}
                      placeholder="رمز فعلی (پیش‌فرض: 1234)"
                      className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs focus:outline-emerald-600 bg-white"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-stone-700 mb-1">رمز عبور جدید:</label>
                    <input
                      type="password"
                      value={newPasscode}
                      onChange={(e) => setNewPasscode(e.target.value)}
                      placeholder="حداقل ۴ کاراکتر یا عدد"
                      className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs focus:outline-emerald-600 bg-white"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-stone-700 mb-1">تکرار رمز عبور جدید:</label>
                    <input
                      type="password"
                      value={confirmPasscode}
                      onChange={(e) => setConfirmPasscode(e.target.value)}
                      placeholder="تکرار رمز جدید"
                      className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs focus:outline-emerald-600 bg-white"
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 px-4 rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs shadow-xs transition-all cursor-pointer"
                  >
                    ذخیره رمز عبور جدید
                  </button>
                </form>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Counselor Device Session Manager for Selected Student */}
      {selectedStudentForDevices && (
        <DeviceSessionManagerModal
          isOpen={Boolean(selectedStudentForDevices)}
          onClose={() => setSelectedStudentForDevices(null)}
          profile={selectedStudentForDevices}
          isCounselorView={true}
          onDevicesUpdated={(updatedDevices) => {
            if (onUpdateStudentProfile) {
              const updatedProfile = { ...selectedStudentForDevices, boundDevices: updatedDevices };
              onUpdateStudentProfile(updatedProfile);
              setSelectedStudentForDevices(updatedProfile);
            }
          }}
        />
      )}
    </div>
  );
};
