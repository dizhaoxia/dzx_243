<template>
  <div class="fill-form-page">
    <div class="container">
      <el-page-header @back="goBack" content="填写表单" class="page-header-nav">
        <template #content>
          <div class="header-content">
            <h2>{{ template?.title }} - 填写信息</h2>
            <span class="step-desc">第 {{ currentStep }} 步，共 {{ totalSteps }} 步</span>
          </div>
        </template>
      </el-page-header>

      <el-row :gutter="24" v-loading="loading">
        <el-col :xs="24" :md="14">
          <el-card class="form-card">
            <el-steps :active="currentStep - 1" finish-status="success" class="form-steps">
              <el-step title="填写信息" />
              <el-step title="预览确认" />
              <el-step title="生成文档" />
            </el-steps>

            <div class="step-content">
              <template v-if="currentStep === 1">
                <el-form
                  ref="formRef"
                  :model="formData"
                  :rules="formRules"
                  label-width="140px"
                  label-position="right"
                  class="dynamic-form"
                >
                  <template v-for="field in template?.fields" :key="field.name">
                    <el-form-item
                      :label="field.label"
                      :prop="field.name"
                      v-if="field.type === 'text'"
                    >
                      <el-input
                        v-model="formData[field.name]"
                        :placeholder="`请输入${field.label}`"
                        clearable
                      />
                    </el-form-item>

                    <el-form-item
                      :label="field.label"
                      :prop="field.name"
                      v-else-if="field.type === 'textarea'"
                    >
                      <el-input
                        v-model="formData[field.name]"
                        type="textarea"
                        :rows="3"
                        :placeholder="`请输入${field.label}`"
                        resize="none"
                      />
                    </el-form-item>

                    <el-form-item
                      :label="field.label"
                      :prop="field.name"
                      v-else-if="field.type === 'number'"
                    >
                      <el-input-number
                        v-model="formData[field.name]"
                        :min="0"
                        style="width: 100%"
                      />
                    </el-form-item>

                    <el-form-item
                      :label="field.label"
                      :prop="field.name"
                      v-else-if="field.type === 'date'"
                    >
                      <el-date-picker
                        v-model="formData[field.name]"
                        type="date"
                        placeholder="请选择日期"
                        value-format="YYYY-MM-DD"
                        style="width: 100%"
                      />
                    </el-form-item>

                    <el-form-item
                      :label="field.label"
                      :prop="field.name"
                      v-else-if="field.type === 'select'"
                    >
                      <el-select
                        v-model="formData[field.name]"
                        :placeholder="`请选择${field.label}`"
                        style="width: 100%"
                        clearable
                      >
                        <el-option
                          v-for="option in field.options"
                          :key="option"
                          :label="option"
                          :value="option"
                        />
                      </el-select>
                    </el-form-item>
                  </template>
                </el-form>

                <div class="step-actions">
                  <el-button @click="goBack">取消</el-button>
                  <el-button type="primary" @click="nextStep">下一步</el-button>
                </div>
              </template>

              <template v-else-if="currentStep === 2">
                <div class="preview-section">
                  <h3>内容预览</h3>
                  <div class="markdown-content preview-content" v-html="previewContent"></div>
                </div>

                <div class="step-actions">
                  <el-button @click="prevStep">上一步</el-button>
                  <el-button type="primary" @click="generateDocument">生成文档</el-button>
                </div>
              </template>

              <template v-else-if="currentStep === 3">
                <div class="success-section">
                  <el-result
                    icon="success"
                    title="文档生成成功"
                    sub-title="您的法律文书已生成，可以查看或下载"
                  >
                    <template #extra>
                      <el-button type="primary" @click="viewDocument">查看文档</el-button>
                      <el-button @click="generatePdf">生成PDF</el-button>
                      <el-button @click="goToDocuments">我的文书</el-button>
                    </template>
                  </el-result>
                </div>
              </template>
            </div>
          </el-card>
        </el-col>

        <el-col :xs="24" :md="10">
          <el-card class="side-card">
            <template #header>
              <div class="card-header">
                <el-icon :size="18" color="#409eff"><InfoFilled /></el-icon>
                <span>填写进度</span>
              </div>
            </template>

            <div class="progress-info">
              <div class="progress-item">
                <span class="label">已填写字段</span>
                <span class="value">{{ filledFields }} / {{ totalFields }}</span>
              </div>
              <el-progress :percentage="progressPercentage" :stroke-width="8" />
            </div>
          </el-card>

          <el-card class="side-card tip-card">
            <template #header>
              <div class="card-header">
                <el-icon :size="18" color="#e6a23c"><Warning /></el-icon>
                <span>填写须知</span>
              </div>
            </template>
            <ul class="tip-list">
              <li>请如实填写各项信息</li>
              <li>带 <span class="required">*</span> 的为必填项</li>
              <li>填写完成后请仔细核对</li>
              <li>生成的文档可在"我的文书"中查看</li>
            </ul>
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
import { ref, reactive, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getTemplateDetail } from '@/api/template'
import { createDocument } from '@/api/document'
import { generatePdf as generatePdfApi, downloadPdf as downloadPdfApi } from '@/api/pdf'
import { ElMessage, ElMessageBox } from 'element-plus'
import { marked } from 'marked'

const route = useRoute()
const router = useRouter()

