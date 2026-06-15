<template>
  <div class="sign-page">
    <div class="container">
      <el-page-header @back="goBack" content="文书签署" class="page-header-nav">
        <template #content>
          <div class="header-content">
            <h2>{{ document?.title || '文书签署' }}</h2>
            <el-tag size="small" type="primary" effect="plain">签署流程</el-tag>
          </div>
        </template>
      </el-page-header>

      <el-steps :active="signStep - 1" finish-status="success" class="sign-steps" v-loading="loading">
        <el-step title="预览文书" description="确认文书内容" />
        <el-step title="添加签署人" description="设置身份与签名" />
        <el-step title="生成签署版" description="完成签名并下载" />
      </el-steps>

      <el-row :gutter="24" v-loading="loading">
        <el-col :xs="24" :md="signStep === 1 ? 24 : 15">
          <el-card class="preview-card" shadow="never" v-if="signStep === 1">
            <template #header>
              <div class="card-header">
                <el-icon :size="18" color="#409eff"><Document /></el-icon>
                <span class="header-title">文书内容预览</span>
                <el-tag size="small" type="info" effect="plain">模板：{{ document?.template_title }}</el-tag>
              </div>
            </template>
            <div class="doc-preview-box">
              <div class="markdown-content preview-content" v-html="parsedContent"></div>
            </div>
            <div class="preview-actions">
              <el-button @click="goBack">返回修改</el-button>
              <el-button type="primary" @click="signStep = 2">
                内容已确认，前往签署
                <el-icon><ArrowRight /></el-icon>
              </el-button>
            </div>
          </el-card>

          <el-card class="signers-card" shadow="never" v-if="signStep >= 2">
            <template #header>
              <div class="card-header">
                <el-icon :size="18" color="#e6a23c"><UserFilled /></el-icon>
                <span class="header-title">签署人列表（{{ signers.length }}）</span>
                <el-button type="primary" size="small" plain @click="openAddSigner">
                  <el-icon><Plus /></el-icon>
                  添加签署人
                </el-button>
              </div>
            </template>

            <el-empty
              v-if="signers.length === 0"
              description="请添加签署人并设置签名"
              :image-size="120"
            />

            <div class="signers-list" v-else>
              <div
                v-for="(signer, idx) in signers"
                :key="idx"
                class="signer-item"
              >
                <div class="signer-info">
                  <div class="signer-avatar">{{ signer.role?.charAt(0) || signer.name?.charAt(0) || 'S' }}</div>
                  <div class="signer-detail">
                    <div class="signer-name-row">
                      <span class="signer-name">{{ signer.name || '未填写姓名' }}</span>
                      <el-tag size="small" type="warning" effect="plain">{{ signer.role }}</el-tag>
                    </div>
                    <div class="signer-status">
                      <span v-if="signer.signatureImage">
                        <el-icon color="#67c23a"><CircleCheckFilled /></el-icon>
                        已签名
                      </span>
                      <span v-else class="not-signed">
                        <el-icon color="#f56c6c"><CircleCloseFilled /></el-icon>
                        未签名
                      </span>
                      <el-tag v-if="signer.date" size="small" type="info">签名日期：{{ signer.date }}</el-tag>
                    </div>
                  </div>
                </div>
                <div class="signer-preview" v-if="signer.signatureImage">
                  <img :src="signer.signatureImage.startsWith('data:') ? signer.signatureImage : `data:image/png;base64,${signer.signatureImage}`" class="sign-img" />
                </div>
                <div class="signer-preview placeholder" v-else>
                  <el-icon :size="28" color="#c0c4cc"><EditPen /></el-icon>
                </div>
                <div class="signer-actions">
                  <el-button size="small" type="primary" plain @click="editSigner(idx)">
                    <el-icon><Edit /></el-icon>
                    编辑
                  </el-button>
                  <el-button size="small" type="success" plain @click="drawSignature(idx)">
                    <el-icon><EditPen /></el-icon>
                    签名
                  </el-button>
                  <el-button size="small" type="danger" plain @click="removeSigner(idx)">
                    <el-icon><Delete /></el-icon>
                    移除
                  </el-button>
                </div>
              </div>
            </div>

            <div class="signers-actions" v-if="signStep === 2">
              <el-button @click="signStep = 1">
                <el-icon><ArrowLeft /></el-icon>
                返回预览
              </el-button>
              <el-button
                type="primary"
                :disabled="!canGenerate"
                @click="generateSignedVersion"
                :loading="generating"
              >
                <el-icon><Finished /></el-icon>
                生成签署版文档
              </el-button>
            </div>
          </el-card>

          <el-card class="result-card" shadow="never" v-if="signStep === 3">
            <el-result
              icon="success"
              title="签署完成"
              sub-title="签署版文档已生成，可预览或下载"
              :loading="generating"
            >
              <template #extra>
                <el-button type="primary" @click="showPdfPreview = true">
                  <el-icon><View /></el-icon>
                  预览签署版PDF
                </el-button>
                <el-button type="success" @click="downloadSignedPdf">
                  <el-icon><Download /></el-icon>
                  下载签署版PDF
                </el-button>
                <el-button @click="goToDocument">
                  <el-icon><Document /></el-icon>
                  查看文书详情
                </el-button>
                <el-button @click="goToDocumentsList">
                  <el-icon><List /></el-icon>
                  返回文书列表
                </el-button>
              </template>
            </el-result>

            <div class="sign-summary" v-if="generatedVersion">
              <h4>签署信息汇总</h4>
              <el-descriptions :column="2" border size="small">
                <el-descriptions-item label="版本号">v{{ generatedVersion.versionNumber }}</el-descriptions-item>
                <el-descriptions-item label="签署日期">{{ generatedVersion.signDate || '今日' }}</el-descriptions-item>
                <el-descriptions-item label="签署人数">{{ signers.length }} 人</el-descriptions-item>
                <el-descriptions-item label="生成时间">{{ generatedTime }}</el-descriptions-item>
              </el-descriptions>
              <div class="summary-signers">
                <div v-for="(s, i) in signers" :key="i" class="summary-signer">
                  <div class="s-role">{{ s.role }}</div>
                  <div class="s-name">{{ s.name }}</div>
                  <img v-if="s.signatureImage" :src="s.signatureImage.startsWith('data:') ? s.signatureImage : `data:image/png;base64,${s.signatureImage}`" class="s-img" />
                </div>
              </div>
            </div>
          </el-card>
        </el-col>

        <el-col :xs="24" :md="9" v-if="signStep === 2">
          <el-card shadow="never" class="quick-card">
            <template #header>
              <div class="card-header">
                <el-icon :size="18" color="#67c23a"><Lightning /></el-icon>
                <span class="header-title">快捷操作</span>
              </div>
            </template>

            <h4 class="section-subtitle">根据模板推荐签署人</h4>
            <div class="role-recommend">
              <el-tag
                v-for="r in recommendedRoles"
                :key="r"
                size="default"
                class="rec-tag"
                effect="plain"
                type="primary"
                @click="quickAddSigner(r)"
              >
                <el-icon><Plus /></el-icon>
                {{ r }}
              </el-tag>
            </div>

            <el-divider />

            <h4 class="section-subtitle">签署日期</h4>
            <el-date-picker
              v-model="signDate"
              type="date"
              placeholder="选择签署日期"
              value-format="YYYY-MM-DD"
              style="width: 100%"
              @change="syncSignerDates"
            />
            <p class="tip-text">默认使用今日日期，所有签署人默认共享此日期（可单独修改）</p>

            <el-divider />

            <h4 class="section-subtitle">签署提示</h4>
            <ul class="sign-tips">
              <li>每个签署人需完成签名方可生成文档</li>
              <li>支持手写签名和键入生成两种方式</li>
              <li>签名将作为图片嵌入PDF签署页</li>
              <li>签署完成后生成永久版本记录</li>
            </ul>
          </el-card>
        </el-col>
      </el-row>

      <el-dialog
        v-model="signerDialogVisible"
        :title="editingSignerIdx >= 0 ? '编辑签署人' : '添加签署人'"
        width="480px"
        align-center
        destroy-on-close
      >
        <el-form :model="signerForm" label-width="90px" label-position="right">
          <el-form-item label="签署角色">
            <el-select
              v-model="signerForm.role"
              filterable
              allow-create
              default-first-option
              placeholder="选择或输入角色"
              style="width: 100%"
            >
              <el-option v-for="r in allRoles" :key="r" :label="r" :value="r" />
            </el-select>
          </el-form-item>
          <el-form-item label="姓名">
            <el-input v-model="signerForm.name" placeholder="请输入姓名" maxlength="20" clearable />
          </el-form-item>
          <el-form-item label="签署日期">
            <el-date-picker
              v-model="signerForm.date"
              type="date"
              value-format="YYYY-MM-DD"
              style="width: 100%"
            />
          </el-form-item>
        </el-form>
        <template #footer>
          <el-button @click="signerDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="confirmSignerForm">确认</el-button>
        </template>
      </el-dialog>

      <el-dialog
        v-model="signatureDialogVisible"
        :title="`${currentEditingSigner?.name || '签署人'} - 电子签名`"
        width="620px"
        align-center
        destroy-on-close
        :close-on-click-modal="false"
      >
        <div class="signer-info-bar">
          <el-tag type="warning" effect="plain">{{ currentEditingSigner?.role }}</el-tag>
          <span class="info-name">{{ currentEditingSigner?.name }}</span>
        </div>
        <SignaturePad
          v-if="signatureDialogVisible"
          ref="signaturePadRef"
          :default-name="currentEditingSigner?.name"
          @change="onSignatureChange"
          @confirm="onSignatureConfirm"
        />
        <template #footer>
          <el-button @click="signatureDialogVisible = false">取消</el-button>
          <el-button
            type="primary"
            :disabled="!hasSignature"
            @click="confirmSignature"
          >
            确认使用此签名
          </el-button>
        </template>
      </el-dialog>

      <el-dialog
        v-model="showPdfPreview"
        title="签署版PDF预览"
        width="85%"
        :close-on-click-modal="false"
        destroy-on-close
      >
        <div class="pdf-preview-container">
          <iframe v-if="previewPdfData" :src="previewPdfData" class="pdf-iframe" />
          <div v-else class="pdf-loading">
            <el-icon class="is-loading" :size="32"><Loading /></el-icon>
            <p>正在生成签署版PDF...</p>
          </div>
        </div>
        <template #footer>
          <el-button @click="showPdfPreview = false">关闭</el-button>
          <el-button type="primary" @click="downloadSignedPdf">下载PDF</el-button>
        </template>
      </el-dialog>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getDocumentDetail } from '@/api/document'
