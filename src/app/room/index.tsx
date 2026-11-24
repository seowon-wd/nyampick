import { router } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';
import { Button, Note, Screen, Section, text, TextField } from '@/components/ui';
import { usePrefsStore } from '@/features/prefs/store';
import { createRoom, ROOM_ERROR_TEXT, RoomError } from '@/features/room/api';

/** 함께 고르기 시작: 닉네임 + 방 만들기 / 코드로 참여 */
export default function RoomStart() {
  const savedNickname = usePrefsStore((s) => s.nickname);
  const setNickname = usePrefsStore((s) => s.setNickname);
  const [nickname, setNicknameInput] = useState(savedNickname);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const name = nickname.trim();
  const nameOk = name.length >= 1 && name.length <= 20;

  const create = async () => {
    setNickname(name);
    setBusy(true);
    setError(null);
    try {
      const newCode = await createRoom(name);
      router.replace(`/room/${newCode}`);
    } catch (e) {
      setError(ROOM_ERROR_TEXT[e instanceof RoomError ? e.code : 'unavailable']);
    } finally {
      setBusy(false);
    }
  };

  const join = () => {
    setNickname(name);
    router.push(`/room/${code}`);
  };

  return (
    <Screen>
      <Text style={text.sub}>방을 만들어 코드를 나누면, 다 같이 후보를 올리고 투표해서 정해요.</Text>

      <TextField label="닉네임" value={nickname} onChangeText={setNicknameInput} placeholder="예: 김냠냠" maxLength={20} />

      {error ? <Note>{error}</Note> : null}

      <Section title="방 만들기">
        <Button label="새 방 만들기" onPress={create} disabled={!nameOk || busy} />
      </Section>

      <Section title="코드로 참여하기">
        <TextField
          label="방 코드 6자리"
          value={code}
          onChangeText={(t) => setCode(t.replace(/[^0-9]/g, ''))}
          placeholder="123456"
          keyboardType="number-pad"
          maxLength={6}
        />
        <View>
          <Button label="참여하기" variant="quiet" onPress={join} disabled={!nameOk || code.length !== 6} />
        </View>
      </Section>
    </Screen>
  );
}
