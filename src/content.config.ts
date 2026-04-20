import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const lessons = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './content' }),
  schema: z.object({
    title: z.string(),
    module: z.enum(['m1-basics', 'm2-thinking', 'm3-practice', 'm4-advanced', 'm5-compare', 'm6-sidebiz', 'm7-seo']),
    order: z.number(),
    group: z.string().optional(),
    description: z.string(),
    duration: z.string(),
    level: z.string(),
    publishedAt: z.coerce.date(),
    updatedAt: z.coerce.date().optional(),
    hot: z.boolean().default(false),
    draft: z.boolean().default(false),
  }),
});

export const collections = { lessons };
