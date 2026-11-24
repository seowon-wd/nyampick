import type { AnswerKey, Answers, Menu, Prefs } from '@/types';
import { matchesAnswer, recentlyEatenIds } from './filter';

/** 완화 가능한 조건. 'recent'는 최근 먹은 메뉴 제외. 싫어하는 메뉴 제외는 절대 완화하지 않는다. */
export type RelaxStep = AnswerKey | 'recent';

/** 후보가 부족할 때 풀어주는 순서 (앞일수록 먼저 포기). */
export const RELAX_ORDER: readonly RelaxStep[] = ['price', 'meal', 'spicy', 'recent', 'staple', 'soup'];

const ANSWER_KEYS: readonly AnswerKey[] = ['meal', 'soup', 'spicy', 'staple', 'price'];

export const FAVORITE_WEIGHT = 1.5;
export const DEFAULT_COUNT = 3;

export interface RecommendInput {
  menus: Menu[];
  answers: Answers;
  prefs: Prefs;
  now: number;
  count?: number;
  /** [0, 1) 난수. 테스트에서 결정적으로 주입한다. */
  rng?: () => number;
}

export interface RecommendResult {
  picks: Menu[];
  /** 결과를 채우려고 완화한 조건 (UI 안내용). */
  relaxed: RelaxStep[];
}

export function recommend({
  menus,
  answers,
  prefs,
  now,
  count = DEFAULT_COUNT,
  rng = Math.random,
}: RecommendInput): RecommendResult {
  const disliked = new Set(prefs.disliked);
  const recent = recentlyEatenIds(prefs.eaten, prefs.excludeDays, now);
  const base = menus.filter((m) => !disliked.has(m.id));

  const relaxed: RelaxStep[] = [];
  const candidates = () =>
    base.filter(
      (m) =>
        (relaxed.includes('recent') || !recent.has(m.id)) &&
        ANSWER_KEYS.every((k) => relaxed.includes(k) || matchesAnswer(m, k, answers)),
    );

  let pool = candidates();
  for (const step of RELAX_ORDER) {
    if (pool.length >= count) break;
    const applies = step === 'recent' ? recent.size > 0 : answers[step] !== undefined;
    if (!applies) continue;
    relaxed.push(step);
    pool = candidates();
  }

  const favorites = new Set(prefs.favorites);
  const weights = pool.map((m) => (favorites.has(m.id) ? FAVORITE_WEIGHT : 1));
  return { picks: weightedSample(pool, weights, count, rng), relaxed };
}

/** 가중치 비례 비복원 추출. */
export function weightedSample<T>(items: T[], weights: number[], count: number, rng: () => number): T[] {
  const pool = items.map((item, i) => ({ item, w: weights[i] }));
  const out: T[] = [];
  while (out.length < count && pool.length > 0) {
    const total = pool.reduce((s, p) => s + p.w, 0);
    let r = rng() * total;
    let idx = pool.findIndex((p) => (r -= p.w) < 0);
    if (idx === -1) idx = pool.length - 1; // 부동소수 오차 대비
    out.push(pool[idx].item);
    pool.splice(idx, 1);
  }
  return out;
}
