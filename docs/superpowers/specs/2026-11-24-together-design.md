# 2단계: 함께 고르기 설계

## 목적

여럿이 "뭐 먹지?"를 정할 때 쓰는 기능입니다. 방장이 방을 만들고, 참여자들이 내장 메뉴 중에서 후보를 올리고 투표합니다. 결과는 모두의 화면에 바로 반영되고, 방장이 마감하면 1등 메뉴로 결정됩니다.

성공 기준: 휴대폰 두 대에서 같은 방에 들어가, 한쪽이 후보를 추가하거나 투표하면 다른 쪽에 몇 초 안에 반영되고, 마감하면 양쪽에 같은 결과가 나온다.

## 목표 / 비목표

- 목표: 방 만들기(6자리 코드 + 공유 링크), 닉네임으로 참여, 후보 추가, 투표(재투표 가능), 실시간 반영, 방장 마감, 결과 표시
- 비목표: 방 만료·삭제, 참여자 내보내기, 후보 삭제, 투표 취소, 채팅, 방 목록, 푸시 알림
- 하면 안 되는 것: 방 참여자가 아닌 사람이 방 데이터를 읽거나 쓰는 것. 클라이언트가 결과(1등)를 정하는 것

## 제약

- 기존 구조와 CLAUDE.md 규칙을 따릅니다(Expo Router, Zustand, Supabase, React Query 없음, 순수 로직은 테스트).
- 후보는 **내장 메뉴 80개 중에서만** 고릅니다(사용자 결정). 자유 입력은 없습니다.
- 개발은 Expo Go로 합니다. `nyampick://` 링크는 직접 빌드한 앱에서만 열리므로 개발 중 테스트는 코드 입력이 기본입니다.
- `.env`(Supabase 설정)가 없으면 홈의 "함께 고르기"는 비활성 상태로 둡니다(1단계는 그대로 동작).
- 1단계는 끝난 상태입니다. AI 추천은 사용자 결정으로 범위에서 뺐고(커밋 `2381f67`), 질문형 추천과 개인화는 Expo Go에서 동작을 확인했습니다.
- DB는 연결된 Supabase 프로젝트(`xilrjqeabpjqqhdrwefn`)에 `supabase db push`로 바로 적용합니다. 이 앱 전용 개발 프로젝트라 기존 데이터가 없고(테스트용 익명 사용자 몇 명뿐), 로컬 Docker는 켜져 있지 않습니다. 익명 로그인은 이미 켜져 있습니다. (설계자 결정)
- 방장이 앱을 지우거나 기기를 바꾸면 그 방은 영영 마감되지 않습니다. 새 방을 만들면 되므로 받아들입니다(방장 위임·자동 마감은 비목표). (설계자 결정)

## 접근 방식

| 방식 | 장단점 | 결정 |
|------|--------|------|
| Realtime 구독 → 이벤트가 오면 스냅샷 다시 불러오기 | 화면이 항상 서버와 같음. 요청이 조금 더 많음 | **선택** (CLAUDE.md에 확정) |
| 몇 초마다 새로고침(폴링) | 가장 단순. "바로 반영"이 안 됨 | 제외 |
| 이벤트 내용으로 화면 데이터를 직접 수정 | 빠름. 이벤트가 빠지면 사람마다 화면이 달라짐 | 제외 |

## DB (`supabase/migrations/<timestamp>_together.sql`)

```
rooms      id uuid PK default gen_random_uuid()
           code text unique not null, check (code ~ '^[0-9]{6}$')
           host_id uuid not null              -- auth.uid()
           created_at timestamptz default now()
           closed_at timestamptz              -- null이면 진행 중
           winner_menu_id text                -- 마감 시 서버가 채움

members    room_id uuid → rooms on delete cascade, user_id uuid, nickname text (trim 후 1~20자)
           joined_at timestamptz default now()
           PK (room_id, user_id)

candidates id bigint identity PK, room_id uuid → rooms on delete cascade
           menu_id text not null, check (menu_id ~ '^m[0-9]{2,3}$')
           added_by uuid not null default auth.uid(), created_at timestamptz default now()
           unique (room_id, menu_id), unique (room_id, id)   -- votes 복합 FK용

votes      room_id uuid, user_id uuid default auth.uid(), candidate_id bigint
           updated_at timestamptz default now()
           PK (room_id, user_id)               -- 한 사람 한 표, 재투표는 upsert
           FK (room_id, candidate_id) → candidates(room_id, id)   -- 다른 방 후보에 투표 방지
```