import { generateSignedPdf } from '@/api/pdf'
import { createVersion, downloadVersionPdf } from '@/api/version'
import { ElMessage, ElMessageBox } from 'element-plus'
import { marked } from 'marked'
import SignaturePad from '@/components/SignaturePad.vue'
import {
  Document, ArrowRight, UserFilled, Plus, CircleCheckFilled, CircleCloseFilled,
  Edit, EditPen, Delete, ArrowLeft, Finished, View, Download, List,
  Lightning, Loading
} from '@element-plus/icons-vue'

const route = useRoute()
const router = useRouter()

const document = ref(null)
const loading = ref(false)
const generating = ref(false)
const signStep = ref(1)
const signers = ref([])
const signDate = ref(new Date().toISOString().split('T')[0])

const signerDialogVisible = ref(false)
const editingSignerIdx = ref(-1)
const signerForm = reactive({ role: '', name: '', date: '' })

const signatureDialogVisible = ref(false)
const currentSignerIdx = ref(-1)
const signaturePadRef = ref(null)
const tempSignature = ref('')
const hasSignature = computed(() => !!tempSignature.value)

const showPdfPreview = ref(false)
const previewPdfData = ref('')

const generatedVersion = ref(null)
const generatedPdfBase64 = ref('')
const generatedTime = ref('')

