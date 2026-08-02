<script setup lang="ts">
const { t } = useI18n()

const steps = computed(() => [
  {
    num: '01',
    title: t('how.step1_title'),
    text: t('how.step1_text'),
    meta: `${t('how.n_daemon')} → ${t('how.n_tunnel')}`,
  },
  {
    num: '02',
    title: t('how.step2_title'),
    text: t('how.step2_text'),
    meta: `${t('how.n_gateway')} → ${t('how.n_handoff')}`,
  },
  {
    num: '03',
    title: t('how.step3_title'),
    text: t('how.step3_text'),
    meta: `${t('how.n_browser')} → ${t('how.n_service')}`,
  },
])
</script>

<template>
  <div class="unified-list">
    <div v-for="(s, i) in steps" :key="i" class="row">
      <div class="row-main">
        <span class="step-num">{{ s.num }}</span>
        <h3 class="row-title">{{ s.title }}</h3>
        <span class="row-meta">{{ s.meta }}</span>
      </div>
      <p class="row-content">{{ s.text }}</p>
    </div>
  </div>
</template>
