import { useMemo, useState } from 'react';
import { SectionList, StyleSheet, Text, View } from 'react-native';
import { colors, DISPLAY_FONT, Segmented, text, Toggle } from '@/components/ui';
import { MENUS } from '@/data/menus';
import { usePrefsStore } from '@/features/prefs/store';
import type { Category, Menu } from '@/types';

type Filter = 'all' | 'favorites' | 'disliked';
const CATEGORIES: Category[] = ['한식', '중식', '일식', '양식', '분식', '기타'];

function MenuRow({ menu }: { menu: Menu }) {
  const isFavorite = usePrefsStore((s) => s.favorites.includes(menu.id));
  const isDisliked = usePrefsStore((s) => s.disliked.includes(menu.id));
  const toggleFavorite = usePrefsStore((s) => s.toggleFavorite);
  const toggleDisliked = usePrefsStore((s) => s.toggleDisliked);

  return (
    <View style={styles.row}>
      <Text
        style={[text.body, { flex: 1 }, isDisliked && { color: colors.steam, textDecorationLine: 'line-through' }]}
      >
        {menu.name}
      </Text>
      <Toggle label="즐겨찾기" active={isFavorite} onPress={() => toggleFavorite(menu.id)} />
      <Toggle label="별로" active={isDisliked} onPress={() => toggleDisliked(menu.id)} />
    </View>
  );
}

const EMPTY_TEXT: Record<Filter, string> = {
  all: '',
  favorites: '즐겨찾기한 메뉴가 없어요. 전체 목록에서 즐겨찾기 칸을 체크하세요.',
  disliked: '별로예요로 표시한 메뉴가 없어요.',
};

export default function Favorites() {
  const [filter, setFilter] = useState<Filter>('all');
  const favorites = usePrefsStore((s) => s.favorites);
  const disliked = usePrefsStore((s) => s.disliked);

  const sections = useMemo(() => {
    const keep = (m: Menu) =>
      filter === 'all' || (filter === 'favorites' ? favorites.includes(m.id) : disliked.includes(m.id));
    return CATEGORIES.map((c) => ({ title: c, data: MENUS.filter((m) => m.category === c && keep(m)) })).filter(
      (s) => s.data.length > 0,
    );
  }, [filter, favorites, disliked]);

  return (
    <SectionList
      style={{ backgroundColor: colors.rice }}
      contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 56 }}
      contentInsetAdjustmentBehavior="automatic"
      sections={sections}
      keyExtractor={(m) => m.id}
      stickySectionHeadersEnabled={false}
      ListHeaderComponent={
        <View style={{ gap: 12, paddingTop: 12 }}>
          <Text style={text.sub}>즐겨찾기한 메뉴는 더 자주, 별로인 메뉴는 아예 추천하지 않아요.</Text>
          <Segmented
            value={filter}
            onChange={setFilter}
            options={[
              { value: 'all', label: `전체 ${MENUS.length}` },
              { value: 'favorites', label: `즐겨찾기 ${favorites.length}` },
              { value: 'disliked', label: `별로예요 ${disliked.length}` },
            ]}
          />
        </View>
      }
      ListEmptyComponent={<Text style={[text.sub, { marginTop: 24 }]}>{EMPTY_TEXT[filter]}</Text>}
      renderSectionHeader={({ section }) => <Text style={styles.sectionHeader}>{section.title}</Text>}
      renderItem={({ item }) => <MenuRow menu={item} />}
    />
  );
}

const styles = StyleSheet.create({
  sectionHeader: {
    fontFamily: DISPLAY_FONT,
    fontSize: 20,
    color: colors.laver,
    marginTop: 28,
    paddingBottom: 8,
    borderBottomWidth: 2,
    borderBottomColor: colors.laver,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line,
  },
});
