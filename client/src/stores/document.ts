import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Document } from '@/types'
import { documentApi } from '@/api'

export const useDocumentStore = defineStore('document', () => {
  const documents = ref<Document[]>([])
  const sharedDocuments = ref<Document[]>([])
  const current = ref<Document | null>(null)

  async function fetchDocuments() {
    const res = await documentApi.list()
    documents.value = res.data.documents
    sharedDocuments.value = res.data.sharedDocuments ?? []
  }

  async function fetchDocument(id: number) {
    const res = await documentApi.get(id)
    current.value = res.data.document
    return { doc: current.value, isOwner: res.data.isOwner as boolean, collaborators: res.data.collaborators ?? [] }
  }

  async function createDocument(title = 'Untitled', content = '') {
    const res = await documentApi.create({ title, content })
    documents.value.unshift(res.data.document)
    current.value = res.data.document
    return current.value
  }

  async function saveDocument(id: number, data: { title?: string; content?: string }) {
    const res = await documentApi.update(id, data)
    current.value = res.data.document
    const idx = documents.value.findIndex(d => d.id === id)
    if (idx !== -1) documents.value[idx] = res.data.document
    const sidx = sharedDocuments.value.findIndex(d => d.id === id)
    if (sidx !== -1) sharedDocuments.value[sidx] = res.data.document
    return res.data.document as { updated_at: number }
  }

  async function removeDocument(id: number) {
    await documentApi.remove(id)
    documents.value = documents.value.filter(d => d.id !== id)
    if (current.value?.id === id) current.value = null
  }

  return { documents, sharedDocuments, current, fetchDocuments, fetchDocument, createDocument, saveDocument, removeDocument }
})
