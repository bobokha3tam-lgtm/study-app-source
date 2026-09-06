import React, { useState, useMemo } from 'react';
import { 
  ShieldCheck, 
  Users, 
  UserPlus, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  Search, 
  Filter, 
  ExternalLink, 
  Key, 
  Copy, 
  Check, 
  Share2, 
  Trash2, 
  Pencil,
  Lock, 
  Unlock, 
  Eye, 
  LogOut, 
  Megaphone, 
  Settings, 
  BookOpen, 
  Target, 
  Activity, 
  Moon, 
  Sparkles, 
  Brain, 
  Flame, 
  FileText, 
  X,
  Layers,
  EyeOff,
  RefreshCw,
  ShieldAlert,
  Server,
  Bot,
  Play,
  Square,
  Send,
  Smartphone,
  Zap,
  Radio,
  Crosshair,
  Ban,
  Cpu,
  Sliders,
  Shield,
  Globe,
  Terminal
} from 'lucide-react';
import { StudentProfile, NightlyReport, SecurityMetrics, SecurityAuditLog } from '../types';
import { calculateStudentUsage, StudentUsageStats } from '../utils/studentUsageHelper';
import { ShareModal } from './ShareModal';
import { DeviceSessionManagerModal } from './DeviceSessionManagerModal';

interface CounselorDedicatedPortalProps {
  students: StudentProfile[];
  activeStudent: StudentProfile;
  serverUsageStats: Record<string, any>;
  onSelectStudentWorkspace: (student: StudentProfile) => void;
  onAddStudent: (newStudent: StudentProfile) => void;
  onDeleteStudent: (studentNameOrId: string) => void;
  onUpdateStudentProfile: (student: StudentProfile) => void;
  counselorAnnouncement: string;
  onUpdateCounselorAnnouncement: (text: string) => void;
  counselorSystemDirective: string;
  onUpdateCounselorSystemDirective: (text: string) => void;
  adminPasscode: string;
  onUpdateAdminPasscode: (newPasscode: string) => void;
  onExitCounselorPortal: () => void;
}

