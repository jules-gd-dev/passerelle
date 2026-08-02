<script setup lang="ts">
const { t } = useI18n()
const localePath = useLocalePath()
</script>

<template>
  <header class="site-header">
    <NuxtLink :to="localePath('/')" class="brand">
      <img src="/logo.svg" alt="" class="brand-logo" />
      <span class="brand-title">Passerelle</span>
    </NuxtLink>

    <nav class="site-nav">
      <NuxtLink :to="localePath('/features')">{{ t('nav.features') }}</NuxtLink>
      <NuxtLink :to="localePath('/support')">{{ t('nav.support') }}</NuxtLink>
      <NuxtLink :to="localePath('/docs')">{{ t('nav.docs') }}</NuxtLink>
      <a href="https://github.com/jules-gd-dev/passerelle" target="_blank" rel="noopener">{{ t('nav.github') }}</a>
    </nav>

    <LocaleSwitch />
  </header>
</template>
