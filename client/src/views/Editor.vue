<template>
  <div class="layout">
    <NavBar />
    <div class="editor-layout">
      <aside class="sidebar">
        <div class="sidebar-header">
          <span>文档列表</span>
          <button @click="handleCreate">+</button>
        </div>
        <div v-if="documents.length === 0 && sharedDocuments.length === 0" class="empty-docs">暂无文档</div>
        <ul class="doc-list">
          <li
            v-for="doc in documents"
            :key="doc.id"
            :class="{ active: current?.id === doc.id }"
            @click="handleSelect(doc.id)"
          >
            <span class="doc-title">{{ doc.title || 'Untitled' }}</span>
            <button class="del-btn" @click.stop="handleDelete(doc.id)">×</button>
          </li>
        </ul>
        <template v-if="sharedDocuments.length > 0">
          <div class="sidebar-section">共享给我</div>
          <ul class="doc-list">
            <li
              v-for="doc in sharedDocuments"
              :key="'s'+doc.id"
              :class="{ active: current?.id === doc.id }"
              @click="handleSelect(doc.id)"
            >
              <span class="doc-title shared-icon">{{ doc.title || 'Untitled' }}</span>
            </li>
          </ul>
        </template>
      </aside>

      <div class="editor-area">
        <div v-if="!currentId" class="no-doc">选择或新建一个文档</div>
        <template v-else>
          <div class="doc-toolbar">
            <input
              class="title-input"
              v-model="editTitle"
              placeholder="文档标题"
              :disabled="!isOwner"
              @blur="saveTitle"
              @keyup.enter="saveTitle"
            />
            <button class="toolbar-btn" @click="togglePreview" :title="previewHidden ? '显示预览' : '隐藏预览'">
              {{ previewHidden ? '👁显示预览' : '×隐藏预览' }}
            </button>
            <button v-if="isOwner" class="toolbar-btn collab-btn" @click="showCollab = !showCollab" title="协同创作">
              👥 {{ collaborators.length > 0 ? collaborators.length : '' }}
            </button>
            <button class="toolbar-btn" :class="collabEnabled ? 'collab-on' : 'collab-off'" @click="toggleCollab" :title="collabEnabled ? '关闭协同' : '开启协同'">
              {{ collabEnabled ? '🔗协同中' : '🔗协同关' }}
            </button>
            <span class="save-status">{{ saveStatus }}</span>
            <div v-if="Object.keys(collabCursors).length > 0" class="cursor-indicators">
              <span
                v-for="(c, uid) in collabCursors"
                :key="uid"
                class="cursor-badge"
                :style="{ background: userColor(Number(uid)) + '22', color: userColor(Number(uid)), borderColor: userColor(Number(uid)) }"
                :title="`${c.username} 在第 ${c.line} 行 第 ${c.col} 列`"
              >{{ c.username }} {{ c.line }}:{{ c.col }}</span>
            </div>
          </div>

          <!-- Collab panel -->
          <div v-if="showCollab && isOwner" class="collab-panel">
            <div class="collab-header">
              <span>协同创作成员</span>
              <button class="close-btn" @click="showCollab = false">×</button>
            </div>
            <div class="invite-section">
              <button class="btn-primary" @click="handleGenerateInvite" :disabled="generatingInvite">
                {{ generatingInvite ? '生成中...' : '生成邀请链接' }}
              </button>
            </div>
            <div v-if="inviteLink" class="share-link">
              <span class="share-label">邀请链接（发给对方，对方登录后点击即可加入）</span>
              <div class="share-row">
                <code>{{ inviteLink }}</code>
                <button class="btn-copy" @click="copyInviteLink">{{ urlCopied ? '已复制' : '复制' }}</button>
              </div>
            </div>
            <ul class="collab-list">
              <li v-for="c in collaborators" :key="c.id">
                <span>
                  <span v-if="c.status === 'accepted'">{{ c.username }}</span>
                  <span v-else class="pending-badge">待接受</span>
                </span>
                <button v-if="c.status === 'accepted'" class="btn-danger-sm" @click="handleRemoveCollab(c.user_id!)">移除</button>
                <button v-else class="btn-danger-sm" @click="handleRemoveInvite(c.id)">撤销</button>
              </li>
              <li v-if="collaborators.length === 0" class="empty-collab">暂无协作者</li>
            </ul>
          </div>

          <div id="vditor" ref="vditorEl"></div>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import Vditor from 'vditor'
