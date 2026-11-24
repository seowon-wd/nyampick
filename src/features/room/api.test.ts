import { toRoomError } from './api';

jest.mock('@/lib/supabase', () => ({ supabase: null, ensureSession: async () => false }));

describe('toRoomError', () => {
  it.each([
    [{ message: 'room_not_found' }, 'room_not_found'],
    [{ message: 'P0001: not_host' }, 'not_host'],
    [{ message: 'no_candidates' }, 'no_candidates'],
    [{ message: 'bad_nickname' }, 'bad_nickname'],
    [{ code: '23505', message: 'duplicate key value' }, 'duplicate'],
    [{ message: 'Failed to fetch' }, 'unavailable'],
    [null, 'unavailable'],
  ])('toRoomError(%j) → %s', (input, code) => {
    expect(toRoomError(input).code).toBe(code);
  });
});
