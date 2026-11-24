import { router } from 'expo-router';
import { useState } from 'react';
import { Text } from 'react-native';
import { MenuCard } from '@/components/MenuCard';
import { Button, Note, Screen, text } from '@/components/ui';
import { MENUS } from '@/data/menus';
import { getPrefs, usePrefsStore } from '@/features/prefs/store';
import { RELAX_LABELS } from '@/features/recommend/questions';
import { recommend } from '@/features/recommend/recommend';
import { useResultSession } from '@/features/recommend/session';

export default function Result() {
  const { source, answers, picks, relaxed, setQuizResult } = useResultSession();
  const logEaten = usePrefsStore((s) => s.logEaten);
  const [chosenId, setChosenId] = useState<string | null>(null);

  const again = () => {
    setChosenId(null);
    if (source === 'quiz') {
      const r = recommend({ menus: MENUS, answers, prefs: getPrefs(), now: Date.now() });
      setQuizResult(answers, r.picks, r.relaxed);
    } else {
      router.replace('/ai');
    }
  };

  if (picks.length === 0) {
    return (
      <Screen>
        <Text style={text.title}>추천할 메뉴가 없어요</Text>
        <Text style={text.sub}>별로예요로 표시한 메뉴가 너무 많아요. 내 메뉴 탭에서 몇 개를 풀어주세요.</Text>
        <Button label="처음으로" onPress={() => router.dismissAll()} />
      </Screen>
    );
  }

  return (
    <Screen>
      <Text style={text.title}>{source === 'ai' ? '기분에 맞춰 골랐어요' : '이 중에서 골라보세요'}</Text>

      {relaxed.length > 0 ? (
        <Note>딱 맞는 메뉴가 적어서 {relaxed.map((r) => RELAX_LABELS[r]).join(', ')} 조건을 조금 넓혔어요.</Note>
      ) : null}

      {picks.map(({ menu, reason }) => (
        <MenuCard
          key={menu.id}
          menu={menu}
          reason={reason}
          chosen={chosenId === menu.id}
          onChoose={
            chosenId
              ? undefined
              : () => {
                  logEaten(menu.id);
                  setChosenId(menu.id);
                }
          }
        />
      ))}

      {chosenId ? (
        <Button label="처음으로" variant="quiet" onPress={() => router.dismissAll()} />
      ) : (
        <Button label={source === 'ai' ? '다르게 물어보기' : '다시 추천받기'} variant="quiet" onPress={again} />
      )}
    </Screen>
  );
}
