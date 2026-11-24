import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, OptionRow, Screen, text, TextLink } from '@/components/ui';
import { MENUS } from '@/data/menus';
import { getPrefs } from '@/features/prefs/store';
import { QUESTIONS } from '@/features/recommend/questions';
import { recommend } from '@/features/recommend/recommend';
import { useResultSession } from '@/features/recommend/session';
import type { Answers } from '@/types';

export default function Quiz() {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Answers>({});
  const setQuizResult = useResultSession((s) => s.setQuizResult);

  const question = QUESTIONS[step];
  const isLast = step === QUESTIONS.length - 1;

  const choose = (value: unknown) => {
    const next = { ...answers, [question.key]: value } as Answers;
    setAnswers(next);
    if (!isLast) {
      setStep(step + 1);
      return;
    }
    const result = recommend({ menus: MENUS, answers: next, prefs: getPrefs(), now: Date.now() });
    setQuizResult(next, result.picks, result.relaxed);
    router.replace('/result');
  };

  return (
    <Screen>
      <View style={styles.progress} accessibilityLabel={`질문 ${step + 1}/${QUESTIONS.length}`}>
        {QUESTIONS.map((q, i) => (
          <View key={q.key} style={[styles.cell, i < step && styles.cellDone, i === step && styles.cellNow]} />
        ))}
      </View>

      <Text style={[text.display, { marginVertical: 8 }]}>{question.title}</Text>

      <View style={{ gap: 10 }}>
        {question.options.map((opt) => (
          <OptionRow
            key={opt.label}
            label={opt.label}
            selected={question.key in answers && answers[question.key] === opt.value}
            onPress={() => choose(opt.value)}
          />
        ))}
      </View>

      {step > 0 ? (
        <View style={styles.back}>
          <TextLink label="이전 질문으로" onPress={() => setStep(step - 1)} />
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  progress: { flexDirection: 'row', gap: 4 },
  cell: { flex: 1, height: 8, borderWidth: 1.5, borderColor: colors.laver },
  cellDone: { backgroundColor: colors.laver },
  cellNow: { backgroundColor: colors.danmuji },
  back: { alignSelf: 'flex-start', paddingVertical: 4 },
});