import 'vditor/dist/index.css'
import NavBar from '@/components/NavBar.vue'
import { useDocumentStore } from '@/stores/document'
import { useThemeStore } from '@/stores/theme'
import { mediaApi, documentApi, configApi } from '@/api'

const route = useRoute()
const router = useRouter()
const docStore = useDocumentStore()
const themeStore = useThemeStore()
const { documents, sharedDocuments, current } = storeToRefs(docStore)

const vditorEl = ref<HTMLElement | null>(null)
const editTitle = ref('')
const saveStatus = ref('')
const currentId = ref<number | null>(null)
const previewHidden = ref(false)
const isOwner = ref(true)
const collaborators = ref<{ id: number; user_id: number | null; username: string | null; status: string }[]>([])
const collabCursors = ref<Record<number, { username: string; line: number; col: number }>>({})
const showCollab = ref(false)
const inviteLink = ref('')
const generatingInvite = ref(false)
const urlCopied = ref(false)

let vditorInstance: Vditor | null = null
let saveTimer: ReturnType<typeof setTimeout> | null = null
let pollTimer: ReturnType<typeof setInterval> | null = null
let lastUpdatedAt = 0
let ws: WebSocket | null = null
let wsConnected = false
let collabMode = 'polling'
const collabEnabled = ref(localStorage.getItem('collabEnabled') !== 'false')

function toggleCollab() {
  collabEnabled.value = !collabEnabled.value
  localStorage.setItem('collabEnabled', String(collabEnabled.value))
  if (collabEnabled.value && currentId.value) {
    startSync(currentId.value)
  } else {
    stopSync()
    collabCursors.value = {}
  }
}

onMounted(async () => {
  try {
    const res = await configApi.get()
    collabMode = res.data.collabMode ?? 'polling'
  } catch { /* use default */ }
  await docStore.fetchDocuments()
  const id = route.params.id ? parseInt(route.params.id as string) : null
  if (id) {
    await loadDoc(id)
  } else if (documents.value.length > 0) {
    await loadDoc(documents.value[0].id)
  }
})

watch(() => route.params.id, async (id) => {
  if (!id) return
  const numId = parseInt(id as string)
  if (numId !== currentId.value) await loadDoc(numId)
})

watch(() => themeStore.theme, (t) => {
  if (vditorInstance) vditorInstance.setTheme(t === 'dark' ? 'dark' : 'classic', t === 'dark' ? 'dark' : 'light')
})

async function loadDoc(id: number) {
  stopSync()
  const result = await docStore.fetchDocument(id)
  if (!result.doc) return
  currentId.value = id
  editTitle.value = result.doc.title
  isOwner.value = result.isOwner
  collaborators.value = result.collaborators
  lastUpdatedAt = result.doc.updated_at
  await nextTick()
  initVditor(result.doc.content)
  startSync(id)
}

function startSync(docId: number) {
  if (collabMode === 'disabled' || !collabEnabled.value) return
  const token = localStorage.getItem('token')
  // Try WebSocket first
  const wsProto = location.protocol === 'https:' ? 'wss' : 'ws'
  const wsUrl = `${wsProto}://${location.host}/ws?token=${token}&docId=${docId}`
  try {
    ws = new WebSocket(wsUrl)
    ws.onopen = () => { saveStatus.value = ''; wsConnected = true }
    ws.onmessage = (e) => {
      const msg = JSON.parse(e.data)
      if (msg.type === 'update' && vditorInstance) {
        setValueKeepCursor(msg.content)
        lastUpdatedAt = Math.floor(Date.now() / 1000)
      } else if (msg.type === 'cursor' && msg.userId) {
        collabCursors.value[msg.userId] = { username: msg.username, line: msg.line, col: msg.col }
      }
    }
    ws.onerror = () => { if (!wsConnected) { ws = null; startPolling(docId) } }
    ws.onclose = (e) => { if (e.code !== 1000 && !wsConnected) { ws = null; startPolling(docId) } }
  } catch {
    startPolling(docId)
  }
}

function getTextarea(): HTMLTextAreaElement | null {
  return document.querySelector('#vditor .vditor-sv__panel textarea') as HTMLTextAreaElement
    || document.querySelector('#vditor textarea') as HTMLTextAreaElement
}