const template = ref(null)
const loading = ref(false)
const currentStep = ref(1)
const totalSteps = 3
const formRef = ref(null)
const formData = reactive({})
const formRules = reactive({})

const generatedDocId = ref(null)
const pdfDialogVisible = ref(false)
const pdfDataUrl = ref('')

const totalFields = computed(() => {
  return template.value?.fields?.length || 0
})

const filledFields = computed(() => {
  if (!template.value?.fields) return 0
  return template.value.fields.filter(field => {
    const value = formData[field.name]
    return value !== undefined && value !== null && value !== ''
  }).length
})

const progressPercentage = computed(() => {
  if (totalFields.value === 0) return 0
  return Math.round((filledFields.value / totalFields.value) * 100)
})

const previewContent = computed(() => {
  if (!template.value?.content) return ''
  let content = template.value.content
  Object.keys(formData).forEach(key => {
    const placeholder = `{{${key}}}`
    const value = formData[key] || ''
    const regex = new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')
    content = content.replace(regex, `**${value}**`)
  })
  return marked.parse(content)
})

const fetchTemplate = async () => {
  const templateId = route.params.templateId
  if (!templateId) return
  
  loading.value = true
  try {
    const data = await getTemplateDetail(templateId)
    template.value = data
    initFormData(data.fields)
  } catch (error) {
    ElMessage.error('获取模板信息失败')
  } finally {
    loading.value = false
  }
}

const initFormData = (fields) => {
  fields.forEach(field => {
    formData[field.name] = field.type === 'number' ? 0 : ''
    if (field.required) {
      formRules[field.name] = [
        { required: true, message: `请${field.type === 'select' ? '选择' : '输入'}${field.label}`, trigger: 'blur' }
      ]
    }
  })
}

const nextStep = async () => {
  if (currentStep.value === 1) {
    try {
      await formRef.value.validate()
      currentStep.value = 2
    } catch (error) {
      ElMessage.warning('请填写完整必填项')
    }
  }
}

const prevStep = () => {
  if (currentStep.value > 1) {
    currentStep.value--
  }
}

const generateDocument = async () => {
  loading.value = true
  try {
    const data = await createDocument({
      templateId: route.params.templateId,
      formData: formData
    })
    generatedDocId.value = data.id
    currentStep.value = 3
    ElMessage.success('文档生成成功')
  } catch (error) {
    ElMessage.error('文档生成失败')
  } finally {
    loading.value = false
  }
}

const viewDocument = () => {
  if (generatedDocId.value) {
    router.push(`/document/${generatedDocId.value}`)
  }
}

const generatePdf = async () => {
  pdfDialogVisible.value = true
  pdfDataUrl.value = ''
  
  try {
    const data = await generatePdfApi({
      templateId: route.params.templateId,
      formData: formData
    })
    pdfDataUrl.value = `data:application/pdf;base64,${data.base64}`
  } catch (error) {
    ElMessage.error('PDF生成失败')
    pdfDialogVisible.value = false
  }
}

const downloadPdf = () => {
  if (generatedDocId.value) {
    downloadPdfApi(generatedDocId.value)
  }
}

const goToDocuments = () => {
  router.push('/documents')
}

const goBack = () => {
  if (currentStep.value > 1) {
    ElMessageBox.confirm('确定要返回吗？当前填写的内容可能会丢失', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    }).then(() => {
      if (currentStep.value === 1) {
        router.back()
      } else {
        currentStep.value--
      }
    }).catch(() => {})
  } else {
    router.back()
  }
}

onMounted(() => {
  fetchTemplate()
})
</script>

<style scoped>
.fill-form-page {
  min-height: calc(100vh - 128px);
}

.page-header-nav {
  margin-bottom: 20px;
}

.header-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
}

.header-content h2 {
  margin: 0;
  font-size: 20px;
}

.step-desc {
  font-size: 14px;
  color: #909399;
}

.form-card {
  margin-bottom: 20px;
}

.form-steps {
  margin-bottom: 32px;
}

.step-content {
  min-height: 400px;
}

.dynamic-form {
  max-width: 600px;
  margin: 0 auto;
}

.step-actions {
  display: flex;
  justify-content: center;
  gap: 16px;
  margin-top: 32px;
  padding-top: 24px;
  border-top: 1px solid #ebeef5;
}

.preview-section h3 {
  font-size: 16px;
  margin-bottom: 16px;
  color: #303133;
}

.preview-content {
  background-color: #fafafa;
  padding: 24px;
  border-radius: 8px;
  max-height: 400px;
  overflow-y: auto;
}

.success-section {
  padding: 40px 0;
}

.side-card {
  margin-bottom: 20px;
}

.card-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
}

.progress-info {
  padding: 10px 0;
}

.progress-item {
  display: flex;
  justify-content: space-between;
  margin-bottom: 12px;
  font-size: 14px;
}

.progress-item .label {
  color: #606266;
}

.progress-item .value {
  color: #409eff;
  font-weight: 600;
}

.tip-card {
  background-color: #fdf6ec;
  border-color: #faecd8;
}

.tip-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.tip-list li {
  padding: 6px 0;
  padding-left: 20px;
  position: relative;
  color: #e6a23c;
  font-size: 13px;
  line-height: 1.5;
}

.tip-list li::before {
  content: '•';
  position: absolute;
  left: 0;
  color: #e6a23c;
}

.required {
  color: #f56c6c;
  font-weight: bold;
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
