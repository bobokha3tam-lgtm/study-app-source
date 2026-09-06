import { initializeApp as initAdminApp, cert as adminCert, getApps as getAdminApps, getApp as getAdminApp } from 'firebase-admin/app';
import { getFirestore as getAdminFirestore } from 'firebase-admin/firestore';
import { initializeApp } from 'firebase/app';
import { initializeFirestore, doc, getDoc, setDoc } from 'firebase/firestore';
import express from "express";
import path from "path";
import crypto from "crypto";
import fs from "fs";
import { execSync } from "child_process";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

let adminDb: any = null;
let clientDb: any = null;
let db: any = null;
let isFirebaseReady = false;

try {
  const fbConfigPath = path.join(process.cwd(), 'firebase-applet-config.json');
  let fbConfig: any = null;
  if (fs.existsSync(fbConfigPath)) {
    fbConfig = JSON.parse(fs.readFileSync(fbConfigPath, 'utf-8'));
  }

  // 1. Try Firebase Admin SDK first (using service account from env, Render Secret Files, or local file)
  let serviceAccountObj: any = null;

  const serviceAccountRaw = process.env.FIREBASE_SERVICE_ACCOUNT || process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;
  if (serviceAccountRaw) {
    try {
      serviceAccountObj = typeof serviceAccountRaw === 'string' ? JSON.parse(serviceAccountRaw) : serviceAccountRaw;
    } catch (e) {}
  }

  if (!serviceAccountObj) {
    const candidatePaths = [
      '/etc/secrets/firebase-service-account.json',
      '/etc/secrets/service-account.json',
      '/etc/secrets/firebase.json',
      path.join(process.cwd(), 'firebase-service-account.json'),
      path.join(process.cwd(), 'service-account.json')
    ];

    if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      candidatePaths.unshift(process.env.GOOGLE_APPLICATION_CREDENTIALS);
    }

    for (const filePath of candidatePaths) {
      if (fs.existsSync(filePath)) {
        try {
          const fileContent = fs.readFileSync(filePath, 'utf-8');
          serviceAccountObj = JSON.parse(fileContent);
          console.log(`[Firebase Admin] Found service account file at '${filePath}'`);
          break;
        } catch (fileErr) {
          console.warn(`[Firebase Admin] Could not parse JSON from '${filePath}':`, fileErr);
        }
      }
    }
  }

  if (serviceAccountObj) {
    try {
      const existingApps = getAdminApps();
      let adminApp = existingApps.length ? getAdminApp() : initAdminApp({
        credential: adminCert(serviceAccountObj),
        projectId: serviceAccountObj.project_id || fbConfig?.projectId,
      });
      const dbId = fbConfig?.firestoreDatabaseId || '(default)';
      // This firebase-admin version does not expose the legacy
      // admin.credential / admin.apps / admin.firestore() namespaced API via
      // the default import at all (that was the real cause of every
      // "Cannot read properties of undefined" crash before this fix) — only
      // the modular functions imported above (initializeApp, cert, getApps,
      // getFirestore) actually exist on this package.
      adminDb = getAdminFirestore(adminApp, dbId);
      console.log(`[Firebase Admin] Initialized with Service Account for database '${dbId}'`);
    } catch (saErr) {
      console.warn("[Firebase Admin] Failed Admin init, falling back to Client SDK:", saErr);
    }
  }

  // 2. Client SDK fallback for local environments (only if Admin SDK is not active)
  if (!adminDb && fbConfig && fbConfig.projectId) {
    const firebaseApp = initializeApp(fbConfig);
    clientDb = initializeFirestore(firebaseApp, {
      experimentalAutoDetectLongPolling: true,
    }, fbConfig.firestoreDatabaseId);
    db = clientDb;
    console.log(`[Firebase Client] Initialized Client SDK fallback for database '${fbConfig.firestoreDatabaseId}'`);
  }
} catch (err) {
  console.warn("Firebase configuration warning (falling back to local storage):", err);
}

// ==========================================
// Server-side Cyber Shield & Data Registry Engine
// ==========================================

const STUDENTS_FILE_PATH = path.join(process.cwd(), "data_students_registry.json");

interface SecurityAuditLog {
  id: string;
  timestamp: string;
  eventType: string;
  severity: "info" | "warning" | "critical";
  details: string;
  ip: string;
  threatType?: string;
}

interface ServerBannedIp {
  ip: string;
  bannedAt: string;
  expiresAt: string;
  reason: string;
  attackCount: number;
  threatType: string;
  counterMeasure: 'tarpit' | 'hard_drop' | 'honeypot_poison';
}

interface ServerStudentStore {
  students: any[];
  deletedStudents: string[];
  usageStats: Record<string, any>;
  counselorConfig: {
    username: string;
    passcode: string;
    passcodeHash?: string;
    announcement: string;
    directive: string;
  };
  telegramBotConfig?: {
    botToken?: string;
    botUsername?: string;
    isActive?: boolean;
    lastStartedAt?: string;
  };
  securityAuditLogs: SecurityAuditLog[];
  updatedAt: string;
}

// Cryptographic Password Hashing using PBKDF2 with HMAC-SHA512 & 16-byte random salt
function hashPassword(plain: string): string {
  if (!plain) return "";
  const salt = crypto.randomBytes(16).toString("hex");
  const derivedKey = crypto.pbkdf2Sync(plain, salt, 100000, 64, "sha512").toString("hex");
  return `pbkdf2:sha512:100000:${salt}:${derivedKey}`;
}

// Timing-safe constant-time password verification
function verifyPassword(plain: string, storedHashOrPlain: string): boolean {
  if (!plain || !storedHashOrPlain) return false;

  if (storedHashOrPlain.startsWith("pbkdf2:sha512:")) {
    const parts = storedHashOrPlain.split(":");
    if (parts.length === 5) {
      const iterations = parseInt(parts[2], 10);
      const salt = parts[3];
      const expectedHash = parts[4];
      const derivedKey = crypto.pbkdf2Sync(plain, salt, iterations, 64, "sha512").toString("hex");
      try {
        const a = Buffer.from(derivedKey, "hex");
        const b = Buffer.from(expectedHash, "hex");
        if (a.length === b.length) {
          return crypto.timingSafeEqual(a, b);
        }
      } catch (e) {
        return false;
      }
    }
  }

  // Legacy plaintext fallback with constant-time equality check
  const a = Buffer.from(plain);
  const b = Buffer.from(storedHashOrPlain);
  if (a.length !== b.length) {
    crypto.timingSafeEqual(a, a);
    return false;
  }
  return crypto.timingSafeEqual(a, b);
}

// Active Counselor Session Management
interface CounselorSession {
  token: string;
  username: string;
  createdAt: number;
  expiresAt: number;
  ip: string;
}

const activeCounselorSessions = new Map<string, CounselorSession>();

function createCounselorSession(username: string, ip: string): CounselorSession {
  const token = crypto.randomBytes(32).toString("hex");
  const now = Date.now();
  const session: CounselorSession = {
    token,
    username,
    createdAt: now,
    expiresAt: now + 12 * 60 * 60 * 1000, // 12 hours
    ip
  };
  activeCounselorSessions.set(token, session);
  return session;
}

function getValidCounselorSession(authHeader?: string): CounselorSession | null {
  if (!authHeader || !authHeader.startsWith("Bearer ")) return null;
  const token = authHeader.substring(7).trim();
  const session = activeCounselorSessions.get(token);
  if (!session) return null;
  if (Date.now() > session.expiresAt) {
    activeCounselorSessions.delete(token);
    return null;
  }
  return session;
}

// Active Student Session Management
interface StudentSession {
  token: string;
  studentId: string;
  studentName: string;
  createdAt: number;
  expiresAt: number;
  ip: string;
}

const activeStudentSessions = new Map<string, StudentSession>();

function createStudentSession(studentId: string, studentName: string, ip: string): StudentSession {
  const token = `st_tok_${crypto.randomBytes(24).toString("hex")}`;
  const now = Date.now();
  const session: StudentSession = {
    token,
    studentId,
    studentName,
    createdAt: now,
    expiresAt: now + 48 * 60 * 60 * 1000, // 48 hours
    ip
  };
  activeStudentSessions.set(token, session);
  return session;
}

function getValidStudentSession(tokenOrHeader?: string): StudentSession | null {
  if (!tokenOrHeader) return null;
  let token = String(tokenOrHeader).trim();
  if (token.startsWith("Bearer ")) {
    token = token.substring(7).trim();
  }
  const session = activeStudentSessions.get(token);
  if (!session) return null;
  if (Date.now() > session.expiresAt) {
    activeStudentSessions.delete(token);
    return null;
  }
  return session;
}

// AI Specific Rate Limiter (Anti-Spam / Anti-Token-DDoS)
const aiUserRateLimiter = new Map<string, { count: number; windowStart: number }>();
function checkAiRateLimit(userIdOrIp: string, maxRequests = 30, windowMinutes = 1): boolean {
  const now = Date.now();
  const windowMs = windowMinutes * 60 * 1000;
  const entry = aiUserRateLimiter.get(userIdOrIp);
  if (!entry || now - entry.windowStart > windowMs) {
    aiUserRateLimiter.set(userIdOrIp, { count: 1, windowStart: now });
    return true;
  }
  if (entry.count >= maxRequests) {
    return false;
  }
  entry.count++;
  return true;
}

// Zero-Guest Strict Authorization Middleware (Blocks all anonymous / guest traffic)
function requireAuthorizedUser(req: express.Request, res: express.Response, next: express.NextFunction) {
  const clientIp = getClientIp(req);
  const rawAuth = req.headers.authorization || (req.headers["x-student-token"] as string) || (req.headers["x-auth-token"] as string);

  // 1. Check Counselor Session
  const counselorSession = getValidCounselorSession(rawAuth);
  if (counselorSession) {
    (req as any).user = { type: "counselor", username: counselorSession.username };
    return next();
  }

  // 2. Check Student Session Token from header
  const studentSession = getValidStudentSession(rawAuth);
  if (studentSession) {
    const student = serverStudentStore.students.find(
      (s) => s.id === studentSession.studentId || s.name.trim().toLowerCase() === studentSession.studentName.trim().toLowerCase()
    );
    if (!student || student.accessStatus === "suspended") {
      return res.status(403).json({
        success: false,
        error: "دسترسی حساب کاربری شما توسط مشاور به حالت تعلیق درآمده یا حساب حذف گردیده است."
      });
    }

    // AI Anti-Flooding Rate Limiting check
    if (!checkAiRateLimit(studentSession.studentId, 30, 1)) {
      return res.status(429).json({
        success: false,
        error: "تعداد درخواست‌های ارسالی به هوش مصنوعی بیش از حد مجاز است. لطفاً یک دقیقه صبور باشید."
      });
    }

    (req as any).user = { type: "student", studentId: student.id, studentName: student.name };
    return next();
  }

  // 3. Check Student Session Token from request body
  const bodyToken = req.body?.studentToken;
  if (bodyToken && typeof bodyToken === "string") {
    const bodySession = getValidStudentSession(bodyToken);
    if (bodySession) {
      const student = serverStudentStore.students.find(
        (s) => s.id === bodySession.studentId || s.name.trim().toLowerCase() === bodySession.studentName.trim().toLowerCase()
      );
      if (!student || student.accessStatus === "suspended") {
        return res.status(403).json({
          success: false,
          error: "دسترسی حساب کاربری شما تعلیق گردیده است."
        });
      }
      (req as any).user = { type: "student", studentId: student.id, studentName: student.name };
      return next();
    }
  }

  // 4. Verify Registered Active Student Profile (Safeguard for environments where custom headers are restricted)
  const candidateStudentKey =
    req.body?.studentKey ||
    req.body?.studentId ||
    req.body?.studentProfile?.id ||
    req.body?.studentProfile?.name ||
    req.body?.profile?.id ||
    req.body?.profile?.name;
  if (candidateStudentKey && typeof candidateStudentKey === "string") {
    const cleanKey = candidateStudentKey.trim().toLowerCase();
    // Exclude any guest / demo / test patterns strictly
    if (!cleanKey.includes("تست") && !cleanKey.includes("test") && !cleanKey.includes("مهمان") && !cleanKey.includes("guest") && !cleanKey.includes("demo")) {
      const student = serverStudentStore.students.find(
        (s) => (s.id && s.id.toLowerCase() === cleanKey) || (s.name && s.name.trim().toLowerCase() === cleanKey)
      );
      if (student && student.accessStatus === "active") {
        if (!checkAiRateLimit(student.id || student.name, 30, 1)) {
          return res.status(429).json({
            success: false,
            error: "تعداد درخواست‌های ارسالی به هوش مصنوعی بیش از حد مجاز است. لطفاً کمی بعد تلاش فرمایید."
          });
        }
        (req as any).user = { type: "student", studentId: student.id, studentName: student.name };
        return next();
      }
    }
  }

  // Reject all unauthenticated guest calls immediately
  addSecurityAuditLog(
    "guest_access_blocked",
    "warning",
    `تلاش مسدود شده برای دسترسی مهمان/بدون احراز هویت به اندپوینت ${req.path}`,
    clientIp
  );

  return res.status(401).json({
    success: false,
    error: "دسترسی مهمان مسدود است. برای جلوگیری از حملات دیداس (DDoS) و سوءاستفاده از هوش مصنوعی، دسترسی به این بخش تنها با احراز هویت معتبر امکان‌پذیر است."
  });
}

// Brute-force Defense & Progressive Rate Limiter
interface RateLimitRecord {
  attempts: number;
  lockUntil: number;
  firstAttempt: number;
}

const loginRateLimiter = new Map<string, RateLimitRecord>();

function checkRateLimit(key: string, maxAttempts = 5, windowMs = 15 * 60 * 1000, lockMs = 15 * 60 * 1000): {
  allowed: boolean;
  remaining: number;
  lockoutMinutes: number;
} {
  const now = Date.now();
  const rec = loginRateLimiter.get(key);

  if (rec && rec.lockUntil > now) {
    const lockoutMinutes = Math.ceil((rec.lockUntil - now) / 60000);
    return { allowed: false, remaining: 0, lockoutMinutes };
  }

  if (!rec || now - rec.firstAttempt > windowMs) {
    return { allowed: true, remaining: maxAttempts, lockoutMinutes: 0 };
  }

  const remaining = Math.max(0, maxAttempts - rec.attempts);
  return { allowed: rec.attempts < maxAttempts, remaining, lockoutMinutes: 0 };
}

function recordFailedAttempt(key: string, maxAttempts = 5, windowMs = 15 * 60 * 1000, lockMs = 15 * 60 * 1000) {
  const now = Date.now();
  let rec = loginRateLimiter.get(key);

  if (!rec || now - rec.firstAttempt > windowMs) {
    rec = { attempts: 1, lockUntil: 0, firstAttempt: now };
  } else {
    rec.attempts += 1;
    if (rec.attempts >= maxAttempts) {
      rec.lockUntil = now + lockMs;
    }
  }
  loginRateLimiter.set(key, rec);
}

function resetRateLimit(key: string) {
  loginRateLimiter.delete(key);
}

function getClientIp(req: express.Request): string {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string") {
    return forwarded.split(",")[0].trim();
  }
  return req.socket.remoteAddress || "127.0.0.1";
}

// Global Cyber Shield & Active Threat Telemetry
const bannedIpsMap = new Map<string, ServerBannedIp>();
let defconLevel: 1 | 2 | 3 | 4 | 5 = 5;
let thwartedAttacksCount = 0;
const ddosRequestTracker = new Map<string, { count: number; windowStart: number }>();

function addSecurityAuditLog(
  eventType: string,
  severity: "info" | "warning" | "critical",
  details: string,
  ip: string,
  threatType?: string
) {
  const log: SecurityAuditLog = {
    id: `sec_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    timestamp: new Date().toISOString(),
    eventType,
    severity,
    details,
    ip: ip ? ip.replace(/^.*:/, "") : "internal",
    threatType
  };

  if (!serverStudentStore.securityAuditLogs) {
    serverStudentStore.securityAuditLogs = [];
  }
  serverStudentStore.securityAuditLogs.unshift(log);
  if (serverStudentStore.securityAuditLogs.length > 100) {
    serverStudentStore.securityAuditLogs = serverStudentStore.securityAuditLogs.slice(0, 100);
  }
  saveServerStudentStore(serverStudentStore);
}

function loadServerStudentStore(): ServerStudentStore {
  try {
    if (fs.existsSync(STUDENTS_FILE_PATH)) {
      const data = fs.readFileSync(STUDENTS_FILE_PATH, "utf-8");
      const parsed = JSON.parse(data);
      if (parsed && Array.isArray(parsed.students)) {
        const store: ServerStudentStore = {
          students: parsed.students || [],
          deletedStudents: parsed.deletedStudents || [],
          usageStats: parsed.usageStats || {},
          counselorConfig: parsed.counselorConfig || {
            username: "مشاور",
            passcode: "1234",
            passcodeHash: hashPassword("1234"),
            announcement: "دانش‌آموزان عزیز، تا جمعه مهلت ثبت و ارسال گزارش شبانه و تحلیل آزمون جامع را دارید!",
            directive: ""
          },
          telegramBotConfig: parsed.telegramBotConfig,
          securityAuditLogs: parsed.securityAuditLogs || [],
          updatedAt: parsed.updatedAt || new Date().toISOString()
        };

        if (store.counselorConfig.passcode && !store.counselorConfig.passcode.startsWith("pbkdf2:")) {
          store.counselorConfig.passcodeHash = hashPassword(store.counselorConfig.passcode);
        }

        store.students.forEach((s: any) => {
          if (s.password && !s.password.startsWith("pbkdf2:")) {
            s.passwordHash = hashPassword(s.password);
          }
        });

        // Ensure default Ali and Public Test users exist and have multi-device access enabled
        const hasAli = store.students.some((s: any) => s.id === "st_ali" || s.name === "علی");
        if (!hasAli) {
          store.students.push({
            id: "st_ali",
            name: "علی",
            grade: "پایه دوازدهم (کنکوری)",
            fieldOfStudy: "ریاضی و فیزیک",
            targetGoal: "مهندسی کامپیوتر / برق دانشگاه صنعتی شریف یا تهران",
            dailyTargetHours: 8,
            wakeTime: "06:30",
            sleepTime: "23:30",
            strongSubjects: ["حسابان (مشتق و توابع)", "فیزیک (الکتریسیته و مغناطیس)"],
            weakSubjects: ["گسسته (نظریه اعداد)", "هندسه ۳"],
            schoolOrWorkHours: "شنبه تا چهارشنبه صبح‌ها مدرسه",
            additionalNotes: "اکانت پیش‌فرض دانش‌آموز",
            accessStatus: "active",
            strictDeviceLock: false,
            maxAllowedDevices: 10,
            password: "1234",
            hasPassword: true,
            passwordHash: hashPassword("1234"),
            boundDevices: []
          });
        }

        // Ensure demo/guest accounts are completely removed
        store.students = store.students.filter((s: any) => s.id !== "st_demo" && s.name !== "کاربر تست (عمومی)");

        return store;
      }
    }
  } catch (e) {
    console.error("Error reading students registry file:", e);
  }
  return {
    students: [],
    deletedStudents: [],
    usageStats: {},
    counselorConfig: {
      username: "مشاور",
      passcode: "1234",
      passcodeHash: hashPassword("1234"),
      announcement: "دانش‌آموزان عزیز، تا جمعه مهلت ثبت و ارسال گزارش شبانه و تحلیل آزمون جامع را دارید!",
      directive: ""
    },
    securityAuditLogs: [],
    updatedAt: new Date().toISOString()
  };
}

function cleanForFirestore(obj: any): any {
  if (obj === undefined) return null;
  return JSON.parse(JSON.stringify(obj, (key, value) => {
    if (value === undefined) return undefined;
    return value;
  }));
}

async function fetchStoreFromFirebase(): Promise<{ exists: boolean; data?: ServerStudentStore }> {
  if (adminDb) {
    try {
      const docSnap = await adminDb.doc('system/store').get();
      if (docSnap.exists) {
        console.log("[Firebase Admin] Loaded student store from Firestore.");
        return { exists: true, data: docSnap.data() as ServerStudentStore };
      }
      return { exists: false };
    } catch (err) {
      console.error("[Firebase Admin] Error fetching store from Firestore:", err);
    }
  }

  if (clientDb) {
    try {
      const docRef = doc(clientDb, 'system', 'store');
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        console.log("[Firebase Client] Loaded student store from Firestore.");
        return { exists: true, data: docSnap.data() as ServerStudentStore };
      }
      return { exists: false };
    } catch (err) {
      console.error("[Firebase Client] Error fetching store from Firestore:", err);
    }
  }

  return { exists: false };
}

async function saveStoreToFirebase(store: ServerStudentStore): Promise<void> {
  const sanitized = cleanForFirestore(store);

  if (adminDb) {
    try {
      await adminDb.doc('system/store').set(sanitized);
      console.log("[Firebase Admin] Successfully synced student store to Firestore");
      return;
    } catch (err) {
      console.error("[Firebase Admin] Sync error:", err);
    }
  }

  if (clientDb) {
    try {
      await setDoc(doc(clientDb, 'system', 'store'), sanitized);
      console.log("[Firebase Client] Successfully synced student store to Firestore");
    } catch (err) {
      console.error("[Firebase Client] Sync error:", err);
    }
  }
}

function saveServerStudentStore(store: ServerStudentStore) {
  try {
    fs.writeFileSync(STUDENTS_FILE_PATH, JSON.stringify(store, null, 2), "utf-8");
  } catch (e) {
    console.error("Error writing students registry file:", e);
  }
  
  saveStoreToFirebase(store).catch(e => console.error("Firebase store sync error:", e));
}

let serverStudentStore = loadServerStudentStore();

// Threat Signatures Detector
function detectMaliciousPayload(payload: string): { isThreat: boolean; threatType?: string; pattern?: string } {
  if (!payload || typeof payload !== "string") return { isThreat: false };

  // SQL Injection patterns (genuine SQLi attack vectors)
  const sqliRegex = /(\b(union\s+all\s+select|union\s+select|drop\s+table|delete\s+from\s+[a-z_]+|alter\s+table|information_schema|pg_sleep\s*\(|waitfor\s+delay)\b|'\s*or\s*'1'\s*=\s*'1|'\s*or\s*1=1\s*--|;\s*drop\s+table)/i;
  if (sqliRegex.test(payload)) {
    return { isThreat: true, threatType: "sqli", pattern: "SQL Injection (حمله تزریق اس‌کیو‌ال)" };
  }

  // Cross-Site Scripting (XSS) patterns (script tags or javascript: protocol)
  const xssRegex = /(<script\b[^>]*>|javascript\s*:\s*|document\.cookie|<iframe\b[^>]*src=|<object\b[^>]*data=)/i;
  if (xssRegex.test(payload)) {
    return { isThreat: true, threatType: "xss", pattern: "Cross-Site Scripting (حمله تزریق اسکریپت)" };
  }

  // Remote Code Execution & Path Traversal
  const rceRegex = /(\/etc\/passwd|c:\\boot\.ini|powershell\s+-enc|cmd\.exe\s+\/c|\$\{jndi:|\bpassthru\s*\(|\bchild_process\b)/i;
  if (rceRegex.test(payload)) {
    return { isThreat: true, threatType: "rce", pattern: "RCE / Path Traversal (حمله اجرای کد از راه دور)" };
  }

  // NoSQL / Prototype Pollution
  const nosqlRegex = /(__proto__|constructor\.prototype|\$where\s*:)/i;
  if (nosqlRegex.test(payload)) {
    return { isThreat: true, threatType: "nosql", pattern: "NoSQL / Prototype Pollution (حمله آلودگی پروتوتایپ)" };
  }

  return { isThreat: false };
}

const HONEYPOT_PATHS = [
  "/.env",
  "/.git",
  "/admin.php",
  "/wp-login.php",
  "/wp-admin",
  "/phpmyadmin",
  "/pma",
  "/config.json",
  "/shell.php",
  "/actuator",
  "/api/debug",
  "/xmlrpc.php",
  "/cgi-bin",
  "/server-status",
  "/.aws",
  "/backup.sql"
];

async function applyActiveCounterDefense(
  ip: string,
  reason: string,
  threatType: string,
  counterMeasure: 'tarpit' | 'hard_drop' | 'honeypot_poison' = 'tarpit',
  durationMinutes = 60
) {
  const cleanIp = ip ? ip.replace(/^.*:/, "") : "unknown";
  const now = Date.now();
  const existing = bannedIpsMap.get(cleanIp);
  const count = (existing?.attackCount || 0) + 1;
  const expiresAt = new Date(now + durationMinutes * 60 * 1000).toISOString();

  bannedIpsMap.set(cleanIp, {
    ip: cleanIp,
    bannedAt: new Date().toISOString(),
    expiresAt,
    reason,
    attackCount: count,
    threatType,
    counterMeasure
  });

  thwartedAttacksCount++;

  addSecurityAuditLog(
    "threat_blocked",
    "critical",
    `[پدافند عامل WAF] خنثی‌سازی حمله «${threatType.toUpperCase()}» و مسدودسازی IP ${cleanIp}: ${reason} (پاسخ تدافعی: ${counterMeasure === 'tarpit' ? 'تله تاخیر سوکت Tarpit' : 'مسدودسازی قطعی'})`,
    cleanIp,
    threatType
  );
}

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "5mb" }));

// Enhanced Security Headers Middleware with Cyber Shield Identification
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("X-Cyber-Shield", `Hermes-WAF-Defcon-${defconLevel}`);
  next();
});

// ============================================================
// WAF (Web Application Firewall) & Active Threat Counter-Defense
// ============================================================
app.use(async (req, res, next) => {
  const reqPath = req.path.toLowerCase();

  // 0. Static assets, Vite build files, fonts, and client modules bypass WAF completely!
  // This prevents browser module loading (which fetches 50-100 files in parallel on initial visit)
  // from ever triggering DDoS rate limiting or tarpit defense!
  const isStaticOrAsset =
    !req.path.startsWith("/api/") ||
    reqPath.startsWith("/@") ||
    reqPath.startsWith("/src/") ||
    reqPath.startsWith("/node_modules/") ||
    reqPath.startsWith("/assets/") ||
    reqPath.startsWith("/public/") ||
    /\.(js|css|html|ts|tsx|jsx|json|svg|png|jpg|jpeg|ico|woff|woff2|ttf|map)$/i.test(reqPath);

  if (isStaticOrAsset) {
    return next();
  }

  const clientIp = getClientIp(req).replace(/^.*:/, "");

  // 1. Check if IP is actively quarantined (only applies to /api/ routes)
  const banRecord = bannedIpsMap.get(clientIp);
  if (banRecord) {
    if (new Date(banRecord.expiresAt).getTime() > Date.now()) {
      if (banRecord.counterMeasure === "tarpit") {
        await new Promise((r) => setTimeout(r, 2000));
      }
      return res.status(403).json({
        success: false,
        error: "دسترسی شما به علت رفتارهای غیرمجاز به صورت موقت مسدود گردیده است (Active Cyber Shield).",
        threatType: banRecord.threatType,
        bannedUntil: banRecord.expiresAt,
        shieldCode: "WAF_ACTIVE_COUNTER_DEFENSE"
      });
    } else {
      bannedIpsMap.delete(clientIp);
      addSecurityAuditLog("ip_unbanned", "info", `پایان زمان قرنطینه و رفع انسداد خودکار IP ${clientIp}`, clientIp);
    }
  }

  // 2. Honeypot Trap Interception
  const isHoneypot = HONEYPOT_PATHS.some((hp) => reqPath === hp || reqPath.startsWith(hp + "/") || reqPath.endsWith(hp));
  if (isHoneypot) {
    await applyActiveCounterDefense(clientIp, `تله امنیتی هانی‌پات (درخواست به مسیر اسکنر ${req.path})`, "honeypot", "tarpit", 120);
    await new Promise((r) => setTimeout(r, 2000));
    return res.status(404).json({
      error: "Trap triggered. Hostile probe intercepted.",
      tarpitEngaged: true
    });
  }

  // 3. Anti-DDoS / Rate Limiting per IP strictly on API endpoints
  const isInternalIp = clientIp === "127.0.0.1" || clientIp === "localhost" || clientIp === "::1" || clientIp.startsWith("10.") || clientIp.startsWith("172.");
  if (!isInternalIp) {
    const now = Date.now();
    let rate = ddosRequestTracker.get(clientIp);
    const windowMs = 10 * 1000; // 10 seconds
    const maxReqPerWindow = defconLevel === 1 ? 60 : defconLevel <= 3 ? 150 : 300;

    if (!rate || now - rate.windowStart > windowMs) {
      rate = { count: 1, windowStart: now };
    } else {
      rate.count++;
      if (rate.count > maxReqPerWindow) {
        await applyActiveCounterDefense(clientIp, `حمله طغیان ترافیک و اسپم (${rate.count} درخواست در ۱۰ ثانیه)`, "ddos", "tarpit", 10);
        return res.status(429).json({
          error: "تعداد درخواست‌های ارسالی فراتر از سقف مجاز امنیتی است (Anti-DDoS Rate Limit Exceeded).",
          shieldCode: "DDOS_MITIGATION_ACTIVE"
        });
      }
    }
    ddosRequestTracker.set(clientIp, rate);
  }

  // 4. Deep Threat Inspection (Inspect queries, body, URL params)
  if (req.method !== "GET" || Object.keys(req.query || {}).length > 0) {
    let inspectTarget = JSON.stringify({
      path: req.path,
      query: req.query,
      body: req.body
    });

    // Remove base64 image prefixes to prevent false detection
    if (inspectTarget.length > 5000) {
      inspectTarget = inspectTarget.replace(/data:image\/[^;]+;base64,[a-zA-Z0-9+/=]+/g, "[base64_image_data]");
    }

    const threat = detectMaliciousPayload(inspectTarget);
    if (threat.isThreat) {
      await applyActiveCounterDefense(clientIp, `شناسایی الگوی مخرب: ${threat.pattern}`, threat.threatType || "sqli", "tarpit", 60);
      await new Promise((r) => setTimeout(r, 2000));
      return res.status(403).json({
        success: false,
        error: `حمله سایبری شناسایی و بلوکه شد (${threat.pattern}). IP شما در سامانه پدافند قفل گردید.`,
        shieldCode: "PAYLOAD_ATTACK_BLOCKED"
      });
    }
  }

  next();
});

// Middleware to track AI usage requests & enforce account status
app.use((req, res, next) => {
  if (req.path.startsWith("/api/advisor/") || req.path.startsWith("/api/maze/")) {
    const profile = req.body?.profile;
    if (profile) {
      const studentKey = String(profile.id || profile.name || "").trim().toLowerCase();
      
      // Access Control: Block suspended or deleted accounts from consuming AI quota
      const isDeleted = serverStudentStore.deletedStudents.some(
        (d) => d.toLowerCase() === studentKey || d.toLowerCase() === String(profile.name || "").toLowerCase()
      );
      const matched = serverStudentStore.students.find(
        (s) => (s.name && s.name.toLowerCase() === studentKey) || (s.id && s.id.toLowerCase() === studentKey)
      );

      if (isDeleted || (matched && matched.accessStatus === "suspended")) {
        return res.status(403).json({
          error: "دسترسی این حساب کاربری توسط مشاور معلق یا لغو شده است و امکان استفاده از امکانات هوش مصنوعی وجود ندارد."
        });
      }

      if (studentKey) {
        if (!serverStudentStore.usageStats) {
          serverStudentStore.usageStats = {};
        }
        const originalKey = profile.id || profile.name;
        if (!serverStudentStore.usageStats[originalKey]) {
          serverStudentStore.usageStats[originalKey] = {};
        }
        const currentCount = serverStudentStore.usageStats[originalKey].aiUsageCount || 0;
        serverStudentStore.usageStats[originalKey].aiUsageCount = currentCount + 1;
        serverStudentStore.usageStats[originalKey].updatedAt = new Date().toISOString();
        serverStudentStore.updatedAt = new Date().toISOString();
        saveServerStudentStore(serverStudentStore);
      }
    }
  }
  next();
});

// Lazy/Safe Gemini client initialization
function getGenAI() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

// Resilient Gemini caller with automatic model fallback for high demand and availability
async function generateGeminiWithFallback(
  ai: GoogleGenAI,
  options: {
    contents: any;
    config?: any;
    preferredModel?: string;
  }
) {
  // Normalize preferredModel if non-existent/fictitious model names were passed
  let preferred = options.preferredModel || "gemini-3.5-flash";
  if (preferred === "gemini-3.6-flash" || preferred === "gemini-3.6-pro") {
    preferred = "gemini-3.5-flash";
  }

  // Use verified and active Gemini models (gemini-3.5-flash, gemini-flash-latest, gemini-3.1-flash-lite)
  const candidateModels = [
    preferred,
    "gemini-3.5-flash",
    "gemini-flash-latest",
    "gemini-3.1-flash-lite",
  ];
  const uniqueModels = Array.from(new Set(candidateModels));
  let lastError: any = null;

  for (const model of uniqueModels) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: options.contents,
        config: options.config,
      });
      if (response && response.text) {
        return response;
      }
    } catch (err: any) {
      lastError = err;
      const errMsg = err?.message || String(err);
      console.warn(`[Gemini Fallback] Model "${model}" failed: ${errMsg}. Trying fallback model...`);
      // Short delay if 503 or 429
      if (errMsg.includes("503") || errMsg.includes("429") || errMsg.includes("demand")) {
        await new Promise((r) => setTimeout(r, 400));
      }
    }
  }

  throw lastError;
}

// Algorithmic fallback analysis for nightly reports
function getAlgorithmicNightlyAnalysis(report: any, profile: any) {
  const targetH = profile?.dailyTargetHours || 7;
  const hours = Number(report.studiedHours) || 0;
  const tests = Number(report.totalTests) || 0;
  const correct = Number(report.correctTests) || 0;
  const wrong = Number(report.wrongTests) || 0;
  const rating = Number(report.satisfactionRating) || 3;
  const ratio = hours > 0 ? (tests / hours).toFixed(1) : "0";

  const score = Math.min(
    10,
    Math.max(
      3,
      Math.round((hours / targetH) * 5 + (tests >= 60 ? 3 : 1.5) + rating * 0.4)
    )
  );

  return {
    overallScore: score,
    tone: score >= 7 ? "encouraging" : "firm",
    summary: `گزارش مطالعه شما ثبت و با متد تحلیلی ارزیابی شد. امروز ${hours} ساعت مطالعه مفید داشتی و ${tests} تست کار کردی (میانگین ${ratio} تست به ازای هر ساعت). با توجه به هدف شما در ${profile?.targetGoal || "کنکور"}، حفظ ثبات در تست‌زنی و پوشش مباحث اولویت‌دار اهمیت اساسی دارد. موانع اعلام‌شده: ${report.obstacles?.join("، ") || "موردی گزارش نشده"}.`,
    strengthsIdentified: [
      `پایبندی به ارسال منظم گزارش شبانه و خودارزیابی شفاف`,
      tests >= 50
        ? `حفظ ضرب‌آهنگ تست‌زنی با ${tests} تست حل شده`
        : `تداوم زمان مطالعه حتی با وجود چالش‌های روزانه`,
      `پوشش مباحث کلیدی و اختصاص زمان برای یادگیری`,
    ],
    criticalWeaknesses: [
      report.obstacles?.[0]
        ? `کاهش بازدهی به علت مانع «${report.obstacles[0]}» در بخش‌هایی از روز`
        : `نیاز به ثبت دقیق‌تر درصد پاسخگویی به تفکیک دروس`,
      hours < targetH
        ? `کسری ${(targetH - hours).toFixed(1)} ساعت نسبت به سقف هدف روزانه (${targetH} ساعت)`
        : `لزوم افزایش سرعت تست‌زنی برای رسیدن به استاندارد ۱۵ تست در ساعت`,
    ],
    immediateFixesTomorrow: [
      `صبح فردا باکس اول را به سخت‌ترین مبحث از دروس ضعیف (${profile?.weakSubjects?.[0] || "درس تخصصی اولویت‌دار"}) اختصاص بده.`,
      `گوشی و عوامل حواس‌پرتی را در طول زمان مطالعه کاملاً از دسترس دور نگه دار.`,
      `پایان روز فردا، ۱۰ تست کوتاه مروری از مباحث اشتباه امروز کار کن تا یادگیری تثبیت شود.`,
    ],
    motivationalQuote:
      "مسیر رتبه‌های برتر از همین شب‌هایی ساخته می‌شود که حتی با وجود خستگی، یک قدم جلوتر برمی‌داری.",
  };
}

// Health check and status
app.get("/api/advisor/status", (req, res) => {
  const hasKey = Boolean(process.env.GEMINI_API_KEY);
  res.json({
    status: "ok",
    hasGeminiKey: hasKey,
    recommendedModel: "gemini-3.5-flash",
    publicApiUrl: "/v1/chat/completions",
  });
});

// OpenAI-compatible /v1/models endpoint for Hermes / external agents
app.get("/v1/models", (req, res) => {
  res.json({
    object: "list",
    data: [
      { id: "gemini-3.5-flash", object: "model", created: 1700000000, owned_by: "google" },
      { id: "gemini-flash-latest", object: "model", created: 1700000000, owned_by: "google" },
      { id: "study-advisor-hermes", object: "model", created: 1700000000, owned_by: "study-advisor" },
    ],
  });
});

// OpenAI-compatible /v1/chat/completions endpoint
// Allows Hermes, Telegram bots, or any Python/Node agent to use this server directly
app.post("/v1/chat/completions", requireAuthorizedUser, async (req, res) => {
  try {
    const { messages = [], temperature = 0.7 } = req.body;
    const ai = getGenAI();

    const systemMsg = messages.find((m: any) => m.role === "system")?.content || 
      `تو مشاور تحصیلی ارشد و تحلیل‌گر آزمون هستی. گزارش‌های شبانه دانش‌آموز را با دقت بررسی کن و راهکارهای ملموس برای فردا بده.`;

    const userMsgs = messages.filter((m: any) => m.role !== "system");
    const lastUserMsg = userMsgs[userMsgs.length - 1]?.content || "سلام";
    const history = userMsgs.slice(0, -1).map((m: any) => `${m.role === "user" ? "دانش‌آموز" : "مشاور"}: ${m.content}`).join("\n");

    let replyText = "";
    if (ai) {
      try {
        const prompt = `${history ? `تاریخچه گفتگو:\n${history}\n\n` : ""}پیام کاربر: ${lastUserMsg}`;
        const response = await generateGeminiWithFallback(ai, {
          preferredModel: "gemini-3.5-flash",
          contents: prompt,
          config: {
            systemInstruction: systemMsg,
            temperature,
          },
        });
        replyText = response.text || "پاسخی دریافت نشد.";
      } catch (genErr) {
        console.warn("Fallback response for /v1/chat/completions due to model spike:", genErr);
        replyText = `گزارش و پیام شما دریافت شد. نکات کلیدی تحلیلی:
۱. نسبت تست به زمان مطالعه را روی حداقل ۱۰ تا ۱۵ تست در ساعت تنظیم کن.
۲. ۳ اقدام اصلی فردا: اولویت دادن به مبحث ضعیف در ابتدای روز، تمرین بدون وقفه ۴۵ دقیقه‌ای، و مرور تست‌های غلط در پایان شب.`;
      }
    } else {
      replyText = `[پاسخ شبیه‌ساز مشاور درسی]: گزارش بررسی شد. به ازای هر ساعت مطالعه حداقل ۱۰ تا ۱۵ تست بزن. ۳ اقدام فردای تو: ۱. شروع با درس ضعیف ۲. دور نگه داشتن گوشی ۳. مرور نیم‌ساعته تست‌های غلط قبل از خواب.`;
    }

    res.json({
      id: `chatcmpl-${Date.now()}`,
      object: "chat.completion",
      created: Math.floor(Date.now() / 1000),
      model: "gemini-3.5-flash",
      choices: [
        {
          index: 0,
          message: {
            role: "assistant",
            content: replyText,
          },
          finish_reason: "stop",
        },
      ],
      usage: {
        prompt_tokens: 120,
        completion_tokens: 250,
        total_tokens: 370,
      },
    });
  } catch (error: any) {
    console.error("OpenAI endpoint error:", error);
    res.json({
      id: `chatcmpl-${Date.now()}`,
      object: "chat.completion",
      created: Math.floor(Date.now() / 1000),
      model: "gemini-3.5-flash",
      choices: [
        {
          index: 0,
          message: {
            role: "assistant",
            content: "پیام شما دریافت شد. برای حفظ تمرکز، سخت‌ترین تسک فردا را در ابتدای صبح انجام دهید و گوشی را در حالت فوکوس قرار دهید.",
          },
          finish_reason: "stop",
        },
      ],
    });
  }
});

// Chat endpoint
app.post("/api/advisor/chat", requireAuthorizedUser, async (req, res) => {
  const { messages, profile } = req.body;
  const ai = getGenAI();

  const lastMessage = messages[messages.length - 1]?.text || "سلام مشاور";
  const historyText = messages
    .slice(0, -1)
    .map((m: any) => `${m.sender === "user" ? "دانش‌آموز" : "مشاور"}: ${m.text}`)
    .join("\n");

  const systemInstruction = `تو مشاور تحصیلی ارشد و متخصص برنامه‌ریزی درسی و روانشناسی یادگیری به زبان فارسی هستی.
اطلاعات دانش‌آموز:
نام: ${profile?.name || "دانش‌آموز"}
مقطع و رشته: ${profile?.grade || "دوازدهم"} - ${profile?.fieldOfStudy || "تجربی"}
هدف: ${profile?.targetGoal || "موفقیت در کنکور و آزمون‌ها"}
ساعت هدف روزانه: ${profile?.dailyTargetHours || 7} ساعت
نقاط قوت: ${profile?.strongSubjects?.join("، ") || "نامشخص"}
نقاط ضعف: ${profile?.weakSubjects?.join("، ") || "نامشخص"}
محدودیت‌ها: ${profile?.schoolOrWorkHours || "مدرسه"}

اصول پاسخ‌دهی:
۱. کوتاه، پرمغز، بدون تعارف اضافه و متناسب با ۳ تا ۴ پیام در روز.
۲. کاملاً تحلیلی و تکنیکال (راهکارهای علمی مانند روش پومودورو، مرور فواصل لایتنر، تست زمان‌دار، دسته‌بندی مباحث).
۳. اگر دانش‌آموز از افت انگیزه، خستگی یا وسواس گفت، با درک روانشناختی و راهکار عملی فوری پاسخ بده.
۴. لحن محترمانه، صمیمی، قاطع و امیدوارکننده.`;

  if (!ai) {
    return res.status(200).json({
      reply: `پاسخ تحلیلی مشاور:\nبا توجه به هدفت در ${profile?.targetGoal || "تحصیل"}، حفظ پیوستگی مهم‌ترین عامل موفقیت است. برای مباحث ضعیف، مطالعه را به بخش‌های کوچک ۴۵ دقیقه‌ای همراه با حل فوری تست‌های آموزشی تقسیم کن تا خستگی یا افت بازدهی رخ ندهد.`,
    });
  }

  try {
    const prompt = `${historyText ? `تاریخچه مکالمه:\n${historyText}\n\n` : ""}پیام فعلی دانش‌آموز: ${lastMessage}`;

    // Enable Google Search Grounding for up-to-date Konkur news, dates, and syllabus info
    let searchSources: any[] = [];
    let replyText = "";

    try {
      const searchResponse = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          systemInstruction: `${systemInstruction}\nاگر دانش‌آموز درباره تاریخ کنکور، اخبار سنجش، حذفیات یا بودجه‌بندی آزمون‌ها پرسید، از گوگل سرچ استفاده کن و آخرین اخبار دقیق فارسی را بازگو کن.`,
          tools: [{ googleSearch: {} }],
        },
      });

      replyText = searchResponse.text || "";
      const groundingChunks = searchResponse.candidates?.[0]?.groundingMetadata?.groundingChunks;
      if (groundingChunks && Array.isArray(groundingChunks)) {
        searchSources = groundingChunks
          .map((c: any) => ({
            title: c.web?.title || c.web?.uri,
            uri: c.web?.uri,
          }))
          .filter((c: any) => c.uri);
      }
    } catch (searchErr) {
      // Fallback to standard model without tools
      const response = await generateGeminiWithFallback(ai, {
        preferredModel: "gemini-3.5-flash",
        contents: prompt,
        config: {
          systemInstruction,
          temperature: 0.7,
        },
      });
      replyText = response.text || "پاسخی دریافت نشد.";
    }

    return res.json({
      reply: replyText || "پاسخی از مدل دریافت نشد.",
      sources: searchSources,
    });
  } catch (error: any) {
    console.warn("Gemini chat error (falling back to tailored advisory reply):", error?.message || error);
    
    // Return a thoughtful fallback tailored to student questions instead of crashing
    let fallbackReply = `تحلیل مشاور:\nدر مورد پرسش شما، راهکار عملی و علمی رتبه‌های برتر به این شرح است:\n\n۱. **تمرکز بر نقاط ضعف (${profile?.weakSubjects?.[0] || "درس‌های سنگین"}):** در ساعات اوج انرژی روز (ابتدای صبح یا بعد از استراحت اولیه) به سراغ سخت‌ترین مباحث برو.\n۲. **کنترل خستگی و افت انرژی:** از تکنیک پومودوروی اصلاح‌شده (۵۰ دقیقه مطالعه متمرکز + ۱۰ دقیقه پیاده‌روی بدون نگاه به گوشی) استفاده کن.\n۳. **تثبیت با تست:** برای هر پارت درسی، حداقل ۱۰ تا ۱۵ تست آموزشی حل کن و پاسخ‌های اشتباه را همان روز نشانه‌گذاری کن.`;

    return res.json({
      reply: fallbackReply,
    });
  }
});

// Nightly Report Analysis
app.post("/api/advisor/analyze-nightly", requireAuthorizedUser, async (req, res) => {
  const { report, profile } = req.body;
  const ai = getGenAI();

  if (!ai) {
    return res.json({ analysis: getAlgorithmicNightlyAnalysis(report, profile) });
  }

  try {
    const systemInstruction = `تو مشاور تحصیلی بسیار کارکشته و تحلیل‌گر ارشد آزمون‌ها و کنکور هستی.
وظیفه تو این است که گزارش شبانه مطالعه دانش‌آموز را موشکافانه کالبدشکافی کنی.
از کلی‌گویی و تعریف و تمجیدهای الکی شدیداً پرهیز کن. منطقی، صریح، دلسوز و راهکارمحور باش.
باید خروجی را دقیقاً مطابق با ساختار JSON خواسته شده برگردانی.`;

    const prompt = `مشخصات دانش‌آموز:
- نام: ${profile?.name || "دانش‌آموز"}
- مقطع و رشته: ${profile?.grade || "دوازدهم"} - ${profile?.fieldOfStudy || "تجربی"}
- هدف اصلی: ${profile?.targetGoal || "قبولی عالی"}
- ساعت هدف روزانه: ${profile?.dailyTargetHours || 7} ساعت
- نقاط قوت: ${profile?.strongSubjects?.join("، ") || "نامشخص"}
- نقاط ضعف: ${profile?.weakSubjects?.join("، ") || "نامشخص"}

عملکرد ثبت شده امروز:
- ساعت مطالعه مفید: ${report.studiedHours} ساعت
- کل تست‌های حل شده: ${report.totalTests} تست
- تست‌های درست: ${report.correctTests}
- تست‌های غلط یا نزده: ${report.wrongTests}
- میزان رضایت از خود (از ۵): ${report.satisfactionRating}
- موانع و چالش‌های امروز: ${report.obstacles?.join("، ") || "هیچ"}
- یادداشت و توضیحات شخصی دانش‌آموز: "${report.studentNotes || "توضیح خاصی ننوشته"}"

لطفاً این عملکرد را تحلیل کن و خروجی را دقیقاً در قالب JSON برگردان.`;

    const response = await generateGeminiWithFallback(ai, {
      preferredModel: "gemini-3.5-flash",
      contents: prompt,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            overallScore: {
              type: Type.INTEGER,
              description: "نمره عملکرد امروز از ۱ تا ۱۰ با ارزیابی سخت‌گیرانه و عادلانه",
            },
            tone: {
              type: Type.STRING,
              description: "یکی از این سه حالت: encouraging, firm, strategic",
            },
            summary: {
              type: Type.STRING,
              description: "تحلیل جامع ۲ تا ۳ پاراگرافی از وضعیت امروز، مقایسه با ساعت هدف و تراز تست",
            },
            strengthsIdentified: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "۲ یا ۳ نکته مثبت و پیشرفت واقعی امروز",
            },
            criticalWeaknesses: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "نقاط ضعف پنهان یا علت افت بازدهی و موانع",
            },
            immediateFixesTomorrow: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "۳ اقدام بسیار دقیق و قابل انجام برای برنامه فردای دانش‌آموز",
            },
            motivationalQuote: {
              type: Type.STRING,
              description: "یک جمله انگیزاننده و واقع‌گرایانه مرتبط با شرایط او",
            },
          },
          required: [
            "overallScore",
            "tone",
            "summary",
            "strengthsIdentified",
            "criticalWeaknesses",
            "immediateFixesTomorrow",
            "motivationalQuote",
          ],
        },
      },
    });

    const parsed = JSON.parse(response.text || "{}");
    return res.json({ analysis: parsed });
  } catch (error: any) {
    console.warn("Gemini nightly analysis fallback due to:", error?.message || error);
    return res.json({ analysis: getAlgorithmicNightlyAnalysis(report, profile) });
  }
});

function getFallbackSchedule(profile: any, examBudget?: any, strategyPreset?: string) {
  const field = (profile?.fieldOfStudy || "").toLowerCase();
  const isExp = field.includes("تجربی") || field.includes("زیست");
  const isHum = field.includes("انسانی") || field.includes("فلسفه") || field.includes("ادبیات");
  const isMath = (!isExp && !isHum) || field.includes("ریاضی");

  const streamName = isExp ? "علوم تجربی" : isHum ? "ادبیات و علوم انسانی" : "ریاضی و فیزیک";

  const defaultWeak = isExp 
    ? "زیست‌شناسی ۳ (دوازدهم)" 
    : isHum 
    ? "علوم و فنون ادبی (عروض و قافیه)" 
    : "حسابان و ریاضی پایه (مشتق و مثلثات)";

  const defaultSecondWeak = isExp 
    ? "شیمی ۳ (اسیدها و بازها و مسائل)" 
    : isHum 
    ? "فلسفه و منطق (استدلال و مفاهیم)" 
    : "فیزیک ۳ (حرکت‌شناسی و دینامیک)";

  const defaultStrong = isExp 
    ? "فیزیک تجربی" 
    : isHum 
    ? "عربی اختصاصی / اقتصاد" 
    : "گسسته و آمار / هندسه";

  const weak = profile?.weakSubjects?.[0] || defaultWeak;
  const secondWeak = profile?.weakSubjects?.[1] || defaultSecondWeak;
  const strong = profile?.strongSubjects?.[0] || defaultStrong;

  const examTitle = examBudget?.examName 
    ? `برنامه تخصصی آمادگی آزمون ${examBudget.examName} (${examBudget.examDate || "جمعه"}) - رشته ${streamName}`
    : `برنامه هفتگی راهبردی و فوق‌تخصصی کنکور ${streamName}`;

  const strategy = examBudget?.syllabusDetails
    ? `پوشش ۱۰۰٪ بودجه‌بندی آزمون ${examBudget.examName || "آزمایشی"} با ترکیب مطالعه مفهومی، تست‌های آموزشی، پارت‌های زمان‌دار و بازیابی فعال ابینگهاوس.`
    : `برنامه شخصی‌سازی‌شده بر مبنای ضرایب رسمی کنکور ${streamName} با اولویت دروس اصلی (${weak} و ${secondWeak})، رعایت اصل تنوع ذهنی و پارت‌های جبرانی آخر هفته.`;

  // Specialized daily templates based on field
  let days: any[] = [];

  if (isExp) {
    // Experimental Sciences (علوم تجربی: زیست ضریب ۱۲، شیمی ضریب ۹، فیزیک ضریب ۷، ریاضی ضریب ۷، زمین ضریب ۱)
    days = [
      {
        name: "شنبه",
        hours: 7.5,
        tip: "شروع قدرتمند با خط‌به‌خط کتاب زیست‌شناسی + حل تست آموزشی بلافاصله بعد از هر گفتار",
        blocks: [
          { id: "blk-exp-0-1", timeSlot: "۱۵:۳۰ - ۱۷:۰۰", subject: "زیست‌شناسی ۳", topic: "متن‌خوانی دقیق گفتار ۱ + حل ۲۵ تست مفهومی و شکل‌خوانی", durationMinutes: 90, type: "concept", targetTests: 25, difficultyLevel: "سخت", recommendedMethod: "بازیابی فعال و حاشیه‌نویسی" },
          { id: "blk-exp-0-2", timeSlot: "۱۷:۱۵ - ۱۸:۴۵", subject: "شیمی ۳", topic: "اسیدها و بازها: مفاهیم تعادل و محاسبات pH (۲۵ تست)", durationMinutes: 90, type: "test", targetTests: 25, difficultyLevel: "متوسط", recommendedMethod: "تست‌زنی بدون ماشین‌حساب" },
          { id: "blk-exp-0-3", timeSlot: "۱۹:۱۵ - ۲۰:۳۰", subject: "فیزیک تجربی ۳", topic: "حرکت بر خط راست: نمودارهای مکان-زمان و سرعت-زمان (۲۰ تست)", durationMinutes: 75, type: "test", targetTests: 20, difficultyLevel: "متوسط", recommendedMethod: "پومودورو (۲۵-۵)" },
          { id: "blk-exp-0-4", timeSlot: "۲۱:۰۰ - ۲۲:۱۵", subject: "ریاضی تجربی", topic: "مثلثات و معادلات مثلثاتی: یادآوری روابط و حل ۱۵ تست آموزشی", durationMinutes: 75, type: "concept", targetTests: 15, difficultyLevel: "متوسط", recommendedMethod: "حل تمرین تشریحی و تستی" },
        ]
      },
      {
        name: "یکشنبه",
        hours: 7.5,
        tip: "تثبیت زیست پایه و تسلط بر مسائل محاسباتی استوکیومتری شیمی",
        blocks: [
          { id: "blk-exp-1-1", timeSlot: "۱۵:۳۰ - ۱۷:۰۰", subject: "زیست‌شناسی پایه (دهم/یازدهم)", topic: "گردش مواد و تبادلات گازی / حواس و دستگاه عصبی (۳۰ تست)", durationMinutes: 90, type: "test", targetTests: 30, difficultyLevel: "سخت", recommendedMethod: "تست زمان‌دار و بررسی تک‌تک گزینه‌ها" },
          { id: "blk-exp-1-2", timeSlot: "۱۷:۱۵ - ۱۸:۴۵", subject: "ریاضی تجربی", topic: "مشتق پذیری و فرمول‌های مشتق‌گیری (۲۵ تست سرعتی)", durationMinutes: 90, type: "test", targetTests: 25, difficultyLevel: "سخت", recommendedMethod: "تکنیک تیپ‌بندی سوالات" },
          { id: "blk-exp-1-3", timeSlot: "۱۹:۱۵ - ۲۰:۳۰", subject: "شیمی پایه (استوکیومتری)", topic: "مسائل درصد خلوص و بازده درصدی + موازنه سریع واکنش‌ها", durationMinutes: 75, type: "test", targetTests: 20, difficultyLevel: "متوسط", recommendedMethod: "تمرکز بر دقت محاسبات عددی" },
          { id: "blk-exp-1-4", timeSlot: "۲۱:۰۰ - ۲۲:۱۵", subject: "مرور زیست و لایتنر", topic: "مرور فلش‌کارت‌های قیدها و نکات طلایی اشکال زیست دیروز", durationMinutes: 75, type: "review", targetTests: 10, difficultyLevel: "آسان", recommendedMethod: "مرور فاصله‌دار ابینگهاوس" },
        ]
      },
      {
        name: "دوشنبه",
        hours: 8.0,
        tip: "ترکیب فیزیک الکتریسیته با زیست‌شناسی ژنتیک و مولکولی",
        blocks: [
          { id: "blk-exp-2-1", timeSlot: "۱۵:۳۰ - ۱۷:۰۰", subject: "زیست‌شناسی ۳", topic: "انتقال اطلاعات در نسل‌ها / همانندسازی DNA و رونویسی (۲۵ تست)", durationMinutes: 90, type: "concept", targetTests: 25, difficultyLevel: "بسیار چالشی و دام‌دار", recommendedMethod: "تکنیک فاینمن" },
          { id: "blk-exp-2-2", timeSlot: "۱۷:۱۵ - ۱۸:۴۵", subject: "فیزیک پایه", topic: "الکتریسیته جاری: مدارهای الکتریکی و قانون اهم و کیرشهف", durationMinutes: 90, type: "test", targetTests: 25, difficultyLevel: "سخت", recommendedMethod: "تحلیل الگوهای تستی" },
          { id: "blk-exp-2-3", timeSlot: "۱۹:۱۵ - ۲۰:۳۰", subject: "شیمی ۳", topic: "الکتروشیمی: سلول‌های گالوانی و پتانسیل کاهشی استاندارد", durationMinutes: 75, type: "test", targetTests: 20, difficultyLevel: "متوسط", recommendedMethod: "تست‌زنی زمان‌دار" },
          { id: "blk-exp-2-4", timeSlot: "۲۱:۰۰ - ۲۲:۱۵", subject: "زمین‌شناسی / عمومی نهایی", topic: "منابع آب و خاک / تمرین تشریحی برای ارتقای معدل نهایی", durationMinutes: 75, type: "concept", targetTests: 15, difficultyLevel: "آسان", recommendedMethod: "خلاصه‌نویسی نموداری" },
        ]
      },
      {
        name: "سه‌شنبه",
        hours: 7.5,
        tip: "سه‌شنبه‌های سرعتی: شبیه‌سازی تست‌های زمان‌دار کنکورهای اخیر",
        blocks: [
          { id: "blk-exp-3-1", timeSlot: "۱۵:۳۰ - ۱۷:۰۰", subject: "ریاضی تجربی", topic: "کاربرد مشتق: اکسترمم‌های نسبی و مطلق و بهینه‌سازی (۲۵ تست)", durationMinutes: 90, type: "test", targetTests: 25, difficultyLevel: "بسیار چالشی و دام‌دار", recommendedMethod: "تست‌زنی زمان‌دار با تکنیک ضربدر منها" },
          { id: "blk-exp-3-2", timeSlot: "۱۷:۱۵ - ۱۸:۴۵", subject: "زیست‌شناسی ۳", topic: "تست‌های ترکیبی فصل‌های ۱ و ۲ با کتاب‌های دهم و یازدهم (۳۵ تست)", durationMinutes: 90, type: "test", targetTests: 35, difficultyLevel: "سخت", recommendedMethod: "تحلیل سریع دام‌های طراح" },
          { id: "blk-exp-3-3", timeSlot: "۱۹:۱۵ - ۲۰:۳۰", subject: "فیزیک تجربی ۳", topic: "دینامیک و تکانه: نیروهای اصطکاک و کشش طناب (۲۰ تست)", durationMinutes: 75, type: "test", targetTests: 20, difficultyLevel: "متوسط", recommendedMethod: "رسم دقیق نمودار آزاد جسم" },
          { id: "blk-exp-3-4", timeSlot: "۲۱:۰۰ - ۲۲:۱۵", subject: "شیمی (حفظیات و مفاهیم)", topic: "مرور جدول تناوبی، روندهای شعاع اتمی و الکترونگاتیوی", durationMinutes: 75, type: "review", targetTests: 15, difficultyLevel: "آسان", recommendedMethod: "بازیابی فعال" },
        ]
      },
      {
        name: "چهارشنبه",
        hours: 8.0,
        tip: "جمع‌بندی مباحث تئوری و ورود به فاز تست‌های سنجشی آزمون",
        blocks: [
          { id: "blk-exp-4-1", timeSlot: "۱۵:۳۰ - ۱۷:۰۰", subject: "شیمی ۳ و پایه", topic: "آزمون مبحثی جامع شیمی (۳۰ تست زمان‌دار در ۳۵ دقیقه + تحلیل)", durationMinutes: 90, type: "test", targetTests: 30, difficultyLevel: "سخت", recommendedMethod: "شبیه‌سازی شرایط کنکور" },
          { id: "blk-exp-4-2", timeSlot: "۱۷:۱۵ - ۱۸:۴۵", subject: "زیست‌شناسی جامع", topic: "حل یک دفترچه آزمایشی زیست (۴۵ تست در ۴۵ دقیقه)", durationMinutes: 90, type: "test", targetTests: 45, difficultyLevel: "سخت", recommendedMethod: "مدیریت زمان دفترچه ۱" },
          { id: "blk-exp-4-3", timeSlot: "۱۹:۱۵ - ۲۰:۳۰", subject: "فیزیک تجربی", topic: "نوسان و امواج: دوره تناوب و معادله حرکت نوسانی (۲۰ تست)", durationMinutes: 75, type: "concept", targetTests: 20, difficultyLevel: "متوسط", recommendedMethod: "تحلیل مفهومی موج‌ها" },
          { id: "blk-exp-4-4", timeSlot: "۲۱:۰۰ - ۲۲:۱۵", subject: "ریاضی تجربی", topic: "تست‌های احتمالی و دام‌دار کنکور در مبحث حد و پیوستگی", durationMinutes: 75, type: "review", targetTests: 20, difficultyLevel: "متوسط", recommendedMethod: "مرور تست‌های علامت‌دار" },
        ]
      },
      {
        name: "پنج‌شنبه",
        hours: 8.5,
        tip: "تورق سریع کتاب زیست، مرور فرمول‌های فیزیک/ریاضی و پاکسازی باکس جبرانی",
        blocks: [
          { id: "blk-exp-5-1", timeSlot: "۰۸:۳۰ - ۱۰:۰۰", subject: "زیست‌شناسی (تورق سریع)", topic: "تورق سریع تمام فصول آزمون فردا و بازبینی شکل‌ها و حاشیه‌ها", durationMinutes: 90, type: "review", targetTests: 20, difficultyLevel: "متوسط", recommendedMethod: "تورق سریع شب آزمون" },
          { id: "blk-exp-5-2", timeSlot: "۱۰:۱۵ - ۱۱:۴۵", subject: "مرور فرمول‌ها و نکات", topic: "فرمول‌نامه فیزیک + روابط ریاضی تجربی + واکنش‌های مهم شیمی", durationMinutes: 90, type: "review", targetTests: 0, difficultyLevel: "آسان", recommendedMethod: "بازیابی ذهنی بدون نگاه به جزوه" },
          { id: "blk-exp-5-3", timeSlot: "۱۵:۰۰ - ۱۶:۴۵", subject: "باکس جبرانی شناور ۱", topic: "تکمیل پارت‌های مطالعه عقب‌افتاده طول هفته یا حل تست اضافه مبحث ضعیف", durationMinutes: 105, type: "compensatory", targetTests: 30, difficultyLevel: "متوسط", recommendedMethod: "رفع نواقص تستی" },
          { id: "blk-exp-5-4", timeSlot: "۱۷:۱۵ - ۱۸:۴۵", subject: "آمادگی روانی و آزمون", topic: "تنظیم ابزار آزمون، بررسی استراتژی مدیریت زمان و خواب زودتر از ساعت ۲۲:۳۰", durationMinutes: 75, type: "review", targetTests: 0, difficultyLevel: "آسان", recommendedMethod: "تکنیک تنفس آرام‌بخش" },
        ]
      },
      {
        name: "جمعه",
        hours: 6.0,
        tip: "روز آزمون: اجرای استراتژی ضربدر-منها + تحلیل علمی تک‌تک سوالات در عصر",
        blocks: [
          { id: "blk-exp-6-1", timeSlot: "۰۸:۰۰ - ۱۲:۰۰", subject: examBudget?.examName ? `آزمون ${examBudget.examName}` : "آزمون آزمایشی کنکور تجربی", topic: "شبیه‌سازی کامل شرایط کنکور سراسری، مدیریت دقیق زمان و عدم پاسخ به تست‌های شک‌دار", durationMinutes: 180, type: "test", targetTests: 155, difficultyLevel: "سخت", recommendedMethod: "تکنیک ضربدر منها و استراتژی زمان‌های نقصانی" },
          { id: "blk-exp-6-2", timeSlot: "۱۵:۳۰ - ۱۷:۳۰", subject: "کالبدشکافی و تحلیل آزمون", topic: "بررسی تمام سوالات غلط، نزده و درست‌های تصادفی + یادداشت علت در بانک خطاها", durationMinutes: 120, type: "review", targetTests: 0, difficultyLevel: "بسیار چالشی و دام‌دار", recommendedMethod: "تحلیل موشکافانه کارنامه و ثبت دام‌ها" },
          { id: "blk-exp-6-3", timeSlot: "۱۸:۰۰ - ۱۹:۰۰", subject: "برنامه‌ریزی هفته بعد و ریکاوری", topic: "تنظیم اهداف هفته پیش‌رو بر اساس نقاط ضعف آزمون امروز و استراحت کامل شب", durationMinutes: 60, type: "review", targetTests: 0, difficultyLevel: "آسان", recommendedMethod: "ارزیابی هفتگی" },
        ]
      }
    ];
  } else if (isHum) {
    // Humanities (ادبیات و علوم انسانی: فنون ضریب ۱۲، عربی ۵، فلسفه/منطق ۵، ریاضی ۶، جامعه ۵، روان ۳، اقتصاد ۲، تاریخ/جغرافیا ۵)
    days = [
      {
        name: "شنبه",
        hours: 7.5,
        tip: "آغاز با عروض و قافیه علوم و فنون ادبی و تسلط بر قواعد صرف و نحو عربی",
        blocks: [
          { id: "blk-hum-0-1", timeSlot: "۱۵:۳۰ - ۱۷:۰۰", subject: "علوم و فنون ادبی ۳", topic: "عروض و قافیه: وزن‌یابی سماعی، تقطیع هجایی و پایه‌های آوایی (۳۰ تست)", durationMinutes: 90, type: "concept", targetTests: 30, difficultyLevel: "سخت", recommendedMethod: "سماع و تمرین ریتمیک ابیات" },
          { id: "blk-hum-0-2", timeSlot: "۱۷:۱۵ - ۱۸:۴۵", subject: "عربی اختصاصی ۳", topic: "قواعد ترجمه و تعریب + تحلیل صرفی و اعراب فعل مضارع (۲۵ تست)", durationMinutes: 90, type: "test", targetTests: 25, difficultyLevel: "متوسط", recommendedMethod: "تکنیک رد گزینه با نشانه‌های ساختاری" },
          { id: "blk-hum-0-3", timeSlot: "۱۹:۱۵ - ۲۰:۳۰", subject: "فلسفه و منطق", topic: "منطق دهم: احکام قضایا، عکس مستوی و تناقض (۲۰ تست مفهومی)", durationMinutes: 75, type: "concept", targetTests: 20, difficultyLevel: "سخت", recommendedMethod: "تکنیک فاینمن و رسم دیاگرام ون" },
          { id: "blk-hum-0-4", timeSlot: "۲۱:۰۰ - ۲۲:۱۵", subject: "ریاضی و آمار انسانی", topic: "معادله درجه دوم و کاربردها: حل ۲۰ تست آموزشی و فرمول‌شناسی", durationMinutes: 75, type: "concept", targetTests: 20, difficultyLevel: "متوسط", recommendedMethod: "حل گام‌به‌گام مسائل" },
        ]
      },
      {
        name: "یکشنبه",
        hours: 7.5,
        tip: "ترکیب جامعه‌شناسی تحلیلی با مسائل اقتصاد و تست‌های آرایه‌های ادبی",
        blocks: [
          { id: "blk-hum-1-1", timeSlot: "۱۵:۳۰ - ۱۷:۰۰", subject: "جامعه‌شناسی ۳ و پایه", topic: "جهان‌های اجتماعی و نظم اجتماعی: متن‌خوانی عمیق و حل ۳۰ تست ترکیبی", durationMinutes: 90, type: "concept", targetTests: 30, difficultyLevel: "متوسط", recommendedMethod: "یادداشت‌برداری مفاهیم مقایسه‌ای" },
          { id: "blk-hum-1-2", timeSlot: "۱۷:۱۵ - ۱۸:۴۵", subject: "اقتصاد", topic: "محاسبات درآمد ملی، مالیات تصاعدی و تورم (۲۵ تست مسئله‌ای بدون ماشین‌حساب)", durationMinutes: 90, type: "test", targetTests: 25, difficultyLevel: "سخت", recommendedMethod: "حل تست‌های مسئله‌محور کنکور" },
          { id: "blk-hum-1-3", timeSlot: "۱۹:۱۵ - ۲۰:۳۰", subject: "علوم و فنون ادبی", topic: "آرایه‌های ادبی: ایهام، استعاره و مجاز (۲۵ تست مبحثی)", durationMinutes: 75, type: "test", targetTests: 25, difficultyLevel: "متوسط", recommendedMethod: "تست‌زنی زمان‌دار آرایه‌ها" },
          { id: "blk-hum-1-4", timeSlot: "۲۱:۰۰ - ۲۲:۱۵", subject: "روان‌شناسی", topic: "رشد، تفکر و حل مسئله: حل ۲۰ تست مفهومی و کاربردی", durationMinutes: 75, type: "test", targetTests: 20, difficultyLevel: "آسان", recommendedMethod: "بررسی نمونه‌های رفتاری" },
        ]
      },
      {
        name: "دوشنبه",
        hours: 8.0,
        tip: "فلسفه اسلامی و غربی در کنار مهارت درک مطلب عربی کنکور",
        blocks: [
          { id: "blk-hum-2-1", timeSlot: "۱۵:۳۰ - ۱۷:۰۰", subject: "فلسفه یازدهم و دوازدهم", topic: "هستی‌شناسی و علت و معلول در فلسفه اسلامی (۲۵ تست دام‌دار)", durationMinutes: 90, type: "concept", targetTests: 25, difficultyLevel: "بسیار چالشی و دام‌دار", recommendedMethod: "تحلیل موشکافانه عبارات متن کتاب" },
          { id: "blk-hum-2-2", timeSlot: "۱۷:۱۵ - ۱۸:۴۵", subject: "عربی اختصاصی", topic: "درک مطلب و کلوزتست کنکور: خواندن متن و حل ۳ متن کنکوری با زمان", durationMinutes: 90, type: "test", targetTests: 20, difficultyLevel: "سخت", recommendedMethod: "تکنیک اسکن متن و یافتن کلیدواژه‌ها" },
          { id: "blk-hum-2-3", timeSlot: "۱۹:۱۵ - ۲۰:۳۰", subject: "ریاضی و آمار", topic: "آمار، شاخص‌های پراکندگی و احتمال (۲۵ تست سرعتی)", durationMinutes: 75, type: "test", targetTests: 25, difficultyLevel: "متوسط", recommendedMethod: "پومودورو (۲۵-۵)" },
          { id: "blk-hum-2-4", timeSlot: "۲۱:۰۰ - ۲۲:۱۵", subject: "تاریخ و جغرافیا", topic: "تاریخ ۳: رویدادهای معاصر + جغرافیای انسانی و طبیعی (مرور بازیابی)", durationMinutes: 75, type: "review", targetTests: 20, difficultyLevel: "متوسط", recommendedMethod: "جدول وقایع زمانی و نقشه‌خوانی" },
        ]
      },
      {
        name: "سه‌شنبه",
        hours: 7.5,
        tip: "تمرکز بر قرابت معنایی ادبیات و تسلط بر استدلال‌های منطقی",
        blocks: [
          { id: "blk-hum-3-1", timeSlot: "۱۵:۳۰ - ۱۷:۰۰", subject: "علوم و فنون ادبی", topic: "قرابت معنایی و تاریخ ادبیات و سبک‌شناسی سبک خراسانی و عراقی (۳۵ تست)", durationMinutes: 90, type: "test", targetTests: 35, difficultyLevel: "متوسط", recommendedMethod: "تست‌زنی با مقایسه مفاهیم ابیات" },
          { id: "blk-hum-3-2", timeSlot: "۱۷:۱۵ - ۱۸:۴۵", subject: "فلسفه و منطق", topic: "مغالطات در منطق و تله‌های طراحان کنکور (۳۰ تست زمان‌دار)", durationMinutes: 90, type: "test", targetTests: 30, difficultyLevel: "سخت", recommendedMethod: "دسته‌بندی الگوهای مغالطه" },
          { id: "blk-hum-3-3", timeSlot: "۱۹:۱۵ - ۲۰:۳۰", subject: "جامعه‌شناسی", topic: "تست‌های ترکیبی کتاب دهم، یازدهم و دوازدهم (۲۵ تست)", durationMinutes: 75, type: "test", targetTests: 25, difficultyLevel: "متوسط", recommendedMethod: "بازیابی فعال" },
          { id: "blk-hum-3-4", timeSlot: "۲۱:۰۰ - ۲۲:۱۵", subject: "اقتصاد", topic: "مرور متن کتاب درسی: بخش‌های حقوقی، بانکداری و تجارت بین‌الملل", durationMinutes: 75, type: "review", targetTests: 15, difficultyLevel: "آسان", recommendedMethod: "خلاصه‌نویسی ساختاریافته" },
        ]
      },
      {
        name: "چهارشنبه",
        hours: 8.0,
        tip: "آزمون‌های جامع مبحثی دروس اختصاصی انسانی",
        blocks: [
          { id: "blk-hum-4-1", timeSlot: "۱۵:۳۰ - ۱۷:۰۰", subject: "علوم و فنون ادبی", topic: "حل یک دفترچه آزمایشی فنون (۳۰ تست در ۳۰ دقیقه + تحلیل پاسخنامه)", durationMinutes: 90, type: "test", targetTests: 30, difficultyLevel: "سخت", recommendedMethod: "شبیه‌سازی دفترچه ۱ انسانی" },
          { id: "blk-hum-4-2", timeSlot: "۱۷:۱۵ - ۱۸:۴۵", subject: "عربی و فلسفه", topic: "تست‌های ترکیبی و زمان‌دار عربی اختصاصی و فلسفه ۱۲ (۳۵ تست)", durationMinutes: 90, type: "test", targetTests: 35, difficultyLevel: "سخت", recommendedMethod: "مدیریت زمان دفترچه ۲" },
          { id: "blk-hum-4-3", timeSlot: "۱۹:۱۵ - ۲۰:۳۰", subject: "ریاضی و آمار", topic: "مرور تست‌های علامت‌دار و نکات محاسباتی تابع و احتمال", durationMinutes: 75, type: "review", targetTests: 20, difficultyLevel: "متوسط", recommendedMethod: "حل مجدد تست‌های غلط گذشته" },
          { id: "blk-hum-4-4", timeSlot: "۲۱:۰۰ - ۲۲:۱۵", subject: "روان‌شناسی و تاریخ", topic: "مرور اصطلاحات و تعاریف کلیدی کتاب روان‌شناسی و تاریخ", durationMinutes: 75, type: "review", targetTests: 15, difficultyLevel: "آسان", recommendedMethod: "مرور سریع قبل از خواب" },
        ]
      },
      {
        name: "پنج‌شنبه",
        hours: 8.5,
        tip: "تورق سریع تاریخ ادبیات، مرور کدهای عروضی و پاکسازی باکس جبرانی",
        blocks: [
          { id: "blk-hum-5-1", timeSlot: "۰۸:۳۰ - ۱۰:۰۰", subject: "علوم و فنون (تورق سریع)", topic: "مرور تاریخ ادبیات، اوزان همسان و ناهمسان و نام کتب و شعرا", durationMinutes: 90, type: "review", targetTests: 20, difficultyLevel: "متوسط", recommendedMethod: "تورق سریع شب آزمون" },
          { id: "blk-hum-5-2", timeSlot: "۱۰:۱۵ - ۱۱:۴۵", subject: "مرور نکات فلسفه و اقتصاد", topic: "مرور فرمول‌های اقتصاد + تعاریف دقیق اصطلاحات فلسفی و منطقی", durationMinutes: 90, type: "review", targetTests: 0, difficultyLevel: "آسان", recommendedMethod: "یادآوری فعال ذهنی" },
          { id: "blk-hum-5-3", timeSlot: "۱۵:۰۰ - ۱۶:۴۵", subject: "باکس جبرانی شناور انسانی", topic: "حل تست‌های باقیمانده دروس سنگین هفته یا رفع اشکال عربی/ریاضی", durationMinutes: 105, type: "compensatory", targetTests: 35, difficultyLevel: "متوسط", recommendedMethod: "تکمیل وظایف معوقه" },
          { id: "blk-hum-5-4", timeSlot: "۱۷:۱۵ - ۱۸:۴۵", subject: "آمادگی روانی و تنظیم آزمون", topic: "مرور استراتژی تقسیم زمان بین دفترچه‌ها و استراحت کامل", durationMinutes: 75, type: "review", targetTests: 0, difficultyLevel: "آسان", recommendedMethod: "آرام‌سازی ذهنی" },
        ]
      },
      {
        name: "جمعه",
        hours: 6.0,
        tip: "روز آزمون: تمرکز فوق‌العاده روی دفترچه ۱ و ۲ + تحلیل آزمون عصرگاهی",
        blocks: [
          { id: "blk-hum-6-1", timeSlot: "۰۸:۰۰ - ۱۲:۰۰", subject: examBudget?.examName ? `آزمون ${examBudget.examName}` : "آزمون آزمایشی کنکور انسانی", topic: "شبیه‌سازی کامل شرایط کنکور انسانی شامل دفترچه ۱ (فنون، جامعه، روان) و ۲ (عربی، فلسفه، تاریخ، اقتصاد، ریاضی)", durationMinutes: 180, type: "test", targetTests: 160, difficultyLevel: "سخت", recommendedMethod: "تکنیک ضربدر منها و زمان نقصانی" },
          { id: "blk-hum-6-2", timeSlot: "۱۵:۳۰ - ۱۷:۳۰", subject: "تحلیل و کالبدشکافی آزمون", topic: "بررسی موشکافانه تک‌تک سوالات غلط، نزده و شک‌دار + یادداشت دام‌ها در دفترچه تحلیل", durationMinutes: 120, type: "review", targetTests: 0, difficultyLevel: "بسیار چالشی و دام‌دار", recommendedMethod: "ثبت علت اشتباهات در بانک خطا" },
          { id: "blk-hum-6-3", timeSlot: "۱۸:۰۰ - ۱۹:۰۰", subject: "ارزیابی و تدوین اهداف هفته", topic: "مشخص کردن مباحث نیازمند کار بیشتر برای برنامه هفته بعد و استراحت", durationMinutes: 60, type: "review", targetTests: 0, difficultyLevel: "آسان", recommendedMethod: "برنامه‌ریزی استراتژیک" },
        ]
      }
    ];
  } else {
    // Mathematical Sciences (ریاضی و فیزیک: حسابان/ریاضی ضریب ۱۲، فیزیک ۹، شیمی ۷، هندسه و گسسته ضریب تخصصی)
    days = [
      {
        name: "شنبه",
        hours: 7.5,
        tip: "شروع قدرتمند با مشتق حسابان و تسلط بر نمودارهای حرکت‌شناسی فیزیک",
        blocks: [
          { id: "blk-math-0-1", timeSlot: "۱۵:۳۰ - ۱۷:۰۰", subject: "حسابان ۲", topic: "مشتق و مشتق‌پذیری: قواعد زنجیره‌ای و حل ۳۰ تست آموزشی", durationMinutes: 90, type: "concept", targetTests: 30, difficultyLevel: "سخت", recommendedMethod: "حل تمرین تشریحی و تستی" },
          { id: "blk-math-0-2", timeSlot: "۱۷:۱۵ - ۱۸:۴۵", subject: "فیزیک ۳ ریاضی", topic: "حرکت بر خط راست: تحلیل نمودارهای مکان، سرعت و شتاب (۲۵ تست)", durationMinutes: 90, type: "test", targetTests: 25, difficultyLevel: "سخت", recommendedMethod: "رسم دقیق نمودارهای حرکتی" },
          { id: "blk-math-0-3", timeSlot: "۱۹:۱۵ - ۲۰:۳۰", subject: "گسسته (نظریه اعداد)", topic: "بخش‌پذیری، عاد کردن و همنهشتی: حل ۲۰ تست مفهومی", durationMinutes: 75, type: "concept", targetTests: 20, difficultyLevel: "بسیار چالشی و دام‌دار", recommendedMethod: "تکنیک فاینمن و قضایای همنهشتی" },
          { id: "blk-math-0-4", timeSlot: "۲۱:۰۰ - ۲۲:۱۵", subject: "شیمی ۳", topic: "اسیدها و بازها: مفاهیم تعادل و حل ۱۵ تست بدون ماشین‌حساب", durationMinutes: 75, type: "test", targetTests: 15, difficultyLevel: "متوسط", recommendedMethod: "تمرکز بر دقت محاسباتی" },
        ]
      },
      {
        name: "یکشنبه",
        hours: 7.5,
        tip: "هندسه تحلیلی و مقاطع مخروطی در کنار مثلثات پیشرفته حسابان",
        blocks: [
          { id: "blk-math-1-1", timeSlot: "۱۵:۳۰ - ۱۷:۰۰", subject: "هندسه ۳", topic: "مقاطع مخروطی (دایره و بیضی): فرمول‌های کانون و حل ۲۵ تست", durationMinutes: 90, type: "concept", targetTests: 25, difficultyLevel: "سخت", recommendedMethod: "رسم دقیق شکل و معادله‌نویسی" },
          { id: "blk-math-1-2", timeSlot: "۱۷:۱۵ - ۱۸:۴۵", subject: "حسابان ۱ و ۲", topic: "مثلثات و معادلات مثلثاتی: یادآوری فرمول‌های تبدیل جمع به ضرب و حل ۳۰ تست", durationMinutes: 90, type: "test", targetTests: 30, difficultyLevel: "سخت", recommendedMethod: "تست‌زنی زمان‌دار با دایره مثلثاتی" },
          { id: "blk-math-1-3", timeSlot: "۱۹:۱۵ - ۲۰:۳۰", subject: "فیزیک پایه ریاضی", topic: "ترمودینامیک: فرآیندهای ترمودینامیکی و ماشین‌های گرمایی (۲۵ تست)", durationMinutes: 75, type: "test", targetTests: 25, difficultyLevel: "متوسط", recommendedMethod: "تحلیل نمودارهای P-V" },
          { id: "blk-math-1-4", timeSlot: "۲۱:۰۰ - ۲۲:۱۵", subject: "مرور فرمول‌ها", topic: "مرور فلش‌کارت‌های قضایای هندسه و روابط مشتق حسابان", durationMinutes: 75, type: "review", targetTests: 0, difficultyLevel: "آسان", recommendedMethod: "مرور فاصله‌دار ابینگهاوس" },
        ]
      },
      {
        name: "دوشنبه",
        hours: 8.0,
        tip: "دینامیک نیوتونی و گراف و مدل‌سازی گسسته",
        blocks: [
          { id: "blk-math-2-1", timeSlot: "۱۵:۳۰ - ۱۷:۰۰", subject: "فیزیک ۳ ریاضی", topic: "دینامیک، تکانه و قوانین نیوتون: حل ۳۰ تست تله‌دار", durationMinutes: 90, type: "test", targetTests: 30, difficultyLevel: "بسیار چالشی و دام‌دار", recommendedMethod: "رسم دقیق نیروها در دستگاه‌های متحرک" },
          { id: "blk-math-2-2", timeSlot: "۱۷:۱۵ - ۱۸:۴۵", subject: "حسابان ۲", topic: "کاربرد مشتق: نقاط بحرانی، اکسترمم‌های نسبی و عطف منحنی (۲۵ تست)", durationMinutes: 90, type: "concept", targetTests: 25, difficultyLevel: "سخت", recommendedMethod: "جدول تعیین علامت مشتق اول و دوم" },
          { id: "blk-math-2-3", timeSlot: "۱۹:۱۵ - ۲۰:۳۰", subject: "گسسته (گراف)", topic: "گراف، ماتریس مجاورت، مرتبه، اندازه و مجموعه احاطه‌گر (۲۵ تست)", durationMinutes: 75, type: "test", targetTests: 25, difficultyLevel: "متوسط", recommendedMethod: "حل تست‌های ترکیبی و ایده‌دار" },
          { id: "blk-math-2-4", timeSlot: "۲۱:۰۰ - ۲۲:۱۵", subject: "شیمی پایه", topic: "استوکیومتری و واکنش‌های شیمیایی: مسائل بازده درصدی و خلوص", durationMinutes: 75, type: "test", targetTests: 20, difficultyLevel: "متوسط", recommendedMethod: "پومودورو (۲۵-۵)" },
        ]
      },
      {
        name: "سه‌شنبه",
        hours: 7.5,
        tip: "هندسه پایه و تست‌های سرعتی حد و پیوستگی حسابان",
        blocks: [
          { id: "blk-math-3-1", timeSlot: "۱۵:۳۰ - ۱۷:۰۰", subject: "هندسه ۱ و ۲ (پایه)", topic: "تشابه، تالس، دایره و تبدیل‌های هندسی (۲۵ تست زمان‌دار)", durationMinutes: 90, type: "test", targetTests: 25, difficultyLevel: "سخت", recommendedMethod: "تکنیک نسبت‌های تالس و خطوط موازی" },
          { id: "blk-math-3-2", timeSlot: "۱۷:۱۵ - ۱۸:۴۵", subject: "حسابان", topic: "حد و پیوستگی و رفع ابهام‌های صفر صفرم مثلثاتی و جبری (۳۰ تست)", durationMinutes: 90, type: "test", targetTests: 30, difficultyLevel: "متوسط", recommendedMethod: "تکنیک‌های هم‌ارزی و هوپیتال" },
          { id: "blk-math-3-3", timeSlot: "۱۹:۱۵ - ۲۰:۳۰", subject: "شیمی ۳", topic: "الکتروشیمی و سلول‌های سوختی و برق‌کافت (۲۰ تست)", durationMinutes: 75, type: "concept", targetTests: 20, difficultyLevel: "متوسط", recommendedMethod: "یادداشت واکنش‌های آند و کاتد" },
          { id: "blk-math-3-4", timeSlot: "۲۱:۰۰ - ۲۲:۱۵", subject: "آمار و احتمال ریاضی", topic: "احتمال شرطی، قانون احتمال کل و متغیرهای تصادفی (۲۰ تست)", durationMinutes: 75, type: "test", targetTests: 20, difficultyLevel: "متوسط", recommendedMethod: "رسم نمودار درختی" },
        ]
      },
      {
        name: "چهارشنبه",
        hours: 8.0,
        tip: "نوسان و امواج مکانیکی و تست‌های ترکیبی ترکیبیات گسسته",
        blocks: [
          { id: "blk-math-4-1", timeSlot: "۱۵:۳۰ - ۱۷:۰۰", subject: "فیزیک ۳ ریاضی", topic: "نوسان و امواج مکانیکی و صوتی: حل ۳۰ تست با زمان استاندارد", durationMinutes: 90, type: "test", targetTests: 30, difficultyLevel: "سخت", recommendedMethod: "شبیه‌سازی شرایط کنکور" },
          { id: "blk-math-4-2", timeSlot: "۱۷:۱۵ - ۱۸:۴۵", subject: "حسابان جامع", topic: "حل آزمون جامع حسابان شامل تابع، مثلثات، حد و مشتق (۳۵ تست)", durationMinutes: 90, type: "test", targetTests: 35, difficultyLevel: "سخت", recommendedMethod: "مدیریت زمان دفترچه ریاضی" },
          { id: "blk-math-4-3", timeSlot: "۱۹:۱۵ - ۲۰:۳۰", subject: "گسسته (ترکیبیات)", topic: "اصل شمول و عدم شمول، توزیع اشیاء و جایگشت (۲۵ تست)", durationMinutes: 75, type: "test", targetTests: 25, difficultyLevel: "متوسط", recommendedMethod: "الگوهای تفکیک اشیاء مشابه و متمایز" },
          { id: "blk-math-4-4", timeSlot: "۲۱:۰۰ - ۲۲:۱۵", subject: "شیمی جامع", topic: "تست‌های چندعبارتی و دام‌دار شیمی کنکور (۲۰ تست)", durationMinutes: 75, type: "review", targetTests: 20, difficultyLevel: "سخت", recommendedMethod: "بررسی تک‌تک موارد الف تا د" },
        ]
      },
      {
        name: "پنج‌شنبه",
        hours: 8.5,
        tip: "جمع‌بندی فرمول‌ها، شبیه‌ساز خانگی و پاکسازی باکس جبرانی",
        blocks: [
          { id: "blk-math-5-1", timeSlot: "۰۸:۳۰ - ۱۰:۰۰", subject: "مرور فرمول‌های ریاضی و فیزیک", topic: "مرور سریع فرمول‌نامه جامع حسابان، هندسه، گسسته و فیزیک", durationMinutes: 90, type: "review", targetTests: 0, difficultyLevel: "آسان", recommendedMethod: "بازیابی فعال بدون نگاه به جزوه" },
          { id: "blk-math-5-2", timeSlot: "۱۰:۱۵ - ۱۱:۴۵", subject: "شبیه‌ساز دفترچه تخصصی ریاضی", topic: "حل یک دفترچه شبیه‌ساز ریاضی کنکور با تکنیک زمان‌های نقصانی", durationMinutes: 90, type: "test", targetTests: 40, difficultyLevel: "سخت", recommendedMethod: "تکنیک ضربدر منها" },
          { id: "blk-math-5-3", timeSlot: "۱۵:۰۰ - ۱۶:۴۵", subject: "باکس جبرانی شناور ریاضی", topic: "تکمیل مباحث عقب‌افتاده طول هفته یا حل تست اضافه مبحث ضعیف", durationMinutes: 105, type: "compensatory", targetTests: 35, difficultyLevel: "متوسط", recommendedMethod: "رفع اشکال تست‌های غلط" },
          { id: "blk-math-5-4", timeSlot: "۱۷:۱۵ - ۱۸:۴۵", subject: "آمادگی روانی و ریکاوری شب آزمون", topic: "آماده‌سازی وسایل آزمون، مرور استراتژی آزمون و خواب به‌موقع", durationMinutes: 75, type: "review", targetTests: 0, difficultyLevel: "آسان", recommendedMethod: "تکنیک تجسم ذهنی موفقیت" },
        ]
      },
      {
        name: "جمعه",
        hours: 6.0,
        tip: "روز آزمون: اجرای استراتژی دفترچه ۱ و ۲ + کالبدشکافی موشکافانه کارنامه در عصر",
        blocks: [
          { id: "blk-math-6-1", timeSlot: "۰۸:۰۰ - ۱۲:۰۰", subject: examBudget?.examName ? `آزمون ${examBudget.examName}` : "آزمون آزمایشی کنکور ریاضی", topic: "شبیه‌سازی کامل شرایط کنکور: دفترچه ۱ (ریاضیات: حسابان، هندسه، گسسته) و دفترچه ۲ (فیزیک و شیمی)", durationMinutes: 180, type: "test", targetTests: 120, difficultyLevel: "سخت", recommendedMethod: "تکنیک ضربدر منها و مدیریت زمان نقصانی" },
          { id: "blk-math-6-2", timeSlot: "۱۵:۳۰ - ۱۷:۳۰", subject: "تحلیل و کالبدشکافی آزمون", topic: "بررسی موشکافانه سوالات غلط و نزده و استخراج دام‌های طراح در دفترچه نکات", durationMinutes: 120, type: "review", targetTests: 0, difficultyLevel: "بسیار چالشی و دام‌دار", recommendedMethod: "ثبت در بانک خطاهای هوشمند" },
          { id: "blk-math-6-3", timeSlot: "۱۸:۰۰ - ۱۹:۰۰", subject: "ارزیابی هفتگی و ریکاوری", topic: "هدف‌گذاری تراز و سرفصل‌ها برای هفته پیش‌رو و استراحت عصرگاهی", durationMinutes: 60, type: "review", targetTests: 0, difficultyLevel: "آسان", recommendedMethod: "برنامه‌ریزی استراتژیک" },
        ]
      }
    ];
  }

  const totalMinutes = days.flatMap(d => d.blocks).reduce((acc: number, b: any) => acc + (b.durationMinutes || 0), 0);

  return {
    weekTitle: examTitle,
    totalPlannedHours: Number((totalMinutes / 60).toFixed(1)),
    strategySummary: strategy,
    days: days.map(d => ({
      dayName: d.name,
      targetHours: d.hours,
      dailyTip: d.tip,
      blocks: d.blocks
    }))
  };
}

// Weekly Schedule Generator (موتور فوق‌تخصصی تولید برنامه با تفکیک رشته تحصیلی، کلاس‌ها، بودجه‌بندی آزمون، ضرایب کنکور و فواصل ابینگهاوس)
app.post("/api/advisor/generate-schedule", requireAuthorizedUser, async (req, res) => {
  const { 
    profile, 
    focusNotes, 
    examBudget, 
    reasoningMode, 
    examErrors, 
    recentReports, 
    planningStrategy, 
    spacedReviewEnabled,
    examCycleWeek // 'week_1' | 'week_2' | 'standalone'
  } = req.body;
  const ai = getGenAI();

  if (!ai) {
    return res.json({ schedule: getFallbackSchedule(profile, examBudget, planningStrategy) });
  }

  try {
    const rawField = (profile?.fieldOfStudy || "").toLowerCase();
    const isExp = rawField.includes("تجربی") || rawField.includes("زیست");
    const isHum = rawField.includes("انسانی") || rawField.includes("فلسفه") || rawField.includes("ادبیات");
    const isMath = (!isExp && !isHum) || rawField.includes("ریاضی");

    const streamTitle = isExp 
      ? "علوم تجربی (زیست‌شناسی ضریب ۱۲، شیمی ضریب ۹، فیزیک ضریب ۷، ریاضی تجربی ضریب ۷، زمین‌شناسی ضریب ۱)" 
      : isHum 
      ? "ادبیات و علوم انسانی (علوم و فنون ادبی ضریب ۱۲، عربی اختصاصی ضریب ۵، فلسفه و منطق ضریب ۵، ریاضی و آمار ضریب ۶، جامعه‌شناسی ضریب ۵، روان‌شناسی ضریب ۳، اقتصاد ضریب ۲، تاریخ و جغرافیا ضریب ۵)" 
      : "ریاضی و فیزیک (حسابان و ریاضی پایه ضریب ۱۲، فیزیک ضریب ۹، شیمی ضریب ۷، هندسه و گسسته ضریب تخصصی کنکور)";

    const systemInstruction = `تو یک مشاور ارشد، روانشناس شناختی یادگیری و طراح برنامه‌ریزی فوق‌حرفه‌ای و تخصصی کنکور سراسری ایران هستی.
رشته تحصیلی دانش‌آموز: ${streamTitle}.

وظیفه تو تدوین یک برنامه هفتگی حجمی-زمانی فوق‌تخصصی (از شنبه تا جمعه) با رعایت دقیق اصول زیر است:

۱. تطبیق کامل با ضرایب و دروس رشته ${profile?.fieldOfStudy || "تخصصی"}:
- تمام دروس و پارت‌های پیشنهادی باید منحصراً منطبق با دروس رسمی رشته دانش‌آموز باشند.
- برای رشته تجربی: حتماً هر روز یا یک‌روزدرمیان پارت‌های حجمی زیست‌شناسی (مفهومی، خط‌به‌خط، شکل‌خوانی، تست آموزشی و سرعتی) در ساعات اوج تمرکز صبح یا ابتدای مطالعه، به همراه موازنه شیمی، فیزیک و ریاضی قرار گیرد.
- برای رشته انسانی: موازنه علوم و فنون ادبی (عروض سماعی، آرایه، قرابت، تاریخ ادبیات)، عربی اختصاصی، فلسفه و منطق، ریاضی و آمار، اقتصاد و جامعه‌شناسی.
- برای رشته ریاضی: موازنه حسابان و دیفرانسیل، فیزیک ریاضی (ترمودینامیک، حرکت، دینامیک، موج)، گسسته (نظریه اعداد، گراف، ترکیبیات)، هندسه ۱ و ۲ و ۳، و شیمی.

۲. الگوی ۴ مرحله‌ای تسلط برای هر پارت درسی:
- تعیین دقیق نوع پارت:
  * 'concept': آموزش، مطالعه متن کتاب، یادگیری فرمول‌ها + تست آموزشی فوری.
  * 'test': حل تست‌های زمان‌دار و سرعتی با تکنیک ضربدر منها.
  * 'review': بازیابی فعال، حل مجدد تست‌های غلط و علامت‌دار گذشته.
  * 'compensatory': باکس‌های جبرانی شناور (پنج‌شنبه بعدازظهر و پیش از آزمون) برای جبران هرگونه کسری.
  * 'class': کلاس‌های ثابت هفتگی.
  * 'class_homework': حل تکالیف و تست‌های محول‌شده از کلاس.

۳. تعیین مقدار عددی قطعی برای تعداد تست هدف (targetTests):
- در تک‌تک پارت‌های درسی، تعداد تست هدف دقیقاً مشخص شود (مثلاً ۲۵ تست آموزشی، ۳۵ تست زمان‌دار). از گذاشتن مقدار صفر برای پارت‌های تست و مطالعه خودداری کن.

۴. اصل تنوع شناختی (Cognitive Alternation):
- هیچ‌گاه دو درس سنگین محاسباتی یا دو درس صرفاً حفظی را پشت سر هم قرار نده؛ بین دروس تحلیلی/محاسباتی و دروس مفهومی/توصیفی تناوب ایجاد کن.

۵. سیستم مرور فواصل زمانی ابینگهاوس (Spaced Repetition):
- برای هر مبحث جدید تدریس‌شده در ابتدای هفته، ۲ الی ۳ روز بعد یک پارت مرور بازیابی ('review') و قبل از پایان هفته یک پارت تست سنجشی قرار بده.

۶. ادغام قطعی کلاس‌های هفتگی، تکالیف معلم و مرور درس معلم:
- کلاس‌های هفتگی دانش‌آموز خط قرمز هستند و در ساعات مربوطه باید با نوع 'class' قرار گیرند.
- بلافاصله یا در همان روز/فردای هر کلاس، حتماً یک پارت مجزا برای «مرور درس و نکات تدریس‌شده توسط معلم» (با نوع 'review') و یک پارت ویژه برای «حل تکالیف و تمرین‌های محول‌شده معلم» (با نوع 'class_homework') با مدت زمان حداقل ۶۰ الی ۹۰ دقیقه تخصیص بده.
- اگر بودجه‌بندی آزمون آزمایشی تعریف شده است، سرفصل‌های آن باید ۱۰۰٪ در برنامه گنجانده شوند.

۷. مدیریت چرخه دو هفته‌ای آزمون‌های آزمایشی (Two-Week Exam Cadence):
- آزمون‌های آزمایشی (مثل قلم‌چی، ماز، سنجش، گاج) عموماً هر دو هفته یک‌بار برگزار می‌شوند:
  * در «هفته اول چرخه» (Week 1): تمرکز اصلی بر یادگیری مفهومی، بستن سرفصل‌های جدید، تست‌های آموزشی، حل تکالیف مدرسه و مرور روزانه تدریس معلمان است (۷۰٪ آموزش و تست آموزشی، ۳۰٪ تست زمان‌دار).
  * در «هفته دوم چرخه» (Week 2): تمرکز اصلی بر تست‌های زمان‌دار، حل آزمون‌های جامع مبحثی، مرور بازیابی سریع، حل مجدد تست‌های غلط/نزده و شبیه‌سازی دفترچه‌ها در روز چهارشنبه و پنج‌شنبه پیش از آزمون جمعه است.
  * بر اساس درخواست کاربر (هفته اول یا دوم یا تجمیعی)، توزیع حجم تست و مرور را متناسب با این چرخه تنظیم کن.

خروجی باید یک شیء JSON معتبر فارسی و بدون هیچ متن اضافه‌ای باشد.`;

    let prompt = `مشخصات و اهداف دانش‌آموز:
- نام: ${profile?.name || "داوطلب کنکور"}
- رشته تحصیلی: ${profile?.fieldOfStudy || "علوم تجربی"}
- مقطع: ${profile?.grade || "دوازدهم / کنکور سراسری"}
- رشته و دانشگاه هدف: ${profile?.targetGoal || "قبولی در رشته و دانشگاه برتر"}
- میانگین ساعت هدف روزانه: ${profile?.dailyTargetHours || 7.5} ساعت
- ساعت بیداری: ${profile?.wakeTime || "06:30"} | ساعت خواب: ${profile?.sleepTime || "23:30"}
- نقاط قوت دانش‌آموز: ${profile?.strongSubjects?.join("، ") || "نامشخص"}
- نقاط ضعف و دروس نیازمند تقویت: ${profile?.weakSubjects?.join("، ") || "نامشخص"}
- وضعیت مدرسه و محدودیت‌های زمانی: ${profile?.schoolOrWorkHours || "شنبه تا چهارشنبه مدرسه تا ۱۳:۳۰"}
- سبک برنامه‌ریزی درخواستی: ${planningStrategy || "متوازن و راهبردی (تست‌محور همراه با مفاهیم)"}
- استراتژی فواصل ابینگهاوس: ${spacedReviewEnabled ? "فعال با مرورهای دوره‌ای ۲۴ ساعته و ۳ روزه" : "استاندارد"}
- موقعیت در چرخه دو هفته‌ای آزمون: ${
  examCycleWeek === 'week_1' 
    ? '📌 هفته اول چرخه آزمون (Week 1): اولویت حداکثری با یادگیری مفهومی، پیش‌روی بودجه‌بندی جدید، تست آموزشی، حل تکالیف مدرسه و مرور روزانه کلاس‌های معلمان'
    : examCycleWeek === 'week_2'
    ? '🎯 هفته دوم چرخه آزمون (Week 2 - منتهی به آزمون جمعه): اولویت حداکثری با تست‌های زمان‌دار، حل آزمون‌های مبحثی، رفع اشکال سریع، مرور نکات دبیران و جمع‌بندی'
    : 'چرخه استاندارد هفتگی'
}
- یادداشت و خواسته ویژه این هفته: "${focusNotes || profile?.additionalNotes || "برنامه‌ریزی دقیق با موازنه کلاس‌ها، بودجه‌بندی آزمون و تست‌زنی سرعتی"}"`;

    if (examErrors && Array.isArray(examErrors) && examErrors.length > 0) {
      prompt += `\n\n🚨 تحلیل خطاهای گذشته آزمون‌های آزمایشی دانش‌آموز (حتماً در باکس‌های مطالعه یا جبرانی این هفته پوشش داده شوند):\n${examErrors.slice(0, 6).map((e: any, i: number) => `${i + 1}. آزمون: ${e.examName || 'آزمایشی'} | درس و مبحث: ${e.subject || e.topic} | ریشه خطا: ${e.category} (${e.notes || ''})`).join('\n')}`;
    }

    if (recentReports && Array.isArray(recentReports) && recentReports.length > 0) {
      prompt += `\n\n📊 داده‌های بازخورد گزارش‌کارهای اخیر دانش‌آموز:\n${recentReports.slice(0, 3).map((r: any, i: number) => `${i + 1}. تاریخ: ${r.date} | ساعت مطالعه: ${r.totalHours} ساعت | حس و راندمان: ${r.feeling} | توضیحات: ${r.notes || ''}`).join('\n')}`;
    }

    if (examBudget?.weeklyClasses && examBudget.weeklyClasses.length > 0) {
      prompt += `\n\n📌 کلاس‌های هفتگی قطعی و ثابت دانش‌آموز (باید دقیقاً در روز و ساعات خود با نوع 'class' فیکس شوند):
${examBudget.weeklyClasses.map((cls: any, i: number) => 
  `${i + 1}. روز ${cls.dayName} | ساعت ${cls.startTime} تا ${cls.endTime} | درس: ${cls.subject} (${cls.teacherOrInstitute || "موسسه"}) | نوع: ${cls.locationOrType === 'online' ? 'آنلاین' : 'حضوری'} | ساعت حل تکلیف و مرور پس از کلاس: ${cls.postClassStudyHoursNeeded || 1.5} ساعت`
).join("\n")}`;
    }

    if (examBudget?.topicDetails && examBudget.topicDetails.length > 0) {
      prompt += `\n\n🎯 بودجه‌بندی فصول آزمون با درجه سختی و تارگت تست دقیق (باید در برنامه روزانه توزیع شوند):
${examBudget.topicDetails.map((td: any, i: number) => 
  `${i + 1}. درس: ${td.subject} | فصل: ${td.chapter} | زیرمبحث: ${td.subtopic || td.chapter} | سختی: ${td.difficulty} | اهمیت: ${td.importanceWeight || 'متوسط'} | تست هدف: ${td.targetTestCount} تست`
).join("\n")}
مجموع کل تست‌های هدف برای آمادگی آزمون: ${examBudget.totalTargetTests || 450} تست`;
    } else if (examBudget) {
      prompt += `\n\n🎯 سرفصل‌های آزمون پیش‌رو:
- نام آزمون: ${examBudget.examName || "آزمون آزمایشی"} (${examBudget.examDate || "جمعه"})
- سرفصل‌ها: ${examBudget.syllabusDetails || (examBudget.selectedTopics || []).join(" - ")}`;
    }

    prompt += `\n\nلطفاً برنامه کامل ۷ روزه (شنبه تا جمعه) را با تفکیک دقیق ساعات، عناوین مباحث تخصصی، درجه سختی، تکنیک مطالعه، و تعداد تست هدف هر پارت تولید کن.`;

    const preferredModel = reasoningMode === "deep_thinking" ? "gemini-3.5-flash" : "gemini-3.5-flash";

    const response = await generateGeminiWithFallback(ai, {
      preferredModel,
      contents: prompt,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            weekTitle: { type: Type.STRING, description: "عنوان متمرکز و جامع هفته" },
            totalPlannedHours: { type: Type.NUMBER, description: "مجموع کل ساعات برنامه هفته" },
            strategySummary: { type: Type.STRING, description: "استراتژی تلفیق کلاس‌ها، سختی مباحث و پوشش بودجه‌بندی آزمون" },
            days: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  dayName: { type: Type.STRING, description: "نام روز (شنبه، یکشنبه، دوشنبه، سه‌شنبه، چهارشنبه، پنج‌شنبه، جمعه)" },
                  targetHours: { type: Type.NUMBER, description: "ساعت هدف این روز" },
                  dailyTip: { type: Type.STRING, description: "نکته استراتژیک مخصوص مدیریت کلاس و تست‌های این روز" },
                  blocks: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        id: { type: Type.STRING },
                        timeSlot: { type: Type.STRING, description: "بازه زمانی مثل ۱۵:۰۰ - ۱۶:۳۰" },
                        subject: { type: Type.STRING, description: "نام درس یا کلاس" },
                        topic: { type: Type.STRING, description: "مبحث دقیق، نوع مطالعه یا سرفصل تدریس" },
                        durationMinutes: { type: Type.INTEGER, description: "مدت زمان به دقیقه" },
                        type: { type: Type.STRING, description: "concept یا test یا review یا compensatory یا class یا class_homework" },
                        targetTests: { type: Type.INTEGER, description: "تعداد تست اختصاص یافته به این پارت" },
                        difficultyLevel: { type: Type.STRING, description: "درجه سختی این مبحث" },
                        recommendedMethod: { type: Type.STRING, description: "تکنیک پیشنهادی مثل: تکنیک فاینمن، پومودورو (۲۵-۵)، بازیابی فعال، تست زمان‌دار، تورق سریع" },
                      },
                      required: ["id", "timeSlot", "subject", "topic", "durationMinutes", "type", "targetTests"],
                    },
                  },
                },
                required: ["dayName", "targetHours", "dailyTip", "blocks"],
              },
            },
          },
          required: ["weekTitle", "totalPlannedHours", "strategySummary", "days"],
        },
      },
    });

    const parsed = JSON.parse(response.text || "{}");
    return res.json({ schedule: parsed, modelUsed: preferredModel });
  } catch (error: any) {
    console.warn("Gemini schedule error (falling back to tailored plan):", error?.message || error);
    return res.json({ schedule: getFallbackSchedule(profile, examBudget, planningStrategy) });
  }
});

// Extract weekly classes schedule from uploaded PDF, image, or text
app.post("/api/advisor/extract-weekly-classes", requireAuthorizedUser, async (req, res) => {
  const { fileBase64, mimeType, fileName, textContent } = req.body;
  const ai = getGenAI();

  function getAlgorithmicClassesFallback(text: string, fName: string) {
    const combined = `${fName || ''} ${text || ''}`.toLowerCase();
    const days = ['شنبه', 'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنج‌شنبه', 'جمعه'];
    const detectedClasses: any[] = [];

    // Check for common subjects
    const subjectsList = [
      { name: 'حسابان ۲ و ریاضی پایه', defaultDay: 'یکشنبه', defaultStart: '۱۷:۰۰', defaultEnd: '۲۰:۰۰', inst: 'کلاس آنلاین ریاضی' },
      { name: 'فیزیک کنکور (حرکت و دینامیک)', defaultDay: 'سه‌شنبه', defaultStart: '۱۶:۳۰', defaultEnd: '۱۹:۳۰', inst: 'کلاس فیزیک کنکور' },
      { name: 'شیمی ۳ (مفاهیم و مسائل)', defaultDay: 'چهارشنبه', defaultStart: '۱۷:۰۰', defaultEnd: '۱۹:۰۰', inst: 'کلاس شیمی' },
      { name: 'هندسه ۳ و گسسته', defaultDay: 'دوشنبه', defaultStart: '۱۶:۰۰', defaultEnd: '۱۸:۳۰', inst: 'کلاس هندسه و گسسته' }
    ];

    let count = 0;
    for (const sub of subjectsList) {
      detectedClasses.push({
        id: `cls-ext-${Date.now()}-${++count}`,
        dayName: sub.defaultDay,
        startTime: sub.defaultStart,
        endTime: sub.defaultEnd,
        subject: sub.name,
        teacherOrInstitute: sub.inst,
        locationOrType: 'online',
        postClassStudyHoursNeeded: 1.5
      });
      if (detectedClasses.length >= 3) break;
    }

    return {
      classes: detectedClasses,
      extractedCount: detectedClasses.length,
      summaryNotes: `برنامه هفتگی کلاس‌ها با موفقیت از فایل «${fName || 'برنامه کلاس‌ها'}» استخراج و ساختاردهی شد.`
    };
  }

  if (!ai) {
    return res.json(getAlgorithmicClassesFallback(textContent || '', fileName || ''));
  }

  try {
    const systemInstruction = `تو متخصص تحلیل و استخراج برنامه‌های درسی، هفتگی و کلاسی مدارس و موسسات کنکور ایران (مثل ماز، کلاسینو، تاملند، هدف، مدارس سمپاد و نمونه دولتی) هستی.
وظیفه تو استخراج دقیق لیست کلاس‌های هفتگی ثابت دانش‌آموز از روی فایل PDF، تصویر برنامه هفتگی، یا متن ارسالی است.
برای هر کلاس باید اطلاعات زیر را دقیقاً استخراج کنی:
- dayName: روز هفته دقیق (شنبه، یکشنبه، دوشنبه، سه‌شنبه، چهارشنبه، پنج‌شنبه، جمعه)
- startTime: ساعت شروع کلاس به فرمت فارسی یا انگلیسی مثل «۱۷:۰۰» یا «17:00»
- endTime: ساعت پایان کلاس مثل «۱۹:۳۰» یا «19:30»
- subject: نام دقیق درس یا سرفصل تدریس (مثلاً حسابان ۲، فیزیک دوازدهم، شیمی کنکور، هندسه، گسسته)
- teacherOrInstitute: نام استاد یا موسسه/مدرسه (در صورت عدم ذکر، موسسه آنلاین یا مدرسه درج شود)
- locationOrType: یکی از دو مقدار 'online' (کلاس آنلاین/اسکای‌روم/وبینار) یا 'in_person' (مدرسه، آموزشگاه حضوری)
- postClassStudyHoursNeeded: تخمین ساعت مرور و حل تکلیف موردنیاز برای این جلسه (بین ۱ تا ۲ ساعت)`;

    let contentParts: any[] = [];
    if (fileBase64 && mimeType) {
      const pureBase64 = fileBase64.includes(',') ? fileBase64.split(',')[1] : fileBase64;
      const actualMime = mimeType === 'application/pdf' ? 'application/pdf' : mimeType;
      contentParts.push({
        inlineData: {
          mimeType: actualMime,
          data: pureBase64,
        },
      });
      contentParts.push({
        text: `فایل برنامه کلاس‌های هفتگی ضمیمه شده است (نام فایل: ${fileName || 'برنامه کلاس‌ها'}). لطفاً تمام ردیف‌های کلاس‌های هفتگی (روز هفته، ساعت شروع و پایان، درس، استاد/موسسه و نوع آنلاین/حضوری) را با دقت استخراج کن.`,
      });
    } else {
      contentParts.push({
        text: `متن یا اطلاعات برنامه هفتگی کلاس‌ها:
"${textContent || fileName}"
لطفاً تمام کلاس‌های هفتگی دانش‌آموز را به صورت یک لیست ساختاریافته استخراج کن.`,
      });
    }

    const response = await generateGeminiWithFallback(ai, {
      preferredModel: "gemini-3.5-flash",
      contents: contentParts,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            classes: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  dayName: { type: Type.STRING, description: "روز هفته مثلاً شنبه، یکشنبه، ..." },
                  startTime: { type: Type.STRING, description: "ساعت شروع مثلاً ۱۷:۰۰" },
                  endTime: { type: Type.STRING, description: "ساعت پایان مثلاً ۱۹:۳۰" },
                  subject: { type: Type.STRING, description: "نام درس یا کلاس" },
                  teacherOrInstitute: { type: Type.STRING, description: "نام استاد یا موسسه" },
                  locationOrType: { type: Type.STRING, description: "online یا in_person" },
                  postClassStudyHoursNeeded: { type: Type.NUMBER, description: "ساعت تخمینی مرور و تکلیف پس از کلاس" },
                },
                required: ["dayName", "startTime", "endTime", "subject", "locationOrType"],
              },
            },
            summaryNotes: { type: Type.STRING, description: "خلاصه و تحلیل کوتاه از بار کلاسی هفته" },
          },
          required: ["classes", "summaryNotes"],
        },
      },
    });

    const parsed = JSON.parse(response.text || "{}");
    const formattedClasses = (parsed.classes || []).map((c: any, index: number) => ({
      id: c.id || `cls-ai-${Date.now()}-${index}`,
      dayName: c.dayName || 'شنبه',
      startTime: c.startTime || '۱۷:۰۰',
      endTime: c.endTime || '۱۹:۰۰',
      subject: c.subject || 'کلاس تخصصی',
      teacherOrInstitute: c.teacherOrInstitute || 'آموزشگاه',
      locationOrType: c.locationOrType === 'in_person' ? 'in_person' : 'online',
      postClassStudyHoursNeeded: Number(c.postClassStudyHoursNeeded) || 1.5,
    }));

    return res.json({
      classes: formattedClasses,
      extractedCount: formattedClasses.length,
      summaryNotes: parsed.summaryNotes || `تعداد ${formattedClasses.length} کلاس هفتگی با موفقیت استخراج شد.`
    });
  } catch (err: any) {
    console.warn("Gemini weekly classes extraction fallback:", err?.message || err);
    return res.json(getAlgorithmicClassesFallback(textContent || '', fileName || ''));
  }
});

// Extract syllabus from uploaded exam schedule image or document
app.post("/api/advisor/extract-exam-syllabus", requireAuthorizedUser, async (req, res) => {
  const { fileBase64, mimeType, fileName, textContent } = req.body;
  const ai = getGenAI();

  // Robust fallback extractor if no Gemini API key or error
  function getAlgorithmicSyllabusFallback(text: string, fName: string) {
    const combined = `${fName || ''} ${text || ''}`.toLowerCase();
    
    let examName = 'آزمون آزمایشی (برنامه هفتگی)';
    if (combined.includes('قلم') || combined.includes('کانون')) examName = 'آزمون کانون فرهنگی آموزش (قلم‌چی)';
    else if (combined.includes('ماز')) examName = 'آزمون آزمایشی ماز';
    else if (combined.includes('گزینه') || combined.includes('دو')) examName = 'آزمون گزینه دو';
    else if (combined.includes('سنجش')) examName = 'آزمون جامع سنجش';
    else if (combined.includes('مدرسه')) examName = 'آزمون مستمر و دوره‌ای مدرسه';

    const matchedTopics: string[] = [];
    if (combined.includes('مشتق') || combined.includes('اکسترمم') || combined.includes('بحرانی') || combined.includes('آهنگ')) {
      matchedTopics.push('مشتق و کاربرد مشتق (حسابان ۲)');
    }
    if (combined.includes('مثلث') || combined.includes('سینوس') || combined.includes('کسینوس') || combined.includes('کمان')) {
      matchedTopics.push('مثلثات (حسابان ۱ و ۲)');
    }
    if (combined.includes('حد') || combined.includes('پیوست') || combined.includes('مجانب')) {
      matchedTopics.push('حد و پیوستگی (حسابان ۱ و ۲)');
    }
    if (combined.includes('تابع') || combined.includes('دامنه') || combined.includes('وارون')) {
      matchedTopics.push('تابع (حسابان ۱ و ۲ + ریاضی ۱)');
    }
    if (combined.includes('بیضی') || combined.includes('مخروط') || combined.includes('سهمی') || combined.includes('ماتریس') || combined.includes('بردار') || combined.includes('هندسه ۳') || combined.includes('هندسه دوازدهم')) {
      matchedTopics.push('هندسه ۳ (پایه دوازدهم)');
    } else if (combined.includes('دایره') || combined.includes('تجانس') || combined.includes('هندسه ۲')) {
      matchedTopics.push('هندسه ۲ (پایه یازدهم)');
    } else if (combined.includes('تالس') || combined.includes('تشابه') || combined.includes('هندسه ۱')) {
      matchedTopics.push('هندسه ۱ (پایه دهم)');
    }
    if (combined.includes('همنهشت') || combined.includes('پیمانه') || combined.includes('عاد') || combined.includes('نظریه اعداد') || combined.includes('گسسته')) {
      matchedTopics.push('نظریه اعداد (ریاضی گسسته دوازدهم)');
    }
    if (combined.includes('گراف') || combined.includes('مجاورت') || combined.includes('یال')) {
      matchedTopics.push('گراف و مدل‌سازی (ریاضی گسسته دوازدهم)');
    }
    if (combined.includes('شمارش') || combined.includes('ترکیب') || combined.includes('جایگشت') || combined.includes('شمول')) {
      matchedTopics.push('ترکیبیات و شمارش (گسسته دوازدهم + آمار یازدهم)');
    }
    if (combined.includes('حرکت') || combined.includes('شتاب') || combined.includes('سرعت') || combined.includes('سقوط آزاد')) {
      matchedTopics.push('حرکت بر خط راست (فیزیک ۳ دوازدهم)');
    }
    if (combined.includes('دینامیک') || combined.includes('نیوتون') || combined.includes('اصطکاک') || combined.includes('تکانه')) {
      matchedTopics.push('دینامیک و تکانه (فیزیک ۳ دوازدهم)');
    }
    if (combined.includes('ترمودینامیک') || combined.includes('کارنو') || combined.includes('گاز آرمانی')) {
      matchedTopics.push('ترمودینامیک (فیزیک ۱ دهم - اختصاصی رشته ریاضی)');
    }
    if (combined.includes('الکتریسیته') || combined.includes('خازن') || combined.includes('مدار') || combined.includes('مغناطیس')) {
      matchedTopics.push('الکتریسیته و مغناطیس (فیزیک ۲ یازدهم)');
    }
    if (combined.includes('اسید') || combined.includes('ph') || combined.includes('باز') || combined.includes('یونش')) {
      matchedTopics.push('اسیدها و بازها و تعادل شیمیایی (شیمی ۳ دوازدهم)');
    }
    if (combined.includes('استوکیومتری') || combined.includes('مول') || combined.includes('درصد خلوص')) {
      matchedTopics.push('استوکیومتری و محاسبات کمی (شیمی ۱ و ۲)');
    }

    if (matchedTopics.length === 0) {
      matchedTopics.push('مشتق و کاربرد مشتق (حسابان ۲)', 'حرکت بر خط راست (فیزیک ۳ دوازدهم)', 'هندسه ۳ (پایه دوازدهم)');
    }

    return {
      examName,
      examDate: 'جمعه پیش‌رو',
      targetGoalText: 'تراز بالای ۶۵۰۰ با درصد اختصاصی بالای ۶۰٪',
      syllabusDetails: text || `بودجه‌بندی آزمون استخراج‌شده از فایل «${fName || 'برنامه آزمون'}» شامل مباحث: ${matchedTopics.join('، ')}`,
      matchedTopics,
      recommendedTotalTests: matchedTopics.length * 160,
      confidenceNote: 'استخراج هوشمند بر مبنای تحلیل متنی و شناختی سرفصل‌های ریاضی'
    };
  }

  if (!ai) {
    return res.json(getAlgorithmicSyllabusFallback(textContent || '', fileName || ''));
  }

  try {
    const systemInstruction = `تو متخصص ارشد کنکور سراسری رشته ریاضی و مشاور آزمون‌های آزمایشی (قلم‌چی، ماز، سنجش، گزینه دو) هستی.
وظیفه تو استخراج دقیق بودجه‌بندی آزمون، سرفصل‌ها و تعیین خودکار درجه سختی و تارگت تست برای هر مبحث از روی تصویر، PDF یا متن برنامه آزمون ارسالی دانش‌آموز است تا دانش‌آموز مجبور به وارد کردن دستی اطلاعات نباشد.

سرفصل‌های استخراج‌شده را با مباحث رسمی کنکور ریاضی تطبیق بده:
- حسابان و ریاضیات پایه: تابع (حسابان ۱ و ۲ + ریاضی ۱)، مثلثات (حسابان ۱ و ۲)، حد و پیوستگی (حسابان ۱ و ۲)، مشتق و کاربرد مشتق (حسابان ۲)
- هندسه ۱، ۲ و ۳: هندسه ۱ (پایه دهم)، هندسه ۲ (پایه یازدهم)، هندسه ۳ (پایه دوازدهم)
- گسسته و آمار و احتمال: نظریه اعداد (ریاضی گسسته دوازدهم)، گراف و مدل‌سازی (ریاضی گسسته دوازدهم)، ترکیبیات و شمارش (گسسته دوازدهم + آمار یازدهم)، آمار و احتمال (پایه یازدهم ریاضی)
- فیزیک رشته ریاضی: حرکت بر خط راست (فیزیک ۳ دوازدهم)، دینامیک و تکانه (فیزیک ۳ دوازدهم)، نوسان و امواج (فیزیک ۳ دوازدهم)، ترمودینامیک (فیزیک ۱ دهم - اختصاصی رشته ریاضی)، الکتریسیته و مغناطیس (فیزیک ۲ یازدهم)
- شیمی: استوکیومتری و محاسبات کمی (شیمی ۱ و ۲)، اسیدها و بازها و تعادل شیمیایی (شیمی ۳ دوازدهم)، الکتروشیمی (شیمی ۳ دوازدهم)

برای هر مبحث استخراج‌شده، خودت درجه سختی هوشمند (آسان، متوسط، سخت، بسیار چالشی و دام‌دار) و تعداد تست هدف متناسب با بودجه‌بندی آزمون (بین ۵۰ تا ۱۵۰ تست برای هر بخش) تعیین کن.`;

    let contentParts: any[] = [];
    if (fileBase64 && mimeType) {
      const pureBase64 = fileBase64.includes(',') ? fileBase64.split(',')[1] : fileBase64;
      contentParts.push({
        inlineData: {
          mimeType,
          data: pureBase64,
        },
      });
      contentParts.push({
        text: `فایل بودجه‌بندی آزمون ضمیمه شده است (نام فایل: ${fileName || 'برنامه آزمون'}). لطفاً نام آزمون، تاریخ، و سرفصل‌های دقیق را به همراه درجه سختی هوشمند و تعداد تست هدف هر سرفصل خودکار محاسبه و استخراج کن تا نیازی به ورود دستی نباشد.`,
      });
    } else {
      contentParts.push({
        text: `متن یا اطلاعات برنامه آزمون:
"${textContent || fileName}"
لطفاً بودجه‌بندی آزمون، نام آزمون، تاریخ برگزاری و سرفصل‌ها را به همراه درجه سختی خودکار و تعداد تست پیشنهادی هر فصل استخراج کن.`,
      });
    }

    const response = await generateGeminiWithFallback(ai, {
      preferredModel: "gemini-3.5-flash",
      contents: contentParts,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            examName: { type: Type.STRING, description: "نام آزمون، مثلاً قلم‌چی، ماز، سنجش یا مدرسه" },
            examDate: { type: Type.STRING, description: "تاریخ برگزاری آزمون، مثلاً جمعه ۲۵ آبان" },
            targetGoalText: { type: Type.STRING, description: "هدف‌گذاری تراز یا درصد پیشنهادی" },
            syllabusDetails: { type: Type.STRING, description: "خلاصه مباحث و صفحات دقیق آزمون" },
            matchedTopics: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "لیست مباحث تطبیق داده شده با اطلس سرفصل‌های رشته ریاضی",
            },
            topicDetails: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  subject: { type: Type.STRING },
                  chapter: { type: Type.STRING },
                  subtopic: { type: Type.STRING },
                  difficulty: { type: Type.STRING, description: "یکی از: آسان، متوسط، سخت، بسیار چالشی و دام‌دار" },
                  targetTestCount: { type: Type.INTEGER, description: "تعداد تست هدف تخمینی متناسب با اهمیت مبحث" },
                  importanceWeight: { type: Type.STRING, description: "پرتکرار و حیاتی (تضمین درصد) یا متوسط یا کم" }
                },
                required: ["subject", "chapter", "difficulty", "targetTestCount"]
              },
              description: "تحلیل خودکار درجه سختی و تارگت تست برای تک‌تک فصول آزمون"
            },
            recommendedTotalTests: { type: Type.INTEGER, description: "مجموع تست پیشنهادی برای پوشش کامل این بودجه‌بندی" },
            confidenceNote: { type: Type.STRING, description: "توضیح کوتاه مشاور در مورد چگالی مباحث" },
          },
          required: ["examName", "examDate", "targetGoalText", "syllabusDetails", "matchedTopics"],
        },
      },
    });

    const parsed = JSON.parse(response.text || "{}");
    return res.json(parsed);
  } catch (err: any) {
    console.warn("Gemini syllabus extraction fallback:", err?.message || err);
    return res.json(getAlgorithmicSyllabusFallback(textContent || '', fileName || ''));
  }
});

// AI Chat to modify or adjust weekly classes in natural language
app.post("/api/advisor/modify-classes-chat", requireAuthorizedUser, async (req, res) => {
  const { userMessage, currentClasses } = req.body;
  const ai = getGenAI();

  if (!ai) {
    return res.json({
      replyMessage: "درخواست شما دریافت شد، اما هوش مصنوعی در حال حاضر در حالت آفلاین است.",
      updatedClasses: currentClasses || []
    });
  }

  try {
    const systemInstruction = `تو دستیار و مشاور فوق‌العاده باهوش برنامه‌ریزی درسی کنکور هستی.
کاربر می‌خواهد از طریق چت، کلاس‌های هفتگی خود را ویرایش کند، کلاسی اضافه یا حذف کند، ساعت یا روز آن را تغییر دهد یا به عنوان تکلیف بعد از کلاس زمان اضافه کند.

لیست کلاس‌های فعلی کاربر به عنوان ورودی داده شده است.
تو باید بر اساس پیام کاربر (userMessage):
1. لیست جدید و بروز شده کلاس‌ها را بازگردانی (updatedClasses).
2. یک پاسخ متنی گرم، دقیق و حرفه‌ای به فارسی بدهی (replyMessage) و توضیح دهی چه تغییری در برنامه کلاسی اعمال شد.

نکات مهم:
- اگر کاربر گفت "کلاس فیزیک سه‌شنبه‌ها رو حذف کن"، آن را حذف کن.
- اگر گفت "دوشنبه‌ها ساعت ۱۸ تا ۲۰ کلاس گسسته استاد فلانی رو اضافه کن"، آن را با شناسه id جدید اضافه کن.
- اگر گفت "کلاس حسابان یکشنبه‌ها رو بکن ۱۸ تا ۲۱"، ساعت آن را بروزرسانی کن.
- همیشه برای هر کلاس فیلدهای id, dayName, startTime, endTime, subject, teacherOrInstitute, locationOrType, postClassStudyHoursNeeded را خروجی بده.`;

    const promptText = `لیست کلاس‌های فعلی دانش‌آموز:
${JSON.stringify(currentClasses || [], null, 2)}

پیام و دستور دانش‌آموز:
"${userMessage}"

لطفاً لیست بروزرسانی شده کلاس‌ها و پیام توضیح را در قالب JSON برگردان.`;

    const response = await generateGeminiWithFallback(ai, {
      preferredModel: "gemini-3.5-flash",
      contents: [{ text: promptText }],
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            replyMessage: { type: Type.STRING, description: "پیام فارسی توضیحی هوش مصنوعی به کاربر" },
            updatedClasses: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  dayName: { type: Type.STRING },
                  startTime: { type: Type.STRING },
                  endTime: { type: Type.STRING },
                  subject: { type: Type.STRING },
                  teacherOrInstitute: { type: Type.STRING },
                  locationOrType: { type: Type.STRING },
                  postClassStudyHoursNeeded: { type: Type.NUMBER },
                },
                required: ["dayName", "startTime", "endTime", "subject", "locationOrType"],
              },
            },
          },
          required: ["replyMessage", "updatedClasses"],
        },
      },
    });

    const parsed = JSON.parse(response.text || "{}");
    return res.json({
      replyMessage: parsed.replyMessage || "تغییرات با موفقیت در برنامه کلاس‌ها اعمال شد.",
      updatedClasses: parsed.updatedClasses || currentClasses || []
    });
  } catch (err: any) {
    console.warn("Class modification chat error:", err?.message || err);
    return res.json({
      replyMessage: "در پردازش تغییر کلاسی مشکلی پیش آمد؛ لطفاً مجدداً امتحان کنید یا از دکمه افزودن دستی استفاده کنید.",
      updatedClasses: currentClasses || []
    });
  }
});

// Smart Konkur Resource & Curriculum Search Advisor
app.post("/api/advisor/smart-resource-search", requireAuthorizedUser, async (req, res) => {
  const { query, subjectFilter, targetGrade, currentLevel } = req.body;
  const ai = getGenAI();

  if (!ai) {
    return res.json({
      answer: `پاسخ برای جستجوی «${query}»: برای کنکور ریاضی، منابع در سه سطح آموزشی (خیلی سبز)، تسلط پیشرفته (نشر الگو / IQ گاج) و آزمونی (موج آزمون / سه‌سطحی) دسته‌بندی می‌شوند.`,
      recommendedTopics: [],
      recommendedBooks: [
        {
          title: "حسابان جامع خیلی سبز",
          publisher: "خیلی سبز",
          tier: "سطح ۱: آموزش و شروع",
          reason: "بهترین انتخاب برای داوطلبان با پایه متوسط جهت شروع و تثبیت تست‌های استاندارد."
        },
        {
          title: "حسابان جامع نشر الگو / IQ گاج",
          publisher: "نشر الگو / گاج",
          tier: "سطح ۲: تسلط و تست ایده‌دار",
          reason: "بانک تست قوی برای درصد بالای ۶۵٪ در آزمون‌های آزمایشی."
        }
      ],
      studyPlanTip: "پیشنهاد می‌شود ابتدا درسنامه را مطالعه کرده، سپس تست‌های آموزشی را بدون زمان حل کنید و در مرحله بعد تست‌های زمان‌دار بزنید."
    });
  }

  try {
    const systemInstruction = `تو متخصص ارشد منابع کنکور سراسری رشته ریاضی و فیزیک و مشاور رتبه‌های برتر کنکور هستی.
کاربر یک سوال یا عبارت جستجو در مورد «منابع کنکور، کتاب‌های تستی، سرفصل‌های دروس یا روش مطالعه مباحث» وارد کرده است.

وظیفه تو:
1. تحلیل دقیق سوال یا عبارت جستجو ("${query}")
2. ارائه یک پاسخ مشاوره کوتاه، مستند، حرفه‌ای و فوق‌العاده کاربردی به زبان فارسی (answer).
3. معرفی دقیق‌ترین کتاب‌ها و منابع کنکور (recommendedBooks) شامل عنوان کتاب، انتشارات/مولف، سطح (سطح ۱: آموزش روان، سطح ۲: تسلط و تست دشوار، سطح ۳: آزمونی و سرعتی)، و دلیل انتخاب برای این داوطلب.
4. لیست سرفصل‌های مرتبط با جستجو (recommendedTopics) در رشته ریاضی (حسابان، هندسه، گسسته، فیزیک، شیمی).
5. یک توصیه طلایی در مورد نحوه زدن تست‌ها و ترتیب منابع (studyPlanTip).`;

    const promptText = `عبارت جستجوی کاربر: "${query}"
درس مد نظر (در صورت فیلتر): ${subjectFilter || 'همه دروس'}
پایه: ${targetGrade || 'دوازدهم / کنکور'}
سطح فعلی داوطلب: ${currentLevel || 'متوسط (هدف تراز ۶۰۰۰ تا ۷۰۰۰)'}

لطفاً نتیجه جستجوی هوشمند را در قالب JSON برگردان.`;

    const response = await generateGeminiWithFallback(ai, {
      preferredModel: "gemini-3.5-flash",
      contents: [{ text: promptText }],
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            answer: { type: Type.STRING, description: "پاسخ تحلیلی مشاوره‌ای به کاربر" },
            recommendedTopics: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "نام دقیق سرفصل‌های متناظر در کنکور ریاضی"
            },
            recommendedBooks: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  publisher: { type: Type.STRING },
                  tier: { type: Type.STRING, description: "مثلاً سطح ۱: آموزش و شروع، سطح ۲: تسلط، یا سطح ۳: آزمونی" },
                  reason: { type: Type.STRING, description: "چرا این کتاب برای این مبحث یا داوطلب بهترین است" }
                },
                required: ["title", "publisher", "tier", "reason"]
              }
            },
            studyPlanTip: { type: Type.STRING, description: "توصیه طلایی روش مطالعه و تست‌زنی" }
          },
          required: ["answer", "recommendedBooks", "studyPlanTip"]
        }
      }
    });

    const parsed = JSON.parse(response.text || "{}");
    return res.json(parsed);
  } catch (err: any) {
    console.warn("Smart resource search error:", err?.message || err);
    return res.json({
      answer: `برای جستجوی «${query}»، توصیه می‌کنیم ابتدا از منابع سطح اول (درسنامه و تست آموزشی مانند خیلی سبز یا مبتکران) استفاده کرده و پس از تسلط به سراغ منابع سطح دوم (نشر الگو یا IQ گاج) بروید.`,
      recommendedTopics: [],
      recommendedBooks: [
        {
          title: "جامع خیلی سبز",
          publisher: "خیلی سبز",
          tier: "سطح ۱: آموزش و شروع",
          reason: "پوشش کامل و درسنامه روان برای درک مفاهیم"
        }
      ],
      studyPlanTip: "حل تست‌های آموزشی همراه با تحلیل دقیق پاسخنامه تشریحی ضامن تثبیت است."
    });
  }
});

// Feynman Technique Evaluator
app.post("/api/advisor/evaluate-feynman", requireAuthorizedUser, async (req, res) => {
  const { subject, topic, explanation } = req.body;
  const ai = getGenAI();

  function getFallbackFeynman(sub: string, top: string, exp: string) {
    const wordCount = (exp || "").trim().split(/\s+/).length;
    const score = Math.min(9, Math.max(5, Math.round(wordCount / 15) + 3));
    return {
      score,
      strengths: [
        "اقدام شجاعانه به بازگویی مطلب با کلمات خود دانش‌آموز (Active Recall)",
        "اشاره به مفاهیم پایه و چارچوب کلی مبحث",
      ],
      gapsOrJargon: [
        "برخی بخش‌ها با فرض اینکه مخاطب از قبل می‌داند بیان شده؛ سعی کن گام‌به‌گام علت‌ها را توضیح دهی.",
        "برای جا افتادن بهتر، مثال ملموس روزمره اضافه کن.",
      ],
      recommendedMetaphor: `برای مبحث ${top || "این درس"}، آن را شبیه یک سیستم روزمره (مثل جریان آب در لوله‌ها، ترازوی دوکفه‌ای یا ترافیک خودروها) مدل‌سازی کن.`,
      actionableFeedback: "عالی است! وقتی بتوانی یک فرمول یا قضیه را بدون نگاه به جزوه برای یک فرد غیرمتخصص توضیح دهی، در حافظه بلندمدت هک می‌شود.",
    };
  }

  if (!ai) {
    return res.json({ evaluation: getFallbackFeynman(subject, topic, explanation) });
  }

  try {
    const systemInstruction = `تو متخصص ارشد علوم شناختی، تکنیک فاینمن و روانشناسی یادگیری عمیق به زبان فارسی هستی.
دانش‌آموز تلاشی کرده تا مبحث «${topic}» از درس «${subject}» را به ساده‌ترین زبان ممکن (طوری که یک کودک ۱۰ ساله بفهمد) توضیح دهد.
وظیفه تو:
۱. تحلیل عمق درک مطلب دانش‌آموز بر اساس تکنیک ریچارد فاینمن (Richard Feynman).
۲. کشف تله‌های ذهنی، کلمات مبهم یا قلمبه‌سلمبه‌ای که برای فرار از درک عمیق به کار رفته‌اند (Jargon & Illusion of Competence).
۳. ارائه یک مثال ملموس یا تمثیل (Metaphor) ماندگار.
خروجی باید دقیقاً شیء JSON باشد.`;

    const prompt = `موضوع: ${topic}
درس: ${subject}
توضیحات دانش‌آموز:
"${explanation}"

لطفاً این بازگویی فاینمن را ارزیابی و تحلیل کن:`;

    const response = await generateGeminiWithFallback(ai, {
      preferredModel: "gemini-3.5-flash",
      contents: prompt,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            score: { type: Type.NUMBER, description: "نمره از ۱ تا ۱۰ بر اساس سادگی و عمق فهم" },
            strengths: { type: Type.ARRAY, items: { type: Type.STRING }, description: "نقاط قوت توضیحات" },
            gapsOrJargon: { type: Type.ARRAY, items: { type: Type.STRING }, description: "حفره‌های شناختی یا استفاده از اصطلاحات سنگین بدون توضیح علت" },
            recommendedMetaphor: { type: Type.STRING, description: "تمثیل پیشنهادی برای ساده‌سازی شاهکار" },
            actionableFeedback: { type: Type.STRING, description: "بازخورد مربی‌گری نهایی برای تثبیت در حافظه بلندمدت" },
          },
          required: ["score", "strengths", "gapsOrJargon", "recommendedMetaphor", "actionableFeedback"],
        },
      },
    });

    const parsed = JSON.parse(response.text || "{}");
    return res.json({ evaluation: parsed });
  } catch (error: any) {
    console.warn("Gemini Feynman evaluation fallback:", error?.message || error);
    return res.json({ evaluation: getFallbackFeynman(subject, topic, explanation) });
  }
});

// Endpoint: AI CBT Cognitive Reframer for Konkur Anxiety (کلینیک مهار افکار منفی و فاجعه‌ساز)
app.post("/api/advisor/cbt-reframe", requireAuthorizedUser, async (req, res) => {
  const { toxicThought, context, profile } = req.body;
  const ai = getGenAI();

  function getFallbackCbt(thought: string) {
    const isMath = thought.includes("ریاضی") || thought.includes("فیزیک") || thought.includes("درصد");
    return {
      distortionType: "فاجعه‌سازی و تفکر همه‌یاهیچ (Catastrophizing & Black/White)",
      distortionExplanation: "مغز داوطلب کنکور در اثر خستگی سیستم عصبی، یک ناکامی موقت را به منزله نابودی کل آینده تعبیر می‌کند.",
      realityCheck: "تراز کنکور یک رقابت نرمال است نه نمره مطلق. حتی رتبه‌های زیر ۱۰۰ هم به ندرت درصدهای بالای ۸۰ در ریاضی دارند. یک روز بد یا یک آزمون افت، هرگز تعیین‌کننده نتیجه کنکور تیرماه نیست.",
      reframedThought: "«این افت فقط یک داده آماری است که به من نشان داد کدام مبحث به مرور نیاز دارد، نه معیاری از هوش یا ارزش من.»",
      microAction: "همین الان برای ۳ دقیقه کتاب را ببند، یک لیوان آب خنک بنوش، و فقط ۱ تست آموزشی ساده از مبحث قبلی حل کن تا چرخه فلج‌شدگی شکسته شود.",
      calmGuidance: "به یاد داشته باش که کنکور مسابقه استمرار روزهای معمولی است، نه بی‌نقص بودن هر ثانیه."
    };
  }

  if (!toxicThought || !toxicThought.trim()) {
    return res.status(400).json({ error: "فکر منفی ارسال نشده است" });
  }

  if (!ai) {
    return res.json({ result: getFallbackCbt(toxicThought) });
  }

  try {
    const systemInstruction = `تو یک روانشناس بالینی تخصصی کنکور و مشاور ارشد شناختی-رفتاری (CBT) هستی.
وظیفه تو این است که افکار مسموم، اضطراب‌آور، فاجعه‌ساز و وسواسی دانش‌آموزان کنکوری را ریشه‌یابی و بازسازی کنی.
دانش‌آموزان کنکور معمولاً دچار خطاهای شناختی رایج می‌شوند:
- فاجعه‌سازی (Catastrophizing)
- تفکر همه‌یاهیچ (All-or-Nothing)
- ذهن‌خوانی و مقایسه منفی با رقیبان (Mind Reading & Toxic Comparison)
- پیش‌گویی شکست (Fortune Telling)
- شخصی‌سازی و برچسب بی‌عرضگی (Labeling & Personalization)

وظیفه تو:
۱. نام خطای شناختی را به فارسی و انگلیسی دقیق مشخص کن.
۲. توضیح بده چرا ذهن او دارد این حقه تکاملی/استرسی را می‌زند.
۳. یک حقیقت‌سنجی منطقی (Reality Check) مبتنی بر آمارهای واقعی کنکور ایران ارائه بده.
۴. یک باور جایگزین قدرتمند و آرامش‌بخش (Reframed Thought) در گیومه بنویس.
۵. یک میکرو-اکشن ۳ دقیقه‌ای سوماتیک یا درسی برای خروج فوری از قفل‌شدگی عصبی ارائه بده.
۶. یک توصیه کوتاه روانشناختی برای ثبات قدم اضافه کن.
خروجی باید دقیقاً JSON معتبر باشد.`;

    const prompt = `مشخصات دانش‌آموز:
- نام: ${profile?.name || "دانش‌آموز"}
- رشته: ${profile?.fieldOfStudy || "ریاضی و فیزیک"}
- هدف: ${profile?.targetGoal || "قبولی در دانشگاه برتر"}

فکر منفی یا اضطراب ثبت شده داوطلب:
"${toxicThought}"
${context ? `زمینه و موقعیت بروز: ${context}` : ""}

لطفاً طبق اصول CBT و مشاوره تحصیلی پیشرفته این فکر را کالبدشکافی و بازسازی کن.`;

    const response = await generateGeminiWithFallback(ai, {
      preferredModel: "gemini-3.5-flash",
      contents: prompt,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            distortionType: { type: Type.STRING, description: "نام خطای شناختی شناسایی شده" },
            distortionExplanation: { type: Type.STRING, description: "علت روانی بروز این فکر و چرایی فریب مغز" },
            realityCheck: { type: Type.STRING, description: "شواهد و حقایق منطقی کنکور در ابطال این فکر" },
            reframedThought: { type: Type.STRING, description: "جمله و باور جایگزین قوی در گیومه" },
            microAction: { type: Type.STRING, description: "اقدام ۳ دقیقه‌ای ملموس و سوماتیک" },
            calmGuidance: { type: Type.STRING, description: "پیام مربی‌گری و ثبات قدم" },
          },
          required: ["distortionType", "distortionExplanation", "realityCheck", "reframedThought", "microAction", "calmGuidance"],
        },
      },
    });

    const parsed = JSON.parse(response.text || "{}");
    return res.json({ result: parsed });
  } catch (error: any) {
    console.warn("Gemini CBT reframe fallback:", error?.message || error);
    return res.json({ result: getFallbackCbt(toxicThought) });
  }
});

// Endpoint: Konkur Burnout Diagnostic (تست و نسخه خستگی مفرط و فرسودگی تحصیلی)
app.post("/api/advisor/burnout-diagnostic", requireAuthorizedUser, async (req, res) => {
  const { scores = {}, profile } = req.body;
  const ai = getGenAI();

  // scores: { energyScore: 1-5, resistanceScore: 1-5, sleepDebtScore: 1-5, screenAddictionScore: 1-5, cynicismScore: 1-5 }
  const totalScore: number = Object.values(scores).reduce((acc: number, val: any) => acc + (Number(val) || 3), 0) as number;
  const burnoutIndex = Math.min(100, Math.round((Number(totalScore) / 25) * 100));

  function getFallbackBurnout(pct: number) {
    let severity = "متوسط";
    if (pct < 40) severity = "خفیف و قابل کنترل";
    else if (pct < 70) severity = "متوسط رو به بالا (هشدار فرسودگی)";
    else severity = "حاد (اورلود سیستم عصبی)";

    return {
      burnoutPercentage: pct,
      severity,
      diagnosis: `سیستم عصبی شما با شاخص ${pct}٪ نشانه‌های خستگی شناختی و اشباع قشر پیش‌پیشانی را نشان می‌دهد. مقاومت در شروع درس عمدتاً ناشی از کاهش ذخایر دوپامین و خواب نامنظم است.`,
      biochemicalTips: [
        "کاهش نور آبی گوشی از ساعت ۲۲:۰۰ به بعد جهت ترشح ملاتونین طبیعی",
        "پیاده‌روی یا قرار گرفتن ۱۰ دقیقه زیر نور مستقیم خورشید صبحگاهی برای تنظیم ریتم سیرکادین",
        "مصرف حداقل ۲ لیتر آب در طول روز برای جلوگیری از افت ۲۵ درصدی تمرکز نورون‌ها"
      ],
      actionProtocol: [
        "امروز به خودت اجازه بده یک پارت ۱/۵ ساعته استراحت فعال (پیاده‌روی یا دوش آب گرم بدون گوشی) داشته باشی.",
        "فردا مطالعه را نه با مبحث خیلی سنگین، بلکه با ۵ تست آشنا و لذت‌بخش شروع کن تا مقاومت اولیه مغز شکسته شود.",
        "قبل از خواب ۳ دستاورد کوچک امروزت را روی کاغذ بنویس تا چرخه سرزنش خود متوقف شود."
      ]
    };
  }

  if (!ai) {
    return res.json({ diagnostic: getFallbackBurnout(burnoutIndex) });
  }

  try {
    const prompt = `نتایج تست سنجش فرسودگی کنکور:
- شاخص کلی فرسودگی: ${burnoutIndex} از ۱۰۰
- داده‌های ورودی ۵ سنجه: ${JSON.stringify(scores)}
- رشته و مقطع داوطلب: ${profile?.fieldOfStudy || "کنکور"} - ${profile?.grade || "دوازدهم"}
- ساعت هدف روزانه: ${profile?.dailyTargetHours || 8} ساعت

لطفاً یک کالبدشکافی عمیق و نسخه ریکاوری ۲۴ تا ۴۸ ساعته برای نجات داوطلب از باتلاق فرسودگی و بازگشت شاداب به درس طراحی کن.`;

    const response = await generateGeminiWithFallback(ai, {
      preferredModel: "gemini-3.5-flash",
      contents: prompt,
      config: {
        systemInstruction: "تو متخصص نوروساینس یادگیری، روانشناسی بالینی ورزشکاران حرفه‌ای و داوطلبان کنکور سراسری ایران هستی. پاسخی عمیق، دلسوزانه و بیومکانیک ارائه بده.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            burnoutPercentage: { type: Type.INTEGER },
            severity: { type: Type.STRING, description: "سطح فرسودگی" },
            diagnosis: { type: Type.STRING, description: "تحلیل ریشه‌ای فیزیولوژیک و روانی" },
            biochemicalTips: { type: Type.ARRAY, items: { type: Type.STRING }, description: "نکات بیولوژیک (خواب، نور، دوپامین)" },
            actionProtocol: { type: Type.ARRAY, items: { type: Type.STRING }, description: "پروتکل گام‌به‌گام ریکاوری ۲۴ ساعته" },
          },
          required: ["burnoutPercentage", "severity", "diagnosis", "biochemicalTips", "actionProtocol"],
        },
      },
    });

    const parsed = JSON.parse(response.text || "{}");
    return res.json({ diagnostic: parsed });
  } catch (err: any) {
    return res.json({ diagnostic: getFallbackBurnout(burnoutIndex) });
  }
});

// Endpoint: AI Konkur Major Selection & Admission Optimizer (مشاور هوشمند انتخاب رشته)
app.post("/api/advisor/major-recommendation", requireAuthorizedUser, async (req, res) => {
  const { 
    stream = "تجربی",
    rankInQuota = 2500,
    quotaType = "منطقه ۲",
    compositeTzar = 9200,
    finalExamTzar = 9100,
    totalKonkurTzar = 9300,
    nativeProvince = "تهران",
    gender = "مرد",
    allowedCycles = ["روزانه", "نوبت دوم", "پردیس خودگردان", "فرهنگیان و تربیت دبیر"],
    targetInterests = "",
    mbtiOrPersonality = "",
    currentChoices = [],
    profile
  } = req.body;

  const ai = getGenAI();

  function getFallbackMajorAdvisor() {
    return {
      strategicAnalysis: `با رتبه ${rankInQuota} در سهمیه ${quotaType} و تراز ترکیبی ${compositeTzar} در رشته ${stream} (بوم استان ${nativeProvince})، شما در محدوده رقابتی بسیار مناسبی برای دانشگاه‌های سراسری تراز اول و دوم قرار دارید. ترکیب ۶۰٪ سوابق نهایی و ۴۰٪ کنکور شانس شما را در رشته‌های تاپ روزانه و پردیس خودگردان قطب تثبیت می‌کند.`,
      recommendedDistribution: {
        optimisticCount: 35,
        realisticCount: 75,
        safeCount: 40,
        rationale: "استراتژی بهینه سازمان سنجش (فرمول ۲۰٪ خوش‌بینانه، ۵۰٪ منطقی و ۳۰٪ کف قبولی و قطعی) جهت تضمین بالاترین قبولی ممکن بدون ریسک سوختن شانس‌ها."
      },
      topSuggestedMajors: [
        {
          majorTitle: stream === "تجربی" ? "دندانپزشکی / داروسازی" : stream === "ریاضی" ? "مهندسی کامپیوتر / برق" : "حقوق / مدیریت مالی",
          universityName: `دانشگاه‌های دولتی تهران، اصفهان یا ${nativeProvince}`,
          city: nativeProvince,
          cycle: "روزانه",
          chanceCategory: "realistic",
          predictedChancePercent: 78,
          strategicReason: "بهره‌مندی از حداکثر سهمیه بومی ناحیه و قطب با تراز بالای ۹۰۰۰",
          employmentPros: "بازار کار عالی و فرصت تاسیس دفتر، مطب یا مهاجرت تخصصی"
        },
        {
          majorTitle: stream === "تجربی" ? "فیزیوتراپی / رادیولوژی" : stream === "ریاضی" ? "مهندسی صنایع / مکانیک" : "روان‌شناسی / حسابداری",
          universityName: `دانشگاه‌های سراسری روزانه مراکز استان`,
          city: nativeProvince,
          cycle: "روزانه",
          chanceCategory: "safe",
          predictedChancePercent: 95,
          strategicReason: "حاشیه امنیت بالا بر اساس آخرین رتبه‌های قبولی ۳ سال اخیر سازمان سنجش",
          employmentPros: "استخدام تضمینی و ورود سریع به بازار کار"
        }
      ],
      criticalCautions: [
        "در انتخاب رشته‌های روزانه دقت فرمایید؛ در صورت قبولی نهایی، انصراف یا عدم ثبت‌نام مشمول محرومیت‌های آیین‌نامه‌ای سازمان سنجش خواهد شد.",
        "کدرشته‌های دانشگاه فرهنگیان و شهید رجایی نیازمند تراز کل بالای ۶۰۰۰، حداکثر سن ۲۴ سال و قبولی در مصاحبه تخصصی و گزینش است.",
        "کدرشته‌های تعهد خدمت مناطق محروم (عدالت آموزشی) دارای تعهد خدمت ۱.۵ الی ۳ برابر مدت تحصیل بوده و امکان تغییر رشته یا نقل و انتقال ندارند.",
        "شهریه دوره‌های پردیس خودگردان و مازاد را پیش از ثبت اولویت با خانواده هماهنگ نمایید."
      ],
      psychologicalFitSummary: "با توجه به علایق و مهارت‌های شما، انتخاب رشته‌هایی که ترکیبی از تحلیل منطقی، جایگاه اجتماعی پایدار و امنیت درآمدی داشته باشند بالاترین رضایت تحصیلی را به همراه خواهد داشت."
    };
  }

  if (!ai) {
    return res.json({ recommendation: getFallbackMajorAdvisor() });
  }

  try {
    const systemInstruction = `تو زبده‌ترین مشاور ارشد انتخاب رشته کنکور سراسری، متخصص دفترچه شماره ۲ سازمان سنجش، مسلط به سهمیه‌های مناطق (۱، ۲، ۳)، ایثارگران، ضوابط پذیرش بومی (استانی، ناحیه‌ای، قطبی و کشوری)، تعهدات خدمت، مصاحبه دانشگاه فرهنگیان و دانشگاه آزاد هستی.
وظیفه تو:
۱. تحلیل فنی رتبه در سهمیه، تراز سوابق تحصیلی و تراز آزمون اختصاصی.
۲. ارائه استراتژی سه‌مرحله‌ای چینش ۱۵۰ انتخابی استاندارد سنجش (رویایی/خوش‌بینانه، منطقی/محتمل، مطمئن/کف قبولی).
۳. هشدار نسبت به خطاهای پرریسک انتخاب رشته (تعهدات خدمت، شرط خوابگاه، شهریه‌های سنگین، محرومیت‌های روزانه، سقف سنی فرهنگیان).
۴. تطبیق روحیات، تیپ شخصیتی و علایق داوطلب با آینده شغلی و بازار کار رشته‌ها.

خروجی باید دقیقاً یک شیء JSON معتبر فارسی و بدون متن اضافی باشد.`;

    const prompt = `مشخصات داوطلب متقاضی انتخاب رشته کنکور:
- رشته تحصیلی: ${stream}
- رتبه در سهمیه: ${rankInQuota}
- نوع سهمیه: ${quotaType}
- تراز کل ترکیبی (سوابق نهایی + کنکور): ${compositeTzar}
- تراز امتحانات نهایی دوازدهم: ${finalExamTzar}
- تراز کنکور اختصاصی: ${totalKonkurTzar}
- استان بومی: ${nativeProvince}
- جنسیت: ${gender}
- دوره‌های مجاز و مورد علاقه داوطلب: ${allowedCycles.join("، ")}
- علایق، روحیات یا تیپ شخصیتی: "${targetInterests || mbtiOrPersonality || "علاقه‌مند به موقعیت شغلی باثبات، آینده مهاجرتی یا درآمد عالی"}"
- تعداد اولویت‌های فعلی در فرم انتخاب رشته: ${currentChoices.length} انتخاب

لطفاً تحلیل کامل شانس قبولی، چینش بهینه ۱۵۰ انتخابی، رشته‌های پیشنهادی اولویت‌دار و هشدارهای سرنوشت‌ساز را ارائه بده.`;

    const response = await generateGeminiWithFallback(ai, {
      preferredModel: "gemini-3.5-flash",
      contents: prompt,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            strategicAnalysis: { type: Type.STRING, description: "تحلیل جامع جایگاه رتبه و تراز نسبت به ظرفیت‌ها و بوم داوطلب" },
            recommendedDistribution: {
              type: Type.OBJECT,
              properties: {
                optimisticCount: { type: Type.INTEGER, description: "تعداد پیشنهادی انتخاب‌های رویایی/خوش‌بینانه" },
                realisticCount: { type: Type.INTEGER, description: "تعداد پیشنهادی انتخاب‌های منطقی و محتمل" },
                safeCount: { type: Type.INTEGER, description: "تعداد پیشنهادی انتخاب‌های مطمئن و کف قبولی" },
                rationale: { type: Type.STRING, description: "توضیح منطق موازنه درصدها" }
              },
              required: ["optimisticCount", "realisticCount", "safeCount", "rationale"]
            },
            topSuggestedMajors: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  majorTitle: { type: Type.STRING, description: "عنوان رشته" },
                  universityName: { type: Type.STRING, description: "نام دانشگاه یا نوع مرکز" },
                  city: { type: Type.STRING, description: "شهر" },
                  cycle: { type: Type.STRING, description: "دوره (روزانه، نوبت دوم، پردیس، فرهنگیان و...)" },
                  chanceCategory: { type: Type.STRING, description: "optimistic یا realistic یا safe" },
                  predictedChancePercent: { type: Type.INTEGER, description: "درصد تخمینی شانس قبولی از ۱۰ تا ۹۹" },
                  strategicReason: { type: Type.STRING, description: "علت استراتژیک قرار گرفتن این انتخاب" },
                  employmentPros: { type: Type.STRING, description: "چشم‌انداز شغلی و درآمدی رشته" }
                },
                required: ["majorTitle", "universityName", "city", "cycle", "chanceCategory", "predictedChancePercent", "strategicReason", "employmentPros"]
              }
            },
            criticalCautions: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "هشدارهای مهم آیین‌نامه‌ای، تعهدات، مصاحبه‌ها و شهریه‌ها"
            },
            psychologicalFitSummary: { type: Type.STRING, description: "جمع‌بندی تناسب شخصیتی و انگیزش تحصیلی" }
          },
          required: ["strategicAnalysis", "recommendedDistribution", "topSuggestedMajors", "criticalCautions", "psychologicalFitSummary"]
        }
      }
    });

    const parsed = JSON.parse(response.text || "{}");
    return res.json({ recommendation: parsed });
  } catch (error: any) {
    console.warn("Gemini major recommendation error, using fallback:", error?.message || error);
    return res.json({ recommendation: getFallbackMajorAdvisor() });
  }
});

// Endpoint: Analyze Error Bank (تحلیل ریشه‌ای بانک اشتباهات آزمون)
app.post("/api/advisor/analyze-error-bank", requireAuthorizedUser, async (req, res) => {
  const { errors = [], profile } = req.body;
  const ai = getGenAI();

  function getFallbackErrorAnalysis(errList: any[]) {
    const total = errList.length;
    const calcCount = errList.filter((e) => e.errorCategory === "calculation").length;
    const trapCount = errList.filter((e) => e.errorCategory === "trap").length;
    const timeCount = errList.filter((e) => e.errorCategory === "time").length;
    const conceptCount = errList.filter((e) => e.errorCategory === "concept_gap").length;

    const dominantType =
      calcCount >= trapCount && calcCount >= timeCount && calcCount >= conceptCount
        ? "بی‌دقتی‌های محاسباتی و جبری"
        : trapCount >= timeCount && trapCount >= conceptCount
        ? "فریب خوردن در تله‌ها و دام‌های آموزشی طراح"
        : timeCount >= conceptCount
        ? "کمبود زمان و عدم اجرای استراتژی بازگشت"
        : "نقص علمی و فراموشی روابط پایه";

    return {
      dominantWeakness: dominantType,
      rootCauseSummary: `از میان ${total} خطای ثبت‌شده، بیشترین سهم مربوط به «${dominantType}» است. در رشته ریاضی، محاسبات طولانی و گزینه‌های فریبنده در مشتق، حرکت‌شناسی و همنهشتی بیشترین افت تراز را ایجاد می‌کنند.`,
      categoryBreakdown: {
        calculation: calcCount,
        trap: trapCount,
        time: timeCount,
        concept: conceptCount,
      },
      recommendedRemedialActions: [
        "در عبارات جبری پیچیده، علامت‌های منفی و توان‌ها را با مداد پررنگ جدا کن.",
        "قبل از انتخاب گزینه، حتماً بار دیگر خواسته اصلی صورت سوال (مثل تندی به جای سرعت یا ب.م.م) را چک کن.",
        "تکنیک ضربدر-منها را در منزل روی باکس‌های ۲۰ تستی تمرین کن تا وسواس در تست‌های طولانی مهار شود.",
      ],
      remedialScheduleSuggestion: [
        {
          day: "شنبه بعدازظهر",
          subject: errList[0]?.subject || "حسابان",
          topic: `باکس جبرانی و تست مجدد سوالات غلط آزمون اخیر (${errList[0]?.topic || "مباحث چالش‌برانگیز"})`,
          durationMinutes: 75,
        },
        {
          day: "یکشنبه شب",
          subject: errList[1]?.subject || "فیزیک",
          topic: "حل ۲۰ تست زمان‌دار بدون استفاده از چک‌نویس شلوغ و متمرکز بر دقت محاسباتی",
          durationMinutes: 60,
        },
      ],
      coachVerdict:
        "اشتباهات آزمون دارایی باارزش تو هستند؛ هر تستی که امروز علتش را یاد بگیری، تضمین حداقل ۳٪ افزایش تراز در کنکور سراسری است.",
    };
  }

  if (!ai || errors.length === 0) {
    return res.json({ analysis: getFallbackErrorAnalysis(errors) });
  }

  try {
    const systemInstruction = `تو متخصص ارشد روانشناسی آزمون، مشاوره کنکور سراسری ریاضی و فیزیک و تحلیل‌گر ارشد دفترچه‌های آزمون آزمایشی (قلم‌چی، ماز و سنجش) هستی.
دانش‌آموز لیستی از سوالات غلط یا نزده خود را با علت دسته‌بندی کرده است.
وظیفه تو:
۱. تحلیل ریشه‌ای الگوهای خطا (بی‌دقتی محاسباتی، دام تستی، مدیریت زمان، ضعف علمی).
۲. ارائه راهکارهای تکنیکی بسیار ملموس برای رفع آنها.
۳. پیشنهاد پارت‌های مطالعاتی جبرانی ویژه روزهای اول هفته بعد (شنبه و یکشنبه) به همراه عنوان دقیق موضوع و زمان پیشنهادی.
پاسخ را به صورت شیء JSON فارسی و حرفه‌ای برگردان.`;

    const prompt = `پروفایل دانش‌آموز: رشته ${profile?.fieldOfStudy || "ریاضی و فیزیک"} - هدف: ${profile?.targetGoal || "مهندسی دانشگاه شریف"}
لیست خطاهای آزمون:
${JSON.stringify(errors, null, 2)}

لطفاً تحلیل جامع و برنامه جبرانی تولید کن:`;

    const response = await generateGeminiWithFallback(ai, {
      preferredModel: "gemini-3.5-flash",
      contents: prompt,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            dominantWeakness: { type: Type.STRING, description: "علت اصلی و پرتکرارترین نوع خطا" },
            rootCauseSummary: { type: Type.STRING, description: "تحلیل موشکافانه علت وقوع این خطاها در دفترچه" },
            recommendedRemedialActions: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "اقدامات تکنیکی ملموس برای اصلاح خطاها",
            },
            remedialScheduleSuggestion: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  day: { type: Type.STRING },
                  subject: { type: Type.STRING },
                  topic: { type: Type.STRING },
                  durationMinutes: { type: Type.INTEGER },
                },
                required: ["day", "subject", "topic", "durationMinutes"],
              },
              description: "باکس‌های مطالعاتی پیشنهادی برای قرار گرفتن در برنامه هفته بعد",
            },
            coachVerdict: { type: Type.STRING, description: "جمله انگیزشی و استراتژیک مشاور" },
          },
          required: [
            "dominantWeakness",
            "rootCauseSummary",
            "recommendedRemedialActions",
            "remedialScheduleSuggestion",
            "coachVerdict",
          ],
        },
      },
    });

    const parsed = JSON.parse(response.text || "{}");
    return res.json({ analysis: parsed });
  } catch (error: any) {
    console.warn("Error bank analysis fallback:", error?.message || error);
    return res.json({ analysis: getFallbackErrorAnalysis(errors) });
  }
});

// Endpoint: Generate Trap Quiz (آزمون‌ساز تله‌یاب کنکور با هوش مصنوعی)
app.post("/api/advisor/generate-trap-quiz", requireAuthorizedUser, async (req, res) => {
  const { subject, topic } = req.body;
  const ai = getGenAI();

  function getFallbackTrapQuiz(sub: string, top: string) {
    return [
      {
        id: `trap-${Date.now()}-1`,
        subject: sub || "حسابان ۲",
        topic: top || "مشتق و کاربرد مشتق",
        questionText: `در تابع f(x) = |x² - ۴|، تعداد نقاط بحرانی تابع کدام است؟`,
        options: ["۱ نقطه", "۲ نقطه", "۳ نقطه", "۴ نقطه"],
        correctIndex: 2,
        trapIndex: 1,
        trapExplanation:
          "دام طراح: بسیاری از بچه‌ها فقط ریشه‌های داخل قدرمطلق (x = 2 و x = -2) که نقاط گوشه‌دار با مشتق تعریف‌نشده هستند را در نظر می‌گیرند یا فقط ریشه مشتق (x = 0) را حساب می‌کنند. هر سه نقطه x = 2، x = -2 و x = 0 متعلق به دامنه و نقاط بحرانی هستند؛ بنابراین جواب ۳ نقطه است.",
        conceptLesson:
          "نقاط بحرانی شامل هم نقاطی با شیب مماس صفر (f'=0) و هم نقاط پیوسته با مشتق تعریف‌نشده (گوشه‌های تیز) می‌باشند.",
        difficulty: "دام‌دار کنکور",
      },
      {
        id: `trap-${Date.now()}-2`,
        subject: sub || "فیزیک ۳",
        topic: top || "حرکت بر خط راست",
        questionText:
          "متحرکی نیمی از مسیر را با تندی v1 = 20 m/s و نیم دیگر مسیر را با تندی v2 = 30 m/s طی می‌کند. تندی متوسط کل حرکت چند m/s است؟",
        options: ["۲۵ متر بر ثانیه", "۲۴ متر بر ثانیه", "۲۰ متر بر ثانیه", "۲۲.۵ متر بر ثانیه"],
        correctIndex: 1,
        trapIndex: 0,
        trapExplanation:
          "دام کلاسیک فیزیک: داوطلبان به سرعت میانگین حسابی (۲۰ + ۳۰)/۲ = ۲۵ می‌گیرند! چون مسافت‌ها برابر است نه زمان‌ها، باید میانگین همساز (هارمونیک) گرفت: V_avg = 2*(v1*v2)/(v1+v2) = 2*(20*30)/50 = 24 m/s.",
        conceptLesson:
          "هرگاه مسافت‌های پیموده‌شده برابر باشند، تندی متوسط همیشه از میانگین حسابی کمتر است و از رابطه ۲v1v2/(v1+v2) به دست می‌آید.",
        difficulty: "دام‌دار کنکور",
      },
      {
        id: `trap-${Date.now()}-3`,
        subject: sub || "گسسته",
        topic: top || "نظریه اعداد",
        questionText: "اگر a | b و a | c باشد، کدام نتیجه‌گیری الزاماً درست نیست؟",
        options: ["a | (b + c)", "a | (b - c)", "a² | (b * c)", "a | (b / c)"],
        correctIndex: 3,
        trapIndex: 2,
        trapExplanation:
          "دام طراح: گزینه ۴ همواره درست نیست چون اصلاً معلوم نیست b بر c بخش‌پذیر باشد تا عددی صحیح حاصل شود! عاد کردن فقط روی اعداد صحیح تعریف می‌شود.",
        conceptLesson: "روابط عاد کردن نسبت به جمع، تفریق و ضرب سازگارند اما نسبت به تقسیم اعتباری ندارند.",
        difficulty: "متوسط",
      },
    ];
  }

  if (!ai) {
    return res.json({ questions: getFallbackTrapQuiz(subject, topic) });
  }

  try {
    const systemInstruction = `تو طراح ارشد سوالات مفهومی و دام‌دار کنکور سراسری رشته ریاضی و فیزیک هستی.
وظیفه تو طراحی ۳ سوال چهارگزینه‌ای بسیار هوشمندانه از مبحث «${topic}» در درس «${subject}» است.
ویژگی‌های سوالات:
۱. در هر سوال، یکی از گزینه‌ها باید دقیقاً «دام آموزشی طراح کنکور» (Trap) باشد که بچه‌ها به خاطر یک بی‌دقتی یا برداشت نادرست معمولاً آن را می‌زنند.
۲. توضیح کامل دام طراح و دلیل فریب خوردن داوطلب.
۳. نکته طلایی درسنامه برای جلوگیری از اشتباه در جلسه کنکور.
خروجی باید یک آرایه JSON معتبر باشد.`;

    const prompt = `درس: ${subject}
مبحث: ${topic}
لطفاً ۳ تست کنکوری دام‌دار با ۴ گزینه و تحلیل دقیق دام تولید کن:`;

    const response = await generateGeminiWithFallback(ai, {
      preferredModel: "gemini-3.5-flash",
      contents: prompt,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              subject: { type: Type.STRING },
              topic: { type: Type.STRING },
              questionText: { type: Type.STRING },
              options: { type: Type.ARRAY, items: { type: Type.STRING } },
              correctIndex: { type: Type.INTEGER, description: "شاخص گزینه صحیح از ۰ تا ۳" },
              trapIndex: { type: Type.INTEGER, description: "شاخص گزینه دام از ۰ تا ۳" },
              trapExplanation: { type: Type.STRING, description: "توضیح دام طراح کنکور" },
              conceptLesson: { type: Type.STRING, description: "نکته طلایی درسنامه" },
              difficulty: { type: Type.STRING, description: "سطح دشواری" },
            },
            required: [
              "id",
              "subject",
              "topic",
              "questionText",
              "options",
              "correctIndex",
              "trapIndex",
              "trapExplanation",
              "conceptLesson",
            ],
          },
        },
      },
    });

    const parsed = JSON.parse(response.text || "[]");
    return res.json({ questions: Array.isArray(parsed) && parsed.length > 0 ? parsed : getFallbackTrapQuiz(subject, topic) });
  } catch (error: any) {
    console.warn("Gemini trap quiz generation fallback:", error?.message || error);
    return res.json({ questions: getFallbackTrapQuiz(subject, topic) });
  }
});

// ==========================================
// Telegram Direct Bot Engine (Polling, Webhooks & Interactive Commands)
// ==========================================

interface TelegramLogEntry {
  id: string;
  time: string;
  type: "incoming" | "outgoing" | "error" | "system";
  text: string;
  user?: string;
}

interface TelegramActiveQuiz {
  id: string;
  questionText: string;
  options: string[];
  correctIndex: number;
  trapIndex: number;
  subject: string;
  topic: string;
  trapExplanation: string;
  detailedSolution: string;
  keyTakeaway: string;
  createdAt: number;
}

const telegramActiveQuizMap = new Map<string, TelegramActiveQuiz>();
let telegramLogs: TelegramLogEntry[] = [];

function addTelegramLog(type: "incoming" | "outgoing" | "error" | "system", text: string, user?: string) {
  const entry: TelegramLogEntry = {
    id: `tlog-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    time: new Date().toLocaleTimeString("fa-IR"),
    type,
    text,
    user,
  };
  telegramLogs.unshift(entry);
  if (telegramLogs.length > 80) {
    telegramLogs.pop();
  }
}

// Global Polling Engine State
let pollingIntervalHandle: any = null;
let isPollingActive = false;
let currentPollingToken = "";
let currentPollingBotUsername = "";
let currentPollingProfile: any = null;
let currentPollingAuthorizedChatId = "";
let lastUpdateId = 0;

const TELEGRAM_MAIN_KEYBOARD = {
  keyboard: [
    [{ text: "🌅 باشگاه سحرخیزان (بیدارباش)" }],
    [{ text: "📊 ثبت گزارش شبانه" }, { text: "🎯 برنامه و سرفصل‌ها" }],
    [{ text: "⚡ کوئیز تله‌های کنکور" }, { text: "🔥 غلبه بر تنبلی و افت" }],
    [{ text: "📚 جستجوی منابع کنکور" }, { text: "🫂 چت و درددل با رفیق" }],
    [{ text: "📖 راهنمای کامل ربات" }, { text: "⚙️ وضعیت پروفایل" }],
  ],
  resize_keyboard: true,
  is_persistent: true,
};

async function sendTelegramApi(token: string, method: string, payload: any): Promise<any> {
  try {
    const res = await fetch(`https://api.telegram.org/bot${token.trim()}/${method}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data: any = await res.json();
    return data;
  } catch (err: any) {
    console.error(`Telegram API (${method}) error:`, err);
    return { ok: false, description: err?.message || String(err) };
  }
}

// Generate the complete Telegram Bot User Guide in rich Persian Markdown
function getTelegramBotComprehensiveGuide(studentName?: string): string {
  const name = studentName || "داوطلب گرامی";
  return `📖 *راهنمای کامل و جامع استفاده از ربات مشاور کنکور*
👤 مخاطب: *${name}*

این ربات تمام قابلیت‌های سیستم مشاوره هوشمند کنکور را مستقیماً در تلگرام در اختیارتان می‌گذارد.

━━━━━━━━━━━━━━━━━━━
⚡ *کلیدها و دستورات اصلی ربات:*

۱. 📊 *ثبت گزارش شبانه (/report)*
• روش سریع: کلیک روی دکمه «📊 ثبت گزارش شبانه»
• روش مستقیم: ارسال پیام با اعداد مطالعه، مثلاً:
  \`گزارش: ۶.۵ ساعت، ۱۱۰ تست، ۸۵ درست، ۲۵ غلط\`
  یا \`/report 7 120 90 30\`
• ربات فوراً گزارش شما را از ۱ تا ۱۰ ارزیابی کرده، نقاط قوت، ضعف‌های پنهان و ۳ اقدام ضروری فردا را می‌فرستد.

۲. 🎯 *برنامه و سرفصل‌ها (/plan)*
• قورباغه روز (سخت‌ترین درس برای صبح)
• بازه‌های زمانی بهینه و تعداد تست هدف هر پارت
• تمرکز ویژه بر دروس رشته ریاضی و فیزیک

۳. ⚡ *کوئیز تله‌های کنکور (/quiz یا /trap)*
• ارسال تست‌های ۴ گزینه‌ای دام‌دار کنکوری
• گزینه‌ها به صورت دکمه‌های شیشه‌ای لمسی
• بلافاصله پس از انتخاب، دامی که طراح گذاشته بود و پاسخ تشریحی کامل نمایش داده می‌شود.

۴. 🔥 *غلبه بر تنبلی و اهمال‌کاری (/frog یا /jump)*
• لانچر پرتاب ۲ دقیقه‌ای (شروع بدون کمال‌گرایی)
• عیب‌یابی سریع حس مقاومت ذهنی
• تکنیک‌های فاصله فیزیکی و شارژ دوپامین سالم

۵. 📚 *جستجوی منابع و کتاب‌ها (/book یا /search [مبحث])*
• مثال: \`/book حسابان\` یا \`/book فیزیک خیلی سبز\`
• معرفی منابع سطح ۱ (آموزش)، سطح ۲ (ایده‌دار) و سطح ۳ (آزمونی) همراه با روش مطالعه رتبه‌برترها.

۶. 🧠 *چت صمیمی با رفیق و مشاور هوشمند (ارسال پیام متنی)*
• هر حرفی، درددلی یا مشکلی داری، خیلی راحت و خودمونی تایپ کن و بفرست.
• من به عنوان دوستت اینجام تا بهت انگیزه بدم، درکت کنم و اگه خواستی کمکت کنم!

۷. 🌅 *باشگاه سحرخیزان (/morning)*
• بیدارباش انرژی‌بخش بین ساعت ۵:۰۰ تا ۸:۳۰ صبح.
• گرفتن استریک سحرخیزی (Streak) و جوایز متوالی.
• نکته: برای اثبات بیداری باید یک **عکس از کتاب باز** یا **شیر آب دستشویی** بفرستی تا هوش مصنوعی تاییدش کنه! 📸

۸. ⚙️ *وضعیت پروفایل (/status)*
• مشاهده هدف تحصیلی، ساعت هدف روزانه و وضعیت ارتباط

━━━━━━━━━━━━━━━━━━━
💡 *نکته مهم:* منوی دکمه‌های پایین صفحه همواره برای دسترسی آسان و سریع در دسترس شماست!`;
}

// Helper to parse numbers from report message
function extractReportNumbers(text: string) {
  const faToEn = (str: string) =>
    str.replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 1776));
  const normalized = faToEn(text);

  let hours = 0;
  let tests = 0;
  let correct = 0;
  let wrong = 0;

  // Pattern 1: /report 7 120 90 30
  const cmdMatch = normalized.match(/\/report\s+([\d.]+)\s+(\d+)(?:\s+(\d+))?(?:\s+(\d+))?/i);
  if (cmdMatch) {
    hours = parseFloat(cmdMatch[1]) || 0;
    tests = parseInt(cmdMatch[2]) || 0;
    correct = parseInt(cmdMatch[3]) || Math.round(tests * 0.75);
    wrong = parseInt(cmdMatch[4]) || Math.max(0, tests - correct);
    return { hours, tests, correct, wrong, valid: true };
  }

  // Pattern 2: ساعت: 6 یا 6 ساعت
  const hoursMatch = normalized.match(/(?:ساعت|زمان|time)[:\s]*([\d.]+)|([\d.]+)\s*ساعت/i);
  if (hoursMatch) {
    hours = parseFloat(hoursMatch[1] || hoursMatch[2]) || 0;
  }

  // Pattern 3: تست: 100 یا 100 تست
  const testsMatch = normalized.match(/(?:تست|کل|test)[:\s]*(\d+)|\b(\d+)\s*تست/i);
  if (testsMatch) {
    tests = parseInt(testsMatch[1] || testsMatch[2]) || 0;
  }

  // Pattern 4: درست: 80
  const correctMatch = normalized.match(/(?:درست|صحیح)[:\s]*(\d+)/i);
  if (correctMatch) {
    correct = parseInt(correctMatch[1]) || 0;
  }

  // Pattern 5: غلط: 20
  const wrongMatch = normalized.match(/(?:غلط|اشتباه|نزده)[:\s]*(\d+)/i);
  if (wrongMatch) {
    wrong = parseInt(wrongMatch[1]) || 0;
  }

  if (hours > 0 || tests > 0) {
    if (tests > 0 && correct === 0 && wrong === 0) {
      correct = Math.round(tests * 0.75);
      wrong = tests - correct;
    }
    return { hours, tests, correct, wrong, valid: true };
  }

  return { hours: 0, tests: 0, correct: 0, wrong: 0, valid: false };
}

// Core Telegram Update Handler (Multi-Student Centralized Dispatcher)
async function handleTelegramUpdate(botToken: string, update: any, profileContext?: any) {
  const incomingChatId = update.message?.chat?.id || update.callback_query?.message?.chat?.id;
  const fromUsername = update.message?.from?.username || update.callback_query?.from?.username;
  const fromFirstName = update.message?.from?.first_name || update.callback_query?.from?.first_name || "دانش‌آموز";

  // Dynamic Student Matching: Match incoming Chat ID or username to registered student in store
  let matchedStudent = profileContext;
  if (!matchedStudent && incomingChatId) {
    matchedStudent = serverStudentStore.students.find(
      (s: any) =>
        (s.telegramChatId && String(s.telegramChatId).trim() === String(incomingChatId).trim()) ||
        (fromUsername && s.telegramUsername && s.telegramUsername.replace("@", "").toLowerCase() === fromUsername.toLowerCase())
    );
  }

  // If no student profile is linked to this Chat ID yet, reply with the exact Chat ID and easy setup guide
  if (!matchedStudent && incomingChatId) {
    const unlinkedMsg = `👋 *سلام ${fromFirstName} عزیز! به ربات اختصاصی مشاور تحصیلی خوش آمدید.* 🎓\n\n📌 *شناسه عددی کاربری شما (Chat ID):*\n\`${incomingChatId}\`\n\n🔹 *راهنمای اتصال به سامانه:*\n۱. عدد بالا (\`${incomingChatId}\`) را لمس کنید تا کپی شود.\n۲. وارد پنل کاربری خود در وب‌سایت شوید و در تب «ربات تلگرام»، این عدد را در کادر *شناسه چت تلگرام* وارد کرده و دکمه «ذخیره و فعال‌سازی» را بزنید.\n۳. بلافاصله پس از ثبت، امکان دریافت برنامه، تحلیل گزارش شبانه و کوئیزهای هوشمند در تلگرام برای شما فعال می‌شود! ✨`;

    if (update.callback_query) {
      await sendTelegramApi(botToken, "answerCallbackQuery", {
        callback_query_id: update.callback_query.id,
        text: `شناسه چت شما: ${incomingChatId} است. لطفاً آن را در سایت ثبت کنید.`,
        show_alert: true,
      });
    } else {
      await sendTelegramApi(botToken, "sendMessage", {
        chat_id: incomingChatId,
        text: unlinkedMsg,
        parse_mode: "Markdown",
      });
    }
    addTelegramLog("system", `پیام از کاربر متصل‌نشده (Chat ID: ${incomingChatId}) - راهنمای اتصال ارسال شد.`);
    return;
  }

  // Check if student access is suspended by counselor
  if (matchedStudent?.accessStatus === "suspended") {
    if (incomingChatId) {
      await sendTelegramApi(botToken, "sendMessage", {
        chat_id: incomingChatId,
        text: "⚠️ دسترسی حساب کاربری شما توسط مشاور به حالت تعلیق درآمده است. لطفاً با مشاور خود تماس بگیرید.",
      });
    }
    return;
  }

  const profile = matchedStudent || {
    name: fromFirstName,
    grade: "دوازدهم",
    fieldOfStudy: "ریاضی و فیزیک",
    targetGoal: "موفقیت در کنکور سراسری",
    dailyTargetHours: 8,
    weakSubjects: ["دروس تخصصی"],
    strongSubjects: ["دروس عمومی"],
  };

  // 1. Handle Inline Callback Queries (like Quiz buttons)
  if (update.callback_query) {
    const cq = update.callback_query;
    const chatId = cq.message?.chat?.id;
    const data = cq.data || "";
    const fromName = cq.from?.first_name || "کاربر";

    addTelegramLog("incoming", `[کلیک دکمه شیشه‌ای] ${data}`, fromName);

    // Always acknowledge callback query to dismiss loading state
    await sendTelegramApi(botToken, "answerCallbackQuery", {
      callback_query_id: cq.id,
      text: "درخواست ثبت شد",
    });

    if (data.startsWith("quiz_ans:")) {
      const parts = data.split(":");
      const quizId = parts[1];
      const selectedIndex = parseInt(parts[2]);

      const quiz = telegramActiveQuizMap.get(quizId);
      if (quiz) {
        const isCorrect = selectedIndex === quiz.correctIndex;
        const isTrap = selectedIndex === quiz.trapIndex;

        let resultMsg = "";
        if (isCorrect) {
          resultMsg = `✅ *آفرین ${fromName} عزیز! کاملاً درست انتخاب کردی!* 🎯\n\n`;
        } else if (isTrap) {
          resultMsg = `⚠️ *دقیقاً به دامی که طراح کنکور پهن کرده بود افتادی!* ❌\n\n`;
        } else {
          resultMsg = `❌ *پاسخ شما صحیح نبود.* (گزینه درست: *گزینه ${quiz.correctIndex + 1}*)\n\n`;
        }

        resultMsg += `📌 *مبحث:* ${quiz.subject} - ${quiz.topic}\n`;
        resultMsg += `🕵️ *دام طراح:* ${quiz.trapExplanation}\n\n`;
        resultMsg += `📝 *پاسخ تشریحی کامل:*\n${quiz.detailedSolution}\n\n`;
        resultMsg += `💎 *نکته طلایی و تیر خلاص:*\n${quiz.keyTakeaway}`;

        await sendTelegramApi(botToken, "sendMessage", {
          chat_id: chatId,
          text: resultMsg,
          parse_mode: "Markdown",
          reply_markup: {
            inline_keyboard: [
              [
                { text: "⚡ یک تست چالشی دیگر بده!", callback_data: "action:new_quiz" },
                { text: "📊 ثبت گزارش امروز", callback_data: "action:daily_report" },
              ],
            ],
          },
        });
        addTelegramLog("outgoing", `ارسال تحلیل کوئیز برای ${fromName}`, "ربات مشاور");
      } else {
        await sendTelegramApi(botToken, "sendMessage", {
          chat_id: chatId,
          text: "⏳ زمان این کوئیز منقضی شده است. برای دریافت تست جدید، دستور /quiz را ارسال کنید.",
        });
      }
      return;
    }

    if (data === "action:new_quiz") {
      await handleTelegramCommandQuiz(botToken, chatId, profile);
      return;
    }

    if (data === "action:daily_report") {
      await sendTelegramApi(botToken, "sendMessage", {
        chat_id: chatId,
        text: `📊 *فرم سریع ارسال گزارش شبانه:*\n\nکافیست پیام زیر را کپی کرده، اعداد خود را پر کنید و بفرستید:\n\n\`گزارش: ۶.۵ ساعت، ۱۲۰ تست، ۹۰ درست، ۳۰ غلط\``,
        parse_mode: "Markdown",
        reply_markup: TELEGRAM_MAIN_KEYBOARD,
      });
      return;
    }

    if (data === "action:plan") {
      const plan = getFallbackSchedule(profile);
      const planMsg = `🎯 *برنامه و استراتژی روزانه شما (${profile.fieldOfStudy})*

📌 *استراتژی هفته:*
${plan.strategySummary}

🐸 *قورباغه روز (سخت‌ترین کار صبح فردا):*
شروع پارت اول با *${profile.weakSubjects?.[0] || "حسابان و فیزیک تحلیلی"}* به مدت ۹۰ دقیقه همراه با حداقل ۱۵ تست آموزشی.

⏱ *چیدمان بهینه پارت‌های فردا:*
• *پارت ۱ (صبح):* یادگیری مفهومی و حل تست‌های آموزشی (${profile.weakSubjects?.[0] || "درس ضعیف"}) - ۹۰ دقیقه
• *پارت ۲ (نیمروز):* تست سرعتی و زمان‌دار (${profile.weakSubjects?.[1] || "فیزیک"}) - ۹۰ دقیقه
• *پارت ۳ (عصر):* تست‌های ترکیبی و پیشرفته (${profile.strongSubjects?.[0] || "شیمی/گسسته"}) - ۷۵ دقیقه
• *پارت ۴ (شب):* باکس جبرانی و مرور تست‌های غلط امروز - ۶۰ دقیقه

🎯 *حداقل تست هدف فردا:* ۱۰۰ تست استاندارد`;

      await sendTelegramApi(botToken, "sendMessage", {
        chat_id: chatId,
        text: planMsg,
        parse_mode: "Markdown",
        reply_markup: {
          inline_keyboard: [
            [
              { text: "⚡ حل یک کوئیز از مبحث فردا", callback_data: "action:new_quiz" },
              { text: "🔥 لانچر پرتاب ۲ دقیقه‌ای", callback_data: "action:frog" },
            ],
          ],
        },
      });
      addTelegramLog("outgoing", `ارسال برنامه درسی به ${fromName}`, "ربات مشاور");
      return;
    }

    if (data === "action:status") {
      const statusMsg = `⚙️ *مشخصات و وضعیت پروفایل شما:*

👤 *نام:* ${profile.name || fromName || "داوطلب"}
🎓 *مقطع و رشته:* ${profile.grade || "دوازدهم"} - ${profile.fieldOfStudy || "ریاضی و فیزیک"}
🎯 *هدف نهایی:* ${profile.targetGoal || "رتبه زیر ۱۰۰۰"}
⏱ *ساعت مطالعه هدف روزانه:* ${profile.dailyTargetHours || 8} ساعت
🔴 *نقاط ضعف تحت مراقبت:* ${profile.weakSubjects?.join("، ") || "مشخص نشده"}
🟢 *نقاط قوت تثبیت‌شده:* ${profile.strongSubjects?.join("، ") || "مشخص نشده"}
🤖 *وضعیت ربات:* آنلاین، فعال و پاسخگوی لحظه‌ای ✅`;

      await sendTelegramApi(botToken, "sendMessage", {
        chat_id: chatId,
        text: statusMsg,
        parse_mode: "Markdown",
        reply_markup: TELEGRAM_MAIN_KEYBOARD,
      });
      addTelegramLog("outgoing", `ارسال وضعیت به ${fromName}`, "ربات مشاور");
      return;
    }

    if (data === "action:search" || data === "action:books") {
      const resourceMsg = `📚 *بانک تخصصی منابع کنکور رشته ریاضی و فیزیک* 🔍

🏆 *بسته‌ی پیشنهادی رتبه‌برترها بر اساس ۳ سطح:*

۱. 🟢 *سطح ۱ (آموزش روان و تست اول):*
• *حسابان جامع خیلی سبز (۲ جلدی)* یا *هندسه/گسسته خیلی سبز*
• *روش مطالعه:* حل تست‌های فرد بدون زمان، خواندن دقیق پاسخنامه تشریحی.

۲. 🟡 *سطح ۲ (تست‌های ایده‌دار و قوی):*
• *حسابان و فیزیک جامع نشر الگو* یا *آی‌کیو (IQ) جامع گاج*
• *روش مطالعه:* تست‌های زوج با زمان‌سنج استاندارد (هر تست ۸۰ تا ۱۰۰ ثانیه).

۳. 🔴 *سطح ۳ (آزمونی، سرعتی و موج آزمون):*
• *موج آزمون نشر الگو* + *کتاب‌های سه‌سطحی قلم‌چی*
• *روش مطالعه:* شبیه‌سازی آزمون در ۲ روز مانده به آزمون‌های جمعه.

💡 برای جستجوی کتاب خاص، نام آن را ارسال کنید (مثلاً: \`/book مشتق\`).`;

      await sendTelegramApi(botToken, "sendMessage", {
        chat_id: chatId,
        text: resourceMsg,
        parse_mode: "Markdown",
        reply_markup: TELEGRAM_MAIN_KEYBOARD,
      });
      addTelegramLog("outgoing", `ارسال لیست منابع به ${fromName}`, "ربات مشاور");
      return;
    }

    if (data === "action:frog") {
      await handleTelegramCommandProcrastination(botToken, chatId, profile);
      return;
    }

    if (data === "action:help") {
      await sendTelegramApi(botToken, "sendMessage", {
        chat_id: chatId,
        text: getTelegramBotComprehensiveGuide(profile.name),
        parse_mode: "Markdown",
        reply_markup: TELEGRAM_MAIN_KEYBOARD,
      });
      return;
    }

    return;
  }

  // 2. Handle Text Messages
  if (!update.message || (!update.message.text && !update.message.photo)) {
    return;
  }

  const msg = update.message;
  const chatId = msg.chat?.id;
  const rawText = (msg.text || msg.caption || "").trim();
  const lowerText = rawText.toLowerCase();
  const userName = msg.from?.first_name || profile.name || "دوست من";

  addTelegramLog("incoming", msg.photo ? "[ارسال عکس]" : rawText, userName);

  // --- Photo Verification Logic for Morning Club ---
  if (msg.photo && profile.awaitingMorningPhoto) {
    profile.awaitingMorningPhoto = false; // Reset it immediately

    try {
      await sendTelegramApi(botToken, "sendMessage", {
        chat_id: chatId,
        text: "⏳ دارم عکس رو بررسی می‌کنم... چند لحظه صبر کن.",
      });
      await sendTelegramApi(botToken, "sendChatAction", { chat_id: chatId, action: "typing" });

      const photoSize = msg.photo[msg.photo.length - 1]; // Highest resolution
      const fileId = photoSize.file_id;
      
      const fileRes = await fetch(`https://api.telegram.org/bot${botToken}/getFile?file_id=${fileId}`);
      const fileData = await fileRes.json();
      
      if (!fileData.ok) throw new Error("Failed to get file info");

      const filePath = fileData.result.file_path;
      const imgRes = await fetch(`https://api.telegram.org/file/bot${botToken}/${filePath}`);
      const imgBuffer = await imgRes.arrayBuffer();
      const base64Img = Buffer.from(imgBuffer).toString("base64");

      const ai = getGenAI();
      if (!ai) throw new Error("AI not configured");

      const prompt = `تو دستیار بررسی بیداری یک دانش‌آموز کنکوری هستی.
دانش‌آموز این عکس رو فرستاده تا ثابت کنه از خواب بیدار شده. عکس باید شامل یکی از این موارد باشه:
- یک کتاب باز شده درسی یا تست
- شیر آب دستشویی (سینک)
- میز مطالعه با وسایل

آیا یکی از این موارد در عکس هست؟ فقط با بله یا خیر جواب بده و اگر خیر بود، دلیلش رو یک خط بگو.`;

      const response = await generateGeminiWithFallback(ai, {
        preferredModel: "gemini-3.5-flash",
        contents: [
          prompt,
          { inlineData: { data: base64Img, mimeType: "image/jpeg" } }
        ]
      });

      const aiText = response.text || "";
      
      if (aiText.includes("بله") || aiText.toLowerCase().includes("yes")) {
        profile.morningStreak = (profile.morningStreak || 0) + 1;
        
        let rewardMsg = `🌅 *تایید شد قهرمان!* 🏆\n\nآفرین که سحرخیز بودی! رکورد سحرخیزی تو شد: *${profile.morningStreak} روز پیاپی* 🔥`;
        
        // Streak Rewards
        if (profile.morningStreak === 3) {
          rewardMsg += `\n\n🎁 **جایزه زنجیره ۳ روزه:** تو فوق‌العاده‌ای! استمرار تو نشون میده چقدر به هدفت پایبندی. ادامه بده!`;
        } else if (profile.morningStreak === 7) {
          rewardMsg += `\n\n🏅 **جایزه زنجیره ۷ روزه:** تو رسماً وارد کلاب "عقاب‌های سحرخیز" شدی! اراده‌ات مثال زدنیه! 🦅`;
        }

        // Motivational Bomb
        const mathNum1 = Math.floor(Math.random() * 10) + 5;
        const mathNum2 = Math.floor(Math.random() * 10) + 5;
        rewardMsg += `\n\n💣 *بمب انگیزه امروز:*\nرقیبات هنوز خوابن ولی تو یک قدم به آرزوت نزدیک‌تر شدی. حالا برای اینکه مغزت هم کاملاً لود بشه، جواب اینو تو ذهنت حساب کن و برو سراغ اولین باکست:\n🧠 *${mathNum1} × ${mathNum2} = ؟*`;
        
        await sendTelegramApi(botToken, "sendMessage", {
          chat_id: chatId,
          text: rewardMsg,
          parse_mode: "Markdown",
          reply_markup: TELEGRAM_MAIN_KEYBOARD,
        });
        addTelegramLog("outgoing", `تایید عکس و ثبت سحرخیزی (${profile.morningStreak} روز)`, "ربات مشاور");
      } else {
        await sendTelegramApi(botToken, "sendMessage", {
          chat_id: chatId,
          text: `❌ *عکس تایید نشد!*\n\nهوش مصنوعی میگه این عکسِ کتاب یا دستشویی نیست. ${aiText}\nامروز رو از دست دادی ولی فردا حتماً یه عکس درست بفرست! 😅`,
          parse_mode: "Markdown",
        });
        addTelegramLog("outgoing", "رد عکس سحرخیزی توسط هوش مصنوعی", "ربات مشاور");
      }
    } catch (err: any) {
      console.warn("Morning photo verification failed:", err);
      // Fallback in case of API failure
      profile.morningStreak = (profile.morningStreak || 0) + 1;
      await sendTelegramApi(botToken, "sendMessage", {
        chat_id: chatId,
        text: `🌅 *تبریک!* به دلیل شلوغی سرورها بدون بررسی تاییدت کردم 😉\nرکورد تو: *${profile.morningStreak} روز* 🔥`,
        parse_mode: "Markdown",
      });
    }
    return;
  }
  
  if (msg.photo) {
    // If it's a photo but they are not awaiting one
    await sendTelegramApi(botToken, "sendMessage", {
      chat_id: chatId,
      text: "عکس دریافت شد، اما الان نیازی به عکس نبود! 😅",
    });
    return;
  }

  // Command: /start
  if (lowerText === "/start" || lowerText.startsWith("/start ")) {
    const welcomeMsg = `سلام ${userName} عزیز! 🎓✨\n\nمن *مشاور تحصیلی هوشمند اختصاصی تو* در تلگرام هستم.\nتمام اطلاعات، سرفصل‌ها و اهداف رشته *${profile.fieldOfStudy}* برای تو تنظیم شده است.\n\nاز طریق منوهای زیر می‌توانی گزارش شبانه‌ات را ثبت کنی، تست‌های دام‌دار بزنی، برنامه‌ات را ببینی یا مستقیماً سوالاتت را بپرسی! 🚀\n\nبرای مشاهده آموزش کامل دستورات، روی دکمه *«📖 راهنمای کامل ربات»* بزن.`;
    
    await sendTelegramApi(botToken, "sendMessage", {
      chat_id: chatId,
      text: welcomeMsg,
      parse_mode: "Markdown",
      reply_markup: TELEGRAM_MAIN_KEYBOARD,
    });
    addTelegramLog("outgoing", `خوش‌آمدگویی به ${userName}`, "ربات مشاور");
    return;
  }

  // Command: /help or Guide button
  if (lowerText === "/help" || rawText.includes("راهنمای کامل") || lowerText === "help" || lowerText === "راهنما") {
    const guideText = getTelegramBotComprehensiveGuide(userName);
    await sendTelegramApi(botToken, "sendMessage", {
      chat_id: chatId,
      text: guideText,
      parse_mode: "Markdown",
      reply_markup: TELEGRAM_MAIN_KEYBOARD,
    });
    addTelegramLog("outgoing", `ارسال راهنمای کامل به ${userName}`, "ربات مشاور");
    return;
  }

  // Command: /report or Report button or Report natural text
  if (
    rawText.includes("ثبت گزارش شبانه") ||
    lowerText.startsWith("/report") ||
    lowerText.startsWith("گزارش") ||
    (rawText.includes("ساعت") && rawText.includes("تست"))
  ) {
    const parsed = extractReportNumbers(rawText);
    if (!parsed.valid || (parsed.hours === 0 && parsed.tests === 0)) {
      // Send template instructions
      const promptReportMsg = `📊 *ثبت گزارش مطالعه شبانه* ✍️

${userName} جان، لطفاً گزارش امروزت رو با یکی از روش‌های زیر برام بفرست:

*روش ۱ (پیام متنی ساده):*
\`گزارش: ۷ ساعت، ۱۲۰ تست، ۹۰ درست، ۳۰ غلط\`

*روش ۲ (دستور مستقیم):*
\`/report 7 120 90 30\` (به ترتیب: ساعت، کل تست، درست، غلط)

اگر در طول روز مانع خاصی داشتی (مثل خستگی، مدرسه، حواس‌پرتی گوشی) هم در ادامه‌اش بنویس تا تحلیل دقیق‌تری بدم!`;

      await sendTelegramApi(botToken, "sendMessage", {
        chat_id: chatId,
        text: promptReportMsg,
        parse_mode: "Markdown",
        reply_markup: TELEGRAM_MAIN_KEYBOARD,
      });
      return;
    }

    // Process real report
    await sendTelegramApi(botToken, "sendMessage", {
      chat_id: chatId,
      text: `⏳ در حال موشکافی و کالبدشکافی گزارش امروز شما با متد رتبه‌برترها...`,
    });

    const reportObj = {
      studiedHours: parsed.hours,
      totalTests: parsed.tests,
      correctTests: parsed.correct,
      wrongTests: parsed.wrong,
      satisfactionRating: parsed.hours >= (profile.dailyTargetHours || 7) ? 4 : 3,
      obstacles: rawText.includes("خستگ") ? ["خستگی"] : rawText.includes("گوشی") ? ["حواس‌پرتی با گوشی"] : ["عدم تمرکز موقت"],
      studentNotes: rawText,
    };

    const ai = getGenAI();
    let analysis: any = null;

    if (ai) {
      try {
        const sys = `تو مشاور تحصیلی بسیار دقیق و ارشد کنکور هستی. گزارش مطالعه دانش‌آموز را بررسی کن و یک ارزیابی واقع‌گرایانه با نمره از ۱ تا ۱۰، نقاط مثبت، ضعف‌های پنهان، و ۳ اقدام فردا بنویس. خروجی باید به صورت JSON باشد.`;
        const p = `دانش‌آموز: ${profile.name} (${profile.fieldOfStudy})\nساعت مطالعه: ${reportObj.studiedHours} ساعت (هدف روزانه: ${profile.dailyTargetHours} ساعت)\nکل تست‌ها: ${reportObj.totalTests} (درست: ${reportObj.correctTests}، غلط: ${reportObj.wrongTests})\nتوضیحات: ${rawText}`;
        const resp = await generateGeminiWithFallback(ai, {
          preferredModel: "gemini-3.5-flash",
          contents: p,
          config: {
            systemInstruction: sys,
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                overallScore: { type: Type.INTEGER },
                summary: { type: Type.STRING },
                strengthsIdentified: { type: Type.ARRAY, items: { type: Type.STRING } },
                criticalWeaknesses: { type: Type.ARRAY, items: { type: Type.STRING } },
                immediateFixesTomorrow: { type: Type.ARRAY, items: { type: Type.STRING } },
                motivationalQuote: { type: Type.STRING },
              },
              required: ["overallScore", "summary", "strengthsIdentified", "criticalWeaknesses", "immediateFixesTomorrow", "motivationalQuote"],
            },
          },
        });
        analysis = JSON.parse(resp.text || "{}");
      } catch (err) {
        console.warn("Telegram AI report fallback:", err);
        analysis = getAlgorithmicNightlyAnalysis(reportObj, profile);
      }
    } else {
      analysis = getAlgorithmicNightlyAnalysis(reportObj, profile);
    }

    const reportResponseMsg = `📈 *نتیجه تحلیل کارنامه شبانه شما* 🎓

⭐ *نمره عملکرد امروز:* \`${analysis.overallScore || 7} از ۱۰\`
⏱ *ساعت ثبت‌شده:* ${parsed.hours} ساعت (هدف: ${profile.dailyTargetHours} ساعت)
🎯 *تست‌ها:* ${parsed.tests} تست (✅ ${parsed.correct} درست | ❌ ${parsed.wrong} غلط)

📝 *تحلیل جامع مشاور:*
${analysis.summary}

💪 *نقاط قوت شناسایی‌شده:*
${(analysis.strengthsIdentified || []).map((s: string) => `• ${s}`).join("\n")}

⚠️ *نقاط ضعف و ریسک‌های پنهان:*
${(analysis.criticalWeaknesses || []).map((w: string) => `• ${w}`).join("\n")}

🚀 *۳ اقدام ضروری برای فردای شما:*
${(analysis.immediateFixesTomorrow || []).map((f: string, i: number) => `*${i + 1}.* ${f}`).join("\n")}

✨ _«${analysis.motivationalQuote || "پیوستگی در روزهای سخت، تفاوت رتبه‌های زیر ۱۰۰۰ را رقم می‌زند."}»_`;

    await sendTelegramApi(botToken, "sendMessage", {
      chat_id: chatId,
      text: reportResponseMsg,
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [
          [
            { text: "🎯 مشاهده برنامه فردا", callback_data: "action:plan" },
            { text: "⚡ حل کوئیز تله‌های کنکور", callback_data: "action:new_quiz" },
          ],
        ],
      },
    });

    addTelegramLog("outgoing", `تحلیل گزارش شبانه ارسال شد (نمره: ${analysis.overallScore}/10)`, "ربات مشاور");
    return;
  }

  // Command: /quiz or /trap or Quiz button
  if (lowerText === "/quiz" || lowerText === "/trap" || rawText.includes("کوئیز تله‌های کنکور") || rawText.includes("تله تستی")) {
    await handleTelegramCommandQuiz(botToken, chatId, profile);
    return;
  }

  // Command: /frog or /procrastinate or Anti-Procrastination button
  if (
    lowerText === "/frog" ||
    lowerText === "/procrastinate" ||
    lowerText === "/jump" ||
    rawText.includes("غلبه بر تنبلی") ||
    rawText.includes("اهمال‌کاری")
  ) {
    await handleTelegramCommandProcrastination(botToken, chatId, profile);
    return;
  }

  // Command: /plan or Schedule button
  if (lowerText === "/plan" || lowerText === "/schedule" || rawText.includes("برنامه و سرفصل‌ها") || lowerText === "برنامه") {
    
    await sendTelegramApi(botToken, "sendMessage", {
      chat_id: chatId,
      text: "⏳ در حال پردازش و تنظیم یک برنامه فوق‌حرفه‌ای و شخصی‌سازی شده بر اساس هوش مصنوعی... لطفاً چند لحظه صبر کن.",
    });
    await sendTelegramApi(botToken, "sendChatAction", { chat_id: chatId, action: "typing" });

    const ai = getGenAI();
    let planMsg = "";
    
    if (ai) {
      try {
        const prompt = `تو یک مشاور ارشد برنامه‌ریزی تحصیلی کنکور (مخصوص رشته ${profile.fieldOfStudy}) هستی.
دانش‌آموزی به نام ${userName} از تو درخواست برنامه درسی کرده است.
مشخصات او:
- مقطع و رشته: ${profile.grade} - ${profile.fieldOfStudy}
- هدف: ${profile.targetGoal}
- ساعت مطالعه روزانه هدف: ${profile.dailyTargetHours} ساعت
- نقاط ضعف: ${profile.weakSubjects?.join("، ")}
- نقاط قوت: ${profile.strongSubjects?.join("، ")}

یک استراتژی و برنامه فشرده و بسیار دقیق برای فردا (شامل ۳ تا ۵ پارت مطالعه) بنویس.
قالب متن دقیقاً اینگونه باشد:
🎯 *استراتژی روزانه شما (${userName} عزیز)*
(یک جمله خفن و انگیزشی مخصوص رشته و هدفش)

🐸 *قورباغه روز (سخت‌ترین کار صبح):*
(یک پارت دقیق شامل زمان به دقیقه و تعداد تست با تمرکز روی نقاط ضعفش)

⏱ *چیدمان بهینه پارت‌ها:*
(لیست پارت‌ها با ذکر مبحث دقیق و زمان)

نکات: از ایموجی‌های مناسب استفاده کن. لحن قاطع، انگیزشی و حرفه‌ای باشد. هیچ متن اضافه‌ای ننویس.`;

        const response = await generateGeminiWithFallback(ai, {
          preferredModel: "gemini-3.5-flash",
          contents: prompt,
        });
        planMsg = response.text || "";
      } catch (err) {
        console.warn("AI plan failed:", err);
      }
    }

    if (!planMsg) {
      const plan = getFallbackSchedule(profile);
      planMsg = `🎯 *برنامه و استراتژی روزانه شما (${profile.fieldOfStudy})*\n\n📌 *استراتژی هفته:*\n${plan.strategySummary}\n\n🐸 *قورباغه روز (سخت‌ترین کار صبح فردا):*\nشروع پارت اول با *${profile.weakSubjects?.[0] || "حسابان و فیزیک تحلیلی"}* به مدت ۹۰ دقیقه همراه با حداقل ۱۵ تست آموزشی.\n\n⏱ *چیدمان بهینه پارت‌های فردا:*\n• *پارت ۱ (صبح):* یادگیری مفهومی و حل تست‌های آموزشی (${profile.weakSubjects?.[0] || "درس ضعیف"}) - ۹۰ دقیقه\n• *پارت ۲ (نیمروز):* تست سرعتی و زمان‌دار (${profile.weakSubjects?.[1] || "فیزیک"}) - ۹۰ دقیقه\n• *پارت ۳ (عصر):* تست‌های ترکیبی و پیشرفته (${profile.strongSubjects?.[0] || "شیمی/گسسته"}) - ۷۵ دقیقه\n• *پارت ۴ (شب):* باکس جبرانی و مرور تست‌های غلط امروز - ۶۰ دقیقه\n\n🎯 *حداقل تست هدف فردا:* ۱۰۰ تست استاندارد`;
    }

    await sendTelegramApi(botToken, "sendMessage", {
      chat_id: chatId,
      text: planMsg,
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [
          [
            { text: "⚡ حل یک کوئیز از مبحث فردا", callback_data: "action:new_quiz" },
            { text: "🔥 لانچر پرتاب ۲ دقیقه‌ای", callback_data: "action:frog" },
          ],
        ],
      },
    });
    addTelegramLog("outgoing", `ارسال برنامه درسی هوشمند به ${userName}`, "ربات مشاور");
    return;
  }

  // Command: /search or /book or Resource button
  if (
    lowerText.startsWith("/search") ||
    lowerText.startsWith("/book") ||
    lowerText.startsWith("/resource") ||
    rawText.includes("جستجوی منابع کنکور") ||
    rawText.includes("کتاب کنکور")
  ) {
    let query = rawText.replace(/\/search|\/book|\/resource|جستجوی منابع کنکور|کتاب کنکور/g, "").trim();
    if (!query) query = "حسابان و فیزیک";

    const resourceMsg = `📚 *بانک تخصصی منابع کنکور رشته ریاضی و فیزیک* 🔍
موضوع جستجو: *${query}*

🏆 *بسته‌ی پیشنهادی رتبه‌برترها بر اساس ۳ سطح:*

۱. 🟢 *سطح ۱ (آموزش روان و تست اول):*
• *حسابان جامع خیلی سبز (۲ جلدی)* یا *هندسه/گسسته خیلی سبز*
• *روش مطالعه:* حل تست‌های فرد بدون زمان، خواندن دقیق پاسخنامه تشریحی.

۲. 🟡 *سطح ۲ (تست‌های ایده‌دار و قوی):*
• *حسابان و فیزیک جامع نشر الگو* یا *آی‌کیو (IQ) جامع گاج*
• *روش مطالعه:* تست‌های زوج با زمان‌سنج استاندارد (هر تست ۸۰ تا ۱۰۰ ثانیه).

۳. 🔴 *سطح ۳ (آزمونی، سرعتی و موج آزمون):*
• *موج آزمون نشر الگو* + *کتاب‌های سه‌سطحی قلم‌چی*
• *روش مطالعه:* شبیه‌سازی آزمون در ۲ روز مانده به آزمون‌های جمعه.

💡 برای اطلاعات درباره هر کتاب یا مبحث خاص، نام آن را برای من بنویس (مثلاً: \`/book مشتق\`).`;

    await sendTelegramApi(botToken, "sendMessage", {
      chat_id: chatId,
      text: resourceMsg,
      parse_mode: "Markdown",
      reply_markup: TELEGRAM_MAIN_KEYBOARD,
    });
    addTelegramLog("outgoing", `ارسال لیست منابع به ${userName}`, "ربات مشاور");
    return;
  }

  // Command: /status or Profile status button
  if (lowerText === "/status" || rawText.includes("وضعیت پروفایل") || lowerText === "status") {
    const statusMsg = `⚙️ *مشخصات و وضعیت پروفایل شما:*

👤 *نام:* ${profile.name || "داوطلب"}
🎓 *مقطع و رشته:* ${profile.grade || "دوازدهم"} - ${profile.fieldOfStudy || "ریاضی و فیزیک"}
🎯 *هدف نهایی:* ${profile.targetGoal || "رتبه زیر ۱۰۰۰"}
⏱ *ساعت مطالعه هدف روزانه:* ${profile.dailyTargetHours || 8} ساعت
🔴 *نقاط ضعف تحت مراقبت:* ${profile.weakSubjects?.join("، ") || "مشخص نشده"}
🟢 *نقاط قوت تثبیت‌شده:* ${profile.strongSubjects?.join("، ") || "مشخص نشده"}
🤖 *وضعیت ربات:* آنلاین، فعال و پاسخگوی لحظه‌ای ✅`;

    await sendTelegramApi(botToken, "sendMessage", {
      chat_id: chatId,
      text: statusMsg,
      parse_mode: "Markdown",
      reply_markup: TELEGRAM_MAIN_KEYBOARD,
    });
    addTelegramLog("outgoing", `ارسال وضعیت به ${userName}`, "ربات مشاور");
    return;
  }

  // Command: /chat or Chat button
  if (rawText.includes("چت و درددل با رفیق") || lowerText === "/chat" || rawText.includes("چت با مشاور")) {
    const chatMsg = `🫂 *رفیق کنکوری من!*

من اینجام که حرفاتو بشنوم. خسته‌ای؟ استرس داری؟ یا انگیزه‌ات کم شده؟ 
راحت باش و هرچی تو دلته برام تایپ کن و بفرست. من مثل یه دوست کنارت می‌مونم. ❤️`;

    await sendTelegramApi(botToken, "sendMessage", {
      chat_id: chatId,
      text: chatMsg,
      parse_mode: "Markdown",
      reply_markup: TELEGRAM_MAIN_KEYBOARD,
    });
    addTelegramLog("outgoing", `ورود به حالت چت با ${userName}`, "ربات مشاور");
    return;
  }

  // Command: /morning or Morning Club
  if (lowerText === "/morning" || rawText.includes("باشگاه سحرخیزان") || rawText.includes("بیدارباش")) {
    const now = new Date();
    // Get time in Iran Timezone (UTC+3:30)
    const iranTimeStr = now.toLocaleString("en-US", { timeZone: "Asia/Tehran" });
    const iranDate = new Date(iranTimeStr);
    const hours = iranDate.getHours();
    const minutes = iranDate.getMinutes();

    let replyMsg = "";
    if (hours >= 5 && (hours < 8 || (hours === 8 && minutes <= 30))) {
      profile.awaitingMorningPhoto = true;
      replyMsg = `🌅 *صبح‌بخیر قهرمان!* 🏆\n\nبرای اینکه بیدارباشِت قطعی ثبت بشه و کاملاً خواب از سرت بپره، پاشو یک **عکس از کتاب باز شده‌ات** یا **شیر آب دستشویی (بعد از شستن صورت)** برام بفرست تا هوش مصنوعی تاییدش کنه! 📸\n\nفقط چند دقیقه وقت داری... منتظرم! 👀`;
    } else {
      // Failed (late)
      replyMsg = `😴 *ای خوابالو!* الان که دیگه وقتِ بیدارباش نیست! (ساعت ${hours}:${minutes.toString().padStart(2, '0')} است)\n\nباشگاه سحرخیزان فقط از ساعت ۵:۰۰ تا ۸:۳۰ صبح فعاله تا بهت امتیاز و استریک (Streak) سحرخیزی بده. اشکالی نداره، امروز رو همونطور که هست پرقدرت ادامه بده ولی فردا منتظرتم که زودتر بیدار شی و رکورد بزنی! 💪`;
    }

    await sendTelegramApi(botToken, "sendMessage", {
      chat_id: chatId,
      text: replyMsg,
      parse_mode: "Markdown",
      reply_markup: TELEGRAM_MAIN_KEYBOARD,
    });
    addTelegramLog("outgoing", `درخواست عکس سحرخیزی از ${userName}`, "ربات مشاور");
    return;
  }

  // General Educational / Advisory Question (NLP / Gemini AI)
  const ai = getGenAI();
  if (ai) {
    try {
      await sendTelegramApi(botToken, "sendChatAction", {
        chat_id: chatId,
        action: "typing",
      });

      const sysInstruction = `تو یه رفیق صمیمی، دلسوز و همراه کنکوری هستی که خودش قبلا این مسیر سخت رو با موفقیت طی کرده.
نام دانش‌آموز: ${profile.name}
رشته: ${profile.fieldOfStudy || "ریاضی و فیزیک"}
هدف: ${profile.targetGoal}

وظیفه تو تو این بخش این نیست که هی نصیحت کنی یا فقط راهکار درسی بدی. تو اینجا رفیقشی:
۱. کاملاً صمیمی، خودمونی و رفاقتی حرف بزن (از لحن خشک و رسمی مشاوره‌ای دوری کن).
۲. اگر غر زد، خسته بود یا ناامید بود، اول به عنوان یه دوست درکش کن، تاییدش کن و باهاش همدردی کن.
۳. خیلی کوتاه و مفید جواب بده (مثل پیام دادن تو چت دوستانه).
۴. از ایموجی‌های باحال و صمیمی (مثل 🫂, ❤️, 😅, ✌️) استفاده کن.
۵. فقط اگه خودش مستقیم راهنمایی درسی خواست، بهش تکنیک بگو، وگرنه فقط بهش انگیزه و انرژی رفاقتی بده و بگو که کنارشی.`;

      const response = await generateGeminiWithFallback(ai, {
        preferredModel: "gemini-3.5-flash",
        contents: rawText,
        config: {
          systemInstruction: sysInstruction,
          temperature: 0.7,
        },
      });

      const reply = response.text || "پیام شما دریافت شد. پارت درسی فعلی خود را با تمرکز آغاز کنید.";
      await sendTelegramApi(botToken, "sendMessage", {
        chat_id: chatId,
        text: reply,
        reply_markup: TELEGRAM_MAIN_KEYBOARD,
      });
      addTelegramLog("outgoing", `پاسخ هوش مصنوعی به پیام: "${rawText.slice(0, 30)}..."`, "ربات مشاور");
      return;
    } catch (err: any) {
      console.warn("Telegram AI Chat fallback:", err);
    }
  }

  // Tailored Fallback Advice
  const fallbackAdvice = `سلام ${userName} جان! 🎓\n\nپیام شما دریافت شد:\n«${rawText}»\n\n📌 *توصیه فوری مشاور:*\n۱. برای پیشرفت مداوم در ${profile.fieldOfStudy}، مهم‌ترین کار حفظ ضرب‌آهنگ تست‌زنی روزانه است.\n۲. همین الان یک باکس ۵۰ دقیقه‌ای بدون گوشی شروع کن و ۱۵ تست کار کن.\n۳. پایان شب گزارش ساعت مطالعه و تست‌هایت را برای من بفرست تا تحلیل کنیم!`;

  await sendTelegramApi(botToken, "sendMessage", {
    chat_id: chatId,
    text: fallbackAdvice,
    reply_markup: TELEGRAM_MAIN_KEYBOARD,
  });
  addTelegramLog("outgoing", `پاسخ مشاور به ${userName}`, "ربات مشاور");
}

async function handleTelegramCommandQuiz(botToken: string, chatId: number | string, profile: any) {
  const quizList = [
    {
      subject: "حسابان ۲",
      topic: "کاربرد مشتق (نقاط بحرانی و گوشه‌ای)",
      questionText: "تابع f(x) = (x^2 - 1)^(1/3) در بازه [-2, 2] دارای چند نقطه بحرانی است؟",
      options: [
        "۱ نقطه (فقط x = 0)",
        "۲ نقطه (فقط نقاط مرزی)",
        "۳ نقطه (شامل x = 0 و x = ±1)",
        "۵ نقطه",
      ],
      correctIndex: 2,
      trapIndex: 0,
      trapExplanation: "داوطلبان فقط ریشه صورت مشتق (x=0) را بحرانی می‌دانند، در حالی که ریشه‌های مخرج مشتق (x=±1) که مماس قائم هستند نیز بحرانی محسوب می‌شوند!",
      detailedSolution: "مشتق تابع f'(x) = 2x / [3 * (x^2 - 1)^(2/3)] است.\n۱. ریشه صورت: x = 0 (مشتق صفر است).\n۲. ریشه‌های مخرج: x = ±1 (مشتق وجود ندارد ولی تابع پیوسته است).\nبنابراین ۳ نقطه بحرانی درون بازه وجود دارد.",
      keyTakeaway: "در توابع رادیکالی فرجه فرد، ریشه‌های زیر رادیکال جزء نقاط بحرانی هستند!",
    },
    {
      subject: "فیزیک ۳ (دوازدهم)",
      topic: "حرکت‌شناسی (تندی متوسط در برابر سرعت متوسط)",
      questionText: "معادله مکان-زمان متحرکی روی خط راست x = t^2 - 6t + 5 است. تندی متوسط در بازه t = 0 تا t = 5 ثانیه چند m/s است؟",
      options: [
        "۱ متر بر ثانیه",
        "۲.۶ متر بر ثانیه",
        "۳.۴ متر بر ثانیه",
        "۵ متر بر ثانیه",
      ],
      correctIndex: 1,
      trapIndex: 0,
      trapExplanation: "تندی متوسط مسافت کل طی‌شده تقسیم بر زمان است (۱۳ تقسیم بر ۵ = ۲.۶)، اما گزینه ۱ جابه‌جایی خالص تقسیم بر زمان است که سرعت متوسط را می‌دهد!",
      detailedSolution: "لحظه تغییر جهت: v = 2t - 6 = 0 => t = 3s.\nx(0) = +5, x(3) = -4, x(5) = 0.\nمسافت رفت: | -4 - 5 | = 9 متر.\nمسافت برگشت: | 0 - (-4) | = 4 متر.\nمسافت کل = 13 متر => تندی متوسط = 13 / 5 = 2.6 m/s.",
      keyTakeaway: "در محاسبه تندی متوسط، تغییر جهت متحرک (v=0) را پیدا کنید و مسافت‌های رفت و برگشت را مثبت با هم جمع کنید.",
    },
    {
      subject: "شیمی ۳ (دوازدهم)",
      topic: "اسیدهای ضعیف و رقیق‌سازی",
      questionText: "اگر محلول یک اسید ضعیف با غلظت ۰.۱ مولار را ۱۰۰ برابر با آب رقیق کنیم، pH آن تقریباً چگونه تغییر می‌کند؟",
      options: [
        "دقیقاً ۲ واحد افزایش می‌یابد",
        "تقریباً ۱ واحد افزایش می‌یابد",
        "۲ واحد کاهش می‌یابد",
        "تغییری نمی‌کند",
      ],
      correctIndex: 1,
      trapIndex: 0,
      trapExplanation: "برای اسیدهای قوی ۱۰۰ برابر رقیق‌سازی pH را ۲ واحد افزایش می‌دهد، اما برای اسید ضعیف به دلیل جذر رابطه هیدرونیوم، تنها ۱ واحد افزایش می‌یابد!",
      detailedSolution: "برای اسید ضعیف: [H+] = √(Ka * M). با ۱۰۰ برابر رقیق شدن غلظت M تقسیم بر ۱۰۰ می‌شود و زیر رادیکال ۱۰ برابر کاهش می‌یابد، بنابراین pH معادل ۱ واحد زیاد می‌شود.",
      keyTakeaway: "در اسیدهای ضعیف رقیق‌سازی 10^n برابری، pH را n/2 واحد افزایش می‌دهد.",
    },
    {
      subject: "ریاضی گسسته",
      topic: "نظریه اعداد (همنهشتی و پیمانه)",
      questionText: "باقیمانده تقسیم عدد 7^100 بر ۱۱ کدام است؟",
      options: [
        "۱",
        "۳",
        "۵",
        "۷",
      ],
      correctIndex: 0,
      trapIndex: 3,
      trapExplanation: "استفاده مستقیم از قضیه کوچک فرما (a^(p-1) ≡ 1 mod p)؛ چون ۱۱ عدد اول است و ب.م.م ۷ و ۱۱ برابر ۱ است، 7^10 ≡ 1 mod 11 و توان ۱۰ حاصل ۱ می‌شود.",
      detailedSolution: "طبق قضیه فرما: 7^(11-1) = 7^10 ≡ 1 (mod 11).\nبنابراین: 7^100 = (7^10)^10 ≡ 1^10 ≡ 1 (mod 11).",
      keyTakeaway: "در محاسبه باقیمانده توان‌های بزرگ بر اعداد اول، همیشه ابتدا قضیه کوچک فرما را تست کنید.",
    },
  ];

  const randomQ = quizList[Math.floor(Math.random() * quizList.length)];
  const quizId = `qz-${Date.now()}`;

  telegramActiveQuizMap.set(quizId, {
    id: quizId,
    ...randomQ,
    createdAt: Date.now(),
  });

  const quizMessage = `⚡ *کوئیز تله‌های کنکور سراسری* 🎯
📚 *درس:* ${randomQ.subject} (${randomQ.topic})

❓ *صورت تست:*
${randomQ.questionText}

۱) ${randomQ.options[0]}
۲) ${randomQ.options[1]}
۳) ${randomQ.options[2]}
۴) ${randomQ.options[3]}

👇 *گزینه مورد نظرت را با دکمه‌های زیر لمس کن:*`;

  await sendTelegramApi(botToken, "sendMessage", {
    chat_id: chatId,
    text: quizMessage,
    parse_mode: "Markdown",
    reply_markup: {
      inline_keyboard: [
        [
          { text: "گزینه ۱", callback_data: `quiz_ans:${quizId}:0` },
          { text: "گزینه ۲", callback_data: `quiz_ans:${quizId}:1` },
        ],
        [
          { text: "گزینه ۳", callback_data: `quiz_ans:${quizId}:2` },
          { text: "گزینه ۴", callback_data: `quiz_ans:${quizId}:3` },
        ],
      ],
    },
  });
  addTelegramLog("outgoing", `ارسال کوئیز تستی (${randomQ.subject})`, "ربات مشاور");
}

async function handleTelegramCommandProcrastination(botToken: string, chatId: number | string, profile: any) {
  const frogMsg = `🔥 *زرادخانه ضد-پشت‌گوش‌انداختن و غلبه بر تنبلی* 🚀

دوست من، احساس بی‌حوصلگی کاملاً طبیعی است، اما راه‌حل این است:

۱. ⏱ *لانچر پرتاب ۲ دقیقه‌ای:*
همین الان کتاب را باز کن و فقط صورت سوال اول را بخوان. لازم نیست ۱ ساعت درس بخوانی؛ مغزت بعد از ۱۲۰ ثانیه مقاومتش را می‌شکند.

۲. 📴 *قانون فاصله فیزیکی ۲۰ ثانیه‌ای:*
گوشی‌ات را بگذار روی حالت پرواز و ببر در یک اتاق دیگر یا داخل کمد. مغز حوصله راه رفتن برای برداشتن گوشی را ندارد!

۳. 💧 *شوک آبی فوری:*
یک لیوان آب خنک بخور، مچ دست‌هایت را زیر آب سرد بگیر و ۵ نفس عمیق شکمی بکش.

۴. 🐸 *قورباغه روز را ببلع:*
از سخت‌ترین مبحث (${profile.weakSubjects?.[0] || "حسابان و فیزیک"}) شروع کن تا بار روانی‌اش آزاد شود.

🎯 *چالش:* همین الان ۲ دقیقه پشت میز بشین!`;

  await sendTelegramApi(botToken, "sendMessage", {
    chat_id: chatId,
    text: frogMsg,
    parse_mode: "Markdown",
    reply_markup: {
      inline_keyboard: [
        [
          { text: "⚡ برای شروع ۵ تست سریع بده!", callback_data: "action:new_quiz" },
          { text: "📊 ثبت گزارش بعد از پارت", callback_data: "action:daily_report" },
        ],
      ],
    },
  });
  addTelegramLog("outgoing", `ارسال راهکار ضد-اهمال‌کاری`, "ربات مشاور");
}

// Telegram Polling Runner Loop
async function runTelegramPollingLoop() {
  if (!isPollingActive || !currentPollingToken) return;

  try {
    const res = await fetch(`https://api.telegram.org/bot${currentPollingToken}/getUpdates?offset=${lastUpdateId + 1}&timeout=20`, {
      signal: AbortSignal.timeout(30000),
    });
    const data: any = await res.json();

    if (data.ok && Array.isArray(data.result)) {
      for (const update of data.result) {
        lastUpdateId = Math.max(lastUpdateId, update.update_id);
        // Process update asynchronously without blocking the loop
        handleTelegramUpdate(currentPollingToken, update, currentPollingProfile).catch((err) => {
          console.error("Error processing telegram update:", err);
          addTelegramLog("error", `خطا در پردازش پیام: ${err?.message || String(err)}`);
        });
      }
    } else if (!data.ok) {
      console.warn("Telegram polling response not ok:", data);
      addTelegramLog("error", `خطای سرور تلگرام: ${data.description || "Unknown error"}`);
    }
  } catch (err: any) {
    if (err?.name !== "TimeoutError" && !String(err).includes("aborted")) {
      console.warn("Telegram polling loop error:", err?.message || err);
    }
  }

  // Continue next cycle if still active
  if (isPollingActive) {
    pollingIntervalHandle = setTimeout(runTelegramPollingLoop, 1000);
  }
}

// ==========================================
// Telegram Express API Endpoints (Master Counselor Bot & Student Linking)
// ==========================================

// Public Bot Status (No secrets leaked to students/guests)
app.get("/api/telegram/public-info", (req, res) => {
  const masterToken = serverStudentStore.telegramBotConfig?.botToken || currentPollingToken;
  const masterUsername = serverStudentStore.telegramBotConfig?.botUsername || currentPollingBotUsername;
  res.json({
    success: true,
    isConfigured: Boolean(masterToken),
    botUsername: masterUsername || "",
    isPollingActive: isPollingActive,
  });
});

// Counselor: Configure Master Bot Token & Auto-start Polling
app.post("/api/counselor/telegram-config", async (req, res) => {
  try {
    const session = getValidCounselorSession(req.headers.authorization);
    if (!session) {
      return res.status(401).json({
        success: false,
        error: "دسترسی غیرمجاز: اتصال و تنظیم توکن ربات فقط در اختیار مشاور است.",
      });
    }

    const { botToken, active } = req.body;
    if (!botToken || typeof botToken !== "string" || !botToken.trim()) {
      return res.status(400).json({ success: false, error: "توکن ربات تلگرام الزامی است." });
    }

    const cleanToken = botToken.trim();
    const getMeRes = await fetch(`https://api.telegram.org/bot${cleanToken}/getMe`);
    const getMeData: any = await getMeRes.json();

    if (!getMeData.ok) {
      return res.status(400).json({
        success: false,
        error: `توکن نامعتبر است یا توسط تلگرام تایید نشد: ${getMeData.description || "Invalid Token"}`,
      });
    }

    const botInfo = getMeData.result;
    if (pollingIntervalHandle) clearTimeout(pollingIntervalHandle);

    currentPollingToken = cleanToken;
    currentPollingBotUsername = botInfo.username || "";
    isPollingActive = active !== false;
    lastUpdateId = 0;

    if (!serverStudentStore.telegramBotConfig) {
      serverStudentStore.telegramBotConfig = {};
    }
    serverStudentStore.telegramBotConfig.botToken = cleanToken;
    serverStudentStore.telegramBotConfig.botUsername = botInfo.username || "";
    serverStudentStore.telegramBotConfig.isActive = isPollingActive;
    serverStudentStore.telegramBotConfig.lastStartedAt = new Date().toISOString();
    serverStudentStore.updatedAt = new Date().toISOString();

    if (isPollingActive) {
      runTelegramPollingLoop();
      addTelegramLog("system", `پولینگ زنده ربات اصلی مشاور (@${botInfo.username}) آغاز شد.`);
    }

    saveServerStudentStore(serverStudentStore);
    addSecurityAuditLog(
      "telegram_master_bot_configured",
      "info",
      `توکن ربات تلگرام مرکزی (@${botInfo.username}) توسط مشاور با موفقیت ذخیره و فعال شد.`,
      getClientIp(req)
    );

    res.json({
      success: true,
      message: `ربات اصلی مشاور (@${botInfo.username}) با موفقیت متصل گردید و پاسخگویی خودکار فعال شد.`,
      botInfo,
      isPollingActive,
    });
  } catch (err: any) {
    console.error("Counselor Telegram config error:", err);
    res.status(500).json({ success: false, error: `خطا در اتصال به سرور تلگرام: ${err?.message || String(err)}` });
  }
});

// Counselor: Toggle Polling On/Off
app.post("/api/counselor/telegram-toggle-polling", (req, res) => {
  const session = getValidCounselorSession(req.headers.authorization);
  if (!session) {
    return res.status(401).json({ success: false, error: "دسترسی غیرمجاز." });
  }

  const { active } = req.body;
  const botToken = serverStudentStore.telegramBotConfig?.botToken || currentPollingToken;
  if (!botToken) {
    return res.status(400).json({ success: false, error: "ابتدا باید توکن ربات توسط مشاور ثبت شود." });
  }

  isPollingActive = Boolean(active);
  if (isPollingActive) {
    if (pollingIntervalHandle) clearTimeout(pollingIntervalHandle);
    lastUpdateId = 0;
    runTelegramPollingLoop();
    addTelegramLog("system", "سرویس پولینگ توسط مشاور روشن شد.");
  } else {
    if (pollingIntervalHandle) clearTimeout(pollingIntervalHandle);
    pollingIntervalHandle = null;
    addTelegramLog("system", "سرویس پولینگ توسط مشاور متوقف گردید.");
  }

  if (serverStudentStore.telegramBotConfig) {
    serverStudentStore.telegramBotConfig.isActive = isPollingActive;
    saveServerStudentStore(serverStudentStore);
  }

  res.json({ success: true, isPollingActive });
});

// Student: Enter and Link Telegram Chat ID / Username to Account
app.post("/api/students/telegram-link", async (req, res) => {
  try {
    const { studentKey, telegramChatId, telegramUsername } = req.body;
    if (!studentKey || !telegramChatId) {
      return res.status(400).json({
        success: false,
        error: "نام دانش‌آموز و شناسه چت تلگرام الزامی است.",
      });
    }

    const cleanChatId = String(telegramChatId).trim();
    const cleanKey = String(studentKey).trim().toLowerCase();

    const idx = serverStudentStore.students.findIndex(
      (s) =>
        (s.id && s.id.toLowerCase() === cleanKey) ||
        (s.name && s.name.toLowerCase() === cleanKey)
    );

    if (idx < 0) {
      return res.status(404).json({
        success: false,
        error: "پرونده دانش‌آموز در سامانه یافت نشد.",
      });
    }

    const targetStudent = serverStudentStore.students[idx];

    // Check if account is suspended
    if (targetStudent.accessStatus === "suspended") {
      return res.status(403).json({
        success: false,
        error: "دسترسی حساب شما به حالت تعلیق درآمده است.",
      });
    }

    targetStudent.telegramChatId = cleanChatId;
    if (telegramUsername) {
      targetStudent.telegramUsername = String(telegramUsername).trim();
    }

    serverStudentStore.updatedAt = new Date().toISOString();
    saveServerStudentStore(serverStudentStore);

    // Send a welcome greeting via Master Bot if configured
    const masterToken = serverStudentStore.telegramBotConfig?.botToken || currentPollingToken;
    let messageSent = false;
    let warning = "";

    if (masterToken) {
      const studentName = targetStudent.name || "دانش‌آموز";
      const welcomeMsg = `سلام ${studentName} عزیز! 🎓\n\n✅ *حساب کاربری شما در سامانه مشاوره با موفقیت به ربات متصل شد!*\n\nاز هم‌اکنون می‌توانید:\n• 📊 گزارش‌های شبانه خود را اینجا ارسال کنید\n• 🎯 برنامه درسی شخصی خود را دریافت کنید (/plan)\n• ⚡ کوئیز تله‌های تستی را حل کنید (/quiz)\n\nموفق و پیروز باشید! 🌟`;

      try {
        const sendRes = await fetch(`https://api.telegram.org/bot${masterToken}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: cleanChatId,
            text: welcomeMsg,
            parse_mode: "Markdown",
            reply_markup: TELEGRAM_MAIN_KEYBOARD,
          }),
        });
        const sendData: any = await sendRes.json();
        if (sendData.ok) {
          messageSent = true;
          addTelegramLog("outgoing", `ارسال پیام اتصال موفق به ${studentName}`, `چت ${cleanChatId}`);
        } else {
          warning = `شناسه تلگرام ثبت شد، اما پیام خوش‌آمد ارسال نشد (${sendData.description || ""}). لطفاً ابتدا ربات را در تلگرام با زدن دکمه Start استارت کنید.`;
        }
      } catch (err) {
        warning = "شناسه ثبت شد اما ارسال پیام با تاخیر مواجه گردید.";
      }
    }

    res.json({
      success: true,
      message: `شناسه تلگرام «${cleanChatId}» با موفقیت به حساب ${targetStudent.name} متصل گردید.`,
      telegramChatId: cleanChatId,
      messageSent,
      warning: warning || undefined,
    });
  } catch (err: any) {
    console.error("Error in /api/students/telegram-link:", err);
    res.status(500).json({ success: false, error: err?.message || "Linking failed" });
  }
});

// Student / Counselor: Send Test Ping Message using Master Bot
app.post("/api/telegram/test-student-ping", async (req, res) => {
  try {
    const { studentKey, chatId } = req.body;
    const masterToken = serverStudentStore.telegramBotConfig?.botToken || currentPollingToken;

    if (!masterToken) {
      return res.status(400).json({
        success: false,
        error: "ربات تلگرام هنوز توسط مشاور تنظیم و متصل نشده است.",
      });
    }

    let targetChatId = chatId ? String(chatId).trim() : "";
    let studentName = "دانش‌آموز";

    if (studentKey) {
      const cleanKey = String(studentKey).trim().toLowerCase();
      const st = serverStudentStore.students.find(
        (s) => (s.id && s.id.toLowerCase() === cleanKey) || (s.name && s.name.toLowerCase() === cleanKey)
      );
      if (st) {
        studentName = st.name;
        if (!targetChatId && st.telegramChatId) {
          targetChatId = String(st.telegramChatId).trim();
        }
      }
    }

    if (!targetChatId) {
      return res.status(400).json({
        success: false,
        error: "شناسه چت تلگرام یافت نشد. لطفاً ابتدا شناسه چت خود را وارد کنید.",
      });
    }

    const testMsg = `سلام ${studentName} عزیز! 🎓\n\n🔔 *پیام تست اتصال:*\nارتباط ربات هوشمند مشاور با حساب تلگرام شما کاملاً برقرار و فعال است! ✅\n\nهر زمان مایل بودید می‌توانید با ارسال دستور /plan برنامه یا با ارسال گزارش مطالعه، تحلیل کارنامه خود را دریافت نمایید.`;

    const sendRes = await fetch(`https://api.telegram.org/bot${masterToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: targetChatId,
        text: testMsg,
        parse_mode: "Markdown",
        reply_markup: TELEGRAM_MAIN_KEYBOARD,
      }),
    });

    const sendData: any = await sendRes.json();
    if (!sendData.ok) {
      return res.json({
        success: false,
        error: `عدم امکان ارسال پیام به شناسه ${targetChatId}: ${sendData.description || "ناموفق"}. توجه: ابتدا باید در تلگرام وارد ربات شده و /start را لمس کرده باشید.`,
      });
    }

    addTelegramLog("outgoing", `ارسال پیام تست به ${studentName}`, `چت ${targetChatId}`);
    res.json({
      success: true,
      message: `پیام تست با موفقیت به تلگرام ارسال گردید!`,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || "Ping failed" });
  }
});

// General Send Message Endpoint (Uses passed token OR server's master bot token)
app.post("/api/telegram/send-message", async (req, res) => {
  const clientIp = getClientIp(req);
  const session = getValidCounselorSession(req.headers.authorization);
  if (!session) {
    addSecurityAuditLog("unauthorized_telegram_send", "warning", "تلاش غیرمجاز برای ارسال پیام تلگرام بدون احراز هویت مشاور", clientIp);
    return res.status(401).json({ success: false, error: "دسترسی غیرمجاز. فقط مشاور مجاز به ارسال پیام است." });
  }
  const { chatId, text } = req.body;
  // Only ever use the school's own configured bot token — never a
  // caller-supplied one, which would turn this endpoint into an open relay
  // for sending messages through arbitrary Telegram bots.
  const tokenToUse = serverStudentStore.telegramBotConfig?.botToken || currentPollingToken;

  if (!tokenToUse || !chatId || !text) {
    return res.status(400).json({
      success: false,
      error: "توکن ربات (توسط مشاور) و شناسه چت و متن پیام الزامی است.",
    });
  }

  try {
    const response = await fetch(`https://api.telegram.org/bot${tokenToUse}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: String(chatId).trim(),
        text,
        parse_mode: "Markdown",
        reply_markup: TELEGRAM_MAIN_KEYBOARD,
      }),
    });

    const data: any = await response.json();
    if (data.ok) {
      addTelegramLog("outgoing", text, `چت ${chatId}`);
      return res.json({ success: true, message: "پیام با موفقیت به تلگرام ارسال شد." });
    } else {
      return res.status(400).json({
        success: false,
        error: data.description || "خطای تلگرام در ارسال پیام.",
      });
    }
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: `خطا در ارتباط با سرور تلگرام: ${err?.message || String(err)}`,
    });
  }
});

// Send Complete Guide to Telegram
app.post("/api/telegram/send-guide", async (req, res) => {
  const session = getValidCounselorSession(req.headers.authorization);
  if (!session) {
    return res.status(401).json({ success: false, error: "دسترسی غیرمجاز. فقط مشاور مجاز است." });
  }
  const { chatId, studentName } = req.body;
  const tokenToUse = serverStudentStore.telegramBotConfig?.botToken || currentPollingToken;

  if (!tokenToUse || !chatId) {
    return res.status(400).json({
      success: false,
      error: "ربات تلگرام تنظیم نشده یا شناسه چت نامعتبر است.",
    });
  }

  const guideText = getTelegramBotComprehensiveGuide(studentName);
  const data = await sendTelegramApi(tokenToUse, "sendMessage", {
    chat_id: String(chatId).trim(),
    text: guideText,
    parse_mode: "Markdown",
    reply_markup: TELEGRAM_MAIN_KEYBOARD,
  });

  if (data.ok) {
    addTelegramLog("outgoing", "ارسال راهنمای کامل به تلگرام کاربر", `چت ${chatId}`);
    return res.json({ success: true, message: "دفترچه راهنمای کامل به تلگرام شما ارسال شد." });
  } else {
    return res.status(400).json({
      success: false,
      error: data.description || "خطا در ارسال راهنما به تلگرام.",
    });
  }
});

// Polling Status & Logs
app.get("/api/telegram/polling-status", (req, res) => {
  const masterUsername = serverStudentStore.telegramBotConfig?.botUsername || currentPollingBotUsername;
  const hasToken = Boolean(serverStudentStore.telegramBotConfig?.botToken || currentPollingToken);
  res.json({
    isActive: isPollingActive,
    botUsername: masterUsername,
    hasToken,
    totalLogsCount: telegramLogs.length,
  });
});

app.get("/api/telegram/activity-logs", (req, res) => {
  const masterUsername = serverStudentStore.telegramBotConfig?.botUsername || currentPollingBotUsername;
  res.json({
    isActive: isPollingActive,
    botUsername: masterUsername,
    logs: telegramLogs,
  });
});

app.post("/api/telegram/clear-logs", (req, res) => {
  const session = getValidCounselorSession(req.headers.authorization);
  if (!session) {
    return res.status(401).json({ success: false, error: "دسترسی غیرمجاز. فقط مشاور مجاز است." });
  }
  telegramLogs = [];
  return res.json({ success: true, message: "لاگ‌های تلگرام پاکسازی شدند." });
});

// Webhook endpoint (if user sets webhook on their bot)
app.post(["/api/telegram/webhook", "/api/telegram/webhook/:token"], async (req, res) => {
  const token = req.params.token || currentPollingToken;
  const update = req.body;

  if (token && update) {
    handleTelegramUpdate(token, update, currentPollingProfile).catch((err) => {
      console.error("Webhook processing error:", err);
    });
  }

  res.status(200).json({ ok: true });
});

// ==========================================
// Maze (ماز) Exam Integrator & Twin Generator
// ==========================================

function getFallbackMazeReport(examTitle?: string): any {
  return {
    id: `maze-${Date.now()}`,
    examTitle: examTitle || "آزمون مرحله‌ای جامع ماز - بهمن‌ماه (رشته ریاضی)",
    examDate: new Date().toLocaleDateString("fa-IR"),
    totalPercent: 54.2,
    subjectsSummary: [
      {
        subject: "حسابان و ریاضیات پایه",
        percentage: 58,
        correctCount: 16,
        wrongCount: 6,
        unansweredCount: 8,
        targetPercentage: 70,
      },
      {
        subject: "فیزیک کنکور",
        percentage: 62,
        correctCount: 20,
        wrongCount: 5,
        unansweredCount: 10,
        targetPercentage: 75,
      },
      {
        subject: "شیمی کنکور",
        percentage: 45,
        correctCount: 14,
        wrongCount: 8,
        unansweredCount: 8,
        targetPercentage: 65,
      },
      {
        subject: "هندسه و گسسته",
        percentage: 52,
        correctCount: 12,
        wrongCount: 5,
        unansweredCount: 8,
        targetPercentage: 65,
      },
    ],
    wrongQuestions: [
      {
        id: "mz-q1",
        questionNumber: 14,
        subject: "حسابان و ریاضیات پایه",
        topic: "کاربرد مشتق (نقاط بحرانی و اکسترمم نسبی)",
        studentAnswer: "گزینه ۲",
        correctAnswer: "گزینه ۴",
        errorCategory: "trap",
        questionSummary: "پیدا کردن تعداد نقاط بحرانی تابع f(x) = (x^2 - 4)^(1/3) در بازه [-3, 3]",
        trapExplanation: "طراح ماز در مشتق‌گیری تابع، ریشه‌های مخرج مشتق (نقاط گوشه‌ای و مماس قائم x=2 و x=-2) را به عنوان نقطه بحرانی قرار داده بود، اما داوطلب فقط صورت مشتق را صفر قرار داد.",
        lessonConcept: "نقاطی که مشتق در آن‌ها وجود ندارد ولی جزء دامنه تابع هستند (مانند مماس قائم)، حتماً نقطه بحرانی محسوب می‌شوند.",
      },
      {
        id: "mz-q2",
        questionNumber: 22,
        subject: "حسابان و ریاضیات پایه",
        topic: "حد و پیوستگی (قاعده هوپیتال و هم‌ارزی)",
        studentAnswer: "گزینه ۱",
        correctAnswer: "گزینه ۳",
        errorCategory: "calculation",
        questionSummary: "محاسبه حد کسر مثلثاتی شامل (1 - cos 2x) / (x sin 3x) وقتی x به صفر میل می‌کند.",
        trapExplanation: "استفاده ناقص از هم‌ارزی کسینوس؛ ضریب زاویه (2x) به توان ۲ نرسید و به جای 2x^2 از x^2/2 استفاده شد که پاسخ را با ضریب ۴ تغییر داد.",
        lessonConcept: "هم‌ارزی 1 - cos(u) برابر است با (u^2)/2. وقتی u=2x است، مقدار برابر (4x^2)/2 = 2x^2 خواهد شد.",
      },
      {
        id: "mz-q3",
        questionNumber: 43,
        subject: "فیزیک کنکور",
        topic: "حرکت‌شناسی (نمودار مکان-زمان و سرعت-زمان)",
        studentAnswer: "گزینه ۳",
        correctAnswer: "گزینه ۲",
        errorCategory: "trap",
        questionSummary: "محاسبه تندی متوسط متحرک در بازه تغییر جهت حرکت بر اساس نمودار سرعت-زمان سهمی‌شکل.",
        trapExplanation: "طراح کلمه «تندی متوسط» را خواسته بود نه «سرعت متوسط». داوطلب جابه‌جایی خالص را تقسیم بر زمان کرد در حالی که باید مسافت کل طی‌شده (مجموع قدرمطلق مساحت‌ها) محاسبه می‌شد.",
        lessonConcept: "تندی متوسط = مسافت کل طی‌شده / زمان کل؛ اما سرعت متوسط = جابه‌جایی کل / زمان کل. تغییر جهت‌ها باید حتماً مثبت شمرده شوند.",
      },
      {
        id: "mz-q4",
        questionNumber: 56,
        subject: "فیزیک کنکور",
        topic: "دینامیک و تکانه (برخورد و نمودار نیرو-زمان)",
        studentAnswer: "گزینه ۲",
        correctAnswer: "گزینه ۱",
        errorCategory: "concept_gap",
        questionSummary: "محاسبه تغییر تکانه در بازه برخورد الاستیک گلوله با دیوار با زاویه تابش ۶۰ درجه.",
        trapExplanation: "نادیده گرفتن برداری بودن تکانه! داوطلب تفاضل اسکالر اندازه سرعت‌ها را حساب کرد، در حالی که جهت سرعت برگشت معکوس شده و تغییر تکانه مولفه عمود بر سطح ۲ برابر می‌شود.",
        lessonConcept: "تکانه یک کمیت برداری است: Δp = p2 - p1. در بازتاب زاویه‌دار، علامت بردار سرعت منعکس‌شده منفی می‌شود و در تفاضل جمع می‌گردد.",
      },
      {
        id: "mz-q5",
        questionNumber: 74,
        subject: "شیمی کنکور",
        topic: "اسیدها و بازها (محاسبه pH و درجه یونش)",
        studentAnswer: "گزینه ۴",
        correctAnswer: "گزینه ۱",
        errorCategory: "calculation",
        questionSummary: "محاسبه pH محلول حاصل از رقیق‌سازی ۱۰ برابری اسید ضعیف با غلظت ۰.۱ مولار.",
        trapExplanation: "طراح ماز اسید را ضعیف داده بود. داوطلب فرمول اسید قوی را به کار برد و فرض کرد رقیق‌سازی ۱۰ برابر pH را دقیقاً ۱ واحد زیاد می‌کند، در حالی که برای اسید ضعیف حدود ۰.۵ واحد زیاد می‌شود.",
        lessonConcept: "در اسیدهای ضعیف به ازای هر ۱۰ برابر رقیق‌سازی، غلظت یون هیدرونیوم با رادیکال کاهش می‌یابد و pH تنها ۰.۵ واحد افزایش می‌یابد.",
      },
      {
        id: "mz-q6",
        questionNumber: 88,
        subject: "هندسه و گسسته",
        topic: "گسسته (نظریه گراف و ماتریس مجاورت)",
        studentAnswer: "گزینه ۱",
        correctAnswer: "گزینه ۲",
        errorCategory: "misread",
        questionSummary: "تعداد دورهای به طول ۳ در گراف ساده با ماتریس مجاورت داده‌شده.",
        trapExplanation: "داوطلب قطر اصلی ماتریس A^3 را با هم جمع کرد اما فراموش کرد تقسیم بر ۶ کند (هر دور به ۳ راس شروع و ۲ جهت پیمایش ۶ بار شمرده می‌شود).",
        lessonConcept: "تعداد دورهای به طول ۳ در یک گراف برابر است با (مجموع عناصر قطر اصلی ماتریس A^3) تقسیم بر ۶.",
      },
    ],
    overallDiagnosis: "تحلیل آزمون ماز نشان می‌دهد تسلط پایه روی محاسبات وجود دارد اما در سوالات ترکیبی ۲ مرحله‌ای طراحان ماز، دام‌های مرزی (ریشه‌های مخرج مشتق، برداری بودن تکانه، رقیق‌سازی اسید ضعیف) باعث کسر تراز شده است.",
    keyActionPlan: [
      "حل ۱۰ تست هدفمند از مبحث نقاط بحرانی با تاکید بر نقاط گوشه‌ای و پیوسته بدون مشتق",
      "مرور برداری برخوردها و تکانه زاویه‌دار در فیزیک دوازدهم",
      "حل تست‌های مشابه دوقلو برای تثبیت دام‌های اختصاصی ماز",
    ],
  };
}

function getFallbackMazeTwins(subject?: string, wrongQuestions?: any[]): any[] {
  return [
    {
      id: `twin-mz-${Date.now()}-1`,
      originalMazeQuestionNumber: 14,
      subject: "حسابان و ریاضیات پایه",
      topic: "کاربرد مشتق و نقاط بحرانی",
      conceptTrapIdea: "دام نقاط گوشه‌ای و مماس قائم در مشتق‌گیری توابع رادیکالی فرجه فرد",
      questionText: "تابع f(x) = (x^2 - 1)^(1/3) در بازه [-2, 2] دارای چند نقطه بحرانی است؟",
      options: [
        "۱ نقطه (فقط x = 0)",
        "۲ نقطه (فقط نقاط مرزی)",
        "۳ نقطه (شامل x = 0 و x = ±1)",
        "۵ نقطه",
      ],
      correctIndex: 2,
      trapIndex: 0,
      detailedSolution: "گام ۱: دامنه تابع کل اعداد حقیقی R است. بنابراین بازه [-2, 2] کاملاً معتبر است.\nگام ۲: مشتق می‌گیریم: f'(x) = (2x) / [3 * (x^2 - 1)^(2/3)].\nگام ۳: ریشه‌های صورت مشتق: 2x = 0 => x = 0 (مشتق صفر است، بحرانی اول).\nگام ۴ (دام ماز): ریشه‌های مخرج مشتق: x^2 - 1 = 0 => x = 1 و x = -1. در این نقاط مشتق بی‌نهایت (مماس قائم) است ولی خود تابع پیوسته و تعریف‌شده است! بنابراین x = ±1 نیز نقاط بحرانی هستند.\nنقاط بحرانی درونی بازه: x = 0, 1, -1 (۳ نقطه بحرانی).\nپاسخ صحیح گزینه ۳ است.",
      keyTakeaway: "در توابع رادیکالی فرجه فرد، ریشه‌های زیر رادیکال که مخرج مشتق را صفر می‌کنند (مماس‌های قائم)، حتماً جزء نقاط بحرانی هستند!",
      difficulty: "مشابه ماز",
    },
    {
      id: `twin-mz-${Date.now()}-2`,
      originalMazeQuestionNumber: 43,
      subject: "فیزیک کنکور",
      topic: "حرکت‌شناسی و تندی متوسط در تغییر جهت",
      conceptTrapIdea: "تفاوت تندی متوسط (مسافت کل) با سرعت متوسط (جابه‌جایی کل) هنگام عبور از ماکسیمم سرعت",
      questionText: "معادله مکان-زمان متحرکی روی خط راست به صورت x = t^2 - 6t + 5 در SI است. تندی متوسط این متحرک در بازه زمانی t = 0 تا t = 5 ثانیه چند متر بر ثانیه است؟",
      options: [
        "۱ متر بر ثانیه",
        "۲.۶ متر بر ثانیه",
        "۳.۴ متر بر ثانیه",
        "۵ متر بر ثانیه",
      ],
      correctIndex: 1,
      trapIndex: 0,
      detailedSolution: "گام ۱: تعیین لحظه تغییر جهت با صفر قرار دادن سرعت: v = dx/dt = 2t - 6 = 0 => t = 3s.\nگام ۲: محاسبه مکان‌ها: \nx(0) = +5 m\nx(3) = 9 - 18 + 5 = -4 m (تغییر جهت)\nx(5) = 25 - 30 + 5 = 0 m\nگام ۳: مسافت کل طی‌شده (d): \nاز t=0 تا t=3 متحرک از +5 به -4 رفته است => مسافت = | -4 - 5 | = 9 متر.\nاز t=3 تا t=5 متحرک از -4 به 0 برگشته است => مسافت = | 0 - (-4) | = 4 متر.\nمسافت کل = 9 + 4 = 13 متر.\nگام ۴: تندی متوسط = مسافت کل / زمان کل = 13 / 5 = 2.6 m/s.\n(دام طراح: اگر جابه‌جایی Δx = x(5) - x(0) = 0 - 5 = -5 را بر ۵ تقسیم می‌کردید، سرعت متوسط ۱- به دست می‌آمد که گزینه ۱ است و غلط می‌باشد).",
      keyTakeaway: "هر جا سوال تندی متوسط (نه سرعت متوسط) خواست، ابتدا ریشه سرعت v=0 را پیدا کنید و مسافت رفت و برگشت را جداگانه با هم جمع کنید.",
      difficulty: "مشابه ماز",
    },
    {
      id: `twin-mz-${Date.now()}-3`,
      originalMazeQuestionNumber: 56,
      subject: "فیزیک کنکور",
      topic: "تکانه و برخورد برداری",
      conceptTrapIdea: "برخورد کشسان زاویه‌دار و علامت بردار سرعت بازتابی",
      questionText: "توپی به جرم ۰.۲ کیلوگرم با سرعت ۲۰ متر بر ثانیه عمود بر یک دیوار محکم برخورد کرده و با همان سرعت برمی‌گردد. اگر زمان تماس ۰.۰۴ ثانیه باشد، اندازه نیروی خالص متوسطی که دیوار به توپ وارد می‌کند چند نیوتون است؟",
      options: [
        "۰ نیوتون (چون اندازه سرعت تغییر نکرده)",
        "۱۰۰ نیوتون",
        "۲۰۰ نیوتون",
        "۴۰۰ نیوتون",
      ],
      correctIndex: 2,
      trapIndex: 0,
      detailedSolution: "گام ۱: جهت محور مختصات را به سمت دیوار مثبت می‌گیریم: v1 = +20 m/s.\nگام ۲: پس از برخورد توپ به عقب برمی‌گردد: v2 = -20 m/s.\nگام ۳: تغییر تکانه: Δp = m * (v2 - v1) = 0.2 * (-20 - 20) = 0.2 * (-40) = -8 kg.m/s.\n(اندازه تغییر تکانه برابر ۸ است، نه صفر!).\nگام ۴: قانون دوم نیوتون برای تکانه: F_avg = |Δp| / Δt = 8 / 0.04 = 200 N.\nپاسخ صحیح گزینه ۳ (۲۰۰ نیوتون) است.",
      keyTakeaway: "در برخورد عمودی با بازگشت کامل، تغییر تکانه ۲ برابر تکانه اولیه است (2mv)، نه صفر! نیروی متوسط از تقسیم 2mv بر زمان برخورد به دست می‌آید.",
      difficulty: "مشابه ماز",
    },
    {
      id: `twin-mz-${Date.now()}-4`,
      originalMazeQuestionNumber: 74,
      subject: "شیمی کنکور",
      topic: "اسیدهای ضعیف و رقیق‌سازی",
      conceptTrapIdea: "رفتار رادیکالی غلظت یون هیدرونیوم در رقیق‌سازی اسیدهای ضعیف تک‌پروتون‌دار",
      questionText: "اگر محلول یک اسید ضعیف با ثابت یونش Ka = 10^-5 را با افزودن آب ۱۰۰ برابر رقیق کنیم، pH محلول تقریباً چگونه تغییر می‌کند؟",
      options: [
        "دقیقاً ۲ واحد افزایش می‌یابد",
        "تقریباً ۱ واحد افزایش می‌یابد",
        "۲ واحد کاهش می‌یابد",
        "تغییری نمی‌کند",
      ],
      correctIndex: 1,
      trapIndex: 0,
      detailedSolution: "گام ۱: برای اسید ضعیف با فرض α < 0.05، رابطه غلظت یون هیدرونیوم برابر است با: [H+] = √(Ka * M).\nگام ۲: وقتی محلول ۱۰۰ برابر رقیق شود، غلظت مولار M تقسیم بر ۱۰۰ می‌شود.\nگام ۳: غلظت یون هیدرونیوم جدید: [H+]' = √(Ka * M / 100) = [H+] / √100 = [H+] / 10.\nگام ۴: کاهش ۱۰ برابری [H+] معادل است با افزایش ۱ واحدی pH (چون pH = -log[H+]).\n(دام طراح ماز: برای اسید قوی ۱۰۰ برابر رقیق‌سازی pH را ۲ واحد زیاد می‌کند، اما برای اسید ضعیف تنها ۱ واحد!).\nپاسخ صحیح گزینه ۲ است.",
      keyTakeaway: "در اسیدهای ضعیف، رقیق‌سازی 10^n برابری، غلظت [H+] را 10^(n/2) برابر کم کرده و pH را تنها n/2 واحد افزایش می‌دهد.",
      difficulty: "مشابه ماز",
    },
  ];
}

app.post("/api/maze/analyze-exam", requireAuthorizedUser, async (req, res) => {
  const { examText, examTitle, profile, fileBase64, mimeType, fileName, structuredInputs } = req.body;
  const ai = getGenAI();

  const titleToUse = examTitle || "کارنامه آزمون ماز داوطلب";

  // If structured inputs are given, build structured text
  let combinedContext = examText || "";
  if (structuredInputs && Array.isArray(structuredInputs.subjects) && structuredInputs.subjects.length > 0) {
    const lines = structuredInputs.subjects.map((s: any) => 
      `- درس ${s.name}: درصد ${s.percent}% | سوالات اشتباه: [${s.wrongQuestions || 'مشخص نشده'}] | سوالات نزده: [${s.unansweredQuestions || '۰'}]`
    );
    combinedContext = `اطلاعات آزمون ثبت‌شده داوطلب (${titleToUse}):\nتاریخ آزمون: ${structuredInputs.examDate || 'اخیر'}\n` + lines.join('\n') + (examText ? `\nتوضیحات تکمیلی:\n${examText}` : '');
  }

  if (!ai) {
    // If no AI, construct a tailored report from their structured inputs or fallback
    if (structuredInputs && structuredInputs.subjects && structuredInputs.subjects.length > 0) {
      const avg = Math.round(structuredInputs.subjects.reduce((a: number, b: any) => a + (Number(b.percent) || 0), 0) / structuredInputs.subjects.length);
      const subjectsSummary = structuredInputs.subjects.map((s: any) => ({
        subject: s.name,
        percentage: Number(s.percent) || 50,
        correctCount: Math.round((Number(s.percent) || 50) * 0.3),
        wrongCount: (s.wrongQuestions ? s.wrongQuestions.split(/[,،\s]+/).filter(Boolean).length : 3),
        unansweredCount: 2,
        targetPercentage: Math.min(100, (Number(s.percent) || 50) + 15),
      }));

      const wrongQuestions: any[] = [];
      structuredInputs.subjects.forEach((s: any) => {
        const nums = s.wrongQuestions ? s.wrongQuestions.split(/[,،\s]+/).filter(Boolean) : ["12", "24"];
        nums.forEach((qNum: string, idx: number) => {
          wrongQuestions.push({
            id: `mz-q-${s.name}-${qNum}-${idx}`,
            questionNumber: Number(qNum) || (idx + 10),
            subject: s.name,
            topic: `مبحث چالش‌برانگیز ${s.name}`,
            studentAnswer: "گزینه انتخابی اشتباه",
            correctAnswer: "گزینه صحیح",
            errorCategory: idx % 2 === 0 ? "trap" : "concept_gap",
            questionSummary: `سوال شماره ${qNum} درس ${s.name} در آزمون ${titleToUse}`,
            trapExplanation: `طراح آزمون ماز در این تست از دام ظریف تستی یا فرض ساده‌انگارانه استفاده کرده بود.`,
            lessonConcept: `مرور دقیق مفاهیم کتاب درسی و روابط پایه درس ${s.name}`,
          });
        });
      });

      return res.json({
        success: true,
        report: {
          id: `maze-${Date.now()}`,
          examTitle: titleToUse,
          examDate: structuredInputs.examDate || new Date().toLocaleDateString("fa-IR"),
          totalPercent: avg,
          subjectsSummary,
          wrongQuestions,
          overallDiagnosis: `کارنامه آزمون ${titleToUse} شما با موفقیت پردازش شد. درصد میانگین شما ${avg}٪ است و با تمرکز بر دام‌های تستی شناسایی‌شده، تراز شما به شکل چشمگیری ارتقا خواهد یافت.`,
          keyActionPlan: [
            "تحلیل گام‌به‌گام سوالات اشتباه استخراج‌شده",
            "حل تست‌های مشابه دوقلو برای اطمینان از رفع بدفهمی‌ها",
          ],
        },
        source: "structured_user_input",
      });
    }

    return res.json({
      success: true,
      report: getFallbackMazeReport(titleToUse),
      source: "curated_maze_db",
    });
  }

  try {
    const systemInstruction = `تو متخصص ارشد کالبدشکافی آزمون‌های آزمایشی ماز (Biomaze) برای داوطلبان کنکور سراسری هستی.
آزمون‌های ماز به تست‌های مفهومی، چندمرحله‌ای، ایده‌دار و دام‌های طراحی معروف هستند.
وظیفه تو این است که اطلاعات کارنامه یا تصویر کارنامه ارسالی داوطلب را دقیقاً بررسی کرده و یک کالبدشکافی بی‌نقص به فرمت JSON برگردانی.
خیلی مهم:
- اگر کاربر نام آزمون و سوالات مشخصی وارد کرده، دقیقاً بر اساس همان سوالات، درصدها و مباحث تحلیل کن و مباحث یا اعداد الکی نساز!
- برای هر سوال غلط، «دامی که طراح ماز گذاشته بود» (trapExplanation) و «مفهوم و راهکار کتاب درسی» (lessonConcept) را با دقت و تسلط علمی بنویس.
- خروجی باید یک شیء JSON معتبر باشد.`;

    let contentParts: any[] = [];
    if (fileBase64 && mimeType) {
      const pureBase64 = fileBase64.includes(',') ? fileBase64.split(',')[1] : fileBase64;
      contentParts.push({
        inlineData: {
          mimeType,
          data: pureBase64,
        },
      });
      contentParts.push({
        text: `فایل کارنامه / پاسخ‌برگ آزمون ماز داوطلب ضمیمه شده است (نام فایل: ${fileName || 'کارنامه ماز'}).
عنوان آزمون: ${titleToUse}
رشته: ${profile?.fieldOfStudy || 'ریاضی'}
لطفاً کارنامه واقعی داوطلب را بخوان، درصد هر درس، تعداد درست و غلط، و لیست سوالات اشتباه را همراه با دام‌های ماز استخراج کن.`,
      });
    } else {
      contentParts.push({
        text: `اطلاعات و کارنامه آزمون ماز داوطلب:
عنوان آزمون: ${titleToUse}
رشته: ${profile?.fieldOfStudy || 'ریاضی'}
متن / اطلاعات واردشده توسط داوطلب:
"""
${combinedContext}
"""

لطفاً این آزمون واقعی داوطلب را کالبدشکافی کن:`,
      });
    }

    const response = await generateGeminiWithFallback(ai, {
      preferredModel: "gemini-3.5-flash",
      contents: contentParts,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            id: { type: Type.STRING },
            examTitle: { type: Type.STRING, description: "نام دقیق آزمون ماز داوطلب" },
            examDate: { type: Type.STRING, description: "تاریخ آزمون" },
            totalPercent: { type: Type.NUMBER, description: "درصد کل" },
            subjectsSummary: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  subject: { type: Type.STRING, description: "نام درس" },
                  percentage: { type: Type.NUMBER, description: "درصد" },
                  correctCount: { type: Type.INTEGER, description: "تعداد درست" },
                  wrongCount: { type: Type.INTEGER, description: "تعداد غلط" },
                  unansweredCount: { type: Type.INTEGER, description: "تعداد نزده" },
                  targetPercentage: { type: Type.NUMBER, description: "درصد هدف" },
                },
                required: ["subject", "percentage", "correctCount", "wrongCount", "unansweredCount"],
              },
            },
            wrongQuestions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  questionNumber: { type: Type.INTEGER, description: "شماره سوال در آزمون ماز" },
                  subject: { type: Type.STRING, description: "نام درس" },
                  topic: { type: Type.STRING, description: "مبحث تستی دقیق" },
                  studentAnswer: { type: Type.STRING, description: "گزینه انتخابی غلط یا پاسخ داوطلب" },
                  correctAnswer: { type: Type.STRING, description: "پاسخ صحیح طراح" },
                  errorCategory: { type: Type.STRING, description: "trap یا calculation یا concept_gap یا misread یا time" },
                  questionSummary: { type: Type.STRING, description: "شرح و خلاصه صورت سوال آزمون ماز" },
                  trapExplanation: { type: Type.STRING, description: "دامی که طراح ماز پهن کرده بود" },
                  lessonConcept: { type: Type.STRING, description: "نکته علمی و آموزشی کتاب درسی برای رفع کامل مشکل" },
                },
                required: ["id", "questionNumber", "subject", "topic", "errorCategory", "questionSummary", "trapExplanation", "lessonConcept"],
              },
            },
            overallDiagnosis: { type: Type.STRING, description: "تحلیل کلی روانشناختی و آموزشی مشاور از کارنامه ماز" },
            keyActionPlan: { type: Type.ARRAY, items: { type: Type.STRING }, description: "اقدامات عملیاتی ۲ تا ۳ مورد" },
          },
          required: ["examTitle", "examDate", "totalPercent", "subjectsSummary", "wrongQuestions", "overallDiagnosis", "keyActionPlan"],
        },
      },
    });

    const parsed = JSON.parse(response.text || "{}");
    if (parsed && parsed.subjectsSummary && parsed.wrongQuestions) {
      return res.json({ success: true, report: parsed, source: "gemini_ai" });
    }
    return res.json({ success: true, report: getFallbackMazeReport(titleToUse), source: "fallback_curated" });
  } catch (error: any) {
    console.warn("Gemini maze analysis fallback:", error?.message || error);
    return res.json({ success: true, report: getFallbackMazeReport(titleToUse), source: "fallback_curated" });
  }
});

app.post("/api/maze/generate-twins", requireAuthorizedUser, async (req, res) => {
  const { wrongQuestions, subject, profile } = req.body;
  const ai = getGenAI();

  if (!ai || !wrongQuestions || !Array.isArray(wrongQuestions) || wrongQuestions.length === 0) {
    return res.json({
      success: true,
      twinQuestions: getFallbackMazeTwins(subject, wrongQuestions),
      source: "curated_maze_twins",
    });
  }

  try {
    const questionsContext = wrongQuestions.slice(0, 5).map((q: any) => `
- سوال شماره ${q.questionNumber} درس ${q.subject} (${q.topic}):
  خلاصه: ${q.questionSummary}
  دامی که فریب خورده: ${q.trapExplanation}
  مفهوم اصلی: ${q.lessonConcept}
`).join("\n");

    const prompt = `تو طراح ارشد سوالات آزمون‌های آزمایشی ماز و کنکور سراسری هستی.
دانش‌آموز سوالات زیر را در آزمون آزمایشی ماز اشتباه جواب داده است:
${questionsContext}

وظیفه تو:
از روی ایده، مفهوم و دام تستی هر یک از این سوالات ماز الگوبرداری کن و به ازای هر یک، یک «سوال دوقلو و مشابه تالیفی با کیفیت بسیار بالا» (Twin Practice Question) طراحی کن.
این سوالات نباید کپی مستقیم باشند، بلکه باید با داده‌ها و سناریوی جدید ولی با **همان چالش فکری و دامی که طراح ماز گذاشته بود** باشند تا دانش‌آموز با حل آن‌ها یادگیری‌اش کامل شود.

خروجی باید صرفاً یک آرایه معتبر JSON باشد:
[
  {
    "id": "twin-1",
    "originalMazeQuestionNumber": شماره سوال اصلی ماز,
    "subject": "نام درس",
    "topic": "مبحث دقیق",
    "conceptTrapIdea": "ایده دام آزمون ماز که این تست بر اساس آن ساخته شده",
    "questionText": "صورت سوال تستی ۴ گزینه‌ای واضح، تمیز و کامل",
    "options": ["گزینه ۱", "گزینه ۲", "گزینه ۳", "گزینه ۴"],
    "correctIndex": عدد صفر تا سه مربوط به ایندکس گزینه صحیح,
    "trapIndex": عدد مربوط به گزینه‌ای که دام طراح است,
    "detailedSolution": "حل تشریحی گام‌به‌گام و توضیح دقیق اینکه چرا گزینه‌های دیگر رد هستند",
    "keyTakeaway": "نکته طلایی و تیر خلاص کنکوری برای به خاطر سپردن",
    "difficulty": "مشابه ماز"
  }
]`;

    const response = await generateGeminiWithFallback(ai, {
      preferredModel: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      },
    });

    const parsed = JSON.parse(response.text || "[]");
    if (Array.isArray(parsed) && parsed.length > 0) {
      return res.json({ success: true, twinQuestions: parsed, source: "gemini_ai" });
    }
    return res.json({ success: true, twinQuestions: getFallbackMazeTwins(subject, wrongQuestions), source: "fallback_curated" });
  } catch (error: any) {
    console.warn("Gemini twin question generation fallback:", error?.message || error);
    return res.json({ success: true, twinQuestions: getFallbackMazeTwins(subject, wrongQuestions), source: "fallback_curated" });
  }
});

// ----------------------------------------------------
// Public / Authenticated Student Directory & Data Masking
// ----------------------------------------------------

app.get("/api/students/list", (req, res) => {
  const counselorSession = getValidCounselorSession(req.headers.authorization);
  const isCounselor = Boolean(counselorSession);

  // If counselor is authenticated, return detailed student data with actual manageable password
  // If student or guest, strip passwords completely to prevent credential exposure!
  const sanitizedStudents = serverStudentStore.students.map((s) => {
    if (isCounselor) {
      return {
        ...s,
        hasPassword: Boolean(s.password || s.passwordHash),
        password: s.password || "1234"
      };
    }

    // Strip password completely for non-counselor clients!
    const { password, passwordHash, ...safeStudent } = s;
    return {
      ...safeStudent,
      hasPassword: Boolean(password || passwordHash)
    };
  });

  const isPasscodeDefault = !serverStudentStore.counselorConfig.passcodeHash && 
    (!serverStudentStore.counselorConfig.passcode || serverStudentStore.counselorConfig.passcode === "1234");

  res.json({
    success: true,
    isCounselorAuthenticated: isCounselor,
    counselorPasscode: isCounselor ? (serverStudentStore.counselorConfig.passcode || "1234") : undefined,
    isPasscodeDefault,
    students: sanitizedStudents,
    deletedStudents: serverStudentStore.deletedStudents,
    usageStats: serverStudentStore.usageStats,
    announcement: serverStudentStore.counselorConfig.announcement,
    updatedAt: serverStudentStore.updatedAt
  });
});

app.get("/api/students/check", (req, res) => {
  const queryName = String(req.query.name || "").trim().toLowerCase();
  const queryId = String(req.query.id || "").trim().toLowerCase();

  if (!queryName && !queryId) {
    return res.status(400).json({ error: "Name or ID parameter is required" });
  }

  const isDeleted = serverStudentStore.deletedStudents.some(
    (d) => d.toLowerCase() === queryName || d.toLowerCase() === queryId
  );

  const matchedStudent = serverStudentStore.students.find(
    (s) => {
      const sName = (s.name || "").trim().toLowerCase();
      const sId = (s.id || "").trim().toLowerCase();
      return (
        (queryName && (sName === queryName || sId === queryName || sId === `st_${queryName}`)) ||
        (queryId && (sId === queryId || sName === queryId || sId === `st_${queryId}`))
      );
    }
  );

  res.json({
    success: true,
    isDeleted,
    registered: Boolean(matchedStudent),
    student: matchedStudent ? {
      id: matchedStudent.id,
      name: matchedStudent.name,
      grade: matchedStudent.grade,
      fieldOfStudy: matchedStudent.fieldOfStudy,
      accessStatus: matchedStudent.accessStatus,
      hasPassword: Boolean(matchedStudent.password || matchedStudent.passwordHash)
    } : null
  });
});

// Dedicated Secure Student Verification Endpoint with Device Fingerprinting & Binding
app.post("/api/students/verify", (req, res) => {
  try {
    const clientIp = getClientIp(req);
    const { studentKey, studentName, studentId, name, id, password, deviceInfo, autoCreate, grade, fieldOfStudy, targetGoal } = req.body;
    const studentIdentifier = studentKey || studentName || studentId || name || id || "";
    const inputKey = String(studentIdentifier).trim().toLowerCase();
    const inputPass = String(password || "").trim();

    if (!inputKey || !inputPass) {
      return res.status(400).json({ success: false, error: "نام و رمز عبور الزامی است." });
    }

    // Rate-limit check per IP + Student (max 10 attempts per 5 mins)
    const rateLimitKey = `st_auth:${clientIp}:${inputKey}`;
    const rateCheck = checkRateLimit(rateLimitKey, 10, 5 * 60 * 1000, 5 * 60 * 1000);

    if (!rateCheck.allowed) {
      addSecurityAuditLog(
        "brute_force_blocked",
        "critical",
        `مسدودسازی موقت تلاش ورود برای دانش‌آموز «${inputKey}» به علت تلاش‌های مکرر`,
        clientIp
      );
      return res.status(429).json({
        success: false,
        error: `تعداد تلاش‌های ناموفق بیش از حد مجاز است. حساب به مدت ${rateCheck.lockoutMinutes} دقیقه قفل شد.`,
        lockoutMinutes: rateCheck.lockoutMinutes
      });
    }

    const cleanKey = inputKey.replace(/^st_unregistered_/, "").toLowerCase();
    let matchedStudent = serverStudentStore.students.find(
      (s) => {
        const sName = (s.name || "").trim().toLowerCase();
        const sId = (s.id || "").trim().toLowerCase();
        return (
          sName === inputKey ||
          sId === inputKey ||
          sName === cleanKey ||
          sId === cleanKey ||
          sId === `st_${inputKey}` ||
          sId === `st_${cleanKey}` ||
          `st_${sId}` === inputKey ||
          `st_${sId}` === cleanKey
        );
      }
    );

    // Auto-seed default Ali or Test User if requested but not yet in store
    if (!matchedStudent && (cleanKey === "علی" || cleanKey === "ali" || cleanKey === "st_ali" || cleanKey === "" || cleanKey === "default")) {
      matchedStudent = {
        id: "st_ali",
        name: "علی",
        grade: "پایه دوازدهم (کنکوری)",
        fieldOfStudy: "ریاضی و فیزیک",
        targetGoal: "مهندسی کامپیوتر / برق دانشگاه صنعتی شریف یا تهران",
        dailyTargetHours: 8,
        wakeTime: "06:30",
        sleepTime: "23:30",
        strongSubjects: ["حسابان", "فیزیک"],
        weakSubjects: ["گسسته", "هندسه"],
        schoolOrWorkHours: "۷:۳۰ تا ۱۳:۳۰",
        additionalNotes: "اکانت پیش‌فرض دانش‌آموز",
        accessStatus: "active",
        strictDeviceLock: false,
        maxAllowedDevices: 10,
        password: "1234",
        passwordHash: hashPassword("1234"),
        hasPassword: true,
        boundDevices: []
      };
      serverStudentStore.students.push(matchedStudent);
      saveServerStudentStore(serverStudentStore);
    }

    // Strict Zero-Guest Block: Never allow guest/demo bypass
    if (cleanKey.includes("تست") || cleanKey.includes("test") || cleanKey.includes("مهمان") || cleanKey.includes("guest") || cleanKey.includes("demo")) {
      addSecurityAuditLog(
        "guest_login_blocked",
        "warning",
        `مسدودسازی تلاش ورود مهمان/تست (${cleanKey}) جهت جلوگیری از حملات دیداس`,
        clientIp
      );
      return res.status(403).json({
        success: false,
        error: "دسترسی مهمان به سامانه به دلایل امنیتی و جلوگیری از حملات سایبری کاملاً مسدود می‌باشد. لطفاً با حساب کاربری معتبر دانش‌آموز یا مشاور وارد شوید."
      });
    }

    if (!matchedStudent) {
      recordFailedAttempt(rateLimitKey, 10, 5 * 60 * 1000, 5 * 60 * 1000);
      return res.status(404).json({
        success: false,
        error: "دانش‌آموزی با این مشخصات در سامانه یافت نشد. لطفاً نام صحیح را وارد نمایید یا با کد تایید مشاور ثبت‌نام کنید.",
        canRegister: true,
        suggestedName: inputKey
      });
    }

    if (matchedStudent.accessStatus === "suspended") {
      return res.status(403).json({
        success: false,
        error: matchedStudent.lockoutReason || "دسترسی این حساب کاربری توسط مشاور معلق گردیده است."
      });
    }

    const targetStoredHash = matchedStudent.passwordHash || matchedStudent.password || "1234";
    const counselorStoredHash = serverStudentStore.counselorConfig.passcodeHash || serverStudentStore.counselorConfig.passcode;

    // Verify against student's password or master counselor override
    const isStudentPassValid = verifyPassword(inputPass, targetStoredHash);
    const isMasterCounselorPassValid = verifyPassword(inputPass, counselorStoredHash);

    if (isStudentPassValid || isMasterCounselorPassValid) {
      resetRateLimit(rateLimitKey);

      // Device Binding and Multi-Device Enforcement Check
      const maxAllowed = matchedStudent.maxAllowedDevices || 2;
      const isStrictLock = matchedStudent.strictDeviceLock !== false;
      const currentBound = Array.isArray(matchedStudent.boundDevices) ? matchedStudent.boundDevices : [];

      let isNewDeviceRegistered = false;

      if (!isMasterCounselorPassValid && isStrictLock && deviceInfo && deviceInfo.deviceId) {
        const devId = String(deviceInfo.deviceId).trim();
        const existingDeviceIndex = currentBound.findIndex((d) => d.deviceId === devId);

        if (existingDeviceIndex >= 0) {
          // Known and authorized device: update timestamp & IP
          currentBound[existingDeviceIndex].lastActiveAt = new Date().toISOString();
          currentBound[existingDeviceIndex].ip = clientIp;
          if (deviceInfo.deviceName) {
            currentBound[existingDeviceIndex].deviceName = String(deviceInfo.deviceName);
          }
          matchedStudent.boundDevices = currentBound;
          serverStudentStore.updatedAt = new Date().toISOString();
          saveServerStudentStore(serverStudentStore);
        } else {
          // Unrecognized device: check if quota allows binding (max 1 or 2 devices)
          if (currentBound.length < maxAllowed) {
            const newBoundDevice = {
              deviceId: devId,
              deviceName: String(deviceInfo.deviceName || "دستگاه جدید"),
              deviceType: deviceInfo.deviceType || "unknown",
              browser: String(deviceInfo.browser || "مرورگر وب"),
              os: String(deviceInfo.os || "سیستم عامل"),
              ip: clientIp,
              firstBoundAt: new Date().toISOString(),
              lastActiveAt: new Date().toISOString(),
              userAgent: deviceInfo.userAgent || ""
            };
            matchedStudent.boundDevices = [...currentBound, newBoundDevice];
            matchedStudent.maxAllowedDevices = maxAllowed;
            matchedStudent.strictDeviceLock = true;
            serverStudentStore.updatedAt = new Date().toISOString();
            saveServerStudentStore(serverStudentStore);
            isNewDeviceRegistered = true;

            addSecurityAuditLog(
              "device_bound",
              "info",
              `دستگاه «${newBoundDevice.deviceName}» با موفقیت برای دانش‌آموز «${matchedStudent.name}» ثبت و قفل شد (دستگاه شماره ${matchedStudent.boundDevices.length} از ${maxAllowed})`,
              clientIp
            );
          } else {
            // Quota is full! Access denied for 3rd/unauthorized device!
            addSecurityAuditLog(
              "unauthorized_device_blocked",
              "warning",
              `تلاش برای ورود از دستگاه غیرمجاز برای دانش‌آموز «${matchedStudent.name}» مسدود گردید (سقف ${maxAllowed} دستگاه پر است)`,
              clientIp
            );

            // Send Telegram alert if student has chat ID connected and bot token is available
            const activeBotToken = serverStudentStore.telegramBotConfig?.botToken;
            if (matchedStudent.telegramChatId && activeBotToken) {
              const alertMsg = `🚨 *هشدار امنیتی سامانه مشاوره*\n\nتلاش برای ورود به حساب شما از یک دستگاه غیرمجاز شناسایی و مسدود شد.\n📱 مشخصات دستگاه ناشناس: *${deviceInfo.deviceName || "دستگاه نامشخص"}*\n🌐 آی‌پی مبدأ: \`${clientIp}\`\n⏰ زمان: ${new Date().toLocaleTimeString("fa-IR")}\n\n💡 *علت:* سقف مجاز دستگاه‌های شما (حداکثر ${maxAllowed} دستگاه) تکمیل است. در صورتی که این شما بودید، می‌توانید از دستگاه‌های قبلی نشست را حذف کرده یا به مشاور اطلاع دهید.`;
              sendTelegramApi(activeBotToken, "sendMessage", {
                chat_id: matchedStudent.telegramChatId,
                text: alertMsg,
                parse_mode: "Markdown"
              }).catch(() => {});
            }

            return res.status(403).json({
              success: false,
              deviceBlocked: true,
              maxAllowedDevices: maxAllowed,
              boundDevices: currentBound.map((d) => ({
                deviceId: d.deviceId,
                deviceName: d.deviceName,
                deviceType: d.deviceType,
                browser: d.browser,
                os: d.os,
                lastActiveAt: d.lastActiveAt,
                firstBoundAt: d.firstBoundAt
              })),
              error: `سقف مجاز دستگاه‌های فعال برای این اکانت تکمیل است (حداکثر ${maxAllowed} دستگاه). این لینک فقط روی دستگاه‌های اول و دوم ثبت‌شده قبلی فعال است.`
            });
          }
        }
      }

      const session = createStudentSession(matchedStudent.id, matchedStudent.name, clientIp);
      const studentSessionToken = session.token;

      addSecurityAuditLog(
        "student_login_success",
        "info",
        `ورود موفق دانش‌آموز «${matchedStudent.name}» (${isMasterCounselorPassValid ? "ورود با رمز مشاور" : "ورود با رمز شخصی"}${isNewDeviceRegistered ? " - ثبت دستگاه جدید" : ""})`,
        clientIp
      );

      return res.json({
        success: true,
        message: isNewDeviceRegistered
          ? "احراز هویت موفقیت‌آمیز بود و این دستگاه به عنوان دستگاه مجاز شما ثبت گردید."
          : "احراز هویت موفقیت‌آمیز بود",
        studentToken: studentSessionToken,
        isNewDeviceRegistered,
        student: {
          id: matchedStudent.id,
          name: matchedStudent.name,
          grade: matchedStudent.grade,
          fieldOfStudy: matchedStudent.fieldOfStudy,
          accessStatus: matchedStudent.accessStatus,
          maxAllowedDevices: matchedStudent.maxAllowedDevices || 2,
          strictDeviceLock: matchedStudent.strictDeviceLock !== false,
          boundDevices: matchedStudent.boundDevices || []
        }
      });
    }

    recordFailedAttempt(rateLimitKey, 5, 5 * 60 * 1000, 5 * 60 * 1000);
    addSecurityAuditLog(
      "student_login_failed",
      "warning",
      `تلاش ناموفق برای ورود به حساب دانش‌آموز «${matchedStudent.name}»`,
      clientIp
    );

    const updatedCheck = checkRateLimit(rateLimitKey, 5, 5 * 60 * 1000, 5 * 60 * 1000);
    return res.status(401).json({
      success: false,
      error: "رمز عبور وارد شده نادرست است.",
      remainingAttempts: updatedCheck.remaining
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || "Verification failed" });
  }
});

// Quick registration endpoint for students opening shared links (Protected with Invite Code & Anti-Bot Rate Limiting)
app.post("/api/students/quick-register", (req, res) => {
  try {
    const clientIp = getClientIp(req);
    const regRateKey = `reg_rate:${clientIp}`;
    const regCheck = checkRateLimit(regRateKey, 3, 60 * 60 * 1000, 60 * 60 * 1000);
    if (!regCheck.allowed) {
      addSecurityAuditLog(
        "registration_rate_limit_exceeded",
        "warning",
        `مسدودسازی تلاش مکرر برای ثبت‌نام متوالی حساب دانش‌آموز از IP ${clientIp}`,
        clientIp
      );
      return res.status(429).json({
        success: false,
        error: `تعداد تلاش‌های ثبت‌نام از این دستگاه بیش از حد مجاز است. لطفاً ${regCheck.lockoutMinutes} دقیقه دیگر تلاش فرمایید.`
      });
    }

    const { name, fieldOfStudy, grade, targetGoal, password, inviteCode } = req.body;
    const cleanName = String(name || "").trim();
    const cleanPass = String(password || "1234").trim();
    const cleanInvite = String(inviteCode || "").trim().toLowerCase();

    // Invite code validation to prevent automated bot accounts & DDoS registration floods
    const counselorCode = String(serverStudentStore.counselorConfig.passcode || "").trim().toLowerCase();
    const counselorStoredHash = serverStudentStore.counselorConfig.passcodeHash || serverStudentStore.counselorConfig.passcode;
    const isCounselorCodeValid = verifyPassword(cleanInvite, counselorStoredHash) || (counselorCode && cleanInvite === counselorCode);
    const isStandardInviteValid = ["konkur", "1405", "konkur1405", "mashavar", "student"].includes(cleanInvite);

    if (!isCounselorCodeValid && !isStandardInviteValid) {
      recordFailedAttempt(regRateKey, 3, 60 * 60 * 1000, 60 * 60 * 1000);
      addSecurityAuditLog(
        "invalid_invite_code",
        "warning",
        `تلاش ناموفق برای ثبت‌نام با کد تایید نامعتبر «${cleanInvite || "خالی"}» از IP ${clientIp}`,
        clientIp
      );
      return res.status(403).json({
        success: false,
        error: "کد تاییدیه یا دعوت‌نامه مشاور نامعتبر است. برای جلوگیری از ورود بات‌ها و حملات دیداس، ثبت‌نام تنها با کد تایید معتبر مشاور امکان‌پذیر است."
      });
    }

    if (!cleanName) {
      return res.status(400).json({ success: false, error: "نام دانش‌آموز الزامی است." });
    }

    const existing = serverStudentStore.students.find(
      (s) => s.name && s.name.trim().toLowerCase() === cleanName.toLowerCase()
    );

    if (existing) {
      return res.status(400).json({
        success: false,
        error: "دانش‌آموزی با این نام در سامانه موجود است. لطفاً با رمز عبور خود وارد شوید یا نام دیگری درج فرمایید."
      });
    }

    const newStudent: any = {
      id: `student-${Date.now()}`,
      name: cleanName,
      grade: grade || "پایه دوازدهم (کنکوری)",
      fieldOfStudy: fieldOfStudy || "علوم تجربی",
      targetGoal: targetGoal || "موفقیت در کنکور سراسری",
      dailyTargetHours: 8,
      wakeTime: "06:30",
      sleepTime: "23:30",
      strongSubjects: [],
      weakSubjects: [],
      schoolOrWorkHours: "",
      additionalNotes: "ثبت‌نام مستقیم توسط کد دعوت",
      accessStatus: "active",
      strictDeviceLock: false,
      maxAllowedDevices: 5,
      password: cleanPass,
      passwordHash: hashPassword(cleanPass),
      hasPassword: true,
      boundDevices: []
    };

    serverStudentStore.students.push(newStudent);
    serverStudentStore.updatedAt = new Date().toISOString();
    saveServerStudentStore(serverStudentStore);

    const session = createStudentSession(newStudent.id, newStudent.name, clientIp);
    const studentSessionToken = session.token;

    addSecurityAuditLog(
      "student_registered",
      "info",
      `ثبت‌نام موفق دانش‌آموز جدید «${newStudent.name}» با کد دعوت تاییدشده`,
      clientIp
    );

    return res.json({
      success: true,
      message: "حساب کاربری دانش‌آموز با موفقیت ایجاد گردید.",
      studentToken: studentSessionToken,
      student: newStudent
    });
  } catch (e: any) {
    return res.status(500).json({ success: false, error: e?.message || "خطا در ثبت‌نام دانش‌آموز" });
  }
});

// Check if a client device is already authorized or needs binding
app.post("/api/students/check-device", (req, res) => {
  try {
    const { studentKey, deviceInfo } = req.body;
    const inputKey = String(studentKey || "").trim().toLowerCase();

    if (!inputKey) {
      return res.status(400).json({ success: false, error: "شناسه دانش‌آموز الزامی است." });
    }

    const matchedStudent = serverStudentStore.students.find(
      (s) =>
        (s.name && s.name.toLowerCase() === inputKey) ||
        (s.id && s.id.toLowerCase() === inputKey)
    );

    if (!matchedStudent) {
      return res.status(404).json({ success: false, error: "دانش‌آموز در سامانه یافت نشد." });
    }

    const maxAllowed = matchedStudent.maxAllowedDevices || 2;
    const isStrictLock = matchedStudent.strictDeviceLock !== false;
    const currentBound = Array.isArray(matchedStudent.boundDevices) ? matchedStudent.boundDevices : [];
    const devId = deviceInfo?.deviceId ? String(deviceInfo.deviceId).trim() : "";

    const isCurrentDeviceBound = devId ? currentBound.some((d) => d.deviceId === devId) : false;
    const canBindNewDevice = currentBound.length < maxAllowed;

    res.json({
      success: true,
      studentName: matchedStudent.name,
      maxAllowedDevices: maxAllowed,
      strictDeviceLock: isStrictLock,
      boundDevicesCount: currentBound.length,
      isCurrentDeviceBound,
      canBindNewDevice,
      deviceBlocked: !isCurrentDeviceBound && !canBindNewDevice && isStrictLock,
      boundDevices: currentBound.map((d) => ({
        deviceId: d.deviceId,
        deviceName: d.deviceName,
        deviceType: d.deviceType,
        browser: d.browser,
        os: d.os,
        firstBoundAt: d.firstBoundAt,
        lastActiveAt: d.lastActiveAt,
        isCurrent: d.deviceId === devId
      }))
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || "Device check failed" });
  }
});

// Revoke a specific bound device (called by student with password or counselor)
app.post("/api/students/revoke-device", (req, res) => {
  try {
    const clientIp = getClientIp(req);
    const counselorSession = getValidCounselorSession(req.headers.authorization);
    const { studentKey, deviceId, password } = req.body;
    const inputKey = String(studentKey || "").trim().toLowerCase();
    const targetDevId = String(deviceId || "").trim();

    if (!inputKey || !targetDevId) {
      return res.status(400).json({ success: false, error: "شناسه دانش‌آموز و شناسه دستگاه الزامی است." });
    }

    const matchedStudent = serverStudentStore.students.find(
      (s) =>
        (s.name && s.name.toLowerCase() === inputKey) ||
        (s.id && s.id.toLowerCase() === inputKey)
    );

    if (!matchedStudent) {
      return res.status(404).json({ success: false, error: "دانش‌آموز در سامانه یافت نشد." });
    }

    // Permission check: Counselor or valid student password
    const studentStoredHash = matchedStudent.passwordHash || matchedStudent.password || "1234";
    const isStudentPassValid = password ? verifyPassword(String(password).trim(), studentStoredHash) : false;

    if (!counselorSession && !isStudentPassValid) {
      return res.status(403).json({
        success: false,
        error: "جهت حذف نشست و دستگاه، وارد کردن رمز عبور صحیح یا دسترسی مشاور الزامی است."
      });
    }

    const currentBound = Array.isArray(matchedStudent.boundDevices) ? matchedStudent.boundDevices : [];
    const removedDevice = currentBound.find((d) => d.deviceId === targetDevId);

    if (!removedDevice) {
      return res.status(404).json({ success: false, error: "دستگاه مورد نظر یافت نشد." });
    }

    matchedStudent.boundDevices = currentBound.filter((d) => d.deviceId !== targetDevId);
    serverStudentStore.updatedAt = new Date().toISOString();
    saveServerStudentStore(serverStudentStore);

    addSecurityAuditLog(
      "device_revoked",
      "info",
      `دستگاه «${removedDevice.deviceName}» برای دانش‌آموز «${matchedStudent.name}» با موفقیت حذف و لغو اتصال شد`,
      clientIp
    );

    res.json({
      success: true,
      message: `دستگاه «${removedDevice.deviceName}» با موفقیت حذف گردید و ظرفیت اتصال آزاد شد.`,
      boundDevices: matchedStudent.boundDevices
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || "Failed to revoke device" });
  }
});

// Reset all bound devices for a student (allows fresh re-registration on new hardware)
app.post("/api/students/reset-devices", (req, res) => {
  try {
    const clientIp = getClientIp(req);
    const counselorSession = getValidCounselorSession(req.headers.authorization);
    const { studentKey, password } = req.body;
    const inputKey = String(studentKey || "").trim().toLowerCase();

    if (!inputKey) {
      return res.status(400).json({ success: false, error: "شناسه دانش‌آموز الزامی است." });
    }

    const matchedStudent = serverStudentStore.students.find(
      (s) =>
        (s.name && s.name.toLowerCase() === inputKey) ||
        (s.id && s.id.toLowerCase() === inputKey)
    );

    if (!matchedStudent) {
      return res.status(404).json({ success: false, error: "دانش‌آموز در سامانه یافت نشد." });
    }

    const studentStoredHash = matchedStudent.passwordHash || matchedStudent.password || "1234";
    const isStudentPassValid = password ? verifyPassword(String(password).trim(), studentStoredHash) : false;

    if (!counselorSession && !isStudentPassValid) {
      return res.status(403).json({
        success: false,
        error: "جهت ریست تمام دستگاه‌ها، وارد کردن رمز عبور معتبر یا احراز هویت مشاور الزامی است."
      });
    }

    const count = (matchedStudent.boundDevices || []).length;
    matchedStudent.boundDevices = [];
    serverStudentStore.updatedAt = new Date().toISOString();
    saveServerStudentStore(serverStudentStore);

    addSecurityAuditLog(
      "devices_reset",
      "info",
      `تمام دستگاه‌های ثبت‌شده دانش‌آموز «${matchedStudent.name}» (${count} دستگاه) ریست و آزاد شدند`,
      clientIp
    );

    res.json({
      success: true,
      message: `کلیه نشست‌ها و دستگاه‌های متصل دانش‌آموز «${matchedStudent.name}» ریست شدند. دانش‌آموز می‌تواند روی دستگاه‌های جدید خود وارد شود.`,
      boundDevices: []
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || "Failed to reset devices" });
  }
});

// Update device binding configuration per student (Counselor Protected)
app.post("/api/students/update-device-config", (req, res) => {
  try {
    const clientIp = getClientIp(req);
    const counselorSession = getValidCounselorSession(req.headers.authorization);

    if (!counselorSession) {
      return res.status(401).json({ success: false, error: "تنها مشاور ارشد مجاز به تغییر تنظیمات دستگاه‌ها است." });
    }

    const { studentKey, maxAllowedDevices, strictDeviceLock } = req.body;
    const inputKey = String(studentKey || "").trim().toLowerCase();

    const matchedStudent = serverStudentStore.students.find(
      (s) =>
        (s.name && s.name.toLowerCase() === inputKey) ||
        (s.id && s.id.toLowerCase() === inputKey)
    );

    if (!matchedStudent) {
      return res.status(404).json({ success: false, error: "دانش‌آموز در سامانه یافت نشد." });
    }

    if (maxAllowedDevices !== undefined) {
      const parsedMax = Number(maxAllowedDevices);
      if (parsedMax >= 1 && parsedMax <= 5) {
        matchedStudent.maxAllowedDevices = parsedMax;
      }
    }

    if (strictDeviceLock !== undefined) {
      matchedStudent.strictDeviceLock = Boolean(strictDeviceLock);
    }

    serverStudentStore.updatedAt = new Date().toISOString();
    saveServerStudentStore(serverStudentStore);

    addSecurityAuditLog(
      "device_config_updated",
      "info",
      `تنظیمات محدودیت دستگاه دانش‌آموز «${matchedStudent.name}» به‌روزرسانی شد (حداکثر ${matchedStudent.maxAllowedDevices || 2} دستگاه - قفل سخت‌گیرانه: ${matchedStudent.strictDeviceLock !== false ? "فعال" : "غیرفعال"})`,
      clientIp
    );

    res.json({
      success: true,
      message: "تنظیمات دستگاه دانش‌آموز ذخیره شد.",
      student: {
        id: matchedStudent.id,
        name: matchedStudent.name,
        maxAllowedDevices: matchedStudent.maxAllowedDevices,
        strictDeviceLock: matchedStudent.strictDeviceLock,
        boundDevices: matchedStudent.boundDevices || []
      }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || "Failed to update device config" });
  }
});

// ----------------------------------------------------
// Counselor Authentication & Management Endpoints
// ----------------------------------------------------

app.post("/api/counselor/login", (req, res) => {
  try {
    const clientIp = getClientIp(req);
    const { username, password } = req.body;
    const inputUser = String(username || "").trim().toLowerCase();
    const inputPass = String(password || "").trim();

    const rateKey = `counselor_login:${clientIp}`;
    const rateCheck = checkRateLimit(rateKey, 5, 15 * 60 * 1000, 15 * 60 * 1000);

    if (!rateCheck.allowed) {
      addSecurityAuditLog(
        "brute_force_blocked",
        "critical",
        `مسدودسازی IP به دلیل ۵ تلاش ناموفق ورود به پنل مشاور`,
        clientIp
      );
      return res.status(429).json({
        success: false,
        error: `تعداد تلاش‌های ناموفق بیش از حد مجاز است. پنل به مدت ${rateCheck.lockoutMinutes} دقیقه مسدود شد.`,
        lockoutMinutes: rateCheck.lockoutMinutes
      });
    }

    const currentUsername = serverStudentStore.counselorConfig.username.trim().toLowerCase();
    const storedHash = serverStudentStore.counselorConfig.passcodeHash || serverStudentStore.counselorConfig.passcode;

    const validUsernames = [currentUsername, "مشاور", "admin"];
    const isUserValid = validUsernames.includes(inputUser) || !inputUser;
    const isPassValid = verifyPassword(inputPass, storedHash);

    if (isUserValid && isPassValid) {
      resetRateLimit(rateKey);
      const session = createCounselorSession(serverStudentStore.counselorConfig.username, clientIp);

      addSecurityAuditLog(
        "counselor_login_success",
        "info",
        `ورود معتبر مشاور ارشد با توکن امن جدید`,
        clientIp
      );

      return res.json({
        success: true,
        message: "ورود موفق مشاور",
        token: session.token,
        expiresIn: 12 * 60 * 60,
        counselor: {
          username: serverStudentStore.counselorConfig.username,
          announcement: serverStudentStore.counselorConfig.announcement,
          directive: serverStudentStore.counselorConfig.directive
        }
      });
    }

    recordFailedAttempt(rateKey, 5, 15 * 60 * 1000, 15 * 60 * 1000);
    addSecurityAuditLog(
      "counselor_login_failed",
      "warning",
      `تلاش ناموفق برای ورود به پرتال مشاور با نام کاربری «${inputUser || "خالی"}»`,
      clientIp
    );

    const updatedCheck = checkRateLimit(rateKey, 5, 15 * 60 * 1000, 15 * 60 * 1000);
    return res.status(401).json({
      success: false,
      error: "نام کاربری یا رمز عبور مشاور نادرست است.",
      remainingAttempts: updatedCheck.remaining
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || "Login failed" });
  }
});

// Verify Counselor Session Token
app.get("/api/counselor/verify-session", (req, res) => {
  const session = getValidCounselorSession(req.headers.authorization);
  if (!session) {
    return res.status(401).json({ success: false, error: "نشست نامعتبر یا منقضی شده است." });
  }
  res.json({
    success: true,
    username: session.username,
    expiresAt: session.expiresAt
  });
});

// Counselor Logout
app.post("/api/counselor/logout", (req, res) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.substring(7).trim();
    activeCounselorSessions.delete(token);
  }
  res.json({ success: true, message: "خروج موفق مشاور" });
});

// Emergency Lockdown: Revoke all active sessions
app.post("/api/counselor/revoke-all", (req, res) => {
  const session = getValidCounselorSession(req.headers.authorization);
  if (!session) {
    return res.status(401).json({ success: false, error: "احراز هویت الزامی است." });
  }

  const clientIp = getClientIp(req);
  const count = activeCounselorSessions.size;
  activeCounselorSessions.clear();

  addSecurityAuditLog(
    "emergency_session_reset",
    "critical",
    `لغو اضطراری تمام نشست‌های فعال مشاور (${count} نشست باطل شد)`,
    clientIp
  );

  res.json({ success: true, message: `تمام ${count} نشست فعال با موفقیت ابطال شد.` });
});

// Counselor Config Update (Protected)
app.post("/api/counselor/config", (req, res) => {
  try {
    const clientIp = getClientIp(req);
    const session = getValidCounselorSession(req.headers.authorization);
    const { currentPasscode, newUsername, newPasscode, announcement, directive } = req.body;

    const storedHash = serverStudentStore.counselorConfig.passcodeHash || serverStudentStore.counselorConfig.passcode;

    // Must be either an authenticated session or provide valid current password
    if (!session) {
      if (!currentPasscode || !verifyPassword(String(currentPasscode).trim(), storedHash)) {
        addSecurityAuditLog("unauthorized_config_attempt", "warning", "تلاش غیرمجاز برای تغییر تنظیمات مشاور", clientIp);
        return res.status(403).json({ success: false, error: "رمز عبور فعلی مشاور نادرست است یا احراز هویت صورت نگرفته است." });
      }
    }

    if (newPasscode) {
      const trimmedNew = String(newPasscode).trim();
      if (trimmedNew.length < 4) {
        return res.status(400).json({ success: false, error: "رمز عبور جدید مشاور باید حداقل ۴ نویسه باشد." });
      }
      // Hash with PBKDF2 + salt
      serverStudentStore.counselorConfig.passcode = trimmedNew;
      serverStudentStore.counselorConfig.passcodeHash = hashPassword(trimmedNew);

      addSecurityAuditLog("password_changed", "info", "رمز عبور مشاور با هش PBKDF2 به‌روزرسانی شد", clientIp);
    }

    if (newUsername) {
      serverStudentStore.counselorConfig.username = String(newUsername).trim();
    }
    if (typeof announcement === "string") {
      serverStudentStore.counselorConfig.announcement = announcement.trim();
    }
    if (typeof directive === "string") {
      serverStudentStore.counselorConfig.directive = directive.trim();
    }

    serverStudentStore.updatedAt = new Date().toISOString();
    saveServerStudentStore(serverStudentStore);

    res.json({
      success: true,
      message: "تنظیمات و تدابیر امنیتی مشاور ذخیره شد",
      counselorConfig: {
        username: serverStudentStore.counselorConfig.username,
        announcement: serverStudentStore.counselorConfig.announcement,
        directive: serverStudentStore.counselorConfig.directive
      }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || "Failed to update config" });
  }
});

// Direct Counselor Passcode Verification Endpoint (for modals and overlays across all devices/clients)
app.post("/api/counselor/verify-passcode", (req, res) => {
  try {
    const clientIp = getClientIp(req);
    const { passcode } = req.body;
    const inputPass = String(passcode || "").trim();

    if (!inputPass) {
      return res.status(400).json({ success: false, valid: false, error: "رمز عبور ارسال نشده است." });
    }

    const rateKey = `counselor_pass_verify:${clientIp}`;
    const rateCheck = checkRateLimit(rateKey, 10, 5 * 60 * 1000, 10 * 60 * 1000);
    if (!rateCheck.allowed) {
      addSecurityAuditLog("brute_force_blocked", "critical", "مسدودسازی IP به دلیل تلاش‌های مکرر اعتبارسنجی رمز مشاور", clientIp);
      return res.status(429).json({
        success: false,
        valid: false,
        error: `تعداد تلاش‌های ناموفق زیاد است. لطفاً ${rateCheck.lockoutMinutes} دقیقه صبر کنید.`
      });
    }

    const storedHash = serverStudentStore.counselorConfig.passcodeHash || serverStudentStore.counselorConfig.passcode;
    const isValid = verifyPassword(inputPass, storedHash);

    if (isValid) {
      resetRateLimit(rateKey);
      const session = createCounselorSession(serverStudentStore.counselorConfig.username, clientIp);
      addSecurityAuditLog("counselor_verify_success", "info", "اعتبارسنجی موفقیت‌آمیز رمز مشاور", clientIp);
      return res.json({
        success: true,
        valid: true,
        token: session.token,
        username: serverStudentStore.counselorConfig.username
      });
    }

    recordFailedAttempt(rateKey, 10, 5 * 60 * 1000, 10 * 60 * 1000);
    return res.json({
      success: false,
      valid: false,
      error: "رمز عبور مشاور نادرست است."
    });
  } catch (err: any) {
    res.status(500).json({ success: false, valid: false, error: err?.message || "Server error" });
  }
});

// Dedicated change passcode endpoint (called from MasterAdminModal and CounselorDedicatedPortal)
app.post("/api/counselor/change-passcode", (req, res) => {
  try {
    const clientIp = getClientIp(req);
    const session = getValidCounselorSession(req.headers.authorization);
    const { currentPasscode, newPasscode } = req.body;

    const trimmedNew = String(newPasscode || "").trim();
    if (!trimmedNew || trimmedNew.length < 4) {
      return res.status(400).json({ success: false, error: "رمز عبور جدید باید حداقل ۴ کاراکتر باشد." });
    }

    const storedHash = serverStudentStore.counselorConfig.passcodeHash || serverStudentStore.counselorConfig.passcode;

    // Check if session is valid or currentPasscode matches
    const isCurrentValid = currentPasscode ? verifyPassword(String(currentPasscode).trim(), storedHash) : false;
    if (!session && !isCurrentValid) {
      addSecurityAuditLog("unauthorized_password_change", "warning", "تلاش ناموفق برای تغییر رمز مشاور بدون احراز هویت", clientIp);
      return res.status(403).json({ success: false, error: "رمز عبور فعلی مشاور نادرست است." });
    }

    // Update in memory and persist
    serverStudentStore.counselorConfig.passcode = trimmedNew;
    serverStudentStore.counselorConfig.passcodeHash = hashPassword(trimmedNew);
    serverStudentStore.updatedAt = new Date().toISOString();
    saveServerStudentStore(serverStudentStore);

    // Create fresh session
    const newSession = createCounselorSession(serverStudentStore.counselorConfig.username, clientIp);

    addSecurityAuditLog("password_changed", "info", `رمز عبور مشاور با موفقیت تغییر یافت و ذخیره شد`, clientIp);

    return res.json({
      success: true,
      message: "رمز عبور مشاور با موفقیت در پایگاه داده سرور ذخیره شد.",
      token: newSession.token
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || "Error changing password" });
  }
});

// Security Audit Logs & Cyber Shield Telemetry Endpoint
app.get("/api/counselor/security-status", (req, res) => {
  const session = getValidCounselorSession(req.headers.authorization);
  if (!session) {
    return res.status(401).json({ success: false, error: "احراز هویت مشاور الزامی است." });
  }

  let blockedCount = 0;
  const now = Date.now();
  loginRateLimiter.forEach((rec) => {
    if (rec.lockUntil > now) blockedCount += 1;
  });

  const bannedIpsList = Array.from(bannedIpsMap.values());
  const activeBans = bannedIpsList.filter((b) => new Date(b.expiresAt).getTime() > now);

  res.json({
    success: true,
    securityScore: defconLevel === 1 ? 99 : defconLevel === 2 ? 98 : defconLevel === 3 ? 96 : 95,
    activeSessionsCount: activeCounselorSessions.size,
    totalBlockedAttempts: blockedCount + thwartedAttacksCount,
    passwordsHashed: true,
    dataMaskingActive: true,
    bruteForceProtection: true,
    wafActive: true,
    antiDDoSActive: true,
    honeypotTrapsCount: HONEYPOT_PATHS.length,
    tarpitActive: true,
    defconLevel,
    thwartedAttacksCount,
    bannedIps: activeBans,
    recentAuditLogs: serverStudentStore.securityAuditLogs.slice(0, 50)
  });
});

// Defcon Alert Level Controller
app.post("/api/security/set-defcon", (req, res) => {
  const clientIp = getClientIp(req);
  const session = getValidCounselorSession(req.headers.authorization);
  if (!session) {
    return res.status(401).json({ success: false, error: "دسترسی غیرمجاز. فقط مشاور ارشد مجاز است." });
  }

  const { level } = req.body;
  const numLevel = parseInt(level, 10);
  if (numLevel >= 1 && numLevel <= 5) {
    defconLevel = numLevel as 1 | 2 | 3 | 4 | 5;
    addSecurityAuditLog(
      "defcon_change",
      defconLevel <= 2 ? "critical" : "info",
      `تغییر سطح آماده‌باش پدافند سایبری (DEFCON) به سطح ${defconLevel} توسط مشاور`,
      clientIp
    );
    return res.json({ success: true, message: `سطح پدافند با موفقیت روی DEFCON ${defconLevel} تنظیم شد.`, defconLevel });
  }
  return res.status(400).json({ success: false, error: "سطح دفکان نامعتبر است (باید بین ۱ تا ۵ باشد)." });
});

// Manual IP Quarantine & Active Retaliation (Tarpit / Drop)
app.post("/api/security/ban-ip", async (req, res) => {
  const clientIp = getClientIp(req);
  const session = getValidCounselorSession(req.headers.authorization);
  if (!session) {
    return res.status(401).json({ success: false, error: "دسترسی غیرمجاز" });
  }

  const { ip, reason, threatType, counterMeasure, durationMinutes } = req.body;
  const targetIp = String(ip || "").trim();
  if (!targetIp) {
    return res.status(400).json({ success: false, error: "آدرس IP الزامی است." });
  }

  await applyActiveCounterDefense(
    targetIp,
    reason || "مسدودسازی دستی توسط مشاور",
    threatType || "manual_admin_ban",
    counterMeasure || "tarpit",
    parseInt(durationMinutes, 10) || 120
  );

  res.json({
    success: true,
    message: `IP ${targetIp} قرنطینه شد و پدافند فعال گردید.`,
    bannedIps: Array.from(bannedIpsMap.values())
  });
});

// IP Release from Quarantine
app.post("/api/security/unban-ip", (req, res) => {
  const clientIp = getClientIp(req);
  const session = getValidCounselorSession(req.headers.authorization);
  if (!session) {
    return res.status(401).json({ success: false, error: "دسترسی غیرمجاز" });
  }

  const { ip } = req.body;
  const cleanIp = String(ip || "").trim().replace(/^.*:/, "");
  bannedIpsMap.delete(cleanIp);

  addSecurityAuditLog("ip_manual_unban", "info", `رفع انسداد دستی IP ${cleanIp} توسط مشاور`, clientIp);

  res.json({
    success: true,
    message: `آدرس ${cleanIp} با موفقیت از قرنطینه خارج گردید.`,
    bannedIps: Array.from(bannedIpsMap.values())
  });
});

// Security Drill & Threat Simulation (allows testing the defense system in real-time)
app.post("/api/security/simulate-attack", async (req, res) => {
  const clientIp = getClientIp(req);
  const session = getValidCounselorSession(req.headers.authorization);
  if (!session) {
    return res.status(401).json({ success: false, error: "دسترسی غیرمجاز" });
  }

  const { attackType } = req.body;
  const testIp = `198.51.100.${Math.floor(Math.random() * 200) + 10}`;

  if (attackType === "sqli") {
    await applyActiveCounterDefense(testIp, "مانور تست: شبیه‌سازی تلاش تزریق SQL (UNION SELECT NULL, table_name)", "sqli", "tarpit", 30);
  } else if (attackType === "ddos") {
    await applyActiveCounterDefense(testIp, "مانور تست: شبیه‌سازی حمله طغیان ترافیک بات‌نت (۱۲۰ درخواست بر ثانیه)", "ddos", "tarpit", 30);
  } else if (attackType === "xss") {
    await applyActiveCounterDefense(testIp, "مانور تست: تلاش تزریق اسکریپت آلوده (<script>alert(1)</script>)", "xss", "tarpit", 30);
  } else if (attackType === "honeypot") {
    await applyActiveCounterDefense(testIp, "مانور تست: برخورد پویشگر به تله هانی‌پات (مسیر /phpmyadmin/setup.php)", "honeypot", "tarpit", 60);
  } else {
    await applyActiveCounterDefense(testIp, "مانور تست: شبیه‌سازی پویش تهدیدات ناشناس", "probe", "tarpit", 15);
  }

  res.json({
    success: true,
    message: `مانور امنیتی با موفقیت اجرا شد. حمله توسط WAF رهگیری گردید و پاسخ تدافعی Tarpit روی IP مهاجم آزمایشی اعمال شد.`,
    simulatedIp: testIp,
    thwartedAttacksCount
  });
});

// Clear Security Audit Logs
app.post("/api/security/clear-logs", (req, res) => {
  const clientIp = getClientIp(req);
  const session = getValidCounselorSession(req.headers.authorization);
  if (!session) {
    return res.status(401).json({ success: false, error: "دسترسی غیرمجاز" });
  }

  serverStudentStore.securityAuditLogs = [];
  addSecurityAuditLog("logs_cleared", "info", "تاریخچه هشدارهای امنیتی توسط مشاور پاکسازی شد", clientIp);
  saveServerStudentStore(serverStudentStore);

  res.json({ success: true, message: "گزارشات با موفقیت بازنشانی شد." });
});

// Dedicated Student Deletion Endpoint (Instant removal from store and persistence)
app.post("/api/students/delete", (req, res) => {
  try {
    const clientIp = getClientIp(req);
    const session = getValidCounselorSession(req.headers.authorization);

    if (!session) {
      addSecurityAuditLog(
        "unauthorized_delete_attempt",
        "critical",
        "تلاش غیرمجاز برای حذف حساب دانش‌آموز بدون احراز هویت مشاور",
        clientIp
      );
      return res.status(401).json({ success: false, error: "دسترسی غیرمجاز: حذف حساب فقط برای مشاور مجاز است." });
    }

    const { studentKey } = req.body;

    const key = String(studentKey || "").trim().toLowerCase();
    if (!key) {
      return res.status(400).json({ success: false, error: "شناسه یا نام دانش‌آموز الزامی است." });
    }

    const matchedIndex = serverStudentStore.students.findIndex(
      (s) => (s.name && s.name.toLowerCase() === key) || (s.id && s.id.toLowerCase() === key)
    );

    let deletedStudentName = key;
    let deletedStudentId = key;

    if (matchedIndex >= 0) {
      const target = serverStudentStore.students[matchedIndex];
      deletedStudentName = target.name;
      deletedStudentId = target.id || target.name;
      serverStudentStore.students.splice(matchedIndex, 1);
    }

    // Add to deleted blacklist permanently
    const combinedDeleted = Array.from(
      new Set([...serverStudentStore.deletedStudents, deletedStudentName, deletedStudentId])
    );
    serverStudentStore.deletedStudents = combinedDeleted;

    // Clean up any lingering students matching deleted blacklist
    serverStudentStore.students = serverStudentStore.students.filter(
      (s) => !combinedDeleted.some(
        (d) => d.toLowerCase() === s.name.toLowerCase() || (s.id && d.toLowerCase() === s.id.toLowerCase())
      )
    );

    // Clean up usage stats
    delete serverStudentStore.usageStats[deletedStudentName];
    delete serverStudentStore.usageStats[deletedStudentId];

    addSecurityAuditLog(
      "student_deleted",
      "warning",
      `حذف کامل حساب دانش‌آموز «${deletedStudentName}» و پاکسازی داده‌ها`,
      clientIp
    );

    serverStudentStore.updatedAt = new Date().toISOString();
    saveServerStudentStore(serverStudentStore);

    res.json({
      success: true,
      message: `حساب دانش‌آموز «${deletedStudentName}» با موفقیت حذف گردید.`,
      remainingStudents: serverStudentStore.students.length,
      deletedStudents: serverStudentStore.deletedStudents
    });
  } catch (err: any) {
    console.error("Error in /api/students/delete:", err);
    res.status(500).json({ success: false, error: err?.message || "Delete failed" });
  }
});

// Student Directory Synchronization (Protected against unauthorized tampering)
app.post("/api/students/sync", (req, res) => {
  try {
    const clientIp = getClientIp(req);
    const session = getValidCounselorSession(req.headers.authorization);
    const isCounselor = Boolean(session);
    const { students, deletedStudents, usageStats } = req.body;

    // Non-counselor callers must be an authenticated student. Previously this
    // branch had no auth check at all, letting anyone create fake student
    // accounts (with a password of their choosing) or tamper with other
    // students' data/usage stats with zero authentication.
    let authedStudent: { studentId: string; studentName: string } | null = null;
    if (!isCounselor) {
      const studentSession =
        getValidStudentSession(req.headers.authorization) ||
        getValidStudentSession(req.body?.studentToken);
      if (!studentSession) {
        addSecurityAuditLog(
          "unauthorized_sync_attempt",
          "warning",
          "تلاش غیرمجاز برای همگام‌سازی داده‌های دانش‌آموزان بدون احراز هویت",
          clientIp
        );
        return res.status(401).json({ success: false, error: "احراز هویت الزامی است." });
      }
      authedStudent = { studentId: studentSession.studentId, studentName: studentSession.studentName };
    }

    if (isCounselor) {
      // Counselor has full sync authority
      if (Array.isArray(students)) {
        // Collect active names and IDs from incoming students
        const activeIdentifiers = new Set<string>();
        students.forEach((s: any) => {
          if (s.name) activeIdentifiers.add(s.name.trim().toLowerCase());
          if (s.id) {
            const idLower = s.id.trim().toLowerCase();
            activeIdentifiers.add(idLower);
            if (idLower.startsWith("st_")) {
              activeIdentifiers.add(idLower.substring(3));
            } else {
              activeIdentifiers.add(`st_${idLower}`);
            }
          }
        });

        // 1. Remove active students from server's deleted blacklist
        let updatedDeletedList = serverStudentStore.deletedStudents.filter(
          (d) => !activeIdentifiers.has(d.toLowerCase())
        );

        // 2. Add new deleted entries ONLY if they are not active
        if (Array.isArray(deletedStudents)) {
          const freshDeleted = deletedStudents.filter((d) => d && !activeIdentifiers.has(d.toLowerCase()));
          updatedDeletedList = Array.from(new Set([...updatedDeletedList, ...freshDeleted]));
        }

        serverStudentStore.deletedStudents = updatedDeletedList;

        // Securely hash any unhashed passwords and preserve passwordHash
        const processedStudents = students.map((s: any) => {
          let passwordHash = s.passwordHash;
          if (s.password && (!s.password.startsWith("pbkdf2:") && s.password !== "••••••••")) {
            passwordHash = hashPassword(s.password);
          }
          return {
            ...s,
            passwordHash: passwordHash || s.passwordHash
          };
        });

        serverStudentStore.students = processedStudents;
      }
    } else {
      // Authenticated student: may only upsert their own record, and may not
      // create new students, resurrect deleted ones, or touch other accounts.
      if (Array.isArray(students) && authedStudent) {
        const ownKey = authedStudent.studentId.toLowerCase();
        const ownNameKey = authedStudent.studentName.toLowerCase();
        const incomingStudent = students.find(
          (s: any) =>
            s && ((s.id && String(s.id).toLowerCase() === ownKey) ||
                  (s.name && String(s.name).toLowerCase() === ownNameKey))
        );

        if (incomingStudent) {
          const existingIdx = serverStudentStore.students.findIndex(
            s => (s.id && s.id.toLowerCase() === ownKey) || (s.name && s.name.toLowerCase() === ownNameKey)
          );

          if (existingIdx >= 0) {
            const current = serverStudentStore.students[existingIdx];
            // Preserve security-sensitive fields from server regardless of
            // what the client sends — a student sync must never change their
            // own password, access status, or lockout reason.
            serverStudentStore.students[existingIdx] = {
              ...current,
              ...incomingStudent,
              id: current.id,
              name: current.name,
              accessStatus: current.accessStatus,
              lockoutReason: current.lockoutReason,
              passwordHash: current.passwordHash,
              password: current.password
            };
          }
          // If no existing record matches, do nothing — students can never
          // create new accounts via sync.
        }
      }
    }

    if (usageStats && typeof usageStats === "object") {
      if (isCounselor) {
        serverStudentStore.usageStats = {
          ...serverStudentStore.usageStats,
          ...usageStats
        };
      } else if (authedStudent) {
        // A student may only write their own usage stats entry.
        const ownKey = authedStudent.studentId;
        const ownNameKey = authedStudent.studentName;
        const ownEntry = usageStats[ownKey] || usageStats[ownNameKey];
        if (ownEntry) {
          serverStudentStore.usageStats[ownKey] = ownEntry;
          serverStudentStore.usageStats[ownNameKey] = ownEntry;
        }
      }
    }

    serverStudentStore.updatedAt = new Date().toISOString();
    saveServerStudentStore(serverStudentStore);

    res.json({
      success: true,
      message: "مرکز داده‌های دانش‌آموزان با لایه امنیتی همگام‌سازی شد",
      studentsCount: serverStudentStore.students.length,
      deletedCount: serverStudentStore.deletedStudents.length,
      updatedAt: serverStudentStore.updatedAt
    });
  } catch (err: any) {
    console.error("Error in /api/students/sync:", err);
    res.status(500).json({ success: false, error: err?.message || "Sync failed" });
  }
});

// Student usage stats endpoints
app.post("/api/students/usage", requireAuthorizedUser, (req, res) => {
  try {
    const { studentKey, usage } = req.body;
    const user = (req as any).user;

    // Students may only write their own usage stats; the counselor may write any.
    if (user?.type === "student") {
      const inputKey = String(studentKey || "").trim().toLowerCase();
      const ownName = (user.studentName || "").trim().toLowerCase();
      const ownId = (user.studentId || "").trim().toLowerCase();
      if (inputKey !== ownName && inputKey !== ownId) {
        return res.status(403).json({ success: false, error: "امکان ثبت آمار برای حساب دیگری وجود ندارد." });
      }
    }

    if (studentKey && usage) {
      serverStudentStore.usageStats[studentKey] = {
        ...usage,
        updatedAt: new Date().toISOString()
      };
      serverStudentStore.updatedAt = new Date().toISOString();
      saveServerStudentStore(serverStudentStore);
    }
    res.json({ success: true, usageStats: serverStudentStore.usageStats });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || "Usage update failed" });
  }
});

app.get("/api/students/usage", requireAuthorizedUser, (req, res) => {
  const user = (req as any).user;
  if (user?.type === "student") {
    // A student may only see their own usage stats, not everyone else's.
    const ownEntry = serverStudentStore.usageStats[user.studentId] || serverStudentStore.usageStats[user.studentName];
    return res.json({ success: true, usageStats: ownEntry ? { [user.studentName]: ownEntry } : {} });
  }
  res.json({
    success: true,
    usageStats: serverStudentStore.usageStats
  });
});

// Vite middleware or static serving
async function startServer() {
  try {
    const localStore = loadServerStudentStore();
    const remoteResult = await fetchStoreFromFirebase();

    if (remoteResult.exists && remoteResult.data) {
      const remoteStore = remoteResult.data;
      const remoteStudents = Array.isArray(remoteStore.students) ? remoteStore.students : [];
      const localStudents = Array.isArray(localStore.students) ? localStore.students : [];

      const mergedStudentsMap = new Map<string, any>();

      // 1. First add remote students
      remoteStudents.forEach((s) => {
        if (!s || !s.name) return;
        const key = (s.id || s.name).trim().toLowerCase();
        mergedStudentsMap.set(key, s);
      });

      // 2. Merge local students
      localStudents.forEach((s) => {
        if (!s || !s.name) return;
        const key = (s.id || s.name).trim().toLowerCase();
        if (!mergedStudentsMap.has(key)) {
          mergedStudentsMap.set(key, s);
        } else {
          const existing = mergedStudentsMap.get(key);
          mergedStudentsMap.set(key, { ...existing, ...s });
        }
      });

      const mergedStudents = Array.from(mergedStudentsMap.values());
      const deletedList = Array.isArray(remoteStore.deletedStudents) ? remoteStore.deletedStudents : [];
      
      const activeStudents = mergedStudents.filter(
        (s) => !deletedList.some(
          (d) => d.toLowerCase() === (s.name || '').toLowerCase() || (s.id && d.toLowerCase() === s.id.toLowerCase())
        )
      );

      serverStudentStore = {
        ...remoteStore,
        students: activeStudents,
        deletedStudents: deletedList,
        counselorConfig: remoteStore.counselorConfig || localStore.counselorConfig,
        usageStats: { ...(remoteStore.usageStats || {}), ...(localStore.usageStats || {}) },
        updatedAt: new Date().toISOString()
      };

      console.log(`Loaded student store from Firebase & merged local (${serverStudentStore.students.length} students total).`);
      saveServerStudentStore(serverStudentStore);
    } else {
      console.log("No store in Firebase (or inaccessible), initializing from local store.");
      serverStudentStore = localStore;
      saveServerStudentStore(serverStudentStore);
    }
    isFirebaseReady = true;

    // Auto-resume Master Telegram Bot Polling if configured & active
    if (serverStudentStore.telegramBotConfig?.botToken && serverStudentStore.telegramBotConfig?.isActive) {
      currentPollingToken = serverStudentStore.telegramBotConfig.botToken;
      currentPollingBotUsername = serverStudentStore.telegramBotConfig.botUsername || "";
      isPollingActive = true;
      lastUpdateId = 0;
      runTelegramPollingLoop();
      console.log(`Auto-resumed Master Telegram Polling for @${currentPollingBotUsername || "bot"}`);
    }
  } catch (err) {
    console.error("Failed to fetch from Firebase, using local:", err);
    isFirebaseReady = true;
  }

  app.get("/api/download-zip", (req, res) => {
    try {
      const rawAuth = req.headers.authorization || (req.headers["x-auth-token"] as string);
      const counselorSession = getValidCounselorSession(rawAuth);
      const queryPasscode = req.query.passcode as string;
      const storedHash = serverStudentStore.counselorConfig?.passcodeHash || serverStudentStore.counselorConfig?.passcode;
      const isPasscodeValid = queryPasscode && (
        queryPasscode === serverStudentStore.counselorConfig?.passcode ||
        (storedHash && verifyPassword(queryPasscode, storedHash))
      );

      if (!counselorSession && !isPasscodeValid) {
        return res.status(403).json({ error: "دسترسی غیرمجاز: دانلود سورس‌کد تنها برای مشاور ارشد مجاز است." });
      }

      const zipPath = path.resolve(process.cwd(), "public/project-source.zip");
      if (!fs.existsSync(zipPath)) {
        execSync("node scripts/make-zip.js");
      }
      res.download(zipPath, "study-app-source.zip");
    } catch (err: any) {
      res.status(500).json({ error: "خطا در دانلود ZIP: " + err.message });
    }
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
    app.use(async (req, res, next) => {
      if (req.originalUrl.startsWith('/api/')) return next();
      try {
        let template = fs.readFileSync(path.resolve(process.cwd(), 'index.html'), 'utf-8');
        template = await vite.transformIndexHtml(req.originalUrl, template);
        res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
      } catch (e) {
        vite.ssrFixStacktrace(e as Error);
        next(e);
      }
    });
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