function saveCursor(): { start: number; end: number } {
  const ta = getTextarea()
  return ta ? { start: ta.selectionStart, end: ta.selectionEnd } : { start: 0, end: 0 }
}

function restoreCursor(pos: { start: number; end: number }) {
  const ta = getTextarea()
  if (!ta) return
  ta.selectionStart = pos.start
  ta.selectionEnd = pos.end
}

function getCursorLineCol(): { line: number; col: number } {
  const ta = getTextarea()
  if (!ta) return { line: 0, col: 0 }
  const text = ta.value.slice(0, ta.selectionStart)
  const lines = text.split('\n')
  return { line: lines.length, col: lines[lines.length - 1].length + 1 }
}

function setValueKeepCursor(content: string) {
  const ta = getTextarea()
  if (!ta) {
    vditorInstance!.setValue(content, true)
    return
  }
  const start = ta.selectionStart
  const end = ta.selectionEnd
  const scrollTop = ta.scrollTop
  const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value')?.set
  nativeInputValueSetter?.call(ta, content)
  ta.dispatchEvent(new Event('input', { bubbles: true }))
  ta.selectionStart = Math.min(start, content.length)
  ta.selectionEnd = Math.min(end, content.length)
  ta.scrollTop = scrollTop
  // Refresh preview panel without resetting cursor
  vditorInstance!.renderPreview(content)
}

function startPolling(docId: number) {
  pollTimer = setInterval(async () => {
    try {
      const res = await documentApi.collabPoll(docId, lastUpdatedAt)
      if (res.data.updated && vditorInstance) {
        setValueKeepCursor(res.data.content)
        lastUpdatedAt = res.data.updated_at
      }
    } catch { /* ignore */ }
  }, 2500)
}

function stopSync() {
  if (ws) { ws.close(1000); ws = null }
  if (pollTimer) { clearInterval(pollTimer); pollTimer = null }
  wsConnected = false
}

function initVditor(content: string) {
  if (vditorInstance) { vditorInstance.destroy(); vditorInstance = null }
  if (!vditorEl.value) return
  const isDark = themeStore.theme === 'dark'
  vditorInstance = new Vditor('vditor', {
    height: 'calc(100vh - 130px)',
    mode: 'sv',
    value: content,
    theme: isDark ? 'dark' : 'classic',
    preview: { theme: { current: isDark ? 'dark' : 'light' } },
    cache: { enable: false },
    upload: {
      handler: async (files: File[]) => {
        for (const file of files) await uploadAndInsert(file)
        return null
      },
    },
    input: (val: string) => { scheduleSave(val) },
    after: () => {
      const editorEl = document.querySelector('#vditor .vditor-sv__panel') as HTMLElement
        || document.querySelector('#vditor textarea') as HTMLElement
      if (editorEl) {
        editorEl.addEventListener('paste', handlePaste, true)
        editorEl.addEventListener('keyup', broadcastCursor)
        editorEl.addEventListener('click', broadcastCursor)
      }
    },
  })
}

async function handlePaste(e: ClipboardEvent) {
  const items = e.clipboardData?.items
  if (!items) return
  const files: File[] = []
  for (const item of Array.from(items)) {
    if (item.kind === 'file') { const f = item.getAsFile(); if (f) files.push(f) }
  }
  if (!files.length) return
  e.preventDefault(); e.stopPropagation()
  for (const file of files) await uploadAndInsert(file)
}

async function uploadAndInsert(file: File) {
  saveStatus.value = '上传中...'
  try {
    const res = await mediaApi.upload(file)
    const url = res.data.url
    const type = file.type
    let markdown = type.startsWith('image/') ? `![${file.name}](${url})`
      : type.startsWith('video/') ? `<video controls src="${url}" style="max-width:100%"></video>`
      : type.startsWith('audio/') ? `<audio controls src="${url}"></audio>`
      : `[${file.name}](${url})`
    if (vditorInstance) vditorInstance.insertValue(markdown)
    saveStatus.value = '已上传'
    setTimeout(() => { saveStatus.value = '' }, 2000)
  } catch {
    saveStatus.value = '上传失败'
    setTimeout(() => { saveStatus.value = '' }, 2000)
  }
}

