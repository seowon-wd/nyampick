import { create } from 'zustand';
import type { Answers, Menu } from '@/types';
import type { RelaxStep } from './recommend';

/** 결과 화면에 보여줄 마지막 추천 (메모리에만 보관). */
interface ResultSession {
  answers: Answers;
  picks: Menu[];
  relaxed: RelaxStep[];
  setQuizResult: (answers: Answers, picks: Menu[], relaxed: RelaxStep[]) => void;
}

export const useResultSession = create<ResultSession>()((set) => ({
  answers: {},
  picks: [],
  relaxed: [],
  setQuizResult: (answers, picks, relaxed) => set({ answers, picks, relaxed }),
}));
