import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TextInput, View } from 'react-native';
import { Button, colors, Screen, text, TextLink } from '@/components/ui';
import { MENUS } from '@/data/menus';
import { fetchAiPicks, MOOD_MAX_LENGTH } from '@/features/ai/api';
import { getPrefs } from '@/features/prefs/store';
import { allowedMenus, mealTimeAt, recentlyEatenIds } from '@/features/recommend/filter';
import { useResultSession } from '@/features/recommend/session';

const EXAMPLES = ['비 오고 쌀쌀해요', '야근해서 너무 피곤해요', '가볍게 먹고 싶어요', '좋은 일 있어서 축하하고 싶어요'];

export default function Ai() {
  const [mood, setMood] = useState('');
  const [loading, setLoading] = useState(false);
  const setAiResult = useResultSession((s) => s.setAiResult);

  const submit = async () => {
    const trimmed = mood.trim();
    if (!trimmed || loading) return;
    setLoading(true);
    const now = Date.now();
    const prefs = getPrefs();
    try {
      const picks = await fetchAiPicks(
        {
          mood: trimmed,
          mealTime: mealTimeAt(new Date(now)),
          disliked: prefs.disliked,
          recent: [...recentlyEatenIds(prefs.eaten, prefs.excludeDays, now)],
          favorites: prefs.favorites,
        },
        allowedMenus(MENUS, prefs, now),
      );
      setAiResult(picks);
      router.replace('/result');
    } catch (e) {
      console.warn('AI 추천 실패, 질문형으로 전환', e);
      router.replace({ pathname: '/quiz', params: { fallback: '1' } });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <Text style={text.display}>지금 기분이 어때요?</Text>
      <Text style={text.sub}>상황이나 기분을 한 줄로 적어주세요. 별로인 메뉴와 최근에 먹은 메뉴는 빼고 골라요.</Text>

      <View>
        <TextInput
          value={mood}
          onChangeText={setMood}
          placeholder="비 오는데 따뜻한 게 먹고 싶어요"
          placeholderTextColor={colors.steam}
          multiline
          maxLength={MOOD_MAX_LENGTH}
          editable={!loading}
          style={styles.input}
          accessibilityLabel="지금 기분이나 상황"
        />
        <Text style={[text.sub, styles.counter]}>
          {mood.length}/{MOOD_MAX_LENGTH}
        </Text>
      </View>

      <View style={styles.examples}>
        <Text style={text.sub}>이렇게 적어도 돼요</Text>
        {EXAMPLES.map((ex) => (
          <TextLink key={ex} label={ex} onPress={() => setMood(ex)} accessibilityLabel={`예시 문장 넣기: ${ex}`} />
        ))}
      </View>

      {loading ? (
        <View style={styles.loading} accessibilityLiveRegion="polite">
          <ActivityIndicator color={colors.laver} />
          <Text style={text.sub}>메뉴를 고르는 중이에요</Text>
        </View>
      ) : (
        <Button label="추천받기" onPress={submit} disabled={!mood.trim()} />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  input: {
    minHeight: 120,
    backgroundColor: colors.white,
    borderRadius: 2,
    borderWidth: 1.5,
    borderColor: colors.laver,
    padding: 16,
    fontSize: 18,
    lineHeight: 26,
    color: colors.laver,
    textAlignVertical: 'top',
  },
  counter: { alignSelf: 'flex-end', marginTop: 6 },
  examples: { gap: 10 },
  loading: { flexDirection: 'row', gap: 10, alignItems: 'center', justifyContent: 'center', padding: 15 },
});
