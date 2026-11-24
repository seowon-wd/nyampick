# CLAUDE.md

이 파일은 이 저장소에서 작업하는 Claude Code에게 프로젝트 맥락을 알려줍니다.

## 프로젝트 개요

**오늘 뭐먹냠** (홈 화면 표시 이름: 뭐먹냠, slug·딥링크 scheme: `nyampick`): 끼니마다 "뭐 먹지?"를 고민하는 사람들을 위한 모바일 앱입니다.
질문형 추천과 AI 추천으로 메뉴를 골라주고, 여럿이 함께 투표해서 정할 수도 있습니다.

- 현재 상태: 1단계 코드 대부분 작성됨, Expo Go 동작 확인됨 (Supabase 미연결)
- UI 언어: 한국어만

## 기술 스택

| 영역 | 선택 |
|------|------|
| 앱 | Expo (React Native) + TypeScript |
| 백엔드 | Supabase (Postgres, Realtime, 익명 로그인, Edge Functions) |
| AI | Claude API. **Supabase Edge Function에서만 호출** |
| 기기 저장 | AsyncStorage |

## 개발 단계

### 1단계: 혼자 쓰기 (MVP)

1. **질문형 추천**
   - "국물이 당겨요?", "매운 거?", "밥/면/빵?", "가격대?" 같은 질문 3~5개에 답합니다.
   - 내장된 메뉴 목록에서 조건에 맞는 메뉴를 추천합니다.
2. **AI 추천**
   - "비 오고 피곤해"처럼 기분이나 상황을 자유롭게 입력합니다.
   - Edge Function을 거쳐 Claude가 메뉴 2~3개를 이유와 함께 추천합니다.
   - 네트워크나 API 오류가 나면 질문형 추천으로 자연스럽게 넘어갑니다.
3. **개인화**
   - 즐겨찾기한 메뉴는 추천 가중치를 높입니다.
   - 싫어하는 메뉴는 추천 결과에서 아예 뺍니다. AI 추천에서도 빼야 하므로 프롬프트에 함께 보냅니다.
   - "이걸로 먹을게"로 확정한 메뉴는 기록하고, 최근 N일 동안 추천에서 뺍니다. 기본값은 **2일**이고 설정에서 바꿀 수 있습니다.

### 2단계: 함께 고르기

- 방장이 방을 만들면 **6자리 방 코드와 공유 링크**가 나옵니다(딥링크).
- 참여자는 Supabase 익명 로그인을 하고 닉네임만 입력하면 됩니다.
- 참여자가 후보 메뉴를 추가하고 투표하면 Supabase Realtime으로 결과가 바로 반영됩니다.
- 방장이 투표를 마감하면 최다 득표 메뉴로 결정됩니다.

## 데이터 원칙

- **메뉴 데이터**: 메뉴 **80개**를 앱에 내장합니다. 카테고리는 한식, 중식, 일식, 양식, 분식, 기타입니다.
  - 메뉴마다 붙는 태그: 국물 여부, 매운맛 정도, 주식 종류(밥/면/빵 등), 가격대, 어울리는 식사 시간(아침/점심/저녁)
- **개인 기록**(즐겨찾기, 싫어하는 메뉴, 먹은 기록): 기기에만 저장합니다(AsyncStorage). 서버 동기화는 하지 않습니다.
- **함께 고르기 데이터**(방, 참여자, 후보, 투표): Supabase에 저장합니다. RLS로 방 참여자만 읽고 쓸 수 있게 합니다.

## 보안 규칙

- **Claude API 키를 앱 코드나 `EXPO_PUBLIC_*` 환경변수에 절대 넣지 않습니다.** 키는 Supabase Edge Function의 secret으로만 관리합니다.
- 앱에 넣어도 되는 키는 Supabase anon key뿐이며, 데이터 보호는 RLS 정책으로 합니다.
- `.env` 같은 비밀 파일은 커밋하지 않습니다.

## 작업 방식

- 단계별로 진행합니다. 1단계가 동작하는 것을 확인한 다음 2단계를 시작합니다.
- 추천 로직(필터링, 가중치, 최근 메뉴 제외)은 UI와 분리된 순수 함수로 작성하고 테스트를 붙입니다.
- 코드 주석과 커밋 메시지는 한국어로 작성해도 됩니다.

## 아키텍처 (확정: 실용 균형안)

