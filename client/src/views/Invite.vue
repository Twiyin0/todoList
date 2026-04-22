<template>
  <div class="invite-page">
    <div class="invite-card">
      <div v-if="loading" class="state">加载中...</div>

      <div v-else-if="error" class="state error">{{ error }}</div>

      <template v-else-if="info">
        <h2>协同创作邀请</h2>
        <p class="doc-title">「{{ info.docTitle }}」</p>
        <p class="hint">你被邀请加入此文档的协同创作，接受后文档将出现在你的编辑器侧边栏。</p>

        <div v-if="!authStore.token" class="not-logged">
          <p>请先登录后再接受邀请</p>
          <button class="btn-primary" @click="goLogin">去登录</button>
        </div>

        <div v-else-if="info.status === 'accepted' && !justAccepted" class="state">
          邀请已被使用
        </div>

        <div v-else-if="justAccepted" class="state success">
          已加入！正在跳转...
        </div>

        <div v-else class="actions">
          <button class="btn-primary" @click="handleAccept" :disabled="accepting">
            {{ accepting ? '处理中...' : '接受邀请' }}
          </button>
          <button class="btn-secondary" @click="router.push('/')">拒绝</button>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { documentApi } from '@/api'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

const token = route.params.token as string
const loading = ref(true)
const error = ref('')
const accepting = ref(false)
const justAccepted = ref(false)
const info = ref<{ docId: number; docTitle: string; status: string } | null>(null)

onMounted(async () => {
  try {
    const res = await documentApi.getInvite(token)
    info.value = res.data
  } catch (e: any) {
    error.value = e.response?.data?.error ?? '邀请链接无效或已过期'
  } finally {
    loading.value = false
  }
})

async function handleAccept() {
  accepting.value = true
  try {
    const res = await documentApi.acceptInvite(token)
    justAccepted.value = true
    setTimeout(() => router.push(`/editor/${res.data.docId}`), 1200)
  } catch (e: any) {
    error.value = e.response?.data?.error ?? '接受失败'
  } finally {
    accepting.value = false
  }
}

function goLogin() {
  router.push(`/login?redirect=/invite/${token}`)
}
</script>

<style scoped>
.invite-page { min-height: 100vh; display: flex; align-items: center; justify-content: center; background: var(--bg); }
.invite-card { background: var(--bg-card); border: 1px solid var(--border); border-radius: 16px; padding: 2.5rem 2rem; width: 100%; max-width: 420px; display: flex; flex-direction: column; gap: 1rem; box-shadow: var(--shadow); }
h2 { color: var(--text); font-size: 1.4rem; margin: 0; }
.doc-title { font-size: 1.1rem; font-weight: 600; color: var(--primary); margin: 0; }
.hint { font-size: .9rem; color: var(--text-muted); margin: 0; }
.state { text-align: center; color: var(--text-muted); padding: 1rem 0; }
.state.error { color: var(--danger); }
.state.success { color: #2ecc71; font-weight: 600; }
.not-logged { display: flex; flex-direction: column; gap: .75rem; align-items: flex-start; }
.not-logged p { color: var(--text-muted); font-size: .9rem; margin: 0; }
.actions { display: flex; gap: .75rem; }
.btn-primary { padding: .55rem 1.3rem; background: var(--primary); color: #fff; border: none; border-radius: 8px; cursor: pointer; font-size: .95rem; }
.btn-primary:disabled { opacity: .6; cursor: not-allowed; }
.btn-secondary { padding: .55rem 1.3rem; background: var(--bg); color: var(--text); border: 1px solid var(--border); border-radius: 8px; cursor: pointer; font-size: .95rem; }
</style>
