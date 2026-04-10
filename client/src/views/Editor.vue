<template>
  <div class="layout">
    <NavBar />
    <div class="editor-layout">
      <aside class="sidebar">
        <div class="sidebar-header">
          <span>文档列表</span>
          <button @click="handleCreate">+</button>
        </div>
        <div v-if="documents.length === 0" class="empty-docs">暂无文档</div>
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
      </aside>

      <div class="editor-area">
        <div v-if="!currentId" class="no-doc">选择或新建一个文档</div>
        <template v-else>
          <div class="doc-toolbar">
            <input
              class="title-input"
              v-model="editTitle"
              placeholder="文档标题"
              @blur="saveTitle"
              @keyup.enter="saveTitle"
            />
            <button class="toolbar-btn" @click="togglePreview" :title="previewHidden ? '显示预览' : '隐藏预览'">
              {{ previewHidden ? '👁显示预览' : '×隐藏预览' }}
            </button>
            <span class="save-status">{{ saveStatus }}</span>
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
import { mediaApi } from '@/api'

const route = useRoute()
const router = useRouter()
const docStore = useDocumentStore()
const themeStore = useThemeStore()
const { documents, current } = storeToRefs(docStore)

const vditorEl = ref<HTMLElement | null>(null)
const editTitle = ref('')
const saveStatus = ref('')
const currentId = ref<number | null>(null)
const previewHidden = ref(false)
let vditorInstance: Vditor | null = null
let saveTimer: ReturnType<typeof setTimeout> | null = null

onMounted(async () => {
  await docStore.fetchDocuments()
  const id = route.params.id ? parseInt(route.params.id as string) : null
  if (id) {
    await loadDoc(id)
  } else if (documents.value.length > 0) {
    await loadDoc(documents.value[0].id)
  }
})

// Only reinit editor when the document ID changes (not on every save)
watch(() => route.params.id, async (id) => {
  if (!id) return
  const numId = parseInt(id as string)
  if (numId !== currentId.value) {
    await loadDoc(numId)
  }
})

watch(() => themeStore.theme, (t) => {
  if (vditorInstance) vditorInstance.setTheme(t === 'dark' ? 'dark' : 'classic', t === 'dark' ? 'dark' : 'light')
})

async function loadDoc(id: number) {
  const doc = await docStore.fetchDocument(id)
  if (!doc) return
  currentId.value = id
  editTitle.value = doc.title
  await nextTick()
  initVditor(doc.content)
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
        for (const file of files) {
          await uploadAndInsert(file)
        }
        return null
      },
    },
    input: (val: string) => { scheduleSave(val) },
    after: () => {
      // Attach clipboard paste handler for non-image files (Vditor handles images natively)
      const editorEl = document.querySelector('#vditor .vditor-sv__panel') as HTMLElement
        || document.querySelector('#vditor .vditor-ir__panel') as HTMLElement
        || document.querySelector('#vditor textarea') as HTMLElement
      if (editorEl) {
        editorEl.addEventListener('paste', handlePaste, true)
      }
    },
  })
}

async function handlePaste(e: ClipboardEvent) {
  const items = e.clipboardData?.items
  if (!items) return
  const files: File[] = []
  for (const item of Array.from(items)) {
    if (item.kind === 'file') {
      const file = item.getAsFile()
      if (file) files.push(file)
    }
  }
  if (!files.length) return
  e.preventDefault()
  e.stopPropagation()
  for (const file of files) {
    await uploadAndInsert(file)
  }
}

async function uploadAndInsert(file: File) {
  saveStatus.value = '上传中...'
  try {
    const res = await mediaApi.upload(file)
    const url = res.data.url
    const type = file.type
    let markdown = ''
    if (type.startsWith('image/')) {
      markdown = `![${file.name}](${url})`
    } else if (type.startsWith('video/')) {
      markdown = `<video controls src="${url}" style="max-width:100%"></video>`
    } else if (type.startsWith('audio/')) {
      markdown = `<audio controls src="${url}"></audio>`
    } else {
      markdown = `[${file.name}](${url})`
    }
    if (vditorInstance) {
      vditorInstance.insertValue(markdown)
    }
    saveStatus.value = '已上传'
    setTimeout(() => { saveStatus.value = '' }, 2000)
  } catch {
    saveStatus.value = '上传失败'
    setTimeout(() => { saveStatus.value = '' }, 2000)
  }
}

