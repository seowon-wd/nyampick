import type { EatenEntry } from '@/types';

// shortcut: 마감 시각 앞뒤 12시간 안의 같은 메뉴 기록을 이 방의 확정으로 본다(기기 시계 오차 허용), 방별로 정확히 구분해야 하면 기록에 roomId를 넣는다
const SKEW_MS = 12 * 60 * 60 * 1000;

/** 이 방 결과(menuId)를 이미 먹은 기록에 남겼는지. 방을 다시 열어도 두 번 기록하지 않게 한다. */
export function loggedForRoom(eaten: EatenEntry[], menuId: string, closedAt: number): boolean {
  return eaten.some((e) => e.id === menuId && e.at >= closedAt - SKEW_MS);
}
