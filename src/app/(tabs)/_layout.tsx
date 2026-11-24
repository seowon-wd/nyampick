import { Tabs } from 'expo-router';
import { colors, DISPLAY_FONT } from '@/components/ui';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.laver,
        tabBarInactiveTintColor: colors.steam,
        tabBarStyle: { backgroundColor: colors.rice, borderTopColor: colors.line },
        headerStyle: { backgroundColor: colors.rice },
        headerShadowVisible: false,
        headerTitleStyle: { fontFamily: DISPLAY_FONT, color: colors.laver },
        sceneStyle: { backgroundColor: colors.rice },
        // 아이콘 없이 글자만
        tabBarIcon: () => null,
        tabBarIconStyle: { display: 'none' },
        tabBarLabelStyle: { fontSize: 15, fontWeight: '700' },
      }}
    >
      <Tabs.Screen name="index" options={{ title: '오늘', headerShown: false }} />
      <Tabs.Screen name="favorites" options={{ title: '내 메뉴' }} />
      <Tabs.Screen name="settings" options={{ title: '설정' }} />
    </Tabs>
  );
}