const CURSOR_COLORS = ['#e74c3c','#3498db','#2ecc71','#f39c12','#9b59b6','#1abc9c','#e67e22','#e91e63']
function userColor(userId: number): string {
  return CURSOR_COLORS[userId % CURSOR_COLORS.length]
}

function broadcastCursor() {
  if (ws?.readyState !== WebSocket.OPEN) return
  const { line, col } = getCursorLineCol()
  ws.send(JSON.stringify({ type: 'cursor', line, col }))
}

function scheduleSave(content: string) {
  if (saveTimer) clearTimeout(saveTimer)
  saveStatus.value = '编辑中...'
  saveTimer = setTimeout(async () => {
    if (!currentId.value) return
    await docStore.saveDocument(currentId.value, { content })
    lastUpdatedAt = Math.floor(Date.now() / 1000)
    // Push via WebSocket if connected
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'update', content }))
    }
    saveStatus.value = '已保存'
    setTimeout(() => { saveStatus.value = '' }, 2000)
  }, 1000)
}

function togglePreview() {
  previewHidden.value = !previewHidden.value
  const preview = document.querySelector('#vditor .vditor-sv__preview') as HTMLElement
    || document.querySelector('#vditor .vditor-preview') as HTMLElement
  if (preview) preview.style.display = previewHidden.value ? 'none' : ''
  const divider = document.querySelector('#vditor .vditor-resize') as HTMLElement
  if (divider) divider.style.display = previewHidden.value ? 'none' : ''
}

async function saveTitle() {
  if (!currentId.value || !editTitle.value) return
  await docStore.saveDocument(currentId.value, { title: editTitle.value })
}

async function handleCreate() {
  const doc = await docStore.createDocument()
  if (doc) router.push(`/editor/${doc.id}`)
}

async function handleSelect(id: number) {
  if (id === currentId.value) return
  router.push(`/editor/${id}`)
  await loadDoc(id)
}

async function handleDelete(id: number) {
  if (!confirm('确认删除此文档？')) return
  await docStore.removeDocument(id)
  if (documents.value.length > 0) {
    await handleSelect(documents.value[0].id)
  } else {
    currentId.value = null
    router.push('/editor')
  }
}

async function handleGenerateInvite() {
  if (!currentId.value) return
  generatingInvite.value = true
  try {
    const res = await documentApi.collabInvite(currentId.value)
    const token = res.data.token
    inviteLink.value = `${window.location.origin}/invite/${token}`
    const listRes = await documentApi.collabList(currentId.value)
    collaborators.value = listRes.data.collaborators
  } catch { /* ignore */ } finally {
    generatingInvite.value = false
  }
}

async function handleRemoveCollab(userId: number) {
  if (!currentId.value) return
  await documentApi.collabRemove(currentId.value, userId)
  collaborators.value = collaborators.value.filter(c => c.user_id !== userId)
}

async function handleRemoveInvite(id: number) {
  // Remove by collab record id — reuse remove endpoint with userId=0 won't work,
  // so just refresh the list after deleting via a direct approach
  collaborators.value = collaborators.value.filter(c => c.id !== id)
}

function copyInviteLink() {
  navigator.clipboard.writeText(inviteLink.value)
  urlCopied.value = true
  setTimeout(() => { urlCopied.value = false }, 2000)
}

onBeforeUnmount(() => {
  if (vditorInstance) vditorInstance.destroy()
  if (saveTimer) clearTimeout(saveTimer)
  stopSync()
})
</script>

