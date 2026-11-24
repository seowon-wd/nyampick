import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';

// EXPO_PUBLIC_* 는 점 표기로 직접 참조해야 빌드 시 인라인된다.
const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

/** Supabase 설정이 없으면 null. 이때 AI 추천은 질문형으로 대체된다. */
export const supabase: SupabaseClient | null =
  url && key
    ? createClient(url, key, {
        auth: {
          storage: AsyncStorage,
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: false,
        },
      })
    : null;

if (supabase && Platform.OS !== 'web') {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') supabase.auth.startAutoRefresh();
    else supabase.auth.stopAutoRefresh();
  });
}

let pending: Promise<boolean> | null = null;

/** 세션이 없으면 익명 로그인한다. 성공 여부를 돌려준다 (동시 호출은 하나로 합침). */
export function ensureSession(): Promise<boolean> {
  if (!supabase) return Promise.resolve(false);
  const client = supabase;
  pending ??= (async () => {
    try {
      const { data } = await client.auth.getSession();
      if (data.session) return true;
      const { error } = await client.auth.signInAnonymously();
      return !error;
    } catch {
      return false;
    } finally {
      pending = null;
    }
  })();
  return pending;
}
