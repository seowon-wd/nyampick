import { router } from 'expo-router';

/** 처음 화면으로. 링크로 바로 들어와(웹) 되돌아갈 화면이 없으면 홈으로 바꾼다. */
export function goHome() {
  if (router.canDismiss()) router.dismissAll();
  else router.replace('/');
}
