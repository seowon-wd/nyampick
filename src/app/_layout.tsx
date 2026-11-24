import { BlackHanSans_400Regular, useFonts } from '@expo-google-fonts/black-han-sans';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { Intro } from '@/components/Intro';
import { colors, DISPLAY_FONT } from '@/components/ui';
import { ensureSession } from '@/lib/supabase';

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({ BlackHanSans_400Regular });
  // 앱 실행 1회만 인트로를 보여준다 (컴포넌트 상태라 앱을 다시 켜야 다시 나옴).
  const [introDone, setIntroDone] = useState(false);

  useEffect(() => {
    // 로그인 화면 없이 백그라운드에서 익명 로그인 (2단계 함께 고르기에 필요). 실패해도 앱은 동작한다.
    void ensureSession();
  }, []);

  // 폰트 로딩 실패 시에는 시스템 폰트로 그냥 진행한다.
  if (!fontsLoaded && !fontError) return null;

  return (
    <>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerTintColor: colors.laver,
          headerShadowVisible: false,
          headerStyle: { backgroundColor: colors.rice },
          headerTitleStyle: { fontFamily: DISPLAY_FONT, color: colors.laver },
          contentStyle: { backgroundColor: colors.rice },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="quiz" options={{ title: '질문으로 고르기' }} />
        <Stack.Screen name="result" options={{ title: '오늘의 식권' }} />
      </Stack>
      {introDone ? null : <Intro onDone={() => setIntroDone(true)} />}
    </>
  );
}
