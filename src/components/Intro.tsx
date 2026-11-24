import { useEffect, useRef } from 'react';
import { AccessibilityInfo, Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, DISPLAY_FONT } from './ui';

/**
 * 앱 시작 인트로: 워드마크가 떠오르고 → "냠" 도장이 쾅 찍히고 → 화면이 걷힌다. (약 1.4초)
 * 탭하면 건너뛴다. 동작 줄이기 설정이면 움직임 없이 잠깐 보여주고 사라진다.
 */
export function Intro({ onDone }: { onDone: () => void }) {
  const word = useRef(new Animated.Value(0)).current; // 0 → 1: 워드마크 등장
  const stamp = useRef(new Animated.Value(0)).current; // 0 → 1: 도장 찍힘
  const press = useRef(new Animated.Value(1)).current; // 도장 충격으로 살짝 눌림
  const curtain = useRef(new Animated.Value(1)).current; // 1 → 0: 전체 페이드아웃
  const finished = useRef(false);

  const finish = () => {
    if (finished.current) return;
    finished.current = true;
    Animated.timing(curtain, { toValue: 0, duration: 220, useNativeDriver: true }).start(() => onDone());
  };

  useEffect(() => {
    let animation: Animated.CompositeAnimation | null = null;
    let cancelled = false;

    AccessibilityInfo.isReduceMotionEnabled().then((reduce) => {
      if (cancelled) return;
      if (reduce) {
        word.setValue(1);
        stamp.setValue(1);
        animation = Animated.delay(700);
      } else {
        animation = Animated.sequence([
          Animated.timing(word, {
            toValue: 1,
            duration: 320,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.delay(80),
          Animated.parallel([
            Animated.spring(stamp, { toValue: 1, friction: 6, tension: 220, useNativeDriver: true }),
            Animated.sequence([
              Animated.delay(70),
              Animated.timing(press, { toValue: 0.965, duration: 70, useNativeDriver: true }),
              Animated.spring(press, { toValue: 1, friction: 4, tension: 200, useNativeDriver: true }),
            ]),
          ]),
          Animated.delay(420),
        ]);
      }
      animation.start(({ finished: done }) => {
        if (done) finish();
      });
    });

    return () => {
      cancelled = true;
      animation?.stop();
    };
    // 한 번만 실행
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stampScale = stamp.interpolate({ inputRange: [0, 1], outputRange: [2.4, 1] });
  const stampOpacity = stamp.interpolate({ inputRange: [0, 0.25, 1], outputRange: [0, 1, 1] });
  const wordShift = word.interpolate({ inputRange: [0, 1], outputRange: [16, 0] });

  return (
    <Animated.View style={[StyleSheet.absoluteFill, styles.root, { opacity: curtain }]}>
      <Pressable
        style={styles.fill}
        onPress={finish}
        accessibilityRole="button"
        accessibilityLabel="오늘 뭐먹냠. 탭하면 바로 시작해요"
      >
        <Animated.View style={{ opacity: word, transform: [{ translateY: wordShift }, { scale: press }] }}>
          <View>
            <Text style={styles.wordmark}>오늘{'\n'}뭐먹냠?</Text>
            <Animated.View
              style={[styles.stamp, { opacity: stampOpacity, transform: [{ rotate: '-14deg' }, { scale: stampScale }] }]}
            >
              <Text style={styles.stampText}>냠</Text>
            </Animated.View>
          </View>
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
}

const STAMP = 96;

const styles = StyleSheet.create({
  root: { backgroundColor: colors.rice, zIndex: 100 },
  fill: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  wordmark: { fontFamily: DISPLAY_FONT, fontSize: 64, lineHeight: 70, color: colors.laver },
  stamp: {
    position: 'absolute',
    right: -STAMP * 0.45,
    bottom: -STAMP * 0.25,
    width: STAMP,
    height: STAMP,
    borderRadius: 4,
    borderWidth: 4,
    borderColor: colors.gochujang,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stampText: { fontFamily: DISPLAY_FONT, fontSize: 44, color: colors.gochujang },
});
