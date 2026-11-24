import * as Linking from 'expo-linking';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Platform, Pressable, Share, StyleSheet, Text, View } from 'react-native';
import { MenuCard } from '@/components/MenuCard';
import { Button, colors, DISPLAY_FONT, Note, Screen, Section, text, TextField, TextLink } from '@/components/ui';
import { getMenu, MENUS } from '@/data/menus';
import { usePrefsStore } from '@/features/prefs/store';
import { addCandidate, closeRoom, joinRoom, ROOM_ERROR_TEXT, RoomError, vote } from '@/features/room/api';
import { shareOnWeb } from '@/features/room/share';
import { tally, type TallyRow } from '@/features/room/tally';
import type { RoomSnapshot } from '@/features/room/types';
import { useRoomRealtime } from '@/features/room/useRoomRealtime';
import { supabase } from '@/lib/supabase';
import { goHome } from '@/lib/nav';

const errorCode = (e: unknown) => (e instanceof RoomError ? e.code : 'unavailable');

export default function RoomScreen() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const nickname = usePrefsStore((s) => s.nickname);
  const setNickname = usePrefsStore((s) => s.setNickname);
  const [nicknameInput, setNicknameInput] = useState('');
  const [roomId, setRoomId] = useState<string | null>(null);
  const [myId, setMyId] = useState<string | null>(null);
  const [joinError, setJoinError] = useState<RoomError['code'] | null>(null);
  const [joinTry, setJoinTry] = useState(0);
  const { snapshot, error, reload, retry } = useRoomRealtime(roomId);

  // 닉네임이 있으면 바로 참여 (이미 멤버여도 join_room은 멱등)
  useEffect(() => {
    if (!nickname || roomId) return;
    let alive = true;
    setJoinError(null);
    joinRoom(code, nickname)
      .then(async (id) => {
        const { data } = (await supabase?.auth.getSession()) ?? { data: { session: null } };
        if (!alive) return;
        setMyId(data.session?.user.id ?? null);
        setRoomId(id);
      })
      .catch((e) => alive && setJoinError(errorCode(e)));
    return () => {
      alive = false;
    };
  }, [code, nickname, roomId, joinTry]);

  if (!nickname) {
    const name = nicknameInput.trim();
    return (
      <Screen>
        <Text style={text.title}>방 {code}에 참여해요</Text>
        <TextField label="닉네임" value={nicknameInput} onChangeText={setNicknameInput} placeholder="예: 김냠냠" maxLength={20} />
        <Button label="참여하기" onPress={() => setNickname(name)} disabled={name.length === 0} />
      </Screen>
    );
  }

  if (joinError) {
    return (
      <Screen>
        <Note>{ROOM_ERROR_TEXT[joinError]}</Note>
        {joinError === 'room_not_found' ? (
          <Button label="코드 다시 입력" onPress={() => router.replace('/room')} />
        ) : joinError === 'bad_nickname' ? (
          <Button label="닉네임 다시 입력" onPress={() => setNickname('')} />
        ) : (
          <Button label="다시 시도" onPress={() => setJoinTry((n) => n + 1)} />
        )}
      </Screen>
    );
  }

  if (!snapshot) {
    return (
      <Screen>
        {error ? (
          <>
            <Note>{ROOM_ERROR_TEXT[error.code]}</Note>
            <Button label="다시 시도" onPress={retry} />
          </>
        ) : (
          <Text style={text.sub}>방에 들어가는 중…</Text>
        )}
      </Screen>
    );
  }

  return snapshot.room.closed_at ? (
    <ClosedRoom snapshot={snapshot} />
  ) : (
    <OpenRoom snapshot={snapshot} myId={myId} error={error?.code ?? null} reload={reload} retry={retry} />
  );
}

