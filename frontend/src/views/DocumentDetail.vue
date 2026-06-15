<template>
  <div class="document-detail-page">
    <div class="container">
      <el-page-header @back="goBack" content="文书详情" class="page-header-nav">
        <template #content>
          <div class="header-content">
            <h2>{{ document?.title || '文书详情' }}</h2>
          </div>
        </template>
      </el-page-header>

      <el-row :gutter="24" v-loading="loading">
        <el-col :xs="24" :md="16">
          <el-card class="content-card">
            <template #header>
              <div class="card-header">
                <el-icon :size="18" color="#409eff"><Document /></el-icon>
                <span>文书内容</span>
                <div class="header-actions">
                  <el-button size="small" type="primary" @click="generatePdf">
                    <el-icon><Printer /></el-icon>
                    <span>生成PDF</span>
                  </el-button>
                </div>
              </div>
            </template>
            <div class="markdown-content" v-html="renderedContent"></div>
          </el-card>
        </el-col>

        <el-col :xs="24" :md="8">
          <el-card class="info-card">
            <template #header>
              <div class="card-header">
                <el-icon :size="18" color="#409eff"><InfoFilled /></el-icon>
                <span>文书信息</span>
              </div>
            </template>

            <div class="info-list">
              <div class="info-item">
                <span class="label">文书标题</span>
                <span class="value">{{ document?.title }}</span>
              </div>
              <div class="info-item">
                <span class="label">使用模板</span>
                <el-tag size="small">{{ document?.template_title }}</el-tag>
              </div>
              <div class="info-item">
                <span class="label">创建时间</span>
                <span class="value">{{ formatDate(document?.created_at) }}</span>
              </div>
              <div class="info-item">
                <span class="label">更新时间</span>
                <span class="value">{{ formatDate(document?.updated_at) }}</span>
              </div>
            </div>

            <div class="action-section">
              <el-button type="primary" @click="generatePdf" class="action-btn">
                <el-icon><Printer /></el-icon>
                <span>生成PDF</span>
              </el-button>
              <el-button @click="editDocument" class="action-btn">
                <el-icon><Edit /></el-icon>
                <span>编辑内容</span>
              </el-button>
              <el-button type="danger" @click="deleteDocument" class="action-btn">
                <el-icon><Delete /></el-icon>
                <span>删除文书</span>
              </el-button>
            </div>
          </el-card>

          <el-card class="fields-card">
            <template #header>
              <div class="card-header">
                <el-icon :size="18" color="#409eff"><List /></el-icon>
                <span>填写的字段</span>
              </div>
            </template>
            <div class="field-list">
              <div v-for="field in document?.template_fields" :key="field.name" class="field-item">
                <span class="field-label">{{ field.label }}</span>
                <span class="field-value">{{ document?.form_data?.[field.name] || '-' }}</span>
              </div>
            </div>
          </el-card>
        </el-col>
      </el-row>

      <el-dialog
        v-model="pdfDialogVisible"
        title="PDF预览"
        width="80%"
        :close-on-click-modal="false"
      >
        <div class="pdf-preview-container">
          <iframe v-if="pdfDataUrl" :src="pdfDataUrl" class="pdf-iframe" />
          <div v-else class="pdf-loading">
            <el-icon class="is-loading" :size="32"><Loading /></el-icon>
            <p>正在生成PDF...</p>
          </div>
        </div>
        <template #footer>
          <el-button @click="pdfDialogVisible = false">关闭</el-button>
          <el-button type="primary" @click="downloadPdf">下载PDF</el-button>
        </template>
      </el-dialog>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getDocumentDetail } from '@/api/document'
import { generatePdf as generatePdfApi, downloadPdf as downloadPdfApi } from '@/api/pdf'
import { useDocumentStore } from '@/stores/document'
import { ElMessage, ElMessageBox } from 'element-plus'
import { marked } from 'marked'

const route = useRoute()
const router = useRouter()
const documentStore = useDocumentStore()

const document = ref(null)
const loading = ref(false)
const pdfDialogVisible = ref(false)
const pdfDataUrl = ref('')

const renderedContent = computed(() => {
  if (!document.value?.content?.text) return ''
  return marked.parse(document.value.content.text)
})

const fetchDocument = async () => {
  const id = route.params.id
  if (!id) return
  
  loading.value = true
  try {
    const data = await getDocumentDetail(id)
    document.value = data
  } catch (error) {
    ElMessage.error('获取文书详情失败')
  } finally {
    loading.value = false
  }
}

const formatDate = (date) => {
  if (!date) return ''
  return new Date(date).toLocaleString('zh-CN')
}

const generatePdf = async () => {
  pdfDialogVisible.value = true
  pdfDataUrl.value = ''
  
  try {
    const data = await generatePdfApi({ documentId: route.params.id })
    pdfDataUrl.value = `data:application/pdf;base64,${data.base64}`
  } catch (error) {
    ElMessage.error('PDF生成失败')
    pdfDialogVisible.value = false
  }
}

const downloadPdf = () => {
  downloadPdfApi(route.params.id)
}

const editDocument = () => {
  if (document.value?.template_id) {
    router.push(`/fill/${document.value.template_id}`)
  }
}

const deleteDocument = () => {
  ElMessageBox.confirm('确定要删除这份文书吗？删除后无法恢复', '删除确认', {
    confirmButtonText: '确定删除',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(async () => {
    try {
      await documentStore.deleteDocument(route.params.id)
      ElMessage.success('删除成功')
      router.push('/documents')
    } catch (error) {
      ElMessage.error('删除失败')
    }
  }).catch(() => {})
}

const goBack = () => {
  router.back()
}

onMounted(() => {
  fetchDocument()
})
</script>

<style scoped>
.document-detail-page {
  min-height: calc(100vh - 128px);
}

.page-header-nav {
  margin-bottom: 20px;
}

.header-content h2 {
  margin: 0;
  font-size: 20px;
}

.content-card {
  margin-bottom: 20px;
}

.card-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  justify-content: space-between;
}

.card-header > div:first-child {
  display: flex;
  align-items: center;
  gap: 8px;
}

.header-actions {
  margin-left: auto;
}

.info-card {
  margin-bottom: 20px;
}

.info-list {
  padding: 10px 0;
}

.info-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 0;
  border-bottom: 1px solid #f0f0f0;
}

.info-item:last-child {
  border-bottom: none;
}

.info-item .label {
  color: #909399;
  font-size: 14px;
}

.info-item .value {
  color: #303133;
  font-size: 14px;
  max-width: 180px;
  text-align: right;
  word-break: break-all;
}

.action-section {
  padding-top: 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.action-btn {
  width: 100%;
}

.fields-card {
  margin-bottom: 20px;
}

.field-list {
  max-height: 400px;
  overflow-y: auto;
}

.field-item {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 10px 0;
  border-bottom: 1px solid #f0f0f0;
  gap: 12px;
}

.field-item:last-child {
  border-bottom: none;
}

.field-label {
  color: #606266;
  font-size: 13px;
  flex-shrink: 0;
}

.field-value {
  color: #303133;
  font-size: 13px;
  text-align: right;
  word-break: break-all;
  flex: 1;
}

.pdf-preview-container {
  min-height: 500px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.pdf-iframe {
  width: 100%;
  height: 600px;
  border: none;
  border-radius: 4px;
}

.pdf-loading {
  text-align: center;
  color: #909399;
}

.pdf-loading p {
  margin-top: 12px;
}
</style>