- 방 코드: 숫자 6자리(휴대폰 숫자 키패드로 입력하기 쉬움). 전체 방에서 유일. `create_room`에서 무작위 생성 후 충돌하면 다시 시도.
  `shortcut: 코드 공간 100만 개를 닫힌 방도 계속 차지함, 방이 수십만 개 쌓이면 진행 중인 방만 유일하게 바꾼다`
- `menu_id`는 서버가 메뉴 목록을 모르므로 형식만 검사합니다. 앱은 모르는 ID의 후보를 화면에서 건너뜁니다.

### 권한 (RLS 켬)

- `is_member(room_id uuid) returns boolean`: security definer, `search_path` 고정. `members`에 `(room_id, auth.uid())`가 있는지 확인합니다.
- `room_open(room_id uuid) returns boolean`: security definer. `closed_at is null`인지 확인합니다.

| 테이블 | select | insert | update | delete |
|--------|--------|--------|--------|--------|
| rooms | `is_member(id)` | 없음(RPC) | 없음(RPC) | 없음 |
| members | `is_member(room_id)` | 없음(RPC) | 없음 | 없음 |
| candidates | `is_member(room_id)` | `is_member(room_id) and room_open(room_id) and added_by = auth.uid()` | 없음 | 없음 |
| votes | `is_member(room_id)` | `user_id = auth.uid() and is_member(room_id) and room_open(room_id)` | 같은 조건 (using + with check) | 없음 |

- 익명 사용자도 `authenticated` 역할입니다. 정책 대상은 `authenticated`이고, `anon`에는 아무 권한도 주지 않습니다.

### RPC (모두 security definer, `search_path` 고정, `authenticated`만 실행 가능)

- `create_room(nickname text) returns text`: 방을 만들고 방장을 멤버로 넣은 뒤 코드를 돌려줍니다.
- `join_room(code text, nickname text) returns uuid`: 코드로 방을 찾아 멤버로 넣고(이미 멤버면 닉네임만 갱신) 방 ID를 돌려줍니다. 마감된 방도 참여할 수 있습니다(결과 보기용). 없는 코드면 `room_not_found` 오류.
- `close_room(room_id uuid) returns text`: 방장만 실행할 수 있습니다(`not_host` 오류). 이미 닫혔으면 기존 `winner_menu_id`를 그대로 돌려줍니다(멱등). 아니면 후보별 득표 수 내림차순, 같으면 `created_at`·`id` 오름차순으로 1등을 정해 `closed_at`, `winner_menu_id`를 채웁니다. 후보가 없으면 `no_candidates` 오류. 표가 0개여도 후보가 있으면 먼저 추가된 후보가 이깁니다. 동시에 두 번 불려도 같은 결과가 나오게 `select … for update`로 방 행을 잠급니다.
- 닉네임 검증(trim 후 1~20자)은 RPC 안에서 하고, 어기면 `bad_nickname` 오류를 냅니다.

### Realtime

- `supabase_realtime` publication에 `rooms`, `members`, `candidates`, `votes`를 추가합니다.

## 앱

### 파일

```
src/app/room/index.tsx       # 방 만들기 / 코드로 참여 (닉네임 입력 포함)
src/app/room/[code].tsx      # 방 화면 (진행 중: 후보·투표 / 마감: 결과)
src/features/room/api.ts     # createRoom, joinRoom, closeRoom, addCandidate, vote, fetchSnapshot
src/features/room/useRoomRealtime.ts  # 구독 → 스냅샷 → 이벤트마다 다시 불러오기, 떠나면 removeChannel
src/features/room/tally.ts   # 득표 집계·정렬 (순수 함수) + tally.test.ts
```

