import React, { useState } from 'react';
import { 
  Sparkles, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  HelpCircle, 
  BookOpen, 
  ChevronLeft, 
  ChevronRight, 
  RotateCcw,
  Zap,
  Target,
  Flame,
  Award
} from 'lucide-react';
import { TrapQuestion, ExamBudget } from '../types';

interface KonkurTrapQuizzerViewProps {
  examBudget: ExamBudget;
  initialQuestions: TrapQuestion[];
}

export function KonkurTrapQuizzerView({
  examBudget,
  initialQuestions,
}: KonkurTrapQuizzerViewProps) {
  const [questions, setQuestions] = useState<TrapQuestion[]>(initialQuestions);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});
  const [isLoadingAi, setIsLoadingAi] = useState<boolean>(false);
  const [subject, setSubject] = useState<string>('حسابان ۲');
  const [topic, setTopic] = useState<string>(examBudget.selectedTopics[0] || 'مشتق و کاربرد مشتق');

  const currentQ = questions[currentIndex];
  const userChoice = selectedAnswers[currentIndex];
  const isAnswered = userChoice !== undefined;

  const handleSelectOption = (optIndex: number) => {
    if (isAnswered) return;
    setSelectedAnswers((prev) => ({ ...prev, [currentIndex]: optIndex }));
  };

  const handleGenerateNewQuiz = async () => {
    setIsLoadingAi(true);
    try {
      const res = await fetch('/api/advisor/generate-trap-quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject, topic }),
      });

      if (!res.ok) throw new Error('خطا در تولید کوییز');
      const data = await res.json();
      if (data.questions && data.questions.length > 0) {
        setQuestions(data.questions);
        setCurrentIndex(0);
        setSelectedAnswers({});
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingAi(false);
    }
  };

  // Score statistics
  const answeredCount = Object.keys(selectedAnswers).length;
  const correctCount = Object.entries(selectedAnswers).filter(([idx, choice]) => {
    return questions[Number(idx)]?.correctIndex === choice;
  }).length;
  const trapFellCount = Object.entries(selectedAnswers).filter(([idx, choice]) => {
    return questions[Number(idx)]?.trapIndex === choice;
  }).length;

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white border border-stone-200 rounded-2xl p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-stone-100">
          <div>
            <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 text-xs font-semibold mb-2 border border-amber-200">
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              <span>تله‌یاب و آزمون‌ساز هوشمند کنکور (AI Trap Quizzer)</span>
            </div>
            <h2 className="text-xl font-bold text-stone-900">
              چالش تله‌های پنهان طراحان کنکور
            </h2>
            <p className="text-xs text-stone-500 mt-1">
              طراح کنکور همیشه ۲ گزینه بسیار وسوسه‌انگیز برای داوطلبانی که شتاب‌زده حل می‌کنند قرار می‌دهد. یاد بگیر چطور این تله‌ها را در ۵ ثانیه تشخیص دهی!
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs bg-stone-50 border border-stone-200 px-3 py-2 rounded-xl text-stone-600">
              تست‌های حل‌شده: <strong>{answeredCount}</strong> از {questions.length} | درست: <strong className="text-emerald-700">{correctCount}</strong> | افتادن در دام: <strong className="text-rose-600">{trapFellCount}</strong>
            </span>
          </div>
        </div>

        {/* Generator Controls */}
        <div className="mt-4 pt-1 flex flex-col sm:flex-row items-center gap-3 text-xs">
          <div className="w-full sm:w-auto flex-1 flex flex-col sm:flex-row gap-2">
            <select
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="p-2.5 rounded-xl border border-stone-200 bg-stone-50 font-medium text-xs"
            >
              <option value="حسابان ۲">حسابان ۲</option>
              <option value="هندسه ۳">هندسه ۳</option>
              <option value="ریاضی گسسته">ریاضی گسسته</option>
              <option value="فیزیک ۳">فیزیک ۳ دوازدهم</option>
              <option value="شیمی ۳">شیمی ۳ دوازدهم</option>
            </select>

            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="مبحث دقیق (مثال: نقاط عطف و تقعر / معادلات همنهشتی)"
              className="flex-1 p-2.5 rounded-xl border border-stone-200 bg-stone-50 text-xs"
            />
          </div>

          <button
            onClick={handleGenerateNewQuiz}
            disabled={isLoadingAi}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition cursor-pointer disabled:opacity-50"
          >
            {isLoadingAi ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>در حال طراحی تست‌های دام‌دار...</span>
              </>
            ) : (
              <>
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                <span>طراحی ۳ تست چالش‌برانگیز جدید با هوش مصنوعی</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Active Question Display */}
      {currentQ && (
        <div className="bg-white border border-stone-200 rounded-2xl p-6 shadow-xs space-y-6 animate-fadeIn">
          {/* Question Header */}
          <div className="flex items-center justify-between border-b border-stone-100 pb-3">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-stone-100 text-stone-700 text-xs font-bold">
                سوال {currentIndex + 1} از {questions.length}
              </span>
              <span className="text-xs text-stone-500 font-medium">
                {currentQ.subject} • {currentQ.topic}
              </span>
            </div>

            <span className="text-xs px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 font-bold border border-rose-200">
              سطح: {currentQ.difficulty || 'دام‌دار کنکور'}
            </span>
          </div>

          {/* Question Body */}
          <div className="p-4 bg-stone-50/80 rounded-xl border border-stone-200/80">
            <p className="text-sm font-semibold text-stone-900 leading-relaxed">
              {currentQ.questionText}
            </p>
          </div>

          {/* 4 Options */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {currentQ.options.map((optText, optIdx) => {
              const isSelected = userChoice === optIdx;
              const isCorrect = currentQ.correctIndex === optIdx;
              const isTrap = currentQ.trapIndex === optIdx;

              let cardStyle = 'border-stone-200 hover:border-stone-400 bg-white text-stone-800';
              if (isAnswered) {
                if (isCorrect) {
                  cardStyle = 'border-emerald-500 bg-emerald-50 text-emerald-950 font-bold shadow-xs';
                } else if (isSelected && isTrap) {
                  cardStyle = 'border-amber-500 bg-amber-50 text-amber-950 font-bold';
                } else if (isSelected && !isCorrect) {
                  cardStyle = 'border-rose-500 bg-rose-50 text-rose-950';
                } else {
                  cardStyle = 'border-stone-200 opacity-60 bg-stone-50';
                }
              }

              return (
                <button
                  key={optIdx}
                  type="button"
                  onClick={() => handleSelectOption(optIdx)}
                  disabled={isAnswered}
                  className={`p-4 rounded-xl border text-right transition cursor-pointer flex items-center justify-between gap-2 text-xs ${cardStyle}`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="w-5 h-5 rounded-full border border-stone-300 flex items-center justify-center font-bold text-[10px] shrink-0">
                      {optIdx + 1}
                    </span>
                    <span>{optText}</span>
                  </div>

                  {isAnswered && (
                    <div className="shrink-0">
                      {isCorrect ? (
                        <span className="px-2 py-0.5 rounded bg-emerald-600 text-white text-[10px] font-bold">
                          گزینه صحیح ✓
                        </span>
                      ) : isTrap && isSelected ? (
                        <span className="px-2 py-0.5 rounded bg-amber-600 text-white text-[10px] font-bold">
                          دام طراح!
                        </span>
                      ) : null}
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Feedback & Trap Anatomy (Visible after answer) */}
          {isAnswered && (
            <div className="space-y-4 pt-4 border-t border-stone-100 animate-fadeIn">
              {userChoice === currentQ.correctIndex ? (
                <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <div>
                    <strong className="block font-bold">پاسخ کاملاً درست و هوشمندانه!</strong>
                    <span>آفرین! توانستی دست طراح کنکور را بخوانی و از دام عبور کنی.</span>
                  </div>
                </div>
              ) : userChoice === currentQ.trapIndex ? (
                <div className="p-3.5 bg-amber-50 border border-amber-300 rounded-xl text-xs text-amber-950 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                  <div>
                    <strong className="block font-bold">دقیقاً در تله طراح کنکور افتادی!</strong>
                    <span>بیش از ۶۰٪ داوطلبان همین گزینه انتخابی شما را علامت می‌زنند. تحلیل زیر را با دقت بخوان:</span>
                  </div>
                </div>
              ) : (
                <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-900 flex items-center gap-2">
                  <XCircle className="w-5 h-5 text-rose-600 shrink-0" />
                  <div>
                    <strong className="block font-bold">پاسخ نادرست بود.</strong>
                    <span>گزینه صحیح گزینه {currentQ.correctIndex + 1} است. تحلیل را در کادر زیر مشاهده کنید.</span>
                  </div>
                </div>
              )}

              {/* Anatomy Box */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-xl space-y-1.5">
                  <span className="font-bold text-amber-900 flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-amber-700" />
                    <span>کالبدشکافی دام طراح (The Trap Anatomy):</span>
                  </span>
                  <p className="text-stone-700 leading-relaxed">
                    {currentQ.trapExplanation}
                  </p>
                </div>

                <div className="p-4 bg-blue-50/70 border border-blue-200 rounded-xl space-y-1.5">
                  <span className="font-bold text-blue-900 flex items-center gap-1.5">
                    <BookOpen className="w-4 h-4 text-blue-700" />
                    <span>نکته طلایی و ریشه‌ای درسنامه:</span>
                  </span>
                  <p className="text-stone-700 leading-relaxed">
                    {currentQ.conceptLesson}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Pagination */}
          <div className="flex items-center justify-between pt-2">
            <button
              onClick={() => setCurrentIndex((p) => Math.max(0, p - 1))}
              disabled={currentIndex === 0}
              className="px-4 py-2 rounded-xl border border-stone-200 text-stone-700 text-xs font-semibold flex items-center gap-1.5 disabled:opacity-30 cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
              <span>سوال قبلی</span>
            </button>

            <span className="text-xs text-stone-400">
              {currentIndex + 1} از {questions.length}
            </span>

            <button
              onClick={() => setCurrentIndex((p) => Math.min(questions.length - 1, p + 1))}
              disabled={currentIndex === questions.length - 1}
              className="px-4 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold flex items-center gap-1.5 disabled:opacity-30 cursor-pointer"
            >
              <span>سوال بعدی</span>
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