const recommendedRoles = computed(() => {
  const title = document.value?.template_title || document.value?.title || ''
  if (title.includes('劳动')) return ['用人单位（甲方）', '劳动者（乙方）']
  if (title.includes('买卖')) return ['卖方（甲方）', '买方（乙方）']
  if (title.includes('租赁')) return ['出租方（甲方）', '承租方（乙方）']
  if (title.includes('起诉')) return ['原告', '具状人']
  return ['甲方', '乙方', '丙方']
})

const allRoles = [
  '甲方', '乙方', '丙方', '用人单位（甲方）', '劳动者（乙方）',
  '卖方（甲方）', '买方（乙方）', '出租方（甲方）', '承租方（乙方）',
  '原告', '被告', '具状人', '法定代表人', '授权代理人'
]

const canGenerate = computed(() => {
  if (signers.value.length === 0) return false
  return signers.value.every(s => s.signatureImage && s.name && s.role)
})

const parsedContent = computed(() => {
  if (!document.value?.content) return ''
  const content = typeof document.value.content === 'string'
    ? document.value.content
    : (document.value.content.text || JSON.stringify(document.value.content))
  return marked.parse(content)
})

const currentEditingSigner = computed(() => {
  if (currentSignerIdx.value >= 0) return signers.value[currentSignerIdx.value]
  return signerForm
})