- 딥링크 `nyampick://room/<code>`는 Expo Router 파일 경로(`room/[code]`)와 바로 맞습니다.
- 마지막 닉네임은 prefs 저장소(AsyncStorage)에 `nickname`으로 기억해 다음에 미리 채웁니다.

### 흐름

1. 홈 "함께 고르기" → `/room`.
2. `/room`: 닉네임 입력(필수) + [방 만들기] 또는 [코드 6자리 입력 → 참여].
   - 방 만들기: `create_room` → `/room/<code>`로 이동.
   - 참여: `/room/<code>`로 이동(참여 처리는 방 화면에서).
3. `/room/<code>` 진입 시 `ensureSession()` → 저장된 닉네임이 있으면 `join_room(code, nickname)`을 바로 부르고, 없으면 닉네임 입력란을 먼저 보여줍니다. `join_room`은 멱등이라 다시 들어올 때마다 불러도 됩니다.
4. 방 화면(진행 중)
   - 위: 방 코드(크게), [공유하기] 버튼. 공유는 React Native `Share.share()`로 코드와 `Linking.createURL('room/<code>')` 링크를 보냅니다(Expo Go에서는 `exp://…` 링크가 되어 같은 네트워크에서 열림, 빌드 앱에서는 `nyampick://room/<code>`).
   - 참여자 수와 투표한 사람 수("4명 중 3명 투표").
   - 후보 목록: 득표 많은 순(동점이면 먼저 추가된 순). 각 줄에 메뉴 이름, 득표 수, 내 표 표시. 누르면 그 후보에 투표(upsert).
   - [후보 추가]: 메뉴 이름 검색 → 이미 후보인 메뉴는 표시만 하고 막음 → 누르면 추가.
   - 방장에게만 [투표 마감] 버튼. 후보가 없으면 비활성.
5. 마감 후(`closed_at`이 있으면): 1등 메뉴를 기존 `MenuCard`(식권)로 보여주고, "이걸로 먹을게요"를 누르면 내 기기 먹은 기록(`logEaten`)에 남깁니다. 득표 결과 목록도 아래에 보여줍니다. 방장이 아닌 사람도 Realtime으로 같은 화면으로 넘어갑니다.

### 오류 처리

- 없는 코드: "방을 찾을 수 없어요" + 코드 다시 입력.
- 네트워크 실패: 안내 문구 + [다시 시도]. 투표·추가 실패 시 화면은 다음 스냅샷으로 원래 상태로 돌아옵니다.
- 이미 있는 후보(unique 위반): 무시하고 다시 불러옵니다.
- 마감된 방에 쓰기 시도(RLS 거부): 다시 불러오면 결과 화면으로 바뀝니다.

## 테스트

- `tally.test.ts`: 득표 집계, 동점 시 먼저 추가된 후보 우선, 표 0개, 모르는 메뉴 ID 건너뛰기.
- DB: 마이그레이션을 적용한 뒤 익명 사용자 두 명으로 스크립트 확인 (멤버가 아니면 못 읽음, 마감 후 투표 거부, 방장 아닌 사람 마감 거부, `close_room` 두 번 호출해도 같은 결과, 다른 방 후보에 투표 거부).
- 기기: 휴대폰 두 대(또는 휴대폰 + 시뮬레이터)로 성공 기준 확인.

## 빌더에게 맡기는 것

- 화면 세부 배치와 문구(기존 `ui.tsx` 컴포넌트와 분식집 메뉴판 스타일 유지).
- 후보 추가 UI를 같은 화면 안에 펼칠지 별도 화면으로 띄울지.
- 이벤트가 몰릴 때 다시 불러오기를 묶을지(짧은 디바운스).
- DB 확인 스크립트의 형태(셸 + curl 또는 Node).
