<template>
  <div class="documents-page">
    <div class="container">
      <div class="page-header">
        <div class="header-left">
          <h2>我的文书</h2>
          <p>查看和管理您生成的法律文书</p>
        </div>
        <el-button type="primary" @click="goToTemplates">
          <el-icon><Plus /></el-icon>
          <span>新建文书</span>
        </el-button>
      </div>

      <el-card v-loading="loading">
        <el-table :data="documentList" style="width: 100%" empty-text="暂无文书记录">
          <el-table-column prop="id" label="ID" width="80" />
          <el-table-column prop="title" label="文书标题" min-width="200">
            <template #default="{ row }">
              <span class="doc-title" @click="viewDocument(row.id)">{{ row.title }}</span>
            </template>
          </el-table-column>
          <el-table-column prop="template_title" label="使用模板" width="150">
            <template #default="{ row }">
              <el-tag size="small">{{ row.template_title }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="created_at" label="创建时间" width="180">
            <template #default="{ row }">
              {{ formatDate(row.created_at) }}
            </template>
          </el-table-column>
          <el-table-column label="操作" width="240" fixed="right">
            <template #default="{ row }">
              <el-button type="primary" link @click="viewDocument(row.id)">
                查看
              </el-button>
              <el-button type="success" link @click="generatePdf(row.id)">
                生成PDF
              </el-button>
              <el-button type="danger" link @click="deleteDocument(row.id)">
                删除
              </el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-card>

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
          <el-button type="primary" @click="downloadCurrentPdf">下载PDF</el-button>
        </template>
      </el-dialog>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useDocumentStore } from '@/stores/document'
import { generatePdf as generatePdfApi, downloadPdf as downloadPdfApi } from '@/api/pdf'
import { ElMessage, ElMessageBox } from 'element-plus'

const router = useRouter()
const documentStore = useDocumentStore()

const documentList = ref([])
const loading = ref(false)
const pdfDialogVisible = ref(false)
const pdfDataUrl = ref('')
const currentDocId = ref(null)

const fetchDocuments = async () => {
  loading.value = true
  try {
    const data = await documentStore.fetchDocumentList()
    documentList.value = data
  } catch (error) {
    ElMessage.error('获取文书列表失败')
  } finally {
    loading.value = false
  }
}

const formatDate = (date) => {
  if (!date) return ''
  return new Date(date).toLocaleString('zh-CN')
}

const viewDocument = (id) => {
  router.push(`/document/${id}`)
}

const generatePdf = async (id) => {
  currentDocId.value = id
  pdfDialogVisible.value = true
  pdfDataUrl.value = ''
  
  try {
    const data = await generatePdfApi({ documentId: id })
    pdfDataUrl.value = `data:application/pdf;base64,${data.base64}`
  } catch (error) {
    ElMessage.error('PDF生成失败')
    pdfDialogVisible.value = false
  }
}

const downloadCurrentPdf = () => {
  if (currentDocId.value) {
    downloadPdfApi(currentDocId.value)
  }
}

const deleteDocument = (id) => {
  ElMessageBox.confirm('确定要删除这份文书吗？删除后无法恢复', '删除确认', {
    confirmButtonText: '确定删除',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(async () => {
    try {
      await documentStore.deleteDocument(id)
      documentList.value = documentStore.documentList
      ElMessage.success('删除成功')
    } catch (error) {
      ElMessage.error('删除失败')
    }
  }).catch(() => {})
}

const goToTemplates = () => {
  router.push('/')
}

onMounted(() => {
  fetchDocuments()
})
</script>

<style scoped>
.documents-page {
  min-height: calc(100vh - 128px);
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  margin-bottom: 20px;
}

.header-left h2 {
  font-size: 24px;
  color: #303133;
  margin-bottom: 8px;
}

.header-left p {
  color: #606266;
  font-size: 14px;
}

.doc-title {
  color: #409eff;
  cursor: pointer;
}

.doc-title:hover {
  text-decoration: underline;
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