const fetchDocument = async () => {
  const id = route.params.documentId
  if (!id) {
    ElMessage.warning('文档ID不存在')
    return
  }
  loading.value = true
  try {
    const data = await getDocumentDetail(id)
    document.value = data
  } catch (error) {
    ElMessage.error('获取文档信息失败')
  } finally {
    loading.value = false
  }
}

const goBack = () => {
  if (signStep.value > 1) {
    signStep.value--
  } else {
    ElMessageBox.confirm('确定要离开签署页吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    }).then(() => {
      if (document.value) {
        router.push(`/document/${document.value.id}`)
      } else {
        router.back()
      }
    }).catch(() => {})
  }
}

const openAddSigner = () => {
  editingSignerIdx.value = -1
  signerForm.role = ''
  signerForm.name = ''
  signerForm.date = signDate.value
  signerDialogVisible.value = true
}

const editSigner = (idx) => {
  editingSignerIdx.value = idx
  const s = signers.value[idx]
  signerForm.role = s.role
  signerForm.name = s.name
  signerForm.date = s.date || signDate.value
  signerDialogVisible.value = true
}

const quickAddSigner = (role) => {
  const newSigner = {
    role,
    name: '',
    date: signDate.value,
    signatureImage: ''
  }
  signers.value.push(newSigner)
  const idx = signers.value.length - 1
  ElMessage.success(`已添加${role}，请填写姓名并签名`)
  editSigner(idx)
}

const confirmSignerForm = () => {
  if (!signerForm.role) {
    ElMessage.warning('请输入或选择签署角色')
    return
  }
  if (!signerForm.name) {
    ElMessage.warning('请输入签署人姓名')
    return
  }
  if (editingSignerIdx.value >= 0) {
    const exist = signers.value[editingSignerIdx.value]
    exist.role = signerForm.role
    exist.name = signerForm.name
    exist.date = signerForm.date
    ElMessage.success('已更新签署人信息')
  } else {
    signers.value.push({
      role: signerForm.role,
      name: signerForm.name,
      date: signerForm.date,
      signatureImage: ''
    })
    ElMessage.success('已添加签署人，请点击"签名"完成电子签名')
  }
  signerDialogVisible.value = false
}

