import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { NightlyCheckinView } from './components/NightlyCheckinView';
import { WeeklyScheduleView } from './components/WeeklyScheduleView';
import { CognitivePsychologyView } from './components/CognitivePsychologyView';
import { MathExamPlannerView } from './components/MathExamPlannerView';
import { QuickChatView } from './components/QuickChatView';
import { HermesTelegramGuide } from './components/HermesTelegramGuide';
import { ProfileModal } from './components/ProfileModal';
import { ShareModal } from './components/ShareModal';
import { DataResetModal } from './components/DataResetModal';
import { KonkurAdvancedSearchModal } from './components/KonkurAdvancedSearchModal';
import { KonkurProToolsHub, ProToolTab } from './components/KonkurProToolsHub';
import { MasterAdminModal } from './components/MasterAdminModal';
import { CounselorDedicatedPortal } from './components/CounselorDedicatedPortal';
import { CounselorLoginModal } from './components/CounselorLoginModal';
import { AccountLockoutOverlay } from './components/AccountLockoutOverlay';
import { StudentLoginOverlay } from './components/StudentLoginOverlay';
import { Megaphone, ShieldCheck, X } from 'lucide-react';
import { 
  StudentProfile, 
  WeeklySchedule, 
  NightlyReport, 
  SpacedRepetitionCard, 
  FeynmanSession, 
  AppBackupData,
  ExamBudget,
  ExamErrorLog,
  FocusTestSession,
  TopicMasteryRecord,
  TrapQuestion,
  FinalExamItem
} from './types';
import { 
  DEFAULT_STUDENT_PROFILE, 
  SAMPLE_INITIAL_SCHEDULE, 
  INITIAL_SAMPLE_LOGS,
  SAMPLE_SPACED_CARDS,
  SAMPLE_FEYNMAN_SESSIONS,
  DEFAULT_EXAM_BUDGET,
  SAMPLE_EXAM_ERRORS,
  SAMPLE_FOCUS_SESSIONS,
  INITIAL_TOPIC_MASTERY,
  SAMPLE_TRAP_QUESTIONS,
  INITIAL_FINAL_EXAM_ITEMS
} from './data/defaults';

const DEFAULT_SECONDARY_STUDENT: StudentProfile = {
  id: 'st_sara',
  name: 'سارا احمدی',
  grade: 'دوازدهم / کنکور',
  fieldOfStudy: 'علوم تجربی',
  targetGoal: 'پزشکی دانشگاه تهران',
  dailyTargetHours: 9,
  wakeTime: '06:00',
  sleepTime: '23:00',
  strongSubjects: ['زیست‌شناسی', 'شیمی'],
  weakSubjects: ['ریاضی جامع', 'فیزیک حرکت'],
  schoolOrWorkHours: '۷:۳۰ تا ۱۳:۳۰',
  additionalNotes: 'اکانت نمونه دانش‌آموز رشته تجربی'
};

async function syncStudentsToServer(updatedStudents: StudentProfile[], updatedDeleted?: string[]) {
  try {
    const deletedList = updatedDeleted || getDeletedStudentsList();
    const token = typeof window !== 'undefined'
      ? (sessionStorage.getItem('study_advisor_counselor_token') || localStorage.getItem('study_advisor_counselor_token'))
      : null;

    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    await fetch('/api/students/sync', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        students: updatedStudents,
        deletedStudents: deletedList,
      }),
    });
  } catch (e) {
    console.error('Server sync error:', e);
  }
}

function getDeletedStudentsList(): string[] {
  try {
    const saved = localStorage.getItem('study_advisor_deleted_students');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    console.error(e);
  }
  return [];
}

export function findMatchingStudentProfile(list: StudentProfile[], query?: string | null): StudentProfile | undefined {
  if (!query || !Array.isArray(list)) return undefined;
  const raw = query.trim();
  if (!raw) return undefined;
  const q = raw.toLowerCase();
  const cleanQ = q.replace(/^st_unregistered_/, '').replace(/^st_deleted_/, '');

  return list.find((s) => {
    if (!s) return false;
    const sName = (s.name || '').trim().toLowerCase();
    const sId = (s.id || '').trim().toLowerCase();

    // Direct exact or clean matches
    if (sName === q || sId === q || sName === cleanQ || sId === cleanQ) return true;

    // Matches with or without 'st_' prefix
    if (sId === `st_${q}` || sId === `st_${cleanQ}`) return true;
    if (`st_${sId}` === q || `st_${sId}` === cleanQ) return true;

    // Decoded URI matching
    try {
      if (decodeURIComponent(sName) === decodeURIComponent(q) || decodeURIComponent(sId) === decodeURIComponent(q)) return true;
    } catch (e) {
      // Ignore
    }

    return false;
  });
}

function getInitialStudentsList(): StudentProfile[] {
  try {
    const deletedList = getDeletedStudentsList();
    const saved = localStorage.getItem('study_advisor_students');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const filtered = parsed.filter(
          (s: StudentProfile) => !deletedList.some(
            (d) => d.toLowerCase() === (s.name || '').toLowerCase() || (s.id && d.toLowerCase() === s.id.toLowerCase())
          )
        );
        if (filtered.length > 0) return filtered;
      }
    }
  } catch (e) {
    console.error(e);
  }
  const deletedList = getDeletedStudentsList();
  const defaults = [DEFAULT_STUDENT_PROFILE, DEFAULT_SECONDARY_STUDENT];
  const safeDefaults = defaults.filter(
    (s) => !deletedList.some((d) => d.toLowerCase() === s.name.toLowerCase() || (s.id && d.toLowerCase() === s.id.toLowerCase()))
  );
  return safeDefaults.length > 0 ? safeDefaults : [DEFAULT_STUDENT_PROFILE];
}

