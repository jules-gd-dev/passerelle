<script setup lang="ts">
const props = defineProps<{ text: string }>()
const { t } = useI18n()
const copied = ref(false)
let timer: ReturnType<typeof setTimeout> | undefined

async function copy() {
  try {
    await navigator.clipboard.writeText(props.text)
  } catch {
    const el = document.createElement('textarea')
    el.value = props.text
    document.body.appendChild(el)
    el.select()
    document.execCommand('copy')
    document.body.removeChild(el)
  }
  copied.value = true
  clearTimeout(timer)
  timer = setTimeout(() => (copied.value = false), 1600)
}
</script>

<template>
  <button class="copy-btn" :class="{ copied }" type="button" :aria-label="t('copy.copy')" @click="copy">
    <span v-if="copied">✓ {{ t('copy.copied') }}</span>
    <span v-else>{{ t('copy.copy') }}</span>
  </button>
</template>