function OpenRoom({
  snapshot,
  myId,
  error,
  reload,
  retry,
}: {
  snapshot: RoomSnapshot;
  myId: string | null;
  error: RoomError['code'] | null;
  reload: () => void;
  retry: () => void;
}) {
  const { room, members, candidates, votes } = snapshot;
  const [actionError, setActionError] = useState<RoomError['code'] | null>(null);
  const [shareResult, setShareResult] = useState<'copied' | 'manual' | null>(null);
  const [adding, setAdding] = useState(false);
  const [query, setQuery] = useState('');
  const rows = useMemo(() => tally(candidates, votes), [candidates, votes]);
  const myVote = votes.find((v) => v.user_id === myId)?.candidate_id;
  const isHost = myId !== null && room.host_id === myId;
  const taken = useMemo(() => new Set(candidates.map((c) => c.menu_id)), [candidates]);
  const matches = useMemo(() => MENUS.filter((m) => m.name.includes(query.trim())), [query]);

  // 실패해도 다시 불러오면 화면이 서버 상태로 돌아온다 (마감됐으면 결과 화면으로)
  const run = async (action: () => Promise<unknown>) => {
    setActionError(null);
    try {
      await action();
    } catch (e) {
      setActionError(errorCode(e));
    }
    reload();
  };

  const link = Linking.createURL(`room/${room.code}`);
  const message = `뭐먹냠 방 코드: ${room.code}\n${link}`;
  const share = async () => {
    if (Platform.OS !== 'web') {
      await Share.share({ message });
      return;
    }
    const result = await shareOnWeb(message);
    setShareResult(result === 'shared' ? null : result);
  };

  return (
    <Screen>
      <View style={styles.codeBox}>
        <Text style={text.sub}>방 코드</Text>
        <Text style={styles.code} accessibilityLabel={`방 코드 ${room.code.split('').join(' ')}`}>
          {room.code}
        </Text>
        <TextLink label="코드 공유하기" onPress={share} />
        {shareResult === 'copied' ? <Text style={text.sub}>링크를 복사했어요. 친구에게 붙여 넣어 보내 주세요.</Text> : null}
        {shareResult === 'manual' ? (
          <Text style={text.sub} selectable>
            이 링크를 복사해서 보내 주세요: {link}
          </Text>
        ) : null}
      </View>

      <Text style={text.sub}>
        {members.length}명 중 {votes.length}명 투표했어요
      </Text>

      {error || actionError ? (
        <View style={{ gap: 8 }}>
          <Note>{ROOM_ERROR_TEXT[actionError ?? error!]}</Note>
          <TextLink label="다시 불러오기" onPress={retry} />
        </View>
      ) : null}

      <Section title="후보">
        {rows.length === 0 ? <Text style={text.sub}>아직 후보가 없어요. 먹고 싶은 메뉴를 올려 주세요.</Text> : null}
        {rows.map((r) => (
          <CandidateRow
            key={r.candidate.id}
            row={r}
            mine={myVote === r.candidate.id}
            onPress={() => run(() => vote(room.id, r.candidate.id))}
          />
        ))}
        <Button label={adding ? '후보 추가 닫기' : '후보 추가'} variant="quiet" onPress={() => setAdding(!adding)} />
      </Section>

      {adding ? (
        <Section title="메뉴 찾기">
          <TextField label="메뉴 이름" value={query} onChangeText={setQuery} placeholder="예: 김치" />
          {matches.map((m) => {
            const already = taken.has(m.id);
            return (
              <Pressable
                key={m.id}
                accessibilityRole="button"
                accessibilityState={{ disabled: already }}
                disabled={already}
                onPress={() => run(() => addCandidate(room.id, m.id))}
                style={({ pressed }) => [styles.menuRow, pressed && { opacity: 0.6 }]}
              >
                <Text style={[text.body, already && { color: colors.steam }]}>{m.name}</Text>
                <Text style={text.sub}>{already ? '올라옴' : '올리기'}</Text>
              </Pressable>
            );
          })}
        </Section>
      ) : null}

      {isHost ? (
        <Button label="투표 마감" onPress={() => run(() => closeRoom(room.id))} disabled={rows.length === 0} />
      ) : (
        <Text style={text.sub}>방장이 투표를 마감하면 결과가 나와요.</Text>
      )}
    </Screen>
  );
}

function CandidateRow({ row, mine, onPress }: { row: TallyRow; mine: boolean; onPress?: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: mine, disabled: !onPress }}
      accessibilityLabel={`${row.menu.name}, ${row.votes}표${mine ? ', 내 표' : ''}`}
      disabled={!onPress}
      onPress={onPress}
      style={({ pressed }) => [styles.candidate, mine && { backgroundColor: colors.danmuji }, pressed && { opacity: 0.7 }]}
    >
      <Text style={[text.body, { flex: 1, fontWeight: '600' }]}>{row.menu.name}</Text>
      {mine ? <Text style={text.sub}>내 표</Text> : null}
      <Text style={styles.votes}>{row.votes}표</Text>
    </Pressable>
  );
}

function ClosedRoom({ snapshot }: { snapshot: RoomSnapshot }) {
  const logEaten = usePrefsStore((s) => s.logEaten);
  const [chosen, setChosen] = useState(false);
  const winner = snapshot.room.winner_menu_id ? getMenu(snapshot.room.winner_menu_id) : undefined;
  const rows = tally(snapshot.candidates, snapshot.votes);

  return (
    <Screen>
      <Text style={text.title}>오늘은 이걸로 정했어요</Text>
      {winner ? (
        <MenuCard
          menu={winner}
          chosen={chosen}
          onChoose={
            chosen
              ? undefined
              : () => {
                  logEaten(winner.id);
                  setChosen(true);
                }
          }
        />
      ) : (
        <Note>결과 메뉴를 찾을 수 없어요. 앱을 업데이트해 주세요.</Note>
      )}
      <Section title="투표 결과">
        {rows.map((r) => (
          <CandidateRow key={r.candidate.id} row={r} mine={false} />
        ))}
      </Section>
      <Button label="처음으로" variant="quiet" onPress={goHome} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  codeBox: { alignItems: 'center', gap: 4, paddingVertical: 8 },
  code: { fontFamily: DISPLAY_FONT, fontSize: 48, lineHeight: 56, letterSpacing: 6, color: colors.laver },
  candidate: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1.5,
    borderColor: colors.laver,
    borderRadius: 4,
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: colors.white,
  },
  votes: { fontFamily: DISPLAY_FONT, fontSize: 20, color: colors.laver, minWidth: 40, textAlign: 'right' },
  menuRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
});
