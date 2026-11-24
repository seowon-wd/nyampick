import type { AnswerKey, Answers } from '@/types';
import type { RelaxStep } from './recommend';

export type Question = {
  [K in AnswerKey]: {
    key: K;
    title: string;
    /** value가 undefined면 "상관없음" */
    options: { label: string; value: Answers[K] }[];
  };
}[AnswerKey];

export const QUESTIONS: Question[] = [
  {
    key: 'meal',
    title: '언제 먹을 건가요?',
    options: [
      { label: '아침', value: 'breakfast' },
      { label: '점심', value: 'lunch' },
      { label: '저녁', value: 'dinner' },
    ],
  },
  {
    key: 'soup',
    title: '국물이 당겨요?',
    options: [
      { label: '국물 있는 거', value: true },
      { label: '국물 없는 거', value: false },
      { label: '상관없어요', value: undefined },
    ],
  },
  {
    key: 'spicy',
    title: '매운 거 어때요?',
    options: [
      { label: '매콤하게', value: true },
      { label: '안 맵게', value: false },
      { label: '상관없어요', value: undefined },
    ],
  },
  {
    key: 'staple',
    title: '뭐가 좋아요?',
    options: [
      { label: '밥', value: 'rice' },
      { label: '면', value: 'noodle' },
      { label: '빵', value: 'bread' },
      { label: '상관없어요', value: undefined },
    ],
  },
  {
    key: 'price',
    title: '예산은요? (1인)',
    options: [
      { label: '1만원 안쪽', value: 1 },
      { label: '2만원 안쪽', value: 2 },
      { label: '가격 상관없이', value: 3 },
    ],
  },
];

export const RELAX_LABELS: Record<RelaxStep, string> = {
  price: '예산',
  meal: '식사 시간',
  spicy: '매운 정도',
  recent: '최근 먹은 메뉴 제외',
  staple: '밥/면/빵',
  soup: '국물',
};
