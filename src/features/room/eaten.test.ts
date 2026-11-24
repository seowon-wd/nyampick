import { loggedForRoom } from './eaten';

const HOUR = 60 * 60 * 1000;
const CLOSED = Date.UTC(2026, 10, 25, 12);

describe('loggedForRoom', () => {
  it('마감 뒤에 같은 메뉴를 기록했으면 이미 고른 것', () => {
    expect(loggedForRoom([{ id: 'm01', at: CLOSED + 5 * 60 * 1000 }], 'm01', CLOSED)).toBe(true);
  });

  it('다른 메뉴 기록은 상관없다', () => {
    expect(loggedForRoom([{ id: 'm02', at: CLOSED + HOUR }], 'm01', CLOSED)).toBe(false);
  });

  it('기기 시계가 조금 느려 마감 직전으로 찍혀도 이미 고른 것', () => {
    expect(loggedForRoom([{ id: 'm01', at: CLOSED - HOUR }], 'm01', CLOSED)).toBe(true);
  });

  it('하루 전에 먹은 같은 메뉴는 이 방 기록이 아니다', () => {
    expect(loggedForRoom([{ id: 'm01', at: CLOSED - 24 * HOUR }], 'm01', CLOSED)).toBe(false);
  });
});
