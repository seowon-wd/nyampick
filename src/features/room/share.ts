type WebNav = {
  share?: (data: { text: string }) => Promise<void>;
  clipboard?: { writeText: (text: string) => Promise<void> };
};

/**
 * 웹 공유: 공유 메뉴(대부분 휴대폰 브라우저) → 클립보드 복사(PC) → 직접 복사 안내 순으로 시도한다.
 * React Native의 Share.share는 공유 메뉴가 없는 브라우저에서 실패하므로 웹에서는 이걸 쓴다.
 */
export async function shareOnWeb(
  text: string,
  nav: WebNav | undefined = globalThis.navigator as WebNav | undefined,
): Promise<'shared' | 'copied' | 'manual'> {
  if (nav?.share) {
    try {
      await nav.share({ text });
      return 'shared';
    } catch (e) {
      // 사용자가 공유 메뉴를 닫은 것은 정상
      if ((e as Error)?.name === 'AbortError') return 'shared';
    }
  }
  try {
    if (!nav?.clipboard) return 'manual';
    await nav.clipboard.writeText(text);
    return 'copied';
  } catch {
    return 'manual';
  }
}
