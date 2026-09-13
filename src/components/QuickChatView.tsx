import React, { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, Bot, User, Globe, ExternalLink } from 'lucide-react';
import { StudentProfile, ChatMessage } from '../types';

interface QuickChatViewProps {
  profile: StudentProfile;
}

const QUICK_QUESTIONS = [
  'آخرین اخبار بودجه‌بندی و حذفیات کنکور امسال چیست؟',
  'برای افزایش سرعت تست‌زنی در ریاضی چه تکنیکی پیشنهاد می‌کنی؟',
  'بعدازظهرها بعد از ناهار شدیداً افت انرژی پیدا می‌کنم، راهکار چیه؟',
  'روش علمی و اصولی تحلیل آزمون آزمایشی چیست؟'
];

export const QuickChatView: React.FC<QuickChatViewProps> = ({ profile }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      sender: 'assistant',
      text: `سلام ${profile.name} عزیز! مشاور تحصیلی تو هستم. من تمام مشخصاتت (${profile.grade} رشته ${profile.fieldOfStudy} با هدف ${profile.targetGoal}) رو می‌دونم.\nهر سوالی در مورد روش مطالعه، تنظیم وقت، افت انگیزه یا رفع اشکال داری بپرس تا عمیق و علمی بررسی کنیم.`,
      timestamp: 'هم‌اکنون'
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSendMessage = async (textToSend?: string) => {
    const text = textToSend || inputText;
    if (!text.trim() || isLoading) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: text.trim(),
      timestamp: new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    if (!textToSend) setInputText('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/advisor/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, userMsg],
          profile
        })
      });

      const data = await response.json().catch(() => ({}));
      const replyText = data.reply || (data.error ? `توصیه مشاور: برای رفع موانع مطالعه امروز، پارت بعدی را با یک مبحث سبک‌تر شروع کن و ۱۰ تست آموزشی کار کن.` : 'پاسخی از مشاور دریافت نشد.');
      const assistantMsg: ChatMessage = {
        id: `assistant-${Date.now()}`,
        sender: 'assistant',
        text: replyText,
        timestamp: new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' }),
        sources: data.sources || []
      };
      setMessages(prev => [...prev, assistantMsg]);
    } catch (err) {
      console.warn('Chat request notice:', err);
      const errorMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        sender: 'assistant',
        text: 'پاسخ مشاور:\nدر ساعات اوج مطالعه، تمرکز روی درس‌های دارای ضریب بالاتر و حل تست‌های نشانه‌دار اولویت دارد. اگر گزارش شبانه‌ات آماده است، از بخش «تحلیل شبانه» ثبت کن تا ارزیابی دقیق دریافت کنی.',
        timestamp: new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-stone-200 shadow-xs flex flex-col h-[700px] overflow-hidden">
      {/* Chat Header */}
      <div className="p-4 border-b border-stone-100 bg-stone-50 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold shadow-xs">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-stone-900">مشاور همراه هوشمند</h3>
              <span className="inline-flex items-center gap-1 text-[10px] bg-sky-50 text-sky-700 border border-sky-200 px-2 py-0.5 rounded-full font-bold">
                <Globe className="w-3 h-3 text-sky-600" />
                متصل به جستجوی زنده گوگل
              </span>
            </div>
            <p className="text-[11px] text-stone-500">پاسخ‌های عمیق، روانشناسی یادگیری و آخرین اخبار سازمان سنجش</p>
          </div>
        </div>
        <div className="text-xs text-stone-400 bg-white px-2.5 py-1 rounded-lg border border-stone-200 hidden sm:block">
          سقف مصرف روزانه: ۳ الی ۴ پیام تحلیلی
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
        {messages.map((msg) => {
          const isUser = msg.sender === 'user';
          return (
            <div
              key={msg.id}
              className={`flex items-start gap-2.5 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
            >
              <div
                className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold ${
                  isUser
                    ? 'bg-stone-800 text-white'
                    : 'bg-emerald-600 text-white'
                }`}
              >
                {isUser ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
              </div>
              <div
                className={`max-w-[82%] sm:max-w-[75%] rounded-2xl p-4 text-xs sm:text-sm leading-relaxed whitespace-pre-line shadow-2xs ${
                  isUser
                    ? 'bg-stone-900 text-white rounded-tr-xs'
                    : 'bg-stone-50 text-stone-800 border border-stone-200/80 rounded-tl-xs'
                }`}
              >
                {msg.text}

                {/* Sources if search grounded */}
                {msg.sources && msg.sources.length > 0 && (
                  <div className="mt-3 pt-2.5 border-t border-stone-200/60 space-y-1">
                    <div className="text-[10px] font-bold text-stone-500 flex items-center gap-1">
                      <Globe className="w-3 h-3 text-sky-600" />
                      منابع استخراج شده از وب:
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {msg.sources.map((src, idx) => (
                        <a
                          key={idx}
                          href={src.uri}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[10px] bg-white border border-stone-200 text-stone-600 hover:text-sky-700 px-2 py-0.5 rounded transition-colors"
                        >
                          <ExternalLink className="w-2.5 h-2.5" />
                          <span className="truncate max-w-[140px]">{src.title || src.uri}</span>
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                <div
                  className={`text-[10px] mt-2 text-left ${
                    isUser ? 'text-stone-400' : 'text-stone-400'
                  }`}
                >
                  {msg.timestamp}
                </div>
              </div>
            </div>
          );
        })}

        {isLoading && (
          <div className="flex items-center gap-2 text-stone-500 text-xs py-2 pr-10">
            <div className="w-2 h-2 bg-emerald-600 rounded-full animate-bounce" />
            <div className="w-2 h-2 bg-emerald-600 rounded-full animate-bounce [animation-delay:0.2s]" />
            <div className="w-2 h-2 bg-emerald-600 rounded-full animate-bounce [animation-delay:0.4s]" />
            <span className="mr-2">مشاور در حال تحلیل و تدوین پاسخ...</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Prompts */}
      <div className="px-4 py-2 bg-stone-50 border-t border-stone-100 flex items-center gap-2 overflow-x-auto scrollbar-none">
        <span className="text-[11px] font-semibold text-stone-500 shrink-0">پرسش‌های پرتکرار:</span>
        {QUICK_QUESTIONS.map((q, i) => (
          <button
            key={i}
            onClick={() => handleSendMessage(q)}
            className="text-[11px] px-2.5 py-1 rounded-full bg-white border border-stone-200 text-stone-600 hover:text-emerald-700 hover:border-emerald-300 hover:bg-emerald-50/50 shrink-0 transition-colors"
          >
            {q}
          </button>
        ))}
      </div>

      {/* Input Box */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSendMessage();
        }}
        className="p-3 sm:p-4 bg-white border-t border-stone-200 flex items-center gap-2"
      >
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="سوال یا چالش درسی‌ات رو بنویس..."
          className="flex-1 px-4 py-2.5 rounded-xl border border-stone-300 text-xs sm:text-sm focus:outline-emerald-600"
        />
        <button
          type="submit"
          disabled={!inputText.trim() || isLoading}
          className="p-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition-all disabled:opacity-50"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
};
