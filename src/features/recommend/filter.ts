import type { AnswerKey, Answers, EatenEntry, MealTime, Menu, Prefs } from '@/types';

export const DAY_MS = 24 * 60 * 60 * 1000;

/** excludeDays 안에 "이걸로 먹을게"로 확정한 메뉴 ID. */
export function recentlyEatenIds(eaten: EatenEntry[], excludeDays: number, now: number): Set<string> {
  const since = now - excludeDays * DAY_MS;
  return new Set(eaten.filter((e) => e.at > since).map((e) => e.id));
}

/** 답변 하나에 대해 메뉴가 맞는지. 답이 없으면(상관없음) 항상 true. */
export function matchesAnswer(menu: Menu, key: AnswerKey, answers: Answers): boolean {
  switch (key) {
    case 'meal':
      return answers.meal === undefined || menu.meals.includes(answers.meal);
    case 'soup':
      return answers.soup === undefined || menu.soup === answers.soup;
    case 'spicy':
      return answers.spicy === undefined || (answers.spicy ? menu.spice >= 2 : menu.spice <= 1);
    case 'staple':
      return answers.staple === undefined || menu.staple === answers.staple;
    case 'price':
      return answers.price === undefined || menu.price <= answers.price;
  }
}

/** 싫어하는 메뉴와 최근 먹은 메뉴를 뺀, 지금 추천해도 되는 메뉴 (AI 후보 겸 방어 필터). */
export function allowedMenus(menus: Menu[], prefs: Prefs, now: number): Menu[] {
  const disliked = new Set(prefs.disliked);
  const recent = recentlyEatenIds(prefs.eaten, prefs.excludeDays, now);
  return menus.filter((m) => !disliked.has(m.id) && !recent.has(m.id));
}

/** 현재 시각 기준 기본 식사 시간. */
export function mealTimeAt(date: Date): MealTime {
  const h = date.getHours();
  if (h >= 4 && h < 10) return 'breakfast';
  if (h >= 10 && h < 16) return 'lunch';
  return 'dinner';
}
