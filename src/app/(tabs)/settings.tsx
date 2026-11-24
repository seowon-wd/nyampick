import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Button, colors, DISPLAY_FONT, Screen, Section, text, TextLink } from '@/components/ui';
import { getMenu } from '@/data/menus';
import { MAX_EXCLUDE_DAYS, usePrefsStore } from '@/features/prefs/store';

function formatDate(at: number) {
  const d = new Date(at);
  return `${d.getMonth() + 1}월 ${d.getDate()}일 ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function StepButton({ label, a11y, onPress, disabled }: { label: string; a11y: string; onPress: () => void; disabled: boolean }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={a11y}
      accessibilityState={{ disabled }}
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [styles.stepBtn, pressed && { backgroundColor: colors.danmuji }, disabled && { opacity: 0.3 }]}
    >
      <Text style={styles.stepText}>{label}</Text>
    </Pressable>
  );
}

export default function Settings() {
  const excludeDays = usePrefsStore((s) => s.excludeDays);
  const setExcludeDays = usePrefsStore((s) => s.setExcludeDays);
  const eaten = usePrefsStore((s) => s.eaten);
  const removeEaten = usePrefsStore((s) => s.removeEaten);
  const clearEaten = usePrefsStore((s) => s.clearEaten);
  const [confirmClear, setConfirmClear] = useState(false);

  return (
    <Screen>
      <Section title="최근 먹은 메뉴 빼기">
        <Text style={text.sub}>"이걸로 먹을게요"를 누른 메뉴는 이 기간 동안 추천하지 않아요.</Text>
        <View style={styles.stepper}>
          <StepButton label="−" a11y="하루 줄이기" onPress={() => setExcludeDays(excludeDays - 1)} disabled={excludeDays <= 0} />
          <Text style={styles.days} accessibilityLiveRegion="polite">
            {excludeDays === 0 ? '빼지 않음' : `${excludeDays}일`}
          </Text>
          <StepButton
            label="+"
            a11y="하루 늘리기"
            onPress={() => setExcludeDays(excludeDays + 1)}
            disabled={excludeDays >= MAX_EXCLUDE_DAYS}
          />
        </View>
      </Section>

      <Section title="먹은 기록">
        {eaten.length === 0 ? (
          <Text style={text.sub}>추천 결과에서 "이걸로 먹을게요"를 누르면 여기에 남아요.</Text>
        ) : (
          eaten.map((e) => {
            const menu = getMenu(e.id);
            return (
              <View key={e.at} style={styles.logRow}>
                <Text style={[text.body, { flex: 1 }]}>{menu ? menu.name : '알 수 없는 메뉴'}</Text>
                <Text style={text.sub}>{formatDate(e.at)}</Text>
                <TextLink
                  label="지우기"
                  color={colors.steam}
                  accessibilityLabel={`${menu?.name ?? '메뉴'} 기록 지우기`}
                  onPress={() => removeEaten(e.at)}
                />
              </View>
            );
          })
        )}
        {eaten.length > 0 ? (
          <Button
            label={confirmClear ? '한 번 더 누르면 모두 지워져요' : '기록 모두 지우기'}
            variant="quiet"
            onPress={() => {
              if (confirmClear) {
                clearEaten();
                setConfirmClear(false);
              } else {
                setConfirmClear(true);
              }
            }}
          />
        ) : null}
      </Section>

      <Text style={[text.sub, { marginTop: 8 }]}>즐겨찾기와 먹은 기록은 이 기기에만 저장돼요.</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 20 },
  stepBtn: {
    width: 48,
    height: 48,
    borderRadius: 2,
    borderWidth: 1.5,
    borderColor: colors.laver,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepText: { fontSize: 24, color: colors.laver, fontWeight: '700' },
  days: { fontFamily: DISPLAY_FONT, fontSize: 28, color: colors.laver, minWidth: 110, textAlign: 'center' },
  logRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 4 },
});
