<template>
  <div class="page">
    <NavBar />
    <div class="container">
      <div class="header">
        <h2>API Token 管理</h2>
        <button class="btn-primary" @click="showForm = !showForm">+ 生成新 Token</button>
      </div>

      <form v-if="showForm" class="create-form" @submit.prevent="handleCreate">
        <input v-model="form.name" placeholder="Token 名称（如：MCP Agent）" required />
        <div class="expire-row">
          <label class="expire-label">
            <input type="checkbox" v-model="form.neverExpire" />
            永不过期
          </label>
          <input v-if="!form.neverExpire" v-model="form.expires_at" type="datetime-local" required />
        </div>
        <div class="form-actions">
          <button type="submit" class="btn-primary" :disabled="creating">生成</button>
          <button type="button" class="btn-secondary" @click="showForm = false">取消</button>
        </div>
      </form>

      <div v-if="newToken" class="new-token-box">
        <p class="new-token-label">Token 已生成，请立即复制，关闭后不再显示：</p>
        <div class="token-copy-row">
          <code class="token-value">{{ newToken }}</code>
          <button class="btn-copy" @click="copyToken(newToken)">{{ copied ? '已复制' : '复制' }}</button>
        </div>
        <button class="btn-secondary" @click="newToken = ''">关闭</button>
      </div>

      <div v-if="loading" class="loading">加载中...</div>
      <div v-else-if="tokens.length === 0" class="empty">暂无 Token</div>
      <div v-else class="token-list">
        <div v-for="t in tokens" :key="t.id" class="token-card" :class="{ expired: t.expired }">
          <div class="token-info">
            <span class="token-name">{{ t.name || '未命名' }}</span>
            <span class="token-badge" :class="t.expired ? 'badge-expired' : 'badge-active'">
              {{ t.expired ? '已过期' : '有效' }}
            </span>
          </div>
          <code class="token-preview">{{ t.token }}</code>
          <div class="token-meta">
            <span>创建：{{ formatDate(t.created_at) }}</span>
            <span v-if="t.expires_at">过期：{{ formatDate(t.expires_at) }}</span>
            <span v-else>永不过期</span>
          </div>
          <div class="token-actions">
            <button class="btn-copy" @click="copyToken(t.token)">复制完整 Token</button>
            <button class="btn-danger" @click="handleDelete(t.id)">删除</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import NavBar from '@/components/NavBar.vue'
import { apiTokenApi } from '@/api/index'

interface TokenItem {
  id: number
  name: string
  token: string
  expires_at: number | null
  created_at: number
  expired: boolean
}

const tokens = ref<TokenItem[]>([])
const loading = ref(true)
const showForm = ref(false)
const creating = ref(false)
const newToken = ref('')
const copied = ref(false)
const form = ref({ name: '', expires_at: '', neverExpire: false })

async function load() {
  loading.value = true
  const res = await apiTokenApi.list()
  tokens.value = res.data.tokens
  loading.value = false
}

async function handleCreate() {
  creating.value = true
  const payload: { name: string; expires_at?: number | null } = { name: form.value.name }
  if (!form.value.neverExpire && form.value.expires_at) {
    payload.expires_at = Math.floor(new Date(form.value.expires_at).getTime() / 1000)
  }
  const res = await apiTokenApi.create(payload)
  newToken.value = res.data.token.token
  form.value = { name: '', expires_at: '', neverExpire: false }
  showForm.value = false
  creating.value = false
  await load()
}

async function handleDelete(id: number) {
  if (!confirm('确认删除此 Token？')) return
  await apiTokenApi.remove(id)
  await load()
}

async function copyToken(token: string) {
  await navigator.clipboard.writeText(token)
  copied.value = true
  setTimeout(() => { copied.value = false }, 2000)
}

function formatDate(ts: number) {
  return new Date(ts * 1000).toLocaleString('zh-CN')
}

onMounted(load)
</script>

<style scoped>
.page { min-height: 100vh; background: var(--bg); }
.container { max-width: 720px; margin: 0 auto; padding: 2rem 1rem; }
.header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 1.5rem; }
.header h2 { font-size: 1.4rem; color: var(--text); }
.create-form { background: var(--bg-card); border: 1px solid var(--border); border-radius: 12px; padding: 1.25rem; margin-bottom: 1.5rem; display: flex; flex-direction: column; gap: .75rem; }
.create-form input { padding: .6rem .9rem; border: 1px solid var(--border); border-radius: 8px; background: var(--bg); color: var(--text); font-size: .95rem; }
.expire-row { display: flex; flex-direction: column; gap: .4rem; }
.expire-label { display: flex; align-items: center; gap: .4rem; font-size: .9rem; color: var(--text); cursor: pointer; }
.expire-label input[type="checkbox"] { width: 15px; height: 15px; cursor: pointer; }
.form-actions { display: flex; gap: .75rem; }
.new-token-box { background: var(--bg-card); border: 1px solid var(--primary); border-radius: 12px; padding: 1.25rem; margin-bottom: 1.5rem; display: flex; flex-direction: column; gap: .75rem; }
.new-token-label { color: var(--text); font-size: .9rem; }
.token-copy-row { display: flex; align-items: center; gap: .75rem; flex-wrap: wrap; }
.token-value { font-family: monospace; font-size: .85rem; background: var(--bg); padding: .5rem .75rem; border-radius: 6px; border: 1px solid var(--border); word-break: break-all; flex: 1; color: var(--primary); }
.loading, .empty { text-align: center; color: var(--text-muted); padding: 3rem 0; }
.token-list { display: flex; flex-direction: column; gap: 1rem; }
.token-card { background: var(--bg-card); border: 1px solid var(--border); border-radius: 12px; padding: 1.1rem 1.25rem; display: flex; flex-direction: column; gap: .5rem; }
.token-card.expired { opacity: .6; }
.token-info { display: flex; align-items: center; gap: .75rem; }
.token-name { font-weight: 600; color: var(--text); }
.token-badge { font-size: .75rem; padding: .2rem .6rem; border-radius: 20px; }
.badge-active { background: var(--primary-bg); color: var(--primary); }
.badge-expired { background: var(--danger-bg); color: var(--danger); }
.token-preview { font-family: monospace; font-size: .85rem; color: var(--text-muted); }
.token-meta { display: flex; gap: 1.5rem; font-size: .82rem; color: var(--text-muted); }
.token-actions { display: flex; gap: .75rem; margin-top: .25rem; }
.btn-primary { padding: .5rem 1.1rem; background: var(--primary); color: #fff; border: none; border-radius: 8px; cursor: pointer; font-size: .9rem; }
.btn-primary:disabled { opacity: .6; cursor: not-allowed; }
.btn-secondary { padding: .5rem 1.1rem; background: var(--bg); color: var(--text); border: 1px solid var(--border); border-radius: 8px; cursor: pointer; font-size: .9rem; }
.btn-copy { padding: .4rem .9rem; background: var(--primary-bg); color: var(--primary); border: none; border-radius: 8px; cursor: pointer; font-size: .85rem; }
.btn-danger { padding: .4rem .9rem; background: var(--danger-bg); color: var(--danger); border: none; border-radius: 8px; cursor: pointer; font-size: .85rem; }
</style>
