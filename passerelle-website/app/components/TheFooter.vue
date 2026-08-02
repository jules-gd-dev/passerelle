<script setup lang="ts">
const { t } = useI18n()
const localePath = useLocalePath()
</script>

<template>
  <footer class="site-footer">
    <span class="commit-hash">passerelle</span>
    <div style="display: flex; gap: 1.5rem;">
      <NuxtLink :to="localePath('/docs')" class="footer-link">{{ t('nav.docs') || 'Docs' }}</NuxtLink>
      <a href="https://github.com/jules-gd-dev/passerelle" target="_blank" rel="noopener" class="footer-link">GitHub</a>
    </div>
  </footer>
</template>
