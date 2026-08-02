<script setup lang="ts">
const { t, tm, rt } = useI18n()
const localePath = useLocalePath()

const commands = [
  'npm install -g @julesgd/passerelle',
  'passerelle setup',
  'passerelle ui'
]
const step = ref(0)
const copied = ref(false)

async function copyCmd() {
  await navigator.clipboard.writeText(commands[step.value])
  copied.value = true
  setTimeout(() => {
    copied.value = false
    if (step.value < commands.length - 1) {
      step.value++
    }
  }, 1000)
}

function goBack() {
  if (step.value > 0) step.value--
}
</script>

<template>
  <div class="page">
    <TheHeader />

    <main class="container">
      <section class="hero">
        <h1 class="hero-title">{{ t('hero.title') }}</h1>
        <p class="hero-tagline">{{ t('hero.tagline') }}</p>

        <div class="hero-install">
          <div class="install-block">
            <div style="display: flex; align-items: center; gap: 1rem; min-height: 24px;">
              <button v-if="step > 0" class="icon-btn" @click="goBack" title="Back">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>
              </button>
              <Transition name="fade" mode="out-in">
                <code class="install-cmd" :key="step">
                  <span class="prompt">$</span> <span class="pkg">{{ commands[step] }}</span>
                </code>
              </Transition>
            </div>
            <button class="copy-btn" @click="copyCmd">
              {{ copied ? t('copy.copied') : t('copy.copy') }}
            </button>
          </div>
        </div>

        <div class="hero-actions">
          <NuxtLink :to="localePath('/docs')" class="btn-primary">
            {{ t('hero.learn_more') }}
          </NuxtLink>
          <a href="https://github.com/jules-gd-dev/passerelle" target="_blank" rel="noopener" class="btn-secondary">
            GitHub
          </a>
        </div>
      </section>

      <section class="section">
        <div class="section-label">{{ t('capabilities.title') || 'Capabilities' }}</div>
        
        <div class="features-grid">
          <div class="feature-card" v-for="(item, i) in tm('capabilities.items')" :key="i">
            <span class="feature-meta">{{ rt(item.meta) }}</span>
            <h3 class="feature-title">{{ rt(item.title) }}</h3>
            <p class="feature-content">{{ rt(item.desc) }}</p>
          </div>
        </div>
      </section>
    </main>
    
    <TheFooter />
  </div>
</template>
