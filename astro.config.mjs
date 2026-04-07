// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  // 须与实际访问域名一致（含 www / 裸域），否则 canonical、sitemap、OG 会错
  site: 'https://www.xiaogao-ai.com',
  integrations: [sitemap()],
});