function resolveActiveStudent(studentsList: StudentProfile[]): StudentProfile {
  if (typeof window !== 'undefined') {
    try {
      const params = new URLSearchParams(window.location.search);
      const studentParam = params.get('student') || params.get('st') || params.get('profile') || params.get('user') || params.get('id');
      if (studentParam) {
        const decoded = decodeURIComponent(studentParam).trim();
        const lowerDecoded = decoded.toLowerCase();

        // Strict Zero-Guest Block: Never allow guest/demo bypass
        if (lowerDecoded.includes('تست') || lowerDecoded.includes('test') || lowerDecoded.includes('مهمان') || lowerDecoded.includes('guest') || lowerDecoded.includes('demo')) {
          return {
            id: 'guest_blocked',
            name: 'دسترسی مهمان مسدود است',
            grade: 'مهمان غیرمجاز',
            fieldOfStudy: '-',
            targetGoal: '',
            dailyTargetHours: 0,
            wakeTime: '00:00',
            sleepTime: '00:00',
            strongSubjects: [],
            weakSubjects: [],
            schoolOrWorkHours: '',
            accessStatus: 'suspended',
            lockoutReason: 'جهت حفظ پایداری سامانه، امنیت داده‌ها و جلوگیری از حملات سایبری و دیداس، ورود کاربران مهمان کاملاً مسدود می‌باشد. لطفاً با حساب کاربری معتبر وارد شوید.',
            isPendingInitialSync: false,
          };
        }

        // 1. If student is present in local students cache, return immediately
        const matched = findMatchingStudentProfile(studentsList, decoded);
        if (matched) {
          return matched;
        }

        // 2. If not found in local cache, create a provisional connecting profile and let background sync verify with server
        const cleanId = decoded.startsWith('st_') ? decoded : `st_${decoded}`;
        return {
          id: cleanId,
          name: decoded,
          grade: 'در حال دریافت اطلاعات از سرور مشاور...',
          fieldOfStudy: '-',
          targetGoal: '',
          dailyTargetHours: 0,
          wakeTime: '06:00',
          sleepTime: '23:00',
          strongSubjects: [],
          weakSubjects: [],
          schoolOrWorkHours: '',
          accessStatus: 'active',
          isPendingInitialSync: true
        };
      }
    } catch (e) {
      console.error(e);
    }
  }

  try {
    const saved = localStorage.getItem('study_advisor_profile');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed && (parsed.name || parsed.id)) {
        const deletedList = getDeletedStudentsList();
        if (deletedList.some((d) => d.toLowerCase() === (parsed.name || '').toLowerCase() || (parsed.id && d.toLowerCase() === (parsed.id || '').toLowerCase()))) {
          return {
            ...parsed,
            accessStatus: 'suspended',
            lockoutReason: `حساب کاربری دانش‌آموز "${parsed.name}" توسط مشاور به طور کامل حذف گردیده است.`
          };
        }
        const matched = findMatchingStudentProfile(studentsList, parsed.id || parsed.name);
        if (matched) return matched;
        return parsed;
      }
    }
  } catch (e) {
    console.error(e);
  }

  return studentsList[0] || DEFAULT_STUDENT_PROFILE;
}

function loadStudentSlice<T>(keyPrefix: string, studentKey: string, fallback: T): T {
  try {
    const specificSaved = localStorage.getItem(`${keyPrefix}_${studentKey}`);
    if (specificSaved) return JSON.parse(specificSaved);

    const globalSaved = localStorage.getItem(keyPrefix);
    if (globalSaved && (studentKey === 'st_ali' || studentKey === 'علی')) return JSON.parse(globalSaved);
  } catch (e) {
    console.error(e);
  }
  return fallback;
}

