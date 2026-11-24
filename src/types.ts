export type Category = '한식' | '중식' | '일식' | '양식' | '분식' | '기타';
export type Staple = 'rice' | 'noodle' | 'bread' | 'etc';
export type MealTime = 'breakfast' | 'lunch' | 'dinner';
/** 0: 안 매움 ~ 3: 아주 매움 */
export type Spice = 0 | 1 | 2 | 3;
/** 1: 1만원 미만, 2: 1~2만원, 3: 2만원 이상 (1인 기준) */
export type PriceLevel = 1 | 2 | 3;

export interface Menu {
  /** 불변 ID. 즐겨찾기·기록·방 데이터가 이 값을 참조하므로 절대 바꾸지 않는다. */
  id: string;
  name: string;
  category: Category;
  soup: boolean;
  spice: Spice;
  staple: Staple;
  price: PriceLevel;
  meals: MealTime[];
}

/** 질문형 추천 답변. 값이 없으면 "상관없음". */
export interface Answers {
  meal?: MealTime;
  soup?: boolean;
  /** true: 매운 것(2 이상), false: 안 매운 것(1 이하) */
  spicy?: boolean;
  staple?: Staple;
  /** 예산 상한 */
  price?: PriceLevel;
}
export type AnswerKey = keyof Answers;

export interface EatenEntry {
  id: string;
  /** epoch ms */
  at: number;
}

export interface Prefs {
  favorites: string[];
  disliked: string[];
  eaten: EatenEntry[];
  excludeDays: number;
}
