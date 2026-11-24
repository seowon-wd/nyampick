import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { fetchSnapshot, RoomError, toRoomError } from './api';
import type { RoomSnapshot } from './types';

let topicSeq = 0;

/** 마운트마다 새 채널 이름. 같은 이름이면 realtime-js가 아직 나가는 중인 옛 채널을 돌려줘 구독이 멈춘다. */
export function roomTopic(roomId: string): string {
  return `room:${roomId}:${++topicSeq}`;
}

/** 방 구독 → (구독되면) 스냅샷 → 이벤트가 올 때마다 다시 불러오기. 화면을 떠나면 채널을 지운다. */
export function useRoomRealtime(roomId: string | null) {
  const [snapshot, setSnapshot] = useState<RoomSnapshot | null>(null);
  const [error, setError] = useState<RoomError | null>(null);
  // 늘리면 채널을 새로 만들어 다시 구독한다 ([다시 시도])
  const [attempt, setAttempt] = useState(0);
  // 늦게 도착한 응답이 더 새 응답을 덮지 않게 요청 순번을 센다
  const seq = useRef(0);

  const reload = useCallback(() => {
    if (!roomId) return;
    const mine = ++seq.current;
    fetchSnapshot(roomId).then(
      (s) => {
        if (mine !== seq.current) return;
        setSnapshot(s);
        setError(null);
      },
      (e) => {
        if (mine === seq.current) setError(e instanceof RoomError ? e : toRoomError(e));
      },
    );
  }, [roomId]);

  useEffect(() => {
    if (!roomId || !supabase) return;
    const client = supabase;
    const byRoom = `room_id=eq.${roomId}`;
    const channel = client
      .channel(roomTopic(roomId))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'candidates', filter: byRoom }, reload)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'votes', filter: byRoom }, reload)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'members', filter: byRoom }, reload)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rooms', filter: `id=eq.${roomId}` }, reload)
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') reload();
        else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') setError(new RoomError('unavailable'));
      });
    return () => {
      void client.removeChannel(channel);
    };
  }, [roomId, reload, attempt]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);

  return { snapshot, error, reload, retry };
}
