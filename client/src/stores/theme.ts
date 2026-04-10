import { defineStore } from 'pinia'
import { ref, watch } from 'vue'

export type Theme = 'light' | 'dark'

export const useThemeStore = defineStore('theme', () => {
  const saved = localStorage.getItem('theme') as Theme | null
  const theme = ref<Theme>(saved ?? 'light')

  function apply(t: Theme) {
    document.documentElement.setAttribute('data-theme', t)
    localStorage.setItem('theme', t)
  }

  function toggle() {
    theme.value = theme.value === 'light' ? 'dark' : 'light'
  }

  watch(theme, apply, { immediate: true })

  return { theme, toggle }
})
