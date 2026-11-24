// 원격 DB의 함께 고르기 권한·RPC 확인. 실행: npm run check:db
// 실행할 때마다 익명 사용자 3명과 방이 DB에 남는다.
import assert from 'node:assert/strict';
import { createClient } from '@supabase/supabase-js';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
assert(url && key, '.env에 EXPO_PUBLIC_SUPABASE_URL / _PUBLISHABLE_KEY가 필요합니다');

async function user() {
  const c = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await c.auth.signInAnonymously();
  if (error) throw error;
  return { c, id: data.user.id };
}

/** 성공해야 하는 호출: 오류면 던지고 data를 돌려준다. */
async function ok(label, p) {
  const { data, error } = await p;
  if (error) throw new Error(`${label}: ${error.message}`);
  return data;
}

/** 실패해야 하는 호출: 오류 메시지(또는 코드)에 expected가 들어 있어야 한다. */
async function fails(label, p, expected) {
  const { error } = await p;
  assert(error, `${label}: 실패해야 하는데 성공함`);
  if (expected) assert(`${error.code} ${error.message}`.includes(expected), `${label}: ${error.code} ${error.message}`);
}

const [A, B, C] = await Promise.all([user(), user(), user()]);

// 1. 닉네임 검증
await fails('공백 닉네임', A.c.rpc('create_room', { nickname: '  ' }), 'bad_nickname');
await fails('21자 닉네임', A.c.rpc('create_room', { nickname: '가'.repeat(21) }), 'bad_nickname');

// 2. 방 만들기
const code = await ok('create_room', A.c.rpc('create_room', { nickname: '방장' }));
assert.match(code, /^[0-9]{6}$/);

// 3. 참여는 멱등
const roomId = await ok('join 1', B.c.rpc('join_room', { code, nickname: '참여자' }));
const roomId2 = await ok('join 2', B.c.rpc('join_room', { code, nickname: '참여자2' }));
assert.equal(roomId, roomId2);
const members = await ok('members', B.c.from('members').select('user_id, nickname').eq('room_id', roomId));
assert.equal(members.length, 2);
assert.equal(members.find((m) => m.user_id === B.id).nickname, '참여자2');

// 4. 외부인은 못 읽음, 없는 코드는 room_not_found
assert.equal((await ok('C rooms', C.c.from('rooms').select('id').eq('id', roomId))).length, 0);
assert.equal((await ok('C candidates', C.c.from('candidates').select('id').eq('room_id', roomId))).length, 0);
await fails('없는 코드', C.c.rpc('join_room', { code: 'abcdef', nickname: '외부인' }), 'room_not_found');
await fails('외부인 후보 추가', C.c.from('candidates').insert({ room_id: roomId, menu_id: 'm03' }));

// 5. 후보 추가, 중복은 23505
const [c1] = await ok('A m01', A.c.from('candidates').insert({ room_id: roomId, menu_id: 'm01' }).select('id'));
const [c2] = await ok('B m02', B.c.from('candidates').insert({ room_id: roomId, menu_id: 'm02' }).select('id'));
await fails('중복 후보', B.c.from('candidates').insert({ room_id: roomId, menu_id: 'm01' }), '23505');
// 동점 순서(created_at)를 클라이언트가 조작하지 못한다
await fails('created_at 조작', B.c.from('candidates').insert({ room_id: roomId, menu_id: 'm04', created_at: '2000-01-01T00:00:00Z' }));

// 6. 다른 방 후보에 투표 불가
const otherCode = await ok('B create', B.c.rpc('create_room', { nickname: '방장B' }));
const otherId = await ok('A join other', A.c.rpc('join_room', { code: otherCode, nickname: '방장' }));
const [oc] = await ok('B other cand', B.c.from('candidates').insert({ room_id: otherId, menu_id: 'm05' }).select('id'));
await fails('다른 방 후보 투표', A.c.from('votes').upsert({ room_id: roomId, candidate_id: oc.id }, { onConflict: 'room_id,user_id' }));

// 7. 투표와 재투표
const vote = (u, cid) => u.c.from('votes').upsert({ room_id: roomId, candidate_id: cid }, { onConflict: 'room_id,user_id' });
await ok('A vote', vote(A, c2.id));
await ok('B vote', vote(B, c2.id));
await ok('B revote', vote(B, c1.id));
const votes = await ok('votes', A.c.from('votes').select('user_id, candidate_id').eq('room_id', roomId));
assert.equal(votes.length, 2);

// 8. 마감: 방장만, 멱등, 1:1 동점이면 먼저 추가된 m01
await fails('B 마감', B.c.rpc('close_room', { room_id: roomId }), 'not_host');
assert.equal(await ok('close 1', A.c.rpc('close_room', { room_id: roomId })), 'm01');
assert.equal(await ok('close 2', A.c.rpc('close_room', { room_id: roomId })), 'm01');

// 9. 마감 후 쓰기 거부
await fails('마감 후 투표', vote(B, c2.id), '42501');
await fails('마감 후 후보', B.c.from('candidates').insert({ room_id: roomId, menu_id: 'm07' }), '42501');

// 10. 후보 없는 방은 마감 불가
const emptyCode = await ok('C create', C.c.rpc('create_room', { nickname: '빈방' }));
const emptyId = await ok('C join own', C.c.rpc('join_room', { code: emptyCode, nickname: '빈방' }));
await fails('빈 방 마감', C.c.rpc('close_room', { room_id: emptyId }), 'no_candidates');

// 11. 로그인 안 한 요청(anon)은 RPC·테이블 모두 거부
const anon = createClient(url, key, { auth: { persistSession: false } });
await fails('anon create_room', anon.rpc('create_room', { nickname: '익명' }));
await fails('anon rooms', anon.from('rooms').select('id'));

console.log('OK');
