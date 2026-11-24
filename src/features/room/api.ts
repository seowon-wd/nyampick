import type { SupabaseClient } from '@supabase/supabase-js';
import { ensureSession, supabase } from '@/lib/supabase';
import type { Candidate, Member, Room, RoomSnapshot, Vote } from './types';

export type RoomErrorCode = 'room_not_found' | 'not_host' | 'no_candidates' | 'bad_nickname' | 'duplicate' | 'unavailable';

export class RoomError extends Error {
  constructor(public code: RoomErrorCode) {
    super(code);
    this.name = 'RoomError';
  }
}

export const ROOM_ERROR_TEXT: Record<RoomErrorCode, string> = {
  room_not_found: '방을 찾을 수 없어요. 코드를 다시 확인해 주세요.',
  not_host: '방장만 마감할 수 있어요.',
  no_candidates: '후보를 하나 이상 올려 주세요.',
  bad_nickname: '닉네임은 1~20자로 적어 주세요.',
  duplicate: '이미 올라온 메뉴예요.',
  unavailable: '연결이 불안정해요. 잠시 후 다시 시도해 주세요.',
};

const SERVER_CODES = ['room_not_found', 'not_host', 'no_candidates', 'bad_nickname'] as const;

/** Supabase 오류를 화면용 코드로 바꾼다. 모르는 오류는 모두 연결 문제로 본다. */
export function toRoomError(e: { message?: string; code?: string } | null | undefined): RoomError {
  if (e?.code === '23505') return new RoomError('duplicate');
  const found = SERVER_CODES.find((c) => e?.message?.includes(c));
  return new RoomError(found ?? 'unavailable');
}

/** 로그인된 클라이언트. 설정이 없거나 익명 로그인이 안 되면 unavailable. */
async function client(): Promise<SupabaseClient> {
  if (!supabase || !(await ensureSession())) throw new RoomError('unavailable');
  return supabase;
}

/** { data, error } 결과를 풀어서 오류면 RoomError로 던진다. 오류가 없으면 data는 null이 아니다(insert만 null, 쓰지 않음). */
async function unwrap<T>(p: PromiseLike<{ data: T; error: { message?: string; code?: string } | null }>): Promise<NonNullable<T>> {
  const { data, error } = await p;
  if (error) throw toRoomError(error);
  return data as NonNullable<T>;
}

export async function createRoom(nickname: string): Promise<string> {
  return unwrap((await client()).rpc('create_room', { nickname }));
}

export async function joinRoom(code: string, nickname: string): Promise<string> {
  return unwrap((await client()).rpc('join_room', { code, nickname }));
}

export async function closeRoom(roomId: string): Promise<string> {
  return unwrap((await client()).rpc('close_room', { room_id: roomId }));
}

/** 이미 올라온 메뉴면 조용히 넘어간다 (다시 불러오면 목록에 보임). */
export async function addCandidate(roomId: string, menuId: string): Promise<void> {
  try {
    await unwrap((await client()).from('candidates').insert({ room_id: roomId, menu_id: menuId }));
  } catch (e) {
    if (!(e instanceof RoomError && e.code === 'duplicate')) throw e;
  }
}

/** 한 사람 한 표. 다시 누르면 표가 옮겨간다. */
export async function vote(roomId: string, candidateId: number): Promise<void> {
  await unwrap(
    (await client())
      .from('votes')
      .upsert({ room_id: roomId, candidate_id: candidateId, updated_at: new Date().toISOString() }, { onConflict: 'room_id,user_id' }),
  );
}

export async function fetchSnapshot(roomId: string): Promise<RoomSnapshot> {
  const c = await client();
  const [room, members, candidates, votes] = await Promise.all([
    unwrap(c.from('rooms').select('id, code, host_id, closed_at, winner_menu_id').eq('id', roomId).single<Room>()),
    unwrap(c.from('members').select('user_id, nickname').eq('room_id', roomId).returns<Member[]>()),
    unwrap(c.from('candidates').select('id, menu_id, created_at').eq('room_id', roomId).returns<Candidate[]>()),
    unwrap(c.from('votes').select('user_id, candidate_id').eq('room_id', roomId).returns<Vote[]>()),
  ]);
  return { room, members, candidates, votes };
}
