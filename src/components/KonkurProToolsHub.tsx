import React, { useState } from 'react';
import { 
  AlertTriangle, 
  Timer, 
  Grid, 
  Sparkles, 
  FileText, 
  Zap, 
  Flame, 
  ChevronLeft,
  Award
} from 'lucide-react';
import { 
  StudentProfile, 
  ExamBudget, 
  ExamErrorLog, 
  FocusTestSession, 
  TopicMasteryRecord, 
  TrapQuestion, 
  FinalExamItem,
  WeeklySchedule
} from '../types';
import { ExamPostMortemView } from './ExamPostMortemView';
import { FocusTestSpeedView } from './FocusTestSpeedView';
import { TopicMasteryHeatmapView } from './TopicMasteryHeatmapView';
import { KonkurTrapQuizzerView } from './KonkurTrapQuizzerView';
import { FinalExamBalanceView } from './FinalExamBalanceView';
import { MazeExamIntegratorView } from './MazeExamIntegratorView';
import { SmartErrorCheatSheetView } from './SmartErrorCheatSheetView';
import { BookOpen } from 'lucide-react';

export type ProToolTab = 'postmortem' | 'cheat_sheet' | 'focus_speed' | 'heatmap' | 'trap_quizzer' | 'final_exam' | 'maze_connector';

interface KonkurProToolsHubProps {
  profile: StudentProfile;
  examBudget: ExamBudget;
  schedule: WeeklySchedule;
  errors: ExamErrorLog[];
  onUpdateErrors: (errors: ExamErrorLog[]) => void;
  focusSessions: FocusTestSession[];
  onSaveFocusSession: (session: FocusTestSession) => void;
  masteryRecords: TopicMasteryRecord[];
  onUpdateMasteryRecord: (record: TopicMasteryRecord) => void;
  trapQuestions: TrapQuestion[];
  finalExamItems: FinalExamItem[];
  onUpdateFinalExamItems: (items: FinalExamItem[]) => void;
  onApplyRemedialBlocks: (blocks: any[]) => void;
  onInjectDescriptiveBlock: (subject: string, topic: string) => void;
  defaultSubTab?: ProToolTab;
}

export function KonkurProToolsHub({
  profile,
  examBudget,
  schedule,
  errors,
  onUpdateErrors,
  focusSessions,
  onSaveFocusSession,
  masteryRecords,
  onUpdateMasteryRecord,
  trapQuestions,
  finalExamItems,
  onUpdateFinalExamItems,
  onApplyRemedialBlocks,
  onInjectDescriptiveBlock,
  defaultSubTab = 'postmortem',
}: KonkurProToolsHubProps) {
  const [activeSubTab, setActiveSubTab] = useState<ProToolTab>(defaultSubTab);

  const subTabs = [
    {
      id: 'postmortem' as ProToolTab,
      label: 'دفترچه تحلیل آزمون',
      badge: `${errors.length} خطا`,
      icon: AlertTriangle,
      color: 'text-rose-600',
    },
    {
      id: 'cheat_sheet' as ProToolTab,
      label: 'دفترچه مرور ۵ دقیقه‌ای قبل آزمون',
      badge: 'مرور طلایی',
      icon: BookOpen,
      color: 'text-amber-600',
    },
    {
      id: 'focus_speed' as ProToolTab,
      label: 'اتاق تست‌زنی سرعتی',
      badge: 'ضربدر-منها',
      icon: Timer,
      color: 'text-emerald-600',
    },
    {
      id: 'heatmap' as ProToolTab,
      label: 'نقشه حرارتی سرفصل‌ها',
      badge: 'رادار تسلط',
      icon: Grid,
      color: 'text-blue-600',
    },
    {
      id: 'trap_quizzer' as ProToolTab,
      label: 'تله‌یاب هوشمند کنکور',
      badge: 'AI Trap',
      icon: Sparkles,
      color: 'text-amber-600',
    },
    {
      id: 'final_exam' as ProToolTab,
      label: 'تعادل نهایی ۵۰٪ و تشریحی',
      badge: 'ضریب قطعی',
      icon: FileText,
      color: 'text-violet-600',
    },
    {
      id: 'maze_connector' as ProToolTab,
      label: 'اتصال به آزمون‌های ماز و تست مشابه',
      badge: 'هوش مصنوعی ماز',
      icon: Zap,
      color: 'text-emerald-600',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Sub-Navigation Bar */}
      <div className="bg-white border border-stone-200 rounded-2xl p-2.5 shadow-xs flex items-center gap-1.5 overflow-x-auto">
        {subTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeSubTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id)}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 whitespace-nowrap transition cursor-pointer ${
                isActive
                  ? 'bg-stone-900 text-white shadow-xs'
                  : 'text-stone-600 hover:bg-stone-100 hover:text-stone-900'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-white' : tab.color}`} />
              <span>{tab.label}</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded font-medium ${
                  isActive ? 'bg-white/20 text-white' : 'bg-stone-100 text-stone-500'
                }`}
              >
                {tab.badge}
              </span>
            </button>
          );
        })}
      </div>

      {/* Render selected view */}
      {activeSubTab === 'postmortem' && (
        <ExamPostMortemView
          profile={profile}
          errors={errors}
          onUpdateErrors={onUpdateErrors}
          onApplyRemedialBlocks={onApplyRemedialBlocks}
        />
      )}

      {activeSubTab === 'cheat_sheet' && (
        <SmartErrorCheatSheetView
          profile={profile}
          errors={errors}
        />
      )}

      {activeSubTab === 'focus_speed' && (
        <FocusTestSpeedView
          sessions={focusSessions}
          onSaveSession={onSaveFocusSession}
        />
      )}

      {activeSubTab === 'heatmap' && (
        <TopicMasteryHeatmapView
          masteryRecords={masteryRecords}
          onUpdateRecord={onUpdateMasteryRecord}
          profile={profile}
        />
      )}

      {activeSubTab === 'trap_quizzer' && (
        <KonkurTrapQuizzerView
          examBudget={examBudget}
          initialQuestions={trapQuestions}
        />
      )}

      {activeSubTab === 'final_exam' && (
        <FinalExamBalanceView
          finalExamItems={finalExamItems}
          onUpdateItems={onUpdateFinalExamItems}
          onInjectDescriptiveBlock={onInjectDescriptiveBlock}
        />
      )}

      {activeSubTab === 'maze_connector' && (
        <MazeExamIntegratorView
          profile={profile}
          onAddErrorsToPostMortem={(newErrors) => onUpdateErrors([...errors, ...newErrors])}
          onAddRemedialBlockToSchedule={onInjectDescriptiveBlock}
        />
      )}
    </div>
  );
}
