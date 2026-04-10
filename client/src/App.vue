<template>
  <router-view />
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
onMounted(() => {
  if (auth.token) auth.fetchMe()
})
</script>

<style>
:root, [data-theme="light"] {
  --bg: #f5f7fa;
  --bg-card: #ffffff;
  --bg-sidebar: #ffffff;
  --bg-nav: #ffffff;
  --bg-input: #ffffff;
  --bg-hover: #f0f5ff;
  --bg-active: #f0f5ff;
  --bg-tag: #eee;
  --text: #333333;
  --text-muted: #666666;
  --text-light: #999999;
  --border: #eeeeee;
  --border-input: #dddddd;
  --primary: #4f8ef7;
  --primary-hover: #3a7de0;
  --primary-bg: #f0f5ff;
  --danger: #e53e3e;
  --danger-bg: #fff0f0;
  --shadow: 0 4px 24px rgba(0,0,0,.08);
  --shadow-sm: 0 1px 4px rgba(0,0,0,.06);
}

[data-theme="dark"] {
  --bg: #1a1b1e;
  --bg-card: #25262b;
  --bg-sidebar: #1e1f23;
  --bg-nav: #25262b;
  --bg-input: #2c2d32;
  --bg-hover: #2c3a52;
  --bg-active: #2c3a52;
  --bg-tag: #3a3b40;
  --text: #e0e0e0;
  --text-muted: #a0a0a0;
  --text-light: #666666;
  --border: #3a3b40;
  --border-input: #4a4b50;
  --primary: #5b9cf6;
  --primary-hover: #4a8ae0;
  --primary-bg: #1e2d45;
  --danger: #fc5c5c;
  --danger-bg: #3d1f1f;
  --shadow: 0 4px 24px rgba(0,0,0,.3);
  --shadow-sm: 0 1px 4px rgba(0,0,0,.2);
}

* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: var(--bg); color: var(--text); transition: background .2s, color .2s; }
a { text-decoration: none; color: inherit; }
</style>
