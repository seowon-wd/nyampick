import { create } from 'zustand';
import type { Answers, Menu } from '@/types';
import type { RelaxStep } from './recommend';

export interface Pick {
  menu: Menu;
  /** AI 추천 이유 */
  reason?: string;
}

/** 결과 화면에 보여줄 마지막 추천 (메모리에만 보관). */
interface ResultSession {
  source: 'quiz' | 'ai' | null;
  answers: Answers;
  picks: Pick[];
  relaxed: RelaxStep[];
  setQuizResult: (answers: Answers, picks: Menu[], relaxed: RelaxStep[]) => void;
  setAiResult: (picks: Pick[]) => void;
}

export const useResultSession = create<ResultSession>()((set) => ({
  source: null,
  answers: {},
  picks: [],
  relaxed: [],
  setQuizResult: (answers, picks, relaxed) =>
    set({ source: 'quiz', answers, picks: picks.map((menu) => ({ menu })), relaxed }),
  setAiResult: (picks) => set({ source: 'ai', answers: {}, picks, relaxed: [] }),
}));
