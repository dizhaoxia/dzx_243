<template>
  <div class="document-detail-page">
    <div class="container">
      <el-page-header @back="goBack" content="文书详情" class="page-header-nav">
        <template #content>
          <div class="header-content">
            <h2>{{ document?.title || '文书详情' }}</h2>
            <el-tag v-if="versionList.length" type="success" effect="plain" size="small">
              已签署 {{ versionList.length }} 次
            </el-tag>
          </div>
        </template>
      </el-page-header>

      <el-row :gutter="24" v-loading="loading">
        <el-col :xs="24" :md="16">
          <el-card class="content-card">
            <template #header>
              <div class="card-header">
                <div class="header-left">
                  <el-icon :size="18" color="#409eff"><Document /></el-icon>
                  <span>文书内容</span>
                </div>
                <div class="header-actions">
                  <el-button size="small" type="success" plain @click="goToSign">
                    <el-icon><EditPen /></el-icon>
                    <span>签署文档</span>
                  </el-button>
                  <el-button size="small" type="primary" @click="generatePdf">
                    <el-icon><Printer /></el-icon>
                    <span>生成PDF</span>
                  </el-button>
                </div>
              </div>
            </template>
            <div class="markdown-content" v-html="renderedContent"></div>
          </el-card>

          <el-card v-if="versionList.length" class="versions-card" shadow="never">
            <template #header>
              <div class="card-header">
                <div class="header-left">
                  <el-icon :size="18" color="#67c23a"><Tickets /></el-icon>
                  <span>签署历史 / 版本记录</span>
                  <el-tag type="success" effect="plain" size="small" style="margin-left: 8px">
                    {{ versionList.length }} 个版本
                  </el-tag>
                </div>
              </div>
            </template>

            <el-timeline>
              <el-timeline-item
                v-for="(ver, idx) in versionList"
                :key="ver.id"
                :timestamp="formatDate(ver.created_at)"
                placement="top"
                :type="idx === 0 ? 'success' : 'primary'"
              >
                <div class="version-item">
                  <div class="ver-header">
                    <div class="ver-title-row">
                      <el-tag type="warning" effect="dark" size="small">
                        v{{ ver.version_number }}
                      </el-tag>
                      <span class="ver-title">{{ ver.title || '签署版本' }}</span>
                      <el-tag v-if="ver.sign_date" size="small" type="info" effect="plain">
                        签署日期：{{ ver.sign_date }}
                      </el-tag>
                    </div>
                    <p v-if="ver.remark" class="ver-remark">{{ ver.remark }}</p>
                  </div>
                  <div class="ver-signers" v-if="ver.signatures && ver.signatures.length">
                    <div
                      v-for="(sig, sIdx) in ver.signatures"
                      :key="sIdx"
                      class="signer-box"
                    >
                      <div class="signer-meta">
                        <el-tag type="warning" effect="plain" size="small">{{ sig.role }}</el-tag>
                        <span class="signer-name">{{ sig.name }}</span>
                        <span v-if="sig.date" class="signer-date">{{ sig.date }}</span>
                      </div>
                      <div class="signer-sig">
                        <img
                          v-if="sig.signatureImage"
                          :src="sig.signatureImage.startsWith('data:') ? sig.signatureImage : `data:image/png;base64,${sig.signatureImage}`"
                          class="sig-img"
                        />
                      </div>
                    </div>
                  </div>
                  <div class="ver-actions">
                    <el-button size="small" type="primary" plain @click="previewVersion(ver)">
                      <el-icon><View /></el-icon>
                      预览PDF
                    </el-button>
                    <el-button size="small" type="success" plain @click="downloadVersion(ver)">
                      <el-icon><Download /></el-icon>
                      下载
                    </el-button>
                    <el-button
                      size="small"
                      type="danger"
                      plain
                      @click="deleteVersion(ver)"
                    >
                      <el-icon><Delete /></el-icon>
                      删除
                    </el-button>
                  </div>
                </div>
              </el-timeline-item>
            </el-timeline>
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
                <span class="label">签署次数</span>
                <span class="value">
                  <el-tag type="success" effect="plain">{{ versionList.length }}</el-tag>
                </span>
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
              <el-button type="success" @click="goToSign" class="action-btn">
                <el-icon><EditPen /></el-icon>
                <span>签署文档</span>
              </el-button>
              <el-button type="primary" @click="generatePdf" class="action-btn">
                <el-icon><Printer /></el-icon>
                <span>生成PDF</span>
              </el-button>
              <el-button @click="editDocument" class="action-btn">
                <el-icon><Edit /></el-icon>
                <span>重新生成</span>
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
              <div v-for="field in displayFields" :key="field.name" class="field-item">
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
import {
  getVersionList,
  downloadVersionPdf,
  deleteVersion as deleteVersionApi
} from '@/api/version'
import { useDocumentStore } from '@/stores/document'
import { ElMessage, ElMessageBox } from 'element-plus'
import { marked } from 'marked'
import {
  Document, EditPen, Printer, Tickets, InfoFilled, List,
  View, Download, Delete, Edit, Loading
} from '@element-plus/icons-vue'