export const CounselorDedicatedPortal: React.FC<CounselorDedicatedPortalProps> = ({
  students,
  activeStudent,
  serverUsageStats,
  onSelectStudentWorkspace,
  onAddStudent,
  onDeleteStudent,
  onUpdateStudentProfile,
  counselorAnnouncement,
  onUpdateCounselorAnnouncement,
  counselorSystemDirective,
  onUpdateCounselorSystemDirective,
  adminPasscode,
  onUpdateAdminPasscode,
  onExitCounselorPortal,
}) => {
  // Navigation Tabs in Counselor Portal
  const [activeTab, setActiveTab] = useState<'monitoring' | 'accounts' | 'broadcast' | 'security' | 'telegram'>('monitoring');

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [fieldFilter, setFieldFilter] = useState<'all' | 'ریاضی و فیزیک' | 'علوم تجربی' | 'ادبیات و علوم انسانی'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'suspended' | 'needs_followup'>('all');

  // New Student Form State
  const [newName, setNewName] = useState('');
  const [newGrade, setNewGrade] = useState('دوازدهم / کنکوری');
  const [newField, setNewField] = useState('علوم تجربی');
  const [newGoal, setNewGoal] = useState('پزشکی دانشگاه تهران');
  const [newHours, setNewHours] = useState<number>(8);
  const [newPassword, setNewPassword] = useState('1234');
  const [addStudentSuccess, setAddStudentSuccess] = useState(false);

  // Security Form State
  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [securityMsg, setSecurityMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Advanced Security Center State & Cyber Warfare Controls
  const [securityMetrics, setSecurityMetrics] = useState<SecurityMetrics | null>(null);
  const [isLoadingSecurity, setIsLoadingSecurity] = useState(false);
  const [isRevokingSessions, setIsRevokingSessions] = useState(false);
  const [showMaskedPasswords, setShowMaskedPasswords] = useState(false);
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [auditFilter, setAuditFilter] = useState<'all' | 'critical' | 'warning' | 'info'>('all');
  const [auditSearch, setAuditSearch] = useState('');

  // Cyber Defense Controls State
  const [isSettingDefcon, setIsSettingDefcon] = useState(false);
  const [simulatingAttack, setSimulatingAttack] = useState<string | null>(null);
  const [simulationMsg, setSimulationMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [manualBanIpInput, setManualBanIpInput] = useState('');
  const [manualBanReasonInput, setManualBanReasonInput] = useState('');
  const [manualBanCounterMeasure, setManualBanCounterMeasure] = useState<'tarpit' | 'hard_drop'>('tarpit');
  const [manualBanDuration, setManualBanDuration] = useState(120);
  const [isBanningIp, setIsBanningIp] = useState(false);
  const [unbanningIp, setUnbanningIp] = useState<string | null>(null);

  // Counselor Master Telegram Bot Management State
  const [telegramMasterToken, setTelegramMasterToken] = useState('');
  const [telegramMasterUsername, setTelegramMasterUsername] = useState('');
  const [isTelegramPollingActive, setIsTelegramPollingActive] = useState(false);
  const [isConfiguringTelegramBot, setIsConfiguringTelegramBot] = useState(false);
  const [isTogglingTelegramPolling, setIsTogglingTelegramPolling] = useState(false);
  const [telegramBotMsg, setTelegramBotMsg] = useState<{ type: 'success' | 'error'; text: string; warning?: string } | null>(null);
  const [telegramActivityLogs, setTelegramActivityLogs] = useState<any[]>([]);
  const [editingTelegramChatIdFor, setEditingTelegramChatIdFor] = useState<string | null>(null);
  const [tempTelegramChatId, setTempTelegramChatId] = useState('');
  const [tempTelegramUsername, setTempTelegramUsername] = useState('');
  const [deviceModalStudent, setDeviceModalStudent] = useState<StudentProfile | null>(null);
  const [isTestingPingFor, setIsTestingPingFor] = useState<string | null>(null);
  const [pingTestStatus, setPingTestStatus] = useState<{ studentKey: string; success: boolean; message: string } | null>(null);

  // Inline Password Change State
  const [editingPasswordFor, setEditingPasswordFor] = useState<string | null>(null);
  const [tempPassword, setTempPassword] = useState('');

  // Share Modal State inside Counselor Portal
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [shareStudentTarget, setShareStudentTarget] = useState<string | undefined>(undefined);

  // Detailed Student Modal State
  const [inspectingStudent, setInspectingStudent] = useState<StudentProfile | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Student Management & Modal States
  const [studentToDelete, setStudentToDelete] = useState<StudentProfile | null>(null);
  const [studentToEdit, setStudentToEdit] = useState<StudentProfile | null>(null);
  const [editFormData, setEditFormData] = useState<Partial<StudentProfile>>({});
  const [showRevokeConfirmModal, setShowRevokeConfirmModal] = useState(false);
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);

  const handleConfirmDeleteStudent = () => {
    if (!studentToDelete) return;
    const name = studentToDelete.name;
    const key = studentToDelete.id || studentToDelete.name;
    onDeleteStudent(key);
    setStudentToDelete(null);
    setActionSuccessMsg(`حساب کاربری دانش‌آموز «${name}» با موفقیت به طور کامل حذف شد.`);
    setTimeout(() => setActionSuccessMsg(null), 3500);
  };

  const handleOpenEditStudent = (student: StudentProfile) => {
    setStudentToEdit(student);
    setEditFormData({
      name: student.name,
      grade: student.grade || 'دوازدهم / کنکور',
      fieldOfStudy: student.fieldOfStudy || 'علوم تجربی',
      targetGoal: student.targetGoal || '',
      dailyTargetHours: student.dailyTargetHours || 8,
      password: student.password || '1234',
      accessStatus: student.accessStatus || 'active',
      lockoutReason: student.lockoutReason || '',
      telegramChatId: student.telegramChatId || '',
      telegramUsername: student.telegramUsername || '',
      additionalNotes: student.additionalNotes || '',
    });
  };

  const handleSaveEditStudent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentToEdit || !editFormData.name?.trim()) return;

    const updated: StudentProfile = {
      ...studentToEdit,
      name: editFormData.name.trim(),
      grade: editFormData.grade || studentToEdit.grade,
      fieldOfStudy: editFormData.fieldOfStudy || studentToEdit.fieldOfStudy,
      targetGoal: editFormData.targetGoal || studentToEdit.targetGoal,
      dailyTargetHours: Number(editFormData.dailyTargetHours) || studentToEdit.dailyTargetHours || 8,
      password: editFormData.password?.trim() || studentToEdit.password || '1234',
      accessStatus: editFormData.accessStatus || studentToEdit.accessStatus || 'active',
      lockoutReason: editFormData.accessStatus === 'suspended' ? (editFormData.lockoutReason || 'دسترسی شما توسط مشاور تعلیق شده است.') : undefined,
      telegramChatId: editFormData.telegramChatId?.trim() || undefined,
      telegramUsername: editFormData.telegramUsername?.trim() || undefined,
      additionalNotes: editFormData.additionalNotes || studentToEdit.additionalNotes || '',
    };

    onUpdateStudentProfile(updated);
    setStudentToEdit(null);
    setActionSuccessMsg(`مشخصات دانش‌آموز «${updated.name}» با موفقیت به‌روزرسانی و ذخیره شد.`);
    setTimeout(() => setActionSuccessMsg(null), 3500);
  };

  // Calculate usage stats for all students
  const studentsUsageMap = useMemo(() => {
    const map: Record<string, StudentUsageStats> = {};
    students.forEach((s) => {
      const key = s.id || s.name;
      const localStats = calculateStudentUsage(s);
      if (serverUsageStats && serverUsageStats[key]) {
        localStats.aiUsageCount = serverUsageStats[key].aiUsageCount || 0;
      }
      map[key] = localStats;
    });
    return map;
  }, [students, serverUsageStats]);

  // Aggregated Macro KPIs
  const macroStats = useMemo(() => {
    let totalHours = 0;
    let totalTests = 0;
    let totalReports = 0;
    let needsFollowupCount = 0;

    (Object.values(studentsUsageMap) as StudentUsageStats[]).forEach((stat) => {
      totalHours += stat.totalStudiedHours;
      totalTests += stat.totalTests;
      totalReports += stat.reportsCount;
      if (stat.activityStatus === 'needs_followup' || stat.dailyAverageHours < 4) {
        needsFollowupCount++;
      }
    });

    return {
      totalStudents: students.length,
      activeCount: students.filter((s) => s.accessStatus !== 'suspended' && s.accessStatus !== 'expired').length,
      totalHours: Math.round(totalHours * 10) / 10,
      totalTests,
      totalReports,
      needsFollowupCount,
    };
  }, [students, studentsUsageMap]);

  // Filtered Students List
  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      const key = s.id || s.name;
      const stats = studentsUsageMap[key];

      // Search match
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const matchesName = s.name.toLowerCase().includes(q);
        const matchesGoal = (s.targetGoal || '').toLowerCase().includes(q);
        if (!matchesName && !matchesGoal) return false;
      }

      // Field match
      if (fieldFilter !== 'all' && s.fieldOfStudy !== fieldFilter) {
        return false;
      }

      // Status match
      if (statusFilter === 'active' && s.accessStatus === 'suspended') return false;
      if (statusFilter === 'suspended' && s.accessStatus !== 'suspended') return false;
      if (statusFilter === 'needs_followup') {
        if (!stats || (stats.activityStatus !== 'needs_followup' && stats.dailyAverageHours >= 4)) {
          return false;
        }
      }

      return true;
    });
  }, [students, studentsUsageMap, searchQuery, fieldFilter, statusFilter]);

  const handleCopyLink = (student: StudentProfile) => {
    const origin = typeof window !== 'undefined' ? window.location.origin + window.location.pathname : '';
    const param = encodeURIComponent(student.id || student.name);
    const dedicatedUrl = `${origin}?student=${param}`;

    let copied = false;
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(dedicatedUrl).then(() => {
        setCopiedKey(student.id || student.name);
        setTimeout(() => setCopiedKey(null), 2500);
      }).catch(() => {
        // fallback
      });
      copied = true;
    }

    if (!copied) {
      try {
        const ta = document.createElement('textarea');
        ta.value = dedicatedUrl;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        setCopiedKey(student.id || student.name);
        setTimeout(() => setCopiedKey(null), 2500);
      } catch (err) {
        setShareStudentTarget(student.name);
        setIsShareModalOpen(true);
      }
    }
  };

  const handleCreateStudent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    const newStudentProfile: StudentProfile = {
      id: `student-${Date.now()}`,
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
      accessStatus: 'active',
      additionalNotes: `اکانت تعریف شده در پنل مشاور در تاریخ ${new Date().toLocaleDateString('fa-IR')}`,
    };

    onAddStudent(newStudentProfile);
    setAddStudentSuccess(true);
    setNewName('');
    setTimeout(() => setAddStudentSuccess(false), 3000);
  };

  const handleToggleAccess = (student: StudentProfile) => {
    const nextStatus = student.accessStatus === 'suspended' ? 'active' : 'suspended';
    onUpdateStudentProfile({
      ...student,
      accessStatus: nextStatus,
      lockoutReason: nextStatus === 'suspended' ? 'دسترسی شما موقتاً توسط مشاور تعلیق شده است. جهت تمدید با مشاور تماس بگیرید.' : undefined,
    });
  };

  const handleSaveInlinePassword = (student: StudentProfile) => {
    if (!tempPassword.trim()) return;
    onUpdateStudentProfile({
      ...student,
      password: tempPassword.trim(),
    });
    setEditingPasswordFor(null);
    setTempPassword('');
  };

  const fetchSecurityStatus = async () => {
    setIsLoadingSecurity(true);
    try {
      const token = sessionStorage.getItem('study_advisor_counselor_token') || localStorage.getItem('study_advisor_counselor_token');
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch('/api/counselor/security-status', { headers });
      if (res.ok) {
        const data = await res.json();
        setSecurityMetrics(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoadingSecurity(false);
    }
  };

  React.useEffect(() => {
    if (activeTab === 'security') {
      fetchSecurityStatus();
    }
  }, [activeTab]);

  const handleRevokeAllSessions = () => {
    setShowRevokeConfirmModal(true);
  };

  const handleConfirmRevokeSessions = async () => {
    setShowRevokeConfirmModal(false);
    setIsRevokingSessions(true);
    try {
      const token = sessionStorage.getItem('study_advisor_counselor_token') || localStorage.getItem('study_advisor_counselor_token');
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch('/api/counselor/revoke-all', { method: 'POST', headers });
      const data = await res.json();
      if (res.ok) {
        setSecurityMsg({ type: 'success', text: data.message || 'تمام نشست‌های فعال مشاور با موفقیت ابطال شدند.' });
        fetchSecurityStatus();
      } else {
        setSecurityMsg({ type: 'error', text: data.error || 'خطا در ابطال نشست‌ها' });
      }
    } catch (e) {
      setSecurityMsg({ type: 'error', text: 'خطا در ارتباط با سرور امنیتی' });
    } finally {
      setIsRevokingSessions(false);
    }
  };

  const passwordStrength = useMemo(() => {
    if (!newPass) return { score: 0, label: 'بدون ورودی', color: 'bg-stone-700', textCol: 'text-stone-500' };
    let score = 0;
    if (newPass.length >= 4) score += 20;
    if (newPass.length >= 8) score += 30;
    if (/[0-9]/.test(newPass)) score += 25;
    if (/[a-zA-Z!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(newPass)) score += 25;

    if (score < 40) return { score, label: 'بسیار ضعیف (آسیب‌پذیر)', color: 'bg-rose-500', textCol: 'text-rose-400' };
    if (score < 70) return { score, label: 'متوسط (حداقل مجاز)', color: 'bg-amber-500', textCol: 'text-amber-400' };
    if (score < 90) return { score, label: 'خوب و امن', color: 'bg-blue-500', textCol: 'text-blue-400' };
    return { score: 100, label: 'بسیار مقاوم در برابر نفوذ و Brute-force', color: 'bg-emerald-500', textCol: 'text-emerald-400' };
  }, [newPass]);

  const handleChangePasscode = async (e: React.FormEvent) => {
    e.preventDefault();
    setSecurityMsg(null);

    if (!newPass.trim() || newPass.trim().length < 4) {
      setSecurityMsg({ type: 'error', text: 'رمز عبور جدید باید حداقل ۴ رقم یا کاراکتر باشد.' });
      return;
    }

    if (newPass.trim() !== confirmPass.trim()) {
      setSecurityMsg({ type: 'error', text: 'تکرار رمز عبور جدید مطابقت ندارد.' });
      return;
    }

    try {
      const token = sessionStorage.getItem('study_advisor_counselor_token') || localStorage.getItem('study_advisor_counselor_token');
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch('/api/counselor/change-passcode', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          currentPasscode: currentPass.trim(),
          newPasscode: newPass.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setSecurityMsg({ type: 'error', text: data?.error || 'خطا در ثبت رمز عبور روی سرور.' });
        return;
      }

      if (data.token) {
        sessionStorage.setItem('study_advisor_counselor_token', data.token);
        localStorage.setItem('study_advisor_counselor_token', data.token);
      }

      onUpdateAdminPasscode(newPass.trim());
      localStorage.setItem('study_advisor_admin_passcode', newPass.trim());
      setSecurityMsg({ type: 'success', text: 'رمز عبور مشاور با موفقیت تغییر یافت.' });
      setCurrentPass('');
      setNewPass('');
      setConfirmPass('');
      fetchSecurityStatus();
    } catch (e) {
      console.error(e);
      setSecurityMsg({ type: 'error', text: 'خطا در ارتباط با سرور.' });
    }
  };

  const handleSetDefconLevel = async (level: number) => {
    setIsSettingDefcon(true);
    try {
      const token = sessionStorage.getItem('study_advisor_counselor_token') || localStorage.getItem('study_advisor_counselor_token');
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch('/api/security/set-defcon', {
        method: 'POST',
        headers,
        body: JSON.stringify({ level }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSimulationMsg({ type: 'success', text: data.message || `سطح پدافند با موفقیت به DEFCON ${level} ارتقا یافت.` });
        fetchSecurityStatus();
      } else {
        setSimulationMsg({ type: 'error', text: data?.error || 'خطا در تغییر سطح DEFCON' });
      }
    } catch (e) {
      setSimulationMsg({ type: 'error', text: 'خطا در اتصال به سرور دفاعی.' });
    } finally {
      setIsSettingDefcon(false);
      setTimeout(() => setSimulationMsg(null), 5000);
    }
  };

  const handleSimulateAttack = async (attackType: 'sqli' | 'ddos' | 'xss' | 'honeypot' | 'probe') => {
    setSimulatingAttack(attackType);
    setSimulationMsg(null);
    try {
      const token = sessionStorage.getItem('study_advisor_counselor_token') || localStorage.getItem('study_advisor_counselor_token');
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch('/api/security/simulate-attack', {
        method: 'POST',
        headers,
        body: JSON.stringify({ attackType }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSimulationMsg({
          type: 'success',
          text: `🛡️ ${data.message} (IP فرضی: ${data.simulatedIp})`
        });
        fetchSecurityStatus();
      } else {
        setSimulationMsg({ type: 'error', text: data?.error || 'خطا در اجرای مانور شبیه‌سازی حمله' });
      }
    } catch (e) {
      setSimulationMsg({ type: 'error', text: 'خطا در ارتباط با واحد پدافند سرور.' });
    } finally {
      setSimulatingAttack(null);
      setTimeout(() => setSimulationMsg(null), 8000);
    }
  };

  const handleManualBanIp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualBanIpInput.trim()) return;
    setIsBanningIp(true);
    setSimulationMsg(null);

    try {
      const token = sessionStorage.getItem('study_advisor_counselor_token') || localStorage.getItem('study_advisor_counselor_token');
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch('/api/security/ban-ip', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          ip: manualBanIpInput.trim(),
          reason: manualBanReasonInput.trim() || 'مسدودسازی دستی توسط مشاور',
          threatType: 'manual_admin_ban',
          counterMeasure: manualBanCounterMeasure,
          durationMinutes: manualBanDuration,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSimulationMsg({ type: 'success', text: `آدرس ${manualBanIpInput} قرنطینه شد و پدافند فعال گردید.` });
        setManualBanIpInput('');
        setManualBanReasonInput('');
        fetchSecurityStatus();
      } else {
        setSimulationMsg({ type: 'error', text: data?.error || 'خطا در مسدودسازی IP' });
      }
    } catch (e) {
      setSimulationMsg({ type: 'error', text: 'خطا در اعمال دستور قرنطینه.' });
    } finally {
      setIsBanningIp(false);
      setTimeout(() => setSimulationMsg(null), 6000);
    }
  };

  const handleUnbanIp = async (ip: string) => {
    setUnbanningIp(ip);
    try {
      const token = sessionStorage.getItem('study_advisor_counselor_token') || localStorage.getItem('study_advisor_counselor_token');
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch('/api/security/unban-ip', {
        method: 'POST',
        headers,
        body: JSON.stringify({ ip }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSimulationMsg({ type: 'success', text: `آدرس ${ip} با موفقیت از قرنطینه خارج گردید.` });
        fetchSecurityStatus();
      } else {
        setSimulationMsg({ type: 'error', text: data?.error || 'خطا در رفع مسدودی IP' });
      }
    } catch (e) {
      setSimulationMsg({ type: 'error', text: 'خطا در رفع مسدودی.' });
    } finally {
      setUnbanningIp(null);
      setTimeout(() => setSimulationMsg(null), 5000);
    }
  };

  const handleClearSecurityLogs = async () => {
    if (!confirm('آیا از پاکسازی تمام لاگ‌های امنیتی اطمینان دارید؟')) return;
    try {
      const token = sessionStorage.getItem('study_advisor_counselor_token') || localStorage.getItem('study_advisor_counselor_token');
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch('/api/security/clear-logs', { method: 'POST', headers });
      const data = await res.json();
      if (res.ok && data.success) {
        setSimulationMsg({ type: 'success', text: 'تاریخچه لاگ‌های امنیتی پاکسازی شد.' });
        fetchSecurityStatus();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchTelegramStatus = async () => {
    try {
      const res = await fetch('/api/telegram/public-info');
      const data = await res.json();
      if (data) {
        setTelegramMasterUsername(data.botUsername || '');
        setIsTelegramPollingActive(Boolean(data.isPollingActive));
      }

      const logsRes = await fetch('/api/telegram/activity-logs');
      const logsData = await logsRes.json();
      if (logsData && Array.isArray(logsData.logs)) {
        setTelegramActivityLogs(logsData.logs);
      }
    } catch (e) {
      console.error('Failed to fetch Telegram status:', e);
    }
  };

  React.useEffect(() => {
    if (activeTab === 'telegram') {
      fetchTelegramStatus();
      const interval = setInterval(fetchTelegramStatus, 3500);
      return () => clearInterval(interval);
    }
  }, [activeTab]);

  const handleSaveMasterBotToken = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!telegramMasterToken.trim()) return;

    setIsConfiguringTelegramBot(true);
    setTelegramBotMsg(null);

    try {
      const token = sessionStorage.getItem('study_advisor_counselor_token') || localStorage.getItem('study_advisor_counselor_token');
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch('/api/counselor/telegram-config', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          botToken: telegramMasterToken.trim(),
          active: true,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setTelegramMasterUsername(data.botInfo?.username || '');
        setIsTelegramPollingActive(true);
        setTelegramBotMsg({
          type: 'success',
          text: data.message || `ربات اصلی مشاور (@${data.botInfo?.username}) با موفقیت متصل و فعال گردید.`,
        });
        setTelegramMasterToken('');
        fetchTelegramStatus();
      } else {
        setTelegramBotMsg({
          type: 'error',
          text: data.error || 'خطا در تایید و اتصال ربات تلگرام.',
        });
      }
    } catch (err: any) {
      setTelegramBotMsg({
        type: 'error',
        text: `عدم امکان برقراری ارتباط با سرور: ${err?.message || 'خطای شبکه'}`,
      });
    } finally {
      setIsConfiguringTelegramBot(false);
    }
  };

  const handleToggleTelegramPolling = async (active: boolean) => {
    setIsTogglingTelegramPolling(true);
    try {
      const token = sessionStorage.getItem('study_advisor_counselor_token') || localStorage.getItem('study_advisor_counselor_token');
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch('/api/counselor/telegram-toggle-polling', {
        method: 'POST',
        headers,
        body: JSON.stringify({ active }),
      });

      const data = await res.json();
      if (data.success) {
        setIsTelegramPollingActive(active);
        fetchTelegramStatus();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsTogglingTelegramPolling(false);
    }
  };

  const handleClearTelegramLogs = async () => {
    try {
      await fetch('/api/telegram/clear-logs', { method: 'POST' });
      setTelegramActivityLogs([]);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveInlineStudentTelegramChatId = (student: StudentProfile) => {
    if (!tempTelegramChatId.trim()) return;
    const updated = {
      ...student,
      telegramChatId: tempTelegramChatId.trim(),
      telegramUsername: tempTelegramUsername.trim() || student.telegramUsername,
    };
    onUpdateStudentProfile(updated);
    setEditingTelegramChatIdFor(null);
    setTempTelegramChatId('');
    setTempTelegramUsername('');
    setActionSuccessMsg(`شناسه چت تلگرام برای دانش‌آموز «${student.name}» با موفقیت ذخیره شد.`);
    setTimeout(() => setActionSuccessMsg(null), 3000);
  };

  const handleSendTestPingToStudent = async (student: StudentProfile) => {
    const targetChatId = student.telegramChatId;
    if (!targetChatId) {
      alert('این دانش‌آموز هنوز شناسه چت تلگرام خود را ثبت نکرده است.');
      return;
    }

    const key = student.id || student.name;
    setIsTestingPingFor(key);
    setPingTestStatus(null);

    try {
      const res = await fetch('/api/telegram/test-student-ping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentKey: key,
          chatId: targetChatId,
        }),
      });

      const data = await res.json();
      setPingTestStatus({
        studentKey: key,
        success: Boolean(data.success),
        message: data.message || data.error || 'پاسخ دریافت شد.',
      });
    } catch (err: any) {
      setPingTestStatus({
        studentKey: key,
        success: false,
        message: 'خطا در ارسال پیام تست تلگرام.',
      });
    } finally {
      setIsTestingPingFor(null);
    }
  };

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-white pb-16">
      {/* Top Navigation Bar of Counselor Portal */}
      <header className="sticky top-0 z-40 bg-stone-900/95 backdrop-blur-md border-b border-stone-800 shadow-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between gap-4">
          {/* Brand & Identity */}
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-emerald-600 via-teal-600 to-emerald-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/20 border border-emerald-400/30 shrink-0">
              <ShieldCheck className="w-6 h-6 text-white animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-black text-white tracking-tight">
                  پنل اختصاصی مشاور <span className="text-emerald-400 font-extrabold">·</span> مرکز رصد و فرماندهی
                </h1>
                <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  مدیریت ارشد فعال
                </span>
              </div>
              <p className="text-[11px] text-stone-400 hidden sm:block">
                سامانه پایش پیشرفت و استفاده تحصیلی دانش‌آموزان، مدیریت برنامه‌ها و گزارش‌های شبانه
              </p>
            </div>
          </div>

          {/* Action Buttons: Share & Exit */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setShareStudentTarget(undefined);
                setIsShareModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600/90 hover:bg-emerald-600 text-white transition-all text-xs font-bold shadow-xs cursor-pointer border border-emerald-500/40 hover:shadow-emerald-600/20"
              title="اشتراک‌گذاری سامانه و ارسال لینک اختصاصی برای دانش‌آموزان"
            >
              <Share2 className="w-4 h-4 text-emerald-200" />
              <span>اشتراک‌گذاری لینک</span>
            </button>

            <button
              onClick={onExitCounselorPortal}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white transition-all text-xs font-bold border border-stone-700 shadow-xs cursor-pointer group"
              title="خروج از پنل مشاور و بازگشت به نمای دانش‌آموز"
            >
              <LogOut className="w-4 h-4 text-rose-400 group-hover:-translate-x-0.5 transition-transform" />
              <span>خروج از پنل مشاور</span>
            </button>
          </div>
        </div>

        {/* Counselor Portal Sub-Tabs */}
        <div className="border-t border-stone-800/80 bg-stone-900/90 px-4 sm:px-6 lg:px-8 py-2.5">
          <div className="max-w-7xl mx-auto flex flex-wrap items-center gap-2">
            <button
              onClick={() => setActiveTab('monitoring')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                activeTab === 'monitoring'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                  : 'text-stone-400 hover:text-white hover:bg-stone-800 border border-transparent hover:border-stone-700'
              }`}
            >
              <Activity className="w-4 h-4 text-emerald-400" />
              <span>📊 رصد فعالیت دانش‌آموزان</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                activeTab === 'monitoring' ? 'bg-emerald-950 text-emerald-300 border border-emerald-700' : 'bg-stone-800 text-stone-300'
              }`}>
                {macroStats.totalStudents} نفر
              </span>
            </button>

            <button
              onClick={() => setActiveTab('accounts')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                activeTab === 'accounts'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                  : 'text-stone-400 hover:text-white hover:bg-stone-800 border border-transparent hover:border-stone-700'
              }`}
            >
              <UserPlus className="w-4 h-4 text-emerald-400" />
              <span>➕ مدیریت و افزودن اکانت‌ها</span>
            </button>

            <button
              onClick={() => setActiveTab('broadcast')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                activeTab === 'broadcast'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                  : 'text-stone-400 hover:text-white hover:bg-stone-800 border border-transparent hover:border-stone-700'
              }`}
            >
              <Megaphone className="w-4 h-4 text-amber-400" />
              <span>📢 اطلاعیه سراسری و هدایت AI</span>
            </button>

            <button
              onClick={() => setActiveTab('security')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                activeTab === 'security'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                  : 'text-stone-400 hover:text-white hover:bg-stone-800 border border-transparent hover:border-stone-700'
              }`}
            >
              <Key className="w-4 h-4 text-teal-400" />
              <span>🔐 امنیت و تغییر رمز مشاور</span>
            </button>

            <button
              onClick={() => setActiveTab('telegram')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                activeTab === 'telegram'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30 ring-2 ring-emerald-400/40'
                  : 'text-stone-300 hover:text-white bg-stone-800/80 hover:bg-stone-800 border border-stone-700/80 hover:border-emerald-500/50'
              }`}
            >
              <Bot className="w-4 h-4 text-emerald-400" />
              <span>🤖 اتصال و مدیریت ربات تلگرام</span>
              {telegramMasterUsername ? (
                <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-700 font-mono">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  @{telegramMasterUsername}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-amber-950/80 text-amber-300 border border-amber-700">
                  تنظیم توکن
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        
        {/* Top KPI Statistics Ribbon */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4 shadow-md relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-stone-400">کل دانش‌آموزان</span>
              <Users className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black text-white">{macroStats.totalStudents}</span>
              <span className="text-[11px] text-emerald-400 font-bold">({macroStats.activeCount} فعال)</span>
            </div>
            <div className="mt-1 text-[10px] text-stone-400">تحت نظارت و برنامه‌ریزی مستقیم</div>
          </div>

          <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4 shadow-md relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-stone-400">مجموع ساعات مطالعه</span>
              <Clock className="w-4 h-4 text-teal-400" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black text-teal-300">{macroStats.totalHours}</span>
              <span className="text-xs text-stone-300">ساعت</span>
            </div>
            <div className="mt-1 text-[10px] text-stone-400">ثبت‌شده در گزارش‌ها و برنامه‌ها</div>
          </div>

          <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4 shadow-md relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-stone-400">کل تست‌های حل‌شده</span>
              <Target className="w-4 h-4 text-indigo-400" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black text-indigo-300">{macroStats.totalTests.toLocaleString('fa-IR')}</span>
              <span className="text-xs text-stone-300">تست</span>
            </div>
            <div className="mt-1 text-[10px] text-stone-400">آزمون‌ها و پارت‌های تمرکز</div>
          </div>

          <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4 shadow-md relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-stone-400">نیازمند پیگیری مشاور</span>
              <AlertTriangle className="w-4 h-4 text-amber-400" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black text-amber-400">{macroStats.needsFollowupCount}</span>
              <span className="text-xs text-stone-300">نفر</span>
            </div>
            <div className="mt-1 text-[10px] text-amber-300/80 font-medium">افت ساعت مطالعه یا تأخیر گزارش</div>
          </div>
        </div>

        {/* TAB 1: Real-time Student Usage & Activity Monitoring */}
        {activeTab === 'monitoring' && (
          <div className="space-y-4">
            {/* Search, Filter and Actions Toolbar */}
            <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-md">
              <div className="relative w-full sm:w-80">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="جستجوی نام یا هدف دانش‌آموز..."
                  className="w-full px-4 py-2.5 pr-10 rounded-xl bg-stone-800 border border-stone-700 text-white placeholder-stone-400 text-xs focus:outline-emerald-500 focus:border-emerald-500 transition-all text-right"
                />
                <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 pointer-events-none" />
              </div>

              {/* Filters */}
              <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
                <select
                  value={fieldFilter}
                  onChange={(e: any) => setFieldFilter(e.target.value)}
                  className="px-3 py-2 rounded-xl bg-stone-800 border border-stone-700 text-stone-200 text-xs font-bold focus:outline-emerald-500"
                >
                  <option value="all">همه رشته‌ها</option>
                  <option value="علوم تجربی">علوم تجربی</option>
                  <option value="ریاضی و فیزیک">ریاضی و فیزیک</option>
                  <option value="ادبیات و علوم انسانی">ادبیات و انسانی</option>
                </select>

                <select
                  value={statusFilter}
                  onChange={(e: any) => setStatusFilter(e.target.value)}
                  className="px-3 py-2 rounded-xl bg-stone-800 border border-stone-700 text-stone-200 text-xs font-bold focus:outline-emerald-500"
                >
                  <option value="all">همه وضعیت‌ها</option>
                  <option value="active">فقط فعال‌ها</option>
                  <option value="needs_followup">🚨 نیازمند پیگیری</option>
                  <option value="suspended">🔒 معلق / مسدود</option>
                </select>
              </div>
            </div>

            {/* Students List with Rich Usage Cards */}
            <div className="space-y-3">
              {filteredStudents.length === 0 ? (
                <div className="bg-stone-900 border border-stone-800 rounded-2xl p-12 text-center space-y-3">
                  <Users className="w-12 h-12 text-stone-600 mx-auto" />
                  <p className="text-stone-400 text-sm font-bold">دانش‌آموزی با این مشخصات یافت نشد.</p>
                </div>
              ) : (
                filteredStudents.map((student) => {
                  const key = student.id || student.name;
                  const stats = studentsUsageMap[key] || calculateStudentUsage(student);
                  const isCurrentActive = activeStudent.name === student.name || (student.id && activeStudent.id === student.id);
                  const isSuspended = student.accessStatus === 'suspended';

                  return (
                    <div
                      key={key}
                      className={`bg-stone-900 border rounded-2xl p-4 sm:p-5 transition-all shadow-md hover:border-emerald-500/50 relative overflow-hidden ${
                        isSuspended
                          ? 'border-rose-900/60 opacity-90'
                          : stats.activityStatus === 'needs_followup'
                          ? 'border-amber-800/80 bg-stone-900/90'
                          : 'border-stone-800'
                      }`}
                    >
                      {/* Top Header of Card */}
                      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-stone-800">
                        {/* Student Info */}
                        <div className="flex items-center gap-3.5">
                          <div
                            className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-lg text-white shadow-md shrink-0 ${
                              isSuspended
                                ? 'bg-rose-900 text-rose-300'
                                : 'bg-gradient-to-tr from-emerald-600 to-teal-600 text-white'
                            }`}
                          >
                            {student.name.charAt(0)}
                          </div>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="text-base font-black text-white">{student.name}</h3>
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-stone-800 text-stone-300 border border-stone-700">
                                {student.grade} • {student.fieldOfStudy}
                              </span>
                              {isSuspended ? (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-950 text-rose-400 border border-rose-800 flex items-center gap-1">
                                  <Lock className="w-3 h-3" />
                                  معلق / مسدود
                                </span>
                              ) : stats.activityStatus === 'needs_followup' ? (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-950 text-amber-300 border border-amber-700 flex items-center gap-1">
                                  <AlertTriangle className="w-3 h-3" />
                                  نیازمند پیگیری
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950 text-emerald-400 border border-emerald-800 flex items-center gap-1">
                                  <CheckCircle2 className="w-3 h-3" />
                                  فعال
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-stone-400 mt-1 flex items-center gap-2">
                              <span>🎯 هدف: <strong className="text-emerald-300 font-bold">{student.targetGoal || 'قبولی کنکور'}</strong></span>
                              <span>•</span>
                              <span>ساعت هدف روزانه: <strong className="text-stone-200">{student.dailyTargetHours || 8} ساعت</strong></span>
                            </div>
                          </div>
                        </div>

                        {/* Quick Password & Link Box */}
                        <div className="flex flex-wrap items-center gap-2">
                          {/* Student Password Display / Edit */}
                          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-stone-800 border border-stone-700 text-xs">
                            <Key className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                            <span className="text-stone-400">رمز:</span>
                            {editingPasswordFor === key ? (
                              <div className="flex items-center gap-1">
                                <input
                                  type="text"
                                  value={tempPassword}
                                  onChange={(e) => setTempPassword(e.target.value)}
                                  className="w-16 px-1.5 py-0.5 rounded bg-stone-900 border border-emerald-500 text-white font-mono text-center text-xs"
                                  autoFocus
                                />
                                <button
                                  onClick={() => handleSaveInlinePassword(student)}
                                  className="p-1 rounded bg-emerald-600 text-white hover:bg-emerald-500 cursor-pointer"
                                  title="ذخیره"
                                >
                                  <Check className="w-3 h-3" />
                                </button>
                                <button
                                  onClick={() => setEditingPasswordFor(null)}
                                  className="p-1 rounded bg-stone-700 text-stone-300 hover:bg-stone-600 cursor-pointer"
                                  title="انصراف"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => {
                                  setEditingPasswordFor(key);
                                  setTempPassword(student.password || '1234');
                                }}
                                className="font-mono font-bold text-white hover:text-emerald-300 hover:underline transition-colors"
                                title="کلیک برای ویرایش رمز این دانش‌آموز"
                              >
                                {student.password || '1234'}
                              </button>
                            )}
                          </div>

                          {/* Copy Link Button */}
                          <button
                            onClick={() => handleCopyLink(student)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 hover:text-white transition-colors text-xs font-bold border border-stone-700 cursor-pointer"
                            title="کپی لینک اختصاصی دانش‌آموز برای ارسال به او"
                          >
                            {copiedKey === key ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-emerald-400" />
                                <span className="text-emerald-400">کپی شد!</span>
                              </>
                            ) : (
                              <>
                                <Share2 className="w-3.5 h-3.5 text-stone-400" />
                                <span>لینک دانش‌آموز</span>
                              </>
                            )}
                          </button>

                          {/* Switch to Student Workspace */}
                          <button
                            onClick={() => onSelectStudentWorkspace(student)}
                            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-md shadow-emerald-900/30 transition-all cursor-pointer"
                            title="ورود به میز کار این دانش‌آموز برای مشاهده و تغییر برنامه و گزارش‌ها"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>ورود به میز کار</span>
                          </button>
                        </div>
                      </div>

                      {/* Usage Metrics Breakdown Grid */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-4">
                        {/* 1. Study Hours */}
                        <div className="bg-stone-800/80 rounded-xl p-3 border border-stone-750 space-y-1.5">
                          <div className="flex items-center justify-between text-xs text-stone-400">
                            <span className="flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5 text-emerald-400" />
                              ساعات مطالعه
                            </span>
                            <span className="font-bold text-white">{stats.totalStudiedHours}h</span>
                          </div>
                          <div className="flex items-center justify-between text-[11px] text-stone-300">
                            <span>میانگین روزانه:</span>
                            <strong className="text-emerald-300">{stats.dailyAverageHours} ساعت</strong>
                          </div>
                          {/* Progress bar vs daily target */}
                          <div className="w-full bg-stone-700 h-1.5 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                stats.targetAchievementPercentage >= 80
                                  ? 'bg-emerald-500'
                                  : stats.targetAchievementPercentage >= 50
                                  ? 'bg-amber-500'
                                  : 'bg-rose-500'
                              }`}
                              style={{ width: `${Math.min(100, stats.targetAchievementPercentage)}%` }}
                            />
                          </div>
                          <div className="text-[10px] text-stone-400 text-left">
                            تحقق هدف: {stats.targetAchievementPercentage}٪
                          </div>
                        </div>

                        {/* 2. Tests & Accuracy */}
                        <div className="bg-stone-800/80 rounded-xl p-3 border border-stone-750 space-y-1.5">
                          <div className="flex items-center justify-between text-xs text-stone-400">
                            <span className="flex items-center gap-1">
                              <Target className="w-3.5 h-3.5 text-indigo-400" />
                              تست‌های حل‌شده
                            </span>
                            <span className="font-bold text-white">{stats.totalTests}</span>
                          </div>
                          <div className="flex items-center justify-between text-[11px] text-stone-300">
                            <span>درصد تسلط و دقت:</span>
                            <strong className="text-indigo-300">{stats.testAccuracyPercentage}٪</strong>
                          </div>
                          <div className="text-[10px] text-stone-400 flex items-center justify-between">
                            <span className="text-emerald-400">درست: {stats.correctTests}</span>
                            <span className="text-rose-400">غلط: {stats.wrongTests}</span>
                          </div>
                        </div>

                        {/* 3. Nightly Reports */}
                        <div className="bg-stone-800/80 rounded-xl p-3 border border-stone-750 space-y-1.5">
                          <div className="flex items-center justify-between text-xs text-stone-400">
                            <span className="flex items-center gap-1">
                              <Moon className="w-3.5 h-3.5 text-amber-400" />
                              گزارش‌های شبانه
                            </span>
                            <span className="font-bold text-white">{stats.reportsCount} شب</span>
                          </div>
                          <div className="flex items-center justify-between text-[11px] text-stone-300">
                            <span>آخرین گزارش:</span>
                            <strong className="text-amber-300 text-[10px]">
                              {stats.latestReportDate || 'هنوز ثبت نشده'}
                            </strong>
                          </div>
                          <div className="flex items-center justify-between text-[10px] text-stone-400">
                            {stats.latestReportSatisfaction ? (
                              <span>رضایت: {stats.latestReportSatisfaction} از ۵ ⭐</span>
                            ) : (
                              <span>نیازمند ثبت گزارش</span>
                            )}
                            <span className="flex items-center gap-1 font-bold text-sky-400 bg-sky-900/30 px-1.5 py-0.5 rounded-md" title="تعداد درخواست‌های مشاور هوشمند (AI)">
                              <Sparkles className="w-3 h-3" />
                              AI: {stats.aiUsageCount}
                            </span>
                          </div>
                        </div>

                        {/* 4. Leitner & Focus Sessions */}
                        <div className="bg-stone-800/80 rounded-xl p-3 border border-stone-750 space-y-1.5">
                          <div className="flex items-center justify-between text-xs text-stone-400">
                            <span className="flex items-center gap-1">
                              <Brain className="w-3.5 h-3.5 text-teal-400" />
                              لایتنر و تمرکز
                            </span>
                            <span className="font-bold text-white">{stats.leitnerTotalCards} کارت</span>
                          </div>
                          <div className="flex items-center justify-between text-[11px] text-stone-300">
                            <span>مسلط شده (Stage 5):</span>
                            <strong className="text-teal-300">{stats.leitnerMasteredCards}</strong>
                          </div>
                          <div className="text-[10px] text-stone-400">
                            سشن تمرکز: {stats.focusSessionsCount} پارت ({stats.totalFocusMinutes} دقیقه)
                          </div>
                        </div>
                      </div>

                      {/* Bottom Footer Actions */}
                      <div className="mt-3 pt-3 border-t border-stone-800/60 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setInspectingStudent(student)}
                            className="flex items-center gap-1 text-emerald-400 hover:text-emerald-300 font-bold hover:underline cursor-pointer"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            <span>مشاهده ریز گزارش‌ها و موانع</span>
                          </button>
                        </div>

                        <div className="flex items-center gap-2">
                          {/* Suspend / Resume Button */}
                          <button
                            onClick={() => handleToggleAccess(student)}
                            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors cursor-pointer ${
                              isSuspended
                                ? 'bg-emerald-950 text-emerald-300 hover:bg-emerald-900 border border-emerald-800'
                                : 'bg-rose-950 text-rose-300 hover:bg-rose-900 border border-rose-800'
                            }`}
                          >
                            {isSuspended ? (
                              <>
                                <Unlock className="w-3 h-3" />
                                <span>رفع تعلیق و فعال‌سازی</span>
                              </>
                            ) : (
                              <>
                                <Lock className="w-3 h-3" />
                                <span>تعلیق و قفل اکانت</span>
                              </>
                            )}
                          </button>

                          {/* Device Binding & Hardware Lock Manager */}
                          <button
                            onClick={() => setDeviceModalStudent(student)}
                            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-indigo-950/80 hover:bg-indigo-900 text-indigo-300 border border-indigo-800 transition-colors cursor-pointer"
                            title="مشاهده و حذف نشست‌ها و دستگاه‌های متصل این دانش‌آموز"
                          >
                            <Smartphone className="w-3.5 h-3.5 text-indigo-400" />
                            <span>
                              دستگاه‌ها ({student.boundDevices?.length || 0}/{student.maxAllowedDevices || 2})
                            </span>
                          </button>

                          {/* Edit & Manage Profile */}
                          <button
                            onClick={() => handleOpenEditStudent(student)}
                            className="p-1 text-stone-400 hover:text-emerald-400 transition-colors cursor-pointer"
                            title="ویرایش و مدیریت مشخصات دانش‌آموز"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>

                          {/* Delete Student Button */}
                          <button
                            onClick={() => setStudentToDelete(student)}
                            className="p-1 text-stone-500 hover:text-rose-400 transition-colors cursor-pointer"
                            title="حذف کامل حساب دانش‌آموز"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* TAB 2: Add & Manage Accounts */}
        {activeTab === 'accounts' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* New Student Registration Card */}
            <div className="bg-stone-900 border border-stone-800 rounded-3xl p-6 shadow-xl space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-stone-800">
                <UserPlus className="w-5 h-5 text-emerald-400" />
                <h3 className="text-base font-black text-white">ثبت‌نام دانش‌آموز جدید</h3>
              </div>

              {addStudentSuccess && (
                <div className="p-3 rounded-xl bg-emerald-950/80 border border-emerald-800 text-emerald-300 text-xs font-bold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>دانش‌آموز جدید با موفقیت اضافه شد و رمز عبور او فعال گردید!</span>
                </div>
              )}

              <form onSubmit={handleCreateStudent} className="space-y-3.5 text-right text-xs">
                <div className="space-y-1">
                  <label className="font-bold text-stone-300">نام و نام خانوادگی:</label>
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="مثال: سارا محمدی"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-stone-800 border border-stone-700 text-white focus:outline-emerald-500"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="font-bold text-stone-300">پایه تحصیلی:</label>
                    <select
                      value={newGrade}
                      onChange={(e) => setNewGrade(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl bg-stone-800 border border-stone-700 text-white focus:outline-emerald-500 font-medium"
                    >
                      <option value="دوازدهم / کنکوری">دوازدهم / کنکوری</option>
                      <option value="فارغ‌التحصیل (پشت کنکور)">پشت کنکور</option>
                      <option value="یازدهم">یازدهم</option>
                      <option value="دهم">دهم</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-stone-300">رشته:</label>
                    <select
                      value={newField}
                      onChange={(e) => setNewField(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl bg-stone-800 border border-stone-700 text-white focus:outline-emerald-500 font-medium"
                    >
                      <option value="علوم تجربی">علوم تجربی</option>
                      <option value="ریاضی و فیزیک">ریاضی و فیزیک</option>
                      <option value="ادبیات و علوم انسانی">انسانی</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-stone-300">هدف قبولی:</label>
                  <input
                    type="text"
                    value={newGoal}
                    onChange={(e) => setNewGoal(e.target.value)}
                    placeholder="مثال: دندانپزشکی دانشگاه شیراز"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-stone-800 border border-stone-700 text-white focus:outline-emerald-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="font-bold text-stone-300">ساعت مطالعه هدف:</label>
                    <input
                      type="number"
                      min={2}
                      max={16}
                      value={newHours}
                      onChange={(e) => setNewHours(Number(e.target.value))}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-stone-800 border border-stone-700 text-white focus:outline-emerald-500 font-mono text-center"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-stone-300">رمز ورود اختصاصی:</label>
                    <input
                      type="text"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="1234"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-stone-800 border border-stone-700 text-white focus:outline-emerald-500 font-mono text-center"
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full mt-2 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold shadow-lg shadow-emerald-900/30 transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>ثبت و صدور دسترسی دانش‌آموز</span>
                </button>
              </form>
            </div>

            {/* Existing Accounts Table & Direct Links */}
            <div className="lg:col-span-2 bg-stone-900 border border-stone-800 rounded-3xl p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-stone-800">
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-emerald-400" />
                  <h3 className="text-base font-black text-white">فهرست کل حساب‌ها و لینک‌های اختصاصی</h3>
                </div>
                <span className="text-xs text-stone-400">مجموع: {students.length} دانش‌آموز</span>
              </div>

              <div className="overflow-x-auto">
                <div className="flex items-center justify-between pb-2 mb-2">
                  <div className="text-[11px] text-stone-400">
                    برای امنیت دیداری در محیط‌های مشترک، رمزها به‌طور پیش‌فرض ماسک‌گذاری شده‌اند.
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowMaskedPasswords(!showMaskedPasswords)}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white border border-stone-700 text-[11px] font-bold cursor-pointer transition-colors"
                  >
                    {showMaskedPasswords ? (
                      <>
                        <EyeOff className="w-3.5 h-3.5 text-amber-400" />
                        <span>مخفی‌سازی رمزها</span>
                      </>
                    ) : (
                      <>
                        <Eye className="w-3.5 h-3.5 text-emerald-400" />
                        <span>نمایش رمزها</span>
                      </>
                    )}
                  </button>
                </div>
                <table className="w-full text-right text-xs">
                  <thead>
                    <tr className="text-stone-400 border-b border-stone-800">
                      <th className="py-2.5 px-2">نام دانش‌آموز</th>
                      <th className="py-2.5 px-2">رشته و مقطع</th>
                      <th className="py-2.5 px-2 text-center">رمز عبور</th>
                      <th className="py-2.5 px-2 text-center">وضعیت</th>
                      <th className="py-2.5 px-2 text-center">لینک اختصاصی</th>
                      <th className="py-2.5 px-2 text-center">عملیات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-800">
                    {students.map((st) => {
                      const isSuspended = st.accessStatus === 'suspended';
                      return (
                        <tr key={st.id || st.name} className="hover:bg-stone-850 transition-colors">
                          <td className="py-3 px-2 font-bold text-white">
                            <div className="flex items-center gap-2">
                              <span className="w-6 h-6 rounded-lg bg-emerald-600/30 text-emerald-300 flex items-center justify-center font-bold text-xs">
                                {st.name.charAt(0)}
                              </span>
                              <span>{st.name}</span>
                            </div>
                          </td>
                          <td className="py-3 px-2 text-stone-300">
                            {st.grade} • {st.fieldOfStudy}
                          </td>
                          <td className="py-3 px-2 text-center font-mono font-bold text-amber-300">
                            {showMaskedPasswords ? (st.password || '1234') : '••••••••'}
                          </td>
                          <td className="py-3 px-2 text-center">
                            {isSuspended ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-950 text-rose-400 border border-rose-800">
                                معلق
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950 text-emerald-400 border border-emerald-800">
                                فعال
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-2 text-center">
                            <button
                              onClick={() => handleCopyLink(st)}
                              className="px-2.5 py-1 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white border border-stone-700 font-bold transition-all cursor-pointer inline-flex items-center gap-1"
                            >
                              {copiedKey === (st.id || st.name) ? (
                                <Check className="w-3 h-3 text-emerald-400" />
                              ) : (
                                <Copy className="w-3 h-3 text-stone-400" />
                              )}
                              <span>کپی لینک</span>
                            </button>
                          </td>
                          <td className="py-3 px-2 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => handleOpenEditStudent(st)}
                                className="p-1.5 rounded-lg bg-stone-800 hover:bg-blue-600 hover:text-white text-stone-300 transition-colors cursor-pointer"
                                title="ویرایش و مدیریت مشخصات دانش‌آموز"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => onSelectStudentWorkspace(st)}
                                className="p-1.5 rounded-lg bg-stone-800 hover:bg-emerald-600 hover:text-white text-stone-300 transition-colors cursor-pointer"
                                title="ورود به میز کار این دانش‌آموز"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleToggleAccess(st)}
                                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                                  isSuspended ? 'bg-emerald-950 text-emerald-400 hover:bg-emerald-900' : 'bg-rose-950 text-rose-400 hover:bg-rose-900'
                                }`}
                                title={isSuspended ? 'فعال‌سازی' : 'تعلیق'}
                              >
                                {isSuspended ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                              </button>
                              <button
                                onClick={() => setStudentToDelete(st)}
                                className="p-1.5 rounded-lg text-stone-500 hover:text-rose-400 hover:bg-rose-950/40 transition-colors cursor-pointer"
                                title="حذف کامل حساب دانش‌آموز"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: Global Broadcast & AI Directives */}
        {activeTab === 'broadcast' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-stone-900 border border-stone-800 rounded-3xl p-6 shadow-xl space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-stone-800">
                <Megaphone className="w-5 h-5 text-amber-400" />
                <h3 className="text-base font-black text-white">اطلاعیه سراسری به تمام دانش‌آموزان</h3>
              </div>
              <p className="text-xs text-stone-400 leading-relaxed">
                این پیام به عنوان یک نوار طلایی رنگ در بالای صفحه همه دانش‌آموزان نمایش داده می‌شود (مثلاً اعلام تاریخ آزمون جامع، تذکر ارسال گزارش شبانه و...).
              </p>
              <textarea
                rows={4}
                value={counselorAnnouncement}
                onChange={(e) => onUpdateCounselorAnnouncement(e.target.value)}
                placeholder="متن اطلاعیه برای نمایش به همه دانش‌آموزان..."
                className="w-full p-4 rounded-2xl bg-stone-800 border border-stone-700 text-white text-xs leading-relaxed focus:outline-amber-500"
              />
              <div className="flex items-center justify-between pt-2">
                <button
                  onClick={() => onUpdateCounselorAnnouncement('')}
                  className="px-3 py-1.5 rounded-xl border border-stone-700 text-stone-400 hover:text-white text-xs cursor-pointer"
                >
                  پاک کردن اطلاعیه
                </button>
                <button
                  onClick={async () => {
                    try {
                      await fetch('/api/counselor/config', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ announcement: counselorAnnouncement }),
                      });
                      alert('اطلاعیه سراسری در سرور مرکزی ذخیره شد!');
                    } catch (e) {
                      console.error(e);
                    }
                  }}
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs cursor-pointer shadow-md"
                >
                  ذخیره و انتشار به دانش‌آموزان
                </button>
              </div>
            </div>

            <div className="bg-stone-900 border border-stone-800 rounded-3xl p-6 shadow-xl space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-stone-800">
                <Brain className="w-5 h-5 text-teal-400" />
                <h3 className="text-base font-black text-white">دستورالعمل سیستمی هوش مصنوعی مشاور</h3>
              </div>
              <p className="text-xs text-stone-400 leading-relaxed">
                این متن به پرامپت سیستم هوش مصنوعی مشاور تزریق می‌شود تا پاسخ‌های هوش مصنوعی به دانش‌آموزان دقیقاً منطبق بر خط فکری و استراتژی مشاوره شما باشد.
              </p>
              <textarea
                rows={4}
                value={counselorSystemDirective}
                onChange={(e) => onUpdateCounselorSystemDirective(e.target.value)}
                placeholder="مثال: روی آزمون‌های کانون تأکید کن، برای درس زیست فقط روش بازیابی و تست مضاعف را تجویز کن و..."
                className="w-full p-4 rounded-2xl bg-stone-800 border border-stone-700 text-white text-xs leading-relaxed focus:outline-teal-500"
              />
              <div className="flex justify-end pt-2">
                <button
                  onClick={async () => {
                    try {
                      await fetch('/api/counselor/config', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ directive: counselorSystemDirective }),
                      });
                      alert('دستورالعمل هوش مصنوعی مشاور به‌روزرسانی شد!');
                    } catch (e) {
                      console.error(e);
                    }
                  }}
                  className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs cursor-pointer shadow-md"
                >
                  ثبت دستورالعمل در سیستم
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: Counselor Security & Cyber Warfare Command Center */}
        {activeTab === 'security' && (
          <div className="space-y-8 animate-fadeIn">
            {/* Top Threat & Shield Telemetry KPIs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-stone-900/90 border border-emerald-500/30 rounded-2xl p-4 shadow-lg flex items-center justify-between">
                <div className="space-y-1 text-right">
                  <span className="text-[11px] font-bold text-emerald-400">سطح آماده‌باش پدافند سایبری</span>
                  <div className="text-2xl font-black text-white flex items-center gap-2">
                    <span className="font-mono">
                      DEFCON {securityMetrics?.defconLevel || 3}
                    </span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-md font-sans ${
                      (securityMetrics?.defconLevel || 3) <= 2
                        ? 'bg-rose-950 text-rose-300 border border-rose-800 animate-pulse'
                        : (securityMetrics?.defconLevel || 3) === 3
                        ? 'bg-amber-950 text-amber-300 border border-amber-800'
                        : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                    }`}>
                      {(securityMetrics?.defconLevel || 3) === 1 ? 'آماده‌باش فوق بحرانی' : (securityMetrics?.defconLevel || 3) === 2 ? 'حالت تهاجمی' : (securityMetrics?.defconLevel || 3) === 3 ? 'پدافند هوشمند' : 'عادی'}
                    </span>
                  </div>
                  <span className="text-[10px] text-stone-400">سپر سایبری فعال و آماده پاسخ</span>
                </div>
                <div className="w-12 h-12 rounded-xl bg-emerald-950 border border-emerald-800/60 flex items-center justify-center text-emerald-400">
                  <Shield className="w-6 h-6" />
                </div>
              </div>

              <div className="bg-stone-900/90 border border-stone-800 rounded-2xl p-4 shadow-lg flex items-center justify-between">
                <div className="space-y-1 text-right">
                  <span className="text-[11px] font-bold text-rose-400">حملات خنثی شده (WAF & DDoS)</span>
                  <div className="text-2xl font-black text-white font-mono">
                    {securityMetrics?.thwartedAttacksCount || securityMetrics?.totalBlockedAttempts || 0}
                  </div>
                  <span className="text-[10px] text-stone-500">پاتک موفق، تارپیت و قرنطینه خودکار</span>
                </div>
                <div className="w-12 h-12 rounded-xl bg-rose-950/60 border border-rose-800/60 flex items-center justify-center text-rose-400">
                  <Crosshair className="w-6 h-6" />
                </div>
              </div>

              <div className="bg-stone-900/90 border border-stone-800 rounded-2xl p-4 shadow-lg flex items-center justify-between">
                <div className="space-y-1 text-right">
                  <span className="text-[11px] font-bold text-amber-400">تله‌های هانی‌پات (Decoys)</span>
                  <div className="text-xl font-black text-amber-300 flex items-center gap-1.5 font-mono">
                    <span>{securityMetrics?.honeypotTrapsCount || 16} تله فعال</span>
                  </div>
                  <span className="text-[10px] text-stone-500">پوشش phpMyAdmin، دایرکتوری و .env</span>
                </div>
                <div className="w-12 h-12 rounded-xl bg-amber-950/60 border border-amber-800/60 flex items-center justify-center text-amber-400">
                  <Zap className="w-6 h-6" />
                </div>
              </div>

              <div className="bg-stone-900/90 border border-stone-800 rounded-2xl p-4 shadow-lg flex items-center justify-between">
                <div className="space-y-1 text-right">
                  <span className="text-[11px] font-bold text-blue-400">آی‌پی‌های در قرنطینه</span>
                  <div className="text-2xl font-black text-white font-mono">
                    {securityMetrics?.bannedIps?.length || 0}
                  </div>
                  <span className="text-[10px] text-stone-500">تارپیت فعال و مسدودی شبکه</span>
                </div>
                <div className="w-12 h-12 rounded-xl bg-stone-800/80 border border-stone-700 flex items-center justify-center text-blue-400">
                  <Ban className="w-6 h-6" />
                </div>
              </div>
            </div>

            {/* Simulation Notification Alert */}
            {simulationMsg && (
              <div
                className={`p-4 rounded-2xl text-xs font-bold flex items-center justify-between border shadow-lg ${
                  simulationMsg.type === 'success'
                    ? 'bg-emerald-950/80 border-emerald-700 text-emerald-200'
                    : 'bg-rose-950/80 border-rose-700 text-rose-200'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  {simulationMsg.type === 'success' ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
                  )}
                  <span className="leading-relaxed">{simulationMsg.text}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setSimulationMsg(null)}
                  className="p-1 rounded-md text-stone-400 hover:text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Strategic Defcon & Counter-Defense Command Card */}
            <div className="bg-gradient-to-br from-stone-900 via-stone-900 to-rose-950/30 border border-stone-800 rounded-3xl p-6 sm:p-7 shadow-xl space-y-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-stone-800">
                <div className="space-y-1">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/20 text-rose-300 text-xs font-bold border border-rose-500/30">
                    <Sliders className="w-4 h-4 text-rose-400" />
                    مرکز فرماندهی پدافند دفاعی و ضدحمله (Active Defense Protocol)
                  </div>
                  <h3 className="text-base sm:text-lg font-black text-white">
                    تنظیم سطح آماده‌باش پدافند سایبری (DEFCON Levels)
                  </h3>
                  <p className="text-xs text-stone-400">
                    در صورت احساس تهدید یا مشاهده رفتار مشکوک، با تغییر سطح DEFCON به پدافند فرمان دهید محدودیت‌های سخت‌گیرانه‌تری اعمال کند و بلافاصله پاسخ فرسایشی (Tarpit) روی مهاجمان پیاده نماید.
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={fetchSecurityStatus}
                    disabled={isLoadingSecurity}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 border border-stone-700 text-xs font-bold transition-all cursor-pointer"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isLoadingSecurity ? 'animate-spin text-emerald-400' : ''}`} />
                    <span>به‌روزرسانی پدافند</span>
                  </button>
                </div>
              </div>

              {/* DEFCON Selector Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                {[
                  {
                    level: 1,
                    name: 'DEFCON 1 (حداکثر قرنطینه)',
                    desc: 'حداکثر سخت‌گیری؛ آستانه ۲۰ درخواست، تارپیت آنی، مسدودی ۱۲ ساعته',
                    border: 'border-rose-600',
                    bg: 'bg-rose-950/40 text-rose-200',
                    badge: 'فوق بحرانی',
                  },
                  {
                    level: 2,
                    name: 'DEFCON 2 (حالت تهاجمی)',
                    desc: 'آستانه ۴۰ درخواست؛ مسدودی آنی تلاش‌های نفوذ و پاتک فرسایشی',
                    border: 'border-orange-600',
                    bg: 'bg-orange-950/40 text-orange-200',
                    badge: 'آماده‌باش بالا',
                  },
                  {
                    level: 3,
                    name: 'DEFCON 3 (پدافند هوشمند)',
                    desc: 'آستانه ۸۰ درخواست؛ تشخیص خودکار الگوهای SQLi/XSS/NoSQL و تله‌گذاری',
                    border: 'border-amber-600',
                    bg: 'bg-amber-950/40 text-amber-200',
                    badge: 'پیش‌فرض پایدار',
                  },
                  {
                    level: 4,
                    name: 'DEFCON 4 (حالت مراقبت)',
                    desc: 'آستانه ۱۲۰ درخواست؛ پایش دقیق و ثبت گزارشات تحلیلی بدون دخالت شدید',
                    border: 'border-teal-600',
                    bg: 'bg-teal-950/40 text-teal-200',
                    badge: 'پایش مستمر',
                  },
                  {
                    level: 5,
                    name: 'DEFCON 5 (عملیات عادی)',
                    desc: 'آستانه ۲۰۰ درخواست؛ عملکرد عادی سرور با فیلترهای پایه WAF',
                    border: 'border-emerald-600',
                    bg: 'bg-emerald-950/40 text-emerald-200',
                    badge: 'عادی',
                  },
                ].map((def) => {
                  const isCurrent = (securityMetrics?.defconLevel || 3) === def.level;
                  return (
                    <button
                      key={def.level}
                      type="button"
                      disabled={isSettingDefcon}
                      onClick={() => handleSetDefconLevel(def.level)}
                      className={`p-4 rounded-2xl border text-right transition-all cursor-pointer flex flex-col justify-between space-y-3 ${
                        isCurrent
                          ? `${def.border} ${def.bg} ring-2 ring-emerald-500/40 shadow-lg scale-[1.02]`
                          : 'bg-stone-950/60 border-stone-800 hover:border-stone-700 text-stone-300'
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-xs font-black">LVL {def.level}</span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-stone-900 border border-stone-700 font-bold">
                            {def.badge}
                          </span>
                        </div>
                        <h4 className="text-xs font-bold text-white">{def.name}</h4>
                        <p className="text-[11px] text-stone-400 leading-relaxed">{def.desc}</p>
                      </div>

                      <div className="pt-2 border-t border-stone-800/80 flex items-center justify-between text-[11px]">
                        {isCurrent ? (
                          <span className="text-emerald-400 font-bold flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>سطح فعلی سیستم</span>
                          </span>
                        ) : (
                          <span className="text-stone-500 hover:text-stone-300">
                            کلیک برای فعال‌سازی
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Threat Drill & Simulation Lab (مانور پدافند و تست زنده پاتک به حملات) */}
            <div className="bg-stone-900 border border-stone-800 rounded-3xl p-6 shadow-xl space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-stone-800">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-purple-950 border border-purple-800 text-purple-400">
                    <Terminal className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-white">آزمایشگاه مانور پدافند و شبیه‌سازی زنده حمله (Defense Simulation Lab)</h3>
                    <p className="text-xs text-stone-400">
                      با انتخاب هر یک از گزینه‌های زیر، یک حمله واقعی شبیه‌سازی شده و نحوه کشف، مسدودسازی و پاتک تارپیت توسط سرور به نمایش درمی‌آید
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <button
                  type="button"
                  disabled={Boolean(simulatingAttack)}
                  onClick={() => handleSimulateAttack('sqli')}
                  className="p-4 rounded-2xl bg-stone-950/70 hover:bg-stone-850 border border-rose-900/50 text-right space-y-2 cursor-pointer transition-all hover:border-rose-500 group"
                >
                  <div className="flex items-center justify-between">
                    <span className="p-1.5 rounded-lg bg-rose-950 text-rose-400 font-mono text-[10px] border border-rose-800">
                      SQL Injection
                    </span>
                    {simulatingAttack === 'sqli' ? (
                      <RefreshCw className="w-4 h-4 text-rose-400 animate-spin" />
                    ) : (
                      <Play className="w-4 h-4 text-rose-400 group-hover:translate-x-1 transition-transform" />
                    )}
                  </div>
                  <h4 className="text-xs font-bold text-white">شبیه‌سازی تلاش تزریق SQL</h4>
                  <p className="text-[11px] text-stone-400 leading-relaxed">
                    تلاش برای سرقت جداول با عبارت UNION SELECT؛ رهگیری آنی با WAF و تارپیت مهاجم
                  </p>
                </button>

                <button
                  type="button"
                  disabled={Boolean(simulatingAttack)}
                  onClick={() => handleSimulateAttack('ddos')}
                  className="p-4 rounded-2xl bg-stone-950/70 hover:bg-stone-850 border border-amber-900/50 text-right space-y-2 cursor-pointer transition-all hover:border-amber-500 group"
                >
                  <div className="flex items-center justify-between">
                    <span className="p-1.5 rounded-lg bg-amber-950 text-amber-400 font-mono text-[10px] border border-amber-800">
                      DDoS Flooding
                    </span>
                    {simulatingAttack === 'ddos' ? (
                      <RefreshCw className="w-4 h-4 text-amber-400 animate-spin" />
                    ) : (
                      <Play className="w-4 h-4 text-amber-400 group-hover:translate-x-1 transition-transform" />
                    )}
                  </div>
                  <h4 className="text-xs font-bold text-white">شبیه‌سازی طغیان بات‌نت (DDoS)</h4>
                  <p className="text-[11px] text-stone-400 leading-relaxed">
                    ارسال ۱۲۰ درخواست در ثانیه؛ تشخیص طغیان ترافیک، محدودسازی نرخ و حبس سوکت مهاجم
                  </p>
                </button>

                <button
                  type="button"
                  disabled={Boolean(simulatingAttack)}
                  onClick={() => handleSimulateAttack('honeypot')}
                  className="p-4 rounded-2xl bg-stone-950/70 hover:bg-stone-850 border border-teal-900/50 text-right space-y-2 cursor-pointer transition-all hover:border-teal-500 group"
                >
                  <div className="flex items-center justify-between">
                    <span className="p-1.5 rounded-lg bg-teal-950 text-teal-400 font-mono text-[10px] border border-teal-800">
                      Honeypot Trap
                    </span>
                    {simulatingAttack === 'honeypot' ? (
                      <RefreshCw className="w-4 h-4 text-teal-400 animate-spin" />
                    ) : (
                      <Play className="w-4 h-4 text-teal-400 group-hover:translate-x-1 transition-transform" />
                    )}
                  </div>
                  <h4 className="text-xs font-bold text-white">برخورد پویشگر به تله هانی‌پات</h4>
                  <p className="text-[11px] text-stone-400 leading-relaxed">
                    پویش مسیرهای مخفی مانند /phpmyadmin؛ به دام انداختن ربات پویشگر و مسدودی فوری
                  </p>
                </button>

                <button
                  type="button"
                  disabled={Boolean(simulatingAttack)}
                  onClick={() => handleSimulateAttack('xss')}
                  className="p-4 rounded-2xl bg-stone-950/70 hover:bg-stone-850 border border-blue-900/50 text-right space-y-2 cursor-pointer transition-all hover:border-blue-500 group"
                >
                  <div className="flex items-center justify-between">
                    <span className="p-1.5 rounded-lg bg-blue-950 text-blue-400 font-mono text-[10px] border border-blue-800">
                      XSS Attack
                    </span>
                    {simulatingAttack === 'xss' ? (
                      <RefreshCw className="w-4 h-4 text-blue-400 animate-spin" />
                    ) : (
                      <Play className="w-4 h-4 text-blue-400 group-hover:translate-x-1 transition-transform" />
                    )}
                  </div>
                  <h4 className="text-xs font-bold text-white">شبیه‌سازی تزریق اسکریپت آلوده</h4>
                  <p className="text-[11px] text-stone-400 leading-relaxed">
                    تلاش برای درج تگ‌های مخرب جاوااسکریپت؛ عقیم‌سازی ورودی و ارسال هشدار بحرانی
                  </p>
                </button>
              </div>
            </div>

            {/* Quarantined & Neutralized Attacker IPs Manager */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Quarantined IP List (8 cols) */}
              <div className="lg:col-span-8 bg-stone-900 border border-stone-800 rounded-3xl p-6 shadow-xl space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-stone-800">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-rose-950 border border-rose-800 text-rose-400">
                      <Ban className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-black text-white">جدول آی‌پی‌های مهاجم در قرنطینه و پاتک تارپیت</h3>
                      <p className="text-xs text-stone-400">آدرس‌هایی که به دلیل حمله یا اسکن غیرمجاز خلع سلاح و قفل شده‌اند</p>
                    </div>
                  </div>

                  <div className="px-3 py-1.5 rounded-xl bg-stone-950 border border-stone-800 text-xs text-stone-400">
                    تعداد در قرنطینه: <strong className="text-rose-400">{securityMetrics?.bannedIps?.length || 0}</strong> آدرس
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-right text-xs">
                    <thead>
                      <tr className="text-stone-400 border-b border-stone-800 bg-stone-950/40">
                        <th className="py-2.5 px-3">آدرس IP مهاجم</th>
                        <th className="py-2.5 px-3">نوع تهدید / بردار حمله</th>
                        <th className="py-2.5 px-3">روش پدافند / پاتک</th>
                        <th className="py-2.5 px-3">علت مسدودی</th>
                        <th className="py-2.5 px-3 text-center">انقضای قرنطینه</th>
                        <th className="py-2.5 px-3 text-center">عملیات</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-800/60 font-mono">
                      {(!securityMetrics?.bannedIps || securityMetrics.bannedIps.length === 0) ? (
                        <tr>
                          <td colSpan={6} className="py-8 text-center text-stone-500 font-sans text-xs">
                            هیچ آدرس IP در حال حاضر در قرنطینه فعال قرار ندارد (تمام تهدیدات پاکسازی شده‌اند).
                          </td>
                        </tr>
                      ) : (
                        securityMetrics.bannedIps.map((ban) => (
                          <tr key={ban.ip} className="hover:bg-stone-850/60 transition-colors">
                            <td className="py-2.5 px-3 font-bold text-white flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping"></span>
                              <span>{ban.ip}</span>
                            </td>
                            <td className="py-2.5 px-3">
                              <span className="px-2 py-0.5 rounded text-[10px] font-sans font-bold bg-rose-950 text-rose-300 border border-rose-800">
                                {ban.threatType === 'sqli' ? 'تزریق SQL' : ban.threatType === 'ddos' ? 'طغیان DDoS' : ban.threatType === 'honeypot' ? 'تله هانی‌پات' : ban.threatType === 'xss' ? 'حمله XSS' : 'مسدودسازی دستی'}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-stone-300 font-sans text-[11px]">
                              {ban.counterMeasure === 'tarpit' ? (
                                <span className="text-amber-400 font-bold">⚡ Tarpit کندکننده سوکت</span>
                              ) : (
                                <span className="text-rose-400">⛔ قطع اتصال قطعی (Drop)</span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-stone-400 font-sans text-[11px] max-w-[180px] truncate" title={ban.reason}>
                              {ban.reason}
                            </td>
                            <td className="py-2.5 px-3 text-center text-stone-400 text-[10px]">
                              {new Date(ban.expiresAt).toLocaleTimeString('fa-IR')}
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <button
                                type="button"
                                disabled={unbanningIp === ban.ip}
                                onClick={() => handleUnbanIp(ban.ip)}
                                className="px-2.5 py-1 rounded-lg bg-stone-800 hover:bg-emerald-950 hover:text-emerald-300 text-stone-300 border border-stone-700 text-[10px] font-sans font-bold transition-all cursor-pointer"
                              >
                                {unbanningIp === ban.ip ? '...' : 'رفع انسداد'}
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Manual IP Ban Form (4 cols) */}
              <div className="lg:col-span-4 bg-stone-900 border border-stone-800 rounded-3xl p-6 shadow-xl space-y-4">
                <div className="flex items-center gap-2 pb-3 border-b border-stone-800">
                  <div className="p-2 rounded-xl bg-amber-950 border border-amber-800 text-amber-400">
                    <ShieldAlert className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-white">قرنطینه دستی آدرس IP</h3>
                    <p className="text-[11px] text-stone-400">اعمال فوری پاتک روی آی‌پی مشکوک</p>
                  </div>
                </div>

                <form onSubmit={handleManualBanIp} className="space-y-3.5 text-xs text-right">
                  <div>
                    <label className="block text-stone-300 font-bold mb-1">آدرس IP هدف:</label>
                    <input
                      type="text"
                      value={manualBanIpInput}
                      onChange={(e) => setManualBanIpInput(e.target.value)}
                      placeholder="مثال: 198.51.100.45"
                      className="w-full px-3 py-2 rounded-xl bg-stone-950 border border-stone-700 text-white font-mono text-left ltr focus:border-rose-500 focus:outline-none"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-stone-300 font-bold mb-1">دلیل قرنطینه / گزارش:</label>
                    <input
                      type="text"
                      value={manualBanReasonInput}
                      onChange={(e) => setManualBanReasonInput(e.target.value)}
                      placeholder="مثال: اسکن پورت‌ها و درخواست‌های غیرعادی"
                      className="w-full px-3 py-2 rounded-xl bg-stone-950 border border-stone-700 text-stone-200 focus:border-rose-500 focus:outline-none text-xs"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-stone-300 font-bold mb-1">روش پاتک:</label>
                      <select
                        value={manualBanCounterMeasure}
                        onChange={(e) => setManualBanCounterMeasure(e.target.value as any)}
                        className="w-full px-2.5 py-2 rounded-xl bg-stone-950 border border-stone-700 text-stone-200 text-xs focus:outline-none"
                      >
                        <option value="tarpit">تارپیت (فرسایش کلاینت)</option>
                        <option value="hard_drop">قطع قطعی (Hard Drop)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-stone-300 font-bold mb-1">مدت زمان:</label>
                      <select
                        value={manualBanDuration}
                        onChange={(e) => setManualBanDuration(Number(e.target.value))}
                        className="w-full px-2.5 py-2 rounded-xl bg-stone-950 border border-stone-700 text-stone-200 text-xs focus:outline-none"
                      >
                        <option value={30}>۳۰ دقیقه</option>
                        <option value={120}>۲ ساعت</option>
                        <option value={720}>۱۲ ساعت</option>
                        <option value={1440}>۲۴ ساعت</option>
                      </select>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isBanningIp || !manualBanIpInput.trim()}
                    className="w-full py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white font-bold text-xs shadow-lg shadow-rose-950/40 transition-all cursor-pointer flex items-center justify-center gap-2 mt-2"
                  >
                    <Ban className="w-4 h-4" />
                    <span>{isBanningIp ? 'در حال اعمال پدافند...' : 'اعمال پاتک و قرنطینه IP'}</span>
                  </button>
                </form>
              </div>
            </div>

            {/* Main Security Columns (Password & Standards) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Column 1: Password Management with Strength Meter (5 cols) */}
              <div className="lg:col-span-5 bg-stone-900 border border-stone-800 rounded-3xl p-6 shadow-xl space-y-5">
                <div className="flex items-center justify-between pb-3 border-b border-stone-800">
                  <div className="flex items-center gap-2">
                    <div className="w-9 h-9 rounded-xl bg-emerald-600/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
                      <Key className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-white">تغییر رمز عبور مشاور</h3>
                      <p className="text-[11px] text-stone-400">ذخیره‌سازی هش سالت‌شده استاندارد</p>
                    </div>
                  </div>
                </div>

                {securityMsg && (
                  <div
                    className={`p-3 rounded-2xl text-xs font-bold flex items-center gap-2 ${
                      securityMsg.type === 'success'
                        ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800'
                        : 'bg-rose-950/80 text-rose-300 border border-rose-800'
                    }`}
                  >
                    {securityMsg.type === 'success' ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                    )}
                    <span>{securityMsg.text}</span>
                  </div>
                )}

                <form onSubmit={handleChangePasscode} className="space-y-4 text-right text-xs">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="font-bold text-stone-300">رمز عبور فعلی مشاور:</label>
                      <button
                        type="button"
                        onClick={() => setShowCurrentPass(!showCurrentPass)}
                        className="text-[11px] text-stone-400 hover:text-stone-200 cursor-pointer flex items-center gap-1"
                      >
                        {showCurrentPass ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                        <span>{showCurrentPass ? 'مخفی' : 'نمایش'}</span>
                      </button>
                    </div>
                    <input
                      type={showCurrentPass ? 'text' : 'password'}
                      value={currentPass}
                      onChange={(e) => setCurrentPass(e.target.value)}
                      placeholder="رمز فعلی (پیش‌فرض: 1234)"
                      className="w-full px-4 py-2.5 rounded-xl bg-stone-800 border border-stone-700 text-white font-mono text-center tracking-widest text-sm focus:outline-emerald-500"
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="font-bold text-stone-300">رمز عبور جدید:</label>
                      <button
                        type="button"
                        onClick={() => setShowNewPass(!showNewPass)}
                        className="text-[11px] text-stone-400 hover:text-stone-200 cursor-pointer flex items-center gap-1"
                      >
                        {showNewPass ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                        <span>{showNewPass ? 'مخفی' : 'نمایش'}</span>
                      </button>
                    </div>
                    <input
                      type={showNewPass ? 'text' : 'password'}
                      value={newPass}
                      onChange={(e) => setNewPass(e.target.value)}
                      placeholder="حداقل ۶ الی ۸ نویسه، ترکیب حرف و عدد"
                      className="w-full px-4 py-2.5 rounded-xl bg-stone-800 border border-stone-700 text-white font-mono text-center tracking-widest text-sm focus:outline-emerald-500"
                      required
                    />
                    {/* Password Strength Meter */}
                    {newPass && (
                      <div className="space-y-1 pt-1">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-stone-400">قدرت رمز:</span>
                          <span className={`font-bold ${passwordStrength.textCol}`}>
                            {passwordStrength.label} ({passwordStrength.score}٪)
                          </span>
                        </div>
                        <div className="h-1.5 w-full bg-stone-800 rounded-full overflow-hidden">
                          <div
                            className={`h-full transition-all duration-300 ${passwordStrength.color}`}
                            style={{ width: `${passwordStrength.score}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-bold text-stone-300">تکرار رمز عبور جدید:</label>
                    <input
                      type={showNewPass ? 'text' : 'password'}
                      value={confirmPass}
                      onChange={(e) => setConfirmPass(e.target.value)}
                      placeholder="تکرار رمز عبور جدید"
                      className="w-full px-4 py-2.5 rounded-xl bg-stone-800 border border-stone-700 text-white font-mono text-center tracking-widest text-sm focus:outline-emerald-500"
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-lg shadow-emerald-900/30 transition-all cursor-pointer"
                  >
                    ذخیره و رمزنگاری رمز جدید مشاور
                  </button>
                </form>

                {/* Emergency Session Revocation */}
                <div className="pt-4 border-t border-stone-800 space-y-3">
                  <div className="flex items-center gap-2 text-rose-400">
                    <ShieldAlert className="w-4 h-4" />
                    <span className="text-xs font-bold">کلید اضطراری ابطال نشست‌ها (Kill-Switch)</span>
                  </div>
                  <p className="text-[11px] text-stone-400 leading-relaxed">
                    در صورت مشکوک شدن به افشای نشست‌ها یا دسترسی دیگران، با کلیک بر روی دکمه زیر بلافاصله کلیه نشست‌های فعال مشاور در سرور منقضی شده و دسترسی مسدود می‌گردد.
                  </p>
                  <button
                    type="button"
                    onClick={handleRevokeAllSessions}
                    disabled={isRevokingSessions}
                    className="w-full py-2.5 px-4 rounded-xl bg-rose-950/80 hover:bg-rose-900 text-rose-300 border border-rose-800/80 font-bold text-xs transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>{isRevokingSessions ? 'در حال ابطال...' : 'ابطال اضطراری تمام نشست‌های فعال مشاور'}</span>
                  </button>
                </div>
              </div>

              {/* Column 2: System Security Standards & Checklist (7 cols) */}
              <div className="lg:col-span-7 space-y-6">
                <div className="bg-stone-900 border border-stone-800 rounded-3xl p-6 shadow-xl space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-stone-800">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-5 h-5 text-emerald-400" />
                      <h3 className="text-sm font-black text-white">لایه‌های حفاظتی و استانداردهای پیاده‌سازی شده</h3>
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-emerald-950 text-emerald-400 border border-emerald-800">
                      RFC 2898 COMPLIANT
                    </span>
                  </div>

                  <div className="space-y-3 text-xs">
                    <div className="p-3 rounded-2xl bg-stone-800/60 border border-stone-700/60 flex items-start gap-3">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold text-white block">سپر دفاعی فعال WAF و پاتک فرسایشی Tarpit Trap</span>
                        <p className="text-[11px] text-stone-400 mt-0.5">
                          ترافیک ورودی به سرور با الگوهای تحلیل نحوی SQLi, NoSQLi, XSS و RCE فیلتر شده و هر درخواست آلوده با پاسخ کند فرسایشی (Tarpit Delay) منابع ماشین مهاجم را قفل می‌کند.
                        </p>
                      </div>
                    </div>

                    <div className="p-3 rounded-2xl bg-stone-800/60 border border-stone-700/60 flex items-start gap-3">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold text-white block">شبکه تله‌گذاری سایبری (Honeypot Decoys)</span>
                        <p className="text-[11px] text-stone-400 mt-0.5">
                          مسیرهای آسیب‌پذیر رایج مانند phpmyadmin, .env, wp-admin به عنوان تله‌های فعال عمل کرده و پویشگران را بلافاصله شناسایی و قرنطینه می‌کنند.
                        </p>
                      </div>
                    </div>

                    <div className="p-3 rounded-2xl bg-stone-800/60 border border-stone-700/60 flex items-start gap-3">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold text-white block">رمزنگاری قطعی یک‌طرفه با الگوریتم PBKDF2</span>
                        <p className="text-[11px] text-stone-400 mt-0.5">
                          رمزهای عبور مشاور و دانش‌آموزان به همراه سالت منحصر‌به‌فرد ۳۲ بایتی با تابع HMAC-SHA512 در ۱۰۰٬۰۰۰ دور هش می‌شوند و به هیچ عنوان امکان بازیابی متن خام وجود ندارد.
                        </p>
                      </div>
                    </div>

                    <div className="p-3 rounded-2xl bg-stone-800/60 border border-stone-700/60 flex items-start gap-3">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold text-white block">ماسک‌گذاری داده‌ها در بستر شبکه (Zero Data Leak)</span>
                        <p className="text-[11px] text-stone-400 mt-0.5">
                          اندپوینت عمومی دریافت مشخصات دانش‌آموزان (`/api/students/list`) کلیه فیلدهای گذرواژه را از بدنه پاسخ حذف می‌کند تا کلاینت‌های دانش‌آموزان هرگز رمزهای یکدیگر را دریافت نکنند.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Real-time Security Audit Log Table */}
            <div className="bg-stone-900 border border-stone-800 rounded-3xl p-6 shadow-xl space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-stone-800">
                <div className="flex items-center gap-2">
                  <Activity className="w-5 h-5 text-emerald-400" />
                  <div>
                    <h3 className="text-base font-black text-white">دفترچه زنده وقایع و رویدادهای امنیتی (Security Audit Trail)</h3>
                    <p className="text-[11px] text-stone-400">ثبت دقیق کلیه تلاش‌های ورود، حملات رهگیری شده و اقدامات پدافندی</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center rounded-xl bg-stone-800 p-1 text-xs">
                    {(['all', 'critical', 'warning', 'info'] as const).map((lvl) => (
                      <button
                        key={lvl}
                        type="button"
                        onClick={() => setAuditFilter(lvl)}
                        className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                          auditFilter === lvl
                            ? 'bg-stone-700 text-white shadow'
                            : 'text-stone-400 hover:text-stone-200'
                        }`}
                      >
                        {lvl === 'all' && 'همه'}
                        {lvl === 'critical' && 'بحرانی'}
                        {lvl === 'warning' && 'هشدار'}
                        {lvl === 'info' && 'اطلاعاتی'}
                      </button>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={handleClearSecurityLogs}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-stone-800 hover:bg-rose-950 hover:text-rose-300 text-stone-400 border border-stone-700 text-xs font-bold transition-all cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>پاکسازی لاگ</span>
                  </button>

                  <button
                    type="button"
                    onClick={fetchSecurityStatus}
                    disabled={isLoadingSecurity}
                    className="p-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white border border-stone-700 cursor-pointer transition-colors"
                    title="تازه‌سازی لاگ‌ها"
                  >
                    <RefreshCw className={`w-4 h-4 ${isLoadingSecurity ? 'animate-spin text-emerald-400' : ''}`} />
                  </button>
                </div>
              </div>

              {/* Audit Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead>
                    <tr className="text-stone-400 border-b border-stone-800 bg-stone-950/40">
                      <th className="py-2.5 px-3">نوع رویداد</th>
                      <th className="py-2.5 px-3">سطح اهمیت</th>
                      <th className="py-2.5 px-3">شرح رویداد و اقدام پدافندی</th>
                      <th className="py-2.5 px-3 text-center">آی‌پی مبدأ</th>
                      <th className="py-2.5 px-3 text-center">زمان ثبت</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-800 font-mono">
                    {(() => {
                      const logs = securityMetrics?.recentAuditLogs || [];
                      const filtered = logs.filter((log) => {
                        if (auditFilter !== 'all' && log.severity !== auditFilter) return false;
                        return true;
                      });

                      if (filtered.length === 0) {
                        return (
                          <tr>
                            <td colSpan={5} className="py-6 text-center text-stone-500 font-sans">
                              هیچ رویدادی در این دسته یافت نشد.
                            </td>
                          </tr>
                        );
                      }

                      return filtered.map((log) => {
                        const isCritical = log.severity === 'critical';
                        const isWarning = log.severity === 'warning';
                        return (
                          <tr key={log.id} className="hover:bg-stone-850 transition-colors">
                            <td className="py-2.5 px-3 font-bold text-white font-sans flex items-center gap-1.5">
                              {isCritical && <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />}
                              {isWarning && <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />}
                              {!isCritical && !isWarning && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
                              <span>{log.eventType}</span>
                            </td>
                            <td className="py-2.5 px-3">
                              <span
                                className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                                  isCritical
                                    ? 'bg-rose-950 text-rose-400 border border-rose-800'
                                    : isWarning
                                    ? 'bg-amber-950 text-amber-400 border border-amber-800'
                                    : 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                                }`}
                              >
                                {log.severity === 'critical' ? 'بحرانی' : log.severity === 'warning' ? 'هشدار' : 'عادی'}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-stone-300 font-sans text-xs">
                              {log.details}
                            </td>
                            <td className="py-2.5 px-3 text-center text-stone-400 text-[11px]">
                              {log.ipAddress || '127.0.0.1'}
                            </td>
                            <td className="py-2.5 px-3 text-center text-stone-400 text-[11px]">
                              {new Date(log.timestamp).toLocaleTimeString('fa-IR')}
                            </td>
                          </tr>
                        );
                      });
                    })()}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: Master Telegram Bot Control & Student ID Management */}
        {activeTab === 'telegram' && (
          <div className="space-y-6 animate-fadeIn">
            {/* Top Overview Banner */}
            <div className="bg-gradient-to-r from-stone-900 via-stone-900 to-emerald-950/60 border border-stone-800 rounded-3xl p-6 sm:p-7 shadow-xl">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
                <div className="space-y-2 max-w-2xl">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold border border-emerald-500/30">
                    <Bot className="w-4 h-4 text-emerald-400" />
                    مرکز کنترل و فرماندهی ربات تلگرام مشاور (Master Telegram Bot)
                  </div>
                  <h2 className="text-lg sm:text-xl font-black text-white tracking-tight">
                    پیگیری هوشمند و گزارش‌گیری تلگرامی متمرکز
                  </h2>
                  <p className="text-stone-300 text-xs sm:text-sm leading-relaxed">
                    توکن اصلی ربات تلگرام منحصراً در این پنل توسط مشاور تنظیم می‌شود. دانش‌آموزان به توکن دسترسی ندارند و صرفاً با ثبت شناسه عددی (Chat ID) یا آیدی تلگرام خود، اتصالشان به ربات فعال می‌گردد.
                  </p>
                </div>

                <div className="flex flex-wrap sm:flex-nowrap items-center gap-3 shrink-0">
                  <div className="p-3.5 rounded-2xl bg-stone-950/90 border border-stone-800 text-xs space-y-1">
                    <div className="text-stone-400 text-[11px]">وضعیت اتصال ربات:</div>
                    {telegramMasterUsername ? (
                      <div className="flex items-center gap-2 text-emerald-400 font-black">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                        @{telegramMasterUsername}
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-amber-400 font-bold">
                        <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                        در انتظار ثبت توکن اصلی
                      </div>
                    )}
                  </div>

                  <div className="p-3.5 rounded-2xl bg-stone-950/90 border border-stone-800 text-xs space-y-1">
                    <div className="text-stone-400 text-[11px]">دریافت زنده (Polling):</div>
                    {isTelegramPollingActive ? (
                      <div className="flex items-center gap-2 text-emerald-400 font-black">
                        <Radio className="w-3.5 h-3.5 text-emerald-400 animate-ping" />
                        <span>فعال و در حال شنود</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-stone-400 font-bold">
                        <Square className="w-3.5 h-3.5 text-stone-500" />
                        <span>متوقف شده</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Master Bot Configuration & Polling Switch */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Bot Token Setup */}
              <div className="lg:col-span-2 bg-stone-900 border border-stone-800 rounded-3xl p-6 shadow-xl space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-stone-800">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-emerald-950 border border-emerald-800 text-emerald-400">
                      <Key className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-black text-white">تنظیم توکن اصلی ربات تلگرام (مخصوص مشاور)</h3>
                      <p className="text-xs text-stone-400">اتصال سامانه به ربات اختصاصی شما از طریق BotFather</p>
                    </div>
                  </div>

                  {telegramMasterUsername && (
                    <a
                      href={`https://t.me/${telegramMasterUsername}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-950/80 hover:bg-emerald-900/80 text-emerald-300 border border-emerald-800 text-xs font-bold transition-all"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>مشاهده ربات در تلگرام</span>
                    </a>
                  )}
                </div>

                <form onSubmit={handleSaveMasterBotToken} className="space-y-4">
                  <div>
                    <label className="block text-stone-300 font-bold text-xs mb-1.5">
                      توکن ربات تلگرام (HTTP API Token):
                    </label>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <input
                        type="password"
                        value={telegramMasterToken}
                        onChange={(e) => setTelegramMasterToken(e.target.value)}
                        placeholder={telegramMasterUsername ? `توکن فعلی فعال است (@${telegramMasterUsername}) — جهت تغییر توکن جدید وارد کنید` : "مثال: 789123456:AAHKq8s9Jk..."}
                        className="flex-1 px-3.5 py-2.5 rounded-xl bg-stone-950 border border-stone-800 text-white font-mono text-xs focus:border-emerald-500 focus:outline-none text-left ltr"
                      />
                      <button
                        type="submit"
                        disabled={isConfiguringTelegramBot || !telegramMasterToken.trim()}
                        className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-black transition-all cursor-pointer shadow-lg shadow-emerald-900/30 flex items-center justify-center gap-2 shrink-0"
                      >
                        {isConfiguringTelegramBot ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            <span>در حال اعتبارسنجی...</span>
                          </>
                        ) : (
                          <>
                            <Check className="w-4 h-4" />
                            <span>ذخیره و اتصال ربات</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {telegramBotMsg && (
                    <div
                      className={`p-3.5 rounded-2xl text-xs flex items-start gap-2.5 border ${
                        telegramBotMsg.type === 'success'
                          ? 'bg-emerald-950/60 border-emerald-800 text-emerald-200'
                          : 'bg-rose-950/60 border-rose-800 text-rose-200'
                      }`}
                    >
                      {telegramBotMsg.type === 'success' ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                      )}
                      <div>
                        <span className="font-bold">{telegramBotMsg.text}</span>
                        {telegramBotMsg.warning && (
                          <p className="text-[11px] text-amber-300 mt-1">{telegramBotMsg.warning}</p>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="p-3.5 rounded-2xl bg-stone-950/80 border border-stone-800 text-[11px] text-stone-400 space-y-1.5 leading-relaxed">
                    <strong className="text-stone-300 block">💡 راهنمای ۳ مرحله‌ای راه‌اندازی ربات مشاور:</strong>
                    <p>۱. در تلگرام به آیدی <strong>@BotFather</strong> پیام دهید و دستور <code className="bg-stone-800 px-1 py-0.5 rounded text-emerald-300">/newbot</code> را بفرستید.</p>
                    <p>۲. نام و آیدی ربات خود را انتخاب نموده و توکن ارائه‌شده را در کادر بالا کپی کرده و دکمه ذخیره را بزنید.</p>
                    <p>۳. دانش‌آموزان به ربات شما در تلگرام دکمه Start می‌زنند، ربات شناسه آن‌ها را می‌دهد و آن‌ها در پنل خود شناسه را ثبت می‌کنند.</p>
                  </div>
                </form>
              </div>

              {/* Polling & Live Runner Control Card */}
              <div className="bg-stone-900 border border-stone-800 rounded-3xl p-6 shadow-xl space-y-4 flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="flex items-center gap-2.5 pb-3 border-b border-stone-800">
                    <div className="p-2 rounded-xl bg-teal-950 border border-teal-800 text-teal-400">
                      <Zap className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-black text-white">کنترل پاسخگویی زنده</h3>
                      <p className="text-xs text-stone-400">سرویس شنود و تحلیل گزارش‌ها در سرور</p>
                    </div>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between items-center p-3 rounded-2xl bg-stone-950/70 border border-stone-800">
                      <span className="text-stone-400">سرویس Long-Polling:</span>
                      <span className={`font-black ${isTelegramPollingActive ? 'text-emerald-400' : 'text-stone-500'}`}>
                        {isTelegramPollingActive ? 'روشن و فعال' : 'خاموش / متوقف'}
                      </span>
                    </div>

                    <div className="flex justify-between items-center p-3 rounded-2xl bg-stone-950/70 border border-stone-800">
                      <span className="text-stone-400">دانش‌آموزان متصل:</span>
                      <span className="text-white font-black">
                        {students.filter((s) => Boolean(s.telegramChatId)).length} از {students.length} نفر
                      </span>
                    </div>

                    <div className="flex justify-between items-center p-3 rounded-2xl bg-stone-950/70 border border-stone-800">
                      <span className="text-stone-400">ثبت وقایع:</span>
                      <span className="text-stone-300 font-mono">
                        {telegramActivityLogs.length} رویداد ثبت شده
                      </span>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-stone-800">
                  {isTelegramPollingActive ? (
                    <button
                      type="button"
                      disabled={isTogglingTelegramPolling}
                      onClick={() => handleToggleTelegramPolling(false)}
                      className="w-full py-3 rounded-2xl bg-rose-600/90 hover:bg-rose-600 text-white text-xs font-black transition-all cursor-pointer shadow-lg shadow-rose-950/40 flex items-center justify-center gap-2"
                    >
                      <Square className="w-4 h-4" />
                      <span>متوقف‌سازی موقت سرویس ربات</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={isTogglingTelegramPolling || !telegramMasterUsername}
                      onClick={() => handleToggleTelegramPolling(true)}
                      className="w-full py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-black transition-all cursor-pointer shadow-lg shadow-emerald-950/40 flex items-center justify-center gap-2"
                    >
                      <Play className="w-4 h-4" />
                      <span>فعال‌سازی و شروع پاسخگویی زنده</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Students Telegram Linking & Test Ping Roster */}
            <div className="bg-stone-900 border border-stone-800 rounded-3xl p-6 shadow-xl space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-stone-800">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-emerald-950 border border-emerald-800 text-emerald-400">
                    <Users className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-white">جدول اختصاصی دسترسی تلگرام دانش‌آموزان</h3>
                    <p className="text-xs text-stone-400">هر دانش‌آموز با وارد کردن شناسه چت خود به ربات فوق متصل می‌شود</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="px-3 py-1.5 rounded-xl bg-stone-950 border border-stone-800 text-xs text-stone-400">
                    متصل: <strong className="text-emerald-400">{students.filter((s) => Boolean(s.telegramChatId)).length}</strong> نفر
                  </div>
                </div>
              </div>

              {pingTestStatus && (
                <div
                  className={`p-3.5 rounded-2xl text-xs flex items-center justify-between border ${
                    pingTestStatus.success
                      ? 'bg-emerald-950/60 border-emerald-800 text-emerald-200'
                      : 'bg-rose-950/60 border-rose-800 text-rose-200'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {pingTestStatus.success ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                    )}
                    <span>{pingTestStatus.message}</span>
                  </div>
                  <button
                    onClick={() => setPingTestStatus(null)}
                    className="p-1 rounded-md text-stone-400 hover:text-white cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              <div className="overflow-x-auto">
                <table className="w-full text-right border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-stone-800 text-stone-400 bg-stone-950/50">
                      <th className="py-3 px-3.5 font-bold">نام دانش‌آموز</th>
                      <th className="py-3 px-3.5 font-bold">رشته و مقطع</th>
                      <th className="py-3 px-3.5 font-bold">شناسه چت تلگرام (Chat ID)</th>
                      <th className="py-3 px-3.5 font-bold">آیدی تلگرام</th>
                      <th className="py-3 px-3.5 font-bold text-center">وضعیت اتصال</th>
                      <th className="py-3 px-3.5 font-bold text-center">ارسال پیام تست</th>
                      <th className="py-3 px-3.5 font-bold text-center">مدیریت</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-800/60">
                    {students.map((student) => {
                      const isLinked = Boolean(student.telegramChatId);
                      const isEditing = editingTelegramChatIdFor === (student.id || student.name);
                      const isSuspended = student.accessStatus === 'suspended';
                      const key = student.id || student.name;

                      return (
                        <tr key={key} className="hover:bg-stone-800/40 transition-colors">
                          <td className="py-3 px-3.5 font-bold text-white flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg bg-stone-800 flex items-center justify-center text-xs font-bold text-emerald-400">
                              {student.name.charAt(0)}
                            </div>
                            <span>{student.name}</span>
                            {isSuspended && (
                              <span className="px-1.5 py-0.5 rounded text-[9px] bg-rose-950 text-rose-300 border border-rose-800">
                                تعلیق
                              </span>
                            )}
                          </td>

                          <td className="py-3 px-3.5 text-stone-400">
                            {student.fieldOfStudy} • {student.grade}
                          </td>

                          <td className="py-3 px-3.5">
                            {isEditing ? (
                              <div className="flex items-center gap-1.5">
                                <input
                                  type="text"
                                  value={tempTelegramChatId}
                                  onChange={(e) => setTempTelegramChatId(e.target.value)}
                                  placeholder="مثال: 987654321"
                                  className="w-32 px-2.5 py-1.5 rounded-lg bg-stone-950 border border-emerald-500 text-white font-mono text-xs focus:outline-none ltr text-left"
                                />
                                <button
                                  type="button"
                                  onClick={() => handleSaveInlineStudentTelegramChatId(student)}
                                  className="p-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer"
                                  title="ذخیره شناسه"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditingTelegramChatIdFor(null)}
                                  className="p-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-400 cursor-pointer"
                                  title="انصراف"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2">
                                {isLinked ? (
                                  <span className="font-mono text-stone-300 bg-stone-950 px-2 py-1 rounded-md border border-stone-800 text-[11px] ltr">
                                    {student.telegramChatId}
                                  </span>
                                ) : (
                                  <span className="text-stone-500 text-[11px] italic">
                                    هنوز ثبت نشده
                                  </span>
                                )}
                              </div>
                            )}
                          </td>

                          <td className="py-3 px-3.5">
                            {isEditing ? (
                              <input
                                type="text"
                                value={tempTelegramUsername}
                                onChange={(e) => setTempTelegramUsername(e.target.value)}
                                placeholder="@username"
                                className="w-28 px-2 py-1.5 rounded-lg bg-stone-950 border border-stone-700 text-stone-200 text-xs focus:outline-none ltr text-left"
                              />
                            ) : (
                              <span className="text-stone-400 font-mono text-[11px]">
                                {student.telegramUsername ? `@${student.telegramUsername.replace('@', '')}` : '-'}
                              </span>
                            )}
                          </td>

                          <td className="py-3 px-3.5 text-center">
                            {isLinked ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800 text-[10px] font-bold">
                                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                                متصل و فعال
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-stone-800 text-stone-400 border border-stone-700 text-[10px] font-medium">
                                بدون چت‌آیدی
                              </span>
                            )}
                          </td>

                          <td className="py-3 px-3.5 text-center">
                            <button
                              type="button"
                              disabled={!isLinked || isTestingPingFor === key || !telegramMasterUsername}
                              onClick={() => handleSendTestPingToStudent(student)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 disabled:opacity-40 text-stone-200 text-xs font-bold transition-all cursor-pointer border border-stone-700"
                              title="ارسال پیامک آزمایشی به تلگرام این دانش‌آموز"
                            >
                              {isTestingPingFor === key ? (
                                <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                              ) : (
                                <Send className="w-3.5 h-3.5 text-emerald-400" />
                              )}
                              <span>ارسال پیام تست</span>
                            </button>
                          </td>

                          <td className="py-3 px-3.5 text-center">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingTelegramChatIdFor(key);
                                setTempTelegramChatId(student.telegramChatId || '');
                                setTempTelegramUsername(student.telegramUsername || '');
                              }}
                              className="p-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white cursor-pointer transition-all"
                              title="ویرایش مستقیم شناسه تلگرام"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Live Real-time Telegram Ingress Logs */}
            <div className="bg-stone-900 border border-stone-800 rounded-3xl p-6 shadow-xl space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-stone-800">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-teal-950 border border-teal-800 text-teal-400">
                    <Activity className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-white">دفترچه لاگ و رویدادهای زنده تلگرام (Ingress Stream)</h3>
                    <p className="text-xs text-stone-400">ثبت پیام‌های دریافتی، تحلیل‌های ارسالی و اتصال دانش‌آموزان</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={fetchTelegramStatus}
                    className="p-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white transition-all cursor-pointer"
                    title="به‌روزرسانی لاگ‌ها"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={handleClearTelegramLogs}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-stone-800 hover:bg-rose-950 hover:text-rose-300 text-stone-400 border border-stone-700 text-xs font-bold transition-all cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>پاکسازی لاگ</span>
                  </button>
                </div>
              </div>

              <div className="space-y-2 max-h-80 overflow-y-auto pr-1 text-xs">
                {telegramActivityLogs.length === 0 ? (
                  <div className="text-center py-8 text-stone-500 text-xs">
                    هنوز پیام یا رویدادی در ربات تلگرام ثبت نشده است.
                  </div>
                ) : (
                  telegramActivityLogs.slice(-30).reverse().map((log) => (
                    <div
                      key={log.id}
                      className={`p-3 rounded-2xl border flex items-start gap-3 transition-colors ${
                        log.type === 'incoming'
                          ? 'bg-blue-950/30 border-blue-900/50 text-blue-200'
                          : log.type === 'outgoing'
                          ? 'bg-emerald-950/30 border-emerald-900/50 text-emerald-200'
                          : log.type === 'error'
                          ? 'bg-rose-950/30 border-rose-900/50 text-rose-200'
                          : 'bg-stone-950/60 border-stone-800 text-stone-300'
                      }`}
                    >
                      <div className="p-1 rounded-md shrink-0 mt-0.5">
                        {log.type === 'incoming' ? (
                          <Smartphone className="w-3.5 h-3.5 text-blue-400" />
                        ) : log.type === 'outgoing' ? (
                          <Bot className="w-3.5 h-3.5 text-emerald-400" />
                        ) : log.type === 'error' ? (
                          <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                        ) : (
                          <Activity className="w-3.5 h-3.5 text-stone-400" />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-0.5">
                          <span className="font-bold text-[11px] text-white">
                            {log.user ? `${log.user} · ` : ''}
                            {log.type === 'incoming' ? 'پیام دریافتی' : log.type === 'outgoing' ? 'پاسخ هوشمند مشاور' : log.type === 'error' ? 'خطا' : 'سیستمی'}
                          </span>
                          <span className="text-[10px] text-stone-400 font-mono">{log.time}</span>
                        </div>
                        <p className="text-[11px] leading-relaxed break-words whitespace-pre-wrap">
                          {log.text}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Inspect Student Detail Reports Modal */}
      {inspectingStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/80 backdrop-blur-md animate-fadeIn">
          <div className="bg-stone-900 text-white rounded-3xl max-w-2xl w-full p-6 border border-stone-800 shadow-2xl space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-stone-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-base">
                  {inspectingStudent.name.charAt(0)}
                </div>
                <div>
                  <h3 className="text-base font-black text-white">ریز گزارش‌ها و استفاده: {inspectingStudent.name}</h3>
                  <div className="text-xs text-stone-400">
                    {inspectingStudent.grade} • {inspectingStudent.fieldOfStudy} • هدف: {inspectingStudent.targetGoal}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setInspectingStudent(null)}
                className="p-2 rounded-full text-stone-400 hover:text-white hover:bg-stone-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content list of reports */}
            <div className="flex-1 overflow-y-auto space-y-3 pr-1 text-xs">
              {(() => {
                const key = inspectingStudent.id || inspectingStudent.name;
                let reports: NightlyReport[] = [];
                try {
                  const saved = localStorage.getItem(`study_advisor_reports_${key}`) || (key === 'st_ali' || key === 'علی' ? localStorage.getItem('study_advisor_reports') : null);
                  if (saved) reports = JSON.parse(saved);
                } catch (e) {
                  console.error(e);
                }

                if (reports.length === 0) {
                  return (
                    <div className="text-center py-10 text-stone-400">
                      هنوز هیچ گزارش شبانه‌ای توسط این دانش‌آموز ثبت نشده است.
                    </div>
                  );
                }

                return reports.map((r, idx) => (
                  <div key={r.id || idx} className="bg-stone-800/80 border border-stone-750 rounded-2xl p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-emerald-300">تاریخ: {r.date}</span>
                      <span className="px-2 py-0.5 rounded-full bg-stone-700 text-stone-300 text-[11px]">
                        رضایت: {r.satisfactionRating} از ۵ ⭐
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-stone-300">
                      <div>ساعت مطالعه: <strong className="text-white">{r.studiedHours} ساعت</strong></div>
                      <div>تست‌ها: <strong className="text-white">{r.totalTests}</strong> (درست: {r.correctTests} • غلط: {r.wrongTests})</div>
                    </div>
                    {r.studentNotes && (
                      <div className="p-2.5 rounded-xl bg-stone-900 text-stone-300 border border-stone-750">
                        <strong className="text-stone-400 block mb-1">یادداشت دانش‌آموز:</strong>
                        {r.studentNotes}
                      </div>
                    )}
                    {r.obstacles && r.obstacles.length > 0 && (
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-stone-400">موانع:</span>
                        {r.obstacles.map((obs, i) => (
                          <span key={i} className="px-2 py-0.5 rounded-lg bg-rose-950/60 text-rose-300 border border-rose-800/60 text-[10px]">
                            {obs}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ));
              })()}
            </div>

            <div className="pt-3 border-t border-stone-800 flex items-center justify-end gap-2">
              <button
                onClick={() => {
                  onSelectStudentWorkspace(inspectingStudent);
                  setInspectingStudent(null);
                }}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs cursor-pointer"
              >
                ورود مستقیم به برنامه هفتگی این دانش‌آموز
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Action Success Toast */}
      {actionSuccessMsg && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 bg-emerald-950 border border-emerald-600 text-emerald-200 px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 animate-fadeIn text-xs sm:text-sm font-bold">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span>{actionSuccessMsg}</span>
          <button
            onClick={() => setActionSuccessMsg(null)}
            className="p-1 rounded-lg hover:bg-emerald-900/60 text-emerald-400 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* MODAL 1: Delete Student Confirmation (No window.confirm!) */}
      {studentToDelete && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-stone-900 border border-rose-800/80 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 animate-scaleUp">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="p-2.5 rounded-2xl bg-rose-950 border border-rose-800">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-black text-white">حذف کامل حساب دانش‌آموز</h3>
                <p className="text-xs text-rose-300 font-medium">این عملیات غیرقابل بازگشت است</p>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-stone-950/80 border border-stone-800 text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-stone-400">نام دانش‌آموز:</span>
                <strong className="text-white font-black">{studentToDelete.name}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-400">رشته و مقطع:</span>
                <span className="text-stone-300">{studentToDelete.grade} • {studentToDelete.fieldOfStudy}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-400">شناسه سیستم:</span>
                <span className="text-stone-400 font-mono text-[11px]">{studentToDelete.id || '-'}</span>
              </div>
            </div>

            <p className="text-xs text-stone-300 leading-relaxed">
              با حذف این حساب، تمام برنامه‌ریزی‌های هفتگی، گزارش‌های شبانه، ثبت اشتباهات و لینک ورود اختصاصی این دانش‌آموز مسدود و بلافاصله پاکسازی خواهند شد.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-800">
              <button
                type="button"
                onClick={() => setStudentToDelete(null)}
                className="px-4 py-2.5 rounded-xl bg-stone-800 hover:bg-stone-750 text-stone-300 hover:text-white text-xs font-bold transition-all cursor-pointer"
              >
                انصراف
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteStudent}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-black transition-all cursor-pointer shadow-lg shadow-rose-900/30 flex items-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" />
                <span>بله، حذف کامل و قطعی</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Edit Student Details (Comprehensive Management) */}
      {studentToEdit && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-stone-900 border border-stone-800 rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-4 max-h-[90vh] flex flex-col animate-scaleUp">
            <div className="flex items-center justify-between pb-3 border-b border-stone-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-950 border border-emerald-800 text-emerald-400">
                  <Pencil className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">ویرایش و مدیریت حساب دانش‌آموز</h3>
                  <p className="text-xs text-stone-400">مشخصات تحصیلی، رمز ورود و وضعیت دسترسی</p>
                </div>
              </div>
              <button
                onClick={() => setStudentToEdit(null)}
                className="p-1.5 rounded-full text-stone-400 hover:text-white hover:bg-stone-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditStudent} className="flex-1 overflow-y-auto space-y-3.5 pr-1 text-xs">
              <div>
                <label className="block text-stone-300 font-bold mb-1">نام و نام خانوادگی:</label>
                <input
                  type="text"
                  required
                  value={editFormData.name || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-stone-950 border border-stone-800 text-white focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-stone-300 font-bold mb-1">پایه تحصیلی:</label>
                  <select
                    value={editFormData.grade || 'دوازدهم / کنکور'}
                    onChange={(e) => setEditFormData({ ...editFormData, grade: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-stone-950 border border-stone-800 text-white focus:border-emerald-500 focus:outline-none"
                  >
                    <option value="دهم">دهم</option>
                    <option value="یازدهم">یازدهم</option>
                    <option value="دوازدهم / کنکور">دوازدهم / کنکور</option>
                    <option value="فارغ‌التحصیل / پشت کنکور">فارغ‌التحصیل / پشت کنکور</option>
                  </select>
                </div>

                <div>
                  <label className="block text-stone-300 font-bold mb-1">رشته تحصیلی:</label>
                  <select
                    value={editFormData.fieldOfStudy || 'علوم تجربی'}
                    onChange={(e) => setEditFormData({ ...editFormData, fieldOfStudy: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-xl bg-stone-950 border border-stone-800 text-white focus:border-emerald-500 focus:outline-none"
                  >
                    <option value="علوم تجربی">علوم تجربی</option>
                    <option value="ریاضی و فیزیک">ریاضی و فیزیک</option>
                    <option value="ادبیات و علوم انسانی">ادبیات و علوم انسانی</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-stone-300 font-bold mb-1">هدف و رشته قبولی:</label>
                  <input
                    type="text"
                    value={editFormData.targetGoal || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, targetGoal: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-stone-950 border border-stone-800 text-white focus:border-emerald-500 focus:outline-none"
                    placeholder="مثلاً: پزشکی، مهندسی برق"
                  />
                </div>

                <div>
                  <label className="block text-stone-300 font-bold mb-1">ساعت هدف روزانه:</label>
                  <input
                    type="number"
                    min={1}
                    max={18}
                    value={editFormData.dailyTargetHours || 8}
                    onChange={(e) => setEditFormData({ ...editFormData, dailyTargetHours: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl bg-stone-950 border border-stone-800 text-white focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-stone-300 font-bold mb-1">شناسه چت تلگرام (Chat ID):</label>
                  <input
                    type="text"
                    value={editFormData.telegramChatId || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, telegramChatId: e.target.value })}
                    placeholder="مثال: 987654321"
                    className="w-full px-3 py-2 rounded-xl bg-stone-950 border border-stone-800 text-white font-mono focus:border-emerald-500 focus:outline-none text-left ltr"
                  />
                </div>

                <div>
                  <label className="block text-stone-300 font-bold mb-1">آیدی تلگرام (@username):</label>
                  <input
                    type="text"
                    value={editFormData.telegramUsername || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, telegramUsername: e.target.value })}
                    placeholder="@student_user"
                    className="w-full px-3 py-2 rounded-xl bg-stone-950 border border-stone-800 text-white font-mono focus:border-emerald-500 focus:outline-none text-left ltr"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-stone-300 font-bold mb-1">رمز ورود دانش‌آموز:</label>
                  <input
                    type="text"
                    required
                    value={editFormData.password || '1234'}
                    onChange={(e) => setEditFormData({ ...editFormData, password: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-stone-950 border border-stone-800 text-white font-mono focus:border-emerald-500 focus:outline-none text-left ltr"
                  />
                </div>

                <div>
                  <label className="block text-stone-300 font-bold mb-1">وضعیت دسترسی:</label>
                  <select
                    value={editFormData.accessStatus || 'active'}
                    onChange={(e) => setEditFormData({ ...editFormData, accessStatus: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-xl bg-stone-950 border border-stone-800 text-white focus:border-emerald-500 focus:outline-none"
                  >
                    <option value="active">فعال و مجاز</option>
                    <option value="suspended">معلق و قفل شده</option>
                  </select>
                </div>
              </div>

              {editFormData.accessStatus === 'suspended' && (
                <div>
                  <label className="block text-rose-300 font-bold mb-1">علت تعلیق / پیام به دانش‌آموز:</label>
                  <input
                    type="text"
                    value={editFormData.lockoutReason || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, lockoutReason: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-rose-950/40 border border-rose-800 text-rose-200 focus:border-rose-500 focus:outline-none"
                    placeholder="علت مسدودسازی دسترسی دانش‌آموز"
                  />
                </div>
              )}

              <div>
                <label className="block text-stone-300 font-bold mb-1">یادداشت مشاور برای این دانش‌آموز:</label>
                <textarea
                  rows={2}
                  value={editFormData.additionalNotes || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, additionalNotes: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-stone-950 border border-stone-800 text-white focus:border-emerald-500 focus:outline-none resize-none"
                  placeholder="نکات مشاوره‌ای اختصاصی..."
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-stone-800">
                <button
                  type="button"
                  onClick={() => setStudentToEdit(null)}
                  className="px-4 py-2.5 rounded-xl bg-stone-800 hover:bg-stone-750 text-stone-300 hover:text-white font-bold transition-all cursor-pointer"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black transition-all cursor-pointer shadow-lg shadow-emerald-900/30 flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>ذخیره تغییرات</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: Emergency Revoke Sessions Confirmation (No window.confirm!) */}
      {showRevokeConfirmModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-stone-900 border border-amber-800/80 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 animate-scaleUp">
            <div className="flex items-center gap-3 text-amber-400">
              <div className="p-2.5 rounded-2xl bg-amber-950 border border-amber-800">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-black text-white">ابطال اضطراری نشست‌های فعال</h3>
                <p className="text-xs text-amber-300 font-medium">خروج فوری تمام دستگاه‌ها</p>
              </div>
            </div>

            <p className="text-xs text-stone-300 leading-relaxed">
              با اجرای این عملیات، کلیه توکن‌ها و نشست‌های معتبر در تمام مرورگرها و سیستم‌ها بی‌درنگ لغو و باطل می‌گردند و تمام کاربران مجدداً ملزم به ورود خواهند بود.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-800">
              <button
                type="button"
                onClick={() => setShowRevokeConfirmModal(false)}
                className="px-4 py-2.5 rounded-xl bg-stone-800 hover:bg-stone-750 text-stone-300 hover:text-white text-xs font-bold transition-all cursor-pointer"
              >
                انصراف
              </button>
              <button
                type="button"
                onClick={handleConfirmRevokeSessions}
                className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-black transition-all cursor-pointer shadow-lg shadow-amber-900/30 flex items-center gap-1.5"
              >
                <ShieldAlert className="w-4 h-4" />
                <span>بله، ابطال فوری تمام نشست‌ها</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Share Modal Integration inside Counselor Portal */}
      <ShareModal
        isOpen={isShareModalOpen}
        onClose={() => {
          setIsShareModalOpen(false);
          setShareStudentTarget(undefined);
        }}
        currentStudentName={shareStudentTarget}
      />

      {/* Device Session Manager Modal (Counselor Master Mode) */}
      {deviceModalStudent && (
        <DeviceSessionManagerModal
          isOpen={Boolean(deviceModalStudent)}
          onClose={() => setDeviceModalStudent(null)}
          profile={deviceModalStudent}
          isCounselorView={true}
          onDevicesUpdated={(updatedDevices) => {
            const updatedProfile = { ...deviceModalStudent, boundDevices: updatedDevices };
            onUpdateStudentProfile(updatedProfile);
            setDeviceModalStudent(updatedProfile);
          }}
        />
      )}
    </div>
  );
};
