import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, DISPLAY_FONT, DottedLine, Screen, text } from '@/components/ui';
import { getMenu } from '@/data/menus';
import { usePrefsStore } from '@/features/prefs/store';

/** 분식집 메뉴판 한 줄: 이름 ······ 오른쪽 메모 */
function BoardLine({
  name,
  note,
  onPress,
  disabled,
}: {
  name: string;
  note: string;
  onPress?: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      accessibilityHint={note}
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [styles.line, pressed && { backgroundColor: colors.ticket }, disabled && { opacity: 0.35 }]}
    >
      <Text style={styles.lineName}>{name}</Text>
      <DottedLine style={styles.leader} />
      <Text style={styles.lineNote}>{note}</Text>
    </Pressable>
  );
}

export default function Home() {
  const lastEaten = usePrefsStore((s) => s.eaten[0]);
  const lastMenu = lastEaten ? getMenu(lastEaten.id) : undefined;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.rice }} edges={['top']}>
      <Screen>
        <View style={styles.hero}>
          <Text style={styles.wordmark}>오늘{'\n'}뭐먹냠?</Text>
          <Text style={text.sub}>
            {lastMenu
              ? `지난번엔 ${lastMenu.name}을(를) 드셨어요. 오늘은 다른 걸로 골라볼게요.`
              : '고르는 방법을 하나 정하면 메뉴는 금방 나와요.'}
          </Text>
        </View>

        <View style={styles.board}>
          <BoardLine name="질문으로 고르기" note="질문 5개" onPress={() => router.push('/quiz')} />
          <BoardLine name="AI에게 물어보기" note="한 줄이면 돼요" onPress={() => router.push('/ai')} />
          <BoardLine name="함께 고르기" note="곧 나와요" disabled />
        </View>
      </Screen>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  hero: { gap: 12, marginTop: 28, marginBottom: 20 },
  wordmark: { fontFamily: DISPLAY_FONT, fontSize: 56, lineHeight: 62, color: colors.laver },
  board: { borderTopWidth: 3, borderTopColor: colors.laver },
  line: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
    paddingVertical: 22,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  lineName: { fontFamily: DISPLAY_FONT, fontSize: 24, lineHeight: 30, color: colors.laver },
  leader: { flex: 1, marginBottom: 6 },
  lineNote: { fontSize: 14, color: colors.steam },
});
