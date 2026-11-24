import { getMenu } from '@/data/menus';
import type { Menu } from '@/types';
import type { Candidate, Vote } from './types';

export interface TallyRow {
  candidate: Candidate;
  menu: Menu;
  votes: number;
}

/** 후보별 득표 수. 서버 close_room과 같은 순서: 득표 내림차순 → 먼저 추가된 순. 모르는 메뉴는 건너뛴다. */
export function tally(candidates: Candidate[], votes: Vote[]): TallyRow[] {
  const counts = new Map<number, number>();
  for (const v of votes) counts.set(v.candidate_id, (counts.get(v.candidate_id) ?? 0) + 1);

  const rows: TallyRow[] = [];
  for (const candidate of candidates) {
    const menu = getMenu(candidate.menu_id);
    if (menu) rows.push({ candidate, menu, votes: counts.get(candidate.id) ?? 0 });
  }
  return rows.sort(
    (a, b) =>
      b.votes - a.votes ||
      Date.parse(a.candidate.created_at) - Date.parse(b.candidate.created_at) ||
      a.candidate.id - b.candidate.id,
  );
}