const removeSigner = (idx) => {
  ElMessageBox.confirm(`确定移除签署人【${signers.value[idx].name || signers.value[idx].role}】吗？`, '提示', {
    type: 'warning'
  }).then(() => {
    signers.value.splice(idx, 1)
    ElMessage.success('已移除')
  }).catch(() => {})
}

const drawSignature = (idx) => {
  currentSignerIdx.value = idx
  tempSignature.value = signers.value[idx]?.signatureImage || ''
  signatureDialogVisible.value = true
}

const onSignatureChange = (dataUrl) => {
  tempSignature.value = dataUrl
}

const onSignatureConfirm = ({ dataUrl }) => {
  tempSignature.value = dataUrl
}

const confirmSignature = async () => {
  if (currentSignerIdx.value < 0) return
  if (!tempSignature.value) {
    ElMessage.warning('请先完成签名')
    return
  }
  const base64 = tempSignature.value.includes('base64,')
    ? tempSignature.value.split('base64,')[1]
    : tempSignature.value
  signers.value[currentSignerIdx.value].signatureImage = base64
  signers.value[currentSignerIdx.value].date = signers.value[currentSignerIdx.value].date || signDate.value
  signatureDialogVisible.value = false
  ElMessage.success('签名已保存')
}

const syncSignerDates = () => {
  signers.value.forEach(s => {
    if (!s.date) s.date = signDate.value
  })
}

const generateSignedVersion = async () => {
  if (!canGenerate.value) {
    ElMessage.warning('请补全所有签署人信息并完成签名')
    return
  }
  generating.value = true
  try {
    const content = typeof document.value.content === 'string'
      ? document.value.content
      : (document.value.content.text || '')

    const signatures = signers.value.map(s => ({
      role: s.role,
      name: s.name,
      date: s.date || signDate.value,
      signatureImage: s.signatureImage
    }))

    const pdfRes = await generateSignedPdf({
      documentId: document.value.id,
      content,
      title: document.value.title,
      signatures,
      signDate: signDate.value
    })

    generatedPdfBase64.value = pdfRes.base64
    generatedTime.value = new Date().toLocaleString()

    const versionRes = await createVersion({
      documentId: document.value.id,
      title: document.value.title,
      content: typeof document.value.content === 'string'
        ? { text: content }
        : document.value.content,
      formData: document.value.form_data,
      signatures,
      signDate: signDate.value,
      pdfBase64: pdfRes.base64,
      remark: `签署版本，共 ${signatures.length} 人签署`
    })

    generatedVersion.value = versionRes

    signStep.value = 3
    ElMessage.success('签署版文档生成成功！')
  } catch (error) {
    console.error(error)
    ElMessage.error('生成签署版文档失败：' + (error.message || '未知错误'))
  } finally {
    generating.value = false
  }
}

