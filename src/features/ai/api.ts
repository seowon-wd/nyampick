import { z } from 'zod';
import { getMenu } from '@/data/menus';
import type { Pick } from '@/features/recommend/session';
import { ensureSession, supabase } from '@/lib/supabase';
import type { MealTime, Menu } from '@/types';

export const MOOD_MAX_LENGTH = 200;
const TIMEOUT_MS = 8000;

export interface AiRequest {
  mood: string;
  mealTime: MealTime;
  disliked: string[];
  recent: string[];
  favorites: string[];
}

const ResponseSchema = z.object({
  picks: z.array(z.object({ menuId: z.string(), reason: z.string() })),
});

/** AI 추천을 쓸 수 없을 때 던진다. 화면은 이걸 받으면 질문형으로 넘어간다. */
export class AiUnavailableError extends Error {
  constructor(reason: string) {
    super(reason);
    this.name = 'AiUnavailableError';
  }
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new AiUnavailableError('timeout')), ms);
    promise.then(
      (v) => {
        clearTimeout(timer);
        resolve(v);
      },
      (e) => {
        clearTimeout(timer);
        reject(e);
      },
    );
  });
}

/**
 * Edge Function `recommend`를 불러 AI 추천을 받는다.
 * `allowed`(싫어하는/최근 메뉴를 뺀 목록)에 없는 결과는 한 번 더 걸러낸다.
 */
export async function fetchAiPicks(req: AiRequest, allowed: Menu[]): Promise<Pick[]> {
  if (!supabase) throw new AiUnavailableError('not_configured');
  if (!(await ensureSession())) throw new AiUnavailableError('no_session');

  const { data, error } = await withTimeout(
    supabase.functions.invoke('recommend', { body: { ...req, mood: req.mood.slice(0, MOOD_MAX_LENGTH) } }),
    TIMEOUT_MS,
  );
  if (error) throw new AiUnavailableError(`invoke: ${error.message}`);

  const parsed = ResponseSchema.safeParse(data);
  if (!parsed.success) throw new AiUnavailableError('bad_response');

  const allowedIds = new Set(allowed.map((m) => m.id));
  const seen = new Set<string>();
  const picks: Pick[] = [];
  for (const { menuId, reason } of parsed.data.picks) {
    const menu = getMenu(menuId);
    if (!menu || !allowedIds.has(menuId) || seen.has(menuId)) continue;
    seen.add(menuId);
    picks.push({ menu, reason });
  }
  if (picks.length === 0) throw new AiUnavailableError('empty');
  return picks.slice(0, 3);
}
