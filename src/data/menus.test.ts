import { MENUS } from './menus';

describe('내장 메뉴 데이터', () => {
  it('80개이고 ID와 이름이 중복되지 않는다', () => {
    expect(MENUS).toHaveLength(80);
    expect(new Set(MENUS.map((m) => m.id)).size).toBe(80);
    expect(new Set(MENUS.map((m) => m.name)).size).toBe(80);
  });

  it('태그 값이 유효하다', () => {
    for (const m of MENUS) {
      expect(['한식', '중식', '일식', '양식', '분식', '기타']).toContain(m.category);
      expect(['rice', 'noodle', 'bread', 'etc']).toContain(m.staple);
      expect([0, 1, 2, 3]).toContain(m.spice);
      expect([1, 2, 3]).toContain(m.price);
      expect(typeof m.soup).toBe('boolean');
      expect(m.meals.length).toBeGreaterThan(0);
      for (const meal of m.meals) expect(['breakfast', 'lunch', 'dinner']).toContain(meal);
    }
  });
});