const downloadSignedPdf = () => {
  if (generatedVersion.value?.id) {
    downloadVersionPdf(generatedVersion.value.id)
  } else if (generatedPdfBase64.value) {
    const blob = base64ToBlob(generatedPdfBase64.value, 'application/pdf')
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${document.value?.title || 'document'}_签署版.pdf`
    a.click()
    URL.revokeObjectURL(url)
  }
}

const base64ToBlob = (base64, mime) => {
  const bstr = atob(base64)
  let n = bstr.length
  const u8arr = new Uint8Array(n)
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n)
  }
  return new Blob([u8arr], { type: mime })
}

const goToDocument = () => {
  if (document.value) {
    router.push(`/document/${document.value.id}`)
  }
}

const goToDocumentsList = () => {
  router.push('/documents')
}

onMounted(async () => {
  await fetchDocument()
  syncSignerDates()
})
</script>

<style scoped>
.sign-page {
  min-height: calc(100vh - 128px);
}

.page-header-nav {
  margin-bottom: 20px;
}

.header-content {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.header-content h2 {
  margin: 0;
  font-size: 20px;
}

.sign-steps {
  margin-bottom: 24px;
  background: #fff;
  padding: 20px 24px;
  border-radius: 8px;
}

.card-header {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.header-title {
  font-weight: 600;
  font-size: 15px;
}

.doc-preview-box {
  background: #fafafa;
  padding: 32px;
  border-radius: 8px;
  max-height: 600px;
  overflow-y: auto;
  margin-bottom: 20px;
  border: 1px solid #ebeef5;
}

.preview-content {
  max-width: 800px;
  margin: 0 auto;
  background: #fff;
  padding: 28px;
  border-radius: 4px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.06);
}

.preview-actions {
  display: flex;
  justify-content: center;
  gap: 16px;
}

.signers-list {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.signer-item {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  background: #fafbfc;
  border: 1px solid #ebeef5;
  border-radius: 8px;
  transition: all 0.2s;
}

.signer-item:hover {
  border-color: #409eff;
  background: #f4f8ff;
}

.signer-info {
  display: flex;
  align-items: center;
  gap: 14px;
  flex: 1;
  min-width: 0;
}

.signer-avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  font-weight: 600;
  flex-shrink: 0;
}

.signer-detail {
  flex: 1;
  min-width: 0;
}

.signer-name-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}

.signer-name {
  font-size: 15px;
  font-weight: 600;
  color: #303133;
}

.signer-status {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 13px;
  color: #606266;
  flex-wrap: wrap;
}

.signer-status > span {
  display: flex;
  align-items: center;
  gap: 4px;
}

.signer-status .not-signed {
  color: #f56c6c;
}

.signer-preview {
  width: 140px;
  height: 70px;
  background: #fff;
  border: 1px solid #e4e7ed;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  overflow: hidden;
}

.signer-preview.placeholder {
  color: #c0c4cc;
  flex-direction: column;
  gap: 4px;
  font-size: 12px;
}

.sign-img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.signer-actions {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.signers-actions {
  display: flex;
  justify-content: center;
  gap: 16px;
  margin-top: 24px;
  padding-top: 20px;
  border-top: 1px solid #ebeef5;
}

.quick-card .section-subtitle {
  margin: 0 0 12px 0;
  font-size: 14px;
  font-weight: 600;
  color: #303133;
}

.role-recommend {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.rec-tag {
  cursor: pointer;
}

.tip-text {
  margin: 8px 0 0 0;
  font-size: 12px;
  color: #909399;
  line-height: 1.6;
}

.sign-tips {
  list-style: none;
  padding: 0;
  margin: 0;
}

.sign-tips li {
  padding: 6px 0;
  padding-left: 20px;
  position: relative;
  font-size: 13px;
  color: #606266;
  line-height: 1.6;
}

.sign-tips li::before {
  content: '✓';
  position: absolute;
  left: 0;
  color: #67c23a;
  font-weight: 600;
}

.sign-summary {
  padding: 0 32px 28px;
}

.sign-summary h4 {
  margin: 0 0 16px 0;
  font-size: 15px;
  font-weight: 600;
  color: #303133;
}

.summary-signers {
  margin-top: 18px;
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  padding: 16px;
  background: #f5f7fa;
  border-radius: 8px;
}

.summary-signer {
  flex: 1;
  min-width: 160px;
  padding: 14px;
  background: #fff;
  border-radius: 6px;
  border: 1px solid #e4e7ed;
  text-align: center;
}

.summary-signer .s-role {
  font-size: 13px;
  color: #909399;
  margin-bottom: 4px;
}

.summary-signer .s-name {
  font-size: 15px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 10px;
}

.summary-signer .s-img {
  width: 120px;
  height: 60px;
  object-fit: contain;
  display: block;
  margin: 0 auto;
}

.signer-info-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
  padding: 10px 14px;
  background: #fdf6ec;
  border: 1px solid #faecd8;
  border-radius: 6px;
}

.info-name {
  font-weight: 600;
  color: #b88230;
}

.pdf-preview-container {
  min-height: 600px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.pdf-iframe {
  width: 100%;
  height: 700px;
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
