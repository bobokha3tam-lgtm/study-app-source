import { MathTopicInfo, RecommendedBookSource, ComprehensiveSubjectResource } from '../types';
import { 
  MATH_STREAM_CURRICULUM, 
  MATH_STREAM_MASTER_BOOKS, 
  MATH_STREAM_DEFAULT_PROFILE
} from './mathCurriculum';
import { 
  EXPERIMENTAL_STREAM_CURRICULUM, 
  EXPERIMENTAL_STREAM_MASTER_BOOKS, 
  EXPERIMENTAL_STREAM_DEFAULT_PROFILE 
} from './experimentalCurriculum';
import { 
  HUMANITIES_STREAM_CURRICULUM, 
  HUMANITIES_STREAM_MASTER_BOOKS,
  HUMANITIES_STREAM_DEFAULT_PROFILE
} from './humanitiesCurriculum';

export type StreamType = 'experimental' | 'mathematics' | 'humanities';

export interface StreamOption {
  id: StreamType;
  name: string;
  shortName: string;
  badge: string;
  description: string;
  color: string;
  primarySubjects: string[];
}

export const STREAM_OPTIONS: StreamOption[] = [
  {
    id: 'experimental',
    name: 'علوم تجربی',
    shortName: 'تجربی',
    badge: 'پزشکی و پیراپزشکی و داروسازی',
    description: 'زیست‌شناسی، شیمی تجربی، فیزیک تجربی، ریاضیات تجربی و زمین‌شناسی',
    color: 'emerald',
    primarySubjects: ['زیست‌شناسی', 'شیمی تجربی', 'فیزیک تجربی', 'ریاضیات تجربی', 'زمین‌شناسی']
  },
  {
    id: 'mathematics',
    name: 'ریاضی و فیزیک',
    shortName: 'ریاضی',
    badge: 'مهندسی و علوم پایه',
    description: 'حسابان و پایه، هندسه، گسسته و آمار، فیزیک ریاضی و شیمی',
    color: 'sky',
    primarySubjects: ['حسابان و ریاضیات پایه', 'هندسه ۱، ۲ و ۳', 'گسسته و آمار و احتمال', 'فیزیک رشته ریاضی', 'شیمی کنکور']
  },
  {
    id: 'humanities',
    name: 'ادبیات و علوم انسانی',
    shortName: 'انسانی',
    badge: 'حقوق، مدیریت و فرهنگیان',
    description: 'علوم و فنون، عربی تخصصی، ریاضی انسانی، فلسفه و منطق، جامعه‌شناسی، اقتصاد، روانشناسی',
    color: 'amber',
    primarySubjects: ['علوم و فنون ادبی', 'عربی تخصصی انسانی', 'ریاضی و آمار انسانی', 'فلسفه و منطق', 'جامعه‌شناسی', 'اقتصاد', 'روانشناسی']
  }
];

export function normalizeStream(fieldOfStudy?: string): StreamType {
  const f = (fieldOfStudy || '').toLowerCase();
  if (f.includes('تجربی') || f.includes('زیست') || f.includes('experimental') || f.includes('پزشکی')) {
    return 'experimental';
  }
  if (f.includes('انسانی') || f.includes('ادبیات') || f.includes('humanities') || f.includes('حقوق')) {
    return 'humanities';
  }
  return 'mathematics';
}

export function getCurriculumByField(fieldOfStudy?: string): MathTopicInfo[] {
  const stream = normalizeStream(fieldOfStudy);
  switch (stream) {
    case 'experimental':
      return EXPERIMENTAL_STREAM_CURRICULUM;
    case 'humanities':
      return HUMANITIES_STREAM_CURRICULUM;
    case 'mathematics':
    default:
      return MATH_STREAM_CURRICULUM;
  }
}

export function getMasterBooksByField(fieldOfStudy?: string): ComprehensiveSubjectResource[] {
  const stream = normalizeStream(fieldOfStudy);
  switch (stream) {
    case 'experimental':
      return EXPERIMENTAL_STREAM_MASTER_BOOKS;
    case 'humanities':
      return HUMANITIES_STREAM_MASTER_BOOKS;
    case 'mathematics':
    default:
      return MATH_STREAM_MASTER_BOOKS;
  }
}

export function getSuggestedSubjectsForStream(fieldOfStudy?: string): string[] {
  const stream = normalizeStream(fieldOfStudy);
  if (stream === 'experimental') {
    return ['زیست‌شناسی', 'شیمی تجربی', 'فیزیک تجربی', 'ریاضیات تجربی', 'زمین‌شناسی', 'فارسی عمومی', 'عربی عمومی', 'دینی', 'زبان انگلیسی'];
  }
  if (stream === 'humanities') {
    return ['علوم و فنون ادبی', 'عربی تخصصی', 'ریاضی و آمار انسانی', 'فلسفه و منطق', 'جامعه‌شناسی', 'اقتصاد', 'روانشناسی', 'تاریخ و جغرافیا'];
  }
  return ['حسابان و ریاضی پایه', 'هندسه تحلیلی', 'گسسته و آمار', 'فیزیک ریاضی', 'شیمی کنکور', 'فارسی عمومی', 'عربی عمومی', 'دینی', 'زبان انگلیسی'];
}

export function getDefaultProfileByField(fieldOfStudy?: string) {
  const stream = normalizeStream(fieldOfStudy);
  switch (stream) {
    case 'experimental':
      return EXPERIMENTAL_STREAM_DEFAULT_PROFILE;
    case 'humanities':
      return HUMANITIES_STREAM_DEFAULT_PROFILE;
    case 'mathematics':
    default:
      return MATH_STREAM_DEFAULT_PROFILE;
  }
}

export {
  MATH_STREAM_CURRICULUM,
  MATH_STREAM_MASTER_BOOKS,
  MATH_STREAM_DEFAULT_PROFILE,
  EXPERIMENTAL_STREAM_CURRICULUM,
  EXPERIMENTAL_STREAM_MASTER_BOOKS,
  EXPERIMENTAL_STREAM_DEFAULT_PROFILE,
  HUMANITIES_STREAM_CURRICULUM,
  HUMANITIES_STREAM_MASTER_BOOKS,
  HUMANITIES_STREAM_DEFAULT_PROFILE,
};
