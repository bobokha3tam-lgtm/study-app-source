import React, { useState } from 'react';
import { Share2, Copy, Check, Send, Smartphone, ShieldCheck, X, Bot, CheckCircle2 } from 'lucide-react';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentStudentName?: string;
}

export const ShareModal: React.FC<ShareModalProps> = ({ isOpen, onClose, currentStudentName }) => {
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedStudentLink, setCopiedStudentLink] = useState(false);
  const [copiedHermes, setCopiedHermes] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  // Derive current app URL and normalize AI Studio dev link to public preview link
  const rawOrigin = typeof window !== 'undefined' ? window.location.origin : '';
  const rawPath = typeof window !== 'undefined' ? window.location.pathname : '';
  const rawHref = typeof window !== 'undefined' ? window.location.href.split('#')[0] : '';
  const isAiStudioDevUrl = rawOrigin.includes('ais-dev-');

  // Convert private ais-dev-* to public ais-pre-* so anyone can open it without Google Cloud permissions
  const publicOrigin = isAiStudioDevUrl ? rawOrigin.replace('ais-dev-', 'ais-pre-') : rawOrigin;
  const baseUrl = typeof window !== 'undefined' ? publicOrigin + rawPath : '';
  const currentUrl = isAiStudioDevUrl ? rawHref.replace('ais-dev-', 'ais-pre-') : rawHref;

  const studentDedicatedUrl = currentStudentName
    ? `${baseUrl}?student=${encodeURIComponent(currentStudentName)}`
    : currentUrl;

  const apiUrl = typeof window !== 'undefined' ? `${publicOrigin}/v1` : '';

  const shareText = `سلام! این سامانه مشاور هوشمند درسی و تحلیل شبانه‌اس که من ازش استفاده می‌کنم. می‌تونی وارد حساب خودت بشی و برنامه‌ریزی هفتگی و تحلیل آزمون بگیری:\n${studentDedicatedUrl}`;

  // Robust multi-tier clipboard copying that works in iframes, split-screens and restricted browser contexts
  const copyToClipboardSafely = async (text: string, onSuccess: () => void) => {
    let success = false;
    // Tier 1: Modern Clipboard API
    if (navigator?.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(text);
        success = true;
      } catch (err) {
        console.warn('Navigator clipboard failed, attempting fallback...', err);
      }
    }

    // Tier 2: Document execCommand fallback for iframes and windowed modes
    if (!success) {
      try {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.top = '0';
        textArea.style.left = '0';
        textArea.style.width = '2em';
        textArea.style.height = '2em';
        textArea.style.padding = '0';
        textArea.style.border = 'none';
        textArea.style.outline = 'none';
        textArea.style.boxShadow = 'none';
        textArea.style.background = 'transparent';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        success = document.execCommand('copy');
        document.body.removeChild(textArea);
      } catch (fallbackErr) {
        console.error('Fallback execCommand copy error:', fallbackErr);
      }
    }

    if (success) {
      onSuccess();
      setToastMessage('لینک با موفقیت کپی شد');
      setTimeout(() => setToastMessage(null), 2500);
    } else {
      // Prompt user as ultimate safeguard
      window.prompt('لطفاً لینک زیر را دستی کپی کنید (Ctrl+C):', text);
    }
  };

  const handleCopyLink = () => {
    copyToClipboardSafely(currentUrl, () => {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    });
  };

  const handleCopyStudentLink = () => {
    copyToClipboardSafely(studentDedicatedUrl, () => {
      setCopiedStudentLink(true);
      setTimeout(() => setCopiedStudentLink(false), 2500);
    });
  };

  const handleCopyHermes = () => {
    copyToClipboardSafely(apiUrl, () => {
      setCopiedHermes(true);
      setTimeout(() => setCopiedHermes(false), 2500);
    });
  };

  const handleNativeShare = async () => {
    if (typeof navigator !== 'undefined' && 'share' in navigator) {
      try {
        await navigator.share({
          title: 'مشاور درسی هوشمند کنکور',
          text: shareText,
          url: currentUrl,
        });
      } catch (e) {
        // User cancelled or share not allowed
      }
    } else {
      handleCopyLink();
    }
  };

  const handleShareTelegram = () => {
    const tgUrl = `https://t.me/share/url?url=${encodeURIComponent(currentUrl)}&text=${encodeURIComponent('مشاور درسی هوشمند و برنامه‌ریزی هفتگی:')}`;
    window.open(tgUrl, '_blank');
  };

  const handleShareWhatsApp = () => {
    const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`;
    window.open(waUrl, '_blank');
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-stone-950/70 backdrop-blur-sm animate-fadeIn"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl max-w-lg w-full border border-stone-200 overflow-hidden flex flex-col max-h-[92vh] sm:max-h-[88vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header - Fixed & Always Visible */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 bg-stone-50/90 border-b border-stone-200 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shadow-xs">
              <Share2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-stone-900 text-sm sm:text-base">اشتراک‌گذاری سامانه</h3>
              <p className="text-[11px] text-stone-500">ارسال لینک به دانش‌آموزان، دوستان و همکلاسی‌ها</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-stone-400 hover:text-stone-700 hover:bg-stone-200/70 transition-colors cursor-pointer"
            aria-label="بستن"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body - Ensures full visibility in non-fullscreen/small viewports */}
        <div className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1 text-right overscroll-contain">
          {/* Dedicated Student Link Box (if on active student profile) */}
          {currentStudentName && (
            <div className="p-4 rounded-2xl bg-teal-50 border border-teal-200 space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <label className="text-xs font-bold text-teal-900 flex items-center gap-1.5">
                  <span>🎯 لینک اختصاصی دانش‌آموز:</span>
                  <span className="text-teal-700 underline font-black">{currentStudentName}</span>
                </label>
                <span className="text-[10px] bg-teal-100 text-teal-800 px-2 py-0.5 rounded-md font-bold">پیشنهادی برای دانش‌آموز</span>
              </div>

              <div className="flex items-center gap-2 bg-white p-1.5 sm:p-2 rounded-xl border border-teal-200 shadow-2xs">
                <input
                  type="text"
                  readOnly
                  value={studentDedicatedUrl}
                  onClick={(e) => (e.target as HTMLInputElement).select()}
                  className="flex-1 bg-transparent text-xs text-stone-700 font-mono focus:outline-none px-2 text-left dir-ltr truncate select-all"
                />
                <button
                  onClick={handleCopyStudentLink}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-teal-600 text-white text-xs font-bold hover:bg-teal-700 transition-colors shadow-xs shrink-0 cursor-pointer active:scale-95"
                >
                  {copiedStudentLink ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-amber-300" />
                      <span>کپی شد!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>کپی لینک</span>
                    </>
                  )}
                </button>
              </div>
              <p className="text-[11px] text-teal-800 leading-tight">
                با باز کردن این لینک، صفحه مستقیماً با پروفایل <strong>{currentStudentName}</strong> باز می‌شود.
              </p>
            </div>
          )}

          {/* Quick Copy General Link Box */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-stone-700">
              لینک عمومی سامانه (صفحه اصلی ورود):
            </label>
            <div className="flex items-center gap-2 bg-stone-100/90 p-1.5 sm:p-2 rounded-xl border border-stone-200 shadow-2xs">
              <input
                type="text"
                readOnly
                value={currentUrl}
                onClick={(e) => (e.target as HTMLInputElement).select()}
                className="flex-1 bg-transparent text-xs text-stone-700 font-mono focus:outline-none px-2 text-left dir-ltr truncate select-all"
              />
              <button
                onClick={handleCopyLink}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-stone-900 text-white text-xs font-bold hover:bg-stone-800 transition-colors shadow-xs shrink-0 cursor-pointer active:scale-95"
              >
                {copiedLink ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>کپی شد!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>کپی لینک</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Security & Anti-DDoS Policy Notice */}
          <div className="p-3.5 rounded-2xl bg-emerald-50/90 border border-emerald-200 space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>سیاست امنیتی: دسترسی مهمان کاملاً مسدود است</span>
              </label>
              <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-md">حفاظت ضد دیداس</span>
            </div>
            <p className="text-[11px] text-emerald-800 leading-relaxed">
              جهت جلوگیری از حملات دیداس، نفوذ ربات‌ها و هدررفت منابع هوش مصنوعی، ورود مهمان غیرفعال است. دانش‌آموزان جدید برای ایجاد حساب حتماً باید کد تاییدیه یا دعوت مشاور را همراه داشته باشند.
            </p>
          </div>

          {/* Native & Social Share Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
            {typeof navigator !== 'undefined' && 'share' in navigator && (
              <button
                onClick={handleNativeShare}
                className="col-span-1 sm:col-span-2 flex items-center justify-center gap-2 p-2.5 rounded-xl border border-emerald-300 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
              >
                <Share2 className="w-4 h-4" />
                <span>اشتراک‌گذاری مستقیم (منوی سیستم‌عامل)</span>
              </button>
            )}

            <button
              onClick={handleShareTelegram}
              className="flex items-center justify-center gap-2 p-2.5 rounded-xl border border-sky-200 bg-sky-50/80 hover:bg-sky-100 text-sky-700 text-xs font-semibold transition-colors cursor-pointer"
            >
              <Send className="w-4 h-4" />
              <span>ارسال در تلگرام</span>
            </button>

            <button
              onClick={handleShareWhatsApp}
              className="flex items-center justify-center gap-2 p-2.5 rounded-xl border border-emerald-200 bg-emerald-50/80 hover:bg-emerald-100 text-emerald-700 text-xs font-semibold transition-colors cursor-pointer"
            >
              <Smartphone className="w-4 h-4" />
              <span>ارسال در واتس‌اپ</span>
            </button>
          </div>

          {/* Hermes / Telegram Bot Endpoint Share */}
          <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                <Bot className="w-4 h-4 text-amber-700" />
                <span>آدرس اتصال به ربات و Hermes Agent:</span>
              </span>
              <button
                onClick={handleCopyHermes}
                className="text-[11px] font-bold text-amber-800 hover:text-amber-950 flex items-center gap-1 bg-amber-100/90 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
              >
                {copiedHermes ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                <span>{copiedHermes ? 'کپی شد' : 'کپی API'}</span>
              </button>
            </div>
            <p className="text-[11px] text-amber-900 font-mono dir-ltr text-left truncate bg-white/80 p-2 rounded-lg border border-amber-200/70">
              {apiUrl}
            </p>
          </div>

          {/* Privacy & Account Isolation Guarantee */}
          <div className="flex items-start gap-2.5 p-3 rounded-xl bg-stone-50 border border-stone-200 text-stone-600">
            <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div className="text-xs leading-relaxed">
              <p className="font-bold text-stone-800 mb-0.5">تفکیک کامل اطلاعات و امنیت دسترسی</p>
              <p className="text-stone-500 text-[11px]">
                هر دانش‌آموز در محیط مستقل خود فعالیت می‌کند. برنامه‌ها، گزارش‌ها و کدهای دسترسی به صورت مجزا ذخیره شده و داده‌های کاربران با یکدیگر تداخل نخواهند داشت.
              </p>
            </div>
          </div>
        </div>

        {/* Footer - Fixed */}
        <div className="px-5 sm:px-6 py-3 bg-stone-50/90 border-t border-stone-200 flex items-center justify-between shrink-0">
          <div className="text-[11px] text-stone-500">
            {toastMessage && (
              <span className="text-emerald-600 font-bold flex items-center gap-1 animate-fadeIn">
                <CheckCircle2 className="w-3.5 h-3.5" />
                {toastMessage}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-stone-200 hover:bg-stone-300 text-stone-700 text-xs font-bold transition-colors cursor-pointer"
          >
            بستن پنجره
          </button>
        </div>
      </div>
    </div>
  );
};
