import { tally } from './tally';
import type { Candidate, Vote } from './types';

const c = (id: number, menu_id: string, created_at: string): Candidate => ({ id, menu_id, created_at });
const v = (user_id: string, candidate_id: number): Vote => ({ user_id, candidate_id });

describe('tally', () => {
  it('득표 많은 순으로 정렬한다', () => {
    const rows = tally(
      [c(1, 'm01', '2026-01-01T00:00:00Z'), c(2, 'm02', '2026-01-01T00:01:00Z')],
      [v('a', 2), v('b', 2), v('c', 1)],
    );
    expect(rows.map((r) => [r.menu.id, r.votes])).toEqual([
      ['m02', 2],
      ['m01', 1],
    ]);
  });

  it('동점이면 먼저 추가된 후보가 앞선다', () => {
    const rows = tally(
      [c(2, 'm02', '2026-01-01T00:01:00Z'), c(1, 'm01', '2026-01-01T00:00:00Z')],
      [v('a', 1), v('b', 2)],
    );
    expect(rows.map((r) => r.menu.id)).toEqual(['m01', 'm02']);
  });

  it('표가 없으면 모두 0표, 추가된 순', () => {
    const rows = tally([c(1, 'm03', '2026-01-01T00:00:00Z'), c(2, 'm01', '2026-01-01T00:01:00Z')], []);
    expect(rows.map((r) => [r.menu.id, r.votes])).toEqual([
      ['m03', 0],
      ['m01', 0],
    ]);
  });

  it('모르는 메뉴 ID 후보는 건너뛴다', () => {
    expect(tally([c(1, 'm999', '2026-01-01T00:00:00Z')], [v('a', 1)])).toEqual([]);
  });
});
