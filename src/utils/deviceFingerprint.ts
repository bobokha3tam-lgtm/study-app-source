/**
 * Hardware & Browser Digital Fingerprinting Engine
 * Collects stable, privacy-preserving device attributes and generates a SHA-256 fingerprint
 * to bind student accounts strictly to authorized devices (Max 1 or 2 devices).
 */

export interface DeviceInfo {
  deviceId: string;
  deviceName: string;
  deviceType: 'mobile' | 'desktop' | 'tablet' | 'unknown';
  browser: string;
  os: string;
  userAgent: string;
}

// Generates or retrieves a persistent local device UUID
function getPersistentDeviceUUID(): string {
  try {
    const key = 'study_advisor_device_uuid';
    let uuid = localStorage.getItem(key);
    if (!uuid) {
      uuid = 'dev_' + Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
      localStorage.setItem(key, uuid);
    }
    return uuid;
  } catch (e) {
    return 'dev_temp_' + Math.random().toString(36).substring(2, 10);
  }
}

// Generate simple SHA-256 hash using Web Crypto API or fallback
async function sha256(message: string): Promise<string> {
  try {
    const msgBuffer = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('').substring(0, 24);
  } catch (e) {
    // Fallback simple hash
    let hash = 0;
    for (let i = 0; i < message.length; i++) {
      const char = message.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash |= 0;
    }
    return 'fp_' + Math.abs(hash).toString(16) + getPersistentDeviceUUID().substring(0, 10);
  }
}

// Canvas Fingerprinting
function getCanvasFingerprint(): string {
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 200;
    canvas.height = 50;
    const ctx = canvas.getContext('2d');
    if (!ctx) return 'no_canvas';
    ctx.textBaseline = 'top';
    ctx.font = "14px 'IRANSans', Arial, sans-serif";
    ctx.fillStyle = '#10b981';
    ctx.fillRect(10, 10, 60, 20);
    ctx.fillStyle = '#0f172a';
    ctx.fillText('StudyAdvisor🔒Security', 15, 15);
    return canvas.toDataURL().substring(0, 120);
  } catch (e) {
    return 'canvas_err';
  }
}

// WebGL Vendor / Renderer detection
function getWebGLInfo(): string {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (!gl) return 'no_webgl';
    const dbgRenderInfo = (gl as any).getExtension('WEBGL_debug_renderer_info');
    if (dbgRenderInfo) {
      const vendor = (gl as any).getParameter(dbgRenderInfo.UNMASKED_VENDOR_WEBGL) || '';
      const renderer = (gl as any).getParameter(dbgRenderInfo.UNMASKED_RENDERER_WEBGL) || '';
      return `${vendor}~${renderer}`;
    }
    return 'webgl_basic';
  } catch (e) {
    return 'webgl_err';
  }
}

// OS and Device Name Parsing
export function parseDeviceDetails(): {
  deviceType: 'mobile' | 'desktop' | 'tablet' | 'unknown';
  os: string;
  browser: string;
  friendlyName: string;
} {
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
  const platform = typeof navigator !== 'undefined' ? (navigator.platform || '') : '';

  let os = 'نامشخص';
  let deviceType: 'mobile' | 'desktop' | 'tablet' | 'unknown' = 'desktop';
  let browser = 'مرورگر وب';

  // Detect OS & Device Type
  if (/iPad|Tablet/i.test(ua) || (platform === 'MacIntel' && navigator.maxTouchPoints > 1)) {
    os = 'iPadOS / تبلت';
    deviceType = 'tablet';
  } else if (/iPhone/i.test(ua)) {
    os = 'iOS (آیفون)';
    deviceType = 'mobile';
  } else if (/Android/i.test(ua)) {
    if (/Mobile/i.test(ua)) {
      os = 'اندروید';
      deviceType = 'mobile';
    } else {
      os = 'تبلت اندروید';
      deviceType = 'tablet';
    }
  } else if (/Windows/i.test(ua)) {
    os = 'ویندوز';
    deviceType = 'desktop';
  } else if (/Macintosh|Mac OS X/i.test(ua)) {
    os = 'macOS (مک‌بوک)';
    deviceType = 'desktop';
  } else if (/Linux/i.test(ua)) {
    os = 'لینوکس';
    deviceType = 'desktop';
  }

  // Detect Browser
  if (/Edg/i.test(ua)) {
    browser = 'Microsoft Edge';
  } else if (/Chrome|CriOS/i.test(ua)) {
    browser = 'Google Chrome';
  } else if (/Safari/i.test(ua) && !/Chrome/i.test(ua)) {
    browser = 'Apple Safari';
  } else if (/Firefox|FxiOS/i.test(ua)) {
    browser = 'Mozilla Firefox';
  } else if (/SamsungBrowser/i.test(ua)) {
    browser = 'Samsung Internet';
  } else if (/Opera|OPR/i.test(ua)) {
    browser = 'Opera';
  }

  // Generate Persian Friendly Name
  let friendlyName = '';
  if (deviceType === 'mobile') {
    friendlyName = `گوشی ${os.includes('iOS') ? 'آیفون' : 'اندروید'} (${browser})`;
  } else if (deviceType === 'tablet') {
    friendlyName = `تبلت ${os.includes('iPad') ? 'آیپد' : 'اندروید'} (${browser})`;
  } else {
    friendlyName = `سیستم ${os} (${browser})`;
  }

  return { deviceType, os, browser, friendlyName };
}

/**
 * Main function to generate hardware fingerprint and device meta
 */
export async function getDeviceFingerprint(): Promise<DeviceInfo> {
  const { deviceType, os, browser, friendlyName } = parseDeviceDetails();
  const persistentUUID = getPersistentDeviceUUID();
  const canvasHash = getCanvasFingerprint();
  const webglHash = getWebGLInfo();

  const screenInfo = typeof window !== 'undefined'
    ? `${window.screen.width}x${window.screen.height}x${window.screen.colorDepth}`
    : 'screen_default';

  const tz = typeof Intl !== 'undefined' ? Intl.DateTimeFormat().resolvedOptions().timeZone : 'Asia/Tehran';
  const hardwareConcurrency = typeof navigator !== 'undefined' ? navigator.hardwareConcurrency || 4 : 4;

  const rawFingerprintPayload = [
    persistentUUID,
    canvasHash,
    webglHash,
    screenInfo,
    tz,
    hardwareConcurrency,
    os,
    browser
  ].join('|||');

  const hashedId = await sha256(rawFingerprintPayload);

  return {
    deviceId: hashedId,
    deviceName: friendlyName,
    deviceType,
    browser,
    os,
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
  };
}
