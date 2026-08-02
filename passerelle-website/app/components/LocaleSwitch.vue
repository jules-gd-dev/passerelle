<script setup lang="ts">
const { locale, locales } = useI18n()
const switchLocalePath = useSwitchLocalePath()
const router = useRouter()
const open = ref(false)

const available = computed(() =>
  (locales.value as Array<{ code: string; name: string }>).map((l) => ({
    code: l.code,
    name: l.name,
  })),
)
const current = computed(() => available.value.find((l) => l.code === locale.value))

function close() {
  open.value = false
}

function selectLocale(code: string) {
  const path = switchLocalePath(code)
  if (path) {
    router.push(path)
  }
  close()
}
</script>

<template>
  <div class="lang-switch">
    <button class="lang-switch-btn" type="button" @click="open = !open" @blur="setTimeout(close, 150)">
      {{ current?.code?.toUpperCase() }}
      <span style="opacity: 0.6">▾</span>
    </button>
    <div v-if="open" class="lang-menu">
      <a
        v-for="l in available"
        :key="l.code"
        href="#"
        :class="{ active: l.code === locale }"
        @mousedown.prevent="selectLocale(l.code)"
      >
        {{ l.name }}
      </a>
    </div>
  </div>
</template>
