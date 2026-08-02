export default defineNuxtConfig({
  compatibilityDate: '2025-01-01',
  modules: ['@nuxt/content', '@nuxtjs/i18n', '@nuxtjs/sitemap'],
  
  site: {
    url: 'https://passerelle.julesgd.dev',
    name: 'Passerelle'
  },

  css: ['~/assets/css/main.css'],

  devtools: { enabled: false },

  i18n: {
    defaultLocale: 'en',
    strategy: 'prefix_except_default',
    detectBrowserLanguage: false,
    locales: [
      { code: 'en', language: 'en-US', name: 'English', file: 'en.json' },
      { code: 'fr', language: 'fr-FR', name: 'Français', file: 'fr.json' },
      { code: 'zh', language: 'zh-CN', name: '中文', file: 'zh.json' },
    ],
  },

  content: {
    build: {
      markdown: {
        highlight: {
          theme: {
            default: 'github-dark',
          },
          langs: ['bash', 'json', 'typescript', 'javascript', 'yaml', 'ini'],
        },
      },
    },
  },

  app: {
    head: {
      htmlAttrs: { lang: 'en' },
      title: 'Passerelle — Zero-Knowledge Tunneling',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        {
          name: 'description',
          content:
            'Passerelle exposes local services through ephemeral Cloudflare tunnels, orchestrated by a self-hosted gateway — without ever leaking long-lived tokens to the browser.',
        },
      ],
      link: [
        { rel: 'icon', type: 'image/svg+xml', href: '/logo.svg' },
      ],
    },
  },

  nitro: {
    prerender: {
      crawlLinks: true,
      routes: ['/', '/fr', '/zh'],
    },
  },
})
