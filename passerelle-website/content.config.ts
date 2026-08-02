import { defineContentConfig, defineCollection } from '@nuxt/content'

export default defineContentConfig({
  collections: {
    docs_en: defineCollection({
      type: 'page',
      source: 'en/docs/**/*.md',
    }),
    docs_fr: defineCollection({
      type: 'page',
      source: 'fr/docs/**/*.md',
    }),
    docs_zh: defineCollection({
      type: 'page',
      source: 'zh/docs/**/*.md',
    }),
  },
})
