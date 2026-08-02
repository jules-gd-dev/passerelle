<script setup lang="ts">
const { t } = useI18n()
const localePath = useLocalePath()
useHead({ title: () => `${t('nav.support')} — Passerelle` })
</script>

<template>
  <div class="page-wrapper">
    <TheHeader />
    
    <main class="container page-full-height">
      <div class="page-hero">
        <h1 class="page-title">{{ t('support.title') }}</h1>
      </div>
      
      <section class="support-section page-support-section">
        <div class="support-content">
          <p>{{ t('support.mission') }}</p>
          <p>{{ t('support.donations') }}</p>
          
          <div class="support-alert">
            <span class="support-alert-text">{{ t('support.disabled') }}</span>
          </div>
          
          <div style="margin-top: 4rem; text-align: center;">
            <NuxtLink :to="localePath('/contact')" class="btn-primary">
              {{ t('nav.contact') || 'Contact Us' }}
            </NuxtLink>
          </div>
        </div>
      </section>
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
.page-support-section {
  margin: 0 auto;
}
</style>
