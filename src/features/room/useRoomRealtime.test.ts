import { roomTopic } from './useRoomRealtime';

jest.mock('@/lib/supabase', () => ({ supabase: null, ensureSession: async () => false }));

describe('roomTopic', () => {
  // 같은 이름이면 realtime-js가 아직 나가는 중인 옛 채널을 돌려줘서 구독이 안 된다
  it('같은 방이라도 부를 때마다 다른 채널 이름을 준다', () => {
    const a = roomTopic('r1');
    const b = roomTopic('r1');
    expect(a).not.toBe(b);
    expect(a.startsWith('room:r1:')).toBe(true);
  });
});
