import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { DAY_MS } from '@/features/recommend/filter';
import type { Prefs } from '@/types';

/** 먹은 기록은 제외 기간 계산에만 쓰므로 이보다 오래된 건 버린다. */
const EATEN_RETENTION_DAYS = 30;
export const DEFAULT_EXCLUDE_DAYS = 2;
export const MAX_EXCLUDE_DAYS = 14;

interface PrefsActions {
  toggleFavorite: (id: string) => void;
  /** 싫어요로 바꾸면 즐겨찾기에서 빠진다 (그 반대도). */
  toggleDisliked: (id: string) => void;
  logEaten: (id: string, now?: number) => void;
  removeEaten: (at: number) => void;
  clearEaten: () => void;
  setExcludeDays: (days: number) => void;
}

const toggle = (list: string[], id: string) =>
  list.includes(id) ? list.filter((x) => x !== id) : [...list, id];

export const usePrefsStore = create<Prefs & PrefsActions>()(
  persist(
    (set) => ({
      favorites: [],
      disliked: [],
      eaten: [],
      excludeDays: DEFAULT_EXCLUDE_DAYS,

      toggleFavorite: (id) =>
        set((s) => ({ favorites: toggle(s.favorites, id), disliked: s.disliked.filter((x) => x !== id) })),
      toggleDisliked: (id) =>
        set((s) => ({ disliked: toggle(s.disliked, id), favorites: s.favorites.filter((x) => x !== id) })),
      logEaten: (id, now = Date.now()) =>
        set((s) => ({
          eaten: [{ id, at: now }, ...s.eaten.filter((e) => now - e.at < EATEN_RETENTION_DAYS * DAY_MS)],
        })),
      removeEaten: (at) => set((s) => ({ eaten: s.eaten.filter((e) => e.at !== at) })),
      clearEaten: () => set({ eaten: [] }),
      setExcludeDays: (days) =>
        set({ excludeDays: Math.max(0, Math.min(MAX_EXCLUDE_DAYS, Math.round(days))) }),
    }),
    {
      name: 'prefs',
      version: 1,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: ({ favorites, disliked, eaten, excludeDays }) => ({ favorites, disliked, eaten, excludeDays }),
    },
  ),
);

/** 추천 함수에 넘길 현재 개인 설정 스냅샷. */
export function getPrefs(): Prefs {
  const { favorites, disliked, eaten, excludeDays } = usePrefsStore.getState();
  return { favorites, disliked, eaten, excludeDays };
}
