import type { ReactNode } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

/**
 * 디자인 토큰: 분식집 메뉴판 + 식권.
 * 노랑(단무지)은 식권·선택 상태에만, 빨강(고추장)은 도장과 주요 버튼에만 쓴다.
 */
export const colors = {
  rice: '#FBFBF8', // 화면 바탕
  laver: '#1C2B22', // 본문 잉크
  gochujang: '#E23B2E', // 도장, 주요 행동
  danmuji: '#FFD43B', // 선택 강조
  ticket: '#FFF1A8', // 식권 종이
  steam: '#8A948C', // 보조 텍스트
  line: '#E3E6DF', // 구분선
  white: '#FFFFFF',
};

/** 간판체. 제목·메뉴 이름에만 쓴다. */
export const DISPLAY_FONT = 'BlackHanSans_400Regular';

export const text = StyleSheet.create({
  display: { fontFamily: DISPLAY_FONT, fontSize: 40, lineHeight: 48, color: colors.laver },
  title: { fontFamily: DISPLAY_FONT, fontSize: 28, lineHeight: 36, color: colors.laver },
  name: { fontFamily: DISPLAY_FONT, fontSize: 24, lineHeight: 30, color: colors.laver },
  section: { fontSize: 17, fontWeight: '700', color: colors.laver },
  body: { fontSize: 16, lineHeight: 24, color: colors.laver },
  sub: { fontSize: 14, lineHeight: 21, color: colors.steam },
});

export function Screen({ children }: { children: ReactNode }) {
  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.screenPad}
      contentInsetAdjustmentBehavior="automatic"
      keyboardShouldPersistTaps="handled"
    >
      {children}
    </ScrollView>
  );
}

type ButtonVariant = 'primary' | 'quiet';

export function Button({
  label,
  onPress,
  variant = 'primary',
  disabled,
  style,
}: {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        variant === 'primary' ? styles.buttonPrimary : styles.buttonQuiet,
        pressed && styles.pressed,
        disabled && styles.disabled,
        style,
      ]}
    >
      <Text style={[styles.buttonText, variant === 'primary' && { color: colors.white }]}>{label}</Text>
    </Pressable>
  );
}

/** 질문 보기, 큰 선택지 한 줄. 선택되면 단무지색으로 칠해진다. */
export function OptionRow({ label, selected, onPress }: { label: string; selected?: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [styles.option, selected && styles.optionSelected, pressed && styles.pressed]}
    >
      <Text style={styles.optionText}>{label}</Text>
    </Pressable>
  );
}

/** 주문서의 네모 칸처럼 체크하면 칠해지는 토글 (즐겨찾기, 별로예요). */
export function Toggle({ label, active, onPress }: { label: string; active?: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: active }}
      accessibilityLabel={label}
      onPress={onPress}
      hitSlop={8}
      style={({ pressed }) => [styles.toggle, pressed && styles.pressed]}
    >
      <View style={[styles.box, active && styles.boxChecked]} />
      <Text style={[styles.toggleText, active && { fontWeight: '700' }]}>{label}</Text>
    </Pressable>
  );
}