const route = useRoute()
const router = useRouter()
const documentStore = useDocumentStore()

const document = ref(null)
const loading = ref(false)
const versionList = ref([])
const pdfDialogVisible = ref(false)
const pdfDataUrl = ref('')

const renderedContent = computed(() => {
  if (!document.value?.content) return ''
  const text = typeof document.value.content === 'string'
    ? document.value.content
    : (document.value.content.text || JSON.stringify(document.value.content))
  return marked.parse(text)
})

const displayFields = computed(() => {
  const fields = document.value?.template_fields || []
  return fields.filter(f => f.name !== '__applied_clauses__')
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

const fetchVersions = async () => {
  const id = route.params.id
  if (!id) return
  try {
    const data = await getVersionList(id)
    versionList.value = data || []
  } catch (e) {
    console.warn('获取版本列表失败', e)
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

const goToSign = () => {
  router.push(`/sign/${route.params.id}`)
}

const editDocument = () => {
  if (document.value?.template_id) {
    router.push(`/fill/${document.value.template_id}`)
  }
}

const deleteDocument = () => {
  ElMessageBox.confirm('确定要删除这份文书吗？删除后版本记录也将一并删除，无法恢复', '删除确认', {
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

const previewVersion = async (ver) => {
  pdfDialogVisible.value = true
  pdfDataUrl.value = ''
  try {
    if (ver.pdf_base64) {
      pdfDataUrl.value = `data:application/pdf;base64,${ver.pdf_base64}`
      return
    }
    const { generateSignedPdf } = await import('@/api/pdf')
    const res = await generateSignedPdf({
      content: typeof ver.content === 'string' ? ver.content : (ver.content?.text || ''),
      title: ver.title || '文书',
      signatures: ver.signatures || [],
      signDate: ver.sign_date
    })
    pdfDataUrl.value = `data:application/pdf;base64,${res.base64}`
  } catch (e) {
    ElMessage.error('预览失败')
    pdfDialogVisible.value = false
  }
}

const downloadVersion = (ver) => {
  if (ver.id) {
    downloadVersionPdf(ver.id)
  }
}

const deleteVersion = (ver) => {
  ElMessageBox.confirm(`确定删除 v${ver.version_number} 版本吗？`, '删除确认', {
    type: 'warning'
  }).then(async () => {
    try {
      await deleteVersionApi(ver.id)
      ElMessage.success('已删除版本')
      fetchVersions()
    } catch (e) {
      ElMessage.error('删除失败')
    }
  }).catch(() => {})
}

const goBack = () => {
  router.back()
}

onMounted(async () => {
  await fetchDocument()
  fetchVersions()
})
</script>

<style scoped>
.document-detail-page {
  min-height: calc(100vh - 128px);
}

.page-header-nav {
  margin-bottom: 20px;
}

.header-content {
  display: flex;
  align-items: center;
  gap: 12px;
}

.header-content h2 {
  margin: 0;
  font-size: 20px;
}

.content-card,
.versions-card {
  margin-bottom: 20px;
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-weight: 600;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.header-actions {
  display: flex;
  gap: 8px;
}

.versions-card :deep(.el-timeline-item__wrapper) {
  padding-bottom: 4px;
}

.version-item {
  background: #fafbfc;
  border: 1px solid #ebeef5;
  border-radius: 8px;
  padding: 16px;
}

.ver-header {
  margin-bottom: 12px;
}

.ver-title-row {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.ver-title {
  font-weight: 600;
  color: #303133;
}

.ver-remark {
  margin: 8px 0 0 0;
  color: #909399;
  font-size: 13px;
  padding-left: 8px;
  border-left: 3px solid #409eff;
}

.ver-signers {
  display: flex;
  flex-wrap: wrap;
  gap: 14px;
  margin-bottom: 12px;
  padding: 12px;
  background: #fff;
  border: 1px solid #ebeef5;
  border-radius: 6px;
}

.signer-box {
  flex: 1;
  min-width: 200px;
}

.signer-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
  flex-wrap: wrap;
}

.signer-name {
  font-size: 14px;
  font-weight: 600;
  color: #303133;
}

.signer-date {
  font-size: 12px;
  color: #909399;
  margin-left: auto;
}

.signer-sig {
  width: 160px;
  height: 72px;
  background: #fff;
  border: 1px dashed #dcdfe6;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.sig-img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.ver-actions {
  display: flex;
  gap: 8px;
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