```
src/
  app/                      # Expo Router 화면 (이 폴더의 파일은 모두 라우트)
    _layout.tsx             # Stack + 앱 시작 시 익명 로그인
    (tabs)/_layout.tsx      # 탭: 홈 / 내 메뉴 / 설정
    (tabs)/index.tsx        # 홈: 질문형 / AI / 함께 고르기
    (tabs)/favorites.tsx    # 즐겨찾기·싫어하는 메뉴 관리
    (tabs)/settings.tsx     # 제외 일수, 먹은 기록
    quiz.tsx  ai.tsx  result.tsx
    room/...                # 2단계
  data/menus.json           # 메뉴 80개 단일 원본 (ID는 불변)
  data/menus.ts             # MENUS, getMenu()
  types.ts
  features/recommend/       # filter.ts, recommend.ts (순수 함수 + *.test.ts), questions.ts, session.ts(결과 화면 상태)
  features/ai/api.ts        # Edge Function 호출, 8초 타임아웃, 실패 시 AiUnavailableError → /quiz
  features/prefs/store.ts   # Zustand + persist(AsyncStorage)
  features/room/            # 2단계: api, useRoomRealtime, tally(+테스트)
  lib/supabase.ts           # 클라이언트(env 없으면 null), ensureSession()
  components/               # ui.tsx(공통 컴포넌트·색상), MenuCard.tsx
scripts/gen-edge-menus.mjs  # menus.json → supabase/functions/_shared/menus.ts
supabase/
  functions/recommend/      # Claude 호출 (claude-haiku-5-5 기본, CLAUDE_MODEL secret으로 교체)
  functions/_shared/menus.ts  # 자동 생성 (직접 수정 금지)
  migrations/               # 2단계
```

## 명령어

```bash
npm start                 # 개발 서버 (Expo Go로 QR 스캔)
npm test                  # Jest (테스트 파일은 *.test.ts)
npm run typecheck         # tsc --noEmit
npm run gen:menus         # menus.json 수정 후 반드시 실행 (동기화 테스트가 검사함)
npx expo install <pkg>    # 패키지 추가는 항상 이걸로 (SDK 호환 버전)
supabase functions deploy recommend
```

- Expo SDK 58입니다. Expo API는 기억에 의존하지 말고 https://docs.expo.dev/versions/v58.0.0/ 를 확인합니다.
- Supabase 키가 없어도(.env 미설정) 앱은 동작하며, AI 추천만 질문형으로 대체됩니다.

- **의존성**: expo, expo-router, expo-linking, AsyncStorage, zustand, @supabase/supabase-js, react-native-url-polyfill, zod, jest-expo. React Query는 쓰지 않습니다.
- **익명 로그인**: 1단계부터 앱을 시작할 때 Supabase 익명 로그인을 합니다. `recommend` Edge Function은 JWT를 요구합니다.
- **AI 추천**:
  - 클라이언트는 싫어하는 메뉴와 최근 메뉴를 함께 보내고, 서버는 메뉴 목록 안에서만 고르게 합니다.
  - 서버는 응답을 zod로 검증하고, 모르는 ID와 제외 대상 ID를 버립니다.
  - 입력은 200자 이하로 제한합니다.
- **추천 알고리즘**:
  1. 싫어하는 메뉴와 최근 N일 안에 먹은 메뉴를 뺍니다.
  2. 답변으로 점수를 매기고, 즐겨찾기 메뉴는 점수를 1.5배 합니다.
  3. 상위 K개 중에서 가중 무작위로 뽑습니다. `now`와 `rng`를 주입받아 테스트할 수 있게 합니다.
  4. 결과가 부족하면 조건을 가격, 식사 시간, 매운맛 순으로 완화하고, 그다음 최근 메뉴 제외를 풉니다. 싫어하는 메뉴는 끝까지 풀지 않습니다.
- **2단계 DB**:
  - 테이블: `rooms`, `members`, `candidates`, `votes`. `votes`의 PK는 `(room_id, user_id)`이고, 재투표는 upsert로 처리합니다.
  - 권한: RLS를 적용하고, 멤버 확인은 `is_member()` security definer 함수로 합니다.
  - 쓰기: `create_room`, `join_room`, `close_room` RPC로만 합니다. `close_room`은 서버에서 집계하고, 여러 번 호출해도 결과가 같으며, 동점이면 먼저 추가된 후보가 이깁니다.
  - Realtime: 먼저 구독한 다음 스냅샷을 불러옵니다. 이벤트가 오면 다시 불러오고, 화면을 벗어나면 `removeChannel`을 호출합니다.
- **딥링크**: `nyampick://room/<code>`
