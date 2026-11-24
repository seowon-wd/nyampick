import type { Menu, Prefs } from '@/types';
import { DAY_MS, matchesAnswer, recentlyEatenIds } from './filter';
import { recommend, weightedSample } from './recommend';

const NOW = Date.UTC(2026, 10, 24, 12);

function menu(id: string, over: Partial<Menu> = {}): Menu {
  return {
    id,
    name: id,
    category: '한식',
    soup: false,
    spice: 0,
    staple: 'rice',
    price: 1,
    meals: ['breakfast', 'lunch', 'dinner'],
    ...over,
  };
}

const prefs = (over: Partial<Prefs> = {}): Prefs => ({
  favorites: [],
  disliked: [],
  eaten: [],
  excludeDays: 2,
  ...over,
});

/** 항상 첫 후보를 고르는 rng */
const first = () => 0;

describe('recentlyEatenIds', () => {
  it('excludeDays 안에 먹은 메뉴만 포함한다', () => {
    const eaten = [
      { id: 'a', at: NOW - 1 * DAY_MS },
      { id: 'b', at: NOW - 2 * DAY_MS + 1 },
      { id: 'c', at: NOW - 2 * DAY_MS },
      { id: 'd', at: NOW - 5 * DAY_MS },
    ];
    expect([...recentlyEatenIds(eaten, 2, NOW)].sort()).toEqual(['a', 'b']);
  });

  it('excludeDays가 0이면 아무것도 제외하지 않는다', () => {
    expect(recentlyEatenIds([{ id: 'a', at: NOW - 1000 }], 0, NOW).size).toBe(0);
  });
});

describe('matchesAnswer', () => {
  it('매운 것: spice 2 이상 / 안 매운 것: 1 이하', () => {
    expect(matchesAnswer(menu('x', { spice: 2 }), 'spicy', { spicy: true })).toBe(true);
    expect(matchesAnswer(menu('x', { spice: 1 }), 'spicy', { spicy: true })).toBe(false);
    expect(matchesAnswer(menu('x', { spice: 1 }), 'spicy', { spicy: false })).toBe(true);
  });

  it('예산은 상한이다', () => {
    expect(matchesAnswer(menu('x', { price: 1 }), 'price', { price: 2 })).toBe(true);
    expect(matchesAnswer(menu('x', { price: 3 }), 'price', { price: 2 })).toBe(false);
  });

  it('답이 없으면 항상 맞는다', () => {
    expect(matchesAnswer(menu('x', { soup: true }), 'soup', {})).toBe(true);
  });
});

describe('recommend', () => {
  it('조건에 맞는 메뉴만 추천하고 완화하지 않는다', () => {
    const menus = [
      menu('soup1', { soup: true }),
      menu('soup2', { soup: true }),
      menu('soup3', { soup: true }),
      menu('dry', { soup: false }),
    ];
    const r = recommend({ menus, answers: { soup: true }, prefs: prefs(), now: NOW, rng: first });
    expect(r.picks.map((m) => m.id).sort()).toEqual(['soup1', 'soup2', 'soup3']);
    expect(r.relaxed).toEqual([]);
  });

  it('싫어하는 메뉴는 어떤 경우에도 추천하지 않는다', () => {
    const menus = [menu('a'), menu('b')];
    const r = recommend({ menus, answers: {}, prefs: prefs({ disliked: ['a'] }), now: NOW });
    expect(r.picks.map((m) => m.id)).toEqual(['b']);
  });

  it('최근 2일 안에 먹은 메뉴는 빼고, 그보다 오래된 건 다시 추천한다', () => {
    const menus = [menu('a'), menu('b'), menu('c'), menu('d')];
    const p = prefs({
      eaten: [
        { id: 'a', at: NOW - DAY_MS },
        { id: 'b', at: NOW - 3 * DAY_MS },
      ],
    });
    const r = recommend({ menus, answers: {}, prefs: p, now: NOW, rng: first });
    expect(r.picks.map((m) => m.id).sort()).toEqual(['b', 'c', 'd']);
  });

  it('후보가 부족하면 예산부터 완화하고 무엇을 완화했는지 알려준다', () => {
    const menus = [
      menu('cheap', { soup: true, price: 1 }),
      menu('mid', { soup: true, price: 2 }),
      menu('pricey', { soup: true, price: 3 }),
    ];
    const r = recommend({ menus, answers: { soup: true, price: 1 }, prefs: prefs(), now: NOW });
    expect(r.relaxed).toEqual(['price']);
    expect(r.picks).toHaveLength(3);
  });

  it('답하지 않은 조건은 완화 목록에 넣지 않는다', () => {
    const menus = [menu('a', { soup: true }), menu('b', { soup: false })];
    const r = recommend({ menus, answers: { soup: true }, prefs: prefs(), now: NOW, count: 2 });
    expect(r.relaxed).toEqual(['soup']);
  });

  it('최근 메뉴 제외는 식사 조건들보다 나중에 완화한다', () => {
    const menus = [menu('a'), menu('b')];
    const p = prefs({ eaten: [{ id: 'a', at: NOW - DAY_MS }] });
    const r = recommend({ menus, answers: { price: 1 }, prefs: p, now: NOW, count: 2 });
    expect(r.relaxed).toEqual(['price', 'recent']);
    expect(r.picks).toHaveLength(2);
  });

  it('즐겨찾기 메뉴가 더 자주 뽑힌다', () => {
    const menus = [menu('fav'), menu('other')];
    const p = prefs({ favorites: ['fav'] });
    // 가중치 fav 1.5 / other 1 → rng 0.59 * 2.5 = 1.475 < 1.5 이므로 fav
    const r = recommend({ menus, answers: {}, prefs: p, now: NOW, count: 1, rng: () => 0.59 });
    expect(r.picks[0].id).toBe('fav');
  });
});

describe('weightedSample', () => {
  it('중복 없이 count개를 뽑는다', () => {
    const items = ['a', 'b', 'c', 'd'];
    const out = weightedSample(items, [1, 1, 1, 1], 3, Math.random);
    expect(new Set(out).size).toBe(3);
  });

  it('후보가 count보다 적으면 있는 만큼만 돌려준다', () => {
    expect(weightedSample(['a'], [1], 3, Math.random)).toEqual(['a']);
  });
});
