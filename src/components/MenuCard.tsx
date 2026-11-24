import { useEffect, useRef } from 'react';
import { AccessibilityInfo, Animated, StyleSheet, Text, View } from 'react-native';
import { usePrefsStore } from '@/features/prefs/store';
import type { Menu } from '@/types';
import { Button, colors, DISPLAY_FONT, DottedLine, Tag, text, Toggle } from './ui';

const STAPLE_LABEL = { rice: '밥', noodle: '면', bread: '빵', etc: null } as const;
const PRICE_LABEL = { 1: '1만원 미만', 2: '1~2만원', 3: '2만원 이상' } as const;
const SPICE_LABEL = [null, '살짝 매움', '매움', '아주 매움'] as const;

export function menuTags(menu: Menu): string[] {
  return [
    menu.category,
    STAPLE_LABEL[menu.staple],
    menu.soup ? '국물' : null,
    SPICE_LABEL[menu.spice],
    PRICE_LABEL[menu.price],
  ].filter((t): t is NonNullable<typeof t> => t !== null);
}

/** "확정" 도장. 찍히는 순간 한 번만 움직인다 (동작 줄이기 설정이면 그냥 나타남). */
function Stamp() {
  const scale = useRef(new Animated.Value(1.8)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let cancelled = false;
    AccessibilityInfo.isReduceMotionEnabled().then((reduce) => {
      if (cancelled) return;
      if (reduce) {
        scale.setValue(1);
        opacity.setValue(1);
        return;
      }
      Animated.parallel([
        Animated.spring(scale, { toValue: 1, friction: 5, tension: 160, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: 120, useNativeDriver: true }),
      ]).start();
    });
    return () => {
      cancelled = true;
    };
  }, [scale, opacity]);

  return (
    <Animated.View
      accessibilityLabel="확정"
      pointerEvents="none"
      style={[styles.stamp, { opacity, transform: [{ rotate: '-14deg' }, { scale }] }]}
    >
      <Text style={styles.stampText}>확정</Text>
    </Animated.View>
  );
}

/** 추천 결과 한 장 = 식권 한 장. 위는 메뉴, 절취선 아래는 행동. */
export function MenuCard({
  menu,
  reason,
  chosen,
  onChoose,
}: {
  menu: Menu;
  reason?: string;
  /** "이걸로 먹을게요"를 누른 식권 */
  chosen?: boolean;
  /** 없으면 행동 버튼을 숨긴다 (다른 메뉴를 이미 고른 경우) */
  onChoose?: () => void;
}) {
  const isFavorite = usePrefsStore((s) => s.favorites.includes(menu.id));
  const isDisliked = usePrefsStore((s) => s.disliked.includes(menu.id));
  const toggleFavorite = usePrefsStore((s) => s.toggleFavorite);
  const toggleDisliked = usePrefsStore((s) => s.toggleDisliked);
  const excludeDays = usePrefsStore((s) => s.excludeDays);

  return (
    <View style={[styles.ticket, isDisliked && styles.voided]}>
      <View style={styles.body}>
        <View style={styles.header}>
          <View style={{ flex: 1, gap: 8 }}>
            <Text style={text.name}>{menu.name}</Text>
            <View style={styles.tags}>
              {menuTags(menu).map((t) => (
                <Tag key={t} label={t} />
              ))}
            </View>
          </View>
        </View>
        {reason ? <Text style={text.body}>{reason}</Text> : null}
        {chosen ? <Stamp /> : null}
      </View>

      <View style={styles.perforation}>
        <View style={[styles.notch, styles.notchLeft]} />
        <DottedLine dot={1.5} dash={7} gap={5} color="rgba(28,43,34,0.4)" style={styles.dashes} />
        <View style={[styles.notch, styles.notchRight]} />
      </View>

      <View style={styles.stub}>
        <View style={styles.toggles}>
          <Toggle label="즐겨찾기" active={isFavorite} onPress={() => toggleFavorite(menu.id)} />
          <Toggle label="별로예요" active={isDisliked} onPress={() => toggleDisliked(menu.id)} />
        </View>
        {chosen ? (
          <Text style={[text.sub, { color: colors.laver }]}>
            {excludeDays > 0 ? `맛있게 드세요. ${excludeDays}일 동안은 추천에서 빼둘게요.` : '맛있게 드세요.'}
          </Text>
        ) : onChoose ? (
          <Button label="이걸로 먹을게요" onPress={onChoose} disabled={isDisliked} />
        ) : null}
      </View>
    </View>
  );
}

const NOTCH = 18;

const styles = StyleSheet.create({
  ticket: { backgroundColor: colors.ticket, borderRadius: 2 },
  voided: { opacity: 0.45 },
  body: { padding: 20, gap: 14 },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  perforation: { height: NOTCH, justifyContent: 'center' },
  dashes: { marginHorizontal: NOTCH / 2 + 6 },
  notch: {
    position: 'absolute',
    width: NOTCH,
    height: NOTCH,
    borderRadius: NOTCH / 2,
    backgroundColor: colors.rice,
  },
  notchLeft: { left: -NOTCH / 2 },
  notchRight: { right: -NOTCH / 2 },
  stub: { paddingHorizontal: 20, paddingTop: 6, paddingBottom: 18, gap: 12 },
  toggles: { flexDirection: 'row', gap: 20, flexWrap: 'wrap' },
  stamp: {
    position: 'absolute',
    right: 18,
    bottom: 10,
    width: 76,
    height: 76,
    borderRadius: 3,
    borderWidth: 3,
    borderColor: colors.gochujang,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stampText: { fontFamily: DISPLAY_FONT, fontSize: 26, color: colors.gochujang },
});
