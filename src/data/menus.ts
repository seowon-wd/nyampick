import type { Menu } from '@/types';
import raw from './menus.json';

/** 앱에 내장된 메뉴 80개. 원본은 menus.json (Edge Function용 목록도 여기서 생성). */
export const MENUS = raw as Menu[];

const byId = new Map(MENUS.map((m) => [m.id, m]));

export function getMenu(id: string): Menu | undefined {
  return byId.get(id);
}
