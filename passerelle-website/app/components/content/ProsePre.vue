<script setup lang="ts">
import { ref } from 'vue'
const props = defineProps({
  code: {
    type: String,
    default: ''
  },
  language: {
    type: String,
    default: null
  },
  filename: {
    type: String,
    default: null
  },
  highlights: {
    type: Array as () => number[],
    default: () => []
  },
  meta: {
    type: String,
    default: null
  },
  class: {
    type: String,
    default: null
  }
})

const copied = ref(false)
const copy = async () => {
  await navigator.clipboard.writeText(props.code)
  copied.value = true
  setTimeout(() => { copied.value = false }, 2000)
}
</script>

<template>
  <div class="prose-pre-wrapper">
    <button class="prose-copy-btn" @click="copy" title="Copy code">
      {{ copied ? 'Copied' : 'Copy' }}
    </button>
    <pre :class="props.class"><slot /></pre>
  </div>
</template>

<style scoped>
.prose-pre-wrapper {
  position: relative;
}
.prose-pre-wrapper:hover .prose-copy-btn {
  opacity: 1;
}
.prose-copy-btn {
  position: absolute;
  top: 0.5rem;
  right: 0.5rem;
  opacity: 0;
  background: var(--bg);
  border: 1px solid var(--border);
  color: var(--light);
  font-family: 'Inter', sans-serif;
  font-size: 0.75rem;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s ease;
  z-index: 10;
}
.prose-copy-btn:hover {
  color: var(--text);
  border-color: var(--muted);
}
</style>