function scheduleSave(content: string) {
  if (saveTimer) clearTimeout(saveTimer)
  saveStatus.value = '编辑中...'
  saveTimer = setTimeout(async () => {
    if (!currentId.value) return
    // Save without updating current in store to avoid triggering watch
    await docStore.saveDocument(currentId.value, { content })
    saveStatus.value = '已保存'
    setTimeout(() => { saveStatus.value = '' }, 2000)
  }, 1000)
}

function togglePreview() {
  previewHidden.value = !previewHidden.value
  const preview = document.querySelector('#vditor .vditor-sv__preview') as HTMLElement
    || document.querySelector('#vditor .vditor-preview') as HTMLElement
  if (preview) {
    preview.style.display = previewHidden.value ? 'none' : ''
  }
  // Also hide the split divider
  const divider = document.querySelector('#vditor .vditor-resize') as HTMLElement
  if (divider) divider.style.display = previewHidden.value ? 'none' : ''
}

async function saveTitle() {
  if (!currentId.value || !editTitle.value) return
  await docStore.saveDocument(currentId.value, { title: editTitle.value })
}

async function handleCreate() {
  const doc = await docStore.createDocument()
  if (doc) {
    router.push(`/editor/${doc.id}`)
  }
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

onBeforeUnmount(() => {
  if (vditorInstance) vditorInstance.destroy()
  if (saveTimer) clearTimeout(saveTimer)
})
</script>

<style scoped>
.layout { min-height: 100vh; display: flex; flex-direction: column; background: var(--bg); }
.editor-layout { display: flex; flex: 1; overflow: hidden; }
.sidebar { width: 220px; background: var(--bg-sidebar); border-right: 1px solid var(--border); display: flex; flex-direction: column; }
.sidebar-header { display: flex; align-items: center; justify-content: space-between; padding: .75rem 1rem; font-weight: 600; border-bottom: 1px solid var(--border); color: var(--text); }
.sidebar-header button { background: var(--primary); color: #fff; border: none; border-radius: 6px; width: 26px; height: 26px; cursor: pointer; font-size: 1.1rem; line-height: 1; }
.doc-list { list-style: none; overflow-y: auto; flex: 1; }
.doc-list li { display: flex; align-items: center; justify-content: space-between; padding: .6rem 1rem; cursor: pointer; border-bottom: 1px solid var(--border); transition: background .15s; color: var(--text); }
.doc-list li:hover, .doc-list li.active { background: var(--bg-active); }
.doc-title { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: .9rem; }
.del-btn { background: none; border: none; color: var(--text-light); cursor: pointer; font-size: 1.1rem; padding: 0 .2rem; }
.del-btn:hover { color: var(--danger); }
.empty-docs { padding: 1rem; color: var(--text-light); font-size: .85rem; text-align: center; }
.editor-area { flex: 1; display: flex; flex-direction: column; overflow: hidden; }
.no-doc { flex: 1; display: flex; align-items: center; justify-content: center; color: var(--text-light); font-size: 1.1rem; }
.doc-toolbar { display: flex; align-items: center; padding: .5rem 1rem; border-bottom: 1px solid var(--border); background: var(--bg-card); gap: 1rem; }
.title-input { flex: 1; border: none; outline: none; font-size: 1.1rem; font-weight: 600; background: transparent; color: var(--text); }
.toolbar-btn { color: #5aa6a6; background: var(--bg-tag); border: none; border-radius: 6px; padding: .3rem .5rem; cursor: pointer; font-size: 1rem; line-height: 1; flex-shrink: 0; }
.toolbar-btn:hover { background: var(--bg-hover); }
.save-status { font-size: .8rem; color: var(--text-light); white-space: nowrap; }
</style>
