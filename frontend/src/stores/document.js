import { defineStore } from 'pinia'
import { getDocumentList, getDocumentDetail, createDocument, deleteDocument } from '@/api/document'

export const useDocumentStore = defineStore('document', {
  state: () => ({
    documentList: [],
    currentDocument: null,
    loading: false
  }),

  actions: {
    async fetchDocumentList() {
      this.loading = true
      try {
        const data = await getDocumentList()
        this.documentList = data
        return data
      } finally {
        this.loading = false
      }
    },

    async fetchDocumentDetail(id) {
      this.loading = true
      try {
        const data = await getDocumentDetail(id)
        this.currentDocument = data
        return data
      } finally {
        this.loading = false
      }
    },

    async createDocument(data) {
      this.loading = true
      try {
        const result = await createDocument(data)
        await this.fetchDocumentList()
        return result
      } finally {
        this.loading = false
      }
    },

    async deleteDocument(id) {
      this.loading = true
      try {
        await deleteDocument(id)
        await this.fetchDocumentList()
      } finally {
        this.loading = false
      }
    },

    clearCurrentDocument() {
      this.currentDocument = null
    }
  }
})
