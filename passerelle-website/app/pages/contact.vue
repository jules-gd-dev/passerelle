<script setup lang="ts">
const { t } = useI18n()
useHead({ title: () => `Contact — Passerelle` })
</script>

<template>
  <div class="page-wrapper">
    <TheHeader />
    
    <main class="container page-full-height centered">
      <h1 class="page-title" style="font-size: 2.5rem; margin-bottom: 1rem;">Contact</h1>
      <p class="page-tagline" style="margin-bottom: 4rem; max-width: 500px;">Have a question, feedback, or just want to chat? Reach out directly.</p>
      
      <a href="mailto:hello@julesgd.dev" class="gentle-email">
        hello@julesgd.dev
      </a>
    </main>
    
    <TheFooter />
  </div>
</template>

<style scoped>
.page-wrapper {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}
</style>
