<script setup lang="ts">
import { onMounted, watch } from 'vue'

const { t, locale } = useI18n()
const localePath = useLocalePath()
const route = useRoute()

onMounted(() => {
  const injectCopy = () => {
    document.querySelectorAll('.docs-prose pre').forEach(pre => {
      if (pre.querySelector('.injected-copy-btn')) return
      const btn = document.createElement('button')
      btn.className = 'injected-copy-btn'
      btn.innerText = 'Copy'
      btn.onclick = async () => {
        const code = pre.querySelector('code')?.innerText || pre.innerText.replace('Copy\n', '')
        await navigator.clipboard.writeText(code)
        btn.innerText = 'Copied'
        setTimeout(() => { btn.innerText = 'Copy' }, 2000)
      }
      pre.appendChild(btn)
    })
  }

  injectCopy()
  setTimeout(injectCopy, 300)

  watch(() => route.path, () => {
    setTimeout(injectCopy, 150)
    setTimeout(injectCopy, 500)
  })
})

const collection = computed(() => `docs_${locale.value}` as 'docs_en' | 'docs_fr' | 'docs_zh')

const slug = computed(() => {
  const s = route.params.slug
  const first = Array.isArray(s) ? s[0] : s
  return first || 'introduction'
})

const contentPath = computed(() => `/${locale.value}/docs/${slug.value}`)

const { data: all } = await useAsyncData(`docs-list-${locale.value}`, () =>
  queryCollection(collection.value).all(),
)

const { data: doc } = await useAsyncData(`docs-${locale.value}-${slug.value}`, () =>
  queryCollection(collection.value).path(contentPath.value).first(),
)

const nav = computed(() => {
  const order = ['introduction', 'install', 'cli', 'security', 'self-host', 'contribution']
  const titles = {
    introduction: t('docs.introduction') || 'Introduction',
    install: t('docs.install') || 'Install',
    cli: t('docs.cli') || 'CLI Reference',
    security: t('docs.security') || 'Security Model',
    'self-host': t('docs.self_host') || 'Self-host',
    contribution: t('docs.contribution') || 'Contributing'
  }
  
  return order.map((id) => ({
    to: `/docs/${id}`,
    title: titles[id as keyof typeof titles],
    active: slug.value === id || (slug.value === '' && id === 'introduction')
  }))
})

useHead({ title: () => `${doc.value?.title || 'Docs'} — Passerelle` })
</script>

<template>
  <div class="page">
    <TheHeader />
    <div class="docs-layout">
      <aside class="docs-sidebar">
        <div class="docs-sidebar-label">{{ t('docs.sidebar_label') }}</div>
        <NuxtLink
          v-for="item in nav"
          :key="item.to"
          :to="localePath(item.to)"
          :class="{ active: item.active }"
        >
          {{ item.title }}
        </NuxtLink>
      </aside>

      <main class="docs-prose">
        <template v-if="doc">
          <ContentRenderer :value="doc" />
        </template>
        <p v-else class="serif" style="color: var(--light)">{{ t('docs.not_found') }}</p>
      </main>
    </div>
    <TheFooter />
  </div>
</template>
