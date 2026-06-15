import { defineStore } from 'pinia'
import { getTemplateList, getTemplateDetail } from '@/api/template'

export const useTemplateStore = defineStore('template', {
  state: () => ({
    templateList: [],
    currentTemplate: null,
    loading: false
  }),

  actions: {
    async fetchTemplateList(params) {
      this.loading = true
      try {
        const data = await getTemplateList(params)
        this.templateList = data
        return data
      } finally {
        this.loading = false
      }
    },

    async fetchTemplateDetail(id) {
      this.loading = true
      try {
        const data = await getTemplateDetail(id)
        this.currentTemplate = data
        return data
      } finally {
        this.loading = false
      }
    },

    clearCurrentTemplate() {
      this.currentTemplate = null
    }
  }
})