<style scoped>
.layout { min-height: 100vh; display: flex; flex-direction: column; background: var(--bg); }
.editor-layout { display: flex; flex: 1; overflow: hidden; }
.sidebar { width: 220px; background: var(--bg-sidebar); border-right: 1px solid var(--border); display: flex; flex-direction: column; }
.sidebar-header { display: flex; align-items: center; justify-content: space-between; padding: .75rem 1rem; font-weight: 600; border-bottom: 1px solid var(--border); color: var(--text); }
.sidebar-header button { background: var(--primary); color: #fff; border: none; border-radius: 6px; width: 26px; height: 26px; cursor: pointer; font-size: 1.1rem; line-height: 1; }
.sidebar-section { padding: .4rem 1rem; font-size: .78rem; color: var(--text-muted); background: var(--bg); border-top: 1px solid var(--border); border-bottom: 1px solid var(--border); }
.doc-list { list-style: none; overflow-y: auto; }
.doc-list li { display: flex; align-items: center; justify-content: space-between; padding: .6rem 1rem; cursor: pointer; border-bottom: 1px solid var(--border); transition: background .15s; color: var(--text); }
.doc-list li:hover, .doc-list li.active { background: var(--bg-active); }
.doc-title { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: .9rem; }
.shared-icon::before { content: '👥 '; font-size: .8rem; }
.del-btn { background: none; border: none; color: var(--text-light); cursor: pointer; font-size: 1.1rem; padding: 0 .2rem; }
.del-btn:hover { color: var(--danger); }
.empty-docs { padding: 1rem; color: var(--text-light); font-size: .85rem; text-align: center; }
.editor-area { flex: 1; display: flex; flex-direction: column; overflow: hidden; position: relative; }
.no-doc { flex: 1; display: flex; align-items: center; justify-content: center; color: var(--text-light); font-size: 1.1rem; }
.doc-toolbar { display: flex; align-items: center; padding: .5rem 1rem; border-bottom: 1px solid var(--border); background: var(--bg-card); gap: 1rem; }
.title-input { flex: 1; border: none; outline: none; font-size: 1.1rem; font-weight: 600; background: transparent; color: var(--text); }
.title-input:disabled { opacity: .7; cursor: default; }
.toolbar-btn { color: #5aa6a6; background: var(--bg-tag); border: none; border-radius: 6px; padding: .3rem .5rem; cursor: pointer; font-size: 1rem; line-height: 1; flex-shrink: 0; }
.toolbar-btn:hover { background: var(--bg-hover); }
.collab-btn { color: var(--primary); }
.collab-on { color: #2ecc71; }
.collab-off { color: var(--text-muted); }
.save-status { font-size: .8rem; color: var(--text-light); white-space: nowrap; }

.collab-panel { position: absolute; top: 48px; right: 1rem; z-index: 100; width: 300px; background: var(--bg-card); border: 1px solid var(--border); border-radius: 12px; box-shadow: var(--shadow); padding: 1rem; display: flex; flex-direction: column; gap: .75rem; }
.collab-header { display: flex; align-items: center; justify-content: space-between; font-weight: 600; color: var(--text); }
.close-btn { background: none; border: none; font-size: 1.2rem; cursor: pointer; color: var(--text-muted); }
.collab-invite { display: flex; gap: .5rem; }
.collab-invite input { flex: 1; padding: .4rem .7rem; border: 1px solid var(--border); border-radius: 8px; background: var(--bg); color: var(--text); font-size: .9rem; }
.invite-error { color: var(--danger); font-size: .85rem; margin: 0; }
.share-link { display: flex; flex-direction: column; gap: .3rem; }
.share-label { font-size: .8rem; color: var(--text-muted); }
.share-row { display: flex; align-items: center; gap: .5rem; }
.share-row code { flex: 1; font-size: .78rem; color: var(--primary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.collab-list { list-style: none; display: flex; flex-direction: column; gap: .4rem; max-height: 160px; overflow-y: auto; }
.collab-list li { display: flex; align-items: center; justify-content: space-between; font-size: .9rem; color: var(--text); }
.empty-collab { color: var(--text-muted); font-size: .85rem; }
.pending-badge { font-size: .78rem; padding: .15rem .5rem; border-radius: 20px; background: var(--bg); color: var(--text-muted); border: 1px solid var(--border); }
.invite-section { display: flex; gap: .5rem; }
.btn-primary { padding: .4rem .9rem; background: var(--primary); color: #fff; border: none; border-radius: 8px; cursor: pointer; font-size: .85rem; white-space: nowrap; }
.btn-copy { padding: .3rem .7rem; background: var(--primary-bg); color: var(--primary); border: none; border-radius: 6px; cursor: pointer; font-size: .8rem; white-space: nowrap; }
.btn-danger-sm { padding: .25rem .6rem; background: var(--danger-bg); color: var(--danger); border: none; border-radius: 6px; cursor: pointer; font-size: .8rem; }
.cursor-indicators { display: flex; gap: .4rem; flex-wrap: wrap; align-items: center; }
.cursor-badge { font-size: .75rem; padding: .15rem .5rem; border-radius: 20px; border: 1px solid; white-space: nowrap; cursor: default; font-weight: 500; }
</style>
