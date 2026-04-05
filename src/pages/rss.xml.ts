import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import type { APIContext } from 'astro';

export async function GET(context: APIContext) {
  const lessons = await getCollection('lessons', ({ data }) => !data.draft);
  const sorted = lessons.sort((a, b) => b.data.publishedAt.getTime() - a.data.publishedAt.getTime());

  return rss({
    title: 'Claude Code 精通之路',
    description: '软件工程思维 × AI 编程',
    site: context.site!,
    items: sorted.map(lesson => {
      const parts = lesson.id.split('/');
      const modulePrefix = parts[0].split('-')[0];
      return {
        title: lesson.data.title,
        description: lesson.data.description,
        pubDate: lesson.data.publishedAt,
        link: `/${modulePrefix}/${parts[1]}/`,
      };
    }),
    customData: '<language>zh-CN</language>',
  });
}