export default function App() {
  // Master Admin & Multi-Student Accounts State
  const [adminPasscode, setAdminPasscode] = useState<string>(() => {
    return localStorage.getItem('study_advisor_admin_passcode') || '1234';
  });

  const [isAdminUnlocked, setIsAdminUnlocked] = useState<boolean>(() => {
    return typeof window !== 'undefined' && localStorage.getItem('study_advisor_counselor_logged_in') === 'true';
  });
  const [isCounselorPortalOpen, setIsCounselorPortalOpen] = useState<boolean>(false);
  const [isCounselorLoginModalOpen, setIsCounselorLoginModalOpen] = useState<boolean>(false);
  const [isMasterAdminModalOpen, setIsMasterAdminModalOpen] = useState<boolean>(false);

  // Check URL parameters for direct counselor mode access
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('counselor') === 'true' || params.get('mode') === 'counselor' || params.get('admin') === 'true') {
        if (localStorage.getItem('study_advisor_counselor_logged_in') === 'true') {
          setIsCounselorPortalOpen(true);
        } else {
          setIsCounselorLoginModalOpen(true);
        }
      }
    }
  }, []);

  const [students, setStudents] = useState<StudentProfile[]>(getInitialStudentsList);
  const [serverUsageStats, setServerUsageStats] = useState<Record<string, any>>({});

  const [profile, setProfile] = useState<StudentProfile>(() => {
    const stList = getInitialStudentsList();
    return resolveActiveStudent(stList);
  });

  const activeStKey = profile.id || profile.name;

  const [counselorAnnouncement, setCounselorAnnouncement] = useState<string>(() => {
    return localStorage.getItem('study_advisor_counselor_announcement') || 'دانش‌آموزان عزیز، تا جمعه مهلت ثبت و ارسال گزارش شبانه و تحلیل آزمون جامع را دارید!';
  });

  const [counselorSystemDirective, setCounselorSystemDirective] = useState<string>(() => {
    return localStorage.getItem('study_advisor_counselor_directive') || '';
  });

  const [schedule, setSchedule] = useState<WeeklySchedule>(() =>
    loadStudentSlice('study_advisor_schedule', activeStKey, SAMPLE_INITIAL_SCHEDULE)
  );

  const [examBudget, setExamBudget] = useState<ExamBudget>(() =>
    loadStudentSlice('study_advisor_exam_budget', activeStKey, DEFAULT_EXAM_BUDGET)
  );

  const [reports, setReports] = useState<NightlyReport[]>(() =>
    loadStudentSlice('study_advisor_reports', activeStKey, INITIAL_SAMPLE_LOGS)
  );

  const [spacedCards, setSpacedCards] = useState<SpacedRepetitionCard[]>(() =>
    loadStudentSlice('study_advisor_spaced_cards', activeStKey, SAMPLE_SPACED_CARDS)
  );

  const [feynmanSessions, setFeynmanSessions] = useState<FeynmanSession[]>(() =>
    loadStudentSlice('study_advisor_feynman', activeStKey, SAMPLE_FEYNMAN_SESSIONS)
  );

  const [errors, setErrors] = useState<ExamErrorLog[]>(() =>
    loadStudentSlice('study_advisor_exam_errors', activeStKey, SAMPLE_EXAM_ERRORS)
  );

  const [focusSessions, setFocusSessions] = useState<FocusTestSession[]>(() =>
    loadStudentSlice('study_advisor_focus_sessions', activeStKey, SAMPLE_FOCUS_SESSIONS)
  );

  const [masteryRecords, setMasteryRecords] = useState<TopicMasteryRecord[]>(() =>
    loadStudentSlice('study_advisor_topic_mastery', activeStKey, INITIAL_TOPIC_MASTERY)
  );

  const [trapQuestions, setTrapQuestions] = useState<TrapQuestion[]>(SAMPLE_TRAP_QUESTIONS);

  const [finalExamItems, setFinalExamItems] = useState<FinalExamItem[]>(() =>
    loadStudentSlice('study_advisor_final_exam', activeStKey, INITIAL_FINAL_EXAM_ITEMS)
  );

  const [proToolsSubTab, setProToolsSubTab] = useState<ProToolTab>('postmortem');

  const [activeTab, setActiveTab] = useState<'nightly' | 'schedule' | 'exam' | 'pro_tools' | 'psychology' | 'chat' | 'hermes'>('nightly');
  const [isProfileModalOpen, setIsProfileModalOpen] = useState<boolean>(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState<boolean>(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState<boolean>(false);
  const [isSearchModalOpen, setIsSearchModalOpen] = useState<boolean>(false);

  // Authentication State per Student Account
  const [authenticatedStudents, setAuthenticatedStudents] = useState<string[]>(() => {
    try {
      const saved = sessionStorage.getItem('study_advisor_authenticated_students');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  const handleAuthenticateStudent = (studentNameOrId?: string) => {
    const targetName = studentNameOrId || profile.name;
    const targetId = profile.id || profile.name;
    const updated = Array.from(new Set([...authenticatedStudents, targetName, targetId].filter(Boolean)));
    setAuthenticatedStudents(updated);
    try {
      sessionStorage.setItem('study_advisor_authenticated_students', JSON.stringify(updated));
    } catch (e) {
      console.error(e);
    }
  };

  const isCurrentStudentAuthenticated =
    authenticatedStudents.includes(profile.name) ||
    (profile.id ? authenticatedStudents.includes(profile.id) : false) ||
    profile.accessStatus === 'suspended';

  // Persistence effects for active student profile
  useEffect(() => {
    const deletedList = getDeletedStudentsList();
    const isDeleted = deletedList.some(
      (d) => d.toLowerCase() === profile.name.toLowerCase() || (profile.id && d.toLowerCase() === profile.id.toLowerCase())
    );
    if (isDeleted) {
      return;
    }

    localStorage.setItem('study_advisor_profile', JSON.stringify(profile));
    setStudents((prev) => {
      const exists = prev.some((s) => s.name === profile.name || (s.id && s.id === profile.id));
      if (!exists) return prev; // DO NOT auto-create unlisted profiles!
      return prev.map((s) => (s.name === profile.name || (s.id && s.id === profile.id) ? profile : s));
    });
  }, [profile]);

  // Server-side real-time access control synchronization
  useEffect(() => {
    let isMounted = true;

    const fetchAndEnforceServerAccess = async () => {
      try {
        const token = typeof window !== 'undefined'
          ? (sessionStorage.getItem('study_advisor_counselor_token') || localStorage.getItem('study_advisor_counselor_token'))
          : null;
        const headers: Record<string, string> = {};
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }
        const res = await fetch('/api/students/list', { headers });
        if (!res.ok) return;
        const data = await res.json();
        if (data.success && isMounted) {
          if (data.counselorPasscode) {
            setAdminPasscode(data.counselorPasscode);
            localStorage.setItem('study_advisor_admin_passcode', data.counselorPasscode);
          }
          const serverStudents: StudentProfile[] = data.students || [];
          const serverDeleted: string[] = data.deletedStudents || [];

          // 1. Sync deleted list in localStorage while removing active server students
          if (data.usageStats) {
            setServerUsageStats(data.usageStats);
          }

          const activeServerIdentifiers = new Set(
            serverStudents.flatMap((s) => [
              (s.name || '').toLowerCase(),
              (s.id || '').toLowerCase(),
              s.id ? `st_${s.id.toLowerCase()}` : ''
            ]).filter(Boolean)
          );

          const currentDeletedLocal = getDeletedStudentsList();
          const combinedDeleted = Array.from(new Set([...currentDeletedLocal, ...serverDeleted]));
          const currentDeleted = combinedDeleted.filter(
            (d) => !activeServerIdentifiers.has(d.toLowerCase())
          );
          localStorage.setItem('study_advisor_deleted_students', JSON.stringify(currentDeleted));

          // 2. Check URL parameter matching
          let urlStudentParam: string | null = null;
          if (typeof window !== 'undefined') {
            const params = new URLSearchParams(window.location.search);
            urlStudentParam = params.get('student') || params.get('st') || params.get('profile') || params.get('user') || params.get('id');
          }

          const targetLookupKey = urlStudentParam || profile.id || profile.name;

          // Check if explicitly in deleted list on server
          const isDeletedOnServer = currentDeleted.some((d) => {
            const dLower = d.toLowerCase();
            return (
              dLower === targetLookupKey.toLowerCase() ||
              dLower === (profile.name || '').toLowerCase() ||
              (profile.id && dLower === profile.id.toLowerCase())
            );
          });

          // Match on server students list
          const matchedServerStudent = findMatchingStudentProfile(serverStudents, targetLookupKey);

          if (matchedServerStudent) {
            // Found on server! Update active profile with fresh server data
            const safePassword =
              matchedServerStudent.password && matchedServerStudent.password !== '••••••••'
                ? matchedServerStudent.password
                : profile.password || '1234';

            const updatedActiveProfile: StudentProfile = {
              ...profile,
              ...matchedServerStudent,
              password: safePassword,
              isPendingInitialSync: false,
            };

            // If profile was provisional or changed, load slices and update profile state
            if (
              profile.isPendingInitialSync ||
              profile.id !== matchedServerStudent.id ||
              profile.accessStatus !== matchedServerStudent.accessStatus ||
              profile.lockoutReason !== matchedServerStudent.lockoutReason
            ) {
              const stKey = matchedServerStudent.id || matchedServerStudent.name;
              setSchedule(loadStudentSlice('study_advisor_schedule', stKey, SAMPLE_INITIAL_SCHEDULE));
              setExamBudget(loadStudentSlice('study_advisor_exam_budget', stKey, DEFAULT_EXAM_BUDGET));
              setReports(loadStudentSlice('study_advisor_reports', stKey, INITIAL_SAMPLE_LOGS));
              setSpacedCards(loadStudentSlice('study_advisor_spaced_cards', stKey, SAMPLE_SPACED_CARDS));
              setFeynmanSessions(loadStudentSlice('study_advisor_feynman', stKey, SAMPLE_FEYNMAN_SESSIONS));
              setErrors(loadStudentSlice('study_advisor_exam_errors', stKey, SAMPLE_EXAM_ERRORS));
              setFocusSessions(loadStudentSlice('study_advisor_focus_sessions', stKey, SAMPLE_FOCUS_SESSIONS));
              setMasteryRecords(loadStudentSlice('study_advisor_topic_mastery', stKey, INITIAL_TOPIC_MASTERY));
              setFinalExamItems(loadStudentSlice('study_advisor_final_exam', stKey, INITIAL_FINAL_EXAM_ITEMS));

              setProfile(updatedActiveProfile);
              localStorage.setItem('study_advisor_profile', JSON.stringify(updatedActiveProfile));
            }
          } else if (urlStudentParam && serverStudents.length > 0) {
            // URL parameter was provided, but does not match any registered student on server!
            const lowerParam = urlStudentParam.toLowerCase();
            const isGuestOrDemo = lowerParam.includes('تست') || lowerParam.includes('test') || lowerParam.includes('مهمان') || lowerParam.includes('guest') || lowerParam.includes('demo');

            if (isGuestOrDemo) {
              localStorage.removeItem('study_advisor_profile');
              setProfile({
                id: 'guest_blocked',
                name: 'دسترسی مهمان مسدود است',
                grade: 'مهمان غیرمجاز',
                fieldOfStudy: '-',
                targetGoal: '',
                dailyTargetHours: 0,
                wakeTime: '00:00',
                sleepTime: '00:00',
                strongSubjects: [],
                weakSubjects: [],
                schoolOrWorkHours: '',
                accessStatus: 'suspended',
                lockoutReason: 'جهت حفظ پایداری سامانه، امنیت داده‌ها و جلوگیری از حملات سایبری و دیداس، دسترسی مهمان به کل سامانه مسدود گردیده است.',
                isPendingInitialSync: false,
              });
            } else if (isDeletedOnServer) {
              localStorage.removeItem('study_advisor_profile');
              setProfile({
                id: `st_deleted_${urlStudentParam}`,
                name: urlStudentParam,
                grade: 'اکانت حذف شده',
                fieldOfStudy: '-',
                targetGoal: 'لغو دسترسی توسط مشاور',
                dailyTargetHours: 0,
                wakeTime: '00:00',
                sleepTime: '00:00',
                strongSubjects: [],
                weakSubjects: [],
                schoolOrWorkHours: '',
                accessStatus: 'suspended',
                lockoutReason: `حساب کاربری دانش‌آموز "${urlStudentParam}" توسط مشاور به طور کامل حذف گردیده است. امکان دسترسی وجود ندارد.`,
                isPendingInitialSync: false,
              });
            } else {
              // Name in URL parameter is a new student who received a shared link
              setProfile({
                id: `st_${Date.now()}`,
                name: urlStudentParam,
                grade: 'پایه دوازدهم (کنکوری)',
                fieldOfStudy: 'علوم تجربی',
                targetGoal: 'موفقیت در کنکور سراسری',
                dailyTargetHours: 8,
                wakeTime: '06:30',
                sleepTime: '23:30',
                strongSubjects: [],
                weakSubjects: [],
                schoolOrWorkHours: '',
                accessStatus: 'active',
                isPendingInitialSync: false,
              });
            }
          } else if (isDeletedOnServer) {
            localStorage.removeItem('study_advisor_profile');
            setProfile((prev) => ({
              ...prev,
              accessStatus: 'suspended',
              lockoutReason: `حساب کاربری دانش‌آموز "${prev.name}" توسط مشاور به طور کامل حذف گردیده است. امکان دسترسی به این پنل وجود ندارد.`,
              isPendingInitialSync: false,
            }));
          }

          // 3. Update local students list if server has data (strictly filtering out deleted students)
          const mergedDeletedSet = new Set([...currentDeleted, ...serverDeleted]);
          const isDeletedKey = (s: { name?: string; id?: string }) =>
            Array.from(mergedDeletedSet).some(
              (d) =>
                d.toLowerCase() === (s.name || '').toLowerCase() ||
                (s.id && d.toLowerCase() === s.id.toLowerCase())
            );

          const nonDeletedServer = serverStudents.filter((s) => !isDeletedKey(s));

          setStudents((prevList) => {
            const nonDeletedPrev = prevList.filter((s) => !isDeletedKey(s));

            const updatedList = nonDeletedPrev.map((localS) => {
              const serverMatch = findMatchingStudentProfile(nonDeletedServer, localS.id || localS.name);
              if (serverMatch) {
                const safePassword =
                  serverMatch.password && serverMatch.password !== '••••••••'
                    ? serverMatch.password
                    : localS.password;
                return { ...localS, ...serverMatch, password: safePassword };
              }
              return localS;
            });

            nonDeletedServer.forEach((ss) => {
              const exists = findMatchingStudentProfile(updatedList, ss.id || ss.name);
              if (!exists) updatedList.push(ss);
            });

            localStorage.setItem('study_advisor_students', JSON.stringify(updatedList));
            return updatedList;
          });
        }
      } catch (e) {
        // Silently ignore network offline
      }
    };

    fetchAndEnforceServerAccess();

    const interval = setInterval(fetchAndEnforceServerAccess, 5000);
    const onFocus = () => fetchAndEnforceServerAccess();
    window.addEventListener('focus', onFocus);

    return () => {
      isMounted = false;
      clearInterval(interval);
      window.removeEventListener('focus', onFocus);
    };
  }, [profile.name, profile.id, profile.accessStatus, profile.password]);

  useEffect(() => {
    const key = profile.id || profile.name;
    localStorage.setItem(`study_advisor_schedule_${key}`, JSON.stringify(schedule));
    localStorage.setItem('study_advisor_schedule', JSON.stringify(schedule));
  }, [schedule, profile]);

  useEffect(() => {
    const key = profile.id || profile.name;
    localStorage.setItem(`study_advisor_exam_budget_${key}`, JSON.stringify(examBudget));
    localStorage.setItem('study_advisor_exam_budget', JSON.stringify(examBudget));
  }, [examBudget, profile]);

  useEffect(() => {
    const key = profile.id || profile.name;
    localStorage.setItem(`study_advisor_reports_${key}`, JSON.stringify(reports));
    localStorage.setItem('study_advisor_reports', JSON.stringify(reports));
  }, [reports, profile]);

  useEffect(() => {
    const key = profile.id || profile.name;
    localStorage.setItem(`study_advisor_spaced_cards_${key}`, JSON.stringify(spacedCards));
    localStorage.setItem('study_advisor_spaced_cards', JSON.stringify(spacedCards));
  }, [spacedCards, profile]);

  useEffect(() => {
    const key = profile.id || profile.name;
    localStorage.setItem(`study_advisor_feynman_${key}`, JSON.stringify(feynmanSessions));
    localStorage.setItem('study_advisor_feynman', JSON.stringify(feynmanSessions));
  }, [feynmanSessions, profile]);

  useEffect(() => {
    const key = profile.id || profile.name;
    localStorage.setItem(`study_advisor_exam_errors_${key}`, JSON.stringify(errors));
    localStorage.setItem('study_advisor_exam_errors', JSON.stringify(errors));
  }, [errors, profile]);

  useEffect(() => {
    const key = profile.id || profile.name;
    localStorage.setItem(`study_advisor_focus_sessions_${key}`, JSON.stringify(focusSessions));
    localStorage.setItem('study_advisor_focus_sessions', JSON.stringify(focusSessions));
  }, [focusSessions, profile]);

  useEffect(() => {
    const key = profile.id || profile.name;
    localStorage.setItem(`study_advisor_topic_mastery_${key}`, JSON.stringify(masteryRecords));
    localStorage.setItem('study_advisor_topic_mastery', JSON.stringify(masteryRecords));
  }, [masteryRecords, profile]);

  // Master Admin & Multi-Student Persistence
  useEffect(() => {
    localStorage.setItem('study_advisor_students', JSON.stringify(students));
  }, [students]);

  useEffect(() => {
    localStorage.setItem('study_advisor_admin_passcode', adminPasscode);
  }, [adminPasscode]);

  useEffect(() => {
    localStorage.setItem('study_advisor_counselor_announcement', counselorAnnouncement);
  }, [counselorAnnouncement]);

  useEffect(() => {
    localStorage.setItem('study_advisor_counselor_directive', counselorSystemDirective);
  }, [counselorSystemDirective]);

  const handleSelectStudent = (targetInput: string | StudentProfile, isFromAdmin: boolean = false) => {
    const target = typeof targetInput === 'string'
      ? students.find((s) => s.name === targetInput || s.id === targetInput)
      : targetInput;

    if (!target) return;

    setProfile(target);
    if (isFromAdmin || isAdminUnlocked) {
      handleAuthenticateStudent(target.name);
    }

    const key = target.id || target.name;

    setSchedule(loadStudentSlice('study_advisor_schedule', key, SAMPLE_INITIAL_SCHEDULE));
    setExamBudget(loadStudentSlice('study_advisor_exam_budget', key, DEFAULT_EXAM_BUDGET));
    setReports(loadStudentSlice('study_advisor_reports', key, INITIAL_SAMPLE_LOGS));
    setSpacedCards(loadStudentSlice('study_advisor_spaced_cards', key, SAMPLE_SPACED_CARDS));
    setFeynmanSessions(loadStudentSlice('study_advisor_feynman', key, SAMPLE_FEYNMAN_SESSIONS));
    setErrors(loadStudentSlice('study_advisor_exam_errors', key, SAMPLE_EXAM_ERRORS));
    setFocusSessions(loadStudentSlice('study_advisor_focus_sessions', key, SAMPLE_FOCUS_SESSIONS));
    setMasteryRecords(loadStudentSlice('study_advisor_topic_mastery', key, INITIAL_TOPIC_MASTERY));
    setFinalExamItems(loadStudentSlice('study_advisor_final_exam', key, INITIAL_FINAL_EXAM_ITEMS));
  };

  const handleAddStudent = (newStudent: StudentProfile) => {
    const studentWithId: StudentProfile = {
      ...newStudent,
      id: newStudent.id || `st_${Date.now()}`
    };
    try {
      const currentDeleted = getDeletedStudentsList();
      const updatedDeleted = currentDeleted.filter(
        (d) => d.toLowerCase() !== studentWithId.name.toLowerCase() && d.toLowerCase() !== (studentWithId.id && studentWithId.id.toLowerCase())
      );
      localStorage.setItem('study_advisor_deleted_students', JSON.stringify(updatedDeleted));
    } catch (e) {
      console.error(e);
    }
    const nextStudents = [...students, studentWithId];
    setStudents(nextStudents);
    localStorage.setItem('study_advisor_students', JSON.stringify(nextStudents));
    syncStudentsToServer(nextStudents);
    handleAuthenticateStudent(studentWithId.name);
    handleSelectStudent(studentWithId, true);
  };

  const handleDeleteStudent = (studentNameOrId: string) => {
    const targetStudent = students.find((s) => s.name === studentNameOrId || s.id === studentNameOrId);
    const nameToDelete = targetStudent ? targetStudent.name : studentNameOrId;
    const idToDelete = targetStudent ? targetStudent.id : studentNameOrId;

    let updatedDeletedList: string[] = [];
    // 1. Blacklist in deleted list so links (?student=name) get hard-locked immediately
    try {
      const currentDeleted = getDeletedStudentsList();
      updatedDeletedList = Array.from(new Set([...currentDeleted, nameToDelete, idToDelete].filter(Boolean)));
      localStorage.setItem('study_advisor_deleted_students', JSON.stringify(updatedDeletedList));
    } catch (e) {
      console.error(e);
    }

    const updated = students.filter(
      (s) =>
        s.name.toLowerCase() !== nameToDelete.toLowerCase() &&
        (s.id ? s.id.toLowerCase() !== idToDelete.toLowerCase() : true)
    );
    setStudents(updated);
    localStorage.setItem('study_advisor_students', JSON.stringify(updated));

    // Call server dedicated delete endpoint immediately
    try {
      const token =
        sessionStorage.getItem('study_advisor_counselor_token') ||
        localStorage.getItem('study_advisor_counselor_token');
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      fetch('/api/students/delete', {
        method: 'POST',
        headers,
        body: JSON.stringify({ studentKey: idToDelete || nameToDelete }),
      }).catch((e) => console.error('Delete request error:', e));
    } catch (e) {
      console.error('Error initiating delete request:', e);
    }

    syncStudentsToServer(updated, updatedDeletedList);

    if (profile.name === nameToDelete || profile.id === idToDelete) {
      localStorage.removeItem('study_advisor_profile');
    }

    // 2. Clean up localstorage keys for this student
    const keysToRemove = [
      `study_advisor_schedule_${nameToDelete}`,
      `study_advisor_exam_budget_${nameToDelete}`,
      `study_advisor_reports_${nameToDelete}`,
      `study_advisor_spaced_cards_${nameToDelete}`,
      `study_advisor_feynman_${nameToDelete}`,
      `study_advisor_exam_errors_${nameToDelete}`,
      `study_advisor_focus_sessions_${nameToDelete}`,
      `study_advisor_topic_mastery_${nameToDelete}`,
      `study_advisor_final_exam_${nameToDelete}`,
      `study_advisor_schedule_${idToDelete}`,
      `study_advisor_exam_budget_${idToDelete}`,
      `study_advisor_reports_${idToDelete}`,
      `study_advisor_spaced_cards_${idToDelete}`,
      `study_advisor_feynman_${idToDelete}`,
      `study_advisor_exam_errors_${idToDelete}`,
      `study_advisor_focus_sessions_${idToDelete}`,
      `study_advisor_topic_mastery_${idToDelete}`,
      `study_advisor_final_exam_${idToDelete}`
    ];
    keysToRemove.forEach((k) => {
      try {
        localStorage.removeItem(k);
      } catch (e) {
        console.error(e);
      }
    });

    if (updated.length === 0) {
      const defaultStudent: StudentProfile = {
        ...DEFAULT_STUDENT_PROFILE,
        id: `st_${Date.now()}`
      };
      setStudents([defaultStudent]);
      localStorage.setItem('study_advisor_students', JSON.stringify([defaultStudent]));
      handleSelectStudent(defaultStudent);
    } else {
      if (profile.name === nameToDelete || profile.id === idToDelete) {
        handleSelectStudent(updated[0]);
      }
    }
  };

  const handleUpdateStudentProfile = (updatedStudent: StudentProfile) => {
    setStudents((prev) => {
      const next = prev.map((s) => (s.name === updatedStudent.name || (s.id && s.id === updatedStudent.id) ? updatedStudent : s));
      localStorage.setItem('study_advisor_students', JSON.stringify(next));
      syncStudentsToServer(next);
      return next;
    });
    if (profile.name === updatedStudent.name || (profile.id && profile.id === updatedStudent.id)) {
      setProfile(updatedStudent);
      localStorage.setItem('study_advisor_profile', JSON.stringify(updatedStudent));
    }
  };

  const handleAddReport = (newReport: NightlyReport) => {
    setReports((prev) => [newReport, ...prev]);
  };

  const handleSaveProfile = (updatedProfile: StudentProfile) => {
    setProfile(updatedProfile);
    localStorage.setItem('study_advisor_profile', JSON.stringify(updatedProfile));
    setStudents((prev) => {
      const next = prev.map((s) => (s.name === updatedProfile.name || (s.id && s.id === updatedProfile.id) ? updatedProfile : s));
      localStorage.setItem('study_advisor_students', JSON.stringify(next));
      syncStudentsToServer(next);
      return next;
    });
  };

  const handleUpdateSchedule = (newSchedule: WeeklySchedule) => {
    setSchedule(newSchedule);
  };

  const handleUpdateSpacedCards = (cards: SpacedRepetitionCard[]) => {
    setSpacedCards(cards);
  };

  const handleAddFeynmanSession = (session: FeynmanSession) => {
    setFeynmanSessions((prev) => [session, ...prev]);
  };

  const handleRestoreBackup = (backup: AppBackupData) => {
    if (backup.profile) setProfile(backup.profile);
    if (backup.schedule) setSchedule(backup.schedule);
    if (backup.reports) setReports(backup.reports);
    if (backup.spacedCards) setSpacedCards(backup.spacedCards);
    if (backup.feynmanSessions) setFeynmanSessions(backup.feynmanSessions);
    if (backup.examBudget) setExamBudget(backup.examBudget);
  };

  const handleApplyRemedialBlocks = (remedialSuggestions: any[]) => {
    if (!remedialSuggestions || remedialSuggestions.length === 0) return;
    const updatedDays = schedule.days.map((day) => {
      const match = remedialSuggestions.find((s) => 
        s.day && (day.dayName.includes(s.day) || s.day.includes(day.dayName))
      );
      if (match) {
        const newBlock = {
          id: `remedial-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          timeSlot: '۲۱:۰۰ - ۲۲:۱۵',
          subject: match.subject,
          topic: `[جبرانی اشتباهات آزمون] ${match.topic}`,
          durationMinutes: match.durationMinutes || 75,
          type: 'review' as const,
          isDone: false
        };
        return {
          ...day,
          blocks: [...day.blocks, newBlock]
        };
      }
      return day;
    });
    setSchedule({ ...schedule, days: updatedDays });
  };

  const handleInjectDescriptiveBlock = (subjectName: string, topicName: string) => {
    const updatedDays = schedule.days.map((day) => {
      if (day.dayName === 'چهارشنبه') {
        const newBlock = {
          id: `descriptive-${Date.now()}`,
          timeSlot: '۲۰:۰۰ - ۲۱:۱۵',
          subject: `${subjectName} (تشریحی نهایی)`,
          topic: topicName,
          durationMinutes: 75,
          type: 'concept' as const,
          isDone: false
        };
        return {
          ...day,
          blocks: [...day.blocks, newBlock]
        };
      }
      return day;
    });
    setSchedule({ ...schedule, days: updatedDays });
  };

  const dataStats = {
    reportsCount: reports.length,
    scheduleBlocksCount: schedule.days.reduce((acc, d) => acc + d.blocks.length, 0),
    errorsCount: errors.length,
    focusSessionsCount: focusSessions.length,
    cardsCount: spacedCards.length,
    feynmanCount: feynmanSessions.length,
  };

  const handleClearAllDataToZero = () => {
    setReports([]);
    const zeroSchedule: WeeklySchedule = {
      ...schedule,
      totalTargetHours: 0,
      days: schedule.days.map((d) => ({
        ...d,
        targetHours: 0,
        completedHours: 0,
        testsTarget: 0,
        testsSolved: 0,
        blocks: [],
      })),
    };
    setSchedule(zeroSchedule);
    setErrors([]);
    setFocusSessions([]);
    setSpacedCards([]);
    setFeynmanSessions([]);
    setExamBudget({
      ...DEFAULT_EXAM_BUDGET,
      selectedTopics: [],
      customTopics: [],
      examDate: '',
      targetDailyHours: profile.dailyTargetHours || 8,
    });
    setMasteryRecords((prev) =>
      prev.map((r) => ({
        ...r,
        status: 'unrated',
        testsSolvedCount: 0,
        accuracyPercentage: 0,
        notes: '',
      }))
    );
    setFinalExamItems((prev) =>
      prev.map((i) => ({
        ...i,
        textbookExercisesDone: false,
        theoremsProofsMastered: false,
        sampleExamsSolvedCount: 0,
      }))
    );
  };

  const handleRestoreDefaultSampleData = () => {
    setReports(INITIAL_SAMPLE_LOGS);
    setSchedule(SAMPLE_INITIAL_SCHEDULE);
    setErrors(SAMPLE_EXAM_ERRORS);
    setFocusSessions(SAMPLE_FOCUS_SESSIONS);
    setSpacedCards(SAMPLE_SPACED_CARDS);
    setFeynmanSessions(SAMPLE_FEYNMAN_SESSIONS);
    setExamBudget(DEFAULT_EXAM_BUDGET);
    setMasteryRecords(INITIAL_TOPIC_MASTERY);
    setFinalExamItems(INITIAL_FINAL_EXAM_ITEMS);
    setProfile(DEFAULT_STUDENT_PROFILE);
  };

  const handleSelectTopicForBudget = (topicChapter: string) => {
    if (!examBudget.selectedTopics.includes(topicChapter)) {
      setExamBudget({
        ...examBudget,
        selectedTopics: [...examBudget.selectedTopics, topicChapter]
      });
    }
  };

  const handleOpenCounselorGateway = () => {
    if (isAdminUnlocked) {
      setIsCounselorPortalOpen(true);
    } else {
      setIsCounselorLoginModalOpen(true);
    }
  };

  const handleCounselorLoginSuccess = () => {
    setIsAdminUnlocked(true);
    if (typeof window !== 'undefined') {
      localStorage.setItem('study_advisor_counselor_logged_in', 'true');
    }
    setIsCounselorLoginModalOpen(false);
    setIsCounselorPortalOpen(true);
  };

  const handleCounselorLogout = async () => {
    setIsAdminUnlocked(false);
    if (typeof window !== 'undefined') {
      const token = sessionStorage.getItem('study_advisor_counselor_token') || localStorage.getItem('study_advisor_counselor_token');
      if (token) {
        try {
          await fetch('/api/counselor/logout', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
          });
        } catch (e) {
          // Ignore
        }
      }
      localStorage.removeItem('study_advisor_counselor_logged_in');
      sessionStorage.removeItem('study_advisor_counselor_token');
      localStorage.removeItem('study_advisor_counselor_token');
    }
    setIsCounselorPortalOpen(false);
  };

  // If Counselor Portal is Open, render the Dedicated Counselor Command Center
  if (isCounselorPortalOpen) {
    return (
      <CounselorDedicatedPortal
        students={students}
        activeStudent={profile}
        serverUsageStats={serverUsageStats}
        onSelectStudentWorkspace={(targetStudent) => {
          handleSelectStudent(targetStudent, true);
          setIsCounselorPortalOpen(false);
        }}
        onAddStudent={handleAddStudent}
        onDeleteStudent={handleDeleteStudent}
        onUpdateStudentProfile={handleUpdateStudentProfile}
        counselorAnnouncement={counselorAnnouncement}
        onUpdateCounselorAnnouncement={(newAnnounce) => {
          setCounselorAnnouncement(newAnnounce);
          localStorage.setItem('study_advisor_counselor_announcement', newAnnounce);
        }}
        counselorSystemDirective={counselorSystemDirective}
        onUpdateCounselorSystemDirective={(newDirective) => {
          setCounselorSystemDirective(newDirective);
          localStorage.setItem('study_advisor_counselor_directive', newDirective);
        }}
        adminPasscode={adminPasscode}
        onUpdateAdminPasscode={(newPass) => {
          setAdminPasscode(newPass);
          localStorage.setItem('study_advisor_admin_passcode', newPass);
        }}
        onExitCounselorPortal={() => setIsCounselorPortalOpen(false)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 flex flex-col font-sans">
      {/* Counselor Active Monitoring Ribbon (Shown when counselor is inspecting student workspace) */}
      {isAdminUnlocked && (
        <div className="bg-gradient-to-r from-emerald-950 via-stone-900 to-emerald-950 text-white px-3 sm:px-6 py-2.5 border-b border-emerald-800/80 shadow-md flex items-center justify-between text-xs sticky top-0 z-50">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400 animate-pulse shrink-0" />
            <span className="font-extrabold text-emerald-300">نظارت مشاور:</span>
            <span className="text-stone-300 truncate max-w-xs sm:max-w-md">
              در حال مشاهده و تنظیم برنامه دانش‌آموز <strong className="text-white">«{profile.name}»</strong> ({profile.grade} • {profile.fieldOfStudy})
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setIsCounselorPortalOpen(true)}
              className="px-3 py-1 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition-all cursor-pointer shadow-xs text-xs"
            >
              بازگشت به پنل رصد مشاور
            </button>
            <button
              onClick={handleCounselorLogout}
              className="px-2.5 py-1 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-400 hover:text-rose-300 transition-colors cursor-pointer text-xs"
              title="خروج از حالت مشاور"
            >
              خروج مشاور
            </button>
          </div>
        </div>
      )}

      {/* Navigation Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        profile={profile}
        onOpenProfile={() => setIsProfileModalOpen(true)}
        onOpenShare={() => setIsShareModalOpen(true)}
        onOpenResetData={() => setIsResetModalOpen(true)}
        onOpenSearch={() => setIsSearchModalOpen(true)}
        onOpenMasterAdmin={handleOpenCounselorGateway}
        isAdminUnlocked={isAdminUnlocked}
      />

      {/* Personal Student Profile Dedicated Banner */}
      <div className="bg-stone-900 border-b border-emerald-900/60 text-white shadow-xs">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 py-2 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-black border border-emerald-500/30 text-[10px]">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
              🎯 پنل اختصاصی
            </span>
            <span className="font-black text-white text-sm sm:text-base">{profile.name}</span>
            <span className="text-stone-300 text-[11px] font-medium">({profile.grade} • {profile.fieldOfStudy})</span>
          </div>

          <div className="flex items-center gap-3 text-[11px] text-stone-300 font-medium">
            <span>🎯 هدف: <strong className="text-emerald-300 font-bold">{profile.targetGoal || 'قبولی کنکور'}</strong></span>
            <span className="hidden sm:inline">⏰ بیداری: <strong className="text-stone-200">{profile.wakeTime}</strong></span>
            <span className="hidden md:inline">⏰ خواب: <strong className="text-stone-200">{profile.sleepTime}</strong></span>
          </div>
        </div>
      </div>

      {/* Counselor Global Announcement Banner */}
      {counselorAnnouncement && (
        <div className="bg-gradient-to-r from-amber-500 via-amber-600 to-amber-500 text-stone-950 px-4 py-2.5 shadow-xs border-b border-amber-600/30">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-3 text-xs font-bold">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-950 animate-ping shrink-0" />
              <Megaphone className="w-4 h-4 text-stone-950 shrink-0" />
              <span className="leading-tight">اطلاعیه مشاور: {counselorAnnouncement}</span>
            </div>
            <button
              onClick={() => setCounselorAnnouncement('')}
              className="text-stone-900 hover:text-black p-0.5 rounded transition-colors"
              title="بستن اطلاعیه"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'nightly' && (
          <NightlyCheckinView
            profile={profile}
            reports={reports}
            onAddReport={handleAddReport}
          />
        )}

        {activeTab === 'schedule' && (
          <WeeklyScheduleView
            schedule={schedule}
            profile={profile}
            onUpdateSchedule={handleUpdateSchedule}
            examBudget={examBudget}
            onSwitchToExamTab={() => setActiveTab('exam')}
          />
        )}

        {activeTab === 'exam' && (
          <MathExamPlannerView
            profile={profile}
            examBudget={examBudget}
            onUpdateExamBudget={setExamBudget}
            onApplyNewSchedule={handleUpdateSchedule}
            onSwitchToScheduleTab={() => setActiveTab('schedule')}
            onSwitchToProToolsTab={(subTab) => {
              if (subTab) setProToolsSubTab(subTab as ProToolTab);
              setActiveTab('pro_tools');
            }}
          />
        )}

        {activeTab === 'pro_tools' && (
          <KonkurProToolsHub
            profile={profile}
            examBudget={examBudget}
            schedule={schedule}
            errors={errors}
            onUpdateErrors={setErrors}
            focusSessions={focusSessions}
            onSaveFocusSession={(newSess) => setFocusSessions((prev) => [newSess, ...prev])}
            masteryRecords={masteryRecords}
            onUpdateMasteryRecord={(rec) => {
              setMasteryRecords((prev) => {
                const idx = prev.findIndex((r) => r.topicId === rec.topicId);
                if (idx >= 0) {
                  const copy = [...prev];
                  copy[idx] = rec;
                  return copy;
                }
                return [...prev, rec];
              });
            }}
            trapQuestions={trapQuestions}
            finalExamItems={finalExamItems}
            onUpdateFinalExamItems={setFinalExamItems}
            onApplyRemedialBlocks={handleApplyRemedialBlocks}
            onInjectDescriptiveBlock={handleInjectDescriptiveBlock}
            defaultSubTab={proToolsSubTab}
          />
        )}

        {activeTab === 'psychology' && (
          <CognitivePsychologyView
            profile={profile}
            schedule={schedule}
            reports={reports}
            spacedCards={spacedCards}
            feynmanSessions={feynmanSessions}
            onUpdateSpacedCards={handleUpdateSpacedCards}
            onAddFeynmanSession={handleAddFeynmanSession}
            onRestoreBackup={handleRestoreBackup}
          />
        )}

        {activeTab === 'chat' && (
          <div className="max-w-4xl mx-auto">
            <QuickChatView profile={profile} />
          </div>
        )}

        {activeTab === 'hermes' && (
          <HermesTelegramGuide profile={profile} />
        )}
      </main>

      {/* Student Profile Settings Modal */}
      <ProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        profile={profile}
        onSave={handleSaveProfile}
        onOpenResetData={() => setIsResetModalOpen(true)}
        onDeleteAccount={handleDeleteStudent}
      />

      {/* Share Modal */}
      <ShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        currentStudentName={profile.name}
      />

      {/* Data Reset Modal */}
      <DataResetModal
        isOpen={isResetModalOpen}
        onClose={() => setIsResetModalOpen(false)}
        stats={dataStats}
        onClearToZero={handleClearAllDataToZero}
        onRestoreDefaults={handleRestoreDefaultSampleData}
      />

      {/* Konkur Advanced Resource & Curriculum Search Modal */}
      <KonkurAdvancedSearchModal
        isOpen={isSearchModalOpen}
        onClose={() => setIsSearchModalOpen(false)}
        examBudget={examBudget}
        onSelectTopicForBudget={handleSelectTopicForBudget}
      />

      {/* Student Password Authentication Overlay (shown if student has not entered their password) */}
      {!isCurrentStudentAuthenticated && (
        <StudentLoginOverlay
          profile={profile}
          adminPasscode={adminPasscode}
          onAuthenticate={() => handleAuthenticateStudent(profile.name)}
          onOpenMasterAdmin={handleOpenCounselorGateway}
          onSwitchProfile={(newProf) => {
            setProfile(newProf);
            localStorage.setItem('study_advisor_profile', JSON.stringify(newProf));
            handleAuthenticateStudent(newProf.name);
          }}
        />
      )}

      {/* Account Lockout Screen (shown if active student is suspended or expired) */}
      <AccountLockoutOverlay
        profile={profile}
        adminPasscode={adminPasscode}
        onAdminUnlock={() => {
          setIsAdminUnlocked(true);
          handleCounselorLoginSuccess();
        }}
        onOpenMasterAdmin={handleOpenCounselorGateway}
      />

      {/* Dedicated Counselor Login Modal */}
      <CounselorLoginModal
        isOpen={isCounselorLoginModalOpen}
        onClose={() => setIsCounselorLoginModalOpen(false)}
        adminPasscode={adminPasscode}
        onSuccessfulLogin={handleCounselorLoginSuccess}
      />

      {/* Master Admin & Multi-Account Management Modal */}
      <MasterAdminModal
        isOpen={isMasterAdminModalOpen}
        onClose={() => setIsMasterAdminModalOpen(false)}
        students={students}
        activeStudentId={profile.name}
        onSelectStudent={handleSelectStudent}
        onAddStudent={handleAddStudent}
        onDeleteStudent={handleDeleteStudent}
        onUpdateStudentProfile={handleUpdateStudentProfile}
        adminPasscode={adminPasscode}
        onUpdatePasscode={setAdminPasscode}
        isAdminUnlocked={isAdminUnlocked}
        onSetIsAdminUnlocked={setIsAdminUnlocked}
        counselorAnnouncement={counselorAnnouncement}
        onUpdateCounselorAnnouncement={setCounselorAnnouncement}
        counselorSystemDirective={counselorSystemDirective}
        onUpdateCounselorSystemDirective={setCounselorSystemDirective}
      />

      {/* Minimal Footer */}
      <footer className="border-t border-stone-200 bg-white py-6 text-center text-xs text-stone-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>مشاور درسی هوشمند • طراحی شده برای بازدهی حداکثری و پیگیری مستمر</span>
          <span className="text-stone-400">اتصال آماده به Hermes Agent و Telegram با مدل Gemini</span>
        </div>
      </footer>
    </div>
  );
}
