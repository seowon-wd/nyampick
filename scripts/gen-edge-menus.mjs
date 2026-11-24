// src/data/menus.json → supabase/functions/_shared/menus.ts (id·이름만)
// Edge Function은 앱 번들 밖에서 돌기 때문에 메뉴 목록 사본이 필요하다. 원본은 항상 menus.json.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const menus = JSON.parse(readFileSync(resolve(root, 'src/data/menus.json'), 'utf8'));
const out = resolve(root, 'supabase/functions/_shared/menus.ts');

const body = menus.map(({ id, name }) => `  { id: ${JSON.stringify(id)}, name: ${JSON.stringify(name)} },`).join('\n');
const content = `// 자동 생성 파일입니다. 직접 수정하지 말고 \`npm run gen:menus\`를 실행하세요.
export const MENUS: { id: string; name: string }[] = [
${body}
];
`;

mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, content);
console.log(`wrote ${menus.length} menus → ${out}`);