/** 하나만 고르는 글자 탭. 선택된 항목에 밑줄. */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <View style={styles.segmented} accessibilityRole="tablist">
      {options.map((o) => {
        const selected = o.value === value;
        return (
          <Pressable
            key={o.value}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            onPress={() => onChange(o.value)}
            hitSlop={6}
            style={[styles.segment, selected && styles.segmentSelected]}
          >
            <Text style={[styles.toggleText, selected ? { fontWeight: '700' } : { color: colors.steam }]}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** 밑줄 친 글자 버튼 (이전 질문으로, 지우기 등 보조 행동). */
export function TextLink({
  label,
  onPress,
  accessibilityLabel,
  color = colors.laver,
}: {
  label: string;
  onPress: () => void;
  accessibilityLabel?: string;
  color?: string;
}) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={accessibilityLabel} onPress={onPress} hitSlop={10}>
      <Text style={[text.sub, { color, textDecorationLine: 'underline' }]}>{label}</Text>
    </Pressable>
  );
}

/**
 * 점선·파선. RN의 borderStyle dotted/dashed는 한 변에만 쓰면 iOS에서 안 그려질 수 있어
 * 작은 조각을 반복해서 그린다. 넘치는 부분은 잘라낸다.
 */
export function DottedLine({
  dot = 2,
  dash = 2,
  gap = 4,
  color = colors.steam,
  style,
}: {
  dot?: number;
  dash?: number;
  gap?: number;
  color?: string;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[{ flexDirection: 'row', overflow: 'hidden', height: dot, gap }, style]} importantForAccessibility="no-hide-descendants">
      {Array.from({ length: 120 }, (_, i) => (
        <View key={i} style={{ width: dash, height: dot, backgroundColor: color }} />
      ))}
    </View>
  );
}

/** 메뉴 속성 태그 (한식, 국물 등). */
export function Tag({ label }: { label: string }) {
  return (
    <View style={styles.tag}>
      <Text style={styles.tagText}>{label}</Text>
    </View>
  );
}

/** 안내 문구 (조건 완화 등). 왼쪽 굵은 선으로 구분한다. */
export function Note({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[styles.note, style]}>
      <Text style={text.sub}>{children}</Text>
    </View>
  );
}

/** 글자 입력 한 칸. 위에 라벨, 아래에 선택지와 같은 테두리. */
export function TextField({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType = 'default',
  maxLength,
}: {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  keyboardType?: 'default' | 'number-pad';
  maxLength?: number;
}) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={text.section}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.steam}
        keyboardType={keyboardType}
        maxLength={maxLength}
        autoCorrect={false}
        autoCapitalize="none"
        style={[styles.option, styles.optionText]}
      />
    </View>
  );
}

/** 설정 화면 등에서 쓰는 묶음. 카드 대신 위쪽 굵은 선으로 구획한다. */
export function Section({
  title,
  children,
  style,
}: {
  title: string;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[styles.sectionBox, style]}>
      <Text style={text.section}>{title}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.rice },
  screenPad: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 56, gap: 18 },
  pressed: { opacity: 0.7 },
  disabled: { opacity: 0.35 },
  button: { borderRadius: 3, paddingVertical: 15, paddingHorizontal: 18, alignItems: 'center' },
  buttonPrimary: { backgroundColor: colors.gochujang },
  buttonQuiet: { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: colors.laver },
  buttonText: { fontSize: 16, fontWeight: '700', color: colors.laver },
  option: {
    borderWidth: 1.5,
    borderColor: colors.laver,
    borderRadius: 4,
    paddingVertical: 16,
    paddingHorizontal: 18,
    backgroundColor: colors.white,
  },
  optionSelected: { backgroundColor: colors.danmuji },
  optionText: { fontSize: 18, fontWeight: '600', color: colors.laver },
  toggle: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingVertical: 6 },
  box: { width: 15, height: 15, borderWidth: 1.5, borderColor: colors.laver },
  boxChecked: { backgroundColor: colors.laver },
  toggleText: { fontSize: 14, color: colors.laver },
  segmented: { flexDirection: 'row', gap: 20, borderBottomWidth: 1, borderBottomColor: colors.line },
  segment: { paddingVertical: 10, marginBottom: -1, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  segmentSelected: { borderBottomColor: colors.laver },
  tag: {
    borderWidth: 1,
    borderColor: 'rgba(28,43,34,0.35)',
    borderRadius: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  tagText: { fontSize: 12, color: colors.laver },
  note: { borderLeftWidth: 3, borderLeftColor: colors.danmuji, paddingLeft: 12, paddingVertical: 4 },
  sectionBox: { borderTopWidth: 2, borderTopColor: colors.laver, paddingTop: 14, gap: 12 },
});
